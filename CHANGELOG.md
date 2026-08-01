# Changelog

All notable changes to `@kovartravis/neuron` will be documented in this file.

## [2.1.1] - 2026-08-01

### Fixed

- **Keyword-only matches on common words could outrank the correct result.**
  Hybrid search fuses its semantic and FTS legs with Reciprocal Rank Fusion,
  which rewards a document's rank *position* rather than how well it matched.
  Because query terms were joined with `OR` and every word was searchable, a
  document matching a single common word entered the FTS ranking — and when it
  was the only match, it entered at rank 1 and collected the full RRF
  contribution.

  Observed on a three-document store: the query *"what payment provider do we
  use"* returned a document about a Rust auth daemon at score `0.869`, above the
  correct billing document at `0.500`. The word `use` prefix-matched `used`,
  while the correct document matched no keyword terms at all.

  `cleanFtsQuery` now drops standard English stopwords and the FTS operator
  words, and deduplicates terms. A query made entirely of stopwords produces an
  empty expression, which is already handled as "no keyword leg" and answered
  semantically — better than a `MATCH` that hits every row.

  Short domain terms are deliberately preserved: `git`, `db` and `ci` are exactly
  the terse fallback queries the agent protocol recommends.

  This affects retrieval quality for every `neuron memory query`, `neuron exec`
  pre-command lookup, and drift-triggered recall. No configuration change or
  re-indexing is required — the fix applies at query time.

## [2.1.0] - 2026-07-31

The architecture-awareness release. Neuron can now read the shape of a codebase
into memory and tell an agent when that shape has changed underneath it.

### Added

- **Codebase Architecture Scanning (`neuron scan`)**: Walks project topology,
  parses tech-stack manifests (`package.json`, `Cargo.toml`, `go.mod`,
  `pyproject.toml`), extracts symbol contracts across 14 source extensions, and
  ingests a single **Repository Architectural Blueprint** card into the memory
  store with `bge-small-en-v1.5` embeddings. Flags: `--category`, `--depth`,
  `--dry-run`, `--format json|md`, `--json`, `--force`, `--no-progress`.
- **Architectural Drift Detection (`neuron scan --diff` / `--check`)**: Compares
  live topology against the stored blueprint and reports variance in four
  buckets — `newModules`, `removedModules`, `exportChanges`, `dependencyShifts`.
  `--check` exits `1` when drift is present, for CI gating. See ADR 0006.
- **Drift Surfaced Across Commands**: `neuron status` reports
  `drift: { hasDrift, changesCount, summary }`, and `neuron exec` emits a
  non-blocking `stderr` warning on drift — both gated on `scan.enabled`.
- **Drift Guard Fingerprint**: `src/scanner/fingerprint.ts` records a reconciled
  project fingerprint after each scan so subsequent queries skip redundant
  re-scans. Primed by both `neuron init` and `neuron scan`.
- **In-Place Blueprint Upsert**: Re-scanning updates the existing blueprint card
  by id in both the vector DB and `.neuron/<category>.md` rather than appending
  a duplicate.
- **Deep Code Summarizer**: `Xenova/Qwen1.5-0.5B-Chat` runs offline via ONNX to
  produce real semantic summaries of scanned modules and export contracts.
- **Scan Progress Indicator**: `ScanProgressBar` renders phase and percentage on
  `stderr`, keeping `stdout` clean for Markdown or JSON piping.
- **Deep E2E Benchmark & Correctness Suite (`npm run test:e2e`)**: 6-pillar
  adversarial suite under `test/e2e/` covering polyglot traversal at scale,
  distractor-resistant semantic recall, high-concurrency multi-agent stress,
  drift detection and latency SLAs, storage corruption self-healing, and real
  pipeline integrity. Driven by `benchmarks/e2e-runner.js`, with results in
  `benchmarks/reports/e2e-benchmark-scorecard.json`. See ADR 0007.
- **`architecture` Default Category**: Registered in the default config for
  blueprint cards.

### Changed

- **`neuron exec` uses the real embedder.** It previously forced
  `NEURON_MOCK_EMBEDDER=true`, which returns an all-zero vector and silently
  reduced pre-command lookup to keyword matching. Semantic retrieval now
  actually runs; set `NEURON_MOCK_EMBEDDER` yourself if you want the stub.
- **Default scan category is now `architecture`** (was `decisions`), in both the
  config schema default and `neuron init`.
- **`neuron memory list` and `query` no longer require `--category`.**
  `--category` is now required only for `add`, `delete`, and `update`.
- **`neuron learn` and `neuron history` are deprecated.** Both now print a
  deprecation warning to `stderr` and delegate to `neuron memory` with the
  corresponding `--category`. Behavior is otherwise unchanged; they will be
  removed in 3.0.0.
- **Packaged skill moved** from `.agents/skills/neuron-memory/` to
  `.claude/skills/neuron-memory/`, and the repo's `AGENTS.md` is now `CLAUDE.md`.
- **Benchmark scripts reworked**: `bench:sanity` / `bench:full` are replaced by
  `test:e2e`, `bench`, `bench:report`, and `bench:view`.
- **`npm test` is scoped to `--dir src`**, keeping the unit suite (~5s) separate
  from the E2E benchmark suite.

### Fixed

- **`neuron exec` no longer mangles quoted arguments.** It joined `argv` with
  spaces and re-ran the result through a shell, so the shell word-split any
  argument containing spaces — `neuron exec -- git commit -m "two words"`
  reached `git` as four separate arguments. Multi-argument commands now spawn
  their `argv` directly with no shell. A **single** argument is still run
  through a shell, so `neuron exec -- "a && b"` keeps working for pipes and
  operators; commands needing shell syntax must be passed as one quoted string.
- **Duplicate blueprint cards** on repeated scans, caused by ingest always
  inserting instead of upserting against the existing scan entry.
- **Phantom drift immediately after ingest**: the fingerprint is captured
  *before* the scan runs, so a file edited mid-scan re-scans next time instead
  of caching a baseline that never reflected the edit.

### Known Limitations

- **`TreeSitterScanner` does not use Tree-Sitter.** Despite the class name and
  ADR 0003, symbol extraction is line-oriented pattern matching —
  `web-tree-sitter` is not a dependency and no `.wasm` grammar is loaded.
  Multi-line declarations may be truncated, and some call sites are recorded as
  `method` symbols. Documentation in this release describes the shipped
  behavior; ADR 0003 is marked **Deferred**. Tracked in
  `.scratch/architecture-scans-2.1.0/issues/06-real-tree-sitter-ast-engine.md`.
- **`neuron completion`** (shell autocompletion) was planned for this release
  and is **not** included. It moves to the next minor.
- **`npm run test:e2e` requires a local ONNX model cache** and is not runnable
  in a fully cold offline CI without a model-fetch step. A cold summarizer cache
  makes the first run substantially longer (~13 min for the 500-file fixture).

## [2.0.0] - 2026-07-31

### Added
- **Stable 2.0.0 Major Release**: Official release of offline agent memory store CLI and SDK.
- **GitHub Star Callout**: Added GitHub repository callout banner and `githubUrl` property to `neuron init`.
- **User Feedback Command**: Added `neuron feedback [message]` command with `--type` and `--title` flags to generate pre-filled GitHub issue creation URLs.
- **Native Markdown Storage Engine (`md-only`)**: In-memory vector embedding search over `.neuron/*.md` files with timestamp cache invalidation and zero `.sqlite` disk footprint.
- **Hybrid Search & Rank Aggregation**: Reciprocal Rank Fusion (RRF) combining vector embeddings and SQLite FTS5 keyword indexing.
- **Cross-Platform `node:sqlite` Fallback**: Automatic fallback when native `better-sqlite3` bindings are unavailable.
- **Local Dashboard UI (`neuron ui`)**: Dark-mode web interface for real-time memory management.
- **Bi-Directional Markdown Sync (`neuron sync`)**: Direct synchronization between Markdown memory files and SQLite vector DB.
