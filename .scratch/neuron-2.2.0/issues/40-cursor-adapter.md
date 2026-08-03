Type: task
Status: unclaimed
Blocked by: 15
Band: 2.2.0-rc4

# 40 — Cursor Adapter

## Question

What recall fidelity can neuron deliver on Cursor, and does the `11` interface
hold for a harness whose one injection point has a documented hole in it?

## Context

Cursor was added to ticket `10`'s scope mid-research at the maintainer's request
and came back **`best-effort`** — but it never had an adapter ticket, so the
research set and the ticket set disagreed. This closes that gap. It takes the rc4
slot vacated by `17`/`18`, which were ruled out of scope during `11`'s grilling
(see the map's **Out of scope**).

Cursor is the **better-documented** of the two `best-effort` harnesses neuron
will ship, which is the whole reason it survived the cut while Antigravity and
OpenCode did not:

- `sessionStart` / `postToolUse` inject `additional_context` deterministically.
- **No per-turn injection.** `beforeSubmitPrompt` fires on every turn but is
  documented as permission-only (allow/deny), not a context carrier. Same shape
  as Copilot CLI (`16`).
- **Failure model is documented**: explicit fail-open default with an opt-in
  `failClosed` — materially better than Copilot's, where failure, timeout,
  payload cap and disable switch are all undocumented.
- **A real determinism hole**: several hooks, `sessionStart` among them, do not
  run at all in cloud/background agents. Cursor's only injection point is
  therefore absent in an execution mode Cursor itself offers.

## Scope

1. Implement detect / install / uninstall / verify / report-capability against the
   `11` interface.
2. Capability map: `session-start` supported, `pre-prompt` **not** (`injects:
   false` — the hook exists but cannot carry context, which is a different fact
   from "no hook" and the map must say so). `context-reset` per `10`'s findings.
3. Record the cloud/background-agent caveat as a **caveat on the `session-start`
   support record**, not as prose in the README. `11` settled that the capability
   map is what the code reads and the headline label is derived from it; a
   reliability hole that lives only in documentation is the abstraction lying,
   which is the hazard `11` exists to prevent.
4. Honour `11`'s config policy: init prompts for the hook target, and asks before
   overwriting any existing entry.

## Verification

- Verify against a real Cursor installation, not fixtures.
- **Specifically verify the cloud/background-agent hole**, since it is the one
  documented behaviour that would make a reported capability false in practice.
  If it cannot be exercised, say so — an unverified caveat is still worth more
  than a silent one, but it must be labelled as unverified.

## Deliverables

- [ ] Cursor adapter implementing the `11` interface
- [ ] Capability map with the `pre-prompt` `injects: false` record and the
      cloud-agent caveat attached to `session-start`
- [ ] Truthful fidelity verdict feeding ticket `19`'s matrix
- [ ] Config-safety cases verified
- [ ] Behaviour confirmed against a real installation

## Comments

- 2026-08-03: Created during `11`'s grilling. Replaces `17` (Antigravity CLI) and
  `18` (OpenCode) in the rc4 band; both were ruled out of scope for having
  mechanisms neuron cannot describe.
