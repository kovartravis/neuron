/**
 * Write-side enrichment, asserted at the transaction entry point — what ends up
 * in the store. That was once two seams; the query seam carried the enrichment
 * backlog's drain guarantee, and ticket 26 removed the only deferred job, so a
 * read has no enrichment behaviour left to assert.
 *
 * Nothing here asserts *how* a tag was chosen. The category strategy in
 * particular was A/B'd precisely because its winner was unknown, so tests that
 * pinned the mechanism would have been rewritten by the experiment they existed
 * to support.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import path from 'node:path';
import fs from 'node:fs';
import { NeuronMemory } from './index.js';
import type { Embedder } from './components/embedder.js';
import type { EnrichmentModel, CategoryInferenceResult } from './components/enricher.js';

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
    inferCategory: async (): Promise<CategoryInferenceResult> => ({ category: 'decisions' }),
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
  mode: vector
categories:
  learning:
    description: Agent conventions, rules, and failure fixes
  decisions:
    description: Architectural Decision Records
`;

/** Adds an `llm.enrichment` block only when a test needs to override a key. */
function yamlWith(extra: string): string {
  return `${CATEGORIES_BLOCK}llm:
  enrichment:
${extra}`;
}

const BASE_YAML = CATEGORIES_BLOCK;

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

  it('infers an omitted category by model, and infers nothing else from that call', async () => {
    const memory = open(yamlWith('    categoryStrategy: model\n'), stubEnricher());
    const [res] = await memory.transact([
      { op: 'upsert', content: 'An entry filed without a category flag' },
    ]);

    const row = storedRow(memory, res.id);
    expect(row.category).toBe('decisions');
    // The model path once inferred importance alongside category, unconditionally
    // — so `importance: off` was never the whole guard it looked like. Ticket 26
    // removed the job outright; the column default is all that remains.
    expect(row.importance).toBe(3);
    expect(row.enriched_at).not.toBeNull();
    memory.close();
  });

  it('fails naming the cause when category inference is unavailable', async () => {
    const memory = open(
      yamlWith('    categoryStrategy: model\n'),
      stubEnricher({ inferCategory: async () => ({ degraded: 'timeout' }) })
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
      stubEnricher({ inferCategory: async () => ({ degraded: 'timeout' }) })
    );

    const [res] = await memory.transact([
      { op: 'upsert', content: 'An entry that lands in the configured fallback' },
    ]);
    expect(storedRow(memory, res.id).category).toBe('learning');
    memory.close();
  });

  it('takes the default importance and defers nothing when --importance is omitted', async () => {
    // The tripwire for the collision ticket 23 left live: the entry default and
    // the `neuron memory prune` ceiling are both 3, and prune compares
    // inclusively. If this ever stops being 3, that hazard has moved.
    const memory = open(BASE_YAML, stubEnricher());
    const [res] = await memory.transact([
      { op: 'upsert', category: 'learning', content: 'Category supplied, importance not' },
    ]);

    const row = storedRow(memory, res.id);
    expect(row.importance).toBe(3);
    expect(row.enriched_at).not.toBeNull();
    memory.close();
  });

  it('counts a degradation when centroid category inference finds nothing close', async () => {
    // Silence without counters is how a broken job goes unnoticed (ADR 0010 §3).
    const memory = open(BASE_YAML, stubEnricher());
    await expect(
      memory.transact([{ op: 'upsert', content: 'A cold store has no centroids to match against' }])
    ).rejects.toThrow(/close enough/);

    expect(memory.getStatus().enrichment.degraded.category_centroid_miss).toBe(1);
    memory.close();
  });

  it('infers nothing when enrichment is disabled', async () => {
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

  it('strict: does not auto-fill tags even with a strong vocabulary match', async () => {
    const strictYaml = `${CATEGORIES_BLOCK}strict: true\n`;
    const memory = open(strictYaml, stubEnricher());
    await seedVocabulary(memory, 'tree-sitter', 4);

    const [res] = await memory.transact([
      {
        op: 'upsert',
        category: 'learning',
        content: 'Tree-sitter grammar loading and wasm parser fidelity note number 99',
      },
    ]);

    expect(JSON.parse(storedRow(memory, res.id).tags)).toEqual([]);
    memory.close();
  });

  it('strict: hard-errors naming strict mode on an omitted category with no fallback configured', async () => {
    const strictYaml = `${CATEGORIES_BLOCK}strict: true\n`;
    const memory = open(strictYaml, stubEnricher());
    await expect(
      memory.transact([{ op: 'upsert', content: 'No category, strict mode on' }])
    ).rejects.toThrow(/strict: true/);
    memory.close();
  });

  it('strict: still uses a literal llm.enrichment.category fallback, skipping inference entirely', async () => {
    // A cold store has zero centroids — under the default (non-strict) strategy
    // this would hard-error with "found no category close enough". Landing in
    // the fallback instead proves centroid inference never ran.
    const strictWithFallback = `${CATEGORIES_BLOCK}strict: true\nllm:\n  enrichment:\n    category: learning\n`;
    const memory = open(strictWithFallback, stubEnricher());

    const [res] = await memory.transact([
      { op: 'upsert', content: 'An entry that lands in the configured fallback under strict' },
    ]);
    expect(storedRow(memory, res.id).category).toBe('learning');
    memory.close();
  });

  it('never leaves a row unenriched, so no read has a backlog to drain', async () => {
    const memory = open(BASE_YAML, stubEnricher());
    await memory.transact(
      Array.from({ length: 12 }, (_, i) => ({
        op: 'upsert' as const,
        category: 'learning',
        content: `Entry ${i}, written with nothing to defer`,
      }))
    );

    const unenriched = memory
      .getDb()
      .prepare('SELECT COUNT(*) as n FROM memories WHERE enriched_at IS NULL')
      .get() as { n: number };
    expect(unenriched.n).toBe(0);
    memory.close();
  });
});
