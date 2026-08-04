import { describe, it, expect, vi } from 'vitest';
import { parseFlags, getMemoryHelp, MEMORY_HELP } from './utils.js';
import { validateNeuronYaml, collectDeclaredFieldFlags, type DeclaredFieldFlag } from '../config/neuronYaml.js';

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

// Ticket 43: config-declared category fields become CLI flags.
describe('parseFlags declared-field CLI flags (ticket 43)', () => {
  const declaredFields: DeclaredFieldFlag[] = collectDeclaredFieldFlags(
    validateNeuronYaml({
      categories: {
        learning: {},
        decisions: {
          fields: {
            ticket: { type: 'string', required: true },
            confidence: { type: 'enum', values: ['low', 'medium', 'high'] },
          },
        },
      },
    })
  );

  it('captures a declared field flag into options.fields, keyed by its config key', () => {
    const { options } = parseFlags(
      ['--category', 'decisions', '--ticket', 'NEU-42', 'content here'],
      declaredFields
    );
    expect(options.fields).toEqual({ ticket: 'NEU-42' });
    expect(options.category).toBe('decisions');
  });

  it('captures multiple declared fields on the same invocation', () => {
    const { options } = parseFlags(
      ['--ticket', 'NEU-1', '--confidence', 'high', 'content'],
      declaredFields
    );
    expect(options.fields).toEqual({ ticket: 'NEU-1', confidence: 'high' });
  });

  it('leaves options.fields undefined when no declared field flag is passed', () => {
    const { options } = parseFlags(['--category', 'decisions', 'content'], declaredFields);
    expect(options.fields).toBeUndefined();
  });

  it('does not recognise a declared field flag unless it is passed in as declaredFields', () => {
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit called');
    });
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => parseFlags(['--ticket', 'NEU-42', 'content'])).toThrow('process.exit called');
    expect(exitSpy).toHaveBeenCalledWith(1);

    exitSpy.mockRestore();
    errSpy.mockRestore();
  });

  it('suggests a declared field flag on a near-miss typo', () => {
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit called');
    });
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => parseFlags(['--tickets', 'NEU-42'], declaredFields)).toThrow('process.exit called');
    const errors = errSpy.mock.calls.map(c => String(c[0])).join('\n');
    expect(errors).toContain("Did you mean '--ticket'?");

    exitSpy.mockRestore();
    errSpy.mockRestore();
  });
});

describe('getMemoryHelp (ticket 43)', () => {
  it('returns the static MEMORY_HELP unchanged when no category declares fields', () => {
    const config = validateNeuronYaml({ categories: { learning: {} } });
    expect(getMemoryHelp(config)).toBe(MEMORY_HELP);
  });

  it('appends a project-declared-fields section listing each category and flag', () => {
    const config = validateNeuronYaml({
      categories: {
        learning: {},
        decisions: {
          fields: {
            ticket: { type: 'string', required: true },
            confidence: { type: 'enum', values: ['low', 'medium', 'high'], default: 'medium' },
          },
        },
      },
    });
    const help = getMemoryHelp(config);
    expect(help.startsWith(MEMORY_HELP)).toBe(true);
    expect(help).toContain('decisions:');
    expect(help).toContain('--ticket <value>');
    expect(help).toContain('required');
    expect(help).toContain('--confidence <value>');
    expect(help).toContain('enum: low|medium|high');
  });
});
