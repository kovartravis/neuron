Type: task
Status: resolved
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

## Answer

**`doctor` vs. `status` extension: extension, not a new command.** This is
the same question ADR 0013's own ticket 36 (neuron-2.2.0) already answered
for the config-validation surface — "ruled out twice, once on cost, once
via the no-new-commands non-goal," folded into `neuron status
--check`/`--repair` instead — and status.ts's own doctrine comment says so
in as many words. Store-health signals are a different *kind* of finding
(data-quality, not config-schema compliance) but the same precedent
applies: a third mutually-exclusive report mode, `--health`, joins
`--check`/`--repair` rather than shipping a `neuron doctor` binary.

**Implementation:**

- `NeuronMemory.getStoreHealth()` (`src/index.ts`, next to
  `findSupersessionCandidate`): reuses that same method's embedding-cosine
  machinery and `SUPERSESSION_SIMILARITY_THRESHOLD`, run pairwise across
  every live (non-superseded) row instead of one candidate at a time, per
  the ticket's own Context steer. Near-duplicates are grouped via a plain
  union-find rather than reported as raw pairs, so a chain (A~B, B~C) reads
  as one 3-entry group instead of two overlapping pairs — closer to what a
  maintainer triaging the list actually wants to see. Superseded rows are
  excluded from clustering (already resolved) but still counted toward
  `supersededCount`. Importance histogram is a straightforward `GROUP BY`
  in memory, keyed 1-5.
- `neuron status --health` (`src/commands/status.ts`): human-readable text
  by default, `--json` for the scriptable form (matches `scan.ts`'s
  `--format md|json` convention, per the ticket's own Scope ask).
  `sessionsObserved` is surfaced here directly rather than delegated —
  [21](21-warn-on-zero-sessions-observed.md) (the ticket that actually owns
  that metric's warning surface) hasn't landed yet, so `--health` reads it
  from the same `summarizeRecallCost` call `status`'s default JSON payload
  already uses and prints a one-line warning inline when it's `0`. This is
  *not* a resolution of `21` — `21`'s own Scope wants a warning on every
  `status` run or a session-start hook, proactive rather than only on an
  explicit `--health` request; `21` stays open.
- `--health` registered in `RESERVED_FLAG_NAMES`
  (`src/config/neuronYaml.ts`) and `parseFlags` (`src/commands/utils.ts`),
  mutually exclusive with `--check`/`--repair` (three-way check in
  `status.ts`, generalized from the existing two-way one). `STATUS_HELP`
  and `MASTER_HELP` updated.

**Testing:** `src/commands/status.health.test.ts` drives
`handleStatusCommand` in-process with a content-dependent embedder (same
pattern `memory.supersession.test.ts` uses), since near-duplicate detection
needs a real similarity signal the subprocess tests' all-zero
`NEURON_MOCK_EMBEDDER` can't provide — isolates
`NEURON_HOOK_CACHE_DIR` per-test so `sessionsObserved` doesn't pick up this
repo's own real dogfooded ledger data. Covers: empty-store zeros,
near-duplicate grouping with an unrelated entry correctly excluded,
superseded-exclusion-but-still-counted, the importance histogram, the
human-readable-vs-`--json` switch, and the three-way mutual exclusivity.
`npm test` 659/659 (was 653), `tsc` clean.

**Live-verified against this repo's own real store** (`node dist/cli.js
status --health`), not just fixtures. Found two real, previously-invisible
things along the way: leftover exact-duplicate test-fixture strings
("Always test first", "Fix for build error: pass --no-cache...", "original
content") that leaked into this repo's real dev database from
pre-isolation test runs — store pollution, not a code bug. And a legitimate
near-dup class: several architecture-card bodies duplicated across the
`decisions` and `architecture` categories at ~0.985-1.0 similarity, dating
from the `scan: category: decisions` alias period ticket 01 reverted — the
old `decisions`-category cards were never cleaned up after the revert.

### Addendum: `--health --repair`, same session, direct follow-up request

The maintainer asked immediately after the above: does this actually fix
anything, or only report? Correctly just reports — added a repair mode
rather than chartering a separate ticket, since it's squarely inside this
ticket's own subject and the maintainer was live in the session.

**Design:** within each near-duplicate cluster `getStoreHealth` already
finds, split members by byte-identical `content`. A content-identical
subgroup (>1 member) is safely mergeable with zero judgment — there is no
wording difference to adjudicate, so the latest-created member survives and
the rest are marked `supersededBy` it (never deleted, per ADR 0015,
`memory.transact`'s ordinary `update` path). A cluster that still has more
than one *distinct* content string after that merge — real near-duplicates,
similar embedding but different wording — is left in `unresolved` rather
than guessed at, mirroring `repairFieldCompliance`'s own refusal to
fabricate a free-text field: a human resolves those via
`--supersedes`/`--not-a-reversal`.

**CLI:** `neuron status --health --repair`. Unlike `--check`/`--repair`,
which stay mutually exclusive with `--health`, `--repair` now *combines*
with `--health` (different meaning than bare `--repair`, which still means
field-compliance repair) — `--check` is the only flag that still can't
combine with either. Human-readable by default, `--json` for scripting;
exits 1 if anything is left unresolved, matching `--repair`'s own exit-code
convention.

**Implementation:** `NeuronMemory.repairStoreHealth()` (`src/index.ts`, next
to `getStoreHealth`) and `formatStoreHealthRepairText`
(`src/commands/status.ts`). `DuplicateGroupEntry` gained a `createdAt` field
(needed to pick the survivor) — a straightforward, non-breaking addition
since it's an ordinary new object property, not a signature change.
`DuplicateMergeOutcome`/`StoreHealthRepairReport` added to
`src/models/memory.ts`. `STATUS_HELP`/`MASTER_HELP` updated.

**Testing:** 4 new cases in `status.health.test.ts` — full-group exact
merge (nothing unresolved), a mixed cluster (2 exact dupes + 1 differently
worded, merge the dupes, leave the pair unresolved), exit-code behavior,
and the human-readable-vs-`--json` switch. `npm test` 663/663 (was 659),
`tsc` clean.

**Run for real against this repo's own store**, at the maintainer's
explicit go-ahead (confirmed first, since this mutates real data with no
CLI path to reverse a supersession mark once set): merged 30 of the 34
groups found earlier — 155 stale test-fixture-pollution entries marked
superseded by their most-recent duplicate. Left the 5 real architecture-card
near-dups unresolved, exactly as designed — their wording genuinely differs
by module, so no automatic merge guessed at which one was "right". Verified
via `git diff .neuron/`: every change is an in-place frontmatter addition
(`supersededBy`/`supersededAt` on the existing entry block), zero content
deletions or duplications. `neuron exec -- npm test` 663/663 after the real
repair ran.
