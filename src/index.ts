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
  NeuronMemoryOptions,
  FieldComplianceViolation,
  FieldRepairOutcome,
  StoreHealth,
  DuplicateGroup,
  DuplicateGroupEntry,
  DuplicateMergeOutcome,
  StoreHealthRepairReport
} from './models/index.js';

export { openDatabase };
export * from './models/index.js';
export * from './components/index.js';
export * from './config/index.js';

import { DualStorageRouter } from './storage/dualStorageRouter.js';
import { MultiRootMdStorage } from './storage/multiRootMdStorage.js';
import {
  loadNeuronYaml,
  findNeuronYaml,
  declareCategoryInNeuronYaml,
  NeuronConfig,
  fieldKeyToFlagName,
  fieldKeyToColumnName,
  isValidColumnIdentifier,
  collectDeclaredFieldFlags,
} from './config/neuronYaml.js';
import { resolveAllCategoryRoots } from './config/categoryPath.js';
import { suggestClosest } from './shared/textMatch.js';
import { getHeadSha, listAllCommits, listCommitsSince } from './harnesses/gitLog.js';

/** A `searchGitLog` hit: an indexed commit that cleared the ADR 0012-style relevance gate. */
export interface GitLogHit {
  hash: string;
  subject: string;
  body: string;
  committedAt: string;
  similarity: number;
}

const GIT_LOG_LAST_INDEXED_SHA_KEY = 'git_log_last_indexed_sha';

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

/**
 * Every declared field, across every category, deduplicated by key — two
 * categories sharing a field key share one column, matching how they
 * already share one CLI flag (`collectDeclaredFieldFlags`). Column-name
 * validity (identifier pattern, no collision with a reserved column or
 * another field) is already enforced once, at config-load time
 * (`validateDeclaredFields` in `neuronYaml.ts`), so this is a pure
 * derivation with no new failure mode of its own.
 */
function computeFieldColumns(config: NeuronConfig): Array<{ key: string; column: string }> {
  const byKey = new Map<string, string>();
  for (const { key } of collectDeclaredFieldFlags(config)) {
    if (!byKey.has(key)) byKey.set(key, fieldKeyToColumnName(key));
  }
  return [...byKey.entries()].map(([key, column]) => ({ key, column }));
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
  /**
   * Every declared field, across every category, paired with the SQLite
   * column it owns (ticket 44). Computed once from config at construction —
   * same per-process lifetime rationale as `tagVocabulary` above — and
   * shared by the additive migration, the write path and the read path so
   * there is exactly one derivation of "key → column" per process.
   */
  private fieldColumns: Array<{ key: string; column: string }>;
  /**
   * Absolute path to this project's `neuron.yaml`, or `null` if none was
   * found (a project running on `DEFAULT_CONFIG`). ADR 0017's auto-declare
   * hook writes back through this path; `null` means there is no file on
   * disk to append to, so the hook only updates the in-memory config for
   * the rest of this process.
   */
  private configPath: string | null;

  constructor(options: NeuronMemoryOptions) {
    this.projectRoot = options.projectRoot;
    this.projectName = options.projectName;
    this.projectId = crypto
      .createHash('sha256')
      .update(options.projectRoot)
      .digest('hex')
      .slice(0, 16);

    this.embedder = options.embedder ?? new TransformersEmbedder();

    this.configPath = findNeuronYaml(options.projectRoot);
    const discovered = loadNeuronYaml(options.projectRoot);
    const config: NeuronConfig = options.storageMode
      ? { ...discovered, storage: { ...discovered.storage, mode: options.storageMode } }
      : discovered;
    this.config = config;
    this.fieldColumns = computeFieldColumns(config);
    this.enricher =
      options.enricher ??
      new LocalEnrichmentModel({ timeoutMs: config.llm.enrichment.timeoutMs });
    const mdAdapter = new MultiRootMdStorage(config, options.projectRoot);

    // Every storage mode keeps the database now: `md-only` (which set
    // `this.db = null`) was deleted by ticket 28 — every one of its defects
    // traced to that one line. `md` mode demotes SQLite to a rebuildable
    // index rather than removing it.
    this.db = openDatabase(options.dbPath);
    this.initialize();
    this.migrateDeclaredFields();

    const vectorDbDelegate = {
      transact: (mutations: MemoryMutation[]) => this.transactVector(mutations),
      query: (q: MemoryQuery) => this.queryVector(q),
      getMeta: (key: string) => this.getMeta(key),
      setMeta: (key: string, value: string) => this.setMeta(key, value),
      listStoredCategories: () => this.listStoredCategories(),
    } as any;

    this.router = new DualStorageRouter(vectorDbDelegate, mdAdapter, config, options.projectRoot);
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
      enricher,
      // `projectRoot` here is fabricated, so `.neuron/` under it is a path
      // nobody can write. Pinning the mode keeps an in-memory store in memory
      // now that the schema default is `md` (ticket 31); markdown routing is
      // exercised by constructing a router against a real directory instead.
      storageMode: 'vector',
    });
  }

  public getDb(): any { return this.db; }
  public getProjectId(): string { return this.projectId; }
  public getEmbedder(): Embedder { return this.embedder; }
  /** The loaded, validated `neuron.yaml` — the CLI layer reads it for dynamic `--help` text and the declared-field CLI flag surface (ticket 43). */
  public getConfig(): NeuronConfig { return this.config; }

  public getMeta(key: string): string | null {
    if (!this.db) return null;
    const row = this.db.prepare('SELECT value FROM meta WHERE key = ?').get(key) as { value: string } | undefined;
    return row ? row.value : null;
  }

  /**
   * Every category the index actually holds rows for, which is not the same
   * set as the categories declared in `neuron.yaml` — nothing validates a
   * `--category` against the config, so a store routinely holds categories no
   * config mentions (`neuron scan`'s `architecture` being the common one).
   * The bootstrap seed needs the real set, not the declared one.
   */
  public listStoredCategories(): string[] {
    if (!this.db) return [];
    const rows = this.db
      .prepare('SELECT DISTINCT category FROM memories WHERE project_id = ?')
      .all(this.projectId) as { category: string }[];
    return rows.map(r => r.category).filter(Boolean);
  }

  public setMeta(key: string, value: string): void {
    if (!this.db) return;
    this.db.prepare('INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)').run(key, value);
  }

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
    // The column records that a write went through enrichment. It once also
    // drove a deferral backlog for model-inferred importance; ticket 26 removed
    // that job, so no row is written NULL any more and the partial index below
    // covers an empty set. Both are kept rather than migrated away — the
    // timestamp is still an honest record, and dropping a column would make an
    // rc1/rc2 database non-downgradable for no gain.
    if (currentVersion < 6) {
      this.db.transaction(() => {
        this.db.exec(`
          ALTER TABLE memories ADD COLUMN enriched_at TEXT;
          CREATE INDEX IF NOT EXISTS idx_memories_unenriched
            ON memories (project_id) WHERE enriched_at IS NULL;
        `);
        // Existing rows were written with hand-supplied metadata, so they are
        // enriched by definition.
        this.db.exec(`UPDATE memories SET enriched_at = updated_at WHERE enriched_at IS NULL;`);
        const insertMeta = this.db.prepare('INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)');
        insertMeta.run('schema_version', '6');
        this.db.pragma('user_version = 6');
      })();
      currentVersion = 6;
    }

    // --- Migration v7: remove `scope` (ticket 38) ---
    // `scope` was designed for a multi-tenant ambition never pursued (ADR 0011
    // Consequence 1) — measured at 1 distinct value across 264 rows on this
    // repo's own store. `is_manual_scope`, `query_logs` and
    // `learning_query_matches` existed solely to serve it and had zero other
    // readers, so all four are dropped together rather than deprecated in place.
    if (currentVersion < 7) {
      this.db.transaction(() => {
        this.db.exec(`
          ALTER TABLE memories DROP COLUMN scope;
          ALTER TABLE memories DROP COLUMN is_manual_scope;
          DROP TABLE IF EXISTS query_logs;
          DROP TABLE IF EXISTS learning_query_matches;
        `);
        const insertMeta = this.db.prepare('INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)');
        insertMeta.run('schema_version', '7');
        this.db.pragma('user_version = 7');
      })();
      currentVersion = 7;
    }

    // --- Migration v8: memory supersession (ticket 17 / ADR 0015) ---
    // Additive-only, both columns default NULL on existing rows: a row is
    // live unless `superseded_by` says otherwise. No backfill needed — the
    // two known-reversed pairs in this repo's own store are hand-fixed
    // separately (ADR 0015 Decision 5), not migrated.
    if (currentVersion < 8) {
      this.db.transaction(() => {
        this.db.exec(`
          ALTER TABLE memories ADD COLUMN superseded_by TEXT;
          ALTER TABLE memories ADD COLUMN superseded_at TEXT;
          CREATE INDEX IF NOT EXISTS idx_memories_superseded
            ON memories (project_id) WHERE superseded_by IS NOT NULL;
        `);
        const insertMeta = this.db.prepare('INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)');
        insertMeta.run('schema_version', '8');
        this.db.pragma('user_version = 8');
      })();
      currentVersion = 8;
    }

    // --- Migration v9: git-log index (ticket 08 / neuron-2.4.0, ruled by
    // ticket 39 / neuron-2.3.0) ---
    // A derived cache over content git itself already owns (ADR-scope note
    // in ticket 39's Answer: no markdown mirror, no ADR — this isn't
    // authoritative content the way `memories` is). `embedding` mirrors
    // `memories`: a normalized BLOB, dot-product-comparable via the same
    // `dotProduct`/`toFloat32` helpers. `git_log_fts` mirrors `memories_fts`
    // exactly (content table + sync triggers) so `searchGitLog`'s relevance
    // gate can reuse `queryGated`'s own predicate (`ftsMatched`) against a
    // parallel table rather than inventing a new gate mechanism. Commits are
    // immutable and hashes unique, so only an insert trigger is needed — no
    // update/delete path ever fires against this table.
    if (currentVersion < 9) {
      this.db.transaction(() => {
        this.db.exec(`
          CREATE TABLE IF NOT EXISTS git_log_index (
            hash TEXT PRIMARY KEY NOT NULL,
            subject TEXT NOT NULL,
            body TEXT NOT NULL,
            embedding BLOB NOT NULL,
            committed_at TEXT NOT NULL
          );

          CREATE VIRTUAL TABLE IF NOT EXISTS git_log_fts USING fts5(
            subject, body,
            content='git_log_index',
            content_rowid='rowid'
          );

          CREATE TRIGGER IF NOT EXISTS git_log_index_ai AFTER INSERT ON git_log_index BEGIN
            INSERT INTO git_log_fts(rowid, subject, body) VALUES (new.rowid, new.subject, new.body);
          END;
        `);
        const insertMeta = this.db.prepare('INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)');
        insertMeta.run('schema_version', '9');
        this.db.pragma('user_version = 9');
      })();
      currentVersion = 9;
    }
  }

  /**
   * Additive-only SQLite parity for declared category fields (ticket 44 /
   * ADR 0013). Unlike the `user_version`-gated migrations above, this is not
   * a fixed schema step — it runs on every open, diffing whatever
   * `neuron.yaml` currently declares against `PRAGMA table_info(memories)`
   * and adding one nullable `TEXT` column per field that is missing.
   * Idempotent by construction (the diff is against live schema state, not
   * a version counter), and additive-only: a field removed from config
   * simply stops appearing in `this.fieldColumns`, so its column and data
   * are left alone rather than dropped — matching ticket 38's precedent
   * that any column removal is an explicit, reviewed migration, never an
   * automatic one.
   *
   * Enum membership is enforced in application code (`enforceFieldSchema`),
   * not a SQL `CHECK` constraint, so changing a team's allowed enum values
   * in `neuron.yaml` never requires a table rebuild.
   */
  private migrateDeclaredFields(): void {
    if (this.fieldColumns.length === 0) return;

    const existing = new Set(
      (this.db.pragma('table_info(memories)') as Array<{ name: string }>).map((c) => c.name)
    );
    const missing = this.fieldColumns.filter((c) => !existing.has(c.column));
    if (missing.length === 0) return;

    this.db.transaction(() => {
      for (const { key, column } of missing) {
        // Re-validated here, immediately before interpolation into DDL, even
        // though `validateNeuronYaml` already refused an unsafe column name
        // at config-load time — this call site is the one that actually
        // builds the SQL string, and it should not have to trust a caller
        // three layers away to have done that check.
        if (!isValidColumnIdentifier(column)) {
          throw new Error(
            `neuron: refusing to add SQLite column "${column}" for declared field "${key}" — fails identifier validation.`
          );
        }
        this.db.exec(`ALTER TABLE memories ADD COLUMN ${column} TEXT`);
      }
    })();
  }

  /**
   * Resolves a declared field's config key to its SQLite column name,
   * re-validating the identifier at this call site too (see
   * `migrateDeclaredFields`'s comment on defense in depth) since the result
   * is interpolated into `transactVector`'s SQL rather than bound as a
   * parameter.
   */
  private fieldColumnName(key: string): string {
    const column = fieldKeyToColumnName(key);
    if (!isValidColumnIdentifier(column)) {
      throw new Error(`neuron: invalid SQLite column derived from declared field "${key}".`);
    }
    return column;
  }

  /** `, col1, col2, ...` — appended onto a `SELECT` that already reads a row's other columns. */
  private fieldSelectSql(): string {
    return this.fieldColumns.length ? ', ' + this.fieldColumns.map((c) => c.column).join(', ') : '';
  }

  /**
   * A row's declared-field columns, sparse (only non-null ones), keyed back
   * to their config field name. A column is `NULL` unless a write actually
   * targeted it, so no per-category filtering is needed here — a category
   * that never declared a given field never has a row with that column set.
   */
  private extractFields(row: any): Record<string, string> | undefined {
    if (this.fieldColumns.length === 0) return undefined;
    const out: Record<string, string> = {};
    for (const { key, column } of this.fieldColumns) {
      const value = row[column];
      if (value !== null && value !== undefined) out[key] = value;
    }
    return Object.keys(out).length > 0 ? out : undefined;
  }

  public async query(q: MemoryQuery): Promise<Memory[]> {
    return (await this.queryGated(q)).results;
  }

  /**
   * Ticket 41 / ADR 0012: the one retrieval choke point shared by `neuron exec`,
   * `neuron memory query` and the recall hooks (`commands/hook.ts`), so the gate
   * runs identically everywhere instead of being reimplemented per caller. Only
   * fires on a text query — a bare category listing has no `ftsMatched` to gate
   * on. The lexical leg rejects a result whose top hit has no FTS match at all;
   * algebraically that is exactly `ftsMatched === false` (a row with no FTS
   * match cannot clear `normRrf > 0.5`, since `score` is now `normRrf` itself —
   * see the comment at its computation in `queryVector`). Structured as a single
   * conjunct so ticket 39's cosine floor — measured and found to clear no bar on
   * LongMemEval — can be added as a second conjunct without reshaping this.
   */
  public async queryGated(q: MemoryQuery): Promise<{ results: Memory[]; rejected: number }> {
    const all = await this.router.query(q);
    if (!q.text || !this.config.relevance.gate.enabled) {
      return { results: all, rejected: 0 };
    }
    const results = all.filter(m => m.ftsMatched === true);
    const rejected = all.length - results.length;
    // ADR 0012 Amendment: "rejection counts belong in neuron status alongside
    // the enrichment degradation counters" — a structural (unfitted) gate has
    // no threshold to tune, so its cumulative impact is the only visibility
    // into whether it's rejecting too much or too little.
    if (rejected > 0) this.recordGateRejections(rejected);
    return { results, rejected };
  }

  /**
   * Ticket 06 (neuron-2.4.0): an unranked, store-wide `COUNT(*)` against the
   * same FTS index and cleaned query text `queryVector`'s keyword leg uses,
   * but with no `LIMIT` and no category filter — `hook.ts`'s discovery-hint
   * nudge compares this against how many results a turn actually injected to
   * decide whether more exists than the agent saw. Callers that already ran
   * `memory.query()` this turn get a reconciled mirror for free (`md` mode's
   * reconcile happens inside `router.query`); this does not reconcile on its
   * own.
   */
  public countFtsMatches(text: string): number {
    const ftsQuery = cleanFtsQuery(text);
    if (!ftsQuery) return 0;
    try {
      const row = this.db.prepare(`
        SELECT COUNT(*) as count FROM memories_fts f
        JOIN memories m ON m.rowid = f.rowid
        WHERE f.memories_fts MATCH ? AND m.project_id = ? AND m.superseded_by IS NULL
      `).get(ftsQuery, this.projectId) as { count: number };
      return row.count;
    } catch {
      // Malformed FTS query — degrade to "nothing more to point at."
      return 0;
    }
  }

  public async queryVector(q: MemoryQuery): Promise<Memory[]> {
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

    // Ticket 17 / ADR 0015: hard-exclude superseded rows from every read path
    // by default. Rows are never deleted — `includeSuperseded` (query only)
    // or a direct id lookup (`findById`) still reach them.
    const supersededClause = q.includeSuperseded ? '' : 'AND superseded_by IS NULL';

    if (q.text) {
      // Ranked semantic search — top-K most relevant. Diverged from list
      // mode's default (ticket 31) since the two answer different questions.
      const limit = q.limit ?? 5;
      const queryVec = await this.embedder.embedQuery(q.text);

      const RRF_K = 60;
      const RRF_MAX = 2 / (RRF_K + 1); // theoretical max when a doc ranks #1 in both lists

      // --- Semantic rank list ---
      const rows = (this.db.prepare(`
        SELECT id, category, content, tags, embedding, importance, task_id, created_at, superseded_by, superseded_at${this.fieldSelectSql()}
        FROM memories
        WHERE project_id = ? ${categoryClause} ${supersededClause}
      `).all(this.projectId, ...categoryParams) as any[]);

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
            WHERE f.memories_fts MATCH ? AND m.project_id = ? ${categoryClause} ${supersededClause}
            ORDER BY rank
          `).all(ftsQuery, this.projectId, ...categoryParams) as any[]);
          ftsRows.forEach((r, i) => ftsRank.set(r.id, i + 1));
        } catch {
          // Malformed FTS query — degrade gracefully to semantic-only
        }
      }

      // --- RRF fusion + Importance ---
      for (const { row, similarity } of withSim) {
        const sr = semanticRank.get(row.id) ?? Infinity;
        const fr = ftsRank.get(row.id) ?? Infinity;
        const rrfScore = (sr === Infinity ? 0 : 1 / (RRF_K + sr))
                       + (fr === Infinity ? 0 : 1 / (RRF_K + fr));
        // `score` is `normRrf` alone (ticket 41 / ADR 0012): importance blended
        // in used to win the ranking often enough to be a defect on every query
        // (ticket 27 §1), and it is not demoted to a tie-break either — ranks are
        // unique per row, so a tie-break job never runs. `importance` remains a
        // prune-only field (ticket 27 §5, ticket 23's hazard guard).
        const score = rrfScore / RRF_MAX;

        results.push({
          id: row.id,
          category: row.category,
          kind: row.category, // backward compat
          content: row.content,
          score,
          similarity,
          ftsMatched: fr !== Infinity,
          tags: JSON.parse(row.tags),
          importance: row.importance,
          taskId: row.task_id ?? null,
          createdAt: row.created_at,
          supersededBy: row.superseded_by ?? null,
          supersededAt: row.superseded_at ?? null,
          fields: this.extractFields(row)
        });
      }

      results.sort((a, b) => (b.score!) - (a.score!));
      return results.slice(0, limit);
    } else {
      // No text query — list mode. An inventory question with no relevance
      // ranking, so it orders by recency (ticket 31; matches the deprecated
      // `listHistory`'s own `ORDER BY rowid DESC`) and gets its own, larger
      // default — an inventory capped at 5 is close to useless.
      const limit = q.limit ?? 20;
      const stmt = this.db.prepare(`
        SELECT id, category, content, tags, importance, task_id, created_at, superseded_by, superseded_at${this.fieldSelectSql()}
        FROM memories
        WHERE project_id = ? ${categoryClause} ${supersededClause}
        ORDER BY rowid DESC
      `);
      const rows = stmt.all(this.projectId, ...categoryParams) as any[];
      for (const row of rows) {
        results.push({
          id: row.id,
          category: row.category,
          kind: row.category, // backward compat
          content: row.content,
          tags: JSON.parse(row.tags),
          importance: row.importance,
          taskId: row.task_id ?? null,
          createdAt: row.created_at,
          supersededBy: row.superseded_by ?? null,
          supersededAt: row.superseded_at ?? null,
          fields: this.extractFields(row)
        });
      }
      return results.slice(0, limit);
    }
  }

  /**
   * Fetch a single row by id, unfiltered by supersession — the "direct id
   * lookup" ADR 0015 Decision 2 promises as the escape hatch for a
   * superseded row (never deleted, just hard-excluded from `query`/`exec`).
   * In `md`/`split` mode this forces a reconcile first (via `router.query`)
   * so a hand-edited markdown file (e.g. the supersession hand-fix in ADR
   * 0015 Decision 5) is visible before the raw SQLite read below.
   */
  public async findById(id: string): Promise<Memory | null> {
    if (!this.db) return null;
    await this.router.query({ limit: 0 });
    const row = this.db.prepare(`
      SELECT id, category, content, tags, importance, task_id, created_at, superseded_by, superseded_at${this.fieldSelectSql()}
      FROM memories WHERE id = ? AND project_id = ?
    `).get(id, this.projectId) as any;
    if (!row) return null;
    return {
      id: row.id,
      category: row.category,
      kind: row.category,
      content: row.content,
      tags: JSON.parse(row.tags),
      importance: row.importance,
      taskId: row.task_id ?? null,
      createdAt: row.created_at,
      supersededBy: row.superseded_by ?? null,
      supersededAt: row.superseded_at ?? null,
      fields: this.extractFields(row)
    };
  }

  /**
   * The write-time supersession gate (ticket 17 / ADR 0015 Decision 1):
   * shortlist the single closest existing, non-superseded entry by raw
   * embedding cosine, across every category — the CLI calls this before a
   * category is even known (category inference runs later, inside
   * `enrichUpsert`), so there is no category to scope the search to yet.
   * Returns `null` below `SUPERSESSION_SIMILARITY_THRESHOLD`; the embedder
   * only shortlists, it never decides whether the relationship is a real
   * reversal — that stays the agent's call via `--supersedes`.
   */
  public async findSupersessionCandidate(
    content: string
  ): Promise<{ id: string; category: string; content: string; similarity: number } | null> {
    if (!this.db) return null;
    await this.router.query({ limit: 0 });
    const embedding = await this.embedder.embed(content);
    const rows = this.db.prepare(`
      SELECT id, category, content, embedding FROM memories
      WHERE project_id = ? AND superseded_by IS NULL
    `).all(this.projectId) as any[];

    let best: { id: string; category: string; content: string; similarity: number } | null = null;
    for (const row of rows) {
      const similarity = dotProduct(embedding, toFloat32(row.embedding));
      if (similarity >= SUPERSESSION_SIMILARITY_THRESHOLD && (!best || similarity > best.similarity)) {
        best = { id: row.id, category: row.category, content: row.content, similarity };
      }
    }
    return best;
  }

  /**
   * Store-health signals a maintainer previously computed by hand (ticket 20
   * / neuron-2.4.0): near-duplicate clusters, importance's distribution, and
   * how much of the store is superseded dead weight.
   *
   * Near-duplicate detection reuses `findSupersessionCandidate`'s embedding
   * machinery per the ticket's own steer — same threshold, run pairwise
   * across the whole live store instead of one candidate at a time — via a
   * plain union-find so a chain of near-duplicates (A~B, B~C) groups
   * together even where A and C alone don't clear the threshold. Superseded
   * rows are excluded from clustering (already resolved, not a live gap) but
   * still counted toward `supersededCount`.
   */
  public async getStoreHealth(): Promise<StoreHealth> {
    if (!this.db) {
      return { duplicateGroups: [], importanceHistogram: {}, supersededCount: 0 };
    }
    await this.router.query({ limit: 0 });

    const rows = this.db.prepare(`
      SELECT id, category, content, embedding, importance, superseded_by, created_at FROM memories
      WHERE project_id = ?
    `).all(this.projectId) as any[];

    const supersededCount = rows.filter((r) => r.superseded_by !== null && r.superseded_by !== undefined).length;

    const importanceHistogram: Record<number, number> = {};
    for (const row of rows) {
      const importance = row.importance ?? 3;
      importanceHistogram[importance] = (importanceHistogram[importance] ?? 0) + 1;
    }

    const live = rows
      .filter((r) => r.superseded_by === null || r.superseded_by === undefined)
      .map((r) => ({ id: r.id as string, category: r.category as string, content: r.content as string, createdAt: r.created_at as string, vec: toFloat32(r.embedding) }));

    const parent = new Map<string, string>();
    for (const e of live) parent.set(e.id, e.id);
    const find = (id: string): string => {
      let root = id;
      while (parent.get(root) !== root) root = parent.get(root)!;
      return root;
    };
    const union = (a: string, b: string) => {
      const ra = find(a);
      const rb = find(b);
      if (ra !== rb) parent.set(ra, rb);
    };

    const qualifyingEdges: { a: string; b: string; similarity: number }[] = [];
    for (let i = 0; i < live.length; i++) {
      for (let j = i + 1; j < live.length; j++) {
        const similarity = dotProduct(live[i].vec, live[j].vec);
        if (similarity >= SUPERSESSION_SIMILARITY_THRESHOLD) {
          union(live[i].id, live[j].id);
          qualifyingEdges.push({ a: live[i].id, b: live[j].id, similarity });
        }
      }
    }

    // Group by final (post-union) root, then take each group's weakest
    // linking edge — both computed after every union has landed, so an id
    // whose root changed partway through a later merge is still attributed
    // to its final cluster, not an intermediate one.
    const idsByRoot = new Map<string, typeof live>();
    for (const e of live) {
      const root = find(e.id);
      const bucket = idsByRoot.get(root);
      if (bucket) bucket.push(e);
      else idsByRoot.set(root, [e]);
    }
    const minSimilarityByRoot = new Map<string, number>();
    for (const edge of qualifyingEdges) {
      const root = find(edge.a);
      const prev = minSimilarityByRoot.get(root);
      minSimilarityByRoot.set(root, prev === undefined ? edge.similarity : Math.min(prev, edge.similarity));
    }

    const duplicateGroups: DuplicateGroup[] = [];
    for (const [root, members] of idsByRoot) {
      if (members.length < 2) continue;
      duplicateGroups.push({
        entries: members.map((m) => ({ id: m.id, category: m.category, content: m.content, createdAt: m.createdAt })),
        minSimilarity: minSimilarityByRoot.get(root)!,
      });
    }
    duplicateGroups.sort((a, b) => b.minSimilarity - a.minSimilarity);

    return { duplicateGroups, importanceHistogram, supersededCount };
  }

  /**
   * Auto-repairs what `getStoreHealth`'s near-duplicate clustering finds,
   * but only the judgment-free part: within each cluster, entries sharing
   * byte-identical `content` are safely mergeable — no wording difference
   * means no call to make about which one is "right". The latest-created
   * member of each exact-content subgroup survives; the rest are marked
   * `supersededBy` it (never deleted, per ADR 0015) via the ordinary
   * `transact` update path.
   *
   * A cluster that still has more than one *distinct* content string after
   * that merge (a real near-duplicate — similar wording, not identical) is
   * left in `unresolved` rather than guessed at, matching
   * `repairFieldCompliance`'s own refusal to fabricate a free-text field: a
   * human resolves those via `--supersedes`/`--not-a-reversal`.
   */
  public async repairStoreHealth(): Promise<StoreHealthRepairReport> {
    const health = await this.getStoreHealth();
    const merged: DuplicateMergeOutcome[] = [];
    const unresolved: DuplicateGroup[] = [];
    const now = new Date().toISOString();

    for (const group of health.duplicateGroups) {
      const byContent = new Map<string, DuplicateGroupEntry[]>();
      for (const entry of group.entries) {
        const bucket = byContent.get(entry.content);
        if (bucket) bucket.push(entry);
        else byContent.set(entry.content, [entry]);
      }

      const representatives: DuplicateGroupEntry[] = [];
      for (const entries of byContent.values()) {
        if (entries.length === 1) {
          representatives.push(entries[0]);
          continue;
        }
        const sorted = [...entries].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
        const survivor = sorted[sorted.length - 1];
        const superseded = sorted.slice(0, -1);
        for (const dup of superseded) {
          await this.transact([
            { op: 'update', category: dup.category, id: dup.id, supersededBy: survivor.id, supersededAt: now },
          ]);
        }
        merged.push({
          keptId: survivor.id,
          category: survivor.category,
          content: survivor.content,
          supersededIds: superseded.map((s) => s.id),
        });
        representatives.push(survivor);
      }

      if (representatives.length > 1) {
        unresolved.push({ entries: representatives, minSimilarity: group.minSimilarity });
      }
    }

    return { merged, unresolved };
  }

  /**
   * Check-HEAD-on-read refresh (ticket 39 / neuron-2.3.0, item 1): compares
   * the stored last-indexed SHA against the repo's current `HEAD` and embeds
   * only the delta. A store with no `git_log_last_indexed_sha` meta key yet
   * pays a one-time full-history backfill; every call after that is
   * proportional to commits-since-last-call, not repo size. Silently no-ops
   * when `projectRoot` isn't a git repo (or has no commits yet) — this method
   * is called from the pre-prompt hook path, which must degrade toward "skip
   * this feature" rather than fail the turn (ADR 0014).
   */
  public async refreshGitLogIndex(): Promise<void> {
    if (!this.db) return;
    const head = getHeadSha(this.projectRoot);
    if (!head) return;

    const lastIndexed = this.getMeta(GIT_LOG_LAST_INDEXED_SHA_KEY);
    if (lastIndexed === head) return;

    const commits = lastIndexed ? listCommitsSince(this.projectRoot, lastIndexed) : listAllCommits(this.projectRoot);
    if (commits.length > 0) {
      const insert = this.db.prepare(`
        INSERT OR IGNORE INTO git_log_index (hash, subject, body, embedding, committed_at)
        VALUES (?, ?, ?, ?, ?)
      `);
      for (const commit of commits) {
        const embedding = await this.embedder.embed(`${commit.subject}\n${commit.body}`.trim());
        insert.run(commit.hash, commit.subject, commit.body, Buffer.from(embedding.buffer), commit.committedAt);
      }
    }
    this.setMeta(GIT_LOG_LAST_INDEXED_SHA_KEY, head);
  }

  /**
   * Ticket 39 (neuron-2.3.0) item 3: ranks indexed commits by the same
   * pre-normalized dot-product scan `queryVector` already runs over
   * `memories`, gated (item 6) by the same ADR 0012 predicate `queryGated`
   * applies to memory recall — a genuine FTS match on `subject`/`body` — via
   * `git_log_fts`, a parallel table built for exactly this reuse. This is a
   * *conjunction*, not a re-ranking: rows failing the FTS leg are dropped
   * before the top-K cut, not merely demoted, so a prompt with nothing
   * topically present in this repo's history yields silence rather than an
   * incidental top-1 by cosine alone.
   */
  public async searchGitLog(text: string, limit: number): Promise<GitLogHit[]> {
    if (!this.db) return [];
    const ftsQuery = cleanFtsQuery(text);
    if (!ftsQuery) return [];

    let ftsMatched: Set<string>;
    try {
      const ftsRows = this.db.prepare(`
        SELECT g.hash FROM git_log_fts f
        JOIN git_log_index g ON g.rowid = f.rowid
        WHERE f.git_log_fts MATCH ?
      `).all(ftsQuery) as Array<{ hash: string }>;
      ftsMatched = new Set(ftsRows.map(r => r.hash));
    } catch {
      // Malformed FTS query — no lexical leg can pass, so nothing can gate through.
      return [];
    }
    if (ftsMatched.size === 0) return [];

    const queryVec = await this.embedder.embedQuery(text);
    const rows = this.db.prepare(`SELECT hash, subject, body, embedding, committed_at FROM git_log_index`).all() as any[];
    const gated = rows
      .filter(row => ftsMatched.has(row.hash))
      .map(row => ({
        hash: row.hash as string,
        subject: row.subject as string,
        body: row.body as string,
        committedAt: row.committed_at as string,
        similarity: dotProduct(queryVec, toFloat32(row.embedding)),
      }))
      .sort((a, b) => b.similarity - a.similarity);

    return gated.slice(0, limit);
  }

  /**
   * The single seam for write-side enrichment. Every write routes through here
   * — the CLI, the deprecated convenience helpers, and the storage router
   * alike — so enrichment placed here is applied exactly once.
   */
  public async transact(mutations: MemoryMutation[]): Promise<MutationResult[]> {
    const enriched: MemoryMutation[] = [];
    for (const m of mutations) {
      const afterEnrichment = m.op === 'upsert' ? await this.enrichUpsert(m) : m;
      this.autoDeclareCategory(afterEnrichment);
      enriched.push(this.enforceFieldSchema(afterEnrichment));
    }
    return this.router.transact(enriched);
  }

  // --- Category declaration authority (ADR 0017) -----------------------------

  /**
   * Converges `neuron.yaml`'s declared set toward the store's actual
   * contents, in memory and (when a config file exists) on disk. A no-op if
   * `category` is already declared, which also covers "already auto-declared
   * earlier in this same process" — the in-memory update below makes the
   * second call see it as declared before a second file write is ever
   * attempted.
   */
  private declareCategory(category: string): void {
    if (this.config.categories[category]) return;
    this.config.categories[category] = {};
    if (this.configPath) {
      declareCategoryInNeuronYaml(this.configPath, category);
    }
  }

  /**
   * ADR 0017 Decision 1: the first write that introduces an undeclared
   * category auto-declares it. Scoped to `upsert`/`update` — the two ops
   * that carry a category a caller has deliberately chosen (explicitly, or
   * via enrichment above), matching `enforceFieldSchema`'s own op guard
   * immediately below. `delete` never introduces a category, so it is
   * excluded rather than silently declaring one on the way out.
   */
  private autoDeclareCategory(m: MemoryMutation): void {
    if (m.op !== 'upsert' && m.op !== 'update') return;
    this.declareCategory(resolveCategory(m));
  }

  /**
   * Every category holding live rows in the store but absent from
   * `neuron.yaml` — ADR 0017 Decision 6's backfill target, for a category
   * that predates the auto-declare-on-write hook (this repo's own
   * pre-alias-revert `architecture` category was the motivating instance).
   * Reported as its own finding kind, distinct from `checkFieldCompliance`'s
   * per-entry violations, since it's a config-file drift, not an entry defect.
   */
  public async checkUndeclaredCategories(): Promise<string[]> {
    if (!this.db) return [];
    // Force a reconcile first, same pattern `checkFieldCompliance` uses, so
    // md-mode categories are visible in the SQLite mirror `listStoredCategories`
    // reads from directly.
    await this.router.query({ limit: 0 });
    return this.listStoredCategories().filter((category) => !this.config.categories[category]);
  }

  /** Declares every category `checkUndeclaredCategories` finds, and reports which ones. */
  public async repairUndeclaredCategories(): Promise<string[]> {
    const undeclared = await this.checkUndeclaredCategories();
    for (const category of undeclared) this.declareCategory(category);
    return undeclared;
  }

  // --- Declared field-schema enforcement (ticket 43 / ADR 0013) -------------

  /**
   * Required-ness and enum-membership for config-declared category fields,
   * enforced once, here — the single choke point every writer (the CLI via
   * `parseFlags`, `neuron scan`'s `ingestScanResults` calling `transact()`
   * directly) goes through, so there is exactly one place this can be
   * gotten wrong rather than one per caller.
   *
   * Runs after `enrichUpsert` so an inferred category is already resolved:
   * a category's declared fields cannot be checked before its category is
   * known.
   */
  private enforceFieldSchema(m: MemoryMutation): MemoryMutation {
    if (m.op !== 'upsert' && m.op !== 'update') return m;

    const category = resolveCategory(m);
    const fieldDefs = this.config.categories[category]?.fields ?? {};
    const raw = m.fields ?? {};

    for (const key of Object.keys(raw)) {
      if (!(key in fieldDefs)) {
        throw new Error(
          `Error: --${fieldKeyToFlagName(key)} is not a declared field of category "${category}" ` +
            `(neuron.yaml categories.${category}.fields).`
        );
      }
    }

    const resolved: Record<string, string> = { ...raw };

    if (m.op === 'upsert') {
      // Required-but-missing and defaults only bite on create. `update` is a
      // partial patch — the same posture content/tags/importance/taskId
      // already have — so it never re-demands a field the entry already
      // satisfied when created, matching ticket 06's `--category` precedent
      // ("hard error naming the cause, unless a default is configured").
      for (const [key, def] of Object.entries(fieldDefs)) {
        if (resolved[key] !== undefined) continue;
        if (def.default !== undefined) {
          resolved[key] = def.default;
        } else if (def.required) {
          throw new Error(
            `Error: --${fieldKeyToFlagName(key)} is required for category "${category}" ` +
              `(neuron.yaml categories.${category}.fields.${key}). ` +
              `Pass --${fieldKeyToFlagName(key)} <value>, or add a "default:" in neuron.yaml.`
          );
        }
      }
    }

    for (const [key, value] of Object.entries(resolved)) {
      const def = fieldDefs[key];
      if (def.type === 'enum' && !def.values.includes(value)) {
        const suggestion = suggestClosest(value, def.values);
        throw new Error(
          `Error: --${fieldKeyToFlagName(key)} "${value}" is not one of [${def.values.join(', ')}]` +
            (suggestion ? ` — did you mean "${suggestion}"?` : '')
        );
      }
    }

    return { ...m, fields: Object.keys(resolved).length > 0 ? resolved : undefined };
  }

  // --- Field-schema validation & repair (ticket 13 / ADR 0013) --------------

  /**
   * Every live entry across every category missing a value for a field that
   * is *currently* declared required — including entries written before the
   * field existed, or before `required: true` was set on it. Reads never
   * hard-error on this (ADR 0013 "Pre-existing entries"); `neuron status
   * --check` is the only surface that reports it.
   */
  public async checkFieldCompliance(): Promise<FieldComplianceViolation[]> {
    if (!this.db) return [];
    // Force a reconcile first — the same `router.query({ limit: 0 })` pattern
    // `findById`/`findSupersessionCandidate` use — so md-mode entries are
    // visible in the SQLite mirror this check reads from directly.
    await this.router.query({ limit: 0 });

    const violations: FieldComplianceViolation[] = [];

    for (const [category, catConfig] of Object.entries(this.config.categories)) {
      const requiredKeys = Object.entries(catConfig.fields ?? {})
        .filter(([, def]) => def.required)
        .map(([key]) => key);
      if (requiredKeys.length === 0) continue;

      const rows = this.db.prepare(`
        SELECT id${this.fieldSelectSql()}
        FROM memories
        WHERE project_id = ? AND category = ? AND superseded_by IS NULL
      `).all(this.projectId, category) as any[];

      for (const row of rows) {
        const missingRequiredFields = requiredKeys.filter((key) => {
          const value = row[this.fieldColumnName(key)];
          return value === null || value === undefined;
        });
        if (missingRequiredFields.length > 0) {
          violations.push({ id: row.id, category, missingRequiredFields });
        }
      }
    }

    return violations;
  }

  /**
   * Fixes what `checkFieldCompliance` finds and is safely fixable: a
   * configured `default:`, or centroid-based inference for enum-typed fields
   * only — the same content-to-label mechanism write-side tag/category
   * enrichment already uses (ADR 0010's measured 9/9 vs. the model's 1/9).
   * Never fabricates a value for a free-text identity field (`reviewedBy`,
   * `ticket`, …) — there is no content signal that could produce a person's
   * name or a ticket number. Those, and any enum field with no other entry
   * to build a confident centroid from yet, come back in `unresolved`
   * untouched, for a human or an agent told to go find the real answer.
   */
  public async repairFieldCompliance(): Promise<FieldRepairOutcome[]> {
    const violations = await this.checkFieldCompliance();
    if (violations.length === 0) return [];

    // One centroid set per (category, field) pair, built lazily from every
    // other live entry in that category already carrying a value for that
    // field — a category with no enum violations never pays for a build.
    const centroidCache = new Map<string, Centroid[]>();
    const centroidsFor = (category: string, key: string, values: string[]): Centroid[] => {
      const cacheKey = `${category}::${key}`;
      const cached = centroidCache.get(cacheKey);
      if (cached) return cached;
      const column = this.fieldColumnName(key);
      const rows = this.db.prepare(`
        SELECT embedding, ${column} as value FROM memories
        WHERE project_id = ? AND category = ? AND superseded_by IS NULL AND ${column} IS NOT NULL
      `).all(this.projectId, category) as any[];
      const centroids = buildCategoryCentroids(
        rows.map((r) => ({ category: r.value as string, embedding: toFloat32(r.embedding) })),
        values
      );
      centroidCache.set(cacheKey, centroids);
      return centroids;
    };

    const outcomes: FieldRepairOutcome[] = [];

    for (const violation of violations) {
      const fieldDefs = this.config.categories[violation.category]?.fields ?? {};
      const applied: Record<string, string> = {};
      const unresolved: string[] = [];
      let rowEmbedding: Float32Array | null = null;

      for (const key of violation.missingRequiredFields) {
        const def = fieldDefs[key];
        if (!def) continue; // no longer declared — nothing left to repair against

        if (def.default !== undefined) {
          applied[key] = def.default;
          continue;
        }

        if (def.type !== 'enum') {
          unresolved.push(key);
          continue;
        }

        if (rowEmbedding === null) {
          const embRow = this.db.prepare(
            `SELECT embedding FROM memories WHERE id = ? AND project_id = ?`
          ).get(violation.id, this.projectId) as { embedding: Buffer } | undefined;
          rowEmbedding = embRow ? toFloat32(embRow.embedding) : new Float32Array(0);
        }

        const centroids = centroidsFor(violation.category, key, def.values);
        const inferred = rowEmbedding.length > 0 ? selectCategory(rowEmbedding, centroids) : undefined;
        if (inferred) {
          applied[key] = inferred;
        } else {
          unresolved.push(key);
        }
      }

      if (Object.keys(applied).length > 0) {
        await this.transact([
          { op: 'update', category: violation.category, id: violation.id, fields: applied },
        ]);
      }

      outcomes.push({ id: violation.id, category: violation.category, applied, unresolved });
    }

    return outcomes;
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
    const strict = this.config.strict;
    const now = new Date().toISOString();
    const explicitCategory = m.category ?? m.kind;

    // Enrichment off entirely: category is still mandatory, and nothing is
    // pending, so the write must not enter the backlog.
    if (!cfg.enabled) {
      if (!explicitCategory) throw categoryRequired('is disabled (llm.enrichment.enabled: false)');
      return { ...m, enrichedAt: now };
    }

    // Ticket 45 / ADR 0013: `strict` disables the two content-driven
    // inference mechanisms (tag centroid selection, category
    // centroid/model inference) so a project can claim value determinism,
    // not just shape/byte. A literal `llm.enrichment.category` fallback is
    // untouched — it's a fixed, content-independent default, not inference.
    const wantsTags = !strict && cfg.tags === 'infer' && (m.tags === undefined || m.tags.length === 0);
    const wantsCategory = !explicitCategory;

    if (!wantsTags && !wantsCategory) {
      if (!explicitCategory) throw categoryRequired('is off (llm.enrichment.category: off)');
      return { ...m, enrichedAt: now };
    }

    // The embedder is already loaded on the write path, so this second embed
    // costs ~4ms rather than the ~180ms a cold load would. It is computed here
    // rather than reused from `transactVector` so that enrichment works
    // identically in md-only mode, where `transactVector` never runs.
    let embedding: Float32Array | null = null;
    if (wantsTags || (wantsCategory && !strict && cfg.categoryStrategy === 'centroid')) {
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

    if (wantsCategory) {
      if (cfg.category === 'off') throw categoryRequired('is off (llm.enrichment.category: off)');

      if (strict) {
        // No centroid/model call — only a literal fallback name can supply
        // the category under strict mode. Left as `infer`, there is nothing
        // deterministic to fall back to, so this is the same hard error as
        // an unavailable inference result elsewhere in this method.
        if (cfg.category === 'infer') {
          throw categoryRequired('is disabled (strict: true) and llm.enrichment.category has no fallback name configured');
        }
        category = cfg.category;
      } else {
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
          const result = await this.enricher.inferCategory({
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
    }

    // Every inferred field now resolves inline — tags and category are both
    // centroid cosine over an already-loaded embedder. Nothing defers, so the
    // write is always stamped enriched (ticket 26).
    return {
      ...m,
      category,
      kind: undefined,
      tags,
      enrichedAt: now,
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

  /**
   * Cumulative candidates the relevance gate has rejected (ticket 41 / ADR
   * 0012 Amendment). The gate is structural, not fitted, so this total —
   * not a per-query count alone — is the only signal that it is rejecting
   * too much or too little in practice.
   */
  private recordGateRejections(count: number): void {
    if (!this.db) return;
    try {
      this.db.prepare(`
        INSERT INTO meta (key, value) VALUES (?, ?)
        ON CONFLICT(key) DO UPDATE SET value = CAST(CAST(value AS INTEGER) + ? AS TEXT)
      `).run(RELEVANCE_GATE_REJECTED_KEY, String(count), count);
    } catch {}
  }

  private readGateRejectedTotal(): number {
    if (!this.db) return 0;
    const row = this.db.prepare(`SELECT value FROM meta WHERE key = ?`).get(RELEVANCE_GATE_REJECTED_KEY) as { value: string } | undefined;
    return row ? (parseInt(row.value, 10) || 0) : 0;
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

          // `update` requires --category on the CLI (unlike `upsert`, which is
          // add-or-create and has no existing category to be wrong about), so
          // a mismatched category must behave as if the row were not found
          // rather than silently updating a different category's entry.
          const exists = m.op === 'update'
            ? this.db.prepare(`SELECT 1 FROM memories WHERE id = ? AND project_id = ? AND category = ?`).get(id, this.projectId, category)
            : this.db.prepare(`SELECT 1 FROM memories WHERE id = ? AND project_id = ?`).get(id, this.projectId);

          if (m.op === 'update' && !exists) {
            results.push({ id, status: 'not_found', project: this.projectName });
            continue;
          }

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
            if (m.taskId !== undefined) { sets.push('task_id = ?'); params.push(m.taskId); }
            if (m.createdAt !== undefined) { sets.push('created_at = ?'); params.push(m.createdAt); }
            if (m.enrichedAt !== undefined) { sets.push('enriched_at = ?'); params.push(m.enrichedAt); }
            // Ticket 17 / ADR 0015: reached both by the CLI's `--supersedes`
            // resolution (`op: 'update'`, only these two fields set) and by
            // reconcile mirroring a hand-edited markdown row (`op: 'upsert'`
            // on an id that already exists, going through this same shared
            // branch — see the `exists` check above).
            if (m.supersededBy !== undefined) { sets.push('superseded_by = ?'); params.push(m.supersededBy); }
            if (m.supersededAt !== undefined) { sets.push('superseded_at = ?'); params.push(m.supersededAt); }
            // Declared category fields (ticket 44): `m.fields` at this point
            // is already the fully-enforced partial patch from
            // `enforceFieldSchema` — an untouched field simply isn't a key
            // here, so its column is left alone, matching `update`'s
            // existing partial-patch semantics for every other column.
            for (const [key, value] of Object.entries(m.fields ?? {})) {
              sets.push(`${this.fieldColumnName(key)} = ?`);
              params.push(value);
            }
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
            const now = new Date().toISOString();
            const createdAt = m.createdAt ?? now;
            const taskId = m.taskId ?? null;

            // Declared category fields (ticket 44): `m.fields` is already
            // fully resolved (defaults filled, required checked) by
            // `enforceFieldSchema` before `transact()` ever reaches here.
            const fieldEntries = Object.entries(m.fields ?? {});
            const fieldColumnsSql = fieldEntries.map(([key]) => this.fieldColumnName(key));
            const fieldColumnsList = fieldColumnsSql.length ? ', ' + fieldColumnsSql.join(', ') : '';
            const fieldPlaceholders = fieldColumnsSql.length ? ', ' + fieldColumnsSql.map(() => '?').join(', ') : '';
            const fieldValues = fieldEntries.map(([, value]) => value);

            this.db.prepare(`
              INSERT INTO memories (id, project_id, category, content, tags, embedding, importance, task_id, created_at, updated_at, enriched_at${fieldColumnsList})
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?${fieldPlaceholders})
            `).run(id, this.projectId, category, m.content, tagsJson, blob, importance, taskId, createdAt, now, m.enrichedAt ?? null, ...fieldValues);
            results.push({ id, status: 'created', project: this.projectName });
          } else {
            results.push({ id, status: 'not_found', project: this.projectName });
          }
        } else if (m.op === 'delete') {
          // `--category` is required on the CLI for delete, but was never part
          // of the predicate, so a mismatched category deleted the row anyway —
          // the flag looked like a safety check and was pure ceremony.
          const info = this.db
            .prepare(`DELETE FROM memories WHERE id = ? AND project_id = ? AND category = ?`)
            .run(m.id, this.projectId, category);
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
      db: 'ready',
      model: modelReady,
      modelName: 'Xenova/bge-small-en-v1.5',
      totalCount,
      learnCount,
      historyCount,
      categories,
      storage: {
        mode: this.config.storage.mode,
        roots: [...resolveAllCategoryRoots(this.config, this.projectRoot).entries()].map(
          ([root, categories]) => ({ path: root, categories })
        ),
      },
      enrichment: {
        enabled: enrichmentCfg.enabled,
        category: enrichmentCfg.category,
        tags: enrichmentCfg.tags,
        degraded: this.readDegradationCounters()
      },
      relevance: {
        gateEnabled: this.config.relevance.gate.enabled,
        rejectedTotal: this.readGateRejectedTotal()
      }
    };
  }

  public close(): void {
    if (this.db) {
      this.db.close();
    }
  }

  // --- DEPRECATED METHODS (WRAPPERS) TO KEEP TESTS/CLI HAPPY TEMPORARILY ---

  public async addLearning(content: string, tags?: string[], options: { importance?: number } = {}): Promise<any> {
    const res = await this.transact([{ op: 'upsert', category: 'learning', content, tags, importance: options.importance }]);
    return res[0];
  }
  public async queryLearnings(query: string, options: { limit?: number } = {}): Promise<any> {
    const results = await this.query({ text: query, categories: ['learning'], limit: options.limit });
    return { results, project: this.projectName, query };
  }
  public listLearnings(options: { limit?: number } = {}): any[] {
    const limit = options.limit ?? 20;
    const stmt = this.db.prepare(`SELECT id, content, tags, created_at FROM memories WHERE project_id = ? AND category = 'learning' ORDER BY rowid ASC LIMIT ?`);
    return (stmt.all(this.projectId, limit) as any[]).map(row => ({
      id: row.id, content: row.content, tags: JSON.parse(row.tags), createdAt: row.created_at
    }));
  }
  public async updateLearning(id: string, content: string, options: { tags?: string[]; importance?: number } = {}): Promise<any> {
    const res = await this.transact([{ op: 'update', category: 'learning', id, content, tags: options.tags, importance: options.importance }]);
    return res[0];
  }
  public deleteLearning(id: string): any {
    const info = this.db.prepare(`DELETE FROM memories WHERE id = ? AND project_id = ?`).run(id, this.projectId);
    return { id, status: info.changes > 0 ? 'deleted' : 'not_found', project: this.projectName };
  }

  public async addHistory(content: string, options: { taskId?: string; tags?: string[]; importance?: number } = {}): Promise<any> {
    const res = await this.transact([{ op: 'upsert', category: 'history', content, tags: options.tags, taskId: options.taskId, importance: options.importance }]);
    return res[0];
  }
  public async queryHistory(query: string, options: { limit?: number } = {}): Promise<any> {
    const results = await this.query({ text: query, categories: ['history'], limit: options.limit });
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
    const report = this.maintain({ consolidate: true });
    return {
      entries: report.consolidated?.entries || [],
      consolidatedAt: report.consolidated?.consolidatedAt,
      previousCursor: report.consolidated?.previousCursor,
      project: this.projectName
    };
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
const RELEVANCE_GATE_REJECTED_KEY = 'relevance_gate_rejected_total';

/**
 * Write-time supersession gate threshold (ticket 17 / ADR 0015 Decision 1),
 * calibrated against ticket 27/39's measured same-topic band rather than a
 * fresh number: real near-duplicate cosines cluster near 1.0 with almost no
 * intermediate range, so a floor this close to 1.0 still separates a genuine
 * same-topic reversal candidate from merely-related entries.
 */
export const SUPERSESSION_SIMILARITY_THRESHOLD = 0.97;

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
