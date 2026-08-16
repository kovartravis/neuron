# Context: Neuron Memory Store

Glossary and domain language for the `neuron` memory store project.

## Glossary

### init

The process of bootstrapping a project to support agentic memory store workflows. It detects every present harness (`.claude/`, `.codex/`, `.github/`, `.cursor/`, or bare `AGENTS.md`, defaulting to creating `AGENTS.md` if none is present), installs deterministic recall hooks for every harness with an adapter (see **harness adapter**), and appends or updates the capability-aware `## Memory Store Protocol` block in each detected harness's instructions file in-place.

### harness adapter (`src/harnesses/`)

The interface (`HarnessAdapter`: `detect`/`capability`/`install`/`uninstall`/`verify`) between neuron and a coding agent's harness, letting `neuron init` wire a hook rather than relying on an instruction the agent may or may not follow. Capability is a `lifecyclePoint → supportRecord` map, not a single label — the `deterministic`/`best-effort`/`instruction-only` fidelity shown to users is derived from that map for display and never stored. Shipped for Claude Code and Codex CLI (both `deterministic`) in 2.2.0-rc3, and for GitHub Copilot CLI and Cursor (both `best-effort` — no per-turn hook point, so query-time recall still falls back to instructions) in 2.3.0; see [ADR 0014](docs/adr/0014-recall-adapter-architecture.md).

### protocol block (`src/config/protocolBlock.ts`)

The generator behind the `## Memory Store Protocol` region `neuron init` writes into a harness's instructions file. Recall and command execution are each independently fidelity-conditional (ticket 23, 2.4.0), per the adjacent **harness adapter**'s `verify()`: the Recall step drops once `session-start`/`pre-prompt`/`context-reset` are wired deterministic, the Command Execution step drops once `pre-command` is wired deterministic — a harness can have one without the other, though today's four adapters happen to move both together. Marker-wrapped (`<!-- neuron:protocol:start/end -->`) so re-running `init` can find and update only its own region.

### neuron-memory

The standard agent skill (located at `.claude/skills/neuron-memory/SKILL.md`) that codifies how agents load memory store context at startup, record new decisions and learnings at shutdown, and prune obsolete/redundant memories during periodic maintenance.

### task-id

The identifier used to link logged memory entries back to specification artifacts or requirements (e.g. ticket numbers like `01-db-schema-postgres` or issue references like `#42`). It should not refer to transient execution task/process IDs.

### pre-command lookup (`neuron exec` / `pre-command` hook)

The mechanism that queries the memory store for relevant learnings before running a shell command. Results pass through the conjunctive relevance gate (ADR 0012); a rejected-everything result still reports a count rather than staying silent. Reachable two ways, both sharing the same `resolveExecCategories`/`queryGated` call path (`src/commands/exec.ts`): the `neuron exec -- <command>` CLI wrapper (prints to `stderr`, then executes the target command with inherited `stdio`), always available on every harness; and, on Claude Code/Codex CLI only, the `pre-command` hook point (`src/commands/hook.ts`, tickets 22/23, 2.4.0) firing automatically as `additionalContext` on every `Bash` tool call via `PreToolUse` — informational only, never blocks the call, so it never sets `permissionDecision`. Copilot CLI and Cursor have no context-carrying hook field for shell commands at all (ADR 0014's 2026-08-10 amendment) — a structural ceiling, not a gap expected to close — so they keep the CLI wrapper as the only path, permanently.

### git-log index (`src/harnesses/gitLog.ts`, `src/index.ts`)

A SQLite table (`git_log_index` + `git_log_fts`, migration v9) indexing every
commit's subject and body by embedding, refreshed via check-HEAD-on-read
(`refreshGitLogIndex`: compares the stored last-indexed SHA against `git
rev-parse HEAD`, embeds only the delta, with a one-time full backfill on
first use) rather than an installed git hook — nothing to silently bypass.
Searched (`searchGitLog`) through the same ADR 0012-style gate ordinary
memory recall uses: a candidate must first clear an FTS keyword match before
it's ranked by embedding similarity, so a topically-absent prompt yields true
silence rather than an incidental top hit. Wired into `hook.ts`'s
`pre-prompt` point only, on harnesses with a per-turn hook, additive to and
budgeted separately from ordinary memory recall (`GIT_LOG_CHAR_BUDGET`,
`src/harnesses/payload.ts`). Unlike `memories`, it has no markdown mirror —
git itself is already the versioned source of truth, so this table is a
derived cache, not authoritative content neuron owns. Ticket numbers in
commit messages can collide across concurrent wayfinder maps; the injected
payload discloses this rather than attempting to disambiguate it.

### failure-triggered learning capture

The closed-loop process where an agent automatically records a new learning (`neuron learn add ...`) immediately after investigating and resolving a command or build failure.

### hybrid search

The retrieval strategy combining semantic vector search and keyword-based SQLite FTS5 search to locate relevant entries.

### Reciprocal Rank Fusion (RRF)

The rank aggregation algorithm that merges ordered results from semantic and keyword searches based on their respective positions.

### FTS (Full-Text Search) index

The SQLite FTS5 virtual table (`memories_fts`, the unified index since migration v5 — `learnings_fts`/`history_fts` were its pre-unification predecessors) linked as an external content table to index the `content` and `tags` columns.

### dynamic category UI

The user interface layout that dynamically adapts its navigation tabs, category counters, and search context based on whatever categories are registered in `neuron.yaml` and stored in SQLite memories.

### generic memory endpoint

The REST API endpoint (`/api/memories`) accepting a `category` parameter to list or query memories across any arbitrary category.

### Category-Based Markdown File

The markdown file layout where memories under a category are formatted and stored together inside a dedicated category file (e.g. `.neuron/learning.md`, `.neuron/decisions.md`).

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

The combined end-to-end correctness gate and performance benchmark, spanning 12 pillars: Polyglot AST Traversal at Scale, Adversarial Semantic Recall & Distractor Resistance, High-Concurrency Multi-Agent Stress, Architectural Drift Detection & Latency SLA, Storage Corruption & Self-Healing, Real Pipeline Integrity, Adversarial Retrieval Quality, Multi-Process Contention & Crash Recovery, Retrieval Scale Curve, Prune Safety, Category Strategy A/B, and Enrichment Retrieval Non-Regression. Several were added over the course of 2.2.0 as new jobs needed a non-regression bar; **Pillar 8 (multi-process contention) is a known pre-existing failure** (`3/50` rejected writes against a `<5%` bar), reproduced on a clean tree during ticket `26` and owned by nobody yet.

Unlike the unit suite, it runs the **real** production pipeline — the ONNX embedder and the Qwen1.5-0.5B summarizer — by overriding the `NODE_ENV=test` short-circuits in `summarizer.ts`. Runtime is therefore dominated by uncached LLM summarization (~1.57s/file), so a cold summarizer cache makes the first run substantially longer than a warm one.

### Real Pipeline Integrity (Pillar 6)

The guard pillar asserting that the embedder returns non-zero vectors and that the summarizer's LLM path actually executes rather than the heuristic fallback. It exists because a stubbed pipeline makes every other measurement in the suite meaningless while still reporting green.

### Benchmark Scorecard (`benchmarks/reports/e2e-benchmark-scorecard.json`)

The structured performance report detailing per-pillar pass/fail, latency percentiles (p50/p95/p99), throughput, recall accuracy, and drift-detection counts. Pillar status is sourced from vitest's JSON reporter merged with `e2e-metrics.json` written by the suite itself — never inferred from stdout text.











### write-side enrichment (`src/components/enricher.ts`)

The process that fills in the metadata a caller did not supply on `neuron memory add` — tags and category. Enrichment fills only unset fields; anything passed explicitly is honoured untouched. It hangs off `NeuronMemory.transact`, the single seam every write routes through.

The two fields are inferred by different machinery because they are different kinds of problem: tags are **selected** by centroid cosine with no model involved, and category is inferred from the store's category centroids (or, opt-in, by the model). See `docs/adr/0010`.

**Importance is not inferred.** It was a third enriched field through rc1/rc2; Pillar 10 measured the shipped model's judgement as noise, it shipped `off`, and ticket 26 removed it. An omitted `--importance` takes the column default of `3` — which is also the default `neuron memory prune` ceiling, and the prune compares inclusively, so passing `--importance 4` or `5` is the only thing that protects an entry from a bare prune.

### tag vocabulary & centroid

The closed set a tag can be selected from: every tag declared in `neuron.yaml`, plus every store tag carried by at least three entries. A tag's **centroid** is the L2-normalised mean of the embeddings of the entries carrying it — tag *strings* are never embedded, because a short label embeds poorly and ignores how the tag is actually used in this store. The three-entry floor is a requirement of the method rather than a tuning knob: a tag on one entry has a centroid identical to that entry.

The vocabulary is computed once per process and never persisted, so a tag minted by an explicit write is selectable by the very next write.

### `enriched_at`

A timestamp recording that a write went through enrichment. Every write is stamped inline, because both remaining inferred fields resolve against an embedder that is already loaded on the write path.

It once identified an **enrichment backlog** — rows written NULL because importance inference had been deferred rather than pay a ~3.2s model load on the interactive write path — drained on the next memory command by `drainEnrichment`, with `neuron memory enrich` to drive it on demand. Ticket 26 removed the only deferred job, so nothing is ever written NULL and all of that machinery went with it. The column and its partial index are kept: the timestamp is still an honest record, and dropping a column would make an rc1/rc2 database non-downgradable for no gain.

### degradation counters

Per-reason counts of every time a model-backed job silently fell back, persisted in the `meta` table and surfaced under `enrichment.degraded` in `neuron status`. Silent degradation is the designed failure mode (ADR 0010 §3); silence *without* counters is how a broken local model goes unnoticed for months.

### timeout primitive (`withTimeout`, `src/components/timeout.ts`)

The bounded wait every model call is wrapped in. Before it, the only timeout in the codebase was SQLite's `busy_timeout` and a hung generation hung its caller forever. It bounds the wait, not the work: ONNX generation cannot be cancelled, so a timed-out call runs to completion in the background and its result is discarded.

### shared text generator (`src/components/generator.ts`)

The process-level singleton holding `Xenova/Qwen1.5-0.5B-Chat`. Loading costs ~3.2s against ~183ms per inference, so the load is 87% of a single-inference invocation and every CLI command is its own process. The singleton exists so a `neuron scan` that has already paid for the model hands it to enrichment for free.

### declared field / field schema (`categories.<name>.fields` in `neuron.yaml`, ADR 0013)

A category's own `string`/`enum` frontmatter fields, declared in `neuron.yaml` and enforced in `NeuronMemory.transact()` — the single choke point every writer (the CLI, `neuron scan`'s `ingestScanResults`) goes through. Distinct from the three fields every entry already carries: **structural** (`id`, `createdAt`, never optional), **semantic reserved** (`importance`, `tags`, `taskId` — neuron reads these for behavior), and this third **user-defined** tier, opaque to neuron and validated on write.

A declared field becomes its own CLI flag (`ticket` → `--ticket`), not a generic `--field k=v` escape hatch — `neuron memory --help` lists a project's declared fields dynamically. A required field with no `default:` hard-errors on `add`, naming the field and category (the same policy ticket 06 set for `--category`); `update` is a partial patch and never re-demands one. Every declared field also lives as a nullable SQLite column on `vector`-storage categories, added by an additive, idempotent auto-migration (ticket 44) that diffs `neuron.yaml` against `PRAGMA table_info` on every open — every storage mode persists declared fields identically now.

### category declaration authority (ADR 0017)

Categories stay **advisory, not validated** — `neuron memory add --category <x>` and `neuron scan` are never rejected for using a category absent from `neuron.yaml`'s `categories` block. Instead, the first write that introduces an undeclared category **auto-declares** it: `NeuronMemory.transact()` (the same single choke point `declared field / field schema` above goes through) appends a minimal `categories.<name>: {}` block to `neuron.yaml` on disk and updates the in-memory config, so the rest of the same process — and every other declared-set consumer (`checkFieldCompliance`, `MultiRootMdStorage.readAll()`) — sees it as declared immediately. The write round-trips through the `yaml` package's `Document` API (`declareCategoryInNeuronYaml`, `src/config/neuronYaml.ts`) rather than a plain parse-stringify cycle, so the user's own comments and formatting survive it.

This is deliberately asymmetric with *inferred* category (centroid or model, when `--category` is omitted): inference stays hard-constrained to the already-declared set — a best guess among known options should never invent a category from embedding proximity alone — while an explicit `--category` is a human override the tool trusts and then absorbs into the declared set. `neuron status --repair` backfills categories that already held rows before this hook existed (reported by `--check` as `undeclaredCategories`, a distinct finding kind from field-schema `violations`).
