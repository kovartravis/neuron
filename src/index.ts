import crypto from 'node:crypto';
import path from 'node:path';
import fs from 'node:fs';
import envPaths from 'env-paths';
import Database from 'better-sqlite3';

export interface Embedder {
  embed(text: string): Promise<Float32Array>;
}

export class TransformersEmbedder implements Embedder {
  private pipelinePromise: any = null;

  async embed(text: string): Promise<Float32Array> {
    if (!this.pipelinePromise) {
      this.pipelinePromise = (async () => {
        const { pipeline, env } = await import('@huggingface/transformers');
        const appPaths = envPaths('neuron', { suffix: '' });
        const modelCacheDir = path.join(appPaths.data, 'models');
        env.cacheDir = modelCacheDir;
        env.useFSCache = true;
        const onnxPath = path.join(modelCacheDir, 'Xenova/bge-small-en-v1.5', 'onnx', 'model_quantized.onnx');
        if (fs.existsSync(onnxPath)) {
          env.allowRemoteModels = false;
        }
        return pipeline('feature-extraction', 'Xenova/bge-small-en-v1.5', { dtype: 'q8' });
      })();
    }
    const extractor = await this.pipelinePromise;
    const output = await extractor(text, { pooling: 'cls', normalize: true });
    return new Float32Array(output.data);
  }
}

export type MemoryKind = 'learning' | 'history';

export interface MemoryQuery {
  text?: string;
  kind?: MemoryKind;
  scopes?: string[];
  limit?: number;
}

export interface Memory {
  id: string;
  kind: MemoryKind;
  content: string;
  tags: string[];
  scope?: string;
  importance?: number;
  taskId?: string | null;
  createdAt: string;
  score?: number;
}

export type MemoryMutation = 
  | { op: 'upsert'; kind: MemoryKind; id?: string; content: string; tags?: string[]; importance?: number; scope?: string; taskId?: string }
  | { op: 'update'; kind: MemoryKind; id: string; content?: string; tags?: string[]; importance?: number; scope?: string; taskId?: string }
  | { op: 'delete'; kind: MemoryKind; id: string };

export interface MutationResult {
  id: string;
  status: string; // 'created' | 'updated' | 'deleted' | 'not_found'
  project: string;
}

export interface MaintenancePolicy {
  pruneHistoryBeforeDays?: number;
  maxPruneImportance?: number;
  autoPromote?: boolean;
  consolidate?: boolean;
}

export interface MaintenanceReport {
  consolidated?: {
    entries: Memory[];
    consolidatedAt: string;
    previousCursor: string | null;
  };
  promotions?: {
    promoted: Array<{ id: string; from: string; to: string }>;
    demoted: Array<{ id: string; from: string; to: string }>;
  };
  prunedCount?: number;
  project: string;
}

export interface NeuronMemoryOptions {
  dbPath: string;
  projectRoot: string;
  projectName: string;
  embedder?: Embedder;
}

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

export class NeuronMemory {
  private db: Database.Database;
  private projectRoot: string;
  private projectName: string;
  private projectId: string;
  private embedder: Embedder;

  constructor(options: NeuronMemoryOptions) {
    this.projectRoot = options.projectRoot;
    this.projectName = options.projectName;
    this.projectId = crypto
      .createHash('sha256')
      .update(options.projectRoot)
      .digest('hex')
      .slice(0, 16);
    
    this.db = new Database(options.dbPath);
    this.embedder = options.embedder ?? new TransformersEmbedder();
    this.initialize();
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
      ? { embed: async () => new Float32Array(384) }
      : undefined;

    return new NeuronMemory({
      dbPath,
      projectRoot: projectInfo.root,
      projectName: projectInfo.name,
      embedder
    });
  }

  static inMemory(projectName: string = 'test-project', embedder?: Embedder): NeuronMemory {
    return new NeuronMemory({
      dbPath: ':memory:',
      projectRoot: '/in-memory/' + projectName,
      projectName,
      embedder: embedder ?? { embed: async () => new Float32Array(384) }
    });
  }

  public getDb(): Database.Database { return this.db; }
  public getProjectId(): string { return this.projectId; }

  private initialize(): void {
    this.db.pragma('journal_mode = WAL');
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
  }

  // --- NEW HYBRID INTERFACE ---

  public async query(q: MemoryQuery): Promise<Memory[]> {
    const limit = q.limit ?? 5;
    const scopes = q.scopes ?? ['global', this.projectName];
    const placeholders = scopes.map(() => '?').join(',');
    const results: Memory[] = [];

    const tables = q.kind ? [q.kind === 'learning' ? 'learnings' : 'history'] : ['learnings', 'history'];

    if (q.text) {
      const queryVec = await this.embedder.embed(q.text);
      
      const logId = crypto.randomUUID();
      const queryBlob = Buffer.from(queryVec.buffer, queryVec.byteOffset, queryVec.byteLength);
      const createdAt = new Date().toISOString();
      const logStmt = this.db.prepare(`
        INSERT INTO query_logs (id, project_id, query_text, embedding, scope, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      logStmt.run(logId, this.projectId, q.text, queryBlob, scopes.join(','), createdAt);

      for (const table of tables) {
        const stmt = this.db.prepare(`
          SELECT id, content, tags, embedding, scope, importance, created_at ${table === 'history' ? ', task_id' : ''}
          FROM ${table}
          WHERE project_id = ? AND scope IN (${placeholders})
        `);
        const rows = stmt.all(this.projectId, ...scopes) as any[];

        for (const row of rows) {
          const blob = row.embedding;
          const embeddingVec = new Float32Array(blob.buffer, blob.byteOffset, blob.byteLength / 4);
          const similarity = dotProduct(queryVec, embeddingVec);
          const normImp = (row.importance - 1) / 4;
          const score = 0.75 * similarity + 0.25 * normImp;

          results.push({
            id: row.id,
            kind: table === 'learnings' ? 'learning' : 'history',
            content: row.content,
            score,
            tags: JSON.parse(row.tags),
            scope: row.scope,
            importance: row.importance,
            taskId: row.task_id ?? null,
            createdAt: row.created_at
          });
        }
      }
      
      results.sort((a, b) => (b.score!) - (a.score!));
      return results.slice(0, limit);
    } else {
      for (const table of tables) {
        const stmt = this.db.prepare(`
          SELECT id, content, tags, scope, importance, created_at ${table === 'history' ? ', task_id' : ''}
          FROM ${table}
          WHERE project_id = ?
          ORDER BY rowid ${table === 'history' ? 'DESC' : 'ASC'}
        `);
        const rows = stmt.all(this.projectId) as any[];
        for (const row of rows) {
          results.push({
            id: row.id,
            kind: table === 'learnings' ? 'learning' : 'history',
            content: row.content,
            tags: JSON.parse(row.tags),
            scope: row.scope,
            importance: row.importance,
            taskId: row.task_id ?? null,
            createdAt: row.created_at
          });
        }
      }
      return results.slice(0, limit);
    }
  }

  public async transact(mutations: MemoryMutation[]): Promise<MutationResult[]> {
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
        const table = m.kind === 'learning' ? 'learnings' : 'history';
        
        if (m.op === 'upsert' || m.op === 'update') {
          const id = m.id || crypto.randomUUID();
          
          const exists = this.db.prepare(`SELECT 1 FROM ${table} WHERE id = ? AND project_id = ?`).get(id, this.projectId);
          
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
              if (m.kind === 'learning') { sets.push('is_manual_scope = 1'); }
            }
            if (m.kind === 'history' && m.taskId !== undefined) { sets.push('task_id = ?'); params.push(m.taskId); }
            
            if (sets.length > 0) {
              params.push(id, this.projectId);
              this.db.prepare(`UPDATE ${table} SET ${sets.join(', ')} WHERE id = ? AND project_id = ?`).run(...params);
            }
            
            results.push({ id, status: 'updated', project: this.projectName });
          } else if (m.op === 'upsert') {
            if (m.content === undefined) throw new Error('Content is required for upsert');
            const vec = vectors.get(i.toString())!;
            const blob = Buffer.from(vec.buffer, vec.byteOffset, vec.byteLength);
            const tagsJson = JSON.stringify(m.tags ?? []);
            const importance = m.importance ?? 3;
            const scope = m.scope ?? this.projectName;
            const createdAt = new Date().toISOString();
            
            if (m.kind === 'learning') {
              const isManualScope = m.scope !== undefined ? 1 : 0;
              this.db.prepare(`
                INSERT INTO learnings (id, project_id, content, tags, embedding, scope, importance, is_manual_scope, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
              `).run(id, this.projectId, m.content, tagsJson, blob, scope, importance, isManualScope, createdAt);
            } else {
              const taskId = m.taskId ?? null;
              this.db.prepare(`
                INSERT INTO history (id, project_id, task_id, content, tags, embedding, scope, importance, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
              `).run(id, this.projectId, taskId, m.content, tagsJson, blob, scope, importance, createdAt);
            }
            results.push({ id, status: 'created', project: this.projectName });
          } else {
            results.push({ id, status: 'not_found', project: this.projectName });
          }
        } else if (m.op === 'delete') {
          const info = this.db.prepare(`DELETE FROM ${table} WHERE id = ? AND project_id = ?`).run(m.id, this.projectId);
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
          SELECT rowid, id, content, tags, task_id, created_at
          FROM history
          WHERE project_id = ? AND rowid > ?
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

        const learnings = this.db.prepare(`
          SELECT id, embedding, scope, is_manual_scope FROM learnings WHERE project_id = ?
        `).all(this.projectId) as any[];

        if (queryLogs.length > 0 && learnings.length > 0) {
          const insertMatch = this.db.prepare(`
            INSERT OR IGNORE INTO learning_query_matches (learning_id, query_log_id, matched_at)
            VALUES (?, ?, ?)
          `);

          for (const qLog of queryLogs) {
            const qVec = new Float32Array(qLog.embedding.buffer, qLog.embedding.byteOffset, qLog.embedding.byteLength / 4);
            for (const learn of learnings) {
              const lVec = new Float32Array(learn.embedding.buffer, learn.embedding.byteOffset, learn.embedding.byteLength / 4);
              const similarity = dotProduct(qVec, lVec);
              if (similarity >= 0.80) {
                insertMatch.run(learn.id, qLog.id, qLog.created_at);
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
            UPDATE learnings SET scope = ? WHERE id = ? AND project_id = ?
          `);

          for (const learn of learnings) {
            if (learn.is_manual_scope === 1) continue;

            const countRow = countStmt.get(learn.id, cutoffStr) as { count: number };
            const matchCount = countRow ? countRow.count : 0;
            const currentScope = learn.scope;

            let targetScope = currentScope;

            if (currentScope !== 'global' && matchCount >= 15) {
              targetScope = 'global';
            } else if ((currentScope === this.projectName || currentScope === 'people') && matchCount >= 5) {
              targetScope = 'project';
            }

            if (targetScope === currentScope) {
              if (currentScope === 'global' && matchCount < 10) {
                targetScope = matchCount < 3 ? this.projectName : 'project';
              } else if (currentScope === 'project' && matchCount < 3) {
                targetScope = this.projectName;
              }
            }

            if (targetScope !== currentScope) {
              updateScopeStmt.run(targetScope, learn.id, this.projectId);
              if (
                (currentScope !== 'global' && targetScope === 'global') ||
                ((currentScope === this.projectName || currentScope === 'people') && targetScope === 'project')
              ) {
                promoted.push({ id: learn.id, from: currentScope, to: targetScope });
              } else {
                demoted.push({ id: learn.id, from: currentScope, to: targetScope });
              }
            }
          }
        }
        report.promotions = { promoted, demoted };
      }

      if (policy.pruneHistoryBeforeDays !== undefined) {
        const days = policy.pruneHistoryBeforeDays;
        const maxImportance = policy.maxPruneImportance ?? 2;

        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);
        const cutoffStr = cutoffDate.toISOString();

        const stmt = this.db.prepare(`
          DELETE FROM history
          WHERE project_id = ?
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
    const learnRow = this.db.prepare('SELECT COUNT(*) as count FROM learnings WHERE project_id = ?').get(this.projectId) as { count: number };
    const learnCount = learnRow ? learnRow.count : 0;

    const historyRow = this.db.prepare('SELECT COUNT(*) as count FROM history WHERE project_id = ?').get(this.projectId) as { count: number };
    const historyCount = historyRow ? historyRow.count : 0;

    const appPaths = envPaths('neuron', { suffix: '' });
    const modelCacheDir = path.join(appPaths.data, 'models');
    const onnxPath = path.join(modelCacheDir, 'Xenova/bge-small-en-v1.5', 'onnx', 'model_quantized.onnx');
    const modelReady = fs.existsSync(onnxPath) ? 'ready' : 'not-cached';

    return {
      project: this.projectName,
      projectRoot: this.projectRoot,
      db: 'ready',
      model: modelReady,
      modelName: 'Xenova/bge-small-en-v1.5',
      learnCount,
      historyCount
    };
  }

  public close(): void {
    this.db.close();
  }

  // --- DEPRECATED METHODS (WRAPPERS) TO KEEP TESTS/CLI HAPPY TEMPORARILY ---

  public async addLearning(content: string, tags: string[] = [], options: { importance?: number; scope?: string } = {}): Promise<any> {
    const res = await this.transact([{ op: 'upsert', kind: 'learning', content, tags, importance: options.importance, scope: options.scope }]);
    return res[0];
  }
  public async queryLearnings(query: string, options: { limit?: number; scopes?: string[] } = {}): Promise<any> {
    const results = await this.query({ text: query, kind: 'learning', limit: options.limit, scopes: options.scopes });
    return { results, project: this.projectName, query };
  }
  public listLearnings(options: { limit?: number } = {}): any[] {
    const limit = options.limit ?? 20;
    const stmt = this.db.prepare(`SELECT id, content, tags, created_at FROM learnings WHERE project_id = ? ORDER BY rowid ASC LIMIT ?`);
    return (stmt.all(this.projectId, limit) as any[]).map(row => ({
      id: row.id, content: row.content, tags: JSON.parse(row.tags), createdAt: row.created_at
    }));
  }
  public async updateLearning(id: string, content: string, options: { tags?: string[]; importance?: number; scope?: string } = {}): Promise<any> {
    const res = await this.transact([{ op: 'update', kind: 'learning', id, content, tags: options.tags, importance: options.importance, scope: options.scope }]);
    return res[0];
  }
  public deleteLearning(id: string): any {
    const info = this.db.prepare(`DELETE FROM learnings WHERE id = ? AND project_id = ?`).run(id, this.projectId);
    return { id, status: info.changes > 0 ? 'deleted' : 'not_found', project: this.projectName };
  }

  public async addHistory(content: string, options: { taskId?: string; tags?: string[]; importance?: number; scope?: string } = {}): Promise<any> {
    const res = await this.transact([{ op: 'upsert', kind: 'history', content, tags: options.tags, taskId: options.taskId, importance: options.importance, scope: options.scope }]);
    return res[0];
  }
  public async queryHistory(query: string, options: { limit?: number; scopes?: string[] } = {}): Promise<any> {
    const results = await this.query({ text: query, kind: 'history', limit: options.limit, scopes: options.scopes });
    return { results, project: this.projectName, query };
  }
  public listHistory(options: { limit?: number } = {}): any[] {
    const limit = options.limit ?? 20;
    const stmt = this.db.prepare(`SELECT id, content, tags, task_id, created_at FROM history WHERE project_id = ? ORDER BY rowid DESC LIMIT ?`);
    return (stmt.all(this.projectId, limit) as any[]).map(row => ({
      id: row.id, content: row.content, tags: JSON.parse(row.tags), taskId: row.task_id, createdAt: row.created_at
    }));
  }
  public deleteHistory(id: string): any {
    const info = this.db.prepare(`DELETE FROM history WHERE id = ? AND project_id = ?`).run(id, this.projectId);
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
    const report = this.maintain({ pruneHistoryBeforeDays: options.days ?? 30, maxPruneImportance: options.maxImportance ?? 2 });
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
