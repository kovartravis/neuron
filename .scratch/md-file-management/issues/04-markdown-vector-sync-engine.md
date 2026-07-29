# 04 — Markdown Vector Sync Engine (`md-sync`)

**What to build:** Implement bidirectional synchronization between Git-tracked Markdown files (`.neuron/*.md`) and the local SQLite vector database when files are edited externally or when memory store initializes.

**Blocked by:** 03 — Dual Storage Router (`DualStorageRouter`)

**Status:** resolved

- [x] Implement Markdown-to-Vector sync: parse `.neuron/*.md` entries and update SQLite vector embeddings for missing or modified entries.
- [x] Implement Vector-to-Markdown sync: write un-synced SQLite entries back to `.neuron/*.md` files.
- [x] Add content hash and timestamp comparison to prevent redundant embedding re-computations during sync.
- [x] Provide unit tests for sync reconciliation, collision handling, and partial file updates.
