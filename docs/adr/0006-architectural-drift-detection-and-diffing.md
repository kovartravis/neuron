# 0006: Architectural Drift Detection and Diffing

We decided to implement static architectural drift detection and diffing in `@kovartravis/neuron` to track structural changes, un-documented modules, and export contract shifts across codebase iterations.

## Context
As software systems evolve, AST structures, module boundaries, export contracts, and package dependencies shift. Without explicit drift detection, memory cards stored in the `architecture` category risk becoming stale or desynchronized with live codebase topology.

## Decision
1. **Baseline Retrieval & Disambiguation**:
   - Query the target category (`config.scan.category`, defaulting to `architecture`) for memory entries tagged with `scan`.
   - Disambiguate AST scan cards from user-created Markdown notes or ADRs in the same category by filtering on tag `scan` and verifying the blueprint header (`# 🏛️ Repository Architectural Blueprint:`).

2. **In-Place Blueprint Upsert**:
   - When ingesting architectural scan results (`ingestScanResults`), locate existing scan entry `id` in the target category prior to calling `memory.transact`.
   - Pass the existing `id` into `memory.transact([{ op: 'upsert', id: existingId, ... }])` to update both the vector database (re-embedding) and Markdown storage (`.neuron/architecture.md`) in-place, preventing duplicate blueprint noise.

3. **4-Bucket Structural Diffing**:
   - Categorize codebase structural variance into four explicit buckets:
     1. `newModules`: Newly created directories, modules, or primary source files.
     2. `removedModules`: Deleted directories or primary source files.
     3. `exportChanges`: Added, modified, or deleted exported classes, interfaces, functions, and structs.
     4. `dependencyShifts`: Additions or removals in package manifests (`package.json`, `Cargo.toml`, `go.mod`, etc.).

4. **CLI Flags & Exit Codes**:
   - `neuron scan --diff`: Outputs structured Markdown or JSON diff reports between live AST topology and baseline memory cards.
   - `neuron scan --check`: Evaluates drift and exits with code `1` if structural drift is present (code `0` if clean) for CI/CD integration.
   - `neuron status`: Includes `{ drift: { hasDrift: boolean, changesCount: number } }` metadata.
   - `neuron exec`: Emits non-blocking `stderr` warnings when drift is detected if `config.scan.enabled` is `true`.
