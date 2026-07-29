# Project: md-file-management

## Architecture
Category-based Markdown file storage, dual storage mutation routing (vector-only, md-only, dual, split), bidirectional vector-markdown sync engine, CLI `neuron sync` command and init scaffolding.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | MdStorageAdapter | Category-based Markdown storage (.neuron/<category>.md), YAML frontmatter formatting, parsing, atomic swap writes (.tmp + fs.renameSync), scaffolding | M1 | Ticket 02 |
| 2 | DualStorageRouter | Mutation routing (insert, upsert, delete) across vector-only, md-only, dual, split modes | M2 | Ticket 03 |
| 3 | md-sync Engine | Bidirectional sync between .neuron/*.md and SQLite vector DB with content-hash comparison | M3 | Ticket 04 |
| 4 | CLI sync & scaffolding | `neuron sync` CLI command (--dry-run, --force) and `neuron init` scaffolding | M4 | Ticket 05 |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | MdStorageAdapter | `src/storage/mdStorageAdapter.ts`, tests | none | IN_PROGRESS |
| 2 | DualStorageRouter | `src/storage/dualStorageRouter.ts`, tests | M1 | PLANNED |
| 3 | md-sync Engine | `src/storage/mdVectorSync.ts`, tests | M2 | PLANNED |
| 4 | CLI sync & Scaffolding | `src/cli/commands/sync.ts`, `src/cli/commands/init.ts`, CLI tests | M3 | PLANNED |

## Interface Contracts
### MdStorageAdapter ↔ DualStorageRouter
- `MdStorageAdapter`: methods for `readCategory(category)`, `writeEntry(category, entry)`, `updateEntry(category, entry)`, `deleteEntry(category, id)`, `ensureDirectories()`.

### DualStorageRouter ↔ md-sync Engine
- `DualStorageRouter`: delegates mutations according to `storage.mode`.
- `md-sync`: reconciles `.neuron/*.md` files with SQLite vector DB embeddings using content hashes.

## Code Layout
- `src/storage/mdStorageAdapter.ts`
- `src/storage/dualStorageRouter.ts`
- `src/storage/mdVectorSync.ts`
- `src/cli/commands/sync.ts`
- `src/cli/commands/init.ts`
- `tests/`
