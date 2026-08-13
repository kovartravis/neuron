Type: task
Status: resolved
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

## Answer

Built as a new `status --check` finding kind, `binaryVersionMismatch`,
following ticket 01's `undeclaredCategories` precedent exactly as the
ticket suggested — not `--health` (that's store-content signals, not
tooling/env drift) and not a standalone `neuron doctor` command (same
"no new commands" precedent `status.ts` already documents for `--check`/
`--health`). No `--repair` counterpart: there's nothing to write, the fix
is re-linking/re-installing the binary outside this process.

`checkBinaryVersionMismatch(cwd, runningBinaryPath = process.argv[1])`
(`src/components/binaryVersion.ts`) only fires when `cwd`'s own
`package.json` names `@kovartravis/neuron` — an ordinary consumer's
install has no "current directory's own version" to disagree with, so it
never fires for them. It resolves `runningBinaryPath` past any symlink
(`realpathSync`, the `readlink -f` step from both prior incidents,
precomputed) and reads the *running* binary's own `package.json` one
directory up from its script (true for both `dist/cli.js` and `tsx`-run
`src/cli.ts`, so no build-vs-dev branch is needed), then compares
versions. `runningBinaryPath` is a parameter rather than read directly so
tests can point it at a fixture binary instead of the real live one.

Posture: warns, but participates in `--check`'s existing exit-code
contract the same way `undeclaredCategories` does — `compliant: false`
and `process.exitCode = 1` on a mismatch, never a hard throw. It doesn't
get its own hard-fail tier; `--check` already doesn't block anything by
itself, a human or CI step decides what to do with a non-zero exit.

Verified live against this repo's own real trap: built a full copy of
this repo's real `dist/` under a fake package root with only its
`package.json` version overwritten (reproducing an un-rebuilt `npm link`/
stale `npm install -g` without needing an actual second install), ran
`node <stale-copy>/dist/cli.js status --check` from a project directory
whose own `package.json` names `@kovartravis/neuron` at the real current
version, and got back a correct, non-zero-exit `binaryVersionMismatch`
report naming both versions and the resolved real path. `npm test`
715/716 (the one failure, Pillar 7 adversarial recall quality, is
pre-existing flakiness confirmed unrelated by reproducing it against
`HEAD` with this ticket's changes stashed out), `tsc` clean.

## Comments

- Graduated 2026-08-12 from [ticket 13](13-audit-dogfooding-gaps.md)'s
  audit finding F2.
