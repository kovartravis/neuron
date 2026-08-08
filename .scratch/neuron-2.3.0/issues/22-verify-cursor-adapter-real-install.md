Type: task
Status: unclaimed
Blocked by: none
Band: harness expansion

# 22 — Verify Cursor Adapter Against a Real Installation

## Question

Does `CursorAdapter` (`src/harnesses/cursor.ts`, built in ticket
[02](02-cursor-adapter.md)) actually behave as documented against a real
Cursor installation — not just against fixtures?

## Context

Ticket 02 implemented the adapter and verified it against fixtures (14 new
tests, full suite passing), but its own Verification section requires
confirmation against a real installation, **specifically including the
cloud/background-agent hole** — Cursor is not installed on the machine that
session ran on, so none of this could be exercised there. This ticket is the
checklist for that verification, split out the same way ticket 20 split
Copilot CLI's real-install verification from ticket 01's build (and, before
that, ticket 18 split from ticket 17) — so ticket 02's implementation ticket
doesn't grade its own outcome. HITL because it needs a real Cursor
installation and, for the cloud-agent leg, a Cursor account with
cloud/background agents enabled.

Ticket 02 stays `claimed`, blocked by this ticket, until this resolves.

## Checklist

- [ ] Install Cursor (the IDE, and/or the `cursor-agent` CLI if that's the
      more direct path) and authenticate.
- [ ] In a scratch project with a `.cursor/` directory, run `neuron init`
      (or `neuron hook install --harness cursor` if that's the more direct
      path) and confirm `.cursor/hooks.json` is written with the exact
      shape `cursor.ts` produces: `"version": 1` only if the file didn't
      already have one, `hooks.sessionStart` and `hooks.preCompact` each a
      flat array containing
      `{"type":"command","command":"neuron hook cursor <point>","timeout":<20|5>}`.
- [ ] Start a real Cursor session in that project and confirm the
      architecture card actually reaches the model's context at session
      start (not just that the hook fires) — check the model can quote
      something from it.
- [ ] **Confirm the stdout contract the code assumes.** `emit()`
      (`src/commands/hook.ts`) writes a flat, snake_case
      `{"additional_context": "..."}` for Cursor, sourced from a direct doc
      fetch rather than a real invocation. If Cursor's real hook runner
      expects something different, that's a bug in `cursor.ts`/`hook.ts`,
      not a capability-record gap.
- [ ] **Specifically test the cloud/background-agent hole.** Run a Cursor
      cloud/background agent against this same project and confirm
      `sessionStart` genuinely does not fire there (per the documented
      carve-out `capability()`'s `session-start` caveat states) — the one
      documented behavior that would make the reported capability false in
      practice if it turned out wrong. If cloud/background agents can't be
      exercised in this environment, say so explicitly rather than leaving
      the caveat's truth silently unverified.
- [ ] **Confirm the `preCompact`/`session_id` gap.** `capability()`'s
      `context-reset` caveat claims `preCompact`'s stdin carries no
      `session_id` field, so `rollEpoch` never fires even though the hook is
      registered and does run. Trigger a real compaction in a live session
      and inspect (or log) the hook's actual stdin to confirm this — if
      `session_id` turns out to be present after all, `hook.ts`'s
      `context-reset` branch should start rolling the epoch on this harness,
      which is a real behavior change, not just a doc correction.
- [ ] Deliberately break the `sessionStart` hook (exit non-zero, or hang
      past its `timeout`) and observe whether Cursor blocks the session,
      warns, or silently continues, despite the documented `fail-open`
      default — confirms or corrects `failurePosture: 'fail-open'`.
- [ ] Note the actual payload cap Cursor enforces on `additional_context`,
      if any, by injecting a deliberately oversized payload — fills the
      `payloadCapChars: 'unknown'` gap.
- [ ] Run `neuron hook install --harness cursor --uninstall` (or the
      adapter's `uninstall()` path however it's exposed) and confirm both
      entries are cleanly removed without disturbing any of the user's own
      hooks in the same file.
- [ ] Report back: did anything in `cursor.ts` turn out to be wrong against
      real behavior (not just undocumented)? If so, that's a bug to fix, not
      just a capability record to update.

## Answer

_Pending._
