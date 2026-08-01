import { spawnSync } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

/**
 * Driver for the deep E2E benchmark & correctness suite.
 *
 * Pillar results come from vitest's JSON reporter and the metrics file the
 * suite itself writes — never from scraping stdout. The previous revision
 * inferred status with `!output.includes(name) || overallPassed`, which marked
 * a pillar PASSED precisely when it had NOT run, so a suite that died early
 * scored better than one that ran and failed.
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const reportDir = path.join(rootDir, 'benchmarks', 'reports');
const metricsPath = path.join(reportDir, 'e2e-metrics.json');
const vitestJsonPath = path.join(reportDir, 'e2e-vitest-results.json');
const scorecardPath = path.join(reportDir, 'e2e-benchmark-scorecard.json');

const TIER = process.argv.includes('--full') ? 'full' : 'sanity';
// Only the full tier is expected to be long; sanity is a fast pre-merge gate.
const MIN_RUNTIME_MS = TIER === 'full' ? 5 * 60 * 1000 : 0;
const historyPath = path.join(reportDir, 'history.json');
const SUITES = [
  'test/e2e/benchmark-suite.test.ts',
  'test/e2e/adversarial-recall.test.ts',
  'test/e2e/concurrency-stress.test.ts',
  'test/e2e/enrichment.test.ts',
];

// Re-render the scorecard from the artifacts already on disk. Useful for
// iterating on the report without paying for another full run.
const reportOnly = process.argv.includes('--report-only');

fs.mkdirSync(reportDir, { recursive: true });
if (!reportOnly) {
  for (const stale of [metricsPath, vitestJsonPath]) {
    if (fs.existsSync(stale)) fs.rmSync(stale, { force: true });
  }
}

console.log('================================================================');
console.log(` 🏛️  Neuron Benchmark Suite — ${TIER.toUpperCase()} tier`);
console.log('================================================================\n');
console.log('Runs the REAL pipeline (ONNX embedder + Qwen1.5-0.5B summarizer).');
console.log('A cold summarizer cache makes the first run substantially longer.\n');

let testResult = { status: 0 };
let totalDurationMs = 0;

if (reportOnly) {
  console.log('(--report-only: rebuilding scorecard from existing artifacts)\n');
} else {
  console.log('Step 1: Building...');
  const build = spawnSync('npm', ['run', 'build'], { cwd: rootDir, stdio: 'inherit' });
  if (build.status !== 0) {
    console.error('❌ Build failed. Aborting.');
    process.exit(1);
  }

  console.log('\nStep 2: Executing benchmark matrix...\n');
  const startTime = Date.now();
  testResult = spawnSync(
    'node',
    [
      './node_modules/vitest/vitest.mjs',
      'run',
      ...SUITES,
      '--reporter=verbose',
      '--reporter=json',
      `--outputFile.json=${vitestJsonPath}`,
    ],
    { cwd: rootDir, stdio: 'inherit', env: { ...process.env, NEURON_BENCH_TIER: TIER } }
  );
  totalDurationMs = Date.now() - startTime;
}

// ---- Collect real per-pillar results -------------------------------------

const vitest = readJson(vitestJsonPath);
const metrics = readJson(metricsPath);
// Each suite writes its own metrics file; merge them into one pillar lookup.
const extraMetrics = ['adversarial-metrics.json', 'contention-metrics.json', 'enrichment-metrics.json']
  .map(f => readJson(path.join(reportDir, f)))
  .filter(Boolean);
const allPillarMetrics = [
  ...(metrics?.pillars ?? []),
  ...extraMetrics.flatMap(m => m.pillars ?? []),
];

// In report-only mode the wall-clock above is meaningless; use what the suite
// recorded for itself so the runtime floor is still evaluated honestly.
if (reportOnly) {
  totalDurationMs = metrics?.suiteDurationMs ?? 0;
}

const assertionResults = (vitest?.testResults ?? []).flatMap(f => f.assertionResults ?? []);
const metricsByPillar = new Map(allPillarMetrics.map(p => [p.pillar, p]));

const pillars = assertionResults.map(a => {
  // Use `title`, not `fullName`: vitest space-joins ancestor titles into
  // fullName with no delimiter, so there is nothing to reliably split on and
  // the metrics lookup silently misses every pillar.
  const name = a.title ?? 'unknown';
  const m = metricsByPillar.get(name);
  return {
    pillar: name,
    status: a.status === 'passed' ? 'PASSED' : a.status === 'pending' ? 'SKIPPED' : 'FAILED',
    durationMs: a.duration ?? null,
    failureMessages: a.failureMessages ?? [],
    metrics: m
      ? {
          samples: m.samples,
          p50Ms: m.p50Ms,
          p95Ms: m.p95Ms,
          p99Ms: m.p99Ms,
          meanMs: m.meanMs,
          maxMs: m.maxMs,
          throughputPerSec: m.throughputPerSec,
          ...(m.extra ? { detail: m.extra } : {}),
        }
      : null,
  };
});

const ran = pillars.length;
const passed = pillars.filter(p => p.status === 'PASSED').length;
const failed = pillars.filter(p => p.status === 'FAILED').length;

// A suite that never reported any pillar is a failure, not a 100% score.
const scorePercent = ran === 0 ? 0 : Math.round((passed / ran) * 100);
const meetsRuntimeFloor = totalDurationMs >= MIN_RUNTIME_MS;
const overallPassed = testResult.status === 0 && ran > 0 && failed === 0;

const grade =
  ran === 0 ? 'F'
  : scorePercent === 100 ? 'A+'
  : scorePercent >= 80 ? 'B'
  : scorePercent >= 60 ? 'C-'
  : scorePercent >= 40 ? 'D'
  : 'F';

const advDetail = metricsByPillar.get('Pillar 7: Adversarial Retrieval Quality')?.extra ?? {};
const contDetail = metricsByPillar.get('Pillar 8: Multi-Process Contention & Crash Recovery')?.extra ?? {};

const scorecard = {
  timestamp: new Date().toISOString(),
  tier: TIER,
  durationMs: totalDurationMs,
  durationMin: Math.round((totalDurationMs / 60000) * 100) / 100,
  meetsRuntimeFloor,
  runtimeFloorMs: MIN_RUNTIME_MS,
  overallStatus: overallPassed ? 'PASSED' : 'FAILED',
  grade,
  scorePercent,
  pillarsRan: ran,
  pillarsPassed: passed,
  pillarsFailed: failed,
  suiteConfig: metrics?.config ?? null,
  pillars,
};

fs.writeFileSync(scorecardPath, JSON.stringify(scorecard, null, 2), 'utf8');

// Append a compact row per run so the dashboard can show movement over time.
// Only headline numbers are kept; the full artifacts are overwritten each run.
if (!reportOnly) {
  const history = readJson(historyPath) ?? [];
  history.push({
    timestamp: scorecard.timestamp,
    tier: TIER,
    grade,
    scorePercent,
    pillarsRan: ran,
    pillarsPassed: passed,
    durationMin: scorecard.durationMin,
    adversarialRecallAt1: advDetail.recallAt1 ?? null,
    adversarialMrr: advDetail.mrr ?? null,
    droppedWriteRatio: contDetail.droppedWriteRatio ?? null,
    lostWrites: contDetail.lostWrites ?? null,
  });
  // Bounded so the file cannot grow without limit across many runs.
  fs.writeFileSync(historyPath, JSON.stringify(history.slice(-200), null, 2), 'utf8');
}

const { generateDashboard } = await import('./generate-dashboard.js');
const dashboardPath = generateDashboard(reportDir);

// ---- Report ---------------------------------------------------------------

console.log('\n================================================================');
console.log(` 📊 E2E BENCHMARK SCORECARD (${scorecard.overallStatus})`);
console.log('================================================================');
console.log(` Grade:          ${grade}`);
console.log(` Pass Rate:      ${scorePercent}% (${passed}/${ran} pillars)`);
console.log(` Duration:       ${scorecard.durationMin} min`);
console.log(` 5-min floor:    ${meetsRuntimeFloor ? '✅ met' : '⚠️  NOT met'}`);
console.log('----------------------------------------------------------------');

for (const p of pillars) {
  const icon = p.status === 'PASSED' ? '✅' : p.status === 'SKIPPED' ? '⏭️ ' : '❌';
  console.log(`${icon} ${p.pillar}`);
  if (p.metrics) {
    const { samples, p50Ms, p95Ms, p99Ms, throughputPerSec, detail } = p.metrics;
    if (samples) {
      console.log(
        `     n=${samples}  p50=${fmt(p50Ms)}  p95=${fmt(p95Ms)}  p99=${fmt(p99Ms)}` +
          (throughputPerSec ? `  ${throughputPerSec}/s` : '')
      );
    }
    if (detail) {
      for (const [k, v] of Object.entries(detail)) {
        let rendered;
        if (Array.isArray(v)) rendered = v.length ? v.map(x => (typeof x === 'object' ? JSON.stringify(x) : x)).join(' ') : '[]';
        else if (v && typeof v === 'object') rendered = JSON.stringify(v);
        else rendered = String(v);
        console.log(`     ${k}: ${rendered.length > 300 ? rendered.slice(0, 300) + '…' : rendered}`);
      }
    }
  }
  for (const msg of p.failureMessages.slice(0, 1)) {
    console.log(`     ↳ ${String(msg).split('\n')[0]}`);
  }
}

console.log('----------------------------------------------------------------');
console.log(` Scorecard:      ${scorecardPath}`);
console.log(` Raw metrics:    ${metricsPath}`);
console.log(` Dashboard:      ${dashboardPath}`);
console.log(`                 open ${dashboardPath}`);
console.log('================================================================\n');

if (ran === 0) {
  console.error('❌ No pillar results were reported — the suite did not run.');
}
if (!meetsRuntimeFloor && overallPassed) {
  console.warn(
    `⚠️  Suite finished in ${scorecard.durationMin} min, under the ${MIN_RUNTIME_MS / 60000}-min floor.\n` +
      '   A warm summarizer cache shortens runs; a sudden drop can also mean the\n' +
      '   real pipeline got stubbed out again (see Pillar 6).'
  );
}

process.exit(overallPassed ? 0 : 1);

function readJson(p) {
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    return null;
  }
}

function fmt(ms) {
  if (ms === undefined || ms === null) return 'n/a';
  return ms >= 1000 ? `${(ms / 1000).toFixed(2)}s` : `${Math.round(ms)}ms`;
}
