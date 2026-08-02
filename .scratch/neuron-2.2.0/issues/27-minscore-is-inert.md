Type: grilling
Status: unclaimed
Blocked by: none
Band: unassigned — sits on the frontier, not gating any rc cut

# 27 — `minScore` Is Structurally Inert

## Question

The default `minScore: 0.35` cannot exclude a top hit at any relevance, so
`neuron exec` injects at least one memory before every wrapped command no matter
how irrelevant. What should the relevance gate actually be — and should there be
one at all?

## Context

Found while calibrating ticket [`07`](07-query-expansion.md), which was killed.
This is the half of that work that survived.

### The arithmetic

`src/index.ts:475-483` computes, per row:

```
RRF_K   = 60
RRF_MAX = 2 / (RRF_K + 1)          // both lists rank it #1
rrfScore = 1/(60+semanticRank) + 1/(60+ftsRank)
normRrf  = rrfScore / RRF_MAX
normImp  = (importance - 1) / 4
score    = 0.75 * normRrf + 0.25 * normImp
```

Every row with a positive cosine gets a semantic rank, so **the top result
always has `semanticRank = 1`**, giving `rrfScore ≥ 1/61` and therefore
`normRrf ≥ 0.5`. Hence:

| importance | minimum possible top-hit `score` |
|---|---|
| 1 | **0.375** |
| 2 | 0.4375 |
| 3 (the default) | **0.500** |
| 5 | 0.625 |

The floor of the whole range is **0.375**, above the `0.35` default. The gate
can never fire on a top hit. This is not a threshold that is set too low — it is
a threshold outside the attainable range.

### Confirmed by measurement, not just algebra

Five nonsense queries against a 308-entry corpus of importance-2 filler scored
**0.4375, 0.5565, 0.4375, 0.4375, 0.4966** — the repeated 0.4375 is exactly
`0.75·0.5 + 0.25·0.25`, the formula's predicted floor for importance 2. Real
queries on the same corpus scored **0.7896–0.9375**. Full data and a re-runnable
probe: [`.scratch/salvage-expansion/`](../../salvage-expansion/README.md).

### Where it bites

`src/commands/exec.ts:32` — `matched.filter(m => (m.score ?? 0) >= minScore)`.
This is the pre-command memory injection behind `neuron exec`, resolved through
`resolveExecCategories` (`src/config/neuronYaml.ts:261-295`, default `0.35` at
`:127` and `:264`). Because the gate is inert, **every wrapped command gets at
least one memory injected**, relevant or not. `neuron memory query` surfaces the
same scores to agents deciding whether a result is worth trusting.

This matters more after rc3, not less: ticket `11`'s hook-based auto-injection
puts this on every agent turn.

### Two things this ticket must not assume

- **That the answer is a higher `minScore`.** The score is contaminated by
  `importance` — a high-importance irrelevant entry outranks a low-importance
  relevant one by up to 0.25, which is most of the usable range. Raising the
  threshold trades one wrong behaviour for another.
- **That raw `similarity` is obviously better.** Ticket `07` measured it: raw
  cosine separated no-answer queries from real ones by only **0.038**
  (≤0.6173 vs ≥0.6548), while `score` separated the same populations by
  **0.233**. A ~0.63 similarity floor is a *candidate*, inherited from `07`, not
  a conclusion — and `07` also proved raw similarity is **inverted** on
  confidently-wrong retrieval, so it is not a general quality signal either.

## Prior art in this map

ADR 0010 §2 asserted `minScore: 0.35` is "a far weaker filter than it appears".
That was correct and understated — it is not weak, it is inert. §2's companion
claim, that a nonsense query's top hit still scores ≥ 0.75, is false and is
corrected in ADR 0010's 2026-08-02 amendment.

## Suggested starting questions for the grilling

1. Is a relevance gate the right primitive at all, or should `neuron exec`
   inject a fixed small number of results and let the consumer judge?
2. Should `score` stop mixing relevance with importance? Importance is a
   *tie-break* concern; folding it into the number a filter reads is what makes
   the filter unusable.
3. Is "nothing is relevant enough — inject nothing" a state the protocol can
   even express today, and what do agents do with an empty result?
4. Does this need fixing before rc3's auto-injection multiplies it by every
   agent turn, or is it independent?

## Comments

- 2026-08-02: Filed from ticket `07`'s calibration. Deliberately left unbanded —
  it is a live defect in shipped 2.1.x behaviour rather than a 2.2.0 feature, and
  it does not gate the rc2 cut. Typed `grilling` because the fix is a design
  question, not a threshold change.
