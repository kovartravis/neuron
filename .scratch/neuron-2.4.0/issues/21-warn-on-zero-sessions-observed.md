Type: task
Status: resolved
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

## Answer

Built the proactive surface, distinct from `--health`'s own opt-in report
of the same signal (ticket 20's addendum: "`--health`'s inline
`sessionsObserved` warning is opt-in, not the proactive surface `21` asks
for"). Where it fires: a `session-start` hook injection, once per session,
matching the ticket's own Scope steer — "closer to 'deserves a startup
warning' as phrased in the field feedback" — rather than gating it behind
an explicit `neuron status` invocation. `--check`'s finding-kind option was
rejected: that surface is scoped to config-schema compliance (ADR 0013),
a different question than store health, and ticket 20 already established
store-health signals live under `--health`, not `--check`.

Implementation:
- `buildZeroSessionsWarning(sessionsObserved, totalEntries)` (new,
  `src/harnesses/ledger.ts`, colocated with `summarizeRecallCost` which
  computes `sessionsObserved`) — pure function, fires only on the literal
  `sessionsObserved === 0` (per Scope, not a low-but-nonzero band) and only
  when `totalEntries > 0` (a genuinely empty store isn't the write-only
  failure mode being flagged).
- Wired into `hook.ts`'s `session-start` branch: reads `sessionsObserved`
  via the same `summarizeRecallCost` call `status`'s default payload and
  `--health` already use, and `totalEntries` via `memory.getStatus().totalCount`.
  The warning is appended after the architecture card text (if any) within
  the same per-injection char cap, and — unlike before this ticket — the
  branch no longer returns early when there's no card: it now emits
  whenever there's a card, a warning, or both, so a session with no
  architecture card configured still gets the warning on its own.
- `recordSessionStartInjection` is still called whenever anything is
  emitted (card ids only — the warning has no entry id to dedupe), so the
  epoch's char budget correctly reflects the warning's cost too.

Verified: `neuron exec -- npm test` 670/670 (663 prior + 7 new: 4 unit
tests for `buildZeroSessionsWarning`'s truth table in `ledger.test.ts`, 3
integration tests in `hook.test.ts` — warns against a populated store with
no sessions observed, stays silent once a prior session's `pre-prompt` call
has been recorded, and appends alongside a real architecture card rather
than replacing it). `tsc` clean (via the same `npm test`, which runs
`build` first).

No new CLI flag or user-facing command surface, so no README/help-text
changes — the injected line is self-explanatory and points at
`neuron status --health` for detail, same precedent as the discovery hint
(ticket 06) pointing at `neuron memory query`.
