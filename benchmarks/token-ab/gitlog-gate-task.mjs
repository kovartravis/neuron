/**
 * Scope item 4 of ticket 11 (neuron-2.4.0): at least one task where the
 * relevance gate (`39`'s Scope item 6 — FTS-match required before a
 * dot-product rank) is expected to reject and stay silent, so this run
 * confirms the harness's grading treats "no injection fired" as a normal
 * outcome, not a crash or an automatic fail.
 *
 * A first draft of this task asked about "CSV export" from "the memory
 * store" — and the real gate fired anyway. `cleanFtsQuery`'s gate is an OR
 * across every non-stopword prefix in the query (`src/components/fts-query.ts`),
 * so it takes only ONE shared word against this repo's own ~200-commit,
 * self-referential corpus to pass — "memory", "store", "ticket", "commit",
 * even "repository" or "documented" are all real tokens somewhere in that
 * history. Verified live (2026-08-10) that ordinary engineering vocabulary
 * essentially never produces true silence here — itself a real finding,
 * reported in this ticket's own findings.md, not a bug in this task.
 *
 * This prompt was instead built by computing the full word set of
 * `git log --all --format=%s%n%b` (2865 unique tokens as of 2026-08-10) and
 * choosing content words verified to be neither a member of, nor a prefix
 * match against, any token in it — genuinely disjoint vocabulary, not a
 * hand-picked "obviously irrelevant" guess. Deliberately omits the other
 * three tasks' trailing "Write your answer... call finish_task" sentence:
 * `session.mjs`'s system prompt already gives that instruction once, and
 * repeating it here would reintroduce exactly the generic engineering
 * vocabulary this task exists to avoid.
 */

export const GATE_TASK = {
  id: 'no-git-history-match',
  prompt:
    'Does this host any yodeling festival recipe involving tarot readings, beekeeping falconry rituals, and glockenspiel intonation?',
  check(answerText) {
    const t = answerText.toLowerCase();
    const deniesIt = ['no', 'not', "doesn't", 'does not', 'nothing', 'none', "isn't", 'is not', 'no such', 'no evidence'].some(k => t.includes(k));
    const fabricatesYes = /\byes\b/.test(t) && !t.includes('no such') && !t.includes('does not');
    const passed = deniesIt && !fabricatesYes;
    return { passed, detail: `deniesIt=${deniesIt} fabricatesYes=${fabricatesYes}` };
  },
};
