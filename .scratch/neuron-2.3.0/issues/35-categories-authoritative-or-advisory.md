Type: grilling
Status: resolved
Blocked by: (none)
Band: config vocabulary

# 35 — Is `categories` Authoritative or Advisory?

## Question

Should a category string be *validated* against `neuron.yaml`'s declared
`categories` block before a write or a scan is allowed to use it — making
undeclared categories impossible — or should `categories` stay advisory,
with steady-state reconcile widened to follow whatever the store actually
contains rather than only what's declared?

## Context

Sitting in this map's fog since it was split off from
[neuron-2.2.0](../neuron-2.2.0/map.md), which first named the problem as
*"an undeclared category is written but never mirrored"*
([neuron-2.2.0 fog](../neuron-2.2.0/map.md#not-yet-specified)): nothing
validates `--category` against the config, so a store routinely holds
categories the config never declares — `neuron scan`'s `architecture`
default being the standing example. [Ticket 31](31-fix-query-list-defaults.md)
made the **bootstrap seed** cover undeclared categories (it had to; the
omission was destroying data on first sync), but **steady-state reconcile
still runs on the declared set only** — a hand-edit to an undeclared
category's `.md` file is silently never repaired, precisely the guarantee
the `md` default is sold on.

[Tickets 05/06](05-per-category-storage-path.md) sharpened, but didn't
resolve, this: a category's storage *path* and storage *mode* are now both
resolved-only-from-`neuron.yaml` properties
(`src/config/categoryPath.ts`) — undeclared categories have no declared
path or mode either, they just fall back to defaults. More load-bearing
config, same unresolved authority question underneath it.

**Grounded against current code before grilling** (not assumed):

1. **A live asymmetry already exists.** Explicit `--category` on
   `neuron memory add` is never validated (`src/commands/memory.ts:65-175`
   → `src/index.ts:67-68`'s `resolveCategory` takes it as-is) — confirmed
   by the code's own comment at `src/index.ts:214-220`. But *inferred*
   category (when `--category` is omitted) **is** hard-constrained to the
   declared set on both paths: the centroid path builds
   `declared = Object.keys(this.config.categories)` (`src/index.ts:1102`)
   and the model path's `matchDeclaredCategory`
   (`src/components/enricher.ts:205-213`) returns
   `degraded: 'category_not_declared'` if the model answers outside that
   list. So today: explicit write = advisory/unchecked; inferred write =
   authoritative. That asymmetry is itself a live design smell, independent
   of which side wins.
2. **This repo's own `neuron.yaml` already worked around the gap**, rather
   than resolving it: `scan.category` defaults to `'architecture'`
   (undeclared, `src/config/neuronYaml.ts:288,435`), but this repo's
   checked-in config explicitly sets `scan: category: decisions` (a
   *declared* category) — added in the same commit
   ([f92d6c7], ticket 31's fix) that first surfaced the data-loss bug. The
   "undeclared category in the wild" scenario is real for any project that
   leaves `scan.category` unset; it just isn't live in this repo's own
   dogfooding today because of that alias.
3. **`reconcile`, concretely**
   (`src/storage/dualStorageRouter.ts`): `allCategories()`/`mdCategories()`
   (`:217-223`) both derive from `Object.keys(this.config.categories)`, and
   `transact()` (`:41-53`) calls `reconcile(this.mdCategories())` before
   every mutation — so the per-command drift-repair mirror only ever visits
   declared categories. `bootstrapSeed` (`:350-368`) already documents the
   asymmetry in its own comment: *"Steady-state reconcile still runs on the
   declared set only... an undeclared category is inert there."* An
   undeclared category's writes still land in both stores at write time
   (`transactMdMutation` is unconditional on declaration) — the gap is
   purely about later drift-repair, not initial data loss.
4. **Other call sites already assuming declared = whole store:**
   `checkFieldCompliance`/`repairFieldCompliance`
   (`src/index.ts:905-945`, `neuron status --check`/`--repair`) iterate
   `Object.entries(this.config.categories)` only, so an undeclared
   category's entries are never checked against any field rule.
   `MultiRootMdStorage.readAll()` (`src/storage/multiRootMdStorage.ts:96-99`)
   defaults to the declared set unless the caller passes explicit
   categories. `resolveCategoryPath`
   (`src/config/categoryPath.ts`) has no gate at all — it resolves a path
   for any category string, declared or not.
5. **`validateNeuronYaml`** (`src/config/neuronYaml.ts:483-559`) already has
   the shape a `--category` check would reuse: it throws on
   `!config.categories[cat]` for `pullRules` category references
   (`:519-540`) and for `llm.enrichment.category`'s literal fallback
   (`:544-553`). Adding an equivalent check for CLI `--category` is
   mechanically small, but it's a **write-path/CLI behavioral change, not a
   config-file-shape check** — it doesn't naturally live inside
   `validateNeuronYaml` itself.

## Scope

Open design questions for the grilling session, not pre-answered here:

1. **The core fork.** Validate `--category` (and `scan.category`) against
   `neuron.yaml`'s declared set — rejecting undeclared categories outright
   — or keep categories advisory and instead widen steady-state `reconcile`
   to follow the real stored set (the same union `bootstrapSeed` already
   computes)? These are not mutually exclusive in principle (validate *and*
   still reconcile whatever exists pre-validation), but the grilling
   session should rule which is the actual fix versus a belt-and-suspenders
   addition.
2. **The asymmetry.** Should explicit `--category` become as strict as
   inferred category (both hard-constrained to declared), or should
   inferred category loosen to match explicit (both advisory)? Silently
   leaving the asymmetry as-is should be named as an option and explicitly
   rejected or accepted, not left undecided by omission.
3. **`neuron scan`'s default.** If validation wins, what happens to a
   config that never declares `scan.category` (so it resolves to the
   undeclared `'architecture'` default) — hard error, auto-declare a
   minimal `categories.architecture` block on `neuron init`, or a
   different fallback? This repo's own config sidesteps the question by
   aliasing to `decisions`; a fresh project won't have that alias.
4. **Existing-store migration.** If validation wins, what happens to a
   store that already holds rows under an undeclared category (this repo's
   history, before the `scan.category` alias was added, is itself an
   example)? Grandfather existing rows and only validate new writes, or
   require a `neuron status --check`-style repair pass first?
5. **Where does the check live?** Given `validateNeuronYaml` isn't a
   natural fit for a CLI-argument check (see Context item 5), where should
   `--category` validation actually run if it's built — inside
   `resolveCategory`/`transact()`, at the CLI-flag-parsing layer, or
   elsewhere — and does `scan.category` reuse the same code path or need
   its own?
6. **Blast radius.** This is named in the map's own fog as *"a behaviour
   change across every command"* — confirm which commands are actually
   affected (write commands via `resolveCategory`; `neuron scan` via its
   own category resolution; `status --check`/`--repair` via
   `checkFieldCompliance`) versus which are unaffected, so the eventual
   implementation ticket has a concrete surface, not a vague "everywhere."

## Verification

This ticket resolves design only — no code changes. Verification belongs to
whatever implementation ticket graduates from it.

## Deliverables

- [ ] Grilling session resolving Scope items 1-6
- [ ] ADR recording the decision (successor to
      [ADR 0011](../../docs/adr/0011-markdown-as-store-of-record.md)/
      [ADR 0016](../../docs/adr/0016-per-category-storage-vocabulary.md),
      or a new one — decided during grilling)
- [ ] Implementation graduated as its own ticket, per this map's
      split-design-from-build precedent (16→17, 28 vs 29/30)

## Answer

Grilled with the maintainer 2026-08-09, resolving all six Scope items plus
one structural redirect mid-session. Full rationale in
[ADR 0017 — Category Declaration Authority](../../../docs/adr/0017-category-declaration-authority.md).

1. **Core fork**: categories stay advisory (no write is ever rejected for
   using an undeclared category) — but self-maintaining: the first write
   that introduces an undeclared category auto-appends a minimal
   `categories.<name>: {}` block to `neuron.yaml` on disk. This converges
   the declared set toward reality automatically, closing the gap the
   original two options (hard-validate, or widen `reconcile`'s read-time
   query without touching the file) each left open on their own.
   Auto-write requires switching `neuron.yaml` I/O to the `yaml` package's
   `Document` API (already the installed dependency) for comment-preserving
   round-trip — confirmed nothing in the codebase writes back to
   `neuron.yaml` today, and the existing convention for config/reality
   mismatches is warn-once-and-leave-manual
   (`RawStorageModeSchema`'s deprecated-spelling warning,
   `src/config/neuronYaml.ts:43-52`; `warnStaleVectorCategories`,
   `src/storage/dualStorageRouter.ts:225-260`), so this is new machinery,
   deliberately taken on rather than declined.
2. **Asymmetry**: kept exactly as-is. Inferred category (centroid/model)
   stays hard-constrained to the declared set; explicit `--category` stays
   advisory (and now self-declaring). Ruled coherent, not a bug: inference
   is a best-guess among *known* options and shouldn't invent a category
   from embedding proximity, while explicit `--category` is a deliberate
   human override the tool should trust and absorb.
3. **`neuron scan`'s default**: no special-casing needed once self-declare
   ships. This repo's own `neuron.yaml` should revert its
   `scan: category: decisions` alias (added as a ticket-31-era workaround)
   back to the real default (`'architecture'`), dogfooding the fix instead
   of leaving the workaround in place.
4. **Existing-store migration**: a one-time backfill, folded into `neuron
   status --repair` (ADR 0013's existing validation surface, ticket 13)
   rather than a standalone script or new CLI command — detects and
   declares any category with real rows but no `neuron.yaml` entry.
5. **Hook point**: traced concretely, not assumed. `neuron memory add`
   (`src/commands/memory.ts:108`) and `neuron scan`'s `ingestScanResults`
   (`src/scanner/ingest.ts:47`) both call `memory.transact()` →
   `NeuronMemory.transact()` (`src/index.ts:828`) with no fork below that
   point — `enforceFieldSchema()` (`src/index.ts:850`) already documents
   `transact()` as the single choke point every writer goes through. One
   auto-declare hook there catches both callers.
6. **Blast radius**: minimal by construction. Only `transact()` gains new
   logic; `checkFieldCompliance`/`repairFieldCompliance`
   (`src/index.ts:905-945`) and `MultiRootMdStorage.readAll()`
   (`src/storage/multiRootMdStorage.ts:96-99`) keep iterating the declared
   set unchanged and become correct for free once the
   declared-set-converges-on-actual invariant holds (helped by item 4's
   backfill for the pre-existing gap).

**Auto-declared block shape**: minimal `categories.<name>: {}`, no
invented description or tags — matches this map's stance elsewhere
(tickets 26/28) against fabricating descriptive prose.

**Structural redirect, mid-session**: the maintainer judged this bigger
than a same-map implementation ticket once the auto-write/round-trip-safety
and backfill scope became concrete, and moved the *implementation* off
`neuron-2.3.0` (already accumulating toward an rc2 cut) onto a freshly
chartered [neuron-2.4.0](../../neuron-2.4.0/map.md) map — this ticket's
design is the seed of that map's first ticket, not a same-map graduation.
This ticket itself (the grilling/design decision) resolves here, on
`neuron-2.3.0`, per this map's own Decisions-so-far.

## Comments

(none yet)
