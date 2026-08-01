/**
 * Neuron Deep E2E Benchmark & Correctness Suite.
 *
 * This suite is deliberately NOT a unit test. It exercises the real production
 * pipeline end to end — the real ONNX embedder and the real Qwen1.5-0.5B code
 * summarizer — and records latency distributions alongside its assertions.
 *
 * IMPORTANT: vitest sets NODE_ENV=test, and both summarizer.preloadModel() and
 * summarizer.summarizeFile() short-circuit on that value. Left alone, the whole
 * suite would silently benchmark a string-heuristic fallback instead of the
 * product, which is why the previous revision "passed" its SLAs by ~40x while
 * completing in seconds. Pillar 6 exists to keep that regression from
 * reappearing.
 *
 * ESM hoists the imports below above these assignments, which is fine: both
 * flags are read at call time (inside summarizeFile / NeuronMemory.open), not
 * at module evaluation, so setting them here still takes effect for every test.
 */
process.env.NODE_ENV = 'production';
delete process.env.NEURON_MOCK_EMBEDDER;

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import path from 'node:path';
import fs from 'node:fs';
import { NeuronMemory } from '../../src/index.js';
import { scanProjectTopology } from '../../src/scanner/analyzer.js';
import { ingestScanResults } from '../../src/scanner/ingest.js';
import { getArchitecturalDrift } from '../../src/scanner/diff.js';
import { SmolLM2Summarizer } from '../../src/components/summarizer.js';
import { TransformersEmbedder } from '../../src/components/embedder.js';
import { generateSyntheticPolyglotWorkspace } from './synthetic-generator.js';
import { MetricsRecorder } from './metrics.js';
import { CONFIG, TIER } from './tier.js';

/**
 * Workload comes from the shared tier config so `sanity` stays a fast gate and
 * `full` is the long adversarial run. Measured on the reference machine: warm
 * topology scan ~4.3s, uncached LLM summarization ~1.57s/file. A cold first run
 * (empty summarizer cache) is substantially longer than a warm one, because
 * every file must be summarized once before the cache makes it cheap.
 */
const SCAN_ITERATIONS = CONFIG.scanIterations;
const DRIFT_ITERATIONS = CONFIG.driftIterations;
const DISTRACTOR_COUNT = CONFIG.distractorCount;
const RECALL_QUERIES = CONFIG.recallQueries;
const CONCURRENCY_OPS = CONFIG.concurrencyOps;
const COLD_SUMMARY_FILES = CONFIG.coldSummaryFiles;

const PILLAR = {
  ast: 'Pillar 1: Polyglot AST Traversal at Scale',
  recall: 'Pillar 2: Adversarial Semantic Recall & Distractor Resistance',
  concurrency: 'Pillar 3: High-Concurrency Multi-Agent Stress',
  drift: 'Pillar 4: Architectural Drift Detection & Latency SLA',
  resilience: 'Pillar 5: Storage Corruption & Self-Healing',
  pipeline: 'Pillar 6: Real Pipeline Integrity',
} as const;

const metrics = new MetricsRecorder();
const suiteStart = Date.now();

describe('Neuron Deep E2E Benchmark & Correctness Suite', () => {
  const fixtureDir = path.join(process.cwd(), 'test/e2e/fixtures/synthetic-polyglot');
  const reportPath = path.join(process.cwd(), 'benchmarks/reports/e2e-metrics.json');
  const tempDbPath = path.join(process.cwd(), `src/__tests__/temp-bench-${Date.now()}.sqlite`);
  let memory: NeuronMemory;

  beforeAll(async () => {
    process.env.NEURON_DB_PATH = tempDbPath;
    generateSyntheticPolyglotWorkspace(fixtureDir, {
      moduleCount: CONFIG.moduleCount,
      filesPerModule: CONFIG.filesPerModule,
    });
    memory = NeuronMemory.open(fixtureDir);
  }, 300000);

  afterAll(async () => {
    try {
      await memory?.close();
    } catch {}
    for (const p of [tempDbPath, `${tempDbPath}-wal`, `${tempDbPath}-shm`]) {
      try {
        if (fs.existsSync(p)) fs.rmSync(p, { force: true });
      } catch {}
    }

    metrics.writeReport(reportPath, {
      timestamp: new Date().toISOString(),
      tier: TIER,
      suiteDurationMs: Date.now() - suiteStart,
      config: {
        SCAN_ITERATIONS,
        DRIFT_ITERATIONS,
        DISTRACTOR_COUNT,
        RECALL_QUERIES,
        CONCURRENCY_OPS,
        COLD_SUMMARY_FILES,
      },
    });
  }, 120000);

  it(PILLAR.pipeline, async () => {
    // Guards the whole suite's credibility: if the summarizer or embedder is
    // stubbed, every downstream number is meaningless.
    const embedder = new TransformersEmbedder();
    const vector = await embedder.embed('architectural blueprint of a service module');
    expect(vector.length).toBeGreaterThan(0);
    const nonZero = Array.from(vector).some(v => v !== 0);
    expect(nonZero, 'embedder returned an all-zero vector (mock stub is active)').toBe(true);

    const summarizer = new SmolLM2Summarizer();
    await summarizer.preloadModel();

    // Unique content guarantees a cache miss, so this measures real generation.
    const runId = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
    let fallbackCount = 0;

    for (let i = 0; i < COLD_SUMMARY_FILES; i++) {
      const file = `bench/${runId}/service_${i}.ts`;
      const content =
        `export class PaymentProcessor${i} {\n` +
        `  async settle(amount: number, currency: string): Promise<boolean> {\n` +
        `    return amount > ${i} && currency === "USD";\n  }\n}\n` +
        `export function reconcileLedger${i}(entries: number[]): number {\n` +
        `  return entries.reduce((a, b) => a + b, ${i});\n}\n`;

      const summary = await metrics.time(PILLAR.pipeline, () =>
        summarizer.summarizeFile(file, content)
      );

      expect(typeof summary).toBe('string');
      expect(summary.length).toBeGreaterThan(5);
      // The heuristic fallback emits this exact phrasing.
      if (/exports primary project types and helper functions\.$/.test(summary)) {
        fallbackCount++;
      }
    }

    metrics.annotate(PILLAR.pipeline, {
      coldSummaries: COLD_SUMMARY_FILES,
      fallbackCount,
      llmRatio: (COLD_SUMMARY_FILES - fallbackCount) / COLD_SUMMARY_FILES,
    });

    // The model legitimately falls back on some inputs, but if *everything*
    // fell back the LLM path is not running at all.
    expect(
      fallbackCount,
      'every summary used the heuristic fallback — the LLM path is stubbed'
    ).toBeLessThan(COLD_SUMMARY_FILES);
  }, 900000);

  it(PILLAR.ast, async () => {
    let last: Awaited<ReturnType<typeof scanProjectTopology>> | undefined;

    for (let i = 0; i < SCAN_ITERATIONS; i++) {
      last = await metrics.time(PILLAR.ast, () => scanProjectTopology(fixtureDir, { depth: CONFIG.scanDepth }));
    }

    expect(last).toBeDefined();
    const scanned = last!.modules.flatMap(m => m.components.map(c => c.file));

    expect(last!.modules.length).toBeGreaterThanOrEqual(Math.min(15, CONFIG.moduleCount));
    expect(scanned.length).toBeGreaterThan(CONFIG.moduleCount * CONFIG.filesPerModule * 0.8);

    // Every language the parser claims to support must actually be traversed.
    for (const ext of ['.ts', '.py', '.go', '.rs', '.java', '.cpp', '.tsx', '.jsx', '.cs', '.swift', '.rb', '.php', '.hpp']) {
      expect(scanned.some(f => f.endsWith(ext)), `no ${ext} file was scanned`).toBe(true);
    }

    expect(last!.manifest.dependencies).toContain('express');
    expect(last!.manifest.devDependencies).toContain('typescript');

    metrics.annotate(PILLAR.ast, {
      modules: last!.modules.length,
      componentsScanned: scanned.length,
      languages: [...new Set(scanned.map(f => path.extname(f)))].sort(),
    });

    const summary = metrics.summarize(PILLAR.ast);
    expect(summary.p95Ms!).toBeLessThan(30000);
  }, 900000);

  it(PILLAR.recall, async () => {
    // Distractors are lexically similar to the gold records on purpose: they
    // share vocabulary but not meaning, so keyword-only matching cannot win.
    const distractors = Array.from({ length: DISTRACTOR_COUNT }, (_, i) => ({
      op: 'upsert' as const,
      category: 'learning',
      content: `Distractor ${i}: set the connection pool size to ${i} when tuning throughput for batch jobs`,
      tags: ['distractor', `d_${i}`],
      importance: (i % 5) + 1,
    }));

    const golds = [
      {
        query: 'how do we avoid database write contention between parallel agents',
        content:
          'Enable SQLite WAL journal mode so concurrent agent writers never block each other during transactions',
        tag: 'gold_wal',
      },
      {
        query: 'what breaks when the ONNX model files are missing at startup',
        content:
          'If the ONNX runtime cannot resolve its model weights the embedder falls back and semantic ranking degrades silently',
        tag: 'gold_onnx',
      },
      {
        query: 'why did the nightly job stop emitting coverage artifacts',
        content:
          'The CI coverage reporter requires the --coverage flag or artifacts are never produced by the nightly pipeline',
        tag: 'gold_ci',
      },
    ];

    await memory.transact([
      ...distractors,
      ...golds.map(g => ({
        op: 'upsert' as const,
        category: 'learning',
        content: g.content,
        tags: ['gold', g.tag],
        importance: 5,
      })),
    ]);

    let hitsAt1 = 0;
    let hitsAt5 = 0;

    for (let q = 0; q < RECALL_QUERIES; q++) {
      const gold = golds[q % golds.length];
      const results = await metrics.time(PILLAR.recall, () =>
        memory.query({ text: gold.query, categories: ['learning'], limit: 5 })
      );

      expect(results.length).toBeGreaterThan(0);
      if (results[0]?.content === gold.content) hitsAt1++;
      if (results.slice(0, 5).some(r => r.content === gold.content)) hitsAt5++;
    }

    const recallAt1 = hitsAt1 / RECALL_QUERIES;
    const recallAt5 = hitsAt5 / RECALL_QUERIES;

    metrics.annotate(PILLAR.recall, {
      corpusSize: DISTRACTOR_COUNT + golds.length,
      queries: RECALL_QUERIES,
      recallAt1,
      recallAt5,
    });

    expect(recallAt5, `recall@5 was ${recallAt5} against ${DISTRACTOR_COUNT} distractors`).toBeGreaterThanOrEqual(0.99);
    expect(recallAt1, `recall@1 was ${recallAt1} against ${DISTRACTOR_COUNT} distractors`).toBeGreaterThanOrEqual(0.9);

    const summary = metrics.summarize(PILLAR.recall);
    expect(summary.p95Ms!).toBeLessThan(500);
  }, 900000);

  it(PILLAR.concurrency, async () => {
    const start = performance.now();
    const failures: unknown[] = [];

    const tasks = Array.from({ length: CONCURRENCY_OPS }, (_, i) => async () => {
      try {
        if (i % 3 === 0) {
          return await memory.transact([
            {
              op: 'upsert',
              category: 'history',
              content: `Concurrent agent ${i} completed a unit of work in the shared store`,
              tags: ['e2e', 'concurrency'],
              importance: 3,
            },
          ]);
        }
        return await memory.query({
          text: 'concurrent agent work',
          categories: ['history'],
          limit: 5,
        });
      } catch (err) {
        failures.push(err);
        return null;
      }
    });

    const results = await Promise.all(tasks.map(t => t()));
    const elapsed = performance.now() - start;

    metrics.record(PILLAR.concurrency, elapsed);
    metrics.annotate(PILLAR.concurrency, {
      operations: CONCURRENCY_OPS,
      failures: failures.length,
      opsPerSec: Math.round((CONCURRENCY_OPS / elapsed) * 1000),
    });

    expect(results).toHaveLength(CONCURRENCY_OPS);
    expect(failures, `${failures.length} concurrent operations threw`).toHaveLength(0);
  }, 900000);

  it(PILLAR.drift, async () => {
    await ingestScanResults(memory, { projectDir: fixtureDir, category: 'architecture', depth: CONFIG.scanDepth });

    // 1. Round-trip convergence: a freshly ingested baseline must report zero
    //    drift. Regression guard for the card truncating what it records.
    const baseline = await getArchitecturalDrift(memory, fixtureDir);
    expect(baseline.isMissingBaseline).toBeFalsy();
    expect(
      baseline.totalChangesCount,
      `baseline reported ${baseline.totalChangesCount} phantom changes immediately after ingest`
    ).toBe(0);
    expect(baseline.hasDrift).toBe(false);

    // 2. Each drift bucket must be detected independently.
    const newModuleDir = path.join(fixtureDir, 'packages', 'drift_probe', 'src');
    fs.mkdirSync(newModuleDir, { recursive: true });
    fs.writeFileSync(
      path.join(newModuleDir, 'probe.ts'),
      'export class DriftProbe {\n  detect() { return true; }\n}\n'
    );

    const pkgPath = path.join(fixtureDir, 'package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    pkg.dependencies = { ...pkg.dependencies, 'drift-probe-dep': '^1.0.0' };
    fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));

    const mutated = await getArchitecturalDrift(memory, fixtureDir);
    expect(mutated.hasDrift).toBe(true);
    expect(mutated.newModules.some(m => m.path.includes('drift_probe'))).toBe(true);
    expect(mutated.exportChanges.some(e => e.symbol === 'DriftProbe' && e.type === 'added')).toBe(true);
    expect(
      mutated.dependencyShifts.some(d => d.package === 'drift-probe-dep' && d.type === 'added'),
      'dependency drift was not detected'
    ).toBe(true);

    metrics.annotate(PILLAR.drift, {
      baselinePhantomChanges: baseline.totalChangesCount,
      mutatedChangesDetected: mutated.totalChangesCount,
      newModulesDetected: mutated.newModules.length,
      exportChangesDetected: mutated.exportChanges.length,
      dependencyShiftsDetected: mutated.dependencyShifts.length,
    });

    // 3. Restore, re-ingest, and confirm it converges back to clean.
    fs.rmSync(path.join(fixtureDir, 'packages', 'drift_probe'), { recursive: true, force: true });
    delete pkg.dependencies['drift-probe-dep'];
    fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));
    await ingestScanResults(memory, { projectDir: fixtureDir, category: 'architecture', depth: CONFIG.scanDepth });

    // 4. Latency distribution over a steady-state clean tree.
    for (let i = 0; i < DRIFT_ITERATIONS; i++) {
      const drift = await metrics.time(PILLAR.drift, () =>
        getArchitecturalDrift(memory, fixtureDir)
      );
      expect(drift.hasDrift, `drift check ${i} did not converge`).toBe(false);
    }

    const summary = metrics.summarize(PILLAR.drift);
    expect(summary.p95Ms!).toBeLessThan(30000);
  }, 1800000);

  it(PILLAR.resilience, async () => {
    const mdDir = path.join(fixtureDir, '.neuron');
    fs.mkdirSync(mdDir, { recursive: true });

    const corruptions = [
      '---\nmalformed_yaml: [unclosed\n---\nbody text\n',
      '---\n\tbad: \tindent\n---\n',
      'no frontmatter at all, just text\n',
      '---\ncategory: learning\n---\n',
      '  binary garbage �\n',
    ];

    let survived = 0;
    for (let c = 0; c < corruptions.length * 4; c++) {
      const corruptPath = path.join(mdDir, `corrupt_${c}.md`);
      fs.writeFileSync(corruptPath, corruptions[c % corruptions.length], 'utf8');

      const res = await metrics.time(PILLAR.resilience, () =>
        memory.query({ text: 'recovery probe', categories: ['learning'], limit: 5 })
      );

      expect(Array.isArray(res)).toBe(true);
      survived++;
      fs.rmSync(corruptPath, { force: true });
    }

    metrics.annotate(PILLAR.resilience, {
      corruptionVariants: corruptions.length,
      probesSurvived: survived,
    });
    expect(survived).toBe(corruptions.length * 4);
  }, 900000);
});
