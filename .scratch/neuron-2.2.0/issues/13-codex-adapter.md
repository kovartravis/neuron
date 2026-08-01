Type: task
Status: unclaimed
Blocked by: 11
Band: 2.2.0-rc3

# 13 — Codex Adapter (Fallback Reference)

## Question

Does the adapter interface survive a harness that **cannot** guarantee
deterministic injection — and is the `AGENTS.md` fallback path a first-class
adapter rather than an apology?

## Why this adapter second

Codex is the **opposite extreme** from ticket `12`. Where Claude Code tests
whether the interface can express a rich hook surface, Codex tests whether it can
express a thin one — or none — without pretending otherwise.

This is the pair that validates the abstraction. If `13` requires bending the
interface designed in `11`, that is the finding, and `11` gets revised before
tickets `16`–`18` build on it.

## Scope

1. Detect a Codex project (`AGENTS.md`, `~/.codex/config.toml`, or whatever `10`
   establishes as authoritative).
2. Implement whatever injection capability `10` found — and if the honest answer
   is "none that is deterministic", implement the fallback as the adapter's real
   behaviour rather than a stub that reports failure.
3. **The `AGENTS.md` fallback path.** This is the mechanism for every harness
   outside the five, so it must be genuinely good, not vestigial:
   - Keep the recall instruction that `12` deletes on deterministic harnesses,
     because here nothing else does the job.
   - Write and update the block idempotently, preserving user content around it.
     `neuron init` already appends/updates a `## Memory Store` block in place —
     reuse that machinery rather than growing a second writer.
4. Report capability truthfully via the `11` capability model. If recall here is
   `instruction-only`, say so — ticket `19` surfaces it to the user, and a false
   claim of determinism is worse than an honest limitation.
5. Implement detect, install, uninstall and verify like any other adapter.

## Verification

- Confirm the adapter reports a fidelity verdict matching `10`'s findings, not an
  optimistic one.
- Confirm the `AGENTS.md` block round-trips: install, re-install, upgrade,
  uninstall, with surrounding user content untouched throughout.
- Confirm a project with **both** `.claude/` and `AGENTS.md` resolves per the
  multi-harness rule from `11`, without the two adapters fighting or
  double-injecting.

## Deliverables

- [ ] Codex adapter implementing the `11` interface
- [ ] Production-quality `AGENTS.md` fallback, reusing the existing block writer
- [ ] Truthful capability reporting
- [ ] Round-trip tests for the instruction block
- [ ] Multi-harness coexistence verified against ticket `12`
- [ ] Any revisions the interface needed, fed back into `11`'s ADR
