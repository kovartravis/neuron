import fs from 'node:fs';
import { NeuronMemory } from '../index.js';
import { MdStorageAdapter } from './mdStorageAdapter.js';
import { NeuronConfig } from '../config/neuronYaml.js';
import { Memory, MemoryMutation, MemoryQuery, MutationResult } from '../models/memory.js';

function dotProduct(a: Float32Array, b: Float32Array): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) {
    s += a[i] * b[i];
  }
  return s;
}

export class DualStorageRouter {
  private vectorDb: NeuronMemory;
  private mdAdapter: MdStorageAdapter;
  private config: NeuronConfig;
  private mdEmbedCache = new Map<string, { mtimeMs: number; embeddings: Map<string, Float32Array> }>();

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

    if (mode === 'split') {
      const results: MutationResult[] = [];
      for (const m of mutations) {
        const cat = m.category ?? m.kind ?? 'learning';
        const catStorage = this.config?.categories?.[cat]?.storage || 'dual';

        if (catStorage === 'md') {
          const res = await this.transactMarkdownOnly([m]);
          results.push(...res);
        } else if (catStorage === 'vector') {
          const res = await this.vectorDb.transact([m]);
          results.push(...res);
        } else {
          // 'dual' or default fallback: transact both vector and markdown
          let vecRes: MutationResult[] = [];
          try { vecRes = await this.vectorDb.transact([m]); } catch {}
          const vecResult = vecRes[0] || { id: m.id || 'unknown', status: 'not_found', project: 'neuron' };
          const entryId = m.id || vecResult.id;

          if (m.op === 'upsert') {
            await this.mdAdapter.writeEntry(cat, { id: entryId, content: m.content || '', tags: m.tags || [], importance: m.importance, scope: m.scope, taskId: m.taskId });
            results.push({ id: entryId, status: vecResult.status || 'created', project: vecResult.project || 'neuron' });
          } else if (m.op === 'update') {
            // Report success if EITHER store actually changed. The two can
            // diverge (a prior write that landed on only one side, a manual
            // .md edit not yet synced), and reporting only the md outcome
            // meant a vector-side update could succeed while the caller was
            // told 'not_found' — a false negative on data that did change.
            let mdUpdated = true;
            try {
              await this.mdAdapter.updateEntry(cat, { id: m.id, content: m.content, tags: m.tags, importance: m.importance, scope: m.scope, taskId: m.taskId });
            } catch {
              mdUpdated = false;
            }
            const vecUpdated = vecResult.status === 'updated';
            results.push({
              id: m.id,
              status: mdUpdated || vecUpdated ? 'updated' : 'not_found',
              project: vecResult.project || 'neuron',
            });
          } else if (m.op === 'delete') {
            const mdDeleted = await this.mdAdapter.deleteEntry(cat, m.id);
            const vecDeleted = vecResult.status === 'deleted';
            results.push({
              id: m.id,
              status: mdDeleted || vecDeleted ? 'deleted' : 'not_found',
              project: vecResult.project || 'neuron',
            });
          }
        }
      }
      return results;
    }

    if (mode === 'dual') {
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
            // Report success if EITHER store actually changed — see the
            // matching comment in the split-mode branch above.
            let mdUpdated = true;
            try {
              await this.mdAdapter.updateEntry(category, {
                id: m.id,
                content: m.content,
                tags: m.tags,
                importance: m.importance,
                scope: m.scope,
                taskId: m.taskId,
              });
            } catch {
              mdUpdated = false;
            }
            const vecUpdated = vecResult.status === 'updated';
            results.push({
              id: m.id,
              status: mdUpdated || vecUpdated ? 'updated' : 'not_found',
              project: vecResult.project || 'neuron',
            });
          } else if (m.op === 'delete') {
            const mdDeleted = await this.mdAdapter.deleteEntry(category, m.id);
            const vecDeleted = vecResult.status === 'deleted';
            results.push({
              id: m.id,
              status: mdDeleted || vecDeleted ? 'deleted' : 'not_found',
              project: vecResult.project || 'neuron',
            });
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
      return this.queryMarkdownOnly(query);
    }

    if (mode === 'split') {
      const categories = query.categories || (query.category ? [query.category] : Object.keys(this.config?.categories || { learning: {}, history: {} }));
      const mdCats: string[] = [];
      const vecCats: string[] = [];

      for (const cat of categories) {
        // Matches the write-side default (line 47) for self-documentation.
        // Dispatch below only branches on '=== md', so this has no behavioural
        // effect — 'vector' and 'dual' both land in the same "not md" bucket —
        // but the mismatched literal read as if it might, which is misleading.
        const catStorage = this.config?.categories?.[cat]?.storage || 'dual';
        if (catStorage === 'md') {
          mdCats.push(cat);
        } else {
          vecCats.push(cat);
        }
      }

      let combinedResults: Memory[] = [];

      if (mdCats.length > 0) {
        const mdRes = await this.queryMarkdownOnly({ ...query, categories: mdCats });
        combinedResults.push(...mdRes);
      }

      if (vecCats.length > 0) {
        const vecRes = await this.vectorDb.query({ ...query, categories: vecCats });
        combinedResults.push(...vecRes);
      }

      if (query.text) {
        combinedResults.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
      }
      if (query.limit) {
        combinedResults = combinedResults.slice(0, query.limit);
      }
      return combinedResults;
    }

    return this.vectorDb.query(query);
  }

  private async queryMarkdownOnly(query: MemoryQuery): Promise<Memory[]> {
    const categories = query.categories || (query.category ? [query.category] : ['learning', 'history', 'decisions']);
    const embedder = (this.vectorDb as any)?.getEmbedder?.() || (this.vectorDb as any)?.embedder;

    const allMemories: Memory[] = [];

    for (const cat of categories) {
      const filePath = this.mdAdapter.getFilePath(cat);
      if (!fs.existsSync(filePath)) continue;

      const stat = fs.statSync(filePath);
      let catCache = this.mdEmbedCache.get(cat);

      if (!catCache || catCache.mtimeMs !== stat.mtimeMs) {
        const memories = await this.mdAdapter.readCategory(cat);
        const embeddingsMap = new Map<string, Float32Array>();

        if (embedder) {
          for (const mem of memories) {
            try {
              const vec = await embedder.embed(mem.content);
              embeddingsMap.set(mem.id, vec);
            } catch {}
          }
        }

        catCache = { mtimeMs: stat.mtimeMs, embeddings: embeddingsMap };
        this.mdEmbedCache.set(cat, catCache);
      }

      const catMemories = await this.mdAdapter.readCategory(cat);
      allMemories.push(...catMemories);
    }

    let filtered = allMemories;

    if (query.text && embedder) {
      try {
        const queryVec = await embedder.embedQuery(query.text);
        const textLower = query.text.toLowerCase();
        for (const m of filtered) {
          const catCache = this.mdEmbedCache.get(m.category);
          const mVec = catCache?.embeddings.get(m.id);
          if (mVec) {
            m.score = dotProduct(queryVec, mVec);
          } else {
            m.score = 0;
          }
        }
        filtered = filtered.filter(m => (m.score ?? 0) > 0 || m.content.toLowerCase().includes(textLower) || m.tags.some(t => t.toLowerCase().includes(textLower)));
        filtered.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
      } catch {
        const textLower = query.text.toLowerCase();
        filtered = filtered.filter(m => m.content.toLowerCase().includes(textLower) || m.tags.some(t => t.toLowerCase().includes(textLower)));
      }
    } else if (query.text) {
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
