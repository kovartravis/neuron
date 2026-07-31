import path from 'node:path';
import fs from 'node:fs';
import { parseFlags, drawBox } from './utils.js';
import { HARNESSES, detectHarnesses, copySkill } from '../config/index.js';
import { loadNeuronConfig } from '../config/neuronYaml.js';
import { SmolLM2Summarizer } from '../components/summarizer.js';
import { TransformersEmbedder } from '../components/embedder.js';
import { ScanProgressBar } from '../ui/progress.js';
import { ingestScanResults } from '../scanner/ingest.js';
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
  }

  // 2. Load neuron.yaml & initialize scanning if configured
  const config = loadNeuronConfig(projectDir);
  let scanIngestResult: { id: string; category: string; summary: string } | null = null;

  if (config.scan?.enabled) {
    try {
      progressBar.update({ prefix: 'Scanning', phase: 'Running initial architecture scan', percent: 50 });
      const memory = NeuronMemory.open(projectDir);
      try {
        scanIngestResult = await ingestScanResults(memory, {
          projectDir,
          category: config.scan.category || 'decisions',
          depth: config.scan.depth || 3,
        });
      } finally {
        await memory.close();
      }
    } catch (e) {
      // Scan failure shouldn't block init
    } finally {
      progressBar.clear();
    }
  }



  const callout = `⭐ Enjoying Neuron? Visit ${GITHUB_STAR_URL} and give it a star!`;
  console.error(drawBox([callout]));

  console.log(JSON.stringify({
    status: 'initialized',
    projectRoot: projectDir,
    skillsWritten,
    scanConfigured: !!config.scan?.enabled,
    initialScan: scanIngestResult,
    githubUrl: GITHUB_STAR_URL,
    callout
  }));
}
