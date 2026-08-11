Type: task
Status: unclaimed
Blocked by: 25

# 26 — Migrate All 19 `.scratch/` Efforts into the `tickets` Category, Then Delete `.scratch/`

## Question

Per [14](14-neuron-as-tracker-design.md) and
[ADR 0018](../../../docs/adr/0018-neuron-as-issue-tracker.md)'s migration
ruling: bulk-migrate all 19 existing `.scratch/` effort directories into the
`tickets` category [25](25-implement-neuron-tracker.md) declares, in one
mechanical pass, then delete `.scratch/` from the repository.

Per effort directory:

- Each `map.md` becomes a `tickets`-category entry (no `type`; other
  entries' content references it as their map).
- Each `issues/NN-*.md` becomes a `tickets`-category entry: `Status:` →
  `status`, `Type:` → `type`, `Blocked by:` → `blockedBy` (ticket ids need
  translating to whatever id scheme the migration assigns — decide and
  record the id-collision-avoidance approach, since ticket numbers collide
  across concurrent maps today, e.g. "ticket 39" existing on both
  neuron-2.3.0 and elsewhere), body → content, any `## Answer` section
  preserved in content.
- This map (`neuron-2.4.0`) is itself one of the 19 and gets migrated
  mid-effort — including this very ticket's own migrated form. Decide how a
  live wayfinder session handles migrating the map it's currently working
  through (snapshot-then-cutover, or pause wayfinder sessions for the
  duration).

Verify the migration (spot-check a sample of migrated entries against their
source files, confirm frontier computation via the new
scan-and-filter convention finds the same open/unblocked set the old
`.scratch` bookkeeping would have) before deleting `.scratch/`.

## Comments

- Graduated 2026-08-11 from [14](14-neuron-as-tracker-design.md)'s
  resolution alongside [25](25-implement-neuron-tracker.md), blocked on it
  landing first.
