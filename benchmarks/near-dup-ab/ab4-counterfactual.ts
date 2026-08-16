/**
 * Ticket 7 (neuron-2.4.2), A/B 4 — counterfactual store-growth measurement.
 *
 * Replays this repo's own live memory store through two clustering passes:
 * - "gate inactive" (today): `getStoreHealth()`'s real, shipped logic —
 *   pairwise raw cosine, union-find, `SUPERSESSION_SIMILARITY_THRESHOLD`
 *   (0.97).
 * - "gate active" (proposed): the same live entries, but pairwise
 *   candidates are widened to the top-N=10 by cosine per entry (A/B 2's
 *   finding: recall saturates at N=5 on the synthetic corpus, N=10 kept
 *   here as a real-store margin) then reranked, union-find on reranker
 *   score >= 3 (A/B 3's chosen bar).
 *
 * This is the only A/B leg that measures the thing the map's Destination
 * actually cares about (store quality on real content), not gate mechanics
 * on a synthetic corpus. Read-only: never writes to the store.
 *
 * Run: npx tsx benchmarks/near-dup-ab/ab4-counterfactual.ts
 */
import fs from 'node:fs';
import path from 'node:path';
import { NeuronMemory, SUPERSESSION_SIMILARITY_THRESHOLD } from '../../src/index.js';
import { TransformersEmbedder } from '../../src/components/embedder.js';
import { TransformersReranker } from '../../src/components/reranker.js';

const N = 10;
const BAR = 3;
const CATEGORIES = ['architecture', 'decisions', 'history', 'learning', 'tickets'];
const TMP_DIR = process.env.AB4_ENTRY_DIR || path.join(process.cwd(), '.ab4-entries');

function dot(a: Float32Array, b: Float32Array): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
}

class UnionFind {
  private parent = new Map<string, string>();
  add(id: string) { if (!this.parent.has(id)) this.parent.set(id, id); }
  find(id: string): string {
    let root = id;
    while (this.parent.get(root) !== root) root = this.parent.get(root)!;
    return root;
  }
  union(a: string, b: string) {
    const ra = this.find(a), rb = this.find(b);
    if (ra !== rb) this.parent.set(ra, rb);
  }
  groups(): Map<string, string[]> {
    const out = new Map<string, string[]>();
    for (const id of this.parent.keys()) {
      const root = this.find(id);
      const bucket = out.get(root);
      if (bucket) bucket.push(id); else out.set(root, [id]);
    }
    return out;
  }
}

async function main() {
  interface Entry { id: string; category: string; content: string }
  const entries: Entry[] = [];
  for (const cat of CATEGORIES) {
    const p = path.join(TMP_DIR, `${cat}.json`);
    const rows = JSON.parse(fs.readFileSync(p, 'utf8'));
    for (const r of rows) {
      if (r.supersededBy) continue; // live only, mirrors getStoreHealth's own filter
      entries.push({ id: r.id, category: r.category, content: r.content });
    }
  }
  console.log(`loaded ${entries.length} live entries across ${CATEGORIES.length} categories`);

  // --- Authoritative baseline: the real, shipped getStoreHealth() -----
  const memory = NeuronMemory.open(process.cwd());
  const health = await memory.getStoreHealth();
  await memory.close?.();
  console.log(`\n[authoritative] getStoreHealth() today: ${health.duplicateGroups.length} duplicate group(s) (threshold ${SUPERSESSION_SIMILARITY_THRESHOLD})`);
  for (const g of health.duplicateGroups) {
    console.log(`  - ${g.entries.length} entries, minSimilarity=${g.minSimilarity.toFixed(4)}: ${g.entries.map(e => `"${e.content.slice(0, 60)}..."`).join(' <-> ')}`);
  }

  // --- Recomputed baseline + proposed gate, same fresh embeddings -----
  // (fresh embeddings so the diff between baseline and proposed is
  // apples-to-apples; sanity-checked against the authoritative pass above)
  const embedder = new TransformersEmbedder();
  const reranker = new TransformersReranker();

  console.log(`\nembedding ${entries.length} live entries...`);
  const vecs = new Map<string, Float32Array>();
  const t0 = Date.now();
  for (let i = 0; i < entries.length; i++) {
    vecs.set(entries[i].id, await embedder.embed(entries[i].content));
    if ((i + 1) % 100 === 0) console.log(`  [${i + 1}/${entries.length}] ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  }

  console.log('\nclustering: recomputed baseline (0.97 cosine)...');
  const ufBaseline = new UnionFind();
  for (const e of entries) ufBaseline.add(e.id);
  let baselineEdges = 0;
  for (let i = 0; i < entries.length; i++) {
    for (let j = i + 1; j < entries.length; j++) {
      const sim = dot(vecs.get(entries[i].id)!, vecs.get(entries[j].id)!);
      if (sim >= SUPERSESSION_SIMILARITY_THRESHOLD) {
        ufBaseline.union(entries[i].id, entries[j].id);
        baselineEdges++;
      }
    }
  }
  const baselineGroups = [...ufBaseline.groups().values()].filter(g => g.length > 1);
  console.log(`recomputed baseline: ${baselineEdges} qualifying edge(s), ${baselineGroups.length} duplicate group(s)`);

  console.log(`\nclustering: proposed gate (widen top-${N} by cosine, rerank, bar>=${BAR})...`);
  const ufProposed = new UnionFind();
  for (const e of entries) ufProposed.add(e.id);
  const newPairs: { a: Entry; b: Entry; cosine: number; rerank: number }[] = [];
  let rerankCalls = 0;
  const t1 = Date.now();
  for (let i = 0; i < entries.length; i++) {
    const e = entries[i];
    const ev = vecs.get(e.id)!;
    const scored = entries
      .filter(o => o.id !== e.id)
      .map(o => ({ entry: o, cosine: dot(ev, vecs.get(o.id)!) }))
      .sort((a, b) => b.cosine - a.cosine)
      .slice(0, N);
    for (const cand of scored) {
      const score = await reranker.score(e.content, cand.entry.content);
      rerankCalls++;
      if (score >= BAR) {
        const wasAlreadyLinked = ufBaseline.find(e.id) === ufBaseline.find(cand.entry.id);
        ufProposed.union(e.id, cand.entry.id);
        if (!wasAlreadyLinked) {
          newPairs.push({ a: e, b: cand.entry, cosine: cand.cosine, rerank: score });
        }
      }
    }
    if ((i + 1) % 100 === 0) console.log(`  [${i + 1}/${entries.length}] ${((Date.now() - t1) / 1000).toFixed(0)}s, ${rerankCalls} reranker calls so far`);
  }
  const proposedGroups = [...ufProposed.groups().values()].filter(g => g.length > 1);
  console.log(`\nproposed gate: ${rerankCalls} reranker calls, ${proposedGroups.length} duplicate group(s)`);

  console.log(`\n=== A/B 4 — counterfactual diff ===`);
  console.log(`today (0.97 cosine, authoritative getStoreHealth()):  ${health.duplicateGroups.length} group(s)`);
  console.log(`today (0.97 cosine, recomputed, sanity check):        ${baselineGroups.length} group(s)`);
  console.log(`proposed (widen-${N}/rerank/bar-${BAR}):                    ${proposedGroups.length} group(s)`);
  // Dedup newPairs (i,j) vs (j,i) double counting
  const seen = new Set<string>();
  const uniqueNewPairs = newPairs.filter(p => {
    const key = [p.a.id, p.b.id].sort().join('|');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  console.log(`\nnew pairs the proposed gate catches that today's 0.97 gate does not: ${uniqueNewPairs.length}`);
  const outDir = path.join(import.meta.dirname, '..', 'reports');
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, 'near-dup-ab4-counterfactual.json');
  fs.writeFileSync(outPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    liveEntryCount: entries.length,
    authoritativeBaselineGroups: health.duplicateGroups.length,
    recomputedBaselineGroups: baselineGroups.length,
    proposedGroups: proposedGroups.length,
    newPairs: uniqueNewPairs.map(p => ({
      aId: p.a.id, aCategory: p.a.category, aContent: p.a.content,
      bId: p.b.id, bCategory: p.b.category, bContent: p.b.content,
      cosine: p.cosine, rerank: p.rerank,
    })),
  }, null, 2));
  console.log(`written: ${outPath}`);

  console.log(`\n--- sample of new pairs (first 15, for manual plausibility review) ---`);
  for (const p of uniqueNewPairs.slice(0, 15)) {
    console.log(`  [${p.rerank.toFixed(2)} / cos ${p.cosine.toFixed(3)}] (${p.a.category}) "${p.a.content.slice(0, 80).replace(/\n/g, ' ')}"`);
    console.log(`                          <-> (${p.b.category}) "${p.b.content.slice(0, 80).replace(/\n/g, ' ')}"`);
  }

  console.log('\ndone.');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
