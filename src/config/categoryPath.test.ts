import { describe, it, expect } from 'vitest';
import path from 'node:path';
import { resolveCategoryPath, resolveAllCategoryRoots, rawCategoryPath } from './categoryPath.js';
import { NeuronConfig } from './neuronYaml.js';

const baseConfig = (overrides: Partial<NeuronConfig> = {}): NeuronConfig => ({
  version: '1.0',
  strict: false,
  storage: { mode: 'md' },
  categories: { learning: {}, history: {}, decisions: {} },
  scan: { enabled: false, category: 'decisions', depth: 3 },
  pullRules: { default: { categories: ['learning'] }, onExec: [] },
  llm: { enrichment: { enabled: true, category: 'infer', tags: 'infer', timeoutMs: 15000, maxTags: 3, minTagSimilarity: 0.5, categoryStrategy: 'centroid' } },
  relevance: { gate: { enabled: true } },
  recall: { epochCharBudget: 18000 },
  ...overrides,
});

describe('resolveCategoryPath (ticket 05: categories.<name>.path > storage.path > .neuron)', () => {
  const projectRoot = '/project';

  it('falls back to the literal ".neuron" when neither level sets a path', () => {
    const config = baseConfig();
    expect(resolveCategoryPath(config, 'learning', projectRoot)).toBe(path.resolve(projectRoot, '.neuron'));
  });

  it('uses storage.path when set and no category override exists', () => {
    const config = baseConfig({ storage: { mode: 'md', path: 'docs' } });
    expect(resolveCategoryPath(config, 'learning', projectRoot)).toBe(path.resolve(projectRoot, 'docs'));
  });

  it('a category path overrides storage.path', () => {
    const config = baseConfig({
      storage: { mode: 'md', path: 'docs' },
      categories: { learning: { path: 'special-notes' }, history: {}, decisions: {} },
    });
    expect(resolveCategoryPath(config, 'learning', projectRoot)).toBe(path.resolve(projectRoot, 'special-notes'));
    // Unaffected sibling category still uses storage.path.
    expect(resolveCategoryPath(config, 'history', projectRoot)).toBe(path.resolve(projectRoot, 'docs'));
  });

  it('a category path overrides even when storage.path is also unset', () => {
    const config = baseConfig({
      categories: { learning: { path: 'special-notes' }, history: {}, decisions: {} },
    });
    expect(resolveCategoryPath(config, 'learning', projectRoot)).toBe(path.resolve(projectRoot, 'special-notes'));
    expect(resolveCategoryPath(config, 'history', projectRoot)).toBe(path.resolve(projectRoot, '.neuron'));
  });

  it('allows an absolute per-category path, bypassing projectRoot entirely', () => {
    const config = baseConfig({
      categories: { learning: { path: '/shared/notes' }, history: {}, decisions: {} },
    });
    expect(resolveCategoryPath(config, 'learning', projectRoot)).toBe('/shared/notes');
  });

  it('an undeclared category (e.g. neuron scan\'s "architecture") falls through to storage.path/.neuron the same as before', () => {
    const config = baseConfig({ storage: { mode: 'md', path: 'docs' } });
    expect(resolveCategoryPath(config, 'architecture', projectRoot)).toBe(path.resolve(projectRoot, 'docs'));
  });

  it('regression: a config with no per-category paths resolves byte-identically to the pre-ticket-05 default for every category', () => {
    const config = baseConfig();
    for (const category of Object.keys(config.categories)) {
      expect(resolveCategoryPath(config, category, projectRoot)).toBe(path.resolve(projectRoot, '.neuron'));
    }
  });
});

describe('rawCategoryPath', () => {
  it('is undefined-safe and mirrors resolveCategoryPath\'s precedence pre-projectRoot', () => {
    const config = baseConfig({
      storage: { mode: 'md', path: 'docs' },
      categories: { learning: { path: 'special-notes' }, history: {}, decisions: {} },
    });
    expect(rawCategoryPath(config, 'learning')).toBe('special-notes');
    expect(rawCategoryPath(config, 'history')).toBe('docs');
  });
});

describe('resolveAllCategoryRoots', () => {
  const projectRoot = '/project';

  it('groups categories under their distinct resolved roots', () => {
    const config = baseConfig({
      storage: { mode: 'md', path: 'docs' },
      categories: { learning: { path: 'special-notes' }, history: {}, decisions: {} },
    });
    const roots = resolveAllCategoryRoots(config, projectRoot);
    expect(roots.get(path.resolve(projectRoot, 'special-notes'))).toEqual(['learning']);
    expect(roots.get(path.resolve(projectRoot, 'docs'))?.sort()).toEqual(['decisions', 'history']);
    expect(roots.size).toBe(2);
  });

  it('collapses to a single root when nothing overrides storage.path', () => {
    const config = baseConfig();
    const roots = resolveAllCategoryRoots(config, projectRoot);
    expect(roots.size).toBe(1);
    expect([...roots.keys()][0]).toBe(path.resolve(projectRoot, '.neuron'));
    expect(roots.get(path.resolve(projectRoot, '.neuron'))?.sort()).toEqual(['decisions', 'history', 'learning']);
  });
});
