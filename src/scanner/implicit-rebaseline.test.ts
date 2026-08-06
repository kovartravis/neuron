import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { NeuronMemory } from '../index.js';
import { ingestScanResults } from './ingest.js';
import { autoRescanIfDriftDetected } from './diff.js';
import { FIDELITY_HEADING } from './fidelity.js';

/**
 * The implicit path — the auto-rescan fired by `memory query`.
 *
 * On a fidelity mismatch it re-baselines exactly as it would for drift, and
 * says nothing. A distinct announcement was considered and rejected: the drift
 * and missing-baseline messages would both state something untrue here, and the
 * migration is not something the user needs to act on when it self-heals.
 */
describe('implicit re-baseline on fidelity mismatch', () => {
  let tmpDir: string;
  let memory: NeuronMemory;

  beforeEach(async () => {
    tmpDir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'neuron-implicit-test-')));
    process.env.NEURON_CACHE_DIR = path.join(tmpDir, 'cache');

    fs.writeFileSync(
      path.join(tmpDir, 'package.json'),
      JSON.stringify({ name: 'implicit-project', dependencies: { typescript: '^5.0.0' } }),
      'utf8'
    );
    fs.writeFileSync(
      path.join(tmpDir, 'neuron.yaml'),
      'scan:\n  enabled: true\n  category: architecture\n  depth: 3\n',
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
      projectName: 'implicit-project',
    });
  });

  afterEach(async () => {
    delete process.env.NEURON_CACHE_DIR;
    if (memory) await memory.close();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  async function readBaseline(): Promise<string> {
    const entries = await memory.query({ categories: ['architecture'], limit: 10 });
    const card = entries.find(e => e.content?.includes('Repository Architectural Blueprint'));
    if (!card) throw new Error('no baseline card');
    return card.content!;
  }

  async function stripFidelitySection(): Promise<void> {
    const entries = await memory.query({ categories: ['architecture'], limit: 10 });
    const card = entries.find(e => e.content?.includes('Repository Architectural Blueprint'));
    if (!card) throw new Error('no baseline card');
    await memory.transact([
      {
        op: 'upsert',
        id: card.id,
        category: 'architecture',
        content: card
          .content!.split('\n')
          .filter(l => !l.startsWith(FIDELITY_HEADING) && !l.startsWith('Default: `'))
          .join('\n'),
        tags: ['architecture', 'topology', 'scan', 'deep'],
        importance: 5,
      },
    ]);
  }

  it('re-baselines a pre-2.2.0 card without announcing anything', async () => {
    await ingestScanResults(memory, { projectDir: tmpDir, category: 'architecture' });
    await stripFidelitySection();
    expect(await readBaseline()).not.toContain(FIDELITY_HEADING);

    const stderr = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    const rescanned = await autoRescanIfDriftDetected(memory, tmpDir);
    // mockRestore() also clears the recorded calls, so capture them first.
    const said = stderr.mock.calls.map(c => String(c[0])).join('');
    stderr.mockRestore();

    expect(rescanned).toBe(true);
    // Self-healed: the refreshed card carries fidelity again.
    expect(await readBaseline()).toContain(FIDELITY_HEADING);
    // And said nothing while doing it.
    expect(said).toBe('');
  });

  it('still announces ordinary drift', async () => {
    await ingestScanResults(memory, { projectDir: tmpDir, category: 'architecture' });

    fs.writeFileSync(
      path.join(tmpDir, 'src', 'extra.ts'),
      'export function brandNewExport(): number { return 1; }\n',
      'utf8'
    );

    const stderr = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    const rescanned = await autoRescanIfDriftDetected(memory, tmpDir);
    const said = stderr.mock.calls.map(c => String(c[0])).join('');
    stderr.mockRestore();

    expect(rescanned).toBe(true);
    expect(said).toContain('drift detected');
  });
});
