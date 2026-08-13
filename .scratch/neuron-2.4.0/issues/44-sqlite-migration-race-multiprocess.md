Type: task
Status: open
Blocked by: none
Band: 2.4.0-rc2

# 44 — SQLite Schema-Migration Race When Multiple Processes Open a Fresh Database Concurrently

## Question

`NeuronMemory.initialize()` runs its `currentVersion < N` migration chain
(`CREATE TABLE IF NOT EXISTS` / `ALTER TABLE ADD COLUMN` / `user_version`
bump) unguarded against another process doing the same thing to the same
file at the same time. When several processes each construct a fresh
`NeuronMemory` against a database file that doesn't exist yet, should the
fix be a cross-process advisory lock around the whole migration chain, a
single `CREATE TABLE IF NOT EXISTS meta` + a `BEGIN IMMEDIATE`-style claim
row other processes wait on, or something else?

## Context

Found live while verifying [39 — Category Auto-Declare Can Write to an
Ancestor `neuron.yaml` Outside an Isolated
`projectRoot`](39-config-autodeclare-escapes-projectroot.md): running
`test/e2e/concurrency-stress.test.ts`'s "Pillar 8: Multi-Process Contention
& Crash Recovery" (which spawns several real OS processes, each
constructing its own `NeuronMemory` against one shared, freshly-created
SQLite file) consistently failed on both the pre-fix and post-fix code for
ticket 39 — confirming it's unrelated to that ticket's config-resolution
change. Two distinct errors observed across runs:

- `duplicate column name: scope` — two processes both read
  `currentVersion < 2` as true before either committed its `ALTER TABLE
  learnings ADD COLUMN scope ...`, so both attempt the same `ALTER TABLE`.
- `no such table: learnings` — a process attempted to migrate/query before
  another process's `currentVersion < 1` `CREATE TABLE IF NOT EXISTS`
  transaction had actually committed.

This is the same class ticket 17 flagged as an off-band finding while
running `relevance_gate_eval.py`'s Pillar 8 equivalent ("failed on a `no
such column: "scope"` concurrent-migration race, confirmed pre-existing...
squarely 18's territory") — but [18 — Fix Concurrent-Write Data Loss in
Markdown Storage](18-fix-concurrent-write-data-loss.md) scoped itself to
`mdStorageAdapter.ts`'s markdown read-modify-write cycle
(`writeEntry`/`updateEntry`/`deleteEntry`), not `NeuronMemory.initialize()`'s
SQLite migration chain — a different file, a different mechanism, and a
race that only manifests when a database file doesn't exist yet (an
already-migrated file is stable, since every process reads the same
`user_version` and no `currentVersion < N` branch fires). This ticket is the
one `18`'s own resolution note left unclaimed.

Confirmed via `git stash` (reverting ticket 39's fix entirely) that the
identical failure reproduces on unmodified code — this is not a regression
from any change made this session.

## Scope

1. Decide the locking/serialization mechanism: a cross-process file lock
   (e.g. an `fs`-based lock file, mirroring `18`'s own `mkdir`-based lock
   for markdown, or `better-sqlite3`'s own busy-timeout/transaction
   primitives used more aggressively) around the whole `initialize()`
   migration chain, versus some other serialization point.
2. Reproduce reliably in a smaller, faster test than the full Pillar 8
   stress harness (e.g. spawn 2-3 processes against one guaranteed-fresh
   `dbPath` with no other contention noise) so the fix can be red/green
   verified without the full multi-process benchmark's runtime.
3. Fix `initialize()` (or wherever the right serialization point is) so
   concurrent construction against a fresh database file is safe; add a
   regression test using the harness from Scope item 2.
4. Re-run `test/e2e/concurrency-stress.test.ts`'s Pillar 8 to confirm the
   `initErrors`/`nonZeroExits` this ticket found are gone.

## Deliverables

- [ ] Decision recorded on the serialization mechanism
- [ ] A fast, focused repro test (not the full stress harness)
- [ ] Fix implemented, regression test passing
- [ ] Pillar 8 (`test/e2e/concurrency-stress.test.ts`) passes clean

## Answer

_Not yet resolved._

## Comments
