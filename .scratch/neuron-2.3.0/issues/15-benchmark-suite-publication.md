Type: task
Status: unclaimed
Blocked by: 10, 14
Band: context cost

# 15 — Publish the Benchmark Suite: Neuron vs Raw Harness

## Question

What does neuron 2.3.0 ship as its evidence that installing it is better
than not installing it — and where does a skeptical reader find it?

## Context

Surfaced 2026-08-07 by maintainer request: rather than let ticket
[10](10-counterfactual-token-ab.md)'s counterfactual A/B (and, if it runs,
ticket [14](14-git-log-hook-vs-agent-log-ab.md)'s git-log A/B) sit as
isolated findings buried in tracker tickets, this map's destination now
explicitly includes coming out of the epic with a **published, repeatable
benchmark suite** demonstrating neuron's improvement (or disclosed lack of
one) over raw harness — the kind of evidence a new user or a skeptic can
actually run and check, not just a claim in a README.

This is a publication and repeatability ticket, not a new measurement — it
aggregates what [07](07-session-token-budget-and-cost-telemetry.md),
[08](08-injection-redundancy-audit.md), `10`, and `14` already found
(whatever those findings turn out to be, favorable or not — see `10`'s own
note that a reasoned decision not to run it is a valid resolution) into one
place, wired into the existing `benchmarks/` infrastructure (`bench:sanity`,
`bench:full`, `bench:view`) so a sceptic can re-run it rather than trust a
number.

## Scope

1. **A new benchmark pillar (or a clearly labeled top-level section)
   reporting token-economics findings** alongside the existing retrieval
   pillars, using `benchmarks/`'s existing orchestration (rebuild, artifact
   purge, manifest update) rather than a bespoke report generator.
2. **State every finding's honesty band**: a completed A/B with real numbers
   is reported as such; an underpowered or not-run A/B is reported as "not
   established" rather than omitted or rounded into a claim — matching
   ticket 10's own stated posture.
3. **README-level summary** pointing at the full report, consistent with
   `03`'s compatibility-disclosure surface — this is the other half of
   "truthful disclosure": not just what neuron claims to do, but what's
   actually been measured about whether it's worth doing.
4. **Reproducibility**: document exactly how to re-run the suite (command,
   expected cost, expected runtime) so a sceptical user isn't asked to trust
   a number they can't check themselves.

## Verification

- `npm run bench:*` (or its 2.3.0 equivalent) reproduces every published
  number from a clean checkout.
- Every reported finding states its own confidence/power, not just a
  headline claim.
- README links to the full report rather than restating cherry-picked
  numbers.

## Deliverables

- [ ] Token-economics pillar added to the benchmark suite alongside the
      existing retrieval pillars
- [ ] Every finding labeled with its honesty band (established /
      underpowered / not run)
- [ ] README summary + link to the full report
- [ ] Documented reproduction steps with expected cost/runtime

## Comments

**2026-08-08, added by ticket 18's resolution:** Ticket 10's original
unfavorable finding (33% memory-arm failure vs 17% control) is **superseded**
by [18](18-rerun-counterfactual-ab-post-supersession.md)'s re-run: after
ticket 17's supersession fix, the same regressed tasks now show 0%
memory-arm failure vs 33% control, on a 2-task/12-session subset. Whoever
resolves this ticket should publish the corrected story — "found a real
regression, fixed it, verified the fix" — not ticket 10's original number
standing alone. Both `findings.md` files
(`benchmarks/token-ab/results/10-counterfactual-token-ab/` and
`.../18-rerun-counterfactual-ab-post-supersession/`) are the primary record;
note ticket 18 only re-ran 2 of ticket 10's original 4 tasks (the other two
were saturated 3/3 and mechanically unaffected by supersession) — decide
whether that subset is sufficient for publication or whether the full N=4
frame should be re-confirmed first.
