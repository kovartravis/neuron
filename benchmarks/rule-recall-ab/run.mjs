#!/usr/bin/env node
/**
 * Orchestrator for ticket 7, Map — MCP Server & Setup/Onboarding Skill
 * Split: does an agent follow a project convention more reliably when
 * neuron delivers it (per-turn hook, or an agent-invoked `neuron_recall`
 * MCP tool) than when it sits as static CLAUDE.md prose alone?
 *
 * Defaults are sized as a **cheap pilot**, not the full design ticket 7's
 * own Design section describes (that would be `--k=5 --tasks=stats-multi-step,text-multi-step`,
 * matching write-compliance-ab's hard-mode sizing, ~30 sessions, ~$1.50-$2).
 * Default here is `--k=2` against a single task, 3 arms = 6 sessions,
 * observed-average-cost ballpark $0.20-$0.40 (extrapolated from
 * write-compliance-ab's hard-mode $0.05/session average, same session
 * shape/model/effort) — sized to fit inside a $2 budget with real margin,
 * not to produce a publishable margin read. Widen `--k`/`--tasks` once
 * there's more budget to spend.
 *
 * Usage:
 *   node benchmarks/rule-recall-ab/run.mjs --dry-run
 *   node benchmarks/rule-recall-ab/run.mjs                     # pilot: 6 sessions
 *   node benchmarks/rule-recall-ab/run.mjs --k=5 --tasks=stats-multi-step,text-multi-step  # full design
 *
 * Requires ANTHROPIC_API_KEY or an `ant` CLI OAuth profile.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { TASKS as ALL_TASKS } from '../write-compliance-ab/tasksHard.mjs';
import { buildFixture, cleanupFixture, systemNoteForArm, taskPasses } from './fixtures.mjs';
import { runSession, MODEL } from './session.mjs';
import { newFunctionHasComment, sessionCalledRecall } from './grading.mjs';
import { costUsd, withConcurrency } from '../token-ab/report.mjs';

const REPO_ROOT = fileURLToPath(new URL('../../', import.meta.url));

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const K = Number(args.find(a => a.startsWith('--k='))?.split('=')[1] ?? 2);
const CONCURRENCY = Number(args.find(a => a.startsWith('--concurrency='))?.split('=')[1] ?? 1);
const HARD_CAP_USD = Number(args.find(a => a.startsWith('--cap='))?.split('=')[1] ?? 1);
const EFFORT = args.find(a => a.startsWith('--effort='))?.split('=')[1] ?? 'low';
const TASK_FILTER = args.find(a => a.startsWith('--tasks='))?.split('=')[1]?.split(',') ?? ['stats-multi-step'];
const TASKS = ALL_TASKS.filter(t => TASK_FILTER.includes(t.id));
if (TASKS.length !== TASK_FILTER.length) {
  const found = new Set(TASKS.map(t => t.id));
  const missing = TASK_FILTER.filter(id => !found.has(id));
  throw new Error(`--tasks referenced unknown task id(s): ${missing.join(', ')}`);
}
const OUT_NAME = args.find(a => a.startsWith('--out='))?.split('=')[1] ?? 'pilot';
// Ticket-numbered subdirectory, dry-run/live split by suffix — same
// collision-avoidance precedent write-compliance-ab's run-hard.mjs
// documents (a shared `--out=pilot` name once destroyed a sibling suite's
// pilot data).
const OUT_DIR = path.join(
  REPO_ROOT,
  'benchmarks/rule-recall-ab/results/7-rule-recall-ab',
  DRY_RUN ? `${OUT_NAME}-dry-run` : OUT_NAME
);

const ARMS = ['control', 'neuron-hook', 'neuron-mcp'];

function summarizeCompliance(results) {
  const byArm = Object.fromEntries(ARMS.map(a => [a, results.filter(r => r.arm === a)]));
  const armStats = {};
  for (const arm of ARMS) {
    const rs = byArm[arm];
    const complied = rs.filter(r => r.ruleFollowed).length;
    const taskSolved = rs.filter(r => r.taskPassed).length;
    const recalled = rs.filter(r => r.recallCalled).length;
    armStats[arm] = {
      sessions: rs.length,
      complied,
      complianceRate: rs.length ? complied / rs.length : null,
      taskSolved,
      taskSolveRate: rs.length ? taskSolved / rs.length : null,
      recallCalled: arm === 'neuron-mcp' ? recalled : null,
      costUsd: Math.round(rs.reduce((sum, r) => sum + costUsd(r.tokens), 0) * 10000) / 10000,
    };
  }
  const controlRate = armStats.control.complianceRate ?? 0;
  const margins = {};
  for (const arm of ['neuron-hook', 'neuron-mcp']) {
    margins[arm] = armStats[arm].complianceRate === null ? null : armStats[arm].complianceRate - controlRate;
  }
  return { armStats, margins };
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  // Interleaved (round-major, not task/arm-major) so a `--cap` cutoff
  // mid-run leaves every arm with a close-to-equal sample — same rationale
  // as write-compliance-ab/run-hard.mjs.
  const plan = [];
  for (let k = 0; k < K; k++) {
    for (const task of TASKS) {
      for (const arm of ARMS) {
        plan.push({ task, arm, k, sessionLabel: `${task.id}-${arm}-r${k}` });
      }
    }
  }

  console.log(
    `Ticket 7 rule-recall A/B — ${DRY_RUN ? 'DRY RUN (no API calls)' : `LIVE (${MODEL}, effort=${EFFORT}), hard cap $${HARD_CAP_USD}`}`
  );
  console.log(`${TASKS.length} task(s) x ${ARMS.length} arms x ${K} repeats = ${plan.length} sessions planned (interleaved)\n`);

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
    const withNeuron = arm !== 'control';
    const fixture = buildFixture(task, sessionLabel, withNeuron);
    fixture.systemNote = systemNoteForArm(arm);
    try {
      if (DRY_RUN) {
        const passed = taskPasses(fixture); // pre-fix: expected false
        console.log(
          `  [dry-run] ${sessionLabel}: fixture ok (${task.files.length} files, neuron=${withNeuron}), pre-fix check=${passed} (expect false)`
        );
        return {
          task: task.id,
          arm,
          sessionLabel,
          turns: 0,
          wallMs: 0,
          tokens: { input: 0, output: 0, cacheCreation: 0, cacheRead: 0 },
          taskPassed: false,
          ruleFollowed: arm !== 'control',
          recallCalled: arm === 'neuron-mcp',
          finishedCleanly: true,
        };
      }
      console.log(`  -> ${sessionLabel}`);
      const result = await runSession({ client, task, arm, fixture, sessionLabel, effort: EFFORT });
      const sessionCost = costUsd(result.tokens);
      spentUsd += sessionCost;
      const passed = taskPasses(fixture);
      const ruleFollowed = newFunctionHasComment(fixture.dir, task.id);
      const recallCalled = sessionCalledRecall(result.toolCallNames);
      console.log(
        `  <- ${sessionLabel}: task=${passed ? 'PASS' : 'FAIL'} rule=${ruleFollowed ? 'YES' : 'no'} ` +
          `${arm === 'neuron-mcp' ? `recall_called=${recallCalled ? 'YES' : 'no'} ` : ''}` +
          `turns=${result.turns}${result.cappedBy ? ` capped(${result.cappedBy})` : ''} ` +
          `($${sessionCost.toFixed(4)}, cumulative $${spentUsd.toFixed(4)})`
      );
      if (spentUsd >= HARD_CAP_USD) {
        capHit = true;
        console.log(`  [cap] hard cap $${HARD_CAP_USD} reached — no further sessions will be launched.`);
      }
      return { ...result, taskPassed: passed, ruleFollowed, recallCalled };
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
  console.log(' SCORECARD — rule compliance rate (new function has a `//` comment)');
  console.log('================================================================');
  for (const arm of ARMS) {
    const s = summary.armStats[arm];
    console.log(
      `${arm.padEnd(14)} sessions=${s.sessions}  complied=${s.complied} (${((s.complianceRate ?? 0) * 100).toFixed(0)}%)  ` +
        `task-solved=${s.taskSolved}/${s.sessions}` +
        `${s.recallCalled !== null ? `  recall-called=${s.recallCalled}/${s.sessions}` : ''}` +
        `  cost=$${s.costUsd}`
    );
  }
  console.log(
    `\nMargin over control: neuron-hook=${summary.margins['neuron-hook'] === null ? 'n/a' : (summary.margins['neuron-hook'] * 100).toFixed(0) + 'pts'}  ` +
      `neuron-mcp=${summary.margins['neuron-mcp'] === null ? 'n/a' : (summary.margins['neuron-mcp'] * 100).toFixed(0) + 'pts'}`
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
