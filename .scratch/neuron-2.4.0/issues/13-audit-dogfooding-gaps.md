Type: task
Status: unclaimed
Blocked by: 12

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
