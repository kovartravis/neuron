Type: task
Status: resolved
Blocked by: none
Band: 2.2.0-rc5

# 43 — Declarable Category Field Schema: Tiers, Types, CLI Flag Surface

## Question

Implement the field-schema design from
[36](36-configurable-frontmatter-schema.md): per-category declarable fields in
`neuron.yaml` (`string`/`enum` types, the three field tiers), a
required-but-missing policy identical to `06`'s `--category` precedent
(hard-error naming the field and category, unless a `default:` is configured),
and the config-declared-fields-become-CLI-flags mechanism — `KNOWN_FLAGS`
(`src/commands/utils.ts:68`) becomes config-derived, `--help` text generates
dynamically per project, and a declared field's flag name is checked at
config-load time for collision against the reserved built-in flag set.

Enforcement (required-ness, enum membership) must live in `NeuronMemory`'s
`transact()`, not in `parseFlags` — `parseFlags` only needs to recognise
declared flags and collect raw values, because `src/scanner/ingest.ts`'s
`ingestScanResults` writes through `transact()` directly and never touches
`parseFlags`. This is also where the `scan.category`-requires-defaults
cross-check from `36`'s answer to question 7 belongs: refuse `neuron.yaml` at
load time if the category `scan.category` points at declares a required field
with no `default:`.

Out of scope here: the SQLite column side of storage (`44`), `strict` mode
(`45`), and the `neuron status --check`/`--repair` reporting (`46`, which
depends on this ticket's schema existing to check entries against).

## Comments

- Graduated from [36](36-configurable-frontmatter-schema.md)'s grilling,
  2026-08-03.

## Answer

Implemented as designed, no deviation from `36`'s answer. **Config**
(`src/config/neuronYaml.ts`): `CategoryFieldSchema` is a discriminated union
on `type` (`string`/`enum` only, per `36`'s floor), each with
`required`/`default`; enum additionally carries `values`. `RESERVED_FLAG_NAMES`
is the single source of truth for built-in flags, exported so
`commands/utils.ts`'s `KNOWN_FLAGS` derives from it rather than duplicating it.
`validateNeuronYaml` refuses the config at load time on four grounds: a field
key that isn't a valid camelCase identifier, an enum `default` not in its own
`values`, a declared field's kebab flag colliding with a reserved built-in, and
— the `scan.category` cross-check `36` flagged — a required field with no
`default` on the category `scan.category` points at, which would otherwise
break `neuron scan` on every run since it writes via `transact()` directly and
never touches `parseFlags`.

**CLI** (`src/commands/utils.ts`): `parseFlags` takes an optional
`declaredFields: DeclaredFieldFlag[]` (flag ↔ config key ↔ category ↔
definition), captures matching flags into `options.fields`, and folds them
into the unknown-flag edit-distance suggester so a typo'd declared field
suggests itself. `getMemoryHelp(config)` returns `MEMORY_HELP` unchanged when
nothing is declared, or appends a per-category listing when it is — the
self-documenting `--help` `36` asked for. `commands/memory.ts` and
`commands/learn.ts` (which calls `parseFlags` itself before delegating) both
load declared fields from `memory.getConfig()` (new getter) so a field flag
never falls through to `unknownFlag`.

**Enforcement** (`src/index.ts`, `NeuronMemory.transact()`): runs after
`enrichUpsert` so an inferred category is already resolved. Rejects a value
for a field the resolved category never declared; on `upsert`, fills
configured defaults and hard-errors a required-and-defaultless field
(mirroring `06`'s `--category` precedent exactly); enum values are checked
against `values` with an edit-distance suggestion on a near-miss. **One
scope decision beyond the ticket's text**: `update` never re-demands or
default-fills a field, matching the existing partial-patch posture of
`--tags`/`--importance`/`--task-id` — required-ness only bites on create.
Storage is scoped to markdown only here (`44` owns the SQLite column side, as
the ticket says); writing a field against a category that resolves to a pure
vector row still validates the value (the guarantee holds regardless of
storage mode) but warns on stderr that it cannot be persisted yet, rather than
silently accepting or hard-refusing.

**Storage round-trip** (`MdStorageAdapter`, `DualStorageRouter`): declared
fields serialise into frontmatter sorted by key (byte-stability, ticket `37`'s
precedent) and are read back generically — any non-reserved frontmatter key
becomes a `Memory.fields` entry, declared or not, since schema enforcement is
a write-time concern only (`36`'s "read and report, never refuse"). `upsert`
replaces the field set wholesale (matching `tags`'s replace semantics);
`update` merges per-key so an untouched declared field survives.

**Bug found and fixed while wiring in**: `mdVectorSync.ts`'s `pushMdToVector`
(used by the explicit `neuron sync` command) calls the real
`NeuronMemory.transact()`, not the reconcile-only delegate — so it now runs
field enforcement too, and would have broken sync for any category with a
required field, since it never passed the entry's existing field values.
Fixed by threading `mdEntry.fields` through.

40 new/updated tests (`neuronYaml.test.ts`, `utils.test.ts`, and a new
`fieldSchema.test.ts` covering enforcement + round-trip); full suite
429–430/434, the 4–5 failures being the pre-existing `42` real-store test
pollution — reproduced identically against unmodified `main` before this
session's changes, specifically to rule out a regression. `docs/COMMANDS.md`
and `CONTEXT.md` updated; ADR 0013 already covered this design from `36`'s
grilling and needed no amendment.
