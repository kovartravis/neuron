import { describe, it, expect } from 'vitest';
import { cleanFtsQuery } from './fts-query.js';

describe('cleanFtsQuery', () => {
  it('should tokenize a multi-word query into an OR-joined FTS5 wildcard expression', () => {
    expect(cleanFtsQuery('vitest config crash')).toBe('"vitest"* OR "config"* OR "crash"*');
  });
});
  // Punctuation, quotes, and FTS operators should not appear in the output
  it('should strip punctuation and FTS reserved characters from the query', () => {
    expect(cleanFtsQuery('onnxruntime-node AND "crash" OR NOT')).toBe('"onnxruntime"* OR "node"* OR "AND"* OR "crash"* OR "OR"* OR "NOT"*');
  });

  it('should return an empty string when the query contains no alphanumeric words', () => {
    expect(cleanFtsQuery('--- *** ???')).toBe('');
    expect(cleanFtsQuery('')).toBe('');
  });
