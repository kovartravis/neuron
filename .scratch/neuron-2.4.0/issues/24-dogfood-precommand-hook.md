Type: task
Status: unclaimed
Blocked by: 22, 23

# 24 — Dogfood the Pre-Command Hook in This Repo

## Question

Live-verify [22](22-implement-precommand-hook.md)'s shipped `pre-command`
hook against this repo's own real install and `onExec` rules — mirrors
[10](10-dogfood-git-log-index.md)'s role for the git-log index: confirm
the shipped mechanism actually works end to end against real data, not
just unit tests.

## Scope

1. Re-`init` this repo for real (or confirm already current from `23`'s
   own re-init step).
2. Run a real bash/shell tool call through Claude Code (or Codex) against
   a command this repo's own `neuron.yaml` `onExec` rules match, confirm
   `additionalContext` actually appears — capture the real transcript
   evidence, same discipline `10`'s own live-demo captures used.
3. Confirm the CLAUDE.md Command Execution step is actually gone from this
   repo's own generated protocol block (not just in a test fixture).
4. Confirm Copilot/Cursor's generated protocol still includes the step
   (spot-check against `protocolBlock.test.ts`'s fixtures if a real
   Copilot/Cursor install isn't available in this environment).

## Verification

- Real, captured evidence of a live `pre-command` injection against this
  repo's own history/config — not just `22`'s unit tests passing.
- `npm test` and `tsc --noEmit` clean.
