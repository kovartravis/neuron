import { NeuronMemory } from '../index.js';
import { parseFlags, LEARN_HELP } from './utils.js';
import { handleMemoryCommand } from './memory.js';
import { collectDeclaredFieldFlags } from '../config/neuronYaml.js';

export async function handleLearnCommand(
  args: string[],
  memory: NeuronMemory,
  projectName: string
): Promise<void> {
  const subCommand = args[1];
  if (!subCommand) {
    console.error(LEARN_HELP);
    process.exit(1);
  }
  if (subCommand === '--help' || subCommand === '-h') {
    console.log(LEARN_HELP);
    process.exit(0);
  }

  process.stderr.write(`[neuron warning] 'neuron learn' is deprecated. Use 'neuron memory --category learning' instead.\n`);

  const rest = args.slice(2);
  const declaredFields = collectDeclaredFieldFlags(memory.getConfig());
  const { positionals } = parseFlags(rest, declaredFields);

  if (subCommand === 'update' && (!positionals[0] || !positionals[1])) {
    console.error('Error: ID and content are required for learn update');
    process.exit(1);
  }

  const hasCategoryFlag = args.includes('--category');
  const effectiveArgs = hasCategoryFlag
    ? ['memory', ...args.slice(1)]
    : ['memory', ...args.slice(1), '--category', 'learning'];
  return handleMemoryCommand(effectiveArgs, memory, projectName);
}
