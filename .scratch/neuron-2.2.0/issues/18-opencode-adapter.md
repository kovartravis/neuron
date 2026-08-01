Type: task
Status: unclaimed
Blocked by: 15
Band: 2.2.0-rc4

# 18 — OpenCode Adapter

## Question

Can OpenCode's plugin/event system deliver deterministic recall, and does the
adapter interface accommodate a plugin-shaped integration rather than a
config-file-shaped one?

## Context

OpenCode is expected to have a **plugin/event system** rather than the declarative
hook config Claude Code uses — to be confirmed by ticket `10`. That makes it the
most interesting of the three fan-out adapters: it may be the second harness
capable of genuinely deterministic recall, and it exercises a different
*installation shape* than `12` and `13` did.

If installing here means shipping or registering a plugin rather than writing
config keys, that is a real test of whether `11`'s `install` abstraction was drawn
at the right level. Feed any strain back into `11`'s ADR.

## Scope

1. Implement detect / install / uninstall / verify / report-capability against the
   `11` interface, using `10`'s findings.
2. Wire the plugin/event surface for pre-prompt injection and session-start
   blueprint seeding, matching what `12` does on Claude Code where the capability
   allows.
3. Report the fidelity verdict truthfully for ticket `19`'s matrix.
4. Honour the config-safety requirements from `11`, adapted to plugin
   installation: do not disturb the user's other plugins, and uninstall cleanly.
5. Enforce the payload budget from `11` — this applies wherever injection is
   per-turn, not only on Claude Code.

## Verification

- Verify against a real OpenCode installation.
- If deterministic, prove it the same way `12` did: recall working with the
  instruction block's step 1 absent.
- Confirm the user's existing plugins survive install, upgrade and uninstall.

## Deliverables

- [ ] OpenCode adapter implementing the `11` interface
- [ ] Plugin/event injection wired; payload budget enforced
- [ ] Truthful fidelity verdict feeding ticket `19`
- [ ] Plugin-install safety verified
- [ ] Any interface strain fed back into `11`'s ADR
