import { NeuronMemory, StoreHealth, StoreHealthRepairReport } from '../index.js';
import { loadNeuronConfig } from '../config/neuronYaml.js';
import { getArchitecturalDrift } from '../scanner/diff.js';
import { summarizeRecallCost } from '../harnesses/index.js';
import { parseFlags, STATUS_HELP } from './utils.js';

/** Truncates a content preview for the human-readable `--health` report only — the JSON payload always carries the full string. */
function preview(content: string, max = 80): string {
  const oneLine = content.replace(/\s+/g, ' ').trim();
  return oneLine.length > max ? `${oneLine.slice(0, max - 1)}…` : oneLine;
}

function formatStoreHealthText(health: StoreHealth, sessionsObserved: number): string {
  const lines: string[] = ['Store health'];

  lines.push('');
  lines.push(`Duplicate/near-duplicate groups: ${health.duplicateGroups.length}`);
  for (const group of health.duplicateGroups) {
    lines.push(`  - ${group.entries.length} entries, min similarity ${group.minSimilarity.toFixed(3)}:`);
    for (const entry of group.entries) {
      lines.push(`      [${entry.category}] ${entry.id}  "${preview(entry.content)}"`);
    }
  }

  lines.push('');
  lines.push('Importance histogram:');
  for (let level = 1; level <= 5; level++) {
    lines.push(`  ${level}: ${health.importanceHistogram[level] ?? 0}`);
  }

  lines.push('');
  lines.push(`Superseded entries: ${health.supersededCount}`);
  lines.push(`Sessions observed (recall invoked): ${sessionsObserved}`);
  if (sessionsObserved === 0) {
    lines.push('  Warning: recall has never been observed firing in a recorded session.');
  }

  return lines.join('\n');
}

function formatStoreHealthRepairText(report: StoreHealthRepairReport): string {
  const lines: string[] = ['Store health repair'];

  lines.push('');
  lines.push(`Merged (exact-duplicate content, no judgment needed): ${report.merged.length} group(s)`);
  for (const outcome of report.merged) {
    lines.push(`  - kept [${outcome.category}] ${outcome.keptId}  "${preview(outcome.content)}"`);
    for (const id of outcome.supersededIds) {
      lines.push(`      superseded: ${id}`);
    }
  }

  lines.push('');
  lines.push(`Left unresolved (wording differs — needs a human call via --supersedes/--not-a-reversal): ${report.unresolved.length} group(s)`);
  for (const group of report.unresolved) {
    lines.push(`  - ${group.entries.length} entries, min similarity ${group.minSimilarity.toFixed(3)}:`);
    for (const entry of group.entries) {
      lines.push(`      [${entry.category}] ${entry.id}  "${preview(entry.content)}"`);
    }
  }

  return lines.join('\n');
}

/**
 * Ticket 13 / ADR 0013: the validation surface `neuron doctor` was ruled out
 * twice for, reopened folded into `status` instead of a new top-level
 * command. `--check` and `--repair` are mutually exclusive report modes —
 * neither touches the default `status` JSON payload below them.
 *
 * Ticket 20 / neuron-2.4.0 asked the same "new command or status extension"
 * question again, for store-health signals (duplicates, importance
 * distribution, superseded count) rather than config-schema compliance —
 * same "no new commands" precedent applies, so `--health` joins `--check`/
 * `--repair` as a third report mode rather than shipping a `neuron doctor`
 * binary. Unlike `--check`/`--repair`, `--health` and `--repair` combine
 * (`--health --repair`) rather than being mutually exclusive with each
 * other — `--check` still can't combine with either, since it answers a
 * different question (config-schema compliance) than `--health` does.
 */
export async function handleStatusCommand(memory: NeuronMemory, args: string[] = []): Promise<void> {
  const { options } = parseFlags(args.slice(1));

  if (options.help) {
    console.log(STATUS_HELP);
    return;
  }

  if (options.check && (options.repair || options.health)) {
    console.error('Error: --check cannot be combined with --repair or --health');
    process.exitCode = 1;
    return;
  }

  if (options.health) {
    if (options.repair) {
      const report = await memory.repairStoreHealth();
      if (options.json) {
        console.log(JSON.stringify(report));
      } else {
        console.log(formatStoreHealthRepairText(report));
      }
      if (report.unresolved.length > 0) process.exitCode = 1;
      return;
    }

    const health = await memory.getStoreHealth();
    // sessionsObserved (ticket 21's own subject) is surfaced here rather
    // than delegated, per the ticket's own fallback — 21 hasn't landed yet.
    // Read from the same recorded-ledger summary `status`'s default payload
    // already uses, not recomputed.
    const config = loadNeuronConfig(process.cwd());
    const sessionsObserved = summarizeRecallCost(process.cwd(), config.recall.epochCharBudget).sessionsObserved;
    if (options.json) {
      console.log(JSON.stringify({ ...health, sessionsObserved }));
    } else {
      console.log(formatStoreHealthText(health, sessionsObserved));
    }
    return;
  }

  if (options.repair) {
    const repaired = await memory.repairFieldCompliance();
    // ADR 0017 Decision 6: a distinct finding kind from `repaired` — config-file
    // drift (a category with real rows but no neuron.yaml entry), not a
    // per-entry field defect.
    const declaredCategories = await memory.repairUndeclaredCategories();
    console.log(JSON.stringify({ repaired, declaredCategories }));
    if (repaired.some((o) => o.unresolved.length > 0)) process.exitCode = 1;
    return;
  }

  if (options.check) {
    const violations = await memory.checkFieldCompliance();
    const undeclaredCategories = await memory.checkUndeclaredCategories();
    console.log(JSON.stringify({
      compliant: violations.length === 0 && undeclaredCategories.length === 0,
      violations,
      undeclaredCategories,
    }));
    if (violations.length > 0 || undeclaredCategories.length > 0) process.exitCode = 1;
    return;
  }

  const status = memory.getStatus();
  const config = loadNeuronConfig(process.cwd());

  // Ticket 07 (neuron-2.3.0): what the recall hook has actually cost, read
  // from recorded session ledgers rather than derived from the budget alone —
  // a design that never binds in practice should report that honestly.
  status.recallCost = summarizeRecallCost(process.cwd(), config.recall.epochCharBudget);

  if (config.scan?.enabled) {
    try {
      // memory's own resolved root, not literal process.cwd() — same
      // scan-root/storage-root divergence class as ticket 30 fixed for
      // autoRescanIfDriftDetected and neuron scan.
      const diff = await getArchitecturalDrift(memory, memory.getProjectRoot());
      status.drift = {
        hasDrift: diff.hasDrift,
        changesCount: diff.totalChangesCount,
        summary: diff.summary,
      };
    } catch (e) {
      status.drift = { hasDrift: false, changesCount: 0 };
    }
  }

  console.log(JSON.stringify(status));
}
