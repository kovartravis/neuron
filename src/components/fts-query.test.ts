import { describe, it, expect } from 'vitest';
import { cleanFtsQuery } from './fts-query.js';

describe('cleanFtsQuery', () => {
  it('should tokenize a multi-word query into an OR-joined FTS5 wildcard expression', () => {
    expect(cleanFtsQuery('vitest config crash')).toBe('"vitest"* OR "config"* OR "crash"*');
  });

  // Punctuation, quotes, and FTS operators must never reach SQLite unescaped.
  it('should strip punctuation and neutralize FTS reserved words', () => {
    const out = cleanFtsQuery('onnxruntime-node AND "crash" OR NOT');
    expect(out).toBe('"onnxruntime"* OR "node"* OR "crash"*');
    // The bare operators must not survive as MATCH syntax.
    expect(out).not.toMatch(/\bAND\b|\bNOT\b/);
  });

  it('should return an empty string when the query contains no alphanumeric words', () => {
    expect(cleanFtsQuery('--- *** ???')).toBe('');
    expect(cleanFtsQuery('')).toBe('');
  });

  it('drops stopwords so they cannot match documents on their own', () => {
    // Every token here except `payment` and `provider` is a stopword. Keeping
    // them lets an unrelated document join the FTS ranking on "do"/"we"/"what",
    // and RRF rewards rank position, so noise gets a guaranteed seat.
    expect(cleanFtsQuery('what payment provider do we have')).toBe('"payment"* OR "provider"*');
  });

  it('returns empty for an all-stopword query rather than matching everything', () => {
    // Must degrade to semantic-only, not to a MATCH that hits every row.
    expect(cleanFtsQuery('what is it')).toBe('');
    expect(cleanFtsQuery('how do we do this')).toBe('');
  });

  it('deduplicates repeated terms', () => {
    expect(cleanFtsQuery('scan scan drift')).toBe('"scan"* OR "drift"*');
  });

  it('preserves short non-stopword tokens and numbers', () => {
    // `git` and `db` are exactly the terse queries CLAUDE.md tells agents to try.
    expect(cleanFtsQuery('git rebase')).toBe('"git"* OR "rebase"*');
    expect(cleanFtsQuery('db')).toBe('"db"*');
    expect(cleanFtsQuery('error 500')).toBe('"error"* OR "500"*');
  });
});
