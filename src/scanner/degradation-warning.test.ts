import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { scanProjectTopology } from './analyzer.js';

/**
 * Scope item 2: a language that *should* have parsed from an AST but could not
 * must say so loudly, not degrade in silence.
 *
 * The distinction that matters: Ruby and PHP have no grammar in 2.2.0 at all,
 * so their regex fidelity is expected and unremarkable. TypeScript falling back
 * means something went wrong with the install, and the resulting card is worse
 * than the user has any reason to expect.
 */
describe('grammar degradation warning', () => {
  let tmpDir: string;
  let emptyGrammarDir: string;

  beforeEach(() => {
    tmpDir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'neuron-degrade-test-')));
    emptyGrammarDir = path.join(tmpDir, 'no-grammars');
    fs.mkdirSync(emptyGrammarDir, { recursive: true });

    fs.writeFileSync(
      path.join(tmpDir, 'package.json'),
      JSON.stringify({ name: 'degrade-project' }),
      'utf8'
    );
    fs.mkdirSync(path.join(tmpDir, 'src'), { recursive: true });
    fs.writeFileSync(
      path.join(tmpDir, 'src', 'index.ts'),
      'export class AppRunner { start() { return true; } }\n',
      'utf8'
    );
  });

  afterEach(() => {
    delete process.env.NEURON_GRAMMAR_DIR;
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('warns loudly, naming the language and the fix, when a grammar is missing', async () => {
    // Point the cache at an empty directory: typescript has a grammar in 2.2.0,
    // so its absence is a degradation rather than an expected gap.
    process.env.NEURON_GRAMMAR_DIR = emptyGrammarDir;

    const stderr = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    const result = await scanProjectTopology(tmpDir, { depth: 3 });
    const said = stderr.mock.calls.map(c => String(c[0])).join('');
    stderr.mockRestore();

    expect(result.parserFidelity.regex).toBeGreaterThan(0);
    expect(result.parserFidelity.ast).toBe(0);
    expect(said).toContain('typescript');
    expect(said).toContain('neuron init');
  });

  it('says nothing when every file parsed from an AST', async () => {
    const stderr = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    const result = await scanProjectTopology(tmpDir, { depth: 3 });
    const said = stderr.mock.calls.map(c => String(c[0])).join('');
    stderr.mockRestore();

    expect(result.parserFidelity.ast).toBeGreaterThan(0);
    expect(said).toBe('');
  });
});
