import { describe, it, expect } from 'vitest';
import { NeuronMemory } from './index.js';

describe('NeuronMemory DB Migrations', () => {
  it('should initialize an in-memory database and run migrations to version 3', () => {
    const memory = new NeuronMemory({
      dbPath: ':memory:',
      projectRoot: '/test/project',
      projectName: 'test-project'
    });

    const db = memory.getDb();
    
    // Check that user_version is 3
    const userVersion = db.pragma('user_version', { simple: true });
    expect(userVersion).toBe(3);

    // Check learnings columns
    const learningsCols = db.pragma("table_info(learnings)") as any[];
    const learningsNames = learningsCols.map(c => c.name);
    expect(learningsNames).toContain('is_manual_scope');

    // Check learning_query_matches table exists
    const matchTable = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='learning_query_matches'").get() as { name: string } | undefined;
    expect(matchTable).toBeDefined();
    expect(matchTable?.name).toBe('learning_query_matches');
  });

  it('should set is_manual_scope flag when explicit scope is provided', async () => {
    const mockEmbedder = { embed: async () => new Float32Array(384) };
    const memory = new NeuronMemory({
      dbPath: ':memory:',
      projectRoot: '/test/project',
      projectName: 'test-project',
      embedder: mockEmbedder
    });

    const defaultLearn = await memory.addLearning('Default scope learning');
    const manualLearn = await memory.addLearning('Manual scope learning', [], { scope: 'global' });

    const db = memory.getDb();
    const row1 = db.prepare('SELECT is_manual_scope FROM learnings WHERE id = ?').get(defaultLearn.id) as { is_manual_scope: number };
    const row2 = db.prepare('SELECT is_manual_scope FROM learnings WHERE id = ?').get(manualLearn.id) as { is_manual_scope: number };

    expect(row1.is_manual_scope).toBe(0);
    expect(row2.is_manual_scope).toBe(1);
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
      }
    };

    const memory = new NeuronMemory({
      dbPath: ':memory:',
      projectRoot: '/test/project',
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
    expect(first.score).toBeCloseTo(0.8);
    expect(first.tags).toEqual(['testing']);

    const second = queryResult.results[1];
    expect(second.content).toBe('Use credit cards for checkouts');
    expect(second.score).toBeCloseTo(0.2);
    expect(second.tags).toEqual(['checkout']);
  });

  it('should support listing and deleting learnings', async () => {
    const mockEmbedder = {
      embed: async () => new Float32Array(384)
    };

    const memory = new NeuronMemory({
      dbPath: ':memory:',
      projectRoot: '/test/project',
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
      embed: async () => new Float32Array(384)
    };

    const memory = new NeuronMemory({
      dbPath: ':memory:',
      projectRoot: '/test/project',
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

  it('should store importance and scope for learnings and history, defaulting when omitted', async () => {
    const mockEmbedder = {
      embed: async () => new Float32Array(384)
    };

    const memory = new NeuronMemory({
      dbPath: ':memory:',
      projectRoot: '/test/project',
      projectName: 'test-project',
      embedder: mockEmbedder
    });

    // 1. Add learning and history with explicit importance and scope
    const learning1 = await memory.addLearning('Learning with custom scope', ['tag'], { importance: 5, scope: 'kovart' });
    const history1 = await memory.addHistory('History with custom scope', { importance: 2, scope: 'global' });

    // Verify values in DB
    const db = memory.getDb();
    const l1 = db.prepare('SELECT scope, importance FROM learnings WHERE id = ?').get(learning1.id) as { scope: string; importance: number };
    expect(l1.scope).toBe('kovart');
    expect(l1.importance).toBe(5);

    const h1 = db.prepare('SELECT scope, importance FROM history WHERE id = ?').get(history1.id) as { scope: string; importance: number };
    expect(h1.scope).toBe('global');
    expect(h1.importance).toBe(2);

    // 2. Add learning and history without explicit importance and scope (should default)
    const learning2 = await memory.addLearning('Default learning', ['tag']);
    const history2 = await memory.addHistory('Default history');

    const l2 = db.prepare('SELECT scope, importance FROM learnings WHERE id = ?').get(learning2.id) as { scope: string; importance: number };
    expect(l2.scope).toBe('test-project');
    expect(l2.importance).toBe(3);

    const h2 = db.prepare('SELECT scope, importance FROM history WHERE id = ?').get(history2.id) as { scope: string; importance: number };
    expect(h2.scope).toBe('test-project');
    expect(h2.importance).toBe(3);
  });

  it('should filter queries by scope, apply hybrid scoring, and log the query', async () => {
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
      }
    };

    const memory = new NeuronMemory({
      dbPath: ':memory:',
      projectRoot: '/test/project',
      projectName: 'test-project',
      embedder: mockEmbedder
    });

    // Add learnings:
    // Item A: Sim = 0.9, Importance = 5 (Norm = 1.0). Scope = 'test-project'
    // Score = 0.75 * 0.9 + 0.25 * 1.0 = 0.925
    await memory.addLearning('itemA content', ['tag'], { importance: 5 });

    // Item B: Sim = 0.8, Importance = 5 (Norm = 1.0). Scope = 'kovart'
    // Score = 0.75 * 0.8 + 0.25 * 1.0 = 0.85
    await memory.addLearning('itemB content', ['tag'], { importance: 5, scope: 'kovart' });

    // Item C: Sim = 0.95, Importance = 1 (Norm = 0.0). Scope = 'test-project'
    // Score = 0.75 * 0.95 + 0.25 * 0.0 = 0.7125
    await memory.addLearning('itemC content', ['tag'], { importance: 1 });

    // 1. Query with default scopes (should only see 'global' and 'test-project', so A and C, not B)
    const resDefault = await memory.queryLearnings('query test', { limit: 5 });
    expect(resDefault.results).toHaveLength(2);
    expect(resDefault.results[0].content).toBe('itemA content');
    expect(resDefault.results[0].score).toBeCloseTo(0.925);
    expect(resDefault.results[1].content).toBe('itemC content');
    expect(resDefault.results[1].score).toBeCloseTo(0.7125);

    // 2. Query with custom scopes (include 'kovart', so A, B, and C are all visible)
    const resCustom = await memory.queryLearnings('query test', { limit: 5, scopes: ['test-project', 'kovart'] });
    expect(resCustom.results).toHaveLength(3);
    expect(resCustom.results[0].content).toBe('itemA content');
    expect(resCustom.results[1].content).toBe('itemB content');
    expect(resCustom.results[2].content).toBe('itemC content');

    // 3. Verify query log is written
    const db = memory.getDb();
    const logs = db.prepare('SELECT query_text, scope FROM query_logs ORDER BY created_at ASC').all() as any[];
    expect(logs).toHaveLength(2);
    expect(logs[0].query_text).toBe('query test');
    expect(logs[0].scope).toBe('global,test-project');
    expect(logs[1].scope).toBe('test-project,kovart');
  });

  it('should support pruning history based on age and importance criteria', async () => {
    const memory = new NeuronMemory({
      dbPath: ':memory:',
      projectRoot: '/test/project',
      projectName: 'test-project'
    });

    // 1. Add test history entries
    const h1 = await memory.addHistory('Old and low importance', { importance: 1 });
    const h2 = await memory.addHistory('Old and medium importance', { importance: 2 });
    const h3 = await memory.addHistory('Old and high importance', { importance: 3 });
    const h4 = await memory.addHistory('New and low importance', { importance: 1 });

    // 2. Manipulate dates in SQLite
    const db = memory.getDb();
    
    // Set old entries to 40 days ago
    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - 40);
    const oldDateStr = oldDate.toISOString();

    db.prepare('UPDATE history SET created_at = ? WHERE id IN (?, ?, ?)')
      .run(oldDateStr, h1.id, h2.id, h3.id);

    // 3. Run prune with default parameters (days=30, maxImportance=2)
    const pruneRes1 = memory.pruneHistory();
    expect(pruneRes1.deletedCount).toBe(2);

    // Check remaining entries
    const list1 = memory.listHistory({ limit: 10 });
    expect(list1).toHaveLength(2);
    const remainingIds1 = list1.map(h => h.id);
    expect(remainingIds1).toContain(h3.id);
    expect(remainingIds1).toContain(h4.id);

    // 4. Run prune with custom parameters: days=10, maxImportance=4
    const pruneRes2 = memory.pruneHistory({ days: 10, maxImportance: 4 });
    expect(pruneRes2.deletedCount).toBe(1);

    const list2 = memory.listHistory({ limit: 10 });
    expect(list2).toHaveLength(1);
    expect(list2[0].id).toBe(h4.id);
  });

  it('should support updating learnings in-place and regenerating embeddings', async () => {
    const mockEmbedder = {
      embed: async (text: string) => {
        if (text === 'original text') return new Float32Array(384).fill(1);
        if (text === 'updated text') return new Float32Array(384).fill(2);
        return new Float32Array(384);
      }
    };

    const memory = new NeuronMemory({
      dbPath: ':memory:',
      projectRoot: '/test/project',
      projectName: 'test-project',
      embedder: mockEmbedder
    });

    // 1. Add learning
    const added = await memory.addLearning('original text', ['initial'], { importance: 3, scope: 'initial-scope' });
    
    // Check initial state
    const db = memory.getDb();
    const row1 = db.prepare('SELECT content, tags, importance, scope, embedding FROM learnings WHERE id = ?').get(added.id) as any;
    expect(row1.content).toBe('original text');
    expect(JSON.parse(row1.tags)).toEqual(['initial']);
    expect(row1.importance).toBe(3);
    expect(row1.scope).toBe('initial-scope');
    const floatArr1 = new Float32Array(row1.embedding.buffer, row1.embedding.byteOffset, row1.embedding.byteLength / 4);
    expect(floatArr1[0]).toBe(1);

    // 2. Update with content and scope override, preserving tags and importance
    const updateRes = await memory.updateLearning(added.id, 'updated text', { scope: 'new-scope' });
    expect(updateRes.status).toBe('updated');
    expect(updateRes.id).toBe(added.id);

    // Check updated state
    const row2 = db.prepare('SELECT content, tags, importance, scope, embedding FROM learnings WHERE id = ?').get(added.id) as any;
    expect(row2.content).toBe('updated text');
    expect(JSON.parse(row2.tags)).toEqual(['initial']); // preserved
    expect(row2.importance).toBe(3); // preserved
    expect(row2.scope).toBe('new-scope'); // updated
    const floatArr2 = new Float32Array(row2.embedding.buffer, row2.embedding.byteOffset, row2.embedding.byteLength / 4);
    expect(floatArr2[0]).toBe(2); // regenerated embedding

    // 3. Update optional attributes (tags, importance)
    await memory.updateLearning(added.id, 'updated text', { tags: ['new-tag'], importance: 5 });
    const row3 = db.prepare('SELECT tags, importance FROM learnings WHERE id = ?').get(added.id) as any;
    expect(JSON.parse(row3.tags)).toEqual(['new-tag']);
    expect(row3.importance).toBe(5);

    // 4. Update a non-existent ID
    const nonExistentRes = await memory.updateLearning('non-existent-uuid', 'some text');
    expect(nonExistentRes.status).toBe('not_found');
  });

  it('should promote, demote, and respect manual scope locks during checkAutoPromotions', async () => {
    const identicalVec = new Float32Array(384).fill(1); // normalized identical vectors produce dot product 384
    // Unit vector for perfect similarity match
    const unitVec = new Float32Array(384);
    unitVec[0] = 1.0;

    const mockEmbedder = {
      embed: async () => unitVec
    };

    const memory = new NeuronMemory({
      dbPath: ':memory:',
      projectRoot: '/test/project',
      projectName: 'test-project',
      embedder: mockEmbedder
    });

    // 1. Add learnings
    const learnDefault = await memory.addLearning('Default scope learning'); // scope = test-project, is_manual_scope = 0
    const learnManual = await memory.addLearning('Manual scope learning', [], { scope: 'test-project' }); // is_manual_scope = 1

    // 2. Add query logs (5 identical queries to trigger promotion from test-project -> project)
    for (let i = 0; i < 5; i++) {
      await memory.queryLearnings(`query text ${i}`);
    }

    // 3. Run checkAutoPromotions
    const res1 = memory.checkAutoPromotions();
    expect(res1.promoted).toHaveLength(1);
    expect(res1.promoted[0].id).toBe(learnDefault.id);
    expect(res1.promoted[0].from).toBe('test-project');
    expect(res1.promoted[0].to).toBe('project');

    // Manual learning should NOT be promoted despite having matching queries
    const db = memory.getDb();
    const manualRow = db.prepare('SELECT scope FROM learnings WHERE id = ?').get(learnManual.id) as { scope: string };
    expect(manualRow.scope).toBe('test-project');

    // 4. Add 10 more queries (total 15 matches) to trigger promotion to global
    for (let i = 5; i < 15; i++) {
      await memory.queryLearnings(`query text ${i}`);
    }

    const res2 = memory.checkAutoPromotions();
    expect(res2.promoted).toHaveLength(1);
    expect(res2.promoted[0].id).toBe(learnDefault.id);
    expect(res2.promoted[0].from).toBe('project');
    expect(res2.promoted[0].to).toBe('global');

    // 5. Test demotion: set query_logs matched_at to 40 days ago so active 30-day match count becomes 0
    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - 40);
    db.prepare('UPDATE query_logs SET created_at = ?').run(oldDate.toISOString());
    db.prepare('UPDATE learning_query_matches SET matched_at = ?').run(oldDate.toISOString());

    const res3 = memory.checkAutoPromotions();
    expect(res3.demoted).toHaveLength(1);
    expect(res3.demoted[0].id).toBe(learnDefault.id);
    expect(res3.demoted[0].from).toBe('global');
    expect(res3.demoted[0].to).toBe('test-project');
  });
});

