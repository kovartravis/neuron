import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import path from 'node:path';
import fs from 'node:fs';
import {
  loadNeuronYaml,
  parseNeuronYaml,
  validateNeuronYaml,
  findNeuronYaml,
  resolveExecCategories,
  fieldKeyToFlagName,
  collectDeclaredFieldFlags,
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

  // Ticket 31: the default is `md`, not `vector-only`. A project with no
  // neuron.yaml must land on the mode the product's claim is built on —
  // markdown you can open and diff — rather than on the one that produces no
  // .md files at all.
  it('should return default config with storage.mode = "md" and path = ".neuron" when no neuron.yaml exists', () => {
    const emptyDir = path.join(tempDir, 'empty-proj');
    fs.mkdirSync(emptyDir, { recursive: true });
    fs.writeFileSync(path.join(emptyDir, 'package.json'), '{}');

    const config = loadNeuronYaml(emptyDir);
    expect(config.version).toBe('1.0');
    expect(config.storage.mode).toBe('md');
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

  it('merges onExec limit/minScore as last-match-wins, not widen-only (ticket 41)', () => {
    // A broad catch-all listed first with a generous limit, and a later,
    // more specific rule with a *tighter* one. The old Math.max/Math.min
    // merge could only ever widen — this rule ordering is exactly the case
    // it got wrong, since the specific rule's tighter intent needs to
    // override the broad rule's looser default, not lose to it.
    const config = validateNeuronYaml({
      version: '1.0',
      storage: { mode: 'vector-only', path: '.neuron' },
      categories: { learning: {}, history: {}, decisions: {} },
      pullRules: {
        default: { categories: ['learning'], limit: 5, minScore: 0.35 },
        onExec: [
          { commandPattern: '.*', categories: ['learning'], limit: 8 },
          { commandPattern: '^(npm test|git commit)', categories: ['learning', 'history', 'decisions'], limit: 5 },
        ],
      },
    });

    // Matches both rules; the later, more specific rule's limit (5) wins
    // over the earlier, broader rule's limit (8).
    const specific = resolveExecCategories(config, 'npm test');
    expect(specific.limit).toBe(5);
    expect(specific.categories).toEqual(expect.arrayContaining(['learning', 'history', 'decisions']));

    // Matches only the catch-all → its own limit (8) applies unchanged.
    const fallthrough = resolveExecCategories(config, 'docker build .');
    expect(fallthrough.limit).toBe(8);
    expect(fallthrough.categories).toEqual(['learning']);
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

  describe('relevance.gate (ADR 0012, ticket 39)', () => {
    it('defaults the gate to enabled with no cosine floor key', () => {
      const config = validateNeuronYaml({ categories: { learning: {} } });
      expect(config.relevance.gate.enabled).toBe(true);
      // No cosineFloor key exists: ticket 39 measured one on LongMemEval and
      // found no (floor, band) pair clears the bar, so there is no number to
      // default it to. Zod's object schema has no such key to strip, so this
      // just documents the absence rather than testing a negative.
      expect(config.relevance.gate).not.toHaveProperty('cosineFloor');
    });

    it('accepts an explicit override to disable the gate', () => {
      const config = validateNeuronYaml({
        categories: { learning: {} },
        relevance: { gate: { enabled: false } },
      });
      expect(config.relevance.gate.enabled).toBe(false);
    });

    it('still parses a config carrying the deprecated minScore, unchanged and warning', () => {
      const warnSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
      const config = validateNeuronYaml({
        categories: { learning: {} },
        pullRules: {
          default: { categories: ['learning'], minScore: 0.4 },
          onExec: [{ commandPattern: '^npm test', categories: ['learning'], minScore: 0.5 }],
        },
      });
      expect(config.pullRules.default?.minScore).toBe(0.4);
      expect(config.pullRules.onExec?.[0].minScore).toBe(0.5);
      const warnings = warnSpy.mock.calls.map(c => String(c[0]));
      expect(warnings.some(w => w.includes('pullRules.default.minScore is deprecated'))).toBe(true);
      expect(warnings.some(w => w.includes('pullRules.onExec[].minScore is deprecated'))).toBe(true);
      warnSpy.mockRestore();
    });

    it('does not warn when minScore is absent from the raw config', () => {
      const warnSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
      validateNeuronYaml({ categories: { learning: {} } });
      const warnings = warnSpy.mock.calls.map(c => String(c[0]));
      expect(warnings.some(w => w.includes('minScore'))).toBe(false);
      warnSpy.mockRestore();
    });
  });

  // Ticket 43 / ADR 0013: declarable per-category frontmatter fields.
  describe('Declarable category fields (ticket 43)', () => {
    it('accepts a well-formed string and enum field declaration', () => {
      const config = validateNeuronYaml({
        categories: {
          learning: {},
          decisions: {
            fields: {
              ticket: { type: 'string', required: true },
              confidence: { type: 'enum', values: ['low', 'medium', 'high'], default: 'medium' },
            },
          },
        },
      });
      expect(config.categories.decisions.fields?.ticket).toEqual({ type: 'string', required: true });
      expect(config.categories.decisions.fields?.confidence).toEqual({
        type: 'enum',
        required: false,
        values: ['low', 'medium', 'high'],
        default: 'medium',
      });
    });

    it('rejects an enum field with no declared values', () => {
      expect(() =>
        validateNeuronYaml({
          categories: { learning: {}, decisions: { fields: { confidence: { type: 'enum', values: [] } } } },
        })
      ).toThrow();
    });

    it('rejects an enum field whose default is not one of its own values', () => {
      expect(() =>
        validateNeuronYaml({
          categories: {
            learning: {},
            decisions: {
              fields: { confidence: { type: 'enum', values: ['low', 'high'], default: 'medium' } },
            },
          },
        })
      ).toThrow(/default "medium" is not one of the declared values/);
    });

    it('rejects a field key that is not a valid camelCase identifier', () => {
      expect(() =>
        validateNeuronYaml({
          categories: { learning: {}, decisions: { fields: { 'not-valid': { type: 'string' } } } },
        })
      ).toThrow(/field keys must be letters\/digits/);
    });

    it('refuses a declared field whose flag collides with a reserved built-in flag', () => {
      // `category` field key -> `--category`, already a reserved built-in.
      expect(() =>
        validateNeuronYaml({
          categories: { learning: {}, decisions: { fields: { category: { type: 'string' } } } },
        })
      ).toThrow(/collides with a reserved built-in flag/);
    });

    it('allows the same field key declared independently on two categories', () => {
      const config = validateNeuronYaml({
        categories: {
          decisions: { fields: { ticket: { type: 'string', required: true } } },
          learning: { fields: { ticket: { type: 'string', required: false } } },
        },
      });
      expect(config.categories.decisions.fields?.ticket.required).toBe(true);
      expect(config.categories.learning.fields?.ticket.required).toBe(false);
    });

    it('refuses a config whose scan.category declares a required field with no default', () => {
      expect(() =>
        validateNeuronYaml({
          categories: {
            learning: {},
            architecture: { fields: { reviewedBy: { type: 'string', required: true } } },
          },
          scan: { enabled: true, category: 'architecture', depth: 3 },
        })
      ).toThrow(/scan\.category "architecture" declares required field "reviewedBy" with no default/);
    });

    it('accepts scan.category declaring a required field that carries a default', () => {
      const config = validateNeuronYaml({
        categories: {
          learning: {},
          architecture: {
            fields: { reviewedBy: { type: 'string', required: true, default: 'unreviewed' } },
          },
        },
        scan: { enabled: true, category: 'architecture', depth: 3 },
      });
      expect(config.categories.architecture.fields?.reviewedBy.default).toBe('unreviewed');
    });
  });

  describe('collectDeclaredFieldFlags / fieldKeyToFlagName (ticket 43)', () => {
    it('kebab-cases a camelCase field key into its flag name', () => {
      expect(fieldKeyToFlagName('reviewedBy')).toBe('reviewed-by');
      expect(fieldKeyToFlagName('ticket')).toBe('ticket');
    });

    it('collects one entry per declared field, across every category', () => {
      const config = validateNeuronYaml({
        categories: {
          decisions: { fields: { ticket: { type: 'string', required: true } } },
          learning: { fields: { reviewedBy: { type: 'string' } } },
        },
      });
      const flags = collectDeclaredFieldFlags(config);
      expect(flags).toHaveLength(2);
      expect(flags.find(f => f.key === 'ticket')).toMatchObject({ flag: '--ticket', category: 'decisions' });
      expect(flags.find(f => f.key === 'reviewedBy')).toMatchObject({ flag: '--reviewed-by', category: 'learning' });
    });

    it('returns an empty array when no category declares fields', () => {
      const config = validateNeuronYaml({ categories: { learning: {} } });
      expect(collectDeclaredFieldFlags(config)).toEqual([]);
    });
  });
});
