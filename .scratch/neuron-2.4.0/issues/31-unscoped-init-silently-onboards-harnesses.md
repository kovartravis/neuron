Type: task
Status: resolved
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

## Answer

**Root cause (Scope 1), confirmed by reading the real code, not assumed:**
Two independent, fully unrelated detection paths both keyed off bare
top-level directory existence with nothing narrower:
`CopilotAdapter.detect()` (`src/harnesses/copilot.ts`, gates hook install
only) and the `HARNESSES`/`harnesses.json`-driven check in
`src/config/harness.ts` + the inline filter in `init.ts` (gates the
skill-directory copy and the `AGENTS.md`/protocol-block write — the two
writes this repo's own bug report actually named). Fixing only the adapter
would **not** have fixed the reported bug: `copySkill`/`writeProtocolBlocks`
never consulted `CopilotAdapter.detect()` at all. Claude Code/Codex/Cursor's
markers (`.claude/`, `.codex/`, `.cursor/`) have no known unrelated creator —
in practice they're created by nothing except their own CLI — so the
false-positive risk this ticket found is real but concentrated entirely in
`.github/`, which GitHub creates constantly for CI/issue templates/funding
files with zero relation to Copilot CLI use. Verified against GitHub's own
docs (fetched live) that `.github/copilot-instructions.md` is the real,
documented, Copilot-specific marker distinct from the generic directory.

**Decision (Scope 2):** none of the three literal candidates as originally
framed — narrow the *detection signal itself* for the one harness whose
marker is genuinely ambiguous, rather than weakening or gating the *policy*
uniformly across all four (which would have broken the everyday "just run
`neuron init`" happy path for Claude Code/Codex/Cursor, whose markers were
never the problem). Concretely: `harnesses.json`'s `github` entry gained an
optional `marker` field (`.github/copilot-instructions.md`); a new
`isHarnessPresent()` in `src/config/harness.ts` checks the marker (falling
back to `base` for every harness with no narrower one — unchanged behavior
for the other three) OR falls back further to "already onboarded by neuron
before" (the harness's own `<skills>/neuron-memory/SKILL.md` already exists)
— so a project already wired for Copilot keeps refreshing correctly even if
`copilot-instructions.md` is later deleted. `CopilotAdapter.detect()` now
delegates to the same `isHarnessPresent()` lookup instead of duplicating the
rule, closing the two-detection-paths gap directly. Added a second, smaller
piece the ticket's "no way to tell from the run's own output" complaint
called out more generally than just Copilot: `handleInitCommand` now
snapshots which detected harnesses have no prior `SKILL.md` evidence
*before* writing anything, and prints
`[neuron] Onboarding harness(es) not previously wired in this project: ...`
to stderr plus a `harnesses: { detected, newlyOnboarded }` JSON field when
that set is non-empty — visible, not silent, for this class of surprise in
general, not just this one repo's `.github/` case.

**Scope 3 (apply consistently):** applied the same *principle* — require a
marker that's actually specific to real usage, not a name that merely
coincides — but not the same *literal check*, since only `github`'s marker
was ambiguous. Verified there's no equivalent unrelated-creator convention
for `.claude/`/`.codex/`/`.cursor/` to guard against, so those three keep
their existing bare-`base` check unchanged; the config schema (`marker?`)
is general enough that a future adapter needing the same narrowing has
nowhere else to add it.

**Adjacent finding, deliberately not fixed here (scope discipline):**
`--harness <list>` was already documented as unable to force-wire an
undetected harness, but reading `writeProtocolBlocks()` and the
`detectedSkillsDirs`/`copySkill` loop found it goes further than documented
— neither of those two write paths reads `options.harness` **at all**, so
`--harness claude` was never actually a working per-run opt-out for the
`AGENTS.md`/skill-dir writes either (only `installHooks` respects the
filter). The root-cause fix above sidesteps this by preventing the false
detection outright, so it doesn't block this ticket's Verification, but a fully general
"`--harness` narrows every write path, not just hooks" fix is a separate,
differently-shaped ticket if the maintainer wants it.

**Verification:** `npm test` 693/693 (61 files, +9 new: `harness.test.ts`
covers `isHarnessPresent`/`detectHarnesses` directly; `copilot.test.ts` and
`init.test.ts` gained regression tests for the false-positive case, the
real-marker case, and the already-wired-refresh case), `tsc --noEmit`
clean. Live-verified against a real fixture tree
(`.github/workflows/ci.yml` only, no marker) — `harnesses.detected: []`,
no `.github/skills` or `AGENTS.md` written; a second fixture with
`.github/copilot-instructions.md` correctly onboarded Copilot, printed the
new stderr note, and reported `newlyOnboarded: ["github"]`. Live-verified
against this repo's own real install too (global binary linked to this
repo's `dist/`, per the standing stale-binary gotcha) — this repo has
`.github/workflows/` but no `copilot-instructions.md` (confirmed, matches
ticket 24's revert), and a bare `neuron init --no-hooks` here now correctly
detects only `claude`, same as before the fix; `.neuron/architecture.md`'s
resulting drift-rescan update (new `harness.test.ts`, new
`isHarnessPresent` export) is genuine, not test pollution, and is committed
alongside.
