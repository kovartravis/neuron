#!/usr/bin/env node
/**
 * Orchestrator for ticket 10 (Counterfactual Token A/B).
 *
 * For each task x arm x repeat: build a fresh git-worktree fixture, run one
 * agent session against it, grade the session's ANSWER.md, tear the fixture
 * down. Writes a results.json + prints token distributions, failure rates,
 * and the risk arm (tasks the memory arm got wrong that control got right) —
 * exactly the deliverables ticket 10's Scope and Verification sections ask
 * for. No LLM judge anywhere: grading is the deterministic checks in
 * tasks.mjs.
 *
 * Cost/runtime were stated and approved before this harness ran anything:
 * Claude Sonnet 5 at intro pricing, 4 tasks x 2 arms x 3 repeats = 24
 * sessions, effort 'low', estimated well under $5 and well under $20.
 *
 * Usage:
 *   node benchmarks/token-ab/run.mjs              # the real run (needs ANTHROPIC_API_KEY / ant profile)
 *   node benchmarks/token-ab/run.mjs --dry-run     # exercises fixtures + grading only, no API calls, no spend
 *   node benchmarks/token-ab/run.mjs --k=1         # override repeat count (e.g. a cheap pilot)
 *   node benchmarks/token-ab/run.mjs --concurrency=3
 *   node benchmarks/token-ab/run.mjs --tasks=id1,id2   # only run a task subset (e.g. a regression re-check)
 *   node benchmarks/token-ab/run.mjs --out=path/relative/to/repo/root  # write results elsewhere (default: ticket 10's own dir)
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { TASKS as ALL_TASKS } from './tasks.mjs';
import { buildFixture, cleanupFixture, pruneStaleWorktrees } from './fixtures.mjs';
import { runSession, MODEL } from './session.mjs';

const REPO_ROOT = fileURLToPath(new URL('../../', import.meta.url));

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
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
    '.scratch/neuron-2.3.0/audits/10-counterfactual-token-ab'
);

const ARMS = ['memory', 'control'];

// Sonnet 5 intro pricing (through 2026-08-31), $/MTok. Cache write assumes
// the default 5-minute TTL (1.25x input); cache read is ~0.1x input.
const PRICE = { input: 2.0, output: 10.0, cacheWrite: 2.5, cacheRead: 0.2 };

function costUsd(tokens) {
  return (
    (tokens.input / 1e6) * PRICE.input +
    (tokens.output / 1e6) * PRICE.output +
    (tokens.cacheCreation / 1e6) * PRICE.cacheWrite +
    (tokens.cacheRead / 1e6) * PRICE.cacheRead
  );
}

function percentile(sorted, p) {
  if (sorted.length === 0) return null;
  const idx = Math.min(sorted.length - 1, Math.floor(p * (sorted.length - 1)));
  return sorted[idx];
}

function summarize(results) {
  const byArm = Object.fromEntries(ARMS.map(a => [a, results.filter(r => r.arm === a)]));
  const armStats = {};
  for (const arm of ARMS) {
    const rs = byArm[arm];
    const tokenCounts = rs.map(r => r.totalTokens).sort((a, b) => a - b);
    const passed = rs.filter(r => r.passed).length;
    armStats[arm] = {
      sessions: rs.length,
      passed,
      failed: rs.length - passed,
      failureRate: rs.length ? (rs.length - passed) / rs.length : null,
      tokens: {
        mean: tokenCounts.length ? Math.round(tokenCounts.reduce((a, b) => a + b, 0) / tokenCounts.length) : null,
        median: percentile(tokenCounts, 0.5),
        p95: percentile(tokenCounts, 0.95),
        min: tokenCounts[0] ?? null,
        max: tokenCounts.at(-1) ?? null,
      },
      costUsd: Math.round(rs.reduce((sum, r) => sum + costUsd(r.tokens), 0) * 10000) / 10000,
    };
  }

  // Risk arm: per task, did the memory arm fail a repeat that the control
  // arm passed on the same repeat index? (Scope item 4.)
  const riskCases = [];
  for (const task of TASKS) {
    for (let k = 0; k < K; k++) {
      const mem = results.find(r => r.task === task.id && r.arm === 'memory' && r.sessionLabel.endsWith(`-r${k}`));
      const ctrl = results.find(r => r.task === task.id && r.arm === 'control' && r.sessionLabel.endsWith(`-r${k}`));
      if (mem && ctrl && !mem.passed && ctrl.passed) {
        riskCases.push({ task: task.id, repeat: k, memoryDetail: mem.gradeDetail, controlDetail: ctrl.gradeDetail });
      }
    }
  }

  // No-measured-difference guard: an arm "advantage" smaller than the
  // observed spread (max-min) on either arm is not a win. (Verification.)
  const memMean = armStats.memory.tokens.mean;
  const ctrlMean = armStats.control.tokens.mean;
  const spread = Math.max(
    armStats.memory.tokens.max - armStats.memory.tokens.min,
    armStats.control.tokens.max - armStats.control.tokens.min
  );
  const diff = memMean !== null && ctrlMean !== null ? ctrlMean - memMean : null; // positive = memory arm cheaper
  const noMeasuredDifference = diff !== null && Math.abs(diff) < spread;

  return { armStats, riskCases, tokenDiff: diff, spread, noMeasuredDifference };
}

async function withConcurrency(items, limit, worker) {
  const results = new Array(items.length);
  let next = 0;
  async function lane() {
    while (next < items.length) {
      const i = next++;
      results[i] = await worker(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, lane));
  return results;
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  pruneStaleWorktrees();

  const plan = [];
  for (const task of TASKS) {
    for (const arm of ARMS) {
      for (let k = 0; k < K; k++) {
        plan.push({ task, arm, k, sessionLabel: `${task.id}-${arm}-r${k}` });
      }
    }
  }

  console.log(`Ticket 10 counterfactual token A/B — ${DRY_RUN ? 'DRY RUN (no API calls)' : `LIVE (${MODEL})`}`);
  console.log(`${TASKS.length} tasks x ${ARMS.length} arms x ${K} repeats = ${plan.length} sessions\n`);

  let client = null;
  if (!DRY_RUN) {
    const { default: Anthropic } = await import('@anthropic-ai/sdk');
    client = new Anthropic();
  }

  const results = await withConcurrency(plan, DRY_RUN ? 1 : CONCURRENCY, async ({ task, arm, sessionLabel }) => {
    const fixture = buildFixture(arm, sessionLabel);
    try {
      if (DRY_RUN) {
        // Exercise fixture + grading plumbing without spending anything.
        const answerPath = path.join(fixture.dir, 'ANSWER.md');
        fs.writeFileSync(answerPath, `[dry-run placeholder for ${sessionLabel}]`);
        const graded = task.check(fs.readFileSync(answerPath, 'utf8'));
        console.log(`  [dry-run] ${sessionLabel}: fixture ok, .neuron present=${fs.existsSync(path.join(fixture.dir, '.neuron'))}, grade=${JSON.stringify(graded)}`);
        return {
          task: task.id,
          arm,
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
        };
      }
      console.log(`  -> ${sessionLabel}`);
      const result = await runSession({ client, task, arm, fixture, sessionLabel });
      console.log(
        `  <- ${sessionLabel}: ${result.passed ? 'PASS' : 'FAIL'} turns=${result.turns} tokens=${result.totalTokens} ($${costUsd(result.tokens).toFixed(4)})`
      );
      return result;
    } finally {
      cleanupFixture(fixture);
    }
  });

  const summary = summarize(results);
  const report = {
    generatedAt: new Date().toISOString(),
    model: MODEL,
    dryRun: DRY_RUN,
    taskCount: TASKS.length,
    repeats: K,
    sessionCount: plan.length,
    totalCostUsd: Math.round(results.reduce((s, r) => s + costUsd(r.tokens), 0) * 10000) / 10000,
    summary,
    results,
  };

  fs.writeFileSync(path.join(OUT_DIR, 'results.json'), JSON.stringify(report, null, 2), 'utf8');

  console.log('\n================================================================');
  console.log(' SCORECARD');
  console.log('================================================================');
  for (const arm of ARMS) {
    const s = summary.armStats[arm];
    console.log(
      `${arm.padEnd(8)} sessions=${s.sessions} failed=${s.failed} (${((s.failureRate ?? 0) * 100).toFixed(0)}%)  ` +
        `tokens mean=${s.tokens.mean} median=${s.tokens.median} p95=${s.tokens.p95}  cost=$${s.costUsd}`
    );
  }
  console.log(
    `\nToken diff (control - memory): ${summary.tokenDiff}  |  spread: ${summary.spread}  |  ` +
      `no-measured-difference: ${summary.noMeasuredDifference}`
  );
  if (summary.riskCases.length) {
    console.log(`\n⚠️  RISK ARM: memory arm got these wrong while control got them right:`);
    for (const c of summary.riskCases) console.log(`  - ${c.task} (repeat ${c.repeat})`);
  } else {
    console.log('\nRisk arm: none — memory arm never lost a repeat that control won.');
  }
  console.log(`\nTotal cost: $${report.totalCostUsd}`);
  console.log(`Results written to ${path.join(OUT_DIR, 'results.json')}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
