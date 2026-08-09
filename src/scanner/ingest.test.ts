import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { NeuronMemory } from '../index.js';
import { ingestScanResults, blueprintCardId, moduleCardId } from './ingest.js';

describe('Architecture Scan Ingestion (ingestScanResults)', () => {
  let tmpDir: string;
  let memory: NeuronMemory;

  beforeEach(async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'neuron-ingest-test-'));
    // Setup a minimal project in tmpDir
    fs.writeFileSync(
      path.join(tmpDir, 'package.json'),
      JSON.stringify({ name: 'test-ingest-project', dependencies: { typescript: '^5.0.0' } }),
      'utf8'
    );
    fs.mkdirSync(path.join(tmpDir, 'src'), { recursive: true });
    fs.writeFileSync(
      path.join(tmpDir, 'src', 'index.ts'),
      `/** Main app entry */\nexport class AppRunner { start() { return true; } }`,
      'utf8'
    );

    memory = new NeuronMemory({
      dbPath: path.join(tmpDir, 'memory.db'),
      projectRoot: tmpDir,
      projectName: 'test-ingest-project',
    });
  });

  afterEach(async () => {
    if (memory) {
      await memory.close();
    }
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('should scan project and ingest architectural blueprint card into decisions category', async () => {
    const result = await ingestScanResults(memory, {
      projectDir: tmpDir,
      category: 'decisions',
    });

    expect(result.id).toBeDefined();
    expect(result.category).toBe('decisions');
    expect(result.summary).toContain('test-ingest-project');

    // Verify memory query returns the ingested index plus its one module card
    // (ticket 28: the blueprint is now split, not a single entry).
    const queried = await memory.query({
      categories: ['decisions'],
      limit: 5,
    });

    expect(queried.length).toBe(2);
    const index = queried.find(e => e.content?.startsWith('# 🏛️ Repository Architectural Blueprint'));
    expect(index).toBeDefined();
    expect(index!.content).toContain('Repository Architectural Blueprint: test-ingest-project');
    expect(index!.tags).toContain('architecture');
  });

  it('should support custom category ingest override', async () => {
    const result = await ingestScanResults(memory, {
      projectDir: tmpDir,
      category: 'learning',
    });

    expect(result.category).toBe('learning');

    const queried = await memory.query({
      categories: ['learning'],
      limit: 5,
    });

    expect(queried.length).toBe(2);
    expect(queried.some(e => e.content?.includes('test-ingest-project'))).toBe(true);
  });

  it('never creates a duplicate card on repeat ingestion, even when other entries in the category outrank it semantically (ticket 37)', async () => {
    const first = await ingestScanResults(memory, {
      projectDir: tmpDir,
      category: 'decisions',
    });

    // Flood the category with decoys whose content is a near-verbatim match
    // for ingestScanResults' internal lookup text ('Repository Architectural
    // Blueprint'), so a semantic top-10 search ranks them above the real
    // card and the old `.find()`-over-a-query lookup would miss it entirely.
    const decoys = Array.from({ length: 12 }, (_, i) => ({
      op: 'upsert' as const,
      category: 'decisions',
      content: `Repository Architectural Blueprint decoy entry number ${i}`,
      tags: ['decoy'],
      importance: 3,
    }));
    await memory.transact(decoys);

    const second = await ingestScanResults(memory, {
      projectDir: tmpDir,
      category: 'decisions',
    });

    expect(second.id).toBe(first.id);

    const queried = await memory.query({
      categories: ['decisions'],
      limit: 20,
    });

    // Index + its one module card, still just one of each — not duplicated
    // by the second ingest (ticket 28: two entries share the 'architecture'
    // tag now, not one).
    const blueprintCards = queried.filter(e => e.tags?.includes('architecture'));
    expect(blueprintCards.length).toBe(2);
  });

  describe('index + per-module cards (ticket 28)', () => {
    beforeEach(() => {
      fs.mkdirSync(path.join(tmpDir, 'lib'), { recursive: true });
      fs.writeFileSync(
        path.join(tmpDir, 'lib', 'util.ts'),
        `export function helper() { return 1; }`,
        'utf8'
      );
    });

    it('stores a small index (no per-file detail) plus one card per module', async () => {
      await ingestScanResults(memory, { projectDir: tmpDir, category: 'decisions' });

      const index = await memory.findById(blueprintCardId('decisions'));
      expect(index).not.toBeNull();
      expect(index!.content).toContain('# 🏛️ Repository Architectural Blueprint');
      expect(index!.content).toContain('- **src** — `src` (1 file)');
      expect(index!.content).toContain('- **lib** — `lib` (1 file)');
      expect(index!.content).not.toContain('Key Components & Export Contracts');

      const srcModule = await memory.findById(moduleCardId('decisions', 'src'));
      const libModule = await memory.findById(moduleCardId('decisions', 'lib'));
      expect(srcModule).not.toBeNull();
      expect(srcModule!.content).toContain('Key Components & Export Contracts');
      expect(libModule).not.toBeNull();
      expect(libModule!.content).toContain('helper');
    });

    it('produces byte-identical index and module card content across two scans with no changes', async () => {
      await ingestScanResults(memory, { projectDir: tmpDir, category: 'decisions' });
      const first = await memory.query({ categories: ['decisions'], limit: 20 });

      await ingestScanResults(memory, { projectDir: tmpDir, category: 'decisions' });
      const second = await memory.query({ categories: ['decisions'], limit: 20 });

      const byId = (entries: typeof first) =>
        Object.fromEntries(entries.map(e => [e.id, e.content]));
      expect(byId(second)).toEqual(byId(first));
      expect(second.length).toBe(first.length);
    });

    it('deletes a module card when its module disappears from a re-scan', async () => {
      await ingestScanResults(memory, { projectDir: tmpDir, category: 'decisions' });
      const libId = moduleCardId('decisions', 'lib');
      expect(await memory.findById(libId)).not.toBeNull();

      fs.rmSync(path.join(tmpDir, 'lib'), { recursive: true, force: true });
      await ingestScanResults(memory, { projectDir: tmpDir, category: 'decisions' });

      expect(await memory.findById(libId)).toBeNull();
      // The surviving module's card is untouched, not just the removed one skipped.
      const srcId = moduleCardId('decisions', 'src');
      expect(await memory.findById(srcId)).not.toBeNull();
    });
  });
});



