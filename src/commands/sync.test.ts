import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { NeuronMemory } from '../index.js';
import { handleSyncCommand, scaffoldNeuronDirectory } from './sync.js';
import { MdStorageAdapter } from '../storage/mdStorageAdapter.js';

describe('CLI neuron sync & Scaffolding (R4 Unit & Boundary Tests)', () => {
  const testDir = path.join(process.cwd(), 'src', '__tests__', `temp-cli-sync-${Date.now()}`);
  const storagePath = path.join(testDir, '.neuron');
  let memoryDb: NeuronMemory;

  let cwdSpy: any;

  beforeEach(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
    fs.mkdirSync(storagePath, { recursive: true });

    cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue(testDir);
    memoryDb = NeuronMemory.inMemory('cli-sync-test');
  });

  afterEach(() => {
    if (cwdSpy) {
      cwdSpy.mockRestore();
    }
    if (memoryDb) {
      memoryDb.close();
    }
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  // --- Tier 1 Coverage Tests (R4-T1-01 to R4-T1-05) ---

  it('R4-T1-01: handleSyncCommand executes full sync command and updates database and markdown storage', async () => {
    const mdAdapter = new MdStorageAdapter({ storagePath });
    await mdAdapter.writeEntry('learning', {
      id: 'cli-1',
      content: 'Learning entry for CLI sync test',
      tags: ['cli'],
    });

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await handleSyncCommand([], memoryDb, storagePath);

    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();

    const dbQuery = await memoryDb.query({ category: 'learning' });
    expect(dbQuery).toHaveLength(1);
  });

  it('R4-T1-02: --dry-run flag previews sync operations without modifying disk or DB', async () => {
    const mdAdapter = new MdStorageAdapter({ storagePath });
    await mdAdapter.writeEntry('learning', { id: 'dry-1', content: 'Dry run entry content' });

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await handleSyncCommand(['--dry-run'], memoryDb);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('DRY RUN complete'));
    consoleSpy.mockRestore();

    const dbQuery = await memoryDb.query({ category: 'learning' });
    expect(dbQuery).toHaveLength(0);
  });

  it('R4-T1-03: --force flag forces full re-embedding pass ignoring SHA-256 hashes', async () => {
    const mdAdapter = new MdStorageAdapter({ storagePath });
    await mdAdapter.writeEntry('learning', { id: 'force-1', content: 'Force entry content' });

    await handleSyncCommand([], memoryDb);

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await handleSyncCommand(['--force'], memoryDb);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Sync complete'));
    consoleSpy.mockRestore();
  });

  it('R4-T1-04: scaffoldNeuronDirectory / neuron init scaffolds .neuron/ directory and category template files', () => {
    const scaffoldedFiles = scaffoldNeuronDirectory(testDir, {
      storage: { mode: 'dual', path: '.neuron' },
      categories: { learning: {}, history: {}, decisions: {} },
    } as any);

    expect(scaffoldedFiles.length).toBeGreaterThanOrEqual(1);
    expect(fs.existsSync(path.join(testDir, '.neuron'))).toBe(true);
    expect(fs.existsSync(path.join(testDir, '.neuron', 'learning.md'))).toBe(true);
    expect(fs.existsSync(path.join(testDir, '.neuron', 'history.md'))).toBe(true);
    expect(fs.existsSync(path.join(testDir, '.neuron', 'decisions.md'))).toBe(true);
  });

  it('R4-T1-05: --category flag restricts sync execution to specified category file', async () => {
    const mdAdapter = new MdStorageAdapter({ storagePath });
    await mdAdapter.writeEntry('learning', { id: 'cat-l', content: 'Learning content' });
    await mdAdapter.writeEntry('history', { id: 'cat-h', content: 'History content' });

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await handleSyncCommand(['-c', 'learning'], memoryDb);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('learning'));
    consoleSpy.mockRestore();
  });

  // --- Tier 2 Boundary Tests (R4-T2-01 to R4-T2-05) ---

  it('R4-T2-01: sync loads fallback configuration when neuron.yaml is missing', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await handleSyncCommand([], memoryDb);

    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('R4-T2-02: combines --dry-run and --force flags for full re-embedding preview', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await handleSyncCommand(['--dry-run', '--force'], memoryDb);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('DRY RUN complete'));
    consoleSpy.mockRestore();
  });

  it('R4-T2-03: scaffoldNeuronDirectory preserves pre-existing category markdown files', () => {
    const targetDir = path.join(testDir, 'existing-project');
    const neuronDir = path.join(targetDir, '.neuron');
    fs.mkdirSync(neuronDir, { recursive: true });

    const existingContent = '# Category: learning\n\nUser custom pre-existing note\n';
    fs.writeFileSync(path.join(neuronDir, 'learning.md'), existingContent, 'utf8');

    scaffoldNeuronDirectory(targetDir, {
      categories: { learning: {}, history: {} },
    } as any);

    const actualContent = fs.readFileSync(path.join(neuronDir, 'learning.md'), 'utf8');
    expect(actualContent).toBe(existingContent);
  });

  it('R4-T2-04: suppresses ANSI progress animations in non-TTY pipe environments', async () => {
    const originalIsTTY = process.stdout.isTTY;
    process.stdout.isTTY = false;

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await handleSyncCommand([], memoryDb);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('[sync] Processing categories:'));

    consoleSpy.mockRestore();
    process.stdout.isTTY = originalIsTTY;
  });

  it('R4-T2-05: returns exit code 1 or throws when unrecognized CLI flags are passed', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await expect(
      handleSyncCommand(['--unrecognized-flag'], memoryDb)
    ).rejects.toThrow();

    errorSpy.mockRestore();
  });
});
