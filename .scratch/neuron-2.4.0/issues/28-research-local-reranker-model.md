Type: research
Status: resolved
Blocked by: none
Band: context cost

# 28 — Research: Find a Local ONNX Cross-Encoder Reranker

## Question

[27](27-improve-gate-precision-decision.md) decided the relevance gate's
false-accept problem should be fixed with a small local cross-encoder
reranker as a second-stage gate layer — not a chat model, not a remote API.
Which specific model should `29` pilot?

Deliverable: a markdown summary (linked asset) naming one or more concrete
candidates, each with:
- **Confirmed ONNX availability** for local inference via
  `@huggingface/transformers` (already a dependency, same tooling as the
  embedder and `Xenova/Qwen1.5-0.5B-Chat`) — an existing Xenova ONNX port is
  strongly preferred over requiring a fresh conversion.
- **Parameter count / on-disk size**, to confirm it lands meaningfully below
  the current 500M-parameter chat model, matching `27`'s 22M–100M
  expectation for this model class (MS MARCO MiniLM- and BGE-reranker-style
  models are the starting search space, not a prescribed answer).
- **License** — must permit local commercial/open-source redistribution
  matching this project's own license posture (check `LICENSE` /
  `package.json` before assuming compatibility).
- **Any published relevance/entailment benchmark numbers** (MS MARCO,
  BEIR, or similar), reported honestly even if unimpressive — this ticket
  is measurement-adjacent, not a sales pitch for one candidate.
- **Integration shape**: confirm the model exposes a single relevance score
  per (query, passage) pair via `AutoModelForSequenceClassification` (or
  equivalent), matching the "small candidate set, ≤`limit` per query"
  integration `27` specified — not a full re-embedding or re-ranking of the
  whole store.

If no candidate clears the local-ONNX-availability bar cleanly, report that
honestly rather than stretching a marginal fit — `27`'s local-only
constraint is a hard one, not a preference to work around.

## Answer

Full findings: [28-reranker-research.md](28-reranker-research.md) (linked asset).

**Recommendation: `Xenova/ms-marco-MiniLM-L-6-v2`**, with
`mixedbread-ai/mxbai-rerank-xsmall-v1` as a documented backup. Both are
verified on the Hugging Face Hub to ship real ONNX weights loadable today via
`@huggingface/transformers`'s `AutoModelForSequenceClassification`, carry
Apache-2.0 licenses (compatible with this repo's MIT posture — confirmed by
reading `LICENSE` directly; noted in passing that `package.json` itself has
no `license` field, a pre-existing packaging gap, not a blocker here), and
land inside or near `27`'s 22M–100M parameter expectation (22.7M and 70.8M
respectively) — far below the 500M-parameter chat model.

L6-v2 is the primary pick: plain `BertForSequenceClassification` architecture
(zero exotic-attention risk in transformers.js), same WordPiece tokenizer
family already used by this repo's embedder, smallest on-disk footprint of
any real candidate (~23MB quantized), and published MS MARCO Dev MRR@10
39.01 / TREC-DL19 NDCG@10 74.30 as a real (if modest) starting signal for
`27`'s acceptance bar. `mxbai-rerank-xsmall-v1` is the fallback if `29`'s
pilot finds L6-v2's MS-MARCO-only training too narrow for this store's real
query distribution — BEIR-validated, still small, but 3x the size and a
second (SentencePiece) tokenizer family.

One live-verified rejection worth flagging for future model searches:
`jinaai/jina-reranker-v1-turbo-en` had the best raw benchmark of anything
checked and real ONNX files, but its custom `JinaBertModel`/ALiBi
architecture has zero support in transformers.js's model registry — an
"ONNX file exists, but the library can't correctly run it" trap, exactly the
kind of assumption the ticket warned against. `BAAI/bge-reranker-v2-m3` has
no ONNX/JS port at all and is oversized (568M); `Xenova/bge-reranker-base`
has a valid ONNX port and MIT license but is 278M params, 3–12x over the
size bar.

Unblocks [29 — Build and Pilot the Reranker Gate
Layer](29-build-pilot-reranker-gate.md) directly (its only blocker).

## Comments
