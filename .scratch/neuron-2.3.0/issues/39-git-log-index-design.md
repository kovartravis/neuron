Type: grilling
Status: unclaimed
Blocked by: (none)
Band: context cost

# 39 — Git-Log Index: Replace-vs-Supplement and Refresh Mechanism

## Question

Now that [14](14-git-log-hook-vs-agent-log-ab.md) has tested the premise
(hook-injected git-log search beat agent-invoked `git log` on every raw
number, though technically "no measured difference" by the harness's own
spread discipline — see `14`'s Answer) and the maintainer has ruled to
build it, how does the feature actually work: does a git-log index REPLACE
the `history` category's write step in the generated protocol block
(`sessionEndStep()` in `src/config/protocolBlock.ts`), only SUPPLEMENT it,
and does the index refresh via an installed git hook or a
check-HEAD-on-read comparison run at session-start/pre-prompt?

## Context

Carried over verbatim from this map's own fog (map.md's "Not yet
specified" — "The git-log-as-searchable-resident-source feature itself"),
which explicitly could not be ticketed until `14` answered whether the
premise held. It now has.

Two design questions, both real:

1. **Refresh mechanism.** A git hook (`post-commit`/`post-merge`) needs a
   separate install step during `neuron init` and can be silently bypassed
   (uninstalled, `--no-verify`'d around, or just never installed on a
   pre-existing clone). The map's own working lean is a check-HEAD-on-read
   comparison instead — compare the index's last-indexed commit SHA
   against `git rev-parse HEAD` at session-start/pre-prompt and re-index
   the delta if stale — which needs no install step and can't be silently
   skipped, but this was never decided, only leaned toward.
2. **Replace vs. supplement the `history` write step.** `history` entries
   that never correspond to any commit (this repo's own `.neuron/history.md`
   has examples — pure narrative/decision entries with no matching commit)
   are exactly what a git-log index cannot cover. If the index REPLACES the
   `history` write step in the protocol block, those entries stop getting
   captured anywhere. If it SUPPLEMENTS (both stay), the write-side cost
   `09` fought to shrink partially comes back. These are materially
   different products, not an implementation detail.

`14`'s task set and its git-log search prototype (`gitlog-search.mjs`) used
a generic `git log --grep` OR-matched keyword search — worth deciding
whether the shipped index reuses that primitive or something more
structured (a persisted per-commit summary, searchable via FTS like the
existing memory store) now that it's not just a measurement prototype.

## Scope

1. Rule refresh mechanism: check-HEAD-on-read vs. installed git hook (or
   both, with one as fallback).
2. Rule replace vs. supplement for the `history` write step, and what
   happens to entries with no corresponding commit under a "replace"
   ruling.
3. Rule the index's storage/search primitive: `gitlog-search.mjs`'s
   `git log --grep` shell-out verbatim, or a persisted structured index.
4. Rule where in the hook pipeline injection happens: session-start only
   (mirroring the architecture card), pre-prompt only (mirroring ordinary
   relevance recall), or both.
5. Scope what "the index" actually covers — full `git log`, or bounded
   (e.g. last N commits, or only commits touching paths related to the
   current prompt) — given `09`'s resident-footprint discipline this band
   has held to throughout.

## Verification

- Every Scope item has an explicit ruling, not left open.
- The ruling on item 2 (replace/supplement) explicitly addresses the
  no-corresponding-commit gap, not just the common case.
- Full design recorded either as an ADR (if it changes a documented
  contract like ADR 0014's adapter architecture) or inline in this
  ticket's Answer if it doesn't rise to that level — same judgment call
  `09` made about ADR 0014.

## Deliverables

- [ ] Rulings on all five Scope items, grilled with the maintainer
- [ ] Unblocks [40 — Implement the Git-Log Index](40-implement-git-log-index.md)
