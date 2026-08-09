import { createHash } from 'node:crypto';
import { NeuronMemory } from '../index.js';
import { SmolLM2Summarizer } from '../components/summarizer.js';
import { scanProjectTopology, ScanResult } from './analyzer.js';

/**
 * A stable id for "the" blueprint card in a category, derived rather than
 * looked up. Re-running `neuron scan` must always resolve to the same row —
 * a semantic search over the category can rank the card out of its result
 * window once enough other entries share the category (ticket 37), so
 * there is deliberately no query here at all: same category in, same id out.
 */
export function blueprintCardId(category: string): string {
  const hash = createHash('sha256').update(`neuron:architecture-blueprint:${category}`).digest('hex');
  return [
    hash.slice(0, 8),
    hash.slice(8, 12),
    hash.slice(12, 16),
    hash.slice(16, 20),
    hash.slice(20, 32),
  ].join('-');
}

export interface IngestOptions {
  projectDir?: string;
  category?: string;
  depth?: number;
  /**
   * A topology scan the caller has already run. Supplying it avoids a second
   * full AST traversal when the caller (e.g. drift auto-rescan) just scanned.
   */
  scanData?: ScanResult;
}

export async function ingestScanResults(
  memory: NeuronMemory,
  options: IngestOptions = {}
): Promise<{ id: string; category: string; summary: string }> {
  const projectDir = options.projectDir || process.cwd();
  const category = options.category || 'architecture';
  const depth = options.depth || 3;

  const scanData = options.scanData ?? (await scanProjectTopology(projectDir, { depth }));
  const summarizer = new SmolLM2Summarizer();
  const { summary, markdown } = await summarizer.synthesizeArchitecture(scanData);

  const res = await memory.transact([
    {
      op: 'upsert',
      id: blueprintCardId(category),
      category,
      content: markdown,
      tags: ['architecture', 'topology', 'scan', 'deep'],
      importance: 5,
    },
  ]);

  return {
    id: res[0].id,
    category,
    summary,
  };
}




