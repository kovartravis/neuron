Type: grilling
Status: unclaimed
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
