/**
 * Fixture builder for ticket 4 (neuron-2.4.3). Each fixture is a throwaway
 * temp dir containing: the task's buggy source file + failing test (see
 * tasks.mjs for why these are self-contained synthetic Node scripts rather
 * than a real SWE-bench checkout), a minimal `neuron.yaml` declaring just
 * the `learning` category (mirrors this repo's own neuron.yaml's shape,
 * trimmed to what `neuron memory add --category learning` needs), and a
 * `.bin/neuron` wrapper so the agent's shell can actually run a real
 * `neuron` command — required because grading (grading.mjs) looks for a
 * genuine tool-call invocation in the transcript, not a description of
 * intent, so the CLI has to actually be callable.
 *
 * Reuses this repo's own built dist/cli.js directly (REPO_ROOT-relative)
 * rather than `npm install`-ing the published package into every fixture:
 * this is the local checkout being dogfooded, and `npm install` per
 * session would add real time/network cost for zero behavioral difference.
 */

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = fileURLToPath(new URL('../../', import.meta.url));
const CLI_PATH = path.join(REPO_ROOT, 'dist/cli.js');

const NEURON_YAML = `version: "1.0"
storage:
  mode: md
  path: .neuron
categories:
  learning:
    description: Agent conventions, rules, and failure fixes
`;

// Verbatim from this repo's own CLAUDE.md, §1 — the exact passive-prose
// protocol every real session already sees. Trimmed to just this one
// section (not the whole Memory Store Protocol block) because the other
// sections (session-conclusion recording, metadata flags) don't bear on
// the failure-fix trigger this ticket measures — same trimming precedent
// as token-ab/fixtures.mjs's MEMORY_NOTE.
export const BASE_PROTOCOL_NOTE = `## Memory Store Protocol (\`@kovartravis/neuron\`)

### 1. Failure-Fix Recording

When a failing command/build/test gets fixed, record it before moving on. Write 3-4 sentences: context/symptom, root cause, exact resolution (with a command/code example), any edge cases:
\`\`\`bash
neuron memory add --category learning "Fix for <error>: <context & symptom>. <verified root cause>. <exact resolution steps & code/command example>." --importance 4
\`\`\``;

// Injected once, mid-session, the first time the agent tries to finish —
// simulating a Stop-hook-style reminder (see ticket 1's Design: `Stop`
// doesn't exist as a real LifecyclePoint yet, so this stands in for it the
// same way token-ab's `injection` arm simulates session-start payload
// rendering without a live hook).
export const NUDGE_TEXT =
  '[session-end reminder] Before this session ends: if you just fixed a failing command, build, ' +
  'or test, the Memory Store Protocol above calls for recording it via `neuron memory add` before ' +
  'you finish. Do that now if it applies, then call finish_task again to actually end the session.';

// Appended to the base protocol note directly in the system prompt (not a
// mid-session interrupt) — states the requirement as an imperative rather
// than descriptive prose.
export const EXPLICIT_INSTRUCTION_NOTE =
  '\n\nCompliance requirement: if you fix a failing command/build/test in this session, you MUST ' +
  'call `neuron memory add --category learning "..."` to record it before you call finish_task. ' +
  'This is not optional.';

export function systemNoteForArm(arm) {
  if (arm === 'control' || arm === 'nudge') return BASE_PROTOCOL_NOTE;
  if (arm === 'explicit-instruction') return BASE_PROTOCOL_NOTE + EXPLICIT_INSTRUCTION_NOTE;
  throw new Error(`unknown arm: ${arm}`);
}

export function buildFixture(task, sessionTag) {
  const parent = fs.mkdtempSync(path.join(os.tmpdir(), `neuron-write-compliance-ab-${sessionTag}-`));
  const dir = path.join(parent, 'repo');
  fs.mkdirSync(dir);

  fs.writeFileSync(path.join(dir, task.buggyFile), task.buggySource, 'utf8');
  fs.writeFileSync(path.join(dir, task.testFile), task.testSource, 'utf8');
  fs.writeFileSync(path.join(dir, 'neuron.yaml'), NEURON_YAML, 'utf8');

  const binDir = path.join(dir, '.bin');
  fs.mkdirSync(binDir, { recursive: true });
  const wrapperPath = path.join(binDir, 'neuron');
  fs.writeFileSync(wrapperPath, `#!/bin/bash\nexec node "${CLI_PATH}" "$@"\n`, 'utf8');
  fs.chmodSync(wrapperPath, 0o755);

  return { dir, parent, binDir, task };
}

export function cleanupFixture(fixture) {
  fs.rmSync(fixture.parent, { recursive: true, force: true });
}

/** Re-runs the task's test file against the (possibly agent-edited) fixture; the pass/fail validity filter. */
export function testPasses(fixture) {
  try {
    execFileSync('node', [fixture.task.testFile], { cwd: fixture.dir, stdio: 'pipe', timeout: 30_000 });
    return true;
  } catch {
    return false;
  }
}

// --- Hard mode (ticket 5) -------------------------------------------------
//
// Same wrapper/CLI/temp-dir mechanics as above, reused verbatim. What
// differs: the system note is the FULL real CLAUDE.md Memory Store Protocol
// block (§1 + §2 + Metadata flags), not just the §1 excerpt BASE_PROTOCOL_NOTE
// trims down to — so the failure-fix trigger now has to compete with real
// neighboring content, including §2 (Session Conclusion), which is easy to
// half-comply with (write a `history` entry and call it done, skipping the
// `learning` "Fix for..." entry §1 actually asks for). Declares `history`
// and `decisions` too, since §2 references both and a faithful fixture lets
// the agent actually run what it reads rather than hit an unknown-category
// error that isn't part of what's being measured.

const NEURON_YAML_FULL = `version: "1.0"
storage:
  mode: md
  path: .neuron
categories:
  learning:
    description: Agent conventions, rules, and failure fixes
  history:
    description: Action history log and completed task summary
  decisions:
    description: Architectural Decision Records (ADRs) & design choices
`;

// Verbatim from this repo's own CLAUDE.md between the
// <!-- neuron:protocol:start/end --> markers, confirmed by hand against the
// live file (49 lines) before pasting — this IS the real protocol block
// every real session actually sees, not a paraphrase.
export const FULL_CLAUDE_MD_NOTE = `## Memory Store Protocol (\`@kovartravis/neuron\`)

Follow this loop when working in this project. Memory categories configured in \`neuron.yaml\`: \`learning\`, \`history\`, \`decisions\`.

## 1. Failure-Fix Recording

When a failing command/build/test gets fixed, record it before moving on. Write 3-4 sentences: context/symptom, root cause, exact resolution (with a command/code example), any edge cases:
\`\`\`bash
neuron memory add --category learning "Fix for <error>: <context & symptom>. <verified root cause>. <exact resolution steps & code/command example>." --importance 4
\`\`\`

## 2. Session Conclusion

Before finishing, check whether this session produced a \`decisions\`/\`learning\` entry:

- **It did** — write that entry first, then shrink \`history\` to a short pointer (what happened, in a line or two) instead of restating the resolution. Both share the same \`--task-id\`, which is the link between them — not a separate id-to-id field:
  \`\`\`bash
  # ADRs / design choices, or a new rule/failure-fix:
  neuron memory add --category decisions "<rationale and details>" --task-id <ticket-id>
  neuron memory add --category learning "<rule or fix, 3-4 sentences>" --task-id <ticket-id>
  # then a pointer, not a restatement:
  neuron memory add --category history "<one or two lines: what happened>" --task-id <ticket-id>
  \`\`\`
- **It didn't** (pure execution, nothing decided) — \`history\` keeps today's full-narrative shape; there's nothing else to point at:
  \`\`\`bash
  neuron memory add --category history "<summary of work completed>" --task-id <ticket-id>
  \`\`\`

### Metadata flags

- \`--tags\`: omit — write-side enrichment infers tags from the store's vocabulary, which converges it; hand-written tags widen it instead.
- \`--importance\`: omit defaults to \`3\`, \`neuron memory prune\`'s default ceiling — anything left at 3 is prune-eligible past \`--days\`. Pass \`4\` or \`5\` to survive a prune.
- \`--category\`: always pass — omitting it can cost a model load or hard-fail the write.`;

export function systemNoteForArmHard(arm) {
  if (arm === 'control' || arm === 'nudge') return FULL_CLAUDE_MD_NOTE;
  if (arm === 'explicit-instruction') return FULL_CLAUDE_MD_NOTE + EXPLICIT_INSTRUCTION_NOTE;
  throw new Error(`unknown arm: ${arm}`);
}

/** Same shape as buildFixture (dir/parent/binDir/task) but writes a task's full `files` array and the 3-category neuron.yaml. */
export function buildHardFixture(task, sessionTag) {
  const parent = fs.mkdtempSync(path.join(os.tmpdir(), `neuron-write-compliance-ab-hard-${sessionTag}-`));
  const dir = path.join(parent, 'repo');
  fs.mkdirSync(dir);

  for (const file of task.files) {
    fs.writeFileSync(path.join(dir, file.name), file.content, 'utf8');
  }
  fs.writeFileSync(path.join(dir, 'neuron.yaml'), NEURON_YAML_FULL, 'utf8');

  const binDir = path.join(dir, '.bin');
  fs.mkdirSync(binDir, { recursive: true });
  const wrapperPath = path.join(binDir, 'neuron');
  fs.writeFileSync(wrapperPath, `#!/bin/bash\nexec node "${CLI_PATH}" "$@"\n`, 'utf8');
  fs.chmodSync(wrapperPath, 0o755);

  return { dir, parent, binDir, task };
}

/** Runs a hard task's own multi-step `check(dir)` — every step (both tests, lint, changelog) must pass. */
export function hardTaskPasses(fixture) {
  try {
    return fixture.task.check(fixture.dir);
  } catch {
    return false;
  }
}
