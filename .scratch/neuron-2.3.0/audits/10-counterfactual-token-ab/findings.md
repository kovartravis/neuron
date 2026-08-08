# Ticket 10 — Counterfactual Token A/B: Findings

**Run:** 2026-08-07, Claude Sonnet 5, effort `low`, 4 tasks × 2 arms × 3 repeats
= 24 sessions (plus an 8-session pilot that caught two harness bugs before
the real numbers below — see Corrections). Total spend across pilot + full
run: **$5.20**, of $20 approved.

## Headline

**No measured token difference. The memory arm's failure rate was higher,
not lower, driven entirely by one task where a stale sub-narrative inside
neuron's own store outcompeted the corrective entry that supersedes it.**

| Arm | Sessions | Failed | Failure rate | Tokens mean | median | p95 | Cost |
|---|---|---|---|---|---|---|---|
| memory | 12 | 4 | 33% | 48,280 | 23,253 | 82,810 | $1.32 |
| control | 12 | 2 | 17% | 46,596 | 28,841 | 75,392 | $1.31 |

Token diff (control − memory): **−1,684** — smaller than the observed
run-to-run spread (91,890), so per this ticket's own Verification section
this is reported as **no measured difference**, not a win for either arm.

## Per-task pass rate

| Task | memory | control |
|---|---|---|
| prune-default-collision | 0/3 | 1/3 |
| qwen-05b-scoreboard | 3/3 | 3/3 |
| pruning-ab-verdict | 2/3 | 3/3 |
| write-side-capture-gap | 3/3 | 3/3 |

## Risk arm (Scope item 4)

Two repeats where the memory arm got it wrong and the control arm got it
right; **zero** repeats in the other direction (no case where memory passed
and control failed).

- **`prune-default-collision`, repeat 0.** All three memory-arm repeats
  called the importance/prune-threshold collision "a bug that should be
  fixed." The maintainer's actual ruling — recorded in the
  `pruning-defaults-intentional` memory entry — is the opposite: the
  collision is deliberate ("history should clear out by default unless
  something is explicitly marked important enough to survive"). One control
  repeat (r0) got the right answer anyway, **not from the memory store**,
  but by finding the same ruling independently documented in `CONTEXT.md`,
  `CHANGELOG.md`, and the packaged skill's `SKILL.md`. The other two control
  repeats got it wrong the same way the memory arm did.

  **Root cause, best guess:** `.neuron/decisions.md` is a long append-only
  narrative. Ticket 23's own entry uses "hazard" language before a later
  entry reverses that framing. The memory arm's system-prompt note points
  agents at `.neuron/` first; three-for-three, the agent read the
  hazard-flavored earlier framing and didn't surface (or trust over it) the
  later correction — the same failure shape this project's own
  "confidently-wrong retrieval" and "write-side capture gap" fog items
  already flagged as unformed problems. This run is a concrete instance of
  both, not just a theoretical risk.

- **`pruning-ab-verdict`, repeat 0.** The memory arm found ticket 24's own
  resolution text ("ticket 25 ships its config-schema and collision-fix
  scope only") and concluded ticket 25 shipped in scoped-down form. The
  actual, later state — recorded in a *separate* memory entry
  (`pruning-ab-verdict`) — is that the maintainer subsequently said to
  "push ticket 25 off entirely." Repeats 1 and 2 (both arms) found the
  correct, current answer. This is the same failure shape as above: an
  earlier decision record outranked by a later one that supersedes it,
  and nothing in the store or the pointer note flags the supersession.

## Tasks that showed no differentiation

`qwen-05b-scoreboard` and `write-side-capture-gap` passed 3/3 on both arms.
Both facts have one consistent telling in the store with no reversal to get
tangled in — consistent with the risk-arm cases above being about
*supersession*, not about memory content being absent or wrong per se.

## Corrections made during this run (disclosed for the record)

1. **Path-ambiguity bug** (caught in the first 8-session pilot, $1.07
   spent): the system prompt said "write to ANSWER.md in the repository
   root," which the model resolved as `/ANSWER.md` (filesystem root, read-
   only) rather than the fixture's working directory. Fixed by spelling out
   the absolute fixture path explicitly. Both arms were equally affected —
   not a confound between arms, just wasted spend, disclosed rather than
   hidden.
2. **Grading negation bug** (caught after the full run, before this write-up
   — no extra spend, re-graded offline from the already-captured
   `answerText`): the `prune-default-collision` check matched the bare
   word "intentional" without checking whether it was negated ("this is
   *not* intentional design"), so three answers that explicitly called the
   collision a bug were graded PASS. A second bug in the same fix pass
   over-corrected the `qwen-05b-scoreboard` check: `/\bwon\b/` matched
   "centroid cosine **won** 9/9 against the model" — the *correct* answer,
   phrased with the model as object — as if the model had won. Both are
   fixed in `tasks.mjs` (a `hasUnnegatedKeyword` helper, and restoring
   subject-scoping on the "won" check) and the fixes are verified against
   gold answers, the real collected answers, and adversarial wrong answers.
   **Caveat:** only the sessions that changed grade under each fix were
   manually re-read against their raw text; the other ~14 "unchanged"
   grades were not individually re-audited by hand. A reader who needs
   higher confidence than "the check passed and a sample of raw text was
   read" should spot-check `results.json`'s `answerText` fields directly —
   they're the primary record, not the `passed` boolean.

## Methodological caveat for whoever reuses this harness (ticket 14/15)

`prune-default-collision`'s correct answer turned out to be independently
documented in ordinary project docs (`CONTEXT.md`, `CHANGELOG.md`,
`SKILL.md`), not exclusively in the memory store — so it's a weaker test of
"does memory help" than intended: a well-documented repo can make the
control arm's job easy regardless of neuron. A next iteration should either
verify a task's answer is *not* independently duplicated in ordinary docs,
or treat "found via docs vs. found via memory" as a reported dimension
rather than an assumed constant.

## Bottom line for ticket 10

**Do not disclose a favorable token claim from this run.** Token cost showed
no measured difference, and on the two tasks where correctness diverged,
the memory arm was wrong more often than the no-memory control — both times
because a superseded entry in the store outcompeted the one that reverses
it. This is a small, likely underpowered sample (N=4, k=3) and should not be
read as "neuron makes agents worse" either — but it is real evidence against
the favorable-token narrative ticket 10 set out to test, and it points at a
specific, actionable defect (supersession isn't flagged in the store) rather
than a vague "the hook doesn't help." Feed this, not a rounded-up "no
measured difference, no risk" summary, to ticket 03's disclosure and ticket
04's claim-versus-behaviour audit.
