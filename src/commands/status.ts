import { NeuronMemory } from '../index.js';
import { loadNeuronConfig } from '../config/neuronYaml.js';
import { getArchitecturalDrift } from '../scanner/diff.js';
import { summarizeRecallCost } from '../harnesses/index.js';
import { parseFlags, STATUS_HELP } from './utils.js';

/**
 * Ticket 13 / ADR 0013: the validation surface `neuron doctor` was ruled out
 * twice for, reopened folded into `status` instead of a new top-level
 * command. `--check` and `--repair` are mutually exclusive report modes —
 * neither touches the default `status` JSON payload below them.
 */
export async function handleStatusCommand(memory: NeuronMemory, args: string[] = []): Promise<void> {
  const { options } = parseFlags(args.slice(1));

  if (options.help) {
    console.log(STATUS_HELP);
    return;
  }

  if (options.check && options.repair) {
    console.error('Error: --check and --repair are mutually exclusive');
    process.exitCode = 1;
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
      const diff = await getArchitecturalDrift(memory, process.cwd());
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
