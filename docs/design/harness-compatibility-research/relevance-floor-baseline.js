const { DatabaseSync } = require('node:sqlite');
const { TransformersEmbedder } = require('/Users/Travis/Repos/neuron/dist/components/embedder.js');

const DB = process.env.HOME + '/Library/Application Support/neuron/db/a8541890092e7e49.sqlite';

// Prompt-shaped: what a developer actually types at an agent in this repo.
const PROMPT = [
  'fix the failing test in mdVectorSync',
  'why is neuron status reporting zero entries',
  'add a new tree-sitter grammar for ruby',
  'the prune command is deleting things it should not',
  'how do I release a new rc to npm',
  'refactor the storage router so md mode is the default',
  'write a hook that injects memory into claude code',
  'the embedder is slow on cold start, can we cache it',
  'what should the frontmatter schema look like',
  'set up CI for this repo',
  'make the architecture card byte-stable across runs',
  'my cat is sitting on the keyboard',
];

// Keyword-shaped: the form a hand-written `neuron memory query` tends to take.
const KEYWORD = [
  'tree-sitter grammar',
  'pruning importance',
  'markdown storage',
  'enrichment centroid',
  'release publish npm',
  'hook recall harness',
  'scope removal migration',
  'quantum entanglement',
];

function dot(a, b) { let s = 0; for (let i = 0; i < a.length; i++) s += a[i] * b[i]; return s; }
function pct(sorted, p) { return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))]; }

(async () => {
  const db = new DatabaseSync(DB);
  const rows = db.prepare('SELECT id, category, content, embedding FROM memories').all();
  const docs = rows.map(r => ({
    id: r.id, category: r.category,
    content: r.content.slice(0, 70).replace(/\s+/g, ' '),
    vec: new Float32Array(r.embedding.buffer, r.embedding.byteOffset, r.embedding.byteLength / 4),
  }));
  console.log(`store: ${docs.length} entries, dim ${docs[0].vec.length}\n`);

  const emb = new TransformersEmbedder();
  const report = [];

  for (const [label, queries] of [['PROMPT-SHAPED', PROMPT], ['KEYWORD-SHAPED', KEYWORD]]) {
    console.log(`=== ${label} ===`);
    console.log('  r1     r3     r5     r10    med    p90    | query');
    for (const q of queries) {
      const qv = await emb.embedQuery(q);
      const sims = docs.map(d => dot(qv, d.vec)).sort((a, b) => b - a);
      const asc = [...sims].sort((a, b) => a - b);
      const row = { label, q, r1: sims[0], r3: sims[2], r5: sims[4], r10: sims[9], med: pct(asc, 0.5), p90: pct(asc, 0.9) };
      report.push(row);
      console.log(
        `  ${row.r1.toFixed(3)}  ${row.r3.toFixed(3)}  ${row.r5.toFixed(3)}  ${row.r10.toFixed(3)}  ` +
        `${row.med.toFixed(3)}  ${row.p90.toFixed(3)}  | ${q}`
      );
    }
    console.log();
  }

  // Aggregate separation: how far above the store's own median does a top hit sit?
  for (const label of ['PROMPT-SHAPED', 'KEYWORD-SHAPED']) {
    const rs = report.filter(r => r.label === label);
    const avg = k => (rs.reduce((s, r) => s + r[k], 0) / rs.length);
    console.log(
      `${label}: mean r1=${avg('r1').toFixed(3)} r5=${avg('r5').toFixed(3)} r10=${avg('r10').toFixed(3)} ` +
      `median=${avg('med').toFixed(3)} | r1-median gap=${(avg('r1') - avg('med')).toFixed(3)}`
    );
  }

  // The decisive question for a floor: is there a single cutoff that admits the
  // on-topic queries' top hits while rejecting the deliberate off-topic ones?
  const off = report.filter(r => /cat is sitting|quantum/.test(r.q));
  const on = report.filter(r => !/cat is sitting|quantum/.test(r.q));
  console.log(`\noff-topic r1: ${off.map(r => r.r1.toFixed(3)).join(', ')}`);
  console.log(`on-topic  r1 min=${Math.min(...on.map(r => r.r1)).toFixed(3)} max=${Math.max(...on.map(r => r.r1)).toFixed(3)}`);
})();
