#!/usr/bin/env node
/**
 * Orchestrator for ticket 24 (Architecture Card A/B).
 *
 * Reuses ticket 10's session runner verbatim (../token-ab/session.mjs) —
 * only the fixture (card vs no-card, not memory vs control) and task set
 * differ. For each task x arm x repeat: build a fresh git-worktree fixture,
 * run one agent session, grade its ANSWER.md, tear the fixture down. Writes
 * results.json + prints token distributions, failure rates, and the risk
 * arm — same deliverables ticket 10's Scope asks for, scoped to this
 * narrower question.
 *
 * Cost/runtime, stated and approved before this harness ran anything: Claude
 * Sonnet 5 at intro pricing, 2 tasks x 2 arms x 2 repeats = 8 sessions,
 * effort 'low', estimated well under $1 (maintainer chose the minimum pilot
 * size explicitly to keep spend low).
 *
 * Usage:
 *   node benchmarks/architecture-card-ab/run.mjs              # the real run
 *   node benchmarks/architecture-card-ab/run.mjs --dry-run     # fixtures + grading only, no spend
 *   node benchmarks/architecture-card-ab/run.mjs --k=1
 *   node benchmarks/architecture-card-ab/run.mjs --concurrency=3
 *   node benchmarks/architecture-card-ab/run.mjs --tasks=id1,id2
 *   node benchmarks/architecture-card-ab/run.mjs --out=path/relative/to/repo/root
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { TASKS as ALL_TASKS } from './tasks.mjs';
import { buildFixture, cleanupFixture, pruneStaleWorktrees } from './fixtures.mjs';
import { runSession, MODEL } from '../token-ab/session.mjs';

const REPO_ROOT = fileURLToPath(new URL('../../', import.meta.url));

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const K = Number(args.find(a => a.startsWith('--k='))?.split('=')[1] ?? 2);
const CONCURRENCY = Number(args.find(a => a.startsWith('--concurrency='))?.split('=')[1] ?? 3);
const TASK_FILTER = args.find(a => a.startsWith('--tasks='))?.split('=')[1]?.split(',');
const TASKS = TASK_FILTER ? ALL_TASKS.filter(t => TASK_FILTER.includes(t.id)) : ALL_TASKS;
if (TASK_FILTER && TASKS.length !== TASK_FILTER.length) {
  const found = new Set(TASKS.map(t => t.id));
  const missing = TASK_FILTER.filter(id => !found.has(id));
  throw new Error(`--tasks referenced unknown task id(s): ${missing.join(', ')}`);
}
// OUT_DIR is keyed on --dry-run too (not just --out=), the same fix already
// applied to run-swebench-ab.mjs and its two siblings — a validation dry run
// must never land on the same path as a live, spent, committed result.
const OUT_NAME =
  args.find(a => a.startsWith('--out='))?.split('=')[1] ?? 'benchmarks/architecture-card-ab/results/24-architecture-card-ab';
const OUT_DIR = path.join(REPO_ROOT, DRY_RUN ? `${OUT_NAME}-dry-run` : OUT_NAME);

const ARMS = ['card', 'no-card'];

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

  const riskCases = [];
  for (const task of TASKS) {
    for (let k = 0; k < K; k++) {
      const withCard = results.find(r => r.task === task.id && r.arm === 'card' && r.sessionLabel.endsWith(`-r${k}`));
      const withoutCard = results.find(r => r.task === task.id && r.arm === 'no-card' && r.sessionLabel.endsWith(`-r${k}`));
      if (withCard && withoutCard && !withCard.passed && withoutCard.passed) {
        riskCases.push({ task: task.id, repeat: k, cardDetail: withCard.gradeDetail, noCardDetail: withoutCard.gradeDetail });
      }
    }
  }

  const cardMean = armStats.card.tokens.mean;
  const noCardMean = armStats['no-card'].tokens.mean;
  const spread = Math.max(
    armStats.card.tokens.max - armStats.card.tokens.min,
    armStats['no-card'].tokens.max - armStats['no-card'].tokens.min
  );
  const diff = cardMean !== null && noCardMean !== null ? noCardMean - cardMean : null; // positive = card arm cheaper
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

  console.log(`Ticket 24 architecture card A/B — ${DRY_RUN ? 'DRY RUN (no API calls)' : `LIVE (${MODEL})`}`);
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
        const answerPath = path.join(fixture.dir, 'ANSWER.md');
        fs.writeFileSync(answerPath, `[dry-run placeholder for ${sessionLabel}]`);
        const graded = task.check(fs.readFileSync(answerPath, 'utf8'));
        console.log(
          `  [dry-run] ${sessionLabel}: fixture ok, .neuron present=${fs.existsSync(path.join(fixture.dir, '.neuron'))}, systemNote=${fixture.systemNote ? fixture.systemNote.length + ' chars' : 'none'}, grade=${JSON.stringify(graded)}`
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
    `\nToken diff (no-card - card): ${summary.tokenDiff}  |  spread: ${summary.spread}  |  ` +
      `no-measured-difference: ${summary.noMeasuredDifference}`
  );
  if (summary.riskCases.length) {
    console.log(`\n⚠️  RISK ARM: card arm got these wrong while no-card got them right:`);
    for (const c of summary.riskCases) console.log(`  - ${c.task} (repeat ${c.repeat})`);
  } else {
    console.log('\nRisk arm: none — card arm never lost a repeat that no-card won.');
  }
  console.log(`\nTotal cost: $${report.totalCostUsd}`);
  console.log(`Results written to ${path.join(OUT_DIR, 'results.json')}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
