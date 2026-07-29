import { NeuronMemory } from '../index.js';
import { MdStorageAdapter } from './mdStorageAdapter.js';
import { NeuronConfig } from '../config/neuronYaml.js';
import { Memory, MemoryMutation, MemoryQuery, MutationResult } from '../models/memory.js';

export class DualStorageRouter {
  private vectorDb: NeuronMemory;
  private mdAdapter: MdStorageAdapter;
  private config: NeuronConfig;

  constructor(vectorDb: NeuronMemory, mdAdapter: MdStorageAdapter, config: NeuronConfig) {
    this.vectorDb = vectorDb;
    this.mdAdapter = mdAdapter;
    this.config = config;
  }

  public setConfig(config: NeuronConfig): void {
    this.config = config;
  }

  public async transact(mutations: MemoryMutation[]): Promise<MutationResult[]> {
    const mode = this.getStorageMode();
    const results: MutationResult[] = [];

    if (mode === 'vector-only') {
      return this.vectorDb.transact(mutations);
    }

    if (mode === 'md-only') {
      return this.transactMarkdownOnly(mutations);
    }

    if (mode === 'dual' || mode === 'split') {
      // Execute vector DB transaction
      let vectorResults: MutationResult[] = [];
      try {
        vectorResults = await this.vectorDb.transact(mutations);
      } catch (err) {
        // Non-blocking error handling
      }

      // Execute Markdown transaction with atomic swap
      for (let i = 0; i < mutations.length; i++) {
        const m = mutations[i];
        const category = m.category ?? m.kind ?? 'learning';
        const vecResult = vectorResults[i] || { id: m.id || 'unknown', status: 'not_found', project: 'neuron' };

        try {
          if (m.op === 'upsert') {
            const entryId = m.id || vecResult.id;
            await this.mdAdapter.writeEntry(category, {
              id: entryId,
              content: m.content || '',
              tags: m.tags || [],
              importance: m.importance,
              scope: m.scope,
              taskId: m.taskId,
            });
            results.push({ id: entryId, status: vecResult.status || 'created', project: vecResult.project || 'neuron' });
          } else if (m.op === 'update') {
            try {
              await this.mdAdapter.updateEntry(category, {
                id: m.id,
                content: m.content,
                tags: m.tags,
                importance: m.importance,
                scope: m.scope,
                taskId: m.taskId,
              });
              results.push({ id: m.id, status: 'updated', project: vecResult.project || 'neuron' });
            } catch {
              results.push({ id: m.id, status: 'not_found', project: vecResult.project || 'neuron' });
            }
          } else if (m.op === 'delete') {
            const deleted = await this.mdAdapter.deleteEntry(category, m.id);
            results.push({ id: m.id, status: deleted ? 'deleted' : 'not_found', project: vecResult.project || 'neuron' });
          }
        } catch (err) {
          // Error isolation for disk failures
          results.push({ id: m.id || 'error', status: 'error', project: vecResult.project || 'neuron' });
        }
      }
      return results;
    }

    // Default fallback
    return this.vectorDb.transact(mutations);
  }

  public async query(query: MemoryQuery): Promise<Memory[]> {
    const mode = this.getStorageMode();
    if (mode === 'md-only') {
      const categories = query.categories || (query.category ? [query.category] : ['learning', 'history', 'decisions']);
      const allMemories = await this.mdAdapter.readAll(categories);

      let filtered = allMemories;
      if (query.text) {
        const textLower = query.text.toLowerCase();
        filtered = filtered.filter(m => m.content.toLowerCase().includes(textLower) || m.tags.some(t => t.toLowerCase().includes(textLower)));
      }
      if (query.scopes && query.scopes.length > 0) {
        filtered = filtered.filter(m => !m.scope || query.scopes!.includes(m.scope));
      }
      if (query.limit) {
        filtered = filtered.slice(0, query.limit);
      }
      return filtered;
    }

    return this.vectorDb.query(query);
  }

  private getStorageMode(): string {
    const validModes = ['vector-only', 'md-only', 'dual', 'split'];
    const mode = this.config?.storage?.mode;
    if (mode && validModes.includes(mode)) {
      return mode;
    }
    return 'vector-only';
  }

  private async transactMarkdownOnly(mutations: MemoryMutation[]): Promise<MutationResult[]> {
    const results: MutationResult[] = [];
    for (const m of mutations) {
      const category = m.category ?? m.kind ?? 'learning';
      if (m.op === 'upsert') {
        const entry = await this.mdAdapter.writeEntry(category, {
          id: m.id,
          content: m.content || '',
          tags: m.tags || [],
          importance: m.importance,
          scope: m.scope,
          taskId: m.taskId,
        });
        results.push({ id: entry.id, status: 'created', project: 'neuron' });
      } else if (m.op === 'update') {
        try {
          const updated = await this.mdAdapter.updateEntry(category, {
            id: m.id,
            content: m.content,
            tags: m.tags,
            importance: m.importance,
            scope: m.scope,
            taskId: m.taskId,
          });
          results.push({ id: updated.id, status: 'updated', project: 'neuron' });
        } catch {
          results.push({ id: m.id, status: 'not_found', project: 'neuron' });
        }
      } else if (m.op === 'delete') {
        const deleted = await this.mdAdapter.deleteEntry(category, m.id);
        results.push({ id: m.id, status: deleted ? 'deleted' : 'not_found', project: 'neuron' });
      }
    }
    return results;
  }
}

export default DualStorageRouter;
