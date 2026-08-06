Type: task
Status: resolved
Blocked by: none
Band: 2.2.0-rc2
Plan: [configurable-pruning/ab-test-plan.md](../../configurable-pruning/ab-test-plan.md) — executed
Result: [configurable-pruning/verdict.md](../../configurable-pruning/verdict.md) — **remove automatic pruning from 2.2.0**

# 24 — Pruning A/B: Does Automatic Pruning Earn Its Place in 2.2.0?

## Question

Can a 0.5B model be asked a better-posed question than "rate this 1–5" and
decide safely what to delete — and does pruning measurably improve retrieval at
all, or does it get removed from the release?

## What to do

**Execute [`.scratch/configurable-pruning/ab-test-plan.md`](../../configurable-pruning/ab-test-plan.md)
end to end.** It is self-contained and was written to survive a cleared session:
verified store facts, a code map with line numbers, both experiment protocols,
the pre-committed bars, the cleanup contract, and a list of rejected approaches
not to re-propose.

In outline:

- **Experiment 1** — label all 157 `history` entries plus ~20 `learning`/
  `decisions` negative controls, then score two arms against those labels.
  **A1** is a recoverability binary (*reconstructible from the repo or git?*);
  **A2** keeps 1–5 but re-shot on the 78 real labelled entries instead of the
  current generic exemplars. **Any false-delete on an unrecoverable entry
  disqualifies an arm outright.**
- **Experiment 2** — paired damage-vs-gain comparison, pruned store against
  untouched control, over a filtered slice of the real `query_logs`. Run 1 on
  the real store at 7-day retention; Run 2 on a synthesised ~1,500-entry corpus,
  because 235 entries may be too small for the effect to show.

## The bar, committed in advance

| Run 1 | Run 2 | Outcome |
|-------|-------|---------|
| Gain | — | Ship pruning as specified. |
| Null | Gain | Defer, don't delete — report the store size at which it pays. |
| Null | Null | **Remove automatic pruning from 2.2.0.** |
| Damage to an unrecoverable entry | — | Hard stop. |

The maintainer set this before any numbers existed and committed to the double-
null outcome explicitly. **Do not negotiate with it after seeing the results.**
Ticket `25` ships the config schema and the collision fix regardless of what
this ticket concludes.

## Safety

The live store is **read-only for the duration**. Everything runs against copies
under `NEURON_DB_PATH`. Verify after teardown that
`~/Library/Application Support/neuron/db/a8541890092e7e49.sqlite` is unchanged —
it was **2,916,352 bytes** on 2026-08-01.

## Notes

- Two traps that will silently invalidate a run: `NODE_ENV=test` hard-disables
  the model (`src/components/enricher.ts:232`), and `neuron exec` runs the
  **global** binary rather than the working tree — the failure that corrupted
  ticket `04`'s release verification.
- `benchmarks/longmemeval/retrieval_eval.py` is hardwired to LongMemEval. Copy
  its metric code; do not try to point it at the live store.
- This reverses ticket `06`'s shipped `importance: off` default on a better-posed
  question. If an arm wins, **ADR 0010 must record the reversal.**

## Answer

Resolved 2026-08-01, AFK, executing the plan end to end. **Both arms
disqualified in Experiment 1** — A1 (recoverability binary) false-deleted 2 of
11 ground-truth-unrecoverable entries (one ADR, one undocumented failure-fix
trap); A2 (recalibrated 1–5) false-deleted 4 of 11 (three ADRs, one more
trap) — after a scoring-integrity pass caught and corrected two labelling
errors in my own harness that, if left in, would have overstated the
disqualification. Per the plan's own section 3, a double disqualification
**"collapses Experiment 2, because there is no safe judgement to prune
with,"** so Run 1/Run 2 were not executed against the real or synthetic
store; the retrieval infrastructure (query filter, relevance labels, paired
comparison runner) was built and validated regardless and is reusable if a
future session clears a safe arm.

**Result: automatic pruning is removed from 2.2.0**, on strictly stronger
evidence than the plan's own double-null row — not "unproven benefit" but a
"demonstrated false-delete" against both proposed judgement mechanisms.
Ticket `06`'s `importance: off` default stands with no reversal needed;
ticket `25` ships its config-schema and collision-fix halves only, per its
own pre-written contingency for this outcome. Full numbers, labels, and the
false-delete detail: [`.scratch/configurable-pruning/`](../../configurable-pruning/)
(`REPORT.md`, `results-exp1.json`, `results-exp2.json`, `verdict.md`,
`labels.json`, `scripts/`). Live store verified byte-identical before and
after (2,916,352 bytes, MD5 `16c9555c39668438e1de1a10c18119d0`, unchanged
throughout).
