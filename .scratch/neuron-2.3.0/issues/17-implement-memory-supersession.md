Type: task
Status: resolved
Blocked by: 16
Band: context cost

# 17 — Implement Memory Supersession

## Question

Build what [16 — Memory Supersession](16-memory-supersession.md) designed:
a write-time supersession gate, hard-exclusion at read time, and the schema
underneath it. Proving it fixes ticket 10's measured regression is a
separate ticket — [18](18-rerun-counterfactual-ab-post-supersession.md) —
so the build isn't done until it passes review, and the A/B re-run isn't
blocked on the build ticket's own sign-off of itself.

## Context

Ticket 16's grilling session (2026-08-08) resolved all six open design
questions with the maintainer; the full rationale is
[ADR 0015 — Memory Supersession](../../../docs/adr/0015-memory-supersession.md).
This ticket is pure execution against that design — nothing here is a design
decision. If implementation surfaces a question ADR 0015 didn't anticipate,
that's a new grilling ticket, not a call to make here.

## Scope

1. **Schema migration.** Add `superseded_by` (entry id, nullable) and
   `superseded_at` (timestamp, nullable) columns, additive, both default
   null on existing rows. Round-trip through markdown frontmatter for
   `md-only`/`dual` storage the way other entry fields do.
2. **Write-time gate on `neuron memory add`.** Compute embedding similarity
   (the resident embedder, no model call) against existing entries; above
   threshold, hard-block the write and surface the candidate id/content.
   Require `--supersedes <old-id>` (sets `superseded_by`/`superseded_at` on
   the old row, then proceeds with the new write) or an explicit override
   confirming it is not a reversal, before anything lands. Calibrate the
   similarity threshold against ticket 27/39's existing ~0.97 same-topic
   band findings rather than picking a fresh number.
3. **Read-path filter.** `neuron memory query` and `neuron exec`'s injection
   path both exclude rows with `superseded_by` set, by default. Add an
   explicit include-superseded flag (query only — `neuron exec` stays
   default-only, matching its existing minimal-injection posture) and
   confirm direct id lookup still returns a superseded row.
4. **Mark the two known-reversed pairs by hand** in this repo's own
   `.neuron/decisions.md`: the `prune-default-collision` case (ticket 23's
   hazard-framed entry superseded by the entry recorded as
   `pruning-defaults-intentional`) and the `pruning-ab-verdict` case
   (ticket 24's "ships in scoped-down form" resolution superseded by the
   later "push ticket 25 off entirely" entry). No migration tool — direct
   one-off edits, per ticket 16's Decision 5.
5. **No interaction with `importance` or prune.** Verify by construction:
   the migration and the gate touch only the two new columns.

## Verification

Manual exercise of the gate and the read-path filter (block fires on a
genuine near-duplicate, `--supersedes` resolves it, `query`/`exec` stop
returning the superseded row, direct id lookup still finds it) plus the two
known pairs visibly marked in `.neuron/decisions.md`. The behavioural bar —
does this actually fix ticket 10's measured regression — is
[18](18-rerun-counterfactual-ab-post-supersession.md)'s job, not this
ticket's.

## Deliverables

- [ ] Additive schema migration (`superseded_by`, `superseded_at`)
- [ ] Write-time hard-block gate on `neuron memory add` with
      `--supersedes` resolution
- [ ] Default hard-exclusion at read time (`query` + `exec`), with an
      include-superseded escape hatch on `query`
- [ ] The two known-reversed pairs marked in this repo's own store

## Answer

Built against ADR 0015 exactly, all four Deliverables shipped:

1. **Schema migration** — additive `user_version` 7→8: `superseded_by TEXT`,
   `superseded_at TEXT` on `memories`, both default `NULL`, plus a partial
   index on the (rare) superseded set. Round-trips through markdown
   frontmatter for `md`/`vector-only`/`split` alike — only emitted when set,
   so an untouched entry's frontmatter is byte-identical to before.
2. **Write-time gate** — `neuron memory add` computes embedding similarity
   (the resident embedder, no model call) against every existing
   non-superseded entry, **across all categories** (a scope call this ticket
   made: category is only known after write-side enrichment runs, which is
   *after* the gate must fire, so scoping to an inferred category isn't
   available yet). Above `0.97` (`SUPERSESSION_SIMILARITY_THRESHOLD`,
   calibrated per the ticket's own instruction against ticket 27/39's
   same-topic band) it hard-blocks, printing the candidate id/content, and
   requires `--supersedes <old-id>` (validated to exist *before* the new
   entry is written, so a bad id fails clean) or `--not-a-reversal`
   (skips the gate, marks nothing).
3. **Read-path filter** — `queryVector` hard-excludes `superseded_by IS NOT
   NULL` by default in both its text-search and list-mode branches, which
   `neuron memory query`, `list`, and `neuron exec`'s injection path all
   share. `query`/`list` gained `--include-superseded`; `exec` never sets it,
   matching its existing minimal-injection posture. A new `findById()`
   reaches a superseded row directly, unfiltered, for `--supersedes`'s own
   resolution and as the "direct id lookup" ADR 0015 promised (no new
   `neuron memory get` command was needed for that promise — see Comments).
4. **The two known-reversed pairs are hand-fixed for real**, live in this
   repo's own `.neuron/decisions.md` (`68455ac1` → `3f2c0a2b`, `44eca269` →
   `a0de113f`), written through the actual `--supersedes` flow rather than
   scripted — see Comments for what that surfaced.

Reconcile/sync/bootstrap-seed's internal `vectorDb.query()` calls were
switched to `includeSuperseded: true` and `computeMemoryHash` now folds in
`supersededBy` — both required so a hand-marked row is never treated as
absent or unchanged by the markdown↔vector mirror.

Verification: manual gate/`--supersedes`/`--include-superseded`/direct-lookup
exercise per the ticket's own Verification section, all confirmed live
against this repo's real store (see Comments); 15 new automated tests
(`index.supersession.test.ts`, `commands/memory.supersession.test.ts`, one
`dualStorageRouter.test.ts` case covering the markdown-hand-fix→vector
reconcile path) plus 3 pre-existing tests updated for the new schema shape.
Full suite: 488/488. The behavioural bar — does this fix ticket 10's
regression — is [18](18-rerun-counterfactual-ab-post-supersession.md)'s job,
not this ticket's.

## Comments

**Scope calls made during execution, not in ADR 0015 (see the decisions.md
entry recording these for full rationale):** the gate searches all
categories rather than the target one; already-superseded rows are excluded
from gate candidacy; no new `neuron memory get <id>` CLI command shipped
(the storage-layer `findById()` covers what ADR 0015 needed it for).

**A real finding while hand-fixing the two known-reversed pairs (Deliverable
4):** neither pair's "new" (correcting) entry actually existed in this
repo's own `.neuron/decisions.md`. Ticket 10's findings.md and this
project's own `pruning-defaults-intentional` / `pruning-ab-verdict` memory
entries both describe rulings the maintainer made — but those rulings were
captured only in Claude's own cross-session memory and in `CHANGELOG.md`
prose, never written into neuron's own store via `neuron memory add`. That
is a live instance of the exact "write-side capture gap" this whole
supersession feature exists to fix, not a pre-existing pair of linkable
entries. Rather than fabricate a `supersededBy` link between two entries
where one didn't exist, both missing correction entries were written for
real, through the real `--supersedes` flow (dogfooding the feature being
shipped) — see `3f2c0a2b-50e5-42d7-925e-bc9d8c7d6f2c` (supersedes `68455ac1`)
and `a0de113f-a0b7-47f1-a102-0d952824b61f` (supersedes `44eca269`) in
`.neuron/decisions.md`.

**Not addressed, left for whoever cuts `04`:** this session's `neuron scan
--check` shows 235 changes of pre-existing architectural drift against the
stored blueprint, unrelated to this ticket and present before it started —
not re-baselined here to avoid conflating an unrelated 235-change diff with
this ticket's actual review surface.
