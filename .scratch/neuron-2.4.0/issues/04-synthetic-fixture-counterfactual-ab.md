Type: task
Status: claimed
Band: context cost

# 04 — Run the Counterfactual A/B on Synthetic Repos with Synthetic Memory Sets

## Question

Should `benchmarks/token-ab/` run its tasks against fabricated repos with
fabricated memory stores, purpose-built so a task's answer lives *only* in
the memory store, instead of (or alongside) this repo dogfooding itself —
and if so, how are the synthetic repo and its memory set constructed?

## Context

Every task `10` and `18` have run so far is scored against this repo's own
real state — real source, real `.neuron/decisions.md`, real wayfinder
tickets. Two costs of that choice surfaced across those two tickets, not
just one theoretical one:

1. **The confound `10`'s own findings.md flagged.**
   `prune-default-collision`'s correct answer turned out to be independently
   documented in `CONTEXT.md`, `CHANGELOG.md`, and the packaged skill's
   `SKILL.md`, not exclusively in the memory store — one control-arm repeat
   got the right answer with `.neuron/` entirely absent, by finding the
   ruling in ordinary docs. That is a weaker test of "does memory help" than
   intended: a well-documented repo can make the control arm's job easy
   regardless of neuron. `10`'s own "Methodological caveat for whoever
   reuses this harness (ticket 14/15)" section named this directly and
   proposed the fix this ticket is now chartering.
2. **Real-repo dogfooding friction `18` hit mechanically, not just
   methodologically.** The fixture builder (`fixtures.mjs`) does
   `git worktree add --detach HEAD`, so a fix under test has to be committed
   to this repo's real `HEAD` before a live run can see it — `18` had to
   commit ticket 17's entire implementation as a prerequisite, entangling a
   benchmark re-run with this repo's own release-branch state. A synthetic
   fixture with its own throwaway git history would not have this
   dependency at all.

Both point the same direction: a task whose answer is planted *only* in a
constructed memory set, inside a constructed repo with no other source of
truth, is a cleaner instrument than continuing to dogfood this repo's real
state — at the cost of no longer measuring neuron's effect on an actual,
messy, real project, which is also a real thing worth measuring and not
free to give up.

## Scope

1. **Decide real-repo-replacement vs. real-repo-supplement.** Does this
   ticket's synthetic mode *replace* running against this repo (the
   confound above means every existing task's headline number is suspect),
   or does it *add* a second, cleaner arm alongside the existing real-repo
   run (the real-repo run still tells you something synthetic fixtures
   can't: does it hold up on an actual messy project)? `14` and `15` both
   currently assume the real-repo harness; this decision changes what they
   inherit.
2. **Design the synthetic repo.** Minimal but plausible: enough source
   files, commit history, and ordinary docs (a `README`/`CONTEXT.md`
   analogue) to make the control arm's job realistic, while deliberately
   *not* containing the answer to any task — the exact property this repo
   could not guarantee for itself.
3. **Design the synthetic memory set.** Fabricated `.neuron/decisions.md` /
   `history.md` / `learning.md` entries, written in the same shape real
   entries take (the append-only narrative style, including — deliberately
   — at least one superseded/reversed pair, so ticket 18's own regression
   shape stays covered rather than accidentally regressed out of the test
   corpus now that it's fixed).
4. **Re-derive or port the task set.** Either adapt `tasks.mjs`'s four tasks
   to synthetic equivalents, or write new ones; either way each task's
   answer must be verifiably absent from the synthetic repo's ordinary docs
   (the property Scope item 2 sets up), closing the exact gap `10` flagged.
5. **Parametrize for reuse**, matching `10`'s own Scope item 5 precedent
   (reuse before building) — `fixtures.mjs`'s `buildFixture` should grow a
   synthetic-vs-real mode rather than becoming a second harness, so `14` and
   `15` inherit whichever mode this ticket lands on without duplicating
   `run.mjs`/`session.mjs`.
6. **Cost and runtime budget up front**, per `10`'s own Scope item 6 —
   synthetic fixtures likely cost the same per-session (same model, same
   turn budget), so this is not a cheaper re-run, only a cleaner one.

## Verification

At least one task's synthetic answer confirmed absent from every file in
the synthetic repo's initial commit (grep the fixture, not just trust the
design intent) — the specific guarantee real-repo tasks couldn't make.

## Deliverables

- [ ] Scope item 1's decision recorded explicitly (replace vs. supplement)
- [ ] Synthetic repo + memory-set generator, checked into `benchmarks/token-ab/`
- [ ] Task set verified answer-absent-from-docs by construction
- [ ] `fixtures.mjs` parametrized (synthetic vs. real) rather than duplicated
- [ ] Cost/runtime estimate stated and approved before any live spend

## Comments

**2026-08-08, added at creation:** Requested directly by the maintainer
after `18`'s resolution, rather than graduated from existing map fog — no
prior "Not yet specified" entry covered this. Not wired as a blocker of
`14`, `15`, or `04`: whether this ticket's synthetic mode becomes a
prerequisite for those or a follow-on improvement is exactly Scope item 1's
question, deliberately left for this ticket to answer rather than decided
at creation time.

**2026-08-09, claimed and built, not resolved.** Grilled all six Scope
items via `/grilling` with the maintainer, then built and dry-run-validated
the harness. Hit the same credential wall tickets 10 and 14's first pickups
did (`ant auth status` shows the OAuth token expired ~25h ago, no browser
available to `ant auth login` again this session) — followed the same
precedent: build and dry-run-validate rather than leave the ticket idle.

**Decisions, one per Scope item:**

1. **Supplement, not replace.** The real-repo run (tickets 10/18) stays as
   the secondary "does it hold up on an actual messy project" check; this
   ticket's synthetic mode becomes the new *primary*, portable instrument
   tickets 14/15 build on going forward, specifically because it isn't
   entangled with this repo's own evolving state or docs.
2. **Pivoted from a hand-authored fake repo to real SWE-bench Lite
   instances**, at the maintainer's suggestion — a real OSS repo at a
   pinned pre-fix commit gets "answer structurally absent" for free (the
   fix hasn't been merged yet at that commit), plus realistic scale/docs/
   history no hand-built repo would match without real effort.
3. **We do not run the real SWE-bench harness** (no Docker, no hidden test
   execution) — only its repos/issues/gold-patches as raw material. Task
   shape shifted from "produce a working patch" to "diagnose and describe
   the fix," graded by the same deterministic `/ANSWER.md` keyword-check
   `grading.mjs` machinery tickets 10/14 already use — no LLM judge, per
   ticket 10's own Context section.
4. **Memory-arm payload is a fabricated "prior fix recorded" entry** under
   `.neuron/learning.md`, written in CLAUDE.md's own Failure-Fix Recording
   shape (symptom → root cause → exact resolution) — a direct test of
   whether having that record helps, not a proxy for it.
5. **Task prompts are stripped to symptom-level**, never the raw GitHub
   issue text verbatim — several candidate SWE-bench issues (e.g.
   `django-11179`, `django-11049`, `astropy-6938`) were rejected during
   selection specifically because their issue text already named the fix
   location or the fix content itself, which would have reproduced ticket
   10's own confound inside this new harness. The two selected instances
   (`astropy__astropy-12907`, `django__django-11133`) were chosen because
   their real issue text is symptom-only by inspection.
6. **Live-fetch, no vendored cache** — `swebench-fixtures.mjs` shallow-
   fetches each instance's real repo at its pinned `baseCommit` at run
   time via `git fetch --depth 1 origin <sha>` (GitHub's smart-HTTP server
   accepts a direct commit SHA for public repos), rather than checking in a
   frozen snapshot.
7. **Difficulty-calibration pilot before any full spend** — `--pilot` runs
   the control arm only (no memory) and reports each task's failure rate
   against a 15–40% target band (matching ticket 10's own observed
   17–33% control failure range); only once that's confirmed should the
   full A/B run.
8. **Budget: $5 hard cap** (not the originally-floated $15), given the
   maintainer's actual available spend. Scaled down to N=2 instances,
   k=2 repeats: pilot = 2×1×2 = 4 sessions, full A/B = 2×2×2 = 8 sessions,
   12 sessions worst case. `run-swebench-ab.mjs` enforces the cap in code
   (checked after every completed session, not just estimated up front) —
   remaining planned sessions are skipped, not silently overspent, the
   moment cumulative cost would exceed it. Sonnet 5 stays the driver model
   (ticket 10's own tradeoff call, not reopened here).

**Built:** `swebench-instances.mjs` (the two selected instances + why),
`swebench-tasks.mjs` (stripped prompts, deterministic `check()`s, fabricated
memory entries, `sourceNotes` documenting what was verified),
`swebench-fixtures.mjs` (live-fetch fixture builder, reusing `fixtures.mjs`'s
`MEMORY_NOTE` rather than duplicating it), `run-swebench-ab.mjs`
(orchestrator with `--pilot`/full modes and the hard cost cap — reuses
`session.mjs` verbatim and `report.mjs`'s `costUsd`/`summarize`/
`withConcurrency`, per Scope item 5's reuse-before-build intent even though
the fixture *source* mechanism is different enough from `fixtures.mjs`'s
local-worktree approach to warrant its own module, the same call ticket 14
made for its own orchestrator). `npm run bench:swebench-ab:pilot:dry-run`
and `npm run bench:swebench-ab:dry-run` both validated end to end,
including a real live fetch of astropy/django at the pinned commits (32/26
files respectively) — no network or fixture-plumbing issues found.

**Grading verified** against a gold answer (passes), a plausible wrong
answer (correctly fails on both tasks), and a plausible near-miss that
names the right function but the wrong specific defect (correctly fails on
both tasks).

**Verification refined from the ticket's original wording**: "grep every
file for the answer" produces false positives on common terms — a
repo-wide grep for `memoryview` across django returns 20+ files (it's a
common builtin used throughout an unrelated GIS/serialization surface), none
of which mention `HttpResponseBase.make_bytes` or the specific isinstance
fix. The actual guarantee is structural (the pinned `baseCommit` predates
the fix's real merge commit) plus a *targeted* check that the fix's own
specific vocabulary is absent from the *target file* — confirmed by hand for
both instances (`grep -n cright astropy/modeling/separable.py` shows the
buggy `= 1` line only; `grep -in memoryview django/http/response.py` returns
zero hits).

**Not run live.** `npm run bench:swebench-ab:pilot` is the next step for
whoever has working `ant`/`ANTHROPIC_API_KEY` credentials — confirm the
control failure rate lands in the 15–40% band per task before spending on
the full `npm run bench:swebench-ab` run. Deliverables 1–3 and 5 are
satisfied; deliverable 4 (`fixtures.mjs` itself parametrized) is satisfied
in spirit via shared `session.mjs`/`report.mjs`/`grading.mjs`/`MEMORY_NOTE`
reuse rather than literally, for the reason stated above. Staying claimed,
not resolved, until the pilot (and ideally the full A/B) actually runs.

**2026-08-09, pilot run live — found and fixed a grading bug, still not
calibrated, still not resolved.** `ant auth status` now showed a live OAuth
token (~8h remaining), clearing the credential wall the prior session hit.
Ran `npm run bench:swebench-ab:pilot` for real: 4 sessions, $0.14 total.
Scorecard reported **100% control-arm failure on both tasks** — both
"⚠ outside target range," reading as much too hard.

That reading was wrong. Inspecting the captured `answerText` for all 4
sessions found every one of them correctly identified the right function
and the right fix — `check()`'s deterministic keyword matching was the
thing failing, not the model. Root cause: these are prose answers that
markdown-wrap at ~80 chars, so a keyword phrase the checker looked for as a
plain substring — e.g. `'constant 1'` — was sometimes split across a
literal line break in the captured text (`"constant\n`1`."`) or separated
by backtick/bold emphasis markers, and a `.toLowerCase()`-only match can't
span either. Same class of bug ticket 18 already hit once (its own
negation-detection gap), different mechanism.

Fixed in `grading.mjs`: added `normalizeForMatch()` (strips backtick/
asterisk emphasis, collapses all whitespace including newlines to single
spaces), wired into `swebench-tasks.mjs`'s two `check()` functions, plus a
few added keyword variants for correct-but-differently-worded django
answers (`'handle memoryview'`, `'isinstance(value, memoryview)'`, etc).
**Deliberately does not strip underscores** — tried that first, and it
silently broke `mentionsFunction` for both tasks by turning `make_bytes`
into `makebytes` and `_cstack` into `cstack`-with-a-still-passing-regex-but-
wrong-reasoning; underscore is load-bearing in these tasks' own code
identifiers, not just markdown italics. Re-graded the same 4 captured
answers offline at zero additional spend (same move ticket 18 made for its
own grading fix) — all 4 now pass. Re-verified the corrected checker still
rejects a hand-written wrong answer and a hand-written near-miss for both
tasks (correctly fails all 4), so the fix isn't just loosened until
everything passes. `npm test` 580/580 unaffected (`grading.mjs` only gained
an export; no existing `check()` in `tasks.mjs`/`gitlog-tasks.mjs` changed).
Recorded as a `learning` entry per this repo's own protocol.

**Corrected pilot result: 0/4 failures (0%) — still outside the 15–40%
target band, now on the too-easy side, not too-hard.** This is a small
sample (k=2 per task) but consistent across both tasks and both repeats.
Did not proceed to the full A/B — the calibration gate still doesn't pass,
so per this ticket's own Scope item 6 posture (confirm difficulty before
spending on the full run), spending the remaining budget on 8 more
sessions isn't justified yet. Two live credible explanations, not yet
distinguished: (a) `astropy-12907`/`django-11133` themselves are too easy
for Claude Sonnet 5 at `effort: 'low'`, or (b) the "diagnose and describe"
task shape (Scope item 3's own decision, trading away "produce a working
patch") is inherently easier than the real SWE-bench harness this
difficulty band was calibrated against, regardless of instance. Distinguishing
those — and picking harder instances or reconsidering the task shape — needs
a maintainer call, not a unilateral one, since instance selection was
already a grilled decision (Scope item 5) with its own rejected-candidates
list. Staying claimed, not resolved. Budget spent so far: $0.14 of the $5
cap.

**2026-08-09, same session, continued at the maintainer's direction: swapped
in two harder instances, still 0/4 — the too-easy signal now looks
structural, not instance-specific.** Retired `astropy-12907-separability`/
`django-11133-memoryview` into a new `RETIRED_TASKS` export in
`swebench-tasks.mjs` (kept, not deleted, for provenance) and replaced the
default `TASKS` with two new instances picked from
`princeton-nlp/SWE-bench_Lite`'s own patch-size ranking (multi-hunk, an
algorithmic root cause rather than a single wrong-value line — the dataset
has no difficulty field to select on directly):
[`matplotlib__matplotlib-24265`](https://github.com/matplotlib/matplotlib/commit/e148998d9bed9d1b53a91587ad48f9bb43c7737f)
(a `KeyError` when indexing `plt.style.library` directly with a deprecated
seaborn style name, even though `plt.style.use()` accepts the same name —
the bug is an asymmetry between two code paths, not a single wrong line)
and [`django__django-11019`](https://github.com/django/django/commit/93e892bb645b16ebaf287beb5fe7f3ffe8d10408)
(spurious `MediaOrderConflictWarning` when combining 3+ Django form `Media`
objects — `Media.merge()` only ever merges two lists pairwise, so it loses
global ordering information across a chain of merges; the real fix
replaces it with a dependency graph + topological sort). Both verified by
fetching real `baseCommit` content directly from GitHub (not inferred from
the diff alone): confirmed each fix's own vocabulary (`_StyleLibrary`,
`topological`) is absent at `baseCommit`, and confirmed the specific
pre-fix behavior each task's prompt describes (e.g. `library = None` at
module scope, populated by `reload_library()` at import time; `use()`'s
old inline seaborn-alias list already present and already remapping at
`baseCommit`) actually holds, not just assumed from the patch. Wrote and
hand-verified new `check()` functions for both (gold/wrong/near-miss
answers, offline, zero spend, same discipline as the retired pair) before
spending anything live. `npm test` 580/580, dry-run validated end to end
(including a real live-fetch of both repos at their pinned commits).

**Mid-session mistake, caught and recovered:** running
`bench:swebench-ab:pilot:dry-run` against the new task pair to validate the
fixture wiring silently overwrote the SAME `results.json` path the
astropy/django pair's real live pilot had just written — the harness scopes
its output directory by `--pilot` vs full only, not by dry-run vs live or
by which task set is active. Caught immediately: reconstructed the
destroyed artifact byte-faithful on the parts that mattered (all 4
`answerText`s, exact turns/tokens/cost per session, the corrected
pass/fail verdicts) from the still-live background-task console log plus
what had already been printed to the working session, with an explicit
note on the one thing genuinely lost (the per-session token
input/output/cache breakdown and wall-clock time — the console log only
had totals). Archived at
`benchmarks/token-ab/results/19-synthetic-fixture-counterfactual-ab/pilot-retired-astropy-django/results.json`,
flagged `RECONSTRUCTED` in its own `note` field. Recorded as a `learning`
entry.

Ran the new pair's `--pilot` for real: **4/4 pass (0% failure) — same
too-easy result as the first pair**, $0.31 this run ($0.45 of the $5 cap
spent total across both pilots). One session (`django-11019...-r0`) hit a
real sandbox quirk along the way — the model tried `python` (this
environment only has `python3`), got `command not found`, and adjusted,
taking 10 turns and $0.145 instead of the usual ~4 turns/$0.05 — a realistic
agent-recovers-from-friction moment, not a harness bug, and it still passed
cleanly.

Two different instance pairs, chosen independently, both fully solved by
Claude Sonnet 5 at `effort: 'low'` with bash+grep access — 8/8 correct
diagnoses total. This weakens explanation (a) from the entry above
(instance selection) relative to explanation (b) (the "diagnose and
describe" task shape itself, Scope item 3's own decision trading away
"produce a working patch", may simply not be hard enough at this effort
level to produce a useful failure-rate signal on SWE-bench Lite-class
bugs). Did not attempt a third instance swap — the signal is now
consistent enough that another blind swap has low expected information
value, and the real fork (harder instances again vs. reconsidering the
task shape or the effort level) is a maintainer call, same reasoning as
the entry above. Staying claimed, not resolved.

**2026-08-09, same session, continued at the maintainer's direction: raised
effort to `'medium'` on the same pair — result is mixed, and exposed a
second, more structural grading gap, not a clean answer to the effort
question.** `effort` was hardcoded `'low'` in the shared `session.mjs`
(used by tickets 10/14/18 too); made it a parameter (default `'low'`,
so those other harnesses' behavior is unchanged) and added `--effort=`
to `run-swebench-ab.mjs`, surfaced in both the console header and the
written report. Backed up the low-effort pair's `results.json` first this
time (`pilot-low-effort-mpl-django11019/`), applying this session's own
earlier lesson about the harness's shared `OUT_DIR`.

Ran `--pilot --effort=medium` live on the same `matplotlib-24265`/
`django-11019` pair ($0.47 this run, $0.92 of the $5 cap spent in total
across all three pilots this session): **`django-11019` still 2/2 pass;
`matplotlib-24265` flipped to 2/2 fail** — a regression on the same
instance from the low-effort run. Reading both "failed" answers by hand
(archived in `pilot-medium-effort-mpl-django11019/`), **both are actually
correct and more thorough than the passing low-effort answers** — they
correctly name the `use()`/`fix_style()` vs. `library` asymmetry in detail.
They failed only the `identifiesFix` gate: medium effort's answers explain
the design flaw discursively ("the alias mapping should have been applied
uniformly," "factored into a shared helper") rather than stating a literal
code-shaped fix ("wrap library in a dict subclass") the way both the
low-effort and gold answers happened to. **Checked the task prompt itself:
it only asks "which mechanism is responsible... and what exactly is wrong
with it" — it never asks the model to propose a fix.** This is true of
every prompt in this file, including the retired astropy/django pair — the
`identifiesFix` gate has always been testing something the prompt doesn't
actually request, and it only passed historically because models tend to
volunteer fix-shaped phrasing anyway, in a style that happened to hit a
fixed keyword list. Effort level exposed that latent gap; it didn't create
it.

Did not patch `identifiesFix` a third time this session, or reopen the
django comparison (`10 turns` on both medium-effort sessions this time —
the model actually tried to `import django`/run the reproduction rather
than just reading source, hit `ModuleNotFoundError: No module named
'pytz'` in the sandboxed worktree, adjusted, and still passed — a second
real sandbox-friction instance, not a harness bug). Three live-spend
rounds in one session have now each surfaced a new judgment call
(a grading bug, a too-easy signal, and now a prompt/grading design gap);
consolidating and checking in beats a fourth unilateral patch. The real
open question is no longer just "which instances" or "which effort" but
whether `check()`'s fix-identification gate should be dropped (the
diagnosis-only gates already correctly separate correct from incorrect
answers — see the wrong/near-miss verification earlier in this file) or
the prompts should be changed to explicitly ask for a fix direction so the
gate has something real to test. Staying claimed, not resolved. Total
spend this session: $0.92 of the $5 cap.

**2026-08-09, same session, maintainer decision: rewrite the prompts, keep
the gate.** Rather than drop `identifiesFix` or leave the question open,
added an explicit `"...and how would you fix it?"` clause to all four task
prompts — both live (`matplotlib-24265-seaborn-alias`,
`django-11019-media-merge-order`) and retired
(`astropy-12907-separability`, `django-11133-memoryview`), for consistency
even though the retired pair isn't run by default. Previously every prompt
asked only "which function/mechanism is responsible... and what exactly is
wrong with it" and never requested a fix, so `identifiesFix` was grading
against an unstated expectation; this closes that gap at the source rather
than continuing to patch keyword lists chasing whatever phrasing style a
given effort level happens to produce. `check()` logic itself is
unchanged — only the prompt text. `npm test` 580/580.

**Not re-run live this session.** The medium-effort pilot's two "failed"
matplotlib answers were captured under the old prompt and won't
retroactively pass under the new one; confirming the new prompt actually
fixes the false-negative (and doesn't just shift the difficulty question
again) needs a fresh live pilot, which is the natural next pickup rather
than a fourth live-spend round in the same session. Total spend this
session: $0.92 of the $5 cap ($4.08 remaining). Staying claimed, not
resolved — next step is `npm run bench:swebench-ab:pilot -- --effort=medium`
(or `low`, maintainer's call) against the four now-updated prompts.

**2026-08-09, next session: re-ran the pilot under the rewritten prompts, then
measured the instances against the public SWE-bench leaderboard — the
calibration question is now answered, and the answer is that the task shape
cannot produce a failure signal.**

Ran `npm run bench:swebench-ab:pilot -- --effort=medium` live against the four
rewritten prompts ($0.58 this run, **$1.50 of the $5 cap** spent in total).
Archived the result to `pilot-medium-effort-newprompt-mpl-django11019/` before
anything else, per this ticket's own `OUT_DIR`-collision lesson.

**The prompt rewrite worked, and exposed a third false negative.**
`identifiesFix` is now `true` on both `matplotlib-24265` sessions — the exact
gate that produced last session's two false negatives, closed at the source as
intended. But `matplotlib-24265-...-r0` now fails a *different* gate,
`identifiesAsymmetry=false`, and reading the answer by hand it is the **best
answer this harness has produced**: it names the asymmetry outright ("This
translation logic is never applied when someone accesses `plt.style.library`
directly") and proposes the actual gold fix (a subclassed dict whose
`__getitem__` applies the translation). Root cause of the miss is measurable
to the character: `identifiesAsymmetry`'s regex allows 40 characters between
the negation and `library`, and this sentence has **41**
(`" applied when someone accesses plt.style."`). Three live rounds, three
grading false negatives, three different mechanisms (line-wrap, unstated fix
expectation, regex window). **Did not patch it a fourth time** — see below for
why that would be treating the symptom.

**Measured the instances against the public leaderboard.** Every SWE-bench
leaderboard submission publishes its resolved instance IDs at
`SWE-bench/experiments/evaluation/lite/<sub>/results/results.json`, so per-
instance solve rates are computable rather than guessable. Scripts and raw
output archived alongside this ticket's audits
(`solve-rates.mjs`, `never-solved.mjs`, `swebench-lite-solve-rates.txt`);
84 submissions, all 84 parsed.

| instance | public solve rate | this harness (control arm) |
| --- | --- | --- |
| `django__django-11133` (retired) | 90.5% (76/84) | 2/2 pass |
| `astropy__astropy-12907` (retired) | 52.4% (44/84) | 2/2 pass |
| `matplotlib__matplotlib-24265` (live) | **6.0%** (5/84) | 3/4 pass (1 false negative) |
| `django__django-11019` (live) | **0.0% (0/84)** | **4/4 pass** |

`django__django-11019` is one of **35 of the 300 SWE-bench Lite instances that
no leaderboard submission has ever resolved.** This harness solves it every
single time, at both `low` and `medium` effort.

**This resolves the fork the last three rounds were stuck on.** The maintainer's
second instance swap was not a failure of instance selection — it landed on the
6th-percentile and the 0th-percentile of the entire split. There is no harder
Lite instance available; the swap already reached the floor. So the 0% control
failure rate is explained entirely by **explanation (b)**: the
"diagnose and describe" shape (Scope item 3's own decision, trading away
"produce a working patch") is a fundamentally easier task than the one
SWE-bench's difficulty is calibrated against. SWE-bench scores a patch against
hidden `FAIL_TO_PASS` tests; this harness scores prose against a keyword list.
Those measure different things by roughly an order of magnitude, and no choice
of instance closes that gap.

**The deeper problem, which is this ticket's own Scope item 2 catching up
with it.** The pivot from a hand-authored synthetic repo to real SWE-bench
instances bought "answer structurally absent" for free — but only in the narrow
sense that the *fix commit* hasn't landed at `baseCommit`. It does not buy
"answer absent from the repo," because a SWE-bench bug is by construction
diagnosable **from the source that is present**; that is precisely the property
that makes the instances solvable at all. So the control arm doesn't need the
memory store, and can't be made to need it by picking a harder bug. The
original Scope-item-2/3 design (fabricated repo, fabricated decisions) had the
property this ticket actually needs — an answer that exists *nowhere* but the
memory store — and the SWE-bench pivot traded it away for realism without
that cost being visible until now. Contamination is a live secondary concern
(these repos and their fix commits are public and old), but it is not the
binding constraint: even an uncontaminated bug of this shape stays diagnosable
from source.

**Not resolved, and deliberately not patched further this session.** The open
decision is now a scoping one, not a tuning one, and it belongs to the
maintainer: whether ticket 19's instrument keeps the SWE-bench substrate
(and accepts that a *diagnosis* task has no headroom for memory to help), moves
to a task whose answer is genuinely repo-absent (project-specific decisions —
the thing neuron actually claims to store), or is ruled out of scope for 2.3.0
in favour of tickets 10/18's real-repo run. Budget remaining: $3.50 of $5.

**2026-08-09, same session, maintainer redirect — the outcome measure was
wrong, not just the instances.** The maintainer's call, verbatim in intent:
*"the whole goal of this A/B was to prove you can save on tokens by using
neuron, so the tests are testing the wrong thing. I want to test the token
usage with and without neuron."*

This retires the calibration gate that has blocked this ticket for four
rounds. Under a **token** outcome measure:

- **0% control failure is the desired state, not a blocker.** Both arms
  reaching a correct answer is what makes the token comparison
  apples-to-apples; a failed session's token count is meaningless (a session
  that gives up early looks artificially cheap). Pass/fail is demoted from
  *the metric* to a **validity filter**.
- **The 15-40% target band is deleted.** It was borrowed from ticket 10's
  observed control failure range, which was itself a pass/fail statistic.
  `run-swebench-ab.mjs`'s `--pilot` scorecard should stop printing
  "⚠ outside target range — reconsider this instance/prompt".
- **The SWE-bench substrate survives.** The previous entry's conclusion —
  that a SWE-bench bug is repo-derivable and so the control arm never needs
  the memory store — is fatal to a *pass/fail* A/B and largely irrelevant to
  a *token* A/B. What matters now is only whether the control arm spends
  tokens exploring that the memory arm can skip.
- **The never-solved finding keeps its value, inverted.** Hard instances are
  no longer needed for pass/fail headroom; they are needed because they are
  where exploration (and therefore savings) can exist at all.

**Variance is now the binding constraint, and it is bimodal — measured, not
assumed.** Recomputed per-condition from every archived pilot in this
ticket's audit directory:

| condition | n | mean tokens | CV |
| --- | --- | --- | --- |
| `astropy-12907` control, low | 2 | 14,111 | **1%** |
| `django-11133` control, low | 2 | 9,726 | **7%** |
| `matplotlib-24265` control, low | 2 | 22,705 | 4% |
| `matplotlib-24265` control, medium | 4 | 36,546 | **68%** |
| `django-11019` control, medium | 4 | 63,909 | **51%** |
| `django-11019` control, low | 2 | 32,245 | **85%** |

**The tasks with room to save are the noisy ones.** The retired easy pair is
a beautifully tight instrument (CV 1-7%) precisely because the model goes
almost straight to the answer in 3-4 turns — leaving nearly no exploration
for memory to eliminate (a floor effect). The hard pair explores for 5-13
turns and 22k-100k tokens, which is where a saving could exist, but at
CV 51-85%. Sessions required per arm per task, at 80% power / α=0.05, using
the pooled CV of 36%: **~9 for a 50% effect, ~23 for 30%, ~51 for 20%,
~202 for 10%.** A definitive small-effect answer is out of reach of the
remaining budget; a large effect is not.

**A design question this surfaced, not yet decided: discovery vs. injection.**
`MEMORY_NOTE` (inherited from `fixtures.mjs`, written for ticket 10's
real-repo tasks) instructs the agent to consult `.neuron/` *"before
answering a question about this project's past decisions, rationale, or
history."* These SWE-bench tasks ask it to diagnose a live bug — the trigger
condition does not match the task, so the memory arm may never open the
file. That makes the current harness a test of **neuron-as-files (agent must
discover)**, whereas neuron's actual shipped mechanism is **hook injection**,
which places the entry in context unconditionally and pays its token cost up
front. These are materially different experiments: the discovery variant can
show no effect because the agent never looked, which is a finding about the
protocol note rather than about token economics. Flagged for the maintainer;
not changed unilaterally.

**Live run in progress at time of writing:** full A/B (both arms),
`--k=4 --effort=low --cap=2.0`, 16 sessions, on the current
`matplotlib-24265`/`django-11019` pair — the first time the memory arm has
ever been executed live in this harness (`full/results.json` previously held
dry-run zeros only). Low effort chosen over medium purely on budget: ~$1
versus ~$2.4 for the same session count.

**2026-08-09, same session — maintainer redirect #2: "if we aren't testing hook
injection what's the point." Correct, and decisive. Built the injection arm and
ran the real experiment.**

The `memory` arm inherited from ticket 10 models neuron-as-FILES: `.neuron/`
on disk plus `MEMORY_NOTE` telling the agent a store exists. Any saving it
shows is partly a fact about whether the agent chose to look — a property of
`MEMORY_NOTE`'s wording, not of token economics. neuron ships as a **hook**
that injects retrieved entries unconditionally and pays for them up front.
That is the claim, so that is what had to be measured.

**Aborted the in-flight discovery run after 4 sessions** ($0.1551) rather than
finish spending on the wrong mechanism. Salvaged its data to
`partial-discovery-arm-low/results-partial.md` (no `results.json` was written;
transcribed from the live task log, same discipline as this ticket's earlier
reconstruction).

**Built `injection` as a third arm** in `swebench-fixtures.mjs` — store on disk
*and* protocol pointer *and* the entries rendered into the system prompt,
mirroring `src/harnesses/payload.ts`: `formatMemoryEntry`'s `- [category]
content` line shape, `buildPayload`'s whole-entries-only packing, and the real
`SESSION_START_CHAR_BUDGET` of 6000 (duplicated as a literal with the source
named, since payload.ts is TS and this harness runs under bare `node`).
Rendered payload: 1,903 chars. `memory` stays selectable via `--arms=` because
the discovery question is real and now has its own partial data.

**Also fixed the `OUT_DIR` destruction bug at the source** rather than working
around it a third time: dry runs now write to a `-dry-run` suffixed directory,
so a validation run can no longer overwrite a paid one. Added `--out=` for
explicit naming, and `arms`/`treatmentArm` to the written report.

**Result — `--k=4 --effort=low --arms=injection,control`, 16 sessions, $0.6854.
Full write-up in `findings.md`; raw data in `full-injection-low/results.json`.**

| task | arm | n | tokens (mean ± sd) | turns |
| --- | --- | --- | --- | --- |
| `matplotlib-24265` | injection | 4 | **6,933 ± 386** | 2,2,2,2 |
| `matplotlib-24265` | control | 4 | 26,076 ± 4,361 | 4,4,5,4 |
| `django-11019` | injection | 4 | **9,354 ± 4,202** | 4,2,2,2 |
| `django-11019` | control | 4 | 12,458 ± 1,504 | 4,4,3,4 |

- **Pooled: 19,267 → 8,144 tokens, a 57.7% reduction**; cost $0.4623 → $0.2232.
- **`matplotlib-24265`: 73.4% reduction, arms completely separated**
  (Mann-Whitney U = 0, exact two-sided p = 0.029; Welch t = 8.74). Every
  injection session took exactly 2 turns, sd 386 — cheaper *and* far more
  predictable.
- **`django-11019`: 24.9%, not significant** (t = 1.39, U = 4). Control was
  already cheap (12,458), leaving less exploration to eliminate.
- **16/16 passed in both arms** — the saving is not bought with worse answers,
  which is the one result that would have invalidated the comparison.
- Three-way on `matplotlib-24265`: control 26,076 → discovery 12,552 →
  injection 6,933. Discovery captures much of the benefit but its r0 spent 5
  turns / 25,160 tokens (essentially a control run) because the agent didn't
  consult the store early. Unconditional injection removes that failure mode.

**A reporting bug found, and it is load-bearing.** The scorecard printed
`no-measured-difference: true` on the run above. That verdict comes from
`report.mjs`'s `summarize`, which compares a pooled token diff against a pooled
spread across tasks with different baselines — so a completely-separated effect
on one task is washed out by another task's variance. **Ticket 10's headline
finding, "no measured token difference," was produced by this same statistic**
and should be re-examined against its raw `results.json` before it is cited
again — including by ticket 03's disclosure and ticket 04's claim-versus-
behaviour audit, which both consume it.

**Caveats stated plainly, not rounded away** (full list in `findings.md`): the
fixture injects the exactly-right entry among three, so this measures the value
of a *correct* recall, not neuron's average recall against a ~1,000-entry store
through a relevance gate — it is an upper bound. The cost side is understated:
1,903 chars injected once here versus the real hook's 6,000 at session start
plus 1,500 per turn, with the whole store re-eligible after every compaction.
And at n=4 this design detects a ~50%+ effect only — `django-11019`'s 24.9% is
consistent with a real saving and with noise alike.

`npm test` 580/580. Spend this session: $1.53 ($0.58 + $0.155 + $0.685);
ticket total **$2.35 of the $5 cap**, $2.65 remaining. Still claimed, not
resolved — the deliverables now need a maintainer call on whether the
irrelevant-memory arm (the other half of the bargain, currently unmeasured) is
in scope for 19 or a new ticket.

**2026-08-09, same session — published the result and made the run
repeatable.**

**README.** Extended `## 📊 Measured, not just claimed` rather than starting a
new section, so the new favorable number lands inside the existing
regression-then-fix narrative instead of replacing it — the honest framing is
that this project found a regression first, fixed it, and only then measured a
win. Added the per-task token table, the completely-separated
`matplotlib-24265` result (U=0, p=0.029), the 16/16-correct fact that rules out
"cheaper because worse," and a plainly-worded caveat paragraph (correct-recall
upper bound, `django-11019` not significant, k=4 resolves ~50% not ~20%) with a
link to `findings.md`. Also published the discovery-arm number (12,552 vs
injection's 6,933) as an argument *for* enforced recall rather than omitting an
unflattering-looking middle result.

**Repeatability.** Wrote `benchmarks/token-ab/README.md` — the operator doc the
harness never had: prerequisites (`ANTHROPIC_API_KEY` or `ant auth login`,
network for live fetch), the exact command that produced the published numbers
with its real cost (~$0.70) and runtime (~15 min), a full flag table, the
three-arm explanation, how to add a task (including "verify `check()` against
gold, wrong, AND near-miss before spending" — the failure that produced three
false negatives on this ticket), and an "interpreting results honestly" section
covering the both-arms-must-pass rule, the per-task-not-pooled rule, and the
measured power limits.

**Harness fixes shipped alongside:**
- `run-swebench-ab.mjs` header rewritten: the retired 15-40% calibration gate is
  now documented *as retired*, with the reason (token outcome measure ⇒ 0%
  control failure is the desired state, pass/fail is a validity filter), so the
  next reader doesn't re-derive four rounds of confusion.
- Scorecard arm labels parameterized on `TREATMENT_ARM` (previously hardcoded
  "memory", which mislabels every injection run).
- The `no-measured-difference` line now prints its own caveat inline —
  "pooled across tasks with different baselines — check the per-task numbers"
  — so the statistic that produced ticket 10's headline can't quietly mislead
  again from the console.
- `npm run bench:swebench-ab:discovery` added for the `memory` arm.

**Correction to this ticket's previous entry.** It said ticket 10's headline
should be re-examined against its raw `results.json`. That re-examination is
**impossible**: `audits/10-counterfactual-token-ab/results.json` is itself a
casualty of the `OUT_DIR` bug — `dryRun: true`, 8 sessions, all tokens zero,
generated 2026-08-08, a day after the real 24-session run it overwrote. Only
`findings.md`'s aggregates survive. Those aggregates show memory 48,280 vs
control 46,596 — genuinely near-identical, and 3.6% in the *wrong* direction —
so **ticket 10's "no measured token difference" conclusion stands on its own
numbers**; the weak pooled statistic did not manufacture it. What is
unrecoverable is the per-task breakdown that might have shown a washed-out
per-task effect. The two tickets' results are consistent and explained by the
arm each measured: ticket 10 measured neuron-as-files, ticket 19 measured
neuron-as-injection.

`npm test` 580/580. Both arms dry-run validated. No additional spend this
round; ticket total remains **$2.35 of the $5 cap**.
