Type: task
Status: resolved
Blocked by: 17
Band: context cost

# 18 — Re-run Counterfactual A/B After Supersession

## Question

Does [17](17-implement-memory-supersession.md)'s implementation actually fix
the regression [10](10-counterfactual-token-ab.md) measured — the memory
arm's higher failure rate, both misses caused by a superseded entry
outcompeting the one that reverses it?

## Context

Ticket 10 found the memory arm failing *more* than the no-memory control
(33% vs 17%), entirely on two tasks — `prune-default-collision` and
`pruning-ab-verdict` — both driven by the same root cause: a superseded
`.neuron/decisions.md` entry outranking its own reversal. Ticket 16's design
(ADR 0015) and ticket 17's build exist only to fix that cause. Nothing in
this map has actually confirmed the fix works until the same harness is
re-run and the same two tasks are re-measured.

This is deliberately its own ticket, not folded into 17's Deliverables:
build-complete and behaviourally-fixed are different claims, and letting the
build ticket also grade its own outcome invites exactly the kind of
unchecked self-assessment ticket 10's own methodology section
(`findings.md`, "Methodological caveat") warned future reuse of this harness
against.

## Scope

1. **Re-run ticket 10's harness** (`benchmarks/token-ab/run.mjs`) against
   this repo's store, now carrying 17's schema and the two hand-marked
   pairs. Full 4-task rerun preferred; at minimum, the
   `prune-default-collision` and `pruning-ab-verdict` task subset that
   actually regressed.
2. **Compare against ticket 10's baseline numbers directly** (33% memory-arm
   failure rate, both misses on these two tasks) rather than re-deriving a
   fresh pass/fail bar.
3. **If the failure rate does not drop to match or beat the control arm**,
   this is not a smaller finding to round off — it means ticket 17's
   implementation didn't close the gap ADR 0015 designed for, and the
   ticket should report that plainly and reopen against 17 rather than
   pass.
4. **Feed the result into `03`/`04`.** Ticket 10's own findings.md states
   this correction is owed to ticket 03's disclosure and ticket 04's
   claim-versus-behaviour audit "as-is, not rounded toward 'no effect.'"
   The same standard applies here: report the re-measured number, not a
   qualitative "seems better."

## Verification

The two previously-failing repeats (`prune-default-collision` repeat 0,
`pruning-ab-verdict` repeat 0) are the direct regression tests — confirm
both now resolve correctly, not just that the aggregate rate improved.

## Deliverables

- [x] Re-run results (full or task-subset) recorded alongside ticket 10's
      original findings, same location convention
      (`benchmarks/token-ab/results/`)
- [x] Explicit comparison against ticket 10's 33%/17% baseline
- [x] Updated finding fed into [03](03-compatibility-disclosure.md) and
      [04](04-cut-and-publish.md)
- [x] If the regression is not fixed: ticket reopened against
      [17](17-implement-memory-supersession.md), not silently absorbed
      — N/A, the regression is fixed

## Answer

**Confirmed: ticket 17's supersession fix resolves ticket 10's regression.**
Full findings at
`benchmarks/token-ab/results/18-rerun-counterfactual-ab-post-supersession/findings.md`.

Ran a deliberate 2-task subset — `prune-default-collision` and
`pruning-ab-verdict`, the two tasks that actually regressed in ticket 10 (the
other two were 3/3 on both arms and mechanically unaffected by supersession)
— live against Claude Sonnet 5, 2 arms x 3 repeats = 12 sessions, $1.11,
built from HEAD `44bcc2b` (ticket 17's implementation, including the two
hand-fixed `.neuron/decisions.md` supersession pairs, which had to be
committed first — see Comments). Result: memory-arm failure rate on these
two tasks dropped from ticket 10's **67%** (4/6, recomputed from ticket 10's
own per-task table) to **0%** (0/6) — not just an improvement but a clean
beat of the control arm's unchanged 33% (2/6), the exact bar this ticket's
Scope item 3 set. Both named regression repeats (`prune-default-collision`
r0, `pruning-ab-verdict` r0) individually resolve correctly, matching this
ticket's own Verification section, not just the aggregate.

One grading-heuristic gap was found and fixed mid-resolution: the initial
grade on `prune-default-collision-memory-r0` was a false FAIL — the answer
correctly said "Verdict: Intentional / not a bug," but `tasks.mjs`'s
negation heuristic missed "not *a* bug" (intervening article) and "rather
than a bug" (contrastive negation, not in the negator list at all). Fixed
both patterns in `isNegatedAt`, then re-graded all 12 captured answers
offline from stored `answerText` at zero additional spend — the same
offline-re-grade move ticket 10 made for its own negation bug. Exactly one
session flipped; the two genuine control-arm failures were unaffected.

Two things disclosed rather than smoothed over in the findings: (1) two
earlier attempts at this run were killed by hitting a 2-minute foreground
command timeout before `results.json` could be written (an operator
mistake, not a harness defect) — real, unrecovered API spend on those
aborted attempts (~$2.10 combined, from console-log token counts) plus this
run's $1.11 brings total session spend to ~$3.21 against ticket 10's $20
approved budget ($14.80 headroom going in); (2) this is a 2-task subset
(N=2 vs ticket 10's N=4), a deliberate scope call to bound both cost and the
OAuth-token-expiry risk of a long run, not a silent narrowing — `04` should
decide if the full N=4 frame needs re-confirming before the cut.

Fed forward: added pointer comments to ticket 10 (superseded by this
result), ticket 15 (must publish this corrected finding, not ticket 10's
original unfavorable one), and tickets 03/04 (this Deliverable's literal
ask, even though neither ticket's current Scope references token-cost
claims directly). Unblocks `04`.

## Comments

(none yet)
