Type: task
Status: unclaimed
Blocked by: 10
Band: context cost

# 14 — Git-Log Recall: Hook-Injected Search vs Agent-Invoked `git log`

## Question

Does injecting git-log search results through neuron's hook outperform
letting the agent invoke `git log` itself — in tokens spent, task success,
and turns to completion?

## Context

Surfaced 2026-08-07 directly from ticket
[08](08-injection-redundancy-audit.md)'s finding: injected `history` entries
are ~100% redundant with `git log` at this repo's own commit-message
granularity (18/18 entries, 29/29 occurrences scoring >=0.70 embedding
similarity against something already in `git log`). The natural product move
is to stop paying to re-derive and re-inject that content by hand and instead
make `git log` itself a searchable resident source the hook can query
directly — but that's a real subsystem (an index, a refresh mechanism, a
decision about whether it replaces or supplements the `history` write step),
not a tweak, and it shouldn't be built before its central premise is tested:
is a hook-mediated git-log search actually *better* than what the agent
already does today, which is run `git log` (and `git grep`, `git blame`,
etc.) itself when it needs that context?

This ticket is the gate. It reuses [10](10-counterfactual-token-ab.md)'s
harness and methodology rather than building new orchestration — same
fixed-task-set-with-objective-completion-criteria design, same
token-and-failure-rate reporting, same "no LLM judge" discipline. The two
arms differ only in how git-history context reaches the agent: **Arm A**
queries `git log` (and friends) via ordinary tool calls when it decides it
needs history; **Arm B** gets a hook-injected git-log search result at the
relevant point (session-start and/or pre-prompt, mirroring the existing
recall hook's shape).

## Scope

1. **Reuse ticket 10's harness verbatim** — same tier system, same
   artifact/scorecard plumbing, same tasks-with-objective-completion-criteria
   discipline. This ticket is a second pillar behind that plumbing, not a new
   harness. If ticket 10 built something that isn't reusable for a second A/B,
   that is a defect in ticket 10, not a reason to build a parallel harness
   here.
2. **Task selection**: pick tasks from the existing set (or a documented,
   narrow addition) where prior git history plausibly changes the correct
   action — e.g. "why was X implemented this way" or "has this bug been fixed
   before" — not tasks where git history is irrelevant.
3. **Both arms identical but for the git-history channel.** Arm B's
   hook-injected search is a minimal prototype for measurement purposes
   only — enough to test the premise, not a shipped feature. Do not over-build
   it before the A/B answers whether it's worth shipping at all.
4. **Report exactly like ticket 10**: token distribution and failure rate per
   arm with spread (k > 1 repeats), the risk arm (tasks Arm B gets wrong that
   Arm A gets right), any per-arm advantage smaller than run-to-run spread
   reported as "no measured difference."
5. **A reasoned decision not to run this is a valid resolution**, same as
   ticket 10 — if ticket 10's own finding already answers this by extension,
   or if the cost isn't justified given what's already known, record that
   argument instead of running a second underpowered A/B.
6. **Cost and runtime budget up front, approved before starting** — same
   discipline as ticket 10 item 6. State how the sessions will actually be
   executed (see the map's Not-yet-specified item on harness execution
   mechanism and funding) and what it will cost, before spending anything.

## Verification

- Reuses ticket 10's harness rather than building new orchestration.
- k > 1 repeats per task per arm; spread reported, not just means.
- The risk arm reported explicitly.
- Budget stated and approved before execution.

## Deliverables

- [ ] Either a completed A/B, or a recorded argument for why it was not run
- [ ] Token distribution and failure rate per arm, with spread
- [ ] The risk arm reported
- [ ] A ruling on whether the git-log-index feature graduates from fog into
      an implementation ticket, folds into
      [09](09-shrink-resident-footprint.md)'s framing, or is ruled out of
      scope

## Comments

(none yet)
