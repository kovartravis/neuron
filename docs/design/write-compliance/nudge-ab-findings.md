# Write-side compliance nudge A/B findings — Tickets 4 & 5, Map — neuron 2.4.3

**Date:** 2026-08-16
**Tickets:** 4 — Build & Run the Write-Side Compliance Nudge A/B (easy mode)
and 5 — Harder Write-Compliance Follow-Up A/B (hard mode), both children of
Map — neuron 2.4.3. Ticket 4 resolved the design ticket 1 (Write-Side
Compliance Nudge & Instrumentation) laid out; ticket 5 retested it after
ticket 4's own result turned out to be a ceiling effect.
**Harness:** `benchmarks/write-compliance-ab/` — `run.mjs` (easy mode,
ticket 4) and `run-hard.mjs` (hard mode, ticket 5) share `session.mjs`,
`grading.mjs`, and the three-arm design; `fixtures.mjs`/`tasks.mjs` vs.
`tasksHard.mjs` differ per suite. Raw results:
`benchmarks/write-compliance-ab/results/4-write-compliance-nudge-ab/full/results.json`
(24 sessions) and `results/5-harder-write-compliance-ab/full/results.json`
(30 sessions). The n=1 easy-mode pilot smoke test is not preserved — see
ticket 4's own Comments for how it was lost to an unrelated path collision
with ticket 5's own calibration pilot, and why that doesn't affect either
verdict below (neither pilot was ever load-bearing).

---

## Overall TL;DR

**Ticket 4's no-go does not survive a fairer test — this reverses to a clear
go.** Under conditions maximally favorable to `control` (Part 1), all three
arms hit 100% compliance and the run had no power to distinguish them. Under
a harder, more realistic condition (Part 2 — full real CLAUDE.md content,
competing legitimate work, more turns between the fix and session end),
`control` collapsed to **20%** while `nudge` and `explicit-instruction` both
held **100%** — an 80-point margin, on a $1.56 run. **Recommendation: build
the trigger mechanism** (routes to a new ticket deciding hand-wired
dogfood-only `Stop` hook vs. full `LifecyclePoint` extension, per ticket 1's
own routing) rather than trust the easy-mode result. See Part 2's own
Recommendation for the one open design question that decision inherits.

## Part 1 — Ticket 4 (easy mode): a ceiling effect, not a real no-signal result

**No-go, with a real caveat.** All three arms — `control` (passive CLAUDE.md
§1 protocol text only), `nudge` (simulated session-end reminder), and
`explicit-instruction` (system prompt states the requirement directly) — hit
**100% compliance (24/24 sessions called a real `neuron memory add`)** and
**100% task-solve rate (24/24 fixed the bug)**. There is no margin to read:
control already saturates, so this run cannot distinguish the arms. Per
ticket 1's own decision rule ("no-go if all three land close together"),
identical numbers across all three arms is the cleanest possible no-go.

**But this is a ceiling effect, not proof the real-world write-compliance
gap doesn't exist.** The harness's own construction makes control's task
maximally easy: the §1 protocol text is the *only* content in the system
prompt beyond the bare working-directory boilerplate, the fixture is a
single tiny file with one obvious bug, and the session is short (4-13
turns). A real session has CLAUDE.md's full protocol block competing with
everything else in context, spans much longer and more varied work, and the
failure-fix moment can be many turns removed from wherever the model's
attention actually is when the session ends. None of that competition or
distance is modeled here. Read this result as "the passive prose works when
it's the only thing being asked of the model," not "the passive prose works
in general."

### Setup

- **Model:** Claude Sonnet 5, manual tool-use loop (bash + `finish_task`),
  `effort=low`.
- **Tasks (2):** `average-off-by-one`, `titlecase-first-word-only` — each a
  single buggy Node file + one failing `node test.mjs`, dependency-free (see
  `tasks.mjs`'s header for why these replace the ticket's originally-named
  `swebench-fixtures.mjs` scenarios: those are diagnose-and-describe
  questions where no command ever actually fails and gets fixed, so §1's
  trigger condition never fires).
- **Repeats:** k=4 per task per arm → 24 sessions total.
- **Fixture:** each session gets a real, working `neuron` CLI on its `PATH`
  (a wrapper shelling to this repo's own `dist/cli.js`) and a minimal
  `neuron.yaml` declaring the `learning` category — so a `neuron memory add`
  call in the transcript is a real invocation against a real store, not
  simulated.
- **Grading:** `grading.mjs`'s `sessionCalledMemoryAdd` — anchored,
  quote-aware regex over every bash command the session actually ran
  (mirrors `src/harnesses/hintFollowLog.ts`'s `recordToolUse`). No LLM
  judge anywhere.
- **Cost:** $0.9106 total for the 24-session run (~$0.038/session average),
  well under the $3 cap.

### Results

| arm | sessions | complied | task-solved | cost |
| --- | --- | --- | --- | --- |
| control | 8 | 8 (100%) | 8/8 | $0.2546 |
| nudge | 8 | 8 (100%) | 8/8 | $0.3542 |
| explicit-instruction | 8 | 8 (100%) | 8/8 | $0.3018 |

Margin over control: nudge = 0pts, explicit-instruction = 0pts.

All 8 `nudge`-arm sessions confirmed the interception actually fired
(`nudgeDelivered: true` in every row) — the mechanism worked as designed,
it just never changed the outcome because control already got there first.
`nudge` sessions ran a few turns longer on average (the reminder adds at
least one extra round-trip), which shows up as a real but small cost
premium ($0.044/session average vs. control's $0.032) for zero measured
compliance gain in this harness.

### Reading this result

The question ticket 1 posed was "does an active nudge change compliance
versus today's passive-prose-only behavior." The honest answer from this
run is: **not measurably, under conditions this favorable to control.**
That is a real, useful data point — it rules out "the passive prose is
obviously and severely broken" — but it does not clear the concern that
motivated this whole map (Ticket 1 — Write-Side Compliance Nudge &
Instrumentation's own framing: "the agent voluntarily using `neuron memory
add` when the CLAUDE.md protocol calls for it, not just when it happens to
remember to"). A model that reliably complies when the instruction is the
only thing in front of it says little about a 100-turn real session where
the same instruction is one paragraph among many, written hours of
model-context ago.

### Recommendation

**No-go on building a dedicated trigger mechanism (a `Stop` hook or
`LifecyclePoint` extension) on the strength of this evidence alone** — the
decision rule's bar wasn't met, and this run's own ceiling effect means it
never had the power to meet it either way. Two honest paths forward, for
the maintainer to choose between (this ticket does not choose one):

1. **Accept the no-go and close this thread** — treat passive prose as
   sufficient until real dogfood evidence (not a synthetic harness) says
   otherwise. Cheapest option; consistent with this map's own non-goal
   against building unmeasured mechanism.
2. **Re-run with a harder harness** before deciding — a longer, noisier
   session (more turns of unrelated work before the failure-fix moment,
   CLAUDE.md's full real content instead of just §1, multiple competing
   instructions) is a fairer test of the actual concern. This is real new
   design work (a second ticket), not a tweak to this run.

### Assets

- `benchmarks/write-compliance-ab/` — harness source.
- `benchmarks/write-compliance-ab/results/4-write-compliance-nudge-ab/full/results.json` — raw 24-session results.

## Part 2 — Ticket 5 (hard mode): the ceiling breaks, and the gap is real

**Go.** Under conditions built specifically to remove Part 1's ceiling
effect, `control` collapsed to **20% compliance (2/10)** while `nudge` and
`explicit-instruction` both held **100% (10/10)** — an **80-point margin**
for both treatments, task-solve rate 100% in every arm (the busywork steps
never tripped anyone up), for **$1.5616** total (under the $2 cap). This is
about as clean a "go" as ticket 1's decision rule can produce: a large,
consistent margin, not a borderline one.

### What changed from Part 1

Same three arms, same grading (`grading.mjs`, byte-for-byte reused), same
session-loop machinery (`session.mjs`, generalized to take configurable
`maxTurns`/`wallClockCapMs` rather than forked). Two things differ,
deliberately:

1. **System note is the full real CLAUDE.md Memory Store Protocol block**
   (`fixtures.mjs`'s `FULL_CLAUDE_MD_NOTE` — §1 Failure-Fix Recording, §2
   Session Conclusion, and Metadata flags, copied verbatim from the live
   file), not just the §1 excerpt. The failure-fix trigger now competes
   with real neighboring content — including §2, which is easy to
   half-satisfy (write a `history` pointer and call it done, skipping the
   `learning` "Fix for..." entry §1 actually asks for).
2. **Tasks are multi-step** (`tasksHard.mjs`): a real early failure-fix
   moment (same bug shapes as Part 1's `average`/`titleCase`), followed by
   genuine unrelated follow-on work — implement a new function against an
   already-written test, pass a lint-style check, add one `CHANGELOG.md`
   line — before `finish_task`. Every `control` session that failed to
   comply did so in exactly 3 turns: the model batches several tool calls
   per turn, so "more steps" didn't mean "more turns to forget in," it
   meant "more real content between the fix and the end of the transcript
   that isn't about recording it." That distance, not turn count, is what
   moved the number.

### Setup

- **Model:** Claude Sonnet 5, manual tool-use loop, `effort=low`,
  `maxTurns=30`, `wallClockCapMs=8min` (raised from Part 1's 15/4min for
  the longer multi-step sessions; observed max was 18 turns, well inside
  the cap).
- **Tasks (2):** `stats-multi-step` (fix `average`'s off-by-one, add
  `sum`, pass lint, write changelog), `text-multi-step` (fix `titleCase`'s
  first-word-only bug, add `wordCount`, pass lint, write changelog).
- **Repeats:** k=5 per task per arm → 30 sessions total, plan interleaved
  by repeat-round (not grouped by task/arm) so a cap cutoff would have left
  every arm with a close-to-equal sample — moot here since the run
  finished under cap with nothing skipped.
- **Fixture:** same real `neuron` CLI wrapper as Part 1, `neuron.yaml` now
  declares `learning`, `history`, and `decisions` (matching what §2
  actually references).
- **Cost:** $1.5616 total, $2 hard cap. `nudge` cost the most per session
  ($0.082/session avg) of the three arms — see the friction note below.

### Results

| arm | sessions | complied | task-solved | cost |
| --- | --- | --- | --- | --- |
| control | 10 | 2 (20%) | 10/10 | $0.2802 |
| nudge | 10 | 10 (100%) | 10/10 | $0.8215 |
| explicit-instruction | 10 | 10 (100%) | 10/10 | $0.4599 |

Margin over control: nudge = 80pts, explicit-instruction = 80pts. Balanced
across both tasks — `control` complied on exactly 1/5 `stats-multi-step`
and 1/5 `text-multi-step`, not a fluke concentrated in one scenario. The
two `control` sessions that did comply did so correctly and fully (both
the §1 `learning` "Fix for..." entry and the §2 `history`/`decisions`
entries, in the right shape) — genuine spontaneous compliance, not a
grading artifact.

### An unplanned finding: the write-time quality gate is real friction here

Nearly every `nudge`/`explicit-instruction` session's `neuron memory add`
attempt tripped Map — neuron 2.4.2's own duplicate/supersede-detection
gate — the agent's *own* `learning` entry (written first, per §1) reads as
near-duplicate to its own follow-up `decisions`/`history` entry (written
seconds later, per §2, describing the same fix) at cosine ≈0.77–0.96,
reranker score up to 7.3. Every session recovered — none gave up and left
the store empty — usually by writing a shorter/differently-worded second
entry that cleared the gate, sometimes by retrying `neuron memory add`
several times first. This is why `nudge` cost the most per session: 3 of
its 10 sessions ran 11-18 turns (vs. a typical 5) resolving these prompts.
This wasn't designed into the harness — it fell out of using the real gate
against the real CLI — and it's a genuine, unplanned data point: even a
compliant agent trying to follow §1 *and* §2 in the same session runs into
friction ticket 1's own framing didn't anticipate. Worth a note for
whichever ticket designs the trigger mechanism, not an action item here.

### Recommendation

**Build the trigger mechanism** — this reverses Part 1's no-go. Route to a
new ticket deciding hand-wired dogfood-only `Stop` hook vs. full
`LifecyclePoint` extension, per ticket 1's own routing for a "go" outcome.
That ticket should also decide between `nudge`'s design (a real `Stop` hook
— higher fidelity to what was tested here, but costs an extra turn even
when unneeded, and inherits the §1/§2 self-collision friction above) and
`explicit-instruction`'s (a system-prompt-level requirement — cheaper,
equally effective in this run, but has no real `LifecyclePoint` analog
today since it isn't tied to session end at all, so it's a weaker test of
what a real mechanism would need to be).

### Assets

- `benchmarks/write-compliance-ab/run-hard.mjs`, `tasksHard.mjs`,
  `fixtures.mjs`'s hard-mode additions — harness source.
- `benchmarks/write-compliance-ab/results/5-harder-write-compliance-ab/full/results.json` — raw 30-session results.
