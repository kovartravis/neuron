import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { NeuronMemory, openDatabase } from './index.js';

describe('NeuronMemory DB Migrations', () => {
  it('should create the memories schema without scope, is_manual_scope, query_logs or learning_query_matches (ticket 38)', () => {
    const memory = new NeuronMemory({
      dbPath: ':memory:',
      projectRoot: '/test/project',
      // Fabricated root: no directory to write .neuron/ into, so the mode is
      // pinned rather than inherited from the schema default (`md`, ticket 31).
      storageMode: 'vector-only',
      projectName: 'test-project'
    });

    const db = memory.getDb();

    const memoriesCols = db.pragma("table_info(memories)") as any[];
    const memoriesNames = memoriesCols.map((c: any) => c.name);
    expect(memoriesNames).toContain('category');
    expect(memoriesNames).not.toContain('scope');
    expect(memoriesNames).not.toContain('is_manual_scope');

    const matchTable = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='learning_query_matches'").get();
    expect(matchTable).toBeUndefined();
    const queryLogsTable = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='query_logs'").get();
    expect(queryLogsTable).toBeUndefined();
  });

  it('should migrate a pre-existing v6 database by dropping scope, is_manual_scope, query_logs and learning_query_matches without losing memory rows (ticket 38)', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'neuron-migration-test-'));
    const dbPath = path.join(tempDir, 'legacy.sqlite');

    // Build a v6-shaped database by hand — the schema this migration must upgrade from.
    const seedDb = openDatabase(dbPath);
    seedDb.exec(`
      CREATE TABLE meta (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL);
      CREATE TABLE memories (
        id TEXT PRIMARY KEY NOT NULL, project_id TEXT NOT NULL, category TEXT NOT NULL,
        content TEXT NOT NULL, tags TEXT NOT NULL DEFAULT '[]', embedding BLOB NOT NULL,
        scope TEXT NOT NULL DEFAULT 'project', importance INTEGER NOT NULL DEFAULT 3 CHECK (importance BETWEEN 1 AND 5),
        is_manual_scope INTEGER NOT NULL DEFAULT 0, task_id TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
        enriched_at TEXT
      );
      CREATE TABLE query_logs (
        id TEXT PRIMARY KEY NOT NULL, project_id TEXT NOT NULL, query_text TEXT NOT NULL,
        embedding BLOB NOT NULL, scope TEXT NOT NULL, created_at TEXT NOT NULL
      );
      CREATE TABLE learning_query_matches (
        learning_id TEXT NOT NULL, query_log_id TEXT NOT NULL, matched_at TEXT NOT NULL,
        PRIMARY KEY (learning_id, query_log_id)
      );
    `);
    seedDb.prepare(`INSERT INTO meta (key, value) VALUES ('schema_version', '6')`).run();
    seedDb.prepare(`
      INSERT INTO memories (id, project_id, category, content, tags, embedding, scope, importance, is_manual_scope, task_id, created_at, updated_at, enriched_at)
      VALUES ('mem-1', 'proj-1', 'learning', 'a preserved memory', '[]', ?, 'global', 5, 1, NULL, '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z')
    `).run(Buffer.alloc(1536));
    seedDb.prepare(`
      INSERT INTO query_logs (id, project_id, query_text, embedding, scope, created_at)
      VALUES ('log-1', 'proj-1', 'old query', ?, 'global', '2026-01-01T00:00:00.000Z')
    `).run(Buffer.alloc(1536));
    seedDb.pragma('user_version = 6');
    seedDb.close();

    // Opening the legacy database through NeuronMemory must run the v7 migration.
    const memory = new NeuronMemory({ dbPath, projectRoot: tempDir, projectName: 'legacy-project' });
    const db = memory.getDb();

    expect(db.pragma('user_version', { simple: true })).toBe(7);

    const memoriesCols = (db.pragma('table_info(memories)') as any[]).map((c: any) => c.name);
    expect(memoriesCols).not.toContain('scope');
    expect(memoriesCols).not.toContain('is_manual_scope');

    expect(db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='query_logs'").get()).toBeUndefined();
    expect(db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='learning_query_matches'").get()).toBeUndefined();

    const preserved = db.prepare('SELECT id, content, importance FROM memories WHERE id = ?').get('mem-1') as any;
    expect(preserved.content).toBe('a preserved memory');
    expect(preserved.importance).toBe(5);

    memory.close();
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('should create memories_fts FTS5 virtual table for hybrid search', () => {
    const memory = new NeuronMemory({
      dbPath: ':memory:',
      projectRoot: '/test/project',
      // Fabricated root: no directory to write .neuron/ into, so the mode is
      // pinned rather than inherited from the schema default (`md`, ticket 31).
      storageMode: 'vector-only',
      projectName: 'test-project'
    });

    const db = memory.getDb();

    const ftsMemories = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='memories_fts'"
    ).get() as { name: string } | undefined;
    expect(ftsMemories?.name).toBe('memories_fts');
  });

  it('should index learnings inserted via the public interface and make them retrievable by FTS keyword match', async () => {
    const memory = new NeuronMemory({
      dbPath: ':memory:',
      projectRoot: '/test/project',
      // Fabricated root: no directory to write .neuron/ into, so the mode is
      // pinned rather than inherited from the schema default (`md`, ticket 31).
      storageMode: 'vector-only',
      projectName: 'test-project',
      embedder: { embed: async () => new Float32Array(384), embedQuery: async () => new Float32Array(384) }
    });

    await memory.addLearning('Always pin onnxruntime-node to 1.20.1', ['onnx', 'crash']);

    const db = memory.getDb();
    const row = db.prepare(
      `SELECT rowid FROM memories_fts WHERE memories_fts MATCH '"onnxruntime"*'`
    ).get();
    expect(row).toBeDefined();
  });



  it('should support adding and querying learnings with injected embedder', async () => {
    // 384-dimensional unit vectors
    const testVec = new Float32Array(384);
    testVec[0] = 1.0;

    const checkoutVec = new Float32Array(384);
    checkoutVec[1] = 1.0;

    const queryVec = new Float32Array(384);
    queryVec[0] = 0.9;
    queryVec[1] = 0.1;

    const mockEmbedder = {
      embed: async (text: string) => {
        if (text.includes('query')) return queryVec;
        if (text.includes('run tests')) return testVec;
        if (text.includes('checkout')) return checkoutVec;
        return new Float32Array(384);
      },
      embedQuery: async (text: string) => {
        if (text.includes('query')) return queryVec;
        if (text.includes('run tests')) return testVec;
        if (text.includes('checkout')) return checkoutVec;
        return new Float32Array(384);
      }
    };

    const memory = new NeuronMemory({
      dbPath: ':memory:',
      projectRoot: '/test/project',
      // Fabricated root: no directory to write .neuron/ into, so the mode is
      // pinned rather than inherited from the schema default (`md`, ticket 31).
      storageMode: 'vector-only',
      projectName: 'test-project',
      embedder: mockEmbedder
    });

    const res1 = await memory.addLearning('Always run tests before committing', ['testing']);
    const res2 = await memory.addLearning('Use credit cards for checkouts', ['checkout']);

    expect(res1.status).toBe('created');
    expect(res1.id).toBeDefined();

    const queryResult = await memory.queryLearnings('query for run tests', { limit: 5 });
    expect(queryResult.query).toBe('query for run tests');
    expect(queryResult.results).toHaveLength(2);

    const first = queryResult.results[0];
    expect(first.content).toBe('Always run tests before committing');
    expect(first.tags).toEqual(['testing']);

    const second = queryResult.results[1];
    expect(second.content).toBe('Use credit cards for checkouts');
    expect(second.tags).toEqual(['checkout']);
  });

  it('should support listing and deleting learnings', async () => {
    const mockEmbedder = {
      embed: async () => new Float32Array(384),
      embedQuery: async () => new Float32Array(384)
    };

    const memory = new NeuronMemory({
      dbPath: ':memory:',
      projectRoot: '/test/project',
      // Fabricated root: no directory to write .neuron/ into, so the mode is
      // pinned rather than inherited from the schema default (`md`, ticket 31).
      storageMode: 'vector-only',
      projectName: 'test-project',
      embedder: mockEmbedder
    });

    const res1 = await memory.addLearning('Learning 1', ['tag1']);
    const res2 = await memory.addLearning('Learning 2', ['tag2']);

    const list1 = memory.listLearnings();
    expect(list1).toHaveLength(2);
    expect(list1[0].content).toBe('Learning 1');
    expect(list1[1].content).toBe('Learning 2');

    const delRes = memory.deleteLearning(res1.id);
    expect(delRes.status).toBe('deleted');
    expect(delRes.id).toBe(res1.id);

    const list2 = memory.listLearnings();
    expect(list2).toHaveLength(1);
    expect(list2[0].content).toBe('Learning 2');
  });

  it('should support history operations and cursor-based consolidation', async () => {
    const mockEmbedder = {
      embed: async () => new Float32Array(384),
      embedQuery: async () => new Float32Array(384)
    };

    const memory = new NeuronMemory({
      dbPath: ':memory:',
      projectRoot: '/test/project',
      // Fabricated root: no directory to write .neuron/ into, so the mode is
      // pinned rather than inherited from the schema default (`md`, ticket 31).
      storageMode: 'vector-only',
      projectName: 'test-project',
      embedder: mockEmbedder
    });

    // Add history entries
    const res1 = await memory.addHistory('History 1', { tags: ['tag1'], taskId: 'task-123' });
    const res2 = await memory.addHistory('History 2', { tags: ['tag2'] });

    expect(res1.status).toBe('created');
    expect(res1.id).toBeDefined();

    // List history (newest first)
    const list = memory.listHistory();
    expect(list).toHaveLength(2);
    expect(list[0].content).toBe('History 2'); // newest
    expect(list[1].content).toBe('History 1');

    // First consolidation: should retrieve both entries
    const c1 = memory.consolidateHistory();
    expect(c1.entries).toHaveLength(2);
    expect(c1.previousCursor).toBeNull();
    expect(c1.consolidatedAt).toBeDefined();
    expect(new Date(c1.consolidatedAt).getTime()).not.toBeNaN();
    expect(c1.project).toBe('test-project');

    // Add another history entry
    const res3 = await memory.addHistory('History 3');

    // Second consolidation: should only retrieve History 3
    const c2 = memory.consolidateHistory();
    expect(c2.entries).toHaveLength(1);
    expect(c2.entries[0].content).toBe('History 3');
    expect(c2.previousCursor).toBe(c1.consolidatedAt);

    // Delete history entry
    const delRes = memory.deleteHistory(res1.id);
    expect(delRes.status).toBe('deleted');
    expect(delRes.id).toBe(res1.id);

    const listAfterDelete = memory.listHistory();
    expect(listAfterDelete).toHaveLength(2); // History 2 and History 3 remain
    expect(listAfterDelete.map(h => h.content)).not.toContain('History 1');

    const status = memory.getStatus();
    expect(status.project).toBe('test-project');
    expect(status.projectRoot).toBe('/test/project');
    expect(status.db).toBe('ready');
    expect(status.modelName).toBe('Xenova/bge-small-en-v1.5');
    expect(status.learnCount).toBe(0);
    expect(status.historyCount).toBe(2);
  });

  it('should store importance for learnings and history, defaulting to 3 when omitted', async () => {
    const mockEmbedder = {
      embed: async () => new Float32Array(384),
      embedQuery: async () => new Float32Array(384)
    };

    const memory = new NeuronMemory({
      dbPath: ':memory:',
      projectRoot: '/test/project',
      // Fabricated root: no directory to write .neuron/ into, so the mode is
      // pinned rather than inherited from the schema default (`md`, ticket 31).
      storageMode: 'vector-only',
      projectName: 'test-project',
      embedder: mockEmbedder
    });

    // 1. Add learning and history with explicit importance
    const learning1 = await memory.addLearning('Learning with custom importance', ['tag'], { importance: 5 });
    const history1 = await memory.addHistory('History with custom importance', { importance: 2 });

    // Verify values in DB
    const db = memory.getDb();
    const l1 = db.prepare('SELECT importance FROM memories WHERE id = ?').get(learning1.id) as { importance: number };
    expect(l1.importance).toBe(5);

    const h1 = db.prepare('SELECT importance FROM memories WHERE id = ?').get(history1.id) as { importance: number };
    expect(h1.importance).toBe(2);

    // 2. Add learning and history without explicit importance (should default)
    const learning2 = await memory.addLearning('Default learning', ['tag']);
    const history2 = await memory.addHistory('Default history');

    const l2 = db.prepare('SELECT importance FROM memories WHERE id = ?').get(learning2.id) as { importance: number };
    expect(l2.importance).toBe(3);

    const h2 = db.prepare('SELECT importance FROM memories WHERE id = ?').get(history2.id) as { importance: number };
    expect(h2.importance).toBe(3);
  });

  it('should apply hybrid scoring across importance and semantic similarity for every stored entry', async () => {
    // 384-dimensional unit vectors
    const queryVec = new Float32Array(384);
    queryVec[0] = 1.0;

    const vecA = new Float32Array(384);
    vecA[0] = 0.9; // Sim = 0.9

    const vecB = new Float32Array(384);
    vecB[0] = 0.8; // Sim = 0.8

    const vecC = new Float32Array(384);
    vecC[0] = 0.95; // Sim = 0.95

    const mockEmbedder = {
      embed: async (text: string) => {
        if (text.includes('query')) return queryVec;
        if (text.includes('itemA')) return vecA;
        if (text.includes('itemB')) return vecB;
        if (text.includes('itemC')) return vecC;
        return new Float32Array(384);
      },
      embedQuery: async (text: string) => {
        if (text.includes('query')) return queryVec;
        if (text.includes('itemA')) return vecA;
        if (text.includes('itemB')) return vecB;
        if (text.includes('itemC')) return vecC;
        return new Float32Array(384);
      }
    };

    const memory = new NeuronMemory({
      dbPath: ':memory:',
      projectRoot: '/test/project',
      // Fabricated root: no directory to write .neuron/ into, so the mode is
      // pinned rather than inherited from the schema default (`md`, ticket 31).
      storageMode: 'vector-only',
      projectName: 'test-project',
      embedder: mockEmbedder
    });

    // Add learnings:
    // Item A: Sim = 0.9, Importance = 5 (Norm = 1.0)
    // Score = 0.75 * 0.9 + 0.25 * 1.0 = 0.925
    await memory.addLearning('itemA content', ['tag'], { importance: 5 });

    // Item B: Sim = 0.8, Importance = 5 (Norm = 1.0)
    // Score = 0.75 * 0.8 + 0.25 * 1.0 = 0.85
    await memory.addLearning('itemB content', ['tag'], { importance: 5 });

    // Item C: Sim = 0.95, Importance = 1 (Norm = 0.0)
    // Score = 0.75 * 0.95 + 0.25 * 0.0 = 0.7125
    await memory.addLearning('itemC content', ['tag'], { importance: 1 });

    // All three entries are visible to every query — there is no scope
    // segmentation any more (ticket 38) — and hybrid score orders them:
    // A (0.925) > B (0.85) > C (0.7125).
    const res = await memory.queryLearnings('query test', { limit: 5 });
    expect(res.results).toHaveLength(3);
    expect(res.results[0].content).toBe('itemA content');
    expect(res.results[1].content).toBe('itemB content');
    expect(res.results[2].content).toBe('itemC content');
  });

  it('should support pruning history based on age and importance criteria', async () => {
    const memory = new NeuronMemory({
      dbPath: ':memory:',
      projectRoot: '/test/project',
      // Fabricated root: no directory to write .neuron/ into, so the mode is
      // pinned rather than inherited from the schema default (`md`, ticket 31).
      storageMode: 'vector-only',
      projectName: 'test-project'
    });

    // 1. Add test history entries
    const h1 = await memory.addHistory('Old importance 1', { importance: 1 });
    const h2 = await memory.addHistory('Old importance 2', { importance: 2 });
    const h3 = await memory.addHistory('Old importance 3 (default)', { importance: 3 });
    const h4 = await memory.addHistory('Old importance 4 (high importance)', { importance: 4 });
    const h5 = await memory.addHistory('New importance 1', { importance: 1 });

    // 2. Manipulate dates in SQLite
    const db = memory.getDb();
    
    // Set old entries to 40 days ago
    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - 40);
    const oldDateStr = oldDate.toISOString();

    db.prepare("UPDATE memories SET created_at = ? WHERE id IN (?, ?, ?, ?) AND category = 'history'")
      .run(oldDateStr, h1.id, h2.id, h3.id, h4.id);

    // 3. Run prune with default parameters (days=30, maxImportance=3)
    const pruneRes1 = memory.pruneHistory();
    expect(pruneRes1.deletedCount).toBe(3); // h1, h2, h3 pruned; h4 (imp 4) & h5 (new) retained

    // Check remaining entries
    const list1 = memory.listHistory({ limit: 10 });
    expect(list1).toHaveLength(2);
    const remainingIds1 = list1.map(h => h.id);
    expect(remainingIds1).toContain(h4.id);
    expect(remainingIds1).toContain(h5.id);

    // 4. Run prune with custom parameters: days=10, maxImportance=4
    const pruneRes2 = memory.pruneHistory({ days: 10, maxImportance: 4 });
    expect(pruneRes2.deletedCount).toBe(1);

    const list2 = memory.listHistory({ limit: 10 });
    expect(list2).toHaveLength(1);
    expect(list2[0].id).toBe(h5.id);
  });

  it('should support updating learnings in-place and regenerating embeddings', async () => {
    const mockEmbedder = {
      embed: async (text: string) => {
        if (text === 'original text') return new Float32Array(384).fill(1);
        if (text === 'updated text') return new Float32Array(384).fill(2);
        return new Float32Array(384);
      },
      embedQuery: async (text: string) => {
        if (text.includes('original text')) return new Float32Array(384).fill(1);
        if (text.includes('updated text')) return new Float32Array(384).fill(2);
        return new Float32Array(384);
      }
    };

    const memory = new NeuronMemory({
      dbPath: ':memory:',
      projectRoot: '/test/project',
      // Fabricated root: no directory to write .neuron/ into, so the mode is
      // pinned rather than inherited from the schema default (`md`, ticket 31).
      storageMode: 'vector-only',
      projectName: 'test-project',
      embedder: mockEmbedder
    });

    // 1. Add learning
    const added = await memory.addLearning('original text', ['initial'], { importance: 3 });

    // Check initial state
    const db = memory.getDb();
    const row1 = db.prepare('SELECT content, tags, importance, embedding FROM memories WHERE id = ?').get(added.id) as any;
    expect(row1.content).toBe('original text');
    expect(JSON.parse(row1.tags)).toEqual(['initial']);
    expect(row1.importance).toBe(3);
    const floatArr1 = new Float32Array(row1.embedding.buffer, row1.embedding.byteOffset, row1.embedding.byteLength / 4);
    expect(floatArr1[0]).toBe(1);

    // 2. Update content, preserving tags and importance
    const updateRes = await memory.updateLearning(added.id, 'updated text');
    expect(updateRes.status).toBe('updated');
    expect(updateRes.id).toBe(added.id);

    // Check updated state
    const row2 = db.prepare('SELECT content, tags, importance, embedding FROM memories WHERE id = ?').get(added.id) as any;
    expect(row2.content).toBe('updated text');
    expect(JSON.parse(row2.tags)).toEqual(['initial']); // preserved
    expect(row2.importance).toBe(3); // preserved
    const floatArr2 = new Float32Array(row2.embedding.buffer, row2.embedding.byteOffset, row2.embedding.byteLength / 4);
    expect(floatArr2[0]).toBe(2); // regenerated embedding

    // 3. Update optional attributes (tags, importance)
    await memory.updateLearning(added.id, 'updated text', { tags: ['new-tag'], importance: 5 });
    const row3 = db.prepare('SELECT tags, importance FROM memories WHERE id = ?').get(added.id) as any;
    expect(JSON.parse(row3.tags)).toEqual(['new-tag']);
    expect(row3.importance).toBe(5);

    // 4. Update a non-existent ID
    const nonExistentRes = await memory.updateLearning('non-existent-uuid', 'some text');
    expect(nonExistentRes.status).toBe('not_found');
  });


  it('should enforce CHECK (importance BETWEEN 1 AND 5) constraints in SQLite schema', () => {
    const memory = NeuronMemory.inMemory();
    const db = memory.getDb();
    const now = new Date().toISOString();

    // 1. Inserting importance 0 into memories must fail
    expect(() => {
      db.prepare(`
        INSERT INTO memories (id, project_id, category, content, tags, embedding, importance, task_id, created_at, updated_at)
        VALUES ('test-1', 'proj-1', 'learning', 'content', '[]', ?, 0, NULL, ?, ?)
      `).run(Buffer.alloc(1536), now, now);
    }).toThrow(/CHECK constraint failed/);

    // 2. Inserting importance 6 into memories must fail
    expect(() => {
      db.prepare(`
        INSERT INTO memories (id, project_id, category, content, tags, embedding, importance, task_id, created_at, updated_at)
        VALUES ('test-2', 'proj-1', 'history', 'content', '[]', ?, 6, NULL, ?, ?)
      `).run(Buffer.alloc(1536), now, now);
    }).toThrow(/CHECK constraint failed/);
  });
});


describe('NeuronMemory hybrid search (RRF)', () => {
  it('should rank a keyword-exact-match learning first when vector similarity is tied', async () => {
    // Both learnings get the exact same embedding → semantic scores are equal.
    // Only the FTS keyword match can differentiate them.
    // Without RRF, the two records tie on semantic score and order is arbitrary.
    // With RRF, the keyword-matching record ranks first.
    const sharedVec = new Float32Array(384);
    sharedVec[0] = 1.0;

    const mockEmbedder = { embed: async () => sharedVec, embedQuery: async () => sharedVec };

    const memory = new NeuronMemory({
      dbPath: ':memory:',
      projectRoot: '/test/project',
      // Fabricated root: no directory to write .neuron/ into, so the mode is
      // pinned rather than inherited from the schema default (`md`, ticket 31).
      storageMode: 'vector-only',
      projectName: 'test-project',
      embedder: mockEmbedder
    });

    // B inserted first (lower rowid) so insertion-order alone would rank it first.
    // Only an FTS keyword boost can override this to put A on top.
    await memory.addLearning('always run tests before committing', ['testing'], { importance: 3 });
    // A: contains the search keyword "onnxruntime" — inserted second, higher rowid
    await memory.addLearning('pin onnxruntime to 1.20.1 to avoid crash', ['onnx'], { importance: 3 });

    const results = await memory.query({ text: 'onnxruntime crash', kind: 'learning' });

    expect(results[0].content).toBe('pin onnxruntime to 1.20.1 to avoid crash');
  });
});

  it('should surface semantically relevant records even when no query keywords appear in the content', async () => {
    // Both learnings use distinct embeddings; no query word appears in either content.
    // Only the semantic (vector) rank can differentiate them.
    const vecClose = new Float32Array(384);
    vecClose[0] = 0.95; // high dot-product with query

    const vecFar = new Float32Array(384);
    vecFar[1] = 0.1;  // low dot-product with query

    const queryVec = new Float32Array(384);
    queryVec[0] = 1.0;

    const mockEmbedder = {
      embed: async (text: string) => {
        if (text.includes('QUERYSYMBOL')) return queryVec;
        if (text.includes('install homebrew')) return vecClose;
        return vecFar;
      },
      embedQuery: async (text: string) => {
        if (text.includes('QUERYSYMBOL')) return queryVec;
        if (text.includes('install homebrew')) return vecClose;
        return vecFar;
      }
    };

    const memory = new NeuronMemory({
      dbPath: ':memory:',
      projectRoot: '/test/project',
      // Fabricated root: no directory to write .neuron/ into, so the mode is
      // pinned rather than inherited from the schema default (`md`, ticket 31).
      storageMode: 'vector-only',
      projectName: 'test-project',
      embedder: mockEmbedder
    });

    await memory.addLearning('install homebrew before setting up dev tools', ['mac'], { importance: 3 });
    await memory.addLearning('configure webpack for production bundling', ['webpack'], { importance: 3 });

    const results = await memory.query({ text: 'QUERYSYMBOL', kind: 'learning' });

    expect(results[0].content).toBe('install homebrew before setting up dev tools');
  });

  it('should rank the higher-importance record first when FTS and semantic ranks are equivalent', async () => {
    // Both learnings contain the keyword and share an identical embedding.
    // Semantic rank and FTS rank are determined by insertion order (rowid).
    // The low-importance record is inserted first (lower rowid), which would
    // win on rank alone. Only the 25% importance term can promote the second record.
    const sharedVec = new Float32Array(384);
    sharedVec[2] = 1.0;

    const mockEmbedder = { embed: async () => sharedVec, embedQuery: async () => sharedVec };

    const memory = new NeuronMemory({
      dbPath: ':memory:',
      projectRoot: '/test/project',
      // Fabricated root: no directory to write .neuron/ into, so the mode is
      // pinned rather than inherited from the schema default (`md`, ticket 31).
      storageMode: 'vector-only',
      projectName: 'test-project',
      embedder: mockEmbedder
    });

    // Inserted first → lower rowid → ranks #1 in both semantic and FTS lists
    await memory.addLearning('always pin sqlite version for stable builds', ['sqlite'], { importance: 1 });
    // Inserted second → higher rowid → ranks #2 in both lists, but importance=5 adds 0.25 points
    await memory.addLearning('always pin sqlite version for stable builds', ['sqlite'], { importance: 5 });

    const results = await memory.query({ text: 'sqlite', kind: 'learning' });

    expect(results[0].importance).toBe(5);
    expect(results[1].importance).toBe(1);
  });

  it('should merge learnings and history results into a single ranked list when no kind filter is applied', async () => {
    const keywordVec = new Float32Array(384);
    keywordVec[4] = 1.0;

    const otherVec = new Float32Array(384);
    otherVec[5] = 1.0;

    const mockEmbedder = {
      embed: async (text: string) => {
        if (text.includes('webpack') || text === 'webpack bundler') return keywordVec;
        return otherVec;
      },
      embedQuery: async (text: string) => {
        if (text.includes('webpack') || text === 'webpack bundler') return keywordVec;
        return otherVec;
      }
    };

    const memory = new NeuronMemory({
      dbPath: ':memory:',
      projectRoot: '/test/project',
      // Fabricated root: no directory to write .neuron/ into, so the mode is
      // pinned rather than inherited from the schema default (`md`, ticket 31).
      storageMode: 'vector-only',
      projectName: 'test-project',
      embedder: mockEmbedder
    });

    await memory.addLearning('configure webpack for production bundling', ['webpack'], { importance: 3 });
    await memory.addHistory('ran webpack build successfully', { tags: ['webpack'], importance: 3 });

    // No kind filter → both learnings and history are searched
    const results = await memory.query({ text: 'webpack bundler' });

    const kinds = results.map(r => r.kind);
    expect(kinds).toContain('learning');
    expect(kinds).toContain('history');
  });

describe('NeuronMemory BGE query instruction prefix', () => {
  it('should call embedQuery (not embed) when computing the search vector so the BGE instruction prefix is applied', async () => {
    // vecA: aligns with "alpha" passage. embed('alpha...') = vecA.
    // vecB: aligns with "beta" passage.  embed('beta...')  = vecB.
    //
    // The mock's embed() for ANY non-passage text (i.e. the query text 'search query')
    // returns vecA — so if query() calls embed(), alpha ranks first.
    //
    // embedQuery() always returns vecB — so if query() calls embedQuery(), beta ranks first.
    //
    // Only one of these can be true at once: this test is a decisive discriminator.
    const vecA = new Float32Array(384);
    vecA[0] = 1.0;

    const vecB = new Float32Array(384);
    vecB[1] = 1.0;

    const mockEmbedder = {
      // Passage embedding: distinguishes the two learnings by content keyword
      embed: async (text: string) => {
        if (text.includes('alpha')) return vecA;
        if (text.includes('beta')) return vecB;
        // query() incorrectly calling embed() for the search vector gets vecA
        return vecA;
      },
      // Query embedding: always returns vecB — the decisive signal
      embedQuery: async (_text: string) => vecB
    };

    const memory = new NeuronMemory({
      dbPath: ':memory:',
      projectRoot: '/test/project',
      // Fabricated root: no directory to write .neuron/ into, so the mode is
      // pinned rather than inherited from the schema default (`md`, ticket 31).
      storageMode: 'vector-only',
      projectName: 'test-project',
      embedder: mockEmbedder
    });

    await memory.addLearning('alpha learning', [], { importance: 3 });
    await memory.addLearning('beta learning', [], { importance: 3 });

    const results = await memory.query({ text: 'search query', kind: 'learning' });

    // Correct: embedQuery → vecB → beta ranks first
    // Wrong:   embed      → vecA → alpha ranks first
    expect(results[0].content).toBe('beta learning');
  });

  describe('NeuronMemory markdown-first storage (Ticket 29, formerly "Ticket 06 md-only delegation")', () => {
    it('writes markdown as the record of truth and retrieves through the same hybrid path as vector-only in md mode', async () => {
      const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'neuron-t29-md-test-'));
      const configPath = path.join(tempDir, 'neuron.yaml');
      fs.writeFileSync(
        configPath,
        `version: "1.0"\nstorage:\n  mode: md\n  path: .neuron\n`,
        'utf8'
      );

      const memory = new NeuronMemory({
        dbPath: path.join(tempDir, 'test.sqlite'),
        projectRoot: tempDir,
        projectName: 't29-project',
        embedder: { embed: async () => new Float32Array(384), embedQuery: async () => new Float32Array(384) },
      });

      await memory.transact([
        {
          op: 'upsert',
          category: 'learning',
          id: 't29-native-1',
          content: 'Native markdown storage delegation learning',
          tags: ['native', 'md'],
        },
      ]);

      // Markdown is the record of truth: the file is written on disk.
      const mdFile = path.join(tempDir, '.neuron', 'learning.md');
      expect(fs.existsSync(mdFile)).toBe(true);
      const contentOnDisk = fs.readFileSync(mdFile, 'utf8');
      expect(contentOnDisk).toContain('Native markdown storage delegation learning');

      // Retrieval is the same hybrid RRF path as vector-only — no separate
      // markdown-side substring matcher (ADR 0011 §6).
      const queryResults = await memory.query({ text: 'Native markdown', categories: ['learning'] });
      expect(queryResults).toHaveLength(1);
      expect(queryResults[0].id).toBe('t29-native-1');
      expect(queryResults[0].content).toContain('Native markdown storage delegation learning');

      memory.close();
      fs.rmSync(tempDir, { recursive: true, force: true });
    });
  });

  describe('Ticket 29: the database is present in md mode, as a rebuildable index', () => {
    // md-only's whole premise — no database at all — was deleted by ticket 28:
    // every one of its defects traced to `this.db = null`. `md` mode (the
    // renamed `dual`) keeps the database; it demotes it to a rebuildable
    // index rather than removing it, which is what makes hybrid retrieval,
    // enrichment and honest counts all work unchanged.
    it('creates a .sqlite database file on disk when storage.mode is md', async () => {
      const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'neuron-t29-db-test-'));
      const configPath = path.join(tempDir, 'neuron.yaml');
      fs.writeFileSync(
        configPath,
        `version: "1.0"\nstorage:\n  mode: md\n  path: .neuron\n`,
        'utf8'
      );

      const targetSqlitePath = path.join(tempDir, 'should-exist.sqlite');

      const memory = new NeuronMemory({
        dbPath: targetSqlitePath,
        projectRoot: tempDir,
        projectName: 't29-project',
        embedder: { embed: async () => new Float32Array(384), embedQuery: async () => new Float32Array(384) },
      });

      expect(memory.getDb()).not.toBeNull();
      expect(fs.existsSync(targetSqlitePath)).toBe(true);

      memory.close();
      fs.rmSync(tempDir, { recursive: true, force: true });
    });

    it('round-trips a value through getMeta/setMeta', () => {
      const memory = NeuronMemory.inMemory('t29-meta-project');
      expect(memory.getMeta('md_seeded_at')).toBeNull();
      memory.setMeta('md_seeded_at', '2026-08-02T00:00:00.000Z');
      expect(memory.getMeta('md_seeded_at')).toBe('2026-08-02T00:00:00.000Z');
      memory.close();
    });
  });
});
