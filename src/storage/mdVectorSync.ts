import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { NeuronMemory } from '../index.js';
import { MdStorage } from './mdStorage.js';
import { NeuronConfig } from '../config/neuronYaml.js';
import { Memory } from '../models/memory.js';

export interface SyncOptions {
  dryRun?: boolean;
  force?: boolean;
  categories?: string[];
}

export interface SyncResult {
  syncedToVector: number;
  syncedToMarkdown: number;
  skipped: number;
  categoriesProcessed: string[];
  errors: Array<{ category: string; id?: string; error: string }>;
  /**
   * Entries present on both sides with genuinely different content, left
   * untouched. Neither store has a reliable last-modified signal — `.md`
   * frontmatter has no `updatedAt`, and a normal `memory update` never
   * touches `createdAt` on either side — so there is no safe way to guess
   * which side is fresher. Guessing here is what caused a real regression:
   * a legitimate vector-side update silently reverted to stale markdown
   * content because their (unchanged, identical) `createdAt` values tied.
   * Resolve explicitly with `--force` (markdown wins, matching its
   * documented "force re-embed" semantics) after inspecting the conflict.
   */
  conflicts: Array<{ category: string; id: string }>;
}

export function computeMemoryHash(memory: Memory): string {
  const content = (memory.content || '').trim();
  const tags = (memory.tags || []).join(',');
  const importance = memory.importance ?? 3;
  const taskId = memory.taskId || '';
  // `supersededBy` is included (ticket 17 / ADR 0015) so a hand-edit that
  // only adds a supersession mark — e.g. the two known-reversed pairs this
  // repo's own store hand-fixes — is detected as a change and reconciled,
  // not silently skipped because content/tags/importance/taskId are
  // otherwise unchanged. `supersededAt` is deliberately left out: it never
  // changes independently of `supersededBy`.
  const supersededBy = memory.supersededBy || '';
  const payload = `${content}|${tags}|${importance}|${taskId}|${supersededBy}`;
  return crypto.createHash('sha256').update(payload).digest('hex');
}

export function cleanTmpFiles(storagePath: string): number {
  if (!fs.existsSync(storagePath)) return 0;
  let count = 0;
  const files = fs.readdirSync(storagePath);
  for (const file of files) {
    if (file.includes('.tmp.')) {
      try {
        fs.unlinkSync(path.join(storagePath, file));
        count++;
      } catch {
        // ignore unlink error
      }
    }
  }
  return count;
}

/** `cleanTmpFiles` across every root an `MdStorage` currently writes into (ticket 05). */
export function cleanAllTmpFiles(mdAdapter: MdStorage): number {
  let count = 0;
  for (const root of mdAdapter.listRoots()) {
    count += cleanTmpFiles(root);
  }
  return count;
}

export async function syncMdWithVector(
  vectorDb: NeuronMemory,
  mdAdapter: MdStorage,
  config: NeuronConfig,
  options?: SyncOptions
): Promise<SyncResult> {
  const dryRun = options?.dryRun ?? false;
  const force = options?.force ?? false;

  const configuredCategories = Object.keys(config?.categories || {});
  const categories = options?.categories && options.categories.length > 0
    ? options.categories
    : (configuredCategories.length > 0 ? configuredCategories : ['learning', 'history', 'decisions']);

  const result: SyncResult = {
    syncedToVector: 0,
    syncedToMarkdown: 0,
    skipped: 0,
    categoriesProcessed: [...categories],
    errors: [],
    conflicts: [],
  };

  // Clean up any orphaned .tmp files across every root this sync touches
  cleanAllTmpFiles(mdAdapter);

  await mdAdapter.ensureScaffolded(categories);

  for (const category of categories) {
    try {
      // Duplicate or malformed frontmatter is refused by MdStorageAdapter
      // itself (ADR 0011 Consequence 4), so a category with a duplicate id
      // fails this category's sync outright via the catch below rather than
      // silently picking a winner here.
      const mdMemories = await mdAdapter.readCategory(category);

      let dbMemories: Memory[] = [];
      try {
        // `includeSuperseded: true` — this is a store-management sync, not a
        // retrieval read, so it must see superseded rows on the vector side
        // too, or they look absent from `dbMap` and get treated as "only in
        // markdown" / re-created (ticket 17 / ADR 0015).
        dbMemories = await vectorDb.query({ categories: [category], limit: 10000, includeSuperseded: true });
      } catch (err: any) {
        result.errors.push({ category, error: `Database query error: ${err.message}` });
        continue;
      }

      const mdMap = new Map<string, Memory>(mdMemories.map(m => [m.id, m]));
      const dbMap = new Map<string, Memory>(dbMemories.map(m => [m.id, m]));

      const pushMdToVector = async (mdEntry: Memory): Promise<void> => {
        // `vectorDb.transact` is the real `NeuronMemory.transact()` here, so
        // it runs the ticket-43 field-schema enforcement — an existing
        // entry's already-satisfied required fields must travel with it, or
        // a category with a required field would fail to sync an entry that
        // was perfectly valid when it was written.
        await vectorDb.transact([{
          op: 'upsert',
          category,
          id: mdEntry.id,
          content: mdEntry.content,
          tags: mdEntry.tags,
          importance: mdEntry.importance ?? 3,
          taskId: mdEntry.taskId ?? undefined,
          createdAt: mdEntry.createdAt,
          supersededBy: mdEntry.supersededBy,
          supersededAt: mdEntry.supersededAt,
          fields: mdEntry.fields,
        }]);
      };

      // 1. Sync Markdown -> Vector DB
      for (const [id, mdEntry] of mdMap.entries()) {
        const dbEntry = dbMap.get(id);

        if (!dbEntry) {
          // Unambiguous: exists only in markdown, nothing to conflict with.
          if (dryRun) {
            result.syncedToVector++;
          } else {
            await pushMdToVector(mdEntry);
            result.syncedToVector++;
          }
          continue;
        }

        const mdHash = computeMemoryHash(mdEntry);
        const dbHash = computeMemoryHash(dbEntry);

        if (mdHash === dbHash && !force) {
          result.skipped++;
        } else if (force) {
          // Explicit and deliberate: --force means "markdown is
          // authoritative, re-embed it" per its documented semantics. This
          // is the only side-picking path — there is no equivalent
          // "vector wins" flag, so leaving a conflict unresolved (below)
          // is the safe default and vector's own data is left untouched
          // either way.
          if (dryRun) {
            result.syncedToVector++;
          } else {
            await pushMdToVector(mdEntry);
            result.syncedToVector++;
          }
        } else {
          // Genuine conflict: both sides hold the entry with different
          // content, and neither store carries a reliable last-modified
          // signal to break the tie safely — `.md` frontmatter has no
          // `updatedAt`, and a normal `memory update` never touches
          // `createdAt`. Guessing here (by comparing createdAt) is what
          // caused a real content-loss regression: a legitimate vector-side
          // update was silently reverted to stale markdown content because
          // their untouched createdAt values tied. Report it; touch neither
          // side. Re-run with --force to make markdown win explicitly.
          result.conflicts.push({ category, id });
        }
      }

      // 2. Sync Vector DB -> Markdown
      for (const [id, dbEntry] of dbMap.entries()) {
        if (!mdMap.has(id)) {
          if (dryRun) {
            result.syncedToMarkdown++;
          } else {
            await mdAdapter.writeEntry(category, {
              ...dbEntry,
              importance: dbEntry.importance ?? 3,
            });
            result.syncedToMarkdown++;
          }
        }
      }
    } catch (err: any) {
      result.errors.push({ category, error: err.message || String(err) });
    }
  }

  return result;
}
