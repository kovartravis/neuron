import { describe, it, expect } from 'vitest';
import {
  parseBaselineBlueprint,
  calculateArchitecturalDiff,
  formatArchitecturalDiffMarkdown,
} from './diff.js';
import { ScanResult } from './analyzer.js';
import { SmolLM2Summarizer } from '../components/summarizer.js';

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

  it('calculates architectural diff identifying new modules, removed modules, and export contract changes', () => {
    const diff = calculateArchitecturalDiff(sampleCurrentScan, sampleBaselineMarkdown);

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
    const diff = calculateArchitecturalDiff(sampleCurrentScan, sampleBaselineMarkdown);
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

    const diff = calculateArchitecturalDiff(identicalScan, sampleBaselineMarkdown);
    expect(diff.hasDrift).toBe(false);
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
      const { markdown } = await summarizer.synthesizeArchitecture(wideScan, {
        category: 'architecture',
      });

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
      const { markdown } = await summarizer.synthesizeArchitecture(wideScan, {
        category: 'architecture',
      });

      const parsed = parseBaselineBlueprint(markdown);
      expect(parsed.exports).toHaveLength(12);
      expect(parsed.exports.map(e => e.symbol)).toContain('export11');
    });

    it('round-trips the dependency contract so dependency shifts are detectable', async () => {
      const summarizer = new SmolLM2Summarizer();
      const { markdown } = await summarizer.synthesizeArchitecture(wideScan, {
        category: 'architecture',
      });

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
      // not surface every current dependency as an addition.
      const parsed = parseBaselineBlueprint(sampleBaselineMarkdown);
      expect(parsed.hasDependencySection).toBe(false);

      const diff = calculateArchitecturalDiff(sampleCurrentScan, sampleBaselineMarkdown);
      expect(diff.dependencyShifts).toEqual([]);
    });
  });
});
