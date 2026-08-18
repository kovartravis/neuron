/**
 * Deterministic grading for ticket 7: did the session's *newly added*
 * function get the one-line `//` comment fixtures.mjs's RULE_TEXT asks
 * for? Checked against final file state, not the transcript — unlike
 * write-compliance-ab's grading (a specific CLI invocation to grep for),
 * this rule has no single canonical command signature, so the final code
 * is the deterministic, unambiguous signal. Only the *new* function is
 * checked — the rule only binds new code, so a pre-existing uncommented
 * function (e.g. `average` in stats.mjs) is not a compliance failure.
 */

import fs from 'node:fs';
import path from 'node:path';

// Which file/function each reused tasksHard.mjs task's step 2 adds.
const NEW_FUNCTION_BY_TASK = {
  'stats-multi-step': { file: 'stats.mjs', fn: 'sum' },
  'text-multi-step': { file: 'text.mjs', fn: 'wordCount' },
};

function nearestNonBlankLineAbove(lines, defIdx) {
  let i = defIdx - 1;
  while (i >= 0 && lines[i].trim() === '') i--;
  return i >= 0 ? lines[i].trim() : null;
}

function findNewFunctionDefLine(fixtureDir, taskId) {
  const spec = NEW_FUNCTION_BY_TASK[taskId];
  if (!spec) throw new Error(`no comment-check mapping for task ${taskId} — add one to NEW_FUNCTION_BY_TASK`);
  const filePath = path.join(fixtureDir, spec.file);
  if (!fs.existsSync(filePath)) return { lines: null, defIdx: -1 };

  const lines = fs.readFileSync(filePath, 'utf8').split('\n');
  const fnPattern = new RegExp(`function\\s+${spec.fn}\\s*\\(`);
  const defIdx = lines.findIndex(l => fnPattern.test(l));
  return { lines, defIdx };
}

/** Easy mode: true when `fn`'s definition has a `//` comment on the nearest non-blank line above it — any wording. */
export function newFunctionHasComment(fixtureDir, taskId) {
  const { lines, defIdx } = findNewFunctionDefLine(fixtureDir, taskId);
  if (defIdx === -1) return false; // function was never added
  const above = nearestNonBlankLineAbove(lines, defIdx);
  return above !== null && above.startsWith('//');
}

/** Hard mode: true only when the comment uses the exact `// @behavior:` tag HARD_RULE_TEXT requires — a generic `//` comment doesn't satisfy it. */
export function newFunctionHasBehaviorTag(fixtureDir, taskId) {
  const { lines, defIdx } = findNewFunctionDefLine(fixtureDir, taskId);
  if (defIdx === -1) return false;
  const above = nearestNonBlankLineAbove(lines, defIdx);
  return above !== null && /^\/\/\s*@behavior:/.test(above);
}

/**
 * Action mode: true when `.session-log` exists and has at least one
 * non-blank line — checked against final file state rather than a
 * transcript command regex, same tradeoff `newFunctionHasComment` already
 * makes: `echo >>`, `printf >>`, and `cat >>` are all valid ways to
 * satisfy ACTION_RULE_TEXT, so the resulting file is the unambiguous
 * signal, not any one shell incantation.
 */
export function sessionWasLogged(fixtureDir) {
  const filePath = path.join(fixtureDir, '.session-log');
  if (!fs.existsSync(filePath)) return false;
  return fs.readFileSync(filePath, 'utf8').split('\n').some(l => l.trim() !== '');
}

/** True when the transcript shows a real, top-level `neuron_recall` tool call (neuron-mcp arm telemetry, not the outcome measure). */
export function sessionCalledRecall(toolCallNames) {
  return toolCallNames.includes('neuron_recall');
}
