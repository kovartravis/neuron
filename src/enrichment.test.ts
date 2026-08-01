/**
 * Write-side enrichment, asserted at the two seams that carry a user-visible
 * guarantee: the transaction entry point (what ends up in the store) and the
 * query entry point (what comes back from a read).
 *
 * Nothing here asserts *how* a tag was chosen. The category strategy in
 * particular is being A/B'd precisely because its winner is unknown, so tests
 * that pinned the mechanism would have to be rewritten by the experiment they
 * exist to support.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import path from 'node:path';
import fs from 'node:fs';
import { NeuronMemory } from './index.js';
import type { Embedder } from './components/embedder.js';
import type {
  EnrichmentModel,
  CategoryInferenceResult,
  ImportanceInferenceResult,
} from './components/enricher.js';

const tempRoot = path.join(process.cwd(), 'src/__tests__/temp-enrichment');

/**
 * A deterministic token-hashing embedder. The default mock returns a zero
 * vector, which makes every cosine 0 and every centroid degenerate — useless
 * for asserting that selection happened at all.
 */
function hashEmbedder(): Embedder {
  const embed = async (text: string): Promise<Float32Array> => {
    const vec = new Float32Array(64);
    for (const token of text.toLowerCase().match(/[a-z0-9]+/g) ?? []) {
      let h = 2166136261;
      for (let i = 0; i < token.length; i++) {
        h ^= token.charCodeAt(i);
        h = Math.imul(h, 16777619);
      }
      vec[Math.abs(h) % 64] += 1;
    }
    let norm = 0;
    for (const v of vec) norm += v * v;
    norm = Math.sqrt(norm);
    if (norm > 0) for (let i = 0; i < vec.length; i++) vec[i] /= norm;
    return vec;
  };
  return { embed, embedQuery: embed };
}

/** A stub enricher — the injected seam ADR 0010 §7 calls for. */
function stubEnricher(overrides: Partial<EnrichmentModel> = {}): EnrichmentModel {
  return {
    inferCategoryAndImportance: async (): Promise<CategoryInferenceResult> => ({
      category: 'decisions',
      importance: 5,
    }),
    inferImportance: async (): Promise<ImportanceInferenceResult> => ({ importance: 4 }),
    ...overrides,
  };
}

let projectSeq = 0;

function makeProject(yamlBody: string): { root: string; dbPath: string } {
  const root = path.join(tempRoot, `proj-${projectSeq++}`);
  fs.mkdirSync(root, { recursive: true });
  fs.writeFileSync(path.join(root, 'package.json'), '{}');
  fs.writeFileSync(path.join(root, 'neuron.yaml'), yamlBody);
  return { root, dbPath: path.join(root, 'store.sqlite') };
}

const CATEGORIES_BLOCK = `version: "1.0"
storage:
  mode: vector-only
categories:
  learning:
    description: Agent conventions, rules, and failure fixes
  decisions:
    description: Architectural Decision Records
`;

/**
 * Importance inference ships off by default (Pillar 10 measured its judgement
 * as negatively discriminating), so these tests switch it on explicitly — the
 * mechanism is still specified behaviour and still has to work.
 */
function yamlWith(extra = ''): string {
  return `${CATEGORIES_BLOCK}llm:
  enrichment:
    importance: infer
${extra}`;
}

const BASE_YAML = yamlWith();

function open(yamlBody: string, enricher?: EnrichmentModel): NeuronMemory {
  const { root, dbPath } = makeProject(yamlBody);
  return new NeuronMemory({
    dbPath,
    projectRoot: root,
    projectName: 'enrich-test',
    embedder: hashEmbedder(),
    enricher,
  });
}

/** Read the stored row directly — the store is what the assertions are about. */
function storedRow(memory: NeuronMemory, id: string): any {
  return memory
    .getDb()
    .prepare('SELECT category, tags, importance, enriched_at FROM memories WHERE id = ?')
    .get(id);
}

async function seedVocabulary(memory: NeuronMemory, tag: string, count: number): Promise<void> {
  const mutations = Array.from({ length: count }, (_, i) => ({
    op: 'upsert' as const,
    category: 'learning',
    content: `Tree-sitter grammar loading and wasm parser fidelity note number ${i}`,
    tags: [tag],
    importance: 3,
  }));
  await memory.transact(mutations);
}

describe('Write-side enrichment — transaction seam', () => {
  beforeAll(() => fs.mkdirSync(tempRoot, { recursive: true }));
  afterAll(() => fs.rmSync(tempRoot, { recursive: true, force: true }));

  it('leaves every explicitly supplied field untouched', async () => {
    const memory = open(BASE_YAML, stubEnricher());
    const [res] = await memory.transact([
      {
        op: 'upsert',
        category: 'learning',
        content: 'An entry whose metadata the caller set deliberately',
        tags: ['deliberate'],
        importance: 2,
      },
    ]);

    const row = storedRow(memory, res.id);
    expect(row.category).toBe('learning');
    expect(JSON.parse(row.tags)).toEqual(['deliberate']);
    expect(row.importance).toBe(2);
    expect(row.enriched_at).not.toBeNull();
    memory.close();
  });

  it('fills omitted tags from the store vocabulary', async () => {
    const memory = open(BASE_YAML, stubEnricher());
    await seedVocabulary(memory, 'tree-sitter', 4);

    const [res] = await memory.transact([
      {
        op: 'upsert',
        category: 'learning',
        content: 'Tree-sitter grammar loading and wasm parser fidelity note number 99',
        importance: 3,
      },
    ]);

    expect(JSON.parse(storedRow(memory, res.id).tags)).toContain('tree-sitter');
    memory.close();
  });

  it('never selects a tag carried by fewer than three entries', async () => {
    const memory = open(BASE_YAML, stubEnricher());
    await seedVocabulary(memory, 'singleton-tag', 2);

    const [res] = await memory.transact([
      {
        op: 'upsert',
        category: 'learning',
        content: 'Tree-sitter grammar loading and wasm parser fidelity note number 99',
        importance: 3,
      },
    ]);

    expect(JSON.parse(storedRow(memory, res.id).tags)).not.toContain('singleton-tag');
    memory.close();
  });

  it('exempts a tag declared in neuron.yaml from the frequency floor', async () => {
    const declaredYaml = `version: "1.0"
categories:
  learning:
    description: Agent conventions
    tags:
      - declared-rare
  decisions:
    description: ADRs
`;
    const memory = open(declaredYaml, stubEnricher());
    await seedVocabulary(memory, 'declared-rare', 1);

    const [res] = await memory.transact([
      {
        op: 'upsert',
        category: 'learning',
        content: 'Tree-sitter grammar loading and wasm parser fidelity note number 99',
        importance: 3,
      },
    ]);

    expect(JSON.parse(storedRow(memory, res.id).tags)).toContain('declared-rare');
    memory.close();
  });

  it('infers an omitted category by centroid, the shipped default strategy', async () => {
    // Seeded entries are what centroids are built from; a cold store has none.
    const memory = open(BASE_YAML, stubEnricher());
    await memory.transact(
      Array.from({ length: 3 }, (_, i) => ({
        op: 'upsert' as const,
        category: 'decisions',
        content: `We chose the wasm grammar fetch over bundling for size reasons, note ${i}`,
        tags: ['adr'],
        importance: 3,
      }))
    );

    const [res] = await memory.transact([
      {
        op: 'upsert',
        content: 'We chose the wasm grammar fetch over bundling for size reasons, note 99',
        importance: 3,
      },
    ]);
    expect(storedRow(memory, res.id).category).toBe('decisions');
    memory.close();
  });

  it('infers an omitted category by model, and takes importance from the same call', async () => {
    const memory = open(yamlWith('    categoryStrategy: model\n'), stubEnricher());
    const [res] = await memory.transact([
      { op: 'upsert', content: 'An entry filed without a category flag' },
    ]);

    const row = storedRow(memory, res.id);
    expect(row.category).toBe('decisions');
    expect(row.importance).toBe(5);
    expect(row.enriched_at).not.toBeNull();
    memory.close();
  });

  it('fails naming the cause when category inference is unavailable', async () => {
    const memory = open(
      yamlWith('    categoryStrategy: model\n'),
      stubEnricher({ inferCategoryAndImportance: async () => ({ degraded: 'timeout' }) })
    );

    await expect(
      memory.transact([{ op: 'upsert', content: 'An entry nothing can file' }])
    ).rejects.toThrow(/timed out/);
    memory.close();
  });

  it('uses the configured literal category as the fallback instead of erroring', async () => {
    const fallbackYaml = yamlWith('    category: learning\n    categoryStrategy: model\n');
    const memory = open(
      fallbackYaml,
      stubEnricher({ inferCategoryAndImportance: async () => ({ degraded: 'timeout' }) })
    );

    const [res] = await memory.transact([
      { op: 'upsert', content: 'An entry that lands in the configured fallback' },
    ]);
    expect(storedRow(memory, res.id).category).toBe('learning');
    memory.close();
  });

  it('defers importance rather than loading the model when only importance is missing', async () => {
    const memory = open(BASE_YAML, stubEnricher());
    const [res] = await memory.transact([
      { op: 'upsert', category: 'learning', content: 'Category supplied, importance not' },
    ]);

    const row = storedRow(memory, res.id);
    expect(row.enriched_at).toBeNull();
    expect(memory.countPendingEnrichment()).toBe(1);
    memory.close();
  });

  it('creates no backlog and infers nothing when enrichment is disabled', async () => {
    const offYaml = yamlWith('    enabled: false\n');
    const memory = open(offYaml, stubEnricher());
    await seedVocabulary(memory, 'tree-sitter', 4);

    const [res] = await memory.transact([
      {
        op: 'upsert',
        category: 'learning',
        content: 'Tree-sitter grammar loading and wasm parser fidelity note number 99',
      },
    ]);

    const row = storedRow(memory, res.id);
    expect(JSON.parse(row.tags)).toEqual([]);
    expect(row.enriched_at).not.toBeNull();
    expect(memory.countPendingEnrichment()).toBe(0);

    await expect(
      memory.transact([{ op: 'upsert', content: 'No category, no inference' }])
    ).rejects.toThrow(/llm\.enrichment\.enabled: false/);
    memory.close();
  });

  it('hard-errors on an omitted category when category inference is switched off', async () => {
    const offYaml = yamlWith('    category: "off"\n');
    const memory = open(offYaml, stubEnricher());
    await expect(
      memory.transact([{ op: 'upsert', content: 'No category, inference off' }])
    ).rejects.toThrow(/llm\.enrichment\.category: off/);
    memory.close();
  });
});

describe('Write-side enrichment — query seam', () => {
  beforeAll(() => fs.mkdirSync(tempRoot, { recursive: true }));
  afterAll(() => fs.rmSync(tempRoot, { recursive: true, force: true }));

  it('drains the backlog before a query, so a read never sees unenriched data', async () => {
    const memory = open(BASE_YAML, stubEnricher());
    const [res] = await memory.transact([
      { op: 'upsert', category: 'learning', content: 'Deferred importance on this entry' },
    ]);
    expect(memory.countPendingEnrichment()).toBe(1);

    const results = await memory.query({ text: 'deferred importance', categories: ['learning'] });

    expect(memory.countPendingEnrichment()).toBe(0);
    expect(storedRow(memory, res.id).importance).toBe(4);
    expect(results.find(r => r.id === res.id)?.importance).toBe(4);
    memory.close();
  });

  it('drains completely rather than partially', async () => {
    const memory = open(BASE_YAML, stubEnricher());
    await memory.transact(
      Array.from({ length: 12 }, (_, i) => ({
        op: 'upsert' as const,
        category: 'learning',
        content: `Backlog entry ${i}`,
      }))
    );
    expect(memory.countPendingEnrichment()).toBe(12);

    await memory.query({ text: 'backlog', categories: ['learning'] });
    expect(memory.countPendingEnrichment()).toBe(0);
    memory.close();
  });

  it('stamps a degraded row anyway and counts the degradation', async () => {
    const memory = open(
      BASE_YAML,
      stubEnricher({ inferImportance: async () => ({ degraded: 'model_unavailable' }) })
    );
    const [res] = await memory.transact([
      { op: 'upsert', category: 'learning', content: 'Nothing will enrich this' },
    ]);

    await memory.query({ text: 'nothing', categories: ['learning'] });

    // Stamped, so the next read does not re-attempt a cold model load forever.
    expect(memory.countPendingEnrichment()).toBe(0);
    expect(storedRow(memory, res.id).importance).toBe(3);

    const status = memory.getStatus();
    expect(status.enrichment.degraded.model_unavailable).toBe(1);
    expect(status.enrichment.pending).toBe(0);
    memory.close();
  });
});
