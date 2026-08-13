# ADR 0017: Category Declaration Authority — Advisory, Self-Maintaining

## Status

Accepted (design). Implementation graduated to a new map,
neuron-2.4.0 (map `0a1d6d69-54ea-42bf-bc30-6ae4522172fd` in the `tickets` category).

## Context

`neuron.yaml`'s `categories` block was never validated against actual usage.
Any command could write under a category string absent from the config —
`neuron scan`'s default (`'architecture'`) being the standing example — and
nothing kept the two in sync.

Ticket 31 — Fix `neuron memory` Query/List Default Ordering and Limits (ticket `af0beb3d-ba2d-437b-a8de-9184ba5f8cb8`)
(and, before it, the equivalent gap on
neuron-2.2.0's own Not yet specified fog, map `d2835c05-ad41-4f55-bf5f-8f5e9d518ff5`) fixed
the acute half of this — the one-time bootstrap seed now unions the declared
set with whatever the store actually contains, so first-sync no longer drops
data for an undeclared category. But **steady-state reconcile still ran on
the declared set only**
(`DualStorageRouter.allCategories()`/`mdCategories()`,
`src/storage/dualStorageRouter.ts:217-223`, both derived from
`Object.keys(this.config.categories)`), so a hand-edit to an undeclared
category's `.md` file was silently never repaired — the exact guarantee the
`md` storage default is sold on.

Tickets 05/06 — Storage Path/Mode: Top-Level Default with Per-Category
Override (tickets `92f165f7-7720-46f2-9abb-9fea846bd6c3`/`dbed3219-6cfd-45e5-9b4d-c8e2d03e1a14`)
raised the stakes without resolving the authority question: a category's
storage path and storage mode are now both resolved *only* from
`neuron.yaml` (`src/config/categoryPath.ts`), so an undeclared category
falls back to defaults on both axes rather than failing loudly.

**A live asymmetry was found while grounding this decision**: explicit
`--category` on `neuron memory add` is never validated
(`src/commands/memory.ts:65-175` → `resolveCategory`,
`src/index.ts:67-68`), but *inferred* category (when `--category` is
omitted) is hard-constrained to the declared set on both the centroid path
(`src/index.ts:1102`) and the model path
(`matchDeclaredCategory`, `src/components/enricher.ts:205-213`, which
returns `degraded: 'category_not_declared'` on a miss).

This repo's own `neuron.yaml` had already worked around the gap rather than
resolving it: `scan.category` defaults to the undeclared `'architecture'`
(`src/config/neuronYaml.ts:288,435`), so this repo's checked-in config set
`scan: category: decisions` (a declared category) in the same commit that
introduced ticket 31's bootstrap-seed fix — sidestepping the problem instead
of fixing it.

Grilling ticket 35 — Is `categories` Authoritative or Advisory? (ticket `76199306-81f6-442f-90e9-9aae4075acc8`)
resolved the design. Mid-grilling, the maintainer redirected the resulting
*implementation* off `neuron-2.3.0` (already accumulating an rc2 cut) onto a
freshly chartered `neuron-2.4.0` map, so this ADR records a design decision
whose build has not landed yet.

## Decision

1. **Categories stay advisory, not validated — but self-maintaining.**
   `neuron memory add --category <x>` and `neuron scan` are never rejected
   for using an undeclared category. Instead, the **first write** that
   introduces an undeclared category auto-appends a minimal
   `categories.<name>: {}` block to `neuron.yaml` on disk, converging the
   declared set toward the actual store contents automatically rather than
   validating writes against a config that would otherwise drift stale.
   Considered and rejected: hard-rejecting undeclared writes (closes the gap
   from the strict side, but breaks a fresh `neuron init` project's own
   default `scan.category` until the user manually declares
   `architecture`) and widening `reconcile`'s query to follow the store at
   read time without touching the config file (simpler, but leaves
   `neuron.yaml` itself permanently out of sync with reality, and every
   other declared-set consumer — `status --check`, `readAll()` — would need
   its own widening rather than inheriting correctness for free).

2. **Auto-write requires comment-preserving round-trip.** Nothing in this
   codebase currently writes back to `neuron.yaml` — the only prior
   convention for "config doesn't match reality" is warn-once-on-stderr and
   leave it to the user (`RawStorageModeSchema`'s deprecated-spelling
   warning, `src/config/neuronYaml.ts:43-52`; `warnStaleVectorCategories`,
   `src/storage/dualStorageRouter.ts:225-260`). `neuron.yaml` is currently
   read via the `yaml` package's plain `parse()`
   (`src/config/neuronYaml.ts:3,686`), which discards comments and
   formatting — unsafe to round-trip through unchanged. The implementation
   must switch to `yaml`'s `Document` API (already the installed
   dependency; no new package needed) so an auto-write preserves the user's
   own comments and structure.

3. **Auto-declared blocks are minimal.** `categories.<name>: {}` — no
   invented description or tags. Matches this map's repeated stance
   elsewhere (tickets 26/28) against having the tool fabricate descriptive
   prose it has no real basis for.

4. **Inferred-category strictness is unchanged, deliberately.** Inference
   (centroid or model) stays hard-constrained to the declared set. This is
   not the same asymmetry as before: inference is a best-guess pick among
   *known* options and should never invent an undeclared category from
   embedding proximity alone, while an explicit `--category` is a
   deliberate human override the tool should trust and then absorb into the
   declared set. The asymmetry is coherent, not an oversight — recorded
   here so it isn't "fixed" by a future session that hasn't read this ADR.

5. **`neuron scan`'s undeclared default is no longer special-cased.**
   Because undeclared categories now self-declare on first write, the
   fallback to `'architecture'` (`src/config/neuronYaml.ts:288,435`) needs
   no config-side workaround. This repo's own `neuron.yaml` should revert
   its `scan: category: decisions` alias back to the real default, dogfooding
   the fix rather than leaving the pre-fix workaround in place.

6. **Existing undeclared categories are backfilled by `neuron status
   --repair`.** Auto-write-on-first-write only fires going forward from the
   write path; it does not retroactively cover categories that already have
   real rows in a store today (this repo's own store's `architecture`
   category, pre-alias-revert, is a real instance). `neuron status
   --repair` (ADR 0013's validation surface, ticket 13) is extended to
   detect and declare any category with real rows but no `neuron.yaml`
   entry — reusing the existing repair surface rather than adding a
   separate one-off migration script or a new CLI command.

7. **Single hook point.** Traced concretely: `neuron memory add`
   (`src/commands/memory.ts:108`) and `neuron scan`'s `ingestScanResults`
   (`src/scanner/ingest.ts:47`) both call `memory.transact()`
   (`NeuronMemory.transact()`, `src/index.ts:828`) — there is no fork below
   that point. `enforceFieldSchema()` (`src/index.ts:850`) already
   documents `transact()` as "the single choke point every writer... goes
   through." One auto-declare hook inside `transact()` (before or alongside
   `enforceFieldSchema`) catches both callers; no second hook point is
   needed. Once the declared-set-converges-on-actual invariant holds
   (helped along by item 6's backfill), every other declared-only consumer
   — `checkFieldCompliance`/`repairFieldCompliance`
   (`src/index.ts:905-945`), `MultiRootMdStorage.readAll()`
   (`src/storage/multiRootMdStorage.ts:96-99`) — becomes correct without
   its own change.

## Consequences

- `neuron.yaml` becomes a file the tool writes to, not just reads — a new
  category of side effect for any command that can introduce a category
  (`memory add`, `scan`). Must be disclosed in user-facing docs, not left
  as a silent behavior change.
- The `yaml` package's `Document` API becomes load-bearing for config I/O;
  any future config-writing code should reuse the same round-trip path
  rather than reintroducing a plain-`stringify()` write that would strip
  comments again.
- `neuron status --repair`'s scope grows from per-entry field compliance to
  also cover config-file drift (a new *kind* of repair, not just a new
  check) — its docs and `MASTER_HELP` text need to describe this
  distinction.
- This repo's own `neuron.yaml` reverts its `scan.category: decisions`
  alias as part of landing the implementation, and gains a real
  `categories.architecture: {}` block the first time `neuron scan` runs
  post-implementation (or via the `--repair` backfill, whichever runs
  first).

## Related

- [ADR 0011](0011-markdown-as-store-of-record.md) — markdown as store of
  record; this decision extends its "declared config" vocabulary without
  superseding it.
- [ADR 0013](0013-configurable-frontmatter-schema.md) — `neuron status
  --check`/`--repair`'s validation surface, extended here to cover category
  declaration drift.
- [ADR 0016](0016-per-category-storage-vocabulary.md) — the per-category
  path/mode vocabulary this decision's category strings resolve against.
- neuron-2.3.0 ticket 35 (ticket `76199306-81f6-442f-90e9-9aae4075acc8`) —
  the grilling session this ADR records.
