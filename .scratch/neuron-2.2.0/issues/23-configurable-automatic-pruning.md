Type: grilling
Status: unclaimed
Blocked by: none
Band: 2.2.0-rc2
Priority: high — carries a live data-loss hazard (see Context)

# 23 — Configurable Automatic Pruning

## Question

What should pruning look like now that categories are user-declared — which
categories get pruned, on what schedule, by whose decision, and how does that
schedule run without a user remembering a command?

## Context

Spun out of ticket `06`'s grilling on 2026-08-01.

Pruning was designed when the store had exactly two fixed categories. It is
hardcoded to `category = 'history'` in the prune statement, and the only knobs
are `pruneHistoryBeforeDays` and `maxPruneImportance`, both reachable solely
through `neuron memory prune`.

Since `neuron.yaml` made categories user-declared, that has been wrong in both
directions:

- A project declaring its own transient category — `scratch`, `session`,
  `triage` — **cannot prune it at all**. The one category the feature serves is
  the one the config no longer guarantees exists.
- A project that wants its history kept forever **cannot stop history from being
  the prune target**; it can only decline to run the command.

### The live hazard

Default entry importance is `3`. Default `maxPruneImportance` is `3`. The prune
is `importance <= ?`. So the defaults collide: **every history entry written at
default importance is prune-eligible.**

The `CLAUDE.md` protocol's step-4 history command passes no `--importance` at
all, so *every history entry this project has ever written* sits at `3` and is
deleted by a bare `neuron memory prune` once it passes 30 days. This is true
today, with no model involved, and it is a `DELETE` with no supersession flag and
no undo.

Ticket `06` declined to paper over this with a clamp on inferred importance,
deliberately: the collision is between the default *value* and the default
*threshold*, one number apart, and belongs here rather than being worked around
in the enrichment path.

## Scope

1. Per-category prune policy in `neuron.yaml` — which categories are prunable,
   after how long, below what importance. Opt-in or opt-out is part of the
   question, not a given.
2. Resolve the default-importance / default-threshold collision. Options include
   moving the threshold below the default, making the prune exclusive rather than
   inclusive, or requiring an explicit threshold with no default at all.
3. Decide whether pruning becomes automatic, and if so what triggers it. Ticket
   `06`'s enrichment backlog drains on the next memory command when non-empty,
   guarded by a cheap count — a precedent worth considering, but pruning is
   destructive where enrichment is not, so it may warrant a different posture.
4. Decide whether pruning should delete at all, or mark superseded the way ADR
   0010 §6 requires of consolidation dedupe. A reversible flag flip and a
   permanent `DELETE` are very different risk profiles for the same intent.
5. Migration for existing users, whose current defaults would change.

## Notes

- Does **not** block ticket `06` — enrichment owns its own trigger and does not
  depend on the maintenance schedule this ticket designs.
- Should be scheduled **soon after** `06`: `06` puts a 0.5B model in charge of
  the field that gates deletion, and this ticket owns the guard rails around it.
  `06`'s new *Importance Inference & Prune Safety* pillar is the instrument that
  will show whether those guard rails hold.
- Interacts with ticket `08` (consolidation dedupe), which introduces
  supersession semantics this ticket may want to reuse rather than duplicate.
