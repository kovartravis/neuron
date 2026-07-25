# 01 — FTS5 Schema Migration & Triggers

**What to build:** Database schema version 4 migration in SQLite that creates the `learnings_fts` and `history_fts` external-content virtual tables, configures database-level triggers (`AFTER INSERT`, `AFTER DELETE`, `AFTER UPDATE`) to keep FTS indexes in sync automatically, and populates the index for existing database records.

**Blocked by:** None — can start immediately.

**Status:** resolved

- [ ] SQLite user_version 4 migration executes cleanly when opening a database.
- [ ] Virtual tables `learnings_fts` and `history_fts` are created using FTS5 external content mapping to `learnings` and `history`.
- [ ] Database-level triggers (`AFTER INSERT`, `AFTER DELETE`, `AFTER UPDATE`) are registered on `learnings` and `history`.
- [ ] Existing records in `learnings` and `history` are backfilled into `learnings_fts` and `history_fts`.
