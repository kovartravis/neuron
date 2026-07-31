import { NeuronMemory } from '../index.js';
import { SmolLM2Summarizer } from '../components/summarizer.js';
import { scanProjectTopology } from './analyzer.js';

export interface IngestOptions {
  projectDir?: string;
  category?: string;
  depth?: number;
  force?: boolean;
}

export async function ingestScanResults(
  memory: NeuronMemory,
  options: IngestOptions = {}
): Promise<{ id: string; category: string; summary: string }> {
  const projectDir = options.projectDir || process.cwd();
  const category = options.category || 'decisions';
  const depth = options.depth || 3;

  const scanData = await scanProjectTopology(projectDir, { depth });
  const summarizer = new SmolLM2Summarizer();
  const { summary, markdown } = await summarizer.synthesizeArchitecture(scanData);

  const res = await memory.transact([
    {
      op: 'upsert',
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




