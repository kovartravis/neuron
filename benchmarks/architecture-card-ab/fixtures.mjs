/**
 * Fixture builder for ticket 24 (Architecture Card A/B).
 *
 * Narrower than ticket 10's fixtures: this isolates the one payload tickets
 * 11/25 push proactively at session-start/first-pre-prompt, not the broader
 * "full memory resident" question 10/18 already answered. Both arms are a
 * git worktree pinned to the same commit (HEAD at build time), matching
 * ticket 10's design so git log/grep/read behave identically either way:
 *
 *   card     — no `.neuron/` on disk (same as `control` below); the agent
 *              gets the real architecture-card text neuron's hook actually
 *              emits (captured live post-ticket-25, see captured-card.txt)
 *              as a system-prompt note, framed as what the hook pushed.
 *   no-card  — `.neuron/` absent, no note. The agent must reconstruct the
 *              same structural facts from source alone.
 *
 * CLAUDE.md is removed from both arms, same reasoning as ticket 10's
 * fixtures: it references `neuron exec` / `neuron memory` commands this
 * sandbox doesn't provide, which would burn turns on 404s unrelated to the
 * effect being measured.
 */

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = fileURLToPath(new URL('../../', import.meta.url));
const CARD_PATH = fileURLToPath(new URL('../../benchmarks/architecture-card-ab/results/24-architecture-card-ab/captured-card.txt', import.meta.url));

const CARD_TEXT = fs.readFileSync(CARD_PATH, 'utf8');

export function cardNote() {
  return `## Project Architecture (pushed automatically at session start)

${CARD_TEXT}`;
}

export function buildFixture(arm, sessionTag) {
  if (arm !== 'card' && arm !== 'no-card') {
    throw new Error(`unknown arm: ${arm}`);
  }

  const parent = fs.mkdtempSync(path.join(os.tmpdir(), `neuron-card-ab-${sessionTag}-`));
  const worktreeDir = path.join(parent, 'wt');
  execFileSync('git', ['worktree', 'add', '--detach', '--quiet', worktreeDir, 'HEAD'], {
    cwd: REPO_ROOT,
    stdio: 'pipe',
  });

  const claudeMd = path.join(worktreeDir, 'CLAUDE.md');
  if (fs.existsSync(claudeMd)) fs.rmSync(claudeMd);

  fs.rmSync(path.join(worktreeDir, '.neuron'), { recursive: true, force: true });

  const systemNote = arm === 'card' ? cardNote() : null;

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
