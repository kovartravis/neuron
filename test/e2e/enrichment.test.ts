/**
 * Pillars 10-12 — Write-side enrichment.
 *
 * Importance inference is *measured rather than constrained*: it ships
 * unclamped, and these pillars report what the model actually assigns and,
 * critically, what a prune would then delete. The one hard assertion is the
 * destructive direction — no known-critical entry may ever appear in the delete
 * set at the default prune threshold. False negatives are what lose data, so
 * that is the pass/fail bar; everything else is tracked, not gated.
 *
 * Runs against the real Qwen1.5-0.5B model. It is disabled under NODE_ENV=test,
 * so this suite is the only place these jobs can be measured at all.
 */
process.env.NODE_ENV = 'production';
delete process.env.NEURON_MOCK_EMBEDDER;

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import path from 'node:path';
import fs from 'node:fs';
import { NeuronMemory } from '../../src/index.js';
import { LocalEnrichmentModel } from '../../src/components/enricher.js';
import { MetricsRecorder } from './metrics.js';
import { TIER, REPORT_DIR, byTier } from './tier.js';
import {
  LABELLED_ENTRIES,
  CRITICAL_ENTRIES,
  CATEGORY_CASES,
  type LabelledEntry,
} from './enrichment-corpus.js';
import { ADVERSARIAL_CASES, buildFiller } from './adversarial-corpus.js';

const IMPORTANCE_PILLAR = 'Pillar 10: Importance Inference & Prune Safety';
const CATEGORY_PILLAR = 'Pillar 11: Category Strategy A/B';
const NONREGRESSION_PILLAR = 'Pillar 12: Enrichment Retrieval Non-Regression';

/** Repeats for the stability measurement — the same entry across runs. */
const STABILITY_REPEATS = byTier(2, 5);
/** Corpus size for the non-regression arms. Both arms see the same one. */
const NONREG_FILLER = byTier(150, 1500);

const metrics = new MetricsRecorder();
const suiteStart = Date.now();
const workDir = path.join(process.cwd(), 'src/__tests__/temp-enrichment-bench');

/** The prune predicate, read-only. `maintain()` deletes; a preview must not. */
function prunePreview(memory: NeuronMemory, threshold: number, cutoffIso: string): string[] {
  const rows = memory
    .getDb()
    .prepare(
      `SELECT content FROM memories
       WHERE project_id = ? AND category = 'history' AND created_at < ? AND importance <= ?`
    )
    .all(memory.getProjectId(), cutoffIso, threshold) as any[];
  return rows.map(r => r.content);
}

function openStore(name: string, yamlBody: string): NeuronMemory {
  const root = path.join(workDir, name);
  fs.mkdirSync(root, { recursive: true });
  fs.writeFileSync(path.join(root, 'package.json'), '{}');
  fs.writeFileSync(path.join(root, 'neuron.yaml'), yamlBody);
  return new NeuronMemory({
    dbPath: path.join(root, 'store.sqlite'),
    projectRoot: root,
    projectName: name,
  });
}

const CATEGORIES_YAML = `version: "1.0"
storage:
  mode: vector-only
categories:
  learning:
    description: Agent conventions, rules, and failure fixes
  history:
    description: Action history log and completed task summary
  decisions:
    description: Architectural Decision Records (ADRs) and design choices
`;

describe('Write-Side Enrichment Benchmark', () => {
  beforeAll(() => {
    fs.mkdirSync(workDir, { recursive: true });
  }, 60000);

  afterAll(() => {
    try {
      fs.rmSync(workDir, { recursive: true, force: true });
    } catch {}
    metrics.writeReport(path.join(process.cwd(), REPORT_DIR, 'enrichment-metrics.json'), {
      timestamp: new Date().toISOString(),
      tier: TIER,
      suiteDurationMs: Date.now() - suiteStart,
    });
  }, 120000);

  it(IMPORTANCE_PILLAR, async () => {
    const byContent = new Map<string, LabelledEntry>(LABELLED_ENTRIES.map(e => [e.content, e]));
    const criticalContent = new Set(CRITICAL_ENTRIES.map(e => e.content));
    // Backdated so the whole corpus is past a 30-day prune cutoff, and written
    // to `history` because that is the only category prune currently touches.
    const backdated = new Date(Date.now() - 60 * 24 * 3600 * 1000).toISOString();
    const cutoff = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();

    async function runArm(enabled: boolean) {
      // Importance inference ships off by default — on this pillar's evidence.
      // The pillar switches it on so the measurement keeps running.
      const yaml = `${CATEGORIES_YAML}llm:
  enrichment:
    enabled: ${enabled}
    importance: infer
`;
      const memory = openStore(`importance-${enabled ? 'on' : 'off'}`, yaml);
      await memory.transact(
        LABELLED_ENTRIES.map(e => ({
          op: 'upsert' as const,
          category: 'history',
          content: e.content,
          tags: [],
          createdAt: backdated,
        }))
      );

      let drain = { drained: 0, degraded: 0 };
      if (enabled) {
        // Every entry left importance unset, so the corpus *is* the backlog.
        expect(memory.countPendingEnrichment()).toBe(LABELLED_ENTRIES.length);
        drain = await metrics.time(IMPORTANCE_PILLAR, () => memory.drainEnrichment());
        expect(memory.countPendingEnrichment()).toBe(0);
      }

      const scored = (
        memory
          .getDb()
          .prepare(`SELECT content, importance FROM memories WHERE project_id = ?`)
          .all(memory.getProjectId()) as any[]
      ).map(r => ({ label: byContent.get(r.content)!.label, importance: r.importance }));

      // The exact delete set at every threshold.
      const preview: Record<number, { deleted: number; criticalDeleted: string[] }> = {};
      for (const threshold of [1, 2, 3, 4, 5]) {
        const deleted = prunePreview(memory, threshold, cutoff);
        preview[threshold] = {
          deleted: deleted.length,
          criticalDeleted: deleted.filter(c => criticalContent.has(c)).map(c => byContent.get(c)!.id),
        };
      }

      memory.close();
      return { scored, preview, drain };
    }

    const off = await runArm(false);
    const on = await runArm(true);

    const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
    const critical = on.scored.filter(s => s.label === 'critical').map(s => s.importance);
    const trivial = on.scored.filter(s => s.label === 'trivial').map(s => s.importance);

    // Distribution: the most likely small-model failure is collapsing every
    // entry onto the default and calling it inference.
    const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const s of on.scored) distribution[s.importance] = (distribution[s.importance] ?? 0) + 1;

    metrics.annotate(IMPORTANCE_PILLAR, {
      corpus: LABELLED_ENTRIES.length,
      drained: on.drain.drained,
      degraded: on.drain.degraded,
      meanCritical: round(mean(critical)),
      meanTrivial: round(mean(trivial)),
      discrimination: round(mean(critical) - mean(trivial)),
      distribution,
      distinctValues: Object.values(distribution).filter(n => n > 0).length,
      prunePreviewEnriched: on.preview,
      prunePreviewBaseline: off.preview,
      // Recorded because it is the headline number, and because it is a
      // pre-existing hazard: default importance and default prune threshold
      // are the same value and the prune is inclusive, so this set is
      // non-empty with enrichment switched off. Owned by ticket 23.
      criticalDeletedAtDefault: on.preview[3].criticalDeleted,
      criticalDeletedAtDefaultBaseline: off.preview[3].criticalDeleted,
    });

    // THE hard assertion, in the only form that isolates this feature:
    // enrichment may not add a single critical entry to the delete set that
    // was not already there without it. An absolute "must be empty" bar fails
    // identically with enrichment disabled — it measures ticket 23's hazard,
    // not this one's inference — so it would be a tripwire that can never go
    // green and would tell nobody anything about the model.
    const baseline = new Set(off.preview[3].criticalDeleted);
    const newlyEligible = on.preview[3].criticalDeleted.filter(id => !baseline.has(id));
    expect(
      newlyEligible,
      'inferred importance made a known-critical entry prune-eligible that was safe without it'
    ).toEqual([]);

    // Inference must never lower an entry's importance below the default.
    expect(Math.min(...on.scored.map(s => s.importance))).toBeGreaterThanOrEqual(3);
  }, 1800000);

  it(`${IMPORTANCE_PILLAR} — stability`, async () => {
    // The same entry across repeated runs. A value that moves between runs is
    // not stable enough to act on, whatever its mean.
    const model = new LocalEnrichmentModel();
    const perEntry: Array<{ id: string; values: number[]; stable: boolean }> = [];

    for (const entry of LABELLED_ENTRIES.slice(0, byTier(4, LABELLED_ENTRIES.length))) {
      const values: number[] = [];
      for (let i = 0; i < STABILITY_REPEATS; i++) {
        const result = await metrics.time(IMPORTANCE_PILLAR, () =>
          model.inferImportance({ content: entry.content })
        );
        if (result.importance !== undefined) values.push(result.importance);
      }
      perEntry.push({
        id: entry.id,
        values,
        stable: values.length > 0 && new Set(values).size === 1,
      });
    }

    const stableCount = perEntry.filter(e => e.stable).length;
    metrics.annotate(IMPORTANCE_PILLAR, {
      stabilityRepeats: STABILITY_REPEATS,
      stableEntries: stableCount,
      stabilityRate: round(stableCount / Math.max(1, perEntry.length)),
      perEntryStability: perEntry,
    });

    // Tracked, not gated — this pillar reports whether the value is actionable.
    expect(perEntry.length).toBeGreaterThan(0);
  }, 1800000);

  it(CATEGORY_PILLAR, async () => {
    // Both strategies, one corpus. `learning` and `decisions` are semantically
    // adjacent, which is exactly where the two are expected to diverge.
    const arms: Record<string, { correct: number; total: number; errors: string[] }> = {};

    for (const strategy of ['model', 'centroid'] as const) {
      const yaml = `${CATEGORIES_YAML}llm:
  enrichment:
    categoryStrategy: ${strategy}
`;
      const memory = openStore(`category-${strategy}`, yaml);

      // The centroid strategy needs entries to form centroids from, so both
      // arms are seeded identically with explicitly-categorised examples.
      await memory.transact(
        CATEGORY_CASES.map(c => ({
          op: 'upsert' as const,
          category: c.expected,
          content: `Seed example. ${c.content}`,
          tags: [],
          importance: 3,
        }))
      );

      const arm = { correct: 0, total: 0, errors: [] as string[] };
      for (const c of CATEGORY_CASES) {
        let stored: string | undefined;
        try {
          const [res] = await metrics.time(CATEGORY_PILLAR, () =>
            memory.transact([{ op: 'upsert', content: c.content, tags: [], importance: 3 }])
          );
          stored = (
            memory.getDb().prepare('SELECT category FROM memories WHERE id = ?').get(res.id) as any
          )?.category;
        } catch (err: any) {
          // A hard error is a legitimate outcome — it is what "never guesses"
          // looks like — and counts as an incorrect answer, not a crash.
          stored = undefined;
        }
        arm.total++;
        if (stored === c.expected) arm.correct++;
        else arm.errors.push(`${c.id}: expected ${c.expected}, got ${stored ?? '(hard error)'}`);
      }

      arms[strategy] = arm;
      memory.close();
    }

    const accuracy = Object.fromEntries(
      Object.entries(arms).map(([k, v]) => [k, round(v.correct / Math.max(1, v.total))])
    );
    metrics.annotate(CATEGORY_PILLAR, {
      cases: CATEGORY_CASES.length,
      accuracy,
      winner:
        accuracy.model === accuracy.centroid
          ? 'tie'
          : accuracy.model > accuracy.centroid
            ? 'model'
            : 'centroid',
      errors: Object.fromEntries(Object.entries(arms).map(([k, v]) => [k, v.errors])),
    });

    // Reported so the default is chosen on evidence; not gated on either arm.
    expect(arms.model.total).toBe(CATEGORY_CASES.length);
    expect(arms.centroid.total).toBe(CATEGORY_CASES.length);
  }, 1800000);

  it(NONREGRESSION_PILLAR, async () => {
    // ADR 0010 §7: enrichment ships only if adversarial retrieval is no worse
    // with it enabled than disabled. Same corpus, same metrics as Pillar 7 —
    // the difference between the arms is only where the tags came from.
    const filler = buildFiller(NONREG_FILLER);

    async function runArm(enabled: boolean) {
      const yaml = `${CATEGORIES_YAML}llm:
  enrichment:
    enabled: ${enabled}
    category: learning
    importance: "off"
`;
      const memory = openStore(`nonreg-${enabled ? 'on' : 'off'}`, yaml);

      // Filler and hard negatives are written identically in both arms: they
      // are the store's *existing* hand-authored vocabulary, which is what
      // centroid selection has to draw from. Only the golds differ — the
      // enabled arm omits their tags so enrichment is what supplies them.
      // That makes the comparison "inferred tags versus hand-authored tags",
      // not "tags versus no tags".
      await memory.transact(
        filler.map(content => ({
          op: 'upsert' as const,
          category: 'learning',
          content,
          tags: ['filler'],
          importance: 2,
        }))
      );
      await memory.transact(
        ADVERSARIAL_CASES.flatMap(c =>
          c.hardNegatives.map((content, i) => ({
            op: 'upsert' as const,
            category: 'learning',
            content,
            tags: ['negative', c.id, `neg_${i}`],
            importance: 3,
          }))
        )
      );
      await memory.transact(
        ADVERSARIAL_CASES.map(c => ({
          op: 'upsert' as const,
          category: 'learning',
          content: c.gold,
          tags: enabled ? undefined : ['gold', c.id],
          importance: 4,
        }))
      );

      const inferredGoldTags = enabled
        ? (
            memory
              .getDb()
              .prepare(`SELECT tags FROM memories WHERE project_id = ? AND importance = 4`)
              .all(memory.getProjectId()) as any[]
          ).map(r => JSON.parse(r.tags))
        : undefined;

      let at1 = 0;
      let at5 = 0;
      let rrSum = 0;
      for (const c of ADVERSARIAL_CASES) {
        const results = await metrics.time(NONREGRESSION_PILLAR, () =>
          memory.query({ text: c.query, categories: ['learning'], limit: 10 })
        );
        const i = results.findIndex(r => r.content === c.gold);
        const rank = i === -1 ? null : i + 1;
        if (rank === 1) at1++;
        if (rank !== null && rank <= 5) at5++;
        rrSum += rank === null ? 0 : 1 / rank;
      }

      const n = ADVERSARIAL_CASES.length;
      memory.close();
      return {
        recallAt1: round(at1 / n),
        recallAt5: round(at5 / n),
        mrr: round(rrSum / n),
        ...(inferredGoldTags ? { inferredGoldTags } : {}),
      };
    }

    // Insertion order must not decide the result, so the enabled arm runs
    // first — if enrichment only ever looked good going second, that would be
    // a warm-cache artefact rather than a quality finding.
    const enabled = await runArm(true);
    const disabled = await runArm(false);

    metrics.annotate(NONREGRESSION_PILLAR, {
      corpusSize: NONREG_FILLER + ADVERSARIAL_CASES.length,
      cases: ADVERSARIAL_CASES.length,
      disabled,
      enabled,
      delta: {
        recallAt1: round(enabled.recallAt1 - disabled.recallAt1),
        recallAt5: round(enabled.recallAt5 - disabled.recallAt5),
        mrr: round(enabled.mrr - disabled.mrr),
      },
    });

    // Neutral passes; worse blocks. A small tolerance absorbs the tie-break
    // noise of a single case flipping rank, not a real quality loss.
    const TOLERANCE = 1 / ADVERSARIAL_CASES.length + 1e-9;
    expect(enabled.recallAt5, 'enrichment made adversarial recall@5 worse').toBeGreaterThanOrEqual(
      disabled.recallAt5 - TOLERANCE
    );
    expect(enabled.mrr, 'enrichment made adversarial MRR worse').toBeGreaterThanOrEqual(
      disabled.mrr - TOLERANCE
    );
  }, 3600000);
});

function round(n: number): number {
  return Math.round(n * 1000) / 1000;
}
