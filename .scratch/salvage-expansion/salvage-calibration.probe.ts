/**
 * Ticket 07 calibration probe — throwaway.
 *
 * Question: does raw top-1 cosine `similarity` separate a query retrieval got
 * RIGHT from a query it got WRONG? If it does not, the salvage trigger has
 * nothing to fire on and ticket 07's scope step 3 kills it.
 */
process.env.NODE_ENV = 'production';
delete process.env.NEURON_MOCK_EMBEDDER;

import { describe, it, beforeAll, afterAll } from 'vitest';
import path from 'node:path';
import fs from 'node:fs';
import { NeuronMemory } from '../../src/index.js';
import { TransformersEmbedder } from '../../src/components/embedder.js';
import { ADVERSARIAL_CASES, buildFiller } from '../../test/e2e/adversarial-corpus.js';

// `similarity` is not surfaced on results yet — that is this ticket's
// prerequisite. Recompute it exactly as src/index.ts does: embedQuery for the
// query (asymmetric BGE prefix), embed for the passage, dot product.
const embedder = new TransformersEmbedder();
function dot(a: Float32Array, b: Float32Array): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
}
async function bestSim(query: string, content: string | undefined): Promise<number | null> {
  if (!content) return null;
  const [q, p] = await Promise.all([embedder.embedQuery(query), embedder.embed(content)]);
  return dot(q, p);
}

// Queries with no correct answer in the corpus at all — the "should trip the
// floor" population.
const NONSENSE_QUERIES = [
  'kubernetes ingress certificate rotation',
  'sourdough starter hydration ratio',
  'quarterly revenue forecast spreadsheet',
  'bluetooth pairing firmware handshake',
  'tax withholding allowance form',
];

// The terse queries CLAUDE.md's manual workaround names.
const TERSE_QUERIES = ['git', 'tdd', 'db', 'wasm'];

describe('Salvage calibration probe', () => {
  const workDir = path.join(process.cwd(), 'src/__tests__/temp-salvage-cal');
  const dbPath = path.join(workDir, `cal-${Date.now()}.sqlite`);
  let memory: NeuronMemory;

  beforeAll(async () => {
    fs.mkdirSync(workDir, { recursive: true });
    process.env.NEURON_DB_PATH = dbPath;
    memory = NeuronMemory.open(workDir);

    const filler = buildFiller(300).map(content => ({
      op: 'upsert' as const, category: 'learning', content, tags: ['filler'], importance: 2,
    }));
    const negatives = ADVERSARIAL_CASES.flatMap(c =>
      c.hardNegatives.map((content, i) => ({
        op: 'upsert' as const, category: 'learning', content, tags: ['negative', c.id, `neg_${i}`], importance: 3,
      }))
    );
    const superseded = ADVERSARIAL_CASES.filter(c => c.superseded).map(c => ({
      op: 'upsert' as const, category: 'learning', content: c.superseded!, tags: ['superseded', c.id], importance: 3,
    }));
    const golds = ADVERSARIAL_CASES.map(c => ({
      op: 'upsert' as const, category: 'learning', content: c.gold, tags: ['gold', c.id], importance: 4,
    }));

    await memory.transact([...filler, ...negatives, ...superseded, ...golds]);
  }, 600000);

  afterAll(async () => {
    try { await memory?.close(); } catch {}
    try { fs.rmSync(workDir, { recursive: true, force: true }); } catch {}
  }, 120000);

  it('records best-similarity for right, wrong, nonsense and terse queries', async () => {
    const rows: any[] = [];

    for (const c of ADVERSARIAL_CASES) {
      const results = await memory.query({ text: c.query, categories: ['learning'], limit: 10 });
      const goldRank = results.findIndex(r => r.content === c.gold);
      rows.push({
        population: goldRank === 0 ? 'gold@1 (RIGHT)' : 'gold not@1 (WRONG)',
        id: c.id,
        family: c.family,
        goldRank: goldRank === -1 ? null : goldRank + 1,
        bestSim: await bestSim(c.query, results[0]?.content),
        bestScore: results[0]?.score ?? null,
      });
    }

    for (const q of NONSENSE_QUERIES) {
      const results = await memory.query({ text: q, categories: ['learning'], limit: 10 });
      rows.push({
        population: 'nonsense (NO ANSWER EXISTS)',
        id: q, family: '-', goldRank: null,
        bestSim: await bestSim(q, results[0]?.content),
        bestScore: results[0]?.score ?? null,
      });
    }

    for (const q of TERSE_QUERIES) {
      const results = await memory.query({ text: q, categories: ['learning'], limit: 10 });
      rows.push({
        population: 'terse', id: q, family: '-', goldRank: null,
        bestSim: await bestSim(q, results[0]?.content),
        bestScore: results[0]?.score ?? null,
      });
    }

    fs.mkdirSync(path.join(process.cwd(), '.scratch/salvage-expansion'), { recursive: true });
    fs.writeFileSync(
      path.join(process.cwd(), '.scratch/salvage-expansion/calibration-results.json'),
      JSON.stringify(rows, null, 2)
    );
    console.log(JSON.stringify(rows, null, 2));
  }, 600000);
});
