# Changelog

All notable changes to `@kovartravis/neuron` will be documented in this file.

## [2.1.3] - 2026-08-01

Documentation only. No behaviour changes — but it corrects documentation that
described a destructive command as doing far less than it does.

### Fixed

- **`neuron memory prune` was documented as deleting "low-importance" entries
  when it deletes nearly everything.** The packaged `neuron-memory` skill told
  agents that pruning removes "low-importance history logs (importance 1–2)".
  The actual defaults are `--days 30` and `--importance 3`, and the importance
  comparison is **inclusive**.

  Because an entry written without an explicit `--importance` is stored at the
  default of **3**, a bare `neuron memory prune` deletes every history entry
  older than 30 days that was not deliberately marked 4 or 5. On the reference
  store that is **158 of 160 history entries**, against the 0 that the
  documented "importance 1–2" rule would have matched.

  There is no undo and no `--dry-run`. Nothing about the command changed in
  this release; only the documentation now describes it accurately. If you have
  run `neuron memory prune` on the strength of the old wording, the deleted
  entries are not recoverable from the database.

  Corrected in the packaged skill (§6) and in `neuron memory --help` /
  `neuron history --help`, which now label `prune` as destructive and state the
  inclusive default at the point of use.

## [2.1.2] - 2026-08-01

### Fixed

- **Unquoted arguments were silently truncated to their first word.** An
  argument containing spaces arrives as several separate `argv` entries. The
  memory subcommands read only the first and discarded the rest, then exited
  `0` and reported success:

  ```
  $ neuron memory add --category learning Fix for ONNX crash: pin onnxruntime
  {"status":"created"}          # stored the single word "Fix"
  ```

  `add` and `update` now refuse the write with a non-zero exit and a message
  naming the likely cause, rather than storing a fragment. Nothing is written
  on refusal.

  `neuron memory query` was affected in the same way — `neuron memory query
  tree sitter grammar` searched for `tree` alone, which surfaced as poor recall
  rather than as an error. A query is now joined and run in full. Reads are
  joined rather than refused because a read harms nothing and retrying is free;
  the write path is the one that must be strict.

- **Mistyped and unrecognised flags were swallowed and ignored.** Any unknown
  `--flag` fell through to the positional list and was discarded, so
  `--tag onnx` (instead of `--tags`) and `--importanc 5` (instead of
  `--importance`) both parsed as success while dropping the value:

  ```
  $ neuron memory add --category learning "content" --tag onnx --importanc 5
  {"status":"created"}          # tags: [], importance: 3 (default)
  ```

  Unrecognised flags are now rejected with a suggestion for the nearest valid
  option. Use `--` to end flag parsing when a value legitimately begins with a
  dash: `neuron memory add --category learning -- "--dash-leading content"`.

  `neuron exec -- <command>` is unaffected — its passthrough arguments are
  split off before flag parsing and are never interpreted.

- **`neuron memory add --help` stored a memory instead of printing help.**
  `--help` was treated as content by any subcommand that did not check for it
  first. `--help` and `-h` are now recognised everywhere.

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
