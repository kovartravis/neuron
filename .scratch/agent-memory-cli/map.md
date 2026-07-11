## Destination

A complete, detailed technical specification (PRD) for a local-only, TypeScript-based memory CLI (run via npx) that stores agent learnings and semantic action history.

## Notes

- Tech stack: TypeScript/Node.js, SQLite, Transformers.js (local-only embeddings).
- Installed/run via `npx`.
- Goal is design spec first, not implementation.

## Decisions so far

- [CLI Commands & JSON Schema](.scratch/agent-memory-cli/issues/01-cli-commands-schema.md) — Binary `neuron`, project-scoped via CWD root-detection, two namespaces (`learn`, `history`) each with `add`/`query`/`list`/`delete`, JSON to stdout always, minimal `add` response, scored `query` results (top-5 default), typed `status` command.
- [Model Selection](.scratch/agent-memory-cli/issues/04-model-selection.md) — `Xenova/bge-small-en-v1.5`, q8 quantized (~34 MB), 384-dim, 512-token context, MTEB 62.17, MIT license, CLS pooling. Cached to `~/.neuron/models`.
- [Storage Locations & Model Caching Flow](.scratch/agent-memory-cli/issues/02-storage-model-caching.md) — `env-paths { suffix: '' }` for OS-correct data dirs. Layout: `paths.data/models/` (→ `env.cacheDir`) + `paths.data/db/<sha256[:16] of project root>.sqlite`. `env.cacheDir` must be set explicitly (default is `./.cache`). Progress to stderr gated on TTY. No daemon in v1; isolate `initEmbedder()` for v2.
- [DB Schema & Vector Engine](.scratch/agent-memory-cli/issues/03-db-schema-vector-engine.md) — `better-sqlite3`; tables: `meta`, `learnings`, `history`; tags as JSON array TEXT; embedding as raw 1536-byte BLOB; pure JS dot product for v1 vector search (BGE vecs are unit-normalised); `PRAGMA user_version` migrations; WAL mode always on.
- [Memory Consolidation & Lifecycle](.scratch/agent-memory-cli/issues/05-memory-consolidation.md) — `neuron history consolidate` is explicit and cursor-based; `last_consolidated_at` watermark in `meta`; returns `{ entries, consolidatedAt, previousCursor, project }`; tool performs all reasoning; history kept forever (append-only); no dedup in v1.



## Not yet specified

- **Implementation Plan**: Graduating the finalized spec into build tasks (out of scope for this mapping session).
- **Harness Integration Guidelines**: How external agent harnesses should standardise environment variables or configuration for this CLI.

## Out of scope

- Cloud sync or multi-user sharing (this is a local-only CLI).
- Non-TS harness bindings (Python SDK, etc. - out of scope for the core CLI design).
