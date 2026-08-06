Type: task
Status: resolved
Blocked by: none
Band: context cost — gates the harness band

# 07 — Session Token Budget & Cost Telemetry

## Question

What does neuron's hook cost a session, as a number neuron can state and a
sceptic can check?

## Why this gates `01`/`02`

The objection that started this band (maintainer, 2026-08-04): *"no one wants
to plug in a hook that is going to consume their context."* Building two more
adapters before that is answered widens the surface rather than the value —
and ticket [03](03-compatibility-disclosure.md)'s entire job is truthful
disclosure, which now has a context-cost column it cannot fill.

## The finding this ticket exists to fix

`src/harnesses/payload.ts` has a per-**injection** budget and no
per-**session** budget:

| | chars | ≈ tokens |
|---|---|---|
| `SESSION_START_CHAR_BUDGET` | 6,000 | ~1,500 |
| `PRE_PROMPT_CHAR_BUDGET`, per turn | 1,500 | ~375 |
| Protocol block, `deterministic` (resident) | 2,399 | ~600 |
| Protocol block, `fallback` (resident) | 2,835 | ~709 |
| This project's live store | 328,005 | ~82,000 |

`filterUnseen` stops an entry being re-injected, so each entry is eligible
**once per ledger epoch** — a 40-turn session surfacing novel hits every turn
injects ~15,000 tokens, and `clearLedger` wipes the ledger on `context-reset`,
so **after every compaction the whole store becomes re-eligible.** The ceiling
is not 1,500 tokens; it is the store, repeatedly. Nothing in the current design
bounds it.

Note also that installing the hook currently **saves 436 chars (~109 tokens)**
of standing instructions (the `deterministic` block drops step 1) while
spending up to 1,500 at session start — so the resident-footprint argument is
net-negative today. Ticket [09](09-shrink-resident-footprint.md) owns that;
this ticket only has to measure it honestly.

## Scope

1. **A session-scoped ceiling** alongside the per-injection ones. Decide with
   `/grilling`: a hard cap that stops injecting once spent, a decay (later
   turns get smaller budgets), or a per-epoch cap that resets with the ledger.
   The interaction with `clearLedger` is the crux — a cap that resets on
   compaction re-opens exactly the hole this ticket found, and a cap that does
   *not* reset means a long session goes permanently silent after a
   compaction, which may be worse. Both directions are defensible; pick one on
   an argument and record it.
2. **Cost telemetry.** `neuron hook` records injected chars/entries per session
   alongside the existing ledger (same cache dir, same session key). Cheap,
   local, no network, and off the critical path — the hook must not get slower
   or fail a turn because accounting failed.
3. **Report it.** `neuron status` (or a dedicated subcommand) reports the
   distribution across recorded sessions: median, p95, max, and the per-turn
   rate. This is the number that goes in the README and in `03`'s disclosure.
4. **Chars, not tokens — and say so.** ADR 0014 §4 already rules that
   tokenising on the hook path spends per-turn latency approximating a limit
   one harness states in characters. Keep counting chars; publish the
   chars-per-token assumption used to convert, rather than burying a 4:1
   guess in a headline number.
5. **Truthful worst case.** The published claim must be the bound the design
   actually enforces after item 1, not the median. A median that omits the
   compaction-reset behaviour is the kind of optimistic claim `04`'s
   claim-versus-behaviour audit exists to catch.

## Verification

- The session ceiling holds across a simulated long session, including at
  least one `context-reset`.
- Recorded telemetry matches what was actually emitted, entry for entry.
- Hook latency is not measurably worse; a telemetry write failure does not
  fail the turn.
- Test isolation per ticket 42 — the real `.neuron` store must not be touched.

## Deliverables

- [x] Session-scoped budget with a recorded ruling on compaction-reset behaviour
- [x] Per-session cost telemetry written by the hook, off the critical path
- [x] A reporting surface with median / p95 / max / per-turn rate
- [x] Published chars-per-token assumption
- [x] Worst-case bound stated as what the design enforces

## Answer

Grilled via `/grilling` before writing code (six questions, one at a time).
The design:

**The budget is per-epoch, not per-session** (Q1). An epoch is the span
between session start (or the last compaction) and the next `context-reset`.
It bounds what neuron holds in the *live* context window, and resets when the
epoch rolls — because `context-reset` deletes everything neuron previously
injected (ADR 0014 §5), so re-injecting after one is recovery, not repetition.
Cumulative-over-session is deliberately *not* bounded; `neuron status` reports
it anyway (below), so the number exists and is disclosed even though nothing
caps it — the honest position given `03`'s disclosure surface needs both
figures.

**Hard stop on exhaustion** (Q2), not decay: the hook's stdin gives it only
`session_id` and `prompt` (`hook.ts` / every case in `hook.test.ts`), so there
is no signal to decay against — any curve would be a guess dressed as policy.
Consistent with `buildPayload`'s existing whole-entries-only grain.

**The architecture card's non-return is a new ticket, not this one's problem
to fix** (Q3): `context-reset` is execution-only by ADR 0014 §5, so once a
compaction fires the session-start card never comes back, while per-turn
memories do (the epoch reset makes them re-eligible). Filed as
[11](11-reinject-architecture-card-per-epoch.md). This ticket's budget
reserves room for it (the 6,000/12,000 split below) so the published number
survives that ticket landing — erring toward overstating cost, matching the
band's stated failure direction.

**Default 18,000 chars per epoch** (Q4): 6,000 reserved for the session-start
card + 8 worst-case full `pre-prompt` turns at 1,500 each. ~3% of a 200K
window. Configurable via `recall.epochCharBudget` in `neuron.yaml`
(`src/config/neuronYaml.ts`'s `RecallConfigSchema`). Sized to bind only in
pathological cases — a cap that binds routinely is invisible to the user (no
error, just quietly reduced recall), which is worse than an occasionally
generous budget.

**The ledger became session state** (Q5): `clearLedger`'s `fs.rmSync` is now
`rollEpoch` (`src/harnesses/ledger.ts`) — it archives the finished epoch's
`{ chars, turns }` into a `history` array, then resets `injectedIds`,
`charsSpent` and `turns`, and bumps an epoch counter. One file, one lifecycle;
budget state and dedupe state had identical scope, so they stopped being two
things. `loadEpochState` gives a single-read snapshot; `recordSessionStartInjection`
and `recordPrePromptTurn` are the two write paths (the latter always
increments `turns`, even on a silent turn, so the per-turn rate's denominator
stays honest).

**Published at 3 chars/token** (Q6), not the more common 4:1 — `payload.ts`'s
own "conservative" reading, and the failure direction this whole band prefers
is overstating neuron's own cost. 18,000 chars → ~6,000 tokens, ~3% of a 200K
window.

**Wiring** (`src/commands/hook.ts`): `session-start` clamps its cap to
`min(SESSION_START_CHAR_BUDGET, remainingEpochBudget(...))` (a no-op in the
common case, since a fresh epoch has the full budget) and records what it
spent. `pre-prompt` checks `remainingEpochBudget` first; if it's `<= 0` it
records a zero-cost turn and returns *without querying* (an efficiency win,
not just a formality — no embedding work happens once an epoch is spent).
Otherwise it clamps to `min(PRE_PROMPT_CHAR_BUDGET, remaining)` and records
the real injected length. No session id (can't happen on the two shipped
adapters, but defensive) degrades toward the old unclamped, unbudgeted
behaviour — repetition over silence, matching the existing dedupe posture.

**Reporting**: `neuron status` gained a `recallCost` section
(`src/commands/status.ts` → `summarizeRecallCost` in `ledger.ts`), which scans
every session ledger file for the project and reports `epochCharBudget`,
`charsPerTokenRatio`, `epochTokenBudgetApprox`, `sessionsObserved`,
`epochsObserved`, `medianCharsPerEpoch`, `p95CharsPerEpoch`,
`maxCharsPerEpoch`, and `meanCharsPerTurn` — computed from real recorded
sessions (each session's archived history plus its still-open epoch), not
derived from the budget alone.

**Verification**: 453/453 unit tests green (44 files), including a new CLI
test that measures a real turn's injected length, sets `epochCharBudget` to
exactly that spend, confirms a second turn querying a *different*,
never-before-seen entry is silently dropped (a genuine hard stop, not
ordinary dedupe), then confirms the identical query succeeds again right
after a `context-reset` — isolating the budget as the cause. Confirmed the
real `.neuron` store byte-identical before/after the full suite (ticket 42's
rule): the diff observed mid-session traced entirely to this session's own
legitimate `neuron memory add` calls, not test fixtures — grepped for
test-fixture strings (`"Repository Pattern"`, `"exponential backoff"`, etc.)
and found zero matches in the real store.

**Known limitation, not fixed here**: the worst case is per-epoch, so a
session with many compactions has no enforced *cumulative* ceiling — the
explicit trade from Q1. `neuron status` reports the cumulative total anyway
via `history`, so it's disclosed even though it isn't capped.
