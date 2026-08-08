import { describe, it, expect, vi, afterEach } from 'vitest';
import { NeuronMemory } from '../index.js';
import { handleMemoryCommand } from './memory.js';

// Ticket 17 / ADR 0015 — the CLI-level write-time gate on `neuron memory
// add`, its `--supersedes`/`--not-a-reversal` resolution, and the
// `--include-superseded` read-path flag. Drives `handleMemoryCommand`
// in-process (rather than spawning the built CLI) so the embedder can be
// content-dependent — the real supersession gate needs a real similarity
// signal, which the subprocess tests' all-zero `NEURON_MOCK_EMBEDDER`
// cannot provide.

function vecAt(index: number, value = 1.0): Float32Array {
  const v = new Float32Array(384);
  v[index] = value;
  return v;
}

function makeMemory() {
  // Two clusters: anything mentioning "prune" embeds near index 0 (so a
  // second prune-flavored write looks like a near-duplicate of the first),
  // everything else near index 1.
  const embedder = {
    embed: async (text: string) => (text.includes('prune') ? vecAt(0) : vecAt(1)),
    embedQuery: async (text: string) => (text.includes('prune') ? vecAt(0) : vecAt(1)),
  };
  return new NeuronMemory({
    dbPath: ':memory:',
    projectRoot: '/test/project',
    storageMode: 'vector-only',
    projectName: 'test-project',
    embedder,
  });
}

function captureExit() {
  return vi.spyOn(process, 'exit').mockImplementation(((code?: number) => {
    throw new Error(`process.exit(${code})`);
  }) as any);
}

describe('CLI: memory add write-time supersession gate (ticket 17 / ADR 0015)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('hard-blocks a near-duplicate write and names the candidate id', async () => {
    const memory = makeMemory();
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const exitSpy = captureExit();

    await handleMemoryCommand(
      ['memory', 'add', 'the prune ceiling is a real hazard', '--category', 'decisions'],
      memory,
      'test-project'
    );
    const firstId = JSON.parse(String(logSpy.mock.calls[0][0])).id;

    await expect(
      handleMemoryCommand(
        ['memory', 'add', 'the prune ceiling collision is a hazard needing a fix', '--category', 'decisions'],
        memory,
        'test-project'
      )
    ).rejects.toThrow('process.exit(1)');

    const stderr = errSpy.mock.calls.map(c => String(c[0])).join('\n');
    expect(stderr).toContain(firstId);
    expect(stderr).toContain('--supersedes');
    expect(stderr).toContain('--not-a-reversal');

    // The blocked write must not have landed.
    const all = await memory.query({ categories: ['decisions'], limit: 10 });
    expect(all).toHaveLength(1);
  });

  it('--supersedes resolves the gate: writes the new entry and marks the old one superseded', async () => {
    const memory = makeMemory();
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});

    await handleMemoryCommand(
      ['memory', 'add', 'prune defaults collide, treated as a bug', '--category', 'decisions'],
      memory,
      'test-project'
    );
    const oldId = JSON.parse(String(logSpy.mock.calls[0][0])).id;

    await handleMemoryCommand(
      [
        'memory', 'add', 'prune defaults collide, ruled deliberate not a bug',
        '--category', 'decisions', '--supersedes', oldId,
      ],
      memory,
      'test-project'
    );
    const newId = JSON.parse(String(logSpy.mock.calls[1][0])).id;
    expect(newId).not.toBe(oldId);

    const old = await memory.findById(oldId);
    expect(old?.supersededBy).toBe(newId);
    expect(old?.supersededAt).toBeTruthy();

    const defaultResults = await memory.query({ categories: ['decisions'], limit: 10 });
    expect(defaultResults.find(m => m.id === oldId)).toBeUndefined();
    expect(defaultResults.find(m => m.id === newId)).toBeDefined();
  });

  it('rejects an unknown --supersedes target before writing anything', async () => {
    const memory = makeMemory();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    captureExit();

    await expect(
      handleMemoryCommand(
        ['memory', 'add', 'prune ruling reversed', '--category', 'decisions', '--supersedes', 'does-not-exist'],
        memory,
        'test-project'
      )
    ).rejects.toThrow('process.exit(1)');

    expect(errSpy.mock.calls.map(c => String(c[0])).join('\n')).toContain('does-not-exist');
    const all = await memory.query({ categories: ['decisions'], limit: 10 });
    expect(all).toHaveLength(0);
  });

  it('--not-a-reversal skips the gate without marking anything superseded', async () => {
    const memory = makeMemory();
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});

    await handleMemoryCommand(
      ['memory', 'add', 'prune entry one', '--category', 'decisions'],
      memory,
      'test-project'
    );
    await handleMemoryCommand(
      ['memory', 'add', 'prune entry two, unrelated topic despite the shared word', '--category', 'decisions', '--not-a-reversal'],
      memory,
      'test-project'
    );

    const all = await memory.query({ categories: ['decisions'], limit: 10, includeSuperseded: true });
    expect(all).toHaveLength(2);
    expect(all.every(m => !m.supersededBy)).toBe(true);
  });

  it('--supersedes and --not-a-reversal together are rejected by parseFlags', async () => {
    const memory = makeMemory();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    captureExit();

    await expect(
      handleMemoryCommand(
        ['memory', 'add', 'x', '--category', 'decisions', '--supersedes', 'abc', '--not-a-reversal'],
        memory,
        'test-project'
      )
    ).rejects.toThrow('process.exit(1)');
  });
});

describe('CLI: memory query/list --include-superseded (ticket 17 / ADR 0015)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('query excludes a superseded entry by default and includes it with --include-superseded', async () => {
    const memory = makeMemory();
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});

    await handleMemoryCommand(['memory', 'add', 'prune stale ruling', '--category', 'decisions'], memory, 'test-project');
    const oldId = JSON.parse(String(logSpy.mock.calls[0][0])).id;
    await handleMemoryCommand(
      ['memory', 'add', 'prune corrected ruling', '--category', 'decisions', '--supersedes', oldId],
      memory,
      'test-project'
    );

    logSpy.mockClear();
    await handleMemoryCommand(['memory', 'query', 'prune', '--categories', 'decisions'], memory, 'test-project');
    const defaultQuery = JSON.parse(String(logSpy.mock.calls[0][0]));
    expect(defaultQuery.results.find((r: any) => r.id === oldId)).toBeUndefined();

    logSpy.mockClear();
    await handleMemoryCommand(
      ['memory', 'query', 'prune', '--categories', 'decisions', '--include-superseded'],
      memory,
      'test-project'
    );
    const includedQuery = JSON.parse(String(logSpy.mock.calls[0][0]));
    expect(includedQuery.results.find((r: any) => r.id === oldId)).toBeDefined();
  });

  it('list excludes a superseded entry by default and includes it with --include-superseded', async () => {
    const memory = makeMemory();
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});

    await handleMemoryCommand(['memory', 'add', 'prune stale listing', '--category', 'decisions'], memory, 'test-project');
    const oldId = JSON.parse(String(logSpy.mock.calls[0][0])).id;
    await handleMemoryCommand(
      ['memory', 'add', 'prune corrected listing', '--category', 'decisions', '--supersedes', oldId],
      memory,
      'test-project'
    );

    logSpy.mockClear();
    await handleMemoryCommand(['memory', 'list', '--categories', 'decisions'], memory, 'test-project');
    const defaultList = JSON.parse(String(logSpy.mock.calls[0][0]));
    expect(defaultList.find((r: any) => r.id === oldId)).toBeUndefined();

    logSpy.mockClear();
    await handleMemoryCommand(['memory', 'list', '--categories', 'decisions', '--include-superseded'], memory, 'test-project');
    const includedList = JSON.parse(String(logSpy.mock.calls[0][0]));
    expect(includedList.find((r: any) => r.id === oldId)).toBeDefined();
  });
});
