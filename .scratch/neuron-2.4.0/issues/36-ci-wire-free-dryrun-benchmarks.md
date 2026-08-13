Type: task
Status: resolved
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

## Answer

Built `.github/workflows/benchmark-dryrun.yml`, resolving both open
questions:

- **Which workflow → a new, separate workflow, not a `build-and-test`
  step.** Measured before deciding rather than guessing: the four dry-run
  scripts take ~75s combined locally (token-ab ~3.5s, gitlog-ab ~3.5s,
  swebench pilot ~13s, swebench full ~55s) against `npm test`'s ~22s for
  704 tests — over 3x heavier than the suite they'd be appended to. Follows
  `store-health.yml`'s own precedent (ticket 35) for anything past the
  fast-unit-test class, rather than `32`/`34`'s inline-step precedent,
  which fit because those checks are near-instant.
- **Blocking → never blocks `publish.yml` or `npm publish`, by
  construction.** The new workflow has no dependency edge on `publish.yml`
  and isn't added to `main`'s required status checks (a branch-protection
  setting, deliberately left untouched — out of this ticket's scope and a
  repo-wide policy change, not a CI-wiring one). It still fails loud on a
  real regression (all three harnesses' `main().catch` handlers already
  `process.exit(1)` on any uncaught error — confirmed by reading, not
  assumed), which shows as a red run in the Actions tab / PR checks list,
  matching the "visible but not gating" posture F4/`35` already
  established for store health.

Triggers on `pull_request` (any target — catches a regression before
merge, the ticket's own "instead of during the next unrelated dogfooding
session" motivation) plus `push` to `main` and `workflow_dispatch`, mirroring
`publish.yml`'s and `store-health.yml`'s own trigger shapes. No build step
needed: all four scripts run as plain `.mjs` (git-worktree fixtures +
`session.mjs`'s dry-run short-circuit), never touching `dist/cli.js`, so the
workflow is just `checkout` → `setup-node@22` → `npm ci` → the four `npm
run bench:*:dry-run` commands.

**Found and fixed a real bug along the way, in scope for this ticket
specifically because CI would exercise it on every run**: verifying the
workflow locally by actually running the four scripts overwrote two
tracked, committed live-run result files —
`benchmarks/token-ab/results/10-counterfactual-token-ab/results.json` and
`.../14-git-log-hook-vs-agent-log-ab/results.json` — reproducing, in two
previously-unaudited siblings, the exact `OUT_DIR`-collision bug a prior
session already found and fixed in `run-swebench-ab.mjs` (see that file's
own code comment). `run.mjs` and `run-gitlog-ab.mjs` never got the same
fix. Applied the identical, already-proven pattern to both (`-dry-run`
suffix on `OUT_DIR` whenever `--dry-run` is set) rather than filing a new
ticket — small, mechanical, single root cause already diagnosed in-repo,
and directly implicated by this ticket's own CI runs, which would
otherwise dirty a fresh checkout's tracked files on every invocation.
Re-verified all four dry-run commands end to end after the fix: real
output, `results.json` written under the new `*-dry-run` paths, zero diff
against the tracked live-run files. `npx tsc --noEmit` clean; no test
covers these `.mjs` files (confirmed by grep), so `npm test` is unaffected
by either change.

## Comments

- Graduated 2026-08-12 from [ticket 13](13-audit-dogfooding-gaps.md)'s
  audit finding F5.
