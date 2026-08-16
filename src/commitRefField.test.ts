/**
 * `commitRef` declared-field type (ticket 5, neuron-2.4.2), graduated from
 * ticket 2's provenance-enforcement design. Covers write-time enforcement at
 * the `transact()` choke point (`enforceFieldSchema`, `src/index.ts`) against
 * a real git repository — valid full SHA, valid abbreviated SHA, an invalid
 * hash, and the not-a-git-repo case. `src/harnesses/gitLog.test.ts` covers
 * `verifyCommitRef` itself in isolation.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import { NeuronMemory } from './index.js';
import type { Embedder } from './components/embedder.js';

const tempRoot = path.join(process.cwd(), 'src/__tests__/temp-commitref-field');

const mockEmbedder: Embedder = {
  embed: async () => new Float32Array(64),
  embedQuery: async () => new Float32Array(64),
};

const GIT_ENV = {
  GIT_AUTHOR_NAME: 'Test', GIT_AUTHOR_EMAIL: 'test@example.com',
  GIT_COMMITTER_NAME: 'Test', GIT_COMMITTER_EMAIL: 'test@example.com',
};

const YAML = `version: "1.0"
storage:
  mode: md
categories:
  learning:
    description: Agent conventions
  git-notes:
    description: Commentary attached to an existing commit
    fields:
      commitRef:
        type: commitRef
        required: true
`;

let projectSeq = 0;

function makeGitProject(): { root: string; dbPath: string; commit(subject: string): string } {
  const root = path.join(tempRoot, `proj-${projectSeq++}`);
  fs.mkdirSync(root, { recursive: true });
  fs.writeFileSync(path.join(root, 'package.json'), '{}');
  fs.writeFileSync(path.join(root, 'neuron.yaml'), YAML);
  execFileSync('git', ['init', '-q'], { cwd: root, env: { ...process.env, ...GIT_ENV } });

  function commit(subject: string): string {
    fs.writeFileSync(path.join(root, 'file.txt'), `${Date.now()}-${Math.random()}`);
    execFileSync('git', ['add', '.'], { cwd: root, env: { ...process.env, ...GIT_ENV } });
    execFileSync('git', ['commit', '-m', subject, '-q'], { cwd: root, env: { ...process.env, ...GIT_ENV } });
    return execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
  }

  return { root, dbPath: path.join(root, 'store.sqlite'), commit };
}

function open(root: string, dbPath: string): NeuronMemory {
  return new NeuronMemory({ dbPath, projectRoot: root, projectName: 'commitref-field-test', embedder: mockEmbedder });
}

describe('commitRef declared-field enforcement (ticket 5, neuron-2.4.2)', () => {
  beforeAll(() => fs.mkdirSync(tempRoot, { recursive: true }));
  afterAll(() => fs.rmSync(tempRoot, { recursive: true, force: true }));

  it('accepts a value that is the full SHA of a real commit', async () => {
    const { root, dbPath, commit } = makeGitProject();
    const sha = commit('a real commit');
    const memory = open(root, dbPath);
    const [res] = await memory.transact([
      { op: 'upsert', category: 'git-notes', content: 'Why this landed', fields: { commitRef: sha } },
    ]);
    expect(res.status).toBe('created');
    memory.close();
  });

  it('accepts a value that is an abbreviated SHA of a real commit', async () => {
    const { root, dbPath, commit } = makeGitProject();
    const sha = commit('a real commit');
    const memory = open(root, dbPath);
    const [res] = await memory.transact([
      { op: 'upsert', category: 'git-notes', content: 'Why this landed', fields: { commitRef: sha.slice(0, 8) } },
    ]);
    expect(res.status).toBe('created');
    memory.close();
  });

  it('hard-refuses a well-formed but nonexistent hash', async () => {
    const { root, dbPath, commit } = makeGitProject();
    commit('a real commit');
    const memory = open(root, dbPath);
    await expect(
      memory.transact([
        {
          op: 'upsert',
          category: 'git-notes',
          content: 'Why this landed',
          fields: { commitRef: '0000000000000000000000000000000000000000' },
        },
      ])
    ).rejects.toThrow(/does not resolve to a commit/);
    memory.close();
  });

  it('does not create a partial entry when commitRef verification fails', async () => {
    const { root, dbPath, commit } = makeGitProject();
    commit('a real commit');
    const memory = open(root, dbPath);
    await expect(
      memory.transact([
        {
          op: 'upsert',
          category: 'git-notes',
          content: 'Should not be written',
          fields: { commitRef: '0000000000000000000000000000000000000000' },
        },
      ])
    ).rejects.toThrow();
    const entries = await memory.query({ category: 'git-notes' });
    expect(entries).toEqual([]);
    memory.close();
  });

  it('gives a clear, distinct error when projectRoot is not a git repository', async () => {
    const root = path.join(tempRoot, `not-a-repo-${projectSeq++}`);
    fs.mkdirSync(root, { recursive: true });
    fs.writeFileSync(path.join(root, 'package.json'), '{}');
    fs.writeFileSync(path.join(root, 'neuron.yaml'), YAML);
    const priorCeiling = process.env.GIT_CEILING_DIRECTORIES;
    process.env.GIT_CEILING_DIRECTORIES = tempRoot;
    try {
      const memory = open(root, path.join(root, 'store.sqlite'));
      await expect(
        memory.transact([
          {
            op: 'upsert',
            category: 'git-notes',
            content: 'Why this landed',
            fields: { commitRef: '0000000000000000000000000000000000000000' },
          },
        ])
      ).rejects.toThrow(/is not a git repository/);
      memory.close();
    } finally {
      if (priorCeiling === undefined) delete process.env.GIT_CEILING_DIRECTORIES;
      else process.env.GIT_CEILING_DIRECTORIES = priorCeiling;
    }
  });

  it('still enforces required-ness — commitRef missing entirely hard-errors like any other required field', async () => {
    const { root, dbPath, commit } = makeGitProject();
    commit('a real commit');
    const memory = open(root, dbPath);
    await expect(
      memory.transact([{ op: 'upsert', category: 'git-notes', content: 'No commitRef supplied' }])
    ).rejects.toThrow(/--commit-ref is required for category "git-notes"/);
    memory.close();
  });
});
