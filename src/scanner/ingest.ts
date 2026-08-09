import { createHash } from 'node:crypto';
import { NeuronMemory } from '../index.js';
import type { MemoryMutation } from '../models/memory.js';
import { SmolLM2Summarizer } from '../components/summarizer.js';
import { scanProjectTopology, ScanResult } from './analyzer.js';

function formatHashAsId(hash: string): string {
  return [
    hash.slice(0, 8),
    hash.slice(8, 12),
    hash.slice(12, 16),
    hash.slice(16, 20),
    hash.slice(20, 32),
  ].join('-');
}

/**
 * A stable id for "the" blueprint card in a category, derived rather than
 * looked up. Re-running `neuron scan` must always resolve to the same row —
 * a semantic search over the category can rank the card out of its result
 * window once enough other entries share the category (ticket 37), so
 * there is deliberately no query here at all: same category in, same id out.
 *
 * Ticket 28: this id now identifies the *index* — module list plus
 * project-wide metadata — not the full blueprint. Per-module detail lives
 * at `moduleCardId(category, modulePath)` instead.
 */
export function blueprintCardId(category: string): string {
  const hash = createHash('sha256').update(`neuron:architecture-blueprint:${category}`).digest('hex');
  return formatHashAsId(hash);
}

/**
 * Stable id for one module's detail card. Same category + module path
 * always resolves to the same row, so re-scanning updates each module's
 * card in place instead of duplicating it.
 */
export function moduleCardId(category: string, modulePath: string): string {
  const hash = createHash('sha256').update(`neuron:architecture-module:${category}:${modulePath}`).digest('hex');
  return formatHashAsId(hash);
}

/**
 * Matches the index's `## 📦 Primary Subsystems` list lines
 * (`- **name** — \`path\` (N files)`). Deliberately without backticks
 * inside the bold module-name markers (see `synthesizeArchitecture`), so
 * this can never collide with `parseBaselineBlueprint`'s file-line regex in
 * `diff.ts`, which requires backticks *inside* the bold markers.
 */
const MODULE_LIST_LINE = /^-\s+\*\*(.+?)\*\*\s+—\s+`([^`]+)`\s+\(\d+\s+files?\)\s*$/;

export function parseModuleListFromIndex(indexMarkdown: string): Array<{ name: string; path: string }> {
  const modules: Array<{ name: string; path: string }> = [];
  for (const line of indexMarkdown.split('\n')) {
    const match = line.match(MODULE_LIST_LINE);
    if (match) {
      modules.push({ name: match[1].trim(), path: match[2].trim() });
    }
  }
  return modules;
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
  const { summary, index, modules } = await summarizer.synthesizeArchitecture(scanData);

  const indexId = blueprintCardId(category);
  const tags = ['architecture', 'topology', 'scan', 'deep'];

  const mutations: MemoryMutation[] = [
    { op: 'upsert', id: indexId, category, content: index, tags, importance: 5 },
    ...modules.map(mod => ({
      op: 'upsert' as const,
      id: moduleCardId(category, mod.path),
      category,
      content: mod.markdown,
      tags,
      importance: 5,
    })),
  ];

  // Delete stale module cards: a module that existed in the previous index
  // but not the current scan has been removed from the repo, and its
  // detail card would otherwise linger and surface via ordinary relevance
  // recall, describing code that's gone.
  const previousIndex = await memory.findById(indexId);
  if (previousIndex) {
    const currentPaths = new Set(modules.map(mod => mod.path));
    for (const prevModule of parseModuleListFromIndex(previousIndex.content)) {
      if (!currentPaths.has(prevModule.path)) {
        mutations.push({ op: 'delete', category, id: moduleCardId(category, prevModule.path) });
      }
    }
  }

  const res = await memory.transact(mutations);

  return {
    id: res[0].id,
    category,
    summary,
  };
}

/**
 * Ticket 29: `parseBaselineBlueprint`/`calculateArchitecturalDiff` (`diff.ts`)
 * need the architecture data complete — every module, every file+export —
 * to compute drift. Ticket 28 split storage into an index (module list
 * only) plus N per-module cards, so this reconstructs the pre-28
 * monolithic shape at read time: fetch the index, parse its module list,
 * fetch each module's card, concatenate. A module whose card is missing
 * (shouldn't happen post-28, but don't trust it) is skipped — the loss
 * surfaces as a lower-fidelity diff rather than a crash.
 *
 * Lives here rather than in `diff.ts` to avoid a circular import: `diff.ts`
 * already imports from this module, and this module imports nothing from
 * `diff.ts`.
 */
export async function reassembleBaseline(
  memory: NeuronMemory,
  category: string
): Promise<{ id: string; content: string } | null> {
  const index = await memory.findById(blueprintCardId(category));
  if (!index) return null;

  const parts = [index.content];
  for (const mod of parseModuleListFromIndex(index.content)) {
    const card = await memory.findById(moduleCardId(category, mod.path));
    if (card) parts.push(card.content);
  }

  return { id: index.id, content: parts.join('\n') };
}
