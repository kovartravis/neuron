import { NeuronMemory } from '../index.js';
import { parseFlags, LEARN_HELP } from './utils.js';

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
  const rest = args.slice(2);
  const { positionals, options } = parseFlags(rest);

  if (subCommand === 'add') {
    const content = positionals[0];
    if (!content) {
      console.error('Error: content is required for learn add');
      process.exit(1);
    }
    const res = await memory.transact([{ op: 'upsert', kind: 'learning', content, tags: options.tags, importance: options.importance, scope: options.scope }]);
    console.log(JSON.stringify(res[0]));
  } else if (subCommand === 'query') {
    const queryText = positionals[0];
    if (!queryText) {
      console.error('Error: query text is required for learn query');
      process.exit(1);
    }
    const results = await memory.query({ text: queryText, kind: 'learning', limit: options.limit, scopes: options.scopes });
    console.log(JSON.stringify({ results, project: projectName, query: queryText }));
  } else if (subCommand === 'list') {
    const results = await memory.query({ kind: 'learning', limit: options.limit });
    console.log(JSON.stringify(results));
  } else if (subCommand === 'delete') {
    const id = positionals[0];
    if (!id) {
      console.error('Error: ID is required for learn delete');
      process.exit(1);
    }
    const res = await memory.transact([{ op: 'delete', kind: 'learning', id }]);
    console.log(JSON.stringify(res[0]));
  } else if (subCommand === 'update') {
    const id = positionals[0];
    const content = positionals[1];
    if (!id || !content) {
      console.error('Error: ID and content are required for learn update');
      process.exit(1);
    }
    const res = await memory.transact([{ op: 'update', kind: 'learning', id, content, tags: options.tags, importance: options.importance, scope: options.scope }]);
    console.log(JSON.stringify(res[0]));
  } else {
    console.error(`Unknown learn subcommand: ${subCommand}`);
    process.exit(1);
  }
}
