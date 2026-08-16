# `benchmarks/write-compliance-ab` — write-side compliance nudge A/B

Two harnesses, easy and hard mode, answering the same question ticket 1
(Write-Side Compliance Nudge & Instrumentation) posed: does an active nudge
actually change whether an agent calls `neuron memory add` when CLAUDE.md's
Failure-Fix Recording protocol (§1) calls for it, versus today's
passive-prose-only behavior?

| harness | ticket | what it measures | entry point |
| --- | --- | --- | --- |
| **Easy mode** | 4 | §1 excerpt only, one file, one bug, short session — turned out to be a ceiling effect (100% in all 3 arms) | `run.mjs` |
| **Hard mode** | 5 | full real CLAUDE.md, multi-step session with real competing work — reversed the ceiling effect into a clean 80-point margin | `run-hard.mjs` |

Full writeup of both runs: `docs/design/write-compliance/nudge-ab-findings.md`.

Three arms, same model (Claude Sonnet 5, manual tool-use loop in
`session.mjs`, adapted from `benchmarks/token-ab/session.mjs`), both harnesses:

| arm | what it gets |
| --- | --- |
| `control` | the protocol text in the system prompt, nothing else — today's real behavior |
| `nudge` | `control` + a one-time reminder injected as a simulated session-end message, standing in for a real `Stop` hook (`LifecyclePoint` doesn't have one yet) |
| `explicit-instruction` | `control` + the system prompt stating directly that `neuron memory add` must be called before finishing |

**Easy mode** (`tasks.mjs`): each session gets a small, self-contained,
dependency-free Node fixture with one buggy source file and one failing test
— a genuine fail→pass loop, not a diagnose-and-describe question. See
`tasks.mjs`'s own header for why this isn't `token-ab/swebench-fixtures.mjs`
reused verbatim: those tasks never run a real failing command, so §1's
trigger condition never fires.

**Hard mode** (`tasksHard.mjs`): the fix is step 1 of a 4-step session —
steps 2-4 (add a new function against an existing test, pass a lint check,
write a changelog line) are genuine unrelated work that pushes real turns
and content between the fix and `finish_task`. System note is the full real
CLAUDE.md protocol block (`fixtures.mjs`'s `FULL_CLAUDE_MD_NOTE`), not just
the §1 excerpt.

Grading is entirely deterministic, no LLM judge:
- **Compliance** (`grading.mjs`): did the transcript contain a real,
  top-level `neuron memory add` bash invocation — anchored + quote-aware,
  same false-positive fixes as `src/harnesses/hintFollowLog.ts`'s
  `recordToolUse`.
- **Task-solved** (`fixtures.mjs`'s `testPasses`): re-runs the fixture's test
  file after the session; a validity filter (did the agent actually fix the
  bug), not the outcome measure.

## Prerequisites

1. **This repo built**: `npm run build` (the fixture's `.bin/neuron` wrapper
   shells out to this repo's own `dist/cli.js` directly — no `npm install`
   per fixture).
2. **Anthropic credentials** for any non-dry-run: `ANTHROPIC_API_KEY` in the
   environment, or an `ant` CLI OAuth profile (`ant auth status`).
3. **Real money** for any non-dry-run — see Budget below.

## Quick start

```bash
# Free. Validates fixtures, the neuron wrapper, and grading end to end.
node benchmarks/write-compliance-ab/run.mjs --dry-run
node benchmarks/write-compliance-ab/run-hard.mjs --dry-run

# Costs money. The real A/Bs.
node benchmarks/write-compliance-ab/run.mjs --k=4 --cap=3        # easy mode
node benchmarks/write-compliance-ab/run-hard.mjs --k=5 --cap=2   # hard mode
```

## Decision rule (from ticket 1)

**Go** (build the real trigger mechanism — a new ticket deciding hand-wired
dogfood-only `Stop` hook vs. full `LifecyclePoint` extension) if `nudge`
and/or `explicit-instruction` show a clear compliance-rate margin over
`control`. **No-go** if all three land close together. No fixed numeric bar
in advance — read the margin against the sample size in the printed
scorecard and `results.json`. Verdict: no-go on easy mode (ceiling effect),
go on hard mode (80-point margin) — see the findings doc for both.

## Budget

Concurrency defaults to 1 (not higher) so the `--cap` check between sessions
is exact, matching `token-ab`'s own precedent. Easy mode's `--k=4`, 2-task,
3-arm run is 24 sessions at roughly $0.04/session (well under its $3
default cap). Hard mode's `--k=5` run is 30 sessions; its longer,
full-CLAUDE.md sessions cost more (observed $1.56 total, ~$0.05/session
average but up to $0.25 for a session that hit the write-time
duplicate-detection gate and needed retries — see the findings doc's
"unplanned finding") — sized to fit its $2 default cap with room to spare.
Both scripts write results under a ticket-numbered subdirectory
(`results/4-write-compliance-nudge-ab/`, `results/5-harder-write-compliance-ab/`)
specifically so the two scripts can never collide on the same `--out` name
— they once did, and it destroyed ticket 4's own pilot data.

## Flags

Same flags on both `run.mjs` and `run-hard.mjs`:

```
--dry-run             No API calls, no spend. Validates the pipeline.
--k=<n>                Repeats per task per arm (default 4 easy / 3 hard)
--cap=<usd>             Hard cost cap, checked after every session (default 3 easy / 2 hard)
--effort=<level>       Model reasoning effort (default low)
--tasks=<id,id>         Restrict to specific task ids (see tasks.mjs / tasksHard.mjs)
--concurrency=<n>       Parallel sessions (default 1)
--out=<name>           Results subdirectory name (default "full")
```
