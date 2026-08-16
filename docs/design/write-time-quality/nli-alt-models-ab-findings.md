# Alternative NLI model A/B findings — Ticket 13, Map — neuron 2.4.2

**Date:** 2026-08-15
**Ticket:** 13 — A/B Test Alternative NLI Models for Hard-Block Viability,
child of Map — neuron 2.4.2 ("write-time quality")
**Script:** `benchmarks/nli-polarity-ab/run-ab-alt-models.ts`. Corpus (unchanged
from Ticket 8): `benchmarks/nli-polarity-ab/corpus.ts`. Raw scores:
`benchmarks/nli-polarity-ab/raw-scores-{anli-base,anli-large,control-large-snli-mnli}.json`.

---

## TL;DR

Ticket 8 found `cross-encoder/nli-MiniLM2-L6-H768` (SNLI+MultiNLI only)
cannot separate contradiction from compatible-related pairs at any bar,
traced to an SNLI/MultiNLI annotation artifact. Ticket 11 asked: does an
ANLI-trained model — ANLI was collected specifically to counter that
artifact — do better? **No. None of the three candidates clears the
joint-low bar, and the best of them (`anli-large`) is still worse on the
joint metric than Ticket 8's original model.** The larger same-training-data
control is worse than all three, dramatically so.

**Verdict: no-go on hard-block for every candidate tested. Ticket 9 builds
soft-flag**, per Ticket 11's accepted fallback.

| model | role | best joint bar | false-silence | false-accept (related) | joint-worst | clears 0%/0%? |
|---|---|---|---|---|---|---|
| `nli-MiniLM2-L6-H768` (Ticket 8 baseline) | SNLI+MultiNLI, small | 0.95 | 20% | 13% | **20%** | no |
| `anli-large` (`DeBERTa-v3-large-mnli-fever-anli-ling-wanli`) | ANLI+more, large | 0.98 | 20% | 27% | 27% | no |
| `anli-base` (`DeBERTa-v3-base-mnli-fever-anli`) | ANLI, base | 0.99 | 27% | 40% | 40% | no |
| `control-large-snli-mnli` (`nli-deberta-v3-large`) | SNLI+MultiNLI, large | 0.99 | 13% | 60% | **60%** | no |

*(joint-worst = `max(false-silence%, false-accept-related%)` at each
model's own best bar — the metric Ticket 13's success criterion is judged
against; lower is better.)*

**The original small model Ticket 8 already rejected is still the best of
the four on this corpus.** Neither adding ANLI training data nor scaling
up model size recovered the joint-low bar Ticket 7's reranker found for
the analogous relatedness gate.

---

## 1. Method

Same corpus and scoring approach as Ticket 8 (`docs/design/write-time-quality/nli-polarity-detection-ab-findings.md`),
extended to score multiple models in one pass rather than one:
`AutoModelForSequenceClassification.from_pretrained(<model id>)` via
`@huggingface/transformers`, softmax over 3 logits, both **P(contradiction)**
and **margin** (contradiction logit minus the max of the other two) reported
per pair, then a bar-frontier sweep over `PROB_BAR_SWEEP` identical to
Ticket 8's.

**One necessary generalization**: Ticket 8's script assumed a fixed
`id2label` order (`{0: contradiction, 1: entailment, 2: neutral}`) and
hard-asserted it. That assumption does not hold across this shortlist —
confirmed by fetching each candidate's `config.json` before running
anything, per this ticket's own first step:

| model | `id2label` order |
|---|---|
| `cross-encoder/nli-MiniLM2-L6-H768` (Ticket 8) | `{0: contradiction, 1: entailment, 2: neutral}` |
| `Xenova/DeBERTa-v3-base-mnli-fever-anli` | `{0: entailment, 1: neutral, 2: contradiction}` |
| `Xenova/DeBERTa-v3-large-mnli-fever-anli-ling-wanli` | `{0: entailment, 1: neutral, 2: contradiction}` |
| `Xenova/nli-deberta-v3-large` | `{0: contradiction, 1: entailment, 2: neutral}` |

`run-ab-alt-models.ts` resolves each class's index from the model's own
`id2label` at load time (`resolveLabelIndices`) rather than assuming an
order, then normalizes every model's raw logits into a consistent
`[contradiction, entailment, neutral]` triple before scoring. A script that
inherited Ticket 8's hard assertion would have hard-errored on both
`anli-base` and `anli-large`, or worse, silently mis-scored them if the
assertion had been loosened without fixing the indexing.

### 1.1 Shortlist selection (this ticket's own first step, per Ticket 11)

Per Ticket 11's resolution: prioritize models trained (also) on ANLI —
Adversarial NLI, collected via a human-and-model-in-the-loop adversarial
process specifically to produce examples that fool SNLI/MultiNLI-trained
models — over SNLI/MultiNLI-only models like Ticket 8's. Include one larger
SNLI/MultiNLI-only model as a control, to test whether bigger-same-data
reproduces the bias or fixes it. Hub availability, license, and
`@huggingface/transformers` loadability were confirmed for each candidate
(via each model's Hugging Face model card and `config.json`) before
committing to this list — no candidate was swapped in only to hit a load
error.

| slug | model id | role | trained on | params | license |
|---|---|---|---|---|---|
| `anli-base` | `Xenova/DeBERTa-v3-base-mnli-fever-anli` (ONNX mirror of `MoritzLaurer/DeBERTa-v3-base-mnli-fever-anli`) | ANLI | MultiNLI + Fever-NLI + ANLI (763,913 pairs, no SNLI) | ~184M | MIT |
| `anli-large` | `Xenova/DeBERTa-v3-large-mnli-fever-anli-ling-wanli` (ONNX mirror of `MoritzLaurer/DeBERTa-v3-large-mnli-fever-anli-ling-wanli`) | ANLI | MultiNLI + Fever-NLI + ANLI + LingNLI + WANLI (885,242 pairs, no SNLI) | ~400M | MIT |
| `control-large-snli-mnli` | `Xenova/nli-deberta-v3-large` (ONNX mirror of `cross-encoder/nli-deberta-v3-large`) | control | SNLI + MultiNLI only, no ANLI — same training-data class as Ticket 8's model, scaled up | ~400M | Apache-2.0 |

All three are pre-converted ONNX mirrors published by the `Xenova` org
specifically for `@huggingface/transformers`/transformers.js compatibility
(the same mechanism Ticket 8 used implicitly — `cross-encoder/*` models
already ship ONNX weights directly). All three loaded and scored without
error on the first attempt; no candidate swap was needed.

A fourth candidate considered and rejected: `Xenova/DeBERTa-v3-xsmall-mnli-fever-anli-ling-binary` —
binary (entailment vs. not-entailment) output, incompatible with this
corpus's 3-way contradiction/entailment/neutral scoring, so it was dropped
before running rather than forced into the harness.

---

## 2. Results per model

Full per-pair data in each `raw-scores-<slug>.json`; summary below.

### 2.1 `anli-base` (`Xenova/DeBERTa-v3-base-mnli-fever-anli`)

| label | n | P(contradiction) min / median / max |
|---|---|---|
| contradiction | 15 | 0.0923 / 0.9985 / 0.9996 |
| compatible-paraphrase | 15 | 0.0003 / 0.0009 / 0.0140 |
| compatible-related | 15 | 0.0012 / **0.9846** / 0.9986 |

Argmax-only: 12/15 compatible-related pairs already score contradiction as
top class — identical to Ticket 8's original model (12/15). ANLI training
alone, at base scale, produced **no measurable improvement** on this
corpus's hard negative. Best joint bar 0.99: false-silence 27%,
false-accept-related 40% — worse on both axes than Ticket 8's original.

### 2.2 `anli-large` (`Xenova/DeBERTa-v3-large-mnli-fever-anli-ling-wanli`)

| label | n | P(contradiction) min / median / max |
|---|---|---|
| contradiction | 15 | 0.0037 / 0.9991 / 0.9998 |
| compatible-paraphrase | 15 | 0.0001 / 0.0002 / 0.0011 |
| compatible-related | 15 | 0.0002 / **0.6867** / 0.9986 |

Argmax-only: 8/15 compatible-related pairs score contradiction as top class
— a real reduction from the original's 12/15, and the best of the three
candidates. But the bar frontier still tops out at joint-worst 27% (bar
0.98: false-silence 20%, false-accept-related 27%) — worse than Ticket 8's
original (joint-worst 20% at bar 0.95). The extra training breadth (ANLI +
LingNLI + WANLI, not ANLI alone) and larger scale together move the needle
but not far enough, and not without cost elsewhere in the sweep.

### 2.3 `control-large-snli-mnli` (`Xenova/nli-deberta-v3-large`)

| label | n | P(contradiction) min / median / max |
|---|---|---|
| contradiction | 15 | 0.0490 / 0.9999 / 1.0000 |
| compatible-paraphrase | 15 | 0.0000 / 0.0000 / 0.0006 |
| compatible-related | 15 | 0.0000 / **0.9976** / 0.9999 |

Argmax-only: 10/15 compatible-related pairs score contradiction as top
class. The bar frontier barely moves across the entire sweep — false-accept
related sits at 67% from bar 0.50 through bar 0.95, only easing to 60% at
0.99. **This is the worst-performing model tested, original included.**

**The amplification finding**: `control-large-snli-mnli`'s median
P(contradiction) on compatible-related pairs (**0.9976**) is *higher* than
its own median on genuine contradiction pairs' known-hard case, and far
higher than the original small model's equivalent median (0.7892, Ticket
8 §2). Same training data (SNLI+MultiNLI only), same annotation artifact,
but a larger model expresses that artifact with *more* confidence, not
less — the extra capacity sharpens the wrong signal. This directly answers
Ticket 11's control question: bigger-same-data does not merely reproduce
Ticket 8's bias, it measurably amplifies it on this corpus.

---

## 3. Cross-model comparison

| model | role | best joint bar | false-silence | false-accept (related) | false-accept (paraphrase) | joint-worst |
|---|---|---|---|---|---|---|
| `nli-MiniLM2-L6-H768` (Ticket 8) | SNLI+MultiNLI, small | 0.95 | 20% | 13% | 0% | **20%** |
| `anli-large` | ANLI+more, large | 0.98 | 20% | 27% | 0% | 27% |
| `anli-base` | ANLI, base | 0.99 | 27% | 40% | 0% | 40% |
| `control-large-snli-mnli` | SNLI+MultiNLI, large | 0.99 | 13% | 60% | 0% | 60% |

Every model tested cleanly separates contradiction from
**compatible-paraphrase** (0% false-accept across the board, all bars) —
this part of Ticket 8's finding replicates on every candidate without
exception. The entire story is in the **compatible-related** column: none
of the three candidates gets it low enough, simultaneously with
false-silence, to justify a hard-block gate.

Ranked by joint-worst (lower = better): **original < anli-large < anli-base
< control-large**. The one candidate that improved on the original
(`anli-large`) did so only partially, and the model that changed *only*
scale without adding ANLI (`control-large-snli-mnli`) is the single worst
performer of the four — suggesting scale is not the lever, and ANLI
training helps only some (`anli-large`, trained on ANLI + LingNLI + WANLI
together) and not at all on its own at smaller scale (`anli-base`, ANLI
alone, base size).

---

## 4. Recommendation

Answering Ticket 13's own branch directly:

- **Does any candidate clear the joint-low bar?** No. All three fail Ticket
  13's own success criterion (both false-silence and false-accept-related
  low simultaneously, Ticket 7's bar-3 shape as the bar to match) — same
  verdict shape as Ticket 8, not a single exception.
- **Branch outcome, per Ticket 11's pre-agreed rule**: **Ticket 9 builds
  soft-flag**, the accepted fallback, not hard-block.

**Not resolved by this ticket** (a validation ticket measures, it doesn't
redesign): whether a still-different model family (not DeBERTa-v3-based),
a fine-tuned model trained specifically on this repo's own conflict shape,
or a non-NLI signal entirely would do better. Given `anli-large`'s partial
improvement traces to *combined* ANLI+LingNLI+WANLI training rather than
ANLI alone, and given scale alone made things worse, another blind model
swap is unlikely to clear the bar without first understanding *why*
`compatible-related` pairs read as contradiction across every model
tested — that diagnosis question is a candidate for **Not yet specified**
on the map, not another ticket to A/B-test blindly against. Routed to the
maintainer alongside Ticket 9's soft-flag build, not decided here.
