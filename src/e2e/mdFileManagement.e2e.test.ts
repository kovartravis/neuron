import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { NeuronMemory } from '../index.js';
import { MdStorageAdapter } from '../storage/mdStorageAdapter.js';
import { DualStorageRouter } from '../storage/dualStorageRouter.js';
import { syncMdWithVector, cleanTmpFiles } from '../storage/mdVectorSync.js';
import { NeuronConfig, DEFAULT_CONFIG } from '../config/neuronYaml.js';
import { scaffoldNeuronDirectory, handleSyncCommand } from '../commands/sync.js';

describe('Tier 4: Real-World E2E Scenarios (mdFileManagement)', () => {
  let devADir: string;
  let devBDir: string;

  beforeEach(() => {
    devADir = fs.mkdtempSync(path.join(os.tmpdir(), 'neuron-e2e-devA-'));
    devBDir = fs.mkdtempSync(path.join(os.tmpdir(), 'neuron-e2e-devB-'));

    process.env.NEURON_MOCK_EMBEDDER = 'true';
  });

  afterEach(() => {
    delete process.env.NEURON_MOCK_EMBEDDER;
    delete process.env.NEURON_DB_PATH;

    if (fs.existsSync(devADir)) fs.rmSync(devADir, { recursive: true, force: true });
    if (fs.existsSync(devBDir)) fs.rmSync(devBDir, { recursive: true, force: true });
  });

  // T4-01: Developer Git collaboration workflow (commit md files, pull & sync)
  it('T4-01: Developer Git collaboration workflow (commit md files, pull & sync)', async () => {
    const configA: NeuronConfig = {
      ...DEFAULT_CONFIG,
      storage: { mode: 'md', path: '.neuron' },
      categories: { learning: { description: 'Learnings' } },
    };

    // --- Developer A Workspace ---
    const dbPathA = path.join(devADir, 'devA.sqlite');
    const mdStoragePathA = path.join(devADir, '.neuron');

    process.env.NEURON_DB_PATH = dbPathA;
    const dbA = new NeuronMemory({
      dbPath: dbPathA,
      projectRoot: devADir,
      projectName: 'collab-project',
      embedder: { embed: async () => new Float32Array(384), embedQuery: async () => new Float32Array(384) },
      // The router's vector collaborator, matching what production passes it
      // (a vector-only delegate). Without pinning, the schema default `md`
      // (ticket 31) puts a second markdown writer on the same directory.
      storageMode: 'vector',
    });
    const adapterA = new MdStorageAdapter({ storagePath: mdStoragePathA });
    const routerA = new DualStorageRouter(dbA, adapterA, configA);

    // Developer A creates a new learning record in dual mode
    await routerA.transact([
      {
        op: 'upsert',
        category: 'learning',
        id: 'git-commit-mem-1',
        content: 'Developer A shared convention: Always run linter before PR',
        tags: ['git', 'convention', 'pr'],
        importance: 5,
      },
    ]);

    // Developer A's .neuron/learning.md exists on disk
    const devALearningMd = path.join(mdStoragePathA, 'learning.md');
    expect(fs.existsSync(devALearningMd)).toBe(true);
    const mdContentA = fs.readFileSync(devALearningMd, 'utf8');

    dbA.close();

    // --- Developer B Workspace (simulating Git pull) ---
    const dbPathB = path.join(devBDir, 'devB.sqlite');
    const mdStoragePathB = path.join(devBDir, '.neuron');
    fs.mkdirSync(mdStoragePathB, { recursive: true });

    // Copy Developer A's .neuron directory to Developer B (git pull simulation)
    fs.writeFileSync(path.join(mdStoragePathB, 'learning.md'), mdContentA, 'utf8');

    process.env.NEURON_DB_PATH = dbPathB;
    const dbB = new NeuronMemory({
      dbPath: dbPathB,
      projectRoot: devBDir,
      projectName: 'collab-project',
      embedder: { embed: async () => new Float32Array(384), embedQuery: async () => new Float32Array(384) },
      // The router's vector collaborator, matching what production passes it
      // (a vector-only delegate). Without pinning, the schema default `md`
      // (ticket 31) puts a second markdown writer on the same directory.
      storageMode: 'vector',
    });
    const adapterB = new MdStorageAdapter({ storagePath: mdStoragePathB });

    // Developer B's local DB starts empty before sync
    const beforeSyncB = await dbB.query({ categories: ['learning'] });
    expect(beforeSyncB).toHaveLength(0);

    // Developer B runs `neuron sync`
    const syncResB = await syncMdWithVector(dbB, adapterB, configA);
    expect(syncResB.syncedToVector).toBe(1);

    // Developer B can now search and retrieve Developer A's learning
    const afterSyncB = await dbB.query({ text: 'linter before PR', categories: ['learning'] });
    expect(afterSyncB).toHaveLength(1);
    expect(afterSyncB[0].id).toBe('git-commit-mem-1');
    expect(afterSyncB[0].content).toContain('Always run linter before PR');

    dbB.close();
  });

  // T4-02: Offline knowledge base editing & CLI resynchronization
  it('T4-02: Offline knowledge base editing & CLI resynchronization', async () => {
    const config: NeuronConfig = {
      ...DEFAULT_CONFIG,
      storage: { mode: 'md', path: '.neuron' },
      categories: { decisions: { description: 'Architectural Decisions' } },
    };

    const dbPath = path.join(devADir, 'offline.sqlite');
    const mdStoragePath = path.join(devADir, '.neuron');

    process.env.NEURON_DB_PATH = dbPath;
    const db = new NeuronMemory({
      dbPath,
      projectRoot: devADir,
      projectName: 'offline-project',
      embedder: { embed: async () => new Float32Array(384), embedQuery: async () => new Float32Array(384) },
      // The router's vector collaborator, matching what production passes it
      // (a vector-only delegate). Without pinning, the schema default `md`
      // (ticket 31) puts a second markdown writer on the same directory.
      storageMode: 'vector',
    });
    const adapter = new MdStorageAdapter({ storagePath: mdStoragePath });

    // Initialize decisions category file
    await adapter.ensureScaffolded(['decisions']);

    // User manually appends ADRs to .neuron/decisions.md while offline in text editor
    const offlineDecisionsMd = adapter.getFilePath('decisions');
    const manualAdrContent = `# Category: decisions

---
id: adr-001
createdAt: ${new Date().toISOString()}
importance: 5
tags:
  - adr
  - storage
scope: project
---
## ADR 001: Use Dual Storage for Markdown Parity

We chose dual storage mode to ensure git-tracked markdown files stay in sync with local SQLite embeddings.
`;
    fs.writeFileSync(offlineDecisionsMd, manualAdrContent, 'utf8');

    // Run sync to update vector database with offline edit
    const syncResult = await syncMdWithVector(db, adapter, config);
    expect(syncResult.syncedToVector).toBe(1);

    // Query vector DB to verify offline decision is indexed
    const queryResults = await db.query({ text: 'Dual Storage Parity', categories: ['decisions'] });
    expect(queryResults).toHaveLength(1);
    expect(queryResults[0].id).toBe('adr-001');
    expect(queryResults[0].importance).toBe(5);

    db.close();
  });

  // T4-03: Storage backend migration (vector to md mode backfill)
  it('T4-03: Storage backend migration (vector to md mode backfill)', async () => {
    const dbPath = path.join(devADir, 'migration.sqlite');
    const mdStoragePath = path.join(devADir, '.neuron');

    process.env.NEURON_DB_PATH = dbPath;
    const db = new NeuronMemory({
      dbPath,
      projectRoot: devADir,
      projectName: 'migration-project',
      embedder: { embed: async () => new Float32Array(384), embedQuery: async () => new Float32Array(384) },
      // The router's vector collaborator, matching what production passes it
      // (a vector-only delegate). Without pinning, the schema default `md`
      // (ticket 31) puts a second markdown writer on the same directory.
      storageMode: 'vector',
    });

    // 1. Project operates initially in vector mode
    await db.transact([
      { op: 'upsert', category: 'learning', id: 'mig-1', content: 'Pre-migration learning 1', tags: ['v1'] },
      { op: 'upsert', category: 'history', id: 'mig-2', content: 'Pre-migration history 2', tags: ['v1'] },
    ]);

    // Verify markdown storage path has no files yet
    expect(fs.existsSync(mdStoragePath)).toBe(false);

    // 2. Developer upgrades config to dual mode
    const dualConfig: NeuronConfig = {
      ...DEFAULT_CONFIG,
      storage: { mode: 'md', path: mdStoragePath },
      categories: {
        learning: { description: 'Learnings' },
        history: { description: 'History' },
      },
    };

    const adapter = new MdStorageAdapter({ storagePath: mdStoragePath });

    // 3. User runs sync to execute backfill migration
    const syncRes = await syncMdWithVector(db, adapter, dualConfig);
    expect(syncRes.syncedToMarkdown).toBe(2);

    // 4. Verify markdown files exist and contain pre-existing entries
    const mdLearnings = await adapter.readCategory('learning');
    const mdHistory = await adapter.readCategory('history');
    expect(mdLearnings.some(m => m.id === 'mig-1')).toBe(true);
    expect(mdHistory.some(m => m.id === 'mig-2')).toBe(true);

    // 5. Subsequent router calls write to both backends
    const router = new DualStorageRouter(db, adapter, dualConfig);
    await router.transact([
      { op: 'upsert', category: 'learning', id: 'mig-3', content: 'Post-migration dual write 3', tags: ['dual'] },
    ]);

    const postMdLearnings = await adapter.readCategory('learning');
    expect(postMdLearnings.some(m => m.id === 'mig-3')).toBe(true);

    db.close();
  });

  // T4-04: Interrupted operation & power failure recovery
  it('T4-04: Interrupted operation & power failure recovery', async () => {
    const dbPath = path.join(devADir, 'recovery.sqlite');
    const mdStoragePath = path.join(devADir, '.neuron');

    process.env.NEURON_DB_PATH = dbPath;
    const db = new NeuronMemory({
      dbPath,
      projectRoot: devADir,
      projectName: 'recovery-project',
      embedder: { embed: async () => new Float32Array(384), embedQuery: async () => new Float32Array(384) },
      // The router's vector collaborator, matching what production passes it
      // (a vector-only delegate). Without pinning, the schema default `md`
      // (ticket 31) puts a second markdown writer on the same directory.
      storageMode: 'vector',
    });
    const adapter = new MdStorageAdapter({ storagePath: mdStoragePath });

    const config: NeuronConfig = {
      ...DEFAULT_CONFIG,
      storage: { mode: 'md', path: mdStoragePath },
    };

    // Pre-populate valid state
    await adapter.writeEntry('learning', {
      id: 'rec-valid-1',
      content: 'Pre-crash valid entry',
      tags: ['stable'],
      importance: 3,
      createdAt: new Date().toISOString(),
    });

    // Simulate power failure / abort leaving an orphaned .tmp file
    const targetFile = adapter.getFilePath('learning');
    const orphanTmp = `${targetFile}.tmp.${Date.now()}_crash`;
    fs.writeFileSync(orphanTmp, 'corrupted un-renamed tmp content', 'utf8');

    expect(fs.existsSync(orphanTmp)).toBe(true);

    // Clean tmp files
    cleanTmpFiles(mdStoragePath);
    expect(fs.existsSync(orphanTmp)).toBe(false);

    // Upon process restart, sync engine cleans tmp files and recovers parity
    const syncRes = await syncMdWithVector(db, adapter, config);
    expect(syncRes.errors).toHaveLength(0);

    // Verify valid original data remained uncorrupted
    const recovered = await adapter.readCategory('learning');
    expect(recovered).toHaveLength(1);
    expect(recovered[0].id).toBe('rec-valid-1');

    db.close();
  });

  // T4-05: Fresh repository onboarding (init -> dual write -> sync -> search)
  it('T4-05: Fresh repository onboarding (init -> dual write -> sync -> search)', async () => {
    const dbPath = path.join(devADir, 'onboard.sqlite');
    const mdStoragePath = path.join(devADir, '.neuron');

    process.env.NEURON_DB_PATH = dbPath;
    const db = new NeuronMemory({
      dbPath,
      projectRoot: devADir,
      projectName: 'onboarding-repo',
      embedder: { embed: async () => new Float32Array(384), embedQuery: async () => new Float32Array(384) },
      // The router's vector collaborator, matching what production passes it
      // (a vector-only delegate). Without pinning, the schema default `md`
      // (ticket 31) puts a second markdown writer on the same directory.
      storageMode: 'vector',
    });

    const config: NeuronConfig = {
      ...DEFAULT_CONFIG,
      storage: { mode: 'md', path: mdStoragePath },
      categories: {
        learning: { description: 'Learnings' },
        history: { description: 'History' },
        decisions: { description: 'Decisions' },
      },
    };

    // Step 1: Fresh repository onboarding via scaffoldNeuronDirectory
    const scaffoldedFiles = scaffoldNeuronDirectory(devADir, config);
    expect(scaffoldedFiles.length).toBeGreaterThanOrEqual(3);

    // Step 2: DualStorageRouter writes initial entries
    const adapter = new MdStorageAdapter({ storagePath: mdStoragePath });
    const router = new DualStorageRouter(db, adapter, config);

    await router.transact([
      { op: 'upsert', category: 'learning', id: 'onboard-1', content: 'Onboarding rule: Always format code', tags: ['onboarding'] },
      { op: 'upsert', category: 'decisions', id: 'onboard-2', content: 'Onboarding decision: Use Vitest runner', tags: ['test'] },
    ]);

    // Step 3: Manual modification to one markdown entry
    await adapter.updateEntry('learning', {
      id: 'onboard-1',
      content: 'Onboarding rule: Always format code and run typecheck',
      importance: 5,
    });

    // Step 4: A manual .md edit changes content without touching createdAt,
    // which is now indistinguishable from the vector side having drifted
    // stale on its own — there is no reliable signal for "which side was
    // actually edited". sync must not guess (guessing here previously
    // caused a real content-loss regression), so this is reported as a
    // conflict and left untouched on both a dry run and a real run.
    const dryRunResult = await syncMdWithVector(db, adapter, config, { dryRun: true });
    expect(dryRunResult.syncedToVector).toBe(0);
    expect(dryRunResult.conflicts).toEqual([{ category: 'learning', id: 'onboard-1' }]);

    const unforcedResult = await syncMdWithVector(db, adapter, config);
    expect(unforcedResult.syncedToVector).toBe(0);
    expect(unforcedResult.conflicts).toHaveLength(1);

    // The manual edit only takes effect once the caller explicitly says
    // markdown should win — this is the new required step after hand-editing
    // a .md file, where previously a bare `neuron sync` was documented as
    // sufficient. --force re-embeds every entry present on both sides
    // regardless of hash match (its pre-existing, documented "ignore content
    // hashes" behaviour, unchanged here) — both onboard-1 (the real change)
    // and onboard-2 (already identical on both sides) get re-pushed.
    const actualSyncResult = await syncMdWithVector(db, adapter, config, { force: true });
    expect(actualSyncResult.syncedToVector).toBe(2);
    expect(actualSyncResult.conflicts).toHaveLength(0);

    // Step 5: Execute vector query across all onboarded categories
    const searchResults = await db.query({ text: 'typecheck', categories: ['learning'] });
    expect(searchResults).toHaveLength(1);
    expect(searchResults[0].id).toBe('onboard-1');
    expect(searchResults[0].content).toContain('run typecheck');
    expect(searchResults[0].importance).toBe(5);

    db.close();
  });
});
