/**
 * Session runner for ticket 7, Map — MCP Server & Setup/Onboarding Skill
 * Split. Duplicated from write-compliance-ab/session.mjs (itself duplicated
 * from token-ab/session.mjs) rather than imported — same precedent that
 * file's own header documents: this arm set needs mechanics neither parent
 * supports as a shared, unconditional loop (per-turn hook injection here,
 * finish_task interception there).
 *
 * Two things this file adds on top of the write-compliance-ab pattern:
 *   - `neuron-hook` arm: after every turn's tool results are pushed, a
 *     synthetic recall message is injected too — simulating ADR 0014's real
 *     per-turn pre-prompt hook, which fires before every turn regardless of
 *     what the agent does. Unlike the `nudge` arm elsewhere (one interrupt,
 *     at session end), this fires every turn from turn 1.
 *   - `neuron-mcp` arm: gets an extra `neuron_recall` tool. Its handler
 *     shells out to the fixture's real `neuron memory query`, the same
 *     store method the real MCP tool (`src/commands/mcp.ts`) wraps — one
 *     behavior, two entry points, not a mocked response.
 */

import { execFileSync, execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { HOOK_INJECTION_PREFIX, RULE_TEXT } from './fixtures.mjs';

const REPO_ROOT = fileURLToPath(new URL('../../', import.meta.url));
const CLI_PATH = path.join(REPO_ROOT, 'dist/cli.js');

export const MODEL = 'claude-sonnet-5';
const DEFAULT_MAX_TURNS = 30;
const DEFAULT_WALL_CLOCK_CAP_MS = 8 * 60 * 1000;
const COMMAND_TIMEOUT_MS = 30 * 1000;
const MAX_OUTPUT_CHARS = 20000;

// Same list as token-ab/session.mjs and write-compliance-ab/session.mjs —
// see either file's own comment for why this exists (defense in depth, not
// a sandbox).
const DANGEROUS_PATTERNS = [
  /\bsudo\b/,
  /rm\s+-rf\s+\/(\s|$)/,
  /rm\s+-rf\s+~(\s|$)/,
  /rm\s+-rf\s+\$HOME/,
  /:\(\)\s*\{\s*:\|:&\s*\}\s*;:/,
  /\bmkfs\b/,
  /\bdd\s+if=/,
  />\s*\/dev\/(sd|nvme|disk)/,
  /\bshutdown\b/,
  /\breboot\b/,
  /\bgit\s+push\b/,
  /\bnpm\s+publish\b/,
  /curl[^|]*\|\s*(sh|bash)/,
  /wget[^|]*\|\s*(sh|bash)/,
  /chmod\s+-R\s+777\s+\//,
];

function buildSystem(fixtureDir, systemNote) {
  const base = `You are working inside a directory at ${fixtureDir}. That is also your shell's starting working directory, and it persists between bash calls unless you cd elsewhere. A \`neuron\` command is available on your PATH.

Investigate and complete the task in the first user message. When you are done, call the finish_task tool with a one-sentence summary. Do not run destructive, network, or publishing commands.`;
  return systemNote ? `${base}\n\n${systemNote}` : base;
}

const FINISH_TOOL = {
  name: 'finish_task',
  description: 'Call this once you have completed the task described in the first user message. Ends the session.',
  input_schema: {
    type: 'object',
    properties: {
      summary: { type: 'string', description: 'One-sentence summary of what you did.' },
    },
    required: ['summary'],
  },
};

const BASH_TOOL = { type: 'bash_20250124', name: 'bash' };

// Mirrors the real `neuron_recall` MCP tool's schema exactly
// (`src/commands/mcp.ts`), minus `categories` (fixed to `conventions` here
// since that's the only category this benchmark's fixtures ever seed).
const RECALL_TOOL = {
  name: 'neuron_recall',
  description:
    "Search this project's neuron memory store for entries relevant to a query — e.g. recorded " +
    'project conventions or decisions. Returns matching entries, or an empty list if none.',
  input_schema: {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'Free-text query to search for.' },
    },
    required: ['query'],
  },
};

function runBash(command, cwdRef, binDir) {
  for (const pattern of DANGEROUS_PATTERNS) {
    if (pattern.test(command)) {
      return { output: `[harness] command rejected by safety policy (matched ${pattern}).`, isError: true };
    }
  }
  const marker = '__NEURON_RRAB_CWD__';
  const wrapped = `cd "${cwdRef.cwd}" && { ${command}\n} ; __status=$?; printf '\\n${marker}:%s:%d' "$(pwd)" "$__status"`;
  const env = { ...process.env, PATH: binDir ? `${binDir}:${process.env.PATH}` : process.env.PATH };
  let raw;
  try {
    raw = execSync(wrapped, {
      shell: '/bin/bash',
      timeout: COMMAND_TIMEOUT_MS,
      maxBuffer: 5 * 1024 * 1024,
      encoding: 'utf8',
      env,
    });
  } catch (err) {
    raw = (err.stdout ?? '') + (err.stderr ?? '');
    if (err.signal || err.killed) {
      return {
        output: `${raw}\n[harness] command timed out after ${COMMAND_TIMEOUT_MS}ms`,
        isError: true,
      };
    }
  }
  const idx = raw.lastIndexOf(marker);
  let output = raw;
  let status = 0;
  if (idx !== -1) {
    output = raw.slice(0, idx);
    const rest = raw.slice(idx + marker.length + 1);
    const [newCwd, statusStr] = rest.split(':');
    if (newCwd) cwdRef.cwd = newCwd.trim();
    status = Number(statusStr) || 0;
  }
  const truncated = output.length > MAX_OUTPUT_CHARS;
  return {
    output: truncated ? `${output.slice(0, MAX_OUTPUT_CHARS)}\n...[truncated]` : output,
    isError: status !== 0,
  };
}

/** Real `neuron memory query` call against the fixture's own store — same JSON shape the real MCP tool returns. */
function runRecall(query, fixtureDir) {
  try {
    const raw = execFileSync('node', [CLI_PATH, 'memory', 'query', query, '--categories', 'conventions'], {
      cwd: fixtureDir,
      encoding: 'utf8',
      timeout: COMMAND_TIMEOUT_MS,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    const parsed = JSON.parse(raw.trim().split('\n').pop());
    return JSON.stringify({ results: parsed.results, rejected: parsed.rejected });
  } catch (err) {
    return `[harness] neuron_recall failed: ${err.message}`;
  }
}

export async function runSession({
  client,
  task,
  arm,
  fixture,
  sessionLabel,
  effort = 'low',
  maxTurns = DEFAULT_MAX_TURNS,
  wallClockCapMs = DEFAULT_WALL_CLOCK_CAP_MS,
  // What gets re-injected every turn for the `neuron-hook` arm. Defaults to
  // the easy-mode RULE_TEXT; run-hard.mjs passes HARD_RULE_TEXT — this is a
  // parameter (not a fixed import) so hard mode can reuse this file as-is.
  hookInjectionText = RULE_TEXT,
}) {
  const cwdRef = { cwd: fixture.dir };
  const system = buildSystem(fixture.dir, fixture.systemNote);
  const messages = [{ role: 'user', content: task.prompt }];
  const tools = arm === 'neuron-mcp' ? [BASH_TOOL, FINISH_TOOL, RECALL_TOOL] : [BASH_TOOL, FINISH_TOOL];

  const totals = { input: 0, output: 0, cacheCreation: 0, cacheRead: 0 };
  const bashCommands = [];
  const toolCallNames = [];
  const startedAt = Date.now();
  let finished = false;
  let finishSummary = null;
  let turns = 0;
  let cappedBy = null;

  while (!finished) {
    if (turns >= maxTurns) {
      cappedBy = 'max_turns';
      break;
    }
    if (Date.now() - startedAt > wallClockCapMs) {
      cappedBy = 'wall_clock';
      break;
    }
    turns += 1;

    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 4096,
      output_config: { effort },
      system,
      tools,
      messages,
    });

    totals.input += response.usage.input_tokens ?? 0;
    totals.output += response.usage.output_tokens ?? 0;
    totals.cacheCreation += response.usage.cache_creation_input_tokens ?? 0;
    totals.cacheRead += response.usage.cache_read_input_tokens ?? 0;

    messages.push({ role: 'assistant', content: response.content });

    const toolUses = response.content.filter(b => b.type === 'tool_use');
    if (toolUses.length === 0) {
      messages.push({
        role: 'user',
        content: 'Continue working with the bash tool, or call finish_task if you are done.',
      });
      if (arm === 'neuron-hook') {
        messages.push({ role: 'user', content: `${HOOK_INJECTION_PREFIX}\n${hookInjectionText}` });
      }
      continue;
    }

    const toolResults = [];
    for (const use of toolUses) {
      toolCallNames.push(use.name);
      if (use.name === 'finish_task') {
        finished = true;
        finishSummary = use.input?.summary ?? '';
        toolResults.push({ type: 'tool_result', tool_use_id: use.id, content: 'Session ended.' });
        continue;
      }
      if (use.name === 'bash') {
        if (use.input?.restart) {
          toolResults.push({ type: 'tool_result', tool_use_id: use.id, content: 'Shell restarted.' });
          continue;
        }
        const command = use.input?.command ?? '';
        bashCommands.push(command);
        const { output, isError } = runBash(command, cwdRef, fixture.binDir);
        toolResults.push({
          type: 'tool_result',
          tool_use_id: use.id,
          content: output || '(no output)',
          is_error: isError,
        });
        continue;
      }
      if (use.name === 'neuron_recall') {
        const query = use.input?.query ?? '';
        const output = runRecall(query, fixture.dir);
        toolResults.push({ type: 'tool_result', tool_use_id: use.id, content: output });
        continue;
      }
      toolResults.push({
        type: 'tool_result',
        tool_use_id: use.id,
        content: `Unknown tool: ${use.name}`,
        is_error: true,
      });
    }

    if (!finished) {
      messages.push({ role: 'user', content: toolResults });
      if (arm === 'neuron-hook') {
        messages.push({ role: 'user', content: `${HOOK_INJECTION_PREFIX}\n${hookInjectionText}` });
      }
    }
  }

  const totalTokens = totals.input + totals.output + totals.cacheCreation + totals.cacheRead;

  return {
    task: task.id,
    arm,
    sessionLabel,
    turns,
    wallMs: Date.now() - startedAt,
    cappedBy,
    finishedCleanly: finished,
    finishSummary,
    tokens: totals,
    totalTokens,
    bashCommands,
    toolCallNames,
  };
}
