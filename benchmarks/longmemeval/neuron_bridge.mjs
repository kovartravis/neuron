import readline from 'node:readline';
import path from 'node:path';
import fs from 'node:fs';

// Resolve the compiled neuron build. NEURON_DIST lets this run from anywhere;
// the fallback is the layout produced by setup.sh (clone lives at
// <neuron>/benchmarks/agent-memory-benchmark, bridge at its scripts/).
const distUrl = process.env.NEURON_DIST
  ? new URL(`file://${process.env.NEURON_DIST}/index.js`).href
  : new URL('../../../dist/index.js', import.meta.url).href;
const { NeuronMemory } = await import(distUrl);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
});

let neuron = null;

rl.on('line', async (line) => {
  if (!line.trim()) return;
  let req;
  try {
    req = JSON.parse(line);
  } catch (err) {
    return;
  }

  const { id, action } = req;
  try {
    if (action === 'prepare') {
      const { dbPath } = req;
      if (neuron) {
        try { neuron.close(); } catch (_) {}
      }
      // Remove the WAL sidecars alongside the database. Deleting only the
      // .sqlite leaves a stale -shm/-wal from a crashed run, and opening a
      // fresh database against them fails with "disk I/O error".
      if (dbPath && dbPath !== ':memory:') {
        for (const f of [dbPath, `${dbPath}-wal`, `${dbPath}-shm`]) {
          try { if (fs.existsSync(f)) fs.unlinkSync(f); } catch (_) {}
        }
      }
      // storageMode pinned to 'vector': the schema default became 'md'
      // in ticket 31, which would run per-write markdown files + reconcile
      // for a throwaway benchmark ingest of tens of thousands of documents.
      //
      // Ticket 29 pilot: NEURON_BENCH_RERANKER_PASSTHROUGH swaps in a
      // stub reranker that always accepts, reconstructing pre-ticket-29
      // (lexical-leg-only) behaviour for a same-codebase baseline arm —
      // harness-only, never a product config surface (mirrors
      // NEURON_MOCK_EMBEDDER's existing precedent in src/index.ts).
      const reranker = process.env.NEURON_BENCH_RERANKER_PASSTHROUGH === 'true'
        ? { score: async () => Infinity }
        : undefined;
      neuron = new NeuronMemory({
        dbPath: dbPath || ':memory:',
        projectRoot: process.cwd(),
        projectName: 'benchmark',
        storageMode: 'vector',
        reranker
      });
      console.log(JSON.stringify({ id, status: 'ok' }));
    } else if (action === 'ingest') {
      const { documents } = req;
      if (!neuron) {
        throw new Error('Neuron memory not initialized. Call prepare first.');
      }
      const BATCH_SIZE = 50;
      for (let i = 0; i < documents.length; i += BATCH_SIZE) {
        const batch = documents.slice(i, i + BATCH_SIZE);
        // Isolation is per-category, not per-scope: ticket 38 dropped the
        // `scope` column entirely, so `scope`/`scopes` are silently ignored
        // by NeuronMemory now. A document's user_id becomes its category,
        // which is the only partition key query() still filters on.
        const mutations = batch.map(doc => ({
          op: 'upsert',
          id: doc.id,
          category: `bench_${doc.user_id || 'default'}`,
          content: doc.content
        }));
        await neuron.transact(mutations);
      }
      console.log(JSON.stringify({ id, status: 'ok', ingested: documents.length }));
    } else if (action === 'retrieve') {
      const { query, k = 10, user_id } = req;
      if (!neuron) {
        throw new Error('Neuron memory not initialized. Call prepare first.');
      }
      const categories = user_id ? [`bench_${user_id}`] : undefined;
      const results = await neuron.query({
        text: query,
        categories,
        limit: k
      });
      const docs = results.map(r => ({
        id: r.id,
        content: r.content,
        user_id: user_id ?? null,
        score: r.score,
        // Ticket 39: raw legs of ADR 0012's gate, exposed by NeuronMemory
        // for gate calibration since the gate itself (ticket 41) hasn't
        // shipped in production code yet.
        similarity: r.similarity,
        ftsMatched: r.ftsMatched,
        // Ticket 29: raw reranker leg, calibration parity with similarity/ftsMatched above.
        rerankerScore: r.rerankerScore
      }));
      console.log(JSON.stringify({ id, status: 'ok', documents: docs }));
    } else if (action === 'cleanup') {
      if (neuron) {
        try { neuron.close(); } catch (_) {}
        neuron = null;
      }
      console.log(JSON.stringify({ id, status: 'ok' }));
    } else {
      console.log(JSON.stringify({ id, status: 'error', error: `Unknown action: ${action}` }));
    }
  } catch (err) {
    console.log(JSON.stringify({ id, status: 'error', error: err.message || String(err) }));
  }
});
