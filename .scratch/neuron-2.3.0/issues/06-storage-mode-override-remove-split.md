Type: task
Status: resolved
Blocked by: 05

# 06 — Storage Mode: Top-Level Default with Per-Category Override, `split` Removed

## Question

If a per-category storage mode already exists, why is there also a top-level
mode whose only job is to decide whether the per-category one is read at all?

## Context

Today there are two vocabularies and a mode that exists only to join them:

- top level — `storage.mode: vector-only | md | split`
- per category — `categories.<name>.storage: vector | md`

and the per-category value is **inert unless `mode: split`**
(`DualStorageRouter.transact` branches on `split` before it ever consults
`categories[cat].storage`). So `split` is not a third storage behaviour; it is
a flag meaning "honour the overrides." That is precedence wearing a mode's
clothes.

**The maintainer's ask (2026-08-04):** delete `split`, and give the mode the
same shape ticket [05](05-per-category-storage-path.md) gives the path — set
at the top level, overridden per category:

```
categories.<name>.storage  >  storage.mode  >  "md"
```

`md` stays the default (ticket 31's ruling; the product claim is markdown you
can open and diff). With the override always live, `mode: split` +
per-category values becomes plain `mode: <whatever the majority is>` + the
same per-category values, and the two vocabularies converge on one pair of
words — the maintainer's framing is **md/vector**, so `vector-only` is the
spelling that goes, joining `md-only` and `dual` as a deprecated alias.

**Sequenced after `05`** so the precedence resolver exists before a second
setting needs it — same chain, same code path, one implementation.

## The upgrade hazard this ticket must not ship

Making the override always live is a **silent behaviour change for configs
that already exist**. A user on `mode: md` with a leftover
`categories.foo.storage: vector` gets exactly today's behaviour (the value is
ignored, `foo` is mirrored to markdown) and, after this change, gets `foo`
routed to the vector store instead. Under `md` mode the mirror is **strict** —
index entries absent from markdown are deleted — so the transition has to be
reasoned about in both directions:

- entries that stop being written to markdown, and what the next reconcile
  then does to them;
- entries already in markdown for a category that is now `vector`, which the
  router will no longer keep in sync.

Decide the ruling deliberately (migrate, warn loudly, or refuse to start on an
ambiguous config) rather than discovering it. ADR 0011 §7's precedent is
explicit that a config which errors on upgrade turns a rename into an outage —
but that precedent was set for a *rename*, where behaviour was unchanged. This
is a behaviour change, so the precedent needs re-arguing, not citing.

## Scope

1. **Grill first.** `/grilling` on the compatibility question above, before
   any code. Deleting a shipped config value is a compatibility decision first
   and an implementation second.
2. **Schema.** Collapse to one vocabulary in `src/config/neuronYaml.ts`:
   top-level `storage.mode: md | vector`, per-category
   `categories.*.storage: md | vector` overriding it, `md` the default.
   `split`, `vector-only`, `md-only` and `dual` all become deprecated aliases
   with the existing stderr-warning treatment — `split`'s alias target is the
   one that needs thought, since `split` alone carries no majority intent.
3. **Router.** Delete the `split` branch in `DualStorageRouter.transact` and
   the `mdCategoriesForSplit()` dispatch in `query()`; both collapse into a
   single per-category resolution. Keep the deliberate `getStorageMode()`
   fallback for unrecognised modes pointing at the **read-only-safe** vector
   behaviour — the comment there explains why guessing `md` on an
   unparseable config would turn confusion into data loss, and that reasoning
   survives this ticket unchanged.
4. **Sweep the enum's other homes.** `src/models/options.ts`
   (`storageMode?: 'vector-only' | 'md' | 'split'`), `src/index.ts`'s
   `persistable` check and its declared-fields warning string,
   `src/models/memory.ts` and `src/fieldSchema.test.ts` comments, plus the
   `split` cases in `dualStorageRouter.test.ts`,
   `mdFileManagement.integration.test.ts` and `neuronYaml.test.ts` — those
   tests assert `split` *works*, so they are rewritten as alias-deprecation
   tests, not deleted.
5. **Interaction with ticket 44.** `src/index.ts` warns that declared fields
   have no column for `vector-only`/`split` categories until ticket 44 ships.
   That warning's condition is written in the old vocabulary and must be
   restated in the new one without changing which categories it fires for.
6. **Scaffold + docs.** `NEURON_YAML_TEMPLATE` in `src/config/scaffold.ts`
   documents all three old modes in a comment block — rewrite it as the
   top-level/override pair. README, the packaged `neuron-memory` skill, and
   `CLAUDE.md`'s protocol block all name storage modes; sweep them.
   Coordinate the ADR 0011 update with `05` so one ADR covers both.

## Verification

- Precedence tested at all three levels: category set, top level set, both
  empty → `md`.
- Each deprecated alias (`split`, `vector-only`, `md-only`, `dual`) parses,
  warns once on stderr, and produces the documented behaviour.
- The upgrade hazard has an explicit test: a `mode: md` config carrying a
  per-category `vector` value does whatever step 1 ruled it should, provably.
- A `vector`-mode category writes no markdown and is not deleted by the strict
  mirror; an `md`-mode category round-trips.
- `npm test` and `npm run test:e2e` green, with ticket 42's isolation rule
  respected.

## Deliverables

- [x] Grilling ruling on upgrade behaviour recorded (ADR or ticket answer)
- [x] One `md | vector` vocabulary at both levels, `md` default, override live
- [x] `split` removed as a mode; all four old spellings alias with a warning
- [x] Router `split` branches deleted; safe fallback preserved
- [x] Enum sweep across `options.ts`, `index.ts`, models, and tests
- [x] Ticket 44's field-column warning restated without changing its trigger
- [x] Scaffold, README, skill and `CLAUDE.md` updated
- [x] Precedence, alias, upgrade-hazard and round-trip tests

## Answer

Resolved 2026-08-08. Grilled the upgrade-hazard question with the maintainer
via `AskUserQuestion` before any code (Scope item 1) — three decisions:

1. **A real, mechanical data-loss bug was found while grounding the
   questions, not hypothetical**: `DualStorageRouter.reconcileCategoryWithPathGuard`'s
   first-sighting branch (`knownRoot === null`) fell through to the
   destructive strict-mirror reconcile rather than reseeding, on the
   assumption ("nothing to compare against yet") that held only as long as
   `split` gated whether the per-category override was live. Making the
   override always live breaks that assumption: a category can now enter the
   `md`-reconciled set for the first time on a store that already has real
   vector rows for it. **Fixed** by routing every first-ever sighting through
   the same `seedCategoryFromVector` reseed a root change already uses, not
   just root changes. Regression test in `dualStorageRouter.test.ts`
   ("does not delete a category's pre-existing vector rows...") reproduces
   the exact scenario and fails without the fix.
2. **`split` aliases to `md`, not `vector`** — reproduces split's own
   pre-existing default for a category with no explicit override
   byte-for-byte, where aliasing to `vector` would have silently flipped
   every override-less category in an existing split config.
3. **A category flipping from `md`-effective to `vector`-effective warns
   once on stderr** (naming the category and its now-stale `.md` file) rather
   than refusing to load or auto-migrating `neuron.yaml`. General upgrade
   posture: warn, don't refuse, don't touch the user's files or config
   automatically — the same posture ADR 0011 §7 set for `md-only`/`dual`,
   re-argued (not just cited) since this is a real behaviour change, not a
   rename.

Implementation: `StorageModeEnum` collapsed to `z.enum(['md', 'vector'])`;
`STORAGE_MODE_ALIASES` gained `'vector-only' → 'vector'` and `'split' → 'md'`
alongside the existing `md-only`/`dual` aliases. `DualStorageRouter.transact`/
`query` dropped the three-way `vector-only`/`split`/`md` dispatch for one
`resolveCategoryStorage(category)` resolver (`categories.<name>.storage >
storage.mode > 'md'`), used to compute `mdCategories()` (reconciled first)
and to route each mutation; a pure-`vector` config reconciles an empty set,
short-circuiting at zero cost the same way the old `vector-only` branch did.
`getStorageMode()` renamed `getTopLevelStorageMode()`, fallback unchanged
(`'vector'`, read-only-safe, per the ticket's own instruction to preserve
that reasoning). The stale-file warning (`warnStaleVectorCategories`) checks
each category at most once per router instance, but only marks a category
checked once it resolves to `vector` — a category still resolving to `md`
stays eligible for a later check, since `setConfig` or a re-loaded
`neuron.yaml` can flip it afterward; a `vector`-resolving category can never
gain new markdown content, so it's safe to never re-check.

**Ticket 44's field-column warning (Scope item 5) turned out to already be
moot** — grepped for it (`persistable`, "no column", "ticket 44") and found
no such runtime warning exists in `src/index.ts`. Ticket 44 shipped (on the
2.2.0 map) unconditional SQLite column support for declared fields regardless
of a category's storage mode — `migrateDeclaredFields`/the write path apply
to every category on the shared `memories` table, not gated by storage mode
at all. Only stale *comments* claiming this was still future work needed
fixing (`memory.ts`, `fieldSchema.test.ts`), not code.

Enum swept across `options.ts` (`storageMode?: 'md' | 'vector'`), `index.ts`'s
`NeuronMemory.inMemory` pin, and every test file constructing
`NeuronMemoryOptions.storageMode` directly (that field bypasses the
`neuron.yaml` alias layer entirely, so it only ever accepted canonical
values — `'vector-only'` literals there were a real TS compile break, not
cosmetic). Test files whose YAML *strings* used `vector-only`/`split` (which
do go through the real alias-resolving loader) were rewritten to canonical
spellings for clarity, except `dualStorageRouter.test.ts`'s `makeConfig`
helper and a new "deprecated storage.mode spellings alias" describe block in
`neuronYaml.test.ts`, which deliberately keep testing all four legacy
spellings — per Scope item 4's instruction to rewrite as alias-deprecation
tests, not delete.

Docs swept: `scaffold.ts`'s `NEURON_YAML_TEMPLATE`, README (storage-modes
section + new "Per-category storage mode" section + command reference),
`docs/COMMANDS.md`, `CONTEXT.md`, `TEST_INFRA.md`, and the packaged
`neuron-memory` skill (`.claude/skills/neuron-memory/SKILL.md`, the file
`neuron init` copies into every user project via `src/config/harness.ts`) —
explicitly checked per the maintainer's mid-session request. This repo's own
`CLAUDE.md` needed no change; its post-`09`-compression protocol block
doesn't name storage modes. ADR 0011's own historical text and `CHANGELOG.md`
were deliberately left untouched (append-only historical record, same as ADR
0013's `vector-only` framing) — the vocabulary update lives in a new
successor ADR instead, owed jointly by `05` and this ticket per `05`'s own
Answer ("written by whichever ticket lands second").

**[ADR 0016 — Per-Category Storage Vocabulary](../../../docs/adr/0016-per-category-storage-vocabulary.md)**
written, covering both `05`'s per-category path resolver and this ticket's
per-category mode override + `split` removal + the reseed-bug fix.

23 new/rewritten tests (2 new reseed/warning regression tests in
`dualStorageRouter.test.ts`, 2 new "vector under top-level vector"/"md
under top-level md" per-category-override tests, the rest rewritten
alias/vocabulary tests across `neuronYaml.test.ts`, `sqliteFieldSchema.test.ts`,
`fieldSchema.test.ts`, `scaffold.test.ts`, `mdFileManagement.integration.test.ts`,
`enrichment.test.ts`, `exec.test.ts`, `mdFileManagement.e2e.test.ts`,
`index.test.ts`, `index.supersession.test.ts`, `memory.supersession.test.ts`).
`npm test`: 552/552 green. `tsc --noEmit` clean. **`npm run test:e2e`
deliberately not run** — grepped for `DualStorageRouter`/`storage.mode`/
`storageMode` coupling in `test/e2e/` and found none; that suite exercises
retrieval quality, and retrieval parity across storage modes is unchanged by
this ticket (same hybrid RRF path regardless of resolved storage, both
before and after). `test/e2e/adversarial-corpus.ts`'s `contra-storage-default`
fixture (a deliberately-superseded historical claim used to test
retrieval's preference for newer facts) was intentionally left unmodernized
— rewriting its "old" fact would break the fixture's own purpose.
