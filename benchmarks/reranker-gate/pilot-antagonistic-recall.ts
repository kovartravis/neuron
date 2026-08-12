/**
 * Ticket 29 pilot: re-runs Pillar 13 (Antagonistic Recall & Abstention,
 * ticket 17) twice against the real pipeline — once with the shipped
 * lexical-only gate, once with the new reranker leg
 * (`relevance.gate.reranker.enabled`) also active — and reports both
 * false-accept rates side by side. Not a vitest suite: a one-off pilot
 * script per ticket 29's Verification section ("Results committed under
 * `benchmarks/reports/`").
 *
 * Seeds the exact same corpus `test/e2e/adversarial-recall.test.ts` seeds for
 * this pillar (fillers, hard negatives, superseded entries, golds) so both
 * runs face the same accidental-match surface, then asks every case in
 * `ANTAGONISTIC_CASES` — queries verified to share no vocabulary with that
 * corpus at all.
 */
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { NeuronMemory } from '../../src/index.js';
import { ADVERSARIAL_CASES, buildFiller } from '../../test/e2e/adversarial-corpus.js';
import { ANTAGONISTIC_CASES } from '../../test/e2e/antagonistic-corpus.js';

const FILLER_COUNT = 300; // sanity-tier count (test/e2e/tier.ts)

async function seed(memory: NeuronMemory) {
  const filler = buildFiller(FILLER_COUNT).map(content => ({
    op: 'upsert' as const,
    category: 'learning',
    content,
    tags: ['filler'],
    importance: 2,
  }));
  const negatives = ADVERSARIAL_CASES.flatMap(c =>
    c.hardNegatives.map((content, i) => ({
      op: 'upsert' as const,
      category: 'learning',
      content,
      tags: ['negative', c.id, `neg_${i}`],
      importance: 3,
    }))
  );
  const superseded = ADVERSARIAL_CASES.filter(c => c.superseded).map(c => ({
    op: 'upsert' as const,
    category: 'learning',
    content: c.superseded!,
    tags: ['superseded', c.id],
    importance: 3,
  }));
  const golds = ADVERSARIAL_CASES.map(c => ({
    op: 'upsert' as const,
    category: 'learning',
    content: c.gold,
    tags: ['gold', c.id],
    importance: 4,
  }));
  await memory.transact([...filler, ...negatives, ...superseded, ...golds]);
}

async function runPillar13(rerankerEnabled: boolean) {
  const workDir = fs.mkdtempSync(path.join(os.tmpdir(), `neuron-reranker-pilot-${rerankerEnabled}-`));
  fs.writeFileSync(path.join(workDir, 'package.json'), '{}');
  fs.writeFileSync(
    path.join(workDir, 'neuron.yaml'),
    `version: "1.0"\nrelevance:\n  gate:\n    enabled: true\n    reranker:\n      enabled: ${rerankerEnabled}\n`
  );
  const dbPath = path.join(workDir, 'bench.sqlite');
  const memory = new NeuronMemory({
    dbPath,
    projectRoot: workDir,
    projectName: 'reranker-gate-pilot',
    storageMode: 'vector',
  });

  const t0 = Date.now();
  await seed(memory);
  const seedMs = Date.now() - t0;

  let falseAcceptCount = 0;
  const detail: Array<{ id: string; family: string; topResult: string; rerankerScore?: number }> = [];
  const t1 = Date.now();
  for (const c of ANTAGONISTIC_CASES) {
    const { results } = await memory.queryGated({ text: c.query, categories: ['learning'], limit: 10 });
    if (results.length > 0) {
      falseAcceptCount++;
      detail.push({
        id: c.id,
        family: c.family,
        topResult: results[0].content.slice(0, 90),
        rerankerScore: results[0].rerankerScore,
      });
    }
  }
  const queryMs = Date.now() - t1;

  await memory.close();
  fs.rmSync(workDir, { recursive: true, force: true });

  return {
    rerankerEnabled,
    fillerCount: FILLER_COUNT,
    cases: ANTAGONISTIC_CASES.length,
    falseAcceptCount,
    falseAcceptRate: falseAcceptCount / ANTAGONISTIC_CASES.length,
    detail,
    seedMs,
    queryMs,
  };
}

async function main() {
  console.log('=== ticket 29: reranker gate pilot — Pillar 13 (Antagonistic Recall & Abstention) ===');
  console.log(`filler count: ${FILLER_COUNT} (sanity tier), cases: ${ANTAGONISTIC_CASES.length}`);

  console.log('\n[1/2] baseline (lexical gate only)...');
  const baseline = await runPillar13(false);
  console.log(`  false-accept: ${baseline.falseAcceptCount}/${baseline.cases} = ${(baseline.falseAcceptRate * 100).toFixed(2)}%  (${baseline.queryMs}ms)`);

  console.log('\n[2/2] with reranker gate active...');
  const withReranker = await runPillar13(true);
  console.log(`  false-accept: ${withReranker.falseAcceptCount}/${withReranker.cases} = ${(withReranker.falseAcceptRate * 100).toFixed(2)}%  (${withReranker.queryMs}ms)`);

  const out = { dataset: 'resident-e2e-pillar13', timestamp: new Date().toISOString(), baseline, withReranker };
  const outPath = path.join(import.meta.dirname, '..', 'reports', 'reranker-gate-pilot-antagonistic.json');
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
  console.log(`\nwritten: ${outPath}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
