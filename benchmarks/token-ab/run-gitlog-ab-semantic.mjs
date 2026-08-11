#!/usr/bin/env node
/**
 * Orchestrator for ticket 11 (neuron-2.4.0): re-runs `14`'s git-log recall
 * question against the *real* shipped mechanism (ticket 08's semantic
 * embedding match) instead of `14`'s hand-picked `gitLogQuery` terms.
 *
 * Reuses `14`'s harness verbatim per Scope item 1: same fixture builder
 * (`fixtures.mjs`), same session runner (`session.mjs`), same
 * reporting/aggregation (`report.mjs`), same task set (`gitlog-tasks.mjs`).
 * The only new piece is `gitlog-semantic-search.mjs`, which shells out to
 * the real built CLI's `hook claude-code pre-prompt` path instead of a
 * grep prototype.
 *
 * Only ONE arm runs live here: `semantic`. Per Scope item 3, `14`'s
 * `agent` (control) and oracle-term `gitlog` (upper bound) arms are CITED
 * from `results/14-git-log-hook-vs-agent-log-ab/results.json`, not rerun —
 * this ticket's number is how much of that oracle-ceiling win the real
 * mechanism actually recovers, not a fresh agent-vs-neuron verdict.
 *
 * Also runs one extra, separate session against `gitlog-gate-task.mjs`
 * (Scope item 4): a task the relevance gate should reject and stay silent
 * on, to confirm the harness handles "no injection fired" as a normal
 * outcome. Always k=1, reported separately, not folded into the arm-stats
 * comparison against `14`.
 *
 * Cost/runtime must be stated and approved before this is run live — same
 * discipline `10`/`14` Scope item 6 used. `gitlog-semantic-search.mjs`
 * itself spends nothing (local git + local embedder); only `runSession`
 * calls bill.
 *
 * Usage:
 *   node benchmarks/token-ab/run-gitlog-ab-semantic.mjs              # the real run (needs ANTHROPIC_API_KEY / ant profile)
 *   node benchmarks/token-ab/run-gitlog-ab-semantic.mjs --dry-run     # exercises fixtures + real semantic search + grading only, no API calls, no spend
 *   node benchmarks/token-ab/run-gitlog-ab-semantic.mjs --k=1         # override repeat count (e.g. a cheap pilot)
 *   node benchmarks/token-ab/run-gitlog-ab-semantic.mjs --concurrency=3
 *   node benchmarks/token-ab/run-gitlog-ab-semantic.mjs --tasks=id1,id2
 *   node benchmarks/token-ab/run-gitlog-ab-semantic.mjs --skip-gate   # skip the Scope-item-4 silence-handling session
 *   node benchmarks/token-ab/run-gitlog-ab-semantic.mjs --out=path/relative/to/repo/root  # default: ticket 11's own audit dir
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { TASKS as ALL_TASKS } from './gitlog-tasks.mjs';
import { GATE_TASK } from './gitlog-gate-task.mjs';
import { buildFixture, cleanupFixture, pruneStaleWorktrees } from './fixtures.mjs';
import { realGitLogSearch, warmGitLogIndex } from './gitlog-semantic-search.mjs';
import { runSession, MODEL } from './session.mjs';
import { costUsd, summarize, withConcurrency } from './report.mjs';

const REPO_ROOT = fileURLToPath(new URL('../../', import.meta.url));
const CITED_RESULTS_PATH = path.join(
  REPO_ROOT,
  'benchmarks/token-ab/results/14-git-log-hook-vs-agent-log-ab/results.json'
);

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const SKIP_GATE = args.includes('--skip-gate');
const K = Number(args.find(a => a.startsWith('--k='))?.split('=')[1] ?? 3);
const CONCURRENCY = Number(args.find(a => a.startsWith('--concurrency='))?.split('=')[1] ?? 3);
const TASK_FILTER = args.find(a => a.startsWith('--tasks='))?.split('=')[1]?.split(',');
const TASKS = TASK_FILTER ? ALL_TASKS.filter(t => TASK_FILTER.includes(t.id)) : ALL_TASKS;
if (TASK_FILTER && TASKS.length !== TASK_FILTER.length) {
  const found = new Set(TASKS.map(t => t.id));
  const missing = TASK_FILTER.filter(id => !found.has(id));
  throw new Error(`--tasks referenced unknown task id(s): ${missing.join(', ')}`);
}
const OUT_DIR = path.join(
  REPO_ROOT,
  args.find(a => a.startsWith('--out='))?.split('=')[1] ??
    'benchmarks/token-ab/results/11-rerun-gitlog-ab-semantic-mechanism'
);

const ARM = 'semantic';

function buildSemanticFixture(task, sessionTag, sharedDbPath) {
  // realGitLogSearch is free (local git + local embedder) — exercised even
  // in --dry-run so the dry run actually validates the real search wiring,
  // not just fixture/grading plumbing. Only the Anthropic session call is
  // gated by DRY_RUN.
  const fixture = buildFixture('control', sessionTag);
  const note = realGitLogSearch(fixture.dir, sharedDbPath, task.prompt);
  fixture.systemNote = note;
  fixture.gitLogFired = Boolean(note);
  return fixture;
}

async function runOne({ task, sessionLabel, sharedDbPath }) {
  const fixture = buildSemanticFixture(task, sessionLabel, sharedDbPath);
  try {
    if (DRY_RUN) {
      const answerPath = path.join(fixture.dir, 'ANSWER.md');
      fs.writeFileSync(answerPath, `[dry-run placeholder for ${sessionLabel}]`);
      const graded = task.check(fs.readFileSync(answerPath, 'utf8'));
      console.log(
        `  [dry-run] ${sessionLabel}: fixture ok, .neuron present=${fs.existsSync(path.join(fixture.dir, '.neuron'))}, ` +
          `noteChars=${fixture.systemNote?.length ?? 0}, grade=${JSON.stringify(graded)}`
      );
      return {
        task: task.id,
        arm: ARM,
        sessionLabel,
        turns: 0,
        wallMs: 0,
        cappedBy: null,
        finishedCleanly: true,
        finishSummary: 'dry-run',
        tokens: { input: 0, output: 0, cacheCreation: 0, cacheRead: 0 },
        totalTokens: 0,
        answerText: '[dry-run]',
        passed: false,
        gradeDetail: 'dry-run placeholder, not a real grade',
        gitLogFired: fixture.gitLogFired,
      };
    }
    console.log(`  -> ${sessionLabel} (gitLogFired=${fixture.gitLogFired})`);
    const client = runOne.client;
    const result = await runSession({ client, task, arm: ARM, fixture, sessionLabel });
    result.gitLogFired = fixture.gitLogFired;
    console.log(
      `  <- ${sessionLabel}: ${result.passed ? 'PASS' : 'FAIL'} turns=${result.turns} tokens=${result.totalTokens} ($${costUsd(result.tokens).toFixed(4)})`
    );
    return result;
  } finally {
    cleanupFixture(fixture);
  }
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  pruneStaleWorktrees();

  let client = null;
  if (!DRY_RUN) {
    const { default: Anthropic } = await import('@anthropic-ai/sdk');
    client = new Anthropic();
  }
  runOne.client = client;

  // Shared, warmed index: one full-history backfill (local embedder, no
  // API spend), reused by every session below regardless of which fixture
  // worktree issues the call — they all sit at the same real HEAD.
  const dbDir = fs.mkdtempSync(path.join(os.tmpdir(), 'neuron-gitlog-semantic-db-'));
  const sharedDbPath = path.join(dbDir, 'index.sqlite');
  const warmupFixture = buildFixture('control', 'warmup');
  console.log('Warming git-log index (one-time full-history backfill, local only, no spend)...');
  const warmStart = Date.now();
  warmGitLogIndex(warmupFixture.dir, sharedDbPath);
  console.log(`  done in ${Date.now() - warmStart}ms`);
  cleanupFixture(warmupFixture);

  const plan = [];
  for (const task of TASKS) {
    for (let k = 0; k < K; k++) {
      plan.push({ task, sessionLabel: `${task.id}-${ARM}-r${k}` });
    }
  }
  const gatePlan = SKIP_GATE ? [] : [{ task: GATE_TASK, sessionLabel: `${GATE_TASK.id}-${ARM}-r0` }];

  console.log(`Ticket 11 semantic-mechanism git-log recall re-run — ${DRY_RUN ? 'DRY RUN (no API calls)' : `LIVE (${MODEL})`}`);
  console.log(`${TASKS.length} tasks x 1 arm x ${K} repeats = ${plan.length} sessions, plus ${gatePlan.length} gate-check session\n`);

  const results = await withConcurrency(plan, DRY_RUN ? 1 : CONCURRENCY, item => runOne({ ...item, sharedDbPath }));
  const gateResults = await withConcurrency(gatePlan, 1, item => runOne({ ...item, sharedDbPath }));

  fs.rmSync(dbDir, { recursive: true, force: true });

  // Cite (not rerun) 14's agent + oracle-gitlog arms so summarize() can
  // compute semantic-vs-agent and semantic-vs-oracle diffs against this
  // run's own live numbers.
  const cited = JSON.parse(fs.readFileSync(CITED_RESULTS_PATH, 'utf8'));
  const citedAgent = cited.results.filter(r => r.arm === 'agent');
  const citedOracleGitlog = cited.results.filter(r => r.arm === 'gitlog');

  const vsAgent = summarize([...results, ...citedAgent], {
    tasks: TASKS,
    k: K,
    arms: [ARM, 'agent'],
    treatmentArm: ARM,
    controlArm: 'agent',
  });
  const vsOracle = summarize([...results, ...citedOracleGitlog.map(r => ({ ...r, arm: 'oracle-gitlog' }))], {
    tasks: TASKS,
    k: K,
    arms: [ARM, 'oracle-gitlog'],
    treatmentArm: ARM,
    controlArm: 'oracle-gitlog',
  });

  const gateCheck = gateResults.length
    ? {
        task: GATE_TASK.id,
        gitLogFired: gateResults[0].gitLogFired,
        expectedSilence: !gateResults[0].gitLogFired,
        crashedOrAutoFailed: DRY_RUN ? null : gateResults[0].cappedBy !== null && gateResults[0].turns === 0,
        passed: gateResults[0].passed,
        gradeDetail: gateResults[0].gradeDetail,
      }
    : null;

  const report = {
    generatedAt: new Date().toISOString(),
    model: MODEL,
    dryRun: DRY_RUN,
    taskCount: TASKS.length,
    repeats: K,
    sessionCount: plan.length + gatePlan.length,
    totalCostUsd:
      Math.round([...results, ...gateResults].reduce((s, r) => s + costUsd(r.tokens), 0) * 10000) / 10000,
    citedFrom: path.relative(REPO_ROOT, CITED_RESULTS_PATH),
    vsAgent: vsAgent.armStats,
    vsOracleGitlog: vsOracle.armStats,
    gateCheck,
    results,
    gateResults,
  };

  fs.writeFileSync(path.join(OUT_DIR, 'results.json'), JSON.stringify(report, null, 2), 'utf8');

  console.log('\n================================================================');
  console.log(' SCORECARD');
  console.log('================================================================');
  console.log(`semantic (this run) sessions=${vsAgent.armStats[ARM].sessions} failed=${vsAgent.armStats[ARM].failed} tokens mean=${vsAgent.armStats[ARM].tokens.mean} cost=$${vsAgent.armStats[ARM].costUsd}`);
  console.log(`agent (cited, 14)   sessions=${vsAgent.armStats.agent.sessions} failed=${vsAgent.armStats.agent.failed} tokens mean=${vsAgent.armStats.agent.tokens.mean} cost=$${vsAgent.armStats.agent.costUsd}`);
  console.log(`oracle gitlog (cited, 14) sessions=${vsOracle.armStats['oracle-gitlog'].sessions} tokens mean=${vsOracle.armStats['oracle-gitlog'].tokens.mean}`);
  console.log(`\nsemantic vs agent token diff: ${vsAgent.tokenDiff} (no-measured-difference: ${vsAgent.noMeasuredDifference})`);
  console.log(`semantic vs oracle-gitlog token diff: ${vsOracle.tokenDiff} (no-measured-difference: ${vsOracle.noMeasuredDifference})`);
  if (gateCheck) {
    console.log(`\nGate-silence check (${gateCheck.task}): gitLogFired=${gateCheck.gitLogFired} expectedSilence=${gateCheck.expectedSilence} passed=${gateCheck.passed}`);
  }
  console.log(`\nTotal cost: $${report.totalCostUsd}`);
  console.log(`Results written to ${path.join(OUT_DIR, 'results.json')}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
