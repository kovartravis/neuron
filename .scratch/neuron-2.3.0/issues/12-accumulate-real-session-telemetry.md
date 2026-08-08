Type: task
Status: resolved
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

- [x] A stated "enough" threshold (session/epoch count + category coverage)
- [x] Observed counts recorded at resolution time
- [x] Confirmation of at least one real `history` category injection

## Answer

**Threshold (defined at resolution, per Scope item 1):** more than the
2-session/0-epoch pre-`07` baseline, *and* real `history`-category
`injectedIds` present in a majority of the new-format sessions, not one
incidental hit — `08`'s stated suspicion is about `history` specifically, so a
single hit would prove existence but not support a per-category profile.

**Observed (2026-08-07, via `neuron exec -- neuron status` and a direct read
of `~/Library/Caches/neuron/hooks/a8541890092e7e49/`):**

- `recallCost.sessionsObserved: 7`, `epochsObserved: 5` — up from the
  2-session/0-epoch baseline. The 2 pre-`07` ledgers contribute 0 epochs
  (no `charsSpent`/`turns` field, so `summarizeRecallCost` never adds them to
  `epochCosts`); the 5 new-format ledgers each contribute one still-open
  epoch (no session has hit a `context-reset` yet, so `history` is empty in
  all 5 — a real gap noted below, not a blocker).
- Cross-referencing every `injectedId` in the 5 new-format ledgers against
  the `id:` frontmatter in `.neuron/{history,decisions,learning}.md`, all 44
  ids resolved (zero unresolved):

  | ledger | history | decisions | learning |
  |---|---|---|---|
  | `00461f3b` | 1 | 3 | 0 |
  | `074f7402` | 13 | 3 | 0 |
  | `40f9050d` | 2 | 3 | 0 |
  | `acf73004` | 10 | 3 | 0 |
  | `f1e99213` | 2 | 4 | 1 |
  | **total** | **28** | **16** | **1** |

  `history` is real in **5 of 5** new-format sessions (28 of 45 total
  injected ids) — the threshold is cleared with margin, since it's the
  dominant category rather than a single incidental hit. `decisions` is
  likewise well-sampled (16 ids, 5 of 5 sessions). `learning` is thin (1 id,
  1 of 5 sessions) — carried forward as a limitation for `08` to state, not a
  reason to keep waiting, since `08`'s own suspicion targets `history` and
  `learning` restating `CLAUDE.md`, and only the second leg is under-sampled.

**Known gap, not a blocker:** no session has yet rolled an epoch (all 5
`history` arrays are empty), so the sample so far is single-epoch per
session. `08` can characterize per-category content redundancy from this
(its Scope is about *what* is redundant, not how often a compaction
re-surfaces it), but cannot yet say anything about repeated-injection
behaviour across compactions. Left for `08` to note explicitly rather than
silently generalizing past what was actually observed.

**Ruling: enough has accumulated.** `08` is unblocked (its remaining blocker,
`07`, was already resolved).
