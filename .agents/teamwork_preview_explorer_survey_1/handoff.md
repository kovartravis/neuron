# Codebase & Storage Survey Report (`handoff.md`)

## 1. Observation

### Existing Codebase & File Structure
- **Config parser & loader**: `src/config/neuronYaml.ts`
  - Defines `StorageModeEnum = z.enum(['vector-only', 'md-only', 'dual', 'split'])` (Lines 8-9).
  - Defines `StorageConfigSchema = z.object({ mode: StorageModeEnum.default('vector-only'), path: z.string().default('.neuron') })` (Lines 11-14).
  - Defines `NeuronConfigSchema` containing `storage`, `categories`, and `pullRules` (Lines 49-60).
  - Function `loadNeuronYaml(startDir)` / `loadConfig(startDir)` discovers and parses `neuron.yaml` / `neuron.yml` or returns `DEFAULT_CONFIG` (Lines 156-168).
  - Unit tests: `src/config/neuronYaml.test.ts` (6 tests passing).

- **Data Models & Types**: `src/models/memory.ts` & `src/models/index.ts`
  - `Memory` interface (Lines 16-28):
    ```typescript
    export interface Memory {
      id: string;
      category: string;
      kind: string; // deprecated, equals category
      content: string;
      tags: string[];
      scope?: string;
      importance?: number;
      taskId?: string | null;
      createdAt: string;
      score?: number;
    }
    ```
  - `MemoryMutation` type (Lines 30-36): union of `upsert`, `update`, `delete`.
  - `MutationResult` interface (Lines 38-42): `{ id: string; status: 'created' | 'updated' | 'deleted' | 'not_found'; project: string; }`.
  - `MemoryQuery` interface (Lines 4-14): `{ text?: string; category?: string; categories?: string[]; kind?: MemoryKind; scopes?: string[]; limit?: number; }`.

- **SQLite Vector Database Store**: `src/db.ts` & `src/index.ts`
  - `openDatabase(dbPath)` (Lines 73-85 of `src/db.ts`): loads `better-sqlite3` or native `node:sqlite` fallback `DatabaseSync`.
  - Class `NeuronMemory` (`src/index.ts`):
    - `initialize()` (Lines 110-324): executes migrations v1-v5. Migration v5 creates table `memories` and FTS index `memories_fts` with automated SQLite triggers (`memories_ai`, `memories_ad`, `memories_au`).
    - Table schema (`memories`):
      `id TEXT PRIMARY KEY`, `project_id TEXT`, `category TEXT`, `content TEXT`, `tags TEXT`, `embedding BLOB`, `scope TEXT`, `importance INTEGER`, `is_manual_scope INTEGER`, `task_id TEXT`, `created_at TEXT`, `updated_at TEXT`.
    - `transact(mutations: MemoryMutation[]): Promise<MutationResult[]>` (Lines 455-530): batches embedding generation via `Embedder` and updates SQLite `memories` table inside a single database transaction.
    - `query(q: MemoryQuery): Promise<Memory[]>` (Lines 328-453): performs hybrid search (cosine similarity on Float32Array vector embeddings + FTS5 rank fusion + importance weight).
    - `getStatus()` (Lines 683-713): reports memory metrics and category counts.

- **CLI Commands & Scaffolding**:
  - `src/cli.ts`: main CLI entrypoint dispatching commands: `init`, `exec`, `ui`, `status`, `memory`, `learn`, `history`.
  - `src/commands/init.ts`: handles `neuron init`, detects agent harnesses and copies `neuron-memory` skill folder.
  - `src/commands/utils.ts`: flag parser `parseFlags()` and helper functions.

- **Test Suite Results**:
  - Command: `neuron exec -- npm test`
  - Result: Exit code 0, 13 test files passed, 63 tests passed cleanly.

---

## 2. Logic Chain

1. **Current System State**:
   - The memory system currently relies exclusively on SQLite vector database storage (`NeuronMemory` in `src/index.ts`).
   - `neuron.yaml` configuration parsing is fully implemented in `src/config/neuronYaml.ts` (Ticket 01 resolved). It provides schema validation for `storage.mode` (`vector-only`, `md-only`, `dual`, `split`) and `storage.path` (defaults to `.neuron`).

2. **Integration Architecture for Remaining Tickets**:

   - **Ticket 02 — `MdStorageAdapter` (`src/storage/mdStorageAdapter.ts`)**:
     - *Role*: Low-level Markdown file reader/writer/parser managing category files (e.g. `.neuron/learning.md`, `.neuron/history.md`, `.neuron/decisions.md`).
     - *Directory Scaffolding*: `scaffoldStorageDir(storagePath)` ensures directory exists and initializes empty category `.md` files with headers if missing.
     - *Serialization / Parsing*:
       - Each entry is formatted with section headings (`## <title>` or content overview) and YAML frontmatter (`id`, `createdAt`, `importance`, `tags`, `scope`, `taskId`).
       - Example format:
         ```markdown
         ---
         id: 5b21e56a-7d84-4862-9284-2808226b34a4
         createdAt: 2026-07-27T01:41:08.133Z
         importance: 5
         tags:
           - memory
           - skill
         scope: project
         taskId: T-123
         ---
         ## Entry Title
         Detailed memory entry content...
         ```
     - *Atomic Swap Writes*: File mutations write to a temporary file (`.neuron/<category>.md.tmp.<timestamp>`) and swap atomically via `fs.renameSync` to prevent file corruption during interrupts.

   - **Ticket 03 — `DualStorageRouter` (`src/storage/dualStorageRouter.ts`)**:
     - *Role*: Facade and mutation router wrapping `NeuronMemory` and `MdStorageAdapter`.
     - *Routing Logic*:
       - `vector-only`: routes all `transact` calls directly to `NeuronMemory`.
       - `md-only`: routes all `transact` calls directly to `MdStorageAdapter`.
       - `dual`: routes mutations to both `MdStorageAdapter` AND `NeuronMemory`.
       - `split`: routes `learning` / key categories to `MdStorageAdapter` + `NeuronMemory`, while history/transient entries go to `NeuronMemory`.
     - *Error Handling*: Non-blocking execution ensuring failure in one backend produces clean error reports without corrupting the other.

   - **Ticket 04 — `MdVectorSyncEngine` (`src/storage/mdVectorSync.ts`)**:
     - *Role*: Resynchronization engine between Git-tracked `.neuron/*.md` files and SQLite vector database.
     - *Content Hashing*: Computes SHA-256 hash or compares ISO `createdAt`/`updatedAt` timestamps between MD frontmatter entries and SQLite DB records.
     - *Bi-directional Sync*:
       - `MD -> Vector`: Parses entries from `.neuron/*.md`. For missing or modified records, embeds content via `Embedder` and inserts/updates SQLite DB.
       - `Vector -> MD`: Queries SQLite DB entries. For any missing from `.neuron/*.md`, appends/writes to `.neuron/<category>.md` using `MdStorageAdapter`.

   - **Ticket 05 — CLI `neuron sync` Command & Scaffolding (`src/commands/sync.ts` & `src/cli.ts`)**:
     - *CLI Command*: Implements `neuron sync` supporting `--dry-run` and `--force` flags.
     - *Init Integration*: Updates `handleInitCommand` (`src/commands/init.ts`) to call `scaffoldStorageDir` during `neuron init`.

---

## 3. Caveats

- `src/storage` directory does not exist currently in the repository. It must be created as a new module directory (`src/storage/`).
- Markdown parsing must handle arbitrary multiline strings in content safely without corrupting frontmatter boundaries (`---`).
- SQLite vector DB relies on native embeddings generated via `TransformersEmbedder` (or `NEURON_MOCK_EMBEDDER`). When syncing MD entries to Vector DB, embeddings must be computed for all newly imported MD entries.

---

## 4. Conclusion

The codebase is well-structured and clean. All 63 existing tests pass. Ticket 01 (`neuron.yaml` config parser) is complete and fully tested. Tickets 02-05 can be implemented sequentially:
1. `src/storage/mdStorageAdapter.ts` (Ticket 02)
2. `src/storage/dualStorageRouter.ts` (Ticket 03)
3. `src/storage/mdVectorSync.ts` (Ticket 04)
4. `src/commands/sync.ts` & `src/cli.ts` (Ticket 05)

---

## 5. Verification Method

- **Build verification**: `neuron exec -- npm run build`
- **Test suite execution**: `neuron exec -- npm test`
- **File verification**: Check that `src/storage/mdStorageAdapter.ts`, `src/storage/dualStorageRouter.ts`, `src/storage/mdVectorSync.ts`, and `src/commands/sync.ts` are created and covered by unit tests.
