import { describe, it, expect } from 'vitest';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import {
  parseBaselineBlueprint,
  calculateArchitecturalDiff,
  formatArchitecturalDiffMarkdown,
  getArchitecturalDrift,
} from './diff.js';
import { ScanResult } from './analyzer.js';
import { SmolLM2Summarizer } from '../components/summarizer.js';
import { NeuronMemory } from '../index.js';
import { ingestScanResults } from './ingest.js';

/**
 * Ticket 28 split `synthesizeArchitecture`'s output into an index plus
 * per-module markdown (what actually gets stored). These round-trip tests
 * exercise `parseBaselineBlueprint`, which still expects the pre-28
 * monolithic shape — the same reassembly `reassembleBaseline` (ingest.ts)
 * does from storage for ticket 29, done here directly from the summarizer's
 * output instead of via a memory store.
 */
async function synthesizeMonolithicMarkdown(
  summarizer: SmolLM2Summarizer,
  scanData: ScanResult
): Promise<string> {
  const { index, modules } = await summarizer.synthesizeArchitecture(scanData);
  return [index, ...modules.map(m => m.markdown)].join('\n');
}

describe('Architectural Drift Engine (src/scanner/diff.ts)', () => {
  const sampleBaselineMarkdown = [
    '---',
    'category: architecture',
    'title: "Repository Architectural Blueprint: sample-project"',
    'tags: [architecture, topology, scan, deep]',
    '---',
    '',
    '# 🏛️ Repository Architectural Blueprint: sample-project',
    '',
    '## 🚀 System Purpose & Tech Stack',
    'sample-project is a TypeScript software system structured into 2 primary architectural modules.',
    '',
    '## 📦 Primary Subsystems & Module Boundaries',
    '',
    '### 🧩 Subsystem Alpha (`src/alpha`)',
    'Core module managing alpha operations.',
    '',
    '**Key Components & Export Contracts:**',
    '- **`src/alpha/runner.ts`** (Exports: `RunnerClass, startRunner`): Manages execution loop',
    '- **`src/alpha/config.ts`**: Module settings',
    '',
    '### 🧩 Subsystem Beta (`src/beta`)',
    'Beta processing engine.',
    '',
    '**Key Components & Export Contracts:**',
    '- **`src/beta/processor.ts`** (Exports: `processData`): Processes data chunks',
  ].join('\n');

  const sampleCurrentScan: ScanResult = {
    project: 'sample-project',
    projectRoot: '/tmp/sample-project',
    manifest: {
      name: 'sample-project',
      techStack: ['nodejs', 'typescript'],
      dependencies: ['express', 'zod'],
      devDependencies: ['typescript', 'vitest'],
      scripts: {},
    },
    topology: [],
    modules: [
      {
        name: 'Subsystem Alpha',
        path: 'src/alpha',
        purpose: 'Core module managing alpha operations.',
        components: [
          {
            file: 'src/alpha/runner.ts',
            purpose: 'Manages execution loop',
            exports: ['RunnerClass', 'startRunner', 'stopRunner'],
          },
          {
            file: 'src/alpha/config.ts',
            purpose: 'Module settings',
            exports: [],
          },
        ],
      },
      {
        name: 'Subsystem Gamma',
        path: 'src/gamma',
        purpose: 'New gamma module',
        components: [
          {
            file: 'src/gamma/index.ts',
            purpose: 'Gamma entry point',
            exports: ['GammaService'],
          },
        ],
      },
    ],
    dependencyGraph: {},
    architectureSummary: 'Sample project overview',
    architectureMarkdown: '',
    symbols: [],
  };

  it('parses baseline markdown blueprint correctly', () => {
    const parsed = parseBaselineBlueprint(sampleBaselineMarkdown);
    expect(parsed.modules).toEqual([
      { name: 'Subsystem Alpha', path: 'src/alpha' },
      { name: 'Subsystem Beta', path: 'src/beta' },
    ]);
    expect(parsed.exports).toEqual([
      { file: 'src/alpha/runner.ts', symbol: 'RunnerClass' },
      { file: 'src/alpha/runner.ts', symbol: 'startRunner' },
      { file: 'src/beta/processor.ts', symbol: 'processData' },
    ]);
  });

  /**
   * The same card, declaring the fidelity the current scan is produced at.
   * Drift tests must use this: against the legacy fixture the engine correctly
   * refuses to compare at all, which would make them vacuous.
   */
  const comparableBaselineMarkdown = sampleBaselineMarkdown.replace(
    '## 🚀 System Purpose & Tech Stack',
    ['## 🔬 Parser Fidelity', 'Default: `ast/2`', '', '## 🚀 System Purpose & Tech Stack'].join('\n')
  );

  it('calculates architectural diff identifying new modules, removed modules, and export contract changes', () => {
    const diff = calculateArchitecturalDiff(sampleCurrentScan, comparableBaselineMarkdown);

    expect(diff.hasDrift).toBe(true);
    expect(diff.totalChangesCount).toBeGreaterThan(0);

    expect(diff.newModules).toHaveLength(1);
    expect(diff.newModules[0].path).toBe('src/gamma');

    expect(diff.removedModules).toHaveLength(1);
    expect(diff.removedModules[0].path).toBe('src/beta');

    const stopRunnerAdded = diff.exportChanges.find(e => e.symbol === 'stopRunner');
    expect(stopRunnerAdded).toBeDefined();
    expect(stopRunnerAdded?.type).toBe('added');

    const processDataRemoved = diff.exportChanges.find(e => e.symbol === 'processData');
    expect(processDataRemoved).toBeDefined();
    expect(processDataRemoved?.type).toBe('removed');
  });

  it('formats markdown diff report cleanly', () => {
    const diff = calculateArchitecturalDiff(sampleCurrentScan, comparableBaselineMarkdown);
    const report = formatArchitecturalDiffMarkdown(diff);

    expect(report).toContain('### ⚠️ Architectural Drift Detected');
    expect(report).toContain('#### 🆕 New Modules & Subsystems');
    expect(report).toContain('`src/gamma`');
    expect(report).toContain('#### ❌ Removed Modules & Subsystems');
    expect(report).toContain('`src/beta`');
    expect(report).toContain('#### ⚡ Export Contract Changes');
    expect(report).toContain('stopRunner');
  });

  it('returns hasDrift = false for identical scan and baseline', () => {
    const identicalScan: ScanResult = {
      ...sampleCurrentScan,
      modules: [
        {
          name: 'Subsystem Alpha',
          path: 'src/alpha',
          purpose: 'Alpha module',
          components: [
            { file: 'src/alpha/runner.ts', purpose: 'Runner', exports: ['RunnerClass', 'startRunner'] },
          ],
        },
        {
          name: 'Subsystem Beta',
          path: 'src/beta',
          purpose: 'Beta module',
          components: [
            { file: 'src/beta/processor.ts', purpose: 'Processor', exports: ['processData'] },
          ],
        },
      ],
    };

    const diff = calculateArchitecturalDiff(identicalScan, comparableBaselineMarkdown);
    expect(diff.hasDrift).toBe(false);
    expect(diff.needsRebaseline).toBeFalsy();
    expect(diff.totalChangesCount).toBe(0);

    const report = formatArchitecturalDiffMarkdown(diff);
    expect(report).toContain('✅ Architectural Status: In Sync');
  });

  describe('baseline card round-trip', () => {
    // Regression: the card is both the ingest output and the diff input, so it
    // must survive synthesizeArchitecture -> parseBaselineBlueprint losslessly.
    // A module with more components than the card records reports its tail as
    // permanently "added", so drift never converges and every query re-ingests.
    const wideScan: ScanResult = {
      ...sampleCurrentScan,
      modules: [
        {
          name: 'Wide Module',
          path: 'src/wide',
          purpose: 'Module with more components than any card truncation limit',
          components: Array.from({ length: 12 }, (_, i) => ({
            file: `src/wide/file${i}.ts`,
            purpose: `Component ${i}`,
            exports: [`export${i}`],
          })),
        },
      ],
    };

    it('reports zero drift when diffing a scan against its own generated card', async () => {
      const summarizer = new SmolLM2Summarizer();
      const markdown = await synthesizeMonolithicMarkdown(summarizer, wideScan);

      const diff = calculateArchitecturalDiff(wideScan, markdown);

      expect(diff.exportChanges).toEqual([]);
      expect(diff.newModules).toEqual([]);
      expect(diff.removedModules).toEqual([]);
      expect(diff.dependencyShifts).toEqual([]);
      expect(diff.totalChangesCount).toBe(0);
      expect(diff.hasDrift).toBe(false);
    });

    it('records every component in the card, not just the first few', async () => {
      const summarizer = new SmolLM2Summarizer();
      const markdown = await synthesizeMonolithicMarkdown(summarizer, wideScan);

      const parsed = parseBaselineBlueprint(markdown);
      expect(parsed.exports).toHaveLength(12);
      expect(parsed.exports.map(e => e.symbol)).toContain('export11');
    });

    it('round-trips the dependency contract so dependency shifts are detectable', async () => {
      const summarizer = new SmolLM2Summarizer();
      const markdown = await synthesizeMonolithicMarkdown(summarizer, wideScan);

      const parsed = parseBaselineBlueprint(markdown);
      expect(parsed.hasDependencySection).toBe(true);
      // sampleCurrentScan declares deps express/zod + devDeps typescript/vitest
      expect(parsed.dependencies.sort()).toEqual(['express', 'typescript', 'vitest', 'zod']);

      const withNewDep: ScanResult = {
        ...wideScan,
        manifest: { ...wideScan.manifest, dependencies: ['express', 'zod', 'lodash'] },
      };
      const diff = calculateArchitecturalDiff(withNewDep, markdown);

      expect(diff.dependencyShifts).toContainEqual({ package: 'lodash', type: 'added' });
    });

    it('skips dependency comparison for legacy cards with no dependency contract', () => {
      // sampleBaselineMarkdown predates the dependency section; its absence must
      // not surface every current dependency as an addition. Uses the
      // comparable variant so the engine actually reaches the dependency logic
      // instead of refusing on fidelity first.
      const parsed = parseBaselineBlueprint(comparableBaselineMarkdown);
      expect(parsed.hasDependencySection).toBe(false);

      const diff = calculateArchitecturalDiff(sampleCurrentScan, comparableBaselineMarkdown);
      expect(diff.needsRebaseline).toBeFalsy();
      expect(diff.dependencyShifts).toEqual([]);
    });
  });

  describe('parser fidelity', () => {
    it('reads a card with no fidelity section as the 2.1.0 regex generation', () => {
      // Absence is not "unknown" — it positively identifies a pre-2.2.0 card,
      // whose symbols came from the old regex scanner.
      const parsed = parseBaselineBlueprint(sampleBaselineMarkdown);
      expect(parsed.fidelity).toEqual({ default: 'regex/1', exceptions: {} });
    });

    it('reads the default and only the files that deviate from it', () => {
      const card = [
        '# 🏛️ Repository Architectural Blueprint: sample-project',
        '',
        '## 🔬 Parser Fidelity',
        'Default: `ast/2`',
        'Degraded:',
        '- `cmd/main.go` — `regex/2` (grammar unavailable)',
        '- `lib/legacy.rb` — `regex/2` (no grammar for ruby)',
        '',
        '## 📦 Primary Subsystems & Module Boundaries',
        '',
        '### 🧩 Subsystem Alpha (`src/alpha`)',
        'Core module.',
        '',
        '**Key Components & Export Contracts:**',
        '- **`src/alpha/runner.ts`** (Exports: `RunnerClass`): Manages execution loop',
      ].join('\n');

      const parsed = parseBaselineBlueprint(card);

      expect(parsed.fidelity.default).toBe('ast/2');
      expect(parsed.fidelity.exceptions).toEqual({
        'cmd/main.go': 'regex/2',
        'lib/legacy.rb': 'regex/2',
      });
      // The fidelity section must not leak into the other buckets.
      expect(parsed.exports).toEqual([
        { file: 'src/alpha/runner.ts', symbol: 'RunnerClass' },
      ]);
      expect(parsed.dependencies).toEqual([]);
    });

    it('writes the dominant fidelity as the default and lists only deviations', async () => {
      const mixedScan: ScanResult = {
        ...sampleCurrentScan,
        modules: [
          {
            name: 'Mixed Module',
            path: 'src/mixed',
            purpose: 'Module spanning several languages',
            components: [
              { file: 'src/mixed/a.ts', purpose: 'A', exports: ['A'], fidelity: 'ast' },
              { file: 'src/mixed/b.ts', purpose: 'B', exports: ['B'], fidelity: 'ast' },
              { file: 'src/mixed/c.rb', purpose: 'C', exports: ['C'], fidelity: 'regex' },
            ],
          },
        ],
      };

      const summarizer = new SmolLM2Summarizer();
      const markdown = await synthesizeMonolithicMarkdown(summarizer, mixedScan);

      const parsed = parseBaselineBlueprint(markdown);
      expect(parsed.fidelity.default).toBe('ast/2');
      expect(parsed.fidelity.exceptions).toEqual({ 'src/mixed/c.rb': 'regex/2' });
      // The two ast files are the default, so they must not be listed.
      expect(Object.keys(parsed.fidelity.exceptions)).toHaveLength(1);
    });

    it('round-trips fidelity so a scan does not drift against its own card', async () => {
      const summarizer = new SmolLM2Summarizer();
      const markdown = await synthesizeMonolithicMarkdown(summarizer, sampleCurrentScan);

      const parsed = parseBaselineBlueprint(markdown);
      const diff = calculateArchitecturalDiff(sampleCurrentScan, markdown);

      expect(parsed.fidelity.default).toBe('ast/2');
      expect(diff.needsRebaseline).toBeFalsy();
      expect(diff.hasDrift).toBe(false);
    });

    it('refuses to diff a 2.1.0 regex baseline against a 2.2.0 AST scan', () => {
      // The upgrade case every existing user hits. sampleBaselineMarkdown has
      // no fidelity section, so it reads as regex/1 against an ast/2 scan.
      const diff = calculateArchitecturalDiff(sampleCurrentScan, sampleBaselineMarkdown);

      expect(diff.needsRebaseline).toBe(true);
      expect(diff.baselineFidelity).toBe('regex/1');
      expect(diff.currentFidelity).toBe('ast/2');
      // A mismatch is not drift — it is an incomparable measurement.
      expect(diff.hasDrift).toBe(false);
      expect(diff.newModules).toEqual([]);
      expect(diff.removedModules).toEqual([]);
      expect(diff.exportChanges).toEqual([]);
      expect(diff.dependencyShifts).toEqual([]);
      expect(diff.totalChangesCount).toBe(0);
      // Scope item 4: name the command, do not just warn.
      expect(diff.summary).toContain('neuron scan');
    });

    it('refuses when the same default hides a different set of degraded files', async () => {
      // Both cards are "mixed", but for different reasons. A bare `mixed` label
      // would compare equal here while the measurements are incomparable.
      const goDegraded: ScanResult = {
        ...sampleCurrentScan,
        modules: [
          {
            name: 'M', path: 'src/m', purpose: 'M',
            components: [
              { file: 'src/m/a.ts', purpose: 'A', exports: ['A'], fidelity: 'ast' },
              { file: 'src/m/b.ts', purpose: 'B', exports: ['B'], fidelity: 'ast' },
              { file: 'src/m/c.go', purpose: 'C', exports: ['C'], fidelity: 'regex' },
            ],
          },
        ],
      };
      const rustDegraded: ScanResult = {
        ...goDegraded,
        modules: [
          {
            ...goDegraded.modules[0],
            components: [
              { file: 'src/m/a.ts', purpose: 'A', exports: ['A'], fidelity: 'ast' },
              { file: 'src/m/b.ts', purpose: 'B', exports: ['B'], fidelity: 'ast' },
              { file: 'src/m/c.go', purpose: 'C', exports: ['C'], fidelity: 'ast' },
              { file: 'src/m/d.rs', purpose: 'D', exports: ['D'], fidelity: 'regex' },
            ],
          },
        ],
      };

      const summarizer = new SmolLM2Summarizer();
      const markdown = await synthesizeMonolithicMarkdown(summarizer, goDegraded);

      const diff = calculateArchitecturalDiff(rustDegraded, markdown);
      expect(diff.needsRebaseline).toBe(true);
    });

    it('does not render an incomparable baseline as "In Sync"', () => {
      // hasDrift is false on a mismatch, so the formatter must branch on
      // needsRebaseline first or it reports a clean bill of health.
      const diff = calculateArchitecturalDiff(sampleCurrentScan, sampleBaselineMarkdown);
      const report = formatArchitecturalDiffMarkdown(diff);

      expect(report).not.toContain('In Sync');
      expect(report).toContain('Re-baseline Required');
      expect(report).toContain('regex/1');
      expect(report).toContain('ast/2');
      expect(report).toContain('neuron scan');
    });

    it('still reports real drift when both sides share a fidelity', async () => {
      // The refusal must not swallow genuine drift at matching fidelity.
      const summarizer = new SmolLM2Summarizer();
      const markdown = await synthesizeMonolithicMarkdown(summarizer, sampleCurrentScan);

      const withNewExport: ScanResult = {
        ...sampleCurrentScan,
        modules: sampleCurrentScan.modules.map(m =>
          m.path === 'src/gamma'
            ? { ...m, components: [{ ...m.components[0], exports: ['GammaService', 'GammaExtra'] }] }
            : m
        ),
      };

      const diff = calculateArchitecturalDiff(withNewExport, markdown);

      expect(diff.needsRebaseline).toBeFalsy();
      expect(diff.hasDrift).toBe(true);
      expect(diff.exportChanges).toContainEqual({
        file: 'src/gamma/index.ts', symbol: 'GammaExtra', type: 'added',
      });
    });
  });

  describe('baseline fetch survives category crowding (ticket 29)', () => {
    // Ticket 28 split the single blueprint card into an index (ticket 25's
    // stable-id fix already covers) plus N per-module cards. This confirms
    // getArchitecturalDrift's own baseline fetch — moved from a ranked query
    // to findById(blueprintCardId(category)) — survives the same crowding
    // scenario ticket 25's own test reproduces for hook.ts.
    it('finds the index by stable id even when other entries in the same category outrank it', async () => {
      const tmpDir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'neuron-diff-crowd-test-')));
      fs.writeFileSync(
        path.join(tmpDir, 'package.json'),
        JSON.stringify({ name: 'crowd-project', dependencies: { typescript: '^5.0.0' } }),
        'utf8'
      );
      fs.mkdirSync(path.join(tmpDir, 'src'), { recursive: true });
      fs.writeFileSync(
        path.join(tmpDir, 'src', 'index.ts'),
        'export class AppRunner { start() { return true; } }\n',
        'utf8'
      );

      const memory = new NeuronMemory({
        dbPath: path.join(tmpDir, 'memory.db'),
        projectRoot: tmpDir,
        projectName: 'crowd-project',
      });

      try {
        await ingestScanResults(memory, { projectDir: tmpDir, category: 'architecture' });

        // Planted after the real cards, so a recency-ordered ranked query
        // would push the index out of a small `limit` window.
        const decoys = Array.from({ length: 12 }, (_, i) => ({
          op: 'upsert' as const,
          category: 'architecture',
          content: `Repository Architectural Blueprint decoy entry number ${i}`,
          tags: ['decoy'],
          importance: 3,
        }));
        await memory.transact(decoys);

        const diff = await getArchitecturalDrift(memory, tmpDir);

        expect(diff.isMissingBaseline).toBeFalsy();
        expect(diff.hasDrift).toBe(false);
      } finally {
        await memory.close();
        fs.rmSync(tmpDir, { recursive: true, force: true });
      }
    });
  });
});
