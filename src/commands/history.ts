import { NeuronMemory } from '../index.js';
import { HISTORY_HELP } from './utils.js';
import { handleMemoryCommand } from './memory.js';

export async function handleHistoryCommand(
  args: string[],
  memory: NeuronMemory,
  projectName: string
): Promise<void> {
  const subCommand = args[1];
  if (!subCommand) {
    console.error(HISTORY_HELP);
    process.exit(1);
  }
  if (subCommand === '--help' || subCommand === '-h') {
    console.log(HISTORY_HELP);
    process.exit(0);
  }

  process.stderr.write(`[neuron warning] 'neuron history' is deprecated. Use 'neuron memory --category history' instead.\n`);

  const hasCategoryFlag = args.includes('--category');
  const effectiveArgs = hasCategoryFlag
    ? ['memory', ...args.slice(1)]
    : ['memory', ...args.slice(1), '--category', 'history'];
  return handleMemoryCommand(effectiveArgs, memory, projectName);
}
