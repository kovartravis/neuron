import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

export {
  HARNESSES,
  detectHarnesses,
  copySkill,
  type AgentHarness
} from '../config/index.js';

export function findProjectRoot(startDir: string): { root: string; name: string } {
  let dir = path.resolve(startDir);
  while (true) {
    if (fs.existsSync(path.join(dir, 'package.json')) || fs.existsSync(path.join(dir, '.git'))) {
      return { root: dir, name: path.basename(dir) };
    }
    const parent = path.dirname(dir);
    if (parent === dir) {
      return { root: startDir, name: path.basename(startDir) };
    }
    dir = parent;
  }
}

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
 * Every option `parseFlags` understands. Used to reject unrecognised flags and
 * to suggest a correction — a typo'd flag used to be pushed into `positionals`
 * and silently discarded, so `--importanc 5` looked like it worked and wrote
 * the default instead.
 */
const KNOWN_FLAGS = [
  '--format', '--json', '--no-progress', '--diff', '--check', '--tags',
  '--task-id', '--limit', '--file', '-f', '--importance', '--scope',
  '--scopes', '--days', '--category', '--categories', '--depth', '--dry-run',
  '--force', '--type', '--title', '--help', '-h',
];

/** Cheap edit distance, only ever called on the error path. */
function editDistance(a: string, b: string): number {
  const d: number[][] = Array.from({ length: a.length + 1 }, (_, i) =>
    Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      d[i][j] = Math.min(
        d[i - 1][j] + 1,
        d[i][j - 1] + 1,
        d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
    }
  }
  return d[a.length][b.length];
}

function unknownFlag(arg: string): never {
  const near = KNOWN_FLAGS
    .map(f => [f, editDistance(arg, f)] as const)
    .filter(([, dist]) => dist <= 2)
    .sort((x, y) => x[1] - y[1])[0];
  console.error(`Error: unknown option '${arg}'`);
  if (near) {
    console.error(`  Did you mean '${near[0]}'?`);
  }
  console.error(`  Pass '--' before a value that legitimately begins with a dash.`);
  process.exit(1);
}

export function parseFlags(args: string[]): {
  positionals: string[];
  options: {
    help?: boolean;
    tags?: string[];
    taskId?: string;
    limit?: number;
    depth?: number;
    file?: string;
    importance?: number;
    scope?: string;
    scopes?: string[];
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
  let scope: string | undefined;
  let scopes: string[] | undefined;
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

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--') {
      // End of flags. Everything after is positional verbatim, which is the
      // escape hatch for content that legitimately begins with a dash.
      positionals.push(...args.slice(i + 1));
      break;
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
      scope = args[++i];
    } else if (arg === '--scopes') {
      const val = args[++i];
      if (val) {
        scopes = val.split(',').map(s => s.trim()).filter(Boolean);
      }
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
    } else if (arg.startsWith('-') && arg.length > 1) {
      // Previously fell through to `positionals`, where it was silently
      // discarded by every caller. A mistyped flag must not look like success.
      unknownFlag(arg);
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
      scope,
      scopes,
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
      check
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
  enrich                         Drain the write-side enrichment backlog now
  prune                          Delete old history logs (DESTRUCTIVE, no undo)

Options:
  --category <name>              Specify the category (required for delete, update;
                                 on add it is inferred when omitted, at the cost
                                 of a ~3.5s model load)
  --categories <a,b,...>         Filter by multiple categories (query, list)
  --tags <tag1,tag2,...>         Specify tags (inferred from the store's
                                 vocabulary when omitted)
  --importance <1-5>             Set importance rating (inferred when omitted)
  --scope <scope>                Set scope
  --task-id <id>                 Associate a task ID
  --scopes <scope1,scope2,...>   Filter by active scopes (query)
  --days <number>                Cutoff age in days for pruning (prune, default: 30)
  --importance <1-5>             Prune ceiling, INCLUSIVE (prune, default: 3).
                                 Entries written without --importance default
                                 to 3, so a bare prune deletes nearly all
                                 history older than --days. There is no undo.
  --limit <number>               Limit returned results`;

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
  --scope <scope>                Set scope for the learning (add, update)
  --scopes <scope1,scope2,...>   Filter query results by active scopes (query)
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
  --scope <scope>                Set scope for the log (add)
  --scopes <scope1,scope2,...>   Filter query results by active scopes (query)
  --days <number>                Cutoff age in days for pruning (prune, default: 30)
  --importance <1-5>             Prune ceiling, INCLUSIVE (prune, default: 3).
                                 Entries written without --importance default
                                 to 3, so a bare prune deletes nearly all
                                 history older than --days. There is no undo.
  --limit <number>               Limit the number of returned results (query, list)`;
