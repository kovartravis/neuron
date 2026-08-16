#!/usr/bin/env node
/**
 * Orchestrator for ticket 4 (neuron-2.4.3): builds and runs the 3-arm
 * write-compliance A/B designed in ticket 1 (Write-Side Compliance Nudge &
 * Instrumentation). Reuses benchmarks/token-ab/report.mjs's `costUsd` and
 * `withConcurrency` (pure token/concurrency plumbing with no 2-arm
 * assumption baked in); `summarize` there IS 2-arm/token-diff shaped, so
 * this file has its own `summarizeCompliance` for the 3-arm compliance-rate
 * question instead of forcing a fit.
 *
 * Arms: control (today's behavior — passive CLAUDE.md protocol text only) /
 * nudge (simulated session-end reminder, standing in for a real Stop hook)
 * / explicit-instruction (system prompt states the requirement directly).
 * See fixtures.mjs for the exact wording of each.
 *
 * Decision rule (ticket 1): go (build the real trigger mechanism) if
 * `nudge` and/or `explicit-instruction` show a clear compliance-rate margin
 * over `control`; no-go if all three land close together. No fixed numeric
 * bar — read the margin against the sample size in the printed scorecard.
 *
 * Usage:
 *   node benchmarks/write-compliance-ab/run.mjs --dry-run        # exercises fixtures + grading, no API calls, no spend
 *   node benchmarks/write-compliance-ab/run.mjs                  # full A/B, all 3 arms
 *   node benchmarks/write-compliance-ab/run.mjs --k=4             # override repeat count (default 4)
 *   node benchmarks/write-compliance-ab/run.mjs --cap=3           # override the hard cost cap in USD (default 3)
 *   node benchmarks/write-compliance-ab/run.mjs --tasks=average-off-by-one
 *   node benchmarks/write-compliance-ab/run.mjs --effort=medium   # model reasoning effort (default low)
 *   node benchmarks/write-compliance-ab/run.mjs --out=my-run      # results subdirectory name
 *
 * Requires ANTHROPIC_API_KEY in the environment for any non-dry-run.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { TASKS as ALL_TASKS } from './tasks.mjs';
import { buildFixture, cleanupFixture, systemNoteForArm, testPasses, NUDGE_TEXT } from './fixtures.mjs';
import { runSession, MODEL } from './session.mjs';
import { sessionCalledMemoryAdd } from './grading.mjs';
import { costUsd, withConcurrency } from '../token-ab/report.mjs';

const REPO_ROOT = fileURLToPath(new URL('../../', import.meta.url));

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const K = Number(args.find(a => a.startsWith('--k='))?.split('=')[1] ?? 4);
const CONCURRENCY = Number(args.find(a => a.startsWith('--concurrency='))?.split('=')[1] ?? 1);
const HARD_CAP_USD = Number(args.find(a => a.startsWith('--cap='))?.split('=')[1] ?? 3);
const EFFORT = args.find(a => a.startsWith('--effort='))?.split('=')[1] ?? 'low';
const TASK_FILTER = args.find(a => a.startsWith('--tasks='))?.split('=')[1]?.split(',');
const TASKS = TASK_FILTER ? ALL_TASKS.filter(t => TASK_FILTER.includes(t.id)) : ALL_TASKS;
if (TASK_FILTER && TASKS.length !== TASK_FILTER.length) {
  const found = new Set(TASKS.map(t => t.id));
  const missing = TASK_FILTER.filter(id => !found.has(id));
  throw new Error(`--tasks referenced unknown task id(s): ${missing.join(', ')}`);
}
const OUT_NAME = args.find(a => a.startsWith('--out='))?.split('=')[1] ?? 'full';
// Ticket-numbered subdirectory (matches token-ab's results/19-.../ convention)
// so this suite's output paths can never collide with run-hard.mjs's (ticket
// 5) — a same-named `--out=pilot` from both scripts once did exactly that
// and destroyed ticket 4's own pilot smoke-test JSON. See run-hard.mjs's own
// OUT_DIR for the other half of this fix.
const OUT_DIR = path.join(
  REPO_ROOT,
  'benchmarks/write-compliance-ab/results/4-write-compliance-nudge-ab',
  DRY_RUN ? `${OUT_NAME}-dry-run` : OUT_NAME
);

const ARMS = ['control', 'nudge', 'explicit-instruction'];

function summarizeCompliance(results) {
  const byArm = Object.fromEntries(ARMS.map(a => [a, results.filter(r => r.arm === a)]));
  const armStats = {};
  for (const arm of ARMS) {
    const rs = byArm[arm];
    const complied = rs.filter(r => r.memoryAddCalled).length;
    const taskSolved = rs.filter(r => r.testPassed).length;
    armStats[arm] = {
      sessions: rs.length,
      complied,
      complianceRate: rs.length ? complied / rs.length : null,
      taskSolved,
      taskSolveRate: rs.length ? taskSolved / rs.length : null,
      costUsd: Math.round(rs.reduce((sum, r) => sum + costUsd(r.tokens), 0) * 10000) / 10000,
    };
  }
  const controlRate = armStats.control.complianceRate ?? 0;
  const margins = {};
  for (const arm of ['nudge', 'explicit-instruction']) {
    margins[arm] = armStats[arm].complianceRate === null ? null : armStats[arm].complianceRate - controlRate;
  }
  return { armStats, margins };
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
    `Ticket 4 write-compliance A/B — ${DRY_RUN ? 'DRY RUN (no API calls)' : `LIVE (${MODEL}, effort=${EFFORT}), hard cap $${HARD_CAP_USD}`}`
  );
  console.log(`${TASKS.length} tasks x ${ARMS.length} arms x ${K} repeats = ${plan.length} sessions planned\n`);

  let client = null;
  if (!DRY_RUN) {
    // Bare `new Anthropic()` picks up ANTHROPIC_API_KEY from the environment
    // if set, otherwise falls back to an `ant` CLI OAuth profile (`ant auth
    // status`) — same credential resolution as token-ab's own harnesses.
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
    const fixture = buildFixture(task, sessionLabel);
    fixture.systemNote = systemNoteForArm(arm);
    try {
      if (DRY_RUN) {
        // Exercises fixture build + task prompt + grading against a synthetic
        // transcript, with zero API calls: apply the real fix by hand, run
        // the real test, and probe the grader against a fabricated bash
        // command list — validates the plumbing without spending anything.
        const fixedSource =
          task.id === 'average-off-by-one'
            ? task.buggySource.replace('nums.length - 1', 'nums.length')
            : task.buggySource.replace('(i === 0 ? w[0].toUpperCase() + w.slice(1) : w)', '(w[0].toUpperCase() + w.slice(1))');
        fs.writeFileSync(path.join(fixture.dir, task.buggyFile), fixedSource, 'utf8');
        const passed = testPasses(fixture);
        const fakeBashCommands =
          arm === 'control'
            ? ['node test.mjs']
            : ['node test.mjs', `neuron memory add --category learning "Fix for ${task.id}: dry-run synthetic entry." --importance 4`];
        console.log(
          `  [dry-run] ${sessionLabel}: fixture ok, test-after-fix passed=${passed}, ` +
            `neuron wrapper present=${fs.existsSync(path.join(fixture.binDir, 'neuron'))}`
        );
        return {
          task: task.id,
          arm,
          sessionLabel,
          turns: 0,
          wallMs: 0,
          tokens: { input: 0, output: 0, cacheCreation: 0, cacheRead: 0 },
          testPassed: passed,
          memoryAddCalled: sessionCalledMemoryAdd(fakeBashCommands),
          finishedCleanly: true,
          nudgeDelivered: arm === 'nudge',
        };
      }
      console.log(`  -> ${sessionLabel}`);
      const result = await runSession({
        client,
        task,
        arm,
        fixture,
        sessionLabel,
        effort: EFFORT,
        nudgeOnFirstFinish: arm === 'nudge',
        nudgeText: NUDGE_TEXT,
      });
      const sessionCost = costUsd(result.tokens);
      spentUsd += sessionCost;
      const testPassed = testPasses(fixture);
      const memoryAddCalled = sessionCalledMemoryAdd(result.bashCommands);
      console.log(
        `  <- ${sessionLabel}: test=${testPassed ? 'PASS' : 'FAIL'} memory_add=${memoryAddCalled ? 'YES' : 'no'} ` +
          `turns=${result.turns} ($${sessionCost.toFixed(4)}, cumulative $${spentUsd.toFixed(4)})`
      );
      if (spentUsd >= HARD_CAP_USD) {
        capHit = true;
        console.log(`  [cap] hard cap $${HARD_CAP_USD} reached — no further sessions will be launched.`);
      }
      return { ...result, testPassed, memoryAddCalled };
    } finally {
      cleanupFixture(fixture);
    }
  });

  const completed = results.filter(Boolean);
  const skipped = plan.length - completed.length;
  const summary = summarizeCompliance(completed);

  const report = {
    generatedAt: new Date().toISOString(),
    model: MODEL,
    effort: EFFORT,
    arms: ARMS,
    dryRun: DRY_RUN,
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
  console.log(' SCORECARD — compliance rate (called `neuron memory add`)');
  console.log('================================================================');
  for (const arm of ARMS) {
    const s = summary.armStats[arm];
    console.log(
      `${arm.padEnd(22)} sessions=${s.sessions}  complied=${s.complied} (${((s.complianceRate ?? 0) * 100).toFixed(0)}%)  ` +
        `task-solved=${s.taskSolved}/${s.sessions}  cost=$${s.costUsd}`
    );
  }
  console.log(
    `\nMargin over control: nudge=${summary.margins.nudge === null ? 'n/a' : (summary.margins.nudge * 100).toFixed(0) + 'pts'}  ` +
      `explicit-instruction=${summary.margins['explicit-instruction'] === null ? 'n/a' : (summary.margins['explicit-instruction'] * 100).toFixed(0) + 'pts'}`
  );
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
