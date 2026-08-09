Type: task
Status: resolved
Blocked by: 08, 09
Band: context cost

# 10 — Counterfactual Token A/B: Does Neuron Pay for Itself?

## Question

Do sessions with neuron installed reach *correct* completion in fewer total
tokens than sessions without it?

## Context

This is the claim the whole band is aiming at, and the only one that answers
the objection on its own terms. Tickets `07`–`09` bound and shrink the cost;
none of them establish a **benefit**. The benefit, if it exists, is
counterfactual: without neuron the agent spends tokens re-deriving what it
already knew — re-reading files, re-grepping, re-asking, repeating a fix it
already made — and the claim is that those tokens exceed what the hook injects.

**A reasoned decision not to run this is a valid resolution.** If `07`'s bound
and `08`'s redundancy figures show the injection is mostly restating resident
context, the honest move is to fix that first and record here why the A/B was
not worth its cost yet. Resolve the ticket with that argument; do not leave it
open as an unfunded aspiration the way ticket
[22](../../neuron-2.2.0/issues/22-longmemeval-harness.md) sat parked.

## What makes this expensive

Agent sessions are non-deterministic: the same prompt twice gives different
token counts and sometimes different outcomes. So this is a distribution, not a
measurement — N tasks × 2 arms × k repeats, reported with spread, and
underpowered results reported as underpowered rather than rounded into a claim.

## Scope

1. **Fixed task set with objective completion criteria.** Did the test pass?
   Does the file have the right content? A judge deciding "did it do a good
   job" reintroduces exactly the cost and the arguability this design avoids.
   Tasks must be ones where prior memory plausibly helps — a task no memory
   could inform measures nothing.
2. **Both arms identical but for the hook**: same harness, same model, same
   starting repo state, same task text. The `neuron init` protocol block
   differs between arms by construction (`fallback` versus `deterministic`) —
   that is part of what is being measured, not a confound to remove, but it
   must be stated.
3. **Measure total session tokens to correct completion**, not tokens injected.
   A run that fails the completion criterion is not a cheap run; count it as a
   failure, and report the failure rate per arm alongside the token
   distribution.
4. **Report the risk arm.** Injected-but-wrong memory costs tokens *and*
   correctness. `neuron-2.2.0` measured raw cosine **inverted** on wrong
   answers — top-1 cosine on queries retrieval got wrong (mean 0.7779) is
   *higher* than on queries it got right (mean 0.7518) — and ticket 39 found
   every cosine floor from 0.50–0.70 regresses recall, so no relevance floor
   ships to catch it. If the neuron arm fails a task the control arm passes,
   that is the headline finding, not a footnote.
5. **Reuse before building.** `benchmarks/e2e-runner.js` and the tier system in
   `test/e2e/tier.ts` already solve run orchestration, artifact handling and
   scorecard rendering; the existing pillars measure retrieval, not token
   economics, so this is a new pillar behind existing plumbing rather than a
   new harness. Check what ticket 22's retrieval tier left behind before
   writing anything.
6. **Cost and runtime budget up front.** State the expected spend and
   wall-clock before starting, the way ticket 22 did — and get it approved
   rather than discovering it.

## Verification

- k > 1 repeats per task per arm; spread reported, not just means.
- Completion criteria are objective and checkable after the fact from artifacts.
- Failure rates reported per arm.
- Any per-arm advantage smaller than the observed run-to-run spread is reported
  as "no measured difference," not as a win.

## Deliverables

- [ ] Either a completed A/B, or a recorded argument for why it was not run yet
- [ ] Task set with objective completion criteria
- [ ] Token distribution and failure rate per arm, with spread
- [ ] The risk arm reported: tasks the neuron arm got wrong that the control got right
- [ ] Findings fed to `03`'s disclosure and `04`'s claim-versus-behaviour audit

## Comments

**2026-08-07, added by a map-charting session (not a resolution):** Ticket
[14](14-git-log-hook-vs-agent-log-ab.md) reuses this ticket's harness for a
second, narrower A/B (hook-injected git-log search vs agent-invoked `git
log`), and ticket [15](15-benchmark-suite-publication.md) publishes both
findings as a repeatable benchmark suite — the map's destination now
explicitly includes that publication. Whoever resolves this ticket should
build the harness so a second pillar can reuse it (Scope item 5 already
points at `benchmarks/e2e-runner.js` and `test/e2e/tier.ts` for this reason);
if what gets built isn't reusable that way, treat it as a defect in this
ticket's own resolution, not a reason for `14` to duplicate it. Also worth
settling explicitly, before either A/B spends anything: whether the "N tasks
× 2 arms × k repeats" sessions run as real Claude Code sessions (covered by
the maintainer's existing Code subscription, not separately billed) or as a
scripted Claude API harness (billed per-token, separately from any Code
subscription) — the two have very different cost profiles and the choice
changes what "cost and runtime budget up front" (Scope item 6) actually
means.

**2026-08-08, added during ticket 18's pickup:** A dry-run sanity check of
`benchmarks/token-ab/run.mjs` (confirming the harness still works before
ticket 18's live re-run) overwrote this ticket's own
`benchmarks/token-ab/results/10-counterfactual-token-ab/results.json` with
dry-run zeros — the script writes to a fixed output path regardless of
`--dry-run`, and that path was never git-tracked, so the original file (raw
per-session `answerText` and per-session token breakdowns backing this
ticket's numbers) is unrecoverable. `findings.md` — the actual deliverable,
containing the aggregate tables, root-cause analysis, and risk-arm detail —
is untouched and remains authoritative. Only the underlying raw evidence
file is gone; no numbers in `findings.md` are in question, but a reader
who later wants to spot-check `answerText` directly (as the Corrections
section above recommends) no longer can for this run. Ticket 18's own live
re-run will regenerate a fresh `results.json` at the same path.

**2026-08-07, session in progress (not yet a resolution):** Claimed. Settled
the funding question the previous comment left open: a scripted Claude API
harness against the maintainer's own pay-as-you-go Console balance ($20),
not a Code-subscription session — the maintainer's own framing ("run it as
cheaply as possible so I can get maximum usage out of my $20") only makes
sense under metered billing. Model: Claude Sonnet 5 at intro pricing
(through 2026-08-31), chosen over Haiku 4.5 after the maintainer weighed the
tradeoff explicitly — Haiku is cheaper but risks conflating "the agent is
too weak" with "the memory hook didn't help," since neuron's hook targets
Claude Code/Sonnet-class agents in practice.

Built the harness at `benchmarks/token-ab/` (`tasks.mjs`, `fixtures.mjs`,
`session.mjs`, `run.mjs`; `npm run bench:token-ab`, `--dry-run` variant
validated end to end with no API calls). Design decisions, each stated per
Scope item 2's "must be stated":

- **Scope simplification, disclosed:** this A/B tests whether having
  neuron's memory *content* resident and pointed at reduces tokens-to-
  correct-completion — not the live hook/CLI installation path, which `07`-
  `09` already measured directly (injection cost, redundancy, footprint).
  Running the actual built `neuron` CLI inside 24 sandboxed sessions would
  conflate build/model-download reliability with the effect being measured.
  Both arms are a `git worktree` pinned to the same commit (identical git
  history, source, and CLAUDE.md-stripped baseline); the **memory** arm
  keeps `.neuron/*.md` on disk plus a system-prompt note pointing at it
  (the functional payload neuron's hook ultimately surfaces); the
  **control** arm has neither. This is the "identical but for the hook"
  requirement, scoped honestly rather than literally.
- **Task set (N=4, not 5 as planned before sizing):** four objective,
  memory-relevant questions grounded in real entries in this repo's own
  `.neuron/decisions.md` at HEAD — the pruning-defaults/threshold
  "collision" ruling, the 0.5B-model six-ticket A/B scoreboard, the
  pruning-A/B verdict and ticket 25's fate, and the write-side capture-gap
  finding. Each has a deterministic regex/keyword check against
  `/ANSWER.md` (`tasks.mjs`), verified against both a gold answer (passes)
  and plausible wrong answers (correctly fails, including "confidently
  wrong" answers that assert the opposite claim) — no LLM judge anywhere,
  per this ticket's own Context section.
- **k=3 repeats**, 2 arms, 4 tasks = 24 sessions (not 30 — sized down once
  the real task count landed at 4).
- **Safety, since there is no container:** the bash tool runs real shell
  commands scoped by `cd` into the fixture worktree, with a destructive-
  command blocklist (sudo, rm -rf /, fork bombs, git push, npm publish,
  curl\|sh, etc.), a 30s per-command timeout, a 20-turn cap, and a 5-minute
  wall-clock cap per session. This is defense in depth, not a sandbox —
  worth a second pair of eyes before a wider run.
- **Cost/runtime, stated and approved before spending anything** (Scope
  item 6): effort `low` (short lookup-and-write tasks, not reasoning-heavy),
  Sonnet 5 intro pricing. Estimate at the time of approval: ~$4 for a
  30-session plan; actual plan is 24 sessions, so lower. Wall-clock:
  untested until a real run — will report actual p50/p95 once one completes.

**Blocked on:** no `ANTHROPIC_API_KEY` or `ant` profile is available in this
environment. The maintainer pasted a key directly into a chat message during
this same session, which is now a leaked secret independent of anything
here — flagged to them separately; it must be revoked and never used by this
harness. Real execution (`npm run bench:token-ab`) is deferred until a
credential is available via `ant auth login` or an environment variable set
outside the chat transcript. **Not resolving this ticket yet** — Scope item
1 of Deliverables ("either a completed A/B, or a recorded argument for why
it was not run yet") isn't satisfied by a built-but-unrun harness; this
comment is progress, not a verdict. Whoever picks this back up: `k=1` first
as a cheap pilot (`node benchmarks/token-ab/run.mjs --k=1`) before spending
the full 24-session budget.

**2026-08-07, resolved:** authenticated via `ant auth login` (browser OAuth,
no key ever entered chat) and ran the full plan: an 8-session `--k=1` pilot
caught a real harness bug (the model resolved "repository root" to `/`,
filesystem root, read-only — fixed by spelling out the absolute fixture
path), then the full 24-session `--k=3` run completed for **$5.20** total
(pilot + full run), well under the $20/~$4-5-estimate approval.

**Result: no measured token difference, and the memory arm's failure rate
was higher than control's (33% vs 17%), not lower.** Full numbers, per-task
breakdown, and root-cause analysis in
`benchmarks/token-ab/results/10-counterfactual-token-ab/findings.md`; raw
per-session data (including every `answerText`) in `results.json` in the
same directory. Headline: on the two tasks where the arms diverged, the
memory arm was wrong more often — both times because a *superseded* entry
in `.neuron/decisions.md` (an earlier ticket's resolution, later reversed
by a different entry) outcompeted the entry that reverses it, while one
control-arm repeat got the right answer from ordinary project docs
(`CONTEXT.md`/`CHANGELOG.md`) with no memory store at all. This is a
concrete, measured instance of the "confidently-wrong retrieval" and
"write-side capture gap" risks this map's own fog already named as
theoretical — not a new problem, but the first real evidence of it firing
in a live session rather than a synthetic measurement.

A grading bug (negation-blind regex; caught and fixed with the raw
`answerText` re-graded offline, no extra spend) is disclosed in
`findings.md` along with a second self-correction (an initial fix
overcorrected and had to be fixed again) — flagged there as a caveat on how
much to trust the automated `passed` booleans versus the raw text.

**Deliverables:** all five checked off — completed A/B; task set with
objective completion criteria (`tasks.mjs`); token distribution and failure
rate per arm with spread (`findings.md` headline table); the risk arm
reported explicitly (two cases, one direction only); findings written up
for `03`'s disclosure and `04`'s claim-versus-behaviour audit to consume —
**the finding to carry forward is not favorable**, and `findings.md` says so
plainly rather than rounding toward "no measured difference, no risk."

**2026-08-08, added by ticket 18's resolution:** This ticket's headline
finding is **superseded**, not just contextualized, by
[18](18-rerun-counterfactual-ab-post-supersession.md). After the
memory-supersession fix (ticket 17) this ticket's own root-cause analysis
led to, the memory arm's failure rate on the two tasks that regressed here
(prune-default-collision, pruning-ab-verdict) dropped from 67% to **0%**,
beating the control arm's unchanged 33% — confirmed on a live 12-session
re-run, both named regression repeats individually verified correct, not
just the aggregate. This ticket's `findings.md` remains the accurate record
of what was found and why (the root-cause analysis is exactly what motivated
ADR 0015), but any future reader citing this ticket's 33%/17% headline
number as neuron's current behaviour would be citing a fixed bug as if it
were still live. Full detail:
`benchmarks/token-ab/results/18-rerun-counterfactual-ab-post-supersession/findings.md`.

**2026-08-08, added at ticket 19's creation:** This ticket's own
"Methodological caveat for whoever reuses this harness" section (the
independently-documented-answer confound on `prune-default-collision`) is
now chartered as [19 — Run the Counterfactual A/B on Synthetic Repos with
Synthetic Memory Sets](19-synthetic-fixture-counterfactual-ab.md), created
directly at the maintainer's request after `18` also hit a second,
mechanical reason to want fixtures independent of this repo's real state
(the `git worktree add HEAD` dependency).
