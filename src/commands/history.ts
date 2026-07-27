import { NeuronMemory } from '../index.js';
import { parseFlags, HISTORY_HELP } from './utils.js';

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
  const rest = args.slice(2);
  const { positionals, options } = parseFlags(rest);

  if (subCommand === 'add') {
    const content = positionals[0];
    if (!content) {
      console.error('Error: content is required for history add');
      process.exit(1);
    }
    const res = await memory.transact([{ op: 'upsert', category: 'history', content, tags: options.tags, taskId: options.taskId, importance: options.importance, scope: options.scope }]);
    console.log(JSON.stringify(res[0]));
  } else if (subCommand === 'query') {
    const queryText = positionals[0];
    if (!queryText) {
      console.error('Error: query text is required for history query');
      process.exit(1);
    }
    const results = await memory.query({ text: queryText, categories: ['history'], limit: options.limit, scopes: options.scopes });
    console.log(JSON.stringify({ results, project: projectName, query: queryText }));
  } else if (subCommand === 'list') {
    const results = await memory.query({ categories: ['history'], limit: options.limit });
    console.log(JSON.stringify(results));
  } else if (subCommand === 'delete') {
    const id = positionals[0];
    if (!id) {
      console.error('Error: ID is required for history delete');
      process.exit(1);
    }
    const res = await memory.transact([{ op: 'delete', category: 'history', id }]);
    console.log(JSON.stringify(res[0]));
  } else if (subCommand === 'consolidate') {
    const report = memory.maintain({ consolidate: true, autoPromote: true });
    console.log(JSON.stringify({
      entries: report.consolidated?.entries || [],
      consolidatedAt: report.consolidated?.consolidatedAt,
      previousCursor: report.consolidated?.previousCursor,
      promotions: report.promotions,
      project: projectName
    }));
  } else if (subCommand === 'prune') {
    const report = memory.maintain({ pruneHistoryBeforeDays: options.days ?? 30, maxPruneImportance: options.importance ?? 3 });
    console.log(JSON.stringify({
      status: 'pruned',
      deletedCount: report.prunedCount ?? 0,
      project: projectName
    }));
  } else {
    console.error(`Unknown history subcommand: ${subCommand}`);
    process.exit(1);
  }
}
