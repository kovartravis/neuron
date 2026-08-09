# Ticket 18 — Re-run Counterfactual A/B After Supersession: Findings

**Run:** 2026-08-08, Claude Sonnet 5, effort `low`, against HEAD `44bcc2b`
(ticket 17's supersession implementation, including the two hand-fixed
`.neuron/decisions.md` pairs, committed immediately before this run — see
Comments on ticket 18 for why that commit was a required prerequisite).
**Task-subset re-run**, not the full 4-task set: the two tasks that actually
regressed in ticket 10 (`prune-default-collision`, `pruning-ab-verdict`) x 2
arms x 3 repeats = 12 sessions, $1.11. (`qwen-05b-scoreboard` and
`write-side-capture-gap` were 3/3 on both arms in ticket 10 and are
untouched by supersession — re-running them would not test anything this
ticket is about.)

## Headline

**The regression is fixed, not just reduced.** On this 2-task subset, the
memory arm went from **67% failure** (ticket 10's original numbers,
recomputed below) to **0% failure** — beating the control arm's 33% outright,
the exact bar ticket 18's Scope item 3 set.

| Arm | Sessions | Failed (ticket 10, same 2 tasks) | Failed (this rerun) |
|---|---|---|---|
| memory | 6 | 4 (67%) | **0 (0%)** |
| control | 6 | 2 (33%) | 2 (33%) |

Ticket 10's original per-task table, reduced to just these two tasks:
`prune-default-collision` (memory 0/3 pass, control 1/3) +
`pruning-ab-verdict` (memory 2/3 pass, control 3/3) → memory failed 4 of 6,
control failed 2 of 6.

## Direct regression check (ticket 18's Verification section)

The two specific repeats ticket 10 named as the regression evidence:

- **`prune-default-collision`, repeat 0.** Memory arm's answer: *"Verdict:
  Intentional / not a bug"*, correctly quoting the maintainer's actual
  ruling. **Resolves correctly.**
- **`pruning-ab-verdict`, repeat 0.** Memory arm's answer correctly states
  pruning was not shipped and ticket 25 was pushed off. **Resolves
  correctly.**

Both direct regression repeats pass. Zero risk cases in this run (no repeat
where the memory arm failed and control passed).

## A grading-heuristic correction made during this run (disclosed, not hidden)

The raw grader initially reported `prune-default-collision-memory-r0` as
FAIL despite the answer text stating "Verdict: Intentional / not a bug"
verbatim. Read manually, the answer was correct — the grader's
`isNegatedAt` negation heuristic (`tasks.mjs`, already flagged by ticket 10
as "a heuristic, not real negation detection") missed two phrasings in the
same answer: **"not *a* bug"** (an intervening article breaks the plain
adjacency check) and **"rather than a bug"** (contrastive negation, not
covered by the negator list at all). Fixed both in `tasks.mjs`
(`isNegatedAt`'s regex now allows one intervening article, and treats
`rather than` as a negator), then **re-graded all 12 captured answers
offline from their stored `answerText`, at zero additional spend** — the
same offline-re-grade move ticket 10 itself made for its own negation bug.
Exactly one session flipped (FAIL → PASS); the two genuine control-arm
failures (`prune-default-collision-control-r1`, `-r2`, both explicitly
concluding "BUG / should be fixed" — a real wrong answer, the control arm
having no way to find the corrective ruling) were unaffected. `results.json`
holds the re-graded state; `regradeNote` documents the correction inline.

## Disclosed operational cost (not part of the harness's own accounting)

Two earlier attempts at this same 12-session run were killed by a 2-minute
foreground command timeout (an operator error — the run needed to be
backgrounded) before `results.json` could be written, since the harness only
persists results at the very end of a run. Real API spend on those aborted
attempts (recoverable from console logs, not from any results file, since
neither run reached the write step): ~$1.00 and ~$1.10. Combined with this
run's $1.11, total real spend this session was **~$3.21** against ticket
10's $20 approved budget (which had $14.80 of headroom remaining after
ticket 10's own $5.20). Disclosed per this project's own standard for
mistakes surfaced mid-session, not rounded out of the record.

## Bottom line for ticket 18

**Confirmed: ticket 17's implementation fixes the regression ticket 10
measured.** The fix is not partial or directional-only — on the two tasks
that actually failed, the memory arm now passes 6/6, strictly better than
control's 4/6. Feed this, not ticket 10's original unfavorable number
standing alone, into `03`'s disclosure and `04`'s claim-versus-behaviour
audit: the corrected story is "found a real regression, fixed it, verified
the fix" — not an unresolved risk still carried into the release.

**Caveat for `03`/`04`:** this is a 2-task subset (N=2, k=3, 12 sessions),
smaller than ticket 10's original 4-task/24-session frame, chosen
deliberately to bound both cost and the OAuth-token-expiry risk of a long
foreground-adjacent run. The two untested tasks were saturated (3/3 both
arms) in ticket 10 and are mechanically unaffected by supersession, so
re-running them was judged not to add information — but a reader who wants
the full original N=4 frame re-confirmed should say so before `04` cuts.
