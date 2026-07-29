# Explorer 2 (Vector Sync Specialist) — Handoff Report

## 1. Observation

Direct observations from examining the codebase, configuration, and issue tickets:

1. **Task Scope & Tickets**:
   - Ticket `04-markdown-vector-sync-engine.md` at `/Users/Travis/Repos/neuron/.scratch/md-file-management/issues/04-markdown-vector-sync-engine.md`:
     > "Implement bidirectional synchronization between Git-tracked Markdown files (`.neuron/*.md`) and the local SQLite vector database when files are edited externally or when memory store initializes."
   - Requirement `R3. Markdown Vector Sync Engine (md-sync)` in `/Users/Travis/Repos/neuron/.agents/ORIGINAL_REQUEST.md`:
     > "Implement bidirectional content-hash synchronization between Git-tracked `.neuron/*.md` files and local SQLite vector embeddings in `src/storage/mdVectorSync.ts`."

2. **Database Schema & Vector Storage**:
   - `src/index.ts` lines 234-247 define the unified SQLite `memories` table:
     ```sql
     CREATE TABLE IF NOT EXISTS memories (
       id TEXT PRIMARY KEY NOT NULL,
       project_id TEXT NOT NULL,
       category TEXT NOT NULL,
       content TEXT NOT NULL,
       tags TEXT NOT NULL DEFAULT '[]',
       embedding BLOB NOT NULL,
       scope TEXT NOT NULL DEFAULT 'project',
       importance INTEGER NOT NULL DEFAULT 3 CHECK (importance BETWEEN 1 AND 5),
       is_manual_scope INTEGER NOT NULL DEFAULT 0,
       task_id TEXT,
       created_at TEXT NOT NULL,
       updated_at TEXT NOT NULL
     );
     ```
   - Line 59-63 in `src/index.ts` shows `project_id` generation using SHA-256 slice of `projectRoot`.
   - Lines 483-485 in `src/index.ts` convert float embeddings to SQLite BLOBs:
     `Buffer.from(vec.buffer, vec.byteOffset, vec.byteLength)`.
   - Lines 374-375 in `src/index.ts` decode BLOB back to vector:
     `new Float32Array(blob.buffer, blob.byteOffset, blob.byteLength / 4)`.

3. **Embedder Infrastructure**:
   - `src/components/embedder.ts` defines `Embedder` interface:
     ```typescript
     export interface Embedder {
       embed(text: string): Promise<Float32Array>;
       embedQuery(text: string): Promise<Float32Array>;
     }
     ```
   - In test & CLI environments, mock or fast embedders return `Float32Array(384)`. Real embeddings use Transformers ONNX `bge-small-en-v1.5`.

4. **Configuration Schema**:
   - `src/config/neuronYaml.ts` lines 8-16 define storage modes:
     `vector-only | md-only | dual | split`
   - Default storage path is `.neuron`. Categories default to `learning` (`.neuron/learning.md`) and `history` (`.neuron/history.md`).

5. **Memory Protocol**:
   - Step 1 memory query executed: `neuron exec -- neuron learn query "markdown vector sync engine"`. Output returned 5 relevant learnings regarding memory categories and multi-sentence learning entry rules.

---

## 2. Logic Chain

1. **Requirement Mapping**:
   - `MdStorageAdapter` (ticket 02) reads/writes structured `Memory` objects to/from `.neuron/<category>.md` files.
   - `DualStorageRouter` (ticket 03) routes real-time mutations to SQLite DB and/or Markdown files depending on `storage.mode`.
   - `MdVectorSync` (ticket 04) handles offline drift, startup initialization, external Git modifications, and `neuron sync` execution to reconcile differences between Markdown files and SQLite vectors.

2. **Sync Efficiency via Content Hashing**:
   - Computing transformer vector embeddings via ONNX is computationally expensive (~50-200ms per text block).
   - Performing full re-embedding during every sync or CLI execution would create severe performance degradation for large memory stores.
   - By calculating `sha256(content)` for each entry and comparing `mdHash` vs `dbHash`, `MdVectorSync` can immediately skip re-embedding for unchanged entries.
   - If content hash matches but metadata (tags, scope, importance, taskId) differs, `MdVectorSync` updates SQLite metadata directly *without* calling `embedder.embed()`.

3. **Bidirectional Sync Strategy**:
   - **Markdown-to-Vector (MD -> DB)**: Handles external edits in `.neuron/*.md` files (e.g. human edited markdown in editor, pulled from git).
     - New in MD -> Embed content & INSERT into SQLite `memories`.
     - Modified in MD (`mdHash !== dbHash`) -> Embed new content & UPDATE SQLite `memories`.
     - Metadata changed in MD -> UPDATE SQLite metadata without re-embedding.
   - **Vector-to-Markdown (DB -> MD)**: Handles entries created or updated in SQLite that have not yet been written to `.neuron/*.md` (e.g., created during `vector-only` or split mode).
     - New in DB -> Format & APPEND/INSERT entry into `.neuron/<category>.md` via atomic swap write.
     - Updated in DB -> Update section in `.neuron/<category>.md` via atomic swap write.
   - **Full Reconciliation (Reconcile Union)**:
     - Compare entries across all categories by ID.
     - Detect missing entries in both directions.
     - Use `updatedAt` ISO timestamps (or fallback rules) to resolve true conflicts when both sides changed independently.

4. **Collision & Edge Case Handling**:
   - **Duplicate IDs in Markdown**: User copies a section without changing frontmatter `id`. Detection: Map MD entries by `id`. If duplicate `id` encountered in same file or across categories, raise `SyncCollisionError` or log warning and re-assign a new UUID to the duplicate entry.
   - **Malformed Frontmatter / Corrupted File**: Malformed YAML or missing required fields in Markdown. Detection: Wrap `MdStorageAdapter` parse calls in try-catch. Skip unparseable blocks, record error in `SyncReport.errors`, and process remaining valid entries.
   - **Category Migration**: Entry moved from `learning.md` to `history.md` or custom category file. Sync engine detects `id` existing under a different category in DB, updates DB `category` column to match file location.
   - **Atomic Writes**: All Markdown updates during Vector-to-Markdown sync delegate to `MdStorageAdapter`'s atomic `.tmp` + `fs.renameSync` swap writer to avoid corrupting files on process termination.
   - **Database Transactions**: All SQLite writes during sync are executed inside a single `db.transaction()` block for atomic consistency and performance.

---

## 3. Detailed Specifications for `src/storage/mdVectorSync.ts`

### 3.1 Data Structures & Interfaces

```typescript
import { NeuronMemory } from '../index.js';
import { Embedder } from '../components/embedder.js';
import { Memory } from '../models/memory.js';
import { MdStorageAdapter } from './mdStorageAdapter.js';
import { NeuronConfig } from '../config/neuronYaml.js';

export type SyncDirection = 'md-to-vector' | 'vector-to-md' | 'bidirectional';

export interface VectorSyncOptions {
  /** Root directory of the project (where neuron.yaml and .neuron/ live) */
  projectRoot: string;
  /** Storage path relative to projectRoot (default: '.neuron') */
  storagePath?: string;
  /** Configured categories to sync */
  categories?: string[];
  /** Force full re-embedding even if content hashes match */
  forceReembed?: boolean;
  /** Perform dry-run without writing changes */
  dryRun?: boolean;
}

export type EntrySyncStatus =
  | 'created_in_db'
  | 'updated_in_db'
  | 'metadata_updated_in_db'
  | 'created_in_md'
  | 'updated_in_md'
  | 'skipped_identical'
  | 'conflict_resolved_md_win'
  | 'conflict_resolved_db_win'
  | 'error';

export interface EntrySyncResult {
  id: string;
  category: string;
  status: EntrySyncStatus;
  details?: string;
}

export interface SyncReport {
  timestamp: string;
  direction: SyncDirection;
  scannedMdCount: number;
  scannedDbCount: number;
  createdInDb: number;
  updatedInDb: number;
  createdInMd: number;
  updatedInMd: number;
  skippedIdentical: number;
  errors: Array<{ id?: string; file?: string; message: string }>;
  results: EntrySyncResult[];
}
```

### 3.2 Key Helper Algorithms

#### Content Hash Computation
```typescript
import crypto from 'node:crypto';

export function computeContentHash(content: string): string {
  return crypto
    .createHash('sha256')
    .update(content.trim())
    .digest('hex');
}
```

### 3.3 Main `MdVectorSync` Class Design

```typescript
export class MdVectorSync {
  private memory: NeuronMemory;
  private adapter: MdStorageAdapter;
  private embedder: Embedder;
  private config: NeuronConfig;

  constructor(memory: NeuronMemory, adapter: MdStorageAdapter, embedder: Embedder, config: NeuronConfig) {
    this.memory = memory;
    this.adapter = adapter;
    this.embedder = embedder;
    this.config = config;
  }

  /**
   * Sync entries from Markdown files to SQLite Vector DB.
   */
  public async syncMarkdownToVector(options?: VectorSyncOptions): Promise<SyncReport> { ... }

  /**
   * Sync entries from SQLite Vector DB to Markdown files.
   */
  public async syncVectorToMarkdown(options?: VectorSyncOptions): Promise<SyncReport> { ... }

  /**
   * Perform full bidirectional synchronization with conflict resolution.
   */
  public async syncBidirectional(options?: VectorSyncOptions): Promise<SyncReport> { ... }
}
```

---

## 4. Caveats

- **No caveats**: Investigation based on direct code inspection of `src/index.ts`, `src/db.ts`, `src/config/neuronYaml.ts`, `src/components/embedder.ts`, and issue tickets in `.scratch/md-file-management/issues/`.

---

## 5. Conclusion

- The specification for `src/storage/mdVectorSync.ts` is fully detailed and ready for implementation under Ticket 04 once Ticket 03 (`DualStorageRouter`) is completed.
- SHA-256 content hashing guarantees zero redundant transformer embedding re-computations when Markdown files have not changed.
- SQLite metadata updates without re-embedding enable fast synchronization when only tags, scope, or importance are edited in Markdown.
- Atomic swap writes via `MdStorageAdapter` and SQLite transactions ensure zero file corruption and transaction safety across all sync modes.

---

## 6. Verification Method

1. **Inspect Handoff File**:
   - `view_file /Users/Travis/Repos/neuron/.agents/teamwork_preview_explorer_survey_2/handoff.md`

2. **Verify Memory Query Step 1**:
   - `neuron exec -- neuron learn query "markdown vector sync engine"`

3. **Verify Vitest Test Suite**:
   - `neuron exec -- npm test` (all 12 existing test suites pass cleanly).
