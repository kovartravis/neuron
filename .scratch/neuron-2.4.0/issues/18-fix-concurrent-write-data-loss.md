Type: task
Status: resolved
Blocked by: none
Band: dogfooding feedback (travisos)

# 18 — Fix Concurrent-Write Data Loss in Markdown Storage

## Question

Two `neuron memory add` calls issued concurrently against the same
category each report `{"status":"created"}` with a fresh id, but only one
entry survives — the other is silently discarded with no error surfaced to
either caller. Fix the underlying race so a concurrent write either
succeeds durably or fails loudly; it must never report success and then
lose the data.

## Context

Reported 2026-08-10 via dogfood use of a published neuron install in
another repo (`travisos`): two parallel `neuron memory add` calls each
returned a `created` status with a distinct id, but only one persisted —
confirmed missing by grepping the category `.md` file directly. The
vanished entry had also been the target of a `--supersedes` follow-up
write, and that supersession link vanished with it.

Root cause, confirmed by reading `src/storage/mdStorageAdapter.ts`:
`writeEntry` (~line 129), `updateEntry` (~line 189), and `deleteEntry`
(~line 220) are each an **unlocked read-modify-write cycle** —
`readCategory()` loads and parses the whole category file into memory,
the caller mutates the in-memory array, then `atomicWriteFile()` (~line
243) swaps a `.tmp` file into place via `rename()`. The rename itself is
atomic, but the *read* that seeds the in-memory array is not synchronized
against other writers. Two calls (two processes, or two calls racing in
the same process via `Promise.all`) that both read the file before either
one writes will each build a full-file rewrite from the same stale base;
whichever rename lands last wins outright and silently discards every
change the other writer made — including a supersession link set by a
prior `updateEntry` call that had already returned successfully.

`NeuronMemory.transact()` (`src/index.ts:865`) compounds this: it reports
`status: 'created'` (`src/index.ts:1416`) as soon as its own write call
returns, with no re-read afterward to confirm the row survived. Both
racing callers see success even though the store ends up holding only one
of the two entries.

**Item 2 from the same feedback batch ("make `--supersedes` fail loudly on
a missing target") is not a separate gap** — `--supersedes` target
validation already fails loud today (`src/commands/memory.ts:88-93`,
`findById` checked before any write happens, shipped under ticket 17 /
ADR 0015). The loss observed in the field is this same race striking the
*follow-up* `update` call that marks the old row superseded
(`memory.ts:120-129`), not a missing validation check on the flag itself.
No separate ticket needed for that item.

## Scope

Candidate fix directions — pick one as the durable fix; #3 is cheap enough
to layer in regardless of which longer-term direction is chosen:

1. **File locking** around the read-modify-write cycle per category file
   (e.g. `proper-lockfile`), so concurrent writers serialize instead of
   racing on the same read.
2. **Append-only journal** per category, compacted into the `.md` file on
   read, removing the read-modify-write pattern entirely.
3. **Interim mitigation floor**: after `atomicWriteFile` in `writeEntry`/
   `updateEntry`, re-read the row by id and verify it matches what was
   just written before `transact()` reports `created`/`updated`. Turns
   today's silent loss into a surfaced error rather than fixing the race,
   but is a small, fast change that removes the "reports success, loses
   data" failure mode immediately.

Whichever direction lands, add a regression test that fires genuinely
concurrent writers (not sequential `await`s) at the same category and
asserts every write survives — the existing test suite has no coverage
for this failure mode today.

## Comments

- Chartered 2026-08-10 from a maintainer-reported dogfooding feedback
  batch (photographed terminal output from a `travisos` session), same
  batch that produced [19](19-non-interactive-write-mode-for-cron.md),
  [20](20-ship-neuron-doctor.md), and
  [21](21-warn-on-zero-sessions-observed.md). This is the critical item in
  that batch — silent data loss with a success response — and the only one
  confirmed as a still-open bug against current `src/` rather than
  already-shipped behavior or unformed fog.

## Answer

Picked **direction 1 (file locking)** as the durable fix, plus **direction
3 (re-read-and-verify)** layered in regardless, exactly as the Scope
suggested. Direction 2 (append-only journal) was rejected as a bigger
storage-format rearchitecture than this bug needs.

**Locking** (`MdStorageAdapter.withCategoryLock`/`acquireLock`,
`src/storage/mdStorageAdapter.ts`): `writeEntry`, `updateEntry`, and
`deleteEntry` each now wrap their whole read-modify-write cycle in a
per-category-file mutex before touching disk. The mutex primitive is
`fs.mkdirSync('<category>.md.lock')` — directory creation is atomic at the
OS/filesystem level, so it serializes both cross-process writers (the
`travisos` case: two separate `neuron memory add` CLI invocations) and
same-process writers racing via `Promise.all` (the code's `await` points
between `ensureScaffolded`/`readCategory`/the eventual write let the event
loop interleave otherwise). No new dependency added — `proper-lockfile`
wasn't needed. A lock older than 30s is treated as belonging to a crashed
holder and stolen rather than waited on forever; a fresh contender otherwise
retries for up to 10s before throwing a loud timeout error.

**Verify-after-write** (`verifyWrite`): after `atomicWriteFile` returns,
each of the three methods re-reads the file and byte-compares it against
the content just written, throwing if they don't match. With the lock in
place this is a belt-and-suspenders floor, not the primary fix — it exists
to turn any *other* way the "reports success, loses data" invariant could
break (a bug in the lock itself, a non-atomic filesystem, a writer outside
this adapter entirely) into a loud failure rather than a silent one, per the
ticket's explicit ask that #3 be layered in "regardless of which
longer-term direction is chosen."

**Item 2 folded in, confirmed no separate work needed**: the vanished
`--supersedes` follow-up in the field report was this same race hitting the
`updateEntry` call that marks the old row superseded — now serialized by
the same per-category lock as the entry it targets, verified by test
`18-02` below (a concurrent new-entry write and old-entry supersession
update, both surviving).

**Regression tests** added to `src/storage/mdStorageAdapter.test.ts` under
`Concurrent Writer Durability (ticket 18)`, all firing genuine
`Promise.all` concurrency rather than sequential `await`s:
- `18-01`: 8 concurrent `writeEntry` calls against the same category — all
  8 ids survive.
- `18-02`: a concurrent write + supersession-update pair — both survive
  (the exact field-reported shape).
- `18-03`: concurrent `deleteEntry` calls for different ids — both take
  effect.
- `18-04`: a lock directory backdated to look 60s old (simulating a crashed
  holder) is stolen rather than deadlocking a fresh writer.

Confirmed the tests actually catch the bug: reverted `mdStorageAdapter.ts`
only (`git stash` on that one file) and reran — `18-01`/`18-02`/`18-03` all
failed with real data loss (e.g. `gone-1` surviving a delete it raced), and
`18-04` hung/failed with no steal path, before restoring the fix. `npm
test` (which rebuilds first): 649/649 passing, `tsc --noEmit` clean.

Didn't unblock anything directly — no ticket on this map lists `18` as a
blocker — but the same field-feedback batch's `19`, `20`, `21` remain
open and unrelated to this race.
