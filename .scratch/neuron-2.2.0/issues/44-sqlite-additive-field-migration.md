Type: task
Status: resolved
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

## Answer

Implemented as designed, no deviation on the migration mechanics. `NeuronMemory`
now computes `fieldColumns` once from config at construction
(`computeFieldColumns`, `src/index.ts`) — every declared field across every
category, deduplicated by key, the same "two categories can share one column"
rule `43` already gave them for CLI flags. `migrateDeclaredFields()` runs after
`initialize()` on every open: diff `fieldColumns` against `PRAGMA
table_info(memories)`, `ALTER TABLE memories ADD COLUMN <col> TEXT` for
whatever's missing, inside one transaction. Additive-only by construction — a
field removed from `neuron.yaml` just stops appearing in `fieldColumns`, so its
column and data are silently orphaned, never dropped, matching `38`'s
precedent that column removal is an explicit reviewed migration, not an
automatic one. Enum membership stays enforced in `enforceFieldSchema` (`43`'s
choke point) — no SQL `CHECK` constraint, so changing a team's allowed values
is a `neuron.yaml` edit, not a migration.

**Column-identifier safety is layered, not single-point.** `fieldKeyToColumnName`
(camelCase → snake_case, `43`'s `fieldKeyToFlagName` sibling) is validated
against the ticket's own `^[a-z_][a-z0-9_]*$` allowlist at three points: once
at config-load time in `validateDeclaredFields` (`neuronYaml.ts`), and again
immediately before each DDL/DML interpolation site in `index.ts`
(`migrateDeclaredFields`, `fieldColumnName`) — belt-and-suspenders because a
column name is interpolated, not bound, and a call site three modules away
from config validation shouldn't have to trust it blindly. Config-load time
also gained two checks `43` didn't need: a declared field's column must not
collide with one of the `memories` table's own fixed columns (`RESERVED_COLUMN_NAMES`
— `content` and `createdAt`→`created_at` are real collisions that `43`'s
reserved-*flag* check doesn't catch, since neither is a reserved CLI flag),
and two *different* field keys must not fold to the same column (`fooBar` and
`FooBar` both derive `foo_bar` — verified with a real pair, not a hypothetical).

**Write and read paths.** `transactVector`'s `INSERT`/`UPDATE` now append the
resolved field columns (`m.fields`, already fully validated and defaulted by
`enforceFieldSchema` before `transact()` reaches here) — parameterized values,
validated-then-interpolated column names. `queryVector`'s two `SELECT`s (text
search and list mode) grew the same field columns, and both result-builders
now populate `Memory.fields` via `extractFields`, sparse (only non-null
columns). This closes a gap that predated this ticket and affected *every*
storage mode: `NeuronMemory.query()` never returned `fields` at all before
this change, in `md` mode included, because `DualStorageRouter.query()`
delegates unconditionally to the SQLite-backed `vectorDb.query()` (ADR 0011's
retrieval-parity-by-construction) — the round trip ticket 43's own tests verify
goes through `MdStorageAdapter.readCategory()` directly, a path no CLI command
or hook actually calls. `43`'s "cannot be persisted yet" warning
(`warnIfFieldsNotPersistable`) is deleted along with its only call site — every
mode persists now, so the warning has nothing left to announce.

**Found and fixed two related drops while wiring this in**, both in
`DualStorageRouter`: `reconcileCategory`'s markdown→vector upsert and
`bootstrapSeed`'s vector→markdown export each rebuilt a `Memory`/`MemoryMutation`
object by hand without forwarding `fields` — meaning even in `md` mode, the
passive reconcile path (as opposed to the live write path, which already
spread `fields` through via `{ ...m, id, category }`) would have silently
dropped field values reaching the SQLite mirror, and by extension `query()`.
One line at each site (`fields: mdEntry.fields`, `fields: entry.fields`)
closes both. `neuron sync`'s `pushMdToVector` (`mdVectorSync.ts`) already
forwarded `fields` correctly — no bug there, just confirmed.

**Not touched, flagged for later:** `computeMemoryHash` (`mdVectorSync.ts`),
used by both `reconcileCategory`'s skip-if-unchanged check and `neuron sync`'s
conflict detection, still hashes only `content|tags|importance|taskId` — a
hand-edit to a declared field's frontmatter value with no other change won't
trigger a resync. This is an `md`/`split-md-category` reconcile-fidelity gap,
orthogonal to this ticket's vector-only/split-vector column work (those modes
never go through hash comparison at all), so it's left for whoever next
touches the reconcile engine rather than widened into here.

13 new tests plus 1 rewritten: `sqliteFieldSchema.test.ts` is a new file with
7 (migration additivity, idempotent re-open, upgrading a pre-44 database,
never-drop-on-removal, vector-only round trip via `query()`, partial-patch
update, split-vector-category round trip); `neuronYaml.test.ts` gains 6 for
column derivation and the collision checks; `fieldSchema.test.ts`'s "cannot
be persisted yet" test is replaced with a real round-trip assertion, per its
own comment predicting exactly this. Full suite 466/466 green, all 45 files —
no pre-existing-failure carryover from `42` this time; that isolation work
already landed on trunk.
