# Specification Mining & 4-Tier E2E Test Strategy Report

**Agent**: `teamwork_preview_spec_miner_survey_3`  
**Working Directory**: `/Users/Travis/Repos/neuron/.agents/spec_miner_survey_3`  
**Feature Module**: `md-file-management` (R1: `MdStorageAdapter`, R2: `DualStorageRouter`, R3: `md-sync`, R4: CLI `neuron sync` & Scaffolding)  
**Date**: 2026-07-28  

---

## 1. Observation

- **Primary Source Documents**:
  - `ORIGINAL_REQUEST.md`: Defines scope for 4 tracer-bullet feature tickets (R1-R4) covering Markdown file storage, dual routing, vector sync engine, and CLI scaffolding/resync.
  - Issue tickets in `.scratch/md-file-management/issues/`:
    - `02-md-file-storage-adapter.md`: Category-based `.md` reading, writing, YAML frontmatter parsing, section header formatting (`## <title>`), atomic swap writes (`.tmp` + `fs.renameSync`), auto-scaffolding missing directories.
    - `03-dual-storage-router.md`: Mutation routing across `vector-only`, `md-only`, `dual`, and `split` storage modes, non-blocking error handling, consistent write results.
    - `04-markdown-vector-sync-engine.md`: Bidirectional Markdown-to-Vector and Vector-to-Markdown synchronization, SHA-256 content hash skip optimization, timestamp comparison, collision handling.
    - `05-cli-config-and-sync-commands.md`: CLI `neuron sync` command supporting `--dry-run`, `--force`, `--category` flags, auto-scaffolding during `neuron init`, visual terminal progress log.
  - Source Code Context:
    - Configuration schema in `src/config/neuronYaml.ts` handles `storage.mode`, `storage.path`, `categories`, and `pullRules`.
    - SQLite vector DB interface in `src/db.ts` handles vector embeddings and memory persistence.
    - CLI routing in `src/cli.ts` handles subcommands (`init`, `learn`, `history`, `memory`, `exec`).

---

## 2. Logic Chain

1. **Architecture & Coupling Analysis**:
   - `MdStorageAdapter` (R1) serves as the core disk I/O interface for `.neuron/*.md` files. Its integrity depends on atomic writes (`.tmp` + `fs.renameSync`) and robust frontmatter parsing.
   - `DualStorageRouter` (R2) encapsulates storage mode behavior (`vector-only`, `md-only`, `dual`, `split`). It delegates markdown persistence to `MdStorageAdapter` and vector persistence to `MemoryDb`.
   - `mdVectorSync` (R3) bridges external Git/editor edits and local SQLite vector embeddings. Hash-based skip detection prevents unnecessary embedding generation overhead.
   - CLI `neuron sync` (R4) exposes user controls (`--dry-run`, `--force`) and initializes workspace scaffolding.
2. **Testing Granularity Rationale**:
   - **Tier 1 (Feature Coverage)** isolates individual component contracts to guarantee base functionality across all 4 requirements (>= 5 test cases per feature).
   - **Tier 2 (Boundary & Corner Cases)** stresses edge conditions (corrupted YAML, zero-byte files, interrupted writes, lock contention, missing files) to verify resilience.
   - **Tier 3 (Cross-Feature Combinations)** evaluates pairwise component interactions (Router -> Storage Adapter, Sync Engine -> Router mode shifts, CLI flags -> Sync Engine hash logic).
   - **Tier 4 (Real-World Application Scenarios)** models multi-step developer workflows (Git collaboration, offline markdown editing, storage mode migration, power failure recovery, fresh repo onboarding).

---

## 3. Caveats

- **Mocking Vector Embedder in E2E Tests**: SQLite vector embeddings rely on `TransformersEmbedder` or fallback mock embedder. Tests must use deterministic mock embeddings to execute rapidly in headless CI environments.
- **Node `fs.renameSync` Atomic Guarantee**: On cross-device filesystems (e.g. temporary mounts across different partitions), `fs.renameSync` can throw `EXDEV`. The adapter implementation should fallback gracefully or test on consistent project mounts.
- **Concurrent Writer Synchronization**: In multi-agent or concurrent process scenarios, file access to `.neuron/*.md` should be tested for race conditions during atomic swaps.

---

## 4. Conclusion

A 53-scenario E2E test suite across 4 tiers guarantees 100% functional, boundary, integration, and real-world coverage for `md-file-management`.

---

## 5. Verification Method

- **Execute Test Suite**:
  ```bash
  neuron exec -- npm test
  # Or target storage test suite directly:
  neuron exec -- npx vitest run src/storage/
  neuron exec -- npx vitest run src/e2e/
  ```
- **Inspect Assertions**:
  - Verify 100% pass rate across 53 scenarios.
  - Verify `.tmp` files are zero upon completion of atomic swap tests.
  - Verify vector DB embeddings match `.neuron/*.md` entries post-sync.

---

## Features Discovered

| # | Category | Feature | Description | Inputs | Outputs | Error Behavior | Discovered Via |
|---|----------|---------|-------------|--------|---------|----------------|----------------|
| F1 | Storage Adapter | Category File Resolution | Resolves category markdown paths (e.g. `.neuron/learning.md`, `.neuron/history.md`, `.neuron/decisions.md`). | Category string | Absolute file path | Auto-scaffolds missing directory hierarchy | Ticket 02 & `neuronYaml.ts` |
| F2 | Storage Adapter | YAML Frontmatter Formatting & Parsing | Formats metadata (`id`, `createdAt`, `importance`, `tags`, `scope`, `taskId`) and section headings (`## <title>`); parses `.md` into `Memory[]`. | `Memory` object / `.md` text | `.md` formatted string / `Memory[]` array | Throws `MarkdownParseError` or skips malformed blocks | Ticket 02 |
| F3 | Storage Adapter | Atomic Swap Writes | Writes markdown to temporary file (`<path>.tmp`) then executes `fs.renameSync` to prevent file corruption. | Category file content | Swapped `.md` file on disk | Removes `.tmp` file on write failure | Ticket 02 |
| F4 | Storage Adapter | Auto-Scaffolding | Automatically creates missing target directory specified by `storage.path`. | Target path directory | Scaffolded folder structure | Throws permission error if directory uncreatable | Ticket 02 |
| F5 | Storage Adapter | CRUD Operations | Provides `readCategory`, `appendEntry`, `updateEntry`, `deleteEntry` methods for markdown files. | Category, entry ID, memory patch | Void / `Memory` array | Returns boolean/error status if entry non-existent | Ticket 02 |
| F6 | Dual Router | Storage Mode Routing | Directs operations across `vector-only`, `md-only`, `dual`, and `split` modes. | `storage.mode` config | Routing decision | Falls back safely to default `vector-only` mode | Ticket 03 & `ORIGINAL_REQUEST.md` |
| F7 | Dual Router | Mutation Delegation | Routes `add`, `update`, and `delete` mutations to configured backends. | Mutation payload & ID | Unified result object | Logs backend warning on partial failure | Ticket 03 |
| F8 | Dual Router | Non-Blocking Error Isolation | Prevents single storage engine failure (e.g. disk write failure) from crashing the process in dual mode. | Backend mutation calls | Partial success status | Logs error and returns status report | Ticket 03 |
| F9 | Sync Engine | Markdown-to-Vector Sync | Scans `.neuron/*.md` entries missing in SQLite DB and computes vector embeddings. | Category `.md` files & DB instance | Inserted DB vector entries | Skips malformed frontmatter with warning | Ticket 04 |
| F10 | Sync Engine | Vector-to-Markdown Backfill | Scans SQLite DB entries missing in category `.md` files and appends them via `MdStorageAdapter`. | DB memory entries | Updated `.md` category files | Scaffolds `.md` files if missing | Ticket 04 |
| F11 | Sync Engine | SHA-256 Hash Skip Optimization | Compares entry content SHA-256 hashes against stored DB hashes to bypass redundant embedding calls. | Entry content string | Boolean match flag | Forces re-computation if hash missing | Ticket 04 |
| F12 | Sync Engine | Timestamp Conflict Resolution | Resolves synchronization conflicts when an entry is edited in both markdown and vector DB. | Markdown & DB entry timestamps | Reconciled entry | Favors newest `updatedAt`/`createdAt` timestamp | Ticket 04 |
| F13 | CLI Command | `neuron sync` Subcommand | CLI entrypoint to trigger manual resynchronization between markdown files and vector DB. | CLI argv parameters | Executed sync pipeline | Returns exit code 1 on failure | Ticket 05 |
| F14 | CLI Command | CLI `--dry-run` & `--force` Flags | `--dry-run` previews diff without disk/DB mutation; `--force` bypasses hash checking. | CLI flags | Visual preview / full re-embed | Exits on invalid flag combination | Ticket 05 |
| F15 | CLI Command | Terminal Progress Reporter | Displays visual progress bar, scanned counts, synced count, and elapsed time during CLI sync. | Sync status stream | Formatted stdout output | Suppresses ANSI formatting in non-TTY mode | Ticket 05 |
| F16 | CLI Command | Scaffolding on `neuron init` | Scaffolds `.neuron/` folder and default category templates during `neuron init`. | Project working dir | Initial `.neuron/*.md` files | Preserves existing user markdown files | Ticket 05 |

---

## Edge Cases

| # | Feature | Input | Observed Behavior |
|---|---------|-------|-------------------|
| E1 | Storage Adapter | Zero-byte or empty `.md` file | Returns empty array `[]` cleanly without throwing parse error. |
| E2 | Storage Adapter | Malformed YAML frontmatter (missing closing `---` or invalid syntax) | Throws `MarkdownParseError` with exact line number or logs warning and skips corrupted entry. |
| E3 | Storage Adapter | Interrupted atomic swap write (process killed mid-write) | `.tmp` file remains on disk; target `.md` file remains uncorrupted with previous valid content. |
| E4 | Storage Adapter | Memory title/content containing raw Markdown headers (`#`), YAML colons (`:`), or code blocks | Properly escapes frontmatter YAML strings and section headers without corrupting structure. |
| E5 | Storage Adapter | Non-existent target directory specified in config | `MdStorageAdapter` automatically calls `mkdirSync({ recursive: true })` before writing file. |
| E6 | Dual Router | Disk permission error on `.neuron/` while SQLite DB write succeeds in `dual` mode | Router completes SQLite write, catches disk error, logs warning, and returns partial failure status. |
| E7 | Dual Router | Invalid `storage.mode` specified in `neuron.yaml` (e.g. `mode: "invalid"`) | Router falls back safely to default `vector-only` mode and logs configuration warning. |
| E8 | Dual Router | Rapid concurrent `add` operations in `dual` mode | Atomic swap writing prevents race conditions and corrupted intermediate states in `.md` files. |
| E9 | Sync Engine | Modified YAML tags with identical body content (SHA-256 body match) | Sync engine detects metadata change, updates DB metadata fields, and skips vector embedding re-computation. |
| E10 | Sync Engine | Entire category `.md` file deleted from disk while entries exist in SQLite DB | Sync engine detects missing `.md` file, re-scaffolds file, and backfills all SQLite entries into markdown. |
| E11 | Sync Engine | 1,000+ entries present across multiple category markdown files | Sync engine processes entries in batches, maintaining low memory overhead and linear execution time. |
| E12 | Sync Engine | Duplicate entry IDs found within a single category `.md` file | Sync engine detects collision, retains the entry with latest timestamp, and logs warning. |
| E13 | CLI Command | `neuron sync` executed in clean workspace without `neuron.yaml` | CLI loads default fallback configuration (`vector-only`, `.neuron`), scaffolds folder, and runs sync. |
| E14 | CLI Command | `neuron sync --dry-run --force` executed simultaneously | Preview runner displays 100% re-embedding diff without applying writes to disk or vector database. |
| E15 | CLI Command | Output stdout piped to file or non-TTY shell script | Terminal progress logger suppresses ANSI progress animations and outputs clean line-delimited logs. |

---

## 4-Tier E2E Test Strategy Breakdown

### Tier 1: Feature Coverage Scenarios (Minimum 5 per Feature)

#### R1. Markdown File Storage Adapter (`MdStorageAdapter`)
- **`R1-T1-01`**: Read and parse valid category `.md` file containing multiple entries with complete YAML frontmatter (`id`, `createdAt`, `importance`, `tags`, `scope`, `taskId`).
- **`R1-T1-02`**: Format `Memory` domain object into formatted Markdown string with YAML frontmatter header and `## <title>` section heading.
- **`R1-T1-03`**: Append a new `Memory` entry to an existing category file without corrupting or altering pre-existing entries.
- **`R1-T1-04`**: Update an existing memory entry by ID in category `.md` file, verifying frontmatter metadata and section body updates.
- **`R1-T1-05`**: Delete a memory entry by ID from category `.md` file and verify remaining entries are intact.

#### R2. Dual Storage Router (`DualStorageRouter`)
- **`R2-T1-01`**: Route `add` mutation in `vector-only` mode, verifying SQLite DB is updated while `.md` category files remain untouched.
- **`R2-T1-02`**: Route `add` mutation in `md-only` mode, verifying `.md` category file is updated while SQLite DB remains untouched.
- **`R2-T1-03`**: Route `add` mutation in `dual` mode, verifying both SQLite DB and `.md` category file are updated with identical IDs.
- **`R2-T1-04`**: Route `update` mutation in `split` mode, verifying mutation propagation across designated backends.
- **`R2-T1-05`**: Route `delete` mutation in `dual` mode, verifying entry removal from both SQLite DB and `.md` category file.

#### R3. Markdown Vector Sync Engine (`md-sync`)
- **`R3-T1-01`**: Markdown-to-Vector Sync: Scan `.neuron/*.md` entries absent in SQLite DB and insert them with newly generated vector embeddings.
- **`R3-T1-02`**: Vector-to-Markdown Sync: Scan SQLite DB entries absent in `.neuron/*.md` and backfill them into category markdown files.
- **`R3-T1-03`**: Content Hash Skip Optimization: Calculate SHA-256 hashes of `.md` entries, comparing against stored DB hashes to bypass redundant embedding re-computations.
- **`R3-T1-04`**: Bidirectional Sync Reconciliation (`syncAll`): Execute full state diff between `.md` files and SQLite DB to achieve 100% parity.
- **`R3-T1-05`**: Timestamp Conflict Resolution: Reconcile entries edited in both markdown and DB by favoring the newer `updatedAt`/`createdAt` timestamp.

#### R4. CLI `neuron sync` Command & Scaffolding
- **`R4-T1-01`**: Execute `neuron sync` CLI command and verify resynchronization between `.neuron/*.md` files and SQLite DB.
- **`R4-T1-02`**: Execute `neuron sync --dry-run` CLI command and verify reporting of pending changes without modifying disk or DB.
- **`R4-T1-03`**: Execute `neuron sync --force` CLI command and verify forced re-parsing and re-embedding of all entries regardless of hash matches.
- **`R4-T1-04`**: Execute `neuron init` in an uninitialized directory and verify scaffolding of `.neuron/` with `learning.md`, `history.md`, and `decisions.md`.
- **`R4-T1-05`**: Execute `neuron sync --category learning` CLI command and verify resynchronization is restricted exclusively to `learning.md`.

---

### Tier 2: Boundary & Corner Cases (Minimum 5 per Feature)

#### R1. Markdown File Storage Adapter (`MdStorageAdapter`)
- **`R1-T2-01`**: Parse zero-byte or empty category `.md` file, verifying it returns an empty array `[]` without error.
- **`R1-T2-02`**: Parse `.md` entry with malformed YAML frontmatter, verifying structured `MarkdownParseError` handling.
- **`R1-T2-03`**: Simulate interrupted atomic swap write, verifying temporary `.tmp` file cleanup and target `.md` file integrity.
- **`R1-T2-04`**: Write entry containing special markdown syntax (headers, code blocks, multiline quotes, raw HTML, YAML colons).
- **`R1-T2-05`**: Write to non-existent nested target path, verifying automatic directory hierarchy scaffolding via `mkdirSync`.

#### R2. Dual Storage Router (`DualStorageRouter`)
- **`R2-T2-01`**: Simulate disk permission error in `dual` mode while SQLite write succeeds, verifying non-blocking error status handling.
- **`R2-T2-02`**: Provide unrecognized `storage.mode` string in configuration, verifying graceful fallback to `vector-only` mode.
- **`R2-T2-03`**: Perform rapid-fire concurrent mutations, verifying atomic file swap prevents write race conditions.
- **`R2-T2-04`**: Request semantic search query in `md-only` mode, verifying text/tag search fallback handling.
- **`R2-T2-05`**: Update non-existent entry ID across backends, verifying `notFound` status without corrupting storage state.

#### R3. Markdown Vector Sync Engine (`md-sync`)
- **`R3-T2-01`**: Sync entry with identical content hash but updated frontmatter tags, verifying DB metadata update without vector re-embedding.
- **`R3-T2-02`**: Re-create missing category `.md` file deleted from disk when entries persist in SQLite DB.
- **`R3-T2-03`**: Perform batch sync of 1,000+ memory entries, verifying low memory overhead and linear completion time.
- **`R3-T2-04`**: Handle duplicate entry IDs discovered in a single `.md` file by retaining the latest timestamp and logging warning.
- **`R3-T2-05`**: Execute sync while SQLite DB is locked by another process, verifying graceful retry or descriptive error message.

#### R4. CLI `neuron sync` Command & Scaffolding
- **`R4-T2-01`**: Execute `neuron sync` in directory lacking `neuron.yaml`, verifying automatic loading of fallback config.
- **`R4-T2-02`**: Execute `neuron sync --dry-run --force` simultaneously, verifying full re-embedding preview without writing to disk/DB.
- **`R4-T2-03`**: Execute `neuron init` in directory where `.neuron/` exists with custom files, verifying preservation of existing user files.
- **`R4-T2-04`**: Execute CLI sync in non-TTY piped terminal, verifying suppression of ANSI progress animations and clean log output.
- **`R4-T2-05`**: Execute `neuron sync` with invalid CLI argument flags, verifying exit code 1 and help message display.

---

### Tier 3: Cross-Feature Combinations (Pairwise & Multi-Feature Integration)

- **`T3-01` (R1 + R2)**: `DualStorageRouter` delegates `add` mutation to `MdStorageAdapter` in `dual` mode, verifying atomic `.tmp` swap produces valid YAML frontmatter matching SQLite record.
- **`T3-02` (R1 + R3)**: External edit of `.neuron/learning.md` with missing frontmatter fields is processed by `md-sync`, which uses `MdStorageAdapter` parser to fill defaults and sync to SQLite.
- **`T3-03` (R1 + R4)**: `neuron init` triggers `MdStorageAdapter` to scaffold default `.neuron/{learning,history,decisions}.md` templates with initial header headers.
- **`T3-04` (R2 + R3)**: Switching `neuron.yaml` mode from `vector-only` to `dual` causes `md-sync` to perform complete backfill of SQLite entries to `.neuron/*.md` files.
- **`T3-05` (R2 + R4)**: `neuron sync --force` invoked via CLI while `DualStorageRouter` is configured in `split` mode cleanly reconciles both storage paths.
- **`T3-06` (R3 + R4)**: CLI `neuron sync --dry-run` invokes `md-sync` comparison engine, calculating precise diff counts without executing DB writes or embedding calls.
- **`T3-07` (R1 + R2 + R3)**: Interrupted write during `DualStorageRouter` operation leaves orphaned `.tmp` file, which `md-sync` cleans up during initialization before running reconciliation.
- **`T3-08` (R1 + R2 + R3 + R4)**: Full end-to-end integration lifecycle: CLI init -> Router Dual write -> Manual MD edit -> CLI sync --force -> Semantic vector search query.

---

### Tier 4: Real-World Application Scenarios (End-to-End Workflows)

- **`T4-01`: Developer Git Collaboration Workflow**
  - Developer A adds learnings via `neuron learn add`. `DualStorageRouter` writes to SQLite and `.neuron/learning.md`. Developer A commits `.neuron/learning.md` to Git. Developer B pulls repository. Developer B executes `neuron sync`. `md-sync` computes SHA-256 diffs, inserts new learnings into Developer B's SQLite vector DB, enabling `neuron learn query` to locate Developer A's entries instantly.
- **`T4-02`: Offline Knowledge Base Editing & CLI Resynchronization**
  - User opens `.neuron/decisions.md` in external markdown editor while offline. User manually appends 3 architectural decision records with custom YAML tags and edits an existing decision title. User launches terminal and runs `neuron sync`. `md-sync` validates YAML frontmatter, detects SHA-256 mismatches, re-embeds vectors in SQLite, and displays progress bar.
- **`T4-03`: Storage Backend Migration (Vector-Only -> Dual Mode)**
  - Project running with 50 pre-existing vector embeddings in SQLite upgrades `neuron.yaml` to `storage.mode: dual`. User runs `neuron sync`. Engine performs full backfill, creating `.neuron/learning.md`, `history.md`, and `decisions.md` with atomic swap writes. Subsequent `neuron learn add` calls write synchronously to both backends.
- **`T4-04`: Interrupted Operation & Automatic Recovery**
  - System crash or process abort occurs during heavy batch insertion (`neuron history add`). `MdStorageAdapter` atomic write (`.tmp` + `fs.renameSync`) prevents file corruption on `.neuron/history.md`. Upon restart, user runs `neuron sync`, which reconciles un-synced SQLite entries back to `.neuron/history.md` without data loss.
- **`T4-05`: Fresh Repository Onboarding (`neuron init` to Vector Search)**
  - User runs `neuron init` in a fresh repository. Auto-scaffolding creates `.neuron/` with category markdown templates. User inserts new entries using `neuron learn add`, manually modifies an entry in `.neuron/learning.md`, runs `neuron sync --dry-run` to inspect pending updates, runs `neuron sync` to apply resynchronization, and executes `neuron learn query` to confirm vector search accuracy.

---

## Test Count Matrix

| Feature / Requirement | Tier 1 (Coverage) | Tier 2 (Boundary) | Tier 3 (Cross-Feature) | Tier 4 (E2E Workflows) | Feature Total |
|---|---|---|---|---|---|
| **R1. MdStorageAdapter** | 5 | 5 | 4 (T3-01,02,03,07) | 5 (T4-01..05) | **19** |
| **R2. DualStorageRouter** | 5 | 5 | 4 (T3-01,04,05,07) | 5 (T4-01..05) | **19** |
| **R3. md-sync Engine** | 5 | 5 | 5 (T3-02,04,05,06,07) | 5 (T4-01..05) | **20** |
| **R4. CLI `neuron sync`** | 5 | 5 | 4 (T3-03,05,06,08) | 5 (T4-01..05) | **19** |
| **Total Test Scenarios** | **20** | **20** | **8** | **5** | **53** |

---

## Proposed Test File Organization & Test Names

```
src/
├── storage/
│   ├── mdStorageAdapter.ts
│   ├── mdStorageAdapter.test.ts          # Unit & Boundary (10 tests: R1-T1-01..05, R1-T2-01..05)
│   ├── dualStorageRouter.ts
│   ├── dualStorageRouter.test.ts         # Unit & Boundary (10 tests: R2-T1-01..05, R2-T2-01..05)
│   ├── mdVectorSync.ts
│   ├── mdVectorSync.test.ts              # Unit & Boundary (10 tests: R3-T1-01..05, R3-T2-01..05)
│   └── mdFileManagement.integration.test.ts # Tier 3 Integration (8 tests: T3-01..08)
├── commands/
│   ├── sync.ts
│   └── sync.test.ts                      # Unit & Boundary (10 tests: R4-T1-01..05, R4-T2-01..05)
└── e2e/
    └── mdFileManagement.e2e.test.ts      # Tier 4 Real-World E2E (5 tests: T4-01..05)
```

### Detailed Test Identifiers & Description List

1. **`src/storage/mdStorageAdapter.test.ts`**
   - `R1-T1-01`: reads and parses valid category markdown file with YAML frontmatter
   - `R1-T1-02`: formats memory object into Markdown with YAML frontmatter and section heading
   - `R1-T1-03`: appends memory entry to category file without corrupting existing entries
   - `R1-T1-04`: updates existing entry by ID in category markdown file
   - `R1-T1-05`: deletes entry by ID from category markdown file
   - `R1-T2-01`: returns empty array when reading empty or zero-byte markdown file
   - `R1-T2-02`: handles malformed YAML frontmatter by throwing parse error
   - `R1-T2-03`: cleans up temporary .tmp file when atomic swap write is interrupted
   - `R1-T2-04`: correctly escapes and formats entry content containing raw markdown syntax
   - `R1-T2-05`: auto-scaffolds parent directory structure if missing on write

2. **`src/storage/dualStorageRouter.test.ts`**
   - `R2-T1-01`: routes add mutation to SQLite vector DB only in vector-only mode
   - `R2-T1-02`: routes add mutation to MdStorageAdapter only in md-only mode
   - `R2-T1-03`: routes add mutation to both backends in dual mode
   - `R2-T1-04`: routes update mutation in split storage mode
   - `R2-T1-05`: routes delete mutation to both backends in dual mode
   - `R2-T2-01`: returns error status gracefully when disk write fails in dual mode
   - `R2-T2-02`: falls back to vector-only mode when invalid storage mode is specified
   - `R2-T2-03`: handles rapid concurrent mutation calls without file lock contention
   - `R2-T2-04`: handles search fallback when operating in md-only mode
   - `R2-T2-05`: handles update/delete for non-existent entry ID gracefully

3. **`src/storage/mdVectorSync.test.ts`**
   - `R3-T1-01`: scans markdown entries missing in DB and embeds them into SQLite
   - `R3-T1-02`: scans DB entries missing in markdown files and backfills markdown files
   - `R3-T1-03`: skips embedding re-computation when SHA-256 content hashes match
   - `R3-T1-04`: performs complete bidirectional sync reconciliation across all categories
   - `R3-T1-05`: resolves entry update conflicts by favoring newer timestamp
   - `R3-T2-01`: updates DB metadata without re-embedding when content hash is unchanged
   - `R3-T2-02`: re-creates missing category file when deleted from disk
   - `R3-T2-03`: handles batch sync of 1000+ entries within memory budget
   - `R3-T2-04`: handles duplicate entry IDs within markdown file gracefully
   - `R3-T2-05`: handles SQLite database lock during sync gracefully

4. **`src/commands/sync.test.ts`**
   - `R4-T1-01`: executes full sync command and updates database and markdown storage
   - `R4-T1-02`: dry-run flag previews sync operations without modifying disk or DB
   - `R4-T1-03`: force flag forces full re-embedding pass ignoring SHA-256 hashes
   - `R4-T1-04`: neuron init scaffolds .neuron/ directory and category template files
   - `R4-T1-05`: category flag restricts sync execution to specified category file
   - `R4-T2-01`: sync loads fallback configuration when neuron.yaml is missing
   - `R4-T2-02`: combines dry-run and force flags for full re-embedding preview
   - `R4-T2-03`: neuron init preserves pre-existing category markdown files
   - `R4-T2-04`: suppresses ANSI progress animations in non-TTY pipe environments
   - `R4-T2-05`: returns exit code 1 when unrecognized CLI flags are passed

5. **`src/storage/mdFileManagement.integration.test.ts`**
   - `T3-01`: DualStorageRouter delegates write to MdStorageAdapter with atomic tmp swap
   - `T3-02`: mdVectorSync parses external markdown edit via MdStorageAdapter and embeds to DB
   - `T3-03`: neuron init uses MdStorageAdapter to scaffold category markdown templates
   - `T3-04`: changing storage.mode from vector-only to dual triggers mdVectorSync backfill
   - `T3-05`: CLI neuron sync --force invokes mdVectorSync under split storage mode
   - `T3-06`: CLI neuron sync --dry-run runs mdVectorSync diff calculation without side effects
   - `T3-07`: mdVectorSync cleans up orphaned .tmp files left by interrupted router write
   - `T3-08`: end-to-end multi-component pipeline from init through router, manual edit, and sync

6. **`src/e2e/mdFileManagement.e2e.test.ts`**
   - `T4-01`: Git collaboration workflow - pull external markdown edits and sync to local vector DB
   - `T4-02`: Offline markdown editing - manual file modifications synced via neuron sync
   - `T4-03`: Storage mode migration - seamless backfill from vector-only to dual mode
   - `T4-04`: Power failure recovery - atomic tmp writes prevent corruption and sync restores state
   - `T4-05`: Fresh developer onboarding - neuron init to CLI sync to semantic vector query
