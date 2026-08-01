import { NeuronMemory } from '../index.js';
import { loadNeuronConfig } from '../config/neuronYaml.js';
import { getArchitecturalDrift } from '../scanner/diff.js';

export async function handleStatusCommand(memory: NeuronMemory): Promise<void> {
  const status = memory.getStatus();
  const config = loadNeuronConfig(process.cwd());

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
