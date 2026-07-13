import { describe, it, expect } from 'vitest';
import { NeuronMemory } from './index.js';

describe('NeuronMemory DB Migrations', () => {
  it('should initialize an in-memory database and run migrations to version 2', () => {
    const memory = new NeuronMemory({
      dbPath: ':memory:',
      projectRoot: '/test/project',
      projectName: 'test-project'
    });

    const db = memory.getDb();
    
    // Check that user_version is 2
    const userVersion = db.pragma('user_version', { simple: true });
    expect(userVersion).toBe(2);

    // Check that the meta table has project_name and project_root
    const projectName = db.prepare("SELECT value FROM meta WHERE key = 'project_name'").get() as { value: string };
    const projectRoot = db.prepare("SELECT value FROM meta WHERE key = 'project_root'").get() as { value: string };

    expect(projectName.value).toBe('test-project');
    expect(projectRoot.value).toBe('/test/project');

    // Check learnings columns
    const learningsCols = db.pragma("table_info(learnings)") as any[];
    const learningsNames = learningsCols.map(c => c.name);
    expect(learningsNames).toContain('importance');
    expect(learningsNames).toContain('scope');

    // Check history columns
    const historyCols = db.pragma("table_info(history)") as any[];
    const historyNames = historyCols.map(c => c.name);
    expect(historyNames).toContain('importance');
    expect(historyNames).toContain('scope');

    // Check query_logs table exists
    const queryLogsTable = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='query_logs'").get() as { name: string } | undefined;
    expect(queryLogsTable).toBeDefined();
    expect(queryLogsTable?.name).toBe('query_logs');
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
});
