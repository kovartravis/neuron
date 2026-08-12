Type: task
Status: unclaimed
Blocked by: none

# 35 — Scheduled Store-Health Check

## Question

Add a scheduled GitHub Action (weekly, `workflow_dispatch`-triggerable too)
that runs `neuron status --health` against this repo's own store and posts
a summary — closing finding **F4** from
[ticket 13's audit](13-dogfooding-gaps-audit.md).

`neuron status --health` and `--health --repair` (ticket 20) exist and
found real pollution when run — most recently
[ticket 16](16-curate-neuron-store-showcase.md) found 5 duplicate groups
`--health` alone had already surfaced and 204 junk entries a follow-on
content-length sweep found, both sitting unnoticed for over a week. The
only invocations on record are one-off, maintainer-approved sessions —
nothing runs on a cadence, so rot accumulates silently between manual
passes.

**Read-only by default** — post a `--health` summary (duplicate groups,
importance histogram, superseded count) to the workflow's step summary or
an issue comment. Do **not** wire `--repair` into the schedule: both prior
uses of `--repair` (`20`'s addendum, `16`) ran only after an explicit,
same-session maintainer go-ahead, and an unattended cron job auto-merging
store entries breaks that precedent.

Resolve:
- Where the summary posts (step summary is simplest and matches
  `publish.yml`'s own `GITHUB_STEP_SUMMARY` pattern; an issue/PR comment
  is an alternative if visibility needs to be higher).
- Whether a "meaningfully dirty" threshold (e.g. >2 duplicate groups)
  should fail the workflow to force attention, or it should always be
  green/informational only.

## Comments

- Graduated 2026-08-12 from [ticket 13](13-audit-dogfooding-gaps.md)'s
  audit finding F4 — small, no open design questions per the audit
  itself beyond where the summary posts.
