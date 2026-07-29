# 03 — Dual Storage Router (`DualStorageRouter`)

**What to build:** Implement `DualStorageRouter` to route memory mutations (`add`, `update`, `delete`) to both SQLite vector database and category-based `.md` files based on the configured `storage.mode` (`vector-only`, `md-only`, `dual`, `split`).

**Blocked by:** 02 — Markdown File Storage Adapter (`MdStorageAdapter`)

**Status:** resolved

- [x] Implement `storage.mode` routing logic (`vector-only`, `md-only`, `dual`, `split`).
- [x] Route `insert` and `upsert` mutations to `MdStorageAdapter` and SQLite DB based on configured mode.
- [x] Route `delete` mutations to both storage backends when operating in `dual` or `split` mode.
- [x] Ensure non-blocking error handling and consistent mutation return status across both backends.
- [x] Provide unit tests for routing mutations across all four storage modes.
