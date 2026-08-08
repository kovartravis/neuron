Type: task
Status: unclaimed
Blocked by: none
Band: catch-all

# 21 — GitHub Action: Automated npm Publish on Push to Main

## Question

What does a GitHub Actions workflow need to do to replace the manual
`npm publish` step this map's cut-and-publish tickets (and ticket 04) have
been doing by hand — safely, and choosing the right dist-tag on its own?

## Context

Surfaced 2026-08-08 at the maintainer's direct request, immediately after a
session manually walked through cutting `v2.3.0-rc1`: version bump, build,
test, tag, push, then `npm publish` blocked on interactive `npm login` in
the maintainer's own terminal. The maintainer wants pushes to `main` to
publish automatically going forward, on both the `rc` and `latest` tracks,
rather than repeating that manual sequence per release.

## Scope

1. **Trigger:** push to `main` (not every branch — matches this map's own
   "merge to main at the end of an epic" cadence, now recorded as
   [decision](../../.neuron/decisions.md) in this repo's own memory store).
2. **Dist-tag selection from `package.json`'s own version string** — no
   separate input or manual flag: a version containing a prerelease
   identifier (e.g. `2.3.0-rc1`) publishes under the `rc` dist-tag; a bare
   `MAJOR.MINOR.PATCH` publishes under `latest`. Needs a decision on exactly
   which prerelease identifiers count (only `-rc`? any `-` suffix per
   semver's own prerelease grammar?) and what happens on a dist-tag this
   scheme doesn't recognize (e.g. `-beta`) — fail loudly or fall back to a
   safe default?
3. **Skip republishing an unchanged version** — pushes to `main` that don't
   bump `package.json`'s version (a docs fix, a wayfinder tracker sync)
   must not attempt to publish a version npm already has and fail loudly,
   or worse, silently no-op in a way that looks like success.
4. **Auth:** an `NPM_TOKEN` repo secret the maintainer provisions by hand
   (HITL — this agent cannot create npm automation tokens on the
   maintainer's account). Document the exact steps: generate an
   Automation-type token on npmjs.com, add it as
   `Settings → Secrets and variables → Actions → NPM_TOKEN` on GitHub.
5. **Build/test gate before publish** — reuse whatever this repo's own
   `npm test`/`npm run build` already verify locally; a workflow that
   publishes on green CI is only as trustworthy as what CI actually checks.
6. **Tag + push the git tag** (`vX.Y.Z[-rcN]`) as part of the same run, so
   the published npm version and the git tag never drift apart the way a
   manual sequence can if a step is skipped.
7. **Failure visibility** — how does the maintainer find out a publish
   attempt failed (GitHub's own Actions UI is the baseline; is anything
   more proactive — an issue comment, a notification — worth the added
   scope)?

## Verification

- A real push to `main` with a bumped prerelease version actually lands on
  the `rc` npm dist-tag, verified via `npm view @kovartravis/neuron
  dist-tags`.
- A real push with a bumped stable version lands on `latest`.
- A push that doesn't bump the version is a safe no-op, not a failure and
  not a silent skip that looks like success.
