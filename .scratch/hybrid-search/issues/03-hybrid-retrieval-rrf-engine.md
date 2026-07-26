# 03 — Hybrid Retrieval Engine & RRF Rank Fusion

**What to build:** The updated `NeuronMemory.query()` engine that executes both FTS keyword search and semantic vector similarity search, merges the ranked result lists using Reciprocal Rank Fusion ($k = 60$), normalizes the RRF score, and linearly combines it with user Importance ($0.75 \times NormalizedRRF + 0.25 \times NormalizedImportance$) to return the final sorted search results.

**Blocked by:** 01 — FTS5 Schema Migration & Triggers, 02 — FTS Query Sanitizer & Parser Utility

**Status:** resolved

- [ ] `NeuronMemory.query()` executes FTS `MATCH` search using `cleanFtsQuery` to obtain keyword rank ordering.
- [ ] `NeuronMemory.query()` executes semantic vector search to obtain vector rank ordering.
- [ ] Reciprocal Rank Fusion ($k = 60$) merges the two ranked lists into a normalized RRF score bounded in $[0, 1]$.
- [ ] Final scores combine normalized RRF (75%) and normalized Importance (25%), returning the top results sorted by score.
