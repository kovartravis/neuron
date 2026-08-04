import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import path from 'node:path';
import fs from 'node:fs';
import { filterUnseen, markInjected, clearLedger } from './ledger.js';
import { hookCacheDir } from './cacheDir.js';
import { Memory } from '../models/index.js';

function entry(id: string): Memory {
  return { id, category: 'learning', kind: 'learning', content: id, tags: [], createdAt: '2026-01-01T00:00:00.000Z' };
}

describe('session ledger (src/harnesses/ledger.ts)', () => {
  const tempRoot = path.join(process.cwd(), 'src/__tests__/temp-ledger');
  const projectRoot = '/fake/project/ledger-test';

  beforeEach(() => {
    fs.rmSync(tempRoot, { recursive: true, force: true });
    fs.mkdirSync(tempRoot, { recursive: true });
    process.env.NEURON_HOOK_CACHE_DIR = tempRoot;
  });

  afterAll(() => {
    delete process.env.NEURON_HOOK_CACHE_DIR;
    fs.rmSync(tempRoot, { recursive: true, force: true });
  });

  it('returns every entry unseen when no ledger exists yet', () => {
    const result = filterUnseen(projectRoot, 'session-1', [entry('a'), entry('b')]);
    expect(result.map(e => e.id)).toEqual(['a', 'b']);
  });

  it('excludes entries already marked injected for this session', () => {
    markInjected(projectRoot, 'session-1', ['a']);
    const result = filterUnseen(projectRoot, 'session-1', [entry('a'), entry('b')]);
    expect(result.map(e => e.id)).toEqual(['b']);
  });

  it('keeps ledgers isolated per session id', () => {
    markInjected(projectRoot, 'session-1', ['a']);
    const result = filterUnseen(projectRoot, 'session-2', [entry('a'), entry('b')]);
    expect(result.map(e => e.id)).toEqual(['a', 'b']);
  });

  it('clearLedger resets a session so previously-injected entries reappear', () => {
    markInjected(projectRoot, 'session-1', ['a', 'b']);
    clearLedger(projectRoot, 'session-1');
    const result = filterUnseen(projectRoot, 'session-1', [entry('a'), entry('b')]);
    expect(result.map(e => e.id)).toEqual(['a', 'b']);
  });

  it('clearLedger on a never-created session is a safe no-op', () => {
    expect(() => clearLedger(projectRoot, 'never-existed')).not.toThrow();
  });

  it('treats a ledger older than the staleness window as empty (degrades toward repetition, not silence)', () => {
    markInjected(projectRoot, 'session-1', ['a']);
    const dir = hookCacheDir(projectRoot);
    const files = fs.readdirSync(dir).filter(f => f.startsWith('ledger-'));
    expect(files.length).toBe(1);
    const filePath = path.join(dir, files[0]);
    const old = (Date.now() - 25 * 60 * 60 * 1000) / 1000; // 25h ago, in seconds for utimesSync
    fs.utimesSync(filePath, old, old);

    const result = filterUnseen(projectRoot, 'session-1', [entry('a')]);
    expect(result.map(e => e.id)).toEqual(['a']);
  });

  it('merges repeated markInjected calls rather than overwriting', () => {
    markInjected(projectRoot, 'session-1', ['a']);
    markInjected(projectRoot, 'session-1', ['b']);
    const result = filterUnseen(projectRoot, 'session-1', [entry('a'), entry('b'), entry('c')]);
    expect(result.map(e => e.id)).toEqual(['c']);
  });
});
