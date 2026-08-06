import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { NeuronMemory } from '../index.js';
import { handleScanCommand } from './scan.js';

/**
 * Ticket 37 verification: the blueprint card is a deterministic artifact.
 * Repeated real ingests never duplicate the card (making SCAN_HELP's
 * "updates that card in place" promise true), and repeated dry-runs are
 * byte-identical across both output formats.
 */
describe('neuron scan determinism (ticket 37)', () => {
  let tmpDir: string;
  let memory: NeuronMemory;
  let originalCwd: string;

  beforeEach(async () => {
    originalCwd = process.cwd();
    tmpDir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'neuron-determinism-test-')));

    fs.writeFileSync(
      path.join(tmpDir, 'package.json'),
      JSON.stringify({ name: 'determinism-project', dependencies: { typescript: '^5.0.0' } }),
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
      projectName: 'determinism-project',
    });

    process.chdir(tmpDir);
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    if (memory) await memory.close();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('never creates a duplicate card across repeated real scans (SCAN_HELP: updates in place)', async () => {
    await handleScanCommand(['scan', '--no-progress'], memory);
    await handleScanCommand(['scan', '--no-progress'], memory);
    await handleScanCommand(['scan', '--no-progress'], memory);

    const entries = await memory.query({ categories: ['architecture'], limit: 10 });
    const cards = entries.filter(e => e.content?.includes('Repository Architectural Blueprint'));

    expect(cards.length).toBe(1);
  });

  it('produces byte-identical --dry-run --format md output across two runs', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});

    await handleScanCommand(['scan', '--dry-run', '--no-progress'], memory);
    const first = log.mock.calls.at(-1)?.[0];

    await handleScanCommand(['scan', '--dry-run', '--no-progress'], memory);
    const second = log.mock.calls.at(-1)?.[0];

    log.mockRestore();
    expect(second).toBe(first);
  });

  it('produces byte-identical --dry-run --format json output across two runs', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});

    await handleScanCommand(['scan', '--dry-run', '--format', 'json', '--no-progress'], memory);
    const first = log.mock.calls.at(-1)?.[0];

    await handleScanCommand(['scan', '--dry-run', '--format', 'json', '--no-progress'], memory);
    const second = log.mock.calls.at(-1)?.[0];

    log.mockRestore();
    expect(second).toBe(first);
  });
});
