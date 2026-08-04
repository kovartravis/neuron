Type: task
Status: out of scope — 2026-08-04, destination narrowed to the 3-pillar 2.2.0 cut (Claude Code + Codex deterministic recall, md-first, deterministic scanning); continues as ticket 01 in ../neuron-harness-expansion/map.md, do not implement here
Blocked by: 15
Band: 2.2.0-rc4

# 16 — GitHub Copilot CLI Adapter

## Question

What recall fidelity can neuron actually deliver on GitHub Copilot CLI, and does
the adapter interface hold without bending?

## Context

Of the five harnesses, Copilot CLI is expected to have the **thinnest**
extensibility surface — flagged during charting, to be confirmed by ticket `10`.
It is entirely possible the honest verdict is `instruction-only`, in which case
this adapter is a detection layer plus the `AGENTS.md` fallback from ticket `13`.

**That is a legitimate outcome, not a failed ticket.** The value of shipping it is
that `neuron init` recognises the environment and tells the user the truth about
what they are getting, rather than staying silent and letting them assume they
have the same recall a Claude Code user has.

## Scope

1. Implement detect / install / uninstall / verify / report-capability against the
   `11` interface, using `10`'s findings for this harness.
2. Wire whatever injection surface exists. If none is deterministic, fall back to
   the `AGENTS.md` path — including keeping step 1 of the protocol block, per the
   capability-aware generator in `14`.
3. Report the fidelity verdict truthfully for ticket `19`'s matrix.
4. Honour the config-safety requirements from `11`: non-clobbering merge,
   idempotent re-install, clean uninstall.

## Verification

- Verify against a real Copilot CLI installation, not only against fixtures.
  Ticket `10` may have documented capabilities that behave differently in practice.
- Confirm the reported fidelity matches observed behaviour. A gap between what the
  adapter claims and what happens is the specific failure this whole design is
  meant to prevent.

## Deliverables

- [ ] Copilot CLI adapter implementing the `11` interface
- [ ] Injection wired, or the fallback path deliberately and visibly taken
- [ ] Truthful fidelity verdict feeding ticket `19`
- [ ] Config-safety cases verified
- [ ] Behaviour confirmed against a real installation
