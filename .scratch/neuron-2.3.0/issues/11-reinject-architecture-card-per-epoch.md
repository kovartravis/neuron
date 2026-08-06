Type: task
Status: unclaimed
Blocked by: none
Band: context cost

# 11 — Re-Inject the Architecture Card on the First `pre-prompt` of Each Epoch

## Question

Should the most stable, highest-value payload neuron injects be the one
payload that never returns after a compaction?

## Context

Surfaced while resolving [07](07-session-token-budget-and-cost-telemetry.md).
`context-reset` is execution-only by ADR 0014 §5 — rolling the epoch is its
entire job, deliberately, so it works on harnesses whose compaction hook
ignores stdout. That means the `session-start` architecture card, injected
once at the beginning of a session, is **never re-injected**: after the first
compaction the agent has permanently lost it, while per-turn `pre-prompt`
memories *do* return, because rolling the epoch makes them re-eligible
(`filterUnseen` / `loadEpochState` in `src/harnesses/ledger.ts`). The
asymmetry runs backwards — the most durable, broadest-context payload is the
one that doesn't survive.

**`07` reserved room for this, it did not build it.** The default
`recall.epochCharBudget` (18,000 chars) is `6,000` (the card's
`SESSION_START_CHAR_BUDGET`) `+ 12,000` (8 worst-case `pre-prompt` turns) —
sized as though the card re-enters each epoch, so this ticket's fix doesn't
silently invalidate `07`'s published number.

## Scope

1. On the **first `pre-prompt` of a new epoch** (i.e. `loadEpochState(...).turns
   === 0` for the current epoch), also fetch and inject the architecture card
   — reusing `session-start`'s query (`config.scan?.category`, `limit: 3`) and
   `SESSION_START_CHAR_BUDGET`, capped by whatever's left in the epoch after
   accounting for the normal `pre-prompt` payload.
2. **Do not use `context-reset` for this.** `pre-prompt` stdout is already
   load-bearing on every harness this repo supports (Claude Code and Codex,
   confirmed identical in `10`'s research); `context-reset`'s stdout is not.
   Re-injecting from an unreliable hook would reintroduce exactly the gap this
   ticket exists to close.
3. **Decide whether the card injection and the per-turn injection share one
   `emit()` call or two.** The hook currently emits at most one
   `UserPromptSubmit` payload per turn; check whether the harnesses accept (or
   silently drop) a second `hookSpecificOutput` write, or whether the two need
   concatenating into one payload with two labelled sections.
4. **Budget accounting.** The card's chars must still come out of the same
   epoch pool `07` built (`recordPrePromptTurn` / `remainingEpochBudget`), not
   a separate allowance — a second uncounted budget would undo `07`'s bound.
5. **A cold epoch with no architecture card yet** (no `scan.enabled`, or a
   category with zero entries) must degrade to exactly today's `pre-prompt`
   behaviour — no attempted injection, no wasted budget, no error.

## Verification

- A session that compacts once still has the architecture card available on
  its very next turn, without a second `session-start` firing.
- The card's chars are visible in `07`'s telemetry (`summarizeRecallCost`) —
  confirm the reported `maxCharsPerEpoch` reflects the combined spend, not
  just the per-turn portion.
- A project with no architecture card (scan disabled) behaves identically to
  today, with no regression in `hook.test.ts`'s existing coverage.
- Test isolation per ticket 42.

## Deliverables

- [ ] Architecture card re-injected on the first `pre-prompt` of each epoch, via `pre-prompt` stdout only
- [ ] Card spend charged against the same epoch budget `07` built
- [ ] Cold-epoch / no-card case degrades to current behaviour exactly
- [ ] Telemetry from `07` reflects the combined spend
