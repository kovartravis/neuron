/**
 * Runs one agent session for ticket 10 (Counterfactual Token A/B): a manual
 * tool-use loop against Claude Sonnet 5, scoped to a single fixture worktree.
 *
 * Deliberately NOT the SDK tool runner: token accounting needs the raw
 * per-turn `usage` block from every response, and the stopping condition is
 * a custom `finish_task` tool call rather than "no more tool_use blocks."
 *
 * Cost lever: `output_config.effort: 'low'` — these are short, scoped
 * lookup-and-write tasks, not intelligence-sensitive reasoning, so low
 * effort is the documented starting point (see the claude-api skill's
 * model-migration guide). Raise to 'medium' if failure rates run high on a
 * pilot before spending the full N x k x arms budget.
 */

import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

export const MODEL = 'claude-sonnet-5';
const MAX_TURNS = 20;
const WALL_CLOCK_CAP_MS = 5 * 60 * 1000;
const COMMAND_TIMEOUT_MS = 30 * 1000;
const MAX_OUTPUT_CHARS = 20000;

// Defense in depth, not a sandbox: commands run as the real user via a real
// shell, scoped only by `cd`-ing into the fixture worktree first. This
// blocklist exists because there is no container here — see the harness
// README's Safety section before running this against an untrusted task set.
const DANGEROUS_PATTERNS = [
  /\bsudo\b/,
  /rm\s+-rf\s+\/(\s|$)/,
  /rm\s+-rf\s+~(\s|$)/,
  /rm\s+-rf\s+\$HOME/,
  /:\(\)\s*\{\s*:\|:&\s*\}\s*;:/, // fork bomb
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
  // Spell out the absolute path explicitly rather than saying "the
  // repository root" — a pilot run showed the model resolving that phrase
  // to `/` (the filesystem root, read-only) instead of the fixture's
  // working directory, wasting turns on `/bin/bash: /ANSWER.md: Read-only
  // file system` for both arms. Ambiguity here is pure noise on top of the
  // effect being measured, not a confound between arms — fix it for both.
  const base = `You are working inside a git repository checked out at ${fixtureDir}. That is also your shell's starting working directory, and it persists between bash calls unless you cd elsewhere.

Investigate and answer the question in the first user message. When you have your final answer, write it to the file ${fixtureDir}/ANSWER.md — use that exact absolute path — then call the finish_task tool with a one-sentence summary of your answer. Do not modify any file other than ANSWER.md. Do not run destructive, network, or publishing commands.`;
  return systemNote ? `${base}\n\n${systemNote}` : base;
}

const FINISH_TOOL = {
  name: 'finish_task',
  description:
    'Call this once you have written your final answer to ANSWER.md in the repository root. Ends the session.',
  input_schema: {
    type: 'object',
    properties: {
      summary: { type: 'string', description: 'One-sentence summary of your final answer.' },
    },
    required: ['summary'],
  },
};

const BASH_TOOL = { type: 'bash_20250124', name: 'bash' };

function runBash(command, cwdRef) {
  for (const pattern of DANGEROUS_PATTERNS) {
    if (pattern.test(command)) {
      return { output: `[harness] command rejected by safety policy (matched ${pattern}).`, isError: true };
    }
  }
  const marker = '__NEURON_AB_CWD__';
  const wrapped = `cd "${cwdRef.cwd}" && { ${command}\n} ; __status=$?; printf '\\n${marker}:%s:%d' "$(pwd)" "$__status"`;
  let raw;
  try {
    raw = execSync(wrapped, {
      shell: '/bin/bash',
      timeout: COMMAND_TIMEOUT_MS,
      maxBuffer: 5 * 1024 * 1024,
      encoding: 'utf8',
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

export async function runSession({ client, task, arm, fixture, sessionLabel, effort = 'low' }) {
  const cwdRef = { cwd: fixture.dir };
  const system = buildSystem(fixture.dir, fixture.systemNote);
  const messages = [{ role: 'user', content: task.prompt }];

  const totals = { input: 0, output: 0, cacheCreation: 0, cacheRead: 0 };
  const startedAt = Date.now();
  let finished = false;
  let finishSummary = null;
  let turns = 0;
  let cappedBy = null;

  while (!finished) {
    if (turns >= MAX_TURNS) {
      cappedBy = 'max_turns';
      break;
    }
    if (Date.now() - startedAt > WALL_CLOCK_CAP_MS) {
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
        content: 'Continue investigating with the bash tool, or call finish_task if you are done.',
      });
      continue;
    }

    const toolResults = [];
    for (const use of toolUses) {
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
        const { output, isError } = runBash(use.input?.command ?? '', cwdRef);
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
    }
  }

  const answerPath = path.join(fixture.dir, 'ANSWER.md');
  const answerText = fs.existsSync(answerPath) ? fs.readFileSync(answerPath, 'utf8') : '';
  const graded = task.check(answerText);
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
    answerText,
    passed: finished && graded.passed,
    gradeDetail: finished ? graded.detail : `did not call finish_task (capped: ${cappedBy})`,
  };
}
