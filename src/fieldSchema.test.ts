/**
 * Declarable per-category frontmatter fields (ticket 43 / ADR 0013),
 * asserted at the `transact()` choke point — required-but-missing,
 * defaults, enum membership, and the reject-undeclared-field guard — plus
 * the markdown round-trip that makes a written field value durable.
 *
 * Storage: SQLite column support for `vector-only`/`split` categories
 * shipped in ticket 44 — see `sqliteFieldSchema.test.ts` for the column
 * migration and round-trip coverage. These tests use `storage.mode: md`
 * where the markdown round-trip is meaningful.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import path from 'node:path';
import fs from 'node:fs';
import { NeuronMemory } from './index.js';
import { MdStorageAdapter } from './storage/mdStorageAdapter.js';
import type { Embedder } from './components/embedder.js';

const tempRoot = path.join(process.cwd(), 'src/__tests__/temp-field-schema');

const mockEmbedder: Embedder = {
  embed: async () => new Float32Array(64),
  embedQuery: async () => new Float32Array(64),
};

let projectSeq = 0;

function makeProject(yamlBody: string): { root: string; dbPath: string } {
  const root = path.join(tempRoot, `proj-${projectSeq++}`);
  fs.mkdirSync(root, { recursive: true });
  fs.writeFileSync(path.join(root, 'package.json'), '{}');
  fs.writeFileSync(path.join(root, 'neuron.yaml'), yamlBody);
  return { root, dbPath: path.join(root, 'store.sqlite') };
}

function open(yamlBody: string): NeuronMemory {
  const { root, dbPath } = makeProject(yamlBody);
  return new NeuronMemory({
    dbPath,
    projectRoot: root,
    projectName: 'field-schema-test',
    embedder: mockEmbedder,
  });
}

const MD_YAML = `version: "1.0"
storage:
  mode: md
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
        default: medium
`;

const VECTOR_ONLY_YAML = `version: "1.0"
storage:
  mode: vector-only
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
`;

describe('Declared field-schema enforcement — transact() choke point (ticket 43)', () => {
  beforeAll(() => fs.mkdirSync(tempRoot, { recursive: true }));
  afterAll(() => fs.rmSync(tempRoot, { recursive: true, force: true }));

  it('hard-errors on a required field with no default and no supplied value', async () => {
    const memory = open(MD_YAML);
    await expect(
      memory.transact([{ op: 'upsert', category: 'decisions', content: 'An ADR with no ticket' }])
    ).rejects.toThrow(/--ticket is required for category "decisions"/);
    memory.close();
  });

  it('does not throw when a required field with a default is omitted', async () => {
    const memory = open(MD_YAML);
    const [res] = await memory.transact([
      { op: 'upsert', category: 'decisions', content: 'An ADR', fields: { ticket: 'NEU-1' } },
    ]);
    // `confidence` has a default and was omitted — the default-fill path
    // itself is verified via the markdown round-trip below, where the
    // written value is actually observable.
    expect(res.status).toBe('created');
    memory.close();
  });

  it('rejects an enum value outside the declared set', async () => {
    const memory = open(MD_YAML);
    await expect(
      memory.transact([
        {
          op: 'upsert',
          category: 'decisions',
          content: 'An ADR',
          fields: { ticket: 'NEU-1', confidence: 'extreme' },
        },
      ])
    ).rejects.toThrow(/--confidence "extreme" is not one of \[low, medium, high\]/);
    memory.close();
  });

  it('suggests the nearest enum value on a near-miss typo', async () => {
    const memory = open(MD_YAML);
    await expect(
      memory.transact([
        { op: 'upsert', category: 'decisions', content: 'An ADR', fields: { ticket: 'NEU-1', confidence: 'medum' } },
      ])
    ).rejects.toThrow(/did you mean "medium"/);
    memory.close();
  });

  it('rejects a field value for a field the resolved category never declared', async () => {
    const memory = open(MD_YAML);
    await expect(
      memory.transact([
        { op: 'upsert', category: 'learning', content: 'A learning entry', fields: { ticket: 'NEU-1' } },
      ])
    ).rejects.toThrow(/--ticket is not a declared field of category "learning"/);
    memory.close();
  });

  it('does not re-demand a required field on update — partial-patch semantics', async () => {
    const memory = open(MD_YAML);
    const [created] = await memory.transact([
      { op: 'upsert', category: 'decisions', content: 'An ADR', fields: { ticket: 'NEU-1' } },
    ]);
    const [updated] = await memory.transact([
      { op: 'update', category: 'decisions', id: created.id, content: 'An ADR, revised' },
    ]);
    expect(updated.status).toBe('updated');
    memory.close();
  });

  it('still validates enum membership for a value supplied on update', async () => {
    const memory = open(MD_YAML);
    const [created] = await memory.transact([
      { op: 'upsert', category: 'decisions', content: 'An ADR', fields: { ticket: 'NEU-1' } },
    ]);
    await expect(
      memory.transact([
        { op: 'update', category: 'decisions', id: created.id, fields: { confidence: 'nope' } },
      ])
    ).rejects.toThrow(/--confidence "nope" is not one of/);
    memory.close();
  });

  it('persists and reads back a declared field in vector-only mode (ticket 44)', async () => {
    const memory = open(VECTOR_ONLY_YAML);

    const [res] = await memory.transact([
      { op: 'upsert', category: 'decisions', content: 'An ADR', fields: { ticket: 'NEU-1' } },
    ]);
    expect(res.status).toBe('created');

    const [entry] = await memory.query({ category: 'decisions' });
    expect(entry.fields).toEqual({ ticket: 'NEU-1' });
    memory.close();
  });
});

describe('Declared fields round-trip through markdown frontmatter (ticket 43)', () => {
  beforeAll(() => fs.mkdirSync(tempRoot, { recursive: true }));
  afterAll(() => fs.rmSync(tempRoot, { recursive: true, force: true }));

  it('writes declared field values into frontmatter and reads them back', async () => {
    const { root, dbPath } = makeProject(MD_YAML);
    const memory = new NeuronMemory({
      dbPath,
      projectRoot: root,
      projectName: 'field-schema-roundtrip',
      embedder: mockEmbedder,
    });

    const [res] = await memory.transact([
      {
        op: 'upsert',
        category: 'decisions',
        content: 'Adopt the field schema',
        fields: { ticket: 'NEU-43' },
      },
    ]);
    memory.close();

    const mdAdapter = new MdStorageAdapter(path.join(root, '.neuron'));
    const entries = await mdAdapter.readCategory('decisions');
    const entry = entries.find(e => e.id === res.id);
    expect(entry).toBeDefined();
    expect(entry!.fields).toEqual({ ticket: 'NEU-43', confidence: 'medium' });

    const raw = fs.readFileSync(path.join(root, '.neuron', 'decisions.md'), 'utf8');
    expect(raw).toContain('ticket: NEU-43');
    expect(raw).toContain('confidence: medium');
  });

  it('merges on update — an untouched field survives, a touched one changes', async () => {
    const { root, dbPath } = makeProject(MD_YAML);
    const memory = new NeuronMemory({
      dbPath,
      projectRoot: root,
      projectName: 'field-schema-merge',
      embedder: mockEmbedder,
    });

    const [created] = await memory.transact([
      {
        op: 'upsert',
        category: 'decisions',
        content: 'Adopt the field schema',
        fields: { ticket: 'NEU-43', confidence: 'low' },
      },
    ]);

    await memory.transact([
      { op: 'update', category: 'decisions', id: created.id, fields: { confidence: 'high' } },
    ]);
    memory.close();

    const mdAdapter = new MdStorageAdapter(path.join(root, '.neuron'));
    const entries = await mdAdapter.readCategory('decisions');
    const entry = entries.find(e => e.id === created.id);
    // ticket untouched by the update — must survive; confidence touched — must change.
    expect(entry!.fields).toEqual({ ticket: 'NEU-43', confidence: 'high' });
  });

  it('reads back a hand-added frontmatter key not yet declared in neuron.yaml', async () => {
    const { root } = makeProject(MD_YAML);
    const storagePath = path.join(root, '.neuron');
    fs.mkdirSync(storagePath, { recursive: true });
    fs.writeFileSync(
      path.join(storagePath, 'decisions.md'),
      `# Category: decisions\n\n---\nid: hand-added-1\ncreatedAt: "2026-01-01T00:00:00.000Z"\nimportance: 3\ntags: []\nreviewedBy: alice\n---\nA hand-written entry.\n`
    );

    const mdAdapter = new MdStorageAdapter(storagePath);
    const entries = await mdAdapter.readCategory('decisions');
    expect(entries[0].fields).toEqual({ reviewedBy: 'alice' });
  });
});
