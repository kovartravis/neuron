Type: task
Status: unclaimed
Blocked by: 11
Band: 2.2.0-rc3

# 12 — Claude Code Adapter (Deterministic Reference)

## Question

Does the adapter interface from ticket `11` hold up against the harness with the
richest hook surface — and does deterministic, agent-independent recall actually
work end to end?

## Why this adapter first

Claude Code is the **deterministic extreme** of the five. It is the reference
implementation: if auto-injection cannot be made to work here, the premise of the
whole recall theme is wrong, and better to learn that in rc3 than in rc4.

Paired deliberately with ticket `13` (Codex, the fallback extreme). Building both
before fanning out is what stops the interface being designed against one real
backend and four guesses.

## Scope

1. Detect a Claude Code project and install hooks into the settings file, per the
   consent policy settled in `11`.
2. Wire the lifecycle points ticket `10` confirmed:
   - **Pre-prompt** — query the store with the user's prompt, inject results.
   - **Session start** — seed the architectural blueprint card once.
3. Enforce the payload budget from `11`: token ceiling, relevance floor,
   truncation. Injecting on every turn is the case where an unbounded payload does
   real damage.
4. **Merge into existing user config without clobbering it.** Users have their own
   hooks. Preserve them, mark neuron's entries identifiably, and make re-running
   `neuron init` idempotent.
5. Implement uninstall — removing neuron's entries and nothing else.
6. Implement verify: report whether the hook is wired *and* whether it is firing.
   Ticket `19` depends on this being real rather than inferred from file contents.
7. Fail safe. A hook that errors, hangs, or returns nothing must not break the
   user's session. Degraded recall is acceptable; a wedged harness is not.

## Verification

- Prove the deterministic claim directly: with the `CLAUDE.md` query instruction
  **removed**, confirm relevant memories still reach the model's context.
- Verify a cold store, an empty store, and a store with no relevant hits all
  behave sanely — no crash, no empty-block noise injected every turn.
- Measure the added wall-clock latency per turn against the budget from `09`.
- Confirm a pre-existing user hook survives install, upgrade and uninstall.

## Deliverables

- [ ] Claude Code adapter implementing the `11` interface
- [ ] Pre-prompt + session-start injection within the payload budget
- [ ] Non-clobbering, idempotent config merge; working uninstall
- [ ] Working verify used by ticket `19`
- [ ] Evidence of deterministic recall with the instruction removed
- [ ] Per-turn latency measured against the rc2 budget
