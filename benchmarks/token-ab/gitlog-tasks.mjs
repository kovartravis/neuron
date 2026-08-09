/**
 * Task manifest for ticket 14 (Git-Log Recall: Hook-Injected Search vs
 * Agent-Invoked `git log`). Reuses ticket 10's harness verbatim (Scope item
 * 1) — same grading discipline (`grading.mjs`, no LLM judge), same
 * deterministic-check-against-/ANSWER.md shape.
 *
 * Unlike ticket 10's tasks (grounded in .neuron/ memory-store content),
 * every task here is grounded in real facts recoverable ONLY from this
 * repo's own git history — commit subjects/bodies, not markdown memory —
 * per Scope item 2 ("prior git history plausibly changes the correct
 * action... not tasks where git history is irrelevant"). Each task also
 * declares `gitLogQuery`: the keyword terms the harness's minimal
 * hook-injection prototype (gitlog-search.mjs) searches for on the
 * 'gitlog' arm. These terms were chosen and verified (see ticket 14's own
 * Comments) to surface the real target commit(s) within the top results —
 * not hand-picked to contain the answer itself, which would trivialize the
 * arm rather than test it.
 */

import { containsAny, hasUnnegatedKeyword } from './grading.mjs';

export const TASKS = [
  {
    id: 'isolation-gap-fixed-twice',
    gitLogQuery: ['isolat'],
    prompt:
      "This repository has a recurring bug class: CLI tests that leak real writes into this repo's own .neuron/decisions.md instead of running against an isolated fixture. Has this been fixed more than once? If so, name every ticket number involved, in order, and briefly say what the later fix covered that the earlier one missed. Write your answer to /ANSWER.md, then call finish_task.",
    check(answerText) {
      const t = answerText.toLowerCase();
      const mentionsTicket42 = /\bticket\s*#?\s*42\b/.test(t);
      const mentionsTicket23 = /\bticket\s*#?\s*23\b/.test(t);
      const saysMultipleFixes = ['twice', 'two times', 'more than once', 'two separate', 'a second time', 'second fix'].some(
        k => hasUnnegatedKeyword(t, k)
      );
      const deniesMultiple = ['only once', 'never fixed', 'only one fix', 'not fixed before'].some(k =>
        t.includes(k)
      );
      const passed = mentionsTicket42 && mentionsTicket23 && saysMultipleFixes && !deniesMultiple;
      return {
        passed,
        detail: `ticket42=${mentionsTicket42} ticket23=${mentionsTicket23} multiple=${saysMultipleFixes} denies=${deniesMultiple}`,
      };
    },
  },
  {
    id: 'reconcile-data-loss-fix',
    gitLogQuery: ['DualStorageRouter', 'reseed', 'strict mirror'],
    prompt:
      "A change to this repository's per-category storage configuration (making a config override always-live instead of conditional) surfaced and fixed a real data-loss bug in the storage-reconcile code path. Which component had the bug, what did it incorrectly do on a category's first sighting, and what does it do now instead? Write your answer to /ANSWER.md naming the component and describing both the old (buggy) and new (fixed) behavior, then call finish_task.",
    check(answerText) {
      const t = answerText.toLowerCase();
      const namesComponent =
        t.includes('dualstoragerouter') || t.includes('reconcilecategorywithpathguard') || (t.includes('reconcile') && t.includes('router'));
      const identifiesBug = containsAny(t, ['strict mirror', 'strict-mirror', 'fell through', 'fall through', 'destructive']);
      const identifiesFix = hasUnnegatedKeyword(t, 'reseed');
      const passed = namesComponent && identifiesBug && identifiesFix;
      return { passed, detail: `component=${namesComponent} bug=${identifiesBug} fix=${identifiesFix}` };
    },
  },
  {
    id: 'session-budget-granularity',
    gitLogQuery: ['token budget', 'rollEpoch', 'clearLedger', 'recallCost'],
    prompt:
      "This repository's recall hook enforces a character budget on what it injects. Is that budget tracked per session or per something else? State the default numeric budget (in characters), what unit it's published at (chars per token), and what happens once it's exhausted. Write your answer to /ANSWER.md, then call finish_task.",
    check(answerText) {
      const t = answerText.toLowerCase();
      const saysEpoch = containsAny(t, ['per-epoch', 'per epoch']);
      const hasBudgetValue = /\b18,?000\b/.test(t);
      const saysHardStop = containsAny(t, ['hard stop', 'hard-stop', 'stops further', 'blocks further', 'halts']);
      const passed = saysEpoch && hasBudgetValue && saysHardStop;
      return { passed, detail: `epoch=${saysEpoch} value=${hasBudgetValue} hardStop=${saysHardStop}` };
    },
  },
];
