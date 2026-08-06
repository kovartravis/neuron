/**
 * SQLite additive auto-migration for declared category fields (ticket 44 /
 * ADR 0013) — the `vector-only`/`split` counterpart to
 * `fieldSchema.test.ts`'s markdown round-trip. Covers the migration
 * mechanics (additive, idempotent, never `DROP COLUMN`) and the
 * write-then-query round trip through real SQLite columns rather than
 * frontmatter.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { NeuronMemory, openDatabase } from './index.js';
import type { Embedder } from './components/embedder.js';

const tempRoot = path.join(process.cwd(), 'src/__tests__/temp-sqlite-field-schema');

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
    projectName: 'sqlite-field-schema-test',
    embedder: mockEmbedder,
  });
}

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
      confidence:
        type: enum
        values: [low, medium, high]
        default: medium
`;

const SPLIT_YAML = `version: "1.0"
storage:
  mode: split
categories:
  learning:
    description: Agent conventions
  decisions:
    description: ADRs
    storage: vector
    fields:
      reviewedBy:
        type: string
        required: true
`;

describe('SQLite additive field migration (ticket 44)', () => {
  beforeAll(() => fs.mkdirSync(tempRoot, { recursive: true }));
  afterAll(() => fs.rmSync(tempRoot, { recursive: true, force: true }));

  it('adds one nullable TEXT column per declared field on a fresh store', () => {
    const memory = open(VECTOR_ONLY_YAML);
    const cols = (memory.getDb().pragma('table_info(memories)') as any[]).map((c) => c.name);
    expect(cols).toContain('ticket');
    expect(cols).toContain('confidence');
    memory.close();
  });

  it('is a no-op on a store that already has the columns (idempotent re-open)', () => {
    const { root, dbPath } = makeProject(VECTOR_ONLY_YAML);
    const first = new NeuronMemory({ dbPath, projectRoot: root, projectName: 'p', embedder: mockEmbedder });
    first.close();

    const second = new NeuronMemory({ dbPath, projectRoot: root, projectName: 'p', embedder: mockEmbedder });
    const cols = (second.getDb().pragma('table_info(memories)') as any[]).map((c) => c.name);
    expect(cols.filter((c) => c === 'ticket')).toHaveLength(1);
    second.close();
  });

  it('additively migrates a pre-ticket-44 database that predates the new columns', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'neuron-field-migration-test-'));
    const dbPath = path.join(tempDir, 'legacy.sqlite');

    // Build a v7-shaped database by hand — no declared-field columns at all,
    // matching every store that existed before this ticket.
    const seedDb = openDatabase(dbPath);
    seedDb.exec(`
      CREATE TABLE meta (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL);
      CREATE TABLE memories (
        id TEXT PRIMARY KEY NOT NULL, project_id TEXT NOT NULL, category TEXT NOT NULL,
        content TEXT NOT NULL, tags TEXT NOT NULL DEFAULT '[]', embedding BLOB NOT NULL,
        importance INTEGER NOT NULL DEFAULT 3 CHECK (importance BETWEEN 1 AND 5),
        task_id TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, enriched_at TEXT
      );
    `);
    seedDb.prepare(`INSERT INTO meta (key, value) VALUES ('schema_version', '7')`).run();
    seedDb.prepare(`
      INSERT INTO memories (id, project_id, category, content, tags, embedding, importance, task_id, created_at, updated_at, enriched_at)
      VALUES ('mem-1', 'proj-1', 'decisions', 'a preserved ADR', '[]', ?, 5, NULL, '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z')
    `).run(Buffer.alloc(256));
    seedDb.pragma('user_version = 7');
    seedDb.close();

    fs.mkdirSync(tempDir, { recursive: true });
    fs.writeFileSync(path.join(tempDir, 'package.json'), '{}');
    fs.writeFileSync(path.join(tempDir, 'neuron.yaml'), VECTOR_ONLY_YAML);

    const memory = new NeuronMemory({ dbPath, projectRoot: tempDir, projectName: 'legacy-project', embedder: mockEmbedder });
    const db = memory.getDb();

    const cols = (db.pragma('table_info(memories)') as any[]).map((c) => c.name);
    expect(cols).toContain('ticket');
    expect(cols).toContain('confidence');

    // The pre-existing row survives untouched, with the new columns NULL.
    const preserved = db.prepare('SELECT content, importance, ticket, confidence FROM memories WHERE id = ?').get('mem-1') as any;
    expect(preserved.content).toBe('a preserved ADR');
    expect(preserved.importance).toBe(5);
    expect(preserved.ticket).toBeNull();
    expect(preserved.confidence).toBeNull();

    memory.close();
  });

  it('never drops a column when a field is removed from neuron.yaml', () => {
    const { root, dbPath } = makeProject(VECTOR_ONLY_YAML);
    const withField = new NeuronMemory({ dbPath, projectRoot: root, projectName: 'p', embedder: mockEmbedder });
    withField.close();

    // Re-declare the config without `ticket`/`confidence` at all.
    fs.writeFileSync(path.join(root, 'neuron.yaml'), `version: "1.0"\nstorage:\n  mode: vector-only\ncategories:\n  learning:\n    description: Agent conventions\n  decisions:\n    description: ADRs\n`);

    const withoutField = new NeuronMemory({ dbPath, projectRoot: root, projectName: 'p', embedder: mockEmbedder });
    const cols = (withoutField.getDb().pragma('table_info(memories)') as any[]).map((c) => c.name);
    // Column is orphaned, not dropped.
    expect(cols).toContain('ticket');
    expect(cols).toContain('confidence');
    withoutField.close();
  });

  it('persists a declared field to its own column and reads it back via query() in vector-only mode', async () => {
    const memory = open(VECTOR_ONLY_YAML);
    const [created] = await memory.transact([
      { op: 'upsert', category: 'decisions', content: 'Adopt ticket 44', fields: { ticket: 'NEU-44' } },
    ]);

    const raw = memory.getDb().prepare('SELECT ticket, confidence FROM memories WHERE id = ?').get(created.id) as any;
    expect(raw.ticket).toBe('NEU-44');
    expect(raw.confidence).toBe('medium'); // default filled by enforceFieldSchema

    const [entry] = await memory.query({ category: 'decisions' });
    expect(entry.fields).toEqual({ ticket: 'NEU-44', confidence: 'medium' });
    memory.close();
  });

  it('merges on update — an untouched column survives, a touched one changes', async () => {
    const memory = open(VECTOR_ONLY_YAML);
    const [created] = await memory.transact([
      { op: 'upsert', category: 'decisions', content: 'Adopt ticket 44', fields: { ticket: 'NEU-44', confidence: 'low' } },
    ]);

    await memory.transact([
      { op: 'update', category: 'decisions', id: created.id, fields: { confidence: 'high' } },
    ]);

    const [entry] = await memory.query({ category: 'decisions' });
    expect(entry.fields).toEqual({ ticket: 'NEU-44', confidence: 'high' });
    memory.close();
  });

  it('gives split mode\'s vector-storage categories the same column-backed persistence', async () => {
    const memory = open(SPLIT_YAML);
    const [created] = await memory.transact([
      { op: 'upsert', category: 'decisions', content: 'A vector-storage ADR', fields: { reviewedBy: 'alice' } },
    ]);

    const [entry] = await memory.query({ category: 'decisions' });
    expect(entry.id).toBe(created.id);
    expect(entry.fields).toEqual({ reviewedBy: 'alice' });
    memory.close();
  });
});
