Type: task
Status: claimed
Blocked by: none
Band: catch-all

# 36 — Verify the Publish Workflow Against a Real Push

## Question

Does [`.github/workflows/publish.yml`](../../../.github/workflows/publish.yml)
(built in [21](21-github-action-automated-publish.md)) actually publish to
npm, tag the release, and skip safely on an unbumped push — exercised for
real, not just read?

## Context

Ticket 21 built and syntax-checked the workflow but could not run it
end-to-end: `NPM_TOKEN` doesn't exist yet (npmjs.com + GitHub secret
provisioning is HITL, item 4 of that ticket's Scope, unstarted), and the
`npm-publish` GitHub Environment referenced by the `publish` job's
`environment:` key doesn't exist either — until both are created, the
"gate" is inert wiring, not an active control. Same split-verification-
from-build precedent tickets 20 (Copilot) and 22 (Cursor) used.

## Scope

1. **Provision `NPM_TOKEN` (HITL, maintainer only)** — generate an
   Automation-type token on npmjs.com, add it either as a plain repo secret
   or (recommended, matching ticket 21's security note) as an
   environment-scoped secret on a new `npm-publish` GitHub Environment with
   required reviewers configured.
2. **A real prerelease push** — bump `package.json` to a fresh `-rcN`,
   push to `main`, confirm: `build-and-test` runs and passes, `publish`
   waits for approval (if the environment gate is configured) or runs
   immediately (if using a plain repo secret instead), `npm view
   @kovartravis/neuron dist-tags` shows the new version under `rc`, and the
   matching git tag exists and was pushed.
3. **A real stable push** — same, for a bare `MAJOR.MINOR.PATCH`, confirm
   it lands under `latest`.
4. **An unbumped push** — push a no-version-change commit to `main`,
   confirm the run summary shows the skip line and no `publish` job runs
   (not a failure, not silent).
5. **If branch protection was configured** (maintainer's own follow-up
   from ticket 21's security note) — confirm a direct push to `main` from
   a non-exempt actor is actually rejected, not just that the workflow
   trigger is scoped to `main`.

## Verification

- `npm view @kovartravis/neuron dist-tags` reflects a real `rc` push.
- `npm view @kovartravis/neuron dist-tags` reflects a real `latest` push.
- The unbumped-push run's summary clearly shows a skip, and no `publish`
  job appears in that run at all.
- If an `npm-publish` environment with required reviewers was configured,
  a real run actually pauses for approval before `npm publish` executes.
