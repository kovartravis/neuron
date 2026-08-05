Type: task
Status: unclaimed
Blocked by: none

# 02 — Cursor Adapter

## Question

What recall fidelity can neuron deliver on Cursor, and does the shared
adapter interface hold for a harness whose one injection point has a
documented hole in it?

## Context

**Continued from [neuron-2.2.0's ticket 40](../../neuron-2.2.0/issues/40-cursor-adapter.md),**
closed out of scope there on 2026-08-04 when that map's destination narrowed
to a 3-pillar cut. Nothing below is new — this is the same ticket, carried
forward as a fresh effort rather than a resumption.

Cursor was added to
[ticket 10](../../neuron-2.2.0/issues/10-harness-compatibility-research.md)'s
research scope mid-investigation and came back `best-effort` — the
**better-documented** of the two `best-effort` harnesses this effort ships,
which is why it survived the cut while Antigravity and OpenCode did not (see
`neuron-2.2.0`'s Out of scope):

- `sessionStart` / `postToolUse` inject `additional_context` deterministically.
- **No per-turn injection.** `beforeSubmitPrompt` fires on every turn but is
  documented as permission-only (allow/deny), not a context carrier. Same
  shape as Copilot CLI (`01`).
- **Failure model is documented**: explicit fail-open default with an opt-in
  `failClosed` — materially better than Copilot's, where failure, timeout,
  payload cap and disable switch are all undocumented.
- **A real determinism hole**: several hooks, `sessionStart` among them, do
  not run at all in cloud/background agents. Cursor's only injection point
  is therefore absent in an execution mode Cursor itself offers.

## Scope

1. Implement detect / install / uninstall / verify / report-capability
   against the shared `HarnessAdapter` interface (`src/harnesses/types.ts`),
   reusing the `payload`/`ledger`/`hookState` layer.
2. Capability map: `session-start` supported, `pre-prompt` **not** (`injects:
   false` — the hook exists but cannot carry context, a different fact from
   "no hook," and the map must say so). `context-reset` per `10`'s findings.
3. Record the cloud/background-agent caveat as a **caveat on the
   `session-start` support record**, not as prose in the README. The
   capability map is what the code reads and the headline fidelity label is
   derived from it; a reliability hole that lives only in documentation is
   exactly the abstraction lying ADR 0014 exists to prevent.
4. Honour the config policy ADR 0014 already settled: init prompts for the
   hook target, and asks before overwriting any existing entry.

## Verification

- Verify against a real Cursor installation, not fixtures.
- **Specifically verify the cloud/background-agent hole**, since it is the
  one documented behaviour that would make a reported capability false in
  practice. If it cannot be exercised, say so — an unverified caveat is
  still worth more than a silent one, but it must be labelled as unverified.

## Deliverables

- [ ] Cursor adapter implementing the shared `HarnessAdapter` interface
- [ ] Capability map with the `pre-prompt` `injects: false` record and the
      cloud-agent caveat attached to `session-start`
- [ ] Truthful fidelity verdict feeding ticket `03`'s matrix
- [ ] Config-safety cases verified
- [ ] Behaviour confirmed against a real installation
