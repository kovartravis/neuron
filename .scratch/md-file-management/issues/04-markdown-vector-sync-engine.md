# 04 — Markdown Vector Sync Engine

**Type:** feature ticket  
**Status:** ready-for-agent  
**Blocked by:** 03-dual-storage-router.md

## Description

Implement bidirectional synchronization between Markdown files and the SQLite vector index.

## Requirements

- Scan specified `.md` files for changes using file modification timestamps or content hashes.
- Extract learnings/history entries from markdown sections and update or insert corresponding vector embeddings in SQLite.
- Provide clean resolution when an entry is modified in `.md` or removed from vector storage.
- Support pre-exec auto-sync when `sync.autoSyncOnExec: true` is configured in `.neuronrc`.

## Verification Checklist

- [ ] Unit tests for parsing markdown file diffs and updating vector embeddings.
- [ ] Stale vector cleanup test when a markdown entry is deleted.
- [ ] Pre-exec auto-sync test harness.
