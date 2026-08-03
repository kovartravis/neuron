Type: task
Status: resolved
Blocked by: 28, 35, 38
Band: 2.2.0-rc5

# 29 — The Markdown↔Vector Reconcile Engine

> **Rewritten 2026-08-02 by [`28`](28-md-only-parity-design.md)'s resolution.**
> This ticket was *"Real Semantic Search in `md-only`"*. That work **dissolved**:
> `28` concluded `md-only` should be deleted rather than fixed, and the renamed
> `md` mode (today's `dual`) inherits full hybrid RRF retrieval because it keeps
> the database — `DualStorageRouter.query()` falls straight through to
> `this.vectorDb.query()` at `dualStorageRouter.ts:211`, the same code path as
> `vector-only`. There is no semantic search to build. `queryMarkdownOnly` and
> `mdEmbedCache` are **deleted**, not wired.
>
> What is left is the mechanism that makes markdown authoritative, which did not
> previously exist. That is this ticket now.

## Question

Make the `.md` files the store of record: markdown writes land first, the vector
index follows, hand-edits propagate automatically, and an entry deleted from a
file is deleted from the index.

## Question this ticket does *not* re-open

The storage design, the strict-mirror rule, the bootstrap direction, and the
hand-edit contract. [`28`](28-md-only-parity-design.md) decides all four; the
spec is [`.scratch/md-first/spec.md`](../../md-first/spec.md) and the record is
[ADR 0011](../../../docs/adr/0011-markdown-as-store-of-record.md). If this
ticket finds an answer unworkable, that is a finding to take back to `28`, not a
decision to make here.

## Scope

1. **Delete `md-only`.** Remove the mode from `StorageModeEnum`
   (`src/config/neuronYaml.ts:8`), delete `queryMarkdownOnly` and
   `transactMarkdownOnly`'s exclusive path, delete `mdEmbedCache`
   (`dualStorageRouter.ts:19`). Rename `dual` → `md` throughout, with
   `md-only` and `dual` **aliasing** to `md` and warning on stderr.

2. **Flip the write order.** Markdown first; the vector write happens only if
   the markdown write succeeded. Today it is inverted — vector at
   `dualStorageRouter.ts:58`, markdown at `:63`, with the vector write wrapped
   in a bare `catch {}`. That bare catch must go: a swallowed vector failure is
   how the index silently drifts from the record of truth.

3. **Per-entry content hashing.** Store a content hash alongside each vector
   row. On open, compare against the parsed markdown and re-embed only entries
   whose hash changed. Measured budget: detection across a 264-entry store is
   **0.006 ms**; re-embedding one changed entry is **2.39 ms**, against
   **~630 ms** for its whole category. Per-category `mtimeMs` keying is
   explicitly rejected.

4. **Reconcile on every command**, not on an explicit sync. `neuron sync`
   survives as the forced full rebuild.

5. **Strict mirror on deletion.** An entry in the index and absent from markdown
   is deleted. No percentage tripwire, no `--force` gate — see ADR 0011 for why
   git is the recovery mechanism.

6. **Bootstrap seed.** On the first run in `md` mode against a populated vector
   store with no established markdown, reverse the direction: export
   vector → markdown, then record `meta.md_seeded_at`. Strict mirror engages
   only after the marker exists. **This is load-bearing** — without it, "not
   seeded yet" and "a human deleted everything" are the same observable state.

7. Fix the `split` dispatch no-op at `dualStorageRouter.ts:183` while renaming,
   and give `split`'s per-category vocabulary (`md`/`vector`/`dual`) the same
   treatment as the top-level modes.

## Verification

- **Hand-edit round trip:** edit an entry's content in the `.md` file, run any
  command, query — the new content is what matches. No sync step, no stale
  embedding.
- **Deletion propagates:** delete an entry's block from a `.md` file, run any
  command, confirm it is gone from the index.
- **Bootstrap:** against a populated vector store with 264 entries and no
  markdown, first `md`-mode run **exports 264 entries** rather than deleting
  them. Then, with `md_seeded_at` set, an emptied file *does* delete. Both
  directions need a test — this is the pair that separates a migration from a
  wipe.
- **Churn:** an entry edited once re-embeds once. Assert the embed count, not
  just the result; the failure mode this guards is a loop, and a loop still
  produces correct output.
- **Cold-start latency** on a ≥200-entry store, recorded for
  [`32`](32-ship-repositioned-readme.md).
- Unit + E2E green.

## Deliverables

- [x] `md-only` deleted; `dual` renamed `md`; both aliased with warnings
- [x] Markdown written before vector, bare `catch {}` removed
- [x] Per-entry content hashing, re-embedding only what changed
- [x] Strict mirror on deletion, with tests both sides of the bootstrap marker
- [x] `meta.md_seeded_at` seeding path
- [x] `split` dispatch no-op fixed and vocabulary renamed
- [x] Reconcile latency recorded for `32`

## Comments

- 2026-08-02: Filed as part of the rc5 markdown-first band, as *"Real Semantic
  Search in `md-only`"*.
- 2026-08-02: Rewritten by `28`. Blockers gained **`35`** — the design creates a
  defect it cannot ship with: `mdStorageAdapter.ts:326` mints a fresh UUID on
  *every read* for an entry missing its `id`, so strict mirror plus
  reconcile-on-every-command would insert and delete it on alternating commands,
  re-embedding forever. Deterministic entry identity is a prerequisite, not a
  parallel concern. Blockers also gained **`38`** (remove `scope`), sequenced
  first so reconcile is not built to mirror a field that is disappearing.
- 2026-08-02: Resolved, test-first, AFK. Built the reconcile engine per scope:

## Answer

**`md-only` deleted, `dual` renamed `md`.** `StorageModeEnum` is now
`vector-only | md | split`; `md-only` and `dual` alias to `md` at config-parse
time with a stderr warning (`neuronYaml.ts`), so a raw string reaching
`DualStorageRouter` directly is just another unrecognized mode (falls back to
`vector-only`, same bucket as any invalid string). `NeuronMemory` no longer
sets `this.db = null` for any mode — every mode keeps the database now, since
there is no more "no database" mode to serve.

**Write ordering flipped.** `transactMdMutation` writes markdown first; on
`upsert` the vector embed is only attempted once the markdown write has
succeeded, and a vector-side failure is reported to stderr
(`[neuron warning] vector index write failed...`) rather than swallowed in a
bare `catch {}` — the next reconcile pass repairs it. `update`/`delete` keep
report-success-if-either-store-changed semantics (deliberately preserved, see
`mdVectorSync.ts`'s divergence handling) since those target an entry that may
have already drifted to one side.

**Reconcile engine** (`DualStorageRouter.reconcile`, private, invoked at the
top of `transact`/`query` for `md` and `split` modes): gated on
`meta.md_seeded_at`. Unseeded → bootstrap-export every configured category
from vector to markdown, then set the marker (a no-op export on a fresh
store, so the marker gates on presence, not data). Seeded → per category,
diff markdown against the vector index by `computeMemoryHash` (reused from
`mdVectorSync.ts`, not reimplemented): missing-or-changed in vector →
re-embed from markdown (markdown always wins, no conflict to report, unlike
the two-way `neuron sync` command which survives unchanged as the explicit
forced rebuild); present in vector but absent from markdown → deleted, no
tripwire. Measured on a 264-entry store with the mock embedder: **~6.5ms
steady-state, ~7ms with exactly one changed entry** — recorded here for `32`.
Per-entry hashing (not `mdEmbedCache`'s deleted per-category `mtimeMs`
keying) means one changed entry re-embeds once, asserted by spy-counting
`vectorDb.transact` calls across two consecutive queries, not just checking
the eventual result — the failure mode this guards (an insert/delete churn
loop) still produces a correct final answer, so the count is the real
assertion.

**`split` dispatch no-op fixed by elimination, not patched.** Query-side
dispatch used to (mis-)branch categories into an `mdCats`/`vecCats` split that
had no actual behavioral effect once `md-only`'s substring matcher is gone —
both buckets read through the same `vectorDb.query()` hybrid path, so
`DualStorageRouter.query()` now just delegates unconditionally (after
reconciling, for `md`/`split`). Per-category vocabulary (`vector`/`md`/`dual`)
gets the identical rename treatment as the top level: `dual` aliases to `md`
with a warning, and `md` at the category level now means
markdown-first-with-vector-index (what `dual` used to mean) — there is no
more "pure markdown, no vector row ever" option at either level.

**Tests:** two pre-existing `dualStorageRouter.test.ts` tests
("vector-only-survivor" delete/update) encoded the *old* model, where an
entry orphaned by an out-of-band markdown deletion sat in the vector index
until a later update/delete happened to salvage it. That model is exactly
what strict-mirror reconcile supersedes — the orphan is now purged on the
very next command, before the mutation is even processed — so those two
tests were rewritten: one new test proves the purge-then-not_found behavior
directly, and the "report success if either store changed" tests were
rebuilt against genuine same-command divergence (a mocked disk error) instead
of a since-superseded cross-command scenario. The `md-only`-mode substring
search tests (router-level and `NeuronMemory`-level) were rewritten against
the real hybrid RRF path per ADR 0011 §6 ("retrieval parity by construction",
not a caveat). 303 tests green (unit + E2E); the one intermittent failure
seen mid-session (`concurrency-stress.test.ts` Pillar 8, three different
symptoms across three runs — table-mismatch, contention-ratio, and
duplicate-column-on-migration) is a pre-existing multi-process migration race
in code this ticket never touched, confirmed by it already failing on the
unmodified baseline before any change in this session; it passed clean on
the final full run and is not a regression from this ticket.
