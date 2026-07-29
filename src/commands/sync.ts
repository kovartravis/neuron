import fs from 'node:fs';
import path from 'node:path';
import { NeuronMemory } from '../index.js';
import { MdStorageAdapter } from '../storage/mdStorageAdapter.js';
import { syncMdWithVector } from '../storage/mdVectorSync.js';
import { loadNeuronYaml, DEFAULT_CONFIG, NeuronConfig } from '../config/neuronYaml.js';

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

  const configPath = config.storage?.path || '.neuron';
  const storagePath = overrideStoragePath || (path.isAbsolute(configPath) ? configPath : path.resolve(process.cwd(), configPath));
  const mdAdapter = new MdStorageAdapter({ storagePath });

  const categories = category
    ? [category]
    : Object.keys(config.categories || { learning: {}, history: {}, decisions: {} });

  const isTTY = process.stdout.isTTY;
  if (isTTY) {
    console.log(`[sync] Starting synchronization across categories: ${categories.join(', ')}...`);
  } else {
    console.log(`[sync] Processing categories: ${categories.join(', ')}`);
  }

  const result = await syncMdWithVector(memory, mdAdapter, config, {
    dryRun,
    force,
    categories,
  });

  if (dryRun) {
    console.log(`[sync] DRY RUN complete: ${result.syncedToVector} to vector DB, ${result.syncedToMarkdown} to markdown, ${result.skipped} skipped.`);
  } else {
    console.log(`[sync] Sync complete: ${result.syncedToVector} to vector DB, ${result.syncedToMarkdown} to markdown, ${result.skipped} skipped.`);
  }
}

export function scaffoldNeuronDirectory(projectDir: string, config?: NeuronConfig): string[] {
  const storagePath = path.join(projectDir, config?.storage?.path || '.neuron');
  if (!fs.existsSync(storagePath)) {
    fs.mkdirSync(storagePath, { recursive: true });
  }

  const categories = Object.keys(config?.categories || { learning: {}, history: {}, decisions: {} });
  const scaffolded: string[] = [];

  for (const cat of categories) {
    const filePath = path.join(storagePath, `${cat}.md`);
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, `# Category: ${cat}\n\n`, 'utf8');
      scaffolded.push(filePath);
    }
  }

  return scaffolded;
}

export default handleSyncCommand;
