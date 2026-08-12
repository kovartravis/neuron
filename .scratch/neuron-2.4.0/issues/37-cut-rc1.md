Type: task
Status: resolved
Blocked by: none
Band: 2.4.0-rc1

# 37 — Cut and Publish 2.4.0-rc1

## Question

Is everything currently on `feat/2.4.0-rc1` since `v2.3.0` safe to tag and
publish as `2.4.0-rc1`, and — since the publish pipeline changed shape mid-map
(see Context) — does merging this branch to `main` correctly become the real,
irreversible trigger, not a separate `npm publish` step?

## Context

**This map has no cut ticket yet and is still wide open** (13+ tickets on the
frontier or blocked as of this charter: `25`, `28`, `29`, `30`, `31`,
`32`-`36`, plus `02`/`04`/`05` claimed-in-progress and `03`/`26` blocked — see
map.md's own running frontier note). This ticket does **not** wait for that
work to finish — it snapshots trunk now, matching every prior rc cut's own
precedent ([neuron-2.2.0's `04`](../../neuron-2.2.0/issues/04-cut-rc1.md),
[neuron-2.3.0's `34`](../../neuron-2.3.0/issues/34-cut-rc2.md)): an interim rc
tag ships whatever is really on trunk when it's cut, not a pre-agreed nominal
scope. `package.json` is still `2.3.0` (unbumped) as of this charter.

**The publish mechanism changed since the last cut, and that changes what
"leave it to the maintainer" means.** Every prior rc cut on `neuron-2.2.0` and
`neuron-2.3.0` manually tagged, pushed, and explicitly left `npm publish` as a
separate step for the maintainer to run by hand — because no automation
existed yet. `.github/workflows/publish.yml` (built neuron-2.3.0 ticket `21`,
proven live for the real `v2.3.0` stable publish — OIDC auth, no
`NPM_TOKEN`, green in 3m, confirmed against the live registry per that
ticket's own Answer) now triggers **on every push to `main`**: it reads
`package.json`'s version, derives the npm dist-tag itself (`^X.Y.Z$` →
`latest`, `^X.Y.Z-rcN$` → `rc`), skips if that exact version is already
published, and — only after a real `npm publish` succeeds — creates and
pushes the git tag itself. There is no longer a manual "tag, push, stop
before publish" step to perform. **Merging to `main` is now the irreversible
publish trigger**, and the old maintainer-checkpoint belongs there instead of
after a manual tag.

This will be the **first live run of that pipeline against a prerelease
version.** Only a bare-semver push (`v2.3.0` itself) has actually gone through
it. A dry read of the regex confirms `2.4.0-rc1` matches
`^[0-9]+\.[0-9]+\.[0-9]+-rc[0-9]+$` and resolves to the `rc` dist-tag, but
that is inspection, not proof — this ticket's Answer should say plainly
whether it was confirmed live or only by inspection, matching this map's
own claim-must-match-behavior standard (`13`'s audit, `24`'s dogfooding).

`main` (`7eb94cb`) is a strict ancestor of `feat/2.4.0-rc1` with zero
divergence — every commit on `main` is already on this branch, and nothing
has landed on `main` since. The merge is a clean fast-forward; there is no
conflict-resolution work here, only the version-bump/CHANGELOG/verification
work below and the maintainer go-ahead to push.

## Scope

1. Version bump `package.json` to `2.4.0-rc1`.
2. CHANGELOG entry, audited from `git log v2.3.0..HEAD` directly (25
   commits as of this charter) rather than assumed from the map's nominal
   ticket numbering — per `neuron-2.2.0` ticket `09` / `neuron-2.3.0` ticket
   `34`'s own precedent, since tickets here have not landed in strict number
   order either. At minimum, audit whether these have landed by cut time and
   describe only what's real:
   - ADR 0017 / category declaration authority (`01`)
   - discovery-command hint + its follow-rate instrument (`06`/`07`)
   - the git-log recall index, its docs, and its dogfood verification
     (`08`/`09`/`10`)
   - the `pre-command` hook decision, implementation, and dogfood
     verification (`12`/`22`/`23`/`24`)
   - concurrent-write data-loss fix in markdown storage (`18`)
   - `--if-novel` non-interactive write mode for cron (`19`)
   - `neuron status --health` (and `--repair`, added same-session) (`20`)
   - zero-`sessionsObserved` proactive warning (`21`)
   - antagonistic-recall abstention benchmark findings (`17`) — measurement
     only, no fix; state the 99.80%/0% split plainly as prior art, not a
     shipped improvement
   - the reranker-precision decision (`27`) and whichever of `28`/`29` have
     landed by cut time
   - store curation / dogfooding audit (`13`/`16`)
   - anything else the git log turns up that isn't listed here (`30`,
     `31`, `25`/`26`, `32`-`36` are all plausible by cut time depending on
     session order — do not assume any particular subset landed)
3. Run `npm test` and `npm run test:e2e`; disclose any pre-existing failures
   rather than treating them as new blockers (Pillar 8's concurrent-migration
   flake has multi-cycle precedent on both prior maps).
4. State plainly in the Answer whether `publish.yml`'s `rc`-dist-tag
   derivation was confirmed by a real push or only by reading the regex.
5. **Get explicit maintainer go-ahead before pushing to `main`** — this is
   the real irreversible step now (a successful npm publish follows within
   minutes, before any human reviews the Action run).
6. Merge `feat/2.4.0-rc1` to `main` (fast-forward) and push, once confirmed.
7. Verify live, not just the Actions checkmark: `npm view
   @kovartravis/neuron dist-tags` shows `rc: '2.4.0-rc1'`, and `git
   ls-remote --tags origin` shows `v2.4.0-rc1` — auto-created by the
   workflow, not by this ticket.

## Deliverables

- [x] `2.4.0-rc1` version-bumped and committed
- [x] CHANGELOG entry covering the real `v2.3.0..HEAD` diff
- [x] Unit + E2E suites run, results disclosed
- [x] `rc` dist-tag derivation confirmed live or explicitly flagged as
      inspection-only
- [x] Maintainer go-ahead obtained before the push to `main`
- [x] `feat/2.4.0-rc1` merged (fast-forward) to `main` and pushed
- [x] `2.4.0-rc1` verified live on npm's `rc` dist-tag and `v2.4.0-rc1`
      verified on `origin`'s tags

## Answer

Cut and published for real. `package.json` bumped to `2.4.0-rc1`; CHANGELOG
entry written from a direct `git log v2.3.0..HEAD` audit (25 commits) rather
than the map's nominal ticket numbering, since — per this map's own repeated
precedent — tickets hadn't landed in strict order. `npm test` 678/678,
`npm run test:e2e` clean exit with 0 dropped/lost writes on the
historically-flaky Pillar 8 concurrent-migration stress test.

Found and reverted a real bug while running the e2e suite for this cut:
`test/e2e/concurrency-stress.test.ts`'s isolated `projectRoot` has no
`neuron.yaml` of its own, so ticket 01's category auto-declare write path
walked upward with no floor and mutated this repo's *real* `neuron.yaml`
(`stress: {}`). Store content itself stayed clean (no `stress.md` file was
created) — only the config-write side effect escaped. This has apparently
happened and been silently hand-reverted before (surfaced in dogfooding
history from a prior session) without ever being ticketed; reverted again
here and formally chartered as
[39](39-config-autodeclare-escapes-projectroot.md) instead.

Given the branch-ruleset discovery below, the maintainer chose **open a PR**
over the available direct-bypass-push option (`current_user_can_bypass:
"always"` as repo owner, matching `neuron-2.3.0` ticket 34's own bypass
precedent) — [PR #6](https://github.com/kovartravis/neuron/pull/6),
reviewed and merged by the maintainer directly on GitHub
(`b919c00a4c7a913a83480c0599bf20d0fdeb1e06`), fast-forward, no conflicts.

**This was the first real push of a `-rcN` version through `publish.yml`.**
It worked exactly as the regex-inspection predicted: `build-and-test` (1m25s)
then `publish` (1m42s) both green, `npm publish --tag rc` succeeded, and the
workflow auto-created and pushed `v2.4.0-rc1` pointing at the merge commit —
confirmed live: `npm view @kovartravis/neuron dist-tags` returns `{ rc:
'2.4.0-rc1', latest: '2.3.0' }`, and `git ls-remote --tags origin` lists
`v2.4.0-rc1`. The `main` branch ruleset ("Protect", id `20346327`) was also
confirmed for real mid-cut: `pull_request` (1 approval, code-owner review,
`require_last_push_approval`), `code_scanning` (CodeQL), and `code_quality`
rules are all active — the PR path exercised these gates for real for the
first time on this branch, rather than only the bypass path prior cuts used.

Not done here, deliberately: no work on any other frontier ticket (25, 28,
30, 31, 32-36 still open/unclaimed), and ticket 38 (rc2) is untouched —
queued next once more of the frontier lands.

## Comments

`feat/2.4.0-rc1` (the branch, not the ticket) was deleted after merge, both
locally and on `origin`, at the maintainer's direct request — standard
post-merge cleanup, not a scope change. Local work continues directly on
`main` until a new branch is needed.
