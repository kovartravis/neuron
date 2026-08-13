# ADR 0013 — Configurable Frontmatter Schema: What "Deterministic" Guarantees

- **Status:** Accepted (2026-08-03)
- **Relates to:** [ADR 0011 — Markdown as Store of Record](0011-markdown-as-store-of-record.md),
  whose storage posture this extends into a governance claim; [ADR 0010 — LLM
  Job Guardrails](0010-llm-job-guardrails.md), whose measured limits on the
  0.5B model this ADR relies on
- **Ticket:** 36 — Configurable Frontmatter Schema (ticket `bd7412c4-c927-4330-952c-41b6fb8fa6e3`)
- **Implemented by:** 43 (ticket `b9885df7-1b5a-45af-99e0-27cb69a3150e`),
  44 (ticket `d25bc28b-c1ef-42f7-88b8-b194bd33971c`),
  45 (ticket `92b988c4-2e1f-4db7-9aa3-ca885a52945b`),
  46 (ticket `d6679061-387b-473c-af93-2cb2cb55c354`)

## Context

The 2026-08-02 repositioning sharpened neuron's pitch from "memory as markdown
files" (not defensible — a prompt telling an agent to append to `.md` is not a
product) to a **governance claim**: an agent using the CLI cannot write a
malformed memory entry, because the schema is declared in `neuron.yaml` and
enforced on write. That makes the CLI load-bearing rather than a convenience
wrapper, and it is orthogonal to `codebase-memory-mcp`'s analysis-depth moat
rather than competing with it.

Today, frontmatter is hardcoded: `formatEntry` (`src/storage/mdStorageAdapter.ts:239`)
emits a fixed `id`/`createdAt`/`importance`/`tags`(+`taskId`) object, and
`CategoryConfigSchema` (`src/config/neuronYaml.ts:71`) has no field-schema
surface to declare anything against.

## Decision

### The word "deterministic" is scoped, not claimed whole

It bundles three separable properties:

- **Shape determinism** — every entry conforms to the declared schema.
- **Byte determinism** — stable serialization, no gratuitous diff noise
  (started by ticket 35's round-trip fix).
- **Value determinism** — the same command produces the same field values.
  **Not achievable by default** — centroid tag/category inference (ADR 0010 /
  ticket 06) selects against a growing store, so the same command a month
  later can select different values.

The default product claim is shape + byte determinism. An opt-in **`strict`**
config flag disables both tag and category inference, letting a project
additionally claim value determinism at the cost of the inference convenience.
The packaged `neuron-memory` skill documents this three-way distinction and the
`strict` tradeoff explicitly, so an agent reading it understands what it gives
up.

### Three field tiers

- **Structural** (`id`, `createdAt`) — never declarable-optional; the system
  cannot function without them.
- **Semantic reserved** (`importance`, `tags`, `taskId`) — neuron reads these
  for behavior (`prune` reads `importance`). May be declared optional, but the
  config must force the consequence to be visible rather than silently
  discovered. (`scope` is not in this list — removed entirely by ticket 38.)
- **User-defined** (`ticket`, `reviewedBy`, `confidence`, …) — opaque to
  neuron, preserved on round-trip, validated on write. This is where the
  product value is: *"every `decisions` entry must carry a `ticket` and a
  `reviewedBy`, and the CLI refuses writes without them."*

### Type system floor: string and enum only

No number or date types. Enum covers the realistic team-convention case (a
closed-vocabulary status/tier field) and reuses the existing edit-distance
suggester (`unknownFlag`, `src/commands/utils.ts`) for typo'd values.
`importance`'s hardcoded 1–5 integer range stays outside this system — it is
semantic-reserved, not user-defined.

### Required-but-missing: one policy, reused

Same shape ticket 06 already set for `--category`: hard error, naming the field
and the category, unless the category config declares a literal `default:`,
in which case the CLI fills it silently. No second policy with different
ergonomics for user-defined fields.

### Config-declared fields become CLI flags

Decided by the maintainer on 2026-08-02, preserved through this design:
declaring a field in `neuron.yaml` extends the CLI's own argument surface
(`neuron memory add --category decisions --ticket NEU-42 "..."`), not a
generic `--field k=v` escape hatch. `KNOWN_FLAGS` becomes config-derived;
`--help` generates dynamically per project — an agent reading `--help` learns
the project's schema without it needing to be restated in `CLAUDE.md`/
`AGENTS.md`, where it would drift (the same "mechanisms don't drift,
instructions do" argument behind rc3's harness-native hooks). A declared
field's flag name is checked at config-load time for collision against the
reserved built-in flag set, refusing the config with a clear error rather than
discovering the shadow at write time.

### Enforcement lives in `transact()`, the one choke point both writers share

`src/scanner/ingest.ts`'s `ingestScanResults` writes the architecture card via
`memory.transact({ op: 'upsert', ... })` directly, bypassing `parseFlags`
entirely. `parseFlags` only needs to recognise declared flags and collect raw
values; required-ness and enum-membership are enforced once, in `transact()`,
for every writer. Consequently:

- `neuron scan`'s architecture card is subject to its category's declared
  schema like any other write.
- If the category `scan.category` points at (`architecture` by default)
  declares a required field with no `default:`, `neuron scan` would break
  itself on every run, since it has no way to supply a value. `neuron.yaml`
  load refuses that configuration, naming the conflict, rather than letting it
  surface as a mysterious scan failure later.

### Pre-existing entries: read and report, never refuse to read

Declaring a new required field retroactively "invalidates" every entry written
before the rule existed. This is not ticket 35's repair-or-refuse binary — a
missing free-text identity value has no safe synthesizable default (unlike
`id`/`createdAt`/`importance`) and is not ambiguous, just absent. Reads never
hard-error on old data; that would turn declaring a required field into a
retroactive landmine across a whole category file, directly contradicting the
"hand-edit and diff in git" pitch. Violations surface via `neuron status
--check`. The hard-error-unless-`default:` policy bites only on new
create/update writes.

### `vector-only` gets identical enforcement via additive-only SQLite migration

The unified `memories` table (`src/index.ts:321`) is fixed-column with no
metadata/JSON slot. A declared user-defined field becomes one nullable `TEXT`
column, `ALTER TABLE memories ADD COLUMN <snake_case_name> TEXT`, for both
`string` and `enum` types. Enum membership is enforced in application code at
`transact()`, not as a SQL `CHECK` constraint — a `CHECK` would need a table
rebuild every time a team edits its allowed enum values. The migration is
eager and idempotent (diffs declared fields against `PRAGMA table_info
(memories)` at store-open time) and **additive-only**: it never `DROP
COLUMN`s when a field is removed from config. An automatic, unreviewed path
must not be capable of destroying data on a config typo or edit — matching the
project's existing posture of keeping rather than dropping
(`enriched_at` post-ticket-26, `--scope`/`--scopes` post-ticket-38, both of
which were one-time, human-reviewed removals, not standing automatic
behavior).

### Validation tooling reopens, folded into `neuron status`, not a new command

`neuron doctor` was ruled out of this map twice before — once on cost, once via
the no-new-top-level-commands non-goal. This reopens it in substance while
keeping the non-goal intact: `neuron status --check`/`--repair` reports
non-compliant entries and repairs what is safely repairable — a configured
`default:`, or centroid-based inference for **enum-typed fields only**, the
same content-to-label mechanism that beat the model 9/9 on tag/category
inference (ADR 0010).

It **never fabricates a value for a free-text identity field**
(`reviewedBy`, `ticket`). There is no content signal in a memory entry that
could produce a person's name or a ticket number — this is not inference, it
is fabrication with a plausible face, and this project has already measured
that exact failure shape three times: `importance` inference scored as noise
(ticket 06, shipped `off`); dedupe/consolidation was ruled out before design
because adjudicating facts ungrounded in content is "the weakest capability of
both the embedder and the 0.5B model" (ticket 08); and ticket 35 exists
specifically because the frontmatter *reader* was silently fabricating field
values. A repair tool that fabricates a `reviewedBy` would reintroduce that
defect one layer up, in the field type the whole ADR exists to make
trustworthy. Free-text identity fields are only ever listed as missing, for a
human or an agent explicitly told to go find the real answer.

## Consequences

- The "deterministic" claim in the repositioned README is precise: shape and
  byte by default, value only under `strict`. No qualifier is silently owed.
- `transact()` becomes the sole enforcement point for entry shape, covering
  both CLI writes and `neuron scan`'s direct writes — a second validation path
  is not something future tickets should introduce.
- `vector-only` and `md`/`split` modes carry the identical guarantee; the
  storage backend is not a caveat on the pitch.
- A category schema change is a config-time decision with a load-time
  cross-check (collision, `scan.category` defaults) — most failure modes
  surface before any command runs, not after a write silently misbehaves.
- Repair tooling has a hard boundary: it strengthens confidence in enum and
  defaultable fields, and is deliberately inert on identity fields, rather
  than quietly integrating the failure mode ticket 35 just closed.

## Amendments

### 2026-08-05 — `--check`/`--repair` moved to `neuron-2.3.0`

Ticket `46`, listed above under "Implemented by," is closed out of scope on
`neuron-2.2.0` and did not ship in 2.2.0: the maintainer dropped that map's
separate rc5 cut and released `2.2.0` stable directly from rc3, and the
validation surface this ADR reopens was never load-bearing for the three
pillars the destination narrowed to on 2026-08-04. Everything else this ADR
decided is unaffected — the schema/tiers/type-floor design (`43`), SQLite
column parity (`44`) and `strict` mode (`45`) all shipped in 2.2.0 exactly as
decided here. `--check`/`--repair` continues, design unchanged, as
neuron-2.3.0's ticket 13 — `neuron status --check`/`--repair`: Report and
Repair Non-Compliant Entries (ticket `99f85f06-9e6c-4224-8a58-dd4621a168c7`).
