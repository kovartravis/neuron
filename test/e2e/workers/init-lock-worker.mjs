/**
 * Minimal standalone process for the SQLite schema-migration-race repro
 * (ticket id 2fbfa9ff-1469-4b21-b781-cef371ea7d38, neuron-2.4.0 — this
 * repo's own ticket numbering has an unrelated ticket also called "44",
 * so this comment spells out the id rather than the number).
 *
 * Unlike `contention-worker.mjs` (Pillar 8's full read/write storm), this
 * worker does nothing but construct a `NeuronMemory` against a database
 * file that may not exist yet, then exit — isolating the one race this
 * ticket is about (the `user_version`-gated migration chain in
 * `initialize()`) from write/read contention, which is a different,
 * already-passing concern. Emits one line: `OK` on success, or `ERR:
 * <message>` on failure, so the parent can tell a clean construction from
 * a migration-race crash without parsing exit codes alone.
 *
 * Env: NEURON_DB_PATH, PROJECT_ROOT, START_AT (optional epoch ms — the
 * worker busy-waits until this instant before constructing, so several
 * processes with independent Node-startup jitter still converge on the
 * same instant; construction itself is fast since the embedder loads its
 * model lazily, so without a barrier the race window can be missed).
 */
import { NeuronMemory } from '../../../dist/index.js';

const dbPath = process.env.NEURON_DB_PATH;
const projectRoot = process.env.PROJECT_ROOT ?? process.cwd();
const startAt = process.env.START_AT ? Number(process.env.START_AT) : null;

if (startAt !== null) {
  while (Date.now() < startAt) {
    // Busy-wait rather than `setTimeout`: this needs sub-millisecond
    // convergence across processes, which a timer's own scheduling jitter
    // would itself undermine.
  }
}

try {
  const memory = new NeuronMemory({ dbPath, projectRoot, projectName: 'init-lock' });
  await memory.close();
  process.stdout.write('OK\n');
  process.exit(0);
} catch (err) {
  process.stdout.write(`ERR: ${String(err?.message ?? err)}\n`);
  process.exit(1);
}
