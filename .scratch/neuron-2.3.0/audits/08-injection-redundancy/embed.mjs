import fs from 'node:fs';
import path from 'node:path';

const DIR = path.dirname(new URL(import.meta.url).pathname);
const { TransformersEmbedder } = await import('/Users/Travis/Repos/neuron/dist/components/embedder.js');

const data = JSON.parse(fs.readFileSync(path.join(DIR, 'data.json'), 'utf8'));
const embedder = new TransformersEmbedder();

function cosine(a, b) {
  let dot = 0;
  for (let i = 0; i < a.length; i++) dot += a[i] * b[i];
  return dot; // bge embeddings are normalized, so dot product == cosine similarity
}

console.log('Embedding', data.residentChunks.length, 'resident chunks...');
const residentVecs = [];
for (const chunk of data.residentChunks) {
  residentVecs.push(await embedder.embed(chunk.text));
}
console.log('Done.');

// unique entries across all sessions
const uniqueEntries = new Map();
for (const s of data.sessions) {
  for (const e of s.resolved) {
    if (!uniqueEntries.has(e.id)) uniqueEntries.set(e.id, { ...e, injectionCount: 0 });
    uniqueEntries.get(e.id).injectionCount += 1;
  }
}

console.log('Embedding', uniqueEntries.size, 'unique injected entries...');
const results = [];
for (const entry of uniqueEntries.values()) {
  const vec = await embedder.embed(entry.content);
  let best = -1, bestChunk = null;
  const top = [];
  for (let i = 0; i < residentVecs.length; i++) {
    const sim = cosine(vec, residentVecs[i]);
    top.push({ sim, source: data.residentChunks[i].source, text: data.residentChunks[i].text.slice(0, 100) });
    if (sim > best) { best = sim; bestChunk = data.residentChunks[i]; }
  }
  top.sort((a, b) => b.sim - a.sim);
  results.push({
    id: entry.id,
    category: entry.category,
    content: entry.content,
    injectionCount: entry.injectionCount,
    maxSim: best,
    bestMatchSource: bestChunk.source,
    bestMatchText: bestChunk.text.slice(0, 160),
    top3: top.slice(0, 3).map(t => ({ sim: Number(t.sim.toFixed(4)), source: t.source, text: t.text })),
  });
}

fs.writeFileSync(path.join(DIR, 'results.json'), JSON.stringify(results, null, 2));
console.log('Wrote results.json —', results.length, 'entries scored.');
