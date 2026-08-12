# Audit: Dogfooding Gaps in This Repo

Linked asset for [ticket 13](issues/13-audit-dogfooding-gaps.md). Scope: this
repo's own use of `@kovartravis/neuron` against itself, across CI
(`.github/workflows/`), local dev workflow (`package.json` scripts, git
hooks), and agent-session protocol compliance (`CLAUDE.md`, `neuron.yaml`,
`.claude/settings.json`). Out of scope by the ticket's own charter:
inventing new neuron features.

Each of the ticket's own four recon candidates was checked against current
source (not transcribed), plus four more found during the sweep.

## Findings

### Closed — not actually a gap (checked, not assumed)

**F0. `npm test` / `git commit` unwrapped in the repo's documented
workflow.** The ticket's own recon flagged this as unverified. Checked
`src/commands/hook.ts:343` against `src/commands/exec.ts:19`: the
`pre-command` handler (shipped by ticket 22, dogfooded by ticket 24) calls
the identical `resolveExecCategories(config, command)` that `neuron exec`
uses, and `.claude/settings.json`'s `PreToolUse` hook matches every tool
call (`"matcher": "*"`), so it fires on every real Bash invocation this
session makes — including bare `npm test` and `git commit`, with no
`neuron exec` wrapping required. `neuron.yaml`'s `onExec` rules (the
blanket `.*` → `learning` rule and the `^(npm test|git commit)` →
`learning`/`history`/`decisions` rule) are both live through this path.
**Verdict: resolved as a side effect of tickets 22-24, not a live gap.**

### Open gaps, prioritized

**F1. CI never invokes `neuron` at all — highest-value, cheapest fix.**
`.github/workflows/publish.yml` runs `npm ci` → `npm test` → (on the
`publish` job) `npm run build` → `npm publish`. No step calls `neuron scan
--check`, `neuron status --health`, or any recall/write command. Two
distinct sub-gaps, worth separating because they have different
appropriateness answers:
- **Architecture-drift gate (recommend: add).** Nothing in CI verifies
  `.neuron/architecture.md` — which *is* git-tracked (`storage.mode: md`,
  4 files under `.neuron/`, confirmed via `git ls-files .neuron`) — still
  matches the structural reality of the `src/` it describes. The card is
  currently kept fresh by session discipline alone (the protocol's own
  "if module boundaries changed, refresh the blueprint" step); a PR that
  changes exports without a maintainer or agent remembering to re-scan
  ships silent drift. `neuron scan --check` (exit-code gate, read-only) in
  the `build-and-test` job is a natural fit and costs nothing — no
  `.neuron/` write-back needed, since the check only needs to fail loudly,
  not fix anything.
- **Write-side dogfooding in CI (recommend: skip, don't ticket).** A CI
  runner has no way to persist a `neuron memory add` across runs unless a
  job commits `.neuron/*.md` back to the branch — which the ticket's own
  recon correctly flagged as an open question, and this audit resolves it:
  don't. `publish.yml` runs on push-to-main after review; a CI-authored
  memory commit racing a human's own push, or silently amending history on
  every publish, is a worse failure mode than the status quo (no CI
  writes). If CI-side recall value is wanted later, it's a read-only
  `neuron memory query` for context in the step summary — not a write —
  but no current failure motivates that, so leave it fogged rather than
  ticketing speculatively.

**F2. The stale-binary trap has bitten twice and nothing detects it
automatically.** Two learnings already on record (`neuron exec` /
`autoRescanIfDriftDetected` during the 2.2.0-rc1 cut; the `gh pr create`
argv-joining misattribution) are the same root cause: `neuron exec` *and*,
since ticket 22, every hook in `.claude/settings.json`
(`session-start`/`pre-prompt`/`pre-command`/`post-tool-use`/`context-reset`)
invoke the bare command `"neuron"`, resolved from `PATH` — not this repo's
own `dist/`. When the global/linked install drifts behind the working
tree (an un-rebuilt `npm link`, or a stale global `npm install -g`), every
hook silently runs old behavior while the agent edits new source, and the
only way this has ever been caught is a human noticing a symptom
downstream (phantom drift, a shell-syntax error) and diagnosing backward.
Live-checked this session: `which neuron` → `~/.nvm/.../bin/neuron` →
`readlink -f` → this repo's own `dist/cli.js` (linked, version `2.3.0`,
matches `package.json`, `pre-command` present in `dist/commands/hook.js`)
— currently in sync, but nothing *enforces* that, so it's luck, not a
guarantee. No code anywhere compares the running binary's version/build to
the repo's own `package.json` or git HEAD. A `neuron status --health`
addition (or a new `--check` finding kind, following `01`'s
`undeclaredCategories` precedent) that warns when the resolved-from-PATH
binary's version disagrees with the current directory's own
`package.json` version would turn two after-the-fact incident writeups
into one proactive warning. Medium size — the version-compare logic is
small, but it needs a code path that can tell "I am running against a
package.json at path X" and compare it to "the nearest ancestor
package.json from cwd," which doesn't exist today.

**F3. `CLAUDE.md`'s generated protocol block can drift from `neuron.yaml`
with no CI or hook catching it.** Already happened once for real (ticket
10 found the header still read `learning, history, decisions` /
`category: decisions` after ticket 01's live auto-declare changed
`neuron.yaml` out from under it) and was only caught by a human doing a
live dogfood pass, not by any automated check. `neuron init` only
regenerates the marker-bounded block on `--overwrite-hooks` or interactive
consent (recorded learning); a non-interactive re-init just warns
`kept-existing` into a log nobody reads by default. A CI or `status
--check` step that regenerates the block in memory and diffs it against
the committed `CLAUDE.md` (fail if different) would catch this class of
drift the same day it happens instead of on the next unrelated dogfooding
session. Small-to-medium — the generator function already exists
(`generateProtocolBlock`), this is a diff-and-report wrapper.

**F4. No periodic/scheduled store-health check.** `neuron status --health`
and `--health --repair` (ticket 20) exist and found real pollution when
run — 155 entries merged across 30 of 34 duplicate groups — but the only
invocation on record is the one-off, maintainer-approved run inside ticket
20's own session. Nothing runs it on a cadence, so store rot (duplicate
groups, importance-3 pileup) accumulates silently between manual passes
until someone thinks to check. A scheduled GitHub Action (weekly `neuron
status --health` posting a summary, *not* auto-`--repair` — that stays a
human-approved action per ticket 20's own precedent) would surface rot
without an agent session having to remember to look. Small — it's one new
`.yml` file with no new neuron-side code.

**F5. Benchmark instrumentation has no regression gate.**
`hintFollowLog.ts`'s command-matching regex (ticket 07) has already needed
two live bug fixes for false positives found only by manual smoke-testing
during the ticket that built it. `bench:hint-follow`, `bench:gitlog-ab`,
and the token-A/B harnesses all live as `npm run` scripts with no CI
wiring — reasonable for the paid/live-session variants (real API spend,
correctly gated behind maintainer go-ahead per the map's own fog item),
but the *free*, dry-run-capable ones (`bench:token-ab:dry-run`,
`bench:gitlog-ab:dry-run`, `bench:swebench-ab:*:dry-run`) cost nothing and
currently only run when a human remembers to. Smallest, lowest-priority
item here — dry-run harness regressions are a minor inconvenience
(caught next time someone runs one), not silent data loss.

## Not gaps (checked, explicitly cleared)

- **Copilot/Cursor/Codex non-onboarding.** This repo has never had
  `AGENTS.md`, `.cursor/`, or a persisted `.github/hooks|skills/` (the one
  transient auto-onboard was reverted, per ticket 24's and ticket 31's own
  Answers). Confirmed live: `find` for `.cursor*`/`codex*` and `AGENTS.md`
  came back empty. This repo dogfoods Claude Code only, which matches how
  it's actually worked — not a gap, a scope choice already made
  implicitly and worth stating explicitly so a future audit doesn't
  re-raise it.
- **A real local git `pre-commit` hook (human-run, outside any agent).**
  No `.git/hooks/` beyond samples, no Husky. Deliberately not flagged as a
  gap: this ticket's own scope is agent-session protocol compliance and
  CI, and a human running `git commit` by hand outside a Claude Code
  session is not a dogfooding surface neuron currently claims to cover —
  inventing one would be a new feature, explicitly out of this ticket's
  scope.
- **`neuron scan` itself, run ad hoc.** `.neuron/architecture.md`'s last
  commit (2026-08-12 07:12) postdates the latest `src/` change (07:05) —
  the card is fresh right now, kept that way by session discipline. This
  is F1's architecture-drift gate finding from the other direction: the
  *practice* is fine today, the *guarantee* is what's missing.

## Prioritized backlog for graduation

1. **F1a — CI architecture-drift gate** (`neuron scan --check` in
   `build-and-test`). Cheapest, highest-confidence win; no design
   questions, just wiring.
2. **F3 — CI/status protocol-block drift check.** Same shape as F1a, reuses
   an existing generator function.
3. **F2 — binary/version-mismatch detection.** Real recurring cost (two
   incidents on record), but needs a small design decision: fold into
   `status --health`/`--check`, or its own thing.
4. **F4 — scheduled store-health check.** Low effort, no design
   questions; lowest urgency since manual runs have caught rot so far.
5. **F5 — CI-wire the free dry-run benchmarks.** Nice-to-have, smallest
   blast radius if skipped.

F1b (CI write-back) is explicitly *not* recommended — recorded here so a
future session doesn't re-propose it without seeing this reasoning.
