/**
 * Pillar 8 — Multi-Process Contention & Crash Recovery.
 *
 * Spawns real OS processes against one SQLite file. The original concurrency
 * pillar ran `Promise.all` over a single in-process NeuronMemory handle, which
 * shares one connection and one WAL writer — it can never produce cross-process
 * lock contention, torn writes, or a dirty WAL, so "0 failures" there said
 * nothing about multi-agent safety.
 *
 * Checks, in order of severity:
 *   1. lost writes    — every committed record must be readable afterwards
 *   2. lock handling  — SQLITE_BUSY is acceptable if surfaced, not if it eats data
 *   3. crash recovery — SIGKILL mid-write must leave a readable, uncorrupted store
 */
process.env.NODE_ENV = 'production';
delete process.env.NEURON_MOCK_EMBEDDER;

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawn } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { NeuronMemory } from '../../src/index.js';
import { MetricsRecorder } from './metrics.js';
import { CONFIG, TIER, REPORT_DIR } from './tier.js';

const PILLAR = 'Pillar 8: Multi-Process Contention & Crash Recovery';
const WORKER = path.join(path.dirname(fileURLToPath(import.meta.url)), 'workers/contention-worker.mjs');

const metrics = new MetricsRecorder();
const suiteStart = Date.now();

interface WorkerSummary {
  workerId: string;
  mode: string;
  attempted: number;
  committed: number;
  reads: number;
  lockErrors: number;
  initError: string | null;
  otherErrors: string[];
  committedIds: string[];
  crashed?: boolean;
}

function runWorker(env: Record<string, string>, killAfterMs?: number): Promise<{
  summary: WorkerSummary | null;
  code: number | null;
  signal: NodeJS.Signals | null;
  stderr: string;
}> {
  return new Promise(resolve => {
    const child = spawn('node', [WORKER], {
      env: { ...process.env, ...env },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';
    child.stdout.on('data', d => (stdout += d.toString()));
    child.stderr.on('data', d => (stderr += d.toString()));

    let timer: NodeJS.Timeout | undefined;
    if (killAfterMs !== undefined) {
      timer = setTimeout(() => child.kill('SIGKILL'), killAfterMs);
    }

    child.on('exit', (code, signal) => {
      if (timer) clearTimeout(timer);
      let summary: WorkerSummary | null = null;
      const line = stdout.trim().split('\n').filter(Boolean).pop();
      if (line) {
        try {
          summary = JSON.parse(line);
        } catch {}
      }
      resolve({ summary, code, signal, stderr });
    });
  });
}

describe('Multi-Process Contention Benchmark', () => {
  const workDir = path.join(process.cwd(), 'src/__tests__/temp-contention');

  beforeAll(() => {
    if (!fs.existsSync(path.join(process.cwd(), 'dist/index.js'))) {
      throw new Error('dist/index.js missing — run `npm run build` before this suite');
    }
    fs.rmSync(workDir, { recursive: true, force: true });
    fs.mkdirSync(workDir, { recursive: true });
  });

  afterAll(() => {
    try {
      fs.rmSync(workDir, { recursive: true, force: true });
    } catch {}
    metrics.writeReport(path.join(process.cwd(), REPORT_DIR, 'contention-metrics.json'), {
      timestamp: new Date().toISOString(),
      tier: TIER,
      suiteDurationMs: Date.now() - suiteStart,
    });
  }, 120000);

  it(PILLAR, async () => {
    const dbPath = path.join(workDir, 'contention.sqlite');
    const workers = CONFIG.processWorkers;
    const perWorker = CONFIG.writesPerWorker;

    // ---- Phase 1: concurrent writers + readers, real processes ----
    const start = performance.now();
    const runs = await Promise.all(
      Array.from({ length: workers }, (_, i) =>
        runWorker({
          NEURON_DB_PATH: dbPath,
          PROJECT_ROOT: workDir,
          WORKER_ID: String(i),
          WRITE_COUNT: String(perWorker),
          // One pure reader keeps read traffic in flight during the write storm.
          MODE: i === workers - 1 ? 'read' : i % 2 === 0 ? 'mixed' : 'write',
        })
      )
    );
    const wallMs = performance.now() - start;
    metrics.record(PILLAR, wallMs);

    const summaries = runs.map(r => r.summary).filter((s): s is WorkerSummary => s !== null);
    const nonZeroExits = runs.filter(r => r.code !== 0);
    const totalCommitted = summaries.reduce((a, s) => a + s.committed, 0);
    const totalAttempted = summaries.reduce((a, s) => a + s.attempted, 0);
    const totalLockErrors = summaries.reduce((a, s) => a + s.lockErrors, 0);
    const otherErrors = summaries.flatMap(s => s.otherErrors);

    expect(summaries.length, 'a worker produced no summary — it died before reporting').toBe(workers);

    // ---- Phase 2: every committed write must actually be readable ----
    process.env.NEURON_DB_PATH = dbPath;
    const verifier = new NeuronMemory({ dbPath, projectRoot: workDir, projectName: 'contention' });
    const stored = await verifier.query({ categories: ['stress'], limit: workers * perWorker * 2 });
    const storedIds = new Set(stored.map(r => r.id));

    // Verify exactly the ids each worker reported committing. Counting alone
    // would be wrong: lock failures leave gaps, so committed ids are sparse.
    const missing = summaries
      .flatMap(s => s.committedIds ?? [])
      .filter(id => !storedIds.has(id));
    await verifier.close();

    const initErrors = summaries.filter(s => s.initError).map(s => s.initError!);
    const droppedWrites = totalAttempted - totalCommitted;

    metrics.annotate(PILLAR, {
      processes: workers,
      writesPerWorker: perWorker,
      attempted: totalAttempted,
      committed: totalCommitted,
      droppedWrites,
      droppedWriteRatio: totalAttempted ? round(droppedWrites / totalAttempted) : 0,
      readableAfterwards: storedIds.size,
      lostWrites: missing.length,
      lockErrors: totalLockErrors,
      initErrors: initErrors.length,
      initErrorSample: initErrors.slice(0, 2),
      nonZeroExits: nonZeroExits.length,
      otherErrors: otherErrors.slice(0, 5),
      wallMs: Math.round(wallMs),
      writesPerSec: Math.round((totalCommitted / wallMs) * 1000),
    });

    // Severity order. Silent loss and init crashes are correctness failures;
    // surfaced lock errors are a quality metric tracked above.
    expect(missing.slice(0, 10), `${missing.length} committed writes were not readable afterwards`).toEqual([]);
    expect(
      initErrors.slice(0, 2),
      'a process crashed opening the shared database concurrently'
    ).toEqual([]);
    expect(otherErrors.slice(0, 3), 'workers hit non-lock errors').toEqual([]);
    expect(
      droppedWrites / Math.max(1, totalAttempted),
      `${droppedWrites}/${totalAttempted} writes were rejected under contention`
    ).toBeLessThan(0.05);
  }, 1800000);

  it(`${PILLAR} — SIGKILL mid-write recovery`, async () => {
    const results: Array<Record<string, unknown>> = [];

    for (let round = 0; round < CONFIG.crashRecoveryRounds; round++) {
      const dbPath = path.join(workDir, `crash-${round}.sqlite`);

      // Seed a known-good baseline.
      const seed = await runWorker({
        NEURON_DB_PATH: dbPath,
        PROJECT_ROOT: workDir,
        WORKER_ID: 'seed',
        WRITE_COUNT: '20',
        MODE: 'write',
      });
      const seeded = seed.summary?.committed ?? 0;

      // Kill a writer partway through, leaving the WAL dirty.
      const victim = runWorker(
        {
          NEURON_DB_PATH: dbPath,
          PROJECT_ROOT: workDir,
          WORKER_ID: 'victim',
          WRITE_COUNT: '400',
          MODE: 'write',
        },
        250
      );
      const victimResult = await victim;

      // The store must still open and read cleanly after an uncontrolled exit.
      let readable = false;
      let survivorCount = 0;
      let recoveryError: string | null = null;
      try {
        const recovered = new NeuronMemory({ dbPath, projectRoot: workDir, projectName: 'contention' });
        const rows = await recovered.query({ categories: ['stress'], limit: 1000 });
        survivorCount = rows.length;
        readable = true;
        // And must still accept new writes after recovery.
        await recovered.transact([
          { op: 'upsert', id: 'post-crash', category: 'stress', content: 'written after crash recovery', importance: 3 },
        ]);
        const after = await recovered.query({ categories: ['stress'], limit: 1000 });
        readable = after.some(r => r.id === 'post-crash');
        await recovered.close();
      } catch (err) {
        recoveryError = String((err as Error)?.message ?? err).slice(0, 300);
      }

      results.push({
        round,
        seeded,
        victimSignal: victimResult.signal ?? null,
        survivorsAfterCrash: survivorCount,
        readableAndWritableAfterCrash: readable,
        recoveryError,
      });

      expect(recoveryError, `store unreadable after SIGKILL (round ${round})`).toBeNull();
      expect(readable, `store did not accept writes after SIGKILL (round ${round})`).toBe(true);
      // Committed-before-crash data must survive an uncontrolled exit.
      expect(survivorCount, `crash lost previously committed data (round ${round})`).toBeGreaterThanOrEqual(seeded);
    }

    metrics.annotate(PILLAR, { crashRecovery: results });
  }, 1800000);
});

function round(n: number): number {
  return Math.round(n * 1000) / 1000;
}
