import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import path from 'node:path';
import fs from 'node:fs';
import {
  filterUnseen,
  loadEpochState,
  remainingEpochBudget,
  recordSessionStartInjection,
  recordPrePromptTurn,
  rollEpoch,
  summarizeRecallCost,
  buildZeroSessionsWarning,
  hasPreStopNudgeFired,
  recordPreStopNudgeFired,
} from './ledger.js';
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

  describe('dedupe (filterUnseen / recordPrePromptTurn)', () => {
    it('returns every entry unseen when no ledger exists yet', () => {
      const result = filterUnseen(projectRoot, 'session-1', [entry('a'), entry('b')]);
      expect(result.map(e => e.id)).toEqual(['a', 'b']);
    });

    it('excludes entries already recorded as injected for this epoch', () => {
      recordPrePromptTurn(projectRoot, 'session-1', ['a'], 10);
      const result = filterUnseen(projectRoot, 'session-1', [entry('a'), entry('b')]);
      expect(result.map(e => e.id)).toEqual(['b']);
    });

    it('keeps ledgers isolated per session id', () => {
      recordPrePromptTurn(projectRoot, 'session-1', ['a'], 10);
      const result = filterUnseen(projectRoot, 'session-2', [entry('a'), entry('b')]);
      expect(result.map(e => e.id)).toEqual(['a', 'b']);
    });

    it('merges repeated recordPrePromptTurn calls rather than overwriting', () => {
      recordPrePromptTurn(projectRoot, 'session-1', ['a'], 5);
      recordPrePromptTurn(projectRoot, 'session-1', ['b'], 5);
      const result = filterUnseen(projectRoot, 'session-1', [entry('a'), entry('b'), entry('c')]);
      expect(result.map(e => e.id)).toEqual(['c']);
    });

    it('treats a ledger older than the staleness window as empty (degrades toward repetition, not silence)', () => {
      recordPrePromptTurn(projectRoot, 'session-1', ['a'], 5);
      const dir = hookCacheDir(projectRoot);
      const files = fs.readdirSync(dir).filter(f => f.startsWith('ledger-'));
      expect(files.length).toBe(1);
      const filePath = path.join(dir, files[0]);
      const old = (Date.now() - 25 * 60 * 60 * 1000) / 1000; // 25h ago, in seconds for utimesSync
      fs.utimesSync(filePath, old, old);

      const result = filterUnseen(projectRoot, 'session-1', [entry('a')]);
      expect(result.map(e => e.id)).toEqual(['a']);
    });
  });

  describe('per-epoch budget (remainingEpochBudget)', () => {
    it('reports the full budget for a session with no prior activity', () => {
      expect(remainingEpochBudget(projectRoot, 'session-1', 1000)).toBe(1000);
    });

    it('decrements as pre-prompt turns and session-start injections spend chars', () => {
      recordSessionStartInjection(projectRoot, 'session-1', ['card'], 300);
      recordPrePromptTurn(projectRoot, 'session-1', ['a'], 200);
      expect(remainingEpochBudget(projectRoot, 'session-1', 1000)).toBe(500);
    });

    it('floors at zero rather than going negative when spend exceeds the budget', () => {
      recordPrePromptTurn(projectRoot, 'session-1', ['a'], 900);
      recordPrePromptTurn(projectRoot, 'session-1', ['b'], 900);
      expect(remainingEpochBudget(projectRoot, 'session-1', 1000)).toBe(0);
    });

    it('is scoped per session, matching the dedupe ledger', () => {
      recordPrePromptTurn(projectRoot, 'session-1', ['a'], 900);
      expect(remainingEpochBudget(projectRoot, 'session-2', 1000)).toBe(1000);
    });
  });

  describe('rollEpoch', () => {
    it('resets the dedupe set so previously-injected entries reappear', () => {
      recordPrePromptTurn(projectRoot, 'session-1', ['a', 'b'], 20);
      rollEpoch(projectRoot, 'session-1');
      const result = filterUnseen(projectRoot, 'session-1', [entry('a'), entry('b')]);
      expect(result.map(e => e.id)).toEqual(['a', 'b']);
    });

    it('resets the char budget for the new epoch', () => {
      recordPrePromptTurn(projectRoot, 'session-1', ['a'], 900);
      rollEpoch(projectRoot, 'session-1');
      expect(remainingEpochBudget(projectRoot, 'session-1', 1000)).toBe(1000);
    });

    it('archives the finished epoch into history rather than discarding its cost', () => {
      recordPrePromptTurn(projectRoot, 'session-1', ['a'], 400);
      recordPrePromptTurn(projectRoot, 'session-1', ['b'], 300);
      rollEpoch(projectRoot, 'session-1');
      const state = loadEpochState(projectRoot, 'session-1');
      expect(state.epoch).toBe(1);
      expect(state.charsSpent).toBe(0);
      expect(state.turns).toBe(0);

      const summary = summarizeRecallCost(projectRoot, 1000);
      expect(summary.epochsObserved).toBe(1);
      expect(summary.maxCharsPerEpoch).toBe(700);
    });

    it('increments the epoch number on every roll', () => {
      rollEpoch(projectRoot, 'session-1');
      rollEpoch(projectRoot, 'session-1');
      const state = loadEpochState(projectRoot, 'session-1');
      expect(state.epoch).toBe(2);
    });

    it('is a safe no-op on a never-created session', () => {
      expect(() => rollEpoch(projectRoot, 'never-existed')).not.toThrow();
    });
  });

  describe('summarizeRecallCost', () => {
    it('reports zero observations for a project with no ledgers', () => {
      const summary = summarizeRecallCost(projectRoot, 18000);
      expect(summary.sessionsObserved).toBe(0);
      expect(summary.epochsObserved).toBe(0);
      expect(summary.medianCharsPerEpoch).toBe(0);
      expect(summary.maxCharsPerEpoch).toBe(0);
    });

    it('includes each session\'s still-open epoch alongside its archived history', () => {
      // session-1: one archived epoch (500 chars) plus an open one (200 chars)
      recordPrePromptTurn(projectRoot, 'session-1', ['a'], 500);
      rollEpoch(projectRoot, 'session-1');
      recordPrePromptTurn(projectRoot, 'session-1', ['b'], 200);

      // session-2: one open epoch only (100 chars)
      recordPrePromptTurn(projectRoot, 'session-2', ['c'], 100);

      const summary = summarizeRecallCost(projectRoot, 1000);
      expect(summary.sessionsObserved).toBe(2);
      expect(summary.epochsObserved).toBe(3);
      expect(summary.maxCharsPerEpoch).toBe(500);
    });

    it('computes mean chars-per-turn only over epochs that had at least one turn', () => {
      recordSessionStartInjection(projectRoot, 'session-1', ['card'], 1000); // not a turn
      recordPrePromptTurn(projectRoot, 'session-1', ['a'], 200); // 1 turn, 200 chars this call
      recordPrePromptTurn(projectRoot, 'session-1', [], 0); // silent turn, still counts
      const summary = summarizeRecallCost(projectRoot, 5000);
      // total epoch chars = 1000 + 200 + 0 = 1200, over 2 turns
      expect(summary.meanCharsPerTurn).toBe(Math.round(1200 / 2));
    });

    it('publishes the epoch budget in both chars and the conservative 3:1 token reading', () => {
      const summary = summarizeRecallCost(projectRoot, 18000);
      expect(summary.epochCharBudget).toBe(18000);
      expect(summary.charsPerTokenRatio).toBe(3);
      expect(summary.epochTokenBudgetApprox).toBe(6000);
    });

    it('does not throw when the hook cache directory does not exist yet', () => {
      const freshRoot = '/fake/project/never-touched';
      expect(() => summarizeRecallCost(freshRoot, 18000)).not.toThrow();
    });
  });

  // Ticket 21: the write-only-store failure mode.
  describe('buildZeroSessionsWarning', () => {
    it('warns when sessionsObserved is literally 0 and the store has entries', () => {
      expect(buildZeroSessionsWarning(0, 42)).toContain('recall has never fired');
    });

    it('does not warn once at least one session has been observed', () => {
      expect(buildZeroSessionsWarning(1, 42)).toBeNull();
    });

    it('does not warn against a genuinely empty store, even at 0 sessions observed', () => {
      expect(buildZeroSessionsWarning(0, 0)).toBeNull();
    });

    it('does not treat a low-but-nonzero count as the same failure mode', () => {
      // Scope is explicit: literal `=== 0`, not a low band — general
      // recall-rate tuning is a separate, unscoped question.
      expect(buildZeroSessionsWarning(1, 1000)).toBeNull();
    });
  });

  describe('pre-stop nudge dedupe (hasPreStopNudgeFired / recordPreStopNudgeFired)', () => {
    it('has not fired for a session with no prior record', () => {
      expect(hasPreStopNudgeFired(projectRoot, 'session-1')).toBe(false);
    });

    it('reports fired after being recorded', () => {
      recordPreStopNudgeFired(projectRoot, 'session-1');
      expect(hasPreStopNudgeFired(projectRoot, 'session-1')).toBe(true);
    });

    it('keeps the record isolated per session id', () => {
      recordPreStopNudgeFired(projectRoot, 'session-1');
      expect(hasPreStopNudgeFired(projectRoot, 'session-2')).toBe(false);
    });

    it('survives an epoch roll (context-reset) — unlike the dedupe ledger, this is not epoch-scoped', () => {
      recordPreStopNudgeFired(projectRoot, 'session-1');
      rollEpoch(projectRoot, 'session-1');
      expect(hasPreStopNudgeFired(projectRoot, 'session-1')).toBe(true);
    });
  });
});
