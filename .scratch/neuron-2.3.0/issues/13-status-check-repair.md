Type: task
Status: unclaimed
Blocked by: none

# 13 — `neuron status --check`/`--repair`: Report and Repair Non-Compliant Entries

## Question

Implement the validation surface [ADR 0013](../../../docs/adr/0013-configurable-frontmatter-schema.md)
reopened, folded into `neuron status` rather than a new top-level command (the
no-new-commands non-goal stays intact).

`--check` lists entries that violate a category's currently-declared schema —
covering entries written before a field was declared required (reads never
hard-error on old data; only new create/update writes are gated).

`--repair` fixes what's safely fixable:
- Applies a configured `default:` fallback where one exists.
- Offers **centroid-based inference for enum-typed fields only** — same
  content-to-label mechanism as write-side tag/category centroids, which
  measured 9/9 against the model's 1/9 on `neuron-2.2.0`.
- **Never fabricates a value for a free-text identity field** (`reviewedBy`,
  `ticket`, …). There is no content signal that could produce a person's name
  or a ticket number, and `neuron-2.2.0`'s map already measured this exact
  failure shape three times (importance noise, ruled-out dedupe, the
  frontmatter reader's fabrication bug). Those fields are only listed as
  missing, for a human or an agent told to go find the real answer.

Needs SQLite column parity for declared fields (already shipped on
`neuron-2.2.0`) so `--check`/`--repair` cover `vector`-mode entries
identically to `md`-mode entries, not just markdown files.

## Comments

- Continued from [neuron-2.2.0's ticket 46](../../neuron-2.2.0/issues/46-status-check-repair.md),
  closed out of scope on 2026-08-05 when that map dropped its rc5 cut ticket
  and shipped stable without it — the validation surface `36`/ADR 0013
  reopened is real but not load-bearing for the three pillars 2.2.0 narrowed
  to on 2026-08-04. A fresh effort per wayfinder rules (closed-out-of-scope
  work returns only as a new ticket, not a resumption), but the design is
  already fully specified from `36`'s grilling and `43`/`44`/`45` shipped its
  prerequisites (declarable field schema, SQLite additive migration, `strict`
  mode) — so this ticket carries that design forward rather than re-deriving
  it.
