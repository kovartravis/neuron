import { parseFlags } from './utils.js';
import { scanProjectTopology } from '../scanner/analyzer.js';
import { ScanProgressBar } from '../ui/progress.js';

export async function handleScanCommand(args: string[]): Promise<void> {
  const { options } = parseFlags(args.slice(1));
  const projectRoot = process.cwd();
  const depth = options.limit || 3;

  const progressBar = new ScanProgressBar({ enabled: !options.noProgress });

  try {
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
  } finally {
    progressBar.clear();
  }
}


