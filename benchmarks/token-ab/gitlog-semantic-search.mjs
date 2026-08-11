/**
 * Real-mechanism git-log search for ticket 11 (neuron-2.4.0): unlike ticket
 * 14's `gitlog-search.mjs` prototype (hand-picked `gitLogQuery` terms via
 * `git log --grep`), this shells out to the actual built CLI's
 * `hook claude-code pre-prompt` path — the same one a live session hits —
 * so `NeuronMemory.refreshGitLogIndex()`/`searchGitLog()` (ticket 08) run
 * for real against the task's own natural-language prompt text. No oracle
 * terms anywhere in this file.
 *
 * Sessionless (`session_id` omitted) so the hook takes its simplest branch:
 * no epoch budget, no dedup ledger — see `hook.ts`'s `point === 'pre-prompt'`
 * sessionless branch. The fixture's `.neuron/` dir was already removed by
 * `fixtures.mjs`'s 'control' shape and this call points `NEURON_DB_PATH` at
 * a fresh, empty store, so `memory.query()` never matches anything — the
 * returned `additionalContext`, if any, is exactly the git-log section,
 * nothing else riding along.
 */

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = fileURLToPath(new URL('../../', import.meta.url));
const CLI_PATH = path.join(REPO_ROOT, 'dist/cli.js');

/**
 * Runs the real hook CLI once against `fixtureDir` for `prompt`, using
 * `dbPath` as the store. Callers share one `dbPath` per fixture worktree
 * across every task/repeat that targets it, so `refreshGitLogIndex()`'s
 * one-time full-history backfill (~200 commits, local embedder, no API
 * spend) pays once per worktree, not once per session.
 */
export function realGitLogSearch(fixtureDir, dbPath, prompt) {
  const cacheDir = fs.mkdtempSync(path.join(os.tmpdir(), 'neuron-gitlog-real-cache-'));
  try {
    const result = spawnSync('node', [CLI_PATH, 'hook', 'claude-code', 'pre-prompt'], {
      cwd: fixtureDir,
      env: {
        ...process.env,
        NEURON_DB_PATH: dbPath,
        NEURON_HOOK_CACHE_DIR: cacheDir,
      },
      input: JSON.stringify({ prompt }),
      encoding: 'utf8',
      maxBuffer: 32 * 1024 * 1024,
    });
    if (result.status !== 0) {
      throw new Error(`hook CLI exited ${result.status}: ${result.stderr}`);
    }
    const out = result.stdout?.trim();
    if (!out) return null;
    const parsed = JSON.parse(out);
    return parsed?.hookSpecificOutput?.additionalContext ?? null;
  } finally {
    fs.rmSync(cacheDir, { recursive: true, force: true });
  }
}

/** One-time warmup call so the full-history backfill happens before any timing/grading starts. */
export function warmGitLogIndex(fixtureDir, dbPath) {
  realGitLogSearch(fixtureDir, dbPath, '(warmup — index backfill only)');
}
