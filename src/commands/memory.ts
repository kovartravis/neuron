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

  if (options.help) {
    console.log(MEMORY_HELP);
    process.exit(0);
  }

  // An unquoted argument arrives as several bare words. These subcommands used
  // to read only the first and silently discard the rest, so `memory add Fix
  // the ONNX crash` stored the single word "Fix" and reported success. The
  // remainder is unrecoverable, so refuse the write rather than truncate it.
  const EXPECTED: Record<string, { max: number; shape: string; example: string }> = {
    add: {
      max: 1,
      shape: 'a single content argument',
      example: `neuron memory add --category learning "your full text here"`,
    },
    update: {
      max: 2,
      shape: 'an id and a single content argument',
      example: `neuron memory update <id> --category learning "your full text here"`,
    },
    delete: {
      max: 1,
      shape: 'a single id argument',
      example: `neuron memory delete <id> --category learning`,
    },
  };
  const expected = EXPECTED[subCommand];
  if (expected && positionals.length > expected.max) {
    console.error(
      `Error: 'memory ${subCommand}' expects ${expected.shape}, but got ` +
        `${positionals.length} bare arguments.`
    );
    console.error(`  Did you forget to quote it? Try:`);
    console.error(`    ${expected.example}`);
    process.exit(1);
  }

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
        taskId: options.taskId,
      },
    ]);
    console.log(JSON.stringify(res[0]));
  } else if (subCommand === 'query') {
    // A read harms nothing and retrying is free, so an unquoted query is joined
    // rather than refused — the write path is the one that must be strict.
    // Truncating here silently searched one word and looked like a bad corpus.
    const queryText = positionals.join(' ');
    if (!queryText) {
      console.error('Error: query text is required for memory query');
      process.exit(1);
    }
    await autoRescanIfDriftDetected(memory, process.cwd());
    const categories = options.categories ?? (options.category ? [options.category] : undefined);
    const results = await memory.query({ text: queryText, categories, limit: options.limit });
    console.log(JSON.stringify({ results, project: projectName, query: queryText }));
  } else if (subCommand === 'list') {
    // Was `options.category` only, so `--categories a,b` parsed successfully
    // and silently had no filtering effect — `query` already reads both.
    const categories = options.categories ?? (options.category ? [options.category] : undefined);
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
        taskId: options.taskId,
      },
    ]);
    console.log(JSON.stringify(res[0]));
  } else if (subCommand === 'consolidate') {
    const report = memory.maintain({ consolidate: true });
    console.log(
      JSON.stringify({
        entries: report.consolidated?.entries || [],
        consolidatedAt: report.consolidated?.consolidatedAt,
        previousCursor: report.consolidated?.previousCursor,
        project: projectName,
      })
    );
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
