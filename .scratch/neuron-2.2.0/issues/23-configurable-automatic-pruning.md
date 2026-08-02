Type: grilling
Status: resolved
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

## Answer

Resolved 2026-08-01 by grilling. Ten decisions, then a split into two execution
tickets. Full detail and the rejected-alternatives list:
[`.scratch/configurable-pruning/ab-test-plan.md`](../../configurable-pruning/ab-test-plan.md).

**Purpose.** Pruning is a **recall-quality** feature for history-shaped noise
only. Not disk (the DB is 2.9 MB at 235 entries), not ADRs. This single answer
killed three branches: it removed the storage justification, made soft-delete
pointless for a feature whose purpose is to remove things from reads, and set
the ship bar in §"The bar" below.

**Mechanism.** Hard `DELETE`, no undo. A pre-delete JSONL export was offered and
declined. A soft-delete flag was rejected on cost — `memories` has 21 read sites
in `src/index.ts` (~10 live readers) plus a separate `memories_fts` rowid copy,
each a place a missed filter silently leaks pruned rows into recall or hides live
ones. Ticket `08`'s supersession is **not** reused: *superseded* means "a newer
memory replaced this" (lineage worth keeping), *pruned* means "routine and old" —
same mechanism, different meanings, and `08` has not made that design yet.

**Config.** Per-category, opt-in, with **absent `prune` block meaning never
pruned**:

```yaml
categories:
  history:
    defaultImportance: 2
    prune:
      after: 30d
      maxImportance: 2
```

No existing `neuron.yaml` has a `prune` block, so **no upgrade can delete
anything** — that is the entire migration story, and it resolves scope item 5 by
construction. `neuron init` scaffolds the block commented out so it is
discoverable without being armed.

**Trigger.** Lazily, off `neuron memory query`, behind a `last_prune_check_at`
key in `meta` with a 24h skip — one indexed lookup on the common path, not a
count per read. Precedent: `drainEnrichmentIfPending` (`src/index.ts:694`).

**Gate.** `age > retention AND importance <= maxImportance`. A **usage gate was
proposed and explicitly rejected**: deleting what is never retrieved punishes
rarity, and the rare-but-critical failure fix is exactly the entry that goes
untouched until the day it matters. The engine at `src/index.ts:898-935` exists
and works, but is for scope promotion only.

**Importance.** The field carries no signal today: **155 of 157 history entries
sit at the default `3`**, and the two exceptions are not meaningfully more
important than the rest. The cause of the model's failure in ticket `06` was
diagnosed as **the ask, not the model** — `src/components/enricher.ts:290`
demands an absolute scalar on an underspecified concept, with generic exemplars,
ignoring the **78 real labelled `learning`/`decisions` entries** available for
calibration. Two replacements go to A/B in ticket `24`: a **recoverability
binary** (*reconstructible from the repo or git?* — the criterion this repo's own
`CLAUDE.md` already states) against a **1–5 scale re-shot on real entries**.

**The bar, committed before any numbers existed.** Pruning must *beat* the
no-prune control, not merely match it — parity means the feature bought nothing
it claimed. Ticket `22` already measured recall@10 at 98.3%, which is direct
evidence retrieval is not currently noise-limited, so a null result is a live
possibility. **Double null ⇒ automatic pruning is removed from 2.2.0**, not
shipped disabled. Any false-delete of an unrecoverable entry disqualifies an arm
outright.

**Split.** This grilling produced the decisions; execution is two tickets, both
unblocked, both blocking `09`:

- **[24 — Pruning A/B](24-pruning-ab-test.md)** — runs the measurement and
  returns the verdict.
- **[25 — Prune Config & Collision Fix](25-prune-config-and-collision-fix.md)** —
  ships the schema, closes the importance collision, and makes the
  `neuron-memory` skill the one-stop setup shop. **Ships regardless of `24`.**

**Inherited caveat.** A winning arm reverses ticket `06`'s shipped
`importance: off` default; **ADR 0010 must record the reversal** rather than let
it drift.
