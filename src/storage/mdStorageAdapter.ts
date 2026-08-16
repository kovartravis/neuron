import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';
import { Memory } from '../models/memory.js';
import { MdStorage } from './mdStorage.js';

export interface MdStorageAdapterOptions {
  storagePath?: string;
}

/**
 * The same category → filename sanitization `getFilePath` applies, exported
 * so config-time collision validation (ticket 05, `validateNeuronYaml`) can
 * predict which file two categories would collide on without constructing an
 * adapter.
 */
export function sanitizeCategoryFilename(category: string): string {
  return path.basename(category).replace(/[^a-zA-Z0-9_-]/g, '_');
}

/**
 * Frontmatter keys with dedicated `Memory` fields — the structural (`id`,
 * `createdAt`) and semantic-reserved (`importance`, `tags`, `taskId`) tiers
 * from ADR 0013. `scope` is a residue of a field removed in v2.2.0 (ticket
 * 38), kept here so it stays silently dropped rather than round-tripping
 * into `fields`. Everything else found in a frontmatter block is a
 * user-defined declared field (ticket 43) and is read into `Memory.fields`.
 */
const RESERVED_FRONTMATTER_KEYS = new Set(['id', 'createdAt', 'importance', 'tags', 'taskId', 'scope', 'supersededBy', 'supersededAt']);

export class MdStorageAdapter implements MdStorage {
  readonly storagePath: string;

  constructor(options?: string | MdStorageAdapterOptions) {
    if (typeof options === 'string') {
      this.storagePath = path.resolve(options);
    } else if (options && options.storagePath) {
      this.storagePath = path.resolve(options.storagePath);
    } else {
      this.storagePath = path.resolve('.neuron');
    }
  }

  /**
   * Returns the file path for a given category markdown file.
   * Prevents path traversal out of storagePath.
   */
  getFilePath(category: string): string {
    return path.join(this.storagePath, `${sanitizeCategoryFilename(category)}.md`);
  }

  /** This adapter only ever writes into its own single root. */
  listRoots(): string[] {
    return [this.storagePath];
  }

  /**
   * Auto-scaffolds missing storage directory and category files.
   */
  async ensureScaffolded(categories: string[] = ['learning', 'decisions']): Promise<void> {
    if (!fs.existsSync(this.storagePath)) {
      fs.mkdirSync(this.storagePath, { recursive: true });
    }

    for (const cat of categories) {
      const filePath = this.getFilePath(cat);
      if (!fs.existsSync(filePath)) {
        const initialContent = `# Category: ${cat}\n\n`;
        this.atomicWriteFile(filePath, initialContent);
      }
    }
  }

  /**
   * Alias for ensureScaffolded for contract compatibility.
   */
  async ensureDirectories(categories?: string[]): Promise<void> {
    return this.ensureScaffolded(categories);
  }

  /**
   * Reads all memories from a specific category file.
   */
  async readCategory(category: string): Promise<Memory[]> {
    const filePath = this.getFilePath(category);
    if (!fs.existsSync(filePath)) {
      return [];
    }
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const { memories, repairs } = this.parseMarkdownDetailed(fileContent, category, filePath);

    if (repairs.length > 0) {
      const formattedContent = this.formatMarkdown(memories, category);
      this.atomicWriteFile(filePath, formattedContent);
      for (const repair of repairs) {
        process.stderr.write(`[neuron warning] repaired ${filePath}: ${repair}\n`);
      }
    }

    return memories;
  }

  /**
   * Reads all memories across all category files in storagePath.
   */
  async readAll(categories?: string[]): Promise<Memory[]> {
    let catsToRead = categories;
    if (!catsToRead) {
      if (fs.existsSync(this.storagePath)) {
        const files = fs.readdirSync(this.storagePath);
        catsToRead = files
          .filter(f => f.endsWith('.md') && !f.includes('.tmp.'))
          .map(f => path.basename(f, '.md'));
      } else {
        catsToRead = ['learning', 'decisions'];
      }
    }

    const allMemories: Memory[] = [];
    for (const cat of catsToRead) {
      const memories = await this.readCategory(cat);
      allMemories.push(...memories);
    }
    return allMemories;
  }

  /**
   * Writes a memory entry to the specified category file (appends or replaces if ID matches).
   */
  async writeEntry(
    category: string,
    entry: Partial<Memory> & { content?: string }
  ): Promise<Memory> {
    return this.withCategoryLock(category, async () => {
      await this.ensureScaffolded([category]);
      const existingEntries = await this.readCategory(category);

      const memoryId = entry.id || crypto.randomUUID();
      const existingIndex = existingEntries.findIndex(m => m.id === memoryId);
      // An upsert onto an id that already exists is a replace, not a rebirth —
      // createdAt must survive it the same way updateEntry already preserves
      // it, or every repeat write (e.g. a re-run `neuron scan`) looks like a
      // brand new entry in a diff even when nothing else changed (ticket 37).
      const createdAt = entry.createdAt
        || (existingIndex >= 0 ? existingEntries[existingIndex].createdAt : undefined)
        || new Date().toISOString();

      // A brand-new entry is never born superseded, so an upsert only ever
      // preserves an existing mark rather than setting one — the write-time
      // gate marks the OLD row via `updateEntry`, not this path (ticket 17 /
      // ADR 0015).
      const supersededBy = entry.supersededBy !== undefined
        ? entry.supersededBy
        : (existingIndex >= 0 ? existingEntries[existingIndex].supersededBy : null) ?? null;
      const supersededAt = entry.supersededAt !== undefined
        ? entry.supersededAt
        : (existingIndex >= 0 ? existingEntries[existingIndex].supersededAt : null) ?? null;

      const fullMemory: Memory = {
        id: memoryId,
        category,
        content: entry.content || '',
        tags: Array.isArray(entry.tags) ? entry.tags : [],
        importance: entry.importance !== undefined ? entry.importance : 3,
        taskId: entry.taskId !== undefined ? entry.taskId : null,
        createdAt,
        supersededBy,
        supersededAt,
        fields: entry.fields,
      };

      if (existingIndex >= 0) {
        existingEntries[existingIndex] = fullMemory;
      } else {
        existingEntries.push(fullMemory);
      }

      const formattedContent = this.formatMarkdown(existingEntries, category);
      const filePath = this.getFilePath(category);
      this.atomicWriteFile(filePath, formattedContent);
      this.verifyWrite(filePath, formattedContent, category, memoryId);

      return fullMemory;
    });
  }

  /**
   * Updates an existing entry in the specified category file by ID.
   */
  async updateEntry(category: string, entry: Partial<Memory> & { id: string }): Promise<Memory> {
    return this.withCategoryLock(category, async () => {
      const existingEntries = await this.readCategory(category);
      const existingIndex = existingEntries.findIndex(m => m.id === entry.id);

      if (existingIndex === -1) {
        throw new Error(`Memory entry with id "${entry.id}" not found in category "${category}"`);
      }

      const current = existingEntries[existingIndex];
      const updatedMemory: Memory = {
        ...current,
        ...entry,
        id: current.id,
        category,
        content: entry.content !== undefined ? entry.content : current.content,
        tags: entry.tags !== undefined ? entry.tags : current.tags,
        importance: entry.importance !== undefined ? entry.importance : current.importance,
        taskId: entry.taskId !== undefined ? entry.taskId : current.taskId,
        createdAt: entry.createdAt !== undefined ? entry.createdAt : current.createdAt,
        supersededBy: entry.supersededBy !== undefined ? entry.supersededBy : current.supersededBy,
        supersededAt: entry.supersededAt !== undefined ? entry.supersededAt : current.supersededAt,
        // Per-key merge, not a full replace: an update that only touches one
        // declared field must not clobber the entry's other declared fields,
        // matching how tags/importance/taskId are already preserved when a
        // caller omits them.
        fields: entry.fields !== undefined ? { ...current.fields, ...entry.fields } : current.fields,
      };

      existingEntries[existingIndex] = updatedMemory;

      const formattedContent = this.formatMarkdown(existingEntries, category);
      const filePath = this.getFilePath(category);
      this.atomicWriteFile(filePath, formattedContent);
      this.verifyWrite(filePath, formattedContent, category, entry.id);

      return updatedMemory;
    });
  }

  /**
   * Deletes an entry by ID from the specified category file.
   */
  async deleteEntry(category: string, id: string): Promise<boolean> {
    return this.withCategoryLock(category, async () => {
      const existingEntries = await this.readCategory(category);
      const filteredEntries = existingEntries.filter(m => m.id !== id);

      if (filteredEntries.length === existingEntries.length) {
        return false;
      }

      const formattedContent = this.formatMarkdown(filteredEntries, category);
      const filePath = this.getFilePath(category);
      this.atomicWriteFile(filePath, formattedContent);
      this.verifyWrite(filePath, formattedContent, category, id);

      return true;
    });
  }

  /**
   * Serializes the read-modify-write cycle of `writeEntry`/`updateEntry`/
   * `deleteEntry` against every other writer of the same category file —
   * both other processes (e.g. two `neuron memory add` CLI invocations, the
   * real-world case that lost data) and other async calls in this same
   * process (e.g. `Promise.all`), since either can interleave between this
   * class's `await` points otherwise. `mkdir` is used as the mutex primitive
   * because directory creation is atomic at the OS/filesystem level and
   * needs no extra dependency (ticket 18).
   */
  private async withCategoryLock<T>(category: string, fn: () => Promise<T>): Promise<T> {
    const release = await this.acquireLock(category);
    try {
      return await fn();
    } finally {
      release();
    }
  }

  private async acquireLock(category: string): Promise<() => void> {
    const lockPath = `${this.getFilePath(category)}.lock`;
    const dir = path.dirname(lockPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // A lock older than this is assumed to belong to a process that crashed
    // (or was killed) while holding it, rather than a genuinely slow writer
    // — without a steal path a single crash would wedge every future writer
    // of the category forever.
    const staleAfterMs = 30_000;
    const maxWaitMs = 10_000;
    const retryDelayMs = 25;
    const start = Date.now();

    while (true) {
      try {
        fs.mkdirSync(lockPath);
        return () => {
          try {
            fs.rmdirSync(lockPath);
          } catch {
            // Already gone (e.g. stolen as stale by another writer) — fine.
          }
        };
      } catch (err) {
        if (!(err instanceof Error) || (err as NodeJS.ErrnoException).code !== 'EEXIST') {
          throw err;
        }

        try {
          const heldFor = Date.now() - fs.statSync(lockPath).mtimeMs;
          if (heldFor > staleAfterMs) {
            fs.rmdirSync(lockPath);
            continue;
          }
        } catch {
          // Lock vanished between the failed mkdir and this stat — another
          // writer released or stole it; retry immediately.
          continue;
        }

        if (Date.now() - start > maxWaitMs) {
          throw new Error(
            `Timed out waiting ${maxWaitMs}ms for the storage lock on category "${category}" `
            + `(${lockPath}) — another process may have crashed while holding it.`
          );
        }
        await new Promise(resolve => setTimeout(resolve, retryDelayMs));
      }
    }
  }

  /**
   * Interim safety floor (ticket 18 scope item 3), kept regardless of the
   * locking fix above: re-reads the just-written file and byte-compares it
   * against what was meant to land on disk. Locking removes the known race
   * that let two racing writers silently discard one another's change, but
   * this still turns any *other* way that invariant could break (a bug in
   * the lock, a non-atomic filesystem, a concurrent writer outside this
   * adapter entirely) into a loud failure instead of a reported success that
   * quietly lost data.
   */
  private verifyWrite(filePath: string, expectedContent: string, category: string, id: string | undefined): void {
    const actual = fs.readFileSync(filePath, 'utf8');
    if (actual !== expectedContent) {
      throw new Error(
        `Write verification failed for entry "${id}" in category "${category}": `
        + `${filePath} does not contain the content just written. Refusing to report success.`
      );
    }
  }

  /**
   * Atomic swap write: writes content to a .tmp file first, then renames it atomically.
   */
  private atomicWriteFile(filePath: string, content: string): void {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const tmpPath = `${filePath}.tmp.${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    try {
      fs.writeFileSync(tmpPath, content, 'utf8');
      fs.renameSync(tmpPath, filePath);
    } catch (err) {
      if (fs.existsSync(tmpPath)) {
        try {
          fs.unlinkSync(tmpPath);
        } catch {
          // ignore cleanup errors
        }
      }
      throw err;
    }
  }

  /**
   * Formats a list of Memory objects into full category Markdown file content.
   */
  formatMarkdown(memories: Memory[], category: string): string {
    const header = `# Category: ${category}\n\n`;
    if (memories.length === 0) {
      return header;
    }
    const entriesStr = memories.map(m => this.formatEntry(m)).join('\n\n');
    return header + entriesStr + '\n';
  }

  /**
   * Formats a single Memory object into YAML frontmatter and section heading markdown.
   */
  formatEntry(memory: Memory): string {
    const frontmatterObj: Record<string, unknown> = {
      id: memory.id,
      createdAt: memory.createdAt,
      importance: memory.importance !== undefined ? memory.importance : 3,
      tags: memory.tags || [],
    };

    if (memory.taskId !== undefined) {
      frontmatterObj.taskId = memory.taskId;
    }

    // Only emitted when set (ticket 17 / ADR 0015) — unlike `taskId` above,
    // this is a rare, additive relationship, and writing `supersededBy: null`
    // into every entry's frontmatter would be pure noise on every store that
    // has never used it.
    if (memory.supersededBy) {
      frontmatterObj.supersededBy = memory.supersededBy;
      if (memory.supersededAt) frontmatterObj.supersededAt = memory.supersededAt;
    }

    // Declared fields (ticket 43) get their own frontmatter keys, sorted so
    // byte-stability (ticket 37) doesn't depend on CLI flag order or object
    // key insertion order.
    if (memory.fields) {
      for (const key of Object.keys(memory.fields).sort()) {
        frontmatterObj[key] = memory.fields[key];
      }
    }

    const yamlStr = stringifyYaml(frontmatterObj).trim();
    const contentStr = (memory.content || '').trim();

    return `---\n${yamlStr}\n---\n${contentStr}`;
  }

  /**
   * Parses Markdown content into an array of Memory objects.
   */
  parseMarkdown(content: string, category: string): Memory[] {
    return this.parseMarkdownDetailed(content, category, category).memories;
  }

  /**
   * Parses Markdown content, additionally reporting which fields (if any)
   * needed a missing-field repair. `readCategory` uses `repairs` to write
   * the repair back to disk once and warn once, per ADR 0011 Consequence 4
   * and ADR 0010 §3 ("silent, bounded, observable").
   */
  private parseMarkdownDetailed(
    content: string,
    category: string,
    filePath: string
  ): { memories: Memory[]; repairs: string[] } {
    const memories: Memory[] = [];
    const repairs: string[] = [];

    interface BlockMatch {
      matchStart: number;
      bodyStart: number;
      yamlStr: string;
    }

    // Collect every delimiter LINE (a line that is exactly `---`) rather than
    // matching open/close pairs in one global pass. A pass-based regex
    // advances its `lastIndex` past whatever it last tried, including a
    // rejected candidate — so a bare `---` inside one entry's body (a
    // markdown horizontal rule, or duplicated content) consumes the next
    // real delimiter as part of the failed match and cascades into losing
    // every entry after it (neuron-2.3.0 ticket 38). Two-pointer pairing over the raw
    // delimiter positions lets a rejected pairing retry from the very next
    // delimiter instead of skipping past it.
    const delimiterRegex = /^---\r?\n/gm;
    const delimiters: { lineStart: number; lineEnd: number }[] = [];
    let delimMatch: RegExpExecArray | null;
    while ((delimMatch = delimiterRegex.exec(content)) !== null) {
      delimiters.push({ lineStart: delimMatch.index, lineEnd: delimMatch.index + delimMatch[0].length });
    }

    const matches: BlockMatch[] = [];
    let p = 0;
    while (p + 1 < delimiters.length) {
      const open = delimiters[p];
      const close = delimiters[p + 1];
      const yamlStr = content.slice(open.lineEnd, close.lineStart).replace(/\r?\n$/, '');
      // Verify candidate block contains key-value pairs to distinguish frontmatter from body horizontal rules `---`,
      // AND contains no markdown code fence — real frontmatter is never fenced code, but body content between two
      // stray `---` horizontal rules routinely is (a TypeScript interface or YAML example inside a ```-fenced block
      // reads exactly like frontmatter to a bare colon regex: `id: string;`, `scope: string;`, ...), which without
      // this exclusion gets misclassified as a real block and then hard-errors the whole file when the fenced code
      // fails to parse as YAML.
      if (/^\s*[a-zA-Z0-9_-]+\s*:/m.test(yamlStr) && !/^```/m.test(yamlStr)) {
        matches.push({
          matchStart: open.lineStart,
          bodyStart: close.lineEnd,
          yamlStr,
        });
        p += 2;
      } else {
        // Not a valid frontmatter block — `open` was body content (e.g. a
        // stray `---`), not a real delimiter. Retry with `close` as the next
        // candidate open rather than skipping past it.
        p += 1;
      }
    }

    if (matches.length === 0) {
      // Fallback for files without frontmatter blocks
      const cleanContent = content.replace(/^# Category:.*$/m, '').trim();
      if (cleanContent) {
        const mintedId = crypto.randomUUID();
        memories.push({
          id: mintedId,
          category,
            content: cleanContent,
          tags: [],
          importance: 3,
          createdAt: new Date().toISOString(),
        });
        repairs.push(`entry ${mintedId}: no frontmatter block at all — minted id, createdAt and importance`);
      }
      return { memories, repairs };
    }

    const explicitIdsSeen = new Set<string>();

    for (let i = 0; i < matches.length; i++) {
      const current = matches[i];
      const next = matches[i + 1];

      const bodyEnd = next ? next.matchStart : content.length;
      const rawBody = content.slice(current.bodyStart, bodyEnd);
      const bodyStr = rawBody.trim();
      const yamlStr = current.yamlStr.trim();

      let frontmatter: Record<string, any> = {};
      try {
        const parsed = parseYaml(yamlStr);
        if (parsed && typeof parsed === 'object') {
          frontmatter = parsed;
        } else {
          frontmatter = {};
        }
      } catch (err) {
        const reason = err instanceof Error ? err.message : String(err);
        throw new Error(
          `Malformed YAML frontmatter in ${filePath} (entry ${i + 1} of ${matches.length}): ${reason}`
        );
      }

      let id: string;
      if (frontmatter.id) {
        id = String(frontmatter.id);
        if (explicitIdsSeen.has(id)) {
          throw new Error(
            `Duplicate id "${id}" in ${filePath}: entry frontmatter must have unique ids`
          );
        }
        explicitIdsSeen.add(id);
      } else {
        id = crypto.randomUUID();
        repairs.push(`entry ${id}: missing id — minted`);
      }

      let createdAt: string;
      if (frontmatter.createdAt) {
        createdAt = String(frontmatter.createdAt);
      } else {
        createdAt = new Date().toISOString();
        repairs.push(`entry ${id}: missing createdAt — minted`);
      }

      let importance: number;
      if (frontmatter.importance === undefined || frontmatter.importance === null) {
        importance = 3;
        repairs.push(`entry ${id}: missing importance — defaulted to 3`);
      } else if (typeof frontmatter.importance === 'number') {
        importance = frontmatter.importance;
      } else {
        const coerced = parseInt(String(frontmatter.importance), 10);
        if (!Number.isFinite(coerced)) {
          throw new Error(
            `Malformed importance "${frontmatter.importance}" in ${filePath} (entry ${i + 1} of ${matches.length}): must be a number`
          );
        }
        importance = coerced;
      }

      let tags: string[] = [];
      if (Array.isArray(frontmatter.tags)) {
        tags = frontmatter.tags.map(String);
      } else if (typeof frontmatter.tags === 'string') {
        tags = frontmatter.tags.split(',').map(s => s.trim()).filter(Boolean);
      } else if (frontmatter.tags !== undefined && frontmatter.tags !== null) {
        throw new Error(
          `Malformed tags "${frontmatter.tags}" in ${filePath} (entry ${i + 1} of ${matches.length}): must be an array or a comma-separated string`
        );
      }

      // A `scope:` key is a residue of a field removed in v2.2.0 (ticket 38).
      // It is neither read into the Memory object nor treated as a repair —
      // just silently ignored, and it disappears the next time this entry
      // is written, since formatEntry no longer emits it.
      const taskId = frontmatter.taskId !== undefined
        ? (frontmatter.taskId === null ? null : String(frontmatter.taskId))
        : undefined;

      // Ticket 17 / ADR 0015: absent means live, matching the SQLite side's
      // NULL default — never minted or repaired when missing, unlike id/
      // createdAt/importance above, since "no supersession mark" is a valid,
      // common, non-degraded state rather than a missing-data defect.
      const supersededBy = frontmatter.supersededBy !== undefined && frontmatter.supersededBy !== null
        ? String(frontmatter.supersededBy)
        : null;
      const supersededAt = frontmatter.supersededAt !== undefined && frontmatter.supersededAt !== null
        ? String(frontmatter.supersededAt)
        : null;

      // Any other frontmatter key is a declared field (ticket 43) — or, on a
      // hand-edited file, a field not yet declared in `neuron.yaml` at all.
      // Read permissively either way ("read and report, never refuse" — ADR
      // 0013 answer 4): schema enforcement is a write-time concern living in
      // `NeuronMemory.transact()`, not the reader's job. Coerced to a string
      // like `taskId` above, never invented when absent.
      const fields: Record<string, string> = {};
      for (const [key, value] of Object.entries(frontmatter)) {
        if (RESERVED_FRONTMATTER_KEYS.has(key)) continue;
        fields[key] = value === null || value === undefined ? '' : String(value);
      }

      memories.push({
        id,
        category,
        content: bodyStr,
        tags,
        importance,
        taskId,
        createdAt,
        supersededBy,
        supersededAt,
        fields: Object.keys(fields).length > 0 ? fields : undefined,
      });
    }

    return { memories, repairs };
  }
}

export default MdStorageAdapter;
