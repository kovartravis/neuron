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

## Answer

Two real runs happened this session, triggered by ticket `34`'s merge of
`feat/2.3.0` into `main` (v2.3.0-rc2, maintainer-directed early merge to
unblock this exact ticket).

**Run 1** ([31327652836](https://github.com/kovartravis/neuron/actions/runs/31327652836), commit `a170e02`) — `build-and-test` **failed** with a
real, previously-undetected bug, not a workflow-authoring mistake:

```
Error: No such built-in module: node:sqlite
 ❯ Module.createNodeSqliteWrapper src/db.ts:11:28
```

`src/db.ts` uses `node:sqlite`'s `DatabaseSync`, which requires Node
≥22.5.0 and wasn't usable without `--experimental-sqlite` until
22.13.0/23.4.0. `publish.yml` pinned `node-version: '20'` in both jobs
(ticket `21` never caught this because local dev runs Node 24, and the
workflow was never exercised for real until this push). This is exactly
what ticket `21`'s split into this ticket was for.

**Fix**: bumped both jobs to `node-version: '22'`, added `"engines": {
"node": ">=22.13.0" }` to `package.json` to document the real minimum,
verified `neuron exec -- npm test` green locally (580/580), committed
(`e9157a1`), pushed to `main`.

**Run 2** ([31327940336](https://github.com/kovartravis/neuron/actions/runs/31327940336), commit `e9157a1`) — `build-and-test` **passed**
(Node 22 fix confirmed working end-to-end: install, test, version/dist-tag
resolution, already-published check all green). The `publish` job then
ran — not blocked or pending, meaning the `npm-publish` GitHub Environment
doesn't exist as a protected environment yet, so the `environment:` key
had no gate to enforce — and failed cleanly at the `npm publish` step:

```
npm error code ENEEDAUTH
npm error need auth This command requires you to be logged in to https://registry.npmjs.org/
```

No `NODE_AUTH_TOKEN` (i.e. no `NPM_TOKEN` secret) exists yet, exactly as
expected. The `Tag release commit` and `Summary` steps correctly skipped
(GitHub Actions' default behavior after a prior step fails without
`continue-on-error`) — **nothing was published, no tag was created**, a
safe failure.

**Scope status:**
- Item 1 (provision `NPM_TOKEN`) — still HITL, unstarted; this is the
  reason items 2/3 can't complete for real.
- Item 2 (real prerelease push) — **partially exercised**: `build-and-test`
  now really passes on a real `-rc2` push, and `publish` really attempts
  `npm publish --tag rc` and fails only for the expected reason (no
  token). The dist-tag resolution step (`rc` for `-rcN`) is confirmed
  correct from the command GitHub actually ran (`npm publish --tag rc`
  visible in the log). What's *not* yet verified: an actual successful
  publish landing under the `rc` dist-tag on the registry, and the
  environment-approval pause (moot until the environment is created).
- Item 3 (real stable push) — not exercised; needs a bare-version push,
  still blocked on the same token/environment provisioning.
- Item 4 (unbumped-push skip) — not yet exercised this session; both real
  pushes so far were version bumps. Straightforward to verify once
  provisioning happens (or independently, with a no-op commit).
- Item 5 (branch-protection rejection) — not exercised. The maintainer's
  own ruleset ("Protect", id `20346327`, active since 2026-08-03) was
  confirmed to exist via `gh api repos/kovartravis/neuron/rulesets`
  during the merge in ticket `34`, and GitHub's "Bypassed rule violations"
  message on that push (PR-required, code-scanning-required) confirms it's
  live and would normally block a direct push — but no non-exempt-actor
  push was attempted to confirm rejection specifically.

**Net result**: this ticket found and fixed a real bug (`node:sqlite`
requires Node ≥22.13, not the workflow's original Node 20) that only a
real run could have surfaced — confirming the value of splitting
verification from build the way ticket `21` did. `build-and-test` is now
proven correct end-to-end. `publish` is proven to reach `npm publish` with
the right command and dist-tag, and to fail safely with no side effects
when credentials are missing. Full closure of Scope items 1-5 remains
blocked on the maintainer provisioning `NPM_TOKEN` and (optionally) the
`npm-publish` environment's required reviewers — left claimed, not
resolved, pending that HITL step.
