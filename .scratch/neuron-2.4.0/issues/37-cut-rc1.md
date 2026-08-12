Type: task
Status: open
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

- [ ] `2.4.0-rc1` version-bumped and committed
- [ ] CHANGELOG entry covering the real `v2.3.0..HEAD` diff
- [ ] Unit + E2E suites run, results disclosed
- [ ] `rc` dist-tag derivation confirmed live or explicitly flagged as
      inspection-only
- [ ] Maintainer go-ahead obtained before the push to `main`
- [ ] `feat/2.4.0-rc1` merged (fast-forward) to `main` and pushed
- [ ] `2.4.0-rc1` verified live on npm's `rc` dist-tag and `v2.4.0-rc1`
      verified on `origin`'s tags

## Answer

_Not yet resolved._

## Comments
