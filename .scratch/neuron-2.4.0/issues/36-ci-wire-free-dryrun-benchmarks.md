Type: task
Status: unclaimed
Blocked by: none

# 36 — CI-Wire the Free Dry-Run Benchmark Harnesses

## Question

Add a CI step (or a separate lightweight workflow) that runs the free,
dry-run-capable benchmark scripts — `bench:token-ab:dry-run`,
`bench:gitlog-ab:dry-run`, `bench:swebench-ab:dry-run`,
`bench:swebench-ab:pilot:dry-run` — as a regression gate, closing finding
**F5** from [ticket 13's audit](13-dogfooding-gaps-audit.md).

These cost nothing (no live API spend, matching the paid variants'
correctly-gated-behind-maintainer-approval posture) but currently only run
when a human remembers to. Instrumentation built for these harnesses has
already needed two live bug fixes for false positives found only by
manual smoke-testing (`hintFollowLog.ts`'s command-matching regex, ticket
07) — a dry-run CI gate would have caught regressions like that
automatically instead of during the next unrelated dogfooding session.

Lowest priority in the audit's own backlog — dry-run harness regressions
are a minor inconvenience (caught next time someone runs one by hand), not
silent data loss.

Resolve:
- Which workflow: a new step in `build-and-test`, or a separate
  lower-frequency workflow (these are heavier than `npm test`).
- Whether a dry-run failure should block the existing `publish.yml` build,
  or run informationally in its own workflow so a benchmark-harness
  regression never blocks a real release.

## Comments

- Graduated 2026-08-12 from [ticket 13](13-audit-dogfooding-gaps.md)'s
  audit finding F5.
