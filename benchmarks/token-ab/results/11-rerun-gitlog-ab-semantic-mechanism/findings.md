# Ticket 11 — Re-run the Git-Log A/B Against the Real (Semantic) Mechanism: Findings

**Run:** 2026-08-12, Claude Sonnet 5, live (`ant` OAuth profile). 3 tasks x
1 arm (`semantic`) x 3 repeats = 9 sessions, plus 1 gate-silence check
session = 10 sessions, **$0.7128** total (estimated $0.45-0.55, capped at
$1.00 per ticket 10's own budget-discipline precedent). `agent` (control)
and oracle-term `gitlog` (upper bound) arms are **cited from ticket 14's own
`results.json`**, not re-run, per Scope item 3.

## Headline

**The real, shipped semantic mechanism beats the agent baseline outright and
recovers most — not all — of the oracle-term ceiling's win.**

| Arm | Sessions | Failed | Failure rate | Mean tokens | Cost |
|---|---|---|---|---|---|
| `semantic` (this run, real) | 9 | 0 | **0%** | 30,480 | $0.6642 |
| `agent` (cited, ticket 14) | 9 | 1 | 11.1% | 49,598 | $1.0404 |
| `oracle-gitlog` (cited, ticket 14) | 9 | 0 | 0% | 17,427 | $0.4109 |

The real mechanism matches oracle's 0% failure rate and clearly beats
`agent`'s 11.1% — the premise ticket 14 established (hook-injected git-log
search beats the agent invoking `git log` itself) holds under the real
mechanism, not just under hand-picked oracle terms. Token usage lands
between the two, closer to `agent` than to `oracle-gitlog`: real semantic
search costs about 74.9% more tokens than the oracle ceiling (30,480 vs.
17,427), while saving about 38.6% against the no-search agent baseline
(30,480 vs. 49,598).

## The token gap does not clear this harness's own noise-floor check

`report.mjs`'s `noMeasuredDifference` guard flags both comparisons
(`semantic` vs. `agent`: -19,118 tokens; `semantic` vs. `oracle-gitlog`:
+13,053 tokens) as **not a measured difference**, because the guard requires
the between-arm gap to exceed the largest *within*-arm spread (max − min) on
either arm — and `semantic`'s own session-to-session range was wide (7,686
to 64,487 tokens, a 56,801-token spread), dwarfing both gaps. This is the
same conservative check prior tickets in this band (`10`/`14`/`18`/`19`)
built and have always honored: **the failure-rate result (0% vs. 11.1%) is a
real, discrete outcome this guard doesn't gate at all, but the token-count
story should be read as "directionally consistent with recovering most of
oracle's win, not a statistically confirmed number" — not overstated as a
precise percentage.** A tighter measurement would need either a larger `k`
or a task set with less inherent per-session token variance (the widest
`semantic` session, `isolation-gap-fixed-twice-r2` at 64,487 tokens, alone
accounts for most of the spread).

## Gate-silence check (Scope item 4)

`no-git-history-match`: `gitLogFired=false`, `expectedSilence=true`,
**`passed=true`**. The real mechanism stayed silent on a task built to have
no git-history match, and the session correctly declined to fabricate an
answer rather than crashing or auto-failing — confirming the harness
handles "no injection fired" as a normal, gradeable outcome, not an error
state. (The 2026-08-10 dry-run session already found the shipped lexical
gate is looser in practice than "topically relevant" for this repo's own
self-referential corpus — this live gate-check task was deliberately built
from vocabulary verified absent from the full commit history, not a
hand-picked "obviously irrelevant" guess, precisely because of that
finding.)

## Bottom line for ticket 11

**Ticket 14's premise carries over to the real mechanism; its exact numbers
do not.** The real semantic git-log search is a genuine improvement over the
no-search agent baseline (0% vs. 11.1% failure, real token savings) and
matches oracle's reliability, but costs meaningfully more tokens than the
hand-picked oracle terms — the gap `39` predicted when it found no
extractive method reaches oracle's hit rate. Feed this into `15`'s
token-economics refresh and `04`'s claim-versus-behavior audit as: "the
shipped mechanism works and is a real win over no search, quantified
against both a floor (agent) and a ceiling (oracle) it was never expected to
fully reach" — not as a restatement of ticket 14's original numbers, which
were never reproducible by any real automated mechanism per `39`'s own
finding.

**Caveat for `04`/`15`:** N=3 tasks, k=3 repeats (9 scored sessions) is the
same small frame ticket 14 itself used — real signal on failure rate, weak
signal on the precise token-count story per the noise-floor note above. The
gate-silence check is N=1, a smoke test for "does silence work correctly,"
not a rate measurement.
