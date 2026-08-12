Type: task
Status: unclaimed
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

## Comments

- Graduated 2026-08-12 from [ticket 13](13-audit-dogfooding-gaps.md)'s
  audit finding F1a — the cheapest, highest-confidence item in its
  prioritized backlog, no open design questions per the audit itself.
