import path from 'node:path';
import { NeuronMemory } from '../index.js';
import { scanProjectTopology, ScanResult } from './analyzer.js';
import { ingestScanResults, reassembleBaseline } from './ingest.js';
import { loadNeuronConfig } from '../config/neuronYaml.js';
import {
  computeProjectFingerprint,
  readReconciledFingerprint,
  writeReconciledFingerprint,
} from './fingerprint.js';
import {
  areComparable,
  fidelityFromComponents,
  LEGACY_FIDELITY,
  parseFidelitySection,
  type FidelityDescriptor,
} from './fidelity.js';

export interface ModuleDiff {
  type: 'added' | 'removed' | 'modified';
  name: string;
  path: string;
  details?: string;
}

export interface ExportDiff {
  file: string;
  symbol: string;
  type: 'added' | 'removed';
}

export interface DependencyDiff {
  package: string;
  type: 'added' | 'removed';
}

export interface ArchitecturalDiff {
  hasDrift: boolean;
  isMissingBaseline?: boolean;
  /**
   * The baseline and the scan were produced by different parsers, so their
   * difference is not drift. Mutually exclusive with `hasDrift`.
   */
  needsRebaseline?: boolean;
  baselineFidelity?: string;
  currentFidelity?: string;
  baselineId?: string;
  baselineTimestamp?: string;
  /** The live scan computed for this diff, so callers can re-ingest without re-scanning. */
  currentScan?: ScanResult;
  summary: string;
  newModules: ModuleDiff[];
  removedModules: ModuleDiff[];
  exportChanges: ExportDiff[];
  dependencyShifts: DependencyDiff[];
  totalChangesCount: number;
}

export function parseBaselineBlueprint(markdownContent: string): {
  modules: Array<{ name: string; path: string }>;
  exports: Array<{ file: string; symbol: string }>;
  dependencies: string[];
  /**
   * Whether the card declared a dependency section at all. Distinguishes a
   * project with genuinely zero dependencies from a legacy card written before
   * dependencies were recorded — only the former can be diffed.
   */
  hasDependencySection: boolean;
  /** How this card's symbols were obtained. Absent section means a 2.1.0 card. */
  fidelity: FidelityDescriptor;
} {
  const modules: Array<{ name: string; path: string }> = [];
  const exportsList: Array<{ file: string; symbol: string }> = [];
  const dependencies: string[] = [];
  let hasDependencySection = false;

  const lines = markdownContent.split('\n');
  let currentFile: string | null = null;
  let inDependencySection = false;

  for (const line of lines) {
    // Track the `## 🧾 Dependency Contract` section so plain `- \`pkg\`` bullets
    // are only read as dependencies while inside it.
    const headingMatch = line.match(/^##\s+(.*)$/);
    if (headingMatch) {
      inDependencySection = headingMatch[1].includes('Dependency Contract');
      if (inDependencySection) hasDependencySection = true;
      continue;
    }

    if (inDependencySection) {
      const depMatch = line.match(/^-\s+`([^`]+)`\s*$/);
      if (depMatch) {
        dependencies.push(depMatch[1].trim());
      }
      continue;
    }

    // Match module headings: ### 🧩 name (`path`)
    const modMatch = line.match(/^###\s+🧩\s+(.+?)\s+\(`([^`]+)`\)/);
    if (modMatch) {
      modules.push({ name: modMatch[1].trim(), path: modMatch[2].trim() });
      continue;
    }

    // Match component exports: - **`file`** (Exports: `export1, export2`): purpose
    const exportMatch = line.match(/^-\s+\*\*`([^`]+)`\*\*(?:\s+\(Exports:\s+`([^`]+)`\))?/);
    if (exportMatch) {
      currentFile = exportMatch[1].trim();
      if (exportMatch[2]) {
        const symbols = exportMatch[2].split(',').map(s => s.trim()).filter(Boolean);
        for (const sym of symbols) {
          exportsList.push({ file: currentFile, symbol: sym });
        }
      }
    }
  }

  return {
    modules,
    exports: exportsList,
    dependencies,
    hasDependencySection,
    fidelity: parseFidelitySection(markdownContent) ?? LEGACY_FIDELITY,
  };
}

export function calculateArchitecturalDiff(
  currentScan: ScanResult,
  baseline: string | ScanResult
): ArchitecturalDiff {
  const newModules: ModuleDiff[] = [];
  const removedModules: ModuleDiff[] = [];
  const exportChanges: ExportDiff[] = [];
  const dependencyShifts: DependencyDiff[] = [];

  let baselineModules: Array<{ name: string; path: string }> = [];
  let baselineExports: Array<{ file: string; symbol: string }> = [];
  let baselineDeps: string[] = [];
  let canDiffDependencies = false;
  let baselineFidelity: FidelityDescriptor;

  const currentFidelity = fidelityFromComponents(
    currentScan.modules.flatMap(m => m.components)
  );

  if (typeof baseline === 'string') {
    const parsed = parseBaselineBlueprint(baseline);
    baselineModules = parsed.modules;
    baselineExports = parsed.exports;
    baselineDeps = parsed.dependencies;
    canDiffDependencies = parsed.hasDependencySection;
    baselineFidelity = parsed.fidelity;
  } else {
    baselineModules = baseline.modules.map(m => ({ name: m.name, path: m.path }));
    baselineExports = [];
    baseline.modules.forEach(m => {
      m.components.forEach(c => {
        c.exports.forEach(sym => {
          baselineExports.push({ file: c.file, symbol: sym });
        });
      });
    });
    baselineDeps = [...(baseline.manifest.dependencies || []), ...(baseline.manifest.devDependencies || [])];
    canDiffDependencies = true;
    baselineFidelity = fidelityFromComponents(baseline.modules.flatMap(m => m.components));
  }

  // Refuse before comparing anything: a diff across a parser change reports
  // hundreds of phantom changes, none of which the user caused. Refusal is
  // all-or-nothing — a partially comparable report would still be misleading
  // about the files it did compare.
  if (!areComparable(baselineFidelity, currentFidelity)) {
    return {
      hasDrift: false,
      needsRebaseline: true,
      baselineFidelity: baselineFidelity.default,
      currentFidelity: currentFidelity.default,
      summary:
        `Baseline was produced by a different parser (\`${baselineFidelity.default}\`) than this scan ` +
        `(\`${currentFidelity.default}\`). Drift cannot be measured across that change. ` +
        `Run \`neuron scan\` to re-baseline.`,
      newModules: [],
      removedModules: [],
      exportChanges: [],
      dependencyShifts: [],
      totalChangesCount: 0,
    };
  }

  // 1. Compare Modules
  const currentModulePaths = new Set(currentScan.modules.map(m => m.path));
  const baselineModulePaths = new Set(baselineModules.map(m => m.path));

  for (const mod of currentScan.modules) {
    if (!baselineModulePaths.has(mod.path)) {
      newModules.push({
        type: 'added',
        name: mod.name,
        path: mod.path,
        details: `New module discovered at ${mod.path}`,
      });
    }
  }

  for (const mod of baselineModules) {
    if (!currentModulePaths.has(mod.path)) {
      removedModules.push({
        type: 'removed',
        name: mod.name,
        path: mod.path,
        details: `Module removed at ${mod.path}`,
      });
    }
  }

  // 2. Compare Exports
  const currentExportsSet = new Set<string>();
  const currentExportsList: Array<{ file: string; symbol: string }> = [];

  currentScan.modules.forEach(m => {
    m.components.forEach(c => {
      c.exports.forEach(sym => {
        const key = `${c.file}::${sym}`;
        currentExportsSet.add(key);
        currentExportsList.push({ file: c.file, symbol: sym });
      });
    });
  });

  const baselineExportsSet = new Set(baselineExports.map(e => `${e.file}::${e.symbol}`));

  for (const exp of currentExportsList) {
    const key = `${exp.file}::${exp.symbol}`;
    if (!baselineExportsSet.has(key)) {
      exportChanges.push({
        file: exp.file,
        symbol: exp.symbol,
        type: 'added',
      });
    }
  }

  for (const exp of baselineExports) {
    const key = `${exp.file}::${exp.symbol}`;
    if (!currentExportsSet.has(key)) {
      exportChanges.push({
        file: exp.file,
        symbol: exp.symbol,
        type: 'removed',
      });
    }
  }

  // 3. Compare Dependencies (skipped for legacy cards with no recorded contract)
  if (canDiffDependencies) {
    const currentDeps = new Set([
      ...(currentScan.manifest.dependencies || []),
      ...(currentScan.manifest.devDependencies || []),
    ]);
    const baselineDepsSet = new Set(baselineDeps);

    for (const dep of currentDeps) {
      if (!baselineDepsSet.has(dep)) {
        dependencyShifts.push({ package: dep, type: 'added' });
      }
    }

    for (const dep of baselineDeps) {
      if (!currentDeps.has(dep)) {
        dependencyShifts.push({ package: dep, type: 'removed' });
      }
    }
  }

  const totalChangesCount =
    newModules.length + removedModules.length + exportChanges.length + dependencyShifts.length;

  const hasDrift = totalChangesCount > 0;
  const summary = hasDrift
    ? `Architectural drift detected: ${totalChangesCount} change(s) across modules, export contracts, or dependencies.`
    : `Codebase architecture is in sync with baseline memory blueprint card.`;

  return {
    hasDrift,
    summary,
    newModules,
    removedModules,
    exportChanges,
    dependencyShifts,
    totalChangesCount,
  };
}

export function formatArchitecturalDiffMarkdown(diff: ArchitecturalDiff): string {
  // Checked before `hasDrift`, which is false on a mismatch — reporting "In
  // Sync" against a baseline we refused to read would be the worst outcome.
  if (diff.needsRebaseline) {
    return [
      `### 🔬 Re-baseline Required`,
      ``,
      `**Summary**: ${diff.summary}`,
      ``,
      `| | Parser |`,
      `|---|---|`,
      `| Baseline | \`${diff.baselineFidelity}\` |`,
      `| This scan | \`${diff.currentFidelity}\` |`,
      ``,
      `Symbol extraction changed between these two, so every difference below`,
      `would be an artefact of the parser rather than a change you made. No`,
      `drift is reported.`,
      ``,
      `Run \`neuron scan\` to re-baseline, after which drift is measured again.`,
    ].join('\n');
  }

  if (!diff.hasDrift) {
    return `### ✅ Architectural Status: In Sync\n\nNo architectural drift detected since baseline scan.`;
  }

  let md = `### ⚠️ Architectural Drift Detected\n\n`;
  md += `**Summary**: ${diff.summary}\n\n`;

  if (diff.newModules.length > 0) {
    md += `#### 🆕 New Modules & Subsystems (${diff.newModules.length})\n`;
    diff.newModules.forEach(m => {
      md += `- **\`${m.name}\`** (\`${m.path}\`): ${m.details || 'New module discovered'}\n`;
    });
    md += `\n`;
  }

  if (diff.removedModules.length > 0) {
    md += `#### ❌ Removed Modules & Subsystems (${diff.removedModules.length})\n`;
    diff.removedModules.forEach(m => {
      md += `- **\`${m.name}\`** (\`${m.path}\`): ${m.details || 'Module removed'}\n`;
    });
    md += `\n`;
  }

  if (diff.exportChanges.length > 0) {
    md += `#### ⚡ Export Contract Changes (${diff.exportChanges.length})\n`;
    diff.exportChanges.forEach(e => {
      const icon = e.type === 'added' ? '➕' : '➖';
      md += `- ${icon} **\`${e.symbol}\`** in \`${e.file}\` (${e.type})\n`;
    });
    md += `\n`;
  }

  if (diff.dependencyShifts.length > 0) {
    md += `#### 📦 Dependency Shifts (${diff.dependencyShifts.length})\n`;
    diff.dependencyShifts.forEach(d => {
      const icon = d.type === 'added' ? '➕' : '➖';
      md += `- ${icon} \`${d.package}\` (${d.type})\n`;
    });
    md += `\n`;
  }

  return md.trim();
}

export async function getArchitecturalDrift(
  memory: NeuronMemory,
  // Same fix as `autoRescanIfDriftDetected` below (ticket 30): default to
  // `memory`'s own resolved root, not a literal `process.cwd()` that could
  // diverge from where `memory`'s storage actually lives.
  projectRoot: string = memory.getProjectRoot()
): Promise<ArchitecturalDiff> {
  const config = loadNeuronConfig(projectRoot);
  const category = config.scan?.category || 'architecture';
  const depth = config.scan?.depth || 3;

  // 1. Run live topology scan
  const currentScan = await scanProjectTopology(projectRoot, { depth });

  // 2. Fetch baseline card from memory store
  let baselineCard: string | undefined = undefined;
  let baselineId: string | undefined = undefined;

  try {
    // Ticket 29: findById on the index's stable id, not a ranked query —
    // the same category-crowding fix ticket 25 applied to hook.ts's own
    // baseline fetch. reassembleBaseline then stitches the index and each
    // module's card back into the shape parseBaselineBlueprint expects.
    const reassembled = await reassembleBaseline(memory, category);
    if (reassembled) {
      baselineCard = reassembled.content;
      baselineId = reassembled.id;
    }
  } catch (e) {
    // Default to empty baseline if memory query fails
  }

  if (!baselineCard) {
    return {
      hasDrift: false,
      isMissingBaseline: true,
      currentScan,
      summary: 'No baseline architecture card found in memory store.',
      newModules: [],
      removedModules: [],
      exportChanges: [],
      dependencyShifts: [],
      totalChangesCount: 0,
    };
  }

  const diff = calculateArchitecturalDiff(currentScan, baselineCard);
  diff.baselineId = baselineId;
  diff.currentScan = currentScan;
  return diff;
}

export async function autoRescanIfDriftDetected(
  memory: NeuronMemory,
  // Defaults to `memory`'s own upward-resolved root, never literal
  // `process.cwd()` — a caller running from a project-marker-less
  // subdirectory (any bare `.scratch/*/issues/` dir qualifies) would
  // otherwise scan and ingest a degenerate topology into the real project's
  // store while `memory` itself stays correctly rooted (ticket 30).
  projectRoot: string = memory.getProjectRoot()
): Promise<boolean> {
  const config = loadNeuronConfig(projectRoot);
  if (!config.scan?.enabled) return false;

  const category = config.scan.category || 'architecture';
  const depth = config.scan.depth || 3;

  try {
    // Stat-only guard: skip the AST scan entirely when no watched file has
    // changed since the last reconcile. Explicit `neuron scan`/`--diff`/
    // `--check` bypass this and always scan.
    const fingerprint = computeProjectFingerprint(projectRoot, { depth, category });
    if (fingerprint === readReconciledFingerprint(projectRoot)) {
      return false;
    }

    const diff = await getArchitecturalDrift(memory, projectRoot);
    if (diff.hasDrift || diff.isMissingBaseline || diff.needsRebaseline) {
      // A fidelity mismatch re-baselines like anything else, but silently: the
      // drift and missing-baseline messages would both be untrue here, and the
      // condition resolves itself in the same breath that reports it.
      const msg = diff.needsRebaseline
        ? ''
        : diff.isMissingBaseline
          ? `[neuron] No baseline architecture card found in '${category}'. Performing initial scan...\n`
          : `[neuron] Architectural drift detected (${diff.totalChangesCount} change(s)). Automatically re-scanning codebase topology...\n`;
      if (msg) process.stderr.write(msg);
      await ingestScanResults(memory, {
        projectDir: projectRoot,
        category,
        depth,
        // Reuse the traversal getArchitecturalDrift already performed.
        scanData: diff.currentScan,
      });
      // Only recorded after a successful ingest, so a failed re-scan retries
      // on the next run rather than being cached as reconciled.
      writeReconciledFingerprint(projectRoot, fingerprint);
      return true;
    }

    writeReconciledFingerprint(projectRoot, fingerprint);
  } catch (e) {
    // Non-blocking auto re-scan
  }

  return false;
}
