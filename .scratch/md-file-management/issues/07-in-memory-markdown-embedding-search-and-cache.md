# 07 — In-Memory Markdown Vector Embeddings & Timestamp Invalidation

**What to build:** Enables `TransformersEmbedder` semantic search against `.neuron/*.md` entries in `md-only` mode. Automatically computes, ranks, and caches entry embeddings in-memory, invalidating the cache whenever `.md` file modification timestamps (`mtimeMs`) change on disk.

**Blocked by:** #06 — Native Markdown Storage Delegation in NeuronMemory

**Status:** completed

- [x] Embed query text and `.md` file contents using `TransformersEmbedder` in `md-only` mode.
- [x] Rank search results using dot-product semantic similarity.
- [x] Invalidate and refresh in-memory embeddings when `fs.statSync().mtimeMs` changes.
