/**
 * Fast, focused repro/regression test for the SQLite schema-migration race
 * (ticket id 2fbfa9ff-1469-4b21-b781-cef371ea7d38, neuron-2.4.0 — deliberately
 * spelled out as an id, not the bare number "44", which this repo's own
 * source already uses for an unrelated declared-fields ticket).
 *
 * Pillar 8 (`concurrency-stress.test.ts`) covers this as a side effect of a
 * much larger read/write storm and takes minutes to run. This test isolates
 * just the construction race — several processes each doing nothing but
 * `new NeuronMemory(...)` against one database file that doesn't exist yet —
 * so it can be red/green-verified in seconds. Runs several fresh-file rounds
 * back to back, since the race is timing-dependent and a single round can
 * pass by luck even on unguarded code.
 */
process.env.NODE_ENV = 'production';
delete process.env.NEURON_MOCK_EMBEDDER;

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawn } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const WORKER = path.join(path.dirname(fileURLToPath(import.meta.url)), 'workers/init-lock-worker.mjs');
const PROCESSES_PER_ROUND = 8;
const ROUNDS = 4;

function runWorker(env: Record<string, string>): Promise<{ code: number | null; stdout: string; stderr: string }> {
  return new Promise(resolve => {
    const child = spawn('node', [WORKER], { env: { ...process.env, ...env }, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', d => (stdout += d.toString()));
    child.stderr.on('data', d => (stderr += d.toString()));
    child.on('exit', code => resolve({ code, stdout, stderr }));
  });
}

describe('SQLite schema-migration race — fast repro', () => {
  const workDir = path.join(process.cwd(), 'src/__tests__/temp-init-lock');

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
  });

  it(
    `${ROUNDS} rounds of ${PROCESSES_PER_ROUND} processes opening one fresh database concurrently: all succeed`,
    async () => {
      const failures: string[] = [];

      for (let round = 0; round < ROUNDS; round++) {
        const dbPath = path.join(workDir, `round-${round}.sqlite`);
        // Give every process ~800ms to clear Node/ESM startup jitter before
        // its own barrier fires, so all `PROCESSES_PER_ROUND` actually
        // attempt construction at the same instant instead of trickling in.
        const startAt = String(Date.now() + 800);
        const results = await Promise.all(
          Array.from({ length: PROCESSES_PER_ROUND }, () =>
            runWorker({ NEURON_DB_PATH: dbPath, PROJECT_ROOT: workDir, START_AT: startAt })
          )
        );

        for (const r of results) {
          if (r.code !== 0 || !r.stdout.includes('OK')) {
            failures.push(`round ${round}: exit=${r.code} stdout=${r.stdout.trim()} stderr=${r.stderr.trim()}`);
          }
        }
      }

      expect(failures, `${failures.length} of ${ROUNDS * PROCESSES_PER_ROUND} concurrent opens failed`).toEqual([]);
    },
    120000
  );
});
