Type: research
Status: resolved

## Question

What is the SQLite database schema for storing rules/learnings and task/action history? How should vector search be implemented locally in Node.js (e.g., pure JS cosine similarity vs. a native binary extension like `sqlite-vec`)?

## Answer

- **SQLite client**: `better-sqlite3` — stable, synchronous, Node 18–24 LTS. `node:sqlite` is RC-status and absent on Node 20.
- **Schema**: Three tables — `meta` (key/value for version + project identity), `learnings` (id, project_id, content, tags TEXT JSON array, embedding BLOB 1536 bytes, created_at), `history` (same + nullable `task_id`). Indexes on `(project_id)` and `(project_id, created_at DESC)`. Partial index on `task_id WHERE NOT NULL`.
- **Tags**: JSON array string (`DEFAULT '[]'`) — display-only in v1; filterable via `json_each()` without schema change.
- **Embedding BLOB**: Raw 384 × float32 little-endian (1,536 bytes). Identical format to `sqlite-vec float[384]` — zero re-encoding cost for v2 migration.
- **Vector search v1**: Pure JS dot product (BGE embeddings are unit-normalised → cosine = dot product). < 1 ms at <10k rows.
- **Vector search v2**: `sqlite-vec` — additive schema migration when/if > 10k rows needed.
- **Migrations**: `PRAGMA user_version` + inline migration array in `db.transaction()`. Zero dependencies, 30 lines, < 1 ms on startup.
- **WAL mode**: Always enabled on DB open.

Full research: `.scratch/agent-memory-cli/research/03-db-schema-vector-engine.md`
