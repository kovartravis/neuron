/**
 * Fixture builder for ticket 10 (Counterfactual Token A/B).
 *
 * Both arms are a git worktree pinned to the same commit (HEAD at build time)
 * so git log/grep/read behave identically either way — the only difference
 * between arms is the memory surface:
 *
 *   memory  — .neuron/*.md present on disk, plus a system-prompt note
 *             pointing the agent at it (the functional payload of neuron's
 *             hook: a pointer to resident project memory).
 *   control — .neuron/ absent, no note. The agent must reconstruct the
 *             answer from source and git history alone.
 *
 * CLAUDE.md is removed from both arms' checkout. The repo's real CLAUDE.md
 * instructs the agent to run `neuron exec` / `neuron memory` commands, which
 * assume a built CLI this sandbox does not provide — leaving it in would
 * risk one arm burning turns on commands that 404, which is an infra
 * artifact, not the effect ticket 10 is measuring. See the harness README
 * for why this is a deliberate scoping of "with neuron installed" down to
 * "with neuron's memory content resident and pointed at," not a run of the
 * live hook/CLI path (07-09 already measured that path's cost directly).
 */

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = fileURLToPath(new URL('../../', import.meta.url));

export const MEMORY_NOTE = `## Project Memory

This repository's prior session history, architectural decisions, and
learnings are recorded under \`.neuron/\` as flat markdown files:
\`.neuron/decisions.md\`, \`.neuron/history.md\`, \`.neuron/learning.md\`.
Before answering a question about this project's past decisions, rationale,
or history, check there first — it is generally faster and more reliable
than reconstructing the answer from source and git log alone.`;

export function buildFixture(arm, sessionTag) {
  if (arm !== 'memory' && arm !== 'control') {
    throw new Error(`unknown arm: ${arm}`);
  }

  const parent = fs.mkdtempSync(path.join(os.tmpdir(), `neuron-token-ab-${sessionTag}-`));
  const worktreeDir = path.join(parent, 'wt');
  execFileSync('git', ['worktree', 'add', '--detach', '--quiet', worktreeDir, 'HEAD'], {
    cwd: REPO_ROOT,
    stdio: 'pipe',
  });

  const claudeMd = path.join(worktreeDir, 'CLAUDE.md');
  if (fs.existsSync(claudeMd)) fs.rmSync(claudeMd);

  let systemNote = null;
  if (arm === 'memory') {
    systemNote = MEMORY_NOTE;
  } else {
    fs.rmSync(path.join(worktreeDir, '.neuron'), { recursive: true, force: true });
  }

  return { dir: worktreeDir, parent, systemNote };
}

export function cleanupFixture(fixture) {
  try {
    execFileSync('git', ['worktree', 'remove', '--force', fixture.dir], {
      cwd: REPO_ROOT,
      stdio: 'pipe',
    });
  } catch {
    // Worktree metadata can go stale if the dir was already removed some
    // other way; fall through to the filesystem cleanup below regardless.
  }
  fs.rmSync(fixture.parent, { recursive: true, force: true });
}

export function pruneStaleWorktrees() {
  execFileSync('git', ['worktree', 'prune'], { cwd: REPO_ROOT, stdio: 'pipe' });
}
