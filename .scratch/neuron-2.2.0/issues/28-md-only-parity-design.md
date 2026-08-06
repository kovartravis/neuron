Type: grilling
Status: resolved
Blocked by: none
Band: 2.2.0-rc5

# 28 — What `md-only` Parity Actually Means

## Question

`md-only` is about to become the mode the product is *pitched on*. It currently
has no semantic search, no enrichment, and a wrong entry count. What is the
parity bar — and what is the storage design that reaches it without
reintroducing the database the pitch says isn't there?

## Context

The repositioning makes `md-only` the recommended default: memory as plain
`.md` files a developer can open, diff, hand-edit, and review in a PR. Measured
against the shipped CLI (`2.2.0-rc1` build, 2026-08-02), `md-only` does not
currently support that claim.

### What actually works

Genuinely good, and worth protecting through any redesign: the files themselves.
`.neuron/<category>.md`, one per category, created on demand, each entry a
YAML-frontmatter block (`id`, `createdAt`, `importance`, `tags`, `scope`,
`taskId`) above its content. Readable, greppable, diffable, hand-editable.
`memory add`, `memory list`, `memory delete`, `memory update` and `neuron scan`
all work.

### What does not

**1. There is no semantic search.** `queryMarkdownOnly`
(`src/storage/dualStorageRouter.ts:215`) resolves its embedder at `:217` via
`(this.vectorDb as any)?.getEmbedder?.() || (this.vectorDb as any)?.embedder`.
In `md-only`, `this.vectorDb` is the delegate object built at `src/index.ts:106`,
which carries exactly two methods — `transact` and `query` — and neither of those
properties. So `embedder` is **always `undefined`**, the whole embedding branch
at `:232` and `:251` is dead, and every text query falls to `:270`: a
`content.toLowerCase().includes(queryText.toLowerCase())` substring test.

Measured against a store whose entry reads *"Tree-sitter grammars are fetched at
init and cached in the env-paths data dir"*:

| Query | Hits |
|---|---|
| `"fetched at init"` — exact substring | 1 |
| `"where are grammars stored"` — same meaning | 0 |
| `"init at fetched"` — same words, reordered | 0 |

It is not weak semantic search. It is whole-string substring matching, not even
tokenised — so it is beaten by `grep`, which at least takes a regex. Note the
dead code at `:226-243` maintains an `mdEmbedCache` keyed on file `mtimeMs`
that nothing ever populates: the intended design is visibly there, unwired.

**2. Enrichment infers nothing.** Tag and category centroids are built from
embeddings stored in the vector DB (`getTagVocabulary` / `getCategoryCentroids`,
`src/index.ts`), both of which return empty when `this.db` is null — which is
exactly what `md-only` sets it to (`src/index.ts:99`). Consequences:
   - Every entry stores `tags: []`. The per-category `tags:` declared in
     `neuron.yaml` are never selected from, so that config block is decorative.
   - `neuron memory add` **without** `--category` hard-errors 100% of the time
     ("category inference found no category close enough"), because centroid
     selection has nothing to select from. The posture `CLAUDE.md` recommends —
     category explicit, tags inferred — is impossible in the recommended mode.

**3. `neuron status` reports `totalCount: 0`** with entries on disk; the counts
are SQL `COUNT(*)` against the absent DB. Same root cause as the degradation
counters, which are also silently dropped (`recordDegradation` early-returns on
`!this.db`).

### The design tension this ticket exists to resolve

Semantic search needs embeddings. Embeddings are 384 float32s per entry — 1.5 KB
of base64 noise that must not land in a file whose entire selling point is that a
human can read and diff it. So embeddings live *somewhere else*, and the question
is where, given that "no database to inspect" is the pitch.

The obvious answer — a cache, keyed on content hash, in the `env-paths` data dir
alongside the ONNX models and `.wasm` grammars — needs testing against the pitch
before it is assumed. A cache is not a store of record: delete it and nothing is
lost but time. That is a defensible distinction, but it must be *made*
deliberately and stated in the README, or the first reader who finds a SQLite
file in their data dir concludes the "no database" claim was marketing.

## Suggested starting questions for the grilling

1. Is the parity bar "`md-only` retrieves as well as `vector-only`", or something
   weaker and honestly stated? `vector-only` is hybrid RRF over semantic + FTS5.
   Reproducing FTS5 over markdown is a much larger job than reproducing cosine.
2. Where do embeddings live, and what is the story when a user deletes that
   location, or clones the repo fresh on another machine? Recomputing 200 entries
   at ~4 ms each is under a second — is a cold recompute simply *fine*, making
   the cache a pure optimisation with no correctness role?
3. The existing `mdEmbedCache` invalidates a whole category on any `mtimeMs`
   change, so one hand-edited line re-embeds every entry in the file. Is
   per-entry content-hash keying worth it, or is per-category good enough at
   realistic store sizes?
4. Hand-editing is the headline feature. What happens when a human edits an
   entry's content but not its `id`? When they delete the frontmatter? When they
   paste an entry with a duplicate `id`? Today the answer to at least one of
   these is a random new UUID (see the `MdStorageAdapter` frontmatter-splitting
   defect in the store's `learning` category).
5. Does enrichment in `md-only` build centroids by reading and embedding the
   whole store on every inferring write? At what store size does that stop being
   acceptable, and is that the same threshold the vector path already has fogged?
6. Should `neuron status` counts come from the router rather than SQL, so every
   mode reports honestly — and is that a `28` decision or just a bug to fix in
   `30`?

## Deliverables

- [ ] A written spec at `.scratch/md-first/spec.md` covering the embedding
      layer, the parity bar, and hand-edit semantics
- [ ] An ADR if the embedding-cache decision warrants one — it changes what
      "no database" means, which is a claim the product is now built on
- [ ] Tickets `29`, `30` and `31` re-scoped against the answers, or split further

## Comments

- 2026-08-02: Filed as the first ticket of the rc5 markdown-first band. Typed
  `grilling` because the storage question is a design decision with a public
  claim attached, not an implementation detail. Everything else in the band
  depends on its answer, which is why it blocks four tickets.

## Answer

**`md-only` should not exist. It is deleted, `dual` is renamed `md`, and
markdown becomes the store of record with the vector store as a rebuildable
index.**

Full spec: [`.scratch/md-first/spec.md`](../../md-first/spec.md).
Decision record: [ADR 0011](../../../docs/adr/0011-markdown-as-store-of-record.md).

### The question was wrong

This ticket asked where embeddings should live in `md-only`, given that "no
database" was the pitch. But `md-only` was an attempt to reach markdown-first
storage by *removing* SQLite, and `dual` already reaches it by *demoting*
SQLite — with none of the defects catalogued above. `dual` has full hybrid
retrieval, working enrichment and honest counts precisely because the database
is present. The real question was **which store is the record of truth**.

Every defect this ticket documented traces to one line: `md-only` sets
`this.db = null` (`src/index.ts:100`). Keep the database and demote it, and they
all vanish rather than needing repair.

### What was settled

1. **Three modes:** `vector`, `md` (today's `dual`, renamed), `split`.
2. **`scope` is removed entirely** — the field, `is_manual_scope`, `query_logs`,
   `learning_query_matches`, and the autoPromote loop. It served an abandoned
   multi-tenant ambition. This is what makes the cache claim true: those tables
   were the only non-derived, non-diagnostic state in SQLite.
3. **Strict mirror.** Markdown is written first, vector only on success, so
   markdown is never behind. An entry absent from markdown is deleted — no
   tripwire. Git is the recovery mechanism, with the honest caveat that it
   restores to the last *commit*, not the last write.
4. **Reconcile on every command**, per-entry content hash.
5. **Bootstrap exception.** First `md` run against a populated vector store
   seeds *vector → markdown*; `meta.md_seeded_at` records it.
6. **Repair the incomplete, refuse the ambiguous.** Missing
   `id`/`createdAt`/`importance` is generated and written back; duplicate `id`
   or unparseable YAML hard-errors.
7. **2.2.0, map unchanged.** `md-only`/`dual` alias to `md` with a warning;
   `--scope`/`--scopes` parse, ignore and warn.

### Answers to this ticket's own starting questions

1. **Parity bar** — *no gap*. `dual`'s `query()` falls straight through to
   `this.vectorDb.query()` (`dualStorageRouter.ts:211`), the same hybrid RRF
   path as `vector-only`. Nothing to state honestly; nothing to build.
2. **Where embeddings live** — SQLite, as they already do. The "no database"
   framing is replaced by "no database *of record*", which is both true and
   stronger.
3. **Per-entry vs per-category cache keying** — per-entry content hash.
   Measured: 2.39 ms to re-embed one edited entry vs ~630 ms for its category.
   Detection across the whole store is 0.006 ms.
4. **Hand-edit semantics** — §5 of the spec. Note this question turned out to
   *gate* the design rather than accompany it (see below).
5. **Centroid rebuild cost** — moot; centroids read from SQLite, which is
   present.
6. **`neuron status` counts** — moot; `COUNT(*)` works because the database
   exists.

### Measurements taken

| | |
|---|---|
| Embedder model load, warm | 127 ms |
| Per-entry embed | 2.39 ms |
| SHA-256 over the whole store (~240 KB) | 0.006 ms |
| Distinct `scope` values across 264 entries | **1** |
| `is_manual_scope = 1` rows | **0** |
| `learning_query_matches` rows | **0** — never fired |
| `query_logs` payload | **1.36 MB of a 3.1 MB database** |
| SQLite vs markdown entry counts on this repo | **264 vs 15** |

### The finding that changed the sequencing

Strict mirror plus reconcile-on-every-command **creates** a defect that did not
previously matter. `mdStorageAdapter.ts:326` generates a fresh UUID on *every
read* for an entry missing its `id`, so such an entry would be inserted and
deleted on alternating commands, re-embedding forever. Two adjacent defects of
the same shape: `createdAt` fabricates `now()` per read (permanently defeating
`prune --days`), and missing `importance` reads back as **1** against a
documented default of **3**, silently making the entry prune-eligible.

**This promotes [`35`](35-frontmatter-roundtrip-integrity.md) from sibling to
hard prerequisite** — the design cannot ship without deterministic entry
identity.

The same principle scaled up is what makes `meta.md_seeded_at` load-bearing:
without it, "not seeded yet" and "a human deleted everything" are the same
observable state. On this repository that is the difference between exporting
264 entries and destroying 249.

### Consequences for the band

| Ticket | Outcome |
|---|---|
| `29` | **Rewritten** — the semantic-search build dissolves; becomes the reconcile engine. Now blocked by `35` |
| `30` | **Out of scope** — its defects vanish rather than get fixed |
| `31` | Survives, simplified — default flip, `init` scaffolding, aliases |
| `35` | Promoted to hard prerequisite of `29` |
| `38` | **New** — remove `scope`; sequenced before `29` |
