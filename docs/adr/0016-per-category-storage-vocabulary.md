# ADR 0016 — Per-Category Storage Vocabulary: Path and Mode Overrides, `split` Removed

- **Status:** Accepted (2026-08-08)
- **Supersedes:** part of [ADR 0011 — Markdown as the Store of Record](0011-markdown-as-store-of-record.md) (the `storage.mode` vocabulary and the single-root storage-path assumption)
- **Relates to:** [ADR 0011](0011-markdown-as-store-of-record.md)
- **Tickets:** 05 — Storage Path: Top-Level Default with Per-Category Override (ticket `92f165f7-7720-46f2-9abb-9fea846bd6c3`), 06 — Storage Mode: Top-Level Default with Per-Category Override, `split` Removed (ticket `dbed3219-6cfd-45e5-9b4d-c8e2d03e1a14`)

## Context

ADR 0011 introduced three top-level storage modes — `vector-only`, `md`,
`split` — and a per-category `storage: vector | md` value. But the
per-category value was **inert unless `storage.mode: split`**:
`DualStorageRouter.transact`/`query` branched on the top-level mode string
first, and only the `split` branch ever consulted `categories[cat].storage`.
`split` was not a third storage behaviour; it was a flag meaning "honour the
per-category overrides." That is precedence wearing a mode's clothes, and it
left two separate problems unaddressed:

1. **One storage path for the whole project.** `storage.path` resolved once,
   into a single `MdStorageAdapter` rooted at one directory. A project that
   wanted `decisions.md` next to its other docs while `history.md` stayed in
   `.neuron/` had no way to say so.
2. **A mode that only existed to unlock another setting.** Deleting the
   inert-unless-`split` behaviour and making the per-category override
   always live collapses two vocabularies (top-level mode, per-category
   storage) that were never actually orthogonal into one precedence chain.

## Decision

**Both `path` and `storage` become overridable per category, with the same
shape:**

```
categories.<name>.path     >  storage.path     >  ".neuron"
categories.<name>.storage  >  storage.mode     >  "md"
```

`split` is deleted. The top-level vocabulary collapses to two canonical
values, converging with the per-category one: **`md`** (default) and
**`vector`**. `vector-only`, `md-only`, `dual`, and `split` are all
deprecated aliases — parsed with a stderr warning rather than hard-failing,
the same posture ADR 0011 §7 set for `md-only`/`dual`. `split` aliases to
`md`, not `vector`, because that reproduces split-mode's own pre-existing
default for a category with no explicit override (`mdCategoriesForSplit`
treated anything not explicitly `vector` as `md`) — aliasing to `vector`
would have silently flipped every override-less category in an existing
split config to vector-only.

### Storage path: adapter-per-root registry

`MultiRootMdStorage` (`src/storage/multiRootMdStorage.ts`) fans the existing
`MdStorage` interface out across every root a category's path resolves to,
backed by a lazily-populated `Map<root, MdStorageAdapter>` — two categories
sharing a root share one adapter instance. `MdStorageAdapter` itself is
unchanged: still a plain single-root class, still the same path-traversal
containment guarantee, now applied per resolved root rather than once
globally. Chosen over teaching the single-root adapter to resolve
internally, so the sanitization/containment logic is not duplicated per
category.

A category's resolved root can change between runs (an edited `neuron.yaml`).
Rather than physically moving the file, a changed root triggers a
per-category re-export from the vector index — the trustworthy source — into
the new location, tracked by a `md_root:<category>` meta key. The old file is
left on disk, untouched, not renamed or deleted: a plain relocate can't
handle a category that was never on disk (e.g. started life as
`vector`-mode), and needs the same before/after tracking anyway.

### Storage mode: one per-category resolver, no dispatch

`DualStorageRouter.resolveCategoryStorage(category)` is the single
precedence resolver; `transact()`/`query()` no longer branch on the top-level
mode at all. Both compute the set of categories currently resolving to `md`,
reconcile only that set, then route each mutation individually. A pure-`vector`
config reconciles an empty set, which short-circuits immediately — the same
zero-cost path the old `vector-only` branch's direct write gave, reached now
without a special case.

### The reseed bug this override unmasked

Making the per-category override always live opened a **real, mechanical
data-loss window** in code that predates this ticket:
`reconcileCategoryWithPathGuard`'s first-sighting branch (`knownRoot ===
null`) used to record the category's root and fall through to the
destructive strict-mirror reconcile, on the reasoning that "nothing to
compare against yet" meant nothing needed reseeding. That reasoning held only
as long as every category reaching the method had already been reconciled at
least once — true under ADR 0011's original modes, where a category's
membership in the reconciled set never changed shape between runs. This
ticket breaks that assumption: a category can now enter the `md`-reconciled
set for the first time on a store that already holds real vector rows for
it (e.g. a `storage.mode: md` config whose `categories.foo.storage: vector`
used to be silently ignored, or the reverse). Falling through to the
destructive mirror in that case would read the category's never-written
`.md` file as empty and delete every one of its vector rows as "absent from
markdown."

**Fixed by routing every first-ever sighting through the same
`seedCategoryFromVector` reseed a root change already uses**, not just root
changes. For a genuinely brand-new category (nothing in either store yet)
this is a harmless zero-row export.

### Disclosure, not migration, for the reverse direction

When a category's resolved storage flips the other way — `md` to `vector`,
on a store that already has real markdown for it — nothing is deleted: the
category simply drops out of the reconciled set, so its `.md` file stops
being written. But the file goes silently stale, diverging from what's
actually in SQLite. `DualStorageRouter` warns once per process on stderr
naming the category and file, rather than refusing to start or attempting an
automatic migration. The ADR 0011 §7 precedent — a config that errors on
upgrade turns a rename into an outage — was set for a rename where behaviour
was unchanged; this is a real behaviour change, so the precedent was
re-argued rather than cited, and the ruling is the same: warn, don't block,
don't touch the user's `neuron.yaml` or their files automatically.

## Alternatives considered

- **Refuse to start on an ambiguous upgrade** (a category's live-resolved
  storage differs from what its `md_root` meta implies was reconciled
  before). Rejected: more conservative than reseeding, but turns an upgrade
  into an outage for a condition the reseed fix already makes safe.
- **Alias `split` to `vector`.** Simpler mapping, but silently changes
  behaviour for every existing split config category that relied on the
  implicit `md` default — rejected in favour of the alias that reproduces
  existing behaviour byte-for-byte.
- **A single internally-resolving `MdStorageAdapter`** for multi-root storage,
  instead of an adapter-per-root registry. Rejected: would have duplicated or
  relocated the existing single-root class's sanitization/containment logic
  rather than reusing it unchanged.

## Consequences

**Positive**

- One precedence chain, not two independently-alias-warning vocabularies —
  `path` and `storage` now read the same way.
- The category-level control this ADR grants (route a high-volume category
  to `vector`-only storage, keep the rest in reviewable markdown) no longer
  requires the top-level project to also be in a special mode.
- A real, silent-data-loss bug in first-sighting reconciliation is closed as
  a side effect of specifying this feature properly, not discovered later in
  production.

**Negative**

- Four deprecated top-level spellings now alias (`md-only`, `dual`,
  `vector-only`, `split`) instead of two — more surface for `neuron status
  --check`/`--repair` (ticket 13) to eventually validate against.
- A category flip from `md` to `vector` leaves an orphaned, silently-stale
  `.md` file on disk if the user doesn't act on the warning and remove it.
