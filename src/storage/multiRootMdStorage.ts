import fs from 'node:fs';
import path from 'node:path';
import { Memory } from '../models/memory.js';
import { NeuronConfig } from '../config/neuronYaml.js';
import { resolveCategoryPath } from '../config/categoryPath.js';
import { MdStorage } from './mdStorage.js';
import { MdStorageAdapter } from './mdStorageAdapter.js';

/**
 * Fans a single `MdStorage` surface out across every root a category's
 * `categories.<name>.path > storage.path > '.neuron'` chain resolves to
 * (ticket 05). Chosen over teaching `MdStorageAdapter` itself to resolve
 * per-category: each resolved root keeps its own plain, single-root adapter
 * underneath — unchanged internals, unchanged path-traversal containment
 * (`getFilePath`'s sanitization still runs per adapter, so a malicious
 * category name still can't escape *its own* resolved root) — and this class
 * is just a thin lookup in front of a small, lazily-populated registry of
 * them, keyed by resolved absolute directory so two categories sharing a
 * root share one adapter instance (and one `readdirSync`, if it ever needs
 * one).
 *
 * `overrideRoot`, when set, pins every category to one literal root, bypassing
 * config resolution entirely — the same escape hatch `handleSyncCommand`'s
 * `overrideStoragePath` parameter already gave callers before this ticket.
 */
export class MultiRootMdStorage implements MdStorage {
  private readonly config: NeuronConfig;
  private readonly projectRoot: string;
  private readonly overrideRoot?: string;
  private readonly adaptersByRoot = new Map<string, MdStorageAdapter>();

  constructor(config: NeuronConfig, projectRoot: string, overrideRoot?: string) {
    this.config = config;
    this.projectRoot = projectRoot;
    this.overrideRoot = overrideRoot;
  }

  /** The resolved root a given category currently writes into. */
  resolveRoot(category: string): string {
    if (this.overrideRoot) {
      return path.resolve(this.overrideRoot);
    }
    return resolveCategoryPath(this.config, category, this.projectRoot);
  }

  private adapterFor(category: string): MdStorageAdapter {
    const root = this.resolveRoot(category);
    let adapter = this.adaptersByRoot.get(root);
    if (!adapter) {
      if (fs.existsSync(root) && !fs.statSync(root).isDirectory()) {
        throw new Error(
          `neuron.yaml: category "${category}" resolves to "${root}", which exists and is not a directory.`
        );
      }
      adapter = new MdStorageAdapter({ storagePath: root });
      this.adaptersByRoot.set(root, adapter);
    }
    return adapter;
  }

  listRoots(): string[] {
    if (this.overrideRoot) {
      return [path.resolve(this.overrideRoot)];
    }
    const roots = new Set<string>();
    for (const category of Object.keys(this.config.categories)) {
      roots.add(this.resolveRoot(category));
    }
    return [...roots];
  }

  getFilePath(category: string): string {
    return this.adapterFor(category).getFilePath(category);
  }

  async ensureScaffolded(categories: string[] = ['learning', 'history', 'decisions']): Promise<void> {
    for (const category of categories) {
      await this.adapterFor(category).ensureScaffolded([category]);
    }
  }

  async ensureDirectories(categories?: string[]): Promise<void> {
    return this.ensureScaffolded(categories);
  }

  async readCategory(category: string): Promise<Memory[]> {
    return this.adapterFor(category).readCategory(category);
  }

  /**
   * Unlike `MdStorageAdapter.readAll`, an omitted `categories` here always
   * means "every declared category" — there is no single directory left to
   * `readdirSync` across multiple roots, and every production caller already
   * passes an explicit list.
   */
  async readAll(categories?: string[]): Promise<Memory[]> {
    const cats = categories ?? Object.keys(this.config.categories);
    const all: Memory[] = [];
    for (const category of cats) {
      all.push(...(await this.readCategory(category)));
    }
    return all;
  }

  async writeEntry(category: string, entry: Partial<Memory> & { content?: string }): Promise<Memory> {
    return this.adapterFor(category).writeEntry(category, entry);
  }

  async updateEntry(category: string, entry: Partial<Memory> & { id: string }): Promise<Memory> {
    return this.adapterFor(category).updateEntry(category, entry);
  }

  async deleteEntry(category: string, id: string): Promise<boolean> {
    return this.adapterFor(category).deleteEntry(category, id);
  }
}

export default MultiRootMdStorage;
