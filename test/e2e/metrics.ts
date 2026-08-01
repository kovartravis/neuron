import fs from 'node:fs';
import path from 'node:path';

/**
 * Latency/throughput recorder for the E2E benchmark suite.
 *
 * The suite is both a correctness gate and a benchmark, so every pillar records
 * real measurements here rather than only asserting pass/fail. The collected
 * numbers are written to a metrics file that the runner merges into its
 * scorecard — the runner never has to infer results by scraping stdout.
 */

export interface PillarMetrics {
  pillar: string;
  samples: number;
  p50Ms?: number;
  p95Ms?: number;
  p99Ms?: number;
  minMs?: number;
  maxMs?: number;
  meanMs?: number;
  totalMs?: number;
  throughputPerSec?: number;
  extra?: Record<string, unknown>;
}

export function percentile(sortedAsc: number[], p: number): number {
  if (sortedAsc.length === 0) return 0;
  const rank = (p / 100) * (sortedAsc.length - 1);
  const lower = Math.floor(rank);
  const upper = Math.ceil(rank);
  if (lower === upper) return sortedAsc[lower];
  return sortedAsc[lower] + (sortedAsc[upper] - sortedAsc[lower]) * (rank - lower);
}

export class MetricsRecorder {
  private pillars = new Map<string, number[]>();
  private extras = new Map<string, Record<string, unknown>>();

  record(pillar: string, latencyMs: number): void {
    if (!this.pillars.has(pillar)) this.pillars.set(pillar, []);
    this.pillars.get(pillar)!.push(latencyMs);
  }

  /** Time an operation, record its latency, and return its result. */
  async time<T>(pillar: string, fn: () => Promise<T>): Promise<T> {
    const start = performance.now();
    try {
      return await fn();
    } finally {
      this.record(pillar, performance.now() - start);
    }
  }

  annotate(pillar: string, extra: Record<string, unknown>): void {
    this.extras.set(pillar, { ...(this.extras.get(pillar) ?? {}), ...extra });
  }

  summarize(pillar: string): PillarMetrics {
    const samples = [...(this.pillars.get(pillar) ?? [])].sort((a, b) => a - b);
    const extra = this.extras.get(pillar);

    if (samples.length === 0) {
      return { pillar, samples: 0, ...(extra ? { extra } : {}) };
    }

    const totalMs = samples.reduce((a, b) => a + b, 0);
    return {
      pillar,
      samples: samples.length,
      p50Ms: round(percentile(samples, 50)),
      p95Ms: round(percentile(samples, 95)),
      p99Ms: round(percentile(samples, 99)),
      minMs: round(samples[0]),
      maxMs: round(samples[samples.length - 1]),
      meanMs: round(totalMs / samples.length),
      totalMs: round(totalMs),
      throughputPerSec: round((samples.length / totalMs) * 1000),
      ...(extra ? { extra } : {}),
    };
  }

  all(): PillarMetrics[] {
    const names = new Set([...this.pillars.keys(), ...this.extras.keys()]);
    return [...names].map(n => this.summarize(n));
  }

  writeReport(filePath: string, meta: Record<string, unknown> = {}): void {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(
      filePath,
      JSON.stringify({ ...meta, pillars: this.all() }, null, 2),
      'utf8'
    );
  }
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}
