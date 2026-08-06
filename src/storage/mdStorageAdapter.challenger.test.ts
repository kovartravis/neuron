import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { MdStorageAdapter } from './mdStorageAdapter.js';

describe('MdStorageAdapter Empirical Challenger Stress Harness', () => {
  const testDir = path.join(process.cwd(), 'src', '__tests__', `challenger-md-adapter-${Date.now()}`);

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

  describe('1. Core Contract & Frontmatter Parsing Integrity', () => {
    it('1.1: Frontmatter field preservation (id, createdAt, importance, tags, taskId)', async () => {
      const adapter = new MdStorageAdapter({ storagePath: testDir });

      const inputEntry = {
        id: 'explicit-id-100',
        content: '## Entry Content\n\nDetailed body paragraph.',
        tags: ['learning', 'tdd'],
        importance: 4,
        taskId: 'task-777',
        createdAt: '2026-07-28T12:00:00.000Z',
      };

      await adapter.writeEntry('learning', inputEntry);
      const readBack = await adapter.readCategory('learning');

      expect(readBack).toHaveLength(1);
      expect(readBack[0].id).toBe('explicit-id-100');
      expect(readBack[0].category).toBe('learning');
      expect(readBack[0].importance).toBe(4);
      expect(readBack[0].tags).toEqual(['learning', 'tdd']);
      expect(readBack[0].taskId).toBe('task-777');
      expect(readBack[0].createdAt).toBe('2026-07-28T12:00:00.000Z');
      expect(readBack[0].content).toBe('## Entry Content\n\nDetailed body paragraph.');
    });

    it('1.2: Roundtrip parseMarkdown(formatMarkdown(...)) preserves ID without generating random UUIDs', () => {
      const adapter = new MdStorageAdapter({ storagePath: testDir });
      const sample = [
        {
          id: 'fixed-id-999',
          category: 'history',
          kind: 'history',
          content: '## Executed action\n\nOutput string',
          tags: ['exec'],
          importance: 3,
          createdAt: '2026-07-28T10:00:00.000Z',
        },
      ];

      const formatted = adapter.formatMarkdown(sample, 'history');
      const parsed = adapter.parseMarkdown(formatted, 'history');

      expect(parsed).toHaveLength(1);
      expect(parsed[0].id).toBe('fixed-id-999');
      expect(parsed[0].content).toBe('## Executed action\n\nOutput string');
    });
  });

  describe('2. Content Mutation & Edge Cases', () => {
    it('2.1: Entry content starting without # heading must not mutate user string on save/read roundtrip', async () => {
      const adapter = new MdStorageAdapter({ storagePath: testDir });
      const originalText = 'Unformatted plain text learning note.';

      await adapter.writeEntry('learning', {
        id: 'no-heading-1',
        content: originalText,
      });

      const memories = await adapter.readCategory('learning');
      expect(memories).toHaveLength(1);
      expect(memories[0].content).toBe(originalText);
    });

    it('2.2: Updating existing entry modifies only requested fields and preserves ID', async () => {
      const adapter = new MdStorageAdapter({ storagePath: testDir });

      await adapter.writeEntry('decisions', {
        id: 'adr-1',
        content: '## Decision\nUse Markdown for storage',
        importance: 2,
      });

      const updated = await adapter.updateEntry('decisions', {
        id: 'adr-1',
        importance: 5,
      });

      expect(updated.id).toBe('adr-1');
      expect(updated.importance).toBe(5);

      const reRead = await adapter.readCategory('decisions');
      expect(reRead).toHaveLength(1);
      expect(reRead[0].id).toBe('adr-1');
      expect(reRead[0].importance).toBe(5);
    });
  });

  describe('3. Corrupt Frontmatter Parsing Resilience', () => {
    it('3.1: Malformed frontmatter hard-errors naming the file, instead of fabricating a fallback entry (ticket 35)', async () => {
      const adapter = new MdStorageAdapter({ storagePath: testDir });
      await adapter.ensureScaffolded(['learning']);

      const corruptMd = `# Category: learning

---
id: broken-frontmatter
invalid: [unclosed array
---
## Corrupt Item Title

Body text under broken frontmatter.
`;
      const filePath = path.join(testDir, 'learning.md');
      fs.writeFileSync(filePath, corruptMd, 'utf8');

      await expect(adapter.readCategory('learning')).rejects.toThrow(filePath);
    });

    it('3.2: Path traversal in category parameter is contained within storagePath', async () => {
      const adapter = new MdStorageAdapter({ storagePath: testDir });
      const pathTraversalCategory = '../../outside_dir';

      await adapter.writeEntry(pathTraversalCategory, {
        id: 'pt-1',
        content: '## Traversal test',
      });

      const expectedPath = path.resolve(adapter.getFilePath(pathTraversalCategory));
      const isContained = expectedPath.startsWith(path.resolve(testDir));
      expect(isContained).toBe(true);
    });

    it('3.3: Multiline tags and complex frontmatter values parse cleanly', async () => {
      const adapter = new MdStorageAdapter({ storagePath: testDir });

      await adapter.writeEntry('learning', {
        id: 'weird-id',
        content: '## Complex tags',
        tags: ['tag1', 'tag2', 'tag3'],
        importance: 5,
      });

      const memories = await adapter.readCategory('learning');
      expect(memories).toHaveLength(1);
      expect(memories[0].id).toBe('weird-id');
      expect(memories[0].importance).toBe(5);
      expect(memories[0].tags).toEqual(['tag1', 'tag2', 'tag3']);
    });

    it('3.4: Stress tests horizontal rules (---) inside markdown content body', async () => {
      const adapter = new MdStorageAdapter({ storagePath: testDir });

      const contentWithHr = `## Title with HR

Paragraph 1

---

Paragraph 2 after divider line.`;

      await adapter.writeEntry('learning', {
        id: 'hr-test-id',
        content: contentWithHr,
      });

      const readBack = await adapter.readCategory('learning');
      expect(readBack.length).toBeGreaterThan(0);
      expect(readBack[0].id).toBe('hr-test-id');
    });
  });

  describe('4. Deletion Operations', () => {
    it('4.1: deleteEntry on non-existent ID returns false', async () => {
      const adapter = new MdStorageAdapter({ storagePath: testDir });
      await adapter.ensureScaffolded(['learning']);

      const deleted = await adapter.deleteEntry('learning', 'non-existent-id');
      expect(deleted).toBe(false);
    });

    it('4.2: deleteEntry removes exact target item and preserves all other items', async () => {
      const adapter = new MdStorageAdapter({ storagePath: testDir });

      await adapter.writeEntry('history', { id: 'h1', content: '## Item 1' });
      await adapter.writeEntry('history', { id: 'h2', content: '## Item 2' });

      const deleted = await adapter.deleteEntry('history', 'h2');
      expect(deleted).toBe(true);

      const remaining = await adapter.readCategory('history');
      expect(remaining).toHaveLength(1);
      expect(remaining[0].id).toBe('h1');
    });

    it('4.3: deleteEntry on last entry leaves clean header-only category file', async () => {
      const adapter = new MdStorageAdapter({ storagePath: testDir });

      await adapter.writeEntry('decisions', { id: 'single-dec', content: '## Single Item' });
      const deleted = await adapter.deleteEntry('decisions', 'single-dec');
      expect(deleted).toBe(true);

      const remaining = await adapter.readCategory('decisions');
      expect(remaining).toHaveLength(0);

      const fileContent = fs.readFileSync(path.join(testDir, 'decisions.md'), 'utf8');
      expect(fileContent.trim()).toBe('# Category: decisions');
    });
  });
});
