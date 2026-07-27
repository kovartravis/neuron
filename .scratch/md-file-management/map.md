## Destination

A complete technical specification and issue roadmap for integrating `.md` file management into `neuron`, using `.neuronrc` configuration to control how learning and history are split, stored, and synced between local vector DB storage and human-readable Markdown (`.md`) files.

## Notes

- Feature set: `.neuronrc` config parser, Markdown storage adapter (`MdStorageAdapter`), dual-storage routing engine, Markdown vector sync engine, CLI `config` and `sync` subcommands.
- Configuration file: `.neuronrc` (JSON format, auto-detected by walking up CWD).
- Skills: `/domain-modeling`, `/codebase-design`.

## Decisions so far

- [`.neuronrc` Configuration Schema & Parser](.scratch/md-file-management/issues/01-neuronrc-config-schema-parser.md) — Schema for `.neuronrc` supporting storage modes (`vector-only`, `md-only`, `dual`, `split`), path mappings (`learnings.md`, `history.md`, `AGENTS.md`), routing filters, and fallback defaults.
- [Markdown File Storage Adapter](.scratch/md-file-management/issues/02-md-file-storage-adapter.md) — Parsing, reading, and writing frontmatter + section-structured markdown files for learnings and history entries.
- [Dual-Storage Routing Engine](.scratch/md-file-management/issues/03-dual-storage-router.md) — Core routing layer directing `neuron learn` and `neuron history` writes/queries across Vector DB and `.md` files based on `.neuronrc` rules.
- [Markdown Vector Sync Engine](.scratch/md-file-management/issues/04-markdown-vector-sync-engine.md) — Bidirectional synchronization and re-indexing between `.md` file changes and SQLite vector embeddings.
- [CLI Config & Sync Subcommands & Test Suite](.scratch/md-file-management/issues/05-cli-config-and-sync-commands.md) — `neuron config` and `neuron sync` commands along with end-to-end integration tests.

## Frontier

- [`.neuronrc` Configuration Schema & Parser](.scratch/md-file-management/issues/01-neuronrc-config-schema-parser.md)
- [Markdown File Storage Adapter](.scratch/md-file-management/issues/02-md-file-storage-adapter.md)
- [Dual-Storage Routing Engine](.scratch/md-file-management/issues/03-dual-storage-router.md)
- [Markdown Vector Sync Engine](.scratch/md-file-management/issues/04-markdown-vector-sync-engine.md)
- [CLI Config & Sync Subcommands & Test Suite](.scratch/md-file-management/issues/05-cli-config-and-sync-commands.md)
