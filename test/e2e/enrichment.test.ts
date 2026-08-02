/**
 * Pillars 10-12 — Write-side enrichment.
 *
 * Pillar 10 was *Importance Inference & Prune Safety* and measured both halves.
 * The inference half is gone: it measured the judgement as noise (discrimination
 * -0.5 then +0.167, per-entry stability 0.5, a production-data-loss note rated
 * `1`), the job shipped `off` on that evidence, and ticket 26 removed it. The
 * prune-safety half is kept and is now the whole pillar, because ticket 23 left
 * the underlying hazard live: the entry default and the `neuron memory prune`
 * ceiling are both 3 and the comparison is inclusive.
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
import { MetricsRecorder } from './metrics.js';
import { TIER, REPORT_DIR, byTier } from './tier.js';
import {
  LABELLED_ENTRIES,
  CRITICAL_ENTRIES,
  CATEGORY_CASES,
  type LabelledEntry,
} from './enrichment-corpus.js';
import { ADVERSARIAL_CASES, buildFiller } from './adversarial-corpus.js';

const PRUNE_PILLAR = 'Pillar 10: Prune Safety';
const CATEGORY_PILLAR = 'Pillar 11: Category Strategy A/B';
const NONREGRESSION_PILLAR = 'Pillar 12: Enrichment Retrieval Non-Regression';

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

  it(PRUNE_PILLAR, async () => {
    const byContent = new Map<string, LabelledEntry>(LABELLED_ENTRIES.map(e => [e.content, e]));
    const criticalContent = new Set(CRITICAL_ENTRIES.map(e => e.content));
    // Backdated so the whole corpus is past a 30-day prune cutoff, and written
    // to `history` because that is the only category prune currently touches.
    const backdated = new Date(Date.now() - 60 * 24 * 3600 * 1000).toISOString();
    const cutoff = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();

    const memory = openStore('prune-safety', CATEGORIES_YAML);

    // Half the critical entries are written with an explicit `--importance 5`.
    // That flag is now the *only* thing standing between a critical entry and a
    // bare prune, so the pillar's job is to prove it works and to quantify what
    // happens to the entries that lack it.
    const guarded = new Set(CRITICAL_ENTRIES.filter((_, i) => i % 2 === 0).map(e => e.content));
    await memory.transact(
      LABELLED_ENTRIES.map(e => ({
        op: 'upsert' as const,
        category: 'history',
        content: e.content,
        tags: [],
        createdAt: backdated,
        ...(guarded.has(e.content) ? { importance: 5 } : {}),
      }))
    );

    const stored = (
      memory
        .getDb()
        .prepare(`SELECT content, importance FROM memories WHERE project_id = ?`)
        .all(memory.getProjectId()) as any[]
    ).map(r => ({
      content: r.content,
      label: byContent.get(r.content)!.label,
      importance: r.importance,
    }));

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

    const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const s of stored) distribution[s.importance] = (distribution[s.importance] ?? 0) + 1;

    const unguardedCriticalAtDefault = preview[3].criticalDeleted.length;

    metrics.annotate(PRUNE_PILLAR, {
      corpus: LABELLED_ENTRIES.length,
      guardedWithExplicitImportance: guarded.size,
      distribution,
      prunePreview: preview,
      // The headline number, and the reason this pillar survives ticket 26:
      // an entry written without `--importance` lands on 3, the prune ceiling
      // defaults to 3, and the comparison is inclusive. Owned by ticket 23,
      // still unfixed — recorded here so a regression is visible, not gated,
      // because gating it would be a tripwire that can never go green.
      criticalDeletedAtDefaultThreshold: preview[3].criticalDeleted,
      unguardedCriticalAtDefault,
    });

    // Nothing infers importance any more (ticket 26), so every entry that did
    // not pass the flag must sit on the default. A value other than 3 here
    // means inference has come back from somewhere.
    const unguarded = stored.filter(s => !guarded.has(s.content));
    expect(
      [...new Set(unguarded.map(s => s.importance))],
      'an entry written without --importance did not take the default'
    ).toEqual([3]);

    // THE hard assertion: `--importance` is the documented protection against a
    // bare prune, so it must actually protect. Every guarded entry must be
    // absent from the delete set at the default threshold.
    const guardedIds = new Set(
      stored.filter(s => guarded.has(s.content)).map(s => byContent.get(s.content)!.id)
    );
    expect(
      preview[3].criticalDeleted.filter(id => guardedIds.has(id)),
      'an entry written with --importance 5 was still prune-eligible at the default ceiling'
    ).toEqual([]);
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
