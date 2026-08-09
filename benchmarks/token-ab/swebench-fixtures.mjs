/**
 * Fixture builder for ticket 19 (Run the Counterfactual A/B on Synthetic
 * Repos with Synthetic Memory Sets).
 *
 * Unlike fixtures.mjs (which worktrees THIS repo at a local commit),
 * these fixtures are real external OSS repos (astropy, django) pulled live
 * at a specific historical commit named by the selected SWE-bench
 * instance - per the ticket's grilled decision to live-fetch rather than
 * vendor a cache, so the published benchmark suite doesn't ship a stale
 * copy of someone else's source tree.
 *
 *   memory  — .neuron/learning.md present, containing the task's fabricated
 *             "prior fix recorded" entry plus filler entries, plus the same
 *             MEMORY_NOTE system-prompt pointer fixtures.mjs's memory arm
 *             uses (reused, not re-derived).
 *   control — no .neuron/ directory, no system note. Must diagnose from
 *             source alone, same as a real SWE-bench solver would.
 *
 * Fetches a single commit shallow via `git fetch --depth 1 origin <sha>`
 * rather than cloning full history - GitHub's smart-HTTP server supports
 * fetching an arbitrary full 40-char commit SHA directly for public repos.
 * `.git` is removed after checkout: this ticket tests source-level
 * diagnosis, not git-log archaeology (that's ticket 14's own pillar), and a
 * single-commit shallow history has nothing useful to read anyway.
 */

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { MEMORY_NOTE } from './fixtures.mjs';
import { FILLER_LEARNING_ENTRIES } from './swebench-tasks.mjs';

function frontmatterEntry(id, createdAt, body) {
  return `---\nid: ${id}\ncreatedAt: ${createdAt}\nimportance: 3\ntags: []\ntaskId: null\n---\n${body}\n`;
}

function buildLearningMd(task) {
  const base = new Date('2026-07-01T00:00:00.000Z').getTime();
  const entries = [FILLER_LEARNING_ENTRIES[0], task.memoryEntry, FILLER_LEARNING_ENTRIES[1]];
  const body = entries
    .map((text, i) => frontmatterEntry(`swebench-fixture-${i}`, new Date(base + i * 3600_000).toISOString(), text))
    .join('\n');
  return `# Category: learning\n\n${body}`;
}

export function buildSwebenchFixture(arm, task, sessionTag) {
  if (arm !== 'memory' && arm !== 'control') {
    throw new Error(`unknown arm: ${arm}`);
  }
  const { cloneUrl, baseCommit } = task.instance;

  const parent = fs.mkdtempSync(path.join(os.tmpdir(), `neuron-swebench-ab-${sessionTag}-`));
  const dir = path.join(parent, 'repo');
  fs.mkdirSync(dir);

  execFileSync('git', ['init', '--quiet'], { cwd: dir, stdio: 'pipe' });
  execFileSync('git', ['remote', 'add', 'origin', cloneUrl], { cwd: dir, stdio: 'pipe' });
  execFileSync('git', ['fetch', '--depth', '1', '--quiet', 'origin', baseCommit], {
    cwd: dir,
    stdio: 'pipe',
    timeout: 120_000,
  });
  execFileSync('git', ['checkout', '--quiet', 'FETCH_HEAD'], { cwd: dir, stdio: 'pipe' });
  fs.rmSync(path.join(dir, '.git'), { recursive: true, force: true });

  let systemNote = null;
  if (arm === 'memory') {
    fs.mkdirSync(path.join(dir, '.neuron'), { recursive: true });
    fs.writeFileSync(path.join(dir, '.neuron', 'learning.md'), buildLearningMd(task), 'utf8');
    systemNote = MEMORY_NOTE;
  }

  return { dir, parent, systemNote };
}

export function cleanupSwebenchFixture(fixture) {
  fs.rmSync(fixture.parent, { recursive: true, force: true });
}
