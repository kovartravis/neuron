import { NeuronMemory } from '../index.js';
import { SmolLM2Summarizer } from '../components/summarizer.js';
import { scanProjectTopology, ScanResult } from './analyzer.js';

export interface IngestOptions {
  projectDir?: string;
  category?: string;
  depth?: number;
  force?: boolean;
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
  const { summary, markdown } = await summarizer.synthesizeArchitecture(scanData, { category });

  let existingId: string | undefined = undefined;
  try {
    const existingScanEntries = await memory.query({
      categories: [category],
      text: 'Repository Architectural Blueprint',
      limit: 10,
    });
    const match = existingScanEntries.find(e =>
      e.content?.includes('# 🏛️ Repository Architectural Blueprint:') ||
      e.tags?.includes('scan')
    );
    if (match) {
      existingId = match.id;
    }
  } catch (e) {
    // If query fails, proceed with new entry creation
  }

  const res = await memory.transact([
    {
      op: 'upsert',
      id: existingId,
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




