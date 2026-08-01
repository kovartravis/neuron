import { NeuronMemory } from '../index.js';
import { parseFlags, MEMORY_HELP } from './utils.js';
import { autoRescanIfDriftDetected } from '../scanner/diff.js';

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
  // `--category` is optional on `add` only — write-side enrichment infers it,
  // or the write fails naming the cause. It stays required for `delete` and
  // `update`, where it selects an existing entry and inference is meaningless.
  if (!category && ['delete', 'update'].includes(subCommand)) {
    console.error(`Error: --category is required for 'memory ${subCommand}'`);
    process.exit(1);
  }

  if (subCommand === 'add') {
    const content = positionals[0];
    if (!content) {
      console.error('Error: content is required for memory add');
      process.exit(1);
    }
    const res = await memory.transact([
      {
        op: 'upsert',
        category,
        content,
        tags: options.tags,
        importance: options.importance,
        scope: options.scope,
        taskId: options.taskId,
      },
    ]);
    console.log(JSON.stringify(res[0]));
  } else if (subCommand === 'query') {
    const queryText = positionals[0];
    if (!queryText) {
      console.error('Error: query text is required for memory query');
      process.exit(1);
    }
    await autoRescanIfDriftDetected(memory, process.cwd());
    const categories = options.categories ?? (options.category ? [options.category] : undefined);
    const results = await memory.query({ text: queryText, categories, limit: options.limit, scopes: options.scopes });
    console.log(JSON.stringify({ results, project: projectName, query: queryText }));
  } else if (subCommand === 'list') {
    const categories = options.category ? [options.category] : undefined;
    const results = await memory.query({ categories, limit: options.limit });
    console.log(JSON.stringify(results));
  } else if (subCommand === 'delete') {
    const id = positionals[0];
    if (!id) {
      console.error('Error: ID is required for memory delete');
      process.exit(1);
    }
    const res = await memory.transact([{ op: 'delete', category: category!, id }]);
    console.log(JSON.stringify(res[0]));
  } else if (subCommand === 'update') {
    const id = positionals[0];
    const content = positionals[1];
    if (!id || !content) {
      console.error('Error: ID and content are required for memory update');
      process.exit(1);
    }
    const res = await memory.transact([
      {
        op: 'update',
        category: category!,
        id,
        content,
        tags: options.tags,
        importance: options.importance,
        scope: options.scope,
        taskId: options.taskId,
      },
    ]);
    console.log(JSON.stringify(res[0]));
  } else if (subCommand === 'consolidate') {
    const report = memory.maintain({ consolidate: true, autoPromote: true });
    console.log(
      JSON.stringify({
        entries: report.consolidated?.entries || [],
        consolidatedAt: report.consolidated?.consolidatedAt,
        previousCursor: report.consolidated?.previousCursor,
        promotions: report.promotions,
        project: projectName,
      })
    );
  } else if (subCommand === 'enrich') {
    // The backlog drains on its own before any query; this exists so the cost
    // can be paid deliberately, and so the benchmark can drive enrichment
    // deterministically rather than as a side effect of reading.
    const report = await memory.drainEnrichment();
    console.log(JSON.stringify({ status: 'enriched', ...report, project: projectName }));
  } else if (subCommand === 'prune') {
    const report = memory.maintain({
      pruneHistoryBeforeDays: options.days ?? 30,
      maxPruneImportance: options.importance ?? 3,
    });
    console.log(
      JSON.stringify({
        status: 'pruned',
        deletedCount: report.prunedCount ?? 0,
        project: projectName,
      })
    );
  } else {
    console.error(`Unknown memory subcommand: ${subCommand}`);
    process.exit(1);
  }
}
