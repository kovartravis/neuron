import { describe, it, expect } from 'vitest';
import { buildDiscoveryHint } from './discoveryHint.js';

describe('buildDiscoveryHint', () => {
  it('returns null when the injected count already covers every match', () => {
    expect(buildDiscoveryHint('how do we access the db', 3, 3, 1000)).toBeNull();
    expect(buildDiscoveryHint('how do we access the db', 2, 3, 1000)).toBeNull();
  });

  it('emits a ready-to-run command carrying the real total as --limit when there is a real gap', () => {
    const hint = buildDiscoveryHint('how do we access the db', 12, 3, 1000);
    expect(hint).not.toBeNull();
    expect(hint).toContain('neuron memory query');
    expect(hint).toContain('--limit 12');
    expect(hint).toContain('how do we access the db');
  });

  it('drops the hint whole rather than truncating it when it does not fit the budget', () => {
    const hint = buildDiscoveryHint('how do we access the db', 12, 3, 10);
    expect(hint).toBeNull();
  });

  it('collapses whitespace and truncates a long prompt for display', () => {
    const long = 'x'.repeat(200);
    const hint = buildDiscoveryHint(long, 5, 0, 1000);
    expect(hint).not.toBeNull();
    expect(hint!.length).toBeLessThan(long.length);
    expect(hint).toContain('...');
  });

  it('escapes embedded double quotes so the displayed command stays a valid quoted argument', () => {
    const hint = buildDiscoveryHint('say "hello" please', 5, 0, 1000);
    expect(hint).not.toBeNull();
    expect(hint).toContain('\\"hello\\"');
  });
});
