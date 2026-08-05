import { NeuronMemory } from '../index.js';
import { loadNeuronConfig } from '../config/neuronYaml.js';
import { getArchitecturalDrift } from '../scanner/diff.js';
import { summarizeRecallCost } from '../harnesses/index.js';

export async function handleStatusCommand(memory: NeuronMemory): Promise<void> {
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
