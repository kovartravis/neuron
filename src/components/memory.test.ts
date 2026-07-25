import { describe, it, expect } from 'vitest';
import type { Memory, MemoryMutation, MutationResult } from './memory.js';

describe('Memory Component Contracts (src/components/memory.ts)', () => {
  it('should validate Memory object structures correctly', () => {
    const mem: Memory = {
      id: 'mem-1',
      kind: 'learning',
      content: 'Always run tests before push',
      tags: ['git', 'testing'],
      scope: 'global',
      importance: 5,
      createdAt: new Date().toISOString()
    };

    expect(mem.id).toBe('mem-1');
    expect(mem.kind).toBe('learning');
    expect(mem.importance).toBe(5);
    expect(mem.tags).toContain('testing');
  });

  it('should support valid mutation payloads', () => {
    const upsertMutation: MemoryMutation = {
      op: 'upsert',
      kind: 'history',
      content: 'Built unit tests for components',
      tags: ['vitest'],
      importance: 3
    };

    const result: MutationResult = {
      id: 'hist-123',
      status: 'created',
      project: 'neuron'
    };

    expect(upsertMutation.op).toBe('upsert');
    expect(result.status).toBe('created');
  });
});
