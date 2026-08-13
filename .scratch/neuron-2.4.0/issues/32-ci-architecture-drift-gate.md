Type: task
Status: resolved
Blocked by: none

# 32 — CI Architecture-Drift Gate

## Question

Add a step to `.github/workflows/publish.yml`'s `build-and-test` job that
runs `neuron scan --check` (or equivalent) and fails the build if
`.neuron/architecture.md` doesn't match the structural reality of `src/` at
that commit — closing finding **F1a** from
[ticket 13's audit](13-dogfooding-gaps-audit.md).

Currently nothing in CI verifies the architecture card isn't stale. The
card is git-tracked (`storage.mode: md`) and kept fresh today only by
session discipline (the protocol's own "if module boundaries changed,
refresh the blueprint" step) — a PR that changes exports without a
maintainer or agent remembering to re-scan ships silent drift with nothing
to catch it.

Read-only, no `.neuron/` write-back needed — the check only needs to fail
loudly, not fix anything (matching **F1b**'s explicit rejection in the
audit: CI should never write back to `.neuron/`, since there's no safe way
to persist that against a concurrent human push).

Resolve:
- Confirm the exact CLI surface: does `neuron scan --check` (or `status
  --check`) already support a dry-run drift check with a non-zero exit
  code on drift, or does this need a small addition to `src/commands/`?
- Which job/step it lands in (`build-and-test`, before or after `npm
  test`) and whether it needs the same Node version pin as the rest of
  that job.
- What the failure message should tell a contributor to do
  (`neuron scan` locally, commit the result).

## Answer

Added an "Architecture drift check" step to `.github/workflows/publish.yml`'s
`build-and-test` job, immediately after "Build and test" (so `dist/cli.js`
already exists — `npm test` runs `npm run build` first, no separate build
step needed). Same job, same Node 22 pin as the rest of the steps around it
— no divergence to introduce.

CLI surface needed no code change: `neuron scan --check` (`src/commands/
scan.ts`) already implements exactly this contract, exhaustively covered by
`scan.fidelity.test.ts` — `0` clean, `1` real drift, `2` incomparable
baseline (parser-fidelity mismatch, e.g. a `neuron` version bump). Read-only,
per F1b's explicit rejection of CI write-back — no `.neuron/` mutation, the
step only fails loudly.

The step shells out with `set +e` to capture the real exit code, then
branches on it to post a differentiated `::error::` annotation before
re-exiting non-zero — code 1 and code 2 get different messages (matching the
exit-code contract's own documented distinction: drift the contributor
introduced vs. an incomparable baseline from a tooling upgrade are "a
different problem with a different fix," not the same failure). Both tell
the contributor the same remedy (`neuron scan` locally, commit the result),
since CI has no safe way to do it for them.

Live-verified against this repo's own real state: built `dist/cli.js` via
`npm run build`, ran `node dist/cli.js scan --check --no-progress` directly
(not just in CI) — exits 0, "Architectural Status: In Sync," confirming the
step works end to end against the real committed `.neuron/architecture.md`
baseline and `src/` tree, not just the unit-test fixtures. Didn't reproduce
the 1/2 exit paths live against real source (already exhaustively covered by
`scan.fidelity.test.ts`, which passed as part of the same `npm test` this
step runs after). YAML validated with `python3 -c "import yaml; yaml.safe_load(...)"`.
No `src/` changes — `tsc --noEmit` clean, nothing to re-run in `npm test`.

## Comments

- Graduated 2026-08-12 from [ticket 13](13-audit-dogfooding-gaps.md)'s
  audit finding F1a — the cheapest, highest-confidence item in its
  prioritized backlog, no open design questions per the audit itself.
