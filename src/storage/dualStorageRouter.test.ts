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

  // `md-only`, `dual`, `vector-only` and `split` are all *legacy* spellings
  // that reach the router raw, bypassing `neuron.yaml`'s Zod alias layer
  // (that layer only runs in `config/neuronYaml.ts`) — the router itself
  // recognises only the two canonical values (`md`, `vector`) since ticket
  // 06, so every one of these four strings now falls into the same
  // unrecognized-mode safe fallback R2-T1-02 exercises.
  const makeConfig = (mode: 'vector-only' | 'md-only' | 'dual' | 'md' | 'split' | 'vector'): NeuronConfig => ({
    version: '1.0',
    storage: { mode, path: storagePath },
    categories: { learning: {}, history: {}, decisions: {} },
    scan: { enabled: false, category: 'decisions', depth: 3 },
    pullRules: { default: { minScore: 0.3, categories: ['learning'] }, onExec: [] },
  });

  // --- Tier 1 Coverage Tests (R2-T1-01 to R2-T1-05) ---

  it('R2-T1-01: routes add mutation to SQLite vector DB only in vector mode', async () => {
    const router = new DualStorageRouter(memoryDb, mdAdapter, makeConfig('vector'));

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

  it('R2-T1-02: an unrecognized legacy "md-only" mode string falls back to vector rather than routing to markdown (ticket 29: md-only was deleted, not repaired)', async () => {
    // A raw router-level config bypasses the neuron.yaml alias/warning layer
    // (config/neuronYaml.ts), so a stale 'md-only' string reaching the router
    // directly is just another unrecognized mode, same bucket as R2-T2-02 —
    // and, since ticket 06, the same bucket 'vector-only' and 'split' fall
    // into too, since the router only recognises 'md'/'vector' now.
    const router = new DualStorageRouter(memoryDb, mdAdapter, makeConfig('md-only'));

    const results = await router.transact([
      { op: 'upsert', category: 'learning', id: 'md-1', content: 'MD only content', tags: ['m1'] },
    ]);

    expect(results).toHaveLength(1);
    expect(results[0].id).toBe('md-1');
    expect(results[0].status).toBe('created');

    const dbQuery = await memoryDb.query({ category: 'learning' });
    expect(dbQuery).toHaveLength(1);

    const mdMemories = await mdAdapter.readCategory('learning');
    expect(mdMemories).toHaveLength(0);
  });

  it('R2-T1-03: routes add mutation to both backends in md mode (the renamed "dual")', async () => {
    const router = new DualStorageRouter(memoryDb, mdAdapter, makeConfig('md'));

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

  it('R2-T1-04: routes update mutation in md storage mode (the mode split aliases to, ticket 06)', async () => {
    const router = new DualStorageRouter(memoryDb, mdAdapter, makeConfig('md'));

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

  it('Ticket 06: the per-category storage override is always live under any top-level mode — "vector" stays vector-only, and a category with no explicit storage (or "md") writes both — matching what "split" used to require a special top-level mode to reach', async () => {
    const config = makeConfig('md');
    config.categories = {
      ...config.categories,
      learning: { storage: 'vector' },
      history: {}, // no explicit storage: defaults to the write-both behaviour
    };
    const router = new DualStorageRouter(memoryDb, mdAdapter, config);

    await router.transact([
      { op: 'upsert', category: 'learning', id: 'split-vec-1', content: 'vector-only category' },
      { op: 'upsert', category: 'history', id: 'split-md-1', content: 'default category writes both' },
    ]);

    expect((await mdAdapter.readCategory('learning'))).toHaveLength(0);
    expect((await memoryDb.query({ category: 'learning' })).some(m => m.id === 'split-vec-1')).toBe(true);

    expect((await mdAdapter.readCategory('history')).some(m => m.id === 'split-md-1')).toBe(true);
    expect((await memoryDb.query({ category: 'history' })).some(m => m.id === 'split-md-1')).toBe(true);
  });

  it('Ticket 06: the per-category override is also live when the top-level mode is "vector" — a category explicitly set to "md" still writes markdown', async () => {
    const config = makeConfig('vector');
    config.categories = {
      ...config.categories,
      learning: {}, // no explicit storage: defers to top-level "vector"
      history: { storage: 'md' }, // override: writes markdown despite top-level "vector"
    };
    const router = new DualStorageRouter(memoryDb, mdAdapter, config);

    await router.transact([
      { op: 'upsert', category: 'learning', id: 'top-vec-1', content: 'defers to top-level vector' },
      { op: 'upsert', category: 'history', id: 'override-md-1', content: 'overridden to md' },
    ]);

    expect((await mdAdapter.readCategory('learning'))).toHaveLength(0);
    expect((await memoryDb.query({ category: 'learning' })).some(m => m.id === 'top-vec-1')).toBe(true);

    expect((await mdAdapter.readCategory('history')).some(m => m.id === 'override-md-1')).toBe(true);
    expect((await memoryDb.query({ category: 'history' })).some(m => m.id === 'override-md-1')).toBe(true);
  });

  it('R2-T1-05: routes delete mutation to both backends in md mode', async () => {
    const router = new DualStorageRouter(memoryDb, mdAdapter, makeConfig('md'));

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

  it('R2-T2-01: handles disk write error gracefully in md mode with non-blocking reporting', async () => {
    const router = new DualStorageRouter(memoryDb, mdAdapter, makeConfig('md'));

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

  it('R2-T2-02: falls back to vector mode when invalid storage mode is specified in config', async () => {
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
    const router = new DualStorageRouter(memoryDb, mdAdapter, makeConfig('md'));

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

  it('R2-T2-04: queries md mode through the same hybrid RRF path as vector mode, with no separate markdown-side retrieval (ADR 0011 §6 — retrieval parity by construction)', async () => {
    const router = new DualStorageRouter(memoryDb, mdAdapter, makeConfig('md'));

    await router.transact([
      { op: 'upsert', category: 'learning', id: 'q-1', content: 'Search target query phrase', tags: ['search'] },
      { op: 'upsert', category: 'learning', id: 'q-2', content: 'Unrelated entry', tags: ['other'] },
    ]);

    const results = await router.query({ text: 'target', category: 'learning' });
    expect(results.some(m => m.id === 'q-1')).toBe(true);
  });

  it('R2-T2-05: handles update and delete for non-existent entry ID gracefully', async () => {
    const router = new DualStorageRouter(memoryDb, mdAdapter, makeConfig('md'));

    const updateRes = await router.transact([
      { op: 'update', category: 'learning', id: 'non-existent-uuid', content: 'Does not exist' },
    ]);
    expect(updateRes[0].status).toBe('not_found');

    const deleteRes = await router.transact([
      { op: 'delete', category: 'learning', id: 'non-existent-uuid' },
    ]);
    expect(deleteRes[0].status).toBe('not_found');
  });

  // The mdEmbedCache / per-category mtimeMs invalidation this described is
  // deleted along with md-only (ticket 29 item 3 explicitly rejects
  // per-category mtimeMs keying in favour of per-entry content hashing). Its
  // hand-edit-propagates-on-the-next-command scenario is re-covered by the
  // reconcile engine's own tests below, against content hashing instead.

  /**
   * `update`/`delete` in md mode reports success if EITHER store actually
   * changed within the same command — `vecResult` is consulted, not just the
   * md outcome, so a real vector-side change is never reported as
   * `not_found` just because the markdown-side write hiccupped in the same
   * call. This used to also cover a second scenario — a markdown-only
   * deletion made *between* commands, leaving a vector-only orphan for a
   * later update/delete to salvage — but ticket 29's strict-mirror reconcile
   * (below) now purges that orphan automatically on the very next command,
   * before the mutation is even processed, so "not_found" on it is correct
   * now rather than a bug.
   */
  describe('md-mode transact reports success if either store changed within a single command', () => {
    it('update reports "updated" when the markdown-side write fails within the same call but the vector write succeeds', async () => {
      const router = new DualStorageRouter(memoryDb, mdAdapter, makeConfig('md'));

      await router.transact([
        { op: 'upsert', category: 'learning', id: 'inflight-upd-1', content: 'original content' },
      ]);
      vi.spyOn(mdAdapter, 'updateEntry').mockRejectedValueOnce(new Error('disk busy'));

      const result = await router.transact([
        { op: 'update', category: 'learning', id: 'inflight-upd-1', content: 'updated for real' },
      ]);

      expect(result[0].status).toBe('updated');
      const dbQuery = await memoryDb.query({ category: 'learning' });
      expect(dbQuery.find(m => m.id === 'inflight-upd-1')?.content).toBe('updated for real');
    });

    it('delete reports "deleted" when the markdown-side delete fails within the same call but the vector delete succeeds', async () => {
      const router = new DualStorageRouter(memoryDb, mdAdapter, makeConfig('md'));

      await router.transact([
        { op: 'upsert', category: 'learning', id: 'inflight-del-1', content: 'to delete' },
      ]);
      vi.spyOn(mdAdapter, 'deleteEntry').mockRejectedValueOnce(new Error('disk busy'));

      const result = await router.transact([
        { op: 'delete', category: 'learning', id: 'inflight-del-1' },
      ]);

      expect(result[0].status).toBe('deleted');
      const dbQuery = await memoryDb.query({ category: 'learning' });
      expect(dbQuery).toHaveLength(0);
    });

    it('reports not_found when neither store has the id', async () => {
      const router = new DualStorageRouter(memoryDb, mdAdapter, makeConfig('md'));

      const delResult = await router.transact([
        { op: 'delete', category: 'learning', id: 'never-existed' },
      ]);
      expect(delResult[0].status).toBe('not_found');

      const updResult = await router.transact([
        { op: 'update', category: 'learning', id: 'never-existed', content: 'x' },
      ]);
      expect(updResult[0].status).toBe('not_found');
    });
  });

  describe('Ticket 29: strict-mirror reconcile supersedes the old vector-orphan salvage behavior', () => {
    it('purges a vector-side orphan on the next command once its markdown entry is gone, so a later update/delete on that id correctly reports not_found', async () => {
      const router = new DualStorageRouter(memoryDb, mdAdapter, makeConfig('md'));

      await router.transact([
        { op: 'upsert', category: 'learning', id: 'orphan-1', content: 'will be orphaned' },
      ]);
      // Simulate drift: something removed the .md copy directly, bypassing
      // the router (a hand-edit), without touching the vector index.
      await mdAdapter.deleteEntry('learning', 'orphan-1');
      expect(await mdAdapter.readCategory('learning')).toHaveLength(0);
      expect((await memoryDb.query({ category: 'learning' })).some(m => m.id === 'orphan-1')).toBe(true);

      // Any command reconciles first, which strict-mirrors the deletion.
      await router.query({ category: 'learning' });
      expect((await memoryDb.query({ category: 'learning' })).some(m => m.id === 'orphan-1')).toBe(false);

      const result = await router.transact([
        { op: 'delete', category: 'learning', id: 'orphan-1' },
      ]);
      expect(result[0].status).toBe('not_found');
    });
  });

  describe('Ticket 29: hand-edit round trip and re-embed churn (content hashing, not per-category mtimeMs)', () => {
    it('a hand-edit to the .md file is reflected on the next command, no sync step required', async () => {
      const router = new DualStorageRouter(memoryDb, mdAdapter, makeConfig('md'));
      await router.transact([
        { op: 'upsert', category: 'learning', id: 'hand-edit-1', content: 'original body' },
      ]);

      // Hand-edit the markdown file directly, bypassing the router entirely.
      await mdAdapter.updateEntry('learning', { id: 'hand-edit-1', content: 'edited body via hand-edit' });

      const results = await router.query({ category: 'learning' });
      expect(results.find(m => m.id === 'hand-edit-1')?.content).toBe('edited body via hand-edit');
    });

    it('an entry edited once re-embeds exactly once — asserts the embed count, not just the eventual result, since a churn loop can still produce correct output', async () => {
      const router = new DualStorageRouter(memoryDb, mdAdapter, makeConfig('md'));
      await router.transact([
        { op: 'upsert', category: 'learning', id: 'churn-1', content: 'v1' },
      ]);

      const vecTransactSpy = vi.spyOn(memoryDb, 'transact');
      vecTransactSpy.mockClear();

      await mdAdapter.updateEntry('learning', { id: 'churn-1', content: 'v2' });

      await router.query({ category: 'learning' });
      const callsAfterChange = vecTransactSpy.mock.calls.length;
      expect(callsAfterChange).toBe(1);

      // No further markdown change — the hash matches, so this must not
      // re-embed again (the churn loop ADR 0011 Consequence 4 guards against).
      await router.query({ category: 'learning' });
      expect(vecTransactSpy.mock.calls.length).toBe(callsAfterChange);

      vecTransactSpy.mockRestore();
    });
  });

  describe('Ticket 29: bootstrap seed (ADR 0011 Consequence 3)', () => {
    it('exports a populated vector store into markdown on the first md-mode command, and records meta.md_seeded_at', async () => {
      // Populate the vector store directly, as if this were an existing
      // vector-only or dual-mode project upgrading to md mode.
      await memoryDb.transact([
        { op: 'upsert', category: 'learning', id: 'seed-1', content: 'Pre-existing vector entry', tags: ['pre'] },
      ]);
      expect(await mdAdapter.readCategory('learning')).toHaveLength(0);
      expect(memoryDb.getMeta('md_seeded_at')).toBeNull();

      const router = new DualStorageRouter(memoryDb, mdAdapter, makeConfig('md'));
      await router.query({ category: 'learning' });

      const mdMemories = await mdAdapter.readCategory('learning');
      expect(mdMemories.some(m => m.id === 'seed-1')).toBe(true);
      expect(memoryDb.getMeta('md_seeded_at')).not.toBeNull();
    });

    it('does not re-seed on a later command, even if markdown is empty again — the marker gates it, not data presence', async () => {
      await memoryDb.transact([
        { op: 'upsert', category: 'learning', id: 'seed-2', content: 'Another pre-existing entry' },
      ]);
      const router = new DualStorageRouter(memoryDb, mdAdapter, makeConfig('md'));

      await router.query({ category: 'learning' }); // triggers bootstrap
      expect((await mdAdapter.readCategory('learning')).some(m => m.id === 'seed-2')).toBe(true);

      // A human empties the category file after seeding — strict mirror
      // should now apply, not another bootstrap export.
      await mdAdapter.deleteEntry('learning', 'seed-2');
      expect(await mdAdapter.readCategory('learning')).toHaveLength(0);

      await router.query({ category: 'learning' });

      const dbQuery = await memoryDb.query({ category: 'learning' });
      expect(dbQuery.some(m => m.id === 'seed-2')).toBe(false);
    });

    /**
     * Ticket 31. Nothing validates `--category` against `neuron.yaml`, so a
     * store routinely holds categories the config never declares —
     * `neuron scan` writes into `architecture`, which `scan.category` defaults
     * to. Seeding only the declared categories looks harmless (the mirror never
     * visits an undeclared one) until the user declares it: the mirror then
     * finds index rows with no markdown behind them and deletes them, on data
     * the seed skipped. Making `md` the default put every upgrading user on
     * this path, so the seed takes the union of requested and stored.
     */
    it('seeds categories the config does not declare, so declaring one later does not delete its entries', async () => {
      await memoryDb.transact([
        { op: 'upsert', category: 'learning', id: 'declared-1', content: 'declared entry' },
        { op: 'upsert', category: 'architecture', id: 'undeclared-1', content: 'blueprint card from neuron scan' },
      ]);

      const config = makeConfig('md'); // declares learning/history/decisions only
      expect(config.categories.architecture).toBeUndefined();

      const router = new DualStorageRouter(memoryDb, mdAdapter, config);
      await router.query({ category: 'learning' }); // triggers bootstrap

      expect((await mdAdapter.readCategory('architecture')).some(m => m.id === 'undeclared-1')).toBe(true);

      // The user now declares the category. The mirror visits it for the first
      // time and must find markdown already backing it.
      const withArchitecture = makeConfig('md');
      withArchitecture.categories.architecture = { description: 'blueprints' };
      router.setConfig(withArchitecture);
      await router.query({ category: 'learning' });

      const stillThere = await memoryDb.query({ category: 'architecture' });
      expect(stillThere.some(m => m.id === 'undeclared-1')).toBe(true);
    });
  });

  describe('Ticket 29: markdown-first write ordering in md mode (ADR 0011 Consequence 2)', () => {
    it('writes markdown before the vector embed on upsert', async () => {
      const router = new DualStorageRouter(memoryDb, mdAdapter, makeConfig('md'));
      const mdSpy = vi.spyOn(mdAdapter, 'writeEntry');
      const vecSpy = vi.spyOn(memoryDb, 'transact');

      await router.transact([
        { op: 'upsert', category: 'learning', id: 'order-1', content: 'ordering probe' },
      ]);

      expect(mdSpy).toHaveBeenCalled();
      expect(vecSpy).toHaveBeenCalled();
      expect(mdSpy.mock.invocationCallOrder[0]).toBeLessThan(vecSpy.mock.invocationCallOrder[0]);
    });

    it('never attempts the vector write when the markdown write fails on upsert', async () => {
      const router = new DualStorageRouter(memoryDb, mdAdapter, makeConfig('md'));
      vi.spyOn(mdAdapter, 'writeEntry').mockRejectedValueOnce(new Error('disk full'));
      const vecSpy = vi.spyOn(memoryDb, 'transact');

      const results = await router.transact([
        { op: 'upsert', category: 'learning', id: 'order-2', content: 'should not embed' },
      ]);

      expect(vecSpy).not.toHaveBeenCalled();
      expect(results[0].status).toBe('error');
    });

    it('surfaces a vector write failure as an observable stderr warning rather than a bare swallowed catch, and still reports the markdown-side success', async () => {
      const router = new DualStorageRouter(memoryDb, mdAdapter, makeConfig('md'));
      vi.spyOn(memoryDb, 'transact').mockRejectedValueOnce(new Error('embedder unavailable'));
      const warnSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);

      const results = await router.transact([
        { op: 'upsert', category: 'learning', id: 'order-3', content: 'md wins even if vector fails' },
      ]);

      expect(results[0].status).toBe('created');
      const mdMemories = await mdAdapter.readCategory('learning');
      expect(mdMemories.find(m => m.id === 'order-3')).toBeDefined();
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('vector index write failed'));
      warnSpy.mockRestore();
    });
  });

  describe('Ticket 17 / ADR 0015: supersession hand-fix reconciles from markdown to the vector index', () => {
    it('a hand-edit that only adds supersededBy to the markdown frontmatter propagates to the vector index on the next command', async () => {
      const router = new DualStorageRouter(memoryDb, mdAdapter, makeConfig('md'));
      await router.transact([
        { op: 'upsert', category: 'decisions', id: 'old-ruling', content: 'the collision is a bug' },
        { op: 'upsert', category: 'decisions', id: 'new-ruling', content: 'the collision is deliberate' },
      ]);

      // Hand-fix, per ADR 0015 Decision 5: a direct one-off edit to the
      // frontmatter, bypassing the write-time gate entirely (it never ran).
      await mdAdapter.updateEntry('decisions', {
        id: 'old-ruling',
        supersededBy: 'new-ruling',
        supersededAt: '2026-08-08T00:00:00.000Z',
      });

      // Default query must now hard-exclude the hand-marked row...
      const defaultResults = await router.query({ category: 'decisions' });
      expect(defaultResults.find(m => m.id === 'old-ruling')).toBeUndefined();

      // ...but the vector index must actually have the mark, not just
      // markdown — includeSuperseded reaches through to the reconciled row.
      const withSuperseded = await router.query({ category: 'decisions', includeSuperseded: true });
      const reconciled = withSuperseded.find(m => m.id === 'old-ruling');
      expect(reconciled?.supersededBy).toBe('new-ruling');
      expect(reconciled?.supersededAt).toBe('2026-08-08T00:00:00.000Z');
    });
  });

  /**
   * `update`/`delete` in the old `dual` mode used to report only the
   * markdown side's outcome — `vecResult` was computed and never consulted,
   * unlike `upsert`, which does trust it — so a real vector-side change on a
   * drifted entry (a manual `.md` edit not yet `sync`'d) was reported as
   * `not_found`. Fixed to report success if either store changed; see
   * 'md-mode transact reports success if either store changed within a
   * single command' above for the still-live version of this scenario
   * (a write-time error, not pre-existing drift).
   *
   * The "vector-only survivor, `.md` copy already gone" variant of this test
   * does not carry over to `md` mode: `transact()` runs a strict-mirror
   * `reconcile()` before every mutation (ADR 0011), which deletes an
   * orphaned vector row the moment it sees the `.md` copy missing — so by
   * the time the mutation runs, both stores already agree the entry is
   * gone, and `not_found` is the correct answer, not a regression. `dual`
   * mode had no such reconcile step, which is what made the scenario
   * reachable there.
   */

  describe('Ticket 06: a category entering the md-reconciled set for the first time reseeds rather than deletes', () => {
    it('does not delete a category\'s pre-existing vector rows when it first resolves to md storage on an already-seeded store', async () => {
      // 1. Seed the whole-store marker via an unrelated category — 'telemetry'
      // is never mentioned yet.
      const router = new DualStorageRouter(memoryDb, mdAdapter, makeConfig('md'));
      await router.transact([
        { op: 'upsert', category: 'learning', id: 'seed-marker', content: 'seed marker' },
      ]);
      expect(memoryDb.getMeta('md_seeded_at')).not.toBeNull();

      // 2. Populate real vector rows for 'telemetry' *after* the whole-store
      // bootstrap already ran, so it is not covered by that seed.
      await memoryDb.transact([
        { op: 'upsert', category: 'telemetry', id: 'pre-existing-1', content: 'pre-existing vector row' },
      ]);
      expect((await mdAdapter.readCategory('telemetry'))).toHaveLength(0);

      // 3. Declare 'telemetry' for the first time, resolving to md. Before the
      // fix, reconcileCategoryWithPathGuard's first-sighting branch fell
      // through to the destructive mirror, which reads the never-written
      // telemetry.md as empty and deletes every vector row as "absent from
      // markdown."
      const nextConfig = makeConfig('md');
      nextConfig.categories = { ...nextConfig.categories, telemetry: {} };
      router.setConfig(nextConfig);
      await router.query({ category: 'telemetry' });

      const survivors = await memoryDb.query({ category: 'telemetry' });
      expect(survivors.some(m => m.id === 'pre-existing-1')).toBe(true);
      expect((await mdAdapter.readCategory('telemetry')).some(m => m.id === 'pre-existing-1')).toBe(true);
    });
  });

  describe('Ticket 06: stale-file warning when a category flips from md to vector storage', () => {
    it('warns once on stderr when a category already holding real markdown entries flips to vector storage', async () => {
      const router = new DualStorageRouter(memoryDb, mdAdapter, makeConfig('md'));
      await router.transact([
        { op: 'upsert', category: 'learning', id: 'about-to-go-stale', content: 'will become stale' },
      ]);
      expect((await mdAdapter.readCategory('learning')).some(m => m.id === 'about-to-go-stale')).toBe(true);

      const overrideConfig = makeConfig('md');
      overrideConfig.categories = { ...overrideConfig.categories, learning: { storage: 'vector' } };
      router.setConfig(overrideConfig);

      const warnSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
      await router.query({ category: 'learning' });
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('now resolves to "vector"'));
      warnSpy.mockRestore();
    });

    it('does not warn for a category with no pre-existing markdown content, and warns at most once per router instance', async () => {
      const router = new DualStorageRouter(memoryDb, mdAdapter, makeConfig('vector'));
      const warnSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);

      await router.transact([{ op: 'upsert', category: 'learning', id: 'fresh-1', content: 'fresh' }]);
      expect(warnSpy).not.toHaveBeenCalledWith(expect.stringContaining('now resolves to "vector"'));

      // A later query, even after the vector-mode category accumulates rows,
      // must not start warning — there was never real markdown to go stale.
      await router.query({ category: 'learning' });
      expect(warnSpy).not.toHaveBeenCalledWith(expect.stringContaining('now resolves to "vector"'));
      warnSpy.mockRestore();
    });
  });
});
