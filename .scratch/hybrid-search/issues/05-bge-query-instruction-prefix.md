# 05 — BGE Query Instruction Prefix

**What to build:** Update `TransformersEmbedder` (and the `Embedder` interface) to distinguish between *passage* embedding (no prefix, used when storing learnings/history) and *query* embedding (prefixed with `"Represent this sentence for searching relevant passages: "`, used at search time). The current implementation applies the same call to both, which degrades retrieval quality.

**Source:** BAAI/bge-small-en-v1.5 model card — the query instruction prefix column confirms this applies to all v1.5 and v1 English BGE models.

> `Represent this sentence for searching relevant passages: `

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

---

## Why this matters

BGE models are trained with **asymmetric** embeddings:
- **Passages** are embedded with no prefix — the model learns a general-purpose dense representation.
- **Queries** are embedded with the instruction prefix — this steers the query vector into the same subspace as the relevant passage vectors, improving dot-product similarity scores.

Without the prefix, query vectors are mis-aligned with stored passage vectors. The model still works (it's robust), but retrieval quality is measurably lower — especially for short or ambiguous queries.

---

## Acceptance criteria

- [ ] `Embedder` interface gains a second method `embedQuery(text: string): Promise<Float32Array>` that prepends the BGE instruction prefix before embedding.
- [ ] `TransformersEmbedder.embedQuery` prepends `"Represent this sentence for searching relevant passages: "` and delegates to the same pipeline.
- [ ] `NeuronMemory.query()` calls `embedQuery` instead of `embed` when computing the query vector for semantic search.
- [ ] Passage embedding (`addLearning`, `addHistory`) continues to call `embed` (no prefix).
- [ ] The mock embedder used in tests implements `embedQuery` (can be a simple alias to `embed` in test context — the tests control vectors directly).
- [ ] All existing tests pass.
