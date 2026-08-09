Type: task
Status: claimed
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

**2026-08-09, session in progress (not yet a resolution):** Claimed. Live
execution needs `ant auth login` (a browser OAuth flow only the maintainer
can complete) — credentials in this environment are expired and the
maintainer confirmed at pickup they can't log in this session ("I can't do
this one right now, no login"). Same operational blocker ticket 10 hit on
its own first pickup; following that precedent, built and dry-run-validated
the harness rather than leaving the ticket untouched, so a future session
can go straight to a live pilot once credentials are available.

**Built, reusing ticket 10's harness per Scope item 1** — no new
orchestration duplicated:

- `report.mjs` (new): extracted `summarize`/`percentile`/`costUsd`/`PRICE`/
  `withConcurrency` out of `run.mjs` so a second pillar could reuse them
  instead of re-deriving them, generalized to take `{tasks, k, arms,
  treatmentArm, controlArm}` instead of hardcoding `['memory','control']`.
  `run.mjs` itself now imports from here — refactor only, verified
  byte-identical dry-run behavior before and after, and the full suite
  (578/578) still passes since nothing in `src/` touches this directory.
- `grading.mjs` (new): extracted `containsAll`/`containsAny`/
  `hasUnnegatedKeyword`/the negation heuristic out of `tasks.mjs`, so the
  new task set doesn't duplicate the same negation-detection logic ticket
  18's resolution already had to fix twice.
- `gitlog-search.mjs` (new): the "minimal prototype" hook-injection
  surface Scope item 3 asks for — generic `git log --grep` keyword search
  (OR-matched, top 6 commits by recency) formatted as an injected note,
  including an honest "may be incomplete, verify yourself" caveat rather
  than presenting it as authoritative.
- `gitlog-tasks.mjs` (new): 3 tasks, each grounded in a real fact
  recoverable ONLY from this repo's own git history (not `.neuron/`
  memory), each declaring the keyword terms its `gitlog` arm searches on:
  `isolation-gap-fixed-twice` (has a recurring bug class been fixed more
  than once — yes, ticket 42 then ticket 23), `reconcile-data-loss-fix`
  (what did ticket 06 find and fix in `DualStorageRouter`'s reconcile
  path), `session-budget-granularity` (is the recall hook's char budget
  per-session or per-epoch, and what's the default). Every task's grading
  verified against both a gold answer (passes) and a plausible wrong
  answer (correctly fails) before wiring the orchestrator, same discipline
  ticket 10 used.
- `run-gitlog-ab.mjs` (new): orchestrator. Both arms reuse
  `fixtures.mjs`'s existing `'control'` shape verbatim (clean worktree,
  `.neuron/` removed, full git history present on both) — the `gitlog` arm
  then layers `gitlog-search.mjs`'s injected note on top via the same
  `fixture.systemNote` mechanism ticket 10's memory arm used, so
  `session.mjs` needed zero changes.

**A real search-quality risk found while tuning query terms, worth
recording:** an early draft of the `reconcile-data-loss-fix` query
surfaced a decoy — commit `7be60c2e` ("...the two entries this session
added while resolving ticket 14...") — which is a **different** ticket 14,
from `neuron-2.2.0`'s map (Protocol Block Rewrite), not this one. Ticket
numbers are not unique across this repo's own concurrent wayfinder maps,
so a naive keyword/number search can return a same-numbered-but-wrong
ticket with high apparent relevance. Not fixed in the search itself
(`gitlog-search.mjs` stays generic, per Scope item 3's "do not over-build"
instruction) — instead the affected task's query terms were retuned to
class/behavior-specific keywords (`DualStorageRouter`, `reseed`, `strict
mirror`) that don't collide, and the injected note's own "may be
incomplete — verify yourself" caveat is the honest disclosure of this
failure mode for terms that do collide. Whoever eventually reads the live
run's risk-arm cases should check whether any failure traces back to a
cross-map ticket-number collision like this one, since it's a distinct
failure mode from ordinary keyword noise.

**Budget, stated but not yet approved-and-spent:** matching ticket 10's
shape (Sonnet 5 intro pricing, `effort: low`), 3 tasks × 2 arms × k=3
repeats = 18 sessions, well under ticket 10's own 24-session/$5.20 actual —
expect low-single-digit dollars. Not run. **Not resolving this ticket
yet** — Deliverable 1 ("either a completed A/B, or a recorded argument for
why it was not run") isn't satisfied by a built-but-unrun harness, same
distinction ticket 10's own first-pickup comment drew. Whoever picks this
back up: `node benchmarks/token-ab/run-gitlog-ab.mjs --k=1` as a cheap
pilot first, per ticket 10's own precedent, before spending the full
budget.
