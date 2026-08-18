/**
 * Fixture builder for ticket 7, Map — MCP Server & Setup/Onboarding Skill
 * Split: read-side rule *adherence*, not write compliance (that's
 * `write-compliance-ab`) or hint-following (that's `hint-follow`). The
 * question is whether an agent follows an arbitrary project convention more
 * reliably when neuron delivers it than when it sits as static CLAUDE.md
 * prose alone — so, unlike `write-compliance-ab`, the rule under test is
 * NOT about calling a `neuron` command; it is an ordinary coding convention
 * ("comment every new function"), orthogonal to the task's own pass/fail
 * check, so nothing about solving the task forces compliance.
 *
 * Reuses `write-compliance-ab/tasksHard.mjs`'s two multi-step tasks
 * unmodified rather than inventing new fixtures — they already give
 * "genuine competing work" (a real fix, a new function, a lint pass, a
 * changelog line) across several turns, which is exactly the shape this
 * ticket's own Design section asks for.
 *
 * Three arms, three different starting states (mirrors the real product
 * difference, not just prompt wording):
 *   - `control`      — no neuron.yaml, no `neuron` on PATH. The rule is
 *     static system-prompt prose, stated once. Models "neuron absent."
 *   - `neuron-hook`   — neuron.yaml + a seeded `conventions` entry, but the
 *     agent never has to call anything: the harness re-injects the rule
 *     into context on every turn (session.mjs), simulating ADR 0014's real
 *     per-turn pre-prompt hook, which fires regardless of what the agent
 *     chooses to do.
 *   - `neuron-mcp`    — same seeded store, but the rule is NOT in the
 *     system prompt. The agent gets an extra `neuron_recall` tool
 *     (session.mjs) whose handler shells out to the real CLI's
 *     `memory query`, the same store method the real MCP tool
 *     (`src/commands/mcp.ts`) wraps — agent-invoked, so compliance depends
 *     on the agent choosing to look.
 */

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = fileURLToPath(new URL('../../', import.meta.url));
const CLI_PATH = path.join(REPO_ROOT, 'dist/cli.js');

// The rule under test — an ordinary project convention, deliberately
// unrelated to neuron's own protocol (unlike write-compliance-ab, which
// tests a neuron-specific habit). Verbatim text is shared across all three
// arms; only the delivery mechanism differs.
export const RULE_TEXT =
  'Project convention: every new function you add to this codebase must have a one-line `//` comment ' +
  'directly above its definition, briefly describing what it does.';

// Prefixed the same way session.mjs frames every hook-arm injection, so a
// transcript reader (or the model itself) can tell this apart from
// ordinary user content — mirrors the real RECALL_PROVENANCE_PREFIX
// convention `src/commands/hook.ts` applies at its own emit() choke point.
export const HOOK_INJECTION_PREFIX = '[neuron recall — auto-injected every turn, not agent-requested]';

const NEURON_YAML = `version: "1.0"
storage:
  mode: md
  path: .neuron
categories:
  conventions:
    description: Project coding conventions
pullRules:
  default:
    categories:
      - conventions
    limit: 5
`;

export function systemNoteForArm(arm) {
  if (arm === 'control') return RULE_TEXT;
  if (arm === 'neuron-hook') {
    // Told once at session start, same as control — the distinguishing
    // mechanic is that this arm ALSO gets it re-injected every turn
    // (session.mjs), not that the initial framing differs.
    return RULE_TEXT;
  }
  if (arm === 'neuron-mcp') {
    // No rule text here at all — only a pointer that recall exists.
    // Compliance now depends entirely on the agent choosing to call the
    // tool before it matters (i.e. before adding a new function).
    return (
      'This project has a neuron memory store recording project conventions. ' +
      'Use the `neuron_recall` tool if you want to check for relevant conventions before writing new code.'
    );
  }
  throw new Error(`unknown arm: ${arm}`);
}

// --- Hard mode --------------------------------------------------------
//
// The pilot (`RULE_TEXT`/`systemNoteForArm`, above) hit a ceiling effect:
// `control` complied 100% on its very first live session. "Add any comment
// above a new function" is apparently a default Sonnet 5 habit, not
// something that needs remembering — so no delivery mechanism could show a
// margin over it. Two changes, mirroring exactly what broke
// write-compliance-ab's own identical ceiling effect (ticket 5 there):
//
//   1. The rule now requires an exact, arbitrary format
//      (`// @behavior: ...`, not any comment) that habit alone won't
//      produce — compliance now requires actually remembering the rule's
//      specific content, not just a generic good practice.
//   2. The rule is buried as one bullet among several unrelated style
//      bullets (HARD_STYLE_NOTE) instead of being the sole content of the
//      system note — diluting salience the same way write-compliance-ab's
//      hard mode swapped a trimmed one-section excerpt for the full,
//      multi-section real CLAUDE.md block.
export const HARD_RULE_TEXT =
  'Every new function you add must have a comment directly above its definition in the exact form ' +
  '`// @behavior: <one-sentence description>` — that literal `@behavior:` tag, not free-form prose or JSDoc.';

export const HARD_STYLE_NOTE = `## Project Style Guide

This project follows a few conventions:
- Use \`const\`/\`let\`, never \`var\`.
- Prefer early returns over deeply nested conditionals instead of extra \`else\` branches.
- Function and variable names use camelCase, not snake_case.
- Keep new logic under 100 characters per line where reasonable.
- ${HARD_RULE_TEXT}
- Error messages in thrown/logged errors should be specific enough to grep for, not generic text like "error occurred".`;

export function systemNoteForArmHard(arm) {
  // control and neuron-hook both see the full style guide at session
  // start — a real repo's CLAUDE.md is static prose every harness reads
  // regardless of any hook. The ONLY difference is that neuron-hook also
  // gets HARD_RULE_TEXT specifically re-injected every turn (session.mjs)
  // — the one entry a real per-turn recall hook would keep resurfacing,
  // not the whole style guide.
  if (arm === 'control' || arm === 'neuron-hook') return HARD_STYLE_NOTE;
  if (arm === 'neuron-mcp') {
    return (
      'This project has a neuron memory store recording project conventions. ' +
      'Use the `neuron_recall` tool if you want to check for relevant conventions before writing new code.'
    );
  }
  throw new Error(`unknown arm: ${arm}`);
}

// --- Action mode -------------------------------------------------------
//
// Hard mode's own fix (exact format + burial) still didn't break the
// ceiling — `control` stayed at 100%. Root cause, not just a restated
// symptom: the Anthropic Messages API resends the full system prompt on
// *every* turn, so a rule satisfied by "write this one line of code
// correctly" is exactly as available at turn 4 as at turn 1 — burial
// dilutes salience but the content never actually leaves context the way
// chat history does. write-compliance-ab's own rule never had this
// problem because it asks for a *separate, unprompted action* — call
// `neuron memory add` — that the task's own numbered steps never mention,
// so the model has to proactively recall an obligation competing against
// the four explicit steps it's visibly focused on, not just apply a style
// rule to code it's already writing. This mode swaps in a rule of that
// same shape, otherwise identical scaffolding (same dilution note, same
// multi-step task): before finishing, log the session by appending a line
// to `.session-log` — a file the task's own prompt/check() never
// mentions, so satisfying it requires unprompted initiative, not habit.
export const ACTION_RULE_TEXT =
  'Before calling finish_task, you must log this session by running ' +
  "`echo \"<one-sentence summary of what you changed>\" >> .session-log` " +
  '— required after every session in this project, regardless of what the task itself asks for.';

export const ACTION_STYLE_NOTE = `## Project Style Guide

This project follows a few conventions:
- Use \`const\`/\`let\`, never \`var\`.
- Prefer early returns over deeply nested conditionals instead of extra \`else\` branches.
- Function and variable names use camelCase, not snake_case.
- Keep new logic under 100 characters per line where reasonable.
- ${ACTION_RULE_TEXT}
- Error messages in thrown/logged errors should be specific enough to grep for, not generic text like "error occurred".`;

export function systemNoteForArmAction(arm) {
  if (arm === 'control' || arm === 'neuron-hook') return ACTION_STYLE_NOTE;
  if (arm === 'neuron-mcp') {
    return (
      'This project has a neuron memory store recording project conventions. ' +
      'Use the `neuron_recall` tool if you want to check for relevant conventions before writing new code.'
    );
  }
  throw new Error(`unknown arm: ${arm}`);
}

// --- Trigger mode --------------------------------------------------------
//
// Action mode's own fix still didn't break the ceiling — `control` stayed
// at 100%. Re-reading write-compliance-ab's own findings doc
// (docs/design/write-compliance/nudge-ab-findings.md) surfaced the real
// mechanism its hard mode exploited, which "separate, unprompted action"
// alone doesn't capture: its rule is CONDITIONAL on an earlier triggering
// event ("whenever a failing test gets fixed, record it") and asks for
// that recording to happen at the moment of the fix — step 1 of 4 — not at
// session end. `control` there complied in exactly 3 turns when it did
// comply, and failed by simply never circling back once steps 2-4's real,
// unrelated work took over. Action mode's own rule was unconditional
// ("before finishing, always log") — which puts the obligation at exactly
// the moment (`finish_task`) a model naturally reviews what's left to do,
// the easiest possible moment to satisfy it. This mode fixes that: the
// obligation triggers at the SAME early moment as the task's own step 1
// fix (genuine episodic recall required by session end, not a checklist
// item), and stays otherwise identical (same dilution note, same task).
export const TRIGGER_RULE_TEXT =
  'Whenever you fix a failing test in this project, you must immediately record it — before doing ' +
  'anything else — by running `echo "<one-sentence summary of the fix>" >> .session-log`. This applies ' +
  'every time a failing test starts passing, not just at the end of a session.';

export const TRIGGER_STYLE_NOTE = `## Project Style Guide

This project follows a few conventions:
- Use \`const\`/\`let\`, never \`var\`.
- Prefer early returns over deeply nested conditionals instead of extra \`else\` branches.
- Function and variable names use camelCase, not snake_case.
- Keep new logic under 100 characters per line where reasonable.
- ${TRIGGER_RULE_TEXT}
- Error messages in thrown/logged errors should be specific enough to grep for, not generic text like "error occurred".`;

export function systemNoteForArmTrigger(arm) {
  if (arm === 'control' || arm === 'neuron-hook') return TRIGGER_STYLE_NOTE;
  if (arm === 'neuron-mcp') {
    return (
      'This project has a neuron memory store recording project conventions. ' +
      'Use the `neuron_recall` tool if you want to check for relevant conventions before writing new code.'
    );
  }
  throw new Error(`unknown arm: ${arm}`);
}

/**
 * @param withNeuron - false for `control` (no neuron.yaml, no `.bin/neuron`
 *   wrapper — a bare `neuron` invocation fails with "command not found",
 *   the same as a real project that never installed it). true for
 *   `neuron-hook`/`neuron-mcp`, which also seed the rule as a real store
 *   entry via a real `neuron memory add` call (not a hand-written fixture
 *   file) so `neuron-mcp`'s tool handler queries genuine store content,
 *   not a mock.
 * @param seedText - the exact text seeded into the `conventions` category
 *   when `withNeuron` is true. Defaults to the easy-mode `RULE_TEXT`; hard
 *   mode passes `HARD_RULE_TEXT` — a single atomic entry, matching how a
 *   real memory store holds one fact per entry, not a whole style guide
 *   dumped into one.
 */
export function buildFixture(task, sessionTag, withNeuron, seedText = RULE_TEXT) {
  const parent = fs.mkdtempSync(path.join(os.tmpdir(), `neuron-rule-recall-ab-${sessionTag}-`));
  const dir = path.join(parent, 'repo');
  fs.mkdirSync(dir);

  for (const file of task.files) {
    fs.writeFileSync(path.join(dir, file.name), file.content, 'utf8');
  }

  let binDir = null;
  if (withNeuron) {
    fs.writeFileSync(path.join(dir, 'neuron.yaml'), NEURON_YAML, 'utf8');
    binDir = path.join(dir, '.bin');
    fs.mkdirSync(binDir, { recursive: true });
    const wrapperPath = path.join(binDir, 'neuron');
    fs.writeFileSync(wrapperPath, `#!/bin/bash\nexec node "${CLI_PATH}" "$@"\n`, 'utf8');
    fs.chmodSync(wrapperPath, 0o755);
    execFileSync('node', [CLI_PATH, 'memory', 'add', '--category', 'conventions', seedText], {
      cwd: dir,
      stdio: 'pipe',
    });
  }

  return { dir, parent, binDir, task };
}

export function cleanupFixture(fixture) {
  fs.rmSync(fixture.parent, { recursive: true, force: true });
}

/** Same multi-step check as tasksHard.mjs's own task — task-solved is a validity filter, not the outcome measure. */
export function taskPasses(fixture) {
  try {
    return fixture.task.check(fixture.dir);
  } catch {
    return false;
  }
}
