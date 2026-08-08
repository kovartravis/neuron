Type: task
Status: resolved
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

- [x] Net resident delta measured for each considered option
- [x] A ruling: compress, move a step, or disclose the floor
- [x] ADR 0014 reopened via grilling if a step moves to the hook
- [x] The net figure handed to `03` for disclosure and `04` for audit

## Answer

**Ruling: compress (option 1) + disclose the floor (option 3). Option 2 not
pursued.**

**Measured baseline** (this repo's actual `neuron.yaml`, 3 categories, scan
enabled — slightly different from the ticket's illustrative 2-category
table, so the absolute numbers differ from the Context section but the shape
holds):

| | chars | ≈ tokens (÷4) |
|---|---|---|
| `generateProtocolBlock({ fidelity: 'deterministic' })` (before) | 2,323 | 581 |
| `generateProtocolBlock({ fidelity: 'fallback' })` (before) | 2,759 | 690 |

**Per-section breakdown of the deterministic block** found the compression
target: `### On the metadata flags` alone was 728 of 2,323 chars — 31% of
the whole block — written as discursive rationale (*why* `--tags` should be
omitted, *why* `--importance` defaults matter) rather than the rule an agent
executing the loop actually needs. `## 1. Command Execution` (237 chars) was
already terse and not worth touching.

**Compression applied** (`src/config/protocolBlock.ts`): rewrote
`metadataFlagsSection` as a 3-bullet reference list (728 → 415 chars),
tightened `failureFixStep`'s prose (456 → 393 chars) and `sessionEndStep`'s
prose including `scanRefreshSection` (690 → 542 chars for the non-metadata
portion). No instruction changed meaning, no step moved, and the ADR 0014
read/write division is untouched — same content, fewer words.

**Net result**:

| | chars | ≈ tokens |
|---|---|---|
| deterministic (after) | 1,832 | 458 |
| fallback (after) | 2,268 | 567 |
| **saved (both variants)** | **491** | **~123 (−21%)** |

The saving is identical in absolute chars across both variants because the
compressed sections (`Failure-Fix Recording`, `Session Conclusion`,
metadata flags) are shared by both — only `Recall` (fallback-only) and the
header were untouched.

**Option 2 (move Command Execution to a hook) was not pursued this
session.** `docs/adr/0014-recall-adapter-architecture.md` has no mention of
`neuron exec` or pre-command wrapping at all — it is scoped to *recall*
only, so treating exec-wrapping as hook-driven is a genuine scope
expansion of that ADR, not an extension. This matches the map's own
"Not yet specified" entry ("Should `neuron exec`'s pre-command lookup also
become a hook?"), which already flags this as a separable architecture
decision. Put to the maintainer directly this session: ruled to leave it in
fog rather than open a `/grilling` session under this ticket — the
compression alone delivers a clean, low-risk 21% reduction with no
architecture change, and reopening ADR 0014 is better scoped as its own
ticket if `01`/`02` (the two new adapters this map is building) ever make
the question concrete.

**Net-negative footprint claim, updated**: installing the hook still saves
436 chars (~109 tokens) per session over the fallback (deterministic minus
fallback delta is unchanged by the compression, since it was applied
identically to both variants) — this compression shrinks both floors by the
same amount rather than changing the relative saving from installing
neuron. The `~450-token deterministic / ~570-token fallback` floor under
ADR 0014's write-side instructions is the honest constant to hand to `03`
for disclosure and `04` for audit — not a bug, a stated cost of the
protocol's current instruction set.

**Verification**: `upsertProtocolBlock`'s marker-pair round-trip and
`--overwrite-hooks`/`--keep-hooks` posture are untouched (no change to
`upsertProtocolBlock` itself, only to the text `generateProtocolBlock`
produces). Both variants still generate from `neuron.yaml` live — no
hardcoded categories were introduced. `src/config/protocolBlock.test.ts`
updated for the new metadata-flags wording (2 assertions) and passes (15/15
tests); full `src/config/` suite passes (66/66). This repo's own
`CLAUDE.md` managed region was regenerated in place via the same generator
to keep it truthful about its own tool, per `neuron init`'s idempotent
marker-splice contract.
