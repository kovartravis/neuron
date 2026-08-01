Type: task
Status: unclaimed
Blocked by: 15
Band: 2.2.0-rc4

# 17 — Antigravity CLI Adapter

## Question

What recall fidelity can neuron deliver on Antigravity CLI, and does the adapter
interface hold?

## Context

Antigravity is the newest of the five harnesses, which makes ticket `10`'s
findings for it the **least certain** — documentation is likely thinner and more
in flux than for Claude Code or Codex. Expect to verify empirically rather than
trusting docs, and expect the surface to have moved since `10` was written.

## Scope

1. Implement detect / install / uninstall / verify / report-capability against the
   `11` interface, using `10`'s findings.
2. Wire whatever injection surface exists; fall back to `AGENTS.md` if nothing
   deterministic is available, per the capability-aware generator in `14`.
3. Report the fidelity verdict truthfully for ticket `19`'s matrix.
4. Honour the config-safety requirements from `11`.
5. **Re-verify `10`'s findings before building.** If the harness has changed, note
   the delta on this ticket and update the research asset rather than leaving a
   stale document behind.

## Verification

- Verify against a real Antigravity CLI installation.
- Confirm reported fidelity matches observed behaviour.
- Note version-sensitivity explicitly: if the integration depends on a surface
  that looks unstable, record which version it was verified against so a future
  breakage is diagnosable.

## Deliverables

- [ ] Antigravity CLI adapter implementing the `11` interface
- [ ] Injection wired, or the fallback path deliberately taken
- [ ] Truthful fidelity verdict feeding ticket `19`
- [ ] Config-safety cases verified
- [ ] Verified harness version recorded; `10`'s research asset updated if it drifted
