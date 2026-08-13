# ADR 0011 — Markdown as the Store of Record

- **Status:** Accepted (2026-08-02)
- **Supersedes:** the `md-only` storage mode introduced in 2.0.0-rc2
- **Relates to:** [ADR 0001 — Hybrid Search RRF](0001-hybrid-search-rrf.md),
  [ADR 0010 — LLM Job Guardrails](0010-llm-job-guardrails.md)
- **Spec:** [`docs/design/md-first/spec.md`](../design/md-first/spec.md)
- **Ticket:** 28 — What `md-only` Parity Actually Means (ticket `801f2484-aabf-432b-b089-8ef4d9604b6d` in the `tickets` category — `neuron memory query "md-only Parity Actually Means" --categories tickets`)

## Context

`neuron` is repositioning around plain-markdown, git-native agent memory as its
primary claim. That claim rested on the `md-only` storage mode, which stores
entries as `.md` files and sets `this.db = null`.

Auditing `md-only` against the shipped CLI found it could not support the claim:

- **No semantic search.** `queryMarkdownOnly` resolves its embedder from a
  delegate object carrying neither `getEmbedder` nor `embedder`, so the entire
  embedding branch is dead and every query degrades to a
  `content.includes(queryText)` whole-string substring test — beaten by `grep`,
  which at least takes a regex.
- **No enrichment.** Tag and category centroids read from the absent database,
  so every entry stores `tags: []` and an omitted `--category` hard-errors 100%
  of the time.
- **Dishonest counts.** `neuron status` reports `totalCount: 0` with entries on
  disk.

The framing question was taken to be "where do embeddings live, given that 'no
database' is the pitch?" — since a 384-float embedding is 1.5 KB of base64 noise
that must not land in a file whose selling point is human readability.

## Decision

**Delete `md-only`. Rename `dual` to `md`. Make markdown the store of record and
the vector store a rebuildable index.**

The framing question was wrong. `md-only` tried to reach markdown-first storage
by *removing* SQLite; `dual` already reaches it by *demoting* SQLite, and does so
with none of the defects above — it has full hybrid retrieval, working
enrichment and honest counts precisely because the database is present. The real
question was never how to live without a database, but **which store is the
record of truth**.

Modes become `vector`, `md`, and `split`.

### The claim this licenses

> Your memory is markdown. The vector store is a rebuildable index.

This is a stronger claim than "there is no database," and unlike that one it is
literally true — `vector` and `dual` have always shipped SQLite, and no reader
was deceived by that. It is also a *governance* claim rather than a capability
claim, which makes it orthogonal to competitors' analysis depth instead of
competing with it.

### Consequence 1 — `scope` is removed

The claim is only true if nothing in SQLite is a store of record. Auditing the
schema against the markdown frontmatter found three classes of state, of which
two were not derivable — and both existed almost entirely to serve `scope`: the
`is_manual_scope` shield, plus `query_logs` and `learning_query_matches` feeding
a scope auto-promotion loop.

`scope` was designed for a multi-tenant ambition that is not being pursued.
Measured on this repository's live store:

| | |
|---|---|
| Distinct `scope` values across 264 entries | **1** |
| Rows with `is_manual_scope = 1` | **0** |
| Rows in `learning_query_matches` | **0** — the loop has never fired |
| `query_logs` payload | **1.36 MB of a 3.1 MB database** |

Those two tables have exactly one reader in the codebase. Every query wrote a
1.5 KB blob to feed a feature with zero observed effects and unbounded growth.
Removing `scope` removes both classes, leaving only derived data and
diagnostics.

`--scope`/`--scopes` remain parsed, ignored and warning, because
`unknownFlag()` hard-exits and removal would turn a rename into an outage.

### Consequence 2 — the reconcile is a strict mirror

Markdown is written first; the vector write happens only if it succeeded. So
markdown is never behind, and **an entry absent from markdown is deleted from
the index** — no tripwire, no `--force`.

`.neuron/` is tracked, not gitignored, so `git` is the recovery mechanism,
exactly as for source files. Teaching two recovery stories for one situation is
worse than teaching one. The honest caveat, which belongs in the README rather
than in a mitigation: git restores to the last *commit*, not the last *write*.

Staleness is checked on every command by per-entry content hash. Detection costs
**0.006 ms** across the whole store; repairing one edited entry costs **2.39 ms**
against **~630 ms** to re-embed its category, which is why per-entry hashing
replaces the dead `mdEmbedCache`'s per-category `mtimeMs` keying.

### Consequence 3 — bootstrap is the one exception

On the first `md` run against a populated vector store with no established
markdown, the direction reverses to **vector → markdown**. `meta.md_seeded_at`
records it.

**The marker is load-bearing.** Without it, "not seeded yet" and "a human deleted
everything" are the same observable state, and a strict mirror converts that
ambiguity into total loss. On this repository that is the difference between
exporting 264 entries and destroying 249 of them.

### Consequence 4 — repair the incomplete, refuse the ambiguous

Missing `id`/`createdAt`/`importance` is repaired and **written back**. Duplicate
`id` or unparseable YAML **hard-errors**. The test is whether the system must
guess.

This is not optional under the decisions above. `mdStorageAdapter.ts:326`
generates a fresh UUID on *every read* for an entry missing its `id`, so strict
mirror plus reconcile-on-every-command produces a permanent insert/delete churn
loop that re-embeds forever. The design creates this defect; it does not inherit
it.

## Alternatives considered

- **A bespoke embedding cache in the `env-paths` data dir**, content-hash keyed
  and declared disposable. Rejected: it is `dual` with extra steps — a second
  cache format for a job the existing SQLite mirror already does.
- **Recompute embeddings per invocation, no persistent index.** Makes "no
  database" literally true. Rejected: the CLI is a fresh process per command, so
  this pays ~600 ms at 264 entries on *every* query and scales linearly — and it
  wins a claim that did not need winning.
- **Additive-only sync; deletion requires the CLI.** Safe, but sells a lie: if
  deleting an entry's lines does not delete the entry, the files are not the
  store of record and users find out fast.
- **A percentage tripwire on destructive reconciles** (refuse if >N% of a
  category vanishes, require `--force`). Rejected in favour of trusting git,
  which is the tool users already have for exactly this.
- **Deprecate in 2.2.0 and remove in 3.0**, or cut a 3.0.0 for the breaking
  change. Rejected: the map and release number stay put; config values alias
  instead, which contains the compatibility cost without carrying dead concepts
  through the release the repositioning is built on.

## Consequences

**Positive**

- The product's central claim becomes true, and provably so.
- Retrieval parity is achieved **by construction** — `md` mode uses the same
  hybrid RRF code path as `vector`, so no caveat is owed in the README.
- Roughly 80 lines of substring matching, an unwired cache, a dead promotion
  loop and two unbounded tables are deleted rather than maintained.
- The upgrade path becomes a demonstration: an existing user's memories turn
  into files they can read, automatically.

**Negative**

- Breaking changes to a published CLI, softened but not eliminated by aliasing.
- Hand-truncating a memory file destroys entries written since the last commit.
  Accepted, and to be documented plainly.
- The reconcile is now on the hot path of every command. Detection is cheap, but
  it is new work in a place that previously did none.
- 35 — Frontmatter Round-Trip Integrity (ticket `a5384183-dc23-43d5-b838-88e634319a1e`)
  becomes a hard prerequisite; the design cannot ship without deterministic
  entry identity.
