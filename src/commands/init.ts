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
  CLAUDE_CODE_HARNESS_ID,
  CodexAdapter,
  CODEX_HARNESS_ID,
  HarnessAdapter,
  HookTarget,
  OverwritePolicy,
  InstallResult,
  UninstallResult,
  deriveFidelity,
} from '../harnesses/index.js';
import {
  generateProtocolBlock,
  upsertProtocolBlock,
  ProtocolFidelity,
  ProtocolWriteAction,
} from '../config/protocolBlock.js';
import type { NeuronConfig } from '../config/neuronYaml.js';

export const GITHUB_STAR_URL = 'https://github.com/kovartravis/neuron';

/** Every harness with a real adapter. Grows as tickets 16/40 land. */
function getAdapters(harnessFilter?: string[]): HarnessAdapter[] {
  const all: HarnessAdapter[] = [new ClaudeCodeAdapter(), new CodexAdapter()];
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

/** Only harnesses with a real adapter can ever earn `'deterministic'`; every other detected harness has nothing else performing recall. */
const ADAPTER_ID_BY_HARNESS_NAME: Record<string, string> = {
  claude: CLAUDE_CODE_HARNESS_ID,
  codex: CODEX_HARNESS_ID,
};

/**
 * Ground truth, not this run's flags: a hook installed by an earlier `init`
 * still performs recall even if this invocation passed `--no-hooks`, and a
 * hook this run declined to overwrite (kept-existing, still neuron's own)
 * still fires. `verify()` reads the actual config file rather than inferring
 * from what `installHooks` just did.
 */
function resolveHarnessFidelity(
  adapters: HarnessAdapter[],
  harnessName: string,
  projectDir: string
): ProtocolFidelity {
  const adapterId = ADAPTER_ID_BY_HARNESS_NAME[harnessName];
  if (!adapterId) return 'fallback';
  const adapter = adapters.find(a => a.id === adapterId);
  if (!adapter || !adapter.detect(projectDir)) return 'fallback';
  if (deriveFidelity(adapter.capability()) !== 'deterministic') return 'fallback';

  const capability = adapter.capability();
  const verification = adapter.verify(projectDir);
  const injectingPoints = Object.entries(capability)
    .filter(([, record]) => record.injects === true)
    .map(([point]) => point);
  const allRegistered = injectingPoints.every(
    point => verification[point as keyof typeof verification]?.registered
  );
  return allRegistered ? 'deterministic' : 'fallback';
}

async function onProtocolConflict(targetPath: string): Promise<boolean> {
  if (isInteractive()) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    try {
      const answer = (
        await rl.question(
          `[neuron] The memory-store protocol block in ${targetPath} was written by a different version and ` +
          `has since changed. Overwrite it? [y/N]: `
        )
      ).trim().toLowerCase();
      return answer === 'y' || answer === 'yes';
    } finally {
      rl.close();
    }
  }
  process.stderr.write(
    `[neuron warning] Protocol block in ${targetPath} kept (non-interactive run, differs from the version ` +
    `neuron would write). Pass --overwrite-hooks to replace it.\n`
  );
  return false;
}

export interface ProtocolWriteReport {
  targetPath: string;
  fidelity: ProtocolFidelity;
  action: ProtocolWriteAction;
}

/**
 * Writes the capability-aware protocol block into every detected harness's
 * instruction file (ticket 14). Several harness names can share one `mdFile`
 * (`codex`/`agents`/`github` all point at `AGENTS.md`); such a file gets the
 * short, deterministic-only block the moment *any* harness targeting it has
 * a working hook, per ADR 0014 §8.1 — the fallback step only layers in when
 * nothing else targeting that file performs recall.
 *
 * Reuses `--overwrite-hooks`/`--keep-hooks` rather than adding a parallel
 * flag pair: both questions are "may neuron replace something it wrote
 * before but doesn't control the history of," just for a hook entry versus a
 * markdown region.
 */
async function writeProtocolBlocks(
  projectDir: string,
  config: NeuronConfig,
  detectedHarnessNames: string[],
  options: { overwriteHooks?: boolean; keepHooks?: boolean; harness?: string[] }
): Promise<ProtocolWriteReport[]> {
  const detected = HARNESSES.filter(h => detectedHarnessNames.includes(h.name));
  if (detected.length === 0) return [];

  const byMdFile = new Map<string, string[]>();
  for (const h of detected) {
    const names = byMdFile.get(h.mdFile) ?? [];
    names.push(h.name);
    byMdFile.set(h.mdFile, names);
  }

  const allAdapters = getAdapters();
  const overwrite = resolveOverwritePolicy(options);
  const reports: ProtocolWriteReport[] = [];

  for (const [mdFile, harnessNames] of byMdFile) {
    const fidelity: ProtocolFidelity = harnessNames.some(
      name => resolveHarnessFidelity(allAdapters, name, projectDir) === 'deterministic'
    )
      ? 'deterministic'
      : 'fallback';

    const targetPath = path.join(projectDir, mdFile);
    const existing = fs.existsSync(targetPath) ? fs.readFileSync(targetPath, 'utf8') : null;
    const block = generateProtocolBlock({ fidelity, config });
    const result = await upsertProtocolBlock(existing, block, {
      overwrite,
      onConflict: overwrite === 'ask' ? () => onProtocolConflict(targetPath) : undefined,
    });

    if (result.action !== 'unchanged') {
      fs.writeFileSync(targetPath, result.content, 'utf8');
    }
    reports.push({ targetPath, fidelity, action: result.action });
  }

  return reports;
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

  // Snapshot which harness markers are actually present before anything else
  // touches the filesystem — copySkill's own fallback below creates `.agents/`
  // when nothing was detected, and a later fs re-scan would then mistake that
  // side effect for a detected 'agents' harness.
  const detectedHarnessNames = HARNESSES.filter(h => fs.existsSync(path.join(projectDir, h.base))).map(h => h.name);

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

  // 3. Write the capability-aware memory-store protocol block into every
  // detected harness's instruction file (ticket 14).
  const protocolResults = await writeProtocolBlocks(projectDir, config, detectedHarnessNames, options);


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
    protocol: {
      written: protocolResults,
    },
    githubUrl: GITHUB_STAR_URL,
    callout
  }));
}
