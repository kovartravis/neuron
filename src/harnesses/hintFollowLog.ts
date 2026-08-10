import fs from 'node:fs';
import path from 'node:path';
import { hookCacheDir } from './cacheDir.js';

/**
 * Ticket 07 (neuron-2.4.0): does the per-turn discovery-command hint
 * (ticket 06) actually get followed? This module is the recording half of
 * that measurement — append-only, so a 'fired' event and a later
 * 'query-run' event are two independent rows a separate analysis pass joins,
 * never a single record mutated in place (no lock needed, no race between a
 * pre-prompt hook and a concurrent post-tool-use hook writing at once).
 *
 * Deliberately not a `LifecyclePoint` / `HarnessAdapter` citizen: this is
 * dogfood-only instrumentation for this one measurement, wired by hand into
 * this repo's own `.claude/settings.json` `PostToolUse` entry, not part of
 * what `neuron init` installs for a user's project.
 */

/** Bounds log growth on a long-lived dev machine; oldest events evict first. */
const MAX_EVENTS = 2000;

export interface HintEvent {
  /** `fired`: the hint text was actually injected this turn. `query-run`: a Bash tool call matched `neuron memory query`. */
  type: 'fired' | 'query-run';
  sessionId: string;
  /** The exact suggested command (`fired`) or the exact command run (`query-run`) — analysis joins on this being the same string. */
  command: string;
  at: string;
}

function logPath(projectRoot: string): string {
  return path.join(hookCacheDir(projectRoot), 'hint-events.jsonl');
}

function trimIfNeeded(filePath: string): void {
  const raw = fs.readFileSync(filePath, 'utf8');
  const lines = raw.split('\n').filter(l => l.length > 0);
  if (lines.length <= MAX_EVENTS) return;
  fs.writeFileSync(filePath, lines.slice(lines.length - MAX_EVENTS).join('\n') + '\n', 'utf8');
}

function appendEvent(projectRoot: string, event: HintEvent): void {
  try {
    const filePath = logPath(projectRoot);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.appendFileSync(filePath, JSON.stringify(event) + '\n', 'utf8');
    trimIfNeeded(filePath);
  } catch {
    // Measurement is best-effort: never let recording it break the hook it's watching.
  }
}

/** Called from the `pre-prompt` hook whenever `buildDiscoveryHint` actually returns a hint. */
export function recordHintFired(projectRoot: string, sessionId: string, command: string): void {
  appendEvent(projectRoot, { type: 'fired', sessionId, command, at: new Date().toISOString() });
}

/**
 * Requires `neuron memory query` to actually be invoked — at the start of
 * the command, or right after a shell separator (`;`, `&&`, `|`, a
 * subshell's `(`/backtick, or a newline) — not merely present as a
 * substring. A plain substring test false-positives on any command that
 * quotes or echoes the phrase without running it (confirmed live: this
 * ticket's own smoke test — `echo '{"command":"neuron memory query ..."}'
 * | neuron hook ...` — tripped a bare substring match on its own echoed
 * JSON).
 */
const QUERY_COMMAND_PATTERN = /(^|[;&|\n(`]\s*)neuron\s+memory\s+query(\s|$)/g;

/**
 * True when `index` falls inside a `'...'` or `"..."` region of `command` —
 * a cheap quote-parity scan, not a real shell tokenizer, but enough to catch
 * the second false positive found live: a real `neuron memory add "<text
 * that itself mentions 'neuron memory query'>"` call, where the separator
 * anchor above (`&&` inside that quoted prose) still matched because it sat
 * at a syntactically valid position — just inside a string literal, not at
 * the shell's top level.
 */
function isInsideQuotes(command: string, index: number): boolean {
  let inSingle = false;
  let inDouble = false;
  for (let i = 0; i < index; i++) {
    const c = command[i];
    if (c === "'" && !inDouble) inSingle = !inSingle;
    else if (c === '"' && !inSingle && command[i - 1] !== '\\') inDouble = !inDouble;
  }
  return inSingle || inDouble;
}

/** Called from the `post-tool-use` hook for every `Bash` tool call; only `neuron memory query` commands are worth a row. */
export function recordToolUse(projectRoot: string, sessionId: string, command: string): void {
  QUERY_COMMAND_PATTERN.lastIndex = 0;
  let match: RegExpExecArray | null;
  let realInvocation = false;
  while ((match = QUERY_COMMAND_PATTERN.exec(command)) !== null) {
    if (!isInsideQuotes(command, match.index)) {
      realInvocation = true;
      break;
    }
  }
  if (!realInvocation) return;
  appendEvent(projectRoot, { type: 'query-run', sessionId, command, at: new Date().toISOString() });
}

/** Reads every recorded event, oldest first — used by tests and by `benchmarks/hint-follow/analyze.mjs`. */
export function readHintEvents(projectRoot: string): HintEvent[] {
  try {
    const raw = fs.readFileSync(logPath(projectRoot), 'utf8');
    return raw
      .split('\n')
      .filter(l => l.length > 0)
      .map(l => JSON.parse(l) as HintEvent);
  } catch {
    return [];
  }
}
