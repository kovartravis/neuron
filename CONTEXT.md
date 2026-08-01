# Context: Neuron Memory Store

Glossary and domain language for the `neuron` memory store project.

## Glossary

### init

The process of bootstrapping a project to support agentic memory store workflows. It searches for an existing `CLAUDE.md` or `AGENTS.md` (defaulting to creating `AGENTS.md` if neither is present, overridable via `--file`/`-f`) and appends or updates the `## Memory Store` instructions block in-place.

### neuron-memory

The standard agent skill (located at `.claude/skills/neuron-memory/SKILL.md`) that codifies how agents load memory store context at startup, record action history and new learnings at shutdown, and prune obsolete/redundant memories during periodic maintenance.

### task-id

The identifier used to link logged history entries back to specification artifacts or requirements (e.g. ticket numbers like `01-db-schema-postgres` or issue references like `#42`). It should not refer to transient execution task/process IDs.

### scope promotion & demotion

The mechanism executed during consolidation that dynamically adjusts a learning's visibility tier (`people` -> `project` -> `global`) based on query frequency in a rolling 30-day window.

### manual scope lock

A flag (`is_manual_scope`) set when a user explicitly assigns a scope to a learning. It locks the learning's scope and exempts it from automated promotion or demotion.

### pre-command lookup (`neuron exec`)

The mechanism that queries the memory store for relevant learnings before running a shell command. It outputs matching rules to `stderr` above a relevance threshold and executes the target command with inherited `stdio`.

### failure-triggered learning capture

The closed-loop process where an agent automatically records a new learning (`neuron learn add ...`) immediately after investigating and resolving a command or build failure.

### hybrid search

The retrieval strategy combining semantic vector search and keyword-based SQLite FTS5 search to locate relevant entries.

### Reciprocal Rank Fusion (RRF)

The rank aggregation algorithm that merges ordered results from semantic and keyword searches based on their respective positions.

### FTS (Full-Text Search) index

The SQLite FTS5 virtual table (`learnings_fts` or `history_fts`) linked as an external content table to index the `content` and `tags` columns.

### dynamic category UI

The user interface layout that dynamically adapts its navigation tabs, category counters, and search context based on whatever categories are registered in `neuron.yaml` and stored in SQLite memories.

### generic memory endpoint

The REST API endpoint (`/api/memories`) accepting a `category` parameter to list or query memories across any arbitrary category.

### Category-Based Markdown File

The markdown file layout where memories under a category are formatted and stored together inside a dedicated category file (e.g. `.neuron/learning.md`, `.neuron/history.md`).

### Markdown Storage Adapter (`MdStorageAdapter`)

The module component responsible for reading, writing, parsing YAML frontmatter metadata, and formatting memory entries directly within category-based Markdown files.

### Architecture Scan (`neuron scan`)

The process of scanning a codebase directory topology, manifests (`package.json`, `Cargo.toml`, `go.mod`, `pyproject.toml`), and source files to extract structural contracts and module boundaries into the memory store.

### Symbol Scanner (`TreeSitterScanner`, `src/scanner/treesitter.ts`)

The multi-language symbol extraction module that pulls classes, structs, interfaces, functions, and methods out of source files across the 14 extensions listed in `SUPPORTED_SOURCE_EXTENSIONS` (`.ts`, `.js`, `.tsx`, `.jsx`, `.py`, `.go`, `.rs`, `.java`, `.cpp`, `.hpp`, `.cs`, `.swift`, `.rb`, `.php`).

As of 2.2.0 it extracts symbols from a **parsed syntax tree** by running S-expression queries against WebAssembly Tree-Sitter grammars (`docs/adr/0003`, `docs/adr/0008`). Eight grammars cover ten of the fourteen extensions: `.ts`, `.tsx`, `.js`, `.jsx`, `.py`, `.go`, `.rs`, `.java`, `.cpp`, `.hpp`. The remaining four — `.cs`, `.swift`, `.rb`, `.php` — have no grammar in 2.2.0 and stay on the line-oriented fallback.

Which of the two produced a given file is recorded as its **parser fidelity**, never guessed. A grammar that should have loaded but did not degrades the file to the fallback *and* says so on `stderr`.

### `SUPPORTED_SOURCE_EXTENSIONS`

The single source of truth for scanner language support. The topology scan derives its file filter from this list, so adding an extension here makes it scannable rather than silently skipped before it reaches the scanner.

### Structural Memory Card

The generated markdown/JSON memory block representing an analyzed codebase module, tech stack manifest, or API export signature ingested into the memory store.

### Qwen1.5-0.5B Deep Code Summarizer (`src/components/summarizer.ts`)

The offline ONNX Instruct LLM pipeline (`Xenova/Qwen1.5-0.5B-Chat`) running in Node.js via `@huggingface/transformers` to perform real, uncached semantic code summarization over AST-extracted method signatures, docstrings, and function implementations.

### Cross-File Call Graph Extraction

The process of parsing imports, exports, and inter-file function invocations to construct a directed dependency call graph between codebase modules and key component interfaces.

### Scan Progress Indicator (`ScanProgressBar`)

The terminal progress indicator rendered on `process.stderr` during `neuron scan`. It displays percentage progress (`[████████░░░░] 60%`), active phase status, and current file details while preserving clean stdout for markdown or JSON output.

### Architectural Drift (`neuron scan --diff` / `--check`)

The structural variance detected when comparing current AST-scanned codebase topology (modules, export contracts, dependency graph) against the baseline Structural Memory Card stored in the memory store. Drift is only meaningful between two measurements of matching **parser fidelity**; a difference across a fidelity change is an **incomparable baseline**, not drift.

### parser fidelity

How a file's symbols were obtained, written as `<parser>/<generation>` — e.g. `ast/2`, `regex/2`. The parser is `ast` when a Tree-Sitter grammar parsed the file and `regex` when it fell back to line-oriented matching. Recorded per file on the Structural Memory Card as a default plus the files that deviate from it.

### scanner generation

The integer half of a parser fidelity descriptor, incremented whenever symbol extraction changes shape — including changes to the regex fallback. It distinguishes two cards produced by the same named parser but by different versions of it, which are not comparable. Generation 1 is the 2.1.0 scanner; generation 2 is the 2.2.0 Tree-Sitter rewrite.

### incomparable baseline

A stored card whose parser fidelity differs from the current scan's, so the two cannot be subtracted from one another. Reported instead of a drift report, and never reported as drift. A card carrying no fidelity at all is an incomparable baseline of generation 1.

### re-baseline

Replacing the stored Structural Memory Card with a fresh scan, performed by running `neuron scan`. It resolves an incomparable baseline, and is destructive to drift history: whatever changed before the re-baseline is absorbed into the new card rather than reported.

### Deep E2E Benchmark & Correctness Suite (`npm run test:e2e`)

The combined end-to-end correctness gate and performance benchmark, spanning 6 pillars: Polyglot AST Traversal at Scale, Adversarial Semantic Recall & Distractor Resistance, High-Concurrency Multi-Agent Stress, Architectural Drift Detection & Latency SLA, Storage Corruption & Self-Healing, and Real Pipeline Integrity.

Unlike the unit suite, it runs the **real** production pipeline — the ONNX embedder and the Qwen1.5-0.5B summarizer — by overriding the `NODE_ENV=test` short-circuits in `summarizer.ts`. Runtime is therefore dominated by uncached LLM summarization (~1.57s/file), so a cold summarizer cache makes the first run substantially longer than a warm one.

### Real Pipeline Integrity (Pillar 6)

The guard pillar asserting that the embedder returns non-zero vectors and that the summarizer's LLM path actually executes rather than the heuristic fallback. It exists because a stubbed pipeline makes every other measurement in the suite meaningless while still reporting green.

### Benchmark Scorecard (`benchmarks/reports/e2e-benchmark-scorecard.json`)

The structured performance report detailing per-pillar pass/fail, latency percentiles (p50/p95/p99), throughput, recall accuracy, and drift-detection counts. Pillar status is sourced from vitest's JSON reporter merged with `e2e-metrics.json` written by the suite itself — never inferred from stdout text.











### write-side enrichment (`src/components/enricher.ts`)

The process that fills in the metadata a caller did not supply on `neuron memory add` — tags, category and importance. Enrichment fills only unset fields; anything passed explicitly is honoured untouched. It hangs off `NeuronMemory.transact`, the single seam every write routes through.

The three fields are inferred by different machinery because they are different kinds of problem: tags are **selected** by centroid cosine with no model involved, category is inferred from the store's category centroids (or, opt-in, by the model), and importance is inferred by the model. See `docs/adr/0010`.

### tag vocabulary & centroid

The closed set a tag can be selected from: every tag declared in `neuron.yaml`, plus every store tag carried by at least three entries. A tag's **centroid** is the L2-normalised mean of the embeddings of the entries carrying it — tag *strings* are never embedded, because a short label embeds poorly and ignores how the tag is actually used in this store. The three-entry floor is a requirement of the method rather than a tuning knob: a tag on one entry has a centroid identical to that entry.

The vocabulary is computed once per process and never persisted, so a tag minted by an explicit write is selectable by the very next write.

### enrichment backlog (`enriched_at`)

The set of entries written with a field left for later, identified by a NULL `enriched_at` column. Only importance defers — it never justifies a ~3.2s model load on the interactive write path on its own. The backlog drains on the next memory command whenever it is non-empty, and the drain is **unbounded**: it completes rather than working to a budget, so retrieval quality never depends on how much was written recently. `neuron memory enrich` drives it on demand.

A row whose inference degrades is still stamped enriched, so a permanently unavailable model cannot make every subsequent query re-attempt a cold load. The loss is made visible by the degradation counters instead.

### degradation counters

Per-reason counts of every time a model-backed job silently fell back, persisted in the `meta` table and surfaced under `enrichment.degraded` in `neuron status`. Silent degradation is the designed failure mode (ADR 0010 §3); silence *without* counters is how a broken local model goes unnoticed for months.

### timeout primitive (`withTimeout`, `src/components/timeout.ts`)

The bounded wait every model call is wrapped in. Before it, the only timeout in the codebase was SQLite's `busy_timeout` and a hung generation hung its caller forever. It bounds the wait, not the work: ONNX generation cannot be cancelled, so a timed-out call runs to completion in the background and its result is discarded.

### shared text generator (`src/components/generator.ts`)

The process-level singleton holding `Xenova/Qwen1.5-0.5B-Chat`. Loading costs ~3.2s against ~183ms per inference, so the load is 87% of a single-inference invocation and every CLI command is its own process. The singleton exists so a `neuron scan` that has already paid for the model hands it to enrichment for free.
