import { describe, it, expect } from 'vitest';
import path from 'node:path';
import fs from 'node:fs';
import { SmolLM2Summarizer } from './summarizer.js';

describe('SmolLM2Summarizer & Content Cache', () => {
  const summarizer = new SmolLM2Summarizer();

  it('extracts a JSDoc header comment as the file purpose, deterministically (ticket 26: no model call)', () => {
    const filePath = 'src/storage/dualStorageRouter.ts';
    const code = `/** Handles dual storage reads and writes across Markdown and SQLite */\nexport class DualStorageRouter {}\n`;

    const summary1 = summarizer.summarizeFile(filePath, code);

    expect(typeof summary1).toBe('string');
    expect(summary1.length).toBeGreaterThan(10);
    expect(summary1).toContain('storage');

    // Same input, no model, no cache — must be byte-identical every call.
    const summary2 = summarizer.summarizeFile(filePath, code);
    expect(summary2).toBe(summary1);
  });

  it('falls back to an AST signature purpose when there is no header comment', () => {
    const filePath = 'src/components/embedder.ts';
    const code = `export class TransformersEmbedder {\n  embed(text: string) {}\n}\n`;

    const summary = summarizer.summarizeFile(filePath, code);

    expect(summary).toContain('TransformersEmbedder');
    expect(summary).toContain('embed');
  });

  it('Pass 2: synthesizes an index plus one markdown block per module (ticket 28)', async () => {
    const mockScanData = {
      project: 'neuron',
      manifest: { name: '@kovartravis/neuron', techStack: ['nodejs', 'typescript'] },
      modules: [
        {
          name: 'storage',
          path: 'src/storage',
          purpose: 'Dual storage routing and vector sync engine.',
          components: [{ file: 'src/storage/dualStorageRouter.ts', purpose: 'Routes storage reads/writes.', exports: ['DualStorageRouter'] }]
        }
      ]
    };

    const card = await summarizer.synthesizeArchitecture(mockScanData);

    expect(card.index).toContain('# 🏛️ Repository Architectural Blueprint: @kovartravis/neuron');
    expect(card.index).toContain('- **storage** — `src/storage` (1 file)');
    expect(card.modules).toHaveLength(1);
    expect(card.modules[0].path).toBe('src/storage');
    expect(card.modules[0].markdown).toContain('Dual storage routing');
    expect(card.summary.length).toBeGreaterThan(20);
  });

  it('produces byte-identical index and module markdown across two runs on unchanged input (ticket 37)', async () => {
    const mockScanData = {
      project: 'neuron',
      manifest: { name: '@kovartravis/neuron', techStack: ['nodejs', 'typescript'] },
      modules: [
        {
          name: 'storage',
          path: 'src/storage',
          purpose: 'Dual storage routing and vector sync engine.',
          components: [{ file: 'src/storage/dualStorageRouter.ts', purpose: 'Routes storage reads/writes.', exports: ['DualStorageRouter'] }]
        }
      ]
    };

    const first = await summarizer.synthesizeArchitecture(mockScanData);
    await new Promise(resolve => setTimeout(resolve, 5));
    const second = await summarizer.synthesizeArchitecture(mockScanData);

    expect(second.index).toBe(first.index);
    expect(second.modules).toEqual(first.modules);
  });
});

