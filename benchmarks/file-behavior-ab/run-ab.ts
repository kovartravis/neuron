/**
 * Ticket 3 (Map — Cross-Referenced Recall: Scan, Git & Decisions): three-way
 * A/B on how to capture "what a file actually does" using only local models
 * already in this repo's stack.
 *
 * - **deterministic** — no model call. Extends today's shipped signal
 *   (exported symbol names, the shape `summarizer.ts` already produces)
 *   with real call-graph and control-flow facts pulled from the file's own
 *   body, templated into a sentence.
 * - **retrieval** — embeds the same extracted facts with the existing
 *   bge-small-en-v1.5 embedder, retrieves the nearest real entry from this
 *   repo's own decisions/architecture/learning categories (leave-one-out:
 *   any candidate mentioning the target file's own path is excluded, so a
 *   file can't retrieve a scan-generated card describing itself).
 * - **generative** — the shipped Xenova/Qwen1.5-0.5B-Chat, few-shot
 *   prompted with the same extracted facts, asked for one sentence.
 *
 * All three receive the identical extracted-facts input, built from each
 * file with its own human-authored purpose header stripped out first (see
 * corpus.ts's `stripLines`) — none of the three ever sees the header. Each
 * mode's output is then scored by cosine similarity (bge-small-en-v1.5)
 * against that withheld header, the gold reference a human already wrote.
 *
 * Run: npx tsx benchmarks/file-behavior-ab/run-ab.ts
 */
import fs from 'node:fs';
import path from 'node:path';
import { CASES, type FileCase } from './corpus.js';
import { TransformersEmbedder } from '../../src/components/embedder.js';

const REPO_ROOT = path.join(import.meta.dirname, '..', '..');

// ---------------------------------------------------------------------------
// Fact extraction (shared input for the deterministic and generative modes)
// ---------------------------------------------------------------------------

interface ExtractedFacts {
  strippedSource: string;
  exports: { kind: string; name: string }[];
  symbolDocs: { name: string; doc: string }[];
  calls: { caller: string; callees: string[] }[];
  controlFlow: { tryCatch: number; loops: number; branches: number };
  factsText: string; // rendered bullet form, fed to deterministic template + generator prompt
}

function stripHeader(source: string, [start, end]: [number, number]): string {
  const lines = source.split('\n');
  return [...lines.slice(0, start - 1), ...lines.slice(end)].join('\n');
}

function extractFacts(stripped: string): ExtractedFacts {
  const exportRe = /export\s+(async\s+function|function|class|const|interface|type)\s+(\w+)/g;
  const exports: { kind: string; name: string }[] = [];
  let m: RegExpExecArray | null;
  while ((m = exportRe.exec(stripped))) {
    exports.push({ kind: m[1].replace('async ', ''), name: m[2] });
  }

  // Per-symbol JSDoc: a /** ... */ block immediately (only whitespace
  // between) preceding one of the exported declarations found above.
  // A non-global lazy match picks the LEFTMOST starting '/**' that can
  // *eventually* reach a valid end-of-string close — which, across a file
  // with several earlier unrelated comments, is often the first comment in
  // the file, engulfing everything up to the real one via lazy extension.
  // Iterating all blocks with a global regex and keeping the last one
  // avoids that: each block is matched independently, so extension can
  // never span past one block's own '*/' into another's.
  const symbolDocs: { name: string; doc: string }[] = [];
  for (const exp of exports) {
    const declIdxRe = new RegExp(`export\\s+(?:async\\s+)?(?:function|class|const|interface|type)\\s+${exp.name}\\b`);
    const declMatch = declIdxRe.exec(stripped);
    if (!declMatch) continue;
    const before = stripped.slice(0, declMatch.index);
    const blockRe = /\/\*\*[\s\S]*?\*\//g;
    let lastBlock: RegExpExecArray | null = null;
    let bm: RegExpExecArray | null;
    while ((bm = blockRe.exec(before))) lastBlock = bm;
    if (lastBlock) {
      const afterBlock = before.slice(lastBlock.index + lastBlock[0].length);
      if (/^\s*$/.test(afterBlock)) {
        const doc = lastBlock[0].replace(/\/\*\*|\*\//g, '').split('\n').map(l => l.replace(/^\s*\*\s?/, '').trim()).filter(Boolean).join(' ');
        if (doc) symbolDocs.push({ name: exp.name, doc });
      }
    }
  }

  // Call graph: within a naive slice from each export's declaration to the
  // next top-level export (or EOF), find calls to identifiers that are
  // themselves declared/imported names in this file.
  const declaredNames = new Set<string>(exports.map(e => e.name));
  const importRe = /import\s*\{([^}]+)\}/g;
  while ((m = importRe.exec(stripped))) {
    for (const part of m[1].split(',')) {
      const name = part.trim().split(/\s+as\s+/).pop()?.trim();
      if (name) declaredNames.add(name);
    }
  }
  const exportStarts = exports.map(e => ({
    name: e.name,
    idx: stripped.search(new RegExp(`export\\s+(?:async\\s+)?(?:function|class|const|interface|type)\\s+${e.name}\\b`)),
  })).filter(e => e.idx >= 0).sort((a, b) => a.idx - b.idx);

  const calls: { caller: string; callees: string[] }[] = [];
  for (let i = 0; i < exportStarts.length; i++) {
    const start = exportStarts[i].idx;
    const end = i + 1 < exportStarts.length ? exportStarts[i + 1].idx : stripped.length;
    const body = stripped.slice(start, end);
    const callees = new Set<string>();
    const callRe = /\b([A-Za-z_$][\w$]*)\s*\(/g;
    let cm: RegExpExecArray | null;
    while ((cm = callRe.exec(body))) {
      const name = cm[1];
      if (declaredNames.has(name) && name !== exportStarts[i].name) callees.add(name);
    }
    if (callees.size > 0) calls.push({ caller: exportStarts[i].name, callees: [...callees] });
  }

  const controlFlow = {
    tryCatch: (stripped.match(/\btry\s*\{/g) || []).length,
    loops: (stripped.match(/\b(for|while)\s*\(/g) || []).length,
    branches: (stripped.match(/\bif\s*\(/g) || []).length,
  };

  const factsLines: string[] = [];
  factsLines.push(`Exports: ${exports.map(e => `${e.name} (${e.kind})`).join(', ') || 'none'}`);
  if (symbolDocs.length) {
    factsLines.push(`Symbol notes: ${symbolDocs.map(s => `${s.name} — ${s.doc}`).join(' | ')}`);
  }
  if (calls.length) {
    factsLines.push(`Calls: ${calls.map(c => `${c.caller} calls ${c.callees.join(', ')}`).join('; ')}`);
  }
  factsLines.push(`Control flow: ${controlFlow.tryCatch} try/catch, ${controlFlow.loops} loop(s), ${controlFlow.branches} branch(es)`);

  return { strippedSource: stripped, exports, symbolDocs, calls, controlFlow, factsText: factsLines.join('\n') };
}

// ---------------------------------------------------------------------------
// Mode 3 — deeper deterministic (no model call)
// ---------------------------------------------------------------------------

function deterministicDescribe(facts: ExtractedFacts): string {
  const parts: string[] = [];
  if (facts.exports.length) {
    parts.push(`Exports ${facts.exports.map(e => `\`${e.name}\` (${e.kind})`).join(', ')}.`);
  }
  for (const s of facts.symbolDocs) {
    parts.push(`\`${s.name}\`: ${s.doc}`);
  }
  for (const c of facts.calls) {
    parts.push(`\`${c.caller}\` calls ${c.callees.map(x => `\`${x}\``).join(', ')}.`);
  }
  const cf = facts.controlFlow;
  const cfParts: string[] = [];
  if (cf.tryCatch > 0) cfParts.push(`${cf.tryCatch} error-handling block(s)`);
  if (cf.loops > 0) cfParts.push(`${cf.loops} loop(s)`);
  if (cf.branches > 0) cfParts.push(`${cf.branches} conditional branch(es)`);
  if (cfParts.length) parts.push(`Includes ${cfParts.join(', ')}.`);
  return parts.join(' ') || 'No exported symbols detected.';
}

// ---------------------------------------------------------------------------
// Mode 1 — generative (Xenova/Qwen1.5-0.5B-Chat, few-shot)
// ---------------------------------------------------------------------------

function shot(user: string, assistant: string): string {
  return `<|im_start|>user\n${user}<|im_end|>\n<|im_start|>assistant\n${assistant}<|im_end|>\n`;
}

const FEW_SHOT_EXAMPLES = [
  shot(
    'Exports: TransformersEmbedder (class)\nSymbol notes: embed — Lazily loads the bge-small-en-v1.5 pipeline and returns a normalized embedding.\nCalls: embedQuery calls embed\nControl flow: 0 try/catch, 0 loop(s), 1 branch(es)',
    'Wraps the bge-small-en-v1.5 embedding pipeline behind a lazily-loaded singleton, with embedQuery prefixing the search-instruction template before delegating to embed.'
  ),
  shot(
    'Exports: withTimeout (function), TimeoutError (class)\nCalls: withTimeout calls TimeoutError\nControl flow: 1 try/catch, 0 loop(s), 1 branch(es)',
    'Races a promise against a timer, rejecting with a dedicated TimeoutError if the promise has not settled by the deadline.'
  ),
];

async function generativeDescribe(facts: ExtractedFacts): Promise<string> {
  const { pipeline, env } = await import('@huggingface/transformers');
  const path2 = await import('node:path');
  const os2 = await import('node:os');
  const modelCacheDir = path2.join(os2.homedir(), 'Library/Application Support/neuron/models');
  env.cacheDir = modelCacheDir;
  env.useFSCache = true;
  if (!generativeDescribe.generator) {
    generativeDescribe.generator = await pipeline('text-generation', 'Xenova/Qwen1.5-0.5B-Chat', { dtype: 'q4' });
  }
  const generator = generativeDescribe.generator;
  const prompt = `<|im_start|>system
Describe in one sentence what this file does, based only on the facts given. Do not invent details not in the facts.<|im_end|>
${FEW_SHOT_EXAMPLES.join('')}<|im_start|>user
${facts.factsText}<|im_end|>
<|im_start|>assistant
`;
  const output = await generator(prompt, { max_new_tokens: 60, return_full_text: false });
  const text = output?.[0]?.generated_text;
  return typeof text === 'string' ? text.trim().split('\n')[0] : '(generation failed)';
}
namespace generativeDescribe { export let generator: any = null; }

// ---------------------------------------------------------------------------
// Mode 2 — retrieval (existing embedder against real decisions/architecture/learning entries)
// ---------------------------------------------------------------------------

interface RetrievalEntry { category: string; content: string; }

function loadRetrievalCorpus(): RetrievalEntry[] {
  const out: RetrievalEntry[] = [];
  for (const [file, category] of [
    ['architecture-dump.json', 'architecture'],
    ['decisions-dump.json', 'decisions'],
    ['learning-dump.json', 'learning'],
  ] as const) {
    const p = path.join(process.env.CLAUDE_JOB_TMP || '', file);
    if (!fs.existsSync(p)) continue;
    const rows = JSON.parse(fs.readFileSync(p, 'utf-8'));
    for (const r of rows) out.push({ category, content: r.content });
  }
  return out;
}

function cosine(a: Float32Array, b: Float32Array): number {
  let dot = 0;
  for (let i = 0; i < a.length; i++) dot += a[i] * b[i];
  return dot;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const embedder = new TransformersEmbedder();
  const corpus = loadRetrievalCorpus();
  console.log(`retrieval corpus: ${corpus.length} entries`);
  console.log(`embedding retrieval corpus...`);
  const corpusVecs = await Promise.all(corpus.map(c => embedder.embed(c.content.slice(0, 2000))));

  const rows: any[] = [];

  for (const kase of CASES) {
    const fullPath = path.join(REPO_ROOT, kase.path);
    const source = fs.readFileSync(fullPath, 'utf-8');
    const stripped = stripHeader(source, kase.stripLines);
    const facts = extractFacts(stripped);

    console.log(`\n--- ${kase.id} (${kase.path}) ---`);
    console.log(facts.factsText);

    const detOut = deterministicDescribe(facts);
    console.log(`[deterministic] ${detOut}`);

    let genOut: string;
    try {
      genOut = await generativeDescribe(facts);
    } catch (err) {
      genOut = `(generation error: ${err})`;
    }
    console.log(`[generative]    ${genOut}`);

    const queryVec = await embedder.embedQuery(facts.factsText);
    const candidates = corpus
      .map((c, i) => ({ c, sim: cosine(queryVec, corpusVecs[i]) }))
      .filter(({ c }) => !c.content.includes(kase.path)) // leave-one-out
      .sort((a, b) => b.sim - a.sim);
    const retOut = candidates[0]?.c.content ?? '(no retrieval candidate)';
    console.log(`[retrieval]     (nearest sim=${candidates[0]?.sim.toFixed(4)}, category=${candidates[0]?.c.category}) ${retOut.slice(0, 200)}...`);

    const [goldVec, detVec, genVec, retVec] = await Promise.all([
      embedder.embed(kase.gold),
      embedder.embed(detOut),
      embedder.embed(genOut),
      embedder.embed(retOut),
    ]);

    const scores = {
      deterministic: cosine(goldVec, detVec),
      generative: cosine(goldVec, genVec),
      retrieval: cosine(goldVec, retVec),
    };
    console.log(`scores: deterministic=${scores.deterministic.toFixed(4)} generative=${scores.generative.toFixed(4)} retrieval=${scores.retrieval.toFixed(4)}`);

    rows.push({ id: kase.id, path: kase.path, gold: kase.gold, factsText: facts.factsText, outputs: { deterministic: detOut, generative: genOut, retrieval: retOut }, scores });
  }

  const rawOut = { timestamp: new Date().toISOString(), rows };
  const rawPath = path.join(import.meta.dirname, 'raw-scores.json');
  fs.writeFileSync(rawPath, JSON.stringify(rawOut, null, 2));
  console.log(`\nraw scores written: ${rawPath}`);

  console.log('\n=== Summary: cosine(mode output, gold) ===');
  for (const mode of ['deterministic', 'generative', 'retrieval'] as const) {
    const vals = rows.map(r => r.scores[mode]).sort((a, b) => a - b);
    const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
    const med = vals[Math.floor(vals.length / 2)];
    console.log(`${mode.padEnd(14)} n=${vals.length}  min=${vals[0].toFixed(4)}  median=${med.toFixed(4)}  mean=${mean.toFixed(4)}  max=${vals[vals.length - 1].toFixed(4)}`);
  }
  const wins: Record<string, number> = { deterministic: 0, generative: 0, retrieval: 0 };
  for (const r of rows) {
    const best = (['deterministic', 'generative', 'retrieval'] as const).reduce((a, b) => r.scores[a] >= r.scores[b] ? a : b);
    wins[best]++;
  }
  console.log('\nper-file winner counts:', wins);

  console.log('\ndone.');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
