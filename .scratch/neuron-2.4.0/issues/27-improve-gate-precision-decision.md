Type: grilling
Status: resolved
Blocked by: none
Band: context cost

# 27 — Should Anything Be Done About the Gate's 99.80% False-Accept Rate?

## Question

[17](17-antagonistic-recall-abstention-benchmark.md) measured the shipped
lexical-only relevance gate's false-accept rate on genuinely no-evidence
queries: 0% on a hand-built, adversarially-disjoint corpus, but **99.80%**
(499/500) on LongMemEval's real conversational negative control. Given that
number, and given [`39`](../../neuron-2.2.0/issues/39-relevance-floor-validation.md)
already ruled out a plain cosine floor as the fix, what — if anything — should
actually change, and is it worth building?

## Context

This is a maintainer tradeoff decision, not an engineering question — the
data exists, the choice doesn't.

- **A cosine floor was already tried and rejected, with almost identical
  numbers.** `39` swept 0.50→0.70 against a pre-committed bar (zero recall
  regression, measurable volume reduction, 0% false silence) and found no
  floor cleared all three; even the gentlest (0.50) cost 3.3%/4.0%/4.2%
  recall regression at @1/@5/@10. Its Run 3 distribution shapes
  (on-topic r1 median 0.627, negative-control median 0.533, negative-control
  p90 sitting inside the on-topic p10–p90 band) are reproduced almost exactly
  by `17`'s own re-run (median 0.6272 vs 0.5329). **The distributions overlap
  too much for a single threshold to separate "real answer" from "no
  evidence" on natural conversational text without cutting real recall** —
  this is the mechanism behind both the old null result and the new 99.80%
  number; they are the same finding measured two different ways.
- **The resident E2E pillar's 0% shows the gate isn't structurally broken** —
  it correctly abstains when a query's vocabulary is genuinely disjoint from
  the store. The failure mode is specifically same-domain, cross-topic
  natural language, which is most of what a real agent session's off-topic
  turns actually look like.
- **Live options, not pre-narrowed to one:**
  1. **Ship a floor anyway, accepting the regression as a real cost.** E.g.
     floor ≈0.56 (from `39`'s own frontier) rejects ~21% of the pool for
     ~14–20% recall regression — a concrete number to weigh, not a guess.
  2. **A second-stage adjudication pass**, applied only to borderline cases
     near the lexical accept (not a global floor), so clearly-relevant
     queries never pay a recall cost. Candidate mechanism: the local
     Qwen1.5-0.5B summarizer already resident for enrichment — but the map's
     own "Confidently-wrong retrieval is unowned" fog item flags that this
     model is specifically weak at judging semantic opposites, so this path
     needs a small accuracy pilot before it's trustworthy, not just a wiring
     decision.
  3. **Leave it as-is.** A false accept on a no-evidence query degrades to
     "irrelevant context injected," not data loss or a wrong answer surfaced
     as fact — worth asking directly whether 99.80% is actually costing
     anything the maintainer has observed, versus being bad on paper.
  4. Some combination — e.g. a floor tight enough to catch only the most
     egregious cosine outliers (cheap, low regression, catches a minority)
     paired with a documented, not-yet-fixed disclosure of the rest.
- **Not this ticket's job to pick one.** `17` was measurement-only by design,
  mirroring `39`→`41`'s split; this ticket is the "what to do about the bad
  number" half that split anticipated, same shape as `39` feeding `41`.

## Comments

- Chartered 2026-08-11 immediately after `17`'s resolution, at the
  maintainer's direct request, rather than left to sit in fog — the question
  is already sharp (the tradeoff and its real numbers exist), it just hasn't
  been decided.

## Answer

Resolved 2026-08-11, via a live grilling session with the maintainer. Six
decisions, in dependency order:

1. **Fix it — not shelved.** The gate now runs on every agent turn (post-
   `12`'s pre-command hook decision), so 99.80% false-accept on off-topic
   turns is near-constant noise injection, not a rare edge case worth
   tolerating.
2. **The cosine floor stays rejected, not revisited.** `39`'s Run 3 and
   `17`'s own re-run both show the null result is structural — on-topic and
   negative-control cosine distributions overlap too much (negative-control
   p90 sits inside on-topic's p10–p90 band) for any single threshold to
   separate them. Reopening `39`'s pre-committed zero-regression bar would
   just relitigate a careful call against a signal that's fundamentally weak
   here, not fix anything.
3. **Local-only, hard maintainer constraint.** No remote API path — ruled
   out `@anthropic-ai/sdk` even as a fallback; this repo's runtime paths
   (embedder, enrichment) have never made a live model call, and this stays
   that way.
4. **Model class: a cross-encoder reranker, not another chat model.**
   Abandoned the "smaller chat model" framing entirely. Rerankers are
   purpose-built for exactly this judgment (query–passage relevance, not a
   proxy task reached via prompt engineering), need no ChatML/few-shot
   scaffolding the way `LocalEnrichmentModel` does (see the enricher's own
   build notes on parseability), and run materially smaller than the current
   500M-parameter chat model — typically 22M–100M params for models in this
   class.
5. **Integration: a pure gate layer, not a ranking change.** The reranker
   ANDs with the existing lexical leg (`ftsMatched`) on results that already
   pass it — small candidate set (≤`limit` per query), not the whole store.
   RRF and ranking order stay untouched; this ticket is about the gate's
   precision, not `Pillar 7`'s already-healthy ranking quality, and touching
   ranking risks regressing something that isn't broken.
6. **Acceptance bar, pre-committed before any pilot runs** (mirroring `39`'s
   own discipline): false-accept rate on LongMemEval's negative control
   (the same 499/500 population `17` measured) must drop **more than 5x**
   (99.80% → under 20%), **with ~zero new false-silence** on Pillar 7's
   on-topic corpus and LongMemEval's gold-query population. Both legs
   required — a reranker that cuts false-accepts by trading away real
   recall is not a win, same "don't solve one failure mode by reintroducing
   the other" rule `39` insisted on for the floor.

**Graduated as two tickets rather than built here**, mirroring `12`→22/23/24
and `14`→25/26's design-then-implementation split on this map:
- [28 — Research: Find a Local ONNX Cross-Encoder Reranker](28-research-local-reranker-model.md)
- [29 — Build and Pilot the Reranker Gate Layer](29-build-pilot-reranker-gate.md), blocked by `28`
