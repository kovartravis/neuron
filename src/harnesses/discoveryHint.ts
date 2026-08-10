/**
 * Ticket 06 (neuron-2.4.0): a per-turn hint that teaches the agent the
 * broader `neuron memory query` surface exists, fired only when this turn's
 * relevance-gated recall actually left something on the table — never a
 * generic "you can search" note, always the real command with the real
 * count. Counts against the same per-turn char budget as everything else
 * `hook.ts` injects (no reserved allotment), so a tight budget just drops it.
 */

/** Long enough to be recognisable, short enough that one turn's hint can't dominate a 1,500-char budget on its own. */
const HINT_PROMPT_MAX_CHARS = 80;

/** Collapses whitespace and escapes for display inside a double-quoted shell argument — this command is shown, never executed by neuron itself. */
function sanitizeForHint(promptText: string): string {
  const collapsed = promptText.replace(/\s+/g, ' ').trim();
  const truncated = collapsed.length > HINT_PROMPT_MAX_CHARS
    ? `${collapsed.slice(0, HINT_PROMPT_MAX_CHARS)}...`
    : collapsed;
  return truncated.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

/**
 * Returns the hint line, or `null` when there's no gap to point at
 * (`totalMatches <= injectedCount`) or the line can't fit `budget` — dropped
 * whole, never truncated, matching `buildPayload`'s own whole-entry-or-not
 * rule.
 */
export function buildDiscoveryHint(
  promptText: string,
  totalMatches: number,
  injectedCount: number,
  budget: number
): string | null {
  if (totalMatches <= injectedCount) return null;
  const command = `neuron memory query "${sanitizeForHint(promptText)}" --limit ${totalMatches}`;
  const hint = `- [more available] ${totalMatches - injectedCount} more match(es) not shown — run: ${command}`;
  return hint.length <= budget ? hint : null;
}
