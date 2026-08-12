Type: task
Status: unclaimed
Blocked by: none

# 33 — Detect a Stale Global/Linked `neuron` Binary Against the Working Tree

## Question

Add a check that warns when the `neuron` binary resolved from `PATH` (what
every hook in `.claude/settings.json` and every `neuron exec` call
actually runs) doesn't match the current directory's own `package.json`
version — closing finding **F2** from
[ticket 13's audit](13-dogfooding-gaps-audit.md).

This trap has already bitten this project twice on record (the 2.2.0-rc1
phantom-drift incident, and the `gh pr create` argv-joining
misattribution), both requiring a human to notice a downstream symptom and
diagnose backward via `readlink -f $(which neuron)`. Since ticket 22, it's
no longer scoped to `neuron exec` alone — every hook
(`session-start`/`pre-prompt`/`pre-command`/`post-tool-use`/`context-reset`)
invokes the bare command `"neuron"` from `PATH`, so a stale global/linked
install now silently runs old behavior on every hook firing, not just
manual `exec` calls.

Resolve, as part of implementation (small design call, per the audit):
- Where the check lives: a new `status --check` finding kind (following
  ticket 01's `undeclaredCategories` precedent), folded into `status
  --health`, or a standalone `neuron doctor`-style check run at hook time.
- What "matches" means when the running binary and the cwd's project are
  genuinely different projects (this check should only fire when the cwd
  itself has a `package.json` naming `@kovartravis/neuron` — i.e.
  developing-on-neuron-itself, not every user's project).
- Whether this warns (non-blocking, matching `--health`'s posture) or can
  ever hard-fail a command.

## Comments

- Graduated 2026-08-12 from [ticket 13](13-audit-dogfooding-gaps.md)'s
  audit finding F2.
