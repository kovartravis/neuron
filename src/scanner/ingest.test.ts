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
});



