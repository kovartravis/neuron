import { parseFlags } from './utils.js';
import { scanProjectTopology } from '../scanner/analyzer.js';

export async function handleScanCommand(args: string[]): Promise<void> {
  const { options } = parseFlags(args.slice(1));
  const projectRoot = process.cwd();
  const depth = options.limit || 3;

  const scanResult = await scanProjectTopology(projectRoot, { depth });

  const format = options.format || (options.json ? 'json' : 'md');

  if (format === 'json') {
    console.log(JSON.stringify(scanResult, null, 2));
  } else {
    console.log(scanResult.architectureMarkdown);
  }
}

