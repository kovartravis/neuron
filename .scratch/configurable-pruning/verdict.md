# Verdict — Ticket 24

## The bar, restated (committed before any numbers existed)

| Run 1 | Run 2 | Outcome |
|-------|-------|---------|
| Gain | — | Ship pruning as specified. |
| Null | Gain | Defer, don't delete — report the store size at which it pays. |
| Null | Null | **Remove automatic pruning from 2.2.0.** |
| Damage to an unrecoverable entry | — | Hard stop. |

## What happened

Experiment 1 disqualified **both** candidate judgement arms before Experiment
2 could run at all:

- **A1 (recoverability binary)**: 2 of 11 ground-truth-unrecoverable entries
  false-deleted (one ADR, one undocumented failure-fix trap).
- **A2 (recalibrated 1–5 scale)**: 4 of 11 false-deleted (three ADRs, one
  undocumented trap).

`ab-test-plan.md` section 3 states the consequence explicitly: *"If both arms
disqualify, say so plainly — that is a legitimate result and it collapses
Experiment 2, because there is no safe judgement to prune with."* There is no
row in the table above for this outcome because the plan's author
anticipated it separately from Experiment 2's own null/gain axis — but it is
at least as strong a signal as the double-null row, and arguably stronger:
a double-null on Experiment 2 would mean pruning doesn't measurably help;
this result means neither proposed method can be trusted to decide *what*
to prune without eating real, valuable memory.

## Resolution

**Remove automatic pruning from 2.2.0.** Not deferred, not shipped disabled
— removed, per the same logic the double-null row already commits to, on
strictly stronger evidence (a demonstrated false-delete, not merely an
unproven benefit).

**Ticket 25 ships regardless**, as scoped: the config schema and the
default-importance/default-threshold collision fix close a live data-loss
hazard on their own merits and do not depend on this verdict. Ticket 25
should scope itself to closing the collision (e.g. raising the default
`maxPruneImportance` below the default entry importance, or requiring an
explicit threshold with no default) and to leaving the `prune` block
entirely out of what `neuron init` scaffolds as an active feature, since
there is currently no safe automatic trigger to wire it to.

**ADR 0010** does not need the reversal note anticipated in ticket 23's
"Inherited caveat" — that note was conditional on a winning arm turning
`importance: off` back on, which did not happen. The `off` default from
ticket 06 stands, now with an independent confirmation from this ticket
rather than a contradiction.

**Revisit conditions**, per `results-exp2.json`'s closing note: a future
attempt should either use a model materially better than 0.5B at this task,
or sidestep the ADR failure mode structurally (never infer importance for
`decisions` at all, only for `history`, since that mode never should have
had prune exposure in the first place) — that alone doesn't fix the two
content-only misses, but it removes half of A2's false-deletes and one of
A1's by construction rather than by hoping the model reads more carefully.

## Numbers

See `results-exp1.json` (full per-arm metrics and false-delete detail) and
`results-exp2.json` (why Experiment 2 was not executed, and what
infrastructure exists ready to run it once a safe arm exists).
