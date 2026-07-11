#!/usr/bin/env node

import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import envPaths from 'env-paths';
import { NeuronMemory } from './index.js';

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
  options: { tags?: string[]; taskId?: string; limit?: number; file?: string };
} {
  const positionals: string[] = [];
  const tags: string[] = [];
  let taskId: string | undefined;
  let limit: number | undefined;
  let file: string | undefined;

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
    } else {
      positionals.push(arg);
    }
  }

  return {
    positionals,
    options: { tags: tags.length > 0 ? tags : undefined, taskId, limit, file }
  };
}

const MEMORY_STORE_BLOCK = `## Memory Store

This repository uses \`@kovartravis/neuron\` (globally linked as the \`neuron\` command) to persist learnings and task history. Agents MUST interact with it at the start and end of every run.

### 1. Beginning of Run (Context Loading)
Before performing any task, the agent must query the memory store for relevant learnings, rules, or previous solutions:
\`\`\`bash
neuron learn query "<query matching current task>"
\`\`\`
Read the retrieved learnings and apply them as system rules/guidelines for the session.

### 2. End of Run (Memory Recording)
After completing a task, the agent must log the action to the history log:
\`\`\`bash
neuron history add "<summary of what was built/fixed>" --tags <related-topics> [--task-id <id>]
\`\`\`
If new learnings, rules, or conventions were established during the session, add them explicitly to the learnings store:
\`\`\`bash
neuron learn add "<new rule/learning established>" --tags <topic>
\`\`\`
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

async function main() {
  const args = process.argv.slice(2);
  const mainCommand = args[0];

  if (!mainCommand) {
    console.error('Usage: neuron <command> [subcommand] [arguments]');
    process.exit(1);
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

    console.log(JSON.stringify({
      status: 'initialized',
      file: targetFile,
      projectRoot: projectDir
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
      const rest = args.slice(2);
      const { positionals, options } = parseFlags(rest);

      if (subCommand === 'add') {
        const content = positionals[0];
        if (!content) {
          console.error('Error: content is required for learn add');
          process.exit(1);
        }
        const res = await memory.addLearning(content, options.tags);
        console.log(JSON.stringify(res));
      } else if (subCommand === 'query') {
        const queryText = positionals[0];
        if (!queryText) {
          console.error('Error: query text is required for learn query');
          process.exit(1);
        }
        const res = await memory.queryLearnings(queryText, { limit: options.limit });
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
      } else {
        console.error(`Unknown learn subcommand: ${subCommand}`);
        process.exit(1);
      }
      return;
    }

    if (mainCommand === 'history') {
      const subCommand = args[1];
      const rest = args.slice(2);
      const { positionals, options } = parseFlags(rest);

      if (subCommand === 'add') {
        const content = positionals[0];
        if (!content) {
          console.error('Error: content is required for history add');
          process.exit(1);
        }
        const res = await memory.addHistory(content, { tags: options.tags, taskId: options.taskId });
        console.log(JSON.stringify(res));
      } else if (subCommand === 'query') {
        const queryText = positionals[0];
        if (!queryText) {
          console.error('Error: query text is required for history query');
          process.exit(1);
        }
        const res = await memory.queryHistory(queryText, { limit: options.limit });
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
