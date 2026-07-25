# 14 — Importance & Maintenance Integration Test Suite

**What to build:** Comprehensive unit and CLI integration tests in `src/index.test.ts` and `src/cli.test.ts` asserting high-importance demotion locks, default `importance <= 3` history pruning, CLI `--importance` validation (1–5), and database schema integrity.

**Blocked by:** 10 — High-Importance (4–5) Scope Lock in Maintenance, 13 — Default History Pruning Threshold Update (`importance <= 3`)

**Status:** resolved

- [x] Test that `maintain({ autoPromote: true })` does not demote learnings with `importance >= 4`.
- [x] Test that `maintain({ pruneHistoryBeforeDays: 30 })` prunes entries with `importance <= 3` and retains `importance 4–5`.
- [x] Test CLI `--importance` flag bounds validation and database `CHECK` constraints.
