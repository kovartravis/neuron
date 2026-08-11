/**
 * Pillar 7 — Adversarial Retrieval Quality.
 *
 * Runs the real embedder against hard negatives engineered to beat the gold
 * answer on keyword overlap, topical proximity, or staleness. Unlike the
 * baseline recall pillar this is expected to sit *below* ceiling: the point is
 * a metric with headroom that can move in both directions when retrieval
 * changes. Thresholds are therefore deliberately loose — this pillar earns its
 * keep as a tracked score, not as a tripwire.
 */
process.env.NODE_ENV = 'production';
delete process.env.NEURON_MOCK_EMBEDDER;

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import path from 'node:path';
import fs from 'node:fs';
import { NeuronMemory } from '../../src/index.js';
import { MetricsRecorder } from './metrics.js';
import { CONFIG, TIER, REPORT_DIR } from './tier.js';
import { ADVERSARIAL_CASES, buildFiller, type AdversarialFamily } from './adversarial-corpus.js';
import { ANTAGONISTIC_CASES, type AntagonisticFamily } from './antagonistic-corpus.js';

const PILLAR = 'Pillar 7: Adversarial Retrieval Quality';
const SCALE_PILLAR = 'Pillar 9: Retrieval Scale Curve';
const ANTAGONISTIC_PILLAR = 'Pillar 13: Antagonistic Recall & Abstention';

const metrics = new MetricsRecorder();
const suiteStart = Date.now();

describe('Adversarial Retrieval Benchmark', () => {
  const workDir = path.join(process.cwd(), 'src/__tests__/temp-adversarial');
  const dbPath = path.join(workDir, `adv-${Date.now()}.sqlite`);
  let memory: NeuronMemory;

  beforeAll(async () => {
    fs.mkdirSync(workDir, { recursive: true });
    // Ticket 47: workDir has no package.json/.git of its own, so
    // findProjectRoot's upward walk would otherwise escape into this repo's
    // real root and write the corpus into the real .neuron/*.md store.
    fs.writeFileSync(path.join(workDir, 'package.json'), '{}');
    process.env.NEURON_DB_PATH = dbPath;
    memory = NeuronMemory.open(workDir);

    // Filler first, then the hard negatives, then the golds. Insertion order
    // must not be what decides ranking.
    const filler = buildFiller(CONFIG.adversarialFillerCount).map(content => ({
      op: 'upsert' as const,
      category: 'learning',
      content,
      tags: ['filler'],
      importance: 2,
    }));

    const negatives = ADVERSARIAL_CASES.flatMap(c =>
      c.hardNegatives.map((content, i) => ({
        op: 'upsert' as const,
        category: 'learning',
        content,
        tags: ['negative', c.id, `neg_${i}`],
        importance: 3,
      }))
    );

    const superseded = ADVERSARIAL_CASES.filter(c => c.superseded).map(c => ({
      op: 'upsert' as const,
      category: 'learning',
      content: c.superseded!,
      tags: ['superseded', c.id],
      importance: 3,
    }));

    const golds = ADVERSARIAL_CASES.map(c => ({
      op: 'upsert' as const,
      category: 'learning',
      content: c.gold,
      tags: ['gold', c.id],
      importance: 4,
    }));

    await memory.transact([...filler, ...negatives, ...superseded, ...golds]);
  }, 600000);

  afterAll(async () => {
    try {
      await memory?.close();
    } catch {}
    try {
      fs.rmSync(workDir, { recursive: true, force: true });
    } catch {}

    metrics.writeReport(path.join(process.cwd(), REPORT_DIR, 'adversarial-metrics.json'), {
      timestamp: new Date().toISOString(),
      tier: TIER,
      suiteDurationMs: Date.now() - suiteStart,
    });
  }, 120000);

  it(PILLAR, async () => {
    const byFamily = new Map<AdversarialFamily, { n: number; at1: number; at5: number; rrSum: number }>();
    const failures: Array<{ id: string; family: string; rank: number | null; topResult: string }> = [];

    let total = 0;
    let hitsAt1 = 0;
    let hitsAt5 = 0;
    let mrrSum = 0;
    let supersededViolations = 0;

    for (let repeat = 0; repeat < CONFIG.adversarialRepeats; repeat++) {
      for (const c of ADVERSARIAL_CASES) {
        const results = await metrics.time(PILLAR, () =>
          memory.query({ text: c.query, categories: ['learning'], limit: 10 })
        );

        const rankOf = (content: string) => {
          const i = results.findIndex(r => r.content === content);
          return i === -1 ? null : i + 1;
        };

        const goldRank = rankOf(c.gold);
        const at1 = goldRank === 1;
        const at5 = goldRank !== null && goldRank <= 5;
        const rr = goldRank === null ? 0 : 1 / goldRank;

        total++;
        if (at1) hitsAt1++;
        if (at5) hitsAt5++;
        mrrSum += rr;

        const fam = byFamily.get(c.family) ?? { n: 0, at1: 0, at5: 0, rrSum: 0 };
        fam.n++;
        if (at1) fam.at1++;
        if (at5) fam.at5++;
        fam.rrSum += rr;
        byFamily.set(c.family, fam);

        // A superseded memory outranking its replacement is a correctness
        // problem, not just a quality one — stale guidance wins.
        if (c.superseded) {
          const supRank = rankOf(c.superseded);
          if (supRank !== null && (goldRank === null || supRank < goldRank)) {
            supersededViolations++;
          }
        }

        if (!at1 && repeat === 0) {
          failures.push({
            id: c.id,
            family: c.family,
            rank: goldRank,
            topResult: (results[0]?.content ?? '(none)').slice(0, 90),
          });
        }
      }
    }

    const familyBreakdown = Object.fromEntries(
      [...byFamily.entries()].map(([fam, s]) => [
        fam,
        {
          cases: s.n,
          recallAt1: round(s.at1 / s.n),
          recallAt5: round(s.at5 / s.n),
          mrr: round(s.rrSum / s.n),
        },
      ])
    );

    metrics.annotate(PILLAR, {
      corpusSize: CONFIG.adversarialFillerCount + ADVERSARIAL_CASES.length,
      cases: ADVERSARIAL_CASES.length,
      evaluations: total,
      recallAt1: round(hitsAt1 / total),
      recallAt5: round(hitsAt5 / total),
      mrr: round(mrrSum / total),
      supersededViolations,
      byFamily: familyBreakdown,
      missedAtRank1: failures,
    });

    // Loose floors: this pillar is scored and tracked, not gated at ceiling.
    // Falling through these means retrieval is doing worse than "usually finds
    // it somewhere in the top 10", which is a real regression.
    //
    // MRR floor recalibrated 2026-08-05 (0.3 -> 0.25): this bar was set at
    // 2.1.0, when `score` still blended `importance` into ranking — golds are
    // tagged importance:4 against negatives'/filler's 3/2, so the
    // pre-ticket-41 score gave every gold an artificial boost baked into this
    // pillar's own pass bar. Ticket 27 found that blend was itself a ranking
    // defect (it displaced more-relevant results), and ticket 41 correctly
    // removed it — `score` is `normRrf` alone now, so that boost is gone by
    // design, not by regression. Re-measured against a properly isolated
    // store (ticket 47 fixed this file leaking into the real `.neuron/*.md`,
    // which was masking the true number under run-to-run corpus pollution): a
    // clean run reproduces MRR 0.29375 deterministically across repeated
    // runs. The floor is recalibrated below that measured baseline, matching
    // ticket 39's own measure-first precedent, rather than left at a bar
    // calibrated against removed behavior.
    expect(total).toBeGreaterThan(0);
    expect(hitsAt5 / total, 'adversarial recall@5 collapsed').toBeGreaterThanOrEqual(0.4);
    expect(mrrSum / total, 'adversarial MRR collapsed').toBeGreaterThanOrEqual(0.25);
  }, 900000);

  it(ANTAGONISTIC_PILLAR, async () => {
    // Mirror case of PILLAR (Pillar 7): every query here is engineered to share
    // no keyword or topic with anything in the populated store (fillers, hard
    // negatives, superseded entries, golds — see antagonistic-corpus.ts's own
    // verification note). A correct system must return nothing at all; this
    // pillar's headline number is the false-accept rate, reported honestly even
    // if nonzero (ticket 17, matching ticket 39's measure-first posture — no
    // fix is attempted here even if the rate is bad).
    const byFamily = new Map<AntagonisticFamily, { n: number; falseAccepts: number }>();
    const falseAcceptDetail: Array<{ id: string; family: string; rejected: number; topResult: string }> = [];

    let total = 0;
    let falseAcceptCount = 0;

    for (const c of ANTAGONISTIC_CASES) {
      const { results, rejected } = await metrics.time(ANTAGONISTIC_PILLAR, () =>
        memory.queryGated({ text: c.query, categories: ['learning'], limit: 10 })
      );

      total++;
      const falseAccept = results.length > 0;
      if (falseAccept) falseAcceptCount++;

      const fam = byFamily.get(c.family) ?? { n: 0, falseAccepts: 0 };
      fam.n++;
      if (falseAccept) fam.falseAccepts++;
      byFamily.set(c.family, fam);

      if (falseAccept) {
        falseAcceptDetail.push({
          id: c.id,
          family: c.family,
          rejected,
          topResult: (results[0]?.content ?? '(none)').slice(0, 90),
        });
      }
    }

    const familyBreakdown = Object.fromEntries(
      [...byFamily.entries()].map(([fam, s]) => [
        fam,
        { cases: s.n, falseAcceptRate: round(s.falseAccepts / s.n) },
      ])
    );

    metrics.annotate(ANTAGONISTIC_PILLAR, {
      cases: total,
      falseAccepts: falseAcceptCount,
      falseAcceptRate: round(falseAcceptCount / total),
      byFamily: familyBreakdown,
      falseAcceptDetail,
    });

    expect(total).toBe(ANTAGONISTIC_CASES.length);
    // Not a fix-and-forget floor: a nonzero rate here is a real finding to be
    // reported (ADR 0012's "report the spread honestly" discipline), not
    // silently patched by loosening this assertion.
    expect(
      falseAcceptCount,
      `gate false-accepted ${falseAcceptCount}/${total} antagonistic (no-evidence) queries: ${JSON.stringify(falseAcceptDetail)}`
    ).toBe(0);
  }, 300000);

  it(SCALE_PILLAR, async () => {
    // Sweep corpus size to expose where latency and quality degrade. One point
    // tells you nothing about the curve.
    const curve: Array<Record<string, number>> = [];
    let inserted = CONFIG.adversarialFillerCount + ADVERSARIAL_CASES.length;

    for (const target of CONFIG.scaleSweep) {
      if (target > inserted) {
        const extra = buildFiller(target - inserted).map((content, i) => ({
          op: 'upsert' as const,
          category: 'learning',
          content: `Scale filler ${inserted + i}: ${content}`,
          tags: ['scale-filler'],
          importance: 1,
        }));
        for (let i = 0; i < extra.length; i += 500) {
          await memory.transact(extra.slice(i, i + 500));
        }
        inserted = target;
      }

      const latencies: number[] = [];
      let at1 = 0;
      for (const c of ADVERSARIAL_CASES) {
        const t = performance.now();
        const results = await memory.query({ text: c.query, categories: ['learning'], limit: 10 });
        latencies.push(performance.now() - t);
        if (results[0]?.content === c.gold) at1++;
      }

      latencies.sort((a, b) => a - b);
      curve.push({
        corpusSize: inserted,
        p50Ms: round(latencies[Math.floor(latencies.length * 0.5)]),
        p95Ms: round(latencies[Math.min(latencies.length - 1, Math.floor(latencies.length * 0.95))]),
        recallAt1: round(at1 / ADVERSARIAL_CASES.length),
      });
    }

    metrics.annotate(SCALE_PILLAR, { curve });
    metrics.record(SCALE_PILLAR, curve[curve.length - 1].p50Ms);

    expect(curve.length).toBe(CONFIG.scaleSweep.length);
    // Latency must not blow up superlinearly across the sweep.
    const first = curve[0];
    const last = curve[curve.length - 1];
    if (curve.length > 1 && first.p50Ms > 0) {
      const sizeGrowth = last.corpusSize / first.corpusSize;
      const latencyGrowth = last.p50Ms / first.p50Ms;
      metrics.annotate(SCALE_PILLAR, {
        sizeGrowth: round(sizeGrowth),
        latencyGrowth: round(latencyGrowth),
      });
      expect(latencyGrowth, 'query latency grew superlinearly with corpus size').toBeLessThan(sizeGrowth);
    }
  }, 1800000);
});

function round(n: number): number {
  return Math.round(n * 1000) / 1000;
}
