# Changelog

All notable changes to `@kovartravis/neuron` will be documented in this file.

## [2.2.0-rc1] - 2026-08-01

The real AST release. `TreeSitterScanner` finally uses Tree-Sitter.

### Upgrading from 2.1.0 — action required

**Your first `neuron scan --diff` after upgrading will report "Re-baseline
Required" instead of drift. Run `neuron scan` once. That is the whole migration.**

2.2.0 replaces regex symbol extraction with real Tree-Sitter AST parsing, which
changes what a scan finds. On this repository the symbol count fell from 3290 to
233 — almost all of the difference being call sites the old scanner had recorded
as `method` symbols — while genuinely *adding* symbols it had never seen, because
its export pattern matched `export function` but not `export async function`.

A blueprint card written by 2.1.0 and a scan performed by 2.2.0 are therefore
measurements taken with different instruments. Rather than report the difference
as hundreds of changes you did not make, neuron now refuses the comparison and
tells you to re-baseline.

**If you gate CI on `neuron scan --check`**, note the new exit code:

| Code | Meaning |
|------|---------|
| `0` | In sync |
| `1` | Architectural drift detected |
| `2` | Baseline not comparable — re-baseline required |

A build that starts failing with **exit 2** immediately after upgrading is
reporting the migration, not a regression. Run `neuron scan` to re-baseline.
Re-baselining is destructive to drift history: changes accumulated before it are
absorbed into the new card rather than itemised.

Users who never run `--diff` explicitly need do nothing — the implicit re-scan
behind `memory query` re-baselines silently on the next source edit.

### Added

- **Real Tree-Sitter AST symbol extraction**: `src/scanner/treesitter.ts` now
  runs S-expression queries against a parsed syntax tree instead of matching
  line-oriented regexes. Covers **TypeScript, TSX, JavaScript, Python, Go, Rust,
  Java and C++** — ten of the fourteen supported extensions. `.cs`, `.swift`,
  `.rb` and `.php` have no grammar yet and keep the line-oriented fallback.
  See ADR 0003.
  - Multi-line declarations are captured whole, with true line numbers.
  - Call sites are no longer recorded as `method` symbols. On this repository
    that alone removed 3101 phantom symbols.
  - Symbols gain `exported`, and a file's export contract is now its public
    surface rather than every symbol found in it. Methods are not exports.
  - TypeScript and TSX use hand-written queries; the `tags.scm` shipped with
    those grammars covers only ambient declaration forms.
- **Tree-Sitter grammars fetched at `neuron init`**: eight compiled `.wasm`
  grammars (8.49 MB) are downloaded from the official `tree-sitter-<lang>` npm
  packages and cached in the `env-paths` data dir, alongside the existing ONNX
  models. Pinned by version and attributed by a manifest, so an unattributable
  `.wasm` is ignored rather than loaded. Not bundled in the tarball, which stays
  ~612 KB. Honours `npm_config_registry`; a fetch failure leaves that language on
  the regex scanner rather than failing the install. See ADR 0008.
- **`NEURON_GRAMMAR_DIR`**: overrides the grammar cache location, for CI cache
  restoration and constrained environments.
- **Parser fidelity on the blueprint card**: a `## 🔬 Parser Fidelity` section
  records the parser that produced the card as `<parser>/<generation>` — a
  default plus only the files that deviate from it. See ADR 0009.
- **Incomparable-baseline detection**: `neuron scan --diff` reports
  `needsRebaseline` and names `neuron scan` as the fix rather than emitting
  phantom drift; `--check` exits `2`.
- **Loud grammar degradation**: a language that has a Tree-Sitter grammar but
  could not load it now warns on `stderr`, naming the language and `neuron init`.
  Languages with no grammar at all (Ruby, PHP, Swift, C#) stay silent, since
  their regex fidelity is expected.

### Changed

- **`web-tree-sitter`** is now a runtime dependency (~4.4 MB in `node_modules`).
  It is the only dependency added in this release.
- **Documentation describes AST parsing again.** 2.1.0 deliberately walked back
  its AST claims to match what actually shipped; those descriptions in
  `README.md`, `CONTEXT.md`, `SCAN_HELP` and the packaged `neuron-memory` skill
  are restored — but scoped to the eight grammars that exist, with the remaining
  four extensions still described as line-oriented.
- **ADR 0003 is marked implemented**, no longer deferred.

### Removed

- **`neuron scan --force`**: the flag was documented as "bypass the content cache
  and force a full re-scan" but was never read by the ingest path. It did
  nothing. `neuron scan` already re-scans and updates the card in place.
## [2.1.5] - 2026-08-02

### Fixed

- **`dual`-mode `update` and `delete` reported only the markdown side's
  outcome, ignoring what actually happened in the vector database.** `upsert`
  has always trusted the vector result (`vecResult.status`); `update` and
  `delete` computed the same `vecResult` and never looked at it, deciding
  success or failure purely from whether the corresponding `.md` file
  operation found the id.

  When the two stores disagree — a prior write that landed on only one side,
  a manual `.md` edit not yet reconciled with `neuron sync` — this produced a
  false negative on a real change:

  ```
  # entry exists in the vector DB; its .md copy was already removed
  $ neuron memory delete <id> --category learning
  {"status":"not_found"}   # the row WAS deleted from the vector DB
  ```

  The same happened on `update`: content was overwritten in the vector DB
  while the CLI reported `not_found`, giving no indication a change had
  occurred. There was also no signal anywhere that the two stores had
  diverged.

  Both operations now report success if **either** store actually changed,
  matching the precedent `upsert` already set. Affects `storage.mode: dual`
  and `split`-mode categories whose per-category `storage` resolves to `dual`
  (including the unconfigured default). `vector-only` and `md-only` modes
  were never affected.

- Aligned a cosmetic default-value mismatch in `split`-mode storage
  resolution (write path defaulted an unconfigured category's storage to
  `'dual'`, read path defaulted to `'vector'`). Both branches only ever
  dispatch on `=== 'md'`, so this had no behavioural effect, but the
  mismatched literal read as if it might.
## [2.1.4] - 2026-08-01

### Fixed

- **`neuron memory delete` and `neuron memory update` ignored `--category`.**
  Both subcommands require `--category` on the CLI, but it was never part of
  the SQL predicate — `delete` ran `WHERE id = ? AND project_id = ?`, so any id
  could be deleted while claiming any category, and the same was true for
  `update`. The required flag validated nothing; it looked like a safety check
  and was ceremony:

  ```
  $ neuron memory delete <id-of-a-history-entry> --category learning
  {"status":"deleted"}     # deleted regardless of the entry's real category
  ```

  Both now include `AND category = ?`. A mismatched category is treated the
  same as a nonexistent id — `{"status":"not_found"}` — and nothing is
  modified. This is a behaviour change: a call that previously "succeeded"
  against the wrong category now fails, which is what the required flag always
  implied it would do.

  This directly affected the maintenance workflow the packaged skill
  documents: it lists entries across every category (see next item), then
  passes whatever id it finds to `delete --category learning` — which
  previously deleted the entry regardless of its actual category.

- **`neuron memory list --categories a,b` silently ignored the filter.**
  `list` read only the singular `--category`; `query` already read both. A
  multi-category filter parsed without error and returned every category
  unfiltered. `list` now reads `--categories` the same way `query` does.
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
