import { spawnSync } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

/**
 * Ticket 15 (neuron-2.3.0): aggregates the token-economics findings from
 * tickets 07/08/10+18/14 into one artifact the dashboard renders alongside
 * the retrieval pillars, so a skeptic finds "does this cost more than it's
 * worth" next to "does it find the right thing" rather than buried in
 * tracker tickets. Reuses each ticket's own committed result artifacts —
 * this file aggregates and labels them, it does not re-measure anything.
 *
 * The "confirmed" redundancy bar (>=0.70 cosine) reproduces ticket 08's own
 * findings.md reasoning: ticket 39 found 0.50-0.70 is this embedder's noise
 * floor, so 0.70 (the top of that band) is the "confidently redundant" cut.
 */
const REDUNDANCY_BAR = 0.7;

export function computeTokenEconomics(rootDir) {
  const budget = computeBudget(rootDir);
  const redundancy = computeRedundancy(rootDir);
  const counterfactualAb = readTokenAbResult(rootDir, '18-rerun-counterfactual-ab-post-supersession', {
    ticket: 18,
    supersedesTicket: 10,
    treatmentArm: 'memory',
    controlArm: 'control',
    narrative:
      "Ticket 10's original 4-task run found the memory arm failed MORE often than " +
      'no-memory control (33% vs 17%) — both misses traced to a superseded ' +
      "decisions.md entry outranking its own correction. Ticket 17 fixed that " +
      "(supersession), and this re-run of the 2 regressed tasks confirms the fix: " +
      'memory-arm failure dropped to 0%, beating control (unchanged at 33%). No ' +
      'measured token difference either run — memory sessions read more context, ' +
      'not fewer.',
  });
  const gitlogAb = readTokenAbResult(rootDir, '14-git-log-hook-vs-agent-log-ab', {
    ticket: 14,
    treatmentArm: 'gitlog',
    controlArm: 'agent',
    narrative:
      'Hook-injected git-log search beat the agent running `git log` itself on every ' +
      'raw number (0% vs 11% failure, ~17.4k vs ~49.6k mean tokens) but the token gap ' +
      "does not clear this suite's own no-measured-difference guard (diff smaller than " +
      'the observed spread, driven by agent-arm variance on one task). Maintainer ruled ' +
      'to build it anyway, on the raw numbers.',
  });
  // Ticket 19's real run predates this ticket's own aggregation but was
  // never reflected back onto the map/ticket bookkeeping (Status is still
  // "claimed") even though it already shipped as the README's headline
  // number (commit 0bea898) — see this ticket's own Answer/Comments.
  const swebenchAb = readTokenAbResult(rootDir, '19-synthetic-fixture-counterfactual-ab/full-injection-low', {
    ticket: 19,
    treatmentArm: 'injection',
    controlArm: 'control',
    narrative:
      'Real SWE-bench Lite checkouts pinned before their real fix landed, so the answer ' +
      'is structurally absent without recall — a cleaner instrument than 10/18, which ' +
      "dogfooded this repo, where control could stumble onto an answer in ordinary docs. " +
      'Pooled 19,267 -> 8,144 tokens (57.7%), 16/16 correct in both arms. One task ' +
      '(`matplotlib-24265`) separates completely (Mann-Whitney U=0, p=0.029); the other ' +
      "(`django-11019`, 24.9%) doesn't reach significance alone. This suite's own pooled " +
      'no-measured-difference guard (same statistic ticket 10 used) prints true here — a ' +
      "known reporting gap: it washes out a real per-task effect against another task's " +
      'unrelated variance, so the per-task numbers above are the correct read, not the ' +
      'pooled verdict field.',
  });

  const notEstablished = [
    {
      ticket: 24,
      title: 'Architecture Card A/B: With vs Without',
      reason:
        'Harness built and dry-run-validated; the live pilot has not run — blocked on ' +
        'choosing a funded execution path (API key vs. driven Claude Code sessions).',
    },
  ];

  return {
    generatedAt: new Date().toISOString(),
    budget,
    redundancy,
    counterfactualAb,
    gitlogAb,
    swebenchAb,
    notEstablished,
  };
}

function computeBudget(rootDir) {
  const cliPath = path.join(rootDir, 'dist', 'cli.js');
  let live = null;
  if (fs.existsSync(cliPath)) {
    const result = spawnSync('node', [cliPath, 'status'], { cwd: rootDir, encoding: 'utf8' });
    const line = (result.stdout ?? '').trim().split('\n').findLast(l => l.startsWith('{'));
    if (line) {
      try {
        live = JSON.parse(line).recallCost ?? null;
      } catch {
        live = null;
      }
    }
  }
  return {
    honestyBand: 'established',
    ticket: 7,
    sessionStartCharBudget: 6000,
    prePromptCharBudget: 1500,
    epochCharBudget: live?.epochCharBudget ?? 18000,
    charsPerTokenRatio: live?.charsPerTokenRatio ?? 3,
    epochTokenBudgetApprox: live?.epochTokenBudgetApprox ?? 6000,
    live,
    narrative:
      'Per-epoch (not per-session) char budget, hard stop on exhaustion, published at a ' +
      'conservative 3 chars/token (~3% of a 200K window). "live" is this repo\'s own ' +
      "recorded cost from `neuron status`, not a projection.",
  };
}

function computeRedundancy(rootDir) {
  const resultsPath = path.join(rootDir, 'benchmarks', 'results', '08-injection-redundancy', 'results.json');
  const entries = readJson(resultsPath);
  if (!entries) return { honestyBand: 'not run', ticket: 8, byCategory: [] };

  const byCategory = new Map();
  for (const e of entries) {
    if (!byCategory.has(e.category)) byCategory.set(e.category, []);
    byCategory.get(e.category).push(e);
  }

  const rows = [...byCategory.entries()].map(([category, items]) => {
    const uniqueEntries = items.length;
    const occurrences = items.reduce((sum, i) => sum + i.injectionCount, 0);
    const atBar = items.filter(i => i.maxSim >= REDUNDANCY_BAR);
    const occAtBar = atBar.reduce((sum, i) => sum + i.injectionCount, 0);
    const meanSim = round3(items.reduce((sum, i) => sum + i.maxSim, 0) / uniqueEntries);
    return {
      category,
      uniqueEntries,
      occurrences,
      meanSim,
      redundantEntriesAtBar: atBar.length,
      redundantOccurrencesAtBar: occAtBar,
      redundantEntryFraction: round3(atBar.length / uniqueEntries),
      redundantOccurrenceFraction: round3(occAtBar / occurrences),
    };
  });

  return {
    honestyBand: 'established',
    ticket: 8,
    bar: REDUNDANCY_BAR,
    byCategory: rows.sort((a, b) => a.category.localeCompare(b.category)),
    narrative:
      'Max cosine similarity of each injected entry against the resident corpus ' +
      '(CLAUDE.md + full git log), the overstating-cost measure the band standardized on. ' +
      '`history` is saturated redundant against `git log`; `decisions` is substantially ' +
      'redundant once a single vacuous entry is excluded; `learning` is a one-data-point ' +
      'limitation.',
  };
}

function readTokenAbResult(rootDir, resultDirName, extra) {
  const resultsPath = path.join(rootDir, 'benchmarks', 'token-ab', 'results', resultDirName, 'results.json');
  const data = readJson(resultsPath);
  if (!data) return { honestyBand: 'not run', ...extra };
  return {
    honestyBand: 'established',
    generatedAt: data.generatedAt,
    model: data.model,
    taskCount: data.taskCount,
    repeats: data.repeats,
    sessionCount: data.sessionCount,
    totalCostUsd: data.totalCostUsd,
    summary: data.summary,
    ...extra,
  };
}

function round3(n) {
  return n == null ? null : Math.round(n * 1000) / 1000;
}

function readJson(p) {
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    return null;
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const rootDir = path.resolve(__dirname, '..');
  const reportDir = path.join(rootDir, 'benchmarks', 'reports');
  fs.mkdirSync(reportDir, { recursive: true });
  const te = computeTokenEconomics(rootDir);
  const outPath = path.join(reportDir, 'token-economics.json');
  fs.writeFileSync(outPath, JSON.stringify(te, null, 2), 'utf8');
  console.log(`Token economics written to ${outPath}`);
}
