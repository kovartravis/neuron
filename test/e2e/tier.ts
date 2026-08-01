/**
 * Benchmark tiering.
 *
 * The same pillar definitions run at two very different intensities:
 *
 *   sanity — a fast pre-merge gate. Every pillar still executes end to end
 *            against the real pipeline, but at the smallest workload that can
 *            still fail meaningfully. Target: a couple of minutes.
 *
 *   full   — the adversarial benchmark. Large corpora, deep sweeps, real
 *            multi-process contention, and hard negatives designed to drive
 *            scores off their ceiling. Target: long enough to hurt.
 *
 * Tier is selected with NEURON_BENCH_TIER; anything other than 'full' is
 * treated as sanity so a bare `vitest run` on these files stays quick.
 */

export type BenchTier = 'sanity' | 'full';

export const TIER: BenchTier = process.env.NEURON_BENCH_TIER === 'full' ? 'full' : 'sanity';

export const isFull = TIER === 'full';

/** Pick a value per tier. */
export function byTier<T>(sanity: T, full: T): T {
  return isFull ? full : sanity;
}

export const CONFIG = {
  /** Synthetic workspace size for the AST/drift pillars. */
  moduleCount: byTier(6, 20),
  filesPerModule: byTier(8, 25),
  scanDepth: 4,

  /** Repeat counts for latency distributions. */
  scanIterations: byTier(3, 25),
  driftIterations: byTier(3, 30),

  /** Pillar 2 — baseline (easy) recall. */
  distractorCount: byTier(200, 2000),
  recallQueries: byTier(30, 300),

  /** Pillar 3 — in-process concurrency. */
  concurrencyOps: byTier(100, 400),

  /** Pillar 6 — uncached LLM summarization probes (~2s each). */
  coldSummaryFiles: byTier(3, 20),

  /** Pillar 7 — adversarial recall. */
  adversarialRepeats: byTier(1, 5),
  adversarialFillerCount: byTier(300, 3000),

  /** Pillar 8 — multi-process contention. */
  processWorkers: byTier(3, 8),
  writesPerWorker: byTier(25, 150),
  crashRecoveryRounds: byTier(1, 3),

  /** Corpus sizes swept for the scale curve (full tier only). */
  scaleSweep: byTier([500], [500, 2000, 10000]),
} as const;

export const REPORT_DIR = 'benchmarks/reports';
