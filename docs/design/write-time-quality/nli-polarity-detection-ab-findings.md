# NLI polarity detection A/B findings — Ticket 8, Map — neuron 2.4.2

**Date:** 2026-08-15
**Ticket:** 8 — Validate NLI Polarity Detection (A/B), child of
Map — neuron 2.4.2 ("write-time quality")
**Script:** `benchmarks/nli-polarity-ab/run-ab.ts`. Corpus:
`benchmarks/nli-polarity-ab/corpus.ts`. Raw scores:
`benchmarks/nli-polarity-ab/raw-scores.json`.

---

## TL;DR

Does `cross-encoder/nli-MiniLM2-L6-H768` reliably distinguish "restates"
from "disagrees with" on real write-time pairs? **Split verdict, same shape
as Ticket 7's:** the model cleanly separates contradiction from
**paraphrase** (NLI entailment), but **does not** cleanly separate
contradiction from **compatible-but-related** (NLI neutral) — same topic,
different, non-conflicting fact, the exact hard-negative shape Ticket 9's
hard-block gate would see constantly in real use, since it only ever runs
on candidates that already cleared Ticket 3/6's relatedness pre-filter.

- **Contradiction vs. paraphrase: clean separation.** 15 genuine
  contradiction pairs (numeric flips, policy reversals, named-value swaps —
  Pillar 14 case 2's shape, generalized) score P(contradiction) 0.19-0.998;
  15 paraphrase pairs (Ticket 7's own `near-dup` corpus, reused verbatim)
  score 0.001-0.65, with only one pair overlapping into contradiction
  territory. **0% false-accept at every bar ≥ 0.6.**

- **Contradiction vs. compatible-related: severe, threshold-independent
  overlap.** The same 15 compatible-related pairs (Ticket 7's own
  `related-distinct` corpus, reused verbatim — same topic, different fact,
  no conflict) score P(contradiction) 0.05-0.99. At bar-free argmax alone,
  **12 of 15 (80%) already score contradiction as the top class.** No bar in
  the sweep gets both false-silence (missed real contradictions) and
  false-accept (wrongly blocked compatible-related writes) low at the same
  time: bar 0.90 still false-accepts 27% of compatible-related pairs; bar
  0.98 gets that down to 7% but false-silences 40% of real contradictions.

- **A secondary finding inside the contradiction set itself**: the model is
  highly reliable on lexical/numeric substitution contradictions (10 of 15
  score P ≥ 0.94) but unreliable on contradictions that require
  policy/cardinality reasoning rather than a value swap — the two weakest
  cases (P = 0.19 and 0.52) are both this shape (`cd-10`, `cd-11`; see §3).

**Recommendation: no-go on Ticket 9's hard-block posture as scoped.** The
premise this ticket set out to validate — that this model, thresholded,
justifies a hard-block — does not hold. See §5.

---

## 1. Method

Mirrors Ticket 7's own measure-first discipline
(`benchmarks/near-dup-ab/run-ab.ts`) and its explicit purpose: validate
before Ticket 9 spends engineering time building against an unvalidated
premise.

### 1.1 Corpus

`benchmarks/nli-polarity-ab/corpus.ts`: 45 labeled `{premise, hypothesis}`
pairs. `premise` = the live entry already in the store; `hypothesis` = the
new write being evaluated against it — the order a real write-time call
would make (NLI is asymmetric).

- **contradiction** (15, new): hypothesis asserts a different value for a
  slot the premise fixed — numeric flip (`cd-01`..`cd-03`, `cd-15`), policy
  reversal (`cd-04`, `cd-05`, `cd-11`), named-value swap (`cd-06`, `cd-09`),
  direct negation (`cd-07`, `cd-13`), cardinality reversal (`cd-10`),
  identity reversal (`cd-12`), location swap (`cd-14`). Same register as
  Ticket 7's corpus — content lifted or paraphrased from this repo's own
  decisions/learning/tickets prose.
- **compatible-paraphrase** (15, reused verbatim): Ticket 7's own
  `near-dup` pairs (`benchmarks/near-dup-ab/corpus.ts`) — same fact,
  reworded. Not fabricated fresh; these are the exact pairs Ticket 7 already
  validated as "should NOT be caught" by the *relatedness* gate, now reused
  to check the *polarity* gate doesn't catch them either.
- **compatible-related** (15, reused verbatim): Ticket 7's own
  `related-distinct` pairs — same topic, different, non-conflicting fact.
  This is the deliberate hard negative: pairs that already cleared Ticket
  3/6's relatedness pre-filter (that's what "related-distinct" measured)
  and are exactly what Ticket 9's polarity gate would be asked to pass
  through, not block.

Reusing Ticket 7's own corpus for the two compatible classes, rather than
writing a fresh one, is intentional: it keeps the compatible side
apples-to-apples with what the relatedness gate (Ticket 3/6) already
proved clears its own bar, so this ticket measures exactly the population
Ticket 9 would run the polarity check against downstream.

### 1.2 Scoring

`AutoModelForSequenceClassification.from_pretrained('cross-encoder/nli-MiniLM2-L6-H768')`
via `@huggingface/transformers` (same loading pattern as
`TransformersReranker`, `src/components/reranker.ts` — cached under
`envPaths('neuron').data/models`). Confirmed `id2label`:
`{0: contradiction, 1: entailment, 2: neutral}`. Two derived scores per
pair, both reported since neither was assumed in advance to be the right
one to threshold:

- **P(contradiction)** — softmax over the 3 raw logits.
- **margin** — contradiction logit minus the higher of the other two raw
  logits (unnormalized separation).

No quantized ONNX variant on the hub matches `@huggingface/transformers`'
dtype-suffix convention (`model_quantized.onnx`); the loader fell back to
full fp32 (`model.onnx`, ~328MB). Not a blocker for this validation, but
relevant if Ticket 9 wants a smaller runtime footprint later — the hub repo
does carry ARM64/AVX512 int8 ONNX exports under nonstandard filenames
(`model_qint8_arm64.onnx` etc.) that would need explicit wiring, not the
`dtype: 'q8'` shorthand `TransformersReranker` uses today.

---

## 2. A/B 1 — P(contradiction) and margin by label

| label | n | P(contradiction) min / median / max | margin min / median / max |
|---|---|---|---|
| contradiction | 15 | 0.1853 / 0.9926 / 0.9977 | -0.81 / 5.11 / 6.22 |
| compatible-paraphrase | 15 | 0.0011 / 0.0078 / 0.6453 | -6.84 / -4.84 / 0.80 |
| compatible-related | 15 | 0.0473 / 0.7892 / 0.9920 | -2.96 / 1.56 / 4.93 |

Own-pair separation:

- **contradiction vs. compatible-paraphrase**: min 0.1853 vs. max 0.6453 —
  gap **-0.46** (one paraphrase pair, `nd-13`, spikes to 0.65; every other
  paraphrase pair sits below 0.03). Practically separated at any bar ≥ 0.7
  (§4).
- **contradiction vs. compatible-related**: min 0.1853 vs. max 0.9920 — gap
  **-0.81**. Not close. `compatible-related`'s own median (0.7892) sits
  *above* `contradiction`'s own minimum (0.1853) — the two distributions
  substantially overlap, not just at the tails.

## 3. A/B 2 — argmax agreement (bar-free)

The starkest single number in this ticket: what happens with *no*
threshold at all, just "is contradiction the model's own top class?"

| check | result |
|---|---|
| contradiction pairs where argmax != contradiction | 1/15 (`cd-11`) |
| compatible-paraphrase pairs where argmax == contradiction | 1/15 (`nd-13`) |
| compatible-related pairs where argmax == contradiction | **12/15** |

At zero threshold tuning, the model already calls 80% of compatible-related
pairs "contradiction" as its single most confident class. This is not a
threshold-calibration problem — it's the model's default read of this pair
shape.

The one contradiction pair the model misses even at argmax (`cd-11`:
*"Frontier tickets are unclaimed, unblocked, and open."* vs. *"A frontier
ticket can be claimed by more than one session at the same time."*, argmax
= neutral, P = 0.19) and the weakest confidently-caught one (`cd-10`:
*"The blockedBy field lists comma-separated ticket ids."* vs. *"The
blockedBy field holds a single ticket id — it can never list more than
one."*, P = 0.52) share a shape: both require reasoning about **cardinality
or policy generality** ("comma-separated" implies "can be more than one";
"unclaimed" implies "not claimable by two sessions at once") rather than a
direct lexical/numeric substitution. Every contradiction pair built as a
straight value swap (`cd-01`-`cd-04`, `cd-06`, `cd-09`, `cd-12`-`cd-15`)
scored P ≥ 0.94. This model is a reliable value-swap detector and an
unreliable policy-implication detector.

## 4. A/B 3 / A/B 4 — bar frontier (P(contradiction) and raw margin)

Both scores tell the same story; P(contradiction) shown here (see raw
output for the margin table, same shape):

| bar | false-silence (contradiction missed) | false-accept (paraphrase) | false-accept (related) |
|---|---|---|---|
| 0.50 | 7% (1/15) | 7% (1/15) | 80% (12/15) |
| 0.70 | 13% | 0% | 67% |
| 0.80 | 13% | 0% | 47% |
| 0.90 | 13% | 0% | 27% |
| 0.95 | 20% | 0% | 13% |
| 0.98 | 40% | 0% | 7% |
| 0.99 | 47% | 0% | 7% |

**No bar reaches low false-silence and low false-accept-related at the same
time.** The best joint point in this sweep (bar ≈ 0.90-0.95) still leaves
13-27% false-accept against compatible-related writes — a hard-block gate
firing on roughly 1 in 5-8 legitimate, non-conflicting writes — or, pushed
tighter to bar ≥ 0.98 to suppress that, misses 40%+ of genuine
contradictions, which defeats the gate's purpose. Compare Ticket 7's own
reranker bar frontier, which *did* find a bar (3) with 0% on both axes
simultaneously — this ticket's frontier has no such point.

---

## 5. Recommendation

Answering this ticket's own three deliverables directly:

1. **Confidence bar that separates contradiction from neutral/entailment on
   real pairs**: none exists that is simultaneously low-false-silence and
   low-false-accept. The model separates contradiction from *paraphrase*
   cleanly (any bar ≥ 0.7 works), but not from *compatible-related* at any
   bar tested.
2. **False-positive rate against compatible-but-related pairs**: severe and
   threshold-resistant — 80% at a naive midpoint, still 27% at bar 0.90,
   only reaching single digits past bar 0.98 at the cost of missing
   roughly half of real contradictions.
3. **Verdict**: **does not** justify Ticket 9's hard-block posture as
   scoped. Ticket 4's refuse-vs-flag decision needs revisiting before
   Ticket 9 builds against this model as a hard-block trigger.

**Why this happens, not just that it happens**: `cross-encoder/nli-MiniLM2-L6-H768`
is trained on SNLI/MultiNLI, where crowdworkers wrote "contradiction"
hypotheses by introducing *any* specific detail absent from (and thus
technically unverifiable against) the premise — a well-documented
annotation-artifact bias in these benchmarks. `compatible-related` pairs
are, structurally, exactly that shape: a hypothesis stating a fact the
premise says nothing about. The model isn't confused; it's behaving
consistently with what it was trained to call "contradiction," and that
training target doesn't match this task's actual definition of conflict
(two claims about the *same* slot that disagree, not two claims about
*different* slots in the same topic).

**This mirrors Ticket 7's own split (synthetic win, real-hard-negative
loss)**, but arrives faster: Ticket 7 needed a full real-store
counterfactual (683 entries) to expose its gap. Here, the gap is visible
directly in the 15-pair `compatible-related` set alone — the overlap is
large and consistent, not a rare edge case a bigger corpus would be needed
to surface.

**Not resolved by this ticket** (a validation ticket measures, it doesn't
redesign): whether the right fix is (a) reopening Ticket 4's refuse-vs-flag
choice — e.g. soft-flag instead of hard-block specifically for this
signal, given its real false-positive rate, (b) narrowing the model's
scope to the value-swap contradictions it's actually reliable on (§3) and
declining to catch policy/cardinality contradictions at all, (c) a
different or fine-tuned model, or (d) an additional filter ahead of the
NLI call that's better at telling "different slot, same topic" apart from
"same slot, different value" than this general-purpose NLI model is on its
own. That choice needs the maintainer, not another measurement — routed to
a new ticket rather than decided here.
