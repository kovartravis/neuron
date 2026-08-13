Type: task
Status: resolved
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

## Answer

Built `.github/workflows/store-health.yml`: a `schedule` (weekly, Monday
13:00 UTC) + `workflow_dispatch` job that runs `node dist/cli.js status
--health --json` against this repo's own committed `.neuron/` store and
resolves both open questions:

- **Where the summary posts → step summary**, matching the ticket's own
  hint and `publish.yml`'s existing `GITHUB_STEP_SUMMARY` precedent (the
  "already published" and final "Summary" steps). No issue/PR comment: a
  scheduled run has no PR to comment on, and `workflow_dispatch` runs are
  already visible from the Actions tab where the summary renders directly.
  Posts unconditionally — duplicate-group table, importance histogram,
  superseded count — regardless of the pass/fail outcome below, so a clean
  run is still legible, not just a silent green check.
- **Threshold → yes, fail past >2 duplicate groups**, taking the ticket's
  own suggested example as the real cutoff. Only `duplicateGroups.length`
  drives the fail; the importance histogram and superseded count are
  informational only (no natural pass/fail line for either — nothing in
  `13`'s audit or `16`'s live repair session read them as urgent on their
  own). This is a scheduled job, not a PR gate, so failing it only turns
  the run red in the Actions tab — matching the read-only, no-`--repair`
  posture below, it forces attention without touching the store. Verified
  the threshold against this repo's own real, currently-clean store (`0`
  duplicate groups today) before picking `2`, so the workflow doesn't fire
  on day one.

**Read-only, per the ticket's own constraint**: only `--health`, never
`--health --repair` — auto-merge stays gated on an explicit,
same-session maintainer go-ahead (`20`'s addendum, `16`), which an
unattended cron run can't provide.

Reused `publish.yml`'s own `build-and-test` shape (`actions/checkout@v4`,
Node 22, `npm ci`, `npm run build`) rather than inventing a new pattern.
Live-validated end to end against this repo's real store, not just read:
`node dist/cli.js status --health --json` returns
`{"duplicateGroups":[],"importanceHistogram":{"3":205,"4":167,"5":97},
"supersededCount":41,"sessionsObserved":93}`, and the workflow's own `jq`
extraction plus step-summary formatting was run locally against that real
output before committing (`DUP_GROUPS=0` → summary posted, exit 0, no
`::warning::`). No `src/` changes; no new tests (CI-only, YAML-shape
change) — `npm run build` clean.

## Comments

- Graduated 2026-08-12 from [ticket 13](13-audit-dogfooding-gaps.md)'s
  audit finding F4 — small, no open design questions per the audit
  itself beyond where the summary posts.
