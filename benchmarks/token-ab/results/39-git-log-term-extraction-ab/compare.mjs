/**
 * Ticket 39: offline, zero-spend comparison of two ways to turn a real
 * prompt into `git log --grep` terms — Intl.Segmenter (built into Node, no
 * new dependency) vs `compromise` (new npm dependency, real noun-phrase
 * extraction), both ranked by cosine similarity to the whole-prompt
 * embedding (this repo's own local ONNX embedder, no LLM call).
 *
 * No live Claude sessions here — ticket 14 already hand-verified that its
 * `gitLogQuery` terms surface the right commit in top results, so the bar
 * for each auto-extraction method is: does it recover the same commit set
 * `searchGitLog` returns for the verified hand-picked terms?
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import nlp from 'compromise';
import { TASKS } from '../../gitlog-tasks.mjs';
import { searchGitLog } from '../../gitlog-search.mjs';
import { TransformersEmbedder } from '../../../../dist/components/embedder.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../../../../');

const STOPWORDS = new Set([
  'this', 'that', 'these', 'those', 'have', 'has', 'had', 'been', 'being',
  'does', 'did', 'doing', 'into', 'onto', 'from', 'with', 'without', 'than',
  'then', 'once', 'more', 'most', 'some', 'such', 'what', 'which', 'when',
  'where', 'while', 'your', 'about', 'after', 'before', 'name', 'every',
  'both', 'each', 'other', 'their', 'there', 'here', 'said', 'call', 'write',
  'answer', 'briefly', 'state', 'task', 'file', 'covered', 'missed',
]);

function segmenterCandidates(text) {
  const seg = new Intl.Segmenter('en', { granularity: 'word' });
  const words = [];
  for (const s of seg.segment(text)) {
    if (!s.isWordLike) continue;
    const w = s.segment.toLowerCase();
    if (w.length < 4 || STOPWORDS.has(w)) continue;
    words.push(s.segment);
  }
  return [...new Set(words)];
}

function compromiseCandidates(text) {
  const doc = nlp(text);
  const nouns = doc.nouns().out('array');
  const cleaned = nouns
    .map(n => n.replace(/^(this|the|a|an)\s+/i, '').replace(/[.:,]+$/, '').trim())
    .filter(n => n.length >= 4 && n.split(/\s+/).length <= 3);
  return [...new Set(cleaned)];
}

function cosine(a, b) {
  let dot = 0;
  for (let i = 0; i < a.length; i++) dot += a[i] * b[i];
  return dot; // both vectors are already normalized by the embedder
}

async function rankByEmbedding(embedder, promptVec, candidates, topK) {
  const scored = [];
  for (const c of candidates) {
    const v = await embedder.embed(c);
    scored.push({ term: c, sim: cosine(promptVec, v) });
  }
  scored.sort((a, b) => b.sim - a.sim);
  return scored.slice(0, topK).map(s => s.term);
}

function commitSet(entries) {
  return new Set(entries.map(e => e.hash));
}

function overlap(a, b) {
  let hits = 0;
  for (const h of a) if (b.has(h)) hits++;
  return hits;
}

// Every task prompt ends with grading-harness scaffolding ("Write your
// answer to /ANSWER.md, then call finish_task") that a real hook would
// never see in a real user prompt — strip it so the comparison reflects
// production input, not this benchmark's own machinery.
function stripHarnessBoilerplate(prompt) {
  return prompt.replace(/\s*Write your answer to \/ANSWER\.md[^.]*\.\s*$/i, '').trim();
}

async function main() {
  const embedder = new TransformersEmbedder();
  const rows = [];

  for (const task of TASKS) {
    const cleanPrompt = stripHarnessBoilerplate(task.prompt);
    const promptVec = await embedder.embed(cleanPrompt);

    const baseline = searchGitLog(repoRoot, task.gitLogQuery, { maxCommits: 6, bodyChars: 240 });
    const baselineHashes = commitSet(baseline);

    const segCandidates = segmenterCandidates(cleanPrompt);
    const segTerms = await rankByEmbedding(embedder, promptVec, segCandidates, 5);
    const segResult = searchGitLog(repoRoot, segTerms, { maxCommits: 6, bodyChars: 240 });
    const segHashes = commitSet(segResult);

    const cmpCandidates = compromiseCandidates(cleanPrompt);
    const cmpTerms = await rankByEmbedding(embedder, promptVec, cmpCandidates, 5);
    const cmpResult = searchGitLog(repoRoot, cmpTerms, { maxCommits: 6, bodyChars: 240 });
    const cmpHashes = commitSet(cmpResult);

    rows.push({
      task: task.id,
      goldQuery: task.gitLogQuery,
      baselineHits: baseline.length,
      baselineHashes: [...baselineHashes],
      segmenter: {
        candidates: segCandidates,
        chosenTerms: segTerms,
        hits: segResult.length,
        overlapWithBaseline: overlap(segHashes, baselineHashes),
      },
      compromise: {
        candidates: cmpCandidates,
        chosenTerms: cmpTerms,
        hits: cmpResult.length,
        overlapWithBaseline: overlap(cmpHashes, baselineHashes),
      },
    });
  }

  console.log(JSON.stringify(rows, null, 2));

  console.log('\n=== Summary ===');
  for (const r of rows) {
    console.log(
      `${r.task}: baseline=${r.baselineHits} hits | ` +
        `segmenter overlap=${r.segmenter.overlapWithBaseline}/${r.baselineHashes.length} terms=${JSON.stringify(r.segmenter.chosenTerms)} | ` +
        `compromise overlap=${r.compromise.overlapWithBaseline}/${r.baselineHashes.length} terms=${JSON.stringify(r.compromise.chosenTerms)}`
    );
  }
}

main();
