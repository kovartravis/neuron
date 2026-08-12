import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';
import { NeuronMemory } from '../index.js';
import { handleStatusCommand } from './status.js';

// Ticket 20 / neuron-2.4.0 — `neuron status --health`. Drives
// `handleStatusCommand` in-process (rather than spawning the built CLI) so
// the embedder can be content-dependent, the same reason
// `memory.supersession.test.ts` does — near-duplicate detection needs a real
// similarity signal, which the all-zero `NEURON_MOCK_EMBEDDER` subprocess
// tests can't provide.
//
// Running in-process also means `handleStatusCommand`'s sessionsObserved
// read hits the real `hookCacheDir(process.cwd())` unless overridden — this
// repo dogfoods real hook ledgers there, so without an isolated
// NEURON_HOOK_CACHE_DIR the count would be real, non-deterministic data
// instead of the fixture being asserted on (matches `status.test.ts`'s own
// subprocess-side isolation for the same reason).
let hookCacheDir: string;
let originalHookCacheDir: string | undefined;

beforeEach(() => {
  hookCacheDir = fs.mkdtempSync(path.join(os.tmpdir(), 'neuron-health-test-'));
  originalHookCacheDir = process.env.NEURON_HOOK_CACHE_DIR;
  process.env.NEURON_HOOK_CACHE_DIR = hookCacheDir;
  process.exitCode = 0;
});

afterEach(() => {
  if (originalHookCacheDir === undefined) delete process.env.NEURON_HOOK_CACHE_DIR;
  else process.env.NEURON_HOOK_CACHE_DIR = originalHookCacheDir;
  fs.rmSync(hookCacheDir, { recursive: true, force: true });
});

function vecAt(index: number, value = 1.0): Float32Array {
  const v = new Float32Array(384);
  v[index] = value;
  return v;
}

function makeMemory() {
  const embedder = {
    embed: async (text: string) => (text.includes('prune') ? vecAt(0) : vecAt(1)),
    embedQuery: async (text: string) => (text.includes('prune') ? vecAt(0) : vecAt(1)),
  };
  return new NeuronMemory({
    dbPath: ':memory:',
    projectRoot: '/test/project',
    storageMode: 'vector',
    projectName: 'test-project',
    embedder,
  });
}

describe('neuron status --health (ticket 20)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('reports zeros and no groups on an empty store', async () => {
    const memory = makeMemory();
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await handleStatusCommand(memory, ['status', '--health', '--json']);

    const health = JSON.parse(String(logSpy.mock.calls[0][0]));
    expect(health.duplicateGroups).toEqual([]);
    expect(health.importanceHistogram).toEqual({});
    expect(health.supersededCount).toBe(0);
    expect(health.sessionsObserved).toBe(0);
  });

  it('groups near-duplicate live entries and leaves an unrelated entry out', async () => {
    const memory = makeMemory();
    // Bypass the CLI-level write-time gate (ticket 17) via transact() directly
    // — the gate would otherwise refuse to let a real near-duplicate land in
    // the store, which is exactly the data this test needs to construct.
    await memory.transact([
      { op: 'upsert', category: 'decisions', content: 'the prune ceiling is a real hazard' },
      { op: 'upsert', category: 'decisions', content: 'prune ceiling collision needs a fix' },
      { op: 'upsert', category: 'learning', content: 'an unrelated entry about something else' },
    ]);

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    await handleStatusCommand(memory, ['status', '--health', '--json']);
    const health = JSON.parse(String(logSpy.mock.calls[0][0]));

    expect(health.duplicateGroups).toHaveLength(1);
    expect(health.duplicateGroups[0].entries).toHaveLength(2);
    expect(health.duplicateGroups[0].minSimilarity).toBeCloseTo(1.0, 5);
    const groupedContents = health.duplicateGroups[0].entries.map((e: any) => e.content);
    expect(groupedContents).toEqual(
      expect.arrayContaining([
        'the prune ceiling is a real hazard',
        'prune ceiling collision needs a fix',
      ])
    );
    expect(groupedContents).not.toContain('an unrelated entry about something else');
  });

  it('excludes a superseded entry from duplicate grouping but still counts it', async () => {
    const memory = makeMemory();
    const [first, second] = await memory.transact([
      { op: 'upsert', category: 'decisions', content: 'prune stale ruling' },
      { op: 'upsert', category: 'decisions', content: 'prune corrected ruling' },
    ]);
    await memory.transact([
      { op: 'update', category: 'decisions', id: first.id, supersededBy: second.id, supersededAt: new Date().toISOString() },
    ]);

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    await handleStatusCommand(memory, ['status', '--health', '--json']);
    const health = JSON.parse(String(logSpy.mock.calls[0][0]));

    expect(health.duplicateGroups).toEqual([]);
    expect(health.supersededCount).toBe(1);
  });

  it('builds an importance histogram across 1-5', async () => {
    const memory = makeMemory();
    await memory.transact([
      { op: 'upsert', category: 'learning', content: 'a', importance: 1 },
      { op: 'upsert', category: 'learning', content: 'b', importance: 3 },
      { op: 'upsert', category: 'learning', content: 'c', importance: 3 },
      { op: 'upsert', category: 'learning', content: 'd', importance: 5 },
    ]);

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    await handleStatusCommand(memory, ['status', '--health', '--json']);
    const health = JSON.parse(String(logSpy.mock.calls[0][0]));

    expect(health.importanceHistogram).toEqual({ 1: 1, 3: 2, 5: 1 });
  });

  it('prints a human-readable report by default, not JSON', async () => {
    const memory = makeMemory();
    await memory.transact([{ op: 'upsert', category: 'learning', content: 'an entry', importance: 4 }]);

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    await handleStatusCommand(memory, ['status', '--health']);

    const output = String(logSpy.mock.calls[0][0]);
    expect(() => JSON.parse(output)).toThrow();
    expect(output).toContain('Store health');
    expect(output).toContain('Importance histogram');
    expect(output).toContain('Superseded entries: 0');
    expect(output).toContain('Sessions observed');
  });

  it('rejects --check combined with --health or --repair', async () => {
    const memory = makeMemory();
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await handleStatusCommand(memory, ['status', '--health', '--check']);
    expect(errSpy.mock.calls.join('\n')).toContain('cannot be combined');

    errSpy.mockClear();
    await handleStatusCommand(memory, ['status', '--check', '--repair']);
    expect(errSpy.mock.calls.join('\n')).toContain('cannot be combined');
  });
});

describe('neuron status --health --repair (ticket 20 follow-up)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  const t1 = '2026-01-01T00:00:00.000Z';
  const t2 = '2026-01-01T00:00:01.000Z';
  const t3 = '2026-01-01T00:00:02.000Z';

  it('merges an exact-duplicate group entirely, leaving nothing unresolved', async () => {
    const memory = makeMemory();
    const [older, newer] = await memory.transact([
      { op: 'upsert', category: 'decisions', content: 'prune exact duplicate', createdAt: t1 },
      { op: 'upsert', category: 'decisions', content: 'prune exact duplicate', createdAt: t2 },
    ]);

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    await handleStatusCommand(memory, ['status', '--health', '--repair', '--json']);
    const report = JSON.parse(String(logSpy.mock.calls[0][0]));

    expect(report.merged).toEqual([
      { keptId: newer.id, category: 'decisions', content: 'prune exact duplicate', supersededIds: [older.id] },
    ]);
    expect(report.unresolved).toEqual([]);

    const olderRow = await memory.findById(older.id);
    expect(olderRow?.supersededBy).toBe(newer.id);
    const newerRow = await memory.findById(newer.id);
    expect(newerRow?.supersededBy).toBeFalsy();
  });

  it('merges the exact-duplicate subset of a cluster and leaves the differently-worded member unresolved', async () => {
    const memory = makeMemory();
    const [older, newer, distinct] = await memory.transact([
      { op: 'upsert', category: 'decisions', content: 'prune ceiling issue', createdAt: t1 },
      { op: 'upsert', category: 'decisions', content: 'prune ceiling issue', createdAt: t2 },
      { op: 'upsert', category: 'decisions', content: 'prune ceiling different wording', createdAt: t3 },
    ]);

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    await handleStatusCommand(memory, ['status', '--health', '--repair', '--json']);
    const report = JSON.parse(String(logSpy.mock.calls[0][0]));

    expect(report.merged).toEqual([
      { keptId: newer.id, category: 'decisions', content: 'prune ceiling issue', supersededIds: [older.id] },
    ]);
    expect(report.unresolved).toHaveLength(1);
    const unresolvedIds = report.unresolved[0].entries.map((e: any) => e.id);
    expect(unresolvedIds).toEqual(expect.arrayContaining([newer.id, distinct.id]));
    expect(unresolvedIds).not.toContain(older.id);

    const olderRow = await memory.findById(older.id);
    expect(olderRow?.supersededBy).toBe(newer.id);
    const distinctRow = await memory.findById(distinct.id);
    expect(distinctRow?.supersededBy).toBeFalsy();
  });

  it('exits 1 when anything is left unresolved, 0 when fully merged', async () => {
    const memory = makeMemory();
    await memory.transact([
      { op: 'upsert', category: 'decisions', content: 'prune ceiling issue', createdAt: t1 },
      { op: 'upsert', category: 'decisions', content: 'prune ceiling different wording', createdAt: t2 },
    ]);
    vi.spyOn(console, 'log').mockImplementation(() => {});

    await handleStatusCommand(memory, ['status', '--health', '--repair', '--json']);
    expect(process.exitCode).toBe(1);
    process.exitCode = 0;

    const clean = makeMemory();
    await clean.transact([{ op: 'upsert', category: 'decisions', content: 'a lone entry' }]);
    await handleStatusCommand(clean, ['status', '--health', '--repair', '--json']);
    expect(process.exitCode).not.toBe(1);
  });

  it('prints a human-readable repair report by default, not JSON', async () => {
    const memory = makeMemory();
    await memory.transact([
      { op: 'upsert', category: 'decisions', content: 'prune exact duplicate', createdAt: t1 },
      { op: 'upsert', category: 'decisions', content: 'prune exact duplicate', createdAt: t2 },
    ]);

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    await handleStatusCommand(memory, ['status', '--health', '--repair']);

    const output = String(logSpy.mock.calls[0][0]);
    expect(() => JSON.parse(output)).toThrow();
    expect(output).toContain('Store health repair');
    expect(output).toContain('Merged');
    expect(output).toContain('Left unresolved');
  });
});
