import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import { NeuronMemory } from './index.js';

// Ticket 08 (neuron-2.4.0), ruled by ticket 39 (neuron-2.3.0): the git-log
// index's storage-layer primitives — check-HEAD-on-read refresh (backfill
// then incremental) and the ADR 0012-style gated semantic search. Shells out
// to a real, disposable git repo per test rather than mocking `git`, since
// the parsing/refresh contract (`src/harnesses/gitLog.ts`) is exactly what's
// under test here alongside the SQLite side.

/** Bag-of-hashed-words, normalized — dot product tracks shared-word overlap, close enough to real embedding behavior for ranking assertions without a model. */
function embedText(text: string): Float32Array {
  const v = new Float32Array(384);
  const words = text.toLowerCase().match(/[a-z0-9]+/g) ?? [];
  for (const w of words) {
    let h = 0;
    for (let i = 0; i < w.length; i++) h = (h * 31 + w.charCodeAt(i)) >>> 0;
    v[h % 384] += 1;
  }
  let norm = 0;
  for (let i = 0; i < v.length; i++) norm += v[i] * v[i];
  norm = Math.sqrt(norm) || 1;
  for (let i = 0; i < v.length; i++) v[i] /= norm;
  return v;
}

describe('NeuronMemory git-log index (src/index.ts, ticket 08 neuron-2.4.0)', () => {
  const tempRoot = path.join(process.cwd(), 'src/__tests__/temp-index-gitlog');
  let repoDir: string;

  function git(args: string[]): void {
    execFileSync('git', args, {
      cwd: repoDir,
      env: { ...process.env, GIT_AUTHOR_NAME: 'Test', GIT_AUTHOR_EMAIL: 'test@example.com', GIT_COMMITTER_NAME: 'Test', GIT_COMMITTER_EMAIL: 'test@example.com' },
    });
  }

  function commit(subject: string, body = ''): string {
    fs.writeFileSync(path.join(repoDir, 'file.txt'), `${Date.now()}-${Math.random()}`);
    git(['add', '.']);
    git(['commit', '-m', body ? `${subject}\n\n${body}` : subject]);
    return execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repoDir, encoding: 'utf8' }).trim();
  }

  beforeEach(() => {
    fs.rmSync(tempRoot, { recursive: true, force: true });
    repoDir = path.join(tempRoot, `repo-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    fs.mkdirSync(repoDir, { recursive: true });
    git(['init', '-q']);
  });

  afterAll(() => {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  });

  function openMemory(embedCalls?: { count: number }): NeuronMemory {
    const embedder = {
      embed: async (text: string) => {
        if (embedCalls) embedCalls.count++;
        return embedText(text);
      },
      embedQuery: async (text: string) => embedText(text),
    };
    return new NeuronMemory({ dbPath: ':memory:', projectRoot: repoDir, projectName: 'test', storageMode: 'vector', embedder });
  }

  describe('refreshGitLogIndex', () => {
    it('no-ops on a repo with no commits yet', async () => {
      const memory = openMemory();
      await expect(memory.refreshGitLogIndex()).resolves.toBeUndefined();
      expect(await memory.searchGitLog('anything', 6)).toEqual([]);
    });

    it('backfills every commit on the first call', async () => {
      commit('feat: add widget', 'Implements the widget end to end.');
      commit('fix: widget off-by-one');
      const memory = openMemory();

      await memory.refreshGitLogIndex();
      const rows = memory.getDb().prepare('SELECT hash, subject FROM git_log_index').all() as any[];
      expect(rows).toHaveLength(2);
      expect(rows.map(r => r.subject).sort()).toEqual(['feat: add widget', 'fix: widget off-by-one'].sort());
    });

    it('embeds nothing on a second call when HEAD has not moved', async () => {
      commit('feat: add widget');
      const calls = { count: 0 };
      const memory = openMemory(calls);

      await memory.refreshGitLogIndex();
      const afterFirst = calls.count;
      expect(afterFirst).toBeGreaterThan(0);

      await memory.refreshGitLogIndex();
      expect(calls.count).toBe(afterFirst);
    });

    it('embeds only the new commit on an incremental refresh', async () => {
      commit('feat: add widget');
      const calls = { count: 0 };
      const memory = openMemory(calls);
      await memory.refreshGitLogIndex();
      const afterFirst = calls.count;

      commit('fix: widget off-by-one');
      await memory.refreshGitLogIndex();
      expect(calls.count).toBe(afterFirst + 1);

      const rows = memory.getDb().prepare('SELECT hash FROM git_log_index').all() as any[];
      expect(rows).toHaveLength(2);
    });
  });

  describe('searchGitLog', () => {
    it('returns nothing when the query has no lexical topicality in the store at all (ADR 0012-style gate)', async () => {
      commit('feat: add widget subsystem', 'widget rendering and layout logic.');
      const memory = openMemory();
      await memory.refreshGitLogIndex();

      const hits = await memory.searchGitLog('completely unrelated kubernetes deployment topic', 6);
      expect(hits).toEqual([]);
    });

    it('returns a commit whose subject/body lexically matches the query', async () => {
      commit('feat: add widget subsystem', 'widget rendering and layout logic.');
      commit('fix: unrelated gadget bug');
      const memory = openMemory();
      await memory.refreshGitLogIndex();

      const hits = await memory.searchGitLog('widget subsystem', 6);
      expect(hits).toHaveLength(1);
      expect(hits[0].subject).toBe('feat: add widget subsystem');
    });

    it('ranks gated hits by embedding similarity, most similar first', async () => {
      // Both commits share the word "widget" so both clear the lexical gate;
      // the deterministic per-subject embedding decides the order.
      commit('feat: widget alpha implementation');
      commit('feat: widget beta implementation');
      const memory = openMemory();
      await memory.refreshGitLogIndex();

      const hits = await memory.searchGitLog('widget alpha implementation', 6);
      expect(hits.length).toBeGreaterThanOrEqual(1);
      expect(hits[0].subject).toBe('feat: widget alpha implementation');
    });

    it('bounds results to the requested limit', async () => {
      for (let i = 0; i < 10; i++) commit(`feat: widget variant ${i}`);
      const memory = openMemory();
      await memory.refreshGitLogIndex();

      const hits = await memory.searchGitLog('widget variant', 3);
      expect(hits.length).toBeLessThanOrEqual(3);
    });
  });
});
