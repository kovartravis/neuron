#!/usr/bin/env node

import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import envPaths from 'env-paths';
import { NeuronMemory } from './index.js';

const HARNESSES: Array<{ base: string; skills: string }> = [
  { base: '.agents',  skills: '.agents/skills' },
  { base: '.claude',  skills: '.claude/skills' },
  { base: '.cursor',  skills: '.cursor/skills' },
  { base: '.github',  skills: '.github/skills' },
  { base: '.codex',   skills: '.codex/skills'  },
];

function detectHarnesses(projectDir: string): string[] {
  return HARNESSES
    .filter(h => fs.existsSync(path.join(projectDir, h.base)))
    .map(h => h.skills);
}

function copySkill(projectDir: string, skillsRelDir: string): string {
  const skillSrc = path.join(
    path.dirname(fileURLToPath(import.meta.url)),
    '../.agents/skills/neuron-memory/SKILL.md'
  );
  const destDir = path.join(projectDir, skillsRelDir, 'neuron-memory');
  fs.mkdirSync(destDir, { recursive: true });
  const destPath = path.join(destDir, 'SKILL.md');
  fs.copyFileSync(skillSrc, destPath);
  return destPath;
}

function findProjectRoot(startDir: string): { root: string; name: string } {
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

function parseFlags(args: string[]): {
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

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--tags') {
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
      days
    }
  };
}

const MEMORY_STORE_BLOCK = `## Memory Store

This repository uses \`@kovartravis/neuron\` (globally linked as the \`neuron\` command) to persist learnings and task history.

Agents MUST invoke and strictly follow the \`neuron-memory\` skill at the beginning of every run (for context loading), at the end of every run (for memory recording), and during periodic maintenance (for clean & refresh).
`;

function updateMarkdownFile(filePath: string, heading: string, blockContent: string): void {
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

const MASTER_HELP = `Usage: neuron <command> [subcommand] [arguments] [flags]

Commands:
  init                 Bootstrap the project for agentic memory store (creates/updates AGENTS.md or CLAUDE.md)
  status               Display status details for active database, project, and embedding cache
  learn <subcommand>   Manage learnings (rules, conventions, guidelines)
  history <subcommand> Manage action history logs

Options:
  -h, --help           Show this help information

Run 'neuron learn --help' or 'neuron history --help' for details on specific subcommands.`;

const LEARN_HELP = `Usage: neuron learn <subcommand> [arguments] [flags]

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

const HISTORY_HELP = `Usage: neuron history <subcommand> [arguments] [flags]

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

async function main() {
  const args = process.argv.slice(2);
  const mainCommand = args[0];

  if (!mainCommand || mainCommand === '--help' || mainCommand === '-h') {
    console.log(MASTER_HELP);
    process.exit(0);
  }

  if (mainCommand === 'init') {
    const { options } = parseFlags(args.slice(1));
    const projectDir = process.cwd();

    let targetFile = options.file;
    if (!targetFile) {
      if (fs.existsSync(path.join(projectDir, 'CLAUDE.md'))) {
        targetFile = 'CLAUDE.md';
      } else if (fs.existsSync(path.join(projectDir, 'AGENTS.md'))) {
        targetFile = 'AGENTS.md';
      } else {
        targetFile = 'AGENTS.md';
      }
    }

    const filePath = path.join(projectDir, targetFile);
    updateMarkdownFile(filePath, 'Memory Store', MEMORY_STORE_BLOCK);

    // Detect harnesses and copy the bundled neuron-memory skill
    let detectedSkillsDirs = detectHarnesses(projectDir);
    if (detectedSkillsDirs.length === 0) {
      detectedSkillsDirs = ['.agents/skills'];
    }
    const skillsWritten = detectedSkillsDirs.map(dir => copySkill(projectDir, dir));

    console.log(JSON.stringify({
      status: 'initialized',
      file: targetFile,
      projectRoot: projectDir,
      skillsWritten
    }));
    return;
  }

  // Resolve project details
  const { root: projectRoot, name: projectName } = findProjectRoot(process.cwd());

  // Determine database path
  let dbPath = process.env.NEURON_DB_PATH;
  if (!dbPath) {
    const appPaths = envPaths('neuron', { suffix: '' });
    const dbDir = path.join(appPaths.data, 'db');
    fs.mkdirSync(dbDir, { recursive: true });
    const projectHash = crypto
      .createHash('sha256')
      .update(projectRoot)
      .digest('hex')
      .slice(0, 16);
    dbPath = path.join(dbDir, `${projectHash}.sqlite`);
  }

  const embedder = process.env.NEURON_MOCK_EMBEDDER === 'true'
    ? { embed: async () => new Float32Array(384) }
    : undefined;

  const memory = new NeuronMemory({
    dbPath,
    projectRoot,
    projectName,
    embedder
  });

  try {
    if (mainCommand === 'status') {
      const status = memory.getStatus();
      console.log(JSON.stringify(status));
      return;
    }

    if (mainCommand === 'learn') {
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
        const res = await memory.addLearning(content, options.tags, {
          importance: options.importance,
          scope: options.scope
        });
        console.log(JSON.stringify(res));
      } else if (subCommand === 'query') {
        const queryText = positionals[0];
        if (!queryText) {
          console.error('Error: query text is required for learn query');
          process.exit(1);
        }
        const res = await memory.queryLearnings(queryText, {
          limit: options.limit,
          scopes: options.scopes
        });
        console.log(JSON.stringify(res));
      } else if (subCommand === 'list') {
        const list = memory.listLearnings({ limit: options.limit });
        console.log(JSON.stringify(list));
      } else if (subCommand === 'delete') {
        const id = positionals[0];
        if (!id) {
          console.error('Error: ID is required for learn delete');
          process.exit(1);
        }
        const res = memory.deleteLearning(id);
        console.log(JSON.stringify(res));
      } else if (subCommand === 'update') {
        const id = positionals[0];
        const content = positionals[1];
        if (!id || !content) {
          console.error('Error: ID and content are required for learn update');
          process.exit(1);
        }
        const res = await memory.updateLearning(id, content, {
          tags: options.tags,
          importance: options.importance,
          scope: options.scope
        });
        console.log(JSON.stringify(res));
      } else {
        console.error(`Unknown learn subcommand: ${subCommand}`);
        process.exit(1);
      }
      return;
    }

    if (mainCommand === 'history') {
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
        const res = await memory.addHistory(content, {
          tags: options.tags,
          taskId: options.taskId,
          importance: options.importance,
          scope: options.scope
        });
        console.log(JSON.stringify(res));
      } else if (subCommand === 'query') {
        const queryText = positionals[0];
        if (!queryText) {
          console.error('Error: query text is required for history query');
          process.exit(1);
        }
        const res = await memory.queryHistory(queryText, {
          limit: options.limit,
          scopes: options.scopes
        });
        console.log(JSON.stringify(res));
      } else if (subCommand === 'list') {
        const list = memory.listHistory({ limit: options.limit });
        console.log(JSON.stringify(list));
      } else if (subCommand === 'delete') {
        const id = positionals[0];
        if (!id) {
          console.error('Error: ID is required for history delete');
          process.exit(1);
        }
        const res = memory.deleteHistory(id);
        console.log(JSON.stringify(res));
      } else if (subCommand === 'consolidate') {
        const res = memory.consolidateHistory();
        console.log(JSON.stringify(res));
      } else if (subCommand === 'prune') {
        const res = memory.pruneHistory({
          days: options.days,
          maxImportance: options.importance
        });
        console.log(JSON.stringify({
          status: 'pruned',
          deletedCount: res.deletedCount,
          project: projectName
        }));
      } else {
        console.error(`Unknown history subcommand: ${subCommand}`);
        process.exit(1);
      }
      return;
    }

    console.error(`Unknown main command: ${mainCommand}`);
    process.exit(1);
  } catch (err: any) {
    console.error(err.message);
    process.exit(1);
  } finally {
    memory.close();
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
