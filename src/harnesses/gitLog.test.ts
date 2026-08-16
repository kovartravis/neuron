import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import { getHeadSha, listAllCommits, listCommitsSince, verifyCommitRef } from './gitLog.js';

describe('git-log parsing (src/harnesses/gitLog.ts, ticket 08 neuron-2.4.0)', () => {
  const tempRoot = path.join(process.cwd(), 'src/__tests__/temp-gitlog');
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

  describe('getHeadSha', () => {
    it('returns null for a directory that is not a git repo', () => {
      const bareDir = path.join(tempRoot, 'not-a-repo');
      fs.mkdirSync(bareDir, { recursive: true });
      // `GIT_CEILING_DIRECTORIES` stops the ambient walk-up the same way
      // `hook.test.ts` needs it to — this directory has no `.git` of its own.
      const priorCeiling = process.env.GIT_CEILING_DIRECTORIES;
      process.env.GIT_CEILING_DIRECTORIES = tempRoot;
      try {
        expect(getHeadSha(bareDir)).toBeNull();
      } finally {
        if (priorCeiling === undefined) delete process.env.GIT_CEILING_DIRECTORIES;
        else process.env.GIT_CEILING_DIRECTORIES = priorCeiling;
      }
    });

    it('returns null for a freshly-initialized repo with no commits yet', () => {
      expect(getHeadSha(repoDir)).toBeNull();
    });

    it('returns the real HEAD sha after a commit', () => {
      const sha = commit('first commit');
      expect(getHeadSha(repoDir)).toBe(sha);
    });
  });

  describe('listAllCommits', () => {
    it('returns an empty array for a repo with no commits', () => {
      expect(listAllCommits(repoDir)).toEqual([]);
    });

    it('parses subject, multi-line body, and hash for every commit, newest first', () => {
      const first = commit('feat: add widget', 'Implements the widget end to end.\nSecond body line.');
      const second = commit('fix: widget off-by-one');

      const commits = listAllCommits(repoDir);
      expect(commits.map(c => c.hash)).toEqual([second, first]);
      expect(commits[1]).toMatchObject({
        hash: first,
        subject: 'feat: add widget',
        body: 'Implements the widget end to end.\nSecond body line.',
      });
      expect(commits[0]).toMatchObject({ hash: second, subject: 'fix: widget off-by-one', body: '' });
      expect(commits[0].committedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it('does not corrupt parsing when a commit body itself contains characters that look like delimiters', () => {
      // Real commit messages routinely contain pipes, backticks and colons —
      // this is why parsing uses the ASCII record/unit separators rather
      // than a printable delimiter.
      commit('feat: `code` | with | pipes', 'body: with colons, pipes | and `backticks`');
      const [c] = listAllCommits(repoDir);
      expect(c.subject).toBe('feat: `code` | with | pipes');
      expect(c.body).toBe('body: with colons, pipes | and `backticks`');
    });
  });

  describe('listCommitsSince', () => {
    it('returns only commits after the given sha, not the sha itself', () => {
      const first = commit('first');
      const second = commit('second');
      const third = commit('third');

      const since = listCommitsSince(repoDir, first);
      expect(since.map(c => c.hash).sort()).toEqual([second, third].sort());
    });

    it('returns an empty array when sha is already HEAD', () => {
      const head = commit('only commit');
      expect(listCommitsSince(repoDir, head)).toEqual([]);
    });

    it('degrades to an empty array for a sha that does not exist (e.g. after a history rewrite)', () => {
      commit('a commit');
      expect(listCommitsSince(repoDir, '0000000000000000000000000000000000000000')).toEqual([]);
    });
  });

  describe('verifyCommitRef (ticket 5, neuron-2.4.2)', () => {
    it('accepts a full SHA that exists', () => {
      const sha = commit('first commit');
      expect(verifyCommitRef(repoDir, sha)).toEqual({ valid: true });
    });

    it('accepts an abbreviated SHA that exists', () => {
      const sha = commit('first commit');
      expect(verifyCommitRef(repoDir, sha.slice(0, 8))).toEqual({ valid: true });
    });

    it('rejects a well-formed but nonexistent hash as "unknown-commit"', () => {
      commit('a commit');
      expect(verifyCommitRef(repoDir, '0000000000000000000000000000000000000000')).toEqual({
        valid: false,
        reason: 'unknown-commit',
      });
    });

    it('rejects with "not-a-git-repo" for a directory that is not a git repo, distinct from an unknown commit', () => {
      const bareDir = path.join(tempRoot, 'not-a-repo-for-commitref');
      fs.mkdirSync(bareDir, { recursive: true });
      const priorCeiling = process.env.GIT_CEILING_DIRECTORIES;
      process.env.GIT_CEILING_DIRECTORIES = tempRoot;
      try {
        expect(verifyCommitRef(bareDir, '0000000000000000000000000000000000000000')).toEqual({
          valid: false,
          reason: 'not-a-git-repo',
        });
      } finally {
        if (priorCeiling === undefined) delete process.env.GIT_CEILING_DIRECTORIES;
        else process.env.GIT_CEILING_DIRECTORIES = priorCeiling;
      }
    });

    it('treats a freshly-initialized repo with no commits yet as "unknown-commit", not "not-a-git-repo"', () => {
      // `git rev-parse --is-inside-work-tree` is true the moment `git init`
      // runs, before any commit exists — so an empty repo is a real repo
      // with an unresolvable ref, distinct from no repo at all.
      expect(verifyCommitRef(repoDir, '0000000000000000000000000000000000000000')).toEqual({
        valid: false,
        reason: 'unknown-commit',
      });
    });
  });
});
