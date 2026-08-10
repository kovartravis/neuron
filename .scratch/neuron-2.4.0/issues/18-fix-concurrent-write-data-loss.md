Type: task
Status: unclaimed
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
