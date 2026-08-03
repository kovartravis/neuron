import { NeuronMemory } from '../index.js';
import { MdStorageAdapter } from './mdStorageAdapter.js';
import { NeuronConfig } from '../config/neuronYaml.js';
import { Memory, MemoryMutation, MemoryQuery, MutationResult } from '../models/memory.js';
import { computeMemoryHash } from './mdVectorSync.js';

const MD_SEEDED_AT_KEY = 'md_seeded_at';
const RECONCILE_QUERY_LIMIT = 1_000_000;

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

    if (mode === 'vector-only') {
      return this.vectorDb.transact(mutations);
    }

    if (mode === 'split') {
      await this.reconcile(this.mdCategoriesForSplit());
      const results: MutationResult[] = [];
      for (const m of mutations) {
        const cat = m.category ?? m.kind ?? 'learning';
        // Per-category vocabulary got the same rename treatment as the
        // top-level modes (ticket 29 item 7): 'vector' is vector-only, and
        // 'md' (the default) now means markdown-first-with-vector-index —
        // what 'dual' used to mean. There is no more "pure markdown, no
        // vector row ever" option at the category level, matching the
        // top-level dissolution of `md-only`.
        const catStorage = this.config?.categories?.[cat]?.storage || 'md';
        if (catStorage === 'vector') {
          results.push(...(await this.vectorDb.transact([m])));
        } else {
          results.push(...(await this.transactMdMutation(m)));
        }
      }
      return results;
    }

    if (mode === 'md') {
      await this.reconcile(this.allCategories());
      const results: MutationResult[] = [];
      for (const m of mutations) {
        results.push(...(await this.transactMdMutation(m)));
      }
      return results;
    }

    // Default fallback
    return this.vectorDb.transact(mutations);
  }

  /**
   * Markdown-first write ordering (ADR 0011 Consequence 2): the markdown
   * write happens first, and on `upsert` the vector embed is only attempted
   * once it has succeeded — markdown can never be behind, so the index can
   * only ever be missing something a human deleted, never holding something
   * markdown never had. A vector-side failure no longer disappears into a
   * bare `catch {}`; it is reported to stderr and left for the next
   * command's reconcile pass to repair, rather than blocking a write whose
   * record of truth (markdown) already landed.
   */
  private async transactMdMutation(m: MemoryMutation): Promise<MutationResult[]> {
    const category = m.category ?? m.kind ?? 'learning';
    try {
      if (m.op === 'upsert') {
        const mdEntry = await this.mdAdapter.writeEntry(category, {
          id: m.id,
          content: m.content || '',
          tags: m.tags || [],
          importance: m.importance,
          taskId: m.taskId,
        });

        let status = 'created';
        try {
          const vecRes = await this.vectorDb.transact([{ ...m, id: mdEntry.id, category }]);
          status = vecRes[0]?.status || 'created';
        } catch (err) {
          this.warnVectorDrift(mdEntry.id, err);
        }
        return [{ id: mdEntry.id, status, project: 'neuron' }];
      }

      if (m.op === 'update') {
        // Report success if EITHER store actually changed. The two can
        // diverge (a prior write that landed on only one side, a manual
        // .md edit not yet reconciled), and reporting only the md outcome
        // meant a vector-side update could succeed while the caller was
        // told 'not_found' — a false negative on data that did change.
        let mdUpdated = true;
        try {
          await this.mdAdapter.updateEntry(category, {
            id: m.id,
            content: m.content,
            tags: m.tags,
            importance: m.importance,
            taskId: m.taskId,
          });
        } catch {
          mdUpdated = false;
        }

        let vecStatus: string | undefined;
        try {
          const vecRes = await this.vectorDb.transact([m]);
          vecStatus = vecRes[0]?.status;
        } catch (err) {
          this.warnVectorDrift(m.id, err);
        }

        return [{
          id: m.id,
          status: mdUpdated || vecStatus === 'updated' ? 'updated' : 'not_found',
          project: 'neuron',
        }];
      }

      // delete — same either-store-changed reporting as update, above.
      let mdDeleted = false;
      try {
        mdDeleted = await this.mdAdapter.deleteEntry(category, m.id);
      } catch {}

      let vecDeleted = false;
      try {
        const vecRes = await this.vectorDb.transact([m]);
        vecDeleted = vecRes[0]?.status === 'deleted';
      } catch (err) {
        this.warnVectorDrift(m.id, err);
      }

      return [{
        id: m.id,
        status: mdDeleted || vecDeleted ? 'deleted' : 'not_found',
        project: 'neuron',
      }];
    } catch (err) {
      // Error isolation for disk failures on the markdown write itself.
      return [{ id: (m as any).id || 'error', status: 'error', project: 'neuron' }];
    }
  }

  private warnVectorDrift(id: string, err: unknown): void {
    const reason = err instanceof Error ? err.message : String(err);
    process.stderr.write(
      `[neuron warning] vector index write failed for entry ${id}: ${reason} — will reconcile from markdown on next command.\n`
    );
  }

  /**
   * `md` and `split` both retrieve through the same hybrid RRF path as
   * `vector-only` — a category's per-category storage designation only ever
   * affected the *write* side (whether markdown is also written), never
   * retrieval, so there is nothing left to dispatch on here. This is what
   * "retrieval parity by construction" (ADR 0011 §6) means concretely: the
   * ~80-line markdown-side substring matcher `md-only` used is deleted with
   * the mode, not repaired, and the split-mode query dispatch that used to
   * (mis-)branch on per-category storage is gone rather than fixed, because
   * both branches converged to the same call.
   */
  public async query(query: MemoryQuery): Promise<Memory[]> {
    const mode = this.getStorageMode();
    if (mode === 'md') {
      await this.reconcile(this.allCategories());
    } else if (mode === 'split') {
      await this.reconcile(this.mdCategoriesForSplit());
    }
    return this.vectorDb.query(query);
  }

  private getStorageMode(): string {
    const validModes = ['vector-only', 'md', 'split'];
    const mode = this.config?.storage?.mode;
    if (mode && validModes.includes(mode)) {
      return mode;
    }
    return 'vector-only';
  }

  private allCategories(): string[] {
    return Object.keys(this.config?.categories || {});
  }

  private mdCategoriesForSplit(): string[] {
    return this.allCategories().filter(
      cat => (this.config?.categories?.[cat]?.storage || 'md') !== 'vector'
    );
  }

  /**
   * Reconcile-on-every-command (ADR 0011 Consequence 2 & 3): markdown is the
   * store of record, so the vector index is kept current against it rather
   * than the other way round.
   *
   * The first call ever seeds markdown from a populated vector store instead
   * of running the mirror — otherwise "not seeded yet" and "a human deleted
   * everything" would be the same observable state, and a strict mirror would
   * turn that ambiguity into data loss. `meta.md_seeded_at` is the marker;
   * once it exists, every later call is a normal mirror even if markdown is
   * empty again — emptiness after seeding is a real deletion, not un-seeded
   * state.
   *
   * After seeding, per category: an entry present in markdown but missing or
   * content-changed in the vector index is (re-)embedded — markdown always
   * wins, there is no conflict to report, because markdown is authoritative
   * by construction. An entry present in the vector index but absent from
   * markdown is deleted — no tripwire, no `--force` (ADR 0011 Consequence 2);
   * `.neuron/` is a tracked, git-recoverable directory, so this mirrors how
   * source files already work.
   */
  private async reconcile(categories: string[]): Promise<void> {
    if (categories.length === 0) return;

    if (this.vectorDb.getMeta(MD_SEEDED_AT_KEY) === null) {
      await this.bootstrapSeed(categories);
      return;
    }

    for (const category of categories) {
      await this.reconcileCategory(category);
    }
  }

  private async bootstrapSeed(categories: string[]): Promise<void> {
    for (const category of categories) {
      const vecEntries = await this.vectorDb.query({ categories: [category], limit: RECONCILE_QUERY_LIMIT });
      for (const entry of vecEntries) {
        await this.mdAdapter.writeEntry(category, {
          id: entry.id,
          content: entry.content,
          tags: entry.tags,
          importance: entry.importance,
          taskId: entry.taskId ?? undefined,
          createdAt: entry.createdAt,
        });
      }
    }
    this.vectorDb.setMeta(MD_SEEDED_AT_KEY, new Date().toISOString());
  }

  private async reconcileCategory(category: string): Promise<void> {
    const mdEntries = await this.mdAdapter.readCategory(category);
    const vecEntries = await this.vectorDb.query({ categories: [category], limit: RECONCILE_QUERY_LIMIT });

    const mdMap = new Map(mdEntries.map(m => [m.id, m]));
    const vecMap = new Map(vecEntries.map(m => [m.id, m]));

    for (const [id, mdEntry] of mdMap) {
      const vecEntry = vecMap.get(id);
      if (vecEntry && computeMemoryHash(vecEntry) === computeMemoryHash(mdEntry)) {
        continue; // unchanged — this is the ~0.006ms-per-entry case
      }
      try {
        await this.vectorDb.transact([{
          op: 'upsert',
          category,
          id,
          content: mdEntry.content,
          tags: mdEntry.tags,
          importance: mdEntry.importance,
          taskId: mdEntry.taskId ?? undefined,
          createdAt: mdEntry.createdAt,
        }]);
      } catch (err) {
        this.warnVectorDrift(id, err);
      }
    }

    for (const id of vecMap.keys()) {
      if (mdMap.has(id)) continue;
      try {
        await this.vectorDb.transact([{ op: 'delete', category, id }]);
      } catch (err) {
        this.warnVectorDrift(id, err);
      }
    }
  }
}

export default DualStorageRouter;
