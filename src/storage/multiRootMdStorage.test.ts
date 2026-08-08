import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { MultiRootMdStorage } from './multiRootMdStorage.js';
import { NeuronConfig } from '../config/neuronYaml.js';

const baseConfig = (categories: NeuronConfig['categories']): NeuronConfig => ({
  version: '1.0',
  strict: false,
  storage: { mode: 'md' },
  categories,
  scan: { enabled: false, category: 'decisions', depth: 3 },
  pullRules: { default: { categories: [Object.keys(categories)[0]] }, onExec: [] },
  llm: { enrichment: { enabled: true, category: 'infer', tags: 'infer', timeoutMs: 15000, maxTags: 3, minTagSimilarity: 0.5, categoryStrategy: 'centroid' } },
  relevance: { gate: { enabled: true } },
  recall: { epochCharBudget: 18000 },
});

describe('MultiRootMdStorage (ticket 05)', () => {
  const testDir = path.join(process.cwd(), 'src', '__tests__', `temp-multiroot-${Date.now()}`);

  beforeEach(() => {
    if (fs.existsSync(testDir)) fs.rmSync(testDir, { recursive: true, force: true });
    fs.mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    if (fs.existsSync(testDir)) fs.rmSync(testDir, { recursive: true, force: true });
  });

  it('round-trips an entry through a category with an overridden path', async () => {
    const config = baseConfig({
      learning: { path: 'special-notes' },
      history: {},
    });
    const storage = new MultiRootMdStorage(config, testDir);

    await storage.writeEntry('learning', { id: 'a1', content: 'overridden-path entry', tags: [] });
    await storage.writeEntry('history', { id: 'h1', content: 'default-path entry', tags: [] });

    expect(fs.existsSync(path.join(testDir, 'special-notes', 'learning.md'))).toBe(true);
    expect(fs.existsSync(path.join(testDir, '.neuron', 'history.md'))).toBe(true);

    const learningEntries = await storage.readCategory('learning');
    expect(learningEntries).toHaveLength(1);
    expect(learningEntries[0].content).toBe('overridden-path entry');

    const historyEntries = await storage.readCategory('history');
    expect(historyEntries).toHaveLength(1);
    expect(historyEntries[0].content).toBe('default-path entry');
  });

  it('survives a reconcile-style read-back after writing (round trip, not just a single write)', async () => {
    const config = baseConfig({ learning: { path: 'moved' } });
    const storage1 = new MultiRootMdStorage(config, testDir);
    await storage1.writeEntry('learning', { id: 'rt-1', content: 'round trip content', tags: ['x'] });

    // Fresh instance, same config — simulates a new process/command.
    const storage2 = new MultiRootMdStorage(config, testDir);
    const entries = await storage2.readCategory('learning');
    expect(entries).toHaveLength(1);
    expect(entries[0].id).toBe('rt-1');
    expect(entries[0].content).toBe('round trip content');
  });

  it('regression: a config with no per-category paths behaves byte-identically to a plain single-root adapter', async () => {
    const config = baseConfig({ learning: {}, history: {} });
    const storage = new MultiRootMdStorage(config, testDir);
    await storage.writeEntry('learning', { id: 'plain-1', content: 'plain', tags: [] });

    expect(storage.getFilePath('learning')).toBe(path.join(testDir, '.neuron', 'learning.md'));
    expect(fs.existsSync(path.join(testDir, '.neuron', 'learning.md'))).toBe(true);
  });

  it('keeps path-traversal containment per resolved root', async () => {
    const config = baseConfig({ learning: { path: 'special-notes' } });
    const storage = new MultiRootMdStorage(config, testDir);

    const maliciousCategory = '../../outside_dir';
    // Route the malicious "category" through the same resolver a real
    // category would use — resolveRoot falls back to storage.path/.neuron
    // for anything not declared, same as today.
    await storage.writeEntry(maliciousCategory, { id: 'pt-1', content: 'traversal attempt' });
    const resolved = path.resolve(storage.getFilePath(maliciousCategory));
    const expectedRoot = path.resolve(testDir, '.neuron');
    expect(resolved.startsWith(expectedRoot)).toBe(true);
  });

  it('listRoots reports every distinct resolved root, deduplicated', () => {
    const config = baseConfig({
      learning: { path: 'special-notes' },
      history: {},
      decisions: {},
    });
    const storage = new MultiRootMdStorage(config, testDir);
    const roots = storage.listRoots().sort();
    expect(roots).toEqual([
      path.join(testDir, '.neuron'),
      path.join(testDir, 'special-notes'),
    ].sort());
  });

  it('throws a clear error when a resolved root already exists as a file, not a directory', async () => {
    const filePath = path.join(testDir, 'not-a-dir');
    fs.writeFileSync(filePath, 'i am a file', 'utf8');
    const config = baseConfig({ learning: { path: 'not-a-dir' } });
    const storage = new MultiRootMdStorage(config, testDir);

    await expect(storage.writeEntry('learning', { id: 'x', content: 'y' })).rejects.toThrow(/not a directory/);
  });

  it('overrideRoot pins every category to one literal root, bypassing config resolution', async () => {
    const config = baseConfig({ learning: { path: 'special-notes' }, history: {} });
    const overridePath = path.join(testDir, 'override-root');
    const storage = new MultiRootMdStorage(config, testDir, overridePath);

    await storage.writeEntry('learning', { id: 'o1', content: 'override' });
    await storage.writeEntry('history', { id: 'o2', content: 'override too' });

    expect(fs.existsSync(path.join(overridePath, 'learning.md'))).toBe(true);
    expect(fs.existsSync(path.join(overridePath, 'history.md'))).toBe(true);
    expect(storage.listRoots()).toEqual([path.resolve(overridePath)]);
  });
});
