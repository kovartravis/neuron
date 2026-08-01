# neuron on LongMemEval-S — retrieval results

**Date:** 2026-08-01 · **neuron:** 2.2.0-rc1 · **Dataset:** LongMemEval-S, split `s`

> **Scope of this document.** These are **retrieval** results — how often neuron
> puts the gold evidence in front of the answering model. They are **not**
> end-to-end benchmark accuracy, and they are **not** comparable to published
> LongMemEval scores from other systems. See [What this is not](#what-this-is-not).

## Headline

Across all 500 questions of LongMemEval-S (479 scored, 23,867 documents):

| Metric | Result |
|---|---|
| **Recall@1** | 399/479 — **83.3%** |
| **Recall@5** | 461/479 — **96.2%** |
| **Recall@10** | 471/479 — **98.3%** |
| Cross-question leakage | **0** |

Retrieval is not the bottleneck. In the top 10 results neuron surfaces the gold
evidence for 98.3% of questions, and even at k=1 — a single document, no
second chance — it is correct 5 times in 6.

## By category

LongMemEval-S divides into six question types. Reported separately because a
blended average hides where the failures actually are.

| Category | n | @1 | @5 | @10 |
|---|---:|---:|---:|---:|
| single-session-assistant | 56 | 98.2% | 100.0% | 100.0% |
| knowledge-update | 72 | 90.3% | 100.0% | 100.0% |
| multi-session | 125 | 86.4% | 99.2% | 100.0% |
| temporal-reasoning | 132 | 78.8% | 91.7% | 96.2% |
| single-session-user | 64 | 73.4% | 95.3% | 98.4% |
| single-session-preference | 30 | 66.7% | 90.0% | 93.3% |

Three observations, including the unflattering ones:

- **`multi-session` reaches 100%@10.** The category usually assumed hardest —
  evidence spread across many sessions — is fully recovered.
- **`temporal-reasoning` is the weakest at scale.** It is the only category still
  missing evidence at k=10 (96.2%) and it is 26% of the suite. Systems built
  around temporal knowledge graphs would be expected to lead here.
- **`single-session-preference` is the weakest overall** (66.7%@1, 93.3%@10) —
  and it is the "remember what the user likes" case that memory products are
  usually sold on. n=30, so treat this as a signal rather than a verdict.

## Latency

| | p50 | p95 |
|---|---:|---:|
| Retrieval per query | 634 ms | 1686 ms |
| Ingestion | 43 ms/doc | — |

Measured on an Apple Silicon laptop, single process, local ONNX embeddings, no
network. Retrieval latency is materially higher than on a small store: an
earlier 60-question run measured p50 56 ms / p95 108 ms with identical
per-question corpus sizes, so cost grows with total store size rather than with
the size of the isolation unit being searched.

## Method

- **Harness:** [vectorize-io/agent-memory-benchmark](https://github.com/vectorize-io/agent-memory-benchmark) (AMB), `longmemeval` dataset, split `s`.
- **Isolation:** LongMemEval declares `isolation_unit = "question"`. Every
  document and query carries `user_id = question_id`, which maps to neuron's
  `scope` filter, so each question is answered only from its own haystack.
  Verified empirically: **0 cross-unit documents** appeared in any result set
  across 500 queries.
- **Retrieval:** neuron's hybrid search — `bge-small-en-v1.5` (q8 ONNX) dense
  vectors fused with SQLite FTS5 keyword search by Reciprocal Rank Fusion.
- **Scoring:** a question counts as a hit at k if any of its `gold_ids` appears
  in the top k. No LLM is involved at any point, so these figures are
  deterministic and reproducible for zero API cost.
- **Reproduce:** see [`benchmarks/longmemeval/README.md`](../../benchmarks/longmemeval/README.md).

## What this is not

**This is not end-to-end benchmark accuracy.** A full LongMemEval score requires
an answering model to read the retrieved context and an LLM judge to grade the
answer. Neither ran here. Published figures such as AMB's `hindsight` 94.6% or
`hybrid-search` 74.0% are end-to-end accuracy on the same dataset and are
**not comparable to the numbers above** — they measure a different thing.

**21 of 500 questions were not scored.** They carry no `gold_ids` in the
harness. LongMemEval includes an abstention ability — knowing when *not* to
answer — and nothing here measures it. neuron has no abstention path today; it
returns best-effort matches.

**Retrieval quality is a ceiling, not a score.** Perfect retrieval does not imply
correct answers; the answering model can still misread correct evidence. Prior
work on this store found exactly that failure mode — retrieval succeeded fully
while the answering model over-reasoned on the retrieved context.

**Single run, single machine.** No repeats, no confidence intervals. Retrieval
is deterministic, so re-runs should be stable, but hardware differences will move
the latency figures.

## Reproducing

```bash
git clone --depth 1 https://github.com/vectorize-io/agent-memory-benchmark.git
cd agent-memory-benchmark
uv sync --python 3.12
# copy in the neuron adapter — see benchmarks/longmemeval/README.md
uv run python scripts/retrieval_eval.py all
```

No API key required. Runtime ≈ 20 minutes for the full suite.
