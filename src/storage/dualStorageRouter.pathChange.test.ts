import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { NeuronMemory } from '../index.js';
import { MultiRootMdStorage } from './multiRootMdStorage.js';
import { DualStorageRouter } from './dualStorageRouter.js';
import { NeuronConfig } from '../config/neuronYaml.js';

/**
 * Ticket 05's "data-loss-adjacent part": `md` mode's mirror deletes any
 * vector row whose id isn't found in the markdown read from a category's
 * *current* resolved root. If `neuron.yaml` changes `categories.learning.path`
 * between two commands, the old file is still sitting at the old root — a
 * naive reconcile against the new (empty) root would read that as "markdown
 * deleted everything" and wipe the vector index. Per the maintainer's
 * decision, the actual behaviour is a per-category reseed from the vector
 * index into the new root instead — asserted end to end here rather than
 * just unit-testing the resolver.
 */
describe('DualStorageRouter path-change safety (ticket 05)', () => {
  const testDir = path.join(process.cwd(), 'src', '__tests__', `temp-dual-router-pathchange-${Date.now()}`);
  let memoryDb: NeuronMemory;

  beforeEach(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
    fs.mkdirSync(testDir, { recursive: true });
    memoryDb = NeuronMemory.inMemory('dual-router-pathchange-test');
  });

  afterEach(() => {
    if (memoryDb) {
      memoryDb.close();
    }
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  const makeConfig = (categoryPath?: string): NeuronConfig => ({
    version: '1.0',
    strict: false,
    storage: { mode: 'md' },
    categories: { learning: { path: categoryPath } },
    scan: { enabled: false, category: 'learning', depth: 3 },
    pullRules: { default: { categories: ['learning'] }, onExec: [] },
    llm: { enrichment: { enabled: true, category: 'infer', tags: 'infer', timeoutMs: 15000, maxTags: 3, minTagSimilarity: 0.5, categoryStrategy: 'centroid' } },
    relevance: { gate: { enabled: true } },
    recall: { epochCharBudget: 18000 },
  });

  it('reseeds a category into its new root instead of deleting the vector index when the resolved path changes', async () => {
    const configA = makeConfig(); // resolves to <testDir>/.neuron
    const mdAdapterA = new MultiRootMdStorage(configA, testDir);
    const routerA = new DualStorageRouter(memoryDb, mdAdapterA, configA, testDir);

    await routerA.transact([
      { op: 'upsert', category: 'learning', id: 'survives-1', content: 'must survive a path change', tags: [] },
    ]);

    const oldRoot = path.join(testDir, '.neuron');
    const oldFilePath = path.join(oldRoot, 'learning.md');
    expect(fs.existsSync(oldFilePath)).toBe(true);
    const oldFileContentBeforeMove = fs.readFileSync(oldFilePath, 'utf8');
    expect(oldFileContentBeforeMove).toContain('survives-1');

    // Simulate an edited neuron.yaml: learning now resolves elsewhere.
    const configB = makeConfig('moved-notes');
    const mdAdapterB = new MultiRootMdStorage(configB, testDir);
    const routerB = new DualStorageRouter(memoryDb, mdAdapterB, configB, testDir);

    // Any reconcile-triggering call — query is enough, no new mutation needed.
    await routerB.query({ category: 'learning' });

    // Not deleted — the whole point of the guard.
    const afterMove = await memoryDb.query({ category: 'learning' });
    expect(afterMove.map(m => m.id)).toContain('survives-1');

    // Reseeded at the new root.
    const newRoot = path.join(testDir, 'moved-notes');
    const newFilePath = path.join(newRoot, 'learning.md');
    expect(fs.existsSync(newFilePath)).toBe(true);
    expect(fs.readFileSync(newFilePath, 'utf8')).toContain('survives-1');

    // The old file is left behind exactly as it was — orphaned, not deleted
    // or rewritten — matching the "plain relocate" option being declined.
    expect(fs.readFileSync(oldFilePath, 'utf8')).toBe(oldFileContentBeforeMove);
  });

  it('does not reseed when the resolved root is unchanged (no path override anywhere)', async () => {
    const config = makeConfig();
    const mdAdapter = new MultiRootMdStorage(config, testDir);
    const router1 = new DualStorageRouter(memoryDb, mdAdapter, config, testDir);

    await router1.transact([
      { op: 'upsert', category: 'learning', id: 'stable-1', content: 'stable content', tags: [] },
    ]);

    const router2 = new DualStorageRouter(memoryDb, mdAdapter, config, testDir);
    await router2.query({ category: 'learning' });

    const results = await memoryDb.query({ category: 'learning' });
    expect(results.map(m => m.id)).toContain('stable-1');
  });
});
