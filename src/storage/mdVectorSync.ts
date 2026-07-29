import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { NeuronMemory } from '../index.js';
import { MdStorageAdapter } from './mdStorageAdapter.js';
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
}

export function computeMemoryHash(memory: Memory): string {
  const content = (memory.content || '').trim();
  const tags = (memory.tags || []).join(',');
  const scope = memory.scope || 'project';
  const importance = memory.importance ?? 3;
  const taskId = memory.taskId || '';
  const payload = `${content}|${tags}|${scope}|${importance}|${taskId}`;
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

export async function syncMdWithVector(
  vectorDb: NeuronMemory,
  mdAdapter: MdStorageAdapter,
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
  };

  // Clean up any orphaned .tmp files in storage path
  cleanTmpFiles(mdAdapter.storagePath);

  await mdAdapter.ensureScaffolded(categories);

  for (const category of categories) {
    try {
      const rawMdMemories = await mdAdapter.readCategory(category);

      // Handle duplicate entry IDs in markdown file
      const seenIds = new Set<string>();
      const mdMemories: Memory[] = [];
      for (const m of rawMdMemories) {
        if (seenIds.has(m.id)) {
          result.errors.push({ category, id: m.id, error: `Duplicate entry ID "${m.id}" found in ${category}.md; retaining latest entry.` });
        } else {
          seenIds.add(m.id);
          mdMemories.push(m);
        }
      }

      let dbMemories: Memory[] = [];
      try {
        dbMemories = await vectorDb.query({ categories: [category], limit: 10000 });
      } catch (err: any) {
        result.errors.push({ category, error: `Database query error: ${err.message}` });
        continue;
      }

      const mdMap = new Map<string, Memory>(mdMemories.map(m => [m.id, m]));
      const dbMap = new Map<string, Memory>(dbMemories.map(m => [m.id, m]));

      // 1. Sync Markdown -> Vector DB
      for (const [id, mdEntry] of mdMap.entries()) {
        const dbEntry = dbMap.get(id);
        const mdHash = computeMemoryHash(mdEntry);

        if (!dbEntry) {
          if (dryRun) {
            result.syncedToVector++;
          } else {
            await vectorDb.transact([{
              op: 'upsert',
              category,
              id: mdEntry.id,
              content: mdEntry.content,
              tags: mdEntry.tags,
              importance: mdEntry.importance ?? 3,
              scope: mdEntry.scope ?? 'project',
              taskId: mdEntry.taskId ?? undefined,
              createdAt: mdEntry.createdAt,
            }]);
            result.syncedToVector++;
          }
        } else {
          const dbHash = computeMemoryHash(dbEntry);
          if (force || mdHash !== dbHash) {
            const mdTime = new Date(mdEntry.createdAt || 0).getTime();
            const dbTime = new Date(dbEntry.createdAt || 0).getTime();

            if (mdTime >= dbTime || force) {
              if (dryRun) {
                result.syncedToVector++;
              } else {
                await vectorDb.transact([{
                  op: 'upsert',
                  category,
                  id: mdEntry.id,
                  content: mdEntry.content,
                  tags: mdEntry.tags,
                  importance: mdEntry.importance ?? 3,
                  scope: mdEntry.scope ?? 'project',
                  taskId: mdEntry.taskId ?? undefined,
                  createdAt: mdEntry.createdAt,
                }]);
                result.syncedToVector++;
              }
            } else {
              if (dryRun) {
                result.syncedToMarkdown++;
              } else {
                await mdAdapter.writeEntry(category, {
                  ...dbEntry,
                  importance: dbEntry.importance ?? 3,
                  scope: dbEntry.scope ?? 'project',
                });
                result.syncedToMarkdown++;
              }
            }
          } else {
            result.skipped++;
          }
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
              scope: dbEntry.scope ?? 'project',
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
