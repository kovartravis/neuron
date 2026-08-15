/**
 * Pillar 14 — Antagonistic Write & Quality Gate (Diagnostic).
 *
 * Companion to Pillar 13 (antagonistic recall), applied to the write path
 * instead of the read path. Diagnostic ticket for Map — neuron 2.4.1
 * ("write-time quality"): before building anything, find out which "bad
 * write" cases the current gate already rejects and which pass through
 * uncaught. Findings decide how tickets 2-4 get scoped, not just their
 * order (in particular: this pillar's own results already answer case 3
 * without needing a ticket 2 experiment — see the assertions below).
 *
 * Two different gates are in play, tested at the layer where each actually
 * lives:
 *  - the write-time supersession/similarity gate lives in the CLI's
 *    `memory add` handler (src/commands/memory.ts), ahead of `transact()`.
 *    Cases 1 & 2 spawn the real CLI with the real (non-mocked) embedder —
 *    the only way to get a meaningful similarity score out of it.
 *  - the declared-field schema gate (`enforceFieldSchema`) lives inside
 *    `transact()` itself and needs no embedder at all. Cases 3 & 5 call
 *    `NeuronMemory.transact()` directly against a purpose-built
 *    `neuron.yaml`, mirroring `fieldSchema.test.ts`'s own harness.
 *
 * Case 4 (vague/low-specificity content) is deliberately absent: no
 * objective pass/fail criterion exists yet (see the map's own "Not yet
 * specified"), so there is nothing yet to assert.
 *
 * Like Pillar 13, this is not a fix-and-forget floor — the assertions below
 * are a snapshot of today's measured behavior (2026-08-15), reported
 * honestly per ADR 0012, so a future change to the write gate shows up here
 * as a failing assertion to update deliberately, not a silent drift.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import path from 'node:path';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import { NeuronMemory } from '../../src/index.js';
import type { Embedder } from '../../src/components/embedder.js';
import { MetricsRecorder } from './metrics.js';
import { REPORT_DIR } from './tier.js';

const PILLAR = 'Pillar 14: Antagonistic Write & Quality Gate (Diagnostic)';
const metrics = new MetricsRecorder();

interface WriteCaseResult {
  id: string;
  caseNum: number;
  description: string;
  caught: boolean;
  /** Ticket 9 (neuron-2.4.2): write succeeded but a non-blocking conflict pointer was printed. */
  flagged: boolean;
  detail: string;
}

describe('Antagonistic Write Benchmark', () => {
  const cliWorkDir = path.join(process.cwd(), 'src/__tests__/temp-antagonistic-write-cli');
  const cliDbPath = path.join(cliWorkDir, `aw-${Date.now()}.sqlite`);
  const cliPath = path.join(process.cwd(), 'dist/cli.js');

  const schemaWorkDir = path.join(process.cwd(), 'src/__tests__/temp-antagonistic-write-schema');
  let schemaMemory: NeuronMemory;

  beforeAll(() => {
    fs.mkdirSync(cliWorkDir, { recursive: true });
    // Own package.json so findProjectRoot's upward walk stops here instead
    // of escaping into this repo's own real .neuron/*.md store (ticket 47).
    fs.writeFileSync(path.join(cliWorkDir, 'package.json'), '{}');

    fs.mkdirSync(schemaWorkDir, { recursive: true });
    // Mirrors this repo's own real `categories.decisions` (no `fields:`
    // block at all — no provenance requirement) and `categories.tickets`
    // (`kind` required, enum-typed), so cases 3 & 5 measure the same schema
    // shape a real user of this repo hits, not an arbitrary synthetic one.
    fs.writeFileSync(
      path.join(schemaWorkDir, 'neuron.yaml'),
      [
        'version: "1.0"',
        'storage:',
        '  mode: vector',
        'categories:',
        '  learning:',
        '    description: Agent conventions',
        '  decisions:',
        '    description: Architectural decisions',
        '  tickets:',
        '    description: Issue tracker',
        '    fields:',
        '      kind:',
        '        type: enum',
        '        values: [research, prototype, grilling, task]',
        '        required: true',
        '',
      ].join('\n')
    );
    const mockEmbedder: Embedder = {
      embed: async () => new Float32Array(64),
      embedQuery: async () => new Float32Array(64),
    };
    schemaMemory = new NeuronMemory({
      dbPath: path.join(schemaWorkDir, 'store.sqlite'),
      projectRoot: schemaWorkDir,
      projectName: 'antagonistic-write-schema-test',
      embedder: mockEmbedder,
    });
  });

  afterAll(() => {
    try { schemaMemory?.close(); } catch {}
    try { fs.rmSync(cliWorkDir, { recursive: true, force: true }); } catch {}
    try { fs.rmSync(schemaWorkDir, { recursive: true, force: true }); } catch {}

    metrics.writeReport(path.join(process.cwd(), REPORT_DIR, 'antagonistic-write-metrics.json'), {
      timestamp: new Date().toISOString(),
    });
  });

  it(PILLAR, async () => {
    const results: WriteCaseResult[] = [];

    const cliEnv: NodeJS.ProcessEnv = { ...process.env, NEURON_DB_PATH: cliDbPath, NODE_ENV: 'production' };
    delete cliEnv.NEURON_MOCK_EMBEDDER;

    // `execSync` only exposes stderr via the thrown error's `.stderr` on a
    // non-zero exit — a Ticket 9 soft-flag exits 0 with a real stderr
    // warning, which `execSync` would silently discard. `spawnSync` returns
    // stdout/stderr separately regardless of exit code.
    const runCli = (args: string) => {
      const result = spawnSync('node', [cliPath, ...args.match(/(?:[^\s"]+|"[^"]*")+/g)!.map(a => a.replace(/^"|"$/g, ''))], {
        env: cliEnv,
        cwd: cliWorkDir,
      });
      return {
        exitCode: result.status ?? 1,
        stdout: result.stdout?.toString() ?? '',
        stderr: result.stderr?.toString() ?? '',
      };
    };

    // Case 1 — near-duplicate content (paraphrase, not exact-hash match) of
    // a live entry.
    await metrics.time(PILLAR, async () => {
      runCli(`memory add "The default request timeout is 30 seconds." --category learning`);
      const r = runCli(`memory add "By default, requests time out after 30 seconds." --category learning`);
      results.push({
        id: 'case-1-near-duplicate-paraphrase',
        caseNum: 1,
        description: 'Near-duplicate content (paraphrase, not exact-hash match) of a live entry',
        caught: r.exitCode !== 0,
        flagged: r.stderr.includes('possible conflict'),
        detail: r.exitCode !== 0 ? r.stderr.slice(0, 300) : `accepted: ${r.stdout.slice(0, 150)}`,
      });
    });

    // Case 2 — content that directly contradicts a live entry in the same
    // category, no --supersedes given.
    await metrics.time(PILLAR, async () => {
      runCli(`memory add "Query results are limited to 10 items by default." --category learning`);
      const r = runCli(`memory add "Query results are limited to 25 items by default." --category learning`);
      results.push({
        id: 'case-2-direct-contradiction',
        caseNum: 2,
        description: 'Content that directly contradicts a live entry in the same category, no --supersedes',
        caught: r.exitCode !== 0,
        flagged: r.stderr.includes('possible conflict'),
        detail: r.exitCode !== 0 ? r.stderr.slice(0, 300) : `accepted, flagged: ${r.stdout.slice(0, 250)}`,
      });
    });

    // Case 3 — entry in a category that should require a source (e.g.
    // `decisions`), written without one.
    await metrics.time(PILLAR, async () => {
      let caught = false;
      let detail = '';
      try {
        await schemaMemory.transact([
          { op: 'upsert', category: 'decisions', content: 'We chose SQLite for local storage.' },
        ]);
        detail = 'accepted with no source/provenance field';
      } catch (e: any) {
        caught = true;
        detail = String(e.message ?? e).slice(0, 300);
      }
      results.push({
        id: 'case-3-missing-provenance',
        caseNum: 3,
        description: 'Entry in a category that should require a source, written without one',
        caught,
        flagged: false,
        detail,
      });
    });

    // Case 5 — existing shape violations: missing required field, bad enum.
    // Regression-style re-assertion (already unit-tested in
    // fieldSchema.test.ts) so the whole "bad write" story lives in one place.
    await metrics.time(PILLAR, async () => {
      let missingFieldCaught = false;
      let missingFieldDetail = '';
      try {
        await schemaMemory.transact([
          { op: 'upsert', category: 'tickets', content: 'A ticket with no kind' },
        ]);
        missingFieldDetail = 'accepted with no kind field';
      } catch (e: any) {
        missingFieldCaught = true;
        missingFieldDetail = String(e.message ?? e).slice(0, 300);
      }

      let badEnumCaught = false;
      let badEnumDetail = '';
      try {
        await schemaMemory.transact([
          {
            op: 'upsert',
            category: 'tickets',
            content: 'A ticket with a bogus kind',
            fields: { kind: 'bogus-kind' },
          },
        ]);
        badEnumDetail = 'accepted with an undeclared enum value';
      } catch (e: any) {
        badEnumCaught = true;
        badEnumDetail = String(e.message ?? e).slice(0, 300);
      }

      results.push({
        id: 'case-5a-missing-required-field',
        caseNum: 5,
        description: 'Missing required declared field (regression re-assertion)',
        caught: missingFieldCaught,
        flagged: false,
        detail: missingFieldDetail,
      });
      results.push({
        id: 'case-5b-bad-enum-value',
        caseNum: 5,
        description: 'Enum field set to an undeclared value (regression re-assertion)',
        caught: badEnumCaught,
        flagged: false,
        detail: badEnumDetail,
      });
    });

    metrics.annotate(PILLAR, { results });
    expect(results.length).toBe(5);

    const byId = Object.fromEntries(results.map(r => [r.id, r]));

    // Measured against a real (non-mocked) embedder and reranker, post
    // Ticket 6 (neuron-2.4.2): the widen(N=10)/rerank/bar=3 gate replaced
    // the old single-candidate 0.97-cosine check that let a genuine
    // paraphrase (case 1) slip through uncaught. Case 1 still hard-blocks,
    // as designed — reranker score 8.5, comfortably above bar=3, and NLI
    // correctly does not read it as a contradiction, so Ticket 9's soft-flag
    // never fires on it.
    //
    // Case 2 (a same-shape numeric contradiction) *used to* also hard-block
    // (reranker alone can't tell "restates" from "contradicts"), but post
    // Ticket 9 (neuron-2.4.2) it now downgrades to a soft-flag: NLI scores
    // this pair P(contradiction) ~0.996, comfortably above
    // `NLI_CONTRADICTION_BAR` (0.90), so the write succeeds with a
    // non-blocking pointer to the entry it may conflict with instead of
    // joining the near-dup gate's hard refusal. A human still sees the real
    // prior entry either way — case 1 via the refusal message, case 2 via
    // the flag — just without case 2 forcing a --supersedes/--not-a-reversal
    // decision on what may be two independently true, non-duplicate facts.
    expect(byId['case-1-near-duplicate-paraphrase'].caught, byId['case-1-near-duplicate-paraphrase'].detail).toBe(true);
    expect(byId['case-1-near-duplicate-paraphrase'].flagged, byId['case-1-near-duplicate-paraphrase'].detail).toBe(false);
    expect(byId['case-2-direct-contradiction'].caught, byId['case-2-direct-contradiction'].detail).toBe(false);
    expect(byId['case-2-direct-contradiction'].flagged, byId['case-2-direct-contradiction'].detail).toBe(true);

    // `decisions` declares no `fields:` block in this repo's own
    // neuron.yaml, so enforceFieldSchema has nothing to check against —
    // passes through uncaught today. This is the real gap this map exists
    // to close, and it's already provable without any new engineering.
    expect(byId['case-3-missing-provenance'].caught, byId['case-3-missing-provenance'].detail).toBe(false);

    // Already-caught shape violations, re-asserted here so the whole
    // "bad write" story lives in one place alongside the uncaught cases.
    expect(byId['case-5a-missing-required-field'].caught, byId['case-5a-missing-required-field'].detail).toBe(true);
    expect(byId['case-5b-bad-enum-value'].caught, byId['case-5b-bad-enum-value'].detail).toBe(true);
  }, 120000);
});
