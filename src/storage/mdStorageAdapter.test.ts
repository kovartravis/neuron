import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { MdStorageAdapter } from './mdStorageAdapter.js';
import { Memory } from '../models/memory.js';

describe('MdStorageAdapter (R1 Unit & Boundary Tests)', () => {
  const testDir = path.join(process.cwd(), 'src', '__tests__', `temp-md-adapter-${Date.now()}`);

  beforeEach(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
    fs.mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  // --- Tier 1 Coverage Tests (R1-T1-01 to R1-T1-05) ---

  it('R1-T1-01: readCategory reads and parses valid category markdown file with YAML frontmatter', async () => {
    const adapter = new MdStorageAdapter({ storagePath: testDir });
    await adapter.ensureScaffolded(['learning']);

    const markdownContent = `# Category: learning

---
id: test-id-123
createdAt: 2026-07-28T12:00:00.000Z
importance: 4
tags:
  - tdd
  - testing
taskId: task-456
---
## Test Learning Title

This is the body content of the test learning.
`;

    fs.writeFileSync(path.join(testDir, 'learning.md'), markdownContent, 'utf8');

    const memories = await adapter.readCategory('learning');
    expect(memories).toHaveLength(1);
    expect(memories[0].id).toBe('test-id-123');
    expect(memories[0].category).toBe('learning');
    expect(memories[0].importance).toBe(4);
    expect(memories[0].tags).toEqual(['tdd', 'testing']);
    expect(memories[0].taskId).toBe('task-456');
    expect(memories[0].content).toContain('This is the body content of the test learning.');
  });

  it('R1-T1-01b: a stray `scope:` key in frontmatter (removed in ticket 38) reads cleanly and is dropped on the next write', async () => {
    const adapter = new MdStorageAdapter({ storagePath: testDir });
    await adapter.ensureScaffolded(['learning']);

    const markdownContent = `# Category: learning

---
id: test-id-124
createdAt: 2026-07-28T12:00:00.000Z
importance: 4
tags:
  - tdd
scope: project
taskId: task-456
---
## Test Learning Title

Body content.
`;
    const filePath = path.join(testDir, 'learning.md');
    fs.writeFileSync(filePath, markdownContent, 'utf8');

    // A stray scope key is silently ignored, not an error, and not a repair
    // (no warning, no rewrite) — the file is left byte-for-byte untouched.
    const memories = await adapter.readCategory('learning');
    expect(memories).toHaveLength(1);
    expect(memories[0]).not.toHaveProperty('scope');
    expect(fs.readFileSync(filePath, 'utf8')).toContain('scope: project');

    // The next explicit write to this entry drops the key, since formatEntry
    // never emits scope any more.
    await adapter.updateEntry('learning', { id: 'test-id-124', importance: 5 });
    expect(fs.readFileSync(filePath, 'utf8')).not.toContain('scope:');
  });

  it('R1-T1-02: formatMarkdown and parseMarkdown roundtrip format memory objects accurately', () => {
    const adapter = new MdStorageAdapter({ storagePath: testDir });

    const sampleMemories: Memory[] = [
      {
        id: 'mem-001',
        category: 'history',
        kind: 'history',
        content: '## Executed command\n\nCommand output details here.',
        tags: ['cli', 'execution'],
        importance: 3,
        taskId: 'task-99',
        createdAt: '2026-07-28T10:00:00.000Z',
      },
    ];

    const formatted = adapter.formatMarkdown(sampleMemories, 'history');
    expect(formatted).toContain('# Category: history');
    expect(formatted).toContain('id: mem-001');
    expect(formatted).toContain('importance: 3');
    expect(formatted).toContain('tags:');
    expect(formatted).toContain('cli');
    expect(formatted).toContain('task-99');

    const parsed = adapter.parseMarkdown(formatted, 'history');
    expect(parsed).toHaveLength(1);
    expect(parsed[0].id).toBe('mem-001');
    expect(parsed[0].category).toBe('history');
    expect(parsed[0].importance).toBe(3);
    expect(parsed[0].tags).toEqual(['cli', 'execution']);
    expect(parsed[0].taskId).toBe('task-99');
  });

  it('R1-T1-03: writeEntry appends a new memory entry to category file without corrupting existing entries', async () => {
    const adapter = new MdStorageAdapter({ storagePath: testDir });

    const entry1 = await adapter.writeEntry('learning', {
      id: 'id-1',
      content: 'First entry content',
      tags: ['tag1'],
      importance: 2,
    });

    const entry2 = await adapter.writeEntry('learning', {
      id: 'id-2',
      content: 'Second entry content',
      tags: ['tag2'],
      importance: 4,
    });

    expect(entry1.id).toBe('id-1');
    expect(entry2.id).toBe('id-2');

    const allEntries = await adapter.readCategory('learning');
    expect(allEntries).toHaveLength(2);
    expect(allEntries[0].id).toBe('id-1');
    expect(allEntries[0].content).toContain('First entry content');
    expect(allEntries[1].id).toBe('id-2');
    expect(allEntries[1].content).toContain('Second entry content');
  });

  it('R1-T1-03b: writeEntry on an existing id preserves the original createdAt instead of minting a new one (ticket 37)', async () => {
    const adapter = new MdStorageAdapter({ storagePath: testDir });

    const first = await adapter.writeEntry('decisions', {
      id: 'blueprint-1',
      content: 'First version of the card',
      tags: ['architecture'],
      importance: 5,
    });

    await new Promise(resolve => setTimeout(resolve, 5));

    const second = await adapter.writeEntry('decisions', {
      id: 'blueprint-1',
      content: 'Second version of the card',
      tags: ['architecture'],
      importance: 5,
    });

    expect(second.createdAt).toBe(first.createdAt);

    const reRead = await adapter.readCategory('decisions');
    expect(reRead).toHaveLength(1);
    expect(reRead[0].createdAt).toBe(first.createdAt);
  });

  it('R1-T1-04: updateEntry updates an existing memory entry by ID in category markdown file', async () => {
    const adapter = new MdStorageAdapter({ storagePath: testDir });

    await adapter.writeEntry('decisions', {
      id: 'dec-1',
      content: 'Initial decision text',
      tags: ['architecture'],
      importance: 3,
    });

    const updated = await adapter.updateEntry('decisions', {
      id: 'dec-1',
      content: 'Updated decision text with new rationale',
      importance: 5,
    });

    expect(updated.id).toBe('dec-1');
    expect(updated.importance).toBe(5);

    const reRead = await adapter.readCategory('decisions');
    expect(reRead).toHaveLength(1);
    expect(reRead[0].content).toContain('Updated decision text with new rationale');
    expect(reRead[0].importance).toBe(5);
    expect(reRead[0].tags).toEqual(['architecture']);
  });

  it('R1-T1-05: deleteEntry deletes entry by ID from category markdown file', async () => {
    const adapter = new MdStorageAdapter({ storagePath: testDir });

    await adapter.writeEntry('learning', { id: 'del-1', content: 'To be deleted' });
    await adapter.writeEntry('learning', { id: 'del-2', content: 'To remain' });

    const deletedResult = await adapter.deleteEntry('learning', 'del-1');
    expect(deletedResult).toBe(true);

    const remaining = await adapter.readCategory('learning');
    expect(remaining).toHaveLength(1);
    expect(remaining[0].id).toBe('del-2');

    const deleteNonExistent = await adapter.deleteEntry('learning', 'del-non-existent');
    expect(deleteNonExistent).toBe(false);
  });

  // --- Tier 2 Boundary Tests (R1-T2-01 to R1-T2-05) ---

  it('R1-T2-01: returns empty array when reading empty or zero-byte category markdown file', async () => {
    const adapter = new MdStorageAdapter({ storagePath: testDir });
    fs.mkdirSync(testDir, { recursive: true });
    fs.writeFileSync(path.join(testDir, 'empty.md'), '', 'utf8');

    const memories = await adapter.readCategory('empty');
    expect(memories).toEqual([]);
  });

  it('R1-T2-02: rejects with a named-file error on malformed YAML frontmatter, rather than silently recovering (ticket 35)', async () => {
    const adapter = new MdStorageAdapter({ storagePath: testDir });
    fs.mkdirSync(testDir, { recursive: true });

    const malformedContent = `# Category: learning

---
id: malformed-id
invalid: : : yaml syntax error
---
## Malformed Header

Some body content despite broken frontmatter.
`;
    const filePath = path.join(testDir, 'learning.md');
    fs.writeFileSync(filePath, malformedContent, 'utf8');

    await expect(adapter.readCategory('learning')).rejects.toThrow(filePath);
  });

  it('R1-T2-03: cleans up temporary .tmp file when atomic swap write is interrupted or fails', async () => {
    const adapter = new MdStorageAdapter({ storagePath: testDir });
    await adapter.ensureScaffolded(['learning']);

    const renameSpy = vi.spyOn(fs, 'renameSync').mockImplementationOnce(() => {
      throw new Error('Disk IO error during rename');
    });

    await expect(
      adapter.writeEntry('learning', { content: 'Will fail write' })
    ).rejects.toThrow('Disk IO error during rename');

    renameSpy.mockRestore();

    const files = fs.readdirSync(testDir);
    const tmpFiles = files.filter(f => f.includes('.tmp.'));
    expect(tmpFiles).toHaveLength(0);
  });

  it('R1-T2-04: correctly formats and parses entry content containing special markdown syntax', async () => {
    const adapter = new MdStorageAdapter({ storagePath: testDir });

    const complexContent = `## Section Title with Colons: and Hash #

Here is content with triple dashes:
---
And code block:
\`\`\`ts
const x = "hello: world";
\`\`\`
And multiline quotes:
> line 1
> line 2`;

    await adapter.writeEntry('learning', {
      id: 'complex-id',
      content: complexContent,
      tags: ['tag:colon', 'tag-dash'],
    });

    const reRead = await adapter.readCategory('learning');
    expect(reRead).toHaveLength(1);
    expect(reRead[0].id).toBe('complex-id');
    expect(reRead[0].content).toContain('Section Title with Colons:');
    expect(reRead[0].content).toContain('const x = "hello: world";');
  });

  it('R1-T2-05: auto-scaffolds parent directory structure if missing on write', async () => {
    const deepDir = path.join(testDir, 'nested', 'deep', '.neuron');
    const adapter = new MdStorageAdapter({ storagePath: deepDir });

    expect(fs.existsSync(deepDir)).toBe(false);

    await adapter.writeEntry('history', {
      content: 'Auto scaffolded deep entry',
    });

    expect(fs.existsSync(deepDir)).toBe(true);
    expect(fs.existsSync(path.join(deepDir, 'history.md'))).toBe(true);

    const readBack = await adapter.readCategory('history');
    expect(readBack).toHaveLength(1);
    expect(readBack[0].content).toContain('Auto scaffolded deep entry');
  });

  // --- Ticket 35: Frontmatter Round-Trip Integrity ---

  describe('Frontmatter Round-Trip Integrity (ticket 35)', () => {
    it('35-01: entry with no importance key parses to the writer default (3), not 1', () => {
      const adapter = new MdStorageAdapter({ storagePath: testDir });

      const content = `# Category: learning

---
id: no-importance-1
createdAt: 2026-07-28T12:00:00.000Z
tags: []
---
## Entry with no importance line

Body content.
`;

      const parsed = adapter.parseMarkdown(content, 'learning');
      expect(parsed).toHaveLength(1);
      expect(parsed[0].importance).toBe(3);
    });

    it('35-02: readCategory writes the repaired importance back to disk, so it is stable on a second read', async () => {
      const adapter = new MdStorageAdapter({ storagePath: testDir });
      await adapter.ensureScaffolded(['learning']);

      const content = `# Category: learning

---
id: no-importance-2
createdAt: 2026-07-28T12:00:00.000Z
tags: []
---
## Entry with no importance line

Body content.
`;
      const filePath = path.join(testDir, 'learning.md');
      fs.writeFileSync(filePath, content, 'utf8');

      const firstRead = await adapter.readCategory('learning');
      expect(firstRead[0].importance).toBe(3);

      const rewritten = fs.readFileSync(filePath, 'utf8');
      expect(rewritten).toMatch(/importance:\s*3/);

      const secondRead = await adapter.readCategory('learning');
      expect(secondRead[0].importance).toBe(3);
    });

    it('35-03: a missing id is minted once and written back, so repeated reads return the same id', async () => {
      const adapter = new MdStorageAdapter({ storagePath: testDir });
      await adapter.ensureScaffolded(['learning']);

      const content = `# Category: learning

---
createdAt: 2026-07-28T12:00:00.000Z
importance: 5
tags: []
---
## Entry with no id line

Body content.
`;
      const filePath = path.join(testDir, 'learning.md');
      fs.writeFileSync(filePath, content, 'utf8');

      const firstRead = await adapter.readCategory('learning');
      expect(firstRead).toHaveLength(1);
      const mintedId = firstRead[0].id;
      expect(mintedId).toBeTruthy();

      const rewritten = fs.readFileSync(filePath, 'utf8');
      expect(rewritten).toContain(`id: ${mintedId}`);

      const secondRead = await adapter.readCategory('learning');
      expect(secondRead[0].id).toBe(mintedId);

      const thirdRead = await adapter.readCategory('learning');
      expect(thirdRead[0].id).toBe(mintedId);
    });

    it('35-04: a missing createdAt is minted once and written back, so repeated reads return the same createdAt', async () => {
      const adapter = new MdStorageAdapter({ storagePath: testDir });
      await adapter.ensureScaffolded(['learning']);

      const content = `# Category: learning

---
id: no-createdat-1
importance: 5
tags: []
---
## Entry with no createdAt line

Body content.
`;
      const filePath = path.join(testDir, 'learning.md');
      fs.writeFileSync(filePath, content, 'utf8');

      const firstRead = await adapter.readCategory('learning');
      const mintedCreatedAt = firstRead[0].createdAt;
      expect(mintedCreatedAt).toBeTruthy();

      const rewritten = fs.readFileSync(filePath, 'utf8');
      expect(rewritten).toContain(`createdAt: ${mintedCreatedAt}`);

      const secondRead = await adapter.readCategory('learning');
      expect(secondRead[0].createdAt).toBe(mintedCreatedAt);
    });

    it('35-05: two entries sharing an explicit id hard-error naming the file, rather than silently colliding', async () => {
      const adapter = new MdStorageAdapter({ storagePath: testDir });
      await adapter.ensureScaffolded(['learning']);

      const content = `# Category: learning

---
id: duplicate-id
createdAt: 2026-07-28T12:00:00.000Z
importance: 5
tags: []
---
## First entry

First body.

---
id: duplicate-id
createdAt: 2026-07-28T13:00:00.000Z
importance: 2
tags: []
---
## Second entry, same id

Second body.
`;
      const filePath = path.join(testDir, 'learning.md');
      fs.writeFileSync(filePath, content, 'utf8');

      await expect(adapter.readCategory('learning')).rejects.toThrow(/duplicate-id/i);
      await expect(adapter.readCategory('learning')).rejects.toThrow(filePath);
    });

    it('35-06: unparseable YAML frontmatter hard-errors naming the file, instead of silently recovering partial fields', async () => {
      const adapter = new MdStorageAdapter({ storagePath: testDir });
      await adapter.ensureScaffolded(['learning']);

      const corruptContent = `# Category: learning

---
id: broken-frontmatter
invalid: [unclosed array
---
## Corrupt Item Title

Body text under broken frontmatter.
`;
      const filePath = path.join(testDir, 'learning.md');
      fs.writeFileSync(filePath, corruptContent, 'utf8');

      await expect(adapter.readCategory('learning')).rejects.toThrow(filePath);
    });

    it('35-07: a non-numeric importance value hard-errors naming the file, instead of silently defaulting', async () => {
      const adapter = new MdStorageAdapter({ storagePath: testDir });
      await adapter.ensureScaffolded(['learning']);

      const content = `# Category: learning

---
id: bad-importance
createdAt: 2026-07-28T12:00:00.000Z
importance: high
tags: []
---
## Entry with a non-numeric importance

Body content.
`;
      const filePath = path.join(testDir, 'learning.md');
      fs.writeFileSync(filePath, content, 'utf8');

      await expect(adapter.readCategory('learning')).rejects.toThrow(filePath);
      await expect(adapter.readCategory('learning')).rejects.toThrow(/importance/i);
    });

    it('35-08: a tags value that is neither an array nor a string hard-errors, instead of silently dropping to []', async () => {
      const adapter = new MdStorageAdapter({ storagePath: testDir });
      await adapter.ensureScaffolded(['learning']);

      const content = `# Category: learning

---
id: bad-tags
createdAt: 2026-07-28T12:00:00.000Z
importance: 3
tags: 42
---
## Entry with a numeric tags value

Body content.
`;
      const filePath = path.join(testDir, 'learning.md');
      fs.writeFileSync(filePath, content, 'utf8');

      await expect(adapter.readCategory('learning')).rejects.toThrow(filePath);
      await expect(adapter.readCategory('learning')).rejects.toThrow(/tags/i);
    });

    it('35-09: a file with content but no frontmatter delimiters at all is repaired and written back once, not re-minted on every read', async () => {
      const adapter = new MdStorageAdapter({ storagePath: testDir });
      await adapter.ensureScaffolded(['learning']);

      const noFrontmatterContent = `# Category: learning

## A note a human typed directly, no --- delimiters

Just some content, no frontmatter at all.
`;
      const filePath = path.join(testDir, 'learning.md');
      fs.writeFileSync(filePath, noFrontmatterContent, 'utf8');

      const firstRead = await adapter.readCategory('learning');
      expect(firstRead).toHaveLength(1);
      expect(firstRead[0].importance).toBe(3);
      const mintedId = firstRead[0].id;
      const mintedCreatedAt = firstRead[0].createdAt;

      const rewritten = fs.readFileSync(filePath, 'utf8');
      expect(rewritten).toContain(`id: ${mintedId}`);
      expect(rewritten).toContain('---');

      const secondRead = await adapter.readCategory('learning');
      expect(secondRead[0].id).toBe(mintedId);
      expect(secondRead[0].createdAt).toBe(mintedCreatedAt);
      expect(secondRead[0].content).toContain('Just some content, no frontmatter at all.');
    });

    it('35-10: write -> read -> write is byte-stable, and every field survives unchanged', async () => {
      const adapter = new MdStorageAdapter({ storagePath: testDir });

      await adapter.writeEntry('learning', {
        id: 'roundtrip-1',
        content: '## A fully specified entry\n\nWith a real body.',
        tags: ['alpha', 'beta'],
        importance: 4,
        taskId: 'task-42',
        createdAt: '2026-07-28T12:00:00.000Z',
      });

      const filePath = path.join(testDir, 'learning.md');
      const bytesAfterFirstWrite = fs.readFileSync(filePath, 'utf8');

      const readBack = await adapter.readCategory('learning');
      expect(readBack).toHaveLength(1);
      expect(readBack[0]).toEqual({
        id: 'roundtrip-1',
        category: 'learning',
        kind: 'learning',
        content: '## A fully specified entry\n\nWith a real body.',
        tags: ['alpha', 'beta'],
        importance: 4,
        taskId: 'task-42',
        createdAt: '2026-07-28T12:00:00.000Z',
      });

      // Fully-specified entries need no repair, so readCategory must not
      // have touched the file at all.
      const bytesAfterRead = fs.readFileSync(filePath, 'utf8');
      expect(bytesAfterRead).toBe(bytesAfterFirstWrite);

      // Writing the unchanged, already-read-back entry produces byte-identical output.
      await adapter.writeEntry('learning', readBack[0]);
      const bytesAfterSecondWrite = fs.readFileSync(filePath, 'utf8');
      expect(bytesAfterSecondWrite).toBe(bytesAfterFirstWrite);
    });

    it('35-11: hand-editing only the body text (outside the adapter) preserves every frontmatter field exactly', async () => {
      const adapter = new MdStorageAdapter({ storagePath: testDir });

      await adapter.writeEntry('learning', {
        id: 'hand-edit-1',
        content: '## Original body\n\nOriginal text.',
        tags: ['alpha', 'beta'],
        importance: 5,
        taskId: 'task-77',
        createdAt: '2026-07-28T12:00:00.000Z',
      });

      const filePath = path.join(testDir, 'learning.md');
      const original = fs.readFileSync(filePath, 'utf8');

      // Simulate a human editing only the body in an editor, leaving the
      // frontmatter block byte-for-byte untouched.
      const handEdited = original.replace(
        '## Original body\n\nOriginal text.',
        '## Edited body\n\nA human rewrote this paragraph entirely.'
      );
      expect(handEdited).not.toBe(original);
      fs.writeFileSync(filePath, handEdited, 'utf8');

      const readBack = await adapter.readCategory('learning');
      expect(readBack).toHaveLength(1);
      expect(readBack[0]).toEqual({
        id: 'hand-edit-1',
        category: 'learning',
        kind: 'learning',
        content: '## Edited body\n\nA human rewrote this paragraph entirely.',
        tags: ['alpha', 'beta'],
        importance: 5,
        taskId: 'task-77',
        createdAt: '2026-07-28T12:00:00.000Z',
      });
    });

    it('35-12: a repair writes an observable warning to stderr naming the file and field, not just the file', async () => {
      const adapter = new MdStorageAdapter({ storagePath: testDir });
      await adapter.ensureScaffolded(['learning']);

      const content = `# Category: learning

---
createdAt: 2026-07-28T12:00:00.000Z
importance: 5
tags: []
---
## Entry with no id line

Body content.
`;
      const filePath = path.join(testDir, 'learning.md');
      fs.writeFileSync(filePath, content, 'utf8');

      const stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
      await adapter.readCategory('learning');
      const warnings = stderrSpy.mock.calls.map(call => String(call[0]));
      stderrSpy.mockRestore();

      expect(warnings.some(w => w.includes('[neuron warning]') && w.includes(filePath) && /\bid\b/.test(w))).toBe(true);
    });
  });
});
