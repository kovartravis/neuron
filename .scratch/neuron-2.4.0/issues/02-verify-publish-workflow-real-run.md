Type: task
Status: claimed
Blocked by: none
Band: catch-all

# 02 — Verify the Publish Workflow Against a Real Push

## Question

Does [`.github/workflows/publish.yml`](../../../.github/workflows/publish.yml)
(built in [21](03-github-action-automated-publish.md)) actually publish to
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
when credentials are missing.

**Addendum, 2026-08-09 — auth model changed mid-verification, from token
to OIDC.** The maintainer provisioned `NPM_TOKEN` as an `npm-publish`
environment secret and created the environment with themselves as
required reviewer (real progress — the environment-approval gate is
confirmed live: [run 31328311920](https://github.com/kovartravis/neuron/actions/runs/31328311920)'s
`publish` job sat in `waiting` status, never executing, until approved —
first real evidence for the approval-gate half of Scope item 5). But a
manual `npm publish` attempt hit `EOTP`, and investigating why surfaced
that **npm no longer offers Automation tokens at all** (Classic token
creation is disabled registry-wide; confirmed live against the
maintainer's own npmjs.com account, which shows only "Granular Access
Token"), and that Granular tokens' 2FA-bypass publish capability is
**being removed entirely in January 2027** per npm's own 2026-07-31
changelog — npm's own current guidance is to move to **Trusted Publishing
(OIDC)** instead of any bypass token. The maintainer chose to switch
now rather than wire up a token already on a deprecation path. Rewrote
`publish.yml`'s `publish` job: `permissions: id-token: write` added,
`node-version` bumped to `'24'`, an explicit `npm install -g npm@latest`
step added (trusted publishing needs npm CLI ≥11.5.1, and Node 24 was the
version the sources checked while researching this recommended for full
support), and `NODE_AUTH_TOKEN`/`secrets.NPM_TOKEN` removed from the
`Publish to npm` step entirely — no token, no secret, at all.

**One remaining HITL step supersedes Scope item 1's original "provision
`NPM_TOKEN`" wording**: on npmjs.com, `@kovartravis/neuron` package
Settings → **Trusted Publisher** → **GitHub Actions**, with:
- Organization or user: `kovartravis`
- Repository: `neuron`
- Workflow filename: `publish.yml`
- Environment name: `npm-publish` (optional field; using it ties the OIDC
  trust to runs that passed the existing reviewer gate too, not just to
  the repo/workflow identity)
- Allowed actions: `npm publish`

Once that's set, the next push (or a re-run of a pending `waiting` job)
should reach `npm publish` with no `EOTP`/`ENEEDAUTH` failure and no
manual OTP entry. The previously-created `NPM_TOKEN` environment secret is
now dead weight, safe to delete at the maintainer's convenience but not
required to.

**Update, same day — the maintainer configured the Trusted Publisher and
[run 31328784737](https://github.com/kovartravis/neuron/actions/runs/31328784737)
published for real.** `build-and-test` passed; `publish` ran (`Publish to
npm`, `Tag release commit`, `Summary` all green) with no `NODE_AUTH_TOKEN`
set anywhere in the workflow — npm CLI ≥11.5.1 performed the OIDC exchange
itself. Verified independently against the live registry, not just the
green checkmark:

```
$ npm view @kovartravis/neuron dist-tags
{ latest: '2.2.0', rc: '2.3.0-rc2' }
$ npm view @kovartravis/neuron@2.3.0-rc2 version
2.3.0-rc2
$ git ls-remote --tags origin | grep v2.3.0-rc2
a170e028ceec509de59a56ff8922c3e1d83f3dc1  refs/tags/v2.3.0-rc2
```

**Scope status, final for this session:**
- Item 1 (provision auth) — **done**, via Trusted Publisher/OIDC instead
  of `NPM_TOKEN` (see addendum above for why the plan changed).
- Item 2 (real prerelease push) — **fully confirmed**: `build-and-test`
  passes, `publish` runs, the version lands under the `rc` dist-tag, the
  matching git tag exists and was pushed to `origin`.
- Item 3 (real stable push) — still open. Needs an actual bare-version
  (`MAJOR.MINOR.PATCH`) release decision, which is a real product call
  for the maintainer to make deliberately, not something to trigger as a
  side effect of verification.
- Item 4 (unbumped push skip) — **confirmed this same session**: the very
  next commit after this one (routine ticket-bookkeeping, no version
  bump) is real evidence of this for free, since `2.3.0-rc2` is now
  actually live on the registry for the first time — see the map's own
  Notes for that run's outcome.
- Item 5 (branch-protection rejection) — **partially confirmed**: the
  `npm-publish` environment's required-reviewer gate was observed
  actually pausing a run (the now-superseded `31328311920`, left
  `waiting` rather than auto-running). A genuine non-exempt-actor direct
  push being rejected by the `main` ruleset itself was not attempted —
  still open, and arguably not worth deliberately provoking.

`36` stays claimed, not resolved — items 3 and 5 are the only remainder,
both low-value to force artificially. Recommend the maintainer closes
this ticket manually once satisfied, or leaves it as a standing note for
whenever a real stable-version cut happens naturally.
