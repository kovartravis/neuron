# 28 — Reranker Research Findings

**Ticket:** [28 — Research: Find a Local ONNX Cross-Encoder Reranker](28-research-local-reranker-model.md)
**Depends on decision in:** [27's Answer](27-improve-gate-precision-decision.md#answer)
**Repo license check:** `LICENSE` file is MIT (confirmed by reading the file directly:
`MIT License / Copyright (c) 2026 Travis Kovar`). **Note:** `package.json`'s
`license` field is currently *absent* (not `"MIT"`, not anything) — only
`"LICENSE"` appears in the `files` array. This is a pre-existing metadata gap
unrelated to this ticket, flagged here since 27's decision leans on "matching
this project's own license posture." Apache-2.0 and MIT candidate models are
compatible with the repo's actual (file-level) MIT posture regardless of that
gap; it's a packaging polish item, not a blocker for 29.

## Summary

**Recommendation: `Xenova/ms-marco-MiniLM-L-6-v2`**, with
`mixedbread-ai/mxbai-rerank-xsmall-v1` as a documented backup if 29's pilot
finds L6-v2's MS-MARCO-only training too narrow for the store's actual query
distribution. Both are confirmed on the Hugging Face Hub to ship real ONNX
weights usable today via `@huggingface/transformers`'
`AutoModelForSequenceClassification`, both carry permissive licenses
(Apache-2.0), and both land inside or very near 27's 22M–100M parameter
expectation (22.7M and 70.8M respectively) — far below the current
500M-parameter chat model. L6-v2 is the safer default: it's a plain BERT
architecture (zero exotic-attention risk in transformers.js), it's the
existing, heavily-downloaded Xenova port already used by other
transformers.js RAG projects, and its on-disk footprint (23MB quantized) is
the smallest of any real candidate found. One strong-benchmark candidate
(`jinaai/jina-reranker-v1-turbo-en`) was rejected specifically because its
custom ALiBi/JinaBert architecture is not present in transformers.js's model
registry, despite having ONNX files and a clean license — a concrete instance
of the "don't assume from ONNX-file-presence alone" trap the ticket warned
about.

## Candidates evaluated

### 1. `Xenova/ms-marco-MiniLM-L-6-v2` — RECOMMENDED

| Property | Finding |
|---|---|
| Confirmed ONNX | **Yes.** `onnx/model.onnx` (91MB fp32) plus `model_quantized.onnx`/`model_int8.onnx`/`model_uint8.onnx` (~23MB each), `model_fp16.onnx` (45.6MB), `model_q4.onnx` (55.2MB). [Files tab](https://huggingface.co/Xenova/ms-marco-MiniLM-L-6-v2/tree/main/onnx) |
| Params / size | 22.7M params (matches fp32 file size: 22.7M × 4B ≈ 91MB, checks out). Quantized (`q8`/`int8`) ≈ 23MB on disk — smaller than any other candidate checked. |
| License | **Apache-2.0**, per the upstream [`cross-encoder/ms-marco-MiniLM-L6-v2`](https://huggingface.co/cross-encoder/ms-marco-MiniLM-L6-v2) model card (the Xenova repo is a direct ONNX re-export of this checkpoint, tagged `base_model:cross-encoder/ms-marco-MiniLM-L6-v2`). Compatible with this project's MIT posture. |
| Benchmarks | MRR@10 on MS MARCO Dev: **39.01**. NDCG@10 on TREC-DL 2019: **74.30**. Source: [cross-encoder/ms-marco-MiniLM-L6-v2 model card](https://huggingface.co/cross-encoder/ms-marco-MiniLM-L6-v2). |
| Integration shape | Confirmed cross-encoder: `text-classification`/`BertForSequenceClassification` architecture, single query+passage pair concatenated through one forward pass, one relevance logit out. `BertForSequenceClassification` is a directly supported class in transformers.js's model registry ([transformers.js models API docs](https://huggingface.co/docs/transformers.js/v3.0.0/api/models)). This is the exact architecture pattern `@huggingface/transformers` already runs in this repo for the embedder (`src/components/embedder.ts`, `Xenova/bge-small-en-v1.5`) and generator (`src/components/generator.ts`, `Xenova/Qwen1.5-0.5B-Chat`), so no new loader/runtime code path is needed — only a new `pipeline('text-classification', ...)` or manual `AutoModelForSequenceClassification` call. |

### 2. `Xenova/ms-marco-MiniLM-L-12-v2` — viable, not preferred over #1

| Property | Finding |
|---|---|
| Confirmed ONNX | **Yes.** `onnx/model.onnx` (134MB fp32), quantized variants ~34MB. [Files tab](https://huggingface.co/Xenova/ms-marco-MiniLM-L-12-v2/tree/main/onnx) |
| Params / size | 33.4M params (134MB fp32 ÷ 4B/param checks out). Quantized ≈ 34MB. |
| License | **Apache-2.0**, per [`cross-encoder/ms-marco-MiniLM-L12-v2`](https://huggingface.co/cross-encoder/ms-marco-MiniLM-L12-v2) model card. |
| Benchmarks | MRR@10 (MS MARCO Dev): **39.02**. NDCG@10 (TREC-DL 19): **74.31**. Source: same model card as above. |
| Integration shape | Identical to #1 — same `BertForSequenceClassification` cross-encoder shape, twice the layers. |

Rejected in favor of #1 for one reason: **the extra 6 layers and ~47% larger
on-disk footprint buy essentially nothing** — MRR@10 39.02 vs 39.01, NDCG@10
74.31 vs 74.30. Not a meaningful accuracy delta to justify the size, given 27
explicitly wants this model small. Worth keeping as a documented fallback
only if L6-v2 underperforms in 29's pilot for a reason layer depth would
plausibly fix.

### 3. `mixedbread-ai/mxbai-rerank-xsmall-v1` — viable backup

| Property | Finding |
|---|---|
| Confirmed ONNX | **Yes, in the base repo itself** (not a separate Xenova mirror — Mixedbread shipped ONNX natively): `onnx/model.onnx` (284MB fp32) and `onnx/model_quantized.onnx` (87.2MB int8). Merged via [PR #1 "Add ONNX weights"](https://huggingface.co/mixedbread-ai/mxbai-rerank-xsmall-v1/discussions/1), merged 2024-02-29. [Files tab](https://huggingface.co/mixedbread-ai/mxbai-rerank-xsmall-v1/tree/main/onnx) |
| Params / size | 70.8M params per the [model card](https://huggingface.co/mixedbread-ai/mxbai-rerank-xsmall-v1). Quantized on-disk ≈ 87MB. |
| License | **Apache-2.0**, per the same model card. |
| Benchmarks | NDCG@10: **43.9** and Accuracy@3: **70.0**, both on an 11-dataset BEIR subset per the [Mixedbread model card](https://huggingface.co/mixedbread-ai/mxbai-rerank-xsmall-v1) / [mixedbread.com model docs](https://www.mixedbread.com/docs/models/reranking/mxbai-rerank-xsmall-v1). Not directly comparable to the MiniLM candidates' MS MARCO/TREC-DL numbers (different benchmark suite), but BEIR is a broader generalization test than MS MARCO alone. |
| Integration shape | Confirmed cross-encoder: architecture is `DebertaV2ForSequenceClassification`, single-pair-in/single-logit-out, explicitly documented as loadable via `AutoTokenizer`/`AutoModelForSequenceClassification` in transformers.js in the model card's own JS usage example. `DebertaV2ForSequenceClassification` is a directly supported class in transformers.js ([models API docs](https://huggingface.co/docs/transformers.js/v3.0.0/api/models)). |

Kept as backup rather than primary: 3x the on-disk size of L6-v2 for a
benchmark suite that doesn't share a common yardstick with the MiniLM
numbers, and DeBERTa-v2's SentencePiece tokenizer is a second tokenizer
family this repo would need to support alongside BERT's WordPiece (used by
both the embedder and the MiniLM rerankers) — a real but modest integration
cost, not a blocker.

## Candidates checked and rejected

| Candidate | Reason for rejection |
|---|---|
| `Xenova/bge-reranker-base` (mirrors `BAAI/bge-reranker-base`) | ONNX **is** confirmed present (`onnx/model.onnx` 1.11GB fp32, `model_quantized.onnx` 279MB int8 — [files tab](https://huggingface.co/Xenova/bge-reranker-base/tree/main/onnx)) and license is fine (**MIT**, per [BAAI/bge-reranker-base model card](https://huggingface.co/BAAI/bge-reranker-base)). Rejected purely on **size**: 278M params is ~3–12x over 27's 22M–100M expectation for this model class, driven by the XLM-RoBERTa multilingual vocabulary this repo's English-dominant use case doesn't need. Two smaller candidates (#1, #3) already clear the bar with room to spare; no reason to pay the extra size for a marginal-fit candidate. |
| `BAAI/bge-reranker-v2-m3` | **No ONNX/transformers.js port found** on the Hub (checked the [model card](https://huggingface.co/BAAI/bge-reranker-v2-m3) directly — no ONNX files, no Xenova mirror located). Also **568M params** — larger than the 500M chat model this work is meant to sit below. Doubly disqualified: wrong size, no confirmed local-inference path. |
| `jinaai/jina-reranker-v1-turbo-en` | Best raw benchmark of everything checked (NDCG@10 **49.60** on BEIR, [model card](https://huggingface.co/jinaai/jina-reranker-v1-turbo-en)), Apache-2.0 license, 37.8M params, and **does** have real ONNX files in its repo (`onnx/model.onnx`, `model_quantized.onnx`, etc. — [API file listing](https://huggingface.co/api/models/jinaai/jina-reranker-v1-turbo-en)). Rejected anyway: its architecture is `JinaBertModel`/`JinaBertForSequenceClassification`, a custom BERT variant using symmetric bidirectional ALiBi attention bias, shipped with a `configuration_bert.py` custom-code file (i.e. it requires `trust_remote_code=True` in Python `transformers`). A GitHub code search of `huggingface/transformers.js` for "Jina" returned **zero matches** — there is no Jina-specific class in transformers.js's model registry. Loading this checkpoint through transformers.js's generic `model_type: "bert"` path would silently apply standard learned position embeddings instead of Jina's ALiBi bias — an architecture mismatch, not just an untested integration, and not something `@huggingface/transformers` can currently run correctly. This is the exact "verify against the Hub page, don't assume from ONNX-file-presence" trap the ticket called out: the ONNX file exists, but the *library* doesn't have the code to interpret it correctly. |
| `cross-encoder/ms-marco-MiniLM-L6-v2` / `-L12-v2` (original, non-Xenova) | Not rejected as candidates — these are the PyTorch originals cited above only as the license/benchmark source of truth for the Xenova ONNX ports (#1/#2). They are not ONNX themselves and aren't the thing that would actually get loaded; listed here only to be explicit that they weren't separately evaluated as an integration path. |

## Recommendation for ticket 29

Pilot **`Xenova/ms-marco-MiniLM-L-6-v2`** first:
- Smallest on-disk footprint of any real candidate (≈23MB quantized vs. the
  500M chat model it's meant to sit well below).
- Zero new architecture risk — plain BERT, same tokenizer family
  (WordPiece) already in use by the resident embedder, same
  `AutoModelForSequenceClassification`-via-`@huggingface/transformers`
  pattern already proven in this repo for the embedder and generator.
- Apache-2.0, cleanly compatible with the repo's MIT posture.
- Published MS MARCO Dev MRR@10 (39.01) and TREC-DL19 NDCG@10 (74.30) give
  27's acceptance bar (>5x false-accept reduction, ~zero new false-silence)
  a real, if modest, starting signal — this is a well-worn model for exactly
  this task, not a novel bet.

Keep `mixedbread-ai/mxbai-rerank-xsmall-v1` on the shelf as the fallback if
29's pilot shows L6-v2's MS-MARCO-only training generalizes poorly to this
store's actual (non-web-search-shaped) query/passage distribution — it's a
newer, BEIR-validated model at a still-small 70.8M params, just with a
second tokenizer family and 3x the size as the cost of admission.

No candidate should be built against `jina-reranker-v1-turbo-en` or
`bge-reranker-v2-m3` without first re-verifying transformers.js support has
changed — as of this research, neither clears the local-ONNX-availability
bar despite superficially looking like they should.
