Type: task
Status: unclaimed
Blocked by: 08
Band: context cost

# 09 — Shrink the Resident Footprint

## Question

How much of the ~600-token protocol block can the hook own, and can installing
neuron end up *cheaper* than not installing it?

## Context

This is the one ticket in the band that can make a **net-negative footprint**
claim true rather than merely measured. Today it is false:

| | chars | ≈ tokens |
|---|---|---|
| `generateProtocolBlock({ fidelity: 'fallback' })` | 2,835 | ~709 |
| `generateProtocolBlock({ fidelity: 'deterministic' })` | 2,399 | ~600 |
| **Saved by installing the hook** | **436** | **~109** |

Ticket [14](../../neuron-2.2.0/issues/14-protocol-block-rewrite.md) built the
mechanism — one generator, two variants, fidelity resolved from ground truth
(`resolveHarnessFidelity` calls each adapter's `capability()` + `verify()`, so
a block only goes short when a hook is genuinely registered on disk). It used
that mechanism to drop step 1 (Recall) and renumber. **The mechanism is not the
constraint; what remains in steps 1–3 is.** Those are the write-side
instructions — `neuron exec` wrapping, failure-fix recording, session
conclusion — and they are resident in every session of every project that
installs neuron.

## The shape of the answer

ADR 0014's division is *hooks own read, the agent owns write*. That division is
what keeps ~600 tokens resident: an agent cannot be instructed to write by a
hook that only injects context. So the honest options are bounded:

1. **Compress** the block without changing the division — same instructions,
   fewer tokens. Cheap, small, and safe.
2. **Move a step to the hook.** The 2.2.0 map fogs *"should `neuron exec`'s
   pre-command lookup also become a hook?"* and notes it would mean reopening
   ADR 0014 rather than extending it. If step 1 (Command Execution) can be
   hook-driven, it leaves the block entirely.
3. **Accept the floor and say so.** If ~600 tokens is irreducible under ADR
   0014, then the resident cost is a disclosed constant, not a bug, and
   ticket `03` publishes it as one.

Option 3 is a legitimate resolution. Do not manufacture a saving that costs
correctness — a compressed instruction the agent stops following is a far worse
outcome than 600 honest tokens, and nothing in this repo enforces the protocol
beyond the agent's own diligence (ticket 14 removed the "MANDATORY" framing for
exactly that reason).

## Scope

1. Take `08`'s per-category redundancy findings as input: text the hook
   reliably re-injects at the point of use is the first candidate to leave the
   resident block, and that is a measured question, not a guess.
2. Produce the net resident delta for each option — `fallback` block versus
   `deterministic` block versus proposed block — in chars, with the same
   published chars-per-token assumption `07` uses.
3. Whichever option wins, the claim shipped in `03` and audited in `04` must be
   the *net* figure: resident saving minus injected cost, not the saving alone.
4. If option 2 is chosen, it reopens ADR 0014 — that is a `/grilling` and an
   ADR, not an edit.

## Verification

- Any block change round-trips through `upsertProtocolBlock`'s marker pair and
  respects the existing `--overwrite-hooks` / `--keep-hooks` posture.
- Both variants still generate from `neuron.yaml` live, so the block cannot
  drift from config (ticket 14's own guarantee).
- Net delta reported, not gross saving.
- Test isolation per ticket 42.

## Deliverables

- [ ] Net resident delta measured for each considered option
- [ ] A ruling: compress, move a step, or disclose the floor
- [ ] ADR 0014 reopened via grilling if a step moves to the hook
- [ ] The net figure handed to `03` for disclosure and `04` for audit
