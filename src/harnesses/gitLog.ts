import { execFileSync } from 'node:child_process';

/**
 * Ticket 08 (neuron-2.4.0) / ADR-less design ruling on ticket 39
 * (neuron-2.3.0): pure git shell-out, no DB access, so the parsing itself is
 * testable without a `NeuronMemory` instance. `NeuronMemory`'s own
 * `refreshGitLogIndex`/`searchGitLog` (`src/index.ts`) own the SQLite side.
 */
export interface GitLogCommit {
  hash: string;
  subject: string;
  body: string;
  committedAt: string;
}

// `%x1e`/`%x1f` are ASCII record/unit separators — control bytes no commit
// subject or body can plausibly contain, so splitting on them is safe where
// splitting on newlines (which bodies routinely contain) would not be.
const RECORD_SEP = '\x1e';
const FIELD_SEP = '\x1f';
const FORMAT = `%H${FIELD_SEP}%s${FIELD_SEP}%b${FIELD_SEP}%cI${RECORD_SEP}`;

function parseLog(raw: string): GitLogCommit[] {
  return raw
    .split(RECORD_SEP)
    .map(record => record.replace(/^\n/, '').trim())
    .filter(Boolean)
    .map(record => {
      const [hash, subject, body, committedAt] = record.split(FIELD_SEP);
      return {
        hash: hash ?? '',
        subject: subject ?? '',
        body: (body ?? '').trim(),
        committedAt: committedAt ?? '',
      };
    })
    .filter(c => c.hash.length > 0);
}

function runLog(projectRoot: string, extraArgs: string[]): GitLogCommit[] {
  try {
    const raw = execFileSync(
      'git',
      ['log', ...extraArgs, `--format=${FORMAT}`],
      { cwd: projectRoot, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] }
    );
    return parseLog(raw);
  } catch {
    // Not a git repo, no commits yet, or an invalid range (e.g. the stored
    // last-indexed SHA no longer exists after a history rewrite) — every
    // case degrades to "nothing to index" rather than throwing.
    return [];
  }
}

/** `git rev-parse HEAD` in `projectRoot`, or `null` if not a git repo / no commits yet. */
export function getHeadSha(projectRoot: string): string | null {
  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], {
      cwd: projectRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return null;
  }
}

/** Full reachable history from HEAD — the one-time backfill (ticket 39 item 1). */
export function listAllCommits(projectRoot: string): GitLogCommit[] {
  return runLog(projectRoot, []);
}

/** Commits after `sinceSha` up to and including current HEAD. */
export function listCommitsSince(projectRoot: string, sinceSha: string): GitLogCommit[] {
  return runLog(projectRoot, [`${sinceSha}..HEAD`]);
}
