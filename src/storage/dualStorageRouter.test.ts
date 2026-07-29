import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { NeuronMemory } from '../index.js';
import { MdStorageAdapter } from './mdStorageAdapter.js';
import { DualStorageRouter } from './dualStorageRouter.js';
import { NeuronConfig } from '../config/neuronYaml.js';

describe('DualStorageRouter (R2 Unit & Boundary Tests)', () => {
  const testDir = path.join(process.cwd(), 'src', '__tests__', `temp-dual-router-${Date.now()}`);
  const storagePath = path.join(testDir, '.neuron');
  let memoryDb: NeuronMemory;
  let mdAdapter: MdStorageAdapter;

  beforeEach(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
    fs.mkdirSync(storagePath, { recursive: true });

    memoryDb = NeuronMemory.inMemory('dual-router-test');
    mdAdapter = new MdStorageAdapter({ storagePath });
  });

  afterEach(() => {
    if (memoryDb) {
      memoryDb.close();
    }
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  const makeConfig = (mode: 'vector-only' | 'md-only' | 'dual' | 'split'): NeuronConfig => ({
    version: '1.0',
    storage: { mode, path: storagePath },
    categories: { learning: {}, history: {}, decisions: {} },
    pullRules: { default: { minScore: 0.3, categories: ['learning'] }, onExec: [] },
  });

  // --- Tier 1 Coverage Tests (R2-T1-01 to R2-T1-05) ---

  it('R2-T1-01: routes add mutation to SQLite vector DB only in vector-only mode', async () => {
    const router = new DualStorageRouter(memoryDb, mdAdapter, makeConfig('vector-only'));

    const results = await router.transact([
      { op: 'upsert', category: 'learning', id: 'vec-1', content: 'Vector only content', tags: ['v1'] },
    ]);

    expect(results).toHaveLength(1);
    expect(results[0].id).toBe('vec-1');
    expect(results[0].status).toBe('created');

    const dbQuery = await memoryDb.query({ category: 'learning' });
    expect(dbQuery).toHaveLength(1);
    expect(dbQuery[0].id).toBe('vec-1');

    const mdMemories = await mdAdapter.readCategory('learning');
    expect(mdMemories).toHaveLength(0);
  });

  it('R2-T1-02: routes add mutation to MdStorageAdapter only in md-only mode', async () => {
    const router = new DualStorageRouter(memoryDb, mdAdapter, makeConfig('md-only'));

    const results = await router.transact([
      { op: 'upsert', category: 'learning', id: 'md-1', content: 'MD only content', tags: ['m1'] },
    ]);

    expect(results).toHaveLength(1);
    expect(results[0].id).toBe('md-1');
    expect(results[0].status).toBe('created');

    const mdMemories = await mdAdapter.readCategory('learning');
    expect(mdMemories).toHaveLength(1);
    expect(mdMemories[0].id).toBe('md-1');

    const dbQuery = await memoryDb.query({ category: 'learning' });
    expect(dbQuery).toHaveLength(0);
  });

  it('R2-T1-03: routes add mutation to both backends in dual mode', async () => {
    const router = new DualStorageRouter(memoryDb, mdAdapter, makeConfig('dual'));

    const results = await router.transact([
      { op: 'upsert', category: 'learning', id: 'dual-1', content: 'Dual mode content', tags: ['d1'] },
    ]);

    expect(results).toHaveLength(1);
    expect(results[0].id).toBe('dual-1');
    expect(results[0].status).toBe('created');

    const dbQuery = await memoryDb.query({ category: 'learning' });
    expect(dbQuery).toHaveLength(1);
    expect(dbQuery[0].id).toBe('dual-1');

    const mdMemories = await mdAdapter.readCategory('learning');
    expect(mdMemories).toHaveLength(1);
    expect(mdMemories[0].id).toBe('dual-1');
  });

  it('R2-T1-04: routes update mutation in split storage mode', async () => {
    const router = new DualStorageRouter(memoryDb, mdAdapter, makeConfig('split'));

    await router.transact([
      { op: 'upsert', category: 'history', id: 'split-1', content: 'Original split content' },
    ]);

    const updateResults = await router.transact([
      { op: 'update', category: 'history', id: 'split-1', content: 'Updated split content' },
    ]);

    expect(updateResults[0].id).toBe('split-1');
    expect(updateResults[0].status).toBe('updated');

    const mdMemories = await mdAdapter.readCategory('history');
    expect(mdMemories[0].content).toContain('Updated split content');
  });

  it('R2-T1-05: routes delete mutation to both backends in dual mode', async () => {
    const router = new DualStorageRouter(memoryDb, mdAdapter, makeConfig('dual'));

    await router.transact([
      { op: 'upsert', category: 'learning', id: 'del-dual-1', content: 'Content to delete' },
    ]);

    const delResults = await router.transact([
      { op: 'delete', category: 'learning', id: 'del-dual-1' },
    ]);

    expect(delResults[0].id).toBe('del-dual-1');
    expect(delResults[0].status).toBe('deleted');

    const dbQuery = await memoryDb.query({ category: 'learning' });
    expect(dbQuery).toHaveLength(0);

    const mdMemories = await mdAdapter.readCategory('learning');
    expect(mdMemories).toHaveLength(0);
  });

  // --- Tier 2 Boundary Tests (R2-T2-01 to R2-T2-05) ---

  it('R2-T2-01: handles disk write error gracefully in dual mode with non-blocking reporting', async () => {
    const router = new DualStorageRouter(memoryDb, mdAdapter, makeConfig('dual'));

    const writeSpy = vi.spyOn(mdAdapter, 'writeEntry').mockImplementationOnce(() => {
      throw new Error('EACCES: permission denied');
    });

    const results = await router.transact([
      { op: 'upsert', category: 'learning', id: 'err-1', content: 'Content with disk error' },
    ]);

    expect(results).toHaveLength(1);
    expect(results[0].id).toBe('err-1');

    writeSpy.mockRestore();
  });

  it('R2-T2-02: falls back to vector-only mode when invalid storage mode is specified in config', async () => {
    const invalidConfig = {
      storage: { mode: 'invalid-mode-string' as any, path: storagePath },
    } as NeuronConfig;

    const router = new DualStorageRouter(memoryDb, mdAdapter, invalidConfig);

    const results = await router.transact([
      { op: 'upsert', category: 'learning', id: 'fallback-1', content: 'Fallback content' },
    ]);

    expect(results[0].id).toBe('fallback-1');
    expect(results[0].status).toBe('created');

    const dbQuery = await memoryDb.query({ category: 'learning' });
    expect(dbQuery).toHaveLength(1);
  });

  it('R2-T2-03: handles rapid concurrent mutation calls without file lock contention', async () => {
    const router = new DualStorageRouter(memoryDb, mdAdapter, makeConfig('dual'));

    const promises = Array.from({ length: 10 }).map((_, i) =>
      router.transact([
        { op: 'upsert', category: 'learning', id: `concurrent-${i}`, content: `Concurrent content ${i}` },
      ])
    );

    const results = await Promise.all(promises);
    expect(results).toHaveLength(10);

    const mdMemories = await mdAdapter.readCategory('learning');
    expect(mdMemories.length).toBeGreaterThanOrEqual(1);
  });

  it('R2-T2-04: handles search/query fallback when operating in md-only mode', async () => {
    const router = new DualStorageRouter(memoryDb, mdAdapter, makeConfig('md-only'));

    await router.transact([
      { op: 'upsert', category: 'learning', id: 'q-1', content: 'Search target query phrase', tags: ['search'] },
      { op: 'upsert', category: 'learning', id: 'q-2', content: 'Unrelated entry', tags: ['other'] },
    ]);

    const results = await router.query({ text: 'target', category: 'learning' });
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe('q-1');
  });

  it('R2-T2-05: handles update and delete for non-existent entry ID gracefully', async () => {
    const router = new DualStorageRouter(memoryDb, mdAdapter, makeConfig('dual'));

    const updateRes = await router.transact([
      { op: 'update', category: 'learning', id: 'non-existent-uuid', content: 'Does not exist' },
    ]);
    expect(updateRes[0].status).toBe('not_found');

    const deleteRes = await router.transact([
      { op: 'delete', category: 'learning', id: 'non-existent-uuid' },
    ]);
    expect(deleteRes[0].status).toBe('not_found');
  });

  describe('Ticket 07: In-Memory Markdown Vector Search & mtimeMs Invalidation', () => {
    it('should rank md-only query results by vector embedding similarity and invalidate cache on mtimeMs change', async () => {
      const vecHigh = new Float32Array(384);
      vecHigh[0] = 1.0;
      const vecLow = new Float32Array(384);
      vecLow[1] = 1.0;
      const vecQuery = new Float32Array(384);
      vecQuery[0] = 0.9;
      vecQuery[1] = 0.1;

      const mockEmbedder = {
        embed: async (text: string) => (text.includes('High') ? vecHigh : vecLow),
        embedQuery: async (_text: string) => vecQuery,
      };

      const customDb = new NeuronMemory({
        dbPath: ':memory:',
        projectRoot: testDir,
        projectName: 't07-project',
        embedder: mockEmbedder,
      });

      const router = new DualStorageRouter(customDb, mdAdapter, makeConfig('md-only'));

      await router.transact([
        { op: 'upsert', category: 'learning', id: 't07-low', content: 'Low similarity entry', tags: ['t1'] },
        { op: 'upsert', category: 'learning', id: 't07-high', content: 'High similarity entry', tags: ['t2'] },
      ]);

      const results1 = await router.query({ text: 'High query search', category: 'learning' });
      expect(results1).toHaveLength(2);
      expect(results1[0].id).toBe('t07-high');
      expect(results1[0].score).toBeGreaterThan(results1[1].score!);

      // Modify .neuron/learning.md on disk externally and bump mtime
      const learningMd = path.join(storagePath, 'learning.md');
      const updatedMdContent = fs.readFileSync(learningMd, 'utf8').replace('Low similarity entry', 'High relevance updated entry');
      fs.writeFileSync(learningMd, updatedMdContent, 'utf8');

      const futureTime = new Date(Date.now() + 5000);
      fs.utimesSync(learningMd, futureTime, futureTime);

      const results2 = await router.query({ text: 'High query search', category: 'learning' });
      const updatedEntry = results2.find(m => m.id === 't07-low');
      expect(updatedEntry?.content).toContain('High relevance updated entry');

      customDb.close();
    });
  });
});
