import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { NeuronMemory } from '../index.js';
import { ingestScanResults } from '../scanner/ingest.js';
import { handleScanCommand } from './scan.js';
import { FIDELITY_HEADING } from '../scanner/fidelity.js';

/**
 * The `--check` exit-code contract, which is what CI gates on:
 *   0  clean and comparable
 *   1  real architectural drift
 *   2  incomparable — the baseline was produced by a different parser
 *
 * Code 2 is deliberately distinct from 1: failing a build for drift the user
 * introduced is correct, and failing it because they upgraded neuron is a
 * different problem with a different fix.
 */
describe('neuron scan --check exit codes', () => {
  let tmpDir: string;
  let memory: NeuronMemory;
  let originalCwd: string;

  beforeEach(async () => {
    originalCwd = process.cwd();
    tmpDir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'neuron-check-test-')));

    fs.writeFileSync(
      path.join(tmpDir, 'package.json'),
      JSON.stringify({ name: 'check-project', dependencies: { typescript: '^5.0.0' } }),
      'utf8'
    );
    fs.mkdirSync(path.join(tmpDir, 'src'), { recursive: true });
    fs.writeFileSync(
      path.join(tmpDir, 'src', 'index.ts'),
      'export class AppRunner { start() { return true; } }\n',
      'utf8'
    );

    memory = new NeuronMemory({
      dbPath: path.join(tmpDir, 'memory.db'),
      projectRoot: tmpDir,
      projectName: 'check-project',
    });

    process.chdir(tmpDir);
    process.exitCode = undefined;
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    process.exitCode = undefined;
    if (memory) await memory.close();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  /** Replaces the stored blueprint card's body. */
  async function rewriteBaseline(transform: (card: string) => string): Promise<void> {
    const entries = await memory.query({ categories: ['architecture'], limit: 10 });
    const card = entries.find(e => e.content?.includes('Repository Architectural Blueprint'));
    if (!card) throw new Error('no baseline card to rewrite');
    await memory.transact([
      {
        op: 'upsert',
        id: card.id,
        category: 'architecture',
        content: transform(card.content!),
        tags: ['architecture', 'topology', 'scan', 'deep'],
        importance: 5,
      },
    ]);
  }

  it('exits 0 when the baseline is comparable and in sync', async () => {
    await ingestScanResults(memory, { projectDir: tmpDir, category: 'architecture' });

    await handleScanCommand(['scan', '--check', '--no-progress'], memory);

    expect(process.exitCode).toBeFalsy();
  });

  it('exits 1 on real drift at matching fidelity', async () => {
    await ingestScanResults(memory, { projectDir: tmpDir, category: 'architecture' });

    // A genuinely new exported symbol, at the same parser fidelity.
    fs.writeFileSync(
      path.join(tmpDir, 'src', 'extra.ts'),
      'export function brandNewExport(): number { return 1; }\n',
      'utf8'
    );

    await handleScanCommand(['scan', '--check', '--no-progress'], memory);

    expect(process.exitCode).toBe(1);
  });

  it('exits 2 when the baseline predates the AST parser', async () => {
    await ingestScanResults(memory, { projectDir: tmpDir, category: 'architecture' });

    // Strip the fidelity section to simulate a card written by 2.1.0.
    await rewriteBaseline(card =>
      card
        .split('\n')
        .filter(line => !line.startsWith(FIDELITY_HEADING) && !line.startsWith('Default: `'))
        .join('\n')
    );

    await handleScanCommand(['scan', '--check', '--no-progress'], memory);

    expect(process.exitCode).toBe(2);
  });
});
