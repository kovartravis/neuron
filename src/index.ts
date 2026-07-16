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

        return pipeline('feature-extraction', 'Xenova/bge-small-en-v1.5', {
          dtype: 'q8'
        });
      })();
    }

    const extractor = await this.pipelinePromise;
    const output = await extractor(text, { pooling: 'cls', normalize: true });
    return new Float32Array(output.data);
  }
}

export interface NeuronMemoryOptions {
  dbPath: string;
  projectRoot: string;
  projectName: string;
  embedder?: Embedder;
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

  public getDb(): Database.Database {
    return this.db;
  }

  public getProjectId(): string {
    return this.projectId;
  }

  private initialize(): void {
    // Enable WAL mode
    this.db.pragma('journal_mode = WAL');

    let currentVersion = this.db.pragma('user_version', { simple: true }) as number;

    if (currentVersion < 1) {
      this.db.transaction(() => {
        // Create tables
        this.db.exec(`
          CREATE TABLE IF NOT EXISTS meta (
            key   TEXT PRIMARY KEY NOT NULL,
            value TEXT NOT NULL
          );
          CREATE TABLE IF NOT EXISTS learnings (
            id         TEXT PRIMARY KEY NOT NULL,
            project_id TEXT NOT NULL,
            content    TEXT NOT NULL,
            tags       TEXT NOT NULL DEFAULT '[]',
            embedding  BLOB NOT NULL,
            created_at TEXT NOT NULL
          );
          CREATE INDEX IF NOT EXISTS idx_learnings_project ON learnings (project_id);
          CREATE INDEX IF NOT EXISTS idx_learnings_created ON learnings (project_id, created_at DESC);
          
          CREATE TABLE IF NOT EXISTS history (
            id         TEXT PRIMARY KEY NOT NULL,
            project_id TEXT NOT NULL,
            task_id    TEXT,
            content    TEXT NOT NULL,
            tags       TEXT NOT NULL DEFAULT '[]',
            embedding  BLOB NOT NULL,
            created_at TEXT NOT NULL
          );
          CREATE INDEX IF NOT EXISTS idx_history_project ON history (project_id);
          CREATE INDEX IF NOT EXISTS idx_history_created ON history (project_id, created_at DESC);
          CREATE INDEX IF NOT EXISTS idx_history_task ON history (task_id) WHERE task_id IS NOT NULL;
        `);

        // Insert metadata
        const insertMeta = this.db.prepare('INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)');
        insertMeta.run('schema_version', '1');
        insertMeta.run('project_root', this.projectRoot);
        insertMeta.run('project_name', this.projectName);

        // Update user_version
        this.db.pragma('user_version = 1');
      })();
      currentVersion = 1;
    }

    if (currentVersion < 2) {
      this.db.transaction(() => {
        // Add scope and importance columns
        this.db.exec(`
          ALTER TABLE learnings ADD COLUMN scope TEXT NOT NULL DEFAULT '${this.projectName}';
          ALTER TABLE learnings ADD COLUMN importance INTEGER NOT NULL DEFAULT 3 CHECK (importance BETWEEN 1 AND 5);
          
          ALTER TABLE history ADD COLUMN scope TEXT NOT NULL DEFAULT '${this.projectName}';
          ALTER TABLE history ADD COLUMN importance INTEGER NOT NULL DEFAULT 3 CHECK (importance BETWEEN 1 AND 5);
          
          CREATE TABLE IF NOT EXISTS query_logs (
            id          TEXT PRIMARY KEY NOT NULL,
            project_id  TEXT NOT NULL,
            query_text  TEXT NOT NULL,
            embedding   BLOB NOT NULL,
            scope       TEXT NOT NULL,
            created_at  TEXT NOT NULL
          );
          CREATE INDEX IF NOT EXISTS idx_query_logs_project_created ON query_logs (project_id, created_at DESC);
        `);

        // Update metadata
        const insertMeta = this.db.prepare('INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)');
        insertMeta.run('schema_version', '2');

        // Update user_version
        this.db.pragma('user_version = 2');
      })();
      currentVersion = 2;
    }

    if (currentVersion < 3) {
      this.db.transaction(() => {
        this.db.exec(`
          ALTER TABLE learnings ADD COLUMN is_manual_scope INTEGER NOT NULL DEFAULT 0;

          CREATE TABLE IF NOT EXISTS learning_query_matches (
            learning_id  TEXT NOT NULL,
            query_log_id TEXT NOT NULL,
            matched_at   TEXT NOT NULL,
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

  public async addLearning(
    content: string,
    tags: string[] = [],
    options: { importance?: number; scope?: string } = {}
  ): Promise<{ id: string; status: string; project: string }> {
    const id = crypto.randomUUID();
    const projectId = this.projectId;
    const createdAt = new Date().toISOString();
    
    const vec = await this.embedder.embed(content);
    const blob = Buffer.from(vec.buffer, vec.byteOffset, vec.byteLength);
    const tagsJson = JSON.stringify(tags);
    const importance = options.importance ?? 3;
    const scope = options.scope ?? this.projectName;
    const isManualScope = options.scope !== undefined ? 1 : 0;

    const stmt = this.db.prepare(`
      INSERT INTO learnings (id, project_id, content, tags, embedding, scope, importance, is_manual_scope, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(id, projectId, content, tagsJson, blob, scope, importance, isManualScope, createdAt);

    return {
      id,
      status: 'created',
      project: this.projectName
    };
  }

  public async queryLearnings(
    query: string,
    options: { limit?: number; scopes?: string[] } = {}
  ): Promise<{
    results: Array<{ id: string; content: string; score: number; tags: string[]; scope?: string; importance?: number; createdAt: string }>;
    project: string;
    query: string;
  }> {
    const limit = options.limit ?? 5;
    const queryVec = await this.embedder.embed(query);
    const scopes = options.scopes ?? ['global', this.projectName];

    // Log the query
    const logId = crypto.randomUUID();
    const queryBlob = Buffer.from(queryVec.buffer, queryVec.byteOffset, queryVec.byteLength);
    const createdAt = new Date().toISOString();
    const logStmt = this.db.prepare(`
      INSERT INTO query_logs (id, project_id, query_text, embedding, scope, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    logStmt.run(logId, this.projectId, query, queryBlob, scopes.join(','), createdAt);

    // Retrieve scoped learnings
    const placeholders = scopes.map(() => '?').join(',');
    const stmt = this.db.prepare(`
      SELECT id, content, tags, embedding, scope, importance, created_at
      FROM learnings
      WHERE project_id = ? AND scope IN (${placeholders})
    `);
    const rows = stmt.all(this.projectId, ...scopes) as Array<{
      id: string;
      content: string;
      tags: string;
      embedding: Buffer;
      scope: string;
      importance: number;
      created_at: string;
    }>;

    const results = rows.map(row => {
      const blob = row.embedding;
      const embeddingVec = new Float32Array(blob.buffer, blob.byteOffset, blob.byteLength / 4);
      const similarity = dotProduct(queryVec, embeddingVec);
      const normImp = (row.importance - 1) / 4;
      const score = 0.75 * similarity + 0.25 * normImp;

      return {
        id: row.id,
        content: row.content,
        score,
        tags: JSON.parse(row.tags) as string[],
        scope: row.scope,
        importance: row.importance,
        createdAt: row.created_at
      };
    });

    results.sort((a, b) => b.score - a.score);

    return {
      results: results.slice(0, limit),
      project: this.projectName,
      query
    };
  }

  public listLearnings(options: { limit?: number } = {}): Array<{ id: string; content: string; tags: string[]; createdAt: string }> {
    const limit = options.limit ?? 20;
    const stmt = this.db.prepare(`
      SELECT id, content, tags, created_at
      FROM learnings
      WHERE project_id = ?
      ORDER BY rowid ASC
      LIMIT ?
    `);
    const rows = stmt.all(this.projectId, limit) as Array<{
      id: string;
      content: string;
      tags: string;
      created_at: string;
    }>;

    return rows.map(row => ({
      id: row.id,
      content: row.content,
      tags: JSON.parse(row.tags) as string[],
      createdAt: row.created_at
    }));
  }

  public async updateLearning(
    id: string,
    content: string,
    options: { tags?: string[]; importance?: number; scope?: string } = {}
  ): Promise<{ id: string; status: string; project: string }> {
    const vec = await this.embedder.embed(content);
    const embeddingBlob = Buffer.from(vec.buffer);

    const sets = ['content = ?', 'embedding = ?'];
    const params: any[] = [content, embeddingBlob];

    if (options.tags !== undefined) {
      sets.push('tags = ?');
      params.push(JSON.stringify(options.tags));
    }
    if (options.importance !== undefined) {
      sets.push('importance = ?');
      params.push(options.importance);
    }
    if (options.scope !== undefined) {
      sets.push('scope = ?', 'is_manual_scope = ?');
      params.push(options.scope, 1);
    }

    params.push(id, this.projectId);
    const stmt = this.db.prepare(`
      UPDATE learnings
      SET ${sets.join(', ')}
      WHERE id = ? AND project_id = ?
    `);
    const info = stmt.run(...params);

    return {
      id,
      status: info.changes > 0 ? 'updated' : 'not_found',
      project: this.projectName
    };
  }

  public deleteLearning(id: string): { id: string; status: string; project: string } {
    const stmt = this.db.prepare(`
      DELETE FROM learnings
      WHERE id = ? AND project_id = ?
    `);
    stmt.run(id, this.projectId);

    return {
      id,
      status: 'deleted',
      project: this.projectName
    };
  }

  public async addHistory(
    content: string,
    options: { taskId?: string; tags?: string[]; importance?: number; scope?: string } = {}
  ): Promise<{ id: string; status: string; project: string }> {
    const id = crypto.randomUUID();
    const projectId = this.projectId;
    const createdAt = new Date().toISOString();
    
    const vec = await this.embedder.embed(content);
    const blob = Buffer.from(vec.buffer, vec.byteOffset, vec.byteLength);
    const tagsJson = JSON.stringify(options.tags ?? []);
    const taskId = options.taskId ?? null;
    const importance = options.importance ?? 3;
    const scope = options.scope ?? this.projectName;

    const stmt = this.db.prepare(`
      INSERT INTO history (id, project_id, task_id, content, tags, embedding, scope, importance, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(id, projectId, taskId, content, tagsJson, blob, scope, importance, createdAt);

    return {
      id,
      status: 'created',
      project: this.projectName
    };
  }

  public async queryHistory(
    query: string,
    options: { limit?: number; scopes?: string[] } = {}
  ): Promise<{
    results: Array<{ id: string; content: string; score: number; tags: string[]; taskId: string | null; scope?: string; importance?: number; createdAt: string }>;
    project: string;
    query: string;
  }> {
    const limit = options.limit ?? 5;
    const queryVec = await this.embedder.embed(query);
    const scopes = options.scopes ?? ['global', this.projectName];

    // Log the query
    const logId = crypto.randomUUID();
    const queryBlob = Buffer.from(queryVec.buffer, queryVec.byteOffset, queryVec.byteLength);
    const createdAt = new Date().toISOString();
    const logStmt = this.db.prepare(`
      INSERT INTO query_logs (id, project_id, query_text, embedding, scope, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    logStmt.run(logId, this.projectId, query, queryBlob, scopes.join(','), createdAt);

    // Retrieve scoped history
    const placeholders = scopes.map(() => '?').join(',');
    const stmt = this.db.prepare(`
      SELECT id, content, tags, task_id, embedding, scope, importance, created_at
      FROM history
      WHERE project_id = ? AND scope IN (${placeholders})
    `);
    const rows = stmt.all(this.projectId, ...scopes) as Array<{
      id: string;
      content: string;
      tags: string;
      task_id: string | null;
      embedding: Buffer;
      scope: string;
      importance: number;
      created_at: string;
    }>;

    const results = rows.map(row => {
      const blob = row.embedding;
      const embeddingVec = new Float32Array(blob.buffer, blob.byteOffset, blob.byteLength / 4);
      const similarity = dotProduct(queryVec, embeddingVec);
      const normImp = (row.importance - 1) / 4;
      const score = 0.75 * similarity + 0.25 * normImp;

      return {
        id: row.id,
        content: row.content,
        score,
        tags: JSON.parse(row.tags) as string[],
        taskId: row.task_id,
        scope: row.scope,
        importance: row.importance,
        createdAt: row.created_at
      };
    });

    results.sort((a, b) => b.score - a.score);

    return {
      results: results.slice(0, limit),
      project: this.projectName,
      query
    };
  }

  public listHistory(options: { limit?: number } = {}): Array<{ id: string; content: string; tags: string[]; taskId: string | null; createdAt: string }> {
    const limit = options.limit ?? 20;
    const stmt = this.db.prepare(`
      SELECT id, content, tags, task_id, created_at
      FROM history
      WHERE project_id = ?
      ORDER BY rowid DESC
      LIMIT ?
    `);
    const rows = stmt.all(this.projectId, limit) as Array<{
      id: string;
      content: string;
      tags: string;
      task_id: string | null;
      created_at: string;
    }>;

    return rows.map(row => ({
      id: row.id,
      content: row.content,
      tags: JSON.parse(row.tags) as string[],
      taskId: row.task_id,
      createdAt: row.created_at
    }));
  }

  public deleteHistory(id: string): { id: string; status: string; project: string } {
    const stmt = this.db.prepare(`
      DELETE FROM history
      WHERE id = ? AND project_id = ?
    `);
    stmt.run(id, this.projectId);

    return {
      id,
      status: 'deleted',
      project: this.projectName
    };
  }

  public consolidateHistory(): {
    entries: Array<{ id: string; content: string; tags: string[]; taskId: string | null; createdAt: string }>;
    consolidatedAt: string;
    previousCursor: string | null;
    project: string;
  } {
    return this.db.transaction(() => {
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
      const rows = stmt.all(this.projectId, lastRowid) as Array<{
        rowid: number;
        id: string;
        content: string;
        tags: string;
        task_id: string | null;
        created_at: string;
      }>;

      const consolidatedAt = new Date().toISOString();
      
      if (rows.length > 0) {
        const maxRowid = rows[rows.length - 1].rowid;
        const updateWatermarkRowid = this.db.prepare("INSERT OR REPLACE INTO meta (key, value) VALUES ('last_consolidated_rowid', ?)");
        updateWatermarkRowid.run(maxRowid.toString());
      }
      
      const updateWatermarkAt = this.db.prepare("INSERT OR REPLACE INTO meta (key, value) VALUES ('last_consolidated_at', ?)");
      updateWatermarkAt.run(consolidatedAt);

      const entries = rows.map(row => ({
        id: row.id,
        content: row.content,
        tags: JSON.parse(row.tags) as string[],
        taskId: row.task_id,
        createdAt: row.created_at
      }));

      const promotions = this.checkAutoPromotions();

      return {
        entries,
        consolidatedAt,
        previousCursor,
        promotions,
        project: this.projectName
      };
    })();
  }

  public checkAutoPromotions(): {
    promoted: Array<{ id: string; from: string; to: string }>;
    demoted: Array<{ id: string; from: string; to: string }>;
  } {
    return this.db.transaction(() => {
      const promoted: Array<{ id: string; from: string; to: string }> = [];
      const demoted: Array<{ id: string; from: string; to: string }> = [];

      const queryLogs = this.db.prepare(`
        SELECT id, embedding, created_at FROM query_logs WHERE project_id = ?
      `).all(this.projectId) as Array<{ id: string; embedding: Buffer; created_at: string }>;

      const learnings = this.db.prepare(`
        SELECT id, embedding, scope, is_manual_scope FROM learnings WHERE project_id = ?
      `).all(this.projectId) as Array<{ id: string; embedding: Buffer; scope: string; is_manual_scope: number }>;

      if (queryLogs.length === 0 || learnings.length === 0) {
        return { promoted, demoted };
      }

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
        if (learn.is_manual_scope === 1) {
          continue; // Exempt from auto promotion/demotion
        }

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

      return { promoted, demoted };
    })();
  }

  public getStatus(): {
    project: string;
    projectRoot: string;
    db: string;
    model: string;
    modelName: string;
    learnCount: number;
    historyCount: number;
  } {
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

  public pruneHistory(options: { days?: number; maxImportance?: number } = {}): { deletedCount: number } {
    const days = options.days ?? 30;
    const maxImportance = options.maxImportance ?? 2;

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

    return {
      deletedCount: info.changes
    };
  }

  public close(): void {
    this.db.close();
  }
}

function dotProduct(a: Float32Array, b: Float32Array): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) {
    s += a[i] * b[i];
  }
  return s;
}
