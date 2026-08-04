Type: task
Status: unclaimed
Blocked by: 43
Band: 2.2.0-rc5

# 44 — SQLite Additive Auto-Migration for Declared User-Defined Fields

## Question

Give `vector-only`/`split` mode parity with `md` mode for the field schema `43`
implements. The unified `memories` table (`src/index.ts:321`) has fixed columns
only — no metadata/JSON slot — so a declared user-defined field becomes one
nullable `TEXT` column, added via `ALTER TABLE memories ADD COLUMN
<snake_case_name> TEXT`, for both `string` and `enum` types. Enum membership is
enforced in application code at `transact()` (per `43`), not as a SQL `CHECK`
constraint, so changing a team's allowed enum values never requires a table
rebuild.

The migration runs eagerly and idempotently at store-open time: diff declared
fields (across all categories) against `PRAGMA table_info(memories)`, add
whatever's missing. **Additive-only — never `DROP COLUMN`** when a field is
removed from `neuron.yaml`; the orphaned column and its data stay, unread and
unenforced, until a maintainer writes an explicit reviewed cleanup migration
(matching `38`'s precedent, not this automatic path). Column identifiers must
be validated against a strict allowlist pattern (e.g. `^[a-z_][a-z0-9_]*$`)
before being interpolated into DDL.

## Comments

- Graduated from [36](36-configurable-frontmatter-schema.md)'s grilling,
  2026-08-03 — the maintainer's call was that vector-mode parity must hold
  identically, via auto-migration, rather than gating user-defined fields to
  `md`/`split` mode only.
