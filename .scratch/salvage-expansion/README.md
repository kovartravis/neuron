# Salvage expansion — calibration evidence

Assets from [ticket 07 — Salvage Expansion for Weak Retrieval](../neuron-2.2.0/issues/07-query-expansion.md),
which was **ruled out of scope on 2026-08-02** on the strength of the numbers
below. Kept because the next person to ask *"is our retrieval weak, or is it
confidently wrong?"* should re-run this rather than rebuild it.

## Running it

```bash
node ./node_modules/vitest/vitest.mjs run \
  --config .scratch/salvage-expansion/vitest.probe.config.ts
```

Takes about a second against the real embedder on a 308-entry corpus. It writes
`calibration-results.json` beside itself. The probe is named `.probe.ts` rather
than `.test.ts` so a bare `vitest` run never collects it.

It reuses Pillar 7's `ADVERSARIAL_CASES` and `buildFiller` from
`test/e2e/adversarial-corpus.ts`, and recomputes cosine similarity the way
`src/index.ts` does — `embedQuery()` for the query (the asymmetric BGE prefix),
`embed()` for the passage, dot product — because `similarity` is computed inside
`queryVector` and discarded before results are returned.

## What it measures

Best top-1 cosine for four populations: adversarial queries retrieval got right,
adversarial queries it got wrong, nonsense queries with no answer in the corpus
at all, and the terse queries `CLAUDE.md`'s manual workaround names.

## Result (2026-08-02, sanity tier, 308 entries)

| population | n | min | max | mean |
|---|---|---|---|---|
| gold **not**@1 (retrieval WRONG) | 5 | 0.6824 | **0.9516** | 0.7779 |
| gold@1 (retrieval RIGHT) | 3 | **0.6548** | 0.8347 | 0.7518 |
| nonsense (no answer exists) | 5 | 0.5097 | 0.6173 | 0.5713 |
| terse (`git`/`tdd`/`db`/`wasm`) | 4 | 0.5061 | 0.6156 | 0.5561 |

Per case:

| case | family | gold rank | bestSim | bestScore |
|---|---|---|---|---|
| `decoy-retry-budget` | lexical-decoy | 4 | **0.9516** | 0.8750 |
| `decoy-index-rebuild` | lexical-decoy | 1 | **0.6548** | 0.9023 |
| `para-token-expiry` | paraphrase | — | 0.7475 | 0.8690 |
| `para-memory-growth` | paraphrase | 6 | 0.8196 | 0.8690 |
| `contra-storage-default` | contradiction | 1 | 0.8347 | 0.9254 |
| `contra-scan-category` | contradiction | 1 | 0.7658 | 0.9375 |
| `hop-cold-start` | multi-hop | 3 | 0.6824 | 0.8750 |
| `hop-ci-only-failure` | multi-hop | — | 0.6884 | 0.7896 |

## Three findings

**1. The similarity floor is inverted on ranking failure.** Queries retrieval got
*wrong* score *higher* than queries it got right. The single worst case,
`decoy-retry-budget` with its gold at rank 4, carries the highest similarity in
the whole set (0.9516); the best correct case carries the lowest (0.6548). Every
Pillar 7 failure is a *confidently wrong* retrieval, not a weak one. A floor set
anywhere useful fires on a case that is already correct and never fires on the
three that are not — which is ticket 07's own scope step 3 kill condition, met.

**2. The floor does separate "no answer exists".** nonsense and terse top out at
0.6173; every real query starts at 0.6548. A floor near **0.63** separates them.
The margin is thin (0.038) and n is small, but the separation is clean and it is
exactly the population `CLAUDE.md`'s *"try a broader keyword"* line describes.
This half of the finding is inherited by
[ticket 27](../neuron-2.2.0/issues/27-minscore-is-inert.md).

**3. ADR 0010 §2's stated premise is false.** It justified using raw
`similarity` over `score` on the grounds that *"the top hit of a nonsense query
still scores ≥ 0.75"*. Measured, nonsense queries score **0.4375–0.5565** while
real queries score **0.7896–0.9375** — on this corpus `score` separated the
no-answer population *better* than `similarity` did (margin 0.233 vs 0.038).

The §2 argument assumed `normRrf = 1.0` from a document ranking #1 in both the
semantic and the FTS list. A nonsense query produces **no FTS hits at all**, so
only one term of `rrfScore` is non-zero and `normRrf` caps at 0.5. The observed
0.4375 is exactly `0.75·0.5 + 0.25·((2−1)/4)` for the importance-2 filler.

That same arithmetic is what
[ticket 27](../neuron-2.2.0/issues/27-minscore-is-inert.md) is about: since the
top semantic hit always gets `normRrf ≥ 0.5`, its score can never fall below
0.375, so the default `minScore: 0.35` can never exclude it.
