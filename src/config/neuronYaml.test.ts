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
  fieldKeyToColumnName,
  isValidColumnIdentifier,
  collectDeclaredFieldFlags,
  declareCategoryInNeuronYaml,
} from './neuronYaml.js';
import { resolveCategoryPath } from './categoryPath.js';

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
    // Ticket 05: `storage.path` itself is unset by default now — the '.neuron'
    // literal lives only in `resolveCategoryPath`'s fallback chain
    // (`categories.<name>.path > storage.path > '.neuron'`), not baked into
    // the schema, or "top level is empty" would be unrepresentable.
    expect(config.storage.path).toBeUndefined();
    expect(resolveCategoryPath(config, 'learning', emptyDir)).toBe(path.join(emptyDir, '.neuron'));
    expect(config.categories.learning).toBeDefined();
    expect(config.categories.history).toBeDefined();
    expect(config.pullRules.default?.categories).toEqual(['learning']);
  });

  // Ticket 07 (neuron-2.3.0): the per-epoch recall budget. Default is
  // 18,000 chars when unset, and settable per project.
  describe('recall.epochCharBudget', () => {
    it('defaults to 18000 when no neuron.yaml exists', () => {
      const emptyDir = path.join(tempDir, 'no-config-for-recall-default');
      fs.mkdirSync(emptyDir, { recursive: true });
      fs.writeFileSync(path.join(emptyDir, 'package.json'), '{}');

      const config = loadNeuronYaml(emptyDir);
      expect(config.recall.epochCharBudget).toBe(18000);
    });

    it('is settable per project', () => {
      const yamlStr = `
version: "1.0"
recall:
  epochCharBudget: 5000
`;
      const parsed = parseNeuronYaml(yamlStr);
      expect(parsed.recall.epochCharBudget).toBe(5000);
    });
  });

  it('should parse valid canonical storage mode options (md, vector)', () => {
    // Ticket 06 (neuron-2.3.0): the vocabulary collapsed to two canonical
    // spellings. `vector-only`, `md-only`, `dual` and `split` are all
    // deprecated aliases now — see the aliasing describe block below.
    const modes = ['md', 'vector'] as const;
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

  describe('deprecated storage.mode spellings alias rather than error (tickets 29, 06)', () => {
    // md-only was deleted (28: md-only's every defect traced to `this.db =
    // null`; dual already reaches markdown-first storage without any of
    // them) and dual was renamed md (same mechanism, correct name).
    // vector-only was renamed vector (06: converges with the per-category
    // vocabulary, which never had an "-only" suffix). split was deleted
    // outright (06: the per-category override is always live now, so split
    // was never a third behaviour, just a flag meaning "honour the
    // overrides") — it aliases to md, not vector, because that reproduces
    // split's own pre-existing default for a category with no explicit
    // override. Every spelling aliases rather than hard-failing, because a
    // config that errors on upgrade turns a rename into an outage.
    const aliases: Array<[string, 'md' | 'vector']> = [
      ['md-only', 'md'],
      ['dual', 'md'],
      ['vector-only', 'vector'],
      ['split', 'md'],
    ];
    for (const [alias, canonical] of aliases) {
      it(`normalizes storage.mode: ${alias} to "${canonical}" and warns on stderr`, () => {
        const warnSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
        const config = validateNeuronYaml({
          storage: { mode: alias, path: '.neuron' },
          categories: { learning: {} },
        });
        expect(config.storage.mode).toBe(canonical);
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
      storage: { mode: 'vector', path: '.neuron' },
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
      storage: { mode: 'vector', path: '.neuron' },
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

  describe('strict (ticket 45)', () => {
    it('defaults to off', () => {
      const config = validateNeuronYaml({ categories: { learning: {} } });
      expect(config.strict).toBe(false);
    });

    it('accepts an explicit opt-in', () => {
      const config = validateNeuronYaml({ categories: { learning: {} }, strict: true });
      expect(config.strict).toBe(true);
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

  describe('SQLite column derivation & collision checks (ticket 44)', () => {
    it('snake-cases a camelCase field key into its column name', () => {
      expect(fieldKeyToColumnName('reviewedBy')).toBe('reviewed_by');
      expect(fieldKeyToColumnName('ticket')).toBe('ticket');
    });

    it('accepts every column name fieldKeyToColumnName can produce from a valid field key', () => {
      expect(isValidColumnIdentifier(fieldKeyToColumnName('reviewedBy'))).toBe(true);
      expect(isValidColumnIdentifier('not a column')).toBe(false);
    });

    it('refuses a declared field whose column would collide with a reserved memories column', () => {
      // `content` is not a reserved *flag* (`--content` is fine), but it is
      // the `memories` table's own content column.
      expect(() =>
        validateNeuronYaml({
          categories: { learning: {}, decisions: { fields: { content: { type: 'string' } } } },
        })
      ).toThrow(/collides with a reserved column/);
    });

    it('refuses a declared field whose column would collide with another reserved memories column via case folding', () => {
      // `createdAt` -> `--created-at` is not a reserved flag, but its column
      // `created_at` is the memories table's own timestamp column.
      expect(() =>
        validateNeuronYaml({
          categories: { learning: {}, decisions: { fields: { createdAt: { type: 'string' } } } },
        })
      ).toThrow(/collides with a reserved column/);
    });

    it('refuses two different field keys across categories that derive the same column name', () => {
      // Both `fooBar` and `FooBar` are valid, distinct camelCase keys
      // (FIELD_KEY_PATTERN allows either case for the first letter), but
      // `fieldKeyToColumnName` folds them to the identical column `foo_bar`.
      expect(fieldKeyToColumnName('fooBar')).toBe(fieldKeyToColumnName('FooBar'));
      expect(() =>
        validateNeuronYaml({
          categories: {
            decisions: { fields: { fooBar: { type: 'string' } } },
            learning: { fields: { FooBar: { type: 'string' } } },
          },
        })
      ).toThrow(/collides with field/);
    });

    it('allows the same field key declared independently on two categories to share one column', () => {
      const config = validateNeuronYaml({
        categories: {
          decisions: { fields: { ticket: { type: 'string', required: true } } },
          learning: { fields: { ticket: { type: 'string', required: false } } },
        },
      });
      expect(fieldKeyToColumnName('ticket')).toBe('ticket');
      expect(config.categories.decisions.fields?.ticket.required).toBe(true);
    });
  });

  describe('categories.*.path collisions & inert-mode warning (ticket 05)', () => {
    it('allows two categories to resolve to the same directory (unchanged historical behaviour)', () => {
      const config = validateNeuronYaml({
        categories: { learning: {}, history: {} },
      });
      expect(config.categories.learning).toBeDefined();
      expect(config.categories.history).toBeDefined();
    });

    it('refuses two categories that would resolve to the same file', () => {
      expect(() =>
        validateNeuronYaml({
          storage: { mode: 'md', path: 'notes' },
          categories: { learning: { path: 'notes/learning' }, weird: {} },
        })
      ).not.toThrow(); // sanity: distinct files under the same root are fine

      expect(() =>
        validateNeuronYaml({
          categories: {
            // Both sanitize (getFilePath's [^a-zA-Z0-9_-] -> "_" rule) to the
            // identical filename "foo_bar.md" under the same resolved root.
            'foo:bar': { path: 'shared' },
            'foo bar': { path: 'shared' },
          },
          pullRules: { default: { categories: ['foo:bar'] } },
        })
      ).toThrow(/both resolve to the same file/);
    });

    it('warns, but does not throw, when a per-category path is set on a category whose storage resolves to "vector"', () => {
      const warnSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
      const config = validateNeuronYaml({
        categories: { learning: { storage: 'vector', path: 'ignored-notes' } },
      });
      expect(config.categories.learning.path).toBe('ignored-notes');
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining(`storage resolves to "vector"`));
      warnSpy.mockRestore();
    });

    it('does not warn when a per-category path is set on a category whose storage is (default or explicit) "md"', () => {
      const warnSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
      validateNeuronYaml({
        categories: { learning: { path: 'notes' }, decisions: { storage: 'md', path: 'adr' } },
      });
      const inertWarning = warnSpy.mock.calls.find(call =>
        String(call[0]).includes('storage resolves to "vector"')
      );
      expect(inertWarning).toBeUndefined();
      warnSpy.mockRestore();
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

  function writeYamlProject(yamlBody: string): string {
    const dir = path.join(tempDir, `declare-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    fs.mkdirSync(dir, { recursive: true });
    const configPath = path.join(dir, 'neuron.yaml');
    fs.writeFileSync(configPath, yamlBody);
    return configPath;
  }

  describe('declareCategoryInNeuronYaml (ADR 0017)', () => {
    it('appends a minimal flow-style block for an undeclared category, preserving hand-added comments', () => {
      const yamlBody = `version: "1.0"
# a hand-written comment the user cares about
storage:
  mode: md

categories:
  learning:
    description: Agent conventions
`;
      const configPath = writeYamlProject(yamlBody);
      declareCategoryInNeuronYaml(configPath, 'newthing');

      const written = fs.readFileSync(configPath, 'utf8');
      expect(written).toContain('# a hand-written comment the user cares about');
      expect(written).toContain('newthing: {}');

      const config = loadNeuronYaml(path.dirname(configPath));
      expect(config.categories.newthing).toEqual({});
      expect(config.categories.learning.description).toBe('Agent conventions');
    });

    it('is a no-op when the category is already declared on disk', () => {
      const yamlBody = `version: "1.0"
categories:
  learning:
    description: Agent conventions
`;
      const configPath = writeYamlProject(yamlBody);
      const before = fs.readFileSync(configPath, 'utf8');
      declareCategoryInNeuronYaml(configPath, 'learning');
      const after = fs.readFileSync(configPath, 'utf8');
      expect(after).toBe(before);
    });

    it('auto-vivifies a missing top-level "categories" key', () => {
      const yamlBody = `version: "1.0"\nstorage:\n  mode: md\n`;
      const configPath = writeYamlProject(yamlBody);
      declareCategoryInNeuronYaml(configPath, 'freshcat');
      const config = loadNeuronYaml(path.dirname(configPath));
      expect(config.categories.freshcat).toEqual({});
    });
  });

  describe('parseNeuronYaml / loadNeuronYaml round-trip fidelity (ADR 0017 Document API)', () => {
    it('round-trips a config with comments and blank lines with no meaningful loss', () => {
      const yamlBody = `version: "1.0"
# top comment
storage:
  mode: md # inline comment

categories:
  learning:
    description: Agent conventions
`;
      const configPath = writeYamlProject(yamlBody);
      // Reading through loadNeuronYaml must not itself mutate the file...
      loadNeuronYaml(path.dirname(configPath));
      expect(fs.readFileSync(configPath, 'utf8')).toBe(yamlBody);
      // ...and declaring a *different* category preserves both comments.
      declareCategoryInNeuronYaml(configPath, 'newthing');
      const written = fs.readFileSync(configPath, 'utf8');
      expect(written).toContain('# top comment');
      expect(written).toContain('mode: md # inline comment');
    });
  });
});
