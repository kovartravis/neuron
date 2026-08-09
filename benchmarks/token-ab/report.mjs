/**
 * Reporting/aggregation logic shared by every token-ab orchestrator (ticket
 * 10's run.mjs, ticket 14's run-gitlog-ab.mjs). Kept separate from run.mjs
 * so a second A/B pillar reuses this plumbing rather than re-deriving it —
 * ticket 10's own Scope item 5 ("reuse before building"), extended to a
 * second pillar per ticket 14's Scope item 1.
 */

// Sonnet 5 intro pricing (through 2026-08-31), $/MTok. Cache write assumes
// the default 5-minute TTL (1.25x input); cache read is ~0.1x input.
export const PRICE = { input: 2.0, output: 10.0, cacheWrite: 2.5, cacheRead: 0.2 };

export function costUsd(tokens) {
  return (
    (tokens.input / 1e6) * PRICE.input +
    (tokens.output / 1e6) * PRICE.output +
    (tokens.cacheCreation / 1e6) * PRICE.cacheWrite +
    (tokens.cacheRead / 1e6) * PRICE.cacheRead
  );
}

export function percentile(sorted, p) {
  if (sorted.length === 0) return null;
  const idx = Math.min(sorted.length - 1, Math.floor(p * (sorted.length - 1)));
  return sorted[idx];
}

/**
 * @param results - flat array of session results (task, arm, sessionLabel, passed, totalTokens, tokens, gradeDetail)
 * @param tasks - the task list this run covered
 * @param k - repeats per task per arm
 * @param arms - the two arm names, e.g. ['memory', 'control'] or ['gitlog', 'agent']
 * @param treatmentArm - the arm under test (positive token diff = treatment cheaper)
 * @param controlArm - the baseline arm
 */
export function summarize(results, { tasks, k, arms, treatmentArm, controlArm }) {
  const byArm = Object.fromEntries(arms.map(a => [a, results.filter(r => r.arm === a)]));
  const armStats = {};
  for (const arm of arms) {
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

  // Risk arm: per task, did the treatment arm fail a repeat that the control
  // arm passed on the same repeat index?
  const riskCases = [];
  for (const task of tasks) {
    for (let rep = 0; rep < k; rep++) {
      const treat = results.find(
        r => r.task === task.id && r.arm === treatmentArm && r.sessionLabel.endsWith(`-r${rep}`)
      );
      const ctrl = results.find(
        r => r.task === task.id && r.arm === controlArm && r.sessionLabel.endsWith(`-r${rep}`)
      );
      if (treat && ctrl && !treat.passed && ctrl.passed) {
        riskCases.push({ task: task.id, repeat: rep, treatmentDetail: treat.gradeDetail, controlDetail: ctrl.gradeDetail });
      }
    }
  }

  // No-measured-difference guard: an arm "advantage" smaller than the
  // observed spread (max-min) on either arm is not a win.
  const treatMean = armStats[treatmentArm].tokens.mean;
  const ctrlMean = armStats[controlArm].tokens.mean;
  const spread = Math.max(
    armStats[treatmentArm].tokens.max - armStats[treatmentArm].tokens.min,
    armStats[controlArm].tokens.max - armStats[controlArm].tokens.min
  );
  const diff = treatMean !== null && ctrlMean !== null ? ctrlMean - treatMean : null; // positive = treatment cheaper
  const noMeasuredDifference = diff !== null && Math.abs(diff) < spread;

  return { armStats, riskCases, tokenDiff: diff, spread, noMeasuredDifference };
}

export async function withConcurrency(items, limit, worker) {
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
