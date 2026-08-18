#!/usr/bin/env node
/**
 * Hard-mode orchestrator for ticket 7, Map — MCP Server & Setup/Onboarding
 * Skill Split. Follow-up to run.mjs's pilot, which hit a ceiling effect:
 * `control` complied 100% on its first live run (n=2) because "add any
 * comment above a new function" is apparently a default Sonnet 5 habit, not
 * something that needs remembering. This reuses everything run.mjs built
 * (session.mjs, fixtures.mjs, the three arms, the cost/concurrency
 * plumbing) and changes exactly two things, both from fixtures.mjs's hard
 * exports: the rule now requires an exact, arbitrary format
 * (`HARD_RULE_TEXT`'s `// @behavior:` tag) habit alone won't satisfy, and
 * it's buried as one bullet among several unrelated style bullets
 * (`HARD_STYLE_NOTE`) instead of being the system note's sole content —
 * same two-change shape as write-compliance-ab's own ticket-5 hard mode.
 *
 * Usage:
 *   node benchmarks/rule-recall-ab/run-hard.mjs --dry-run
 *   node benchmarks/rule-recall-ab/run-hard.mjs                     # pilot: 6 sessions
 *   node benchmarks/rule-recall-ab/run-hard.mjs --k=5 --tasks=stats-multi-step,text-multi-step
 *
 * Requires ANTHROPIC_API_KEY or an `ant` CLI OAuth profile.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { TASKS as ALL_TASKS } from '../write-compliance-ab/tasksHard.mjs';
import { buildFixture, cleanupFixture, systemNoteForArmHard, taskPasses, HARD_RULE_TEXT } from './fixtures.mjs';
import { runSession, MODEL } from './session.mjs';
import { newFunctionHasBehaviorTag, sessionCalledRecall } from './grading.mjs';
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
const OUT_NAME = args.find(a => a.startsWith('--out='))?.split('=')[1] ?? 'hard';
// Ticket-numbered subdirectory, dry-run/live split by suffix, `hard` vs.
// `pilot` split by name — same collision-avoidance precedent
// write-compliance-ab's run-hard.mjs documents.
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

  const plan = [];
  for (let k = 0; k < K; k++) {
    for (const task of TASKS) {
      for (const arm of ARMS) {
        plan.push({ task, arm, k, sessionLabel: `${task.id}-${arm}-r${k}` });
      }
    }
  }

  console.log(
    `Ticket 7 HARD rule-recall A/B — ${DRY_RUN ? 'DRY RUN (no API calls)' : `LIVE (${MODEL}, effort=${EFFORT}), hard cap $${HARD_CAP_USD}`}`
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
    const fixture = buildFixture(task, sessionLabel, withNeuron, HARD_RULE_TEXT);
    fixture.systemNote = systemNoteForArmHard(arm);
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
      const result = await runSession({
        client,
        task,
        arm,
        fixture,
        sessionLabel,
        effort: EFFORT,
        hookInjectionText: HARD_RULE_TEXT,
      });
      const sessionCost = costUsd(result.tokens);
      spentUsd += sessionCost;
      const passed = taskPasses(fixture);
      const ruleFollowed = newFunctionHasBehaviorTag(fixture.dir, task.id);
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
    mode: 'hard',
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
  console.log(' SCORECARD — rule compliance rate (exact `// @behavior:` tag), HARD suite');
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
