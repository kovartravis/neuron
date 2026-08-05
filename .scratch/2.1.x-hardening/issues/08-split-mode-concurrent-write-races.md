Type: research
Status: unclaimed
Blocked by: none

# 08 — Are `split`-Mode Concurrent Writes Race-Safe?

## Question

`split` storage mode routes each category independently — some to vector
only, some to markdown only, some to both — based on
`config.categories[cat].storage`. Tickets `03`–`05` audited every *sequential*
write path in `dualStorageRouter.ts` and `mdVectorSync.ts` and found three
real bugs. None of that touched *concurrent* access: two processes (two
agent sessions, an agent plus a human editing `.md` by hand mid-write)
writing the same category at the same time.

Is there a real race here, and does it matter in practice?

## Context

Candidate hazards, unverified:

- `MdStorageAdapter.writeEntry`/`updateEntry`/`deleteEntry` each do a full
  read-modify-write of the category's `.md` file (`readCategory` → mutate
  the in-memory array → `formatMarkdown` → `atomicWriteFile`). The write
  itself is atomic (temp file + rename), but the read-modify-write is not —
  two concurrent writers to the same category can each read the same
  pre-mutation state and one write clobbers the other's change on rename.
- The vector DB side uses SQLite with `journal_mode = WAL` and a
  `busy_timeout`, which is a different (likely stronger) concurrency story
  than the markdown side. `split`/`dual` modes run both per mutation, so the
  two sides may have different effective consistency guarantees for the
  same logical write.

Neither has been reproduced. This ticket is "go find out," not "go fix" —
scope narrows once there's a real reproduction or a clean bill of health.

## Comments

- 2026-08-02: Flagged as a natural next area after the sequential-write
  sweep (`03`–`05`) rather than confirmed. `concurrency-stress.test.ts`
  (Pillar 8) exists in the E2E suite and may already cover some of this —
  check what it actually exercises before assuming a gap.
