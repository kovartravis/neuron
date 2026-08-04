import { describe, it, expect } from 'vitest';
import { buildPayload, formatMemoryEntry, SESSION_START_CHAR_BUDGET, PRE_PROMPT_CHAR_BUDGET } from './payload.js';
import { Memory } from '../models/index.js';

function entry(id: string, content: string, tags: string[] = []): Memory {
  return {
    id,
    category: 'learning',
    kind: 'learning',
    content,
    tags,
    createdAt: '2026-01-01T00:00:00.000Z',
  };
}

describe('buildPayload', () => {
  it('includes every entry when the budget comfortably fits them all', () => {
    const entries = [entry('a', 'short one'), entry('b', 'short two')];
    const result = buildPayload(entries, 1000);
    expect(result.includedIds).toEqual(['a', 'b']);
    expect(result.droppedIds).toEqual([]);
    expect(result.text).toContain('short one');
    expect(result.text).toContain('short two');
  });

  it('drops whole entries rather than truncating one mid-content', () => {
    const long = entry('a', 'x'.repeat(200));
    const result = buildPayload([long], 50);
    expect(result.includedIds).toEqual([]);
    expect(result.droppedIds).toEqual(['a']);
    // Never a partial fragment of the dropped entry's content.
    expect(result.text).not.toContain('x'.repeat(10));
  });

  it('keeps packing smaller entries behind one that did not fit (bin-packing, not stop-at-first-miss)', () => {
    const big = entry('big', 'x'.repeat(200));
    const small = entry('small', 'fits fine');
    const result = buildPayload([big, small], 50);
    expect(result.droppedIds).toEqual(['big']);
    expect(result.includedIds).toEqual(['small']);
    expect(result.text).toContain('fits fine');
  });

  it('preserves rank order of included entries', () => {
    const entries = [entry('first', 'alpha'), entry('second', 'beta'), entry('third', 'gamma')];
    const result = buildPayload(entries, 1000);
    expect(result.includedIds).toEqual(['first', 'second', 'third']);
    const idxAlpha = result.text.indexOf('alpha');
    const idxBeta = result.text.indexOf('beta');
    const idxGamma = result.text.indexOf('gamma');
    expect(idxAlpha).toBeLessThan(idxBeta);
    expect(idxBeta).toBeLessThan(idxGamma);
  });

  it('drops everything when even the smallest entry cannot fit', () => {
    const result = buildPayload([entry('a', 'still too long for a tiny budget')], 5);
    expect(result.includedIds).toEqual([]);
    expect(result.droppedIds).toEqual(['a']);
    expect(result.text).toBe('');
  });

  it('handles an empty entry list', () => {
    const result = buildPayload([], 1000);
    expect(result.includedIds).toEqual([]);
    expect(result.droppedIds).toEqual([]);
    expect(result.text).toBe('');
  });

  it('accounts for the header against the same budget', () => {
    const header = 'H'.repeat(40);
    const result = buildPayload([entry('a', 'y'.repeat(20))], 50, header);
    // header (40) + 1 newline + entry line leaves only 9 chars, not enough.
    expect(result.includedIds).toEqual([]);
    expect(result.text).toBe(header);
  });

  it('formats tags into the entry line when present', () => {
    const line = formatMemoryEntry(entry('a', 'content here', ['db', 'perf']));
    expect(line).toContain('content here');
    expect(line).toContain('db, perf');
  });

  it('budget constants are asymmetric and both strictly below Claude Code\'s 10,000-char cap', () => {
    expect(SESSION_START_CHAR_BUDGET).toBeLessThan(10000);
    expect(PRE_PROMPT_CHAR_BUDGET).toBeLessThan(SESSION_START_CHAR_BUDGET);
  });
});
