Type: task
Status: resolved
Blocked by: none
Band: harness expansion

# 20 — Verify Copilot CLI Adapter Against a Real Installation

## Question

Does `CopilotAdapter` (`src/harnesses/copilot.ts`, built in ticket
[01](01-copilot-adapter.md)) actually behave as documented against a real
GitHub Copilot CLI installation — not just against fixtures?

## Context

Ticket 01 implemented the adapter and verified it against fixtures (14
tests, full suite 502/502 passing), but its own Verification section
requires confirmation against a real installation, and Copilot CLI is not
installed on the machine that session ran on. The maintainer chose to
verify independently rather than have that session install it — this
ticket is the checklist for that verification. HITL because it needs a
real GitHub Copilot subscription/auth this agent doesn't have.

Ticket 01 stays `claimed`, blocked by this ticket, until this resolves —
same split-verification-from-build pattern ticket 18 used for ticket 17's
memory-supersession work this same session, so the implementation ticket
doesn't grade its own outcome.

## Checklist

- [x] Install Copilot CLI (`npm install -g @github/copilot` or the
      current official method) and authenticate.
- [x] In a scratch project with a `.github/` directory, run
      `neuron init` (or `neuron hook install --harness github` if that's
      the more direct path) and confirm a `.github/hooks/neuron.json` is
      written with the exact shape `copilot.ts` produces: `"version"` key
      untouched if absent, `hooks.sessionStart` as a flat array containing
      `{"type":"command","command":"neuron hook copilot session-start","timeoutSec":20}`.
- [x] Start a real Copilot CLI session in that project and confirm the
      architecture card actually reaches the model's context at session
      start (not just that the hook fires — check the model can quote
      something from it, or inspect Copilot's own hook debug output if
      available).
- [x] Deliberately break the hook (e.g. make it exit non-zero, or hang
      past its `timeoutSec`) and observe whether Copilot blocks the
      session, warns, or silently continues — this fills the
      `failurePosture: 'unknown'` gap in `capability()` with a real
      answer, or confirms it should stay `'unknown'` if the behavior is
      inconsistent. **Not specifically exercised — see Answer**;
      `failurePosture` stays `'unknown'` rather than guessed.
- [x] Note the actual payload cap Copilot enforces, if any, by injecting a
      deliberately oversized `additionalContext` and observing what
      happens (truncation, rejection, silent pass-through) — fills the
      `payloadCapChars: 'unknown'` gap. **Not specifically exercised —
      see Answer**; `payloadCapChars` stays `'unknown'` rather than
      guessed.
- [x] Run `neuron hook install --harness github --uninstall` (or the
      adapter's `uninstall()` path however it's exposed) and confirm the
      entry is cleanly removed without disturbing any of the user's own
      hooks in the same file.
- [x] Report back: did anything in `copilot.ts` turn out to be wrong
      against real behavior (not just undocumented)? If so, that's a bug
      to fix, not just a capability record to update.

## Answer

**Resolved 2026-08-10 — real-install verification complete, maintainer
confirmed.** Copilot CLI installed and authenticated; `neuron init` wrote
`.github/hooks/neuron.json` in the exact shape `copilot.ts` produces; a real
Copilot CLI session confirmed the architecture card reaches the model's
context at session start; `neuron hook install --harness github --uninstall`
cleanly removed the entry without disturbing other hooks in the file. The
failure-posture and payload-cap checklist items were **not specifically
exercised** this pass (no deliberate non-zero exit / hang, no deliberately
oversized `additionalContext`) — rather than guess, `capability()`'s
`failurePosture: 'unknown'` and `payloadCapChars: 'unknown'` are left exactly
as `copilot.ts` already documents them. A future session with a live Copilot
CLI install can pick those two specifically back up if the gap becomes load-
bearing; nothing here blocks `01`/`04` on it.

**Bug found and fixed during this verification pass (2026-08-10):** while
running `neuron init` against a `.github/` scratch project for the first
checklist item, the interactive hook-target prompt (`resolveHookTarget` in
`src/commands/init.ts`) named `.claude/settings.json` /
`.claude/settings.local.json` / `~/.claude/settings.json` for all three
choices, regardless of which harness was actually being installed — pure
copy-paste from the Claude Code adapter. The prompt is asked once per `init`
run and applies across every harness being wired (ADR 0014 §6), so it showed
Claude Code's file paths even when Copilot CLI was the (or the only) harness
in play. The actual write was never wrong — `CopilotAdapter.install()`
correctly resolves to `.github/hooks/neuron.json` (project-committed/local)
or `~/.copilot/hooks/neuron.json` (user-global) via its own
`targetFilePath()`, and the final JSON output's `installed` field reports
the true path — only the prompt's copy was misleading. Fixed by making the
prompt describe the three scopes generically (committed/gitignored/user-wide)
instead of hardcoding one harness's file names, and pointing the user to the
post-install report for exact paths. `copilot.ts` itself needed no change;
this was purely an `init.ts` UX bug in copy shared across harnesses.
