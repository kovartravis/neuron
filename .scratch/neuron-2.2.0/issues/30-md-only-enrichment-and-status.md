Type: task
Status: out of scope — superseded by 28, 2026-08-02, do not implement
Blocked by: 28, 29
Band: 2.2.0-rc5

# 30 — Write-Side Enrichment and Honest Counts in `md-only`

## Question

Ticket `06` shipped centroid-based tag and category inference that reads its
centroids from the vector store. `md-only` has no vector store, so it infers
nothing and hard-errors on an omitted `--category`. Make enrichment work in the
mode the product is pitched on, and make `neuron status` tell the truth there.

## Context

`md-only` sets `this.db = null` (`src/index.ts:99`). Three things read through
that null and fail quietly:

- **`getTagVocabulary()`** returns `[]`, so `selectTags` selects from an empty
  vocabulary and every entry stores `tags: []`. The per-category `tags:` block in
  `neuron.yaml` — which the repositioned README shows in its configuration
  example — is never selected from. It is decorative in this mode.
- **`getCategoryCentroids()`** returns `[]`, so `selectCategory` returns
  `undefined` and `neuron memory add` without `--category` **always** throws
  `--category is required — category inference found no category close enough`.
  Verified against the built CLI. The posture `CLAUDE.md` recommends (category
  explicit, tags inferred) is therefore impossible in `md-only`; worse, the
  posture the README's Quick Start implies is a guaranteed error.
- **`recordDegradation()`** early-returns, so the counters ADR 0010 §3 requires
  as the antidote to silent failure are themselves silently dropped.

Separately, `getStatus()` computes `totalCount`, `learnCount` and `historyCount`
as SQL against the absent DB, so `neuron status` reports **`totalCount: 0`** with
entries on disk. Measured.

This ticket depends on `29` because both need the same thing: entry embeddings
available in `md-only`. Once `29` has built that layer, centroids are the same
arithmetic they already are — `buildTagVocabulary` and `buildCategoryCentroids`
in `src/components/enricher.ts` take plain arrays of `{tags, embedding}` and
`{category, embedding}` and know nothing about SQLite. The work is feeding them,
not rewriting them.

## Scope

1. Build tag and category centroids in `md-only` from the embedding layer `29`
   provides. Reuse `buildTagVocabulary` / `buildCategoryCentroids` unchanged —
   if they need changing, that is a signal `29`'s layer has the wrong shape.
2. Confirm the `DEFAULT_TAG_SUPPORT_FLOOR` of 3 still behaves sensibly on a small
   markdown store. A fresh `md-only` project is exactly the cold-store cliff
   already fogged on this map under *"Bootstrapping category centroids on a cold
   store"* — this ticket is where that fog either graduates or is consciously
   accepted and documented.
3. Make `neuron status` counts mode-independent: source them from the storage
   router rather than SQL, so every mode reports what it actually holds.
4. Persist degradation counters in `md-only`. They currently live in the SQLite
   `meta` table; decide where they go when there is no table, or accept and
   document that they are process-scoped in this mode.
5. Re-check the `md-only` note in `src/index.ts:576` — it claims enrichment
   "works identically in md-only mode, where `transactVector` never runs". That
   comment is currently false and must end up either true or gone.

## Verification

- In a fresh `md-only` project, after a handful of explicitly-categorised
  entries: `neuron memory add` **without** `--category` succeeds and files the
  entry sensibly.
- An entry written without `--tags` receives tags drawn from the store's
  vocabulary, and the declared `neuron.yaml` tags are selectable.
- `neuron status` on a store with N entries on disk reports N.
- The E2E enrichment pillars (11 and 12) run against `md-only` as well as
  `vector-only`, or it is recorded why they do not.
- Unit + E2E green.

## Deliverables

- [ ] Tag and category inference work in `md-only`
- [ ] Omitted `--category` no longer guaranteed to fail
- [ ] `neuron status` counts honest in every storage mode
- [ ] Degradation counters resolved for `md-only`
- [ ] The stale `index.ts:576` comment true or deleted

## Comments

- 2026-08-02: Filed as part of the rc5 markdown-first band. This graduates the
  map's *"Enrichment in md-only storage mode"* fog patch, which asked whether
  md-only deserved parity, a documented limitation, or a warning. The
  repositioning answers it: md-only is the recommended default, so it gets parity.

## Ruled out of scope — 2026-08-02

**Superseded by [`28`](28-md-only-parity-design.md). Do not implement.**

Every defect this ticket was filed to fix is a symptom of one line —
`md-only` setting `this.db = null` (`src/index.ts:100`). `28` concluded that
`md-only` should be **deleted** rather than repaired, and that the renamed `md`
mode (today's `dual`) keeps the database and demotes it to a rebuildable index.

With the database present:

- `getTagVocabulary()` and `getCategoryCentroids()` read real rows, so tag and
  category inference work unchanged — `buildTagVocabulary` /
  `buildCategoryCentroids` never knew about storage mode in the first place.
- `neuron memory add` without `--category` stops hard-erroring, because
  centroids have something to select from.
- `recordDegradation()` persists to `meta` as it always did.
- `getStatus()`'s `COUNT(*)` returns the true count instead of `0`.

So the work here **vanishes rather than being done**, which is why this is out
of scope rather than resolved: nothing on the route was decided, a scope
boundary moved.

Two items outlive the ticket and were rehomed:

- The stale `md-only` comment at `src/index.ts:576` gets deleted along with the
  mode, in [`29`](29-md-only-semantic-search.md).
- **Cold-store centroid bootstrapping** returns to the map's *Not yet specified*
  section unchanged. `28` found it is not an `md`-mode problem at all — a fresh
  `md` project has exactly the cliff a fresh `vector` project has.

See [ADR 0011](../../../docs/adr/0011-markdown-as-store-of-record.md).
