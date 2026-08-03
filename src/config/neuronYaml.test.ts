import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import path from 'node:path';
import fs from 'node:fs';
import {
  loadNeuronYaml,
  parseNeuronYaml,
  validateNeuronYaml,
  findNeuronYaml,
  resolveExecCategories,
} from './neuronYaml.js';

describe('neuron.yaml Config Loader & Zod Parser', () => {
  const tempDir = path.join(process.cwd(), 'src/__tests__/temp-yaml-config');

  beforeAll(() => {
    fs.mkdirSync(tempDir, { recursive: true });
  });

  afterAll(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('should return default config with storage.mode = "vector-only" and path = ".neuron" when no neuron.yaml exists', () => {
    const emptyDir = path.join(tempDir, 'empty-proj');
    fs.mkdirSync(emptyDir, { recursive: true });
    fs.writeFileSync(path.join(emptyDir, 'package.json'), '{}');

    const config = loadNeuronYaml(emptyDir);
    expect(config.version).toBe('1.0');
    expect(config.storage.mode).toBe('vector-only');
    expect(config.storage.path).toBe('.neuron');
    expect(config.categories.learning).toBeDefined();
    expect(config.categories.history).toBeDefined();
    expect(config.pullRules.default?.categories).toEqual(['learning']);
  });

  it('should parse valid canonical storage mode options (vector-only, md, split)', () => {
    const modes = ['vector-only', 'md', 'split'] as const;
    for (const mode of modes) {
      const yamlStr = `
version: "1.0"
storage:
  mode: "${mode}"
  path: ".neuron"
categories:
  learning:
    description: Agent rules
`;
      const parsed = parseNeuronYaml(yamlStr);
      expect(parsed.storage.mode).toBe(mode);
      expect(parsed.storage.path).toBe('.neuron');
    }
  });

  describe('md-only and dual storage mode aliasing (ticket 29)', () => {
    // md-only was deleted (28: md-only's every defect traced to `this.db =
    // null`; dual already reaches markdown-first storage without any of
    // them) and dual was renamed md (same mechanism, correct name). Both
    // spellings alias to 'md' rather than hard-failing, because a config
    // that errors on upgrade turns a rename into an outage.
    for (const alias of ['md-only', 'dual'] as const) {
      it(`normalizes storage.mode: ${alias} to "md" and warns on stderr`, () => {
        const warnSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
        const config = validateNeuronYaml({
          storage: { mode: alias, path: '.neuron' },
          categories: { learning: {} },
        });
        expect(config.storage.mode).toBe('md');
        expect(warnSpy).toHaveBeenCalledWith(
          expect.stringContaining(`storage.mode: "${alias}" is deprecated`)
        );
        warnSpy.mockRestore();
      });
    }
  });

  it('should reject invalid storage mode with clear Zod error message', () => {
    const yamlStr = `
version: "1.0"
storage:
  mode: "invalid-mode"
categories:
  learning: {}
`;
    expect(() => parseNeuronYaml(yamlStr)).toThrowError(/storage\.mode/);
  });

  it('should discover and parse neuron.yaml with custom storage and categories', () => {
    const projDir = path.join(tempDir, 'custom-yaml-proj');
    fs.mkdirSync(projDir, { recursive: true });

    const yamlContent = `
version: "1.0"

storage:
  mode: "md"
  path: ".neuron"

categories:
  learning:
    description: Agent rules
    tags:
      - rule
  decisions:
    description: ADRs
    tags:
      - adr
  history:
    description: Action history
  snippets:
    description: Reusable code

pullRules:
  default:
    categories:
      - learning
      - decisions
    limit: 10
    minScore: 0.4

  onExec:
    - commandPattern: "^npm test"
      categories:
        - learning
      limit: 5
    - commandPattern: "^git "
      categories:
        - history
        - decisions
      limit: 8
`;

    fs.writeFileSync(path.join(projDir, 'neuron.yaml'), yamlContent);

    const config = loadNeuronYaml(projDir);
    expect(config.storage.mode).toBe('md');
    expect(config.storage.path).toBe('.neuron');
    expect(config.categories.learning).toBeDefined();
    expect(config.categories.decisions).toBeDefined();
    expect(config.categories.snippets).toBeDefined();
    expect(config.pullRules.default?.categories).toEqual(['learning', 'decisions']);
    expect(config.pullRules.onExec).toHaveLength(2);
  });

  it('should walk up directories to find neuron.yaml', () => {
    const projDir = path.join(tempDir, 'parent-yaml-proj');
    const nestedDir = path.join(projDir, 'sub/deep/nested');
    fs.mkdirSync(nestedDir, { recursive: true });

    fs.writeFileSync(path.join(projDir, 'neuron.yaml'), 'version: "1.0"\ncategories:\n  learning: {}\n');

    const configPath = findNeuronYaml(nestedDir);
    expect(configPath).toBe(path.join(projDir, 'neuron.yaml'));

    const config = loadNeuronYaml(nestedDir);
    expect(config.categories.learning).toBeDefined();
  });

  it('should resolve exec categories based on command matching and fall back to default', () => {
    const config = validateNeuronYaml({
      version: '1.0',
      storage: { mode: 'vector-only', path: '.neuron' },
      categories: {
        learning: {},
        history: {},
        decisions: {},
      },
      pullRules: {
        default: {
          categories: ['learning'],
          limit: 5,
          minScore: 0.35,
        },
        onExec: [
          {
            commandPattern: '^npm test',
            categories: ['learning'],
            limit: 5,
          },
          {
            commandPattern: 'test',
            categories: ['decisions'],
            limit: 8,
          },
          {
            commandPattern: '^git ',
            categories: ['history'],
            limit: 10,
          },
        ],
      },
    });

    // 1. Matches multiple onExec rules ("npm test" matches ^npm test and test) → merges categories
    const res1 = resolveExecCategories(config, 'npm test');
    expect(res1.categories).toContain('learning');
    expect(res1.categories).toContain('decisions');
    expect(res1.limit).toBe(8);

    // 2. Matches single onExec rule ("git commit" matches ^git )
    const res2 = resolveExecCategories(config, 'git commit -m "feat"');
    expect(res2.categories).toEqual(['history']);
    expect(res2.limit).toBe(10);

    // 3. Matches no onExec rules ("docker build .") → falls back to default
    const res3 = resolveExecCategories(config, 'docker build .');
    expect(res3.categories).toEqual(['learning']);
    expect(res3.limit).toBe(5);
  });

  describe('llm.enrichment', () => {
    it('defaults to the postures the benchmark evidence chose', () => {
      const config = validateNeuronYaml({ categories: { learning: {} } });
      expect(config.llm.enrichment.enabled).toBe(true);
      expect(config.llm.enrichment.category).toBe('infer');
      expect(config.llm.enrichment.tags).toBe('infer');
      // Centroid beat the model 9/9 to 1/9 on category (Pillar 11), so it is
      // the default strategy.
      expect(config.llm.enrichment.categoryStrategy).toBe('centroid');
      expect(config.llm.enrichment.timeoutMs).toBe(15000);
    });

    it('ignores a stale importance key rather than failing an existing config', () => {
      // `importance` was a real key through rc1/rc2 and ticket 26 removed it.
      // Zod strips unknown keys, so an unedited neuron.yaml still parses — this
      // asserts that rather than assuming it, because the alternative is a
      // hard-fail on upgrade for a key users were told to set.
      const config = validateNeuronYaml({
        categories: { learning: {} },
        llm: { enrichment: { importance: 'infer' } },
      });
      expect(config.llm.enrichment).not.toHaveProperty('importance');
      expect(config.llm.enrichment.enabled).toBe(true);
    });

    it('accepts a declared category name as the literal fallback', () => {
      const config = validateNeuronYaml({
        categories: { learning: {}, decisions: {} },
        llm: { enrichment: { category: 'decisions' } },
      });
      expect(config.llm.enrichment.category).toBe('decisions');
    });

    it('rejects a literal fallback category that is not declared', () => {
      expect(() =>
        validateNeuronYaml({
          categories: { learning: {} },
          llm: { enrichment: { category: 'nonexistent' } },
        })
      ).toThrow(/llm\.enrichment\.category references unknown category "nonexistent"/);
    });

    it('keeps the master toggle separate from the per-field switches', () => {
      const config = validateNeuronYaml({
        categories: { learning: {} },
        llm: { enrichment: { enabled: false, tags: 'infer', category: 'off' } },
      });
      expect(config.llm.enrichment.enabled).toBe(false);
      expect(config.llm.enrichment.tags).toBe('infer');
      expect(config.llm.enrichment.category).toBe('off');
    });

    it('rejects an unknown per-field value', () => {
      expect(() =>
        validateNeuronYaml({
          categories: { learning: {} },
          llm: { enrichment: { tags: 'maybe' } },
        })
      ).toThrow(/llm\.enrichment\.tags/);
    });
  });
});
