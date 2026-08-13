Type: task
Status: claimed
Blocked by: none

# 40 — Migrate the 9 Wayfinder Efforts into the `tickets` Category

## Question

Per [26](26-migrate-scratch-to-tickets-category.md)'s ruling: mechanically
migrate the 9 real wayfinder efforts under `.scratch/` — `2.1.x-hardening`,
`agent-memory-cli`, `architecture-scans-2.1.0`, `hybrid-search`,
`md-file-management`, `neuron-2.2.0`, `neuron-2.3.0`, `neuron-2.4.0` (this
map — snapshot-then-cutover, see below), `saas-features` — into the
`tickets` category [25](25-implement-neuron-tracker.md) declared.

Per effort:

- `map.md` becomes a `tickets`-category entry with no `kind`, content =
  the full map body.
- Each `issues/NN-*.md` becomes a `tickets`-category entry: `Status:` →
  `status`, `Type:` → `kind`, body (including any `## Answer`) → content.
- Assign identity via `neuron memory add`'s own generated UUID, never the
  old sequential number (numbers collide across concurrent maps today).
  Two-pass: pass one creates every entry and records an
  `<effort-slug>#<old-number> → <new-id>` table; pass two rewrites
  `blockedBy` and in-content `[NN](...)` cross-links using that table, via
  `neuron memory update`. Keep the old number in prose (not as the real id)
  so existing external citations — git history, `.neuron/*.md`'s frozen
  entries — stay human-resolvable.
- `neuron-2.4.0` is migrated exactly as it stands when this ticket runs,
  including whatever is true of this very ticket's own migrated form at
  that point. Once migrated, all further wayfinder work on `neuron-2.4.0`
  targets the `tickets` category; `.scratch/neuron-2.4.0` becomes a frozen
  snapshot for [42](42-sweep-scratch-references-and-delete.md) to delete.

Verify before considering this done: spot-check a sample of migrated
entries against their source files (content, `blockedBy`, cross-links all
correct), and confirm `neuron memory list --categories tickets --json`
filtered per `docs/agents/issue-tracker.md`'s frontier convention finds the
same open/unblocked set the old per-effort `.scratch` bookkeeping would
have, for at least the two largest efforts (`neuron-2.2.0`, `neuron-2.4.0`).

Does not include relocating the 4 non-effort asset directories (that's
[41](41-relocate-scratch-asset-dirs.md)) or sweeping/deleting anything
outside the 9 effort directories themselves (that's
[42](42-sweep-scratch-references-and-delete.md), blocked on this ticket).

## Comments

- Graduated 2026-08-12 from [26](26-migrate-scratch-to-tickets-category.md)'s
  resolution, alongside [41](41-relocate-scratch-asset-dirs.md) and
  [42](42-sweep-scratch-references-and-delete.md).
