import fs from 'node:fs';
import path from 'node:path';
import { NeuronMemory } from '../index.js';
import { MultiRootMdStorage } from '../storage/multiRootMdStorage.js';
import { syncMdWithVector } from '../storage/mdVectorSync.js';
import { loadNeuronYaml, DEFAULT_CONFIG, NeuronConfig } from '../config/neuronYaml.js';
import { resolveAllCategoryRoots } from '../config/categoryPath.js';

export async function handleSyncCommand(args: string[], memory: NeuronMemory, overrideStoragePath?: string): Promise<void> {
  const knownFlags = ['--dry-run', '--force', '-c', '--category'];
  const hasInvalidFlags = args.some(arg => arg.startsWith('-') && !knownFlags.includes(arg));
  if (hasInvalidFlags) {
    console.error('Error: Unrecognized CLI argument passed to sync command.');
    process.exitCode = 1;
    throw new Error('Unrecognized CLI arguments');
  }

  const dryRun = args.includes('--dry-run');
  const force = args.includes('--force');

  let category: string | undefined;
  const cIndex = args.indexOf('-c') !== -1 ? args.indexOf('-c') : args.indexOf('--category');
  if (cIndex !== -1 && args[cIndex + 1]) {
    category = args[cIndex + 1];
  }

  let config: NeuronConfig;
  try {
    config = loadNeuronYaml(process.cwd());
  } catch {
    config = DEFAULT_CONFIG;
  }

  const mdAdapter = new MultiRootMdStorage(config, process.cwd(), overrideStoragePath);

  const categories = category
    ? [category]
    : Object.keys(config.categories || { learning: {}, history: {}, decisions: {} });

  const isTTY = process.stdout.isTTY;
  if (isTTY) {
    console.log(`[sync] Starting synchronization across categories: ${categories.join(', ')}...`);
  } else {
    console.log(`[sync] Processing categories: ${categories.join(', ')}`);
  }

  // Ticket 05: report per-root, not just per-category — a category with an
  // overridden `path` writes somewhere other than the rest of the project.
  if (!overrideStoragePath) {
    const roots = resolveAllCategoryRoots(config, process.cwd());
    if (roots.size > 1) {
      for (const [root, cats] of roots) {
        console.log(`[sync]   ${root}: ${cats.join(', ')}`);
      }
    }
  }

  const result = await syncMdWithVector(memory, mdAdapter, config, {
    dryRun,
    force,
    categories,
  });

  const verb = dryRun ? 'DRY RUN complete' : 'Sync complete';
  const conflictNote = result.conflicts.length > 0 ? `, ${result.conflicts.length} conflicts` : '';
  console.log(`[sync] ${verb}: ${result.syncedToVector} to vector DB, ${result.syncedToMarkdown} to markdown, ${result.skipped} skipped${conflictNote}.`);

  if (result.conflicts.length > 0) {
    console.error(
      `[sync] ${result.conflicts.length} entr${result.conflicts.length === 1 ? 'y has' : 'ies have'} ` +
        `different content in the vector DB and markdown, and neither side is known to be fresher — ` +
        `left untouched rather than guessed at:`
    );
    for (const c of result.conflicts) {
      console.error(`  - ${c.category}/${c.id}`);
    }
    console.error(`[sync] Re-run with --force to make markdown authoritative for these entries.`);
    process.exitCode = 1;
  }
}

export function scaffoldNeuronDirectory(projectDir: string, config?: NeuronConfig): string[] {
  const effectiveConfig: NeuronConfig = {
    ...DEFAULT_CONFIG,
    ...config,
    storage: config?.storage ?? DEFAULT_CONFIG.storage,
    categories: config?.categories ?? { learning: {}, history: {}, decisions: {} },
  };
  const roots = resolveAllCategoryRoots(effectiveConfig, projectDir);
  const scaffolded: string[] = [];

  for (const [storagePath, categories] of roots) {
    if (!fs.existsSync(storagePath)) {
      fs.mkdirSync(storagePath, { recursive: true });
    }

    for (const cat of categories) {
      const filePath = path.join(storagePath, `${cat}.md`);
      if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, `# Category: ${cat}\n\n`, 'utf8');
        scaffolded.push(filePath);
      }
    }
  }

  return scaffolded;
}

export default handleSyncCommand;
