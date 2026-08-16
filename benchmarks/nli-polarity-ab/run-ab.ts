/**
 * Ticket 8 (neuron-2.4.2): A/B validation of `cross-encoder/nli-MiniLM2-L6-H768`
 * as the polarity signal Ticket 9 would hard-block on — does it separate
 * "contradicts" from "compatible" (paraphrase or related-but-different) on
 * real write-time pairs, and what confidence bar should trigger the block?
 * Mirrors Ticket 7's measure-first discipline
 * (`benchmarks/near-dup-ab/run-ab.ts`): one pass computes every score once,
 * the bar sweep just re-thresholds the cached pass.
 *
 * `premise` = the live entry already in the store; `hypothesis` = the new
 * write being evaluated against it — order matters for NLI (asymmetric),
 * and this is the direction a real write-time call would make.
 *
 * Run: npx tsx benchmarks/nli-polarity-ab/run-ab.ts
 */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { CORPUS, type PolarityLabel } from './corpus.js';

const MODEL_ID = 'cross-encoder/nli-MiniLM2-L6-H768';
const PROB_BAR_SWEEP = [0.5, 0.6, 0.7, 0.75, 0.8, 0.85, 0.9, 0.95, 0.98, 0.99];
const MARGIN_BAR_SWEEP = [0, 1, 2, 3, 4, 5, 6, 8, 10, 12];

interface ScoredPair {
  id: string;
  label: PolarityLabel;
  premise: string;
  hypothesis: string;
  logits: [number, number, number]; // [contradiction, entailment, neutral] — id2label order
  probs: [number, number, number];
  argmax: 'contradiction' | 'entailment' | 'neutral';
  margin: number; // contradiction logit - max(entailment, neutral) logit
}

function softmax(xs: number[]): number[] {
  const m = Math.max(...xs);
  const exps = xs.map(x => Math.exp(x - m));
  const sum = exps.reduce((a, b) => a + b, 0);
  return exps.map(e => e / sum);
}

async function main() {
  const { AutoTokenizer, AutoModelForSequenceClassification, env } = await import('@huggingface/transformers');
  const modelCacheDir = path.join(os.homedir(), 'Library/Application Support/neuron/models');
  env.cacheDir = modelCacheDir;
  env.useFSCache = true;

  console.log(`loading ${MODEL_ID}...`);
  const tokenizer = await AutoTokenizer.from_pretrained(MODEL_ID);
  const model = await AutoModelForSequenceClassification.from_pretrained(MODEL_ID);
  const id2label = model.config.id2label as Record<string, string>;
  console.log('id2label:', id2label);
  if (id2label['0'] !== 'contradiction' || id2label['1'] !== 'entailment' || id2label['2'] !== 'neutral') {
    throw new Error(`unexpected id2label ordering from model config: ${JSON.stringify(id2label)}`);
  }

  console.log(`corpus: ${CORPUS.length} pairs (${CORPUS.filter(p => p.label === 'contradiction').length} contradiction, ${CORPUS.filter(p => p.label === 'compatible-paraphrase').length} compatible-paraphrase, ${CORPUS.filter(p => p.label === 'compatible-related').length} compatible-related)`);

  console.log('scoring...');
  const results: ScoredPair[] = [];
  const t0 = Date.now();
  for (let i = 0; i < CORPUS.length; i++) {
    const p = CORPUS[i];
    const inputs = tokenizer(p.premise, { text_pair: p.hypothesis, padding: true, truncation: true });
    const { logits: rawLogits } = await model(inputs);
    const logits = Array.from(rawLogits.data) as [number, number, number];
    const probs = softmax(logits) as [number, number, number];
    const argmaxIdx = logits.indexOf(Math.max(...logits));
    const argmax = (['contradiction', 'entailment', 'neutral'] as const)[argmaxIdx];
    const margin = logits[0] - Math.max(logits[1], logits[2]);
    results.push({ id: p.id, label: p.label, premise: p.premise, hypothesis: p.hypothesis, logits, probs, argmax, margin });
    const el = ((Date.now() - t0) / 1000).toFixed(0);
    console.log(`  [${i + 1}/${CORPUS.length}] ${p.id} (${p.label}) argmax=${argmax} P(contradiction)=${probs[0].toFixed(4)} margin=${margin.toFixed(2)}  (${el}s elapsed)`);
  }

  const rawOut = { timestamp: new Date().toISOString(), model: MODEL_ID, results };
  const rawPath = path.join(import.meta.dirname, 'raw-scores.json');
  fs.writeFileSync(rawPath, JSON.stringify(rawOut, null, 2));
  console.log(`\nraw scores written: ${rawPath}`);

  const byLabel = (label: PolarityLabel) => results.filter(r => r.label === label);
  const contradiction = byLabel('contradiction');
  const compatParaphrase = byLabel('compatible-paraphrase');
  const compatRelated = byLabel('compatible-related');

  // ---------------------------------------------------------------
  // A/B 1 — separation: P(contradiction) and margin by label
  // ---------------------------------------------------------------
  console.log('\n=== A/B 1 — P(contradiction) and margin by label ===');
  console.log('label                     n    P(contra) min/median/max        margin min/median/max');
  for (const [name, rows] of [
    ['contradiction', contradiction],
    ['compatible-paraphrase', compatParaphrase],
    ['compatible-related', compatRelated],
  ] as [string, ScoredPair[]][]) {
    const pc = rows.map(r => r.probs[0]).sort((a, b) => a - b);
    const mg = rows.map(r => r.margin).sort((a, b) => a - b);
    const med = (xs: number[]) => xs[Math.floor(xs.length / 2)];
    console.log(
      `${name.padEnd(24)}  ${String(rows.length).padStart(2)}    ${pc[0].toFixed(4)} / ${med(pc).toFixed(4)} / ${pc[pc.length - 1].toFixed(4)}` +
      `        ${mg[0].toFixed(2).padStart(6)} / ${med(mg).toFixed(2).padStart(6)} / ${mg[mg.length - 1].toFixed(2).padStart(6)}`
    );
  }

  const ctMinProb = Math.min(...contradiction.map(r => r.probs[0]));
  const cpMaxProb = Math.max(...compatParaphrase.map(r => r.probs[0]));
  const crMaxProb = Math.max(...compatRelated.map(r => r.probs[0]));
  const ctMinMargin = Math.min(...contradiction.map(r => r.margin));
  const cpMaxMargin = Math.max(...compatParaphrase.map(r => r.margin));
  const crMaxMargin = Math.max(...compatRelated.map(r => r.margin));
  console.log(`\ncontradiction min P (${ctMinProb.toFixed(4)}) vs. compatible-paraphrase max P (${cpMaxProb.toFixed(4)}): gap = ${(ctMinProb - cpMaxProb).toFixed(4)} ${ctMinProb > cpMaxProb ? '(separated)' : '(OVERLAP)'}`);
  console.log(`contradiction min P (${ctMinProb.toFixed(4)}) vs. compatible-related max P (${crMaxProb.toFixed(4)}): gap = ${(ctMinProb - crMaxProb).toFixed(4)} ${ctMinProb > crMaxProb ? '(separated)' : '(OVERLAP)'}`);
  console.log(`contradiction min margin (${ctMinMargin.toFixed(2)}) vs. compatible-paraphrase max margin (${cpMaxMargin.toFixed(2)}): gap = ${(ctMinMargin - cpMaxMargin).toFixed(2)} ${ctMinMargin > cpMaxMargin ? '(separated)' : '(OVERLAP)'}`);
  console.log(`contradiction min margin (${ctMinMargin.toFixed(2)}) vs. compatible-related max margin (${crMaxMargin.toFixed(2)}): gap = ${(ctMinMargin - crMaxMargin).toFixed(2)} ${ctMinMargin > crMaxMargin ? '(separated)' : '(OVERLAP)'}`);

  // ---------------------------------------------------------------
  // A/B 2 — argmax-only check (does the model's own top class even
  // agree with the label, ignoring any threshold at all)
  // ---------------------------------------------------------------
  console.log('\n=== A/B 2 — argmax agreement (bar-free) ===');
  console.log(`contradiction pairs where argmax != contradiction: ${contradiction.filter(r => r.argmax !== 'contradiction').length}/${contradiction.length}`);
  console.log(`compatible-paraphrase pairs where argmax == contradiction: ${compatParaphrase.filter(r => r.argmax === 'contradiction').length}/${compatParaphrase.length}`);
  console.log(`compatible-related pairs where argmax == contradiction: ${compatRelated.filter(r => r.argmax === 'contradiction').length}/${compatRelated.length}`);

  // ---------------------------------------------------------------
  // A/B 3 — P(contradiction) bar frontier: false-silence vs false-accept
  // ---------------------------------------------------------------
  console.log('\n=== A/B 3 — P(contradiction) bar frontier ===');
  console.log('bar     false-silence (contra missed)   false-accept (paraphrase)   false-accept (related)');
  for (const T of PROB_BAR_SWEEP) {
    const fs_ = contradiction.filter(r => r.probs[0] < T).length;
    const faP = compatParaphrase.filter(r => r.probs[0] >= T).length;
    const faR = compatRelated.filter(r => r.probs[0] >= T).length;
    console.log(
      `${T.toFixed(2).padStart(5)}   ${String(fs_).padStart(4)}/${contradiction.length} = ${(fs_ / contradiction.length * 100).toFixed(0).padStart(3)}%` +
      `                    ${String(faP).padStart(4)}/${compatParaphrase.length} = ${(faP / compatParaphrase.length * 100).toFixed(0).padStart(3)}%` +
      `                   ${String(faR).padStart(4)}/${compatRelated.length} = ${(faR / compatRelated.length * 100).toFixed(0).padStart(3)}%`
    );
  }

  // ---------------------------------------------------------------
  // A/B 4 — raw margin bar frontier (contradiction logit - best of the
  // other two), as an alternative to softmax probability
  // ---------------------------------------------------------------
  console.log('\n=== A/B 4 — raw margin bar frontier ===');
  console.log('bar     false-silence (contra missed)   false-accept (paraphrase)   false-accept (related)');
  for (const T of MARGIN_BAR_SWEEP) {
    const fs_ = contradiction.filter(r => r.margin < T).length;
    const faP = compatParaphrase.filter(r => r.margin >= T).length;
    const faR = compatRelated.filter(r => r.margin >= T).length;
    console.log(
      `${String(T).padStart(5)}   ${String(fs_).padStart(4)}/${contradiction.length} = ${(fs_ / contradiction.length * 100).toFixed(0).padStart(3)}%` +
      `                    ${String(faP).padStart(4)}/${compatParaphrase.length} = ${(faP / compatParaphrase.length * 100).toFixed(0).padStart(3)}%` +
      `                   ${String(faR).padStart(4)}/${compatRelated.length} = ${(faR / compatRelated.length * 100).toFixed(0).padStart(3)}%`
    );
  }

  console.log('\ndone.');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
