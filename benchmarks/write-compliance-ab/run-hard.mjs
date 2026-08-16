#!/usr/bin/env node
/**
 * Orchestrator for ticket 5 (neuron-2.4.3): the harder follow-up to ticket
 * 4's write-compliance A/B, built after that run came back a clean ceiling
 * effect (100% compliance, all three arms) rather than real signal — control's
 * task there was maximally easy. This variant reuses everything ticket 4 built
 * (session.mjs, grading.mjs, the three arms, the cost/concurrency plumbing)
 * and changes exactly two things: the system note is the FULL real CLAUDE.md
 * protocol block (fixtures.mjs's FULL_CLAUDE_MD_NOTE), not the §1 excerpt, and
 * the tasks are multi-step (tasksHard.mjs) so real, unrelated work sits between
 * the fix and finish_task instead of ending the turn right after it.
 *
 * Plan order is interleaved by repeat-round (round 0 of every task/arm, then
 * round 1, ...) rather than grouped by task then arm — so a `--cap` cutoff
 * mid-run leaves every arm with a close-to-equal sample instead of draining
 * whichever arm happens to run last in a task-major ordering.
 *
 * Usage:
 *   node benchmarks/write-compliance-ab/run-hard.mjs --dry-run
 *   node benchmarks/write-compliance-ab/run-hard.mjs --k=3 --cap=2
 *   node benchmarks/write-compliance-ab/run-hard.mjs --tasks=stats-multi-step
 *
 * Requires ANTHROPIC_API_KEY or an `ant` CLI OAuth profile.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { TASKS as ALL_TASKS } from './tasksHard.mjs';
import { buildHardFixture, cleanupFixture, systemNoteForArmHard, hardTaskPasses, NUDGE_TEXT } from './fixtures.mjs';
import { runSession, MODEL } from './session.mjs';
import { sessionCalledMemoryAdd } from './grading.mjs';
import { costUsd, withConcurrency } from '../token-ab/report.mjs';

const REPO_ROOT = fileURLToPath(new URL('../../', import.meta.url));

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const K = Number(args.find(a => a.startsWith('--k='))?.split('=')[1] ?? 3);
const CONCURRENCY = Number(args.find(a => a.startsWith('--concurrency='))?.split('=')[1] ?? 1);
const HARD_CAP_USD = Number(args.find(a => a.startsWith('--cap='))?.split('=')[1] ?? 2);
const EFFORT = args.find(a => a.startsWith('--effort='))?.split('=')[1] ?? 'low';
const TASK_FILTER = args.find(a => a.startsWith('--tasks='))?.split('=')[1]?.split(',');
const TASKS = TASK_FILTER ? ALL_TASKS.filter(t => TASK_FILTER.includes(t.id)) : ALL_TASKS;
if (TASK_FILTER && TASKS.length !== TASK_FILTER.length) {
  const found = new Set(TASKS.map(t => t.id));
  const missing = TASK_FILTER.filter(id => !found.has(id));
  throw new Error(`--tasks referenced unknown task id(s): ${missing.join(', ')}`);
}
const OUT_NAME = args.find(a => a.startsWith('--out='))?.split('=')[1] ?? 'full';
// Ticket-numbered subdirectory — see run.mjs's own OUT_DIR comment for why:
// this suite and ticket 4's run.mjs must never be able to write the same
// path, after a same-named `--out=pilot` from both once collided and
// destroyed ticket 4's pilot smoke-test JSON.
const OUT_DIR = path.join(
  REPO_ROOT,
  'benchmarks/write-compliance-ab/results/5-harder-write-compliance-ab',
  DRY_RUN ? `${OUT_NAME}-dry-run` : OUT_NAME
);

// Multi-step sessions need more room than ticket 4's single-fix tasks.
const MAX_TURNS = 30;
const WALL_CLOCK_CAP_MS = 8 * 60 * 1000;

const ARMS = ['control', 'nudge', 'explicit-instruction'];

function summarizeCompliance(results) {
  const byArm = Object.fromEntries(ARMS.map(a => [a, results.filter(r => r.arm === a)]));
  const armStats = {};
  for (const arm of ARMS) {
    const rs = byArm[arm];
    const complied = rs.filter(r => r.memoryAddCalled).length;
    const taskSolved = rs.filter(r => r.taskPassed).length;
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

  // Interleaved: every (task, arm) pair gets its round-k session before any
  // pair gets round-(k+1) — see header comment for why.
  const plan = [];
  for (let k = 0; k < K; k++) {
    for (const task of TASKS) {
      for (const arm of ARMS) {
        plan.push({ task, arm, k, sessionLabel: `${task.id}-${arm}-r${k}` });
      }
    }
  }

  console.log(
    `Ticket 5 HARD write-compliance A/B — ${DRY_RUN ? 'DRY RUN (no API calls)' : `LIVE (${MODEL}, effort=${EFFORT}), hard cap $${HARD_CAP_USD}`}`
  );
  console.log(`${TASKS.length} tasks x ${ARMS.length} arms x ${K} repeats = ${plan.length} sessions planned (interleaved)\n`);

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
    const fixture = buildHardFixture(task, sessionLabel);
    fixture.systemNote = systemNoteForArmHard(arm);
    try {
      if (DRY_RUN) {
        const passed = hardTaskPasses(fixture); // pre-fix: expected false
        console.log(`  [dry-run] ${sessionLabel}: fixture ok (${task.files.length} files), pre-fix check=${passed} (expect false)`);
        return {
          task: task.id,
          arm,
          sessionLabel,
          turns: 0,
          wallMs: 0,
          tokens: { input: 0, output: 0, cacheCreation: 0, cacheRead: 0 },
          taskPassed: false,
          memoryAddCalled: arm !== 'control',
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
        maxTurns: MAX_TURNS,
        wallClockCapMs: WALL_CLOCK_CAP_MS,
      });
      const sessionCost = costUsd(result.tokens);
      spentUsd += sessionCost;
      const taskPassed = hardTaskPasses(fixture);
      const memoryAddCalled = sessionCalledMemoryAdd(result.bashCommands);
      console.log(
        `  <- ${sessionLabel}: task=${taskPassed ? 'PASS' : 'FAIL'} memory_add=${memoryAddCalled ? 'YES' : 'no'} ` +
          `turns=${result.turns}${result.cappedBy ? ` capped(${result.cappedBy})` : ''} ` +
          `($${sessionCost.toFixed(4)}, cumulative $${spentUsd.toFixed(4)})`
      );
      if (spentUsd >= HARD_CAP_USD) {
        capHit = true;
        console.log(`  [cap] hard cap $${HARD_CAP_USD} reached — no further sessions will be launched.`);
      }
      return { ...result, taskPassed, memoryAddCalled };
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
  console.log(' SCORECARD — compliance rate (called `neuron memory add`), HARD suite');
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
