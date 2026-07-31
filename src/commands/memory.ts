import { NeuronMemory } from '../index.js';
import { parseFlags, MEMORY_HELP } from './utils.js';

export async function handleMemoryCommand(
  args: string[],
  memory: NeuronMemory,
  projectName: string
): Promise<void> {
  const subCommand = args[1];
  if (!subCommand) {
    console.error(MEMORY_HELP);
    process.exit(1);
  }
  if (subCommand === '--help' || subCommand === '-h') {
    console.log(MEMORY_HELP);
    process.exit(0);
  }

  const rest = args.slice(2);

  const { positionals, options } = parseFlags(rest);

  const category = options.category;
  if (!category && subCommand !== 'query') {
    console.error('Error: --category is required for memory commands (except query)');
    process.exit(1);
  }

  if (subCommand === 'add') {
    const content = positionals[0];
    if (!content) {
      console.error('Error: content is required for memory add');
      process.exit(1);
    }
    const res = await memory.transact([{ op: 'upsert', category: category!, content, tags: options.tags, importance: options.importance, scope: options.scope, taskId: options.taskId }]);
    console.log(JSON.stringify(res[0]));
  } else if (subCommand === 'query') {
    const queryText = positionals[0];
    if (!queryText) {
      console.error('Error: query text is required for memory query');
      process.exit(1);
    }
    const categories = options.categories ?? (category ? [category] : undefined);
    const results = await memory.query({ text: queryText, categories, limit: options.limit, scopes: options.scopes });
    console.log(JSON.stringify({ results, project: projectName, query: queryText }));
  } else if (subCommand === 'list') {
    const categories = category ? [category] : undefined;
    const results = await memory.query({ categories, limit: options.limit });
    console.log(JSON.stringify(results));
  } else if (subCommand === 'delete') {
    const id = positionals[0];
    if (!id) {
      console.error('Error: ID is required for memory delete');
      process.exit(1);
    }
    const res = await memory.transact([{ op: 'delete', category: category ?? 'learning', id }]);
    console.log(JSON.stringify(res[0]));
  } else if (subCommand === 'update') {
    const id = positionals[0];
    const content = positionals[1];
    if (!id || !content) {
      console.error('Error: ID and content are required for memory update');
      process.exit(1);
    }
    const res = await memory.transact([{ op: 'update', category: category ?? 'learning', id, content, tags: options.tags, importance: options.importance, scope: options.scope }]);
    console.log(JSON.stringify(res[0]));
  } else {
    console.error(`Unknown memory subcommand: ${subCommand}`);
    process.exit(1);
  }
}
