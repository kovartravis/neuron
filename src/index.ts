import crypto from 'node:crypto';
import path from 'node:path';
import fs from 'node:fs';
import envPaths from 'env-paths';
import { openDatabase } from './db.js';
import {
  Embedder,
  TransformersEmbedder,
  cleanFtsQuery,
  EnrichmentModel,
  LocalEnrichmentModel,
  Centroid,
  buildTagVocabulary,
  buildCategoryCentroids,
  selectTags,
  selectCategory
} from './components/index.js';
import {
  MemoryKind,
  MemoryQuery,
  Memory,
  MemoryMutation,
  MutationResult,
  MaintenancePolicy,
  MaintenanceReport,
  NeuronMemoryOptions
} from './models/index.js';

export { openDatabase };
export * from './models/index.js';
export * from './components/index.js';
export * from './config/index.js';

import { DualStorageRouter } from './storage/dualStorageRouter.js';
import { MdStorageAdapter } from './storage/mdStorageAdapter.js';
import { loadNeuronYaml, NeuronConfig } from './config/neuronYaml.js';

function findProjectRoot(startDir: string): { root: string; name: string } {
  let dir = path.resolve(startDir);
  while (true) {
    if (fs.existsSync(path.join(dir, 'package.json')) || fs.existsSync(path.join(dir, '.git'))) {
      return { root: dir, name: path.basename(dir) };
    }
    const parent = path.dirname(dir);
    if (parent === dir) {
      return { root: startDir, name: path.basename(startDir) };
    }
    dir = parent;
  }
}

/**
 * Resolve a `category` from a mutation/query, supporting the deprecated `kind` field.
 * Maps 'learning' → 'learning', 'history' → 'history', or passes through custom category names.
 */
function resolveCategory(m: { category?: string; kind?: string }): string {
  return m.category ?? m.kind ?? 'learning';
}

export class NeuronMemory {
  private db: any;
  private projectRoot: string;
  private projectName: string;
  private projectId: string;
  private embedder: Embedder;
  private router: DualStorageRouter;
  private config: NeuronConfig;
  private enricher: EnrichmentModel;
  /**
   * Computed once per process and never persisted. Each command invocation is
   * its own process, so per-process is always fresh — which matters more than
   * speed here, because a tag minted by an explicit write must be selectable by
   * the very next write.
   */
  private tagVocabulary: Centroid[] | null = null;

  constructor(options: NeuronMemoryOptions) {
    this.projectRoot = options.projectRoot;
    this.projectName = options.projectName;
    this.projectId = crypto
      .createHash('sha256')
      .update(options.projectRoot)
      .digest('hex')
      .slice(0, 16);
    
    this.embedder = options.embedder ?? new TransformersEmbedder();

    const config = loadNeuronYaml(options.projectRoot);
    this.config = config;
    this.enricher =
      options.enricher ??
      new LocalEnrichmentModel({ timeoutMs: config.llm.enrichment.timeoutMs });
    const configPath = config.storage?.path || '.neuron';
    const storagePath = path.isAbsolute(configPath)
      ? configPath
      : path.resolve(options.projectRoot, configPath);
    const mdAdapter = new MdStorageAdapter({ storagePath });

    if (config.storage?.mode === 'md-only') {
      this.db = null;
    } else {
      this.db = openDatabase(options.dbPath);
      this.initialize();
    }

    const vectorDbDelegate = {
      transact: (mutations: MemoryMutation[]) => this.transactVector(mutations),
      query: (q: MemoryQuery) => this.queryVector(q),
    } as any;

    this.router = new DualStorageRouter(vectorDbDelegate, mdAdapter, config);
  }

  static open(dir: string = process.cwd()): NeuronMemory {
    const projectInfo = findProjectRoot(dir);
    
    let dbPath = process.env.NEURON_DB_PATH;
    if (!dbPath) {
      const appPaths = envPaths('neuron', { suffix: '' });
      const dbDir = path.join(appPaths.data, 'db');
      fs.mkdirSync(dbDir, { recursive: true });
      const projectHash = crypto
        .createHash('sha256')
        .update(projectInfo.root)
        .digest('hex')
        .slice(0, 16);
      dbPath = path.join(dbDir, `${projectHash}.sqlite`);
    }

    const embedder = process.env.NEURON_MOCK_EMBEDDER === 'true'
      ? { embed: async () => new Float32Array(384), embedQuery: async () => new Float32Array(384) }
      : undefined;

    return new NeuronMemory({
      dbPath,
      projectRoot: projectInfo.root,
      projectName: projectInfo.name,
      embedder
    });
  }

  static inMemory(
    projectName: string = 'test-project',
    embedder?: Embedder,
    enricher?: EnrichmentModel
  ): NeuronMemory {
    return new NeuronMemory({
      dbPath: ':memory:',
      projectRoot: '/in-memory/' + projectName,
      projectName,
      embedder: embedder ?? { embed: async () => new Float32Array(384), embedQuery: async () => new Float32Array(384) },
      enricher
    });
  }

  public getDb(): any { return this.db; }
  public getProjectId(): string { return this.projectId; }
  public getEmbedder(): Embedder { return this.embedder; }

  private initialize(): void {
    try {
      this.db.pragma('journal_mode = WAL');
      this.db.pragma('busy_timeout = 5000');
    } catch (err) {}
    let currentVersion = this.db.pragma('user_version', { simple: true }) as number;

    if (currentVersion < 1) {
      this.db.transaction(() => {
        this.db.exec(`
          CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL);
          CREATE TABLE IF NOT EXISTS learnings (
            id TEXT PRIMARY KEY NOT NULL, project_id TEXT NOT NULL, content TEXT NOT NULL,
            tags TEXT NOT NULL DEFAULT '[]', embedding BLOB NOT NULL, created_at TEXT NOT NULL
          );
          CREATE INDEX IF NOT EXISTS idx_learnings_project ON learnings (project_id);
          CREATE INDEX IF NOT EXISTS idx_learnings_created ON learnings (project_id, created_at DESC);
          
          CREATE TABLE IF NOT EXISTS history (
            id TEXT PRIMARY KEY NOT NULL, project_id TEXT NOT NULL, task_id TEXT, content TEXT NOT NULL,
            tags TEXT NOT NULL DEFAULT '[]', embedding BLOB NOT NULL, created_at TEXT NOT NULL
          );
          CREATE INDEX IF NOT EXISTS idx_history_project ON history (project_id);
          CREATE INDEX IF NOT EXISTS idx_history_created ON history (project_id, created_at DESC);
          CREATE INDEX IF NOT EXISTS idx_history_task ON history (task_id) WHERE task_id IS NOT NULL;
        `);
        const insertMeta = this.db.prepare('INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)');
        insertMeta.run('schema_version', '1');
        insertMeta.run('project_root', this.projectRoot);
        insertMeta.run('project_name', this.projectName);
        this.db.pragma('user_version = 1');
      })();
      currentVersion = 1;
    }

    if (currentVersion < 2) {
      this.db.transaction(() => {
        this.db.exec(`
          ALTER TABLE learnings ADD COLUMN scope TEXT NOT NULL DEFAULT '${this.projectName}';
          ALTER TABLE learnings ADD COLUMN importance INTEGER NOT NULL DEFAULT 3 CHECK (importance BETWEEN 1 AND 5);
          ALTER TABLE history ADD COLUMN scope TEXT NOT NULL DEFAULT '${this.projectName}';
          ALTER TABLE history ADD COLUMN importance INTEGER NOT NULL DEFAULT 3 CHECK (importance BETWEEN 1 AND 5);
          CREATE TABLE IF NOT EXISTS query_logs (
            id TEXT PRIMARY KEY NOT NULL, project_id TEXT NOT NULL, query_text TEXT NOT NULL,
            embedding BLOB NOT NULL, scope TEXT NOT NULL, created_at TEXT NOT NULL
          );
          CREATE INDEX IF NOT EXISTS idx_query_logs_project_created ON query_logs (project_id, created_at DESC);
        `);
        const insertMeta = this.db.prepare('INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)');
        insertMeta.run('schema_version', '2');
        this.db.pragma('user_version = 2');
      })();
      currentVersion = 2;
    }

    if (currentVersion < 3) {
      this.db.transaction(() => {
        this.db.exec(`
          ALTER TABLE learnings ADD COLUMN is_manual_scope INTEGER NOT NULL DEFAULT 0;
          CREATE TABLE IF NOT EXISTS learning_query_matches (
            learning_id TEXT NOT NULL, query_log_id TEXT NOT NULL, matched_at TEXT NOT NULL,
            PRIMARY KEY (learning_id, query_log_id)
          );
        `);
        const insertMeta = this.db.prepare('INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)');
        insertMeta.run('schema_version', '3');
        this.db.pragma('user_version = 3');
      })();
      currentVersion = 3;
    }

    if (currentVersion < 4) {
      this.db.transaction(() => {
        this.db.exec(`
          CREATE VIRTUAL TABLE IF NOT EXISTS learnings_fts USING fts5(
            content, tags,
            content='learnings',
            content_rowid='rowid'
          );
          CREATE VIRTUAL TABLE IF NOT EXISTS history_fts USING fts5(
            content, tags,
            content='history',
            content_rowid='rowid'
          );

          CREATE TRIGGER IF NOT EXISTS learnings_ai AFTER INSERT ON learnings BEGIN
            INSERT INTO learnings_fts(rowid, content, tags) VALUES (new.rowid, new.content, new.tags);
          END;
          CREATE TRIGGER IF NOT EXISTS learnings_ad AFTER DELETE ON learnings BEGIN
            INSERT INTO learnings_fts(learnings_fts, rowid, content, tags) VALUES ('delete', old.rowid, old.content, old.tags);
          END;
          CREATE TRIGGER IF NOT EXISTS learnings_au AFTER UPDATE ON learnings BEGIN
            INSERT INTO learnings_fts(learnings_fts, rowid, content, tags) VALUES ('delete', old.rowid, old.content, old.tags);
            INSERT INTO learnings_fts(rowid, content, tags) VALUES (new.rowid, new.content, new.tags);
          END;

          CREATE TRIGGER IF NOT EXISTS history_ai AFTER INSERT ON history BEGIN
            INSERT INTO history_fts(rowid, content, tags) VALUES (new.rowid, new.content, new.tags);
          END;
          CREATE TRIGGER IF NOT EXISTS history_ad AFTER DELETE ON history BEGIN
            INSERT INTO history_fts(history_fts, rowid, content, tags) VALUES ('delete', old.rowid, old.content, old.tags);
          END;
          CREATE TRIGGER IF NOT EXISTS history_au AFTER UPDATE ON history BEGIN
            INSERT INTO history_fts(history_fts, rowid, content, tags) VALUES ('delete', old.rowid, old.content, old.tags);
            INSERT INTO history_fts(rowid, content, tags) VALUES (new.rowid, new.content, new.tags);
          END;
        `);
        // Backfill existing records into FTS indexes
        this.db.exec(`
          INSERT INTO learnings_fts(rowid, content, tags) SELECT rowid, content, tags FROM learnings;
          INSERT INTO history_fts(rowid, content, tags) SELECT rowid, content, tags FROM history;
        `);
        const insertMeta = this.db.prepare('INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)');
        insertMeta.run('schema_version', '4');
        this.db.pragma('user_version = 4');
      })();
      currentVersion = 4;
    }

    // --- Migration v5: Unified memories table ---
    if (currentVersion < 5) {
      this.db.transaction(() => {
        // Create unified memories table
        this.db.exec(`
          CREATE TABLE IF NOT EXISTS memories (
            id TEXT PRIMARY KEY NOT NULL,
            project_id TEXT NOT NULL,
            category TEXT NOT NULL,
            content TEXT NOT NULL,
            tags TEXT NOT NULL DEFAULT '[]',
            embedding BLOB NOT NULL,
            scope TEXT NOT NULL DEFAULT 'project',
            importance INTEGER NOT NULL DEFAULT 3 CHECK (importance BETWEEN 1 AND 5),
            is_manual_scope INTEGER NOT NULL DEFAULT 0,
            task_id TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
          );
          CREATE INDEX IF NOT EXISTS idx_memories_project ON memories (project_id);
          CREATE INDEX IF NOT EXISTS idx_memories_category ON memories (project_id, category);
          CREATE INDEX IF NOT EXISTS idx_memories_created ON memories (project_id, created_at DESC);
          CREATE INDEX IF NOT EXISTS idx_memories_task ON memories (task_id) WHERE task_id IS NOT NULL;
        `);

        // Migrate learnings → memories
        const learnings = this.db.prepare(`
          SELECT id, project_id, content, tags, embedding, scope, importance, is_manual_scope, created_at
          FROM learnings
        `).all() as any[];
        const insertMemory = this.db.prepare(`
          INSERT OR IGNORE INTO memories (id, project_id, category, content, tags, embedding, scope, importance, is_manual_scope, task_id, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        for (const row of learnings) {
          insertMemory.run(row.id, row.project_id, 'learning', row.content, row.tags, row.embedding, row.scope, row.importance, row.is_manual_scope, null, row.created_at, row.created_at);
        }

        // Migrate history → memories
        const historyRows = this.db.prepare(`
          SELECT id, project_id, content, tags, embedding, scope, importance, task_id, created_at
          FROM history
        `).all() as any[];
        for (const row of historyRows) {
          insertMemory.run(row.id, row.project_id, 'history', row.content, row.tags, row.embedding, row.scope, row.importance, 0, row.task_id, row.created_at, row.created_at);
        }

        // Create unified FTS table
        this.db.exec(`
          CREATE VIRTUAL TABLE IF NOT EXISTS memories_fts USING fts5(
            content, tags,
            content='memories',
            content_rowid='rowid'
          );

          CREATE TRIGGER IF NOT EXISTS memories_ai AFTER INSERT ON memories BEGIN
            INSERT INTO memories_fts(rowid, content, tags) VALUES (new.rowid, new.content, new.tags);
          END;
          CREATE TRIGGER IF NOT EXISTS memories_ad AFTER DELETE ON memories BEGIN
            INSERT INTO memories_fts(memories_fts, rowid, content, tags) VALUES ('delete', old.rowid, old.content, old.tags);
          END;
          CREATE TRIGGER IF NOT EXISTS memories_au AFTER UPDATE ON memories BEGIN
            INSERT INTO memories_fts(memories_fts, rowid, content, tags) VALUES ('delete', old.rowid, old.content, old.tags);
            INSERT INTO memories_fts(rowid, content, tags) VALUES (new.rowid, new.content, new.tags);
          END;
        `);

        // Backfill FTS from migrated data
        this.db.exec(`INSERT INTO memories_fts(rowid, content, tags) SELECT rowid, content, tags FROM memories;`);

        // Drop old tables and their triggers/FTS
        this.db.exec(`
          DROP TRIGGER IF EXISTS learnings_ai;
          DROP TRIGGER IF EXISTS learnings_ad;
          DROP TRIGGER IF EXISTS learnings_au;
          DROP TRIGGER IF EXISTS history_ai;
          DROP TRIGGER IF EXISTS history_ad;
          DROP TRIGGER IF EXISTS history_au;
        `);
        // Drop FTS virtual tables (must use DROP TABLE for virtual tables)
        try { this.db.exec(`DROP TABLE IF EXISTS learnings_fts;`); } catch {}
        try { this.db.exec(`DROP TABLE IF EXISTS history_fts;`); } catch {}
        // Drop the old content tables
        this.db.exec(`DROP TABLE IF EXISTS learnings;`);
        this.db.exec(`DROP TABLE IF EXISTS history;`);

        // Migrate learning_query_matches to use memories table reference
        // The learning_query_matches table still works since it references by id

        const insertMeta = this.db.prepare('INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)');
        insertMeta.run('schema_version', '5');
        this.db.pragma('user_version = 5');
      })();
      currentVersion = 5;
    }

    // --- Migration v6: enrichment timestamp ---
    if (currentVersion < 6) {
      this.db.transaction(() => {
        this.db.exec(`
          ALTER TABLE memories ADD COLUMN enriched_at TEXT;
          CREATE INDEX IF NOT EXISTS idx_memories_unenriched
            ON memories (project_id) WHERE enriched_at IS NULL;
        `);
        // Existing rows were written with hand-supplied metadata, so they are
        // enriched by definition. Leaving them NULL would put the entire store
        // into the backlog and make the first query after upgrade drain it.
        this.db.exec(`UPDATE memories SET enriched_at = updated_at WHERE enriched_at IS NULL;`);
        const insertMeta = this.db.prepare('INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)');
        insertMeta.run('schema_version', '6');
        this.db.pragma('user_version = 6');
      })();
      currentVersion = 6;
    }
  }

  public async query(q: MemoryQuery): Promise<Memory[]> {
    await this.drainEnrichmentIfPending();
    return this.router.query(q);
  }

  public async queryVector(q: MemoryQuery): Promise<Memory[]> {
    const limit = q.limit ?? 5;
    const scopes = q.scopes ?? ['global', this.projectName];
    const placeholders = scopes.map(() => '?').join(',');
    const results: Memory[] = [];

    // Resolve categories to query
    let categoryFilter: string[] | null = null;
    if (q.categories && q.categories.length > 0) {
      categoryFilter = q.categories;
    } else if (q.category) {
      categoryFilter = [q.category];
    } else if (q.kind) {
      // Backward compat: kind → category
      categoryFilter = [q.kind === 'learning' ? 'learning' : 'history'];
    }
    // If no filter, query all categories

    const categoryClause = categoryFilter
      ? `AND category IN (${categoryFilter.map(() => '?').join(',')})`
      : '';
    const categoryParams = categoryFilter ?? [];

    if (q.text) {
      const queryVec = await this.embedder.embedQuery(q.text);

      const logId = crypto.randomUUID();
      const queryBlob = Buffer.from(queryVec.buffer, queryVec.byteOffset, queryVec.byteLength);
      const createdAt = new Date().toISOString();
      this.db.prepare(`
        INSERT INTO query_logs (id, project_id, query_text, embedding, scope, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(logId, this.projectId, q.text, queryBlob, scopes.join(','), createdAt);

      const RRF_K = 60;
      const RRF_MAX = 2 / (RRF_K + 1); // theoretical max when a doc ranks #1 in both lists

      // --- Semantic rank list ---
      const rows = (this.db.prepare(`
        SELECT id, category, content, tags, embedding, scope, importance, task_id, created_at
        FROM memories
        WHERE project_id = ? AND scope IN (${placeholders}) ${categoryClause}
      `).all(this.projectId, ...scopes, ...categoryParams) as any[]);

      // Compute semantic similarities and sort descending → rank position
      const withSim = rows.map(row => {
        const blob = row.embedding;
        const embeddingVec = new Float32Array(blob.buffer, blob.byteOffset, blob.byteLength / 4);
        return { row, similarity: dotProduct(queryVec, embeddingVec) };
      });
      withSim.sort((a, b) => b.similarity - a.similarity);
      // Only assign a semantic rank to records with positive similarity
      const semanticRank = new Map<string, number>();
      let semanticPos = 1;
      for (const { row, similarity } of withSim) {
        if (similarity > 0) semanticRank.set(row.id, semanticPos++);
      }

      // --- FTS rank list (if query has usable tokens) ---
      const ftsQuery = cleanFtsQuery(q.text);
      const ftsRank = new Map<string, number>();
      if (ftsQuery) {
        try {
          const ftsRows = (this.db.prepare(`
            SELECT m.id FROM memories_fts f
            JOIN memories m ON m.rowid = f.rowid
            WHERE f.memories_fts MATCH ? AND m.project_id = ? AND m.scope IN (${placeholders}) ${categoryClause}
            ORDER BY rank
          `).all(ftsQuery, this.projectId, ...scopes, ...categoryParams) as any[]);
          ftsRows.forEach((r, i) => ftsRank.set(r.id, i + 1));
        } catch {
          // Malformed FTS query — degrade gracefully to semantic-only
        }
      }

      // --- RRF fusion + Importance ---
      for (const { row } of withSim) {
        const sr = semanticRank.get(row.id) ?? Infinity;
        const fr = ftsRank.get(row.id) ?? Infinity;
        const rrfScore = (sr === Infinity ? 0 : 1 / (RRF_K + sr))
                       + (fr === Infinity ? 0 : 1 / (RRF_K + fr));
        const normRrf = rrfScore / RRF_MAX;
        const normImp = (row.importance - 1) / 4;
        const score = 0.75 * normRrf + 0.25 * normImp;

        results.push({
          id: row.id,
          category: row.category,
          kind: row.category, // backward compat
          content: row.content,
          score,
          tags: JSON.parse(row.tags),
          scope: row.scope,
          importance: row.importance,
          taskId: row.task_id ?? null,
          createdAt: row.created_at
        });
      }

      results.sort((a, b) => (b.score!) - (a.score!));
      return results.slice(0, limit);
    } else {
      // No text query — list mode
      const stmt = this.db.prepare(`
        SELECT id, category, content, tags, scope, importance, task_id, created_at
        FROM memories
        WHERE project_id = ? ${categoryClause}
        ORDER BY rowid ASC
      `);
      const rows = stmt.all(this.projectId, ...categoryParams) as any[];
      for (const row of rows) {
        results.push({
          id: row.id,
          category: row.category,
          kind: row.category, // backward compat
          content: row.content,
          tags: JSON.parse(row.tags),
          scope: row.scope,
          importance: row.importance,
          taskId: row.task_id ?? null,
          createdAt: row.created_at
        });
      }
      return results.slice(0, limit);
    }
  }

  /**
   * The single seam for write-side enrichment. Every write routes through here
   * — the CLI, the deprecated convenience helpers, and the storage router
   * alike — so enrichment placed here is applied exactly once.
   */
  public async transact(mutations: MemoryMutation[]): Promise<MutationResult[]> {
    const enriched: MemoryMutation[] = [];
    for (const m of mutations) {
      enriched.push(m.op === 'upsert' ? await this.enrichUpsert(m) : m);
    }
    return this.router.transact(enriched);
  }

  // --- Write-side enrichment ------------------------------------------------

  /**
   * Fill the metadata the caller left unset. Explicit input always wins
   * per-field (ADR 0010 §5); an empty tag array counts as unset, since no
   * caller means "definitely no tags" by passing one.
   */
  private async enrichUpsert(
    m: Extract<MemoryMutation, { op: 'upsert' }>
  ): Promise<MemoryMutation> {
    const cfg = this.config.llm.enrichment;
    const now = new Date().toISOString();
    const explicitCategory = m.category ?? m.kind;

    // Enrichment off entirely: category is still mandatory, and nothing is
    // pending, so the write must not enter the backlog.
    if (!cfg.enabled) {
      if (!explicitCategory) throw categoryRequired('is disabled (llm.enrichment.enabled: false)');
      return { ...m, enrichedAt: now };
    }

    const wantsTags = cfg.tags === 'infer' && (m.tags === undefined || m.tags.length === 0);
    const wantsCategory = !explicitCategory;
    const wantsImportance = cfg.importance === 'infer' && m.importance === undefined;

    if (!wantsTags && !wantsCategory && !wantsImportance) {
      if (!explicitCategory) throw categoryRequired('is off (llm.enrichment.category: off)');
      return { ...m, enrichedAt: now };
    }

    // The embedder is already loaded on the write path, so this second embed
    // costs ~4ms rather than the ~180ms a cold load would. It is computed here
    // rather than reused from `transactVector` so that enrichment works
    // identically in md-only mode, where `transactVector` never runs.
    let embedding: Float32Array | null = null;
    if (wantsTags || (wantsCategory && cfg.categoryStrategy === 'centroid')) {
      try {
        embedding = await this.embedder.embed(m.content);
      } catch {
        this.recordDegradation('embedder_unavailable');
      }
    }

    const tags = wantsTags && embedding
      ? selectTags(embedding, this.getTagVocabulary(), {
          maxTags: cfg.maxTags,
          minSimilarity: cfg.minTagSimilarity,
        })
      : m.tags;

    let category = explicitCategory;
    let importance = m.importance;

    if (wantsCategory) {
      if (cfg.category === 'off') throw categoryRequired('is off (llm.enrichment.category: off)');

      const declared = Object.keys(this.config.categories);
      let cause = 'is unavailable';

      if (cfg.categoryStrategy === 'centroid') {
        category = embedding
          ? selectCategory(embedding, this.getCategoryCentroids(declared))
          : undefined;
        if (!category) {
          cause = 'found no category close enough to this entry';
          this.recordDegradation('category_centroid_miss');
        }
      } else {
        // Importance rides the same call: with the model already loaded the
        // extra inference is nearly free.
        const result = await this.enricher.inferCategoryAndImportance({
          content: m.content,
          categories: declared.map(name => ({
            name,
            description: this.config.categories[name]?.description,
          })),
        });
        if (result.degraded) {
          cause = describeDegradation(result.degraded);
          this.recordDegradation(result.degraded);
        }
        category = result.category;
        if (wantsImportance) importance = clampImportance(result.importance);
      }

      if (!category) {
        // A literal category name in the config is the configured fallback for
        // exactly this case; left as `infer`, it is a hard error instead.
        if (cfg.category !== 'infer' && cfg.category !== 'off') {
          category = cfg.category;
        } else {
          throw categoryRequired(cause);
        }
      }
    }

    // Importance alone never justifies a ~3.2s model load on the interactive
    // write path — it defers to the backlog, which drains before the next read.
    const deferred = wantsImportance && importance === undefined;

    return {
      ...m,
      category,
      kind: undefined,
      tags,
      importance,
      enrichedAt: deferred ? null : now,
    };
  }

  private getTagVocabulary(): Centroid[] {
    if (this.tagVocabulary) return this.tagVocabulary;
    if (!this.db) return (this.tagVocabulary = []);

    const declaredTags = Object.values(this.config.categories).flatMap(c => c.tags ?? []);
    const rows = this.db.prepare(
      `SELECT tags, embedding FROM memories WHERE project_id = ? AND tags != '[]'`
    ).all(this.projectId) as any[];

    const entries = rows.map(row => ({
      tags: safeParseTags(row.tags),
      embedding: toFloat32(row.embedding),
    }));

    this.tagVocabulary = buildTagVocabulary(entries, declaredTags);
    return this.tagVocabulary;
  }

  private getCategoryCentroids(allowed: string[]): Centroid[] {
    if (!this.db) return [];
    const rows = this.db.prepare(
      `SELECT category, embedding FROM memories WHERE project_id = ?`
    ).all(this.projectId) as any[];
    return buildCategoryCentroids(
      rows.map(row => ({ category: row.category, embedding: toFloat32(row.embedding) })),
      allowed
    );
  }

  // --- The enrichment backlog ----------------------------------------------

  /** Entries written with importance deferred, awaiting a drain. */
  public countPendingEnrichment(): number {
    if (!this.db) return 0;
    const row = this.db.prepare(
      `SELECT COUNT(*) as count FROM memories WHERE project_id = ? AND enriched_at IS NULL`
    ).get(this.projectId) as { count: number } | undefined;
    return row?.count ?? 0;
  }

  /**
   * Guard the drain on a single count, cheap enough to run on every command in
   * the same spirit as the stat-only fingerprint guard on the drift rescan.
   */
  private async drainEnrichmentIfPending(): Promise<void> {
    if (!this.db) return;
    if (!this.config.llm.enrichment.enabled) return;
    if (this.countPendingEnrichment() === 0) return;
    try {
      await this.drainEnrichment();
    } catch {
      // The backlog must never be able to break a read.
    }
  }

  /**
   * Drain the whole backlog. The drain is unbounded — it completes rather than
   * working to a budget, because a bounded drain would make retrieval quality
   * depend on how much had been written recently.
   *
   * A row whose inference degrades is still stamped enriched. Leaving it NULL
   * would make every subsequent query re-attempt a cold model load forever; the
   * degradation counter on `neuron status` is what makes the loss visible.
   */
  public async drainEnrichment(): Promise<{ drained: number; degraded: number }> {
    if (!this.db) return { drained: 0, degraded: 0 };

    const rows = this.db.prepare(
      `SELECT id, content FROM memories WHERE project_id = ? AND enriched_at IS NULL ORDER BY rowid ASC`
    ).all(this.projectId) as any[];
    if (rows.length === 0) return { drained: 0, degraded: 0 };

    const stamp = this.db.prepare(
      `UPDATE memories SET importance = ?, enriched_at = ? WHERE id = ? AND project_id = ?`
    );
    let degraded = 0;

    for (const row of rows) {
      const result = await this.enricher.inferImportance({ content: row.content });
      if (result.degraded) {
        degraded++;
        this.recordDegradation(result.degraded);
      }
      const importance = clampImportance(result.importance);
      const now = new Date().toISOString();
      if (importance !== undefined) {
        stamp.run(importance, now, row.id, this.projectId);
      } else {
        this.db.prepare(
          `UPDATE memories SET enriched_at = ? WHERE id = ? AND project_id = ?`
        ).run(now, row.id, this.projectId);
      }
    }

    return { drained: rows.length, degraded };
  }

  /**
   * Silence without counters is how a broken 0.5B model goes unnoticed for
   * months (ADR 0010 §3). Counts live in `meta` so they survive the process.
   */
  private recordDegradation(reason: string): void {
    if (!this.db) return;
    try {
      this.db.prepare(`
        INSERT INTO meta (key, value) VALUES (?, '1')
        ON CONFLICT(key) DO UPDATE SET value = CAST(CAST(value AS INTEGER) + 1 AS TEXT)
      `).run(`${DEGRADATION_KEY_PREFIX}${reason}`);
    } catch {}
  }

  private readDegradationCounters(): Record<string, number> {
    if (!this.db) return {};
    const rows = this.db.prepare(
      `SELECT key, value FROM meta WHERE key LIKE ?`
    ).all(`${DEGRADATION_KEY_PREFIX}%`) as any[];
    return Object.fromEntries(
      rows.map(r => [r.key.slice(DEGRADATION_KEY_PREFIX.length), parseInt(r.value, 10) || 0])
    );
  }

  public async transactVector(mutations: MemoryMutation[]): Promise<MutationResult[]> {
    const results: MutationResult[] = [];
    
    const vectors = new Map<string, Float32Array>();
    for (let i = 0; i < mutations.length; i++) {
      const m = mutations[i];
      if (m.op === 'upsert' || (m.op === 'update' && m.content !== undefined)) {
        const contentToEmbed = m.content!;
        const vec = await this.embedder.embed(contentToEmbed);
        vectors.set(i.toString(), vec);
      }
    }

    this.db.transaction(() => {
      for (let i = 0; i < mutations.length; i++) {
        const m = mutations[i];
        const category = resolveCategory(m);
        
        if (m.op === 'upsert' || m.op === 'update') {
          const id = m.id || crypto.randomUUID();
          
          const exists = this.db.prepare(`SELECT 1 FROM memories WHERE id = ? AND project_id = ?`).get(id, this.projectId);
          
          if (exists) {
            const sets: string[] = [];
            const params: any[] = [];
            
            if (m.content !== undefined) {
              const vec = vectors.get(i.toString())!;
              const blob = Buffer.from(vec.buffer, vec.byteOffset, vec.byteLength);
              sets.push('content = ?', 'embedding = ?');
              params.push(m.content, blob);
            }
            if (m.tags !== undefined) { sets.push('tags = ?'); params.push(JSON.stringify(m.tags)); }
            if (m.importance !== undefined) { sets.push('importance = ?'); params.push(m.importance); }
            if (m.scope !== undefined) { 
              sets.push('scope = ?'); params.push(m.scope); 
              sets.push('is_manual_scope = 1');
            }
            if (m.taskId !== undefined) { sets.push('task_id = ?'); params.push(m.taskId); }
            if (m.createdAt !== undefined) { sets.push('created_at = ?'); params.push(m.createdAt); }
            if (m.enrichedAt !== undefined) { sets.push('enriched_at = ?'); params.push(m.enrichedAt); }
            sets.push('updated_at = ?'); params.push(new Date().toISOString());
            
            if (sets.length > 0) {
              params.push(id, this.projectId);
              this.db.prepare(`UPDATE memories SET ${sets.join(', ')} WHERE id = ? AND project_id = ?`).run(...params);
            }
            
            results.push({ id, status: 'updated', project: this.projectName });
          } else if (m.op === 'upsert') {
            if (m.content === undefined) throw new Error('Content is required for upsert');
            const vec = vectors.get(i.toString())!;
            const blob = Buffer.from(vec.buffer, vec.byteOffset, vec.byteLength);
            const tagsJson = JSON.stringify(m.tags ?? []);
            const importance = m.importance ?? 3;
            const scope = m.scope ?? this.projectName;
            const isManualScope = m.scope !== undefined ? 1 : 0;
            const now = new Date().toISOString();
            const createdAt = m.createdAt ?? now;
            const taskId = m.taskId ?? null;

            this.db.prepare(`
              INSERT INTO memories (id, project_id, category, content, tags, embedding, scope, importance, is_manual_scope, task_id, created_at, updated_at, enriched_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(id, this.projectId, category, m.content, tagsJson, blob, scope, importance, isManualScope, taskId, createdAt, now, m.enrichedAt ?? null);
            results.push({ id, status: 'created', project: this.projectName });
          } else {
            results.push({ id, status: 'not_found', project: this.projectName });
          }
        } else if (m.op === 'delete') {
          const info = this.db.prepare(`DELETE FROM memories WHERE id = ? AND project_id = ?`).run(m.id, this.projectId);
          results.push({ id: m.id, status: info.changes > 0 ? 'deleted' : 'not_found', project: this.projectName });
        }
      }
    })();
    
    return results;
  }

  public maintain(policy: MaintenancePolicy): MaintenanceReport {
    const report: MaintenanceReport = { project: this.projectName };
    
    this.db.transaction(() => {
      if (policy.consolidate) {
        const getWatermarkAt = this.db.prepare("SELECT value FROM meta WHERE key = 'last_consolidated_at'");
        const watermarkAtRow = getWatermarkAt.get() as { value: string } | undefined;
        const previousCursor = watermarkAtRow ? watermarkAtRow.value : null;

        const getWatermarkRowid = this.db.prepare("SELECT value FROM meta WHERE key = 'last_consolidated_rowid'");
        const watermarkRowidRow = getWatermarkRowid.get() as { value: string } | undefined;
        const lastRowid = watermarkRowidRow ? parseInt(watermarkRowidRow.value, 10) : 0;

        const stmt = this.db.prepare(`
          SELECT rowid, id, category, content, tags, task_id, created_at
          FROM memories
          WHERE project_id = ? AND category = 'history' AND rowid > ?
          ORDER BY rowid ASC
        `);
        const rows = stmt.all(this.projectId, lastRowid) as any[];

        const consolidatedAt = new Date().toISOString();
        
        if (rows.length > 0) {
          const maxRowid = rows[rows.length - 1].rowid;
          const updateWatermarkRowid = this.db.prepare("INSERT OR REPLACE INTO meta (key, value) VALUES ('last_consolidated_rowid', ?)");
          updateWatermarkRowid.run(maxRowid.toString());
        }
        
        const updateWatermarkAt = this.db.prepare("INSERT OR REPLACE INTO meta (key, value) VALUES ('last_consolidated_at', ?)");
        updateWatermarkAt.run(consolidatedAt);

        const entries: Memory[] = rows.map(row => ({
          id: row.id,
          category: 'history',
          kind: 'history',
          content: row.content,
          tags: JSON.parse(row.tags),
          taskId: row.task_id,
          createdAt: row.created_at
        }));

        report.consolidated = { entries, consolidatedAt, previousCursor };
      }

      if (policy.autoPromote) {
        const promoted: Array<{ id: string; from: string; to: string }> = [];
        const demoted: Array<{ id: string; from: string; to: string }> = [];

        const queryLogs = this.db.prepare(`
          SELECT id, embedding, created_at FROM query_logs WHERE project_id = ?
        `).all(this.projectId) as any[];

        const memories = this.db.prepare(`
          SELECT id, embedding, scope, is_manual_scope, importance FROM memories WHERE project_id = ? AND category = 'learning'
        `).all(this.projectId) as any[];

        if (queryLogs.length > 0 && memories.length > 0) {
          const insertMatch = this.db.prepare(`
            INSERT OR IGNORE INTO learning_query_matches (learning_id, query_log_id, matched_at)
            VALUES (?, ?, ?)
          `);

          for (const qLog of queryLogs) {
            const qVec = new Float32Array(qLog.embedding.buffer, qLog.embedding.byteOffset, qLog.embedding.byteLength / 4);
            for (const mem of memories) {
              const lVec = new Float32Array(mem.embedding.buffer, mem.embedding.byteOffset, mem.embedding.byteLength / 4);
              const similarity = dotProduct(qVec, lVec);
              if (similarity >= 0.80) {
                insertMatch.run(mem.id, qLog.id, qLog.created_at);
              }
            }
          }

          const cutoffDate = new Date();
          cutoffDate.setDate(cutoffDate.getDate() - 30);
          const cutoffStr = cutoffDate.toISOString();

          const countStmt = this.db.prepare(`
            SELECT COUNT(DISTINCT query_log_id) as count
            FROM learning_query_matches
            WHERE learning_id = ? AND matched_at >= ?
          `);

          const updateScopeStmt = this.db.prepare(`
            UPDATE memories SET scope = ? WHERE id = ? AND project_id = ?
          `);

          for (const mem of memories) {
            if (mem.is_manual_scope === 1) continue;

            const countRow = countStmt.get(mem.id, cutoffStr) as { count: number };
            const matchCount = countRow ? countRow.count : 0;
            const currentScope = mem.scope;

            let targetScope = currentScope;

            if (currentScope !== 'global' && matchCount >= 15) {
              targetScope = 'global';
            } else if ((currentScope === this.projectName || currentScope === 'people') && matchCount >= 5) {
              targetScope = 'project';
            }

            if (targetScope === currentScope && (mem.importance ?? 3) < 4) {
              if (currentScope === 'global' && matchCount < 10) {
                targetScope = matchCount < 3 ? this.projectName : 'project';
              } else if (currentScope === 'project' && matchCount < 3) {
                targetScope = this.projectName;
              }
            }

            if (targetScope !== currentScope) {
              updateScopeStmt.run(targetScope, mem.id, this.projectId);
              if (
                (currentScope !== 'global' && targetScope === 'global') ||
                ((currentScope === this.projectName || currentScope === 'people') && targetScope === 'project')
              ) {
                promoted.push({ id: mem.id, from: currentScope, to: targetScope });
              } else {
                demoted.push({ id: mem.id, from: currentScope, to: targetScope });
              }
            }
          }
        }
        report.promotions = { promoted, demoted };
      }

      if (policy.pruneHistoryBeforeDays !== undefined) {
        const days = policy.pruneHistoryBeforeDays;
        const maxImportance = policy.maxPruneImportance ?? 3;

        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);
        const cutoffStr = cutoffDate.toISOString();

        const stmt = this.db.prepare(`
          DELETE FROM memories
          WHERE project_id = ?
            AND category = 'history'
            AND created_at < ?
            AND importance <= ?
        `);

        const info = stmt.run(this.projectId, cutoffStr, maxImportance);
        report.prunedCount = info.changes;
      }
    })();
    
    return report;
  }

  public getStatus(): any {
    let totalCount = 0;
    let learnCount = 0;
    let historyCount = 0;
    let categories: string[] = [];

    if (this.db) {
      const totalRow = this.db.prepare('SELECT COUNT(*) as count FROM memories WHERE project_id = ?').get(this.projectId) as { count: number };
      totalCount = totalRow ? totalRow.count : 0;

      const learnRow = this.db.prepare("SELECT COUNT(*) as count FROM memories WHERE project_id = ? AND category = 'learning'").get(this.projectId) as { count: number };
      learnCount = learnRow ? learnRow.count : 0;

      const historyRow = this.db.prepare("SELECT COUNT(*) as count FROM memories WHERE project_id = ? AND category = 'history'").get(this.projectId) as { count: number };
      historyCount = historyRow ? historyRow.count : 0;

      const categoryRows = this.db.prepare('SELECT DISTINCT category FROM memories WHERE project_id = ?').all(this.projectId) as any[];
      categories = categoryRows.map(r => r.category);
    }

    const appPaths = envPaths('neuron', { suffix: '' });
    const modelCacheDir = path.join(appPaths.data, 'models');
    const onnxPath = path.join(modelCacheDir, 'Xenova/bge-small-en-v1.5', 'onnx', 'model_quantized.onnx');
    const modelReady = fs.existsSync(onnxPath) ? 'ready' : 'not-cached';

    const enrichmentCfg = this.config.llm.enrichment;

    return {
      project: this.projectName,
      projectRoot: this.projectRoot,
      db: this.db ? 'ready' : 'md-only',
      model: modelReady,
      modelName: 'Xenova/bge-small-en-v1.5',
      totalCount,
      learnCount,
      historyCount,
      categories,
      enrichment: {
        enabled: enrichmentCfg.enabled,
        category: enrichmentCfg.category,
        tags: enrichmentCfg.tags,
        importance: enrichmentCfg.importance,
        pending: this.countPendingEnrichment(),
        degraded: this.readDegradationCounters()
      }
    };
  }

  public close(): void {
    if (this.db) {
      this.db.close();
    }
  }

  // --- DEPRECATED METHODS (WRAPPERS) TO KEEP TESTS/CLI HAPPY TEMPORARILY ---

  public async addLearning(content: string, tags?: string[], options: { importance?: number; scope?: string } = {}): Promise<any> {
    const res = await this.transact([{ op: 'upsert', category: 'learning', content, tags, importance: options.importance, scope: options.scope }]);
    return res[0];
  }
  public async queryLearnings(query: string, options: { limit?: number; scopes?: string[] } = {}): Promise<any> {
    const results = await this.query({ text: query, categories: ['learning'], limit: options.limit, scopes: options.scopes });
    return { results, project: this.projectName, query };
  }
  public listLearnings(options: { limit?: number } = {}): any[] {
    const limit = options.limit ?? 20;
    const stmt = this.db.prepare(`SELECT id, content, tags, created_at FROM memories WHERE project_id = ? AND category = 'learning' ORDER BY rowid ASC LIMIT ?`);
    return (stmt.all(this.projectId, limit) as any[]).map(row => ({
      id: row.id, content: row.content, tags: JSON.parse(row.tags), createdAt: row.created_at
    }));
  }
  public async updateLearning(id: string, content: string, options: { tags?: string[]; importance?: number; scope?: string } = {}): Promise<any> {
    const res = await this.transact([{ op: 'update', category: 'learning', id, content, tags: options.tags, importance: options.importance, scope: options.scope }]);
    return res[0];
  }
  public deleteLearning(id: string): any {
    const info = this.db.prepare(`DELETE FROM memories WHERE id = ? AND project_id = ?`).run(id, this.projectId);
    return { id, status: info.changes > 0 ? 'deleted' : 'not_found', project: this.projectName };
  }

  public async addHistory(content: string, options: { taskId?: string; tags?: string[]; importance?: number; scope?: string } = {}): Promise<any> {
    const res = await this.transact([{ op: 'upsert', category: 'history', content, tags: options.tags, taskId: options.taskId, importance: options.importance, scope: options.scope }]);
    return res[0];
  }
  public async queryHistory(query: string, options: { limit?: number; scopes?: string[] } = {}): Promise<any> {
    const results = await this.query({ text: query, categories: ['history'], limit: options.limit, scopes: options.scopes });
    return { results, project: this.projectName, query };
  }
  public listHistory(options: { limit?: number } = {}): any[] {
    const limit = options.limit ?? 20;
    const stmt = this.db.prepare(`SELECT id, content, tags, task_id, created_at FROM memories WHERE project_id = ? AND category = 'history' ORDER BY rowid DESC LIMIT ?`);
    return (stmt.all(this.projectId, limit) as any[]).map(row => ({
      id: row.id, content: row.content, tags: JSON.parse(row.tags), taskId: row.task_id, createdAt: row.created_at
    }));
  }
  public deleteHistory(id: string): any {
    const info = this.db.prepare(`DELETE FROM memories WHERE id = ? AND project_id = ?`).run(id, this.projectId);
    return { id, status: info.changes > 0 ? 'deleted' : 'not_found', project: this.projectName };
  }
  public consolidateHistory(): any {
    const report = this.maintain({ consolidate: true, autoPromote: true });
    return {
      entries: report.consolidated?.entries || [],
      consolidatedAt: report.consolidated?.consolidatedAt,
      previousCursor: report.consolidated?.previousCursor,
      promotions: report.promotions,
      project: this.projectName
    };
  }
  public checkAutoPromotions(): any {
    const report = this.maintain({ autoPromote: true });
    return report.promotions || { promoted: [], demoted: [] };
  }
  public pruneHistory(options: { days?: number; maxImportance?: number } = {}): any {
    const report = this.maintain({ pruneHistoryBeforeDays: options.days ?? 30, maxPruneImportance: options.maxImportance ?? 3 });
    return { deletedCount: report.prunedCount ?? 0 };
  }
}

function dotProduct(a: Float32Array, b: Float32Array): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) {
    s += a[i] * b[i];
  }
  return s;
}

const DEGRADATION_KEY_PREFIX = 'enrichment_degraded:';

/**
 * Category is a non-nullable column that determines storage routing, so no
 * entry can be written without one. When inference cannot produce a declared
 * category and no fallback is configured, the write fails naming the cause —
 * it never guesses and never invents a category.
 */
function categoryRequired(cause: string): Error {
  return new Error(
    `Error: --category is required — category inference ${cause}. ` +
      `Pass --category <name>, or set llm.enrichment.category in neuron.yaml to a ` +
      `declared category to use as a fallback.`
  );
}

function describeDegradation(reason: string): string {
  switch (reason) {
    case 'timeout': return 'timed out';
    case 'model_disabled': return 'is disabled in this environment';
    case 'model_unavailable': return 'could not load the local model';
    case 'category_not_declared': return 'did not name a declared category';
    case 'empty_generation': return 'produced no output';
    case 'no_declared_categories': return 'has no declared categories to choose from';
    default: return 'failed';
  }
}

/** The `importance` column default, and the floor inference may not go below. */
const DEFAULT_IMPORTANCE = 3;

/**
 * Inferred importance is floored at the entry default, so inference can raise
 * an entry's importance but never lower it.
 *
 * The spec shipped this unclamped and deferred the decision to the benchmark,
 * with the explicit trigger: revisit if the benchmark shows the model marking
 * critical entries prune-eligible. Pillar 10 showed exactly that — asked to
 * rate a note about irreversible production data loss, the model answered `1`.
 * A floor makes enrichment incapable of *increasing* prune eligibility, which
 * is the destructive direction; the upside (raising a genuinely critical entry
 * clear of the threshold) is unaffected.
 *
 * Out-of-range values are dropped rather than floored so a malformed
 * generation cannot violate the column's CHECK constraint.
 */
function clampImportance(value: number | undefined): number | undefined {
  if (value === undefined || !Number.isFinite(value)) return undefined;
  const rounded = Math.round(value);
  if (rounded < 1 || rounded > 5) return undefined;
  return Math.max(DEFAULT_IMPORTANCE, rounded);
}

function safeParseTags(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(t => typeof t === 'string') : [];
  } catch {
    return [];
  }
}

function toFloat32(blob: Buffer): Float32Array {
  return new Float32Array(blob.buffer, blob.byteOffset, blob.byteLength / 4);
}
