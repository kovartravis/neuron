Type: task
Status: unclaimed
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
