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
 *   --pilot   Control-arm-only probe. Originally a difficulty calibration
 *             gated on a 15-40% control failure rate, borrowed from ticket
 *             10's observed range. THAT GATE IS RETIRED: the outcome measure
 *             here is TOKENS, not pass rate, and under a token measure a 0%
 *             control failure rate is the DESIRED state — both arms reaching
 *             a correct answer is what makes the comparison apples-to-apples,
 *             since a session that gives up early looks artificially cheap.
 *             Pass/fail is a validity filter, not the metric. The pilot
 *             remains useful as a cheap "do the fixtures and prompts still
 *             work" probe before spending on both arms.
 *   (default) Full A/B, both arms.
 *
 * Arms: see swebench-fixtures.mjs. `injection` (default treatment) models
 * neuron as it actually ships — session-start hook injection, paid up front.
 * `memory` models the store merely existing on disk. They give different
 * numbers; pick deliberately.
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
 *   node benchmarks/token-ab/run-swebench-ab.mjs --effort=medium      # model reasoning effort (default low)
 *   node benchmarks/token-ab/run-swebench-ab.mjs --arms=memory,control  # discovery arm instead of injection
 *   node benchmarks/token-ab/run-swebench-ab.mjs --out=my-run         # results subdirectory name
 *
 * Full operator documentation, including how to add a task and how to read
 * the scorecard without being misled by it: benchmarks/token-ab/README.md
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
const EFFORT = args.find(a => a.startsWith('--effort='))?.split('=')[1] ?? 'low';
const TASK_FILTER = args.find(a => a.startsWith('--tasks='))?.split('=')[1]?.split(',');
const TASKS = TASK_FILTER ? ALL_TASKS.filter(t => TASK_FILTER.includes(t.id)) : ALL_TASKS;
if (TASK_FILTER && TASKS.length !== TASK_FILTER.length) {
  const found = new Set(TASKS.map(t => t.id));
  const missing = TASK_FILTER.filter(id => !found.has(id));
  throw new Error(`--tasks referenced unknown task id(s): ${missing.join(', ')}`);
}
// `--out=` names the results subdirectory. The `-dry-run` suffix is NOT
// cosmetic: OUT_DIR used to key on --pilot alone, so a dry run validating a
// fixture change silently overwrote the results.json a real, paid run had just
// written — and did exactly that once on this ticket, destroying $0.14 of
// captured answers. A dry run must never be able to land on a live run's path.
const OUT_NAME = args.find(a => a.startsWith('--out='))?.split('=')[1] ?? (PILOT ? 'pilot' : 'full');
const OUT_DIR = path.join(
  REPO_ROOT,
  'benchmarks/token-ab/results/19-synthetic-fixture-counterfactual-ab',
  DRY_RUN ? `${OUT_NAME}-dry-run` : OUT_NAME
);

// Which arms to run. `memory` models neuron-as-files (agent must choose to
// read .neuron/); `injection` models neuron-as-installed (session-start hook
// puts the entries in context unconditionally, paying their cost up front).
// Only `injection` tests the claim the shipped product makes, so it is the
// default treatment; `memory` stays selectable because the discovery question
// is real and was measured separately. See swebench-fixtures.mjs's header.
const CONTROL_ARM = 'control';
const ARMS = PILOT
  ? [CONTROL_ARM]
  : (args.find(a => a.startsWith('--arms='))?.split('=')[1]?.split(',') ?? ['injection', CONTROL_ARM]);
const TREATMENT_ARM = ARMS.find(a => a !== CONTROL_ARM) ?? CONTROL_ARM;
for (const arm of ARMS) {
  if (!['memory', 'injection', CONTROL_ARM].includes(arm)) throw new Error(`--arms referenced unknown arm: ${arm}`);
}

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
      `${DRY_RUN ? 'DRY RUN (no API calls)' : `LIVE (${MODEL}, effort=${EFFORT}), hard cap $${HARD_CAP_USD}`}`
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
      const result = await runSession({ client, task, arm, fixture, sessionLabel, effort: EFFORT });
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
    effort: EFFORT,
    arms: ARMS,
    treatmentArm: TREATMENT_ARM,
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
      `\nToken diff (control - ${TREATMENT_ARM}): ${summary.tokenDiff}  |  spread: ${summary.spread}  |  ` +
        `no-measured-difference: ${summary.noMeasuredDifference}` +
        `\n  ^ pooled across tasks with different baselines — check the per-task numbers in results.json before trusting this line`
    );
    if (summary.riskCases.length) {
      console.log(`\n⚠️  RISK ARM: ${TREATMENT_ARM} arm got these wrong while control got them right:`);
      for (const c of summary.riskCases) console.log(`  - ${c.task} (repeat ${c.repeat})`);
    } else {
      console.log(`\nRisk arm: none — ${TREATMENT_ARM} arm never lost a repeat that control won.`);
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
