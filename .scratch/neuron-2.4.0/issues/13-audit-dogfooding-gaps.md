Type: task
Status: resolved
Blocked by: 24

# 13 — Audit: Dogfooding Gaps in This Repo

## Question

Systematically enumerate every place in this repo where `@kovartravis/neuron`
could plausibly be used against itself but currently isn't, and produce a
concrete, prioritized backlog — this ticket does not fix anything itself,
it makes the gaps visible so fix tickets can graduate from its answer.

Known candidates found during this map's own recon (not exhaustive — the
point of this ticket is to make it exhaustive):
- `.github/workflows/publish.yml` never invokes `neuron exec`, despite
  `neuron.yaml`'s own `onExec` rule targeting `^(npm test|git commit)`.
  Whether CI is even an appropriate place for `neuron exec` (a CI runner has
  no persistent `.neuron/` store to learn from across runs the way an agent
  session does) is itself part of what this audit should determine, not
  assume either way.
- `npm test` and `git commit` — the two commands `neuron.yaml`'s `onExec`
  rule explicitly names — aren't visibly wrapped anywhere in the repo's own
  documented workflow; whether agent sessions actually invoke them through
  `neuron exec` in practice, or just via `CLAUDE.md`'s instruction (which
  ticket 12 may replace with a hook), is unverified.
- `neuron scan` (architecture scanning) — is it run on a schedule, on push,
  or only manually? `neuron.yaml` has `scan.enabled: true` but no wiring to
  CI is visible.
- Whatever ticket 12 lands on for pre-command lookup — once resolved, this
  audit should check the repo's own compliance against that mechanism, not
  the current `neuron exec` convention.

Scope for the audit itself: this repo's own use of its own tool, across
CI (`.github/workflows/`), local dev workflow (`package.json` scripts,
git hooks if any), and agent-session protocol compliance
(`CLAUDE.md`, `neuron.yaml`). Out of scope: inventing new neuron features
to dogfood — this ticket only surfaces gaps in *existing* capability
usage, not feature requests.

Deliverable: a markdown summary (linked asset) listing each gap found, why
it's a gap, and a rough size/risk note per item, sufficient for graduating
each into its own implementation ticket in a following session.

## Comments

- Chartered 2026-08-10 in a breadth-first grilling session that split the
  maintainer's "dogfood neuron everywhere possible" idea into a
  process-rigor track (this ticket) and a separate showcase track
  ([16](16-curate-neuron-store-showcase.md)) — the maintainer explicitly
  wanted these as two tracks with different bars for "done," not one
  combined effort.
- Blocked by [12](12-precommand-hook-vs-exec.md) at the maintainer's
  request: auditing against a convention (`neuron exec` wrapping) that
  ticket 12 might replace with a hook would waste the audit's own findings.
- **Rewired 2026-08-11**: `12` resolved (Claude Code/Codex get a real
  `pre-command` hook; Copilot/Cursor keep `neuron exec` permanently — see
  `12`'s own Answer) and graduated three implementation tickets rather
  than shipping the mechanism itself. Re-pointed this ticket's blocking
  edge from `12` to [24](24-dogfood-precommand-hook.md), the terminal one
  of the three — auditing needs the real mechanism dogfood-verified, not
  just designed, to check compliance against.

## Answer

Full audit published as
[13-dogfooding-gaps-audit.md](13-dogfooding-gaps-audit.md). Checked all
four of this ticket's own recon candidates against current source rather
than transcribing them; one (unwrapped `npm test`/`git commit`) turned out
to already be resolved as a side effect of tickets 22-24's pre-command
hook, which reuses `exec.ts`'s exact `resolveExecCategories` matching.

Five real open gaps found, prioritized: **F1** — CI (`publish.yml`) never
invokes `neuron` at all; splits into an architecture-drift gate worth
adding (`neuron scan --check` in `build-and-test`) and a write-back mode
explicitly *not* recommended (no safe way to persist a CI-authored
`.neuron/` commit against a concurrent human push). **F2** — the
stale-global-binary trap (already bitten twice, both on record as
learnings) now also applies to every hook in `.claude/settings.json`
since ticket 22, not just `neuron exec`, and nothing detects a
version/build mismatch automatically. **F3** — `CLAUDE.md`'s generated
protocol block can drift from `neuron.yaml` with no automated check (this
already happened once for real, caught only by ticket 10's manual
dogfood pass). **F4** — no scheduled cadence for `neuron status
--health`; store rot only ever gets caught by a human remembering to run
it. **F5** — the free, dry-run-capable benchmark harnesses have no CI
regression gate.

Three items checked and explicitly cleared, not flagged: this repo's
Claude-Code-only harness scope (not a gap, a scope choice), no human-run
local git pre-commit hook (inventing one would be a new feature, out of
this ticket's scope), and `neuron scan` being run only ad hoc (fine in
practice today — F1's drift-gate finding is the same observation from the
other, unguaranteed, direction).

Deliverable does not implement anything itself, per the ticket's own
scope — F1a and F3 are the two lowest-friction graduation candidates for
a following session (no open design questions, small and additive);
F2 needs one small design call (fold into `status` or stand alone) before
it can be sized as a ticket.
