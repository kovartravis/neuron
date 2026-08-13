import path from 'node:path';
import fs from 'node:fs';
import readline from 'node:readline/promises';
import { parseFlags, drawBox } from './utils.js';
import { HARNESSES, detectHarnesses, copySkill, isHarnessPresent } from '../config/index.js';
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
  CopilotAdapter,
  COPILOT_HARNESS_ID,
  CursorAdapter,
  CURSOR_HARNESS_ID,
  HarnessAdapter,
  HookTarget,
  OverwritePolicy,
  InstallResult,
  UninstallResult,
  deriveFidelity,
  FidelityLabel,
  LifecyclePoint,
} from '../harnesses/index.js';
import {
  generateProtocolBlock,
  upsertProtocolBlock,
  findMarkerRange,
  ProtocolFidelity,
  ProtocolWriteAction,
} from '../config/protocolBlock.js';
import type { NeuronConfig } from '../config/neuronYaml.js';

export const GITHUB_STAR_URL = 'https://github.com/kovartravis/neuron';

/**
 * The three points `recallStep()`/this file's own fidelity reporting have
 * always meant by "recall" — deliberately excludes `pre-command` (ticket 22,
 * neuron-2.4.0). Filtering the full `LIFECYCLE_POINTS` instead would mean a
 * harness upgraded to a neuron version that knows about `pre-command` but
 * not yet re-`init`'d reports recall as un-wired the moment `pre-command`
 * isn't registered, even though session-start/pre-prompt recall itself
 * never changed — exactly the kind of self-inflicted regression the
 * capability-map design exists to avoid. `pre-command`'s own wiring is a
 * separate question for `execStep()` (ticket 23) to answer, not this one.
 */
const RECALL_LIFECYCLE_POINTS: readonly LifecyclePoint[] = ['session-start', 'pre-prompt', 'context-reset'];

/** What `execStep()` (ticket 23) means by "command execution" — the mirror of `RECALL_LIFECYCLE_POINTS` above. */
const EXEC_LIFECYCLE_POINTS: readonly LifecyclePoint[] = ['pre-command'];

/** Every harness with a real adapter. */
function getAdapters(harnessFilter?: string[]): HarnessAdapter[] {
  const all: HarnessAdapter[] = [
    new ClaudeCodeAdapter(),
    new CodexAdapter(),
    new CopilotAdapter(),
    new CursorAdapter(),
  ];
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
          '  [1] project-committed (shared with the team, committed to the repo) [default]\n' +
          '  [2] project-local (project-scoped, gitignored)\n' +
          '  [3] user-global (this machine only, applies across projects)\n' +
          '(Exact file paths depend on which harness(es) are detected — reported after install.)\n' +
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
  github: COPILOT_HARNESS_ID,
  cursor: CURSOR_HARNESS_ID,
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
  projectDir: string,
  points: readonly LifecyclePoint[]
): ProtocolFidelity {
  const adapterId = ADAPTER_ID_BY_HARNESS_NAME[harnessName];
  if (!adapterId) return 'fallback';
  const adapter = adapters.find(a => a.id === adapterId);
  if (!adapter || !adapter.detect(projectDir)) return 'fallback';
  if (deriveFidelity(adapter.capability()) !== 'deterministic') return 'fallback';

  const capability = adapter.capability();
  const verification = adapter.verify(projectDir);
  const injectingPoints = points.filter(point => capability[point].injects === true);
  const allRegistered = injectingPoints.every(point => verification[point]?.registered);
  return allRegistered ? 'deterministic' : 'fallback';
}

/**
 * Ticket 03: what a user actually gets from one detected harness, reported
 * truthfully rather than inferred from config-file presence. `wired` comes
 * from `verify()` (real firing-capable registration), never from whether
 * `installHooks` just ran — a hook installed by an earlier session, or one
 * this run declined to overwrite, still counts.
 */
export interface HarnessFidelityReport {
  name: string;
  mdFile: string;
  hasAdapter: boolean;
  wired: boolean;
  /** The fidelity actually delivered right now — `'instruction-only'` whenever `wired` is false, regardless of what the adapter could deliver if installed. */
  fidelity: FidelityLabel;
  remediation: string;
}

function buildHarnessFidelityReport(
  harnessName: string,
  adapters: HarnessAdapter[],
  projectDir: string
): HarnessFidelityReport {
  const meta = HARNESSES.find(h => h.name === harnessName);
  const mdFile = meta?.mdFile ?? 'AGENTS.md';
  const adapterId = ADAPTER_ID_BY_HARNESS_NAME[harnessName];
  const adapter = adapterId ? adapters.find(a => a.id === adapterId) : undefined;

  if (!adapter) {
    return {
      name: harnessName,
      mdFile,
      hasAdapter: false,
      wired: false,
      fidelity: 'instruction-only',
      remediation:
        `No recall hook adapter exists for this harness yet. Recall depends entirely on the model reading ` +
        `${mdFile} and choosing to run 'neuron memory query' itself.`,
    };
  }

  const capability = adapter.capability();
  const verdict = deriveFidelity(capability);
  const verification = adapter.verify(projectDir);
  const injectingPoints = RECALL_LIFECYCLE_POINTS.filter(point => capability[point].injects === true);
  const wired = injectingPoints.length > 0 && injectingPoints.every(point => verification[point].registered);
  const fidelity: FidelityLabel = wired ? verdict : 'instruction-only';

  let remediation: string;
  if (!wired) {
    remediation =
      `Recall hooks are not currently registered for this harness in this project. Run 'neuron init' again ` +
      `(without --no-hooks) or 'neuron hook install --harness ${adapter.id}' to enable ${verdict} recall.`;
  } else if (verdict === 'deterministic') {
    remediation = 'Nothing to do — full per-turn recall confirmed and registered.';
  } else if (verdict === 'best-effort') {
    const caveat = injectingPoints.flatMap(point => capability[point].caveats ?? [])[0];
    remediation = caveat
      ? `Best-effort recall — ${caveat}`
      : 'Best-effort recall — see the README compatibility matrix for this harness\'s known limitations.';
  } else {
    remediation =
      'No lifecycle point on this harness ever injects context into the model — recall is instruction-only ' +
      `regardless of hooks; the model must choose to read ${mdFile} and run 'neuron memory query' itself.`;
  }

  return { name: harnessName, mdFile, hasAdapter: true, wired, fidelity, remediation };
}

function formatHarnessFidelityReport(reports: HarnessFidelityReport[]): string {
  if (reports.length === 0) return '';
  const lines = ['', 'Recall fidelity by harness:'];
  for (const r of reports) {
    const status = r.wired ? 'wired' : r.hasAdapter ? 'detected, not wired' : 'detected, no adapter';
    lines.push(`  ${r.name} (${r.mdFile}) — ${status} — ${r.fidelity}`);
    lines.push(`    ${r.remediation}`);
  }
  lines.push('See the README compatibility matrix for the full harness x mechanism x fidelity picture.');
  return lines.join('\n');
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
  execFidelity: ProtocolFidelity;
  action: ProtocolWriteAction;
}

interface ResolvedProtocolTarget {
  targetPath: string;
  fidelity: ProtocolFidelity;
  execFidelity: ProtocolFidelity;
  block: string;
}

/**
 * The fidelity-resolution and block-generation half of writing a protocol
 * block, shared between the real write (`writeProtocolBlocks`) and the
 * drift check (`checkProtocolBlockDrift`, ticket 34) below — both need
 * exactly "what should be in each detected harness's instruction file right
 * now," one to write it, the other only to compare against what's already
 * committed. Several harness names can share one `mdFile` (`codex`/`agents`/
 * `github` all point at `AGENTS.md`); such a file gets the short,
 * deterministic-only block the moment *any* harness targeting it has a
 * working hook, per ADR 0014 §8.1 — the fallback step only layers in when
 * nothing else targeting that file performs recall.
 */
function resolveProtocolTargets(
  projectDir: string,
  config: NeuronConfig,
  detectedHarnessNames: string[]
): ResolvedProtocolTarget[] {
  const detected = HARNESSES.filter(h => detectedHarnessNames.includes(h.name));
  if (detected.length === 0) return [];

  const byMdFile = new Map<string, string[]>();
  for (const h of detected) {
    const names = byMdFile.get(h.mdFile) ?? [];
    names.push(h.name);
    byMdFile.set(h.mdFile, names);
  }

  const allAdapters = getAdapters();
  const targets: ResolvedProtocolTarget[] = [];

  for (const [mdFile, harnessNames] of byMdFile) {
    const fidelity: ProtocolFidelity = harnessNames.some(
      name => resolveHarnessFidelity(allAdapters, name, projectDir, RECALL_LIFECYCLE_POINTS) === 'deterministic'
    )
      ? 'deterministic'
      : 'fallback';
    const execFidelity: ProtocolFidelity = harnessNames.some(
      name => resolveHarnessFidelity(allAdapters, name, projectDir, EXEC_LIFECYCLE_POINTS) === 'deterministic'
    )
      ? 'deterministic'
      : 'fallback';

    const targetPath = path.join(projectDir, mdFile);
    const block = generateProtocolBlock({ fidelity, execFidelity, config });
    targets.push({ targetPath, fidelity, execFidelity, block });
  }

  return targets;
}

/**
 * Writes the capability-aware protocol block into every detected harness's
 * instruction file (ticket 14).
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
  const overwrite = resolveOverwritePolicy(options);
  const reports: ProtocolWriteReport[] = [];

  for (const target of resolveProtocolTargets(projectDir, config, detectedHarnessNames)) {
    const { targetPath, fidelity, execFidelity, block } = target;
    const existing = fs.existsSync(targetPath) ? fs.readFileSync(targetPath, 'utf8') : null;
    const result = await upsertProtocolBlock(existing, block, {
      overwrite,
      onConflict: overwrite === 'ask' ? () => onProtocolConflict(targetPath) : undefined,
    });

    if (result.action !== 'unchanged') {
      fs.writeFileSync(targetPath, result.content, 'utf8');
    }
    reports.push({ targetPath, fidelity, execFidelity, action: result.action });
  }

  return reports;
}

/** One committed instruction file whose managed region no longer matches what `neuron init` would generate for it right now. */
export interface ProtocolBlockDrift {
  targetPath: string;
}

/**
 * Ticket 34 / F3: `CLAUDE.md`'s (or another harness's instruction file's)
 * managed protocol block can drift from `neuron.yaml`/harness-wiring reality
 * whenever `neuron.yaml` changes but no one re-runs `neuron init
 * --overwrite-hooks` — this already happened for real once (ticket 10 found
 * this repo's own `CLAUDE.md` still describing a pre-ticket-01 category
 * list). `neuron init` itself won't catch this on a non-interactive re-run:
 * `upsertProtocolBlock` reports `kept-existing` and leaves the drift in
 * place rather than failing.
 *
 * Scope call: only the marker-bounded protocol block region is checked, on
 * every harness's real `mdFile` (reusing `resolveProtocolTargets` verbatim —
 * no new generation or grouping logic, matching this ticket's own comment).
 * Skill-directory files (`.claude/skills/neuron-memory/SKILL.md` etc.) are a
 * different mechanism (`copySkill`'s static template copy, not a config-
 * driven generator) and out of scope here.
 *
 * A target file that doesn't exist yet, or exists but has no managed region
 * at all, isn't drift — that's "not yet initialized here," `neuron init`'s
 * own job, not a compliance violation to flag.
 */
export function checkProtocolBlockDrift(projectDir: string, config: NeuronConfig): ProtocolBlockDrift[] {
  const detectedHarnessNames = HARNESSES.filter(h => isHarnessPresent(projectDir, h)).map(h => h.name);
  const drifted: ProtocolBlockDrift[] = [];

  for (const target of resolveProtocolTargets(projectDir, config, detectedHarnessNames)) {
    if (!fs.existsSync(target.targetPath)) continue;
    const existing = fs.readFileSync(target.targetPath, 'utf8');
    const range = findMarkerRange(existing);
    if (!range) continue;

    const existingBlock = existing.slice(range.start, range.end);
    if (existingBlock !== target.block) {
      drifted.push({ targetPath: target.targetPath });
    }
  }

  return drifted;
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

  // Snapshot which harnesses are actually present (ticket 31: a harness-specific
  // marker, not just its bare base dir — `.github/` alone used to false-positive
  // on any repo with GitHub Actions/issue templates and no real Copilot use) before
  // anything else touches the filesystem — copySkill's own fallback below creates
  // `.agents/` when nothing was detected, and a later fs re-scan would then mistake
  // that side effect for a detected 'agents' harness.
  const detectedHarnesses = HARNESSES.filter(h => isHarnessPresent(projectDir, h));
  const detectedHarnessNames = detectedHarnesses.map(h => h.name);

  // Which of those were already onboarded by an earlier run (their skill file
  // already exists), snapshotted before copySkill below writes it — the
  // complement is what this run is onboarding for the first time, surfaced
  // below so that's never silent (ticket 31).
  const priorSkillFiles = new Set(
    detectedHarnesses
      .filter(h => fs.existsSync(path.join(projectDir, h.skills, 'neuron-memory', 'SKILL.md')))
      .map(h => h.name)
  );
  const newlyOnboardedHarnessNames = detectedHarnessNames.filter(name => !priorSkillFiles.has(name));

  // Detect harnesses and copy the bundled neuron-memory skill
  let detectedSkillsDirs = detectHarnesses(projectDir);
  if (detectedSkillsDirs.length === 0) {
    detectedSkillsDirs = ['.agents/skills'];
  }
  const skillsWritten = detectedSkillsDirs.map(dir => copySkill(projectDir, dir));

  if (newlyOnboardedHarnessNames.length > 0) {
    process.stderr.write(
      `[neuron] Onboarding harness(es) not previously wired in this project: ${newlyOnboardedHarnessNames.join(', ')}. ` +
      `This writes their instructions file and skill directory. Pass --harness <id> to control this explicitly next time.\n`
    );
  }

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

  // 3.5. Report per-harness recall fidelity truthfully (ticket 03) — driven
  // by verify(), not inferred from what this run's install just did, so a
  // hook from an earlier session (or one this run declined to overwrite)
  // still reports correctly.
  const allAdaptersForReport = getAdapters();
  const harnessFidelityReports = detectedHarnessNames.map(name =>
    buildHarnessFidelityReport(name, allAdaptersForReport, projectDir)
  );
  const fidelityReportText = formatHarnessFidelityReport(harnessFidelityReports);
  if (fidelityReportText) console.error(fidelityReportText);

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
    harnesses: {
      detected: detectedHarnessNames,
      newlyOnboarded: newlyOnboardedHarnessNames,
    },
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
    harnessFidelity: harnessFidelityReports,
    githubUrl: GITHUB_STAR_URL,
    callout
  }));
}
