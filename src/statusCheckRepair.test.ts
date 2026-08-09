/**
 * `neuron status --check`/`--repair` (ticket 13 / ADR 0013): reporting and
 * fixing live entries that violate a category's *currently*-declared field
 * schema. The interesting case is always the same shape — a field became
 * required (or was newly declared with a default, or newly declared enum)
 * after some entries were already written — simulated below by writing
 * against one `neuron.yaml`, then reopening a fresh `NeuronMemory` against
 * the same store with an evolved config, exactly as a real upgrade would.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import path from 'node:path';
import fs from 'node:fs';
import { NeuronMemory } from './index.js';
import type { Embedder } from './components/embedder.js';

const tempRoot = path.join(process.cwd(), 'src/__tests__/temp-status-check-repair');

/**
 * Same deterministic token-hashing embedder `enrichment.test.ts` uses — the
 * default mock embedder returns a zero vector, which makes every centroid
 * degenerate and can't discriminate between enum labels.
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

let projectSeq = 0;

function makeProject(yamlBody: string): { root: string; dbPath: string } {
  const root = path.join(tempRoot, `proj-${projectSeq++}`);
  fs.mkdirSync(root, { recursive: true });
  fs.writeFileSync(path.join(root, 'package.json'), '{}');
  fs.writeFileSync(path.join(root, 'neuron.yaml'), yamlBody);
  return { root, dbPath: path.join(root, 'store.sqlite') };
}

function openAt(root: string, dbPath: string, yamlBody: string): NeuronMemory {
  fs.writeFileSync(path.join(root, 'neuron.yaml'), yamlBody);
  return new NeuronMemory({
    dbPath,
    projectRoot: root,
    projectName: 'status-check-repair-test',
    embedder: hashEmbedder(),
  });
}

const YAML_NO_REQUIRED_FIELDS = `version: "1.0"
storage:
  mode: vector
categories:
  learning:
    description: Agent conventions
  decisions:
    description: ADRs
    fields:
      ticket:
        type: string
      confidence:
        type: enum
        values: [low, medium, high]
`;

const YAML_TICKET_REQUIRED_NO_DEFAULT = `version: "1.0"
storage:
  mode: vector
categories:
  learning:
    description: Agent conventions
  decisions:
    description: ADRs
    fields:
      ticket:
        type: string
        required: true
      confidence:
        type: enum
        values: [low, medium, high]
`;

const YAML_TICKET_REQUIRED_WITH_DEFAULT = `version: "1.0"
storage:
  mode: vector
categories:
  learning:
    description: Agent conventions
  decisions:
    description: ADRs
    fields:
      ticket:
        type: string
        required: true
        default: UNSET
      confidence:
        type: enum
        values: [low, medium, high]
`;

const YAML_CONFIDENCE_REQUIRED = `version: "1.0"
storage:
  mode: vector
categories:
  learning:
    description: Agent conventions
  decisions:
    description: ADRs
    fields:
      ticket:
        type: string
      confidence:
        type: enum
        values: [low, medium, high]
        required: true
`;

describe('checkFieldCompliance (ticket 13 / ADR 0013)', () => {
  beforeAll(() => fs.mkdirSync(tempRoot, { recursive: true }));
  afterAll(() => fs.rmSync(tempRoot, { recursive: true, force: true }));

  it('reports an entry written before its category declared a field required', async () => {
    const { root, dbPath } = makeProject(YAML_NO_REQUIRED_FIELDS);
    const memory1 = openAt(root, dbPath, YAML_NO_REQUIRED_FIELDS);
    const [created] = await memory1.transact([
      { op: 'upsert', category: 'decisions', content: 'An ADR filed before "ticket" was required' },
    ]);
    memory1.close();

    const memory2 = openAt(root, dbPath, YAML_TICKET_REQUIRED_NO_DEFAULT);
    const violations = await memory2.checkFieldCompliance();
    memory2.close();

    expect(violations).toEqual([
      { id: created.id, category: 'decisions', missingRequiredFields: ['ticket'] },
    ]);
  });

  it('does not report an entry that already carries the now-required field', async () => {
    const { root, dbPath } = makeProject(YAML_NO_REQUIRED_FIELDS);
    const memory1 = openAt(root, dbPath, YAML_NO_REQUIRED_FIELDS);
    await memory1.transact([
      { op: 'upsert', category: 'decisions', content: 'An ADR with a ticket already', fields: { ticket: 'NEU-1' } },
    ]);
    memory1.close();

    const memory2 = openAt(root, dbPath, YAML_TICKET_REQUIRED_NO_DEFAULT);
    const violations = await memory2.checkFieldCompliance();
    memory2.close();

    expect(violations).toEqual([]);
  });

  it('never reports an entry from a category with no currently-required fields', async () => {
    const { root, dbPath } = makeProject(YAML_NO_REQUIRED_FIELDS);
    const memory = openAt(root, dbPath, YAML_NO_REQUIRED_FIELDS);
    await memory.transact([{ op: 'upsert', category: 'learning', content: 'A plain learning entry' }]);
    const violations = await memory.checkFieldCompliance();
    memory.close();

    expect(violations).toEqual([]);
  });
});

describe('repairFieldCompliance (ticket 13 / ADR 0013)', () => {
  beforeAll(() => fs.mkdirSync(tempRoot, { recursive: true }));
  afterAll(() => fs.rmSync(tempRoot, { recursive: true, force: true }));

  it('applies a configured default: to a missing required string field', async () => {
    const { root, dbPath } = makeProject(YAML_NO_REQUIRED_FIELDS);
    const memory1 = openAt(root, dbPath, YAML_NO_REQUIRED_FIELDS);
    const [created] = await memory1.transact([
      { op: 'upsert', category: 'decisions', content: 'An ADR filed before "ticket" existed' },
    ]);
    memory1.close();

    const memory2 = openAt(root, dbPath, YAML_TICKET_REQUIRED_WITH_DEFAULT);
    const outcomes = await memory2.repairFieldCompliance();
    expect(outcomes).toEqual([
      { id: created.id, category: 'decisions', applied: { ticket: 'UNSET' }, unresolved: [] },
    ]);

    const entry = await memory2.findById(created.id);
    expect(entry!.fields).toEqual({ ticket: 'UNSET' });
    memory2.close();
  });

  it('leaves a free-text field with no default unresolved rather than fabricating a value', async () => {
    const { root, dbPath } = makeProject(YAML_NO_REQUIRED_FIELDS);
    const memory1 = openAt(root, dbPath, YAML_NO_REQUIRED_FIELDS);
    const [created] = await memory1.transact([
      { op: 'upsert', category: 'decisions', content: 'An ADR filed before "ticket" was required' },
    ]);
    memory1.close();

    const memory2 = openAt(root, dbPath, YAML_TICKET_REQUIRED_NO_DEFAULT);
    const outcomes = await memory2.repairFieldCompliance();
    expect(outcomes).toEqual([
      { id: created.id, category: 'decisions', applied: {}, unresolved: ['ticket'] },
    ]);

    const entry = await memory2.findById(created.id);
    expect(entry!.fields).toBeUndefined();
    memory2.close();
  });

  it('infers a missing enum field by centroid from other entries already carrying a value', async () => {
    const { root, dbPath } = makeProject(YAML_NO_REQUIRED_FIELDS);
    const memory1 = openAt(root, dbPath, YAML_NO_REQUIRED_FIELDS);

    // Three labeled entries per value, topically distinct so the hash
    // embedder's centroids actually discriminate (mirrors
    // enrichment.test.ts's category-centroid test).
    await memory1.transact([
      { op: 'upsert', category: 'decisions', content: 'wasm grammar fetch chosen over bundling for size, note a', fields: { confidence: 'high' } },
      { op: 'upsert', category: 'decisions', content: 'wasm grammar fetch chosen over bundling for size, note b', fields: { confidence: 'high' } },
      { op: 'upsert', category: 'decisions', content: 'wasm grammar fetch chosen over bundling for size, note c', fields: { confidence: 'high' } },
      { op: 'upsert', category: 'decisions', content: 'sqlite wal mode enabled for write concurrency, note a', fields: { confidence: 'low' } },
      { op: 'upsert', category: 'decisions', content: 'sqlite wal mode enabled for write concurrency, note b', fields: { confidence: 'low' } },
      { op: 'upsert', category: 'decisions', content: 'sqlite wal mode enabled for write concurrency, note c', fields: { confidence: 'low' } },
    ]);
    const [created] = await memory1.transact([
      { op: 'upsert', category: 'decisions', content: 'wasm grammar fetch chosen over bundling for size, note d' },
    ]);
    memory1.close();

    const memory2 = openAt(root, dbPath, YAML_CONFIDENCE_REQUIRED);
    const outcomes = await memory2.repairFieldCompliance();
    const own = outcomes.find((o) => o.id === created.id);
    expect(own).toEqual({ id: created.id, category: 'decisions', applied: { confidence: 'high' }, unresolved: [] });
    memory2.close();
  });

  it('leaves an enum field unresolved when no other entry has a value to build a centroid from', async () => {
    const { root, dbPath } = makeProject(YAML_NO_REQUIRED_FIELDS);
    const memory1 = openAt(root, dbPath, YAML_NO_REQUIRED_FIELDS);
    const [created] = await memory1.transact([
      { op: 'upsert', category: 'decisions', content: 'The very first ADR in a cold store' },
    ]);
    memory1.close();

    const memory2 = openAt(root, dbPath, YAML_CONFIDENCE_REQUIRED);
    const outcomes = await memory2.repairFieldCompliance();
    expect(outcomes).toEqual([
      { id: created.id, category: 'decisions', applied: {}, unresolved: ['confidence'] },
    ]);
    memory2.close();
  });

  it('returns an empty array when nothing violates the currently-declared schema', async () => {
    const { root, dbPath } = makeProject(YAML_TICKET_REQUIRED_WITH_DEFAULT);
    const memory = openAt(root, dbPath, YAML_TICKET_REQUIRED_WITH_DEFAULT);
    await memory.transact([
      { op: 'upsert', category: 'decisions', content: 'A fully compliant ADR', fields: { ticket: 'NEU-1' } },
    ]);
    const outcomes = await memory.repairFieldCompliance();
    memory.close();

    expect(outcomes).toEqual([]);
  });
});
