/**
 * Minimal git-log search prototype for ticket 14 — "enough to test the
 * premise, not a shipped feature" (ticket 14 Scope item 3). Mirrors the
 * shape a real session-start/pre-prompt hook injection would take: a
 * generic keyword search over commit subject+body, run against the task's
 * own declared query terms (not hand-picked winning content per task).
 */

import { execFileSync } from 'node:child_process';

function escapeRegex(term) {
  return term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function searchGitLog(repoDir, terms, { maxCommits = 6, bodyChars = 240 } = {}) {
  const pattern = terms.map(escapeRegex).join('|');
  let hashes = [];
  try {
    const out = execFileSync(
      'git',
      ['log', '--all', '-i', '-E', '--grep', pattern, '-n', String(maxCommits), '--format=%H'],
      { cwd: repoDir, encoding: 'utf8' }
    );
    hashes = out.trim().split('\n').filter(Boolean);
  } catch {
    hashes = [];
  }

  return hashes.map(hash => {
    const subject = execFileSync('git', ['show', '-s', '--format=%s', hash], { cwd: repoDir, encoding: 'utf8' }).trim();
    const body = execFileSync('git', ['show', '-s', '--format=%b', hash], { cwd: repoDir, encoding: 'utf8' }).trim();
    const shortBody = body.length > bodyChars ? `${body.slice(0, bodyChars)}...` : body;
    return { hash: hash.slice(0, 8), subject, body: shortBody };
  });
}

export function formatGitLogNote(entries, queryTerms) {
  if (entries.length === 0) {
    return `## Git History Search\n\nA search of this repository's commit history for "${queryTerms.join(', ')}" returned no matching commits.`;
  }
  const lines = entries.map(e => {
    const bodyLine = e.body ? `\n  ${e.body.replace(/\n+/g, ' ')}` : '';
    return `- \`${e.hash}\` ${e.subject}${bodyLine}`;
  });
  return `## Git History Search

A search of this repository's commit history for terms relevant to your question ("${queryTerms.join(', ')}") returned the following commits, most recent first:

${lines.join('\n')}

This search may be incomplete — verify against \`git log\`/\`git show\` yourself if it doesn't fully answer the question.`;
}
