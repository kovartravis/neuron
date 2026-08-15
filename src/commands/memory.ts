import { NeuronMemory, NLI_CONTRADICTION_BAR } from '../index.js';
import { Memory } from '../models/memory.js';
import { parseFlags, getMemoryHelp } from './utils.js';
import { autoRescanIfDriftDetected } from '../scanner/diff.js';
import { collectDeclaredFieldFlags } from '../config/neuronYaml.js';

// `list` returns at most 20 entries by default and the SQL/markdown read path
// already loads every matching row before slicing to the caller's limit (see
// queryVector's list-mode branch), so this just asks for "effectively all" —
// filtering by field value or by a reference graph needs to see every
// candidate, not a windowed sample, before a limit is applied to the result.
const FILTERED_LIST_FETCH_LIMIT = 1_000_000;

export interface WhereClause {
  field: string;
  value: string;
  /** `field!=value` (ticket 45) — negates the comparison instead of requiring equality. */
  negate?: boolean;
}

export interface RefsSatisfyClause {
  /** Declared field holding a comma-separated list of ids referencing other entries in the same category. */
  field: string;
  /** Field + value every referenced entry must satisfy for the reference to count as "satisfied". */
  subfield: string;
  subvalue: string;
}

/**
 * Two composable, schema-agnostic filters for `memory list` — no assumption
 * about field names or enum values, so any project's own declared-field
 * schema (any category, not just a wayfinder-style tracker) can express its
 * own "what's actionable" query:
 *
 *   --where <field>=<value>            keep entries where fields[field] === value
 *   --where <field>!=<value>           keep entries where fields[field] !== value
 *                                      (repeatable — ticket 45 — every
 *                                      occurrence ANDs onto the rest, equality
 *                                      and negation freely mixed)
 *   --refs-satisfy <field>:<sub>=<val> keep entries where every comma-separated id
 *                                      in fields[field] names another entry (same
 *                                      category) with fields[sub] === val
 *
 * A dangling id in a `--refs-satisfy` field (no matching entry at all in the
 * fetched set) fails the check rather than being silently skipped — an
 * unresolvable reference must not look satisfied.
 */
async function filterList(
  memory: NeuronMemory,
  categories: string[] | undefined,
  where: WhereClause[] | undefined,
  refsSatisfy: RefsSatisfyClause | undefined,
  limit: number | undefined,
  includeSuperseded: boolean | undefined
): Promise<Memory[]> {
  if (refsSatisfy && (!categories || categories.length !== 1)) {
    console.error(
      '--refs-satisfy resolves ids against entries in the same category, so it requires exactly one --category.'
    );
    process.exit(1);
  }
  const all = await memory.query({ categories, limit: FILTERED_LIST_FETCH_LIMIT, includeSuperseded });

  let results = all;
  if (where && where.length > 0) {
    results = results.filter(e => where.every(clause => {
      const matches = e.fields?.[clause.field] === clause.value;
      return clause.negate ? !matches : matches;
    }));
  }
  if (refsSatisfy) {
    const satisfiedIds = new Set(all.filter(e => e.fields?.[refsSatisfy.subfield] === refsSatisfy.subvalue).map(e => e.id));
    results = results.filter(e => {
      const refs = (e.fields?.[refsSatisfy.field] ?? '')
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);
      return refs.every(id => satisfiedIds.has(id));
    });
  }
  return limit !== undefined ? results.slice(0, limit) : results;
}

function parseWhere(raw: string): WhereClause {
  const neq = raw.indexOf('!=');
  if (neq >= 1) {
    return { field: raw.slice(0, neq), value: raw.slice(neq + 2), negate: true };
  }
  const eq = raw.indexOf('=');
  if (eq < 1) {
    console.error(`Error: --where expects "<field>=<value>" or "<field>!=<value>", got "${raw}"`);
    process.exit(1);
  }
  return { field: raw.slice(0, eq), value: raw.slice(eq + 1) };
}

function parseRefsSatisfy(raw: string): RefsSatisfyClause {
  const colon = raw.indexOf(':');
  const eq = raw.indexOf('=', colon + 1);
  if (colon < 1 || eq < colon + 2) {
    console.error(`Error: --refs-satisfy expects "<field>:<subfield>=<value>", got "${raw}"`);
    process.exit(1);
  }
  return { field: raw.slice(0, colon), subfield: raw.slice(colon + 1, eq), subvalue: raw.slice(eq + 1) };
}

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
    get: {
      max: 1,
      shape: 'a single id argument',
      example: `neuron memory get <id>`,
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
    // Ticket 9 / ADR (neuron-2.4.2): a non-blocking pointer printed alongside
    // the normal write result when the near-dup candidate below turns out,
    // per NLI, to look like a contradiction rather than a restatement —
    // never persisted (the map's own non-goals rule out a new workflow-state
    // field), just an inline warning on this one CLI call.
    let conflictFlag: { candidateId: string; category: string; content: string; contradictionProbability: number } | null = null;
    if (options.supersedes) {
      supersedesTarget = await memory.findById(options.supersedes);
      if (!supersedesTarget) {
        console.error(`Error: --supersedes target "${options.supersedes}" not found`);
        process.exit(1);
      }
    } else if (!options.notAReversal) {
      const candidate = await memory.findSupersessionCandidate(content);
      if (candidate) {
        // Ticket 9 (neuron-2.4.2): before treating this as a possible
        // restatement/reversal, ask whether it actually looks like a
        // contradiction instead — Ticket 8/13 found the NLI signal can't
        // support a hard-block posture (no bar reaches low false-silence
        // and low false-accept against compatible-related pairs
        // simultaneously), so a bar crossing here downgrades the outcome to
        // a soft-flag: the write proceeds normally, with a pointer to the
        // entry it may conflict with, instead of joining the
        // --supersedes/--not-a-reversal/--if-novel refusal flow below.
        const contradictionProbability = await memory.classifyPolarity(candidate.content, content);
        if (contradictionProbability >= NLI_CONTRADICTION_BAR) {
          conflictFlag = {
            candidateId: candidate.id,
            category: candidate.category,
            content: candidate.content,
            contradictionProbability,
          };
          console.error(
            `[neuron] possible conflict: this write may contradict an existing entry ` +
              `(P(contradiction) ${contradictionProbability.toFixed(3)}) — proceeding, not blocked:`
          );
          console.error(`  [${candidate.id}] (${candidate.category}) ${candidate.content}`);
        } else {
          // Ticket 19: `--if-novel` is the non-interactive resolution for
          // scheduled/cron callers that cannot answer this gate by hand. It
          // skips the write (job succeeds) rather than hard-erroring, but
          // never silently — a silent skip would mask real duplicate-
          // prevention failures the same way an unmonitored sessionsObserved
          // counter would (ticket 21's own concern). Exit 0, not a plain
          // console.log, so the skip is visible in stderr even when the
          // caller only captures stdout.
          if (options.ifNovel) {
            console.error(
              `[neuron] skipped: this write looks like it may supersede an existing entry ` +
                `(reranker score ${candidate.rerankerScore.toFixed(3)}, cosine ${candidate.similarity.toFixed(3)}), and --if-novel was set:`
            );
            console.error(`  [${candidate.id}] (${candidate.category}) ${candidate.content}`);
            console.log(JSON.stringify({
              skipped: true,
              reason: 'supersession-candidate',
              candidateId: candidate.id,
              similarity: candidate.similarity,
              rerankerScore: candidate.rerankerScore,
            }));
            process.exit(0);
            return;
          }
          console.error(
            `Error: this write looks like it may supersede an existing entry ` +
              `(reranker score ${candidate.rerankerScore.toFixed(3)}, cosine ${candidate.similarity.toFixed(3)}):`
          );
          console.error(`  [${candidate.id}] (${candidate.category}) ${candidate.content}`);
          console.error(`  If this is a reversal, re-run with --supersedes ${candidate.id}`);
          console.error(`  If it is not, re-run with --not-a-reversal`);
          console.error(`  If this is a non-interactive/scheduled writer, re-run with --if-novel`);
          process.exit(1);
        }
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

    console.log(JSON.stringify(conflictFlag ? { ...res[0], possibleConflict: conflictFlag } : res[0]));
  } else if (subCommand === 'query') {
    // A read harms nothing and retrying is free, so an unquoted query is joined
    // rather than refused — the write path is the one that must be strict.
    // Truncating here silently searched one word and looked like a bad corpus.
    const queryText = positionals.join(' ');
    if (!queryText) {
      console.error('Error: query text is required for memory query');
      process.exit(1);
    }
    await autoRescanIfDriftDetected(memory);
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
    if (options.where || options.refsSatisfy) {
      const where = options.where ? options.where.map(parseWhere) : undefined;
      const refsSatisfy = options.refsSatisfy ? parseRefsSatisfy(options.refsSatisfy) : undefined;
      console.log(JSON.stringify(await filterList(memory, categories, where, refsSatisfy, options.limit, options.includeSuperseded)));
      return;
    }
    const results = await memory.query({ categories, limit: options.limit, includeSuperseded: options.includeSuperseded });
    console.log(JSON.stringify(results));
  } else if (subCommand === 'get') {
    // Single-entry fetch by id (ticket 45) — the escape hatch for "resolve
    // this one known id" that used to mean pulling the entire category via
    // `list --json` and filtering client-side. Ids are unique store-wide
    // (findById doesn't take a category), so --category here is optional and
    // only asserts the caller's own assumption: a mismatch reads as
    // not-found rather than silently ignoring the flag.
    const id = positionals[0];
    if (!id) {
      console.error('Error: ID is required for memory get');
      process.exit(1);
    }
    const entry = await memory.findById(id);
    if (!entry || (category && entry.category !== category)) {
      console.log(JSON.stringify({ status: 'not_found', id }));
      return;
    }
    console.log(JSON.stringify(entry));
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
