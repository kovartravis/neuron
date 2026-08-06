Type: task
Status: unclaimed
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

- [ ] Grilling ruling on upgrade behaviour recorded (ADR or ticket answer)
- [ ] One `md | vector` vocabulary at both levels, `md` default, override live
- [ ] `split` removed as a mode; all four old spellings alias with a warning
- [ ] Router `split` branches deleted; safe fallback preserved
- [ ] Enum sweep across `options.ts`, `index.ts`, models, and tests
- [ ] Ticket 44's field-column warning restated without changing its trigger
- [ ] Scaffold, README, skill and `CLAUDE.md` updated
- [ ] Precedence, alias, upgrade-hazard and round-trip tests
