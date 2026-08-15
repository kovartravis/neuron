/**
 * Ticket 13 (neuron-2.4.2): A/B tests alternative pretrained NLI
 * cross-encoders against the exact same corpus and method Ticket 8 used
 * (`benchmarks/nli-polarity-ab/corpus.ts`, `run-ab.ts`) to see whether a
 * hard-block posture can be justified after all — no new corpus, no new
 * evaluation method, only the model under test changes.
 *
 * Ticket 8 found `cross-encoder/nli-MiniLM2-L6-H768` (SNLI+MultiNLI only)
 * cannot separate contradiction from compatible-related pairs at any bar,
 * traced to an SNLI/MultiNLI annotation artifact. Per Ticket 11's
 * resolution, this shortlist prioritizes models trained (also) on ANLI —
 * collected specifically to counter that artifact — plus one larger
 * SNLI/MultiNLI-only model as a control (tests whether bigger-same-data
 * reproduces the bias or fixes it).
 *
 * Unlike `run-ab.ts`, this script does NOT assume a fixed id2label index
 * order — Ticket 8's model happened to use {0: contradiction, 1:
 * entailment, 2: neutral}, but candidates here use a different order
 * ({0: entailment, 1: neutral, 2: contradiction}), confirmed by fetching
 * each model's config.json before committing to this shortlist. The label
 * index for each class is resolved per-model from its own config.
 *
 * Run: npx tsx benchmarks/nli-polarity-ab/run-ab-alt-models.ts
 */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { CORPUS, type PolarityLabel } from './corpus.js';

interface Candidate {
  id: string;
  slug: string;
  role: 'anli' | 'control';
  trainedOn: string;
  params: string;
  license: string;
}

const MODELS: Candidate[] = [
  {
    id: 'Xenova/DeBERTa-v3-base-mnli-fever-anli',
    slug: 'anli-base',
    role: 'anli',
    trainedOn: 'MultiNLI + Fever-NLI + ANLI (763,913 pairs, no SNLI)',
    params: '~184M (deberta-v3-base)',
    license: 'MIT',
  },
  {
    id: 'Xenova/DeBERTa-v3-large-mnli-fever-anli-ling-wanli',
    slug: 'anli-large',
    role: 'anli',
    trainedOn: 'MultiNLI + Fever-NLI + ANLI + LingNLI + WANLI (885,242 pairs, no SNLI)',
    params: '~400M (deberta-v3-large)',
    license: 'MIT',
  },
  {
    id: 'Xenova/nli-deberta-v3-large',
    slug: 'control-large-snli-mnli',
    role: 'control',
    trainedOn: 'SNLI + MultiNLI only (no ANLI) — control for bigger-same-data',
    params: '~400M (deberta-v3-large)',
    license: 'Apache-2.0',
  },
];

const PROB_BAR_SWEEP = [0.5, 0.6, 0.7, 0.75, 0.8, 0.85, 0.9, 0.95, 0.98, 0.99];

interface ScoredPair {
  id: string;
  label: PolarityLabel;
  premise: string;
  hypothesis: string;
  logits: [number, number, number]; // [contradiction, entailment, neutral] — normalized order, regardless of this model's own raw index order
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

function resolveLabelIndices(id2label: Record<string, string>): { contradiction: number; entailment: number; neutral: number } {
  const find = (needle: string) => {
    for (const [idx, name] of Object.entries(id2label)) {
      if (name.toLowerCase() === needle) return Number(idx);
    }
    throw new Error(`id2label has no '${needle}' entry: ${JSON.stringify(id2label)}`);
  };
  return { contradiction: find('contradiction'), entailment: find('entailment'), neutral: find('neutral') };
}

async function runModel(candidate: Candidate) {
  const { AutoTokenizer, AutoModelForSequenceClassification, env } = await import('@huggingface/transformers');
  const modelCacheDir = path.join(os.homedir(), 'Library/Application Support/neuron/models');
  env.cacheDir = modelCacheDir;
  env.useFSCache = true;

  console.log(`\n${'='.repeat(70)}`);
  console.log(`loading ${candidate.id} (${candidate.role}, ${candidate.params})...`);
  const t0 = Date.now();
  const tokenizer = await AutoTokenizer.from_pretrained(candidate.id);
  const model = await AutoModelForSequenceClassification.from_pretrained(candidate.id);
  const id2label = model.config.id2label as Record<string, string>;
  console.log(`id2label: ${JSON.stringify(id2label)} (loaded in ${((Date.now() - t0) / 1000).toFixed(0)}s)`);
  const idx = resolveLabelIndices(id2label);
  console.log(`resolved indices: contradiction=${idx.contradiction} entailment=${idx.entailment} neutral=${idx.neutral}`);

  console.log('scoring...');
  const results: ScoredPair[] = [];
  const tScoreStart = Date.now();
  for (let i = 0; i < CORPUS.length; i++) {
    const p = CORPUS[i];
    const inputs = tokenizer(p.premise, { text_pair: p.hypothesis, padding: true, truncation: true });
    const { logits: rawLogits } = await model(inputs);
    const raw = Array.from(rawLogits.data) as number[];
    // normalize to [contradiction, entailment, neutral] regardless of this model's own raw order
    const logits: [number, number, number] = [raw[idx.contradiction], raw[idx.entailment], raw[idx.neutral]];
    const probs = softmax(logits) as [number, number, number];
    const argmaxIdx = logits.indexOf(Math.max(...logits));
    const argmax = (['contradiction', 'entailment', 'neutral'] as const)[argmaxIdx];
    const margin = logits[0] - Math.max(logits[1], logits[2]);
    results.push({ id: p.id, label: p.label, premise: p.premise, hypothesis: p.hypothesis, logits, probs, argmax, margin });
    const el = ((Date.now() - tScoreStart) / 1000).toFixed(0);
    console.log(`  [${i + 1}/${CORPUS.length}] ${p.id} (${p.label}) argmax=${argmax} P(contradiction)=${probs[0].toFixed(4)} margin=${margin.toFixed(2)}  (${el}s elapsed)`);
  }

  const rawOut = { timestamp: new Date().toISOString(), model: candidate.id, candidate, id2label, results };
  const rawPath = path.join(import.meta.dirname, `raw-scores-${candidate.slug}.json`);
  fs.writeFileSync(rawPath, JSON.stringify(rawOut, null, 2));
  console.log(`raw scores written: ${rawPath}`);

  return results;
}

function report(candidate: Candidate, results: ScoredPair[]) {
  const byLabel = (label: PolarityLabel) => results.filter(r => r.label === label);
  const contradiction = byLabel('contradiction');
  const compatParaphrase = byLabel('compatible-paraphrase');
  const compatRelated = byLabel('compatible-related');

  console.log(`\n--- ${candidate.slug} (${candidate.id}) ---`);
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

  console.log(`argmax: contradiction pairs where argmax != contradiction: ${contradiction.filter(r => r.argmax !== 'contradiction').length}/${contradiction.length}`);
  console.log(`argmax: compatible-paraphrase pairs where argmax == contradiction: ${compatParaphrase.filter(r => r.argmax === 'contradiction').length}/${compatParaphrase.length}`);
  console.log(`argmax: compatible-related pairs where argmax == contradiction: ${compatRelated.filter(r => r.argmax === 'contradiction').length}/${compatRelated.length}`);

  console.log('\nbar frontier (P(contradiction)):');
  console.log('bar     false-silence (contra missed)   false-accept (paraphrase)   false-accept (related)');
  let bestBar: { bar: number; fs: number; faR: number } | null = null;
  for (const T of PROB_BAR_SWEEP) {
    const fs_ = contradiction.filter(r => r.probs[0] < T).length;
    const faP = compatParaphrase.filter(r => r.probs[0] >= T).length;
    const faR = compatRelated.filter(r => r.probs[0] >= T).length;
    console.log(
      `${T.toFixed(2).padStart(5)}   ${String(fs_).padStart(4)}/${contradiction.length} = ${(fs_ / contradiction.length * 100).toFixed(0).padStart(3)}%` +
      `                    ${String(faP).padStart(4)}/${compatParaphrase.length} = ${(faP / compatParaphrase.length * 100).toFixed(0).padStart(3)}%` +
      `                   ${String(faR).padStart(4)}/${compatRelated.length} = ${(faR / compatRelated.length * 100).toFixed(0).padStart(3)}%`
    );
    const jointWorst = Math.max(fs_ / contradiction.length, faR / compatRelated.length);
    if (!bestBar || jointWorst < Math.max(bestBar.fs / contradiction.length, bestBar.faR / compatRelated.length)) {
      bestBar = { bar: T, fs: fs_, faR };
    }
  }
  const bestFsPct = bestBar ? (bestBar.fs / contradiction.length * 100).toFixed(0) : '?';
  const bestFaRPct = bestBar ? (bestBar.faR / compatRelated.length * 100).toFixed(0) : '?';
  console.log(`\nbest joint bar in sweep: ${bestBar?.bar} — false-silence ${bestFsPct}%, false-accept-related ${bestFaRPct}%`);
  const clearsJointLow = bestBar !== null && bestBar.fs === 0 && bestBar.faR === 0;
  console.log(`clears joint-low (0%/0%) success criterion: ${clearsJointLow ? 'YES' : 'no'}`);
  return { bestBar, clearsJointLow, contradictionN: contradiction.length, compatRelatedN: compatRelated.length };
}

async function main() {
  console.log(`corpus: ${CORPUS.length} pairs (${CORPUS.filter(p => p.label === 'contradiction').length} contradiction, ${CORPUS.filter(p => p.label === 'compatible-paraphrase').length} compatible-paraphrase, ${CORPUS.filter(p => p.label === 'compatible-related').length} compatible-related)`);

  const summaries: { candidate: Candidate; summary: ReturnType<typeof report> }[] = [];
  for (const candidate of MODELS) {
    const results = await runModel(candidate);
    const summary = report(candidate, results);
    summaries.push({ candidate, summary });
  }

  console.log(`\n${'='.repeat(70)}`);
  console.log('=== Cross-model comparison ===');
  console.log('model                        role      best bar   false-silence   false-accept(related)   clears 0%/0%?');
  for (const { candidate, summary } of summaries) {
    const bar = summary.bestBar?.bar ?? NaN;
    const fsPct = summary.bestBar ? (summary.bestBar.fs / summary.contradictionN * 100).toFixed(0) + '%' : '?';
    const faRPct = summary.bestBar ? (summary.bestBar.faR / summary.compatRelatedN * 100).toFixed(0) + '%' : '?';
    console.log(`${candidate.slug.padEnd(28)} ${candidate.role.padEnd(9)} ${String(bar).padStart(6)}   ${fsPct.padStart(13)}   ${faRPct.padStart(20)}   ${summary.clearsJointLow ? 'YES' : 'no'}`);
  }

  console.log('\ndone.');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
