Type: task
Status: claimed
Blocked by: 36
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

## Answer

Grounded Scope items 2 and 7 with the maintainer via `AskUserQuestion`
before writing the workflow, since both are release-safety product calls,
not implementation details:

- **Dist-tag scheme (item 2):** only `-rcN` is recognized. A bare
  `MAJOR.MINOR.PATCH` publishes `latest`; `MAJOR.MINOR.PATCH-rcN` publishes
  `rc`; anything else (`-beta1`, `-rc` with no digits, a fourth version
  segment) fails the workflow loudly via `::error::` rather than guessing a
  dist-tag or falling back to a default. Verified the regexes against
  `2.3.0`, `2.3.0-rc1`, `2.3.0-rc12` (all match as intended) and
  `2.3.0-beta1`, `2.3.0-rc`, `2.3.0.1` (all correctly fall through to the
  failure branch).
- **Failure visibility (item 7):** GitHub's own Actions UI is the baseline
  and stays the only surface — no issue-comment or notification step added.

Built [`.github/workflows/publish.yml`](../../../.github/workflows/publish.yml)
(this repo had no `.github/workflows/` directory before this ticket), as
**two jobs**, not one — added mid-session after the maintainer separately
raised a security question about this exact file (who can make it publish):

1. **Trigger** — `push` to `main` only (Scope item 1), never
   `pull_request`/`pull_request_target` — the latter is the pattern that
   runs with a base repo's secrets against an attacker-controlled fork
   branch; deliberately avoided.
2. **`build-and-test` job (runs unconstrained on every push to `main`)** —
   `npm ci` then `npm test`, which already chains `npm run build` before
   the vitest suite (Scope item 5); nothing duplicated, the workflow just
   runs what already exists locally. Also resolves the version/dist-tag
   (regex scheme below) and the already-published check, exposing both as
   job outputs for the second job to consume.
3. **Version/dist-tag resolution** — reads `package.json`'s `name`/
   `version` via `node -p`, applies the two-regex scheme above, and fails
   the job (`exit 1`) on anything unrecognized (Scope item 2).
4. **Skip-if-unchanged** — `npm view <name>@<version> version` before
   publishing; if it resolves, the run writes a `## Skipped: ... already on
   npm` line to `$GITHUB_STEP_SUMMARY` and the second job's `if:` condition
   never fires, so an unbumped push is a visibly-labeled skip in the run
   summary, not a silent no-op and not a failure (Scope item 3).
5. **`publish` job (`needs: build-and-test`, gated by a GitHub
   Environment)** — `environment: npm-publish`. A GitHub Environment can
   carry required-reviewer protection rules configured in repo Settings
   (not in this file); until the maintainer creates that environment and
   adds a reviewer, `environment:` is a no-op label and the job runs
   automatically like any other, so **this alone does not yet gate
   anything** — it's the wiring, not the policy. Splitting into two jobs
   (rather than one job with an `environment:` key) means the reviewer
   approves *after* seeing build/test results, not before — a single-job
   version would gate the whole job including the tests, hiding exactly the
   signal a reviewer would want before approving a live publish.
6. **Auth (item 4, HITL — cannot be done by this agent):** the `publish`
   job reads `secrets.NPM_TOKEN` as `NODE_AUTH_TOKEN` at the `npm publish`
   step (the standard `actions/setup-node`-managed `.npmrc` pattern — no
   token value is ever written to the workflow file itself). The
   maintainer still needs to, by hand:
   1. On npmjs.com: **Account → Access Tokens → Generate New Token →
      Automation** (not "Publish" — Automation tokens work in CI without
      2FA prompts and are scoped for exactly this).
   2. Copy the token value once (npm shows it only at creation time).
   3. On GitHub: **repo → Settings → Secrets and variables → Actions → New
      repository secret**, name `NPM_TOKEN`, paste the value. (Or, for the
      environment-scoped version of the same protection: create the
      environment first — **Settings → Environments → New environment**,
      name `npm-publish`, add required reviewers — then add `NPM_TOKEN` as
      an *environment* secret instead of a repo secret, so the token itself
      is inaccessible to any job until a reviewer approves that run.)
   No other setup is required — the workflow starts running on the next
   push to `main` once `NPM_TOKEN` exists in some form.
7. **Publish + tag** — `npm publish --tag <resolved-tag>`, then (only if
   that step succeeded) `git tag vX.Y.Z[-rcN]` and `git push origin <tag>`,
   guarded so an already-existing git tag warns instead of erroring rather
   than re-tagging (Scope item 6). Tagging runs strictly after publish
   succeeds — sequential steps stop the job on failure by default — so the
   two can never drift the way a manual sequence can if a step is skipped
   partway through. The `publish` job re-runs `npm ci`/`npm run build`
   (build only, not the test suite again) rather than passing `dist/`
   between jobs via artifact upload/download — simpler, and the rebuild is
   deterministic from the same checked-out commit `build-and-test` already
   tested.
8. **Failure visibility** — no added step; GitHub's own Actions UI (and its
   default commit-status/email notifications) is the whole surface, per the
   maintainer's answer above.

**Security note recorded, not just fixed in-line:** the maintainer asked
mid-session what stops someone from opening a branch and publishing.
Answer: opening a branch alone does nothing — the trigger is `push` to
`main` specifically. The actual control is **who can get a commit onto
`main` at all**, which is a GitHub repo-settings concern this workflow
file cannot express — branch protection (require PRs, require the
build/test status check, restrict direct pushes) is the real gate, and the
maintainer chose to configure that themselves rather than have it set via
`gh api` this session. The `npm-publish` environment above is a second,
independent layer (approval on the specific act of exposing `NPM_TOKEN`
and running `npm publish`), not a replacement for branch protection.

**Not verified live this session** — `NPM_TOKEN` doesn't exist yet (item 4
is HITL and unstarted), and the Verification section requires a real push
to `main` actually landing on npm, so nothing here can be exercised
end-to-end without both. Split real-install verification into
[36 — Verify the Publish Workflow Against a Real
Push](36-verify-publish-workflow-real-run.md), the same
split-verification-from-build precedent `01`→`20` and `02`→`22` used, so
this ticket doesn't stay open-ended on an action only the maintainer can
take. YAML syntax checked with `pyyaml`; the four-case dist-tag regex
checked by hand in `bash` (see above) — neither exercises the real
`npm view`/`npm publish`/tag-push behavior, which only a live run can.
