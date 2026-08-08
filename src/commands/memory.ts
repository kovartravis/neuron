import { NeuronMemory } from '../index.js';
import { parseFlags, getMemoryHelp } from './utils.js';
import { autoRescanIfDriftDetected } from '../scanner/diff.js';
import { collectDeclaredFieldFlags } from '../config/neuronYaml.js';

export async function handleMemoryCommand(
  args: string[],
  memory: NeuronMemory,
  projectName: string
): Promise<void> {
  const config = memory.getConfig();
  const declaredFields = collectDeclaredFieldFlags(config);
  const memoryHelp = getMemoryHelp(config);

  const subCommand = args[1];
  if (!subCommand) {
    console.error(memoryHelp);
    process.exit(1);
  }
  if (subCommand === '--help' || subCommand === '-h') {
    console.log(memoryHelp);
    process.exit(0);
  }

  const rest = args.slice(2);
  const { positionals, options } = parseFlags(rest, declaredFields);

  if (options.help) {
    console.log(memoryHelp);
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

    // Ticket 17 / ADR 0015: the write-time supersession gate. `--supersedes`
    // resolves it by naming the reversal target directly; `--not-a-reversal`
    // resolves it by confirming the near-duplicate is not one. Either skips
    // the embedding-similarity shortlist below. The target is validated
    // *before* the new entry is written, so a bad `--supersedes` id fails
    // clean rather than leaving an orphaned new entry with no old one marked.
    let supersedesTarget: Awaited<ReturnType<typeof memory.findById>> = null;
    if (options.supersedes) {
      supersedesTarget = await memory.findById(options.supersedes);
      if (!supersedesTarget) {
        console.error(`Error: --supersedes target "${options.supersedes}" not found`);
        process.exit(1);
      }
    } else if (!options.notAReversal) {
      const candidate = await memory.findSupersessionCandidate(content);
      if (candidate) {
        console.error(
          `Error: this write looks like it may supersede an existing entry ` +
            `(similarity ${candidate.similarity.toFixed(3)}):`
        );
        console.error(`  [${candidate.id}] (${candidate.category}) ${candidate.content}`);
        console.error(`  If this is a reversal, re-run with --supersedes ${candidate.id}`);
        console.error(`  If it is not, re-run with --not-a-reversal`);
        process.exit(1);
      }
    }

    const res = await memory.transact([
      {
        op: 'upsert',
        category,
        content,
        tags: options.tags,
        importance: options.importance,
        taskId: options.taskId,
        fields: options.fields,
      },
    ]);

    if (supersedesTarget) {
      await memory.transact([
        {
          op: 'update',
          category: supersedesTarget.category,
          id: supersedesTarget.id,
          supersededBy: res[0].id,
          supersededAt: new Date().toISOString(),
        },
      ]);
    }

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
    // `rejected` (ticket 41 / ADR 0012) lets an empty `results` mean "the
    // relevance gate rejected N candidates" rather than being indistinguishable
    // from an empty store.
    const { results, rejected } = await memory.queryGated({ text: queryText, categories, limit: options.limit, includeSuperseded: options.includeSuperseded });
    console.log(JSON.stringify({ results, project: projectName, query: queryText, rejected }));
  } else if (subCommand === 'list') {
    // Was `options.category` only, so `--categories a,b` parsed successfully
    // and silently had no filtering effect — `query` already reads both.
    const categories = options.categories ?? (options.category ? [options.category] : undefined);
    const results = await memory.query({ categories, limit: options.limit, includeSuperseded: options.includeSuperseded });
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
        fields: options.fields,
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
