Type: task
Status: unclaimed
Blocked by: none
Band: context cost

# 12 — Accumulate Real Per-Session Telemetry

## Question

Has enough real usage happened under `07`'s telemetry format for `08`'s
redundancy audit to sample from actual sessions rather than reconstructed
ones?

## Context

Surfaced while picking up [08](08-injection-redundancy-audit.md). `07`'s
design was resolved, but its code sat uncommitted — no session had ever run
under the new `{epoch, injectedIds, charsSpent, turns, history}` ledger
format, so there was no real per-session telemetry to sample at all. Two
pre-existing ledger files for this repo (`~/Library/Caches/neuron/hooks/`,
project hash `a8541890092e7e49`) predate the rewrite: old `{injectedIds}`-only
format, covering 2 sessions and 5 distinct entries, skewed away from
`history` (3 `learning`/`decisions`, 1 `history`, 1 unresolvable id) — far
too thin and too skewed for `08`'s per-category breakdown, and missing
`chars`/`turns` entirely.

`07`'s commit (this session) starts the clock: `rollEpoch`,
`recordSessionStartInjection` and `recordPrePromptTurn` now write real
`chars`/`turns`/`history` on every hook firing against this repo. This ticket
is the wait for that data to become an adequate sample — not work the agent
performs, but a real-world precondition `08` cannot substitute its way around
(the maintainer's ruling on `08`'s evidence-sourcing question: ship `07`,
then wait, rather than reconstruct from past queries or widen "real" to mean
this map's own working sessions).

## Scope

1. **Define "enough" before waiting on it** — not just a session count, but
   coverage: `08` needs real injected `history` entries specifically, since
   that's the category under suspicion and the one the current thin sample
   is missing entirely. A threshold in sessions alone could be satisfied
   without a single `history` injection.
2. **Track via `neuron status`'s `recallCost` section** (`sessionsObserved`,
   `epochsObserved`) as the session/epoch count signal; cross-reference
   `injectedIds` in each still-open epoch's ledger file against `.neuron/`
   to confirm category coverage, since `history` archives only aggregate
   `chars`/`turns`, not which categories were hit.
3. **Resolve by recording what accumulated**, not by performing an action —
   the answer is a fact (session count, epoch count, category coverage
   observed) at the moment it's judged sufficient, not a design decision.

## Verification

- `neuron status`'s `recallCost.sessionsObserved` / `epochsObserved` are
  both non-trivial (more than the 2-session baseline this ticket started
  from).
- At least one real, non-reconstructed `history` injection is confirmed via
  a still-open epoch's `injectedIds` cross-referenced against `.neuron/`.
- The resolution states the exact counts observed, so `08` can judge
  adequacy rather than re-deriving it.

## Deliverables

- [ ] A stated "enough" threshold (session/epoch count + category coverage)
- [ ] Observed counts recorded at resolution time
- [ ] Confirmation of at least one real `history` category injection
