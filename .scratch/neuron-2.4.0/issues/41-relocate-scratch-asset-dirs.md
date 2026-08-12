Type: task
Status: unclaimed
Blocked by: none

# 41 — Relocate `.scratch` Asset Directories & Fix Their ADR Links

## Question

Per [26](26-migrate-scratch-to-tickets-category.md)'s ruling: 4 of
`.scratch/`'s top-level directories are linked assets for already-resolved
`neuron-2.2.0` tickets, not wayfinder efforts, and don't fit the `tickets`
category schema. Relocate them (`git mv`, preserving history) rather than
migrating them as tickets:

- `.scratch/configurable-pruning/` → `benchmarks/pruning-ab/` (or
  equivalent naming consistent with `benchmarks/token-ab`,
  `benchmarks/architecture-card-ab`) — the experiment harness (scripts,
  JSON logs, `verdict.md`, `REPORT.md`) for `neuron-2.2.0` ticket `24`.
- `.scratch/salvage-expansion/` → `benchmarks/salvage-expansion/` — the
  calibration probe for `neuron-2.2.0` ticket `07`.
- `.scratch/md-first/` → `docs/design/md-first/` — the superseded
  `md-only` design spec resolving `neuron-2.2.0` ticket `28`, cited by
  ADR 0011.
- `.scratch/write-side-enrichment/` → `docs/design/write-side-enrichment/`
  — the shipped/superseded write-side-enrichment spec for `neuron-2.2.0`
  ticket `06`, cited by ADR 0010.

Also delete the 5 dead loose scripts at `.scratch/*.py` (`add_mem.py`,
`check_saved.py`, `log_adr.py`, `log_final_session.py`, `log_session.py`)
— pre-CLI one-off loggers, confirmed zero references elsewhere in the repo.

Update the two ADRs that link these paths directly: ADR 0010's line 268
(`.scratch/salvage-expansion/` → new path) and ADR 0011's lines 7–8
(`.scratch/md-first/spec.md` → new path; its ticket `28` citation is
covered by [40](40-migrate-wayfinder-efforts-to-tickets.md) instead).
Check each relocated dir's own internal relative links (e.g.
`salvage-expansion/README.md` links back to
`../neuron-2.2.0/issues/07-query-expansion.md`) and repoint them at
wherever `40` lands that ticket in the `tickets` category.

## Comments

- Graduated 2026-08-12 from [26](26-migrate-scratch-to-tickets-category.md)'s
  resolution, alongside [40](40-migrate-wayfinder-efforts-to-tickets.md) and
  [42](42-sweep-scratch-references-and-delete.md).
