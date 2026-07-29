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
scope: project
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
    expect(memories[0].scope).toBe('project');
    expect(memories[0].taskId).toBe('task-456');
    expect(memories[0].content).toContain('This is the body content of the test learning.');
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
        scope: 'project',
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

  it('R1-T2-02: handles malformed YAML frontmatter gracefully without crashing process', async () => {
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
    fs.writeFileSync(path.join(testDir, 'learning.md'), malformedContent, 'utf8');

    const memories = await adapter.readCategory('learning');
    expect(memories).toHaveLength(1);
    expect(memories[0].id).toBe('malformed-id');
    expect(memories[0].content).toContain('Some body content despite broken frontmatter.');
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
      scope: 'project',
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
});
