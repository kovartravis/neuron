import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

export {
  HARNESSES,
  detectHarnesses,
  copySkill,
  AgentHarness
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



export function parseFlags(args: string[]): {
  positionals: string[];
  options: {
    tags?: string[];
    taskId?: string;
    limit?: number;
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
  };
} {
  const positionals: string[] = [];
  const tags: string[] = [];
  let taskId: string | undefined;
  let limit: number | undefined;
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

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--format') {
      format = args[++i];
    } else if (arg === '--json') {
      json = true;
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
    } else if (arg === '--type') {
      type = args[++i];
    } else if (arg === '--title') {
      title = args[++i];
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
      tags: tags.length > 0 ? tags : undefined,
      taskId,
      limit,
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
      json
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
  init                 Bootstrap the project for agentic memory store (copies skills to detected harnesses)
  exec -- <command>    Run a command with pre-command memory lookup
  status               Display status details for active database, project, and embedding cache
  memory <subcommand>  Manage memories across any category
  learn <subcommand>   Manage learnings (alias for memory --category learning)
  history <subcommand> Manage action history (alias for memory --category history)
  feedback [message]   Generate GitHub issue URL with pre-filled feedback parameters
  scan                 Scan project topology, manifests, and exported symbols


Options:
  -h, --help           Show this help information

Run 'neuron memory --help', 'neuron learn --help', or 'neuron history --help' for details.`;
export const MEMORY_HELP = `Usage: neuron memory <subcommand> [arguments] [flags]

Subcommands:
  add "<content>"                Add a new memory entry
  query "<text>"                 Query memories using semantic search
  list                           List recent memory entries
  delete <id>                    Delete a memory entry by ID
  update <id> "<content>"        Update a memory entry in-place

Options:
  --category <name>              Specify the category (required for add, delete, update)
  --categories <a,b,...>         Filter by multiple categories (query, list)
  --tags <tag1,tag2,...>         Specify tags
  --importance <1-5>             Set importance rating
  --scope <scope>                Set scope
  --task-id <id>                 Associate a task ID
  --scopes <scope1,scope2,...>   Filter by active scopes (query)
  --limit <number>               Limit returned results`;

export const LEARN_HELP = `Usage: neuron learn <subcommand> [arguments] [flags]

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

Subcommands:
  add "<content>"                Log a new action to history
  query "<text>"                 Query history logs using semantic search
  list                           List recent history logs
  delete <id>                    Delete a history log by ID
  consolidate                    Summarize consolidated history since last cursor
  prune                          Clean up old, minor history logs

Options:
  --task-id <id>                 Associate a task ID with the log (add)
  --tags <tag1,tag2,...>         Specify tags for the log (add)
  --importance <1-5>             Set importance rating (add)
  --scope <scope>                Set scope for the log (add)
  --scopes <scope1,scope2,...>   Filter query results by active scopes (query)
  --days <number>                Cutoff age in days for pruning (prune, default: 30)
  --limit <number>               Limit the number of returned results (query, list)`;
