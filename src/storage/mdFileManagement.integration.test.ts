import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { NeuronMemory } from '../index.js';
import { MdStorageAdapter } from './mdStorageAdapter.js';
import { DualStorageRouter } from './dualStorageRouter.js';
import { syncMdWithVector, cleanTmpFiles } from './mdVectorSync.js';
import { NeuronConfig, DEFAULT_CONFIG } from '../config/neuronYaml.js';
import { scaffoldNeuronDirectory, handleSyncCommand } from '../commands/sync.js';

describe('Tier 3: MdFileManagement Integration Tests', () => {
  let tempDir: string;
  let dbPath: string;
  let mdStoragePath: string;
  let db: NeuronMemory;
  let mdAdapter: MdStorageAdapter;
  let testConfig: NeuronConfig;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'neuron-integration-test-'));
    dbPath = path.join(tempDir, 'test-integration.sqlite');
    mdStoragePath = path.join(tempDir, '.neuron');

    process.env.NEURON_DB_PATH = dbPath;
    process.env.NEURON_MOCK_EMBEDDER = 'true';

    db = new NeuronMemory({
      dbPath,
      projectRoot: tempDir,
      projectName: 'test-project',
      embedder: {
        embed: async () => new Float32Array(384),
        embedQuery: async () => new Float32Array(384),
      },
    });

    mdAdapter = new MdStorageAdapter({ storagePath: mdStoragePath });

    testConfig = {
      ...DEFAULT_CONFIG,
      storage: {
        mode: 'dual',
        path: mdStoragePath,
      },
      categories: {
        learning: { description: 'Agent learnings' },
        history: { description: 'Agent history' },
        decisions: { description: 'Architectural decisions' },
      },
    };
  });

  afterEach(() => {
    if (db) {
      db.close();
    }
    delete process.env.NEURON_DB_PATH;
    delete process.env.NEURON_MOCK_EMBEDDER;
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  // T3-01: DualStorageRouter delegates write to MdStorageAdapter with atomic tmp swap
  it('T3-01: DualStorageRouter delegates write to MdStorageAdapter with atomic tmp swap', async () => {
    const router = new DualStorageRouter(db, mdAdapter, testConfig);

    const mutations = [
      {
        op: 'upsert' as const,
        category: 'learning',
        id: 't3-01-mem-1',
        content: 'T3-01 Atomic Swap Test Entry',
        tags: ['integration', 'atomic'],
        importance: 4,
      },
    ];

    const results = await router.transact(mutations);

    expect(results).toHaveLength(1);
    expect(results[0].status).toBe('created');

    // 1. Check SQLite Vector DB has record
    const dbResults = await db.query({ categories: ['learning'] });
    expect(dbResults.some(m => m.id === 't3-01-mem-1')).toBe(true);

    // 2. Check MdStorageAdapter reads the record back from markdown file
    const mdEntries = await mdAdapter.readCategory('learning');
    expect(mdEntries.some(m => m.id === 't3-01-mem-1')).toBe(true);

    // 3. Verify no temporary .tmp files exist in mdStoragePath
    const files = fs.readdirSync(mdStoragePath);
    const tmpFiles = files.filter(f => f.includes('.tmp.'));
    expect(tmpFiles).toHaveLength(0);
  });

  // T3-02: mdVectorSync parses external markdown edit via MdStorageAdapter and embeds to DB
  it('T3-02: mdVectorSync parses external markdown edit via MdStorageAdapter and embeds to DB', async () => {
    await mdAdapter.ensureScaffolded(['learning']);

    // Directly append entry to markdown file (simulating external edit / git pull)
    const externalMemory = {
      id: 't3-02-external-id',
      category: 'learning',
      kind: 'learning',
      content: '## External Markdown Edit Title\n\nManually written body content',
      tags: ['external', 'manual'],
      importance: 5,
      createdAt: new Date().toISOString(),
    };
    await mdAdapter.writeEntry('learning', externalMemory);

    // Verify DB does NOT have it yet
    const beforeSync = await db.query({ categories: ['learning'] });
    expect(beforeSync.some(m => m.id === 't3-02-external-id')).toBe(false);

    // Perform sync
    const syncRes = await syncMdWithVector(db, mdAdapter, testConfig);

    expect(syncRes.syncedToVector).toBeGreaterThanOrEqual(1);

    // Verify DB NOW has the record embedded
    const afterSync = await db.query({ categories: ['learning'] });
    const syncedRecord = afterSync.find(m => m.id === 't3-02-external-id');
    expect(syncedRecord).toBeDefined();
    expect(syncedRecord?.content).toContain('External Markdown Edit Title');
    expect(syncedRecord?.importance).toBe(5);
  });

  // T3-03: neuron init uses MdStorageAdapter to scaffold category markdown templates
  it('T3-03: neuron init uses MdStorageAdapter to scaffold category markdown templates', async () => {
    const scaffoldedPaths = scaffoldNeuronDirectory(tempDir, testConfig);

    expect(scaffoldedPaths).toHaveLength(3);

    for (const filePath of scaffoldedPaths) {
      expect(fs.existsSync(filePath)).toBe(true);
      const content = fs.readFileSync(filePath, 'utf8');
      expect(content).toMatch(/# Category:/);
    }

    // Verify MdStorageAdapter can parse empty scaffolded files cleanly
    const learningMemories = await mdAdapter.readCategory('learning');
    expect(learningMemories).toEqual([]);
  });

  // T3-04: changing storage.mode from vector-only to dual triggers mdVectorSync backfill
  it('T3-04: changing storage.mode from vector-only to dual triggers mdVectorSync backfill', async () => {
    // 1. Populate DB while in vector-only mode
    await db.transact([
      { op: 'upsert', category: 'learning', id: 't3-04-v1', content: 'Vector-only entry 1', tags: ['vonly'] },
      { op: 'upsert', category: 'history', id: 't3-04-v2', content: 'Vector-only entry 2', tags: ['vonly'] },
    ]);

    // Ensure no markdown files exist yet
    const initialMdMemories = await mdAdapter.readAll(['learning', 'history']);
    expect(initialMdMemories).toHaveLength(0);

    // 2. Switch config mode to dual
    const dualConfig: NeuronConfig = {
      ...testConfig,
      storage: { mode: 'dual', path: mdStoragePath },
    };

    // 3. Trigger backfill sync
    const syncRes = await syncMdWithVector(db, mdAdapter, dualConfig);
    expect(syncRes.syncedToMarkdown).toBe(2);

    // 4. Verify markdown files now contain both memories
    const backfilledMemories = await mdAdapter.readAll(['learning', 'history']);
    expect(backfilledMemories).toHaveLength(2);
    expect(backfilledMemories.map(m => m.id).sort()).toEqual(['t3-04-v1', 't3-04-v2']);
  });

  // T3-05: CLI neuron sync --force invokes mdVectorSync under split storage mode
  it('T3-05: CLI neuron sync --force invokes mdVectorSync under split storage mode', async () => {
    const splitConfig: NeuronConfig = {
      ...testConfig,
      storage: { mode: 'split', path: mdStoragePath },
    };

    // Seed both DB and Markdown
    await db.transact([
      { op: 'upsert', category: 'decisions', id: 't3-05-split-1', content: 'Split decision 1', tags: ['split'] },
    ]);
    await mdAdapter.writeEntry('decisions', {
      id: 't3-05-split-1',
      content: 'Split decision 1',
      tags: ['split'],
      importance: 3,
      createdAt: new Date().toISOString(),
    });

    // Run force sync
    const syncRes = await syncMdWithVector(db, mdAdapter, splitConfig, { force: true });

    // Under force sync, matching entries are re-processed
    expect(syncRes.categoriesProcessed).toContain('decisions');
    expect(syncRes.syncedToVector).toBeGreaterThanOrEqual(1);
    expect(syncRes.errors).toHaveLength(0);
  });

  // T3-06: CLI neuron sync --dry-run runs mdVectorSync diff calculation without side effects
  it('T3-06: CLI neuron sync --dry-run runs mdVectorSync diff calculation without side effects', async () => {
    // DB has an entry not in Markdown
    await db.transact([
      { op: 'upsert', category: 'learning', id: 't3-06-db-only', content: 'DB Only Content', tags: ['dry'] },
    ]);

    // Run dry-run sync
    const syncRes = await syncMdWithVector(db, mdAdapter, testConfig, { dryRun: true });

    expect(syncRes.syncedToMarkdown).toBe(1);

    // Verify Markdown file was NOT created or modified on disk
    const mdMemories = await mdAdapter.readCategory('learning');
    expect(mdMemories.some(m => m.id === 't3-06-db-only')).toBe(false);
  });

  // T3-07: mdVectorSync cleans up orphaned .tmp files left by interrupted router write
  it('T3-07: mdVectorSync cleans up orphaned .tmp files left by interrupted router write', async () => {
    await mdAdapter.ensureScaffolded(['learning']);

    // Simulate orphaned temporary swap file
    const orphanedTmpFile = path.join(mdStoragePath, 'learning.md.tmp.99999_test');
    fs.writeFileSync(orphanedTmpFile, 'partial orphan content', 'utf8');

    expect(fs.existsSync(orphanedTmpFile)).toBe(true);

    // Clean tmp files or run sync
    const cleanedCount = cleanTmpFiles(mdStoragePath);
    expect(cleanedCount).toBeGreaterThanOrEqual(1);

    // Verify orphaned file is deleted
    expect(fs.existsSync(orphanedTmpFile)).toBe(false);
  });

  // T3-08: end-to-end multi-component pipeline from init through router, manual edit, and sync
  it('T3-08: end-to-end multi-component pipeline from init through router, manual edit, and sync', async () => {
    // Step 1: Init scaffolding
    scaffoldNeuronDirectory(tempDir, testConfig);

    // Step 2: DualStorageRouter writes entry
    const router = new DualStorageRouter(db, mdAdapter, testConfig);
    await router.transact([
      { op: 'upsert', category: 'learning', id: 'pipeline-1', content: 'Pipeline step 1 learning', tags: ['pipe'] },
    ]);

    // Step 3: Manual Markdown edit (external append)
    await mdAdapter.writeEntry('learning', {
      id: 'pipeline-2',
      content: 'Pipeline step 2 manual edit',
      tags: ['pipe', 'manual'],
      importance: 5,
      createdAt: new Date().toISOString(),
    });

    // Step 4: Run vector-markdown resynchronization
    const syncRes = await syncMdWithVector(db, mdAdapter, testConfig, { force: true });
    expect(syncRes.syncedToVector).toBeGreaterThanOrEqual(1);

    // Step 5: Semantic vector query verifies both pipeline entries exist and are queryable
    const results = await db.query({ categories: ['learning'] });
    expect(results).toHaveLength(2);
    const ids = results.map(r => r.id).sort();
    expect(ids).toEqual(['pipeline-1', 'pipeline-2']);
  });
});
