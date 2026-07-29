import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';
import { Memory } from '../models/memory.js';

export interface MdStorageAdapterOptions {
  storagePath?: string;
}

export class MdStorageAdapter {
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
    const safeName = path.basename(category).replace(/[^a-zA-Z0-9_-]/g, '_');
    return path.join(this.storagePath, `${safeName}.md`);
  }

  /**
   * Auto-scaffolds missing storage directory and category files.
   */
  async ensureScaffolded(categories: string[] = ['learning', 'history', 'decisions']): Promise<void> {
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
    return this.parseMarkdown(fileContent, category);
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
        catsToRead = ['learning', 'history', 'decisions'];
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
    await this.ensureScaffolded([category]);
    const existingEntries = await this.readCategory(category);

    const memoryId = entry.id || crypto.randomUUID();
    const createdAt = entry.createdAt || new Date().toISOString();

    const fullMemory: Memory = {
      id: memoryId,
      category,
      kind: category,
      content: entry.content || '',
      tags: Array.isArray(entry.tags) ? entry.tags : [],
      scope: entry.scope || 'project',
      importance: entry.importance !== undefined ? entry.importance : 3,
      taskId: entry.taskId !== undefined ? entry.taskId : null,
      createdAt,
    };

    const existingIndex = existingEntries.findIndex(m => m.id === memoryId);
    if (existingIndex >= 0) {
      existingEntries[existingIndex] = fullMemory;
    } else {
      existingEntries.push(fullMemory);
    }

    const formattedContent = this.formatMarkdown(existingEntries, category);
    const filePath = this.getFilePath(category);
    this.atomicWriteFile(filePath, formattedContent);

    return fullMemory;
  }

  /**
   * Updates an existing entry in the specified category file by ID.
   */
  async updateEntry(category: string, entry: Partial<Memory> & { id: string }): Promise<Memory> {
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
      kind: category,
      content: entry.content !== undefined ? entry.content : current.content,
      tags: entry.tags !== undefined ? entry.tags : current.tags,
      scope: entry.scope !== undefined ? entry.scope : current.scope,
      importance: entry.importance !== undefined ? entry.importance : current.importance,
      taskId: entry.taskId !== undefined ? entry.taskId : current.taskId,
      createdAt: entry.createdAt !== undefined ? entry.createdAt : current.createdAt,
    };

    existingEntries[existingIndex] = updatedMemory;

    const formattedContent = this.formatMarkdown(existingEntries, category);
    const filePath = this.getFilePath(category);
    this.atomicWriteFile(filePath, formattedContent);

    return updatedMemory;
  }

  /**
   * Deletes an entry by ID from the specified category file.
   */
  async deleteEntry(category: string, id: string): Promise<boolean> {
    const existingEntries = await this.readCategory(category);
    const filteredEntries = existingEntries.filter(m => m.id !== id);

    if (filteredEntries.length === existingEntries.length) {
      return false;
    }

    const formattedContent = this.formatMarkdown(filteredEntries, category);
    const filePath = this.getFilePath(category);
    this.atomicWriteFile(filePath, formattedContent);

    return true;
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

    if (memory.scope !== undefined && memory.scope !== null) {
      frontmatterObj.scope = memory.scope;
    }
    if (memory.taskId !== undefined) {
      frontmatterObj.taskId = memory.taskId;
    }

    const yamlStr = stringifyYaml(frontmatterObj).trim();
    const contentStr = (memory.content || '').trim();

    return `---\n${yamlStr}\n---\n${contentStr}`;
  }

  /**
   * Parses Markdown content into an array of Memory objects.
   */
  parseMarkdown(content: string, category: string): Memory[] {
    const memories: Memory[] = [];

    // Find all valid frontmatter blocks delimited by `---` on dedicated lines
    const frontmatterRegex = /(?:^|\n)---\r?\n([\s\S]*?)\r?\n---\r?\n/g;

    interface BlockMatch {
      matchStart: number;
      bodyStart: number;
      yamlStr: string;
    }

    const matches: BlockMatch[] = [];
    let match: RegExpExecArray | null;

    while ((match = frontmatterRegex.exec(content)) !== null) {
      const yamlStr = match[1];
      // Verify candidate block contains key-value pairs to distinguish frontmatter from body horizontal rules `---`
      if (/^\s*[a-zA-Z0-9_-]+\s*:/m.test(yamlStr)) {
        matches.push({
          matchStart: match.index,
          bodyStart: match.index + match[0].length,
          yamlStr,
        });
      }
    }

    if (matches.length === 0) {
      // Fallback for files without frontmatter blocks
      const cleanContent = content.replace(/^# Category:.*$/m, '').trim();
      if (cleanContent) {
        memories.push({
          id: crypto.randomUUID(),
          category,
          kind: category,
          content: cleanContent,
          tags: [],
          importance: 1,
          createdAt: new Date().toISOString(),
        });
      }
      return memories;
    }

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
      } catch {
        // Fallback: line-by-line key extraction if YAML parsing throws on malformed syntax
        const lines = yamlStr.split(/\r?\n/);
        for (const line of lines) {
          const keyMatch = line.match(/^\s*([a-zA-Z0-9_-]+)\s*:\s*(.+?)\s*$/);
          if (keyMatch) {
            const key = keyMatch[1];
            let val = keyMatch[2].trim();
            if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
              val = val.slice(1, -1);
            }
            frontmatter[key] = val;
          }
        }
      }

      const id = frontmatter.id ? String(frontmatter.id) : crypto.randomUUID();
      const createdAt = frontmatter.createdAt ? String(frontmatter.createdAt) : new Date().toISOString();
      const importance = typeof frontmatter.importance === 'number'
        ? frontmatter.importance
        : (frontmatter.importance ? parseInt(String(frontmatter.importance), 10) || 1 : 1);

      let tags: string[] = [];
      if (Array.isArray(frontmatter.tags)) {
        tags = frontmatter.tags.map(String);
      } else if (typeof frontmatter.tags === 'string') {
        tags = frontmatter.tags.split(',').map(s => s.trim()).filter(Boolean);
      }

      const scope = (frontmatter.scope !== undefined && frontmatter.scope !== null)
        ? String(frontmatter.scope)
        : undefined;

      const taskId = frontmatter.taskId !== undefined
        ? (frontmatter.taskId === null ? null : String(frontmatter.taskId))
        : undefined;

      memories.push({
        id,
        category,
        kind: category,
        content: bodyStr,
        tags,
        scope,
        importance,
        taskId,
        createdAt,
      });
    }

    return memories;
  }
}

export default MdStorageAdapter;
