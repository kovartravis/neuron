Type: task
Status: claimed
Band: context cost

# 19 — Run the Counterfactual A/B on Synthetic Repos with Synthetic Memory Sets

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
