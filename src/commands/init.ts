import path from 'node:path';
import fs from 'node:fs';
import readline from 'node:readline/promises';
import { parseFlags, drawBox } from './utils.js';
import { HARNESSES, detectHarnesses, copySkill } from '../config/index.js';
import { loadNeuronConfig } from '../config/neuronYaml.js';
import { scaffoldNeuronYaml } from '../config/scaffold.js';
import { SmolLM2Summarizer } from '../components/summarizer.js';
import { TransformersEmbedder } from '../components/embedder.js';
import { ScanProgressBar } from '../ui/progress.js';
import { ingestScanResults } from '../scanner/ingest.js';
import { ensureGrammars, type GrammarFetchOutcome } from '../scanner/grammars.js';
import { computeProjectFingerprint, writeReconciledFingerprint } from '../scanner/fingerprint.js';
import { NeuronMemory } from '../index.js';
import {
  ClaudeCodeAdapter,
  HarnessAdapter,
  HookTarget,
  OverwritePolicy,
  InstallResult,
  UninstallResult,
} from '../harnesses/index.js';

export const GITHUB_STAR_URL = 'https://github.com/kovartravis/neuron';

/** Every harness with a real adapter. Grows as tickets 13/16/40 land. */
function getAdapters(harnessFilter?: string[]): HarnessAdapter[] {
  const all: HarnessAdapter[] = [new ClaudeCodeAdapter()];
  if (!harnessFilter || harnessFilter.length === 0) return all;
  return all.filter(a => harnessFilter.includes(a.id));
}

function isInteractive(): boolean {
  return Boolean(process.stdin.isTTY && process.stdout.isTTY);
}

/**
 * Point 6 (ADR 0014 §6): asked once per `init` run, applied to every harness
 * being wired — it reflects how this contributor wants to work across their
 * whole toolchain, not a per-harness preference. `--yes`/`--hook-target`
 * cover non-interactive callers so init never blocks on a prompt it cannot
 * show.
 */
async function resolveHookTarget(options: { yes?: boolean; hookTarget?: string }): Promise<HookTarget> {
  if (options.hookTarget) return options.hookTarget as HookTarget;
  if (options.yes) return 'project-committed';
  if (isInteractive()) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    try {
      const answer = (
        await rl.question(
          'Where should neuron install recall hooks?\n' +
          '  [1] project-committed (.claude/settings.json, shared with the team) [default]\n' +
          '  [2] project-local (.claude/settings.local.json, gitignored)\n' +
          '  [3] user-global (~/.claude/settings.json, this machine only)\n' +
          'Choice: '
        )
      ).trim();
      if (answer === '2') return 'project-local';
      if (answer === '3') return 'user-global';
      return 'project-committed';
    } finally {
      rl.close();
    }
  }
  process.stderr.write(
    "[neuron] Non-interactive run: defaulting hook target to 'project-committed'. Pass --hook-target to choose explicitly.\n"
  );
  return 'project-committed';
}

function resolveOverwritePolicy(options: { overwriteHooks?: boolean; keepHooks?: boolean }): OverwritePolicy {
  if (options.overwriteHooks) return 'overwrite';
  if (options.keepHooks) return 'keep';
  return 'ask';
}

/**
 * Point 7/8 (ADR 0014 §7): neuron does not classify an existing hook entry,
 * it asks — and only when it already knows the entry is its *own* (a
 * user's unrelated hooks are never touched, let alone asked about). A
 * non-interactive caller that didn't pick a policy gets the safe default:
 * keep and warn, so CI never silently replaces anything.
 */
async function onHookConflict(info: { targetPath: string; point: string }): Promise<boolean> {
  if (isInteractive()) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    try {
      const answer = (
        await rl.question(
          `[neuron] An existing neuron hook entry for '${info.point}' in ${info.targetPath} was written by a ` +
          `different version. Overwrite it? [y/N]: `
        )
      ).trim().toLowerCase();
      return answer === 'y' || answer === 'yes';
    } finally {
      rl.close();
    }
  }
  process.stderr.write(
    `[neuron warning] Existing hook entry for '${info.point}' in ${info.targetPath} kept (non-interactive run). ` +
    `Pass --overwrite-hooks to replace it.\n`
  );
  return false;
}

async function installHooks(
  projectDir: string,
  options: { yes?: boolean; hookTarget?: string; overwriteHooks?: boolean; keepHooks?: boolean; harness?: string[] }
): Promise<InstallResult[]> {
  const adapters = getAdapters(options.harness).filter(a => a.detect(projectDir));
  if (adapters.length === 0) return [];

  const target = await resolveHookTarget(options);
  const overwrite = resolveOverwritePolicy(options);
  const results: InstallResult[] = [];

  for (const adapter of adapters) {
    try {
      const result = await adapter.install(projectDir, {
        target,
        overwrite,
        onConflict: overwrite === 'ask' ? onHookConflict : undefined,
      });
      results.push(result);
    } catch (e: any) {
      process.stderr.write(`[neuron warning] Failed to install ${adapter.id} hooks: ${e.message}\n`);
    }
  }

  return results;
}

async function handleUninstallHooksCommand(projectDir: string, options: { harness?: string[] }): Promise<void> {
  const adapters = getAdapters(options.harness);
  const results: UninstallResult[] = [];
  for (const adapter of adapters) {
    results.push(await adapter.uninstall(projectDir));
  }
  console.log(JSON.stringify({ status: 'hooks-uninstalled', results }));
}

export async function handleInitCommand(args: string[]): Promise<void> {
  const { options } = parseFlags(args.slice(1));
  const projectDir = process.cwd();

  if (options.uninstallHooks) {
    return handleUninstallHooksCommand(projectDir, options);
  }

  // Write a working neuron.yaml before anything reads config, so an
  // initialized project is one whose behaviour is declared on disk rather than
  // inherited from schema defaults nobody can see. Existing config is left
  // alone — see scaffoldNeuronYaml.
  const configResult = scaffoldNeuronYaml(projectDir);

  // Detect harnesses and copy the bundled neuron-memory skill
  let detectedSkillsDirs = detectHarnesses(projectDir);
  if (detectedSkillsDirs.length === 0) {
    detectedSkillsDirs = ['.agents/skills'];
  }
  const skillsWritten = detectedSkillsDirs.map(dir => copySkill(projectDir, dir));

  const hookResults = options.noHooks ? [] : await installHooks(projectDir, options);

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
    config: {
      path: configResult.path,
      created: configResult.created,
      storageMode: config.storage.mode,
    },
    scanConfigured: !!config.scan?.enabled,
    initialScan: scanIngestResult,
    grammars: {
      ready: grammarOutcomes.filter(o => o.status !== 'failed').map(o => o.language),
      unavailable: failedGrammars.map(o => ({ language: o.language, error: o.error })),
    },
    hooks: {
      installed: hookResults,
      skipped: !!options.noHooks,
    },
    githubUrl: GITHUB_STAR_URL,
    callout
  }));
}
