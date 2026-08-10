Type: task
Status: resolved
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

- [x] Token-economics pillar added to the benchmark suite alongside the
      existing retrieval pillars
- [x] Every finding labeled with its honesty band (established /
      underpowered / not run)
- [x] README summary + link to the full report
- [x] Documented reproduction steps with expected cost/runtime

## Answer

**A dashboard section, not a vitest pillar** (Scope item 1's "or" branch) —
`benchmarks/token-economics.mjs` aggregates each ticket's already-committed
result artifacts (`results.json`/`findings.md`) rather than re-measuring
anything, and is wired into the *existing* orchestration exactly as scoped:
`e2e-runner.js` (the shared engine behind `test:e2e`/`bench`/`bench:report`)
writes `benchmarks/reports/token-economics.json` on every run or
report-only pass — same build/purge/manifest pipeline the scorecard already
uses, no bespoke report generator — and `generate-dashboard.js` renders it
as a new "Token economics" section in `benchmarks/reports/index.html`,
alongside the retrieval pillars. Regenerating it costs nothing (reads local
files + one `neuron status` call); it never runs an A/B itself.

**Honesty bands** (Scope item 2): every entry carries `established` or
`not run` (this repo never hit the "underpowered" case — each A/B that ran
was adequately powered on at least one task). Established: the session
budget (`07`, with this repo's own live `neuron status` numbers alongside
the published constants), injection redundancy (`08`, computed live from
its committed `results.json` — the ≥0.70 table matches its `findings.md`
exactly), the counterfactual A/B (`18`, which supersedes `10` — reported as
"found a regression, fixed it, verified the fix," per this ticket's own
Comments), the git-log A/B (`14`), and the SWE-bench synthetic-fixture A/B
(`19` — see the correction below). Not run: the architecture-card A/B
(`24`, blocked on a funded execution path).

**Found mid-ticket, corrected before publishing:** ticket `19` already has a
real, favorable, adequately-powered result — a live 16-session
`injection`-vs-`control` run (pooled 19,267→8,144 tokens, 57.7% reduction,
16/16 correct both arms, one task significant at p=0.029) — shipped to
`README.md` and `benchmarks/token-ab/README.md` in commit `0bea898`, well
before this session. But `19`'s own ticket file is still `Status: claimed`
with no `## Answer`, and `map.md`'s Decisions-so-far has no entry for it —
only the earlier difficulty-calibration pilot narrative that preceded the
real run. This ticket's first draft mislabeled `19` as "not run" by trusting
that bookkeeping instead of checking the actual repo state (README.md +
`benchmarks/token-ab/results/19-.../full-injection-low/results.json`).
Corrected: `19`'s result is reported here as `established`, sourced directly
from its own committed `results.json`. **Not fixed here, left for whoever
picks `19` back up**: flipping its `Status:` to `resolved` and giving it a
real `## Answer`/map entry — out of this ticket's own scope, and `19`'s own
file may still have a reason it was left open (the medium-effort prompt-gap
finding) that a fresh session should read before closing it.

**README** (Scope item 3): a new "The full benchmark report" subsection
under the existing "📊 Measured, not just claimed" section points at
`npm run bench:report`/`bench:view` and the generated dashboard, framed the
same way as `03`'s compatibility disclosure — what's actually been measured,
not just claimed. `benchmarks/README.md` got a matching "Token economics"
section documenting what the dashboard section aggregates and why it's a
section rather than a pillar.

**Reproducibility** (Scope item 4): `npm run bench:report` (~10s, $0)
reproduces every number in the token-economics section from files already
in this repo — no re-run needed to *see* the numbers. Re-earning any one
finding costs what its own `npm run bench:*-ab` command costs (documented
next to each number and in `benchmarks/token-ab/README.md`); the retrieval
pillars behind the same dashboard re-run via `npm run test:e2e` (sanity,
minutes) or `npm run bench` (full, longer, real ONNX embedding).

`npm test` 587/587 (this ticket touched no `src/` files); `tsc --noEmit`
clean. Manually verified `benchmarks/reports/index.html` renders the new
section with balanced markup and no numeric drift in the unrelated
retrieval-pillar scorecard (confirmed by diffing against the committed
baseline before and after).

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
