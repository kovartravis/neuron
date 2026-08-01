/**
 * Standalone writer/reader process for the multi-process contention pillar.
 *
 * Runs as a real OS process against a shared SQLite file so the test exercises
 * cross-process WAL locking. In-process `Promise.all` over one NeuronMemory
 * handle — what the original concurrency pillar did — shares a single
 * connection and never produces the SQLITE_BUSY contention this is about.
 *
 * Protocol: emits one JSON summary line on stdout at exit. Lock errors are
 * counted rather than thrown so the parent can distinguish "contended but
 * correct" from "lost data".
 *
 * Env: NEURON_DB_PATH, PROJECT_ROOT, WORKER_ID, WRITE_COUNT,
 *      MODE=write|read|mixed,
 *      CRASH_AFTER (optional: hard-exit mid-run to simulate a killed agent)
 *
 * PROJECT_ROOT must match the verifier's: NeuronMemory scopes rows by project
 * root, so sharing only the dbPath silently yields an empty result set.
 */
import { NeuronMemory } from '../../../dist/index.js';

const dbPath = process.env.NEURON_DB_PATH;
const projectRoot = process.env.PROJECT_ROOT ?? process.cwd();
const workerId = process.env.WORKER_ID ?? '0';
const writeCount = parseInt(process.env.WRITE_COUNT ?? '50', 10);
const mode = process.env.MODE ?? 'write';
const crashAfter = process.env.CRASH_AFTER ? parseInt(process.env.CRASH_AFTER, 10) : null;

const summary = {
  workerId,
  mode,
  attempted: 0,
  committed: 0,
  reads: 0,
  lockErrors: 0,
  initError: null,
  otherErrors: [],
  // Exact ids that transact() returned successfully for. Committed writes are
  // NOT contiguous once some attempts fail on locks, so the parent cannot
  // reconstruct them from a count — it must verify precisely these.
  committedIds: [],
};

function isLockError(err) {
  const msg = String(err?.message ?? err);
  return /SQLITE_BUSY|database is locked|SQLITE_LOCKED/i.test(msg);
}

// Construction runs the schema migration chain, which is itself a contention
// point when several processes open a fresh database at once. Report the
// failure instead of dying silently, so the parent can score it.
let memory;
try {
  memory = new NeuronMemory({ dbPath, projectRoot, projectName: 'contention' });
} catch (err) {
  summary.initError = String(err?.message ?? err).slice(0, 300);
  process.stdout.write(JSON.stringify(summary) + '\n');
  process.exit(2);
}

try {
  for (let i = 0; i < writeCount; i++) {
    if (crashAfter !== null && i >= crashAfter) {
      // Simulate an agent killed mid-session: no close, no flush.
      process.stdout.write(JSON.stringify({ ...summary, crashed: true }) + '\n');
      process.exit(137);
    }

    if (mode === 'read') {
      try {
        const res = await memory.query({ text: `worker ${workerId} probe ${i}`, categories: ['stress'], limit: 5 });
        summary.reads += Array.isArray(res) ? 1 : 0;
      } catch (err) {
        if (isLockError(err)) summary.lockErrors++;
        else summary.otherErrors.push(String(err?.message ?? err).slice(0, 200));
      }
      continue;
    }

    summary.attempted++;
    const recordId = `w${workerId}-r${i}`;
    try {
      await memory.transact([
        {
          op: 'upsert',
          // Deterministic id so the parent can verify exactly which writes landed.
          id: recordId,
          category: 'stress',
          content: `worker ${workerId} record ${i} payload for cross-process contention`,
          tags: ['stress', `w${workerId}`],
          importance: 3,
        },
      ]);
      summary.committed++;
      summary.committedIds.push(recordId);
    } catch (err) {
      if (isLockError(err)) summary.lockErrors++;
      else summary.otherErrors.push(String(err?.message ?? err).slice(0, 200));
    }

    if (mode === 'mixed' && i % 3 === 0) {
      try {
        await memory.query({ text: 'cross-process contention', categories: ['stress'], limit: 5 });
        summary.reads++;
      } catch (err) {
        if (isLockError(err)) summary.lockErrors++;
        else summary.otherErrors.push(String(err?.message ?? err).slice(0, 200));
      }
    }
  }

  await memory.close();
  process.stdout.write(JSON.stringify(summary) + '\n');
  process.exit(0);
} catch (err) {
  summary.otherErrors.push(String(err?.message ?? err).slice(0, 300));
  process.stdout.write(JSON.stringify(summary) + '\n');
  process.exit(1);
}
