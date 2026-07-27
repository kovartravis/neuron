# 03 — Dual-Storage Routing Engine

**Type:** feature ticket  
**Status:** ready-for-agent  
**Blocked by:** 02-md-file-storage-adapter.md

## Description

Implement the unified storage router that delegates `neuron learn` and `neuron history` read/write operations according to the active `.neuronrc` storage mode (`vector-only`, `md-only`, `dual`, `split`).

## Requirements

- Intercept `add`, `query`, `list`, and `delete` calls for both `learn` and `history` namespaces.
- Handle `dual` mode writes by updating both SQLite vector store and designated `.md` files.
- Handle `split` mode by evaluating tag and importance rules against `.neuronrc`.
- Merge and rank search results when querying across both vector DB and markdown files.

## Verification Checklist

- [ ] Unit tests for `vector-only`, `md-only`, `dual`, and `split` modes.
- [ ] Integration tests asserting write propagation to both SQLite and target `.md` files.
- [ ] Query deduplication and rank merging tests.
