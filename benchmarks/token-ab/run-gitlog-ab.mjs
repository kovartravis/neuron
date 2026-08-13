#!/usr/bin/env node
/**
 * Orchestrator for ticket 14 (Git-Log Recall: Hook-Injected Search vs
 * Agent-Invoked `git log`). Reuses ticket 10's harness verbatim (Scope item
 * 1): same fixture builder (`fixtures.mjs`), same session runner
 * (`session.mjs`), same reporting/aggregation (`report.mjs`). The only new
 * pieces are the task set (`gitlog-tasks.mjs`) and the minimal
 * hook-injection prototype (`gitlog-search.mjs`).
 *
 * Both arms are the SAME fixture shape ticket 10's 'control' arm used: a
 * clean git-worktree checkout with .neuron/ removed and no system note by
 * default (this ticket tests git-log recall, independent of the memory
 * store entirely — both arms have full, identical git history available
 * via ordinary `git log`/`git show`/`git grep` bash calls).
 *
 *   agent   — gets nothing extra. Must run `git log` (or friends) itself if
 *             it decides history is relevant.
 *   gitlog  — gets a hook-injected git-log search result up front, in the
 *             system prompt, mirroring the existing recall hook's
 *             session-start injection shape. The search itself
 *             (gitlog-search.mjs) is generic keyword matching against the
 *             task's own declared `gitLogQuery` terms, not hand-picked
 *             winning content.
 *
 * Cost/runtime must be stated and approved before this is run live —
 * ticket 14 Scope item 6, same discipline ticket 10 Scope item 6 used.
 * This harness is dry-run-validated only as of ticket 14's first pickup;
 * see the ticket's own Comments for the live-run credential/budget status.
 *
 * Usage:
 *   node benchmarks/token-ab/run-gitlog-ab.mjs              # the real run (needs ANTHROPIC_API_KEY / ant profile)
 *   node benchmarks/token-ab/run-gitlog-ab.mjs --dry-run     # exercises fixtures + search + grading only, no API calls, no spend
 *   node benchmarks/token-ab/run-gitlog-ab.mjs --k=1         # override repeat count (e.g. a cheap pilot)
 *   node benchmarks/token-ab/run-gitlog-ab.mjs --concurrency=3
 *   node benchmarks/token-ab/run-gitlog-ab.mjs --tasks=id1,id2
 *   node benchmarks/token-ab/run-gitlog-ab.mjs --out=path/relative/to/repo/root  # default: ticket 14's own audit dir
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { TASKS as ALL_TASKS } from './gitlog-tasks.mjs';
import { buildFixture, cleanupFixture, pruneStaleWorktrees } from './fixtures.mjs';
import { searchGitLog, formatGitLogNote } from './gitlog-search.mjs';
import { runSession, MODEL } from './session.mjs';
import { costUsd, summarize, withConcurrency } from './report.mjs';

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
// `--out=` names the results subdirectory. The `-dry-run` suffix is NOT
// cosmetic (see run-swebench-ab.mjs's own comment on this exact bug class):
// without it, a dry run silently overwrites the results.json a real, paid
// run wrote to the same default path. A dry run must never be able to land
// on a live run's path.
const OUT_NAME = args.find(a => a.startsWith('--out='))?.split('=')[1] ??
  'benchmarks/token-ab/results/14-git-log-hook-vs-agent-log-ab';
const OUT_DIR = path.join(REPO_ROOT, DRY_RUN ? `${OUT_NAME}-dry-run` : OUT_NAME);

const ARMS = ['gitlog', 'agent'];
const TREATMENT_ARM = 'gitlog';
const CONTROL_ARM = 'agent';

function buildGitlogFixture(task, arm, sessionTag) {
  // Reuse ticket 10's 'control' shape verbatim: clean worktree, .neuron
  // removed, no system note by default. Only the 'gitlog' arm then layers
  // an injected note on top.
  const fixture = buildFixture('control', sessionTag);
  if (arm === 'gitlog') {
    const entries = searchGitLog(fixture.dir, task.gitLogQuery);
    fixture.systemNote = formatGitLogNote(entries, task.gitLogQuery);
  }
  return fixture;
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

  console.log(`Ticket 14 git-log recall A/B — ${DRY_RUN ? 'DRY RUN (no API calls)' : `LIVE (${MODEL})`}`);
  console.log(`${TASKS.length} tasks x ${ARMS.length} arms x ${K} repeats = ${plan.length} sessions\n`);

  let client = null;
  if (!DRY_RUN) {
    const { default: Anthropic } = await import('@anthropic-ai/sdk');
    client = new Anthropic();
  }

  const results = await withConcurrency(plan, DRY_RUN ? 1 : CONCURRENCY, async ({ task, arm, sessionLabel }) => {
    const fixture = buildGitlogFixture(task, arm, sessionLabel);
    try {
      if (DRY_RUN) {
        // Exercise fixture + search + grading plumbing without spending anything.
        const answerPath = path.join(fixture.dir, 'ANSWER.md');
        fs.writeFileSync(answerPath, `[dry-run placeholder for ${sessionLabel}]`);
        const graded = task.check(fs.readFileSync(answerPath, 'utf8'));
        console.log(
          `  [dry-run] ${sessionLabel}: fixture ok, .neuron present=${fs.existsSync(path.join(fixture.dir, '.neuron'))}, ` +
            `noteChars=${fixture.systemNote?.length ?? 0}, grade=${JSON.stringify(graded)}`
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
      console.log(
        `  <- ${sessionLabel}: ${result.passed ? 'PASS' : 'FAIL'} turns=${result.turns} tokens=${result.totalTokens} ($${costUsd(result.tokens).toFixed(4)})`
      );
      return result;
    } finally {
      cleanupFixture(fixture);
    }
  });

  const summary = summarize(results, { tasks: TASKS, k: K, arms: ARMS, treatmentArm: TREATMENT_ARM, controlArm: CONTROL_ARM });
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
    `\nToken diff (${CONTROL_ARM} - ${TREATMENT_ARM}): ${summary.tokenDiff}  |  spread: ${summary.spread}  |  ` +
      `no-measured-difference: ${summary.noMeasuredDifference}`
  );
  if (summary.riskCases.length) {
    console.log(`\n⚠️  RISK ARM: ${TREATMENT_ARM} arm got these wrong while ${CONTROL_ARM} got them right:`);
    for (const c of summary.riskCases) console.log(`  - ${c.task} (repeat ${c.repeat})`);
  } else {
    console.log(`\nRisk arm: none — ${TREATMENT_ARM} arm never lost a repeat that ${CONTROL_ARM} won.`);
  }
  console.log(`\nTotal cost: $${report.totalCostUsd}`);
  console.log(`Results written to ${path.join(OUT_DIR, 'results.json')}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
