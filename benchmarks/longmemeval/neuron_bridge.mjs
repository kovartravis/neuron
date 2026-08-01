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
      neuron = new NeuronMemory({
        dbPath: dbPath || ':memory:',
        projectRoot: process.cwd(),
        projectName: 'benchmark'
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
        const mutations = batch.map(doc => ({
          op: 'upsert',
          id: doc.id,
          category: 'benchmark',
          content: doc.content,
          scope: doc.user_id || 'default'
        }));
        await neuron.transact(mutations);
      }
      console.log(JSON.stringify({ id, status: 'ok', ingested: documents.length }));
    } else if (action === 'retrieve') {
      const { query, k = 10, user_id } = req;
      if (!neuron) {
        throw new Error('Neuron memory not initialized. Call prepare first.');
      }
      const scopes = user_id ? [user_id] : undefined;
      const results = await neuron.query({
        text: query,
        categories: ['benchmark'],
        limit: k,
        scopes
      });
      const docs = results.map(r => ({
        id: r.id,
        content: r.content,
        user_id: r.scope,
        score: r.score
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
