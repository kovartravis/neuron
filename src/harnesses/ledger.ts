import fs from 'node:fs';
import path from 'node:path';
import { Memory } from '../models/index.js';
import { hookCacheDir, sessionFileKey } from './cacheDir.js';

/**
 * Session-scoped recall state (ADR 0014 §3 dedupe, extended by ticket 07 /
 * neuron-2.3.0 with a per-epoch cost budget). An **epoch** is the span
 * between session start (or the last compaction) and the next
 * `context-reset` — not the whole session — because compaction *deletes*
 * everything neuron previously injected, so re-injecting after one is
 * recovery, not repetition. Both the dedupe ledger and the char-spend budget
 * therefore share one lifecycle: `rollEpoch` resets both together rather than
 * treating them as two files with two reset rules.
 *
 * A ledger older than this is treated as abandoned rather than tracked
 * forever — sessions that never fire `context-reset` (compaction) or end
 * cleanly would otherwise leak one file per session indefinitely.
 */
const STALE_MS = 24 * 60 * 60 * 1000;

/** Bounds ledger growth on a very long epoch; oldest ids evict first. */
const MAX_LEDGER_IDS = 500;

/** Bounds history growth on a session that compacts many times. */
const MAX_HISTORY_EPOCHS = 100;

/** One completed epoch's cost, archived by `rollEpoch`. */
export interface EpochRecord {
  epoch: number;
  chars: number;
  turns: number;
  endedAt: string;
}

interface LedgerFile {
  epoch: number;
  injectedIds: string[];
  charsSpent: number;
  turns: number;
  history: EpochRecord[];
}

/** In-memory view of one session's current epoch, returned by `loadEpochState`. */
export interface EpochState {
  epoch: number;
  injectedIds: Set<string>;
  charsSpent: number;
  turns: number;
}

function ledgerPath(projectRoot: string, sessionId: string): string {
  return path.join(hookCacheDir(projectRoot), `ledger-${sessionFileKey(sessionId)}.json`);
}

const EMPTY_LEDGER: LedgerFile = { epoch: 0, injectedIds: [], charsSpent: 0, turns: 0, history: [] };

function loadLedgerFile(projectRoot: string, sessionId: string): LedgerFile {
  const filePath = ledgerPath(projectRoot, sessionId);
  try {
    const stat = fs.statSync(filePath);
    if (Date.now() - stat.mtimeMs > STALE_MS) return { ...EMPTY_LEDGER, history: [] };
    const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8')) as Partial<LedgerFile>;
    return {
      epoch: typeof parsed.epoch === 'number' ? parsed.epoch : 0,
      injectedIds: Array.isArray(parsed.injectedIds) ? parsed.injectedIds : [],
      charsSpent: typeof parsed.charsSpent === 'number' ? parsed.charsSpent : 0,
      turns: typeof parsed.turns === 'number' ? parsed.turns : 0,
      history: Array.isArray(parsed.history) ? parsed.history : [],
    };
  } catch {
    return { ...EMPTY_LEDGER, history: [] };
  }
}

function writeLedgerFile(projectRoot: string, sessionId: string, ledger: LedgerFile): void {
  const filePath = ledgerPath(projectRoot, sessionId);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(ledger), 'utf8');
}

/** Loads the current epoch's dedupe set and spend, for a caller that needs both in one read. */
export function loadEpochState(projectRoot: string, sessionId: string): EpochState {
  const ledger = loadLedgerFile(projectRoot, sessionId);
  return {
    epoch: ledger.epoch,
    injectedIds: new Set(ledger.injectedIds),
    charsSpent: ledger.charsSpent,
    turns: ledger.turns,
  };
}

/** Returns the subset of `entries` this epoch has not already been shown. */
export function filterUnseen(projectRoot: string, sessionId: string, entries: Memory[]): Memory[] {
  const { injectedIds } = loadEpochState(projectRoot, sessionId);
  return entries.filter(e => !injectedIds.has(e.id));
}

/** Chars left in this epoch's budget before the hard stop, floored at zero. */
export function remainingEpochBudget(projectRoot: string, sessionId: string, epochCharBudget: number): number {
  const { charsSpent } = loadEpochState(projectRoot, sessionId);
  return Math.max(0, epochCharBudget - charsSpent);
}

function recordActivity(
  projectRoot: string,
  sessionId: string,
  ids: string[],
  chars: number,
  countsAsTurn: boolean
): void {
  const ledger = loadLedgerFile(projectRoot, sessionId);
  const seen = new Set(ledger.injectedIds);
  for (const id of ids) seen.add(id);
  let list = Array.from(seen);
  if (list.length > MAX_LEDGER_IDS) {
    list = list.slice(list.length - MAX_LEDGER_IDS);
  }
  ledger.injectedIds = list;
  ledger.charsSpent += chars;
  if (countsAsTurn) ledger.turns += 1;
  writeLedgerFile(projectRoot, sessionId, ledger);
}

/**
 * Records a `session-start` injection. Does not count as a "turn" — the
 * per-turn rate reported by `summarizeRecallCost` describes `pre-prompt`
 * cadence, and the architecture card is a once-per-epoch cost, not a
 * repeating one.
 */
export function recordSessionStartInjection(projectRoot: string, sessionId: string, ids: string[], chars: number): void {
  recordActivity(projectRoot, sessionId, ids, chars, false);
}

/**
 * Records one `pre-prompt` turn. Called on every invocation, including a turn
 * where the hard stop left `ids`/`chars` empty — the per-turn rate needs the
 * denominator (turns) to include silent turns, not just injecting ones.
 */
export function recordPrePromptTurn(projectRoot: string, sessionId: string, ids: string[], chars: number): void {
  recordActivity(projectRoot, sessionId, ids, chars, true);
}

/**
 * Records a `pre-command` injection's ids into the same session-wide dedupe
 * set `pre-prompt`/`session-start` share, but spends nothing against the
 * epoch char budget (`chars: 0`) and never counts as a "turn". `pre-command`
 * fires per tool call rather than per prompt turn — often many times per
 * turn — so charging it against the same budget `pre-prompt`'s hard stop
 * reads would let a busy tool-call sequence exhaust a turn's budget before
 * the prompt itself ever ran, starving the higher-value injection. Sharing
 * only the id set (not the spend) still gets the thing that actually caused
 * live repetition: once any hook point has shown an entry this epoch, none
 * of the others will show it again.
 */
export function recordPreCommandInjection(projectRoot: string, sessionId: string, ids: string[]): void {
  if (ids.length === 0) return;
  recordActivity(projectRoot, sessionId, ids, 0, false);
}

/**
 * Rolls the ledger into a new epoch: archives the finished epoch's cost into
 * `history`, then resets the dedupe set, spend and turn count. Bound to the
 * `context-reset` lifecycle point (ADR 0014 §5): compaction can silently drop
 * an already-injected entry from context while the ledger still says
 * "delivered," so the epoch is rolled rather than trusted across a compaction
 * boundary. This is why `context-reset` never needs to inject anything —
 * rolling the epoch is a side effect, not an injection, so it works even on
 * harnesses whose compaction hook ignores stdout.
 *
 * Replaces the old `clearLedger`, which deleted the file outright — that
 * would have destroyed the per-epoch cost this function now exists to
 * preserve. A ledger with no prior activity (epoch 0, nothing spent) still
 * rolls without error; it archives a zero-cost epoch, which is accurate.
 */
export function rollEpoch(projectRoot: string, sessionId: string): void {
  const ledger = loadLedgerFile(projectRoot, sessionId);
  const finished: EpochRecord = {
    epoch: ledger.epoch,
    chars: ledger.charsSpent,
    turns: ledger.turns,
    endedAt: new Date().toISOString(),
  };
  let history = [...ledger.history, finished];
  if (history.length > MAX_HISTORY_EPOCHS) {
    history = history.slice(history.length - MAX_HISTORY_EPOCHS);
  }
  writeLedgerFile(projectRoot, sessionId, {
    epoch: ledger.epoch + 1,
    injectedIds: [],
    charsSpent: 0,
    turns: 0,
    history,
  });
}

/** Aggregate cost distribution across every recorded session ledger for a project. */
export interface RecallCostSummary {
  epochCharBudget: number;
  /** 3 chars/token — the conservative reading `payload.ts` already uses, preferring to overstate cost. */
  charsPerTokenRatio: number;
  epochTokenBudgetApprox: number;
  sessionsObserved: number;
  epochsObserved: number;
  medianCharsPerEpoch: number;
  p95CharsPerEpoch: number;
  maxCharsPerEpoch: number;
  meanCharsPerTurn: number;
}

const CHARS_PER_TOKEN_RATIO = 3;

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[Math.max(0, idx)];
}

/**
 * Reads every session ledger file for `projectRoot` and summarizes what the
 * recall hook has actually cost, in chars-per-epoch and chars-per-turn. This
 * is the number `neuron status` reports and `03`'s disclosure surface
 * publishes — measured from real recorded sessions, not derived from the
 * budget alone, so a design that never binds in practice reports that
 * honestly.
 *
 * Includes each session's current, still-open epoch alongside its archived
 * `history` — a long-running session's in-progress epoch is real spend, and
 * excluding it would undercount exactly the sessions most worth watching.
 */
export function summarizeRecallCost(projectRoot: string, epochCharBudget: number): RecallCostSummary {
  const dir = hookCacheDir(projectRoot);
  const epochCosts: number[] = [];
  const turnRates: number[] = [];
  let sessionsObserved = 0;

  let files: string[] = [];
  try {
    files = fs.readdirSync(dir).filter(f => f.startsWith('ledger-') && f.endsWith('.json'));
  } catch {
    files = [];
  }

  for (const file of files) {
    let ledger: LedgerFile;
    try {
      const parsed = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8')) as Partial<LedgerFile>;
      ledger = {
        epoch: typeof parsed.epoch === 'number' ? parsed.epoch : 0,
        injectedIds: [],
        charsSpent: typeof parsed.charsSpent === 'number' ? parsed.charsSpent : 0,
        turns: typeof parsed.turns === 'number' ? parsed.turns : 0,
        history: Array.isArray(parsed.history) ? parsed.history : [],
      };
    } catch {
      continue;
    }

    sessionsObserved += 1;
    for (const record of ledger.history) {
      epochCosts.push(record.chars);
      if (record.turns > 0) turnRates.push(record.chars / record.turns);
    }
    if (ledger.charsSpent > 0 || ledger.turns > 0) {
      epochCosts.push(ledger.charsSpent);
      if (ledger.turns > 0) turnRates.push(ledger.charsSpent / ledger.turns);
    }
  }

  const sorted = [...epochCosts].sort((a, b) => a - b);
  const meanCharsPerTurn = turnRates.length > 0 ? turnRates.reduce((a, b) => a + b, 0) / turnRates.length : 0;

  return {
    epochCharBudget,
    charsPerTokenRatio: CHARS_PER_TOKEN_RATIO,
    epochTokenBudgetApprox: Math.ceil(epochCharBudget / CHARS_PER_TOKEN_RATIO),
    sessionsObserved,
    epochsObserved: epochCosts.length,
    medianCharsPerEpoch: percentile(sorted, 50),
    p95CharsPerEpoch: percentile(sorted, 95),
    maxCharsPerEpoch: sorted.length > 0 ? sorted[sorted.length - 1] : 0,
    meanCharsPerTurn: Math.round(meanCharsPerTurn),
  };
}

function preStopNudgePath(projectRoot: string, sessionId: string): string {
  return path.join(hookCacheDir(projectRoot), `prestop-${sessionFileKey(sessionId)}.json`);
}

/**
 * Ticket 6 (neuron-2.4.3): has this session's one-time `pre-stop` compliance
 * nudge already fired? Deliberately its own file, not folded into the epoch
 * ledger above: whether the nudge was delivered is a session-wide fact that
 * must survive a `context-reset` (`rollEpoch`) — a compaction mid-session
 * doesn't undo having already asked the agent to write something, so this
 * state is not epoch-scoped the way the dedupe ledger's `injectedIds` is.
 */
export function hasPreStopNudgeFired(projectRoot: string, sessionId: string): boolean {
  try {
    const parsed = JSON.parse(fs.readFileSync(preStopNudgePath(projectRoot, sessionId), 'utf8'));
    return parsed.fired === true;
  } catch {
    return false;
  }
}

/** Records that this session's `pre-stop` nudge has been delivered — every later `pre-stop` in the same session allows the stop through instead of escalating. */
export function recordPreStopNudgeFired(projectRoot: string, sessionId: string): void {
  const filePath = preStopNudgePath(projectRoot, sessionId);
  try {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify({ fired: true }), 'utf8');
  } catch {
    // Best-effort, same posture as hookState.ts's recordFired: never let
    // recording the nudge be the reason the hook itself fails.
  }
}

/**
 * Ticket 21 (neuron-2.4.0): the write-only-store failure mode —
 * `sessionsObserved` is the signature of memories being added but recall
 * never firing, meaning the whole point of the tool isn't happening.
 * Literal `=== 0` only, not a low-but-nonzero band (that's general
 * recall-rate tuning, a separate, unscoped question), and only once the
 * store actually holds entries — a genuinely empty store hasn't failed at
 * anything yet, it just hasn't been used.
 */
export function buildZeroSessionsWarning(sessionsObserved: number, totalEntries: number): string | null {
  if (sessionsObserved !== 0 || totalEntries === 0) return null;
  return '[neuron] Warning: recall has never fired in a recorded session — memories are being written but never queried back. Run `neuron status --health` for detail.';
}
