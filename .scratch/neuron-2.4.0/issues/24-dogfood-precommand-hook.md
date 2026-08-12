Type: task
Status: resolved
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

## Answer

Worked all four scope items against this repo's own real install, rebuilding
`dist/` first so the globally-linked `neuron` binary (symlinked to this
repo's `dist/cli.js`) actually ran `22`/`23`'s shipped code, not a stale
build.

1. **Re-`init`'d this repo for real.** `neuron init` installed a real
   `PreToolUse` → `neuron hook claude-code pre-command` entry into
   `.claude/settings.json` (previously absent — confirmed before running,
   matching `23`'s own note that this was deliberately left uninstalled to
   avoid stepping on this ticket's scope).
2. **Two independent live captures of real `additionalContext` injection**,
   both fired by genuine Bash tool calls through this very Claude Code
   session (not a scripted harness) — saved verbatim in
   `tmp/24-live-capture-1.txt` and `tmp/24-live-capture-2.txt`:
   - A `git diff`/`cat`/`sed` command matched `neuron.yaml`'s catch-all
     `onExec` rule (`.*` → `learning`, limit 8) and injected a real
     `learning` entry as a `PreToolUse:Bash hook additional context`
     system-reminder.
   - A separate `npm test` invocation matched the more specific rule
     (`^(npm test|git commit)` → `learning`/`history`/`decisions`, limit 5)
     and injected a *different* set of entries, confirming the hook
     selects `onExec` rules by real command-text pattern, not a fixed
     payload.
3. **Confirmed the Command Execution step is gone from this repo's real
   `CLAUDE.md`**, not just theorized: the first `init` run reported
   `execFidelity: deterministic` but kept the file as-is (non-interactive
   run, differs from generator output); re-ran with `--overwrite-hooks` to
   force the write and diffed the result — `## 1. Command Execution` and
   its `neuron exec -- <command>` body are gone, `Failure-Fix Recording`
   and `Session Conclusion` renumbered down to `1`/`2`.
4. **Confirmed Copilot/Cursor's generated protocol still includes the
   step** via `protocolBlock.test.ts`'s `fidelity: 'fallback', execFidelity:
   'fallback'` fixture (line 58-61): asserts `## 2. Command Execution` is
   present. No real Copilot/Cursor install available in this environment,
   per `22`'s own structural finding that both harnesses lack any
   context-carrying hook field at all — matches the ticket's own fallback
   instruction to spot-check the fixture.

**One unintended side effect found and reverted, not part of this ticket's
scope**: a bare `neuron init` (no `--harness` filter) auto-onboarded the
GitHub/Copilot harness because this repo has a `.github/` directory,
recreating `AGENTS.md` and `.github/hooks|skills/` (deleted from this repo
since the v2.1.0 release commit, for reasons unrelated to this ticket).
Matches a gotcha already on record in this store ("scope with `--harness
<id>` when you only want one harness's files touched"); reverted those three
paths, keeping only the pre-command-scoped changes
(`.claude/settings.json`, `CLAUDE.md`, and an incidental accurate
`.neuron/architecture.md` content refresh from the same `init` run's
auto-rescan).

`npm test` 678/678 (unchanged from `23`'s own count — no regression),
`tsc --noEmit` clean. Doesn't unblock anything directly (no ticket lists it
as a blocker) — confirms `22`/`23` actually work end to end against this
repo's real install, mirroring `10`'s role for the git-log index.
