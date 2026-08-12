Type: research
Status: unclaimed
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

(none yet)

## Comments
