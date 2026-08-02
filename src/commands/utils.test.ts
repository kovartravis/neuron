import { describe, it, expect, vi } from 'vitest';
import { parseFlags } from './utils.js';

describe('parseFlags --scope/--scopes deprecation (ticket 38)', () => {
  it('consumes --scope and --scopes without erroring, warns on stderr, and no longer surfaces them in options', () => {
    const stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);

    const { positionals, options } = parseFlags(['--scope', 'foo', '--scopes', 'a,b', 'content here']);

    expect(positionals).toEqual(['content here']);
    expect(options).not.toHaveProperty('scope');
    expect(options).not.toHaveProperty('scopes');

    const warnings = stderrSpy.mock.calls.map(c => String(c[0])).join('');
    expect(warnings).toContain('[neuron warning]');
    expect(warnings).toContain('--scope');
    expect(warnings).toContain('--scopes');
    expect(warnings).toContain('deprecated');

    stderrSpy.mockRestore();
  });

  it('does not warn when --scope/--scopes are absent', () => {
    const stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);

    parseFlags(['--importance', '4', 'content here']);

    expect(stderrSpy).not.toHaveBeenCalled();
    stderrSpy.mockRestore();
  });
});
