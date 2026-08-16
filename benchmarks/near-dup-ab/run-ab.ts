/**
 * Ticket 7 (neuron-2.4.2): A/B 1-3 for near-duplicate-detection approach
 * validation — does reranking beat raw cosine on this task, what widen
 * count (N) is worth its cost, and where does the reranker-bar frontier
 * sit? Mirrors ticket 29/39's measure-first, sweep-the-frontier discipline
 * (`benchmarks/reranker-gate/calibrate-threshold.ts`).
 *
 * One expensive pass computes every score once: for each corpus candidate,
 * embed it, rank the whole seed pool by raw cosine, and reranker-score the
 * top MAX_N by cosine (plus the candidate's own true seed if it fell
 * outside that window, so it's never silently missing from the report).
 * N-sweeps (A/B 2) and bar-sweeps (A/B 3) then just re-slice/re-threshold
 * this one cached pass — no repeated model calls.
 *
 * Run: npx tsx benchmarks/near-dup-ab/run-ab.ts
 */
import fs from 'node:fs';
import path from 'node:path';
import { CORPUS, DISTRACTOR_SEEDS, type PairLabel } from './corpus.js';
import { TransformersEmbedder } from '../../src/components/embedder.js';
import { TransformersReranker } from '../../src/components/reranker.js';

const MAX_N = 50;
const N_SWEEP = [5, 10, 20, 50];
const BAR_SWEEP = [-15, -12, -10, -8, -6, -5, -4, -3, -2, -1, -0.5, 0, 0.5, 1, 2, 3, 5, 8, 12];

function dot(a: Float32Array, b: Float32Array): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
}

interface ScoredSeed {
  seed: string;
  cosine: number;
  isOwn: boolean;
  rerank: number | null; // null = not scored (outside window, only possible for non-own seeds)
}

interface CandidateResult {
  id: string;
  label: PairLabel;
  seed: string;
  candidate: string;
  ownSeedCosine: number;
  ownSeedRerank: number;
  ownSeedCosineRank: number; // 1-based
  topByCosine: ScoredSeed[]; // top MAX_N, own seed included wherever it naturally ranks (rerank always present in top MAX_N)
}

async function main() {
  const embedder = new TransformersEmbedder();
  const reranker = new TransformersReranker();

  // One unique seed per topic group (ids share a numeric suffix — nd-01/
  // rd-01/un-01 all seed off the same live entry) so the pool models one
  // real store, not three copies of the same fact.
  const seedByGroup = new Map<string, string>();
  for (const p of CORPUS) {
    const group = p.id.split('-')[1];
    if (!seedByGroup.has(group)) seedByGroup.set(group, p.seed);
  }
  const realSeeds = [...seedByGroup.values()];
  const allSeeds = [...realSeeds, ...DISTRACTOR_SEEDS];
  console.log(`seed pool: ${allSeeds.length} (${realSeeds.length} real + ${DISTRACTOR_SEEDS.length} distractor)`);
  console.log(`corpus: ${CORPUS.length} candidates (${CORPUS.filter(p => p.label === 'near-dup').length} near-dup, ${CORPUS.filter(p => p.label === 'related-distinct').length} related-distinct, ${CORPUS.filter(p => p.label === 'unrelated').length} unrelated)`);

  console.log('embedding seed pool...');
  const seedVecs = new Map<string, Float32Array>();
  for (const s of allSeeds) seedVecs.set(s, await embedder.embed(s));

  console.log('embedding candidates...');
  const candVecs = new Map<string, Float32Array>();
  for (const p of CORPUS) candVecs.set(p.id, await embedder.embed(p.candidate));

  console.log('scoring (cosine rank + reranker on top window)...');
  const results: CandidateResult[] = [];
  const t0 = Date.now();
  for (let i = 0; i < CORPUS.length; i++) {
    const p = CORPUS[i];
    const cv = candVecs.get(p.id)!;
    const scored = allSeeds.map(s => ({ seed: s, cosine: dot(cv, seedVecs.get(s)!), isOwn: s === p.seed, rerank: null as number | null }));
    scored.sort((a, b) => b.cosine - a.cosine);
    const ownIdx = scored.findIndex(x => x.isOwn);
    if (ownIdx === -1) {
      throw new Error(`corpus bug: ${p.id}'s seed does not exactly match any pool seed (check DISTRACTOR_SEEDS/group-seed collisions in corpus.ts): "${p.seed}"`);
    }

    const topByCosine = scored.slice(0, MAX_N);
    for (const entry of topByCosine) {
      entry.rerank = await reranker.score(p.candidate, entry.seed);
    }
    let ownSeedRerank: number;
    if (ownIdx < MAX_N) {
      ownSeedRerank = topByCosine[ownIdx].rerank!;
    } else {
      // Own seed didn't widen into the top window by cosine at all —
      // score it anyway so the report never silently drops it.
      ownSeedRerank = await reranker.score(p.candidate, p.seed);
    }

    results.push({
      id: p.id,
      label: p.label,
      seed: p.seed,
      candidate: p.candidate,
      ownSeedCosine: scored[ownIdx].cosine,
      ownSeedRerank,
      ownSeedCosineRank: ownIdx + 1,
      topByCosine,
    });
    const el = ((Date.now() - t0) / 1000).toFixed(0);
    console.log(`  [${i + 1}/${CORPUS.length}] ${p.id} (${p.label}) own-cosine=${scored[ownIdx].cosine.toFixed(4)} rank=${ownIdx + 1} own-rerank=${ownSeedRerank.toFixed(2)}  (${el}s elapsed)`);
  }

  const rawOut = { timestamp: new Date().toISOString(), poolSize: allSeeds.length, results };
  const rawPath = path.join(import.meta.dirname, 'raw-scores.json');
  fs.writeFileSync(rawPath, JSON.stringify(rawOut, null, 2));
  console.log(`\nraw scores written: ${rawPath}`);

  // ---------------------------------------------------------------
  // A/B 1 — reranking vs. raw cosine separation
  // ---------------------------------------------------------------
  console.log('\n=== A/B 1 — reranking vs. raw cosine, own-seed score by label ===');
  console.log('label               n    cosine(min/median/max)          rerank(min/median/max)');
  for (const label of ['near-dup', 'related-distinct', 'unrelated'] as PairLabel[]) {
    const rows = results.filter(r => r.label === label);
    const cos = rows.map(r => r.ownSeedCosine).sort((a, b) => a - b);
    const rer = rows.map(r => r.ownSeedRerank).sort((a, b) => a - b);
    const med = (xs: number[]) => xs[Math.floor(xs.length / 2)];
    console.log(
      `${label.padEnd(18)}  ${String(rows.length).padStart(2)}    ${cos[0].toFixed(4)} / ${med(cos).toFixed(4)} / ${cos[cos.length - 1].toFixed(4)}` +
      `        ${rer[0].toFixed(2).padStart(6)} / ${med(rer).toFixed(2).padStart(6)} / ${rer[rer.length - 1].toFixed(2).padStart(6)}`
    );
  }

  // Separation: gap between near-dup's worst (min) score and the hard
  // negative (related-distinct)'s best (max) score. Positive gap = clean
  // separation exists at some threshold; negative/zero = no threshold
  // separates them cleanly, for that signal.
  const nd = results.filter(r => r.label === 'near-dup');
  const rdOwn = results.filter(r => r.label === 'related-distinct');
  const ndCosMin = Math.min(...nd.map(r => r.ownSeedCosine));
  const rdCosMax = Math.max(...rdOwn.map(r => r.ownSeedCosine));
  const ndRerMin = Math.min(...nd.map(r => r.ownSeedRerank));
  const rdRerMax = Math.max(...rdOwn.map(r => r.ownSeedRerank));
  console.log(`\nnear-dup min cosine (${ndCosMin.toFixed(4)}) vs. related-distinct max cosine (${rdCosMax.toFixed(4)}): gap = ${(ndCosMin - rdCosMax).toFixed(4)} ${ndCosMin > rdCosMax ? '(separated)' : '(OVERLAP — no cosine cutoff separates them)'}`);
  console.log(`near-dup min rerank (${ndRerMin.toFixed(2)}) vs. related-distinct max rerank (${rdRerMax.toFixed(2)}): gap = ${(ndRerMin - rdRerMax).toFixed(2)} ${ndRerMin > rdRerMax ? '(separated)' : '(OVERLAP — no reranker cutoff separates them)'}`);

  // Also check against unrelated (should be trivial for both signals).
  const unOwn = results.filter(r => r.label === 'unrelated');
  const unCosMax = Math.max(...unOwn.map(r => r.ownSeedCosine));
  const unRerMax = Math.max(...unOwn.map(r => r.ownSeedRerank));
  console.log(`near-dup min cosine (${ndCosMin.toFixed(4)}) vs. unrelated max cosine (${unCosMax.toFixed(4)}): gap = ${(ndCosMin - unCosMax).toFixed(4)}`);
  console.log(`near-dup min rerank (${ndRerMin.toFixed(2)}) vs. unrelated max rerank (${unRerMax.toFixed(2)}): gap = ${(ndRerMin - unRerMax).toFixed(2)}`);

  // ---------------------------------------------------------------
  // A/B 2 — widen count (N) sensitivity: does the true near-dup seed
  // widen into the top-N by cosine at all, for each N?
  // ---------------------------------------------------------------
  console.log('\n=== A/B 2 — widen count (N) sensitivity: own-seed recall within top-N by cosine ===');
  console.log('N     near-dup recall    related-distinct recall   unrelated recall   reranker calls (this corpus)');
  for (const N of N_SWEEP) {
    const recallFor = (label: PairLabel) => {
      const rows = results.filter(r => r.label === label);
      const hit = rows.filter(r => r.ownSeedCosineRank <= N).length;
      return `${hit}/${rows.length}`;
    };
    const callsThisCorpus = CORPUS.length * N;
    console.log(`${String(N).padStart(3)}   ${recallFor('near-dup').padStart(8)}            ${recallFor('related-distinct').padStart(8)}                  ${recallFor('unrelated').padStart(8)}           ${callsThisCorpus}`);
  }

  // ---------------------------------------------------------------
  // A/B 3 — reranker bar: false-accept vs. false-silence frontier
  // (own-seed score only, i.e. "would the true near-dup be caught" vs.
  // "would this hard/easy negative be wrongly caught", both gated on
  // N=MAX_N so the bar sweep isn't confounded by widen-recall misses)
  // ---------------------------------------------------------------
  console.log(`\n=== A/B 3 — reranker bar frontier (N=${MAX_N}, own-seed score, mirrors ticket 29/39 sweep) ===`);
  console.log('bar     false-silence (near-dup missed)    false-accept (related-distinct)   false-accept (unrelated)');
  for (const T of BAR_SWEEP) {
    const fsCount = nd.filter(r => r.ownSeedCosineRank > MAX_N || r.ownSeedRerank < T).length;
    const faRd = rdOwn.filter(r => r.ownSeedCosineRank <= MAX_N && r.ownSeedRerank >= T).length;
    const faUn = unOwn.filter(r => r.ownSeedCosineRank <= MAX_N && r.ownSeedRerank >= T).length;
    console.log(
      `${String(T).padStart(5)}   ${String(fsCount).padStart(4)}/${nd.length} = ${(fsCount / nd.length * 100).toFixed(0).padStart(3)}%` +
      `                     ${String(faRd).padStart(4)}/${rdOwn.length} = ${(faRd / rdOwn.length * 100).toFixed(0).padStart(3)}%` +
      `                        ${String(faUn).padStart(4)}/${unOwn.length} = ${(faUn / unOwn.length * 100).toFixed(0).padStart(3)}%`
    );
  }

  // Also report cross-pool false-accept: does ANY non-own seed in the
  // top-N ever score above a candidate bar, for a related-distinct or
  // unrelated candidate? This is the real gate's actual failure mode
  // (widen surfaces a *different* live entry that scores high), not just
  // the own-seed pairing.
  console.log(`\n=== A/B 3b — cross-pool false-accept (any non-own seed in top-${MAX_N} scores >= bar) ===`);
  console.log('bar     related-distinct (any hit)   unrelated (any hit)');
  for (const T of BAR_SWEEP) {
    const anyHit = (rows: CandidateResult[]) =>
      rows.filter(r => r.topByCosine.some(s => !s.isOwn && (s.rerank ?? -Infinity) >= T)).length;
    const rdHit = anyHit(rdOwn);
    const unHit = anyHit(unOwn);
    console.log(`${String(T).padStart(5)}   ${String(rdHit).padStart(4)}/${rdOwn.length} = ${(rdHit / rdOwn.length * 100).toFixed(0).padStart(3)}%              ${String(unHit).padStart(4)}/${unOwn.length} = ${(unHit / unOwn.length * 100).toFixed(0).padStart(3)}%`);
  }

  console.log('\ndone.');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
