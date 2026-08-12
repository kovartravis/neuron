Type: task
Status: unclaimed
Blocked by: none

# 31 — `neuron init` Silently Onboards Every Detected Harness, Not Just the One In Use

## Question

Fix `neuron init` so a bare, unscoped run doesn't silently write files for
harnesses the project isn't actually using — found live while resolving
[24](24-dogfood-precommand-hook.md): a bare `neuron init` (no `--harness`
filter) in this repo re-onboarded the GitHub/Copilot harness solely because
a `.github/` directory exists, recreating `AGENTS.md` and
`.github/hooks|skills/` (deleted from this repo since the v2.1.0 release,
for unrelated reasons) with no prompt, no dry-run warning, and no way to
tell from the run's own output that it just onboarded a harness the project
wasn't previously wired for, as opposed to refreshing one it already was.

This is not a new discovery — a learning entry already on record from an
earlier session names the same gotcha and documents the workaround ("scope
with `--harness <id>` when you only want one harness's files touched") —
but it had never been ticketed as something to actually fix, only worked
around by remembering to pass a flag.

## Scope

1. Confirm the detection trigger precisely: is any `.github/` directory
   enough to onboard the `github` harness (as observed), or is there a more
   specific marker (`.github/workflows/`, an existing `AGENTS.md`, a config
   file) that `init.ts`'s harness-detection path actually checks? Read the
   real detection logic before assuming the repro's cause.
2. Decide the right default: candidates include (a) requiring
   `--harness <id>` explicitly for any harness with no *prior* evidence of
   use (no existing `AGENTS.md`/hook file for it) while still auto-refreshing
   harnesses already wired, (b) an interactive confirmation before writing a
   new harness's files in interactive runs, paired with a non-interactive
   `--yes`/`--all-detected` opt-in, or (c) a clearly flagged dry-run-style
   warning in the run's own output distinguishing "onboarding a new harness"
   from "refreshing a wired one" (weaker fix, but at least makes the side
   effect visible instead of silent).
3. Apply consistently across every harness adapter's detection path
   (Claude Code, Codex, Copilot, Cursor), not just the Copilot case this
   repo happened to hit.
4. Update `docs/COMMANDS.md`'s `neuron init` section and the README's Quick
   Start if the default behavior changes.

## Verification

- A repo with only a `.github/` directory and no prior harness files
  present no longer gets Copilot onboarded by a bare `neuron init` without
  some explicit signal (flag, prompt, or clearly surfaced warning) — pick
  whichever scope-2 option is chosen and encode it in a test.
- A repo already wired for a harness still gets that harness's files
  refreshed by a bare `neuron init`, unchanged from today.
- `npm test` and `tsc --noEmit` clean.
