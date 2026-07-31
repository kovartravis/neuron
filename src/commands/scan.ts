import { parseFlags, SCAN_HELP } from './utils.js';
import { scanProjectTopology } from '../scanner/analyzer.js';
import { ingestScanResults } from '../scanner/ingest.js';
import { ScanProgressBar } from '../ui/progress.js';
import { NeuronMemory } from '../index.js';
import { loadNeuronConfig } from '../config/neuronYaml.js';

export async function handleScanCommand(args: string[], memory?: NeuronMemory): Promise<void> {
  if (args[1] === '--help' || args[1] === '-h') {
    console.log(SCAN_HELP);
    return;
  }

  const { options } = parseFlags(args.slice(1));
  const projectRoot = process.cwd();
  const config = loadNeuronConfig(projectRoot);
  const depth = options.depth || options.limit || config.scan?.depth || 3;
  const category = options.category || config.scan?.category || 'decisions';

  const isDryRun = !!(options as any)['dry-run'] || !!options.dryRun || !!options.json || options.format === 'json';
  const progressBar = new ScanProgressBar({ enabled: !options.noProgress });

  try {
    if (isDryRun) {
      const scanResult = await scanProjectTopology(projectRoot, {
        depth,
        onProgress: (p) => progressBar.update(p)
      });
      progressBar.clear();

      const format = options.format || (options.json ? 'json' : 'md');
      if (format === 'json') {
        console.log(JSON.stringify(scanResult, null, 2));
      } else {
        console.log(scanResult.architectureMarkdown);
      }
      return;
    }

    // Full scan & ingest into memory
    let ownedMemory = false;
    let memInstance = memory;
    if (!memInstance) {
      memInstance = NeuronMemory.open(projectRoot);
      ownedMemory = true;
    }

    try {
      const result = await ingestScanResults(memInstance, {
        projectDir: projectRoot,
        category,
        depth,
        force: !!options.force,
      });
      progressBar.clear();
      console.log(JSON.stringify(result));
    } finally {
      if (ownedMemory && memInstance) {
        await memInstance.close();
      }
    }
  } finally {
    progressBar.clear();
  }
}
