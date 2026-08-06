import { parseFlags, SCAN_HELP } from './utils.js';
import { scanProjectTopology } from '../scanner/analyzer.js';
import { ingestScanResults } from '../scanner/ingest.js';
import { getArchitecturalDrift, formatArchitecturalDiffMarkdown } from '../scanner/diff.js';
import { computeProjectFingerprint, writeReconciledFingerprint } from '../scanner/fingerprint.js';
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
  const category = options.category || config.scan?.category || 'architecture';

  const isDiffMode = !!options.diff || !!options.check;
  const isDryRun = !!(options as any)['dry-run'] || !!options.dryRun || !!options.json || options.format === 'json';
  const progressBar = new ScanProgressBar({ enabled: !options.noProgress });

  try {
    if (isDiffMode) {
      let ownedMemory = false;
      let memInstance = memory;
      if (!memInstance) {
        memInstance = NeuronMemory.open(projectRoot);
        ownedMemory = true;
      }
      try {
        const diff = await getArchitecturalDrift(memInstance, projectRoot);
        progressBar.clear();

        const format = options.format || (options.json ? 'json' : 'md');
        if (format === 'json') {
          // currentScan is an internal carrier for re-ingest, not part of the
          // reported diff — omit it so the payload stays readable.
          const { currentScan, ...reportable } = diff;
          console.log(JSON.stringify(reportable, null, 2));
        } else {
          console.log(formatArchitecturalDiffMarkdown(diff));
        }

        if (options.check) {
          // 2 is distinct from 1 on purpose: an incomparable baseline is not
          // drift, and the fix is `neuron scan`, not a code review.
          if (diff.needsRebaseline) {
            process.exitCode = 2;
          } else if (diff.hasDrift) {
            process.exitCode = 1;
          }
        }
      } finally {
        if (ownedMemory && memInstance) {
          await memInstance.close();
        }
      }
      return;
    }

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
      // Captured before the scan: if a file changes mid-scan the fingerprint
      // won't match next run, so the guard re-scans rather than caching a
      // baseline that never reflected that edit.
      const fingerprint = computeProjectFingerprint(projectRoot, { depth, category });

      const result = await ingestScanResults(memInstance, {
        projectDir: projectRoot,
        category,
        depth,
      });

      // Prime the drift guard so the next query doesn't redo this scan.
      writeReconciledFingerprint(projectRoot, fingerprint);

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
