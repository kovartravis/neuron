import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { suggestClosest } from '../shared/textMatch.js';
import { NeuronConfig, RESERVED_FLAG_NAMES, collectDeclaredFieldFlags, type DeclaredFieldFlag } from '../config/neuronYaml.js';

export {
  HARNESSES,
  detectHarnesses,
  copySkill,
  type AgentHarness
} from '../config/index.js';

export { findProjectRoot } from '../shared/projectRoot.js';

export function drawBox(lines: string[]): string {
  const getVisualWidth = (str: string) => {
    let width = 0;
    for (const char of str) {
      const code = char.codePointAt(0) || 0;
      if (code === 0xfe0f) continue;
      if (
        (code >= 0x1f300 && code <= 0x1f9ff) ||
        (code >= 0x2600 && code <= 0x2bff) ||
        (code >= 0x2300 && code <= 0x23ff)
      ) {
        width += 2;
      } else {
        width += 1;
      }
    }
    return width;
  };

  const maxWidth = Math.max(...lines.map(getVisualWidth));
  const innerWidth = maxWidth + 4;

  const top = '┌' + '─'.repeat(innerWidth) + '┐';
  const bottom = '└' + '─'.repeat(innerWidth) + '┘';

  const middle = lines.map(line => {
    const visualW = getVisualWidth(line);
    const paddingNeeded = maxWidth - visualW;
    return `│  ${line}${' '.repeat(paddingNeeded)}  │`;
  }).join('\n');

  return `\n${top}\n${middle}\n${bottom}\n`;
}



/**
 * Every option `parseFlags` understands with no `neuron.yaml` involved. Used
 * to reject unrecognised flags and to suggest a correction — a typo'd flag
 * used to be pushed into `positionals` and silently discarded, so
 * `--importanc 5` looked like it worked and wrote the default instead.
 *
 * Re-exported from `config/neuronYaml.ts`, which is also where
 * `validateNeuronYaml` checks a declared field's flag against this same list
 * at config-load time (ticket 43) — one vocabulary, not two that can drift.
 */
const KNOWN_FLAGS = RESERVED_FLAG_NAMES;

function unknownFlag(arg: string, declaredFields: DeclaredFieldFlag[] = []): never {
  const candidates = [...KNOWN_FLAGS, ...declaredFields.map(f => f.flag)];
  const near = suggestClosest(arg, candidates);
  console.error(`Error: unknown option '${arg}'`);
  if (near) {
    console.error(`  Did you mean '${near}'?`);
  }
  console.error(`  Pass '--' before a value that legitimately begins with a dash.`);
  process.exit(1);
}

export function parseFlags(args: string[], declaredFields: DeclaredFieldFlag[] = []): {
  positionals: string[];
  options: {
    help?: boolean;
    tags?: string[];
    taskId?: string;
    limit?: number;
    depth?: number;
    file?: string;
    importance?: number;
    days?: number;
    category?: string;
    categories?: string[];
    type?: string;
    title?: string;
    format?: string;
    json?: boolean;
    dryRun?: boolean;
    force?: boolean;
    noProgress?: boolean;
    diff?: boolean;
    check?: boolean;
    repair?: boolean;
    health?: boolean;
    yes?: boolean;
    noHooks?: boolean;
    overwriteHooks?: boolean;
    keepHooks?: boolean;
    hookTarget?: string;
    uninstallHooks?: boolean;
    harness?: string[];
    /** Raw values for config-declared fields (ticket 43), keyed by the field's config key (e.g. `reviewedBy`). Interpreted and validated in `NeuronMemory.transact()`. */
    fields?: Record<string, string>;
    /** `memory add` ticket 17 / ADR 0015: the id of the entry this write reverses. */
    supersedes?: string;
    /** `memory add` ticket 17 / ADR 0015: explicit override confirming this write is not a reversal, skipping the similarity gate without linking anything. */
    notAReversal?: boolean;
    /** `memory query`/`list` ticket 17 / ADR 0015: include hard-excluded superseded rows. */
    includeSuperseded?: boolean;
    /** `memory add` ticket 19: non-interactive resolution of the supersession gate for scheduled/cron writers — skip the write (not an error) when a candidate is found, rather than hard-blocking for a human. */
    ifNovel?: boolean;
  };
} {
  const positionals: string[] = [];
  const tags: string[] = [];
  let help: boolean | undefined;
  let taskId: string | undefined;
  let limit: number | undefined;
  let depth: number | undefined;
  let file: string | undefined;
  let importance: number | undefined;
  let days: number | undefined;
  let category: string | undefined;
  let categories: string[] | undefined;
  let type: string | undefined;
  let title: string | undefined;
  let format: string | undefined;
  let json: boolean | undefined;
  let dryRun: boolean | undefined;
  let force: boolean | undefined;
  let noProgress: boolean | undefined;
  let diff: boolean | undefined;
  let check: boolean | undefined;
  let repair: boolean | undefined;
  let health: boolean | undefined;
  let yes: boolean | undefined;
  let noHooks: boolean | undefined;
  let overwriteHooks: boolean | undefined;
  let keepHooks: boolean | undefined;
  let hookTarget: string | undefined;
  let uninstallHooks: boolean | undefined;
  let harness: string[] | undefined;
  let supersedes: string | undefined;
  let notAReversal: boolean | undefined;
  let includeSuperseded: boolean | undefined;
  let ifNovel: boolean | undefined;
  const fields: Record<string, string> = {};
  const fieldFlagIndex = new Map(declaredFields.map(f => [f.flag, f.key]));

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const declaredFieldKey = fieldFlagIndex.get(arg);
    if (arg === '--') {
      // End of flags. Everything after is positional verbatim, which is the
      // escape hatch for content that legitimately begins with a dash.
      positionals.push(...args.slice(i + 1));
      break;
    } else if (declaredFieldKey !== undefined) {
      // Config-declared field flag (ticket 43) — checked ahead of the
      // built-ins below so a project's own field names never fall through to
      // unknownFlag(). Value validation (required-ness, enum membership)
      // happens once in NeuronMemory.transact(), the single choke point
      // every writer (CLI, `neuron scan`) goes through.
      const val = args[++i];
      if (val !== undefined) {
        fields[declaredFieldKey] = val;
      }
    } else if (arg === '--help' || arg === '-h') {
      help = true;
    } else if (arg === '--format') {
      format = args[++i];
    } else if (arg === '--json') {
      json = true;
    } else if (arg === '--no-progress') {
      noProgress = true;
    } else if (arg === '--diff') {
      diff = true;
    } else if (arg === '--check') {
      check = true;
    } else if (arg === '--repair') {
      repair = true;
    } else if (arg === '--health') {
      health = true;
    } else if (arg === '--tags') {

      const val = args[++i];
      if (val) {
        tags.push(...val.split(',').map(t => t.trim()).filter(Boolean));
      }
    } else if (arg === '--task-id') {
      taskId = args[++i];
    } else if (arg === '--limit') {
      const val = args[++i];
      if (val) {
        limit = parseInt(val, 10);
      }
    } else if (arg === '--file' || arg === '-f') {
      file = args[++i];
    } else if (arg === '--importance') {
      const val = args[++i];
      if (val) {
        importance = parseInt(val, 10);
      }
    } else if (arg === '--scope') {
      // scope was removed in v2.2.0 (ticket 38) — kept in KNOWN_FLAGS and
      // consumed here so unknownFlag() doesn't turn this into a hard outage
      // for existing scripts/agent invocations.
      i++;
      process.stderr.write(`[neuron warning] '--scope' is deprecated and has no effect. Scope was removed in v2.2.0.\n`);
    } else if (arg === '--scopes') {
      i++;
      process.stderr.write(`[neuron warning] '--scopes' is deprecated and has no effect. Scope was removed in v2.2.0.\n`);
    } else if (arg === '--days') {
      const val = args[++i];
      if (val) {
        days = parseInt(val, 10);
      }
    } else if (arg === '--category') {
      category = args[++i];
    } else if (arg === '--categories') {
      const val = args[++i];
      if (val) {
        categories = val.split(',').map(s => s.trim()).filter(Boolean);
      }
    } else if (arg === '--depth') {
      const val = args[++i];
      if (val) {
        depth = parseInt(val, 10);
      }
    } else if (arg === '--dry-run') {
      dryRun = true;
    } else if (arg === '--force') {
      force = true;
    } else if (arg === '--type') {
      type = args[++i];
    } else if (arg === '--title') {
      title = args[++i];
    } else if (arg === '--yes') {
      yes = true;
    } else if (arg === '--no-hooks') {
      noHooks = true;
    } else if (arg === '--overwrite-hooks') {
      overwriteHooks = true;
    } else if (arg === '--keep-hooks') {
      keepHooks = true;
    } else if (arg === '--hook-target') {
      hookTarget = args[++i];
    } else if (arg === '--uninstall-hooks') {
      uninstallHooks = true;
    } else if (arg === '--harness') {
      const val = args[++i];
      if (val) {
        harness = val.split(',').map(s => s.trim()).filter(Boolean);
      }
    } else if (arg === '--supersedes') {
      supersedes = args[++i];
    } else if (arg === '--not-a-reversal') {
      notAReversal = true;
    } else if (arg === '--include-superseded') {
      includeSuperseded = true;
    } else if (arg === '--if-novel') {
      ifNovel = true;
    } else if (arg.startsWith('-') && arg.length > 1) {
      // Previously fell through to `positionals`, where it was silently
      // discarded by every caller. A mistyped flag must not look like success.
      unknownFlag(arg, declaredFields);
    } else {
      positionals.push(arg);
    }
  }

  if (importance !== undefined) {
    if (Number.isNaN(importance) || importance < 1 || importance > 5) {
      console.error('Error: --importance must be an integer between 1 and 5');
      process.exit(1);
    }
  }

  if (days !== undefined) {
    if (Number.isNaN(days) || days < 1) {
      console.error('Error: --days must be a positive integer');
      process.exit(1);
    }
  }

  if (hookTarget !== undefined && !['user-global', 'project-committed', 'project-local'].includes(hookTarget)) {
    console.error("Error: --hook-target must be one of 'user-global', 'project-committed', 'project-local'");
    process.exit(1);
  }

  if (overwriteHooks && keepHooks) {
    console.error('Error: --overwrite-hooks and --keep-hooks are mutually exclusive');
    process.exit(1);
  }

  if (supersedes && notAReversal) {
    console.error('Error: --supersedes and --not-a-reversal are mutually exclusive');
    process.exit(1);
  }

  if (ifNovel && (supersedes || notAReversal)) {
    console.error('Error: --if-novel is mutually exclusive with --supersedes and --not-a-reversal');
    console.error('  --if-novel defers to the gate itself; the other two flags assert a human-made call.');
    process.exit(1);
  }

  return {
    positionals,
    options: {
      help,
      tags: tags.length > 0 ? tags : undefined,
      taskId,
      limit,
      depth,
      file,
      importance,
      days,
      category,
      categories,
      type,
      title,
      format,
      json,
      dryRun,
      force,
      noProgress,
      diff,
      check,
      repair,
      health,
      yes,
      noHooks,
      overwriteHooks,
      keepHooks,
      hookTarget,
      uninstallHooks,
      harness,
      fields: Object.keys(fields).length > 0 ? fields : undefined,
      supersedes,
      notAReversal,
      includeSuperseded,
      ifNovel,
    }
  };
}


export function updateMarkdownFile(filePath: string, heading: string, blockContent: string): void {
  let content = '';
  if (fs.existsSync(filePath)) {
    content = fs.readFileSync(filePath, 'utf8');
  }

  const headingRegex = new RegExp(`^##\\s+${heading}\\b`, 'm');
  const hasHeading = headingRegex.test(content);

  if (hasHeading) {
    const lines = content.split('\n');
    let startIndex = -1;
    let endIndex = -1;

    for (let i = 0; i < lines.length; i++) {
      if (headingRegex.test(lines[i])) {
        startIndex = i;
        continue;
      }
      if (startIndex !== -1) {
        if (/^##?\s+/.test(lines[i])) {
          endIndex = i;
          break;
        }
      }
    }

    if (endIndex === -1) {
      endIndex = lines.length;
    }

    lines.splice(startIndex, endIndex - startIndex, blockContent.trim());
    fs.writeFileSync(filePath, lines.join('\n') + '\n', 'utf8');
  } else {
    const separator = content && !content.endsWith('\n') ? '\n\n' : (content ? '\n' : '');
    fs.writeFileSync(filePath, content + separator + blockContent.trim() + '\n', 'utf8');
  }
}

export const MASTER_HELP = `Usage: neuron <command> [subcommand] [arguments] [flags]

Commands:
  init                 Bootstrap the project for agentic memory store (pre-downloads ONNX models with progress bar)
  exec -- <command>    Run a command with pre-command memory lookup
  status               Display status details for active database, project, embedding cache, and architectural drift
                        (--check/--repair reports and fixes entries violating a category's declared field schema)
                        (--health reports duplicate clusters, importance histogram, superseded count, sessionsObserved)
                        (--health --repair merges exact-duplicate clusters; leaves differently-worded near-dupes for a human)
  memory <subcommand>  Manage memories across any category (use --category <name>)
  scan                 Scan project topology and manifests, ingest an architectural blueprint, and detect drift
  sync                 Sync memories between .neuron/*.md files and the vector database
  ui                   Launch the local web dashboard for browsing and querying memories
  feedback [message]   Generate GitHub issue URL with pre-filled feedback parameters
  learn <subcommand>   [Deprecated] Manage learnings (use 'neuron memory --category learning')
  history <subcommand> [Deprecated] Manage action history (use 'neuron memory --category history')

Options:
  -h, --help           Show this help information

Run 'neuron memory --help' or 'neuron scan --help' for details.`;

export const STATUS_HELP = `Usage: neuron status [flags]

With no flags, prints database/model/storage/enrichment/drift status as JSON.

With --check or --repair, reports up to three independent kinds of drift:

1. Entries whose category's *currently* declared field schema (neuron.yaml
   categories.<name>.fields) they violate — most commonly a field that was
   declared required after the entry was written. Reads never hard-error on
   this; these flags are the only surface that reports it (ADR 0013).
2. Categories holding live rows in the store but absent from neuron.yaml's
   own "categories" block — config-file drift rather than a per-entry
   defect, reported separately (ADR 0017). Most writes never reach this: a
   category missing from neuron.yaml auto-declares itself on its first
   write (neuron.yaml is edited on disk, comments and formatting preserved).
   This only catches categories that predate that auto-declare hook.
3. --check only: the resolved-from-PATH "neuron" binary's version disagreeing
   with the current directory's own package.json — only checked when that
   package.json is this project's own (@kovartravis/neuron), since that's
   the only case where "the binary" and "the source tree" can meaningfully
   disagree. Every hook and "neuron exec" invoke the bare PATH-resolved
   binary, so a stale global/linked install silently runs old behavior
   while source changes underneath it. There is no --repair for this: the
   fix is re-linking/re-installing the binary, not a store write.

With --health, reports store-health signals instead: near-duplicate entry
clusters that slipped past the write-time supersession gate, an importance
histogram (1-5), the superseded-entry count, and whether recall has ever
actually fired (sessionsObserved). Prints a human-readable report by
default; pass --json for the scriptable form.

With --health --repair together, also fixes what's safely fixable: within
each near-duplicate cluster, entries sharing byte-identical content are
merged (the latest-created one survives; the rest are marked superseded,
never deleted). A cluster whose members' *wording* actually differs is left
unresolved — no content signal says which version is "right", so that stays
a human call via --supersedes/--not-a-reversal, the same never-fabricate
posture --repair already applies to free-text fields.

Options:
  --check                   List field violations, undeclared categories, and binary version mismatch
  --repair                  Fix what's safely fixable and report the result
  --health                  Report duplicate clusters, importance histogram, superseded count, sessionsObserved
  --health --repair         Merge exact-duplicate clusters found by --health; leaves differently-worded near-dupes unresolved
  --json                    With --health, print JSON instead of the human-readable report

--repair (without --health) applies a configured "default:" where one
exists, and otherwise offers centroid-based inference for enum-typed fields
only (the same content-to-label mechanism write-side tag/category inference
uses). It never fabricates a value for a free-text identity field (e.g.
"reviewedBy", "ticket") — there is no content signal that could produce a
person's name or a ticket number. Those, and any enum field with no other
entry to build a confident centroid from yet, come back unresolved for a
human or an agent told to go find the real answer. Undeclared categories are
always safely fixable — repair declares each one with a minimal
"categories.<name>: {}" block, no invented description or tags.

Exit codes (--check / --repair / --health --repair):
  0                              Compliant/merged, or every violation repaired
  1                              Violations found, or something left unresolved

--check cannot be combined with --repair or --health. --health and --repair
combine freely with each other.

Examples:
  neuron status                    Full status JSON
  neuron status --check            List non-compliant entries, exit 1 if any
  neuron status --repair           Fix what's fixable, exit 1 if anything is left unresolved
  neuron status --health           Human-readable store-health report
  neuron status --health --json    Same report, as JSON
  neuron status --health --repair  Merge exact-duplicate clusters, exit 1 if any near-dup wording is left unresolved`;

export const SCAN_HELP = `Usage: neuron scan [flags]

Scan project topology, manifests, and source symbols, then ingest a single
Repository Architectural Blueprint card into the memory store. Re-running
updates that card in place rather than adding a duplicate.

With --diff or --check, compares the live codebase against the stored blueprint
instead of ingesting, reporting drift in four buckets: new modules, removed
modules, export changes, and dependency shifts.

Options:
  --category <name>              Target memory category for blueprint ingestion (default: architecture)
  --depth <n>                    Max directory traversal depth (default: 3)
  --diff                         Report drift against the stored blueprint instead of ingesting
  --check                        Like --diff, but sets a non-zero exit code (for CI). See Exit codes.
  --dry-run                      Print the blueprint card without ingesting it
  --format <json|md>             Output format for --dry-run, --diff, and --check (default: md)
  --json                         Shortcut for --format json
  --no-progress                  Disable the terminal progress bar

Exit codes (--check):
  0                              In sync with the baseline
  1                              Architectural drift detected
  2                              Baseline is not comparable — re-baseline required

Examples:
  neuron scan                              Scan and ingest the blueprint
  neuron scan --dry-run                    Preview the blueprint without writing to memory
  neuron scan --diff                       Show what has changed since the last scan
  neuron scan --check --json               Gate CI on architectural drift

Defaults for --category, --depth, and auto-scan come from the scan: block in
neuron.yaml when present.

Note: symbols are extracted from a parsed Tree-Sitter syntax tree for TypeScript,
TSX, JavaScript, Python, Go, Rust, Java and C++. Other languages fall back to
line-oriented matching, and the blueprint card records which parser produced each
file. A card produced by a different parser than the current scan cannot be
diffed against it, and --check reports that as exit code 2 rather than as drift.
See docs/adr/0003, 0008 and 0009.`;

export const MEMORY_HELP = `Usage: neuron memory <subcommand> [arguments] [flags]

Subcommands:
  add "<content>"                Add a new memory entry
  query "<text>"                 Query memories using semantic search
  list                           List recent memory entries
  delete <id>                    Delete a memory entry by ID
  update <id> "<content>"        Update a memory entry in-place
  consolidate                    Summarize consolidated history logs
  prune                          Delete old history logs (DESTRUCTIVE, no undo)

Options:
  --category <name>              Specify the category (required for delete, update;
                                 on add it is inferred when omitted, from the
                                 categories already in the store)
  --categories <a,b,...>         Filter by multiple categories (query, list)
  --tags <tag1,tag2,...>         Specify tags (inferred from the store's
                                 vocabulary when omitted)
  --importance <1-5>             Set importance rating. NOT inferred when
                                 omitted — the entry takes the default of 3.
                                 See the prune ceiling below.
  --scope <scope>                [Deprecated, no effect] scope was removed in v2.2.0
  --task-id <id>                 Associate a task ID
  --scopes <scope1,scope2,...>   [Deprecated, no effect] scope was removed in v2.2.0
  --days <number>                Cutoff age in days for pruning (prune, default: 30)
  --importance <1-5>             Prune ceiling, INCLUSIVE (prune, default: 3).
                                 Entries written without --importance default
                                 to 3, so a bare prune deletes nearly all
                                 history older than --days. There is no undo.
  --limit <number>               Limit returned results
  --supersedes <id>              (add) Mark <id> as superseded by this new
                                 entry. Also required to resolve the write-time
                                 supersession gate: 'add' hard-blocks when the
                                 content looks like a near-duplicate of an
                                 existing entry, printing the candidate id.
  --not-a-reversal                (add) Explicit override confirming this write
                                 is not a reversal, skipping the gate without
                                 marking anything superseded.
  --include-superseded            (query, list) Include entries hard-excluded
                                 by default because a later entry supersedes
                                 them. Superseded rows are never deleted.
  --if-novel                      (add) Non-interactive resolution of the
                                 supersession gate for scheduled/cron writers
                                 that cannot answer --supersedes/
                                 --not-a-reversal by hand: on a gate hit, skip
                                 the write instead of hard-erroring (exit 0,
                                 no entry added, printed to stderr and noted
                                 in the JSON result so the skip is never
                                 silent). Mutually exclusive with
                                 --supersedes and --not-a-reversal.`;

/**
 * `MEMORY_HELP` plus a per-category listing of this project's declared
 * fields (ticket 43) — the self-documenting `--help` ADR 0013 asks for, so
 * an agent reading `--help` learns a project's schema without it having to
 * be restated in `CLAUDE.md`/`AGENTS.md`, where it would drift.
 */
export function getMemoryHelp(config: NeuronConfig): string {
  const declared = collectDeclaredFieldFlags(config);
  if (declared.length === 0) return MEMORY_HELP;

  const byCategory = new Map<string, DeclaredFieldFlag[]>();
  for (const f of declared) {
    const list = byCategory.get(f.category) ?? [];
    list.push(f);
    byCategory.set(f.category, list);
  }

  const lines = [`\nProject-declared fields (from neuron.yaml, add/update only):`];
  for (const [category, flags] of byCategory) {
    lines.push(`  ${category}:`);
    for (const f of flags) {
      const kind = f.def.type === 'enum' ? `enum: ${f.def.values.join('|')}` : 'string';
      const req = f.def.required && f.def.default === undefined ? ', required' : '';
      lines.push(`    ${f.flag} <value>${' '.repeat(Math.max(1, 24 - f.flag.length))}${kind}${req}`);
    }
  }

  return MEMORY_HELP + '\n' + lines.join('\n');
}

export const LEARN_HELP = `Usage: neuron learn <subcommand> [arguments] [flags]
[Deprecated: Use 'neuron memory <subcommand> --category learning' instead]

Subcommands:
  add "<content>"                Add a new learning
  query "<text>"                 Query learnings using semantic search
  list                           List recent learnings
  delete <id>                    Delete a learning by ID
  update <id> "<content>"        Update a learning in-place (regenerates embedding)

Options:
  --tags <tag1,tag2,...>         Specify tags for the learning (add, update)
  --importance <1-5>             Set importance rating (add, update)
  --scope <scope>                [Deprecated, no effect] scope was removed in v2.2.0
  --scopes <scope1,scope2,...>   [Deprecated, no effect] scope was removed in v2.2.0
  --limit <number>               Limit the number of returned results (query, list)`;

export const HISTORY_HELP = `Usage: neuron history <subcommand> [arguments] [flags]
[Deprecated: Use 'neuron memory <subcommand> --category history' instead]

Subcommands:
  add "<content>"                Log a new action to history
  query "<text>"                 Query history logs using semantic search
  list                           List recent history logs
  delete <id>                    Delete a history log by ID
  consolidate                    Summarize consolidated history since last cursor
  prune                          Delete old history logs (DESTRUCTIVE, no undo)

Options:
  --task-id <id>                 Associate a task ID with the log (add)
  --tags <tag1,tag2,...>         Specify tags for the log (add)
  --importance <1-5>             Set importance rating (add)
  --scope <scope>                [Deprecated, no effect] scope was removed in v2.2.0
  --scopes <scope1,scope2,...>   [Deprecated, no effect] scope was removed in v2.2.0
  --days <number>                Cutoff age in days for pruning (prune, default: 30)
  --importance <1-5>             Prune ceiling, INCLUSIVE (prune, default: 3).
                                 Entries written without --importance default
                                 to 3, so a bare prune deletes nearly all
                                 history older than --days. There is no undo.
  --limit <number>               Limit the number of returned results (query, list)`;
