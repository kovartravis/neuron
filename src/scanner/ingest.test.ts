import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { NeuronMemory } from '../index.js';
import { ingestScanResults } from './ingest.js';

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

    // Verify memory query returns the ingested card
    const queried = await memory.query({
      categories: ['decisions'],
      limit: 5,
    });

    expect(queried.length).toBe(1);
    expect(queried[0].content).toContain('Repository Architectural Blueprint: test-ingest-project');
    expect(queried[0].tags).toContain('architecture');
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

    expect(queried.length).toBe(1);
    expect(queried[0].content).toContain('test-ingest-project');
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

    const blueprintCards = queried.filter(e => e.tags?.includes('architecture'));
    expect(blueprintCards.length).toBe(1);
  });
});



