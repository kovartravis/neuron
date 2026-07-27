# 02 — Markdown File Storage Adapter

**Type:** feature ticket  
**Status:** ready-for-agent  
**Blocked by:** 01-neuronrc-config-schema-parser.md

## Description

Implement `MdStorageAdapter` to handle reading, writing, and formatting learning and history entries in Markdown (`.md`) files.

## Requirements

- Support append and section-targeted insertions (e.g. inserting under `## Learnings` or specific headings).
- Format entries cleanly using standard markdown bullet points or fenced frontmatter metadata (`id`, `tags`, `importance`, `timestamp`).
- Support reading markdown entries into structured TypeScript objects (`LearningEntry`, `HistoryEntry`).
- Ensure safe atomic file writes and file creation when target `.md` files do not yet exist.

## Verification Checklist

- [ ] Unit tests for reading and writing to missing and existing `.md` files.
- [ ] Section targeting tests (inserting under specific headings).
- [ ] Frontmatter and markdown metadata parsing tests.
