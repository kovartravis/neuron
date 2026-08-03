import { describe, it, expect } from 'vitest';
import path from 'node:path';
import fs from 'node:fs';
import { SmolLM2Summarizer } from './summarizer.js';

describe('SmolLM2Summarizer & Content Cache', () => {
  const summarizer = new SmolLM2Summarizer();

  it('generates a 1-sentence purpose summary for a source file and caches it', async () => {
    const filePath = 'src/storage/dualStorageRouter.ts';
    const code = `/** Handles dual storage reads and writes across Markdown and SQLite */\nexport class DualStorageRouter {}\n`;

    const summary1 = await summarizer.summarizeFile(filePath, code);

    expect(typeof summary1).toBe('string');
    expect(summary1.length).toBeGreaterThan(10);
    expect(summary1).toContain('storage');

    // Second call should hit the content hash cache instantly
    const summary2 = await summarizer.summarizeFile(filePath, code);
    expect(summary2).toBe(summary1);
  });

  it('falls back gracefully to AST signature purpose if LLM pipeline is offline or mock mode', async () => {
    const filePath = 'src/components/embedder.ts';
    const code = `export class TransformersEmbedder {\n  embed(text: string) {}\n}\n`;

    const summary = await summarizer.summarizeFile(filePath, code, { forceFallback: true });

    expect(summary).toContain('TransformersEmbedder');
    expect(summary).toContain('embed');
  });

  it('Pass 2: synthesizes full system architecture memory card from module summaries', async () => {
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

    expect(card.markdown).toContain('# 🏛️ Repository Architectural Blueprint: @kovartravis/neuron');
    expect(card.markdown).toContain('Dual storage routing');
    expect(card.summary.length).toBeGreaterThan(20);
  });

  it('produces byte-identical markdown across two runs on unchanged input (ticket 37)', async () => {
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

    expect(second.markdown).toBe(first.markdown);
  });
});

