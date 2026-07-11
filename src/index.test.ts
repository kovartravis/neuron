import { describe, it, expect } from 'vitest';
import { NeuronMemory } from './index.js';

describe('NeuronMemory DB Migrations', () => {
  it('should initialize an in-memory database and run migrations', () => {
    const memory = new NeuronMemory({
      dbPath: ':memory:',
      projectRoot: '/test/project',
      projectName: 'test-project'
    });

    const db = memory.getDb();
    
    // Check that user_version is 1
    const userVersion = db.pragma('user_version', { simple: true });
    expect(userVersion).toBe(1);

    // Check that the meta table has project_name and project_root
    const projectName = db.prepare("SELECT value FROM meta WHERE key = 'project_name'").get() as { value: string };
    const projectRoot = db.prepare("SELECT value FROM meta WHERE key = 'project_root'").get() as { value: string };

    expect(projectName.value).toBe('test-project');
    expect(projectRoot.value).toBe('/test/project');
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
    expect(first.score).toBeCloseTo(0.9);
    expect(first.tags).toEqual(['testing']);

    const second = queryResult.results[1];
    expect(second.content).toBe('Use credit cards for checkouts');
    expect(second.score).toBeCloseTo(0.1);
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
});
