import fs from 'node:fs';
import { NeuronMemory } from '../index.js';
import { MdStorage } from './mdStorage.js';
import { NeuronConfig } from '../config/neuronYaml.js';
import { resolveCategoryPath } from '../config/categoryPath.js';
import { Memory, MemoryMutation, MemoryQuery, MutationResult } from '../models/memory.js';
import { computeMemoryHash } from './mdVectorSync.js';

const MD_SEEDED_AT_KEY = 'md_seeded_at';
const RECONCILE_QUERY_LIMIT = 1_000_000;
const categoryRootMetaKey = (category: string) => `md_root:${category}`;
// Below this many existing rows, a large deleted fraction is unremarkable
// (deleting 2 of 3 rows is a normal small edit, not a signal of anything).
const MASS_DELETE_MIN_ROWS = 5;
// Ticket 38: a stray `---` in one entry's body once made the markdown parser
// undercount a category by ~38% and silently mass-deleted the vector mirror
// to match. The parser bug is fixed at its root, but ADR 0011 Consequence 2
// deliberately keeps this deletion tripwire-free and `--force`-free — `.neuron/`
// is git-recoverable, so a real bulk deletion (the user meant it) must not be
// blocked. This threshold only makes an unusually large deletion loud, the
// same "degrade loudly instead of silently" ask neuron-2.3.0 ticket 38 raised, without
// reopening the settled "no tripwire" ruling.
const MASS_DELETE_WARN_FRACTION = 0.2;

export class DualStorageRouter {
  private vectorDb: NeuronMemory;
  private mdAdapter: MdStorage;
  private config: NeuronConfig;
  private projectRoot: string;
  private staleVectorWarningsChecked = new Set<string>();

  constructor(vectorDb: NeuronMemory, mdAdapter: MdStorage, config: NeuronConfig, projectRoot: string = process.cwd()) {
    this.vectorDb = vectorDb;
    this.mdAdapter = mdAdapter;
    this.config = config;
    this.projectRoot = projectRoot;
  }

  public setConfig(config: NeuronConfig): void {
    this.config = config;
  }

  /**
   * Ticket 06 (neuron-2.3.0) collapsed the old three-way `vector-only` /
   * `split` / `md` dispatch into one always-live per-category resolution —
   * `resolveCategoryStorage` decides each mutation's category individually,
   * and `mdCategories()` (the subset that resolves to `md`) is what gets
   * reconciled first. A pure-vector config (no category resolves to `md`)
   * reconciles an empty list, which `reconcile()` short-circuits on
   * immediately — the same zero-cost path the old `vector-only` branch's
   * direct `vectorDb.transact` call gave, just reached without a special case.
   */
  public async transact(mutations: MemoryMutation[]): Promise<MutationResult[]> {
    await this.warnStaleVectorCategories();
    await this.reconcile(this.mdCategories());
    const results: MutationResult[] = [];
    for (const m of mutations) {
      const cat = m.category ?? 'learning';
      if (this.resolveCategoryStorage(cat) === 'vector') {
        results.push(...(await this.vectorDb.transact([m])));
      } else {
        results.push(...(await this.transactMdMutation(m)));
      }
    }
    return results;
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
    const category = m.category ?? 'learning';
    try {
      if (m.op === 'upsert') {
        const mdEntry = await this.mdAdapter.writeEntry(category, {
          id: m.id,
          content: m.content || '',
          tags: m.tags || [],
          importance: m.importance,
          taskId: m.taskId,
          fields: m.fields,
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
            fields: m.fields,
            supersededBy: m.supersededBy,
            supersededAt: m.supersededAt,
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
      // Error isolation for disk failures on the markdown write itself. This
      // became a reachable path for ordinary users when `md` became the default
      // (ticket 31) — a read-only checkout or an unwritable `storage.path` now
      // fails the write, where a `vector-only` default could not. `status:
      // 'error'` alone gives the user nothing to act on, so the reason goes to
      // stderr the same way vector-side drift does.
      const reason = err instanceof Error ? err.message : String(err);
      process.stderr.write(
        `[neuron warning] markdown write failed for category ${category}: ${reason} — nothing was recorded.\n`
      );
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
   * Every category retrieves through the same hybrid RRF path regardless of
   * its resolved storage — a category's storage designation only ever
   * affects the *write* side (whether markdown is also written), never
   * retrieval, so there is nothing left to dispatch on here. This is what
   * "retrieval parity by construction" (ADR 0011 §6) means concretely: the
   * ~80-line markdown-side substring matcher `md-only` used was deleted with
   * that mode, not repaired, and ticket 06 deleted the `split`-mode query
   * dispatch that used to (mis-)branch on per-category storage rather than
   * fixing it, because both branches converged to the same call.
   */
  public async query(query: MemoryQuery): Promise<Memory[]> {
    await this.warnStaleVectorCategories();
    await this.reconcile(this.mdCategories());
    return this.vectorDb.query(query);
  }

  /**
   * The *schema* default is `md` (ticket 31), but this fallback deliberately
   * stays `vector` and is not a duplicate of it. It fires only when the
   * config reaching this router carries a mode the router does not recognise —
   * i.e. something that bypassed Zod, which is the one case where we know
   * nothing about the caller's intent. `md` runs a strict mirror that deletes
   * index entries absent from markdown, so guessing `md` on an unparseable
   * config would turn "I don't understand this setting" into data loss.
   * Falling back to the read-only-safe mode is the correct failure direction.
   */
  private getTopLevelStorageMode(): 'md' | 'vector' {
    const validModes = ['md', 'vector'];
    const mode = this.config?.storage?.mode;
    if (mode && validModes.includes(mode)) {
      return mode as 'md' | 'vector';
    }
    return 'vector';
  }

  /**
   * Ticket 06's always-live precedence: `categories.<name>.storage >
   * storage.mode > 'md'`. Before this ticket the per-category value was
   * inert except under the now-deleted `split` mode; every top-level mode
   * now defers to it the same way `split` used to.
   */
  private resolveCategoryStorage(category: string): 'md' | 'vector' {
    const override = this.config?.categories?.[category]?.storage;
    if (override === 'md' || override === 'vector') {
      return override;
    }
    return this.getTopLevelStorageMode();
  }

  private allCategories(): string[] {
    return Object.keys(this.config?.categories || {});
  }

  private mdCategories(): string[] {
    return this.allCategories().filter(cat => this.resolveCategoryStorage(cat) === 'md');
  }

  /**
   * Ticket 06 grilling ruling: making the per-category override always live
   * is a silent behaviour change for a config that already has real markdown
   * for a category whose resolved storage now flips to `vector` (e.g. a
   * `categories.foo.storage: vector` that used to be ignored under
   * `storage.mode: md`). Nothing is deleted — the category simply drops out
   * of `mdCategories()`, so its `.md` file just stops being written — but the
   * file silently goes stale, which is worth disclosing even though it isn't
   * worth blocking. Checked once per process (mirroring every other
   * deprecated-spelling warning's granularity in this file) against real
   * entries, not bare file existence, so a freshly-scaffolded empty file
   * doesn't trigger a false warning.
   */
  private async warnStaleVectorCategories(): Promise<void> {
    for (const category of this.allCategories()) {
      if (this.staleVectorWarningsChecked.has(category)) continue;
      // Only a category currently resolving to `vector` is marked as
      // checked — one that resolves to `md` right now must stay eligible
      // for a *later* check, since `setConfig` (or an edited `neuron.yaml`
      // on the next process) can still flip it to `vector` afterward. A
      // category that already resolves to `vector` can only ever gain
      // markdown content by resolving to `md` first, so it is safe to never
      // look at again once seen here.
      if (this.resolveCategoryStorage(category) !== 'vector') continue;
      this.staleVectorWarningsChecked.add(category);

      const filePath = this.mdAdapter.getFilePath(category);
      if (!fs.existsSync(filePath)) continue;
      const entries = await this.mdAdapter.readCategory(category);
      if (entries.length === 0) continue;
      process.stderr.write(
        `[neuron warning] categories.${category} now resolves to "vector" storage, but "${filePath}" ` +
          `already holds ${entries.length} entr${entries.length === 1 ? 'y' : 'ies'} — it will no longer be kept ` +
          `in sync and its contents are now stale. Remove it manually if it's no longer needed.\n`
      );
    }
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
   * source files already work. An unusually large single-pass deletion still
   * logs a loud warning (neuron-2.3.0 ticket 38) — visibility, not a block, so a future
   * parser bug that undercounts markdown degrades loudly instead of silently.
   */
  private async reconcile(categories: string[]): Promise<void> {
    if (categories.length === 0) return;

    if (this.vectorDb.getMeta(MD_SEEDED_AT_KEY) === null) {
      await this.bootstrapSeed(categories);
      return;
    }

    for (const category of categories) {
      await this.reconcileCategoryWithPathGuard(category);
    }
  }

  /**
   * A category's resolved root (ticket 05: `categories.<name>.path >
   * storage.path > '.neuron'`) can change between runs — someone edits
   * `neuron.yaml`. The strict mirror below deletes any vector row whose id
   * isn't found in the markdown it reads, so reconciling against the *new*
   * root when the file actually still lives at the *old* one would read as
   * "markdown is now empty" and delete the category's index rows — a
   * category-scoped repeat of the exact "not seeded yet" vs. "a human
   * deleted everything" ambiguity `bootstrapSeed`'s own `md_seeded_at` guard
   * already exists to prevent (see the class doc above `reconcile`).
   *
   * `md_root:<category>` is the per-category counterpart of that guard: the
   * last resolved root this router reconciled that category against. Both a
   * first-ever sighting *and* a changed root re-export that one category
   * from the vector index (authoritative here, the same source
   * `bootstrapSeed` reads from) into its resolved location instead of running
   * the destructive mirror, then record the root and return — the next call
   * reconciles normally.
   *
   * The first-ever-sighting branch used to just record the root and fall
   * through to the destructive mirror, on the reasoning that "nothing to
   * compare against yet" meant nothing needed reseeding — true only as long
   * as every category reaching this method had already been reconciled at
   * least once before (ticket 05's world, where `md`/`split` mode's category
   * set never changed shape between runs). Ticket 06 (neuron-2.3.0) broke
   * that assumption: making the per-category storage override always live
   * means a category can enter `mdCategories()` for the first time on a
   * store that already has real vector rows for it — e.g. an existing
   * `storage.mode: md` config where `categories.foo.storage: vector` used to
   * be silently ignored and now takes effect the *other* way once it's
   * removed, or simply a category whose override changes from `vector` to
   * `md`. Falling through to `reconcileCategory` in that case would read the
   * category's never-before-written `.md` file as empty and delete every one
   * of its vector rows as "absent from markdown" — real, silent data loss,
   * not the "nothing to reseed" case the old comment assumed. Reseeding
   * first-ever sightings the same as root changes closes that window; for a
   * genuinely brand-new category (nothing in either store yet) it is a
   * harmless zero-row export.
   */
  private async reconcileCategoryWithPathGuard(category: string): Promise<void> {
    const resolvedRoot = resolveCategoryPath(this.config, category, this.projectRoot);
    const metaKey = categoryRootMetaKey(category);
    const knownRoot = this.vectorDb.getMeta(metaKey);

    if (knownRoot === null || knownRoot !== resolvedRoot) {
      await this.seedCategoryFromVector(category);
      this.vectorDb.setMeta(metaKey, resolvedRoot);
      return;
    }

    await this.reconcileCategory(category);
  }

  /**
   * The seed exports **every category the index holds**, not just the declared
   * ones it was asked to reconcile. Nothing validates `--category` against
   * `neuron.yaml`, so a store routinely holds undeclared categories —
   * `neuron scan` writes into `architecture`, which `scan.category` defaults to
   * but the config template need not declare.
   *
   * Seeding only the declared set looks harmless (the mirror never visits an
   * undeclared category, so nothing is deleted) right up until someone declares
   * it. Then the mirror visits a category whose markdown was never written,
   * finds the index holding rows markdown does not, and deletes them — exactly
   * as designed, on data the seed skipped. Measured: 1 of 2 entries destroyed,
   * silently, on the `vector-only` → `md` → declare-`architecture` path that
   * ticket 31's default flip puts every upgrading user on.
   *
   * A seed is a one-time complete export or it is not a safety net, so it takes
   * the union. Steady-state reconcile still runs on the declared set only —
   * that is a per-command cost, and an undeclared category is inert there.
   */
  private async bootstrapSeed(requested: string[]): Promise<void> {
    const categories = [...new Set([...requested, ...this.vectorDb.listStoredCategories()])];
    for (const category of categories) {
      await this.seedCategoryFromVector(category);
      // A category the seed just exported is, by construction, current as of
      // right now — record its root so the very next reconcile doesn't read
      // "no prior root on file" as a change to guard against.
      this.vectorDb.setMeta(categoryRootMetaKey(category), resolveCategoryPath(this.config, category, this.projectRoot));
    }
    this.vectorDb.setMeta(MD_SEEDED_AT_KEY, new Date().toISOString());
  }

  /**
   * Exports one category's live vector rows into markdown at its currently
   * resolved root. Shared by `bootstrapSeed` (the whole-store first run) and
   * `reconcileCategoryWithPathGuard` (a single category's root changing
   * later) — both are "markdown doesn't reflect this category yet, and the
   * vector index is the trustworthy source to rebuild it from" the same way.
   */
  private async seedCategoryFromVector(category: string): Promise<void> {
    // `includeSuperseded: true` — this is a store-management read, not a
    // retrieval one; a superseded row must seed into markdown too, or the
    // seed silently drops it the way ticket 31's undeclared-category bug
    // once dropped rows the mirror never visited (see the comment above).
    const vecEntries = await this.vectorDb.query({ categories: [category], limit: RECONCILE_QUERY_LIMIT, includeSuperseded: true });
    for (const entry of vecEntries) {
      await this.mdAdapter.writeEntry(category, {
        id: entry.id,
        content: entry.content,
        tags: entry.tags,
        importance: entry.importance,
        taskId: entry.taskId ?? undefined,
        createdAt: entry.createdAt,
        supersededBy: entry.supersededBy,
        supersededAt: entry.supersededAt,
        fields: entry.fields,
      });
    }
  }

  private async reconcileCategory(category: string): Promise<void> {
    const mdEntries = await this.mdAdapter.readCategory(category);
    // `includeSuperseded: true` for the same reason as `bootstrapSeed`: the
    // mirror must see a superseded row on either side, or it either deletes
    // a hand-marked vector row it can no longer see (mdMap still has it,
    // vecMap silently wouldn't) or never pushes a hand-marked markdown edit
    // into the index (see the `superseded_by` addition to `computeMemoryHash`
    // below, which is what makes the latter case detected at all).
    const vecEntries = await this.vectorDb.query({ categories: [category], limit: RECONCILE_QUERY_LIMIT, includeSuperseded: true });

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
          supersededBy: mdEntry.supersededBy,
          supersededAt: mdEntry.supersededAt,
          fields: mdEntry.fields,
        }]);
      } catch (err) {
        this.warnVectorDrift(id, err);
      }
    }

    const idsToDelete = [...vecMap.keys()].filter(id => !mdMap.has(id));
    if (
      vecMap.size >= MASS_DELETE_MIN_ROWS
      && idsToDelete.length / vecMap.size >= MASS_DELETE_WARN_FRACTION
    ) {
      process.stderr.write(
        `[neuron warning] reconcile is about to delete ${idsToDelete.length} of ${vecMap.size} vector rows ` +
          `in category "${category}" — markdown only has ${mdMap.size}. Deletion still proceeds (markdown is ` +
          `authoritative and ".neuron/" is git-recoverable), but a drop this large is unusual: confirm this ` +
          `reflects an intentional bulk edit to the markdown file, not a parse failure undercounting it.\n`
      );
    }

    for (const id of idsToDelete) {
      try {
        await this.vectorDb.transact([{ op: 'delete', category, id }]);
      } catch (err) {
        this.warnVectorDrift(id, err);
      }
    }
  }
}

export default DualStorageRouter;
