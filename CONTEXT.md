# Context: Neuron Memory Store

Glossary and domain language for the `neuron` memory store project.

## Glossary

### init

The process of bootstrapping a project to support agentic memory store workflows. It searches for an existing `CLAUDE.md` or `AGENTS.md` (defaulting to creating `AGENTS.md` if neither is present, overridable via `--file`/`-f`) and appends or updates the `## Memory Store` instructions block in-place.

### neuron-memory

The standard Antigravity skill (located at `.agents/skills/neuron-memory/SKILL.md`) that codifies how agents load memory store context at startup, record action history and new learnings at shutdown, and prune obsolete/redundant memories during periodic maintenance.

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

### TreeSitterScanner (`web-tree-sitter`)

The multi-language static AST parsing module powered by WebAssembly (`web-tree-sitter`) that extracts exported classes, functions, interfaces, and structs across TypeScript/JS, Python, Go, Rust, Java, and C++.

### Structural Memory Card

The generated markdown/JSON memory block representing an analyzed codebase module, tech stack manifest, or API export signature ingested into the memory store.

### Qwen2.5-0.5B Deep Code Summarizer (`src/components/summarizer.ts`)

The offline ONNX Instruct LLM pipeline (`Qwen/Qwen2.5-0.5B-Instruct`) running in Node.js via `@huggingface/transformers` to perform real, uncached semantic code summarization over AST-extracted method signatures, docstrings, and function implementations.

### Cross-File Call Graph Extraction

The process of parsing imports, exports, and inter-file function invocations to construct a directed dependency call graph between codebase modules and key component interfaces.

### Scan Progress Indicator (`ScanProgressBar`)

The terminal progress indicator rendered on `process.stderr` during `neuron scan`. It displays percentage progress (`[████████░░░░] 60%`), active phase status, and current file details while preserving clean stdout for markdown or JSON output.









