Type: task
Status: unclaimed
Blocked by: 06
Band: context cost

# 07 — Measure Whether the Discovery-Command Hint Gets Used

## Question

Ticket 32 injects a conditional, per-turn, ready-to-run discovery command
whenever the existing recall left real matches un-injected. Whether an
agent shown that hint actually invokes it — and whether doing so changes
task outcomes for the better — is an unverified behavioral assumption, not
a given: ticket 10's own counterfactual A/B found the memory arm's failure
rate *higher* than the no-memory control's, on this same map. Cheap to
build is not the same as cheap to get right.

Design and run a real measurement, at minimum establishing:
- Does a turn that received the hint get followed by the agent actually
  running the suggested command (or a close variant), versus ignoring it?
- Does a session with the hint available produce better outcomes than one
  without it, on a task that genuinely depends on discovering more than
  what the initial recall surfaced (e.g. a README/summary-writing task
  spanning many history/decisions entries)?
- Whether it's cheaper to reuse `10`/`14`/`18`'s existing harness
  (`benchmarks/token-ab/`) than build a new one, and if so, what task(s)
  from that harness (or a new one) actually exercise the "recall left a
  real gap" trigger condition at all — a task where the top-10 already
  covers everything never fires the hint and can't measure anything.

## Comments

- Graduated 2026-08-09 alongside ticket 32, in the same grilling session,
  at the maintainer's direct request — matching this map's established
  precedent of splitting proof-of-value from the build ticket rather than
  asserting it (ticket 11 → 24 for the architecture card, ticket 17 → 18
  for supersession).
