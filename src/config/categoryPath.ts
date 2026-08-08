import path from 'node:path';
import type { NeuronConfig } from './neuronYaml.js';

/**
 * `categories.<name>.path > storage.path > '.neuron'` (ticket 05). Absolute
 * per-category paths are allowed by design — a shared notes directory outside
 * the repo is a plausible want, and `storage.path` itself already permitted
 * absolute values. The `path.resolve` below is a no-op for an already-absolute
 * `raw`.
 */
export function resolveCategoryPath(config: NeuronConfig, category: string, projectRoot: string): string {
  const raw = config.categories[category]?.path ?? config.storage.path ?? '.neuron';
  return path.resolve(projectRoot, raw);
}

/**
 * The unresolved (pre-`projectRoot`) path a category would use — `undefined`
 * when neither the category nor the top level set one, i.e. the `.neuron`
 * literal fallback applies. Used for config-time collision checks that must
 * not require a real project root to reason about.
 */
export function rawCategoryPath(config: NeuronConfig, category: string): string {
  return config.categories[category]?.path ?? config.storage.path ?? '.neuron';
}

/**
 * Every distinct resolved root a declared category writes into, each paired
 * with the categories that land there. Used by scaffolding, `neuron sync`,
 * and `neuron status` to report/act per-root rather than assuming one root
 * for the whole project.
 */
export function resolveAllCategoryRoots(config: NeuronConfig, projectRoot: string): Map<string, string[]> {
  const roots = new Map<string, string[]>();
  for (const category of Object.keys(config.categories)) {
    const root = resolveCategoryPath(config, category, projectRoot);
    const existing = roots.get(root);
    if (existing) {
      existing.push(category);
    } else {
      roots.set(root, [category]);
    }
  }
  return roots;
}
