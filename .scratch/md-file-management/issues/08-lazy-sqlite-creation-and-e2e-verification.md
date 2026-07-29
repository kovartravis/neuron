# 08 — Bypassing SQLite File Creation in md-only Mode & E2E Verification

**What to build:** Completely bypass opening or creating `.sqlite` database files on disk when `storage.mode: md-only` is set in `neuron.yaml`. Verify zero `.sqlite` disk artifacts and 100% native Markdown operation across unit, integration, and E2E test suites.

**Blocked by:** #07 — In-Memory Markdown Vector Embeddings & Timestamp Invalidation

**Status:** completed

- [x] Skip SQLite `.sqlite` file creation on disk when `storage.mode: md-only` is configured.
- [x] Add unit and E2E integration test suites verifying native Markdown operation without SQLite files.
- [x] Ensure all 20+ test files pass cleanly.
