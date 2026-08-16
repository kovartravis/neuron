import { describe, it, expect, vi, afterEach } from 'vitest';
import { NeuronMemory, NEAR_DUP_RERANK_BAR } from '../index.js';
import { handleMemoryCommand } from './memory.js';

// Ticket 9 (neuron-2.4.2) — the write-time conflict soft-flag layered on
// Ticket 3/6's relatedness gate. Mock reranker + mock polarity classifier
// keep this deterministic: the reranker always clears NEAR_DUP_RERANK_BAR
// (so `findSupersessionCandidate` always finds a candidate to hand off),
// and the polarity classifier's return value is what each test actually
// varies. Real-model behavior (does the real NLI cross-encoder actually
// separate these classes) is covered by `docs/design/write-time-quality/
// nli-polarity-detection-ab-findings.md` and Pillar 14.

function vecAt(index: number, value = 1.0): Float32Array {
  const v = new Float32Array(384);
  v[index] = value;
  return v;
}

function makeMemory(contradictionProbability: number) {
  const embedder = {
    embed: async () => vecAt(0),
    embedQuery: async () => vecAt(0),
  };
  const reranker = { score: async () => NEAR_DUP_RERANK_BAR + 1 };
  const scoreContradiction = vi.fn(async () => contradictionProbability);
  const polarityClassifier = { scoreContradiction };
  const memory = new NeuronMemory({
    dbPath: ':memory:',
    projectRoot: '/test/project',
    storageMode: 'vector',
    projectName: 'test-project',
    embedder,
    reranker,
    polarityClassifier,
  });
  return { memory, scoreContradiction };
}

function captureExit() {
  return vi.spyOn(process, 'exit').mockImplementation(((code?: number) => {
    throw new Error(`process.exit(${code})`);
  }) as any);
}

describe('CLI: memory add write-time conflict soft-flag (Ticket 9, neuron-2.4.2)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('soft-flags instead of hard-blocking when NLI crosses the contradiction bar: write succeeds, pointer surfaced', async () => {
    const { memory, scoreContradiction } = makeMemory(0.95);
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await handleMemoryCommand(
      ['memory', 'add', 'Query results are limited to 10 items by default.', '--category', 'decisions'],
      memory,
      'test-project'
    );
    const firstId = JSON.parse(String(logSpy.mock.calls[0][0])).id;

    logSpy.mockClear();
    await handleMemoryCommand(
      ['memory', 'add', 'Query results are limited to 25 items by default.', '--category', 'decisions'],
      memory,
      'test-project'
    );

    expect(scoreContradiction).toHaveBeenCalledTimes(1);
    const [premise, hypothesis] = scoreContradiction.mock.calls[0];
    expect(premise).toBe('Query results are limited to 10 items by default.');
    expect(hypothesis).toBe('Query results are limited to 25 items by default.');

    const result = JSON.parse(String(logSpy.mock.calls[0][0]));
    expect(result.id).toBeTruthy();
    expect(result.possibleConflict).toMatchObject({ candidateId: firstId, contradictionProbability: 0.95 });

    const stderr = errSpy.mock.calls.map(c => String(c[0])).join('\n');
    expect(stderr).toContain('possible conflict');
    expect(stderr).toContain(firstId);

    // Both entries landed — the second write was never blocked.
    const all = await memory.query({ categories: ['decisions'], limit: 10 });
    expect(all).toHaveLength(2);
  });

  it('keeps hard-blocking (Ticket 6 behavior unchanged) when NLI does not cross the contradiction bar', async () => {
    const { memory } = makeMemory(0.2);
    vi.spyOn(console, 'log').mockImplementation(() => {});
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    captureExit();

    await handleMemoryCommand(
      ['memory', 'add', 'The default request timeout is 30 seconds.', '--category', 'learning'],
      memory,
      'test-project'
    );

    await expect(
      handleMemoryCommand(
        ['memory', 'add', 'By default, requests time out after 30 seconds.', '--category', 'learning'],
        memory,
        'test-project'
      )
    ).rejects.toThrow('process.exit(1)');

    const stderr = errSpy.mock.calls.map(c => String(c[0])).join('\n');
    expect(stderr).toContain('may supersede an existing entry');
    expect(stderr).not.toContain('possible conflict');

    const all = await memory.query({ categories: ['learning'], limit: 10 });
    expect(all).toHaveLength(1);
  });

  it('--not-a-reversal bypasses the gate entirely: NLI is never called', async () => {
    const { memory, scoreContradiction } = makeMemory(0.99);
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});

    await handleMemoryCommand(['memory', 'add', 'entry one', '--category', 'decisions'], memory, 'test-project');
    await handleMemoryCommand(
      ['memory', 'add', 'entry two', '--category', 'decisions', '--not-a-reversal'],
      memory,
      'test-project'
    );

    expect(scoreContradiction).not.toHaveBeenCalled();
  });

  it('a soft-flagged write proceeds even with --if-novel set (conflict, not supersession-candidate, is the outcome)', async () => {
    const { memory } = makeMemory(0.95);
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});

    await handleMemoryCommand(['memory', 'add', 'entry one', '--category', 'decisions'], memory, 'test-project');
    logSpy.mockClear();

    await handleMemoryCommand(
      ['memory', 'add', 'entry two', '--category', 'decisions', '--if-novel'],
      memory,
      'test-project'
    );

    const result = JSON.parse(String(logSpy.mock.calls[0][0]));
    expect(result.skipped).toBeUndefined();
    expect(result.possibleConflict).toBeDefined();

    const all = await memory.query({ categories: ['decisions'], limit: 10 });
    expect(all).toHaveLength(2);
  });

  it('--if-novel still skips (Ticket 19 behavior unchanged) when NLI does not cross the bar', async () => {
    const { memory } = makeMemory(0.2);
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});

    await handleMemoryCommand(['memory', 'add', 'entry one', '--category', 'decisions'], memory, 'test-project');
    logSpy.mockClear();

    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(((code?: number) => {
      throw new Error(`process.exit(${code})`);
    }) as any);

    await expect(
      handleMemoryCommand(
        ['memory', 'add', 'entry two', '--category', 'decisions', '--if-novel'],
        memory,
        'test-project'
      )
    ).rejects.toThrow('process.exit(0)');
    expect(exitSpy).toHaveBeenCalledWith(0);

    const result = JSON.parse(String(logSpy.mock.calls[0][0]));
    expect(result.skipped).toBe(true);
  });
});
