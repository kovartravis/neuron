/**
 * Ticket 6 (neuron-2.4.3): the write-side analog of `discoveryHint.ts`'s
 * read-side nudge — delivered once per session via `pre-stop`. Wording
 * reuses Ticket 5's own proven A/B copy (`benchmarks/write-compliance-ab/
 * fixtures.mjs`'s `NUDGE_TEXT`, the exact text that moved compliance from
 * 20% to 100%), adapted for a real hook rather than that benchmark's
 * simulated `finish_task` tool ("call finish_task again" only makes sense
 * inside the harness that ran the A/B).
 */

export const PRE_STOP_NUDGE_TEXT =
  '[neuron] Before finishing: if you just fixed a failing command, build, or test, the Memory Store ' +
  'Protocol calls for recording it via `neuron memory add` before you stop. Do that now if it applies.';

/**
 * Returns the reminder text, or `null` when it doesn't fit `budget` —
 * dropped whole, never truncated, matching `buildDiscoveryHint`'s own
 * whole-entry-or-not rule.
 */
export function buildComplianceNudge(budget: number): string | null {
  return PRE_STOP_NUDGE_TEXT.length <= budget ? PRE_STOP_NUDGE_TEXT : null;
}
