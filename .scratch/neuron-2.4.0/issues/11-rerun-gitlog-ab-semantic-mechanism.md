Type: task
Status: claimed
Blocked by: 08
Band: context cost

# 11 — Re-run the Git-Log A/B Against the Real (Semantic) Mechanism

## Question

Now that [40](08-implement-git-log-index.md) builds the real, shippable
git-log index (semantic embedding match, per [39](../../neuron-2.3.0/issues/39-git-log-index-design.md)'s
rulings), does it actually reproduce or beat [14](../../neuron-2.3.0/issues/14-git-log-hook-vs-agent-log-ab.md)'s
original favorable result — or does the real mechanism land somewhere
between "no search" (the agent arm) and "oracle search" (`14`'s hand-picked,
hand-verified `gitLogQuery` terms)?

## Context

`14`'s live A/B (`gitlog` beat `agent` on every raw number: 0% vs 11%
failure, ~17.4k vs ~49.6k mean tokens) is real evidence for the *premise*
(hook-injected git-log search beats the agent invoking `git log` itself) —
but it was measured using `gitLogQuery` terms the maintainer hand-picked and
hand-verified to surface the right commit, not terms any automated
mechanism produces. `39`'s own grilling session found, empirically
(`benchmarks/token-ab/results/39-git-log-term-extraction-ab/compare.mjs`),
that no purely extractive method can reach that same hit rate: the gold
terms are internal code-symbol names (`DualStorageRouter`, `rollEpoch`)
that don't appear in the natural-language prompt at all, near-zero overlap
on all three of `14`'s own tasks. That finding is *why* `39` ruled semantic
embedding match over `git log --grep` — but the semantic mechanism itself
is new and has never been measured against real Claude sessions. `14`'s
numbers cannot be assumed to carry over.

## Scope

1. Reuse `14`'s task set, agent-arm harness, grading, and orchestration
   (`session.mjs`/`report.mjs`/`grading.mjs`/`fixtures.mjs`) verbatim, per
   the same reuse-before-building precedent `14` itself followed from `10`.
2. New arm: the real, shipped `40` mechanism — hook-injected semantic
   git-log search, fired for real (no hand-picked terms, no oracle) against
   each task's actual prompt text.
3. Report three points, not two: `agent` (control, from `14`), `14`'s
   original oracle-term `gitlog` arm (upper bound, not re-run — cite it),
   and this ticket's real semantic-arm numbers. The interesting number is
   how much of `14`'s oracle-ceiling win the real mechanism actually
   recovers, not just whether it beats `agent`.
4. Cover at least one task where `39`'s relevance gate (Scope item 6) is
   expected to reject and stay silent — confirm the harness's grading
   handles a "no injection fired" session correctly rather than scoring it
   as a crash or an automatic fail.
5. Same honesty-band discipline as `10`/`14`/`18`/`19`: report the real
   number, including if it's unfavorable relative to `14`'s oracle ceiling
   — that gap is expected and disclosing its size is the point of this
   ticket, not a failure of it.

## Verification

- Live run against real Claude Sonnet 5 sessions, same cost-cap discipline
  prior tickets in this band used (state an explicit budget before
  spending, per `10`'s Scope item 6 precedent).
- Findings published to `benchmarks/token-ab/results/43-.../findings.md`,
  same shape as `10`/`14`/`18`/`19`'s own.
- Explicit comparison against `14`'s original oracle numbers, not just a
  standalone verdict.

## Deliverables

- [ ] Live semantic-arm vs. agent-arm A/B run, real sessions
- [ ] `findings.md` reporting real-vs-oracle gap honestly
- [ ] Feeds forward to ticket 15's already-published token-economics report
      (a follow-up refresh, not this ticket's own scope) and to `04`'s
      claim-versus-behavior audit

## Comments

**2026-08-10, claimed, harness built, blocked on live-run credentials.**

Built the new arm per Scope items 1-2, reusing `14`'s harness verbatim:

- `benchmarks/token-ab/gitlog-semantic-search.mjs` — shells out to the real
  built CLI (`dist/cli.js hook claude-code pre-prompt`), sessionless, so
  `NeuronMemory.refreshGitLogIndex()`/`searchGitLog()` (`08`) run for real
  against a task's actual prompt text. Zero API spend — local git +
  local embedder only. `warmGitLogIndex()` pays the one-time ~200-commit
  backfill (~2.9s) once per shared `dbPath`, reused across every
  session/task/repeat that targets the same fixture HEAD.
- `benchmarks/token-ab/gitlog-gate-task.mjs` — Scope item 4's silence case.
- `benchmarks/token-ab/run-gitlog-ab-semantic.mjs` — orchestrator. Runs only
  the `semantic` arm live; cites `14`'s `agent` and oracle `gitlog` arms
  from their own `results.json` (Scope item 3) via two `summarize()` calls
  (`semantic` vs `agent`, `semantic` vs `oracle-gitlog`) rather than
  re-deriving them.

**Real finding while building Scope item 4's silence case**: a first draft
asked about "CSV export" from "the memory store" and the real gate fired
anyway — `cleanFtsQuery`'s gate is an OR across every non-stopword prefix
(`src/components/fts-query.ts`), so any single shared word against this
repo's own ~200-commit, self-referential corpus passes it. Ordinary
engineering vocabulary ("ticket", "memory", "store", "repository",
"documented") is already present somewhere in that history — three
independent test prompts using words like "ship"/"storage"/"documented"
all fired. Building a genuine silence case required computing the full
~2865-word corpus vocabulary and picking content words verified to be
neither a member of, nor a prefix match against, any token in it — not a
hand-picked "obviously irrelevant" guess. The shipped gate is
**substantially looser in practice than "topically relevant"** for a
self-referential engineering corpus — worth a line in this ticket's own
`findings.md` once the live run happens, and directly relevant to `17`'s
antagonistic-recall benchmark and the "confidently-wrong retrieval" fog
item.

`--dry-run` confirms the whole pipeline end to end for free: the three
reused tasks each get a real, non-empty semantic git-log note (~900-990
chars, real relevant commits); the new gate task gets genuine silence
(`gitLogFired=false`).

**Blocked**: the live run needs a real Anthropic API call per session (10
sessions: 3 tasks × 3 repeats + 1 gate check). No `ANTHROPIC_API_KEY` in
this environment; the `ant` CLI's OAuth profile access token had expired
(~30h) and refreshing/printing it hit a permission this session's auto-mode
classifier blocks (credential dump), with no interactive browser available
for `ant auth login` either. Asked the maintainer directly (same
funding/execution-blocker precedent as `05`'s own fog item) — chose to
leave this blocked rather than supply credentials or run it standalone this
session. Next session picking this up: refresh `ant auth` (or supply
`ANTHROPIC_API_KEY`) first, then `node
benchmarks/token-ab/run-gitlog-ab-semantic.mjs` for the real run (est.
$0.45-0.55, cap at $1.00 per `10`'s Scope item 6 precedent).
