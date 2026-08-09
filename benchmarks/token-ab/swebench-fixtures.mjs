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
 *   memory    — .neuron/learning.md present, containing the task's fabricated
 *               "prior fix recorded" entry plus filler entries, plus the same
 *               MEMORY_NOTE system-prompt pointer fixtures.mjs's memory arm
 *               uses (reused, not re-derived). Models neuron-as-FILES: the
 *               agent must decide to go read the store.
 *   injection — everything the memory arm has, PLUS the entries rendered into
 *               the system prompt unconditionally, mirroring what neuron's
 *               session-start hook actually does. Models neuron-as-INSTALLED.
 *   control   — no .neuron/ directory, no system note. Must diagnose from
 *               source alone, same as a real SWE-bench solver would.
 *
 * The memory/injection split exists because they answer different questions
 * and give different numbers. neuron ships as a HOOK: `neuron hook` fires at
 * session start and injects retrieved entries into context whether or not the
 * agent would ever have thought to look, paying its token cost up front on
 * every session. The `memory` arm cannot measure that bargain — it measures
 * whether an agent that is merely TOLD a store exists chooses to open it,
 * which is a fact about MEMORY_NOTE's wording, not about token economics.
 * Only the `injection` arm tests the claim the product actually makes.
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

/**
 * Mirrors src/harnesses/payload.ts's SESSION_START_CHAR_BUDGET. Duplicated as
 * a literal rather than imported because that module is TypeScript and this
 * harness runs under bare `node`, not tsx — if the source constant moves, this
 * one has to move with it, which is why the source is named here explicitly.
 */
const SESSION_START_CHAR_BUDGET = 6000;

/**
 * Reproduces payload.ts's formatMemoryEntry + buildPayload for the fixture's
 * fabricated entries: one `- [category] content` line each, whole entries only
 * (never truncated mid-content), packed under the session-start budget. The
 * fixture's three entries are far below 6000 chars, so nothing is dropped in
 * practice — the budget is applied anyway so the arm stays faithful if the
 * entry set ever grows.
 */
function buildInjectionNote(task) {
  const entries = [FILLER_LEARNING_ENTRIES[0], task.memoryEntry, FILLER_LEARNING_ENTRIES[1]];
  const header = '## Project Memory (recalled)';
  const lines = [];
  let used = header.length + 1;
  for (const content of entries) {
    const line = `- [learning] ${content}`;
    if (used + line.length + 1 > SESSION_START_CHAR_BUDGET) continue;
    lines.push(line);
    used += line.length + 1;
  }
  return `${MEMORY_NOTE}\n\n${header}\n${lines.join('\n')}`;
}

export function buildSwebenchFixture(arm, task, sessionTag) {
  if (arm !== 'memory' && arm !== 'injection' && arm !== 'control') {
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
  if (arm === 'memory' || arm === 'injection') {
    fs.mkdirSync(path.join(dir, '.neuron'), { recursive: true });
    fs.writeFileSync(path.join(dir, '.neuron', 'learning.md'), buildLearningMd(task), 'utf8');
    // Both arms keep the store on disk and the protocol pointer; only the
    // injection arm additionally pays the up-front cost of putting the
    // entries themselves in context, the way the real session-start hook does.
    systemNote = arm === 'injection' ? buildInjectionNote(task) : MEMORY_NOTE;
  }

  return { dir, parent, systemNote };
}

export function cleanupSwebenchFixture(fixture) {
  fs.rmSync(fixture.parent, { recursive: true, force: true });
}
