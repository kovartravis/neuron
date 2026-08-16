/**
 * Session runner for ticket 4 (neuron-2.4.3): a manual tool-use loop against
 * Claude Sonnet 5, adapted from benchmarks/token-ab/session.mjs (same bash
 * tool, same safety blocklist, same finish_task convention — duplicated
 * rather than imported because that module hardcodes finish_task as an
 * immediate, unconditional session end, which the `nudge` arm here can't
 * use: it needs to intercept the *first* finish_task call, inject a
 * reminder, and only actually end on a second one). Token accounting is
 * kept (cheap, and useful for the findings doc's cost line) but is not
 * this ticket's outcome measure — see grading.mjs for that.
 */

import { execSync } from 'node:child_process';

export const MODEL = 'claude-sonnet-5';
const DEFAULT_MAX_TURNS = 15;
const DEFAULT_WALL_CLOCK_CAP_MS = 4 * 60 * 1000;
const COMMAND_TIMEOUT_MS = 30 * 1000;
const MAX_OUTPUT_CHARS = 20000;

// Same list as token-ab/session.mjs — see that file's own comment for why
// this exists (defense in depth, not a sandbox).
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

function runBash(command, cwdRef, binDir) {
  for (const pattern of DANGEROUS_PATTERNS) {
    if (pattern.test(command)) {
      return { output: `[harness] command rejected by safety policy (matched ${pattern}).`, isError: true };
    }
  }
  const marker = '__NEURON_WCAB_CWD__';
  const wrapped = `cd "${cwdRef.cwd}" && { ${command}\n} ; __status=$?; printf '\\n${marker}:%s:%d' "$(pwd)" "$__status"`;
  const env = { ...process.env, PATH: `${binDir}:${process.env.PATH}` };
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

/**
 * @param nudgeOnFirstFinish - when true (the `nudge` arm), the first
 * finish_task call is intercepted: instead of ending, a reminder is pushed
 * as a user turn and the loop continues. Only a second finish_task call
 * actually ends the session. Every other arm ends on the first call.
 */
export async function runSession({
  client,
  task,
  arm,
  fixture,
  sessionLabel,
  effort = 'low',
  nudgeOnFirstFinish = false,
  nudgeText = '',
  maxTurns = DEFAULT_MAX_TURNS,
  wallClockCapMs = DEFAULT_WALL_CLOCK_CAP_MS,
}) {
  const cwdRef = { cwd: fixture.dir };
  const system = buildSystem(fixture.dir, fixture.systemNote);
  const messages = [{ role: 'user', content: task.prompt }];

  const totals = { input: 0, output: 0, cacheCreation: 0, cacheRead: 0 };
  const bashCommands = [];
  const startedAt = Date.now();
  let finished = false;
  let finishSummary = null;
  let turns = 0;
  let cappedBy = null;
  let nudgeDelivered = false;

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
      tools: [BASH_TOOL, FINISH_TOOL],
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
      continue;
    }

    const toolResults = [];
    let deliverNudgeAfterThisTurn = false;
    for (const use of toolUses) {
      if (use.name === 'finish_task') {
        if (nudgeOnFirstFinish && !nudgeDelivered) {
          deliverNudgeAfterThisTurn = true;
          toolResults.push({ type: 'tool_result', tool_use_id: use.id, content: 'Not yet — one more thing first.' });
          continue;
        }
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
      toolResults.push({
        type: 'tool_result',
        tool_use_id: use.id,
        content: `Unknown tool: ${use.name}`,
        is_error: true,
      });
    }

    if (!finished) {
      messages.push({ role: 'user', content: toolResults });
      if (deliverNudgeAfterThisTurn) {
        messages.push({ role: 'user', content: nudgeText });
        nudgeDelivered = true;
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
    nudgeDelivered,
  };
}
