Type: task
Status: unclaimed
Blocked by: none
Band: dogfooding feedback (travisos)

# 20 — Ship `neuron doctor`

## Question

Build one command that surfaces store-health signals a maintainer
currently has to compute by hand: duplicate/near-duplicate groups,
importance histogram, superseded-entry count, and whether recall is ever
invoked (`sessionsObserved`). Decide whether this is a new `neuron doctor`
subcommand or an extension of the existing `neuron status`.

## Context

Reported 2026-08-10 via dogfood feedback from `travisos`: "everything I
did by hand ... is mechanically detectable and should be one command."
Some of the underlying data already exists and just needs surfacing
together:

- `sessionsObserved` is already computed at `src/harnesses/ledger.ts:186`
  and exposed via `neuron status`'s `recallCost` (see
  [21](21-warn-on-zero-sessions-observed.md), which is about warning on
  it, not computing it).
- Superseded-entry count is a straightforward filter over `supersededBy`,
  already a first-class `Memory` field
  (`src/storage/mdStorageAdapter.ts:30`).
- Near-duplicate group detection can reuse `findSupersessionCandidate`'s
  embedding-similarity machinery (`src/index.ts:839`), run pairwise across
  the store rather than one-candidate-at-a-time against a single new
  write.
- Importance histogram is a new, simple aggregation — no existing
  primitive to reuse.

`src/commands/status.ts` already exists as a `--check`/`--repair`
surface for config-integrity findings (undeclared categories, field
compliance). Worth deciding explicitly whether store-health checks belong
there instead of a new binary, before building a second command that
maintainers have to remember to run.

## Scope

- Decide `doctor` vs. `status` extension (see Context).
- Implement: duplicate/near-duplicate group listing, importance
  histogram, superseded-entry count, `sessionsObserved` surfaced (or
  delegate that half entirely to [21](21-warn-on-zero-sessions-observed.md)
  if it lands first).
- Human-readable default output; consider a `--json` flag matching the
  rest of the CLI's existing JSON-output convention (`memory.ts`'s
  `console.log(JSON.stringify(...))` pattern) for scriptability.

## Comments

- Chartered 2026-08-10 from the same dogfooding feedback batch as
  [18](18-fix-concurrent-write-data-loss.md),
  [19](19-non-interactive-write-mode-for-cron.md), and
  [21](21-warn-on-zero-sessions-observed.md).
