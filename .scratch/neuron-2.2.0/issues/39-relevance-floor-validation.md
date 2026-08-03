Type: task
Status: unclaimed
Blocked by: none
Band: 2.2.0-rc3

# 39 — Relevance Floor Validation (Blocks `11`)

> **Design rewritten 2026-08-03 by ticket [`27`](27-minscore-is-inert.md)'s
> resolution.** The gate's *shape* is now settled — a two-leg conjunction — so
> this ticket no longer chooses between gate quantities. It measures **one fitted
> constant** and **one unvalidated claim**. The original three-quantity sweep is
> preserved under *Superseded design* at the bottom, with the reasons each arm
> died. **The bar is unchanged.**

## Question

Two questions, both narrowed by `27`:

1. **What is the cosine floor** — the second conjunct of the gate — measured on
   data that is not this project's own prose?
2. **What is the lexical leg's false-silence rate?** `27` probed it on 5
   paraphrases and found none, but that is a probe against a self-referential
   store, and it is the claim that can sink the design.

## Why this blocks `11`

Ticket `11` owes a payload budget: token ceiling, relevance floor, truncation
strategy. The ceiling and truncation strategy are settled by argument (see `11`).
The **floor cannot be**: the pilot measurement found a viable cutoff on a
**0.061 margin**, from 20 queries, against this repo's own store — which is
denser on neuron's internals than any real user's store will be. Shipping that
number as a default on that evidence would be asserting a measurement, which is
the failure mode tickets `06`, `23` and `24` each caught and reversed.

Pilot: [`research/relevance-floor-baseline.md`](../research/relevance-floor-baseline.md).

**Only the floor is blocked.** Points 1, 2, 3, 4, 7 and 8 of `11` are settled and
do not depend on this run — `12` and `13` are not waiting on it.

## Instrument

`benchmarks/longmemeval/retrieval_eval.py` — already built, already published.

- **500 questions, 23,867 documents**, ground-truth gold evidence per question.
- **Zero LLM calls.** Free, deterministic, local CPU only.
- Published baseline: recall **@1 0.833, @5 0.9624, @10 0.9833**, 0 cross-unit
  leaks, retrieval p50 634 ms / p95 1686 ms.
  ([report](../../docs/benchmarks/longmemeval-retrieval.md))

This is the right instrument for the specific reason that it is **not
self-referential** — conversational text, not this project's own prose — which is
exactly the weakness of the pilot.

## What `27` already settled — do not re-litigate

The gate is a **conjunction of two legs**, and neither is chosen here:

1. **Lexical leg** — `normRrf > 0.5`, algebraically identical to *"the top hit
   has at least one FTS match"*. A **predicate, not a threshold**. Ships in
   [`41`](41-decontaminate-score-and-lexical-gate.md).
2. **Cosine leg** — a floor on raw cosine similarity. **This ticket's job.**

`importance` is out of `score` (`41`), so `score` **is** `normRrf` now.

Why the conjunction, in one line each — both measured on `27`'s probes:

- `pytorch training loop` (cos 0.6143) and `kubernetes` (cos 0.6074) sit **above**
  the lowest genuinely-relevant query, `how does prune work` (cos 0.6072). **No
  cosine floor rejects them without a false silence.** The lexical leg does.
- `make me a sandwich` scores `normRrf` **0.9692** on one stray `"make"*` prefix
  hit. **No lexical predicate rejects it.** Cosine does, at 0.4843.

## Design

**Control arm:** no floor. Current top-k behaviour, reproducing the published
baseline (a run that does not reproduce it invalidates the harness, not the
floor).

### Run 1 — the cosine floor, conditioned on the lexical leg

The sweep is **1-D**, over raw cosine only, evaluated **on the population that
has already passed the lexical leg**. That conditioning is the point: it changes
what the floor has to discriminate.

- absolute gate on r1 cosine: **0.50 → 0.70**, step 0.02
- relative band below r1: **0.03 → 0.10**, step 0.01

Report the full frontier, not just the winner.

**Why this is a much easier problem than the pilot's.** Unconditioned, cosine had
to separate relevant from *all* irrelevant — `27` measured that margin at
**0.064**, which independently reproduces this ticket's own 0.061 pilot margin
from a different corpus. Conditioned on the lexical leg, the no-FTS irrelevant
queries are already gone, so cosine only has to separate relevant from
*irrelevant-that-caught-a-stray-keyword* — margin **0.6072 vs 0.4843 = 0.123**,
roughly double. Two independent corpora agreeing on ~0.06 for the unconditioned
case is the strongest evidence in this ticket that the unconditioned framing was
the wrong one.

### Run 2 — the lexical leg's false-silence rate

**The claim that can sink the design**, and the one `27` explicitly could not
establish.

The lexical leg rejects any query sharing no vocabulary with the store. `27`
probed 5 on-topic paraphrases written to avoid the store's terminology; all 5
passed, because `cleanFtsQuery` emits **prefix** terms OR'd together so ordinary
words (`note`, `file`, `words`, `searching`) land hits. But that is 5 queries
against this project's own store.

LongMemEval is the right instrument precisely here: its questions are
**paraphrases of conversational content**, not restatements of it, and every one
has gold evidence known to be present. Measure:

- **Fraction of questions whose top hit has zero FTS matches** — each one is the
  lexical leg manufacturing silence over a known-present answer.
- **Broken out by question type**, since the multi-session and temporal types
  paraphrase hardest.

**If this rate is non-zero, the lexical leg is wrong as a hard conjunct** and the
finding is more valuable than the floor — report it as the headline, and `41`'s
leg becomes a candidate for demotion (advisory, or a soft signal) rather than a
gate. Do not quietly tune around it.

### Run 3 — the transferable output

LongMemEval's **own** cosine distribution: on-topic r1, negative-control r1,
store median, p90. The transferable result is **the shape of the curve**, not a
number. A floor calibrated on conversational text may not carry to technical
prose, and the report must say which way it cuts — `27`'s store is dense
technical prose and its relevant-query cosines ran 0.607–0.812, which is a
narrower band than the pilot's.

## Bar — committed in advance, before any number is seen

All three required. Precedent: ticket `23` committed its bar in advance and `24`
disqualified both arms against it.

1. **Zero recall regression** at @1 / @5 / @10 against the control arm. The floor
   exists to cut volume, not hits.
2. **Measurable volume reduction** — entries and characters injected per query
   must drop materially. A floor that changes nothing is dead weight.
3. **False silence: 0%.** Every LongMemEval question has gold evidence in the
   store, so any query whose top hit fails the gate is the floor withholding a
   known-present answer. Not folded into recall — counted and reported
   separately, and the ceiling is zero.

**If no (gate, band) pair satisfies all three: ship no floor.** The character
ceiling from `11` bounds the payload on its own, and more injected volume is the
honest price of not manufacturing silence. A double null here is a real result,
not a failure to find one.

## Deliverables

- [ ] **Run 1** — cosine floor sweep, conditioned on the lexical leg, control arm
      reproducing the published baseline
- [ ] **Run 2** — lexical-leg false-silence rate on LongMemEval's paraphrased
      questions, broken out by question type. **Headline result if non-zero.**
- [ ] The three bar conditions evaluated per candidate floor, false silence
      counted separately
- [ ] **Run 3** — LongMemEval's own cosine distribution (on-topic r1,
      negative-control r1, store median, p90). The transferable output is the
      shape of the curve, not a number. Say which way it cuts against `27`'s
      technical-prose band (relevant queries 0.607–0.812).
- [ ] A one-word fix to the map's gist of `05`. It reads *"measured
      0.4375–0.5565"* as if any top hit scores that low; the source (`07`'s entry)
      is *a **nonsense** query's top hit **score***, which is RRF, not cosine. The
      compressed form already caused one misreading during `11`'s grilling. Not a
      contradiction — the pilot's negative controls (cosine 0.491, 0.574) and
      `07`'s on-topic cosines (0.6548–0.9516) both agree with it.
- [ ] **The config surface, settled once, here.** `27` §8 deliberately deferred
      it to this ticket rather than shipping a deprecation for a key that might be
      reused: `minScore`'s fate (it is still parsed and still inert), the new
      cosine-floor key, and an **off switch** for the gate. `41` changes no
      config; this ticket changes it once, with the number in hand.
- [ ] Recommended defaults (or a recommendation to ship none), with the
      rejection rate exposed in `neuron status` alongside the degradation
      counters `05`/`06` established

## Superseded design — the three-quantity sweep

Recorded because the reasons the arms died are themselves results, not because
the design should be revived.

The original run swept **three** gate quantities in 1-D — raw cosine, hybrid
`score`, and `normRrf` alone — on the reasoning that the gate quantity was
contested: `07` measured raw cosine separating no-answer queries by 0.038 versus
`score`'s 0.233, but `score` was contaminated by importance, and `07` also found
cosine *inverted* on confidently-wrong retrieval (top-1 cosine on wrong
retrievals mean 0.7779/max 0.9516, *higher* than on right ones, mean 0.7518/min
0.6548).

`27` resolved the contest rather than measuring it, and two arms died:

- **The hybrid-`score` arm no longer exists.** `41` removes `importance` from
  `score`, so `score` *is* `normRrf`. The two arms were always going to converge;
  the only question was which survived, and the contamination decided it — `27`
  measured a live inversion where the entry ranked 1st by cosine (imp 3) was
  displaced by the entry ranked 3rd (imp 5).
- **The `normRrf` arm is not sweepable.** It is bimodal — exactly 0.5000 when FTS
  matches nothing, ~0.97–1.0 when it matches anything. Sweeping 0.50→0.70 in 0.02
  steps would measure one binary predicate ten times and report nine phantom
  operating points.

What survives is the raw-cosine arm, now **conditioned** on the lexical leg
rather than run alone — which is what made its margin workable (0.123 rather than
0.064).

`07`'s inversion finding is **not** superseded and still constrains the result: a
cosine floor cannot catch a confidently-wrong retrieval, because confidence is
what it measures. The floor's job is rejecting the *irrelevant*, not the
*wrong* — and nothing in this ticket addresses confidently-wrong retrieval, which
remains unowned.

## Comments

- 2026-08-03: Created during `11`'s grilling, at the maintainer's direction, when
  the pilot's 0.061 margin proved too thin to ship on. Bar set in the same
  session, before the run.
- 2026-08-03: Design rewritten by `27`'s resolution — the gate's shape is settled
  as a two-leg conjunction, so this ticket narrows to one fitted constant (the
  cosine floor) plus one unvalidated claim (the lexical leg's false-silence
  rate). **The bar is untouched**, which matters: it was committed before any
  number was seen, and `27` saw numbers. Ticket `27`'s own evidence is 15 probes
  against this project's own store and is explicitly *not* a substitute for this
  run.
