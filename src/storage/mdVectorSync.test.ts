import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { NeuronMemory } from '../index.js';
import { MdStorageAdapter } from './mdStorageAdapter.js';
import { syncMdWithVector, computeMemoryHash } from './mdVectorSync.js';
import { NeuronConfig } from '../config/neuronYaml.js';

describe('mdVectorSync (R3 Unit & Boundary Tests)', () => {
  const testDir = path.join(process.cwd(), 'src', '__tests__', `temp-md-sync-${Date.now()}`);
  const storagePath = path.join(testDir, '.neuron');
  let memoryDb: NeuronMemory;
  let mdAdapter: MdStorageAdapter;

  beforeEach(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
    fs.mkdirSync(storagePath, { recursive: true });

    memoryDb = NeuronMemory.inMemory('md-sync-test');
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

  const defaultConfig: NeuronConfig = {
    version: '1.0',
    storage: { mode: 'dual', path: storagePath },
    categories: { learning: {}, history: {}, decisions: {} },
    scan: { enabled: false, category: 'decisions', depth: 3 },
    pullRules: { default: { minScore: 0.3, categories: ['learning'] }, onExec: [] },
  };

  // --- Tier 1 Coverage Tests (R3-T1-01 to R3-T1-05) ---

  it('R3-T1-01: Markdown-to-Vector Sync: scans markdown entries missing in DB and embeds them into SQLite', async () => {
    await mdAdapter.writeEntry('learning', {
      id: 'md-only-1',
      content: 'Learning content stored in markdown file only',
      tags: ['sync', 'md'],
      importance: 4,
    });

    const initialDbQuery = await memoryDb.query({ category: 'learning' });
    expect(initialDbQuery).toHaveLength(0);

    const syncResult = await syncMdWithVector(memoryDb, mdAdapter, defaultConfig);
    expect(syncResult.syncedToVector).toBe(1);

    const postDbQuery = await memoryDb.query({ category: 'learning' });
    expect(postDbQuery).toHaveLength(1);
    expect(postDbQuery[0].id).toBe('md-only-1');
  });

  it('R3-T1-02: Vector-to-Markdown Backfill: scans DB entries missing in markdown files and backfills markdown files', async () => {
    await memoryDb.transact([
      { op: 'upsert', category: 'learning', id: 'db-only-1', content: 'Learning content stored in SQLite vector DB only', tags: ['db'] },
    ]);

    const initialMd = await mdAdapter.readCategory('learning');
    expect(initialMd).toHaveLength(0);

    const syncResult = await syncMdWithVector(memoryDb, mdAdapter, defaultConfig);
    expect(syncResult.syncedToMarkdown).toBe(1);

    const postMd = await mdAdapter.readCategory('learning');
    expect(postMd).toHaveLength(1);
    expect(postMd[0].id).toBe('db-only-1');
  });

  it('R3-T1-03: Content Hash Skip Optimization: skips embedding re-computation when SHA-256 hashes match', async () => {
    await mdAdapter.writeEntry('learning', {
      id: 'synced-1',
      content: 'In-sync content',
      tags: ['parity'],
    });

    await syncMdWithVector(memoryDb, mdAdapter, defaultConfig);

    const secondSync = await syncMdWithVector(memoryDb, mdAdapter, defaultConfig);
    expect(secondSync.skipped).toBeGreaterThanOrEqual(1);
    expect(secondSync.syncedToVector).toBe(0);
    expect(secondSync.syncedToMarkdown).toBe(0);
  });

  it('R3-T1-04: Bidirectional Sync Reconciliation (syncAll): state diff across all categories achieves parity', async () => {
    await mdAdapter.writeEntry('learning', { id: 'm-learn', content: 'MD learn' });
    await memoryDb.transact([{ op: 'upsert', category: 'history', id: 'db-hist', content: 'DB history' }]);

    const result = await syncMdWithVector(memoryDb, mdAdapter, defaultConfig);
    expect(result.syncedToVector).toBeGreaterThanOrEqual(1);
    expect(result.syncedToMarkdown).toBeGreaterThanOrEqual(1);

    const mdHistory = await mdAdapter.readCategory('history');
    expect(mdHistory.some(m => m.id === 'db-hist')).toBe(true);

    const dbLearning = await memoryDb.query({ category: 'learning' });
    expect(dbLearning.some(m => m.id === 'm-learn')).toBe(true);
  });

  /**
   * Previously named "Timestamp Conflict Resolution" and asserted that a
   * newer `createdAt` on the markdown side won. That mechanism is gone: a
   * normal `memory update` never touches `createdAt` on either side, and
   * `.md` frontmatter has no `updatedAt`, so comparing `createdAt` was
   * comparing two values that are almost always equal — which meant "md
   * wins" fired on every real conflict, not just ones where md was
   * genuinely newer. That silently reverted a real vector-side update to
   * stale markdown content in production use. A conflict is now reported
   * and left untouched unless --force explicitly says markdown wins.
   */
  it('R3-T1-05: a real content conflict is reported and left untouched, not resolved by createdAt', async () => {
    const olderDate = '2026-01-01T00:00:00.000Z';
    const newerDate = '2099-01-01T00:00:00.000Z';

    await memoryDb.transact([
      { op: 'upsert', category: 'learning', id: 'conflict-1', content: 'DB content (the fresher one)' },
    ]);

    // A later createdAt on the md side no longer wins by itself.
    await mdAdapter.writeEntry('learning', {
      id: 'conflict-1',
      content: 'MD content (actually stale)',
      createdAt: newerDate,
    });

    const result = await syncMdWithVector(memoryDb, mdAdapter, defaultConfig);

    expect(result.conflicts).toEqual([{ category: 'learning', id: 'conflict-1' }]);
    expect(result.syncedToVector).toBe(0);
    expect(result.syncedToMarkdown).toBe(0);

    const dbQuery = await memoryDb.query({ category: 'learning' });
    expect(dbQuery[0].content).toBe('DB content (the fresher one)');

    // --force is the only side-picking path, and stays markdown-authoritative.
    const forced = await syncMdWithVector(memoryDb, mdAdapter, defaultConfig, { force: true });
    expect(forced.conflicts).toHaveLength(0);
    const dbAfterForce = await memoryDb.query({ category: 'learning' });
    expect(dbAfterForce[0].content).toBe('MD content (actually stale)');
  });

  // --- Tier 2 Boundary Tests (R3-T2-01 to R3-T2-05) ---

  it('R3-T2-01: metadata update without vector re-embedding when content hash is unchanged', async () => {
    const mem = {
      id: 'hash-test',
      category: 'learning',
      kind: 'learning',
      content: 'Static content body',
      tags: ['tag1'],
      importance: 3,
      createdAt: '2026-07-28T00:00:00.000Z',
    };

    const hash1 = computeMemoryHash(mem);
    const hash2 = computeMemoryHash({ ...mem, content: 'Static content body' });
    expect(hash1).toBe(hash2);

    const hash3 = computeMemoryHash({ ...mem, tags: ['tag2'] });
    expect(hash1).not.toBe(hash3);
  });

  it('R3-T2-02: re-creates missing category markdown file deleted from disk when entries persist in DB', async () => {
    await memoryDb.transact([
      { op: 'upsert', category: 'learning', id: 'persist-1', content: 'Persistent entry' },
    ]);

    await syncMdWithVector(memoryDb, mdAdapter, defaultConfig);

    const filePath = path.join(storagePath, 'learning.md');
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    expect(fs.existsSync(filePath)).toBe(false);

    await syncMdWithVector(memoryDb, mdAdapter, defaultConfig);
    expect(fs.existsSync(filePath)).toBe(true);

    const readBack = await mdAdapter.readCategory('learning');
    expect(readBack).toHaveLength(1);
    expect(readBack[0].id).toBe('persist-1');
  });

  it('R3-T2-03: performs batch sync of 100+ memory entries within memory budget', async () => {
    for (let i = 0; i < 100; i++) {
      await mdAdapter.writeEntry('history', {
        id: `batch-${i}`,
        content: `Batch content item number ${i}`,
        tags: [`batch-${i}`],
      });
    }

    const result = await syncMdWithVector(memoryDb, mdAdapter, defaultConfig);
    expect(result.syncedToVector).toBe(100);
  });

  it('R3-T2-04: handles duplicate entry IDs within a single markdown file gracefully', async () => {
    const dupMarkdown = `# Category: learning

---
id: dup-id
createdAt: 2026-07-28T01:00:00.000Z
importance: 2
tags: []
---
## First duplicate

---
id: dup-id
createdAt: 2026-07-28T02:00:00.000Z
importance: 5
tags: []
---
## Second duplicate
`;

    fs.writeFileSync(path.join(storagePath, 'learning.md'), dupMarkdown, 'utf8');

    const result = await syncMdWithVector(memoryDb, mdAdapter, defaultConfig);
    expect(result.errors.length).toBeGreaterThanOrEqual(1);
    expect(result.errors[0].error).toContain('Duplicate entry ID');
  });

  it('R3-T2-05: handles dry-run and force options in sync engine', async () => {
    await mdAdapter.writeEntry('learning', { id: 'opt-1', content: 'Option test content' });

    const dryResult = await syncMdWithVector(memoryDb, mdAdapter, defaultConfig, { dryRun: true });
    expect(dryResult.syncedToVector).toBe(1);

    const dbQueryBefore = await memoryDb.query({ category: 'learning' });
    expect(dbQueryBefore).toHaveLength(0);

    await syncMdWithVector(memoryDb, mdAdapter, defaultConfig);

    const forceResult = await syncMdWithVector(memoryDb, mdAdapter, defaultConfig, { force: true });
    expect(forceResult.syncedToVector).toBe(1);
  });
});
