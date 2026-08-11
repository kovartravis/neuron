import { Memory } from '../models/index.js';

/**
 * The payload budget, per ADR 0014 §4: no relevance floor ships (ticket 39
 * found every cosine floor from 0.50-0.70 regresses recall on real
 * conversational text), so the character ceiling is the *sole* volume
 * control, and it must sit strictly below the smallest known harness cap so
 * neuron never relies on spill-to-file — spill hands the model a preview and
 * a path, which turns deterministic recall back into agent-invoked recall at
 * exactly the moment the payload is largest.
 *
 * Claude Code's own documented cap is 10,000 characters (`additionalContext`
 * / `systemMessage` / stdout). Codex CLI's is ~2,500 tokens, which neuron
 * counts as characters rather than tokens (exact, free, and tokenising on the
 * hook path would spend per-turn latency approximating a limit one harness
 * already states in characters) — even a generous 4 chars/token reading of
 * that cap is 10,000 chars, and a conservative 3 chars/token reading is
 * 7,500. Both budgets below are chosen to sit under every one of those
 * readings, not just Claude Code's own cap, since this module is shared by
 * every adapter (ticket 13 onward).
 */
export const SESSION_START_CHAR_BUDGET = 6000;

/** Small and asymmetric: this cost repeats every turn, deduplicated by the session ledger. */
export const PRE_PROMPT_CHAR_BUDGET = 1500;

/**
 * Ticket 08 (neuron-2.4.0): the git-log index's own reserved cap, carved out
 * of what's left of the epoch's `remaining` budget the same way the
 * re-injected architecture card already is — additive resident-footprint
 * cost, not exempt from the epoch accounting `07` (neuron-2.3.0) introduced.
 */
export const GIT_LOG_CHAR_BUDGET = 1000;

export function formatMemoryEntry(m: Memory): string {
  const tags = m.tags && m.tags.length > 0 ? ` (tags: ${m.tags.join(', ')})` : '';
  return `- [${m.category}] ${m.content}${tags}`;
}

export interface PayloadResult {
  text: string;
  includedIds: string[];
  droppedIds: string[];
}

/**
 * Packs `entries` (already rank-ordered by the caller's query) into `text`
 * under `charBudget` characters. Drops whole entries, never truncates one
 * mid-content — a half-entry can assert what only the full entry qualifies.
 * Skips over an entry that doesn't fit and keeps trying smaller ones behind
 * it, rather than stopping at the first miss, so a budget is used as fully as
 * rank order allows. Callers are responsible for leaving dropped entries out
 * of the session ledger so they stay eligible on a later, smaller turn.
 */
export function buildPayload(entries: Memory[], charBudget: number, header?: string): PayloadResult {
  const includedIds: string[] = [];
  const droppedIds: string[] = [];
  const lines: string[] = [];
  let used = header ? header.length + 1 : 0;

  for (const entry of entries) {
    const line = formatMemoryEntry(entry);
    const cost = line.length + 1; // + joining newline
    if (used + cost > charBudget) {
      droppedIds.push(entry.id);
      continue;
    }
    lines.push(line);
    includedIds.push(entry.id);
    used += cost;
  }

  const body = lines.join('\n');
  const text = header ? (body ? `${header}\n${body}` : header) : body;
  return { text, includedIds, droppedIds };
}
