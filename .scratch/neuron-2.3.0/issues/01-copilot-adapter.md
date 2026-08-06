Type: task
Status: unclaimed
Blocked by: 07

# 01 — GitHub Copilot CLI Adapter

## Question

What recall fidelity can neuron actually deliver on GitHub Copilot CLI, and does
the adapter interface hold without bending?

## Context

**Continued from [neuron-2.2.0's ticket 16](../../neuron-2.2.0/issues/16-copilot-adapter.md),**
closed out of scope there on 2026-08-04 when that map's destination narrowed to
a 3-pillar cut. Nothing below is new — this is the same ticket, carried
forward as a fresh effort rather than a resumption.

Of the harnesses researched on `neuron-2.2.0`
([ticket 10](../../neuron-2.2.0/issues/10-harness-compatibility-research.md)),
Copilot CLI has the **thinnest** extensibility surface confirmed: a real
`sessionStart` → `additionalContext` injection path exists, but there is no
per-turn (pre-prompt) injection point (`userPromptSubmitted` is
notification-only), and failure/timeout behavior, payload limits, a disable
switch, and verifiability are all undocumented.

**That is a legitimate outcome, not a failed ticket.** The value of shipping
it is that `neuron init` recognises the environment and tells the user the
truth about what they are getting, rather than staying silent and letting
them assume they have the same recall a Claude Code or Codex CLI user has.

## Scope

1. Implement detect / install / uninstall / verify / report-capability
   against the
   [11](../../neuron-2.2.0/issues/11-recall-adapter-architecture.md)
   interface (`src/harnesses/types.ts`), reusing the shared
   `payload`/`ledger`/`hookState` layer tickets
   [12](../../neuron-2.2.0/issues/12-claude-code-adapter.md)/
   [13](../../neuron-2.2.0/issues/13-codex-adapter.md) built — do not
   reimplement it.
2. Wire whatever injection surface exists (`sessionStart` only, per `10`'s
   findings). No per-turn point exists, so `pre-prompt`'s support record is
   `injects: false`, not omitted — a harness with no hook is a different
   fact from an undocumented one, and the capability map must say which.
3. Report the fidelity verdict truthfully for ticket `03`'s disclosure
   surface.
4. Honour the config-safety requirements ADR 0014 already settled:
   non-clobbering merge, idempotent re-install, clean uninstall.

## Verification

- Verify against a real Copilot CLI installation, not only against fixtures.
  `10`'s documented capabilities may behave differently in practice.
- Confirm the reported fidelity matches observed behaviour. A gap between
  what the adapter claims and what happens is the specific failure this
  whole design exists to prevent.

## Deliverables

- [ ] Copilot CLI adapter implementing the shared `HarnessAdapter` interface
- [ ] Injection wired at `session-start`; `pre-prompt` honestly reported as non-injecting
- [ ] Truthful fidelity verdict feeding ticket `03`'s matrix
- [ ] Config-safety cases verified
- [ ] Behaviour confirmed against a real installation
