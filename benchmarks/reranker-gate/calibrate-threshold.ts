/**
 * Ticket 29 threshold calibration: reuses the already-ingested LongMemEval-S
 * database (500 questions, 23867 documents — the expensive part) and, for
 * each query, records the RAW reranker score for its top-`ftsMatched`
 * candidate (own partition) and a cross-partition negative control —
 * without hard-filtering on it. Mirrors relevance_gate_eval.py's Run 1
 * cosine-floor sweep methodology (ticket 39), but for the reranker's raw
 * logit instead of cosine similarity: measure first, choose a threshold
 * from the swept frontier, never assume one.
 *
 * Bypasses `queryGated` entirely — calls the public `queryVector` directly
 * so nothing gets rejected before this script sees it.
 */
import fs from 'node:fs';
import path from 'node:path';
import { NeuronMemory } from '../../src/index.js';
import { TransformersReranker } from '../../src/components/reranker.js';

const AMB = path.join(import.meta.dirname, '..', 'agent-memory-benchmark');
const dbPath = path.join(AMB, 'outputs', '_relevance_gate_neuron', 'neuron', 'bench.sqlite');
const queriesPath = path.join(AMB, 'outputs', 'longmemeval_queries.json');

interface Q { user_id: string; query: string; gold_ids: string[]; category: string }

async function main() {
  const queries: Q[] = JSON.parse(fs.readFileSync(queriesPath, 'utf8'));
  console.log(`loaded ${queries.length} queries, db: ${dbPath}`);

  const memory = new NeuronMemory({
    dbPath,
    projectRoot: AMB,
    projectName: 'benchmark',
    storageMode: 'vector',
  });
  const reranker = new TransformersReranker();

  type Rec = { userId: string; category: string; rFts: boolean; rReranker: number | null; hasGold: boolean };
  const positives: Rec[] = [];
  const negatives: Rec[] = [];

  const t0 = Date.now();
  for (let i = 0; i < queries.length; i++) {
    const q = queries[i];
    const ownCategory = `bench_${q.user_id}`;
    const negPartner = queries[(i + 250) % queries.length];
    const negCategory = `bench_${negPartner.user_id}`;

    // Own partition — top-10 by RRF, unfiltered (mirrors KMAX retrieve).
    const ownResults = await memory.queryVector({ text: q.query, categories: [ownCategory], limit: 10 });
    const top = ownResults[0];
    let rReranker: number | null = null;
    if (top && top.ftsMatched) {
      rReranker = await reranker.score(q.query, top.content);
    }
    positives.push({
      userId: q.user_id,
      category: q.category,
      rFts: top ? top.ftsMatched === true : false,
      rReranker,
      hasGold: q.gold_ids.length > 0,
    });

    // Cross-partition negative control — top-1 against a different user's docs.
    const negResults = await memory.queryVector({ text: q.query, categories: [negCategory], limit: 1 });
    const negTop = negResults[0];
    let negRReranker: number | null = null;
    if (negTop && negTop.ftsMatched) {
      negRReranker = await reranker.score(q.query, negTop.content);
    }
    negatives.push({
      userId: q.user_id,
      category: q.category,
      rFts: negTop ? negTop.ftsMatched === true : false,
      rReranker: negRReranker,
      hasGold: false,
    });

    if ((i + 1) % 50 === 0) {
      const el = (Date.now() - t0) / 1000;
      console.log(`[${i + 1}/${queries.length}] ${el.toFixed(0)}s elapsed`);
    }
  }
  await memory.close();

  const scored = positives.filter(p => p.hasGold);

  // Run 2 equivalent: lexical-only false silence (unchanged, sanity check against known 0%).
  const lexFail = scored.filter(p => !p.rFts).length;
  console.log(`\nlexical-only false-silence (sanity check, should be ~0%): ${lexFail}/${scored.length} = ${(lexFail / scored.length * 100).toFixed(2)}%`);

  // Run 4 equivalent: lexical-only false accept (sanity check against known 99.80%).
  const lexAccept = negatives.filter(n => n.rFts).length;
  console.log(`lexical-only false-accept (sanity check, should be ~99.80%): ${lexAccept}/${negatives.length} = ${(lexAccept / negatives.length * 100).toFixed(2)}%`);

  // Threshold sweep: reject if !ftsMatched OR (ftsMatched && rReranker < T).
  console.log('\n--- reranker threshold sweep (AND with lexical leg, mirrors Run 1) ---');
  console.log('thresh    false_silence(of scored, gold-guaranteed)    false_accept(of negative control)');
  const posWithScore = scored.filter(p => p.rFts && p.rReranker !== null);
  const negWithScore = negatives.filter(n => n.rFts && n.rReranker !== null);
  console.log(`(population: ${scored.length} scored queries [${posWithScore.length} cleared lexical leg], ${negatives.length} negative controls [${negWithScore.length} cleared lexical leg])`);

  const allScores = [...posWithScore.map(p => p.rReranker!), ...negWithScore.map(n => n.rReranker!)];
  const thresholds = [-Infinity, -15, -12, -10, -8, -6, -5, -4, -3, -2, -1, -0.5, 0, 0.5, 1, 2, 3, 5, 8, 12, Infinity];

  for (const T of thresholds) {
    const falseSilence = scored.filter(p => !p.rFts || p.rReranker === null || p.rReranker < T).length;
    const falseAccept = negatives.filter(n => n.rFts && n.rReranker !== null && n.rReranker >= T).length;
    console.log(
      `${String(T).padStart(8)}   ${String(falseSilence).padStart(4)}/${scored.length} = ${(falseSilence / scored.length * 100).toFixed(1).padStart(6)}%` +
      `        ${String(falseAccept).padStart(4)}/${negatives.length} = ${(falseAccept / negatives.length * 100).toFixed(1).padStart(6)}%`
    );
  }

  const out = { positives, negatives, timestamp: new Date().toISOString() };
  const outPath = path.join(import.meta.dirname, '..', 'reports', 'reranker-gate-threshold-calibration.json');
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
  console.log(`\nwritten: ${outPath}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
