#!/usr/bin/env node
/**
 * Orchestrator for ticket 19 (Run the Counterfactual A/B on Synthetic Repos
 * with Synthetic Memory Sets). Reuses ticket 10's session runner and
 * reporting verbatim (session.mjs, report.mjs's costUsd/withConcurrency);
 * only the fixture source (swebench-fixtures.mjs) and task set
 * (swebench-tasks.mjs) are new, per this map's reuse-before-build
 * precedent.
 *
 * This is a SUPPLEMENT to ticket 10/18's real-repo run, not a replacement
 * (Scope item 1) - it exists to close two gaps the real-repo run couldn't:
 * an answer that might already be documented elsewhere in the repo (ticket
 * 10's own confound), and a fixture that depends on this repo's own git
 * HEAD (the friction ticket 18 hit mechanically). Both tasks are sourced
 * from real SWE-bench Lite instances (swebench-instances.mjs) rather than
 * a hand-authored fake repo - we don't run the real SWE-bench harness or
 * its hidden test suites, only borrow its repos/issues/gold-patches as raw
 * material for a keyword-graded diagnose-and-describe question, same
 * ANSWER.md-and-deterministic-check shape ticket 10/14 already use.
 *
 * Two modes:
 *   --pilot   Control-arm-only difficulty calibration. Must be run BEFORE
 *             the full A/B: if the stripped prompt is so easy the control
 *             arm passes near 100% of the time, there's no headroom for
 *             memory to show an effect; if it's near 0%, the bug may not be
 *             diagnosable from a symptom-level description at all either
 *             way. Target: control failure rate in ticket 10's own observed
 *             17-33% range.
 *   (default) Full A/B, both arms.
 *
 * Budget (approved, see ticket 19's Answer): $5 hard cap, checked after
 * every session - the run stops launching new sessions the moment
 * cumulative spend would exceed it, rather than trusting an estimate.
 * Concurrency defaults to 1 (not report.mjs's usual 3) specifically so the
 * cap check between sessions is exact, not racy.
 *
 * Usage:
 *   node benchmarks/token-ab/run-swebench-ab.mjs --pilot              # difficulty calibration (control-only)
 *   node benchmarks/token-ab/run-swebench-ab.mjs                      # full A/B (only after the pilot confirms difficulty)
 *   node benchmarks/token-ab/run-swebench-ab.mjs --dry-run            # exercises live-fetch fixtures + grading, no API calls, no spend
 *   node benchmarks/token-ab/run-swebench-ab.mjs --pilot --dry-run
 *   node benchmarks/token-ab/run-swebench-ab.mjs --k=2                # override repeat count
 *   node benchmarks/token-ab/run-swebench-ab.mjs --cap=5              # override the hard cost cap (USD)
 *   node benchmarks/token-ab/run-swebench-ab.mjs --tasks=id1,id2
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { TASKS as ALL_TASKS } from './swebench-tasks.mjs';
import { buildSwebenchFixture, cleanupSwebenchFixture } from './swebench-fixtures.mjs';
import { runSession, MODEL } from './session.mjs';
import { costUsd, summarize, withConcurrency } from './report.mjs';

const REPO_ROOT = fileURLToPath(new URL('../../', import.meta.url));

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const PILOT = args.includes('--pilot');
const K = Number(args.find(a => a.startsWith('--k='))?.split('=')[1] ?? 2);
const CONCURRENCY = Number(args.find(a => a.startsWith('--concurrency='))?.split('=')[1] ?? 1);
const HARD_CAP_USD = Number(args.find(a => a.startsWith('--cap='))?.split('=')[1] ?? 5);
const TASK_FILTER = args.find(a => a.startsWith('--tasks='))?.split('=')[1]?.split(',');
const TASKS = TASK_FILTER ? ALL_TASKS.filter(t => TASK_FILTER.includes(t.id)) : ALL_TASKS;
if (TASK_FILTER && TASKS.length !== TASK_FILTER.length) {
  const found = new Set(TASKS.map(t => t.id));
  const missing = TASK_FILTER.filter(id => !found.has(id));
  throw new Error(`--tasks referenced unknown task id(s): ${missing.join(', ')}`);
}
const OUT_DIR = path.join(
  REPO_ROOT,
  '.scratch/neuron-2.3.0/audits/19-synthetic-fixture-counterfactual-ab',
  PILOT ? 'pilot' : 'full'
);

const ARMS = PILOT ? ['control'] : ['memory', 'control'];
const TREATMENT_ARM = 'memory';
const CONTROL_ARM = 'control';

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const plan = [];
  for (const task of TASKS) {
    for (const arm of ARMS) {
      for (let k = 0; k < K; k++) {
        plan.push({ task, arm, k, sessionLabel: `${task.id}-${arm}-r${k}` });
      }
    }
  }

  console.log(
    `Ticket 19 SWE-bench-sourced synthetic-fixture A/B — ${PILOT ? 'PILOT (control-only, difficulty calibration)' : 'FULL A/B'} — ` +
      `${DRY_RUN ? 'DRY RUN (no API calls)' : `LIVE (${MODEL}), hard cap $${HARD_CAP_USD}`}`
  );
  console.log(`${TASKS.length} tasks x ${ARMS.length} arm(s) x ${K} repeats = ${plan.length} sessions planned\n`);

  let client = null;
  if (!DRY_RUN) {
    const { default: Anthropic } = await import('@anthropic-ai/sdk');
    client = new Anthropic();
  }

  let spentUsd = 0;
  let capHit = false;

  const results = await withConcurrency(plan, DRY_RUN ? 1 : CONCURRENCY, async ({ task, arm, sessionLabel }) => {
    if (!DRY_RUN && capHit) {
      console.log(`  [skip] ${sessionLabel}: hard cap $${HARD_CAP_USD} already reached`);
      return null;
    }
    const fixture = buildSwebenchFixture(arm, task, sessionLabel);
    try {
      if (DRY_RUN) {
        const answerPath = path.join(fixture.dir, 'ANSWER.md');
        fs.writeFileSync(answerPath, `[dry-run placeholder for ${sessionLabel}]`);
        const graded = task.check(fs.readFileSync(answerPath, 'utf8'));
        console.log(
          `  [dry-run] ${sessionLabel}: fixture ok (${fs.readdirSync(fixture.dir).length} entries fetched), ` +
            `.neuron present=${fs.existsSync(path.join(fixture.dir, '.neuron'))}, grade=${JSON.stringify(graded)}`
        );
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
      const sessionCost = costUsd(result.tokens);
      spentUsd += sessionCost;
      console.log(
        `  <- ${sessionLabel}: ${result.passed ? 'PASS' : 'FAIL'} turns=${result.turns} tokens=${result.totalTokens} ` +
          `($${sessionCost.toFixed(4)}, cumulative $${spentUsd.toFixed(4)})`
      );
      if (spentUsd >= HARD_CAP_USD) {
        capHit = true;
        console.log(`  [cap] hard cap $${HARD_CAP_USD} reached — no further sessions will be launched.`);
      }
      return result;
    } finally {
      cleanupSwebenchFixture(fixture);
    }
  });

  const completed = results.filter(Boolean);
  const skipped = plan.length - completed.length;

  let summary = null;
  if (!PILOT) {
    summary = summarize(completed, { tasks: TASKS, k: K, arms: ARMS, treatmentArm: TREATMENT_ARM, controlArm: CONTROL_ARM });
  }

  const report = {
    generatedAt: new Date().toISOString(),
    model: MODEL,
    dryRun: DRY_RUN,
    pilot: PILOT,
    taskCount: TASKS.length,
    repeats: K,
    sessionCount: plan.length,
    sessionsSkippedByCap: skipped,
    hardCapUsd: HARD_CAP_USD,
    totalCostUsd: Math.round(completed.reduce((s, r) => s + costUsd(r.tokens), 0) * 10000) / 10000,
    summary,
    results: completed,
  };

  fs.writeFileSync(path.join(OUT_DIR, 'results.json'), JSON.stringify(report, null, 2), 'utf8');

  console.log('\n================================================================');
  console.log(' SCORECARD');
  console.log('================================================================');

  if (PILOT) {
    for (const task of TASKS) {
      const rs = completed.filter(r => r.task === task.id);
      const failed = rs.filter(r => !r.passed).length;
      const rate = rs.length ? failed / rs.length : null;
      const inTarget = rate !== null && rate >= 0.15 && rate <= 0.4;
      console.log(
        `${task.id.padEnd(32)} sessions=${rs.length} failed=${failed} rate=${rate !== null ? (rate * 100).toFixed(0) + '%' : 'n/a'} ` +
          `${rate !== null ? (inTarget ? '✓ in target 15-40% range' : '⚠ outside target range — reconsider this instance/prompt') : ''}`
      );
    }
  } else {
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
  }

  if (skipped > 0) {
    console.log(`\n⚠️  ${skipped} planned session(s) skipped — hard cap $${HARD_CAP_USD} reached.`);
  }
  console.log(`\nTotal cost: $${report.totalCostUsd}`);
  console.log(`Results written to ${path.join(OUT_DIR, 'results.json')}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
