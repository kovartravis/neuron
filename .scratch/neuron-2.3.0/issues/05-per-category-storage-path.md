Type: task
Status: unclaimed
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

- [ ] `categories.*.path` in the Zod schema, absence distinguishable from a set value
- [ ] One resolver implementing `category > top-level > .neuron`, used by every caller
- [ ] Adapter, reconcile, bootstrap seed and `sync` all multi-root aware
- [ ] Collision/validation rulings enforced in `validateNeuronYaml`
- [ ] Scaffold template and README/ADR updated
- [ ] Precedence, round-trip, containment and no-regression tests
