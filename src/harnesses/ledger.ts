import fs from 'node:fs';
import path from 'node:path';
import { Memory } from '../models/index.js';
import { hookCacheDir, sessionFileKey } from './cacheDir.js';

/**
 * Pre-prompt injection is deduplicated by a session-scoped ledger (ADR 0014
 * §3): unconditional per-turn injection means a 50-turn session re-injects
 * the same entries 50 times, walking into the PersonaMem over-reasoning
 * result ticket 05 relied on. Neuron records which entry ids it has already
 * injected for a session and injects only the delta.
 *
 * A ledger older than this is treated as abandoned rather than tracked
 * forever — sessions that never fire `context-reset` (compaction) or end
 * cleanly would otherwise leak one file per session indefinitely.
 */
const STALE_MS = 24 * 60 * 60 * 1000;

/** Bounds ledger growth on a very long session; oldest ids evict first. */
const MAX_LEDGER_IDS = 500;

interface LedgerFile {
  injectedIds: string[];
}

function ledgerPath(projectRoot: string, sessionId: string): string {
  return path.join(hookCacheDir(projectRoot), `ledger-${sessionFileKey(sessionId)}.json`);
}

function loadLedger(projectRoot: string, sessionId: string): Set<string> {
  const filePath = ledgerPath(projectRoot, sessionId);
  try {
    const stat = fs.statSync(filePath);
    if (Date.now() - stat.mtimeMs > STALE_MS) return new Set();
    const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8')) as LedgerFile;
    return new Set(Array.isArray(parsed.injectedIds) ? parsed.injectedIds : []);
  } catch {
    return new Set();
  }
}

/** Returns the subset of `entries` this session has not already been shown. */
export function filterUnseen(projectRoot: string, sessionId: string, entries: Memory[]): Memory[] {
  const seen = loadLedger(projectRoot, sessionId);
  return entries.filter(e => !seen.has(e.id));
}

/** Records `ids` as delivered for this session, so a later turn skips them. */
export function markInjected(projectRoot: string, sessionId: string, ids: string[]): void {
  if (ids.length === 0) return;
  const filePath = ledgerPath(projectRoot, sessionId);
  const seen = loadLedger(projectRoot, sessionId);
  for (const id of ids) seen.add(id);
  let list = Array.from(seen);
  if (list.length > MAX_LEDGER_IDS) {
    list = list.slice(list.length - MAX_LEDGER_IDS);
  }
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify({ injectedIds: list } satisfies LedgerFile), 'utf8');
}

/**
 * Clears the delivered-ids ledger for a session. Bound to the `context-reset`
 * lifecycle point (ADR 0014 §5): compaction can silently drop an already-
 * injected entry from context while the ledger still says "delivered," so the
 * ledger is wiped rather than trusted across a compaction boundary. This is
 * why `context-reset` never needs to inject anything — clearing a ledger is a
 * side effect, not an injection, so it works even on harnesses whose
 * compaction hook ignores stdout.
 */
export function clearLedger(projectRoot: string, sessionId: string): void {
  const filePath = ledgerPath(projectRoot, sessionId);
  try {
    fs.rmSync(filePath, { force: true });
  } catch {
    // Best-effort: a missing ledger is already the desired state.
  }
}
