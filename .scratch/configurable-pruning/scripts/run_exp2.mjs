#!/usr/bin/env node
// Experiment 2 runner: paired damage/gain comparison between an untouched
// control copy (Arm B) and a pruned copy (Arm A) of a store, over a set of
// real filtered queries. Used for both Run 1 (real store) and Run 2
// (synthetic-scale store) by pointing at different source DBs / query sets.
//
// Usage: node run_exp2.mjs <label> <sourceDb> <queriesFile> <relevanceFile>
//   <label>: "run1" or "run2", used to name output files
//   <winnerArm>: "a1" or "a2" — which Experiment 1 arm's importance
//                predictions to apply as the rewrite before pruning
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// .scratch/configurable-pruning/, two levels up from scripts/run_exp2.mjs
const REPO = path.resolve(__dirname, '..', '..', '..');
const SCRATCH = path.resolve(__dirname, '..'); // labels/relevance/query JSON — committed data
// DB copies are large binary artifacts of a single run; never commit them.
const WORKDIR = path.join(os.tmpdir(), 'neuron-pruning-ab');
fs.mkdirSync(WORKDIR, { recursive: true });

const [, , label, sourceDb, queriesFile, relevanceFile, winnerArm] = process.argv;
if (!label || !sourceDb || !queriesFile || !relevanceFile || !winnerArm) {
  console.error('usage: run_exp2.mjs <label> <sourceDb> <queriesFile> <relevanceFile> <winnerArm:a1|a2>');
  process.exit(1);
}

const { NeuronMemory } = await import(path.join(REPO, 'src/index.ts'));

const PRUNE_RETENTION_DAYS = 7;
const PRUNE_MAX_IMPORTANCE = 2;
const K = 10;

function cp(src, dst) { fs.copyFileSync(src, dst); }

async function main() {
  const dbB = path.join(WORKDIR, `${label}_B_control.sqlite`);
  const dbA = path.join(WORKDIR, `${label}_A_pruned.sqlite`);
  cp(sourceDb, dbB);
  cp(sourceDb, dbA);

  // --- Apply the Experiment 1 winning arm's importance rewrite to Arm A's
  // history rows, then prune. Uses direct sqlite3 access for the rewrite
  // (bulk UPDATE), then NeuronMemory.maintain() for the actual prune SQL so
  // the deletion path under test is the real production code, not a
  // reimplementation.
  const exp1 = JSON.parse(fs.readFileSync(path.join(SCRATCH, 'exp1_raw.json'), 'utf8'));
  const rewriteMap = new Map(); // id -> importance
  for (const r of exp1) {
    if (r.category !== 'history') continue;
    const importance = r[winnerArm]?.importance;
    if (importance != null) rewriteMap.set(r.id, importance);
    // Parse failures: leave stored importance untouched (conservative — a
    // degraded inference must not make an entry MORE prunable than default).
  }

  const rawA = new Database(dbA);
  const updateStmt = rawA.prepare('UPDATE memories SET importance = ? WHERE id = ?');
  const txn = rawA.transaction((entries) => {
    for (const [id, imp] of entries) updateStmt.run(imp, id);
  });
  txn([...rewriteMap.entries()]);

  // Snapshot which history ids are eligible for deletion (mirrors the exact
  // WHERE clause in src/index.ts's prune SQL) BEFORE pruning, so we know
  // precisely what Arm A is about to lose.
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - PRUNE_RETENTION_DAYS);
  const cutoffStr = cutoff.toISOString();
  const eligible = rawA.prepare(
    `SELECT id FROM memories WHERE category = 'history' AND created_at < ? AND importance <= ?`
  ).all(cutoffStr, PRUNE_MAX_IMPORTANCE).map(r => r.id);
  rawA.close();

  const memA = new NeuronMemory({ dbPath: dbA, projectRoot: REPO, projectName: 'neuron' });
  const report = memA.maintain({ pruneHistoryBeforeDays: PRUNE_RETENTION_DAYS, maxPruneImportance: PRUNE_MAX_IMPORTANCE });
  console.log(`[${label}] arm=${winnerArm} pruned ${report.prunedCount} of ${eligible.length} eligible rows `
    + `(cutoff ${cutoffStr}, maxImportance ${PRUNE_MAX_IMPORTANCE})`);

  const memB = new NeuronMemory({ dbPath: dbB, projectRoot: REPO, projectName: 'neuron' });

  const queries = JSON.parse(fs.readFileSync(queriesFile, 'utf8'));
  const relevance = JSON.parse(fs.readFileSync(relevanceFile, 'utf8'));

  const perQuery = [];
  let i = 0;
  for (const q of queries) {
    i++;
    const rel = relevance[q.id];
    const goodIds = new Set((rel?.good_answers ?? []).map(g => g.id));
    if (goodIds.size === 0) continue; // nothing to score for this query

    const resultsB = await memB.query({ text: q.query_text, limit: K });
    const resultsA = await memA.query({ text: q.query_text, limit: K });

    const rankB = new Map(resultsB.map((r, idx) => [r.id, idx + 1]));
    const rankA = new Map(resultsA.map((r, idx) => [r.id, idx + 1]));

    perQuery.push({
      queryId: q.id,
      queryText: q.query_text,
      goodIds: [...goodIds],
      rankB: Object.fromEntries([...goodIds].map(g => [g, rankB.get(g) ?? null])),
      rankA: Object.fromEntries([...goodIds].map(g => [g, rankA.get(g) ?? null])),
      topB: resultsB.map(r => r.id),
      topA: resultsA.map(r => r.id),
    });

    if (i % 25 === 0 || i === queries.length) console.log(`  [${label}] ${i}/${queries.length} queries run`);
  }

  memA.close();
  memB.close();

  // Which good-answer history ids actually vanished from Arm A.
  const rawA2 = new Database(dbA);
  const survivingIds = new Set(rawA2.prepare('SELECT id FROM memories').all().map(r => r.id));
  rawA2.close();

  fs.writeFileSync(path.join(WORKDIR, `${label}_perquery.json`), JSON.stringify({
    label, winnerArm, prunedCount: report.prunedCount, eligibleCount: eligible.length,
    survivingIds: [...survivingIds], perQuery,
  }, null, 2));
  console.log(`[${label}] wrote ${label}_perquery.json (${perQuery.length} scored queries)`);
}

main().catch(err => { console.error(err); process.exit(1); });
