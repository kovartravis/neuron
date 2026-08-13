# Markdown as the Store of Record

**Status:** settled 2026-08-02, resolving
28 — What `md-only` Parity Actually Means (ticket `801f2484-aabf-432b-b089-8ef4d9604b6d` in the `tickets` category)
**Release:** 2.2.0-rc5 (map and release number unchanged)
**ADR:** [0011](../../adr/0011-markdown-as-store-of-record.md)

---

## 1. The reframe

Ticket `28` asked where embeddings should live in `md-only`, given that "no
database" was the pitch. The question was wrong, and the answer that survives
grilling is that **`md-only` should not exist.**

`md-only` was an attempt to reach markdown-first storage by *removing* SQLite.
The mode that already stores memories as markdown — `dual` — reaches it by
*demoting* SQLite instead, and it does so with none of `md-only`'s defects: it
has full hybrid retrieval, working enrichment, and honest counts, because the
database is present. The design question was never "how do we live without a
database"; it was "which store is the record of truth."

So:

- **`md-only` is deleted.** Not fixed — deleted.
- **`dual` is renamed `md`.** Same mechanism, correct name.
- **The claim becomes: your memory is markdown; the vector store is a
  rebuildable index.**

This is a stronger claim than "there is no database," and unlike that one, it is
literally true.

### Modes after this change

| Mode | Meaning |
|---|---|
| `vector` | SQLite is the only store. No `.md` files. |
| `md` | `.neuron/<category>.md` is the store of record. SQLite is a derived index, rebuildable from the files at any time. |
| `split` | Per-category choice between the two. |

---

## 2. Why the cache claim is now true

"SQLite is just a cache" was **false** when `28` was filed. Auditing the schema
against the markdown frontmatter found three classes of SQLite state:

| Class | Contents | Rebuildable from `.md`? |
|---|---|---|
| **A. Derived** | `embedding`, `memories_fts` | Yes, bit-for-bit |
| **B. Entry fields with no md home** | `updated_at`, `enriched_at`, `is_manual_scope` | No — but they belong to an entry |
| **C. Usage corpus** | `query_logs`, `learning_query_matches`, `meta` counters | No, and they belong to no entry |

Class B and C existed almost entirely to serve **`scope`**, which is removed
(§3). What survives is `updated_at`/`enriched_at` — derived bookkeeping no
reader of a memory file cares about — and the `meta` degradation counters, which
are diagnostics about the store rather than memory in it.

**After scope removal, nothing in SQLite is a store of record.** That is what
licenses the claim.

---

## 3. Scope is removed

`scope` was designed for a multi-tenant ambition that is not being pursued.
Everything is project-scoped. It is removed along with everything that exists to
serve it.

### The measurement that justifies it

Taken against this repository's live store, 2026-08-02:

| | |
|---|---|
| Distinct `scope` values across 264 entries | **1** — every row is `neuron` |
| Rows with `is_manual_scope = 1` | **0** |
| Rows in `learning_query_matches` | **0** — the promotion loop has never fired |
| Rows in `query_logs` | **837**, spanning 2026-07-15 → 2026-08-02 |
| `query_logs` payload | **1.36 MB of a 3.1 MB database** |

`query_logs` and `learning_query_matches` have **exactly one reader** in the
codebase: the autoPromote loop at `src/index.ts:841-918`. Nothing else touches
them. Every `neuron memory query` writes a 1.5 KB embedding blob to `query_logs`
(`src/index.ts:434`) to feed a feature that has produced zero observed effects
in three weeks of heavy use, and that data grows without bound.

### What goes

- `scope` column on `memories`; `scope` frontmatter field; `scope` on
  `MemoryQuery`/`Memory` models
- `is_manual_scope` column
- `query_logs` and `learning_query_matches` tables, and the write at `:434`
- the autoPromote loop and its promote/demote thresholds
- `scopes` query filtering throughout the router

### What stays, deprecated

`--scope` and `--scopes` remain in `KNOWN_FLAGS`, are parsed, ignored, and warn
on stderr. `unknownFlag()` (`src/commands/utils.ts:92-103`) **hard-exits 1**, so
removing them outright would turn a rename into an outage for any existing
script or agent invocation. This matches the existing deprecation posture of
`neuron learn` / `neuron history`.

A `scope:` key found in existing frontmatter is ignored on read and dropped on
the next write. It is not an error.

---

## 4. The reconcile contract

### 4.1 Write ordering

In `md` mode, **markdown is written first; the vector write happens only if the
markdown write succeeded.**

Today the order is inverted — vector at `dualStorageRouter.ts:58`, markdown at
`:63`, with the vector write wrapped in a bare `catch {}`. That leaves a window
where SQLite holds an entry markdown does not, which a strict mirror would then
delete. Flipping the order closes that window *by construction*: markdown can
never be behind, so the mirror can only ever remove something a human removed.

### 4.2 Staleness detection

Checked automatically **on every command**. No user action, no separate sync
step.

Each entry carries a content hash. On open, hashes are compared against the
values stored alongside the vector rows; only entries whose hash changed are
re-embedded.

The costs justify doing this eagerly:

| Operation | Measured |
|---|---|
| SHA-256 over the whole store (~240 KB at 264 entries) | **0.006 ms** |
| Re-embed one changed entry | **2.39 ms** |
| Embedder model load, warm | **127 ms** |
| Re-embed an entire category (264 entries) | **~630 ms** |

Detection is effectively free; repair is per-entry. This deliberately replaces
the dead `mdEmbedCache`'s per-category `mtimeMs` keying, which re-embeds an
entire category when one line changes — 630 ms for a one-word typo fix versus
2.39 ms.

`neuron sync` survives as the explicit, forced, full rebuild.

### 4.3 Deletion is a strict mirror

**An entry present in the vector store and absent from markdown is deleted.**
No percentage tripwire, no confirmation, no `--force` gate.

The rationale is that these are tracked files in a git repository — `.neuron/`
is not gitignored and `neuron init` scaffolds no ignore rule — so `git` is the
recovery mechanism, exactly as it is for source files. A user who truncates a
memory file and a user who truncates a source file are in the same position, and
teaching two different recovery stories for one situation is worse than teaching
one.

**Honest caveat, to be stated in the README rather than designed around:** git
restores to the last *commit*, not the last *write*. The protocol has agents
writing entries throughout a session, so the exposure window is "everything
since your last commit." This is identical to any uncommitted file, which is the
consistency argument in its favour — but it should be said out loud, not
discovered.

### 4.4 Bootstrap: the one exception

Strict mirror does **not** apply before the markdown side is established.

On the first run in `md` mode against a populated vector store with no
established markdown, the direction reverses: **vector → markdown**, exporting
existing memories into `.md` files. Strict mirror engages only afterwards.

`meta.md_seeded_at` records that this has happened. **The marker is
load-bearing.** Without it, "markdown is empty because we have not seeded yet"
and "markdown is empty because a human deleted everything" are the same
observable state, and a strict mirror turns that ambiguity into total data loss.

This matters concretely: on this repository, SQLite holds 264 entries and
`.neuron/*.md` holds 15, last written 2026-07-29. A default flip without the
bootstrap rule would delete 249 entries that were never in a `.md` file for git
to restore.

It is the same principle as §5, applied to the store rather than the entry:
repair what is incomplete, refuse what is ambiguous.

---

## 5. The hand-edit contract

Hand-editing is the headline feature, so the reader's behaviour on imperfect
input is a product decision, not an implementation detail.

**Repair the incomplete. Refuse the ambiguous.** The test is whether the system
has to *guess*.

### Repaired, and written back

Missing `id`, `createdAt`, or `importance` has exactly one sensible
interpretation. The value is generated once and **written back to the file**, so
the entry becomes valid and stable. `git diff` shows what was added.

A human pasting three lines of prose under a `---` block and having it become a
real, searchable memory is the single best demonstration that the files are the
store of record. That case must work.

### Refused

Duplicate `id`, or YAML that does not parse, is ambiguous — the system cannot
know which entry was meant, and under a strict mirror, guessing silently deletes
the loser. Hard-error naming the file and the entry, consistent with ticket
`36`'s "an agent cannot write a malformed entry" guarantee extended to the read
side.

### Why this is not optional

`mdStorageAdapter.ts:326` currently runs on **every read**, with no dedupe and
no write-back:

```js
const id = frontmatter.id ? String(frontmatter.id) : crypto.randomUUID();
const createdAt = frontmatter.createdAt ? String(frontmatter.createdAt) : new Date().toISOString();
```

An entry whose `id:` line was deleted therefore gets a **different UUID on every
read**. Combined with strict mirror and reconcile-on-every-command, that is a
permanent churn loop:

1. read → entry is `UUID-A` → absent from vector → insert (embed)
2. next command → read → same entry is `UUID-B` → `UUID-A` absent from md →
   **delete**; `UUID-B` absent from vector → insert (embed again)
3. repeat forever, on every command

One entry missing one line churns the store indefinitely. **This is created by
the design in §4, not inherited** — which is why
35 — Frontmatter Round-Trip Integrity (ticket `a5384183-dc23-43d5-b838-88e634319a1e` in the `tickets` category)
becomes a hard prerequisite rather than a sibling ticket.

Two adjacent defects of the same shape, fixed here:

- `createdAt` fabricates `now()` per read, permanently defeating `prune --days`
  — an affected entry is always "new."
- Missing `importance` reads back as **1** (`mdStorageAdapter.ts:~330`) while
  the writer defaults to **3** (`:229`) and `CLAUDE.md` documents 3. Since 1 is
  below the prune ceiling of 3, deleting one line silently makes an entry
  prune-eligible. It becomes 3, written back.

---

## 6. Retrieval parity

**There is no parity gap, and no honest caveat is required in the README.**

In `dual` mode, `DualStorageRouter.query()` falls straight through to
`this.vectorDb.query()` (`dualStorageRouter.ts:211`) — full hybrid RRF over
semantic + FTS5, the *same code path* as `vector-only`. Renaming the mode does
not change this.

Consequently `queryMarkdownOnly` (~80 lines of whole-string substring matching)
and `mdEmbedCache` are **deleted, not repaired**. Ticket `28`'s three-query
acceptance table is satisfied by construction rather than by new code.

The same applies to enrichment and counts: `getTagVocabulary()`,
`getCategoryCentroids()`, `recordDegradation()` and `getStatus()` all failed
only because `md-only` set `this.db = null` (`src/index.ts:100`). With the
database present they work unchanged.

---

## 7. Compatibility

Release number and map are unchanged: this ships in **2.2.0**.

| Surface | Posture |
|---|---|
| `storage.mode: md-only` | Aliases to `md`, warns on stderr |
| `storage.mode: dual` | Aliases to `md`, warns on stderr |
| `split` per-category `storage: dual` | Aliases to `md`, warns |
| `--scope` / `--scopes` | Parsed, ignored, warn |
| `scope:` in existing frontmatter | Ignored on read, dropped on next write |
| Existing populated vector store | Seeded to markdown on first `md` run (§4.4) |

Config values alias rather than hard-fail because a config that errors on
upgrade turns a rename into an outage for anyone who adopted the old names.

---

## 8. The default

The schema default flips from `vector-only` (`src/config/neuronYaml.ts:12`,
`:115`) to `md`, and `neuron init` scaffolds a `neuron.yaml` — it currently
writes none at all, only reading one at `init.ts:65`.

This is safe **only because of §4.4**. An existing user upgrading gets their
memories exported into files by the bootstrap seed, which is the product demo
happening to them automatically rather than a hazard.

---

## 9. Open questions, deferred to implementation

- **`split` mode's per-category vocabulary** (`md` / `vector` / `dual`) needs the
  same rename treatment as the top-level modes. Not specified here.
- **The `split` dispatch no-op** at `dualStorageRouter.ts:183`: the read side
  branches only on `=== 'md'`, so `vector` and `dual` land in the same bucket
  while the code reads as though they differ. Already documented in-place as
  misleading; fix it while renaming.
- **`updated_at` / `enriched_at` on rebuild.** Declared derived bookkeeping and
  allowed to reset when the index is rebuilt from markdown. If any consumer
  turns out to depend on their continuity, that is a finding to bring back here.
- **Cold-store centroid bootstrapping** remains fogged on the map. It is
  unchanged by this spec — a fresh `md` project has the same cliff a fresh
  `vector` project has, no better and no worse.

---

## 10. Ticket consequences

| Ticket | Outcome |
|---|---|
| `28` | Resolved by this spec |
| `29` | **Rewritten** — semantic-search build dissolves; becomes the reconcile engine. Blocked by `35` |
| `30` | **Out of scope** — its defects vanish rather than get fixed |
| `31` | Survives, simplified — default flip, `init` scaffolding, aliases |
| `35` | Promoted to hard prerequisite of `29` |
| `38` | **New** — remove `scope`; sequenced before `29` |
