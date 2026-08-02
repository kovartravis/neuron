#!/usr/bin/env node
// Experiment 1 runner: scores A1 (recoverability binary) and A2 (recalibrated
// 1-5 scale) against the ground-truth labels in labels.json, using the real
// shipped Qwen1.5-0.5B-Chat model (NODE_ENV must NOT be 'test', which
// hard-disables the model per src/components/enricher.ts:232).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// .scratch/configurable-pruning/, two levels up from scripts/run_exp1.mjs
const REPO = path.resolve(__dirname, '..', '..', '..');
const { getTextGenerator } = await import(path.join(REPO, 'src/components/generator.ts'));
const { parseImportance } = await import(path.join(REPO, 'src/components/enricher.ts'));

const SCRATCH = path.resolve(__dirname, '..');

function shot(user, assistant) {
  return `<|im_start|>user\n${user}<|im_end|>\n<|im_start|>assistant\n${assistant}<|im_end|>\n`;
}

// --- A1: recoverability binary --------------------------------------------
// First cut asked for the bare words RECOVERABLE/UNRECOVERABLE, mirroring
// the plan's prose. A 4-token smoke test showed that fails badly: at 0.5B
// scale a multi-token word answer frequently garbles ("UNRE回来了",
// "UNREMATCHABLE") before completing, and a naive substring parse on a
// mangled "UNRE recoverable" flips the verdict to its OPPOSITE meaning —
// exactly the false-delete failure mode this experiment exists to catch.
// Re-cut as a single-token Y/N answer, the same shape as A2's proven
// single-digit format (ticket 06 measured bare-token compliance for digits).
// Worked examples are the maintainer's own two examples from
// ab-test-plan.md section 3, verbatim, translated to the new output token.
function buildA1Prompt(content) {
  return `<|im_start|>system
Could this note be reconstructed from the repository's code, git history, or docs?
Reply with exactly one letter: Y if yes (recoverable), N if no (unrecoverable).<|im_end|>
${shot(
    "Implemented ticket 03-hybrid-retrieval-rrf-engine via TDD: rewrote query() to run FTS5 keyword search and vector search in parallel, merge via RRF.",
    'Y'
  )}${shot(
    "`neuron exec` runs the global binary, so a stale 2.1.0 install silently re-baselined the card — `npm link` before verifying a release.",
    'N'
  )}<|im_start|>user
${content.slice(0, 700)}<|im_end|>
<|im_start|>assistant
`;
}

function parseA1(raw) {
  const trimmed = raw.trim();
  // Bare-token case first (this is what the model does >90% of the time
  // once shot as a single letter, mirroring A2's digit behaviour).
  const first = trimmed[0]?.toUpperCase();
  if (first === 'Y') return 'recoverable';
  if (first === 'N') return 'unrecoverable';
  // Fallback for the rare verbose answer, longest-alternative-first so
  // "UNRECOVERABLE" cannot be mis-matched by the "RECOVERABLE" suffix it
  // contains.
  const upper = trimmed.toUpperCase();
  if (/\bNO\b|\bUNRECOVERABLE\b/.test(upper)) return 'unrecoverable';
  if (/\bYES\b|\bRECOVERABLE\b/.test(upper)) return 'recoverable';
  return undefined;
}

// --- A2: recalibrated 1-5 scale --------------------------------------------
// Exemplars are real entries from this session's own label set (labels.json),
// one per observed grade, replacing the generic invented exemplars in
// src/components/enricher.ts:290-304.
function buildA2Prompt(content) {
  return `<|im_start|>system
Rate how important it is to keep this note. Reply with one digit from 1 to 5.
5 = losing it destroys a specific, non-obvious finding recorded nowhere else.
3 = ordinary project activity, reconstructible from git or docs if lost.
1 = duplicated elsewhere in the store or carries no information at all.<|im_end|>
${shot(
    'Updated benchmark configuration to use gemini-2.5-flash which provides 1,500 RPD daily free quota. Verified model API calls with HTTP 200 OK responses and launched the full 589-query benchmark run in the background.',
    '1'
  )}${shot(
    'Implemented ticket 03-hybrid-retrieval-rrf-engine via TDD: rewrote query() to run FTS5 keyword search and vector search in parallel, merge via RRF (k=60), normalize, and combine 75% RRF + 25% importance.',
    '2'
  )}${shot(
    'Discovered that Agent Memory Benchmark _save method in runner.py calculates overall accuracy by averaging r.score over merged query results if any result has a non-None score, poisoning subsequent runs.',
    '3'
  )}${shot(
    'Challenged MdStorageAdapter implementation; rejected due to catastrophic frontmatter parsing breakdown, test fabrication, content mutation, and path traversal security flaw.',
    '4'
  )}${shot(
    "Critical trap when dogfooding neuron on its own repo: CLAUDE.md mandates wrapping commands in 'neuron exec', but 'neuron exec' resolves the GLOBALLY installed neuron from PATH, not the repo source.",
    '5'
  )}<|im_start|>user
${content.slice(0, 700)}<|im_end|>
<|im_start|>assistant
`;
}

async function generate(generator, prompt, maxNewTokens) {
  const t0 = Date.now();
  try {
    const output = await generator(prompt, { max_new_tokens: maxNewTokens, return_full_text: false });
    const text = output?.[0]?.generated_text;
    const ms = Date.now() - t0;
    if (typeof text !== 'string' || text.trim().length === 0) return { degraded: 'empty_generation', ms };
    return { text, ms };
  } catch (err) {
    return { degraded: 'model_error: ' + String(err?.message ?? err), ms: Date.now() - t0 };
  }
}

async function main() {
  if (process.env.NODE_ENV === 'test') {
    console.error('NODE_ENV=test hard-disables the model. Unset it and re-run.');
    process.exit(1);
  }

  const labelData = JSON.parse(fs.readFileSync(path.join(SCRATCH, 'labels.json'), 'utf8'));
  const history = JSON.parse(fs.readFileSync(path.join(SCRATCH, 'history_entries.json'), 'utf8'));
  const controls = JSON.parse(fs.readFileSync(path.join(SCRATCH, 'control_entries.json'), 'utf8'));
  const contentById = new Map([...history, ...controls].map(e => [e.id, e.content]));

  console.log(`Loading generator (Qwen1.5-0.5B-Chat, first load ~3.2s)...`);
  const generator = await getTextGenerator((p) => { if (p.phase) process.stdout.write('.'); });
  if (!generator) {
    console.error('Model unavailable — cannot run Experiment 1.');
    process.exit(1);
  }
  console.log(' loaded.');

  const results = [];
  let i = 0;
  for (const label of labelData.labels) {
    i++;
    const content = contentById.get(label.id);
    if (!content) { console.error(`missing content for ${label.id}`); continue; }

    const a1raw = await generate(generator, buildA1Prompt(content), 4);
    const a1verdict = a1raw.text ? parseA1(a1raw.text) : undefined;
    const a1importance = a1verdict === 'recoverable' ? 2 : a1verdict === 'unrecoverable' ? 4 : undefined;

    const a2raw = await generate(generator, buildA2Prompt(content), 4);
    const a2importance = a2raw.text ? parseImportance(a2raw.text) : undefined;

    results.push({
      id: label.id,
      category: label.category,
      ground_truth_recoverable: label.recoverable,
      ground_truth_grade: label.grade,
      a1: {
        raw: a1raw.text ?? null, degraded: a1raw.degraded ?? null,
        verdict: a1verdict ?? null, importance: a1importance ?? null, ms: a1raw.ms,
      },
      a2: {
        raw: a2raw.text ?? null, degraded: a2raw.degraded ?? null,
        importance: a2importance ?? null, ms: a2raw.ms,
      },
    });

    if (i % 20 === 0 || i === labelData.labels.length) {
      console.log(`  ${i}/${labelData.labels.length} scored`);
    }
  }

  fs.writeFileSync(path.join(SCRATCH, 'exp1_raw.json'), JSON.stringify(results, null, 2));
  console.log(`Wrote exp1_raw.json (${results.length} entries scored on both arms).`);
}

main();
