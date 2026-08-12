Type: task
Status: claimed
Blocked by: 28
Band: context cost

# 29 — Build and Pilot the Reranker Gate Layer

## Question

Using whichever local cross-encoder reranker [28](28-research-local-reranker-model.md)
finds, build the second-stage gate layer [27](27-improve-gate-precision-decision.md)
designed, and pilot it against `27`'s pre-committed bar. Does it clear the
bar — and if so, is it ready to ship?

## Context

`27`'s full design, to build against:

- **Gate layer, not ranking.** The reranker ANDs with the existing lexical
  leg (`ftsMatched`) on results that already pass it. RRF and ranking order
  are untouched — this does not touch `Pillar 7`'s ranking-quality metrics.
- **Acceptance bar, pre-committed in `27` before this pilot runs:**
  - False-accept rate on LongMemEval's negative control (the same 499/500
    population [17](17-antagonistic-recall-abstention-benchmark.md)
    measured, via `relevance_gate_eval.py`'s `run4`) must drop **more than
    5x** — from 99.80% to **under 20%**.
  - **~Zero new false-silence** on Pillar 7's on-topic corpus
    (`test/e2e/adversarial-recall.test.ts`) and LongMemEval's gold-query
    population (`relevance_gate_eval.py`'s `run2`/control-arm recall). A
    false-accept win that costs real recall is not a pass — same
    two-legged discipline `39` used for the cosine floor.

## Scope

1. Wire the model `28` found into a new gate-layer check, called only on
   candidates that already pass `queryGated`'s existing `ftsMatched` filter.
2. Re-run `17`'s two measurements with the new gate layer active:
   - The resident `Pillar 13: Antagonistic Recall & Abstention` corpus (should
     stay at or near 0% false-accept — it's already the easy case).
   - `relevance_gate_eval.py`'s full LongMemEval-S run (500 questions),
     reporting the new false-accept rate (`run4`) and confirming `run2`
     (false-silence) and control-arm recall are unchanged within noise.
3. Report both numbers against the bar honestly — pass or fail, matching
   `39`'s own "report the spread honestly" discipline. Do not adjust the bar
   post-hoc to fit the result.
4. If it clears the bar: wire it in behind a config switch (matching how
   `41` shipped `relevance.gate.enabled`), default state for a new
   experimental gate layer is a maintainer call, not assumed on-by-default.
   If it doesn't clear the bar: report why or unclear, and this ticket is
   still resolved (no fix shipped, exactly like `39` reporting "no floor
   clears").

## Verification

- Bar in Context is the sole go/no-go criterion, evaluated as pre-committed
  — not re-negotiated after seeing the number.
- Both corpora (resident pillar + real LongMemEval-S) re-run for real, not
  simulated or extrapolated from `28`'s benchmark citations.
- Results committed under `benchmarks/reports/` and
  `benchmarks/longmemeval/outputs/`, same convention `17` established.

## Answer

(none yet)

## Comments
