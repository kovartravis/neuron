Type: task
Status: unclaimed
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

- [ ] Install Copilot CLI (`npm install -g @github/copilot` or the
      current official method) and authenticate.
- [ ] In a scratch project with a `.github/` directory, run
      `neuron init` (or `neuron hook install --harness github` if that's
      the more direct path) and confirm a `.github/hooks/neuron.json` is
      written with the exact shape `copilot.ts` produces: `"version"` key
      untouched if absent, `hooks.sessionStart` as a flat array containing
      `{"type":"command","command":"neuron hook copilot session-start","timeoutSec":20}`.
- [ ] Start a real Copilot CLI session in that project and confirm the
      architecture card actually reaches the model's context at session
      start (not just that the hook fires — check the model can quote
      something from it, or inspect Copilot's own hook debug output if
      available).
- [ ] Deliberately break the hook (e.g. make it exit non-zero, or hang
      past its `timeoutSec`) and observe whether Copilot blocks the
      session, warns, or silently continues — this fills the
      `failurePosture: 'unknown'` gap in `capability()` with a real
      answer, or confirms it should stay `'unknown'` if the behavior is
      inconsistent.
- [ ] Note the actual payload cap Copilot enforces, if any, by injecting a
      deliberately oversized `additionalContext` and observing what
      happens (truncation, rejection, silent pass-through) — fills the
      `payloadCapChars: 'unknown'` gap.
- [ ] Run `neuron hook install --harness github --uninstall` (or the
      adapter's `uninstall()` path however it's exposed) and confirm the
      entry is cleanly removed without disturbing any of the user's own
      hooks in the same file.
- [ ] Report back: did anything in `copilot.ts` turn out to be wrong
      against real behavior (not just undocumented)? If so, that's a bug
      to fix, not just a capability record to update.

## Answer

_Pending._
