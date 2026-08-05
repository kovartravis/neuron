Type: task
Status: unclaimed
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
