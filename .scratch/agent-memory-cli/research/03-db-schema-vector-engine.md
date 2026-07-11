# DB Schema & Vector Engine Research: `neuron` CLI

**Research date:** 2026-07-11  
**Scope:** SQLite schema design for `learnings` and `history` tables (384-dim embeddings), SQLite client selection (`better-sqlite3` vs `node:sqlite`), vector search approach (pure JS vs `sqlite-vec`), and schema migration pattern.

---

## Context

The `neuron` CLI stores two kinds of records per project:

- **Learnings** — persistent agent rules/conventions (`neuron learn add`)
- **History** — timestamped log of completed agent actions (`neuron history add`)

Constraints from prior tickets:
- Embedding model: `Xenova/bge-small-en-v1.5`, **384 float32 dims** = 1,536 bytes per BLOB
- DB location: `paths.data/db/<sha256[:16] of project root>.sqlite` (one file per project)
- Runtime: Node.js ≥ 20 LTS, distributed via `npx`
- IDs are UUIDs (from `add` response schema — issue 01)
- Tags are user-supplied as `--tags <tag,...>`; `task_id` is optional on `history add`

---

## A. SQLite Schema Design

### Decision: no separate `projects` table

Because each SQLite file *is* one project (filename = hash of project root), there is no need for a `projects` table. The string `project_name` (human-readable root directory basename) is stored as a single-row metadata entry in the `meta` table instead, alongside the schema version.

### A.1 `meta` table — schema version + project identity

```sql
CREATE TABLE IF NOT EXISTS meta (
  key   TEXT PRIMARY KEY NOT NULL,
  value TEXT NOT NULL
);

-- Seed rows (inserted during migration 1):
-- INSERT OR IGNORE INTO meta VALUES ('schema_version', '1');
-- INSERT OR IGNORE INTO meta VALUES ('project_root',   '/abs/path/to/project');
-- INSERT OR IGNORE INTO meta VALUES ('project_name',   'my-project');
```

`schema_version` is kept in sync with `PRAGMA user_version` (see §D). The `meta` table serves as a human-readable fallback if the DB file is inspected manually.

---

### A.2 `learnings` table

```sql
CREATE TABLE IF NOT EXISTS learnings (
  id         TEXT    PRIMARY KEY NOT NULL,          -- UUID v4, e.g. '550e8400-e29b-41d4-a716-446655440000'
  project_id TEXT    NOT NULL,                      -- sha256[:16] of project root (matches DB filename)
  content    TEXT    NOT NULL,                      -- the learning text
  tags       TEXT    NOT NULL DEFAULT '[]',         -- JSON array string, e.g. '["testing","ci"]'
  embedding  BLOB    NOT NULL,                      -- Float32Array serialised as little-endian BLOB, 384 × 4 = 1536 bytes
  created_at TEXT    NOT NULL                       -- ISO-8601 UTC, e.g. '2026-07-11T18:00:00.000Z'
);

CREATE INDEX IF NOT EXISTS idx_learnings_project
  ON learnings (project_id);

CREATE INDEX IF NOT EXISTS idx_learnings_created
  ON learnings (project_id, created_at DESC);
```

**Tags format decision — JSON array string (not junction table, not CSV):**

| Option | Pros | Cons |
|---|---|---|
| CSV `"testing,ci"` | Simple | No canonical escaping; splitting on `,` breaks on tags with commas |
| Junction table `learning_tags(learning_id, tag)` | Proper relational; filterable with `WHERE tag = ?` | 2 extra queries per insert/query; join complexity for a personal tool with <10k rows |
| JSON array `'["testing","ci"]'` | Self-describing; trivial to parse in TS (`JSON.parse`); no extra table; avoids CSV edge cases | Requires application-level parsing; no SQL `WHERE tag = ?` without FTS or JSON functions |

**Recommendation: JSON array string.** The query interface (`neuron learn query`) is semantic (embedding-based), not tag-filtered. Tags are stored for display in results and for `list` output only. SQLite's built-in `json_each()` can filter by tag if needed in future without a schema change.

---

### A.3 `history` table

```sql
CREATE TABLE IF NOT EXISTS history (
  id         TEXT    PRIMARY KEY NOT NULL,          -- UUID v4
  project_id TEXT    NOT NULL,                      -- sha256[:16] of project root
  task_id    TEXT,                                  -- optional external task/issue reference (--task-id flag)
  content    TEXT    NOT NULL,                      -- action summary text
  tags       TEXT    NOT NULL DEFAULT '[]',         -- JSON array string
  embedding  BLOB    NOT NULL,                      -- Float32Array, 384 × 4 = 1536 bytes
  created_at TEXT    NOT NULL                       -- ISO-8601 UTC
);

CREATE INDEX IF NOT EXISTS idx_history_project
  ON history (project_id);

CREATE INDEX IF NOT EXISTS idx_history_created
  ON history (project_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_history_task
  ON history (task_id)
  WHERE task_id IS NOT NULL;
```

`task_id` is nullable (no `NOT NULL` constraint) because `--task-id` is an optional flag. The partial index on `task_id WHERE task_id IS NOT NULL` avoids indexing NULLs.

---

### A.4 Embedding BLOB format

The embedding is stored as a raw little-endian `Float32Array` buffer — **no framing, no headers, no JSON serialisation**.

```typescript
// Serialise (store)
const vec: Float32Array = await embed(text); // 384 floats
const blob: Buffer = Buffer.from(vec.buffer); // 1536 bytes

// Deserialise (load)
function blobToFloat32(blob: Buffer): Float32Array {
  return new Float32Array(blob.buffer, blob.byteOffset, blob.byteLength / 4);
}
```

This is the format `sqlite-vec` also expects for its `float[384]` columns, making a future migration to `sqlite-vec` zero-cost.

---

### A.5 `neuron status` counts

```sql
SELECT COUNT(*) FROM learnings WHERE project_id = ?;
SELECT COUNT(*) FROM history   WHERE project_id = ?;
```

Both are O(1) with the `project_id` index.

---

## B. SQLite Client: `better-sqlite3` vs `node:sqlite`

### B.1 `node:sqlite` (built-in, Node.js 22+)

- Introduced in Node 22.5.0 behind `--experimental-sqlite` flag.
- As of mid-2026: **Stability 1.2 (Release Candidate)** — no longer behind a flag, but not formally stable.  
  Source: [nodejs.org/api/sqlite.html](https://nodejs.org/api/sqlite.html)
- Zero native addon — no precompiled binaries, no `node-gyp`.
- Supports `sqlite-vec` via `allowExtension: true` (Node 23.5+).
- **Risk:** API may still change; does not exist on Node 20 LTS.

### B.2 `better-sqlite3`

- Battle-tested native C++ addon. De-facto standard for Node.js SQLite.  
  Source: [npmjs.com/package/better-sqlite3](https://www.npmjs.com/package/better-sqlite3)
- Prebuilt binaries (via `prebuild-install`) for Node 18, 20, 22 LTS — macOS x64/arm64, Linux x64/arm64, Windows x64.
- Fully synchronous API: all DB calls are blocking — ideal for a CLI tool.
- `db.loadExtension()` works without restriction (bundles its own SQLite).  
  Source: [WiseLibs/better-sqlite3 README](https://github.com/WiseLibs/better-sqlite3)

### B.3 Recommendation: **`better-sqlite3`**

1. **Node 20 LTS compatibility**: `node:sqlite` doesn't exist on Node 20. `better-sqlite3` works on Node 18/20/22/24.
2. **Stability**: API is frozen and battle-tested. `node:sqlite` is still Release Candidate.
3. **Extension support**: `db.loadExtension()` reliably available for future `sqlite-vec` integration.
4. **Ecosystem**: TypeScript types (`@types/better-sqlite3`), wide community, large prior-art for CLI tools.

---

## C. Vector Search: Pure JS vs `sqlite-vec`

### C.1 Option 1 — Pure JS cosine similarity

Load all embedding BLOBs from SQLite, deserialise to `Float32Array`, compute cosine similarity (reduces to dot product for unit-normalised BGE vectors), sort, return top-k.

**Performance ceiling:**
- 1,000 rows = 1.5 MB in memory; ~384,000 multiply-adds ≈ **< 0.1 ms**
- 10,000 rows = 15 MB; ~3.84M multiply-adds ≈ **1–5 ms**
- 100,000 rows = 150 MB; memory becomes the bottleneck ≈ **10–50 ms**

No external JS library needed — a 15-line implementation suffices.

### C.2 Option 2 — `sqlite-vec`

Pure-C SQLite extension with AVX/NEON SIMD acceleration. `vec0` virtual tables for KNN search.  
Sources: [alexgarcia.xyz/sqlite-vec](https://alexgarcia.xyz/sqlite-vec/), [github.com/asg017/sqlite-vec](https://github.com/asg017/sqlite-vec), [npmjs.com/package/sqlite-vec](https://www.npmjs.com/package/sqlite-vec)

- npm package: `sqlite-vec` — precompiled, no `node-gyp`. Platform sub-packages auto-installed via `optionalDependencies`.
- Schema change: regular metadata table + `vec0` virtual table joined by `rowid`.
- Returns **distance** (lower = closer), not similarity — must convert: `score = 1 - distance`.

### C.3 Comparison

| Criterion | Pure JS | `sqlite-vec` |
|---|---|---|
| Extra dependencies | None | `sqlite-vec` + platform sub-packages |
| Performance at <10k rows | < 5 ms | < 1 ms |
| Performance at 100k rows | 10–50 ms | 2–5 ms |
| Schema complexity | Simple BLOB in main table | 2 tables (metadata + vec0 virtual) — must keep in sync |
| BLOB format compatibility | — | Identical — migration is additive, no re-encoding |

### C.4 Recommendation: **Pure JS dot product (v1), `sqlite-vec` upgrade path (v2)**

1. A personal memory store will realistically reach 100–2,000 rows — pure JS is < 1 ms at that scale.
2. Simpler schema, fewer native install-time dependencies, no two-table sync bugs.
3. BGE-small-en-v1.5 outputs unit-normalised vectors → cosine = dot product (no sqrt needed).
4. The raw BLOB format is already compatible with `sqlite-vec` — v2 migration is additive only.

**v1 implementation:**
```typescript
function queryTopK(
  db: Database.Database,
  projectId: string,
  queryVec: Float32Array,
  table: 'learnings' | 'history',
  k = 5
): QueryResult[] {
  const rows = db
    .prepare(`SELECT id, content, tags, created_at, embedding FROM ${table} WHERE project_id = ?`)
    .all(projectId) as RawRow[];

  return rows
    .map(row => ({
      ...row,
      score: dotProduct(queryVec, blobToFloat32(row.embedding as Buffer)),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, k)
    .map(r => ({
      id: r.id,
      content: r.content,
      score: r.score,
      tags: JSON.parse(r.tags),
      createdAt: r.created_at,
    }));
}

// Dot product (valid because BGE embeddings are unit-normalised)
function dotProduct(a: Float32Array, b: Float32Array): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
}
```

---

## D. Migration / Schema Versioning

### D.1 Pattern: `PRAGMA user_version` + inline migration array

SQLite has a built-in integer `user_version` header designed for schema versioning.  
Source: [SQLite PRAGMA user_version](https://www.sqlite.org/pragma.html#pragma_user_version)

```typescript
interface Migration {
  version: number;
  up: string;
}

const MIGRATIONS: Migration[] = [
  {
    version: 1,
    up: `
      CREATE TABLE IF NOT EXISTS meta (
        key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS learnings (
        id TEXT PRIMARY KEY NOT NULL, project_id TEXT NOT NULL,
        content TEXT NOT NULL, tags TEXT NOT NULL DEFAULT '[]',
        embedding BLOB NOT NULL, created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_learnings_project ON learnings (project_id);
      CREATE INDEX IF NOT EXISTS idx_learnings_created ON learnings (project_id, created_at DESC);
      CREATE TABLE IF NOT EXISTS history (
        id TEXT PRIMARY KEY NOT NULL, project_id TEXT NOT NULL,
        task_id TEXT, content TEXT NOT NULL, tags TEXT NOT NULL DEFAULT '[]',
        embedding BLOB NOT NULL, created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_history_project ON history (project_id);
      CREATE INDEX IF NOT EXISTS idx_history_created ON history (project_id, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_history_task ON history (task_id) WHERE task_id IS NOT NULL;
    `,
  },
];

export function runMigrations(db: Database.Database): void {
  db.pragma('journal_mode = WAL');
  const current = db.pragma('user_version', { simple: true }) as number;
  const pending = MIGRATIONS.filter(m => m.version > current);
  if (!pending.length) return;

  db.transaction((migrations: Migration[]) => {
    for (const m of migrations) {
      db.exec(m.up);
      db.pragma(`user_version = ${m.version}`);
    }
  })(pending);
}
```

Called once at DB open, before any command executes. `better-sqlite3` is synchronous — no async migration runner needed, no race conditions.

### D.2 No migration library needed

Libraries surveyed (`@blackglory/better-sqlite3-migrations`, `better-sqlite3-migrations`, Drizzle Kit) add complexity without benefit at this scale. The hand-rolled 30-line pattern above is zero-dependency and battle-tested.

### D.3 Startup sequence

```
npx neuron learn add "..."
  → resolve project root (walk CWD for package.json / .git)
  → compute sha256[:16] → DB filename
  → open better-sqlite3 DB (creates file if absent)
  → runMigrations(db)   ← < 1 ms on existing DB (PRAGMA read only)
  → initEmbedder()      ← loads ONNX model from models/ cache
  → INSERT + return JSON to stdout
```

---

## E. Complete Schema

```sql
-- ─── Meta ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS meta (
  key   TEXT PRIMARY KEY NOT NULL,
  value TEXT NOT NULL
);

-- ─── Learnings ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS learnings (
  id         TEXT    PRIMARY KEY NOT NULL,
  project_id TEXT    NOT NULL,
  content    TEXT    NOT NULL,
  tags       TEXT    NOT NULL DEFAULT '[]',
  embedding  BLOB    NOT NULL,
  created_at TEXT    NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_learnings_project ON learnings (project_id);
CREATE INDEX IF NOT EXISTS idx_learnings_created ON learnings (project_id, created_at DESC);

-- ─── History ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS history (
  id         TEXT    PRIMARY KEY NOT NULL,
  project_id TEXT    NOT NULL,
  task_id    TEXT,
  content    TEXT    NOT NULL,
  tags       TEXT    NOT NULL DEFAULT '[]',
  embedding  BLOB    NOT NULL,
  created_at TEXT    NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_history_project ON history (project_id);
CREATE INDEX IF NOT EXISTS idx_history_created ON history (project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_history_task    ON history (task_id) WHERE task_id IS NOT NULL;
```

---

## F. Recommendation Summary

| Decision | Choice | Rationale |
|---|---|---|
| **SQLite client** | `better-sqlite3` | Stable, synchronous, Node 18–24 LTS, `loadExtension()` available; `node:sqlite` is RC-status, requires Node ≥ 23.5 for extensions |
| **Tags storage** | JSON array TEXT (`DEFAULT '[]'`) | No junction table overhead; display-only in v1; filterable via `json_each()` without schema change |
| **Embedding storage** | Raw BLOB (384 × float32, 1,536 bytes) | Compact; zero-copy deserialisation; identical format to `sqlite-vec` float[384] |
| **Vector search v1** | Pure JS dot product | < 1 ms at <10k rows; BGE embeddings are unit-normalised → cosine = dot product; simpler schema |
| **Vector search v2** | Migrate to `sqlite-vec` | SIMD acceleration for > 10k rows; BLOB format already compatible; migration is additive |
| **Schema migrations** | `PRAGMA user_version` + inline array in `db.transaction()` | Zero dependencies; 30 lines; atomic; < 1 ms on startup after initial migration |
| **No `projects` table** | One SQLite file per project (filename = hash) | Project identity encoded in filename; `project_id` column retained for forward-compat |
| **WAL mode** | Always enabled on DB open | Crash safety; reduced lock contention |

---

## Sources

1. [github.com/asg017/sqlite-vec](https://github.com/asg017/sqlite-vec) — Extension API, `vec0` virtual table, KNN query syntax, SIMD details
2. [alexgarcia.xyz/sqlite-vec](https://alexgarcia.xyz/sqlite-vec/) — Node.js integration guide
3. [npmjs.com/package/sqlite-vec](https://www.npmjs.com/package/sqlite-vec) — Platform sub-packages, `optionalDependencies` pattern
4. [github.com/WiseLibs/better-sqlite3](https://github.com/WiseLibs/better-sqlite3) — Prebuilt binaries, `loadExtension()`, synchronous API
5. [nodejs.org/api/sqlite.html](https://nodejs.org/api/sqlite.html) — Stability 1.2 RC status, `DatabaseSync` API
6. [sqlite.org/pragma.html#pragma_user_version](https://www.sqlite.org/pragma.html#pragma_user_version) — Built-in schema version integer
7. [stackoverflow.com/a/70695756](https://stackoverflow.com/a/70695756) — Hand-rolled migration pattern with `user_version`
