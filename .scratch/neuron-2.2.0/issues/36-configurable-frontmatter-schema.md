Type: grilling
Status: resolved
Blocked by: 35
Band: 2.2.0-rc5

# 36 — Configurable Frontmatter Schema: What "Deterministic" Guarantees

## Question

Make the required frontmatter fields declarable per-category in `neuron.yaml`,
so that an agent using the CLI cannot write an entry that violates the declared
shape. What exactly is guaranteed, what are the field tiers, and what happens to
a file that already violates the schema?

## Context

Proposed by the maintainer on 2026-08-02 as a sharpening of the markdown-first
repositioning: position neuron as **the deterministic writer** for agent memory,
with the entry schema declared in config and enforced by the CLI.

The strategic argument, which this ticket should preserve through any design
compromise: *"memory as markdown files"* is not defensible — telling an agent to
append to a `.md` file is a prompt, not a product. *"Your agent cannot write a
malformed memory entry"* is defensible, because a guarantee needs an enforcement
point, and that enforcement point is the reason to route writes through the CLI
rather than through `>>`. It also makes the CLI load-bearing in `md-only`, which
matters while [`29`](29-md-only-semantic-search.md) is outstanding.

Against `codebase-memory-mcp`, this is a **governance** claim rather than a
capability claim — orthogonal to analysis depth rather than competing with it.

### Where the code is today

Frontmatter is hardcoded. `formatEntry` (`src/storage/mdStorageAdapter.ts:226`)
builds a fixed object: `id`, `createdAt`, `importance`, `tags`, then conditionally
`scope` and `taskId`. `CategoryConfigSchema` (`src/config/neuronYaml.ts:18`)
carries only `description`, `tags` and `storage` — there is no field schema to
declare anything against.

## The design questions

### 1. Scope the word "deterministic", or the claim will be false

It bundles three distinct properties:

- **Shape determinism** — every entry conforms to the declared schema.
  Enforceable.
- **Byte determinism** — the same entry serialises to the same bytes; stable key
  order, stable formatting, no gratuitous diff noise. Enforceable, and directly
  serves the "review it in a PR" pitch. `35` starts this with its round-trip
  test.
- **Value determinism** — the same `memory add` produces the same field values.
  **Not achievable while enrichment infers tags and category.** Centroid
  selection is deterministic given a fixed store, but the store grows, so the
  same command a month later selects different tags.

Recommended posture, to be confirmed or overturned by the grilling: claim shape
and byte determinism; make inference an explicitly switchable convenience; never
claim value determinism. Decide whether a `strict` mode that disables all
inference is worth shipping as the thing the pitch points at.

### 2. Fields are not equal — three tiers

- **Structural** (`id`, `createdAt`) — the system cannot function without them.
  Must never be declarable-optional. `35` documents what happens when `id` goes
  missing: a new UUID on every read.
- **Semantic reserved** (`importance`, `tags`, `scope`, `taskId`) — neuron reads
  these for behaviour. `prune` reads `importance`; query filters on `scope`.
  These *may* be optional, but the config should force the consequence to be
  acknowledged rather than discovered.
- **User-defined** (`ticket`, `reviewedBy`, `confidence`, …) — opaque to neuron,
  preserved on round-trip, validated on write.

The third tier is where the product value is: *"every `decisions` entry must
carry a `ticket` and a `reviewedBy`, and the CLI refuses writes without them"* is
a rule a team would adopt a tool to enforce. Design for it rather than treating
it as an extension point.

### 3. Questions for the grilling

1. What is the type system? Bare required/optional, or types (string, enum,
   number, date) and constraints? Every step up is more schema surface to
   document and more to go wrong. Where is the floor that still delivers the
   pitch?
2. **Required-but-missing has precedent — use it.** Ticket `06` settled this for
   `--category`: hard-error, name the cause, unless a literal fallback is
   configured in `neuron.yaml`. Is there any reason a user-defined required field
   should behave differently? Inventing a second policy with different ergonomics
   is the failure mode here.
3. ~~How does a required user-defined field reach the CLI?~~ **Decided by the
   maintainer on 2026-08-02: a field declared in `neuron.yaml` becomes a CLI
   flag.** Declare `ticket` on the `decisions` category and
   `neuron memory add --category decisions --ticket NEU-42 "..."` becomes valid.
   Not a generic `--field k=v` escape hatch — the config *extends the CLI's own
   argument surface*.

   This is the stronger option and it should be preserved through the design,
   because of a property that matters specifically for an agent-facing tool:
   **`neuron memory add --help` becomes self-documenting for the project's
   schema.** An agent that reads `--help` learns what this project requires,
   without the schema having to be restated in `CLAUDE.md`/`AGENTS.md` where it
   would drift. That is the same "instructions drift, mechanisms don't" argument
   that drove rc3's move to harness-native hooks.

   What it implies, and what the grilling must work through:
   - **`KNOWN_FLAGS` (`src/commands/utils.ts:68`) is a hardcoded array** and
     becomes config-derived. Note what it currently buys: unknown flags are
     rejected with an edit-distance suggestion, because a typo'd `--importanc 5`
     used to be silently discarded and write the default instead. Declared fields
     must join that suggester, not bypass it.
   - **Help text becomes dynamic**, per project. `HELP` constants in `utils.ts`
     are currently static strings.
   - **Collision rule needed** against reserved flags (`--category`, `--tags`,
     `--importance`, `--scope`, `--task-id`, `--limit`, `--file`, `--format`,
     `--json`, …). Refuse the config at load time with a clear error, rather than
     discovering the shadow at write time.
   - **Where does validation run** — at parse time (the flag is missing) or at
     write time (the entry is incomplete)? They differ for non-CLI writers such
     as `neuron scan` and the deprecated `learn`/`history` aliases.
   - The map's non-goals forbid **new top-level commands**. Flags on an existing
     command are not that, but confirm the boundary holds.
4. **What happens to entries that already violate a newly-declared schema?**
   Adding a required field to `neuron.yaml` retroactively invalidates every
   existing entry in that category. Refuse to read them? Read and report?
   Migrate? This is the question most likely to be discovered late.
5. Does the schema apply to `vector-only`, where there is no frontmatter to
   enforce it in? If the guarantee is mode-dependent, the pitch has an asterisk
   and the README needs to carry it.
6. **Does this reopen validation tooling?** If schema is declarable and
   hand-editing is the headline, something must check existing files against the
   schema. This map ruled out `neuron doctor` twice — once on cost, once via the
   no-new-commands non-goal. This is the strongest argument yet for reopening it.
   The alternative is folding validation into `neuron status` or a `--check`
   flag on an existing command. Decide deliberately; do not let a `doctor`
   command arrive by accident.
7. Does `scan`'s architecture card, which is a memory entry, have to satisfy the
   `architecture` category's schema? If yes, `neuron scan` becomes a CLI writer
   subject to the same enforcement, which is probably correct and definitely
   needs saying.

## Deliverables

- [ ] A spec covering the field tiers, the type system's floor, the
      required-but-missing policy, and the pre-existing-entry question
- [ ] The config-declared-fields-become-CLI-flags mechanism designed through to
      `KNOWN_FLAGS`, dynamic `--help`, and the reserved-flag collision rule
- [ ] A decision on `strict` mode and on what "deterministic" claims in the README
- [ ] The validation-surface fork resolved (`doctor` reopened, folded into an
      existing command, or declined)
- [ ] Implementation tickets graduated from the answers — do not pre-slice them here

## Comments

- 2026-08-02: Filed from the maintainer's positioning proposal. Typed `grilling`
  because it is a design decision with a public product claim attached, not an
  implementation detail — the same reason `05` and `28` are grillings.
- Blocked by [`35`](35-frontmatter-roundtrip-integrity.md): the reader's silent
  coercions have to stop fabricating field values before a schema can mean
  anything. Enforcing a shape on write while the read path invents values on the
  way back out would be a guarantee in name only.

## Answer

Grilled with the maintainer on 2026-08-03. Answers to the seven design
questions, in the ticket's own order:

**1. Scope of "deterministic."** Bundles three properties — shape (enforceable),
byte (enforceable, `35` started it), value (not achievable while centroid
inference exists). The pitch claims shape + byte only. **A `strict` mode ships**,
opt-in per-project in `neuron.yaml`, disabling both tag inference and category
inference (`06`'s `categoryStrategy`/`tags` fields) so a project can additionally
claim value determinism if it forgoes inference's convenience. The packaged
`.claude/skills/neuron-memory/SKILL.md` must document the shape/byte/value
distinction and `strict` mode's tradeoff (loses auto-tag/category convenience,
gains the literal "deterministic" claim) — folded into ticket `45`.

**2. Field tiers.** The three tiers stand as scoped — structural (`id`,
`createdAt`), semantic reserved (`importance`, `tags`, `taskId` — `scope` drops
off the list, dead per `38`), user-defined (opaque, product-value tier).
`taskId` stays semantic reserved rather than moving to user-defined.

**3. Type system floor.** **String and enum only** — no number/date. Enum
reuses the existing edit-distance suggester (`unknownFlag` in `utils.ts`) for
typo'd values. `importance`'s 1–5 integer range stays a hardcoded special case
outside this type system (it's semantic-reserved, not user-defined).

**Required-but-missing policy.** Same shape as `06`'s `--category` precedent:
hard error naming the field and category, unless the category config declares a
literal `default:` for that field, in which case the CLI fills it silently. No
second policy.

**CLI-flag mechanism (config-declared fields become flags — already decided by
the maintainer 2026-08-02).** `KNOWN_FLAGS` becomes config-derived; a declared
field's kebab-case flag name is checked at config-load time for collision
against the reserved built-in flag set, refusing the config with a clear error
rather than discovering the shadow at write time; `--help` text generates
dynamically per project. **Validation timing resolved as a side effect of the
storage question below: `transact()` is the single enforcement choke point**,
because `ingestScanResults` (`src/scanner/ingest.ts`) writes the architecture
card via `memory.transact()` directly, bypassing `parseFlags` entirely —
`parseFlags` only needs to recognise declared flags well enough to avoid
`unknownFlag`, collecting raw values through to `transact()`, where required-ness
and enum-membership are actually enforced, once, for every writer.

**4. Pre-existing entries against a newly-declared schema.** **Read and
report, never refuse to read.** A missing-field violation on an existing entry
doesn't destroy data and doesn't get invented (no safe default exists for a
free-text identity field) — it isn't ticket `35`'s repair-or-refuse binary,
because it's neither synthesizable nor ambiguous, just absent. Reporting lands
in `neuron status --check` (see below). The hard-error-unless-default policy
only bites on new writes (create/update), never on read.

**5. Does the schema apply to `vector-only`?** **Yes, identically — via an
additive-only SQLite auto-migration**, not a mode gate. The unified `memories`
table (`src/index.ts:321`) is fixed-column with no metadata/JSON slot today; a
declared user-defined field becomes one nullable `TEXT` column via
`ALTER TABLE memories ADD COLUMN <snake_case_name> TEXT`, both for `string` and
`enum` types — enum membership is *not* a SQL `CHECK` constraint, since that
would need a table rebuild every time a team edits its allowed values; it's
enforced in application code at `transact()`, the same single choke point that
covers the markdown path, so the validator is written once. The migration is
additive-only and idempotent: it diffs declared fields against
`PRAGMA table_info(memories)` at store-open time and only ever adds columns,
**never drops one** when a field is removed from config — an unreviewed
automatic path must not be capable of destroying data on a config typo/edit;
that matches the project's existing posture (`enriched_at` kept post-`26`,
`--scope`/`--scopes` kept-but-ignored post-`38`). Column identifiers are
validated against a strict allowlist pattern before use in DDL.

**6. Does this reopen validation tooling (`neuron doctor`)?** **Yes, folded
into `neuron status --check`/`--repair`, not a new top-level command** — keeps
the map's no-new-commands non-goal intact. Repair is deterministic wherever
possible: applies a configured `default:` fallback, and offers **centroid-based
inference for enum-typed fields only** (content-to-label signal exists,
matching the tag/category precedent that beat the model 9/9 in `06`). It
**never fabricates a value for a free-text identity field** (`reviewedBy`,
`ticket`) — there is no content signal that could produce a person's name or a
ticket number, and this map has already measured that exact failure shape three
times (`06`'s importance noise, `08`'s ruled-out dedupe, `35`'s own reader-side
fabrication bug this ticket exists to not repeat one layer up). Those fields
are listed as missing and left for a human or an agent told to go find the real
answer, never guessed.

**7. Does `neuron scan`'s architecture card have to satisfy its category's
schema?** **Yes — direct consequence of `transact()` being the single
enforcement point.** Corollary that must be a load-time config check: if the
category `scan.category` points at declares a required field with no
`default:`, `neuron scan` cannot supply one (it never calls `parseFlags`) and
would break itself on every run. `neuron.yaml` load refuses that configuration
with an error naming the conflict, rather than letting it surface as a
mysterious `neuron scan` failure later.

**Implementation graduated as** [43](43-declarable-field-schema-cli-flags.md),
[44](44-sqlite-additive-field-migration.md),
[45](45-strict-mode-and-skill-docs.md),
[46](46-status-check-repair.md) — not pre-sliced further here.
[ADR 0013](../../docs/adr/0013-configurable-frontmatter-schema.md).
