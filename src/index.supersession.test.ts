import { describe, it, expect } from 'vitest';
import { NeuronMemory } from './index.js';

// Ticket 17 / ADR 0015 — Memory Supersession. Unit-level coverage of the
// storage-layer primitives (`findSupersessionCandidate`, `findById`, the
// `superseded_by`/`superseded_at` write path, and the default read-path
// exclusion). CLI-level gate/`--supersedes` behaviour is covered separately
// in `commands/memory.supersession.test.ts`.

function vecAt(index: number, value = 1.0): Float32Array {
  const v = new Float32Array(384);
  v[index] = value;
  return v;
}

describe('Memory supersession (ticket 17 / ADR 0015)', () => {
  it('findSupersessionCandidate returns null when nothing clears the threshold', async () => {
    const embedder = {
      embed: async (text: string) => (text.includes('alpha') ? vecAt(0) : vecAt(1)),
      embedQuery: async () => vecAt(0),
    };
    const memory = new NeuronMemory({
      dbPath: ':memory:',
      projectRoot: '/test/project',
      storageMode: 'vector-only',
      projectName: 'test-project',
      embedder,
    });

    await memory.addLearning('alpha entry', [], { importance: 3 });
    const candidate = await memory.findSupersessionCandidate('completely unrelated content');
    expect(candidate).toBeNull();
  });

  it('findSupersessionCandidate shortlists the closest existing entry above the threshold, across categories', async () => {
    const nearDup = vecAt(0, 1.0);
    const almostSame = vecAt(0, 0.999); // cosine ~1.0 against nearDup after normalization below
    const unrelated = vecAt(1, 1.0);

    const embedder = {
      embed: async (text: string) => {
        if (text === 'original decision') return nearDup;
        if (text === 'a near-identical reversal') return almostSame;
        return unrelated;
      },
      embedQuery: async () => nearDup,
    };
    const memory = new NeuronMemory({
      dbPath: ':memory:',
      projectRoot: '/test/project',
      storageMode: 'vector-only',
      projectName: 'test-project',
      embedder,
    });

    const created = await memory.transact([
      { op: 'upsert', category: 'decisions', content: 'original decision' },
    ]);
    await memory.transact([{ op: 'upsert', category: 'history', content: 'unrelated log' }]);

    const candidate = await memory.findSupersessionCandidate('a near-identical reversal');
    expect(candidate).not.toBeNull();
    expect(candidate!.id).toBe(created[0].id);
    expect(candidate!.category).toBe('decisions');
    expect(candidate!.similarity).toBeGreaterThanOrEqual(0.97);
  });

  it('never shortlists a row that is already superseded', async () => {
    const dupVec = vecAt(0, 1.0);
    const embedder = { embed: async () => dupVec, embedQuery: async () => dupVec };
    const memory = new NeuronMemory({
      dbPath: ':memory:',
      projectRoot: '/test/project',
      storageMode: 'vector-only',
      projectName: 'test-project',
      embedder,
    });

    const created = await memory.transact([{ op: 'upsert', category: 'decisions', content: 'old entry' }]);
    await memory.transact([
      { op: 'update', category: 'decisions', id: created[0].id, supersededBy: 'some-new-id', supersededAt: new Date().toISOString() },
    ]);

    const candidate = await memory.findSupersessionCandidate('a near duplicate of the old entry');
    expect(candidate).toBeNull();
  });

  it('marking a row superseded round-trips through findById and transact', async () => {
    const memory = NeuronMemory.inMemory('supersession-findbyid');

    const created = await memory.transact([{ op: 'upsert', category: 'decisions', content: 'entry to be reversed' }]);
    const id = created[0].id;

    let fetched = await memory.findById(id);
    expect(fetched?.supersededBy).toBeNull();
    expect(fetched?.supersededAt).toBeNull();

    const now = new Date().toISOString();
    await memory.transact([
      { op: 'update', category: 'decisions', id, supersededBy: 'newer-entry-id', supersededAt: now },
    ]);

    fetched = await memory.findById(id);
    expect(fetched?.supersededBy).toBe('newer-entry-id');
    expect(fetched?.supersededAt).toBe(now);
  });

  it('findById returns null for an unknown id', async () => {
    const memory = NeuronMemory.inMemory('supersession-findbyid-missing');
    expect(await memory.findById('does-not-exist')).toBeNull();
  });

  it('query/queryVector hard-exclude superseded rows by default, and include them with includeSuperseded', async () => {
    const memory = NeuronMemory.inMemory('supersession-read-path');

    const created = await memory.transact([{ op: 'upsert', category: 'decisions', content: 'stale ruling' }]);
    const id = created[0].id;
    await memory.transact([
      { op: 'update', category: 'decisions', id, supersededBy: 'newer-id', supersededAt: new Date().toISOString() },
    ]);
    await memory.transact([{ op: 'upsert', category: 'decisions', content: 'live entry' }]);

    const defaultList = await memory.query({ categories: ['decisions'], limit: 10 });
    expect(defaultList.find(m => m.id === id)).toBeUndefined();
    expect(defaultList.find(m => m.content === 'live entry')).toBeDefined();

    const withSuperseded = await memory.query({ categories: ['decisions'], limit: 10, includeSuperseded: true });
    const supersededRow = withSuperseded.find(m => m.id === id);
    expect(supersededRow).toBeDefined();
    expect(supersededRow!.supersededBy).toBe('newer-id');

    // Text-search branch of queryVector applies the same exclusion.
    const textDefault = await memory.queryVector({ text: 'stale ruling', categories: ['decisions'] });
    expect(textDefault.find(m => m.id === id)).toBeUndefined();

    const textIncluded = await memory.queryVector({ text: 'stale ruling', categories: ['decisions'], includeSuperseded: true });
    expect(textIncluded.find(m => m.id === id)).toBeDefined();
  });

  it('is orthogonal to importance/pruning: marking supersession never touches importance', async () => {
    const memory = NeuronMemory.inMemory('supersession-importance-orthogonal');
    const created = await memory.transact([
      { op: 'upsert', category: 'decisions', content: 'important stale entry', importance: 5 },
    ]);
    const id = created[0].id;

    await memory.transact([
      { op: 'update', category: 'decisions', id, supersededBy: 'newer-id', supersededAt: new Date().toISOString() },
    ]);

    const fetched = await memory.findById(id);
    expect(fetched?.importance).toBe(5);
  });
});
