# 0001: True Hybrid Search using FTS5 and RRF

We decided to implement true hybrid search for `neuron` to combine the strengths of exact keyword matches (SQLite FTS5) with semantic conceptual matches (BGE-small vector embeddings).

## Context
AI coding assistants query the memory store for rules and past task histories. Semantic search excels at conceptual lookup but struggles with exact strings, specific error codes, or function names (e.g., matching the exact text `"onnxruntime-node"` or `npm test`). To address this, we integrate keyword-based Full-Text Search.

## Decision
1. **FTS5 Indexes**: Create virtual tables `learnings_fts` and `history_fts` using SQLite's external-content FTS5 extension, mapping to the base tables and synced automatically using `AFTER INSERT`, `AFTER DELETE`, and `AFTER UPDATE` triggers.
2. **Query Parsing**: Tokenize the search input, clean punctuation, and build an FTS search string joining terms with `OR` and wildcard suffixes (e.g., `"word1"* OR "word2"*`).
3. **Rank Aggregation**: Implement Reciprocal Rank Fusion (RRF) with a rank-dampening constant $k = 60$ to merge semantic and FTS search results.
4. **Final Scoring**: Normalize the RRF score against its theoretical maximum of $2 / (k + 1)$ to fit `[0, 1]`, and linearly combine it with the normalized Importance rating (1–5) using the existing project weights:
   $$Score = 0.75 \times NormalizedRRF + 0.25 \times NormalizedImportance$$
