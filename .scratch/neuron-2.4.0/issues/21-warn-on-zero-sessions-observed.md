Type: task
Status: unclaimed
Blocked by: none
Band: dogfooding feedback (travisos)

# 21 — Warn When Recall Is Never Invoked (`sessionsObserved: 0`)

## Question

`sessionsObserved: 0` is the signature of a write-only store — memories
are being added but never queried back, meaning the whole point of the
tool isn't happening. Add a warning that surfaces this proactively instead
of requiring a maintainer to notice it buried in `neuron status`'s JSON.

## Context

Reported 2026-08-10 via dogfood feedback from `travisos`. The underlying
metric already exists: `sessionsObserved` is computed at
`src/harnesses/ledger.ts:186-260` and exposed today via `neuron status`'s
`recallCost.sessionsObserved` (asserted at `src/commands/status.test.ts:44`
for the zero case, but only as a value, not a warning).

## Scope

- Add a warning (stderr, or a distinct finding in `status --check`'s
  output) when `recallCost.sessionsObserved === 0` and the store has
  entries — a genuinely empty store isn't the failure mode being flagged.
- Decide where it fires: on every `neuron status` run, on a session-start
  hook point, or both. A session-start hook surfacing this once per
  session (rather than only on explicit `status` calls) is closer to
  "deserves a startup warning" as phrased in the field feedback.
- Keep the threshold literally `=== 0`, not a low-but-nonzero band — this
  ticket is about the write-only-store failure mode specifically, not
  general recall-rate tuning.

## Comments

- Chartered 2026-08-10 from the same dogfooding feedback batch as
  [18](18-fix-concurrent-write-data-loss.md),
  [19](19-non-interactive-write-mode-for-cron.md), and
  [20](20-ship-neuron-doctor.md). Smallest and most self-contained ticket
  in the batch — good candidate for the next unclaimed pickup.
