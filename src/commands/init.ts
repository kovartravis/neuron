import path from 'node:path';
import fs from 'node:fs';
import { parseFlags, drawBox } from './utils.js';
import { HARNESSES, detectHarnesses, copySkill } from '../config/index.js';
import { loadNeuronConfig } from '../config/neuronYaml.js';
import { SmolLM2Summarizer } from '../components/summarizer.js';
import { TransformersEmbedder } from '../components/embedder.js';
import { ScanProgressBar } from '../ui/progress.js';
import { ingestScanResults } from '../scanner/ingest.js';
import { ensureGrammars, type GrammarFetchOutcome } from '../scanner/grammars.js';
import { computeProjectFingerprint, writeReconciledFingerprint } from '../scanner/fingerprint.js';
import { NeuronMemory } from '../index.js';

export const GITHUB_STAR_URL = 'https://github.com/kovartravis/neuron';

export async function handleInitCommand(args: string[]): Promise<void> {
  const { options } = parseFlags(args.slice(1));
  const projectDir = process.cwd();

  // Detect harnesses and copy the bundled neuron-memory skill
  let detectedSkillsDirs = detectHarnesses(projectDir);
  if (detectedSkillsDirs.length === 0) {
    detectedSkillsDirs = ['.agents/skills'];
  }
  const skillsWritten = detectedSkillsDirs.map(dir => copySkill(projectDir, dir));

  const progressBar = new ScanProgressBar({ enabled: !options.noProgress, prefix: 'Initializing' });
  let grammarOutcomes: GrammarFetchOutcome[] = [];

  // 1. Download & preload ONNX models
  if (process.env.NODE_ENV !== 'test') {
    try {
      progressBar.update({ phase: 'Initializing ONNX Embeddings model (bge-small-en-v1.5)', percent: 20 });
      const embedder = new TransformersEmbedder();
      await embedder.embed('preload');

      progressBar.update({ phase: 'Initializing ONNX Summarizer model (Qwen1.5-0.5B)', percent: 60 });
      const summarizer = new SmolLM2Summarizer();
      await summarizer.preloadModel(p => {
        progressBar.update({ phase: p.phase, percent: p.percent ?? 75 });
      });

      progressBar.update({ phase: 'Models ready', percent: 100 });
    } catch (e) {
      // Ignore pre-download errors in init
    } finally {
      progressBar.clear();
    }

    // 1b. Fetch Tree-Sitter grammars into the shared cache. Failures here are
    // absorbed the same way model pre-download failures are: the affected
    // language falls back to the regex scanner rather than blocking init.
    try {
      grammarOutcomes = await ensureGrammars({
        onProgress: p => progressBar.update({ phase: p.phase, percent: p.percent ?? 0 }),
      });
    } catch (e) {
      // Never fatal — ensureGrammars already absorbs per-grammar errors, so
      // reaching here means something unexpected, not an unreachable registry.
    } finally {
      progressBar.clear();
    }
  }

  // 2. Load neuron.yaml & initialize scanning if configured
  const config = loadNeuronConfig(projectDir);
  let scanIngestResult: { id: string; category: string; summary: string } | null = null;

  if (config.scan?.enabled) {
    try {
      progressBar.update({ prefix: 'Scanning', phase: 'Running initial architecture scan', percent: 50 });
      const memory = NeuronMemory.open(projectDir);
      const scanCategory = config.scan.category || 'architecture';
      const scanDepth = config.scan.depth || 3;
      try {
        const fingerprint = computeProjectFingerprint(projectDir, {
          depth: scanDepth,
          category: scanCategory,
        });
        scanIngestResult = await ingestScanResults(memory, {
          projectDir,
          category: scanCategory,
          depth: scanDepth,
        });
        // Prime the drift guard so the first agent query doesn't re-scan.
        writeReconciledFingerprint(projectDir, fingerprint);
      } finally {
        await memory.close();
      }
    } catch (e) {
      // Scan failure shouldn't block init
    } finally {
      progressBar.clear();
    }
  }



  // Report degraded parsing rather than letting it be discovered later as
  // unexplained blueprint noise. A language without a grammar still scans, at
  // regex fidelity.
  const failedGrammars = grammarOutcomes.filter(o => o.status === 'failed');
  if (failedGrammars.length > 0) {
    console.error(
      `⚠ ${failedGrammars.length} Tree-Sitter grammar(s) unavailable: ` +
      `${failedGrammars.map(o => o.language).join(', ')}. ` +
      `Those languages will be scanned with the regex parser at reduced accuracy. ` +
      `Re-run 'neuron init' once the registry is reachable.`
    );
  }

  const callout = `⭐ Enjoying Neuron? Visit ${GITHUB_STAR_URL} and give it a star!`;
  console.error(drawBox([callout]));

  console.log(JSON.stringify({
    status: 'initialized',
    projectRoot: projectDir,
    skillsWritten,
    scanConfigured: !!config.scan?.enabled,
    initialScan: scanIngestResult,
    grammars: {
      ready: grammarOutcomes.filter(o => o.status !== 'failed').map(o => o.language),
      unavailable: failedGrammars.map(o => ({ language: o.language, error: o.error })),
    },
    githubUrl: GITHUB_STAR_URL,
    callout
  }));
}
