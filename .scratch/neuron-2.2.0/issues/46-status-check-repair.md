Type: task
Status: unclaimed
Blocked by: 43, 44
Band: 2.2.0-rc5

# 46 — `neuron status --check`/`--repair`: Report and Repair Non-Compliant Entries

## Question

Implement the validation surface [36](36-configurable-frontmatter-schema.md)
reopened, folded into `neuron status` rather than a new top-level command (the
map's no-new-commands non-goal stays intact).

`--check` lists entries that violate a category's currently-declared schema —
covering entries written before a field was declared required, per `36`'s
read-and-report answer (reads never hard-error on old data; only new
create/update writes are gated, per `43`).

`--repair` fixes what's safely fixable:
- Applies a configured `default:` fallback where one exists.
- Offers **centroid-based inference for enum-typed fields only** — same
  content-to-label mechanism as `06`'s tag/category centroids, which measured
  9/9 against the model's 1/9.
- **Never fabricates a value for a free-text identity field** (`reviewedBy`,
  `ticket`, …). There is no content signal that could produce a person's name
  or a ticket number, and this map has already measured this exact failure
  shape three times (`06`'s importance noise, `08`'s ruled-out dedupe, `35`'s
  reader-side fabrication bug). Those fields are only listed as missing, for a
  human or an agent told to go find the real answer.

Needs `44` (SQLite column parity) so `--check`/`--repair` cover `vector-only`
entries identically to `md` entries, not just markdown files.

## Comments

- Graduated from [36](36-configurable-frontmatter-schema.md)'s grilling,
  2026-08-03.
