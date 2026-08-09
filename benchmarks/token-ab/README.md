# `benchmarks/token-ab` — counterfactual A/B harnesses

Three harnesses that answer one question with real money and a deterministic
grader: **does neuron actually change what an agent spends, and does it change
what the agent gets right?**

Every harness runs the *same* agent (Claude Sonnet 5, a manual tool-use loop in
`session.mjs`) against the *same* task, twice — once with neuron present, once
without — and grades the answer with a keyword check, not an LLM judge. Nothing
here asks a model to score a model.

| harness | what it varies | entry point |
| --- | --- | --- |
| **SWE-bench A/B** | neuron's session-start injection, on real OSS repos at pinned pre-fix commits | `run-swebench-ab.mjs` |
| **Repo A/B** | `.neuron/` present vs. absent, dogfooding this repo | `run.mjs` |
| **git-log A/B** | neuron recall vs. reconstructing the same answer from `git log` | `run-gitlog-ab.mjs` |

## Prerequisites

1. **Node 20+** and this repo's dependencies installed (`npm install`).
2. **Anthropic credentials.** The SDK is constructed as bare `new Anthropic()`,
   so it picks up `ANTHROPIC_API_KEY` from the environment, or an OAuth profile
   from the `ant` CLI (`ant auth login`; check with `ant auth status`).
3. **Network access.** The SWE-bench harness shallow-fetches each instance's
   real repository at run time; nothing is vendored.
4. **Real money.** Every non-dry run bills your account. See Budget below.

## Quick start

```bash
# 1. Free. Validates fixtures, live-fetch, and grading end to end. No API calls.
npm run bench:swebench-ab:dry-run

# 2. Costs money. The headline A/B: injection vs. no-neuron.
npm run bench:swebench-ab -- --k=4 --effort=low --cap=2.0
```

The second command is exactly what produced the published result. It runs
2 tasks × 2 arms × 4 repeats = 16 sessions for roughly **$0.70** and about
15 minutes.

## The arms — read this before interpreting any number

The SWE-bench harness has three arms, and **which one you pick changes the
answer**, so it is a deliberate choice rather than a default:

| arm | models | fixture |
| --- | --- | --- |
| `control` | no neuron | no `.neuron/`, no system note |
| `injection` | **neuron as installed** — the shipped behaviour | store on disk, protocol pointer, **and** the entries rendered into the system prompt unconditionally |
| `memory` | neuron as files | store on disk + pointer only; the agent must *decide* to read it |

`injection` mirrors `src/harnesses/payload.ts` deliberately: the same
`- [category] content` line shape as `formatMemoryEntry`, the same
whole-entries-only packing as `buildPayload`, capped at the real
`SESSION_START_CHAR_BUDGET` of 6000 characters. That is what makes it a test of
the product rather than a test of the agent's curiosity.

`memory` measures something narrower and easily mistaken for the same thing:
whether an agent merely *told* a store exists chooses to open it. That is a
fact about the wording of the protocol note. Both are runnable:

```bash
npm run bench:swebench-ab -- --arms=injection,control   # the product's claim (default)
npm run bench:swebench-ab -- --arms=memory,control      # the discovery question
```

## Flags

| flag | default | meaning |
| --- | --- | --- |
| `--dry-run` | off | build fixtures and grade placeholders; no API calls, no spend |
| `--pilot` | off | control arm only — difficulty/latency probe before spending on both arms |
| `--k=N` | `2` | repeats per task per arm |
| `--effort=low\|medium\|high` | `low` | model reasoning effort |
| `--arms=a,b` | `injection,control` | which arms to run |
| `--cap=USD` | `5` | **hard** cost cap, enforced after every completed session |
| `--tasks=id1,id2` | all | run a subset |
| `--out=NAME` | `full` / `pilot` | results subdirectory name |

The cost cap is checked against cumulative spend after each session, not
estimated up front — when it trips, remaining sessions are **skipped and
reported**, never silently run.

## Where results land

```
benchmarks/token-ab/results/19-synthetic-fixture-counterfactual-ab/<out-name>/results.json
```

`results.json` holds every session's arm, turn count, full token breakdown,
cost, pass/fail with per-gate detail, and the complete `answerText` — so any
verdict can be re-graded offline at zero additional spend if the grader turns
out to be wrong. It has been, three times; keeping the raw text is why those
were recoverable.

**Dry runs write to a `-dry-run` suffixed directory** and can never overwrite a
paid run's artifact. This was a real bug that destroyed captured results twice
before it was fixed at the source — if you add a harness here, preserve that
property.

## Adding a task

Tasks live in `swebench-tasks.mjs`. Each needs:

- a **`prompt`** stripped to symptom level. Never paste the upstream issue text
  verbatim without reading it first — several SWE-bench issues name the fix
  location or the fix itself, which hands the control arm the answer and
  silently destroys the comparison.
- a **`memoryEntry`**: the fabricated "prior fix recorded" note, written in the
  shape `CLAUDE.md`'s Failure-Fix Recording protocol actually produces
  (symptom → root cause → exact resolution).
- a **`check(answerText)`** returning `{passed, detail}`, built from
  `grading.mjs`'s `normalizeForMatch` + `containsAny`. Verify it against a gold
  answer, a plausible wrong answer, **and a near-miss** before spending — a
  checker that only accepts the phrasing you happened to imagine will report
  false failures, which is the single most common way this harness has lied.
- **`sourceNotes`** recording what you verified at `baseCommit`, by fetching it
  — not inferred from the diff.

## Interpreting results honestly

- **Both arms must pass** for a token comparison to mean anything. A session
  that gives up early looks cheap. Pass/fail is a *validity filter* here, not
  the metric.
- **Check the per-task numbers, not just the pooled scorecard.** The scorecard's
  `no-measured-difference` line compares a pooled diff against a pooled spread
  across tasks with different baselines, so a large, cleanly-separated effect on
  one task can be washed out by another task's variance. It has done exactly
  that.
- **Know your power.** Measured run-to-run variation on these tasks ranges from
  CV 5% to CV 85%. At `k=4` this design resolves roughly a 50%+ effect; a 30%
  effect needs ~23 sessions per arm per task, and 20% needs ~51. Report the
  limit rather than implying precision you did not buy.
