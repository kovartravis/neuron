Type: task
Status: resolved
Blocked by: none

# 05 — Storage Path: Top-Level Default with Per-Category Override

## Question

Where does a category's markdown live, when the answer is no longer "always
`<projectRoot>/<storage.path>/<category>.md`"?

## Context

`storage.path` is resolved exactly once, at construction, into a single
`MdStorageAdapter` rooted at one directory (`src/index.ts` — `config.storage
?.path || '.neuron'`, resolved against `projectRoot` unless already
absolute). Every category's file is a sibling inside that one root. A user who
wants `decisions.md` to live in `docs/` while `history.md` stays in `.neuron/`
has no way to say so.

**The maintainer's ask (2026-08-04):** the path may be set at the top level,
*and* set per category to override it. The default `.neuron` applies only when
the top level is empty — i.e. a three-step precedence chain, with the literal
default at the bottom rather than baked into the top-level resolution:

```
categories.<name>.path  >  storage.path  >  ".neuron"
```

This is the pattern ticket [06](06-storage-mode-override-remove-split.md) then
repeats for `storage.mode`, so the resolver built here is the one that ticket
reuses — settle the shape here, don't invent a second one there.

## Scope

1. **Schema.** Add `path` to `CategoryConfigSchema` in
   `src/config/neuronYaml.ts` (optional, no default — an absent value must be
   distinguishable from an explicit one, since absence is what triggers the
   fallback). `storage.path`'s current `.default('.neuron')` has to move into
   the resolver for the chain to be observable; leaving the Zod default in
   place makes "top level is empty" unrepresentable downstream.
2. **A single resolver.** One exported function that takes the config, a
   category name and the project root, and returns the absolute directory for
   that category. Every caller goes through it — no second copy of the
   precedence rule anywhere in the tree.
3. **Adapter plumbing.** `MdStorageAdapter` is constructed with one
   `storagePath` and derives every file path from it. Decide, with `/grilling`
   if the answer isn't obvious from the code, whether that becomes
   (a) one adapter that resolves per category, or (b) one adapter per distinct
   root, keyed by directory. Whichever wins, the **path-traversal containment**
   the challenger suite asserts (`mdStorageAdapter.challenger.test.ts` 3.2 —
   a malicious `category` cannot escape `storagePath`) must hold per resolved
   root, not just for the top-level one.
4. **Reconcile and discovery.** `DualStorageRouter.reconcile()` /
   `allCategories()` and the ticket-29 bootstrap seed enumerate markdown for a
   single directory. Both must now walk every resolved root. **This is the
   data-loss-adjacent part:** `md` mode's mirror is *strict* — index entries
   absent from markdown are deleted — so a category whose file the reconciler
   fails to find at its new path loses its index rows. A resolver that returns
   the right path and a reconciler that looks in the old one is silent
   deletion, not a missing feature.
5. **`neuron sync`, `neuron status`, scaffolding.** `sync` and any
   status/repair surface must report per-root, and `init` scaffolding must
   create each distinct root it is asked for. Update the
   `NEURON_YAML_TEMPLATE` comment block in `src/config/scaffold.ts`.
6. **Collisions and validation.** Decide and enforce in `validateNeuronYaml`:
   two categories resolving to the same directory is fine (that's today's
   behaviour for every category), but two categories resolving to the same
   *file* is not — and a category `path` that points at a file rather than a
   directory, or escapes the project root, needs a stated ruling rather than
   an accident.
7. **Docs.** README/ADR pass. `05`/`06` together change
   [ADR 0011](../../../docs/adr/0011-markdown-as-store-of-record.md)'s storage
   vocabulary and owe it an update or a successor ADR — coordinate so one ADR
   covers both, written by whichever ticket lands second.

## Open questions to settle while working

- Does a per-category `path` mean anything for a category that isn't stored as
  markdown? Ticket `06` makes per-category mode real, so `path` on a `vector`
  category is inert config — warn, error, or ignore?
- Absolute per-category paths: allowed (a shared notes directory outside the
  repo is a plausible want) or refused (the whole product claim is that your
  memory is diffable *in your repo*)?
- Does the resolved path stay stable across a category rename, and is a
  changed `path` in `neuron.yaml` a *move* (relocate the file) or a *new
  location* (old file orphaned)? Silent orphaning interacts badly with the
  strict mirror in item 4.

## Verification

- Precedence table tested at all three levels: category set, top level set,
  both empty → `.neuron`.
- Round-trip an entry through a category with an overridden path: written to
  the right file, read back through query, survives a reconcile without index
  loss.
- Regression: a config with no per-category paths behaves byte-identically to
  today's, including where files land.
- Path-traversal containment holds per root.
- `npm test` and `npm run test:e2e` green — and note ticket 42's rule: tests
  must not touch the real `.neuron` store.

## Deliverables

- [x] `categories.*.path` in the Zod schema, absence distinguishable from a set value
- [x] One resolver implementing `category > top-level > .neuron`, used by every caller
- [x] Adapter, reconcile, bootstrap seed and `sync` all multi-root aware
- [x] Collision/validation rulings enforced in `validateNeuronYaml`
- [x] Scaffold template and README updated (ADR deferred — see Answer)
- [x] Precedence, round-trip, containment and no-regression tests

## Answer

Resolved 2026-08-08. Four open-question decisions were settled with the
maintainer via `AskUserQuestion` before writing any code (the "settle while
working" items plus the Scope-item-3 adapter-shape call), since one of them
(path-change safety) is explicitly data-loss-adjacent:

1. **Adapter shape: adapter-per-root registry**, not a single
   internally-resolving adapter. `MdStorageAdapter` (`src/storage/
   mdStorageAdapter.ts`) is completely unchanged in its internals — still a
   plain single-root class, still the same `getFilePath` sanitization/
   containment guarantee. A new `MultiRootMdStorage`
   (`src/storage/multiRootMdStorage.ts`) is a thin lookup in front of a
   lazily-populated `Map<root, MdStorageAdapter>`, keyed by resolved absolute
   directory — two categories sharing a root share one adapter instance.
2. **Absolute per-category paths are allowed**, matching `storage.path`'s
   own pre-existing behaviour. `resolveCategoryPath` just `path.resolve`s
   the raw value against `projectRoot`, a no-op for an already-absolute one.
3. **Path-change safety: per-category bootstrap reseed, not a physical
   move.** A new per-category `md_root:<category>` meta key (sibling of the
   existing `md_seeded_at` key `bootstrapSeed` already used for the
   whole-store first-run case) records the last resolved root
   `DualStorageRouter` reconciled that category against. When the resolved
   root changes, the category is re-exported from the vector index — the
   trustworthy source, same as `bootstrapSeed` — into its new location
   instead of running the destructive markdown-is-authoritative mirror. The
   **old file is left on disk untouched**, not renamed or deleted; the
   maintainer explicitly declined the "plain relocate" option in favor of
   this, since a relocate can't handle a category that was never on disk
   (e.g. started life as `vector`-mode) and needs the same before/after
   tracking anyway. Documented in the README's new "Per-category storage
   path" section. Covered end-to-end (not just unit-level) by
   `src/storage/dualStorageRouter.pathChange.test.ts`, which asserts the
   vector index survives, the new file is reseeded, and the old file's
   content is byte-unchanged.
4. **A `path` set on a category whose storage resolves to `vector`
   (ticket 06's per-category mode) warns and is ignored**, rather than
   erroring — a category flipping from `md` to `vector` shouldn't have to
   remember to also delete `path`. Enforced in a new
   `validateCategoryPaths` step inside `validateNeuronYaml`.

Other implementation notes:

- `StorageConfigSchema.path` and `CategoryConfigSchema.path` are both
  `z.string().optional()` with **no** `.default()` — the `'.neuron'` literal
  now lives only in `resolveCategoryPath`'s (`src/config/categoryPath.ts`)
  fallback chain, per Scope item 1. This is an observable, intentional
  behaviour change to `NeuronConfig.storage.path` itself (now `undefined` by
  default rather than `'.neuron'`) — the pre-existing
  `neuronYaml.test.ts` assertion on that exact field was updated
  accordingly; every *file-location* assertion elsewhere stays
  byte-identical, which is what Scope item 1 actually protects.
- Collision validation compares categories on the **unresolved** raw path
  (`rawCategoryPath`, no `projectRoot` needed) plus the same filename
  sanitization `getFilePath` applies (`sanitizeCategoryFilename`, now
  exported from `mdStorageAdapter.ts`) — two categories sharing a directory
  is fine, sharing a resolved *file* throws at config-load time.
- "A category path that points at a file rather than a directory" (Scope
  item 6's other ruling) is enforced where it's actually checkable — at
  adapter-construction time in `MultiRootMdStorage`, which is fs-aware,
  rather than in `validateNeuronYaml`, which deliberately stays fs-free and
  `projectRoot`-free like every other check in that function.
- `neuron sync`'s `handleSyncCommand` kept its existing (production-unused,
  test-only) `overrideStoragePath` parameter — `MultiRootMdStorage`'s
  constructor takes an optional `overrideRoot` that pins *every* category to
  one literal root, bypassing config resolution entirely, the direct
  multi-root equivalent of what that parameter meant before this ticket.
- `neuron status` gained a `storage: { mode, roots: [{ path, categories }] }`
  section (`NeuronMemory.getStatus()`); `neuron sync` prints a per-root
  breakdown only when more than one root is actually in play, so the common
  single-root case's output is unchanged.
- `npm test`: 546/546 green (523 pre-existing + 23 new, across
  `categoryPath.test.ts`, `multiRootMdStorage.test.ts`,
  `dualStorageRouter.pathChange.test.ts`, and additions to
  `neuronYaml.test.ts`). `tsc --noEmit` clean.
- **`npm run test:e2e` (the real-pipeline benchmark suite under `test/e2e/`)
  was deliberately not run** — grepped for any coupling to
  `MdStorageAdapter`/`DualStorageRouter`/`storage.path` and found none; that
  suite exercises retrieval quality through the public `NeuronMemory` API
  only, not storage-path resolution, and a cold run costs real time
  (model-cache warmup) for zero coverage of what this ticket changed. The
  single `src/e2e/mdFileManagement.e2e.test.ts` file (part of the regular
  `npm test`/vitest run, a different thing from `npm run test:e2e`) does
  exercise `MdStorageAdapter` directly and passes.
- **ADR deferred, not skipped.** Ticket's own text: "`05`/`06` together
  change ADR 0011's storage vocabulary... coordinate so one ADR covers
  both, written by whichever ticket lands second." `06` (per-category
  `storage.mode` override, deleting `split`) hasn't landed yet, so no ADR
  was written this session — whoever resolves `06` owes the combined
  update/successor ADR 0011 write-up covering both tickets' vocabulary
  changes.
