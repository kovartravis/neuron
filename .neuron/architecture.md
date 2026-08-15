# Category: architecture

---
id: 3640a08f-a38d-9da6-e9e1-18e517bc3c80
createdAt: 2026-08-10T19:12:13.918Z
importance: 5
tags:
  - architecture
  - topology
  - scan
  - deep
taskId: null
---
# 🏛️ Repository Architectural Blueprint: @kovartravis/neuron

## 🚀 System Purpose & Tech Stack
@kovartravis/neuron is a nodejs, typescript software system structured into 16 primary architectural modules.

## 🔬 Parser Fidelity
Default: `ast/2`

## 🧾 Dependency Contract
- `@anthropic-ai/sdk`
- `@huggingface/transformers`
- `@types/better-sqlite3`
- `@types/node`
- `env-paths`
- `onnxruntime-web`
- `tsx`
- `typescript`
- `vitest`
- `web-tree-sitter`
- `yaml`
- `zod`

## 🔗 Subsystem Dependency Map
```text
@kovartravis/neuron
├── benchmarks (benchmarks)
├── longmemeval (benchmarks/longmemeval)
├── reranker-gate (benchmarks/reranker-gate)
├── salvage-expansion (benchmarks/salvage-expansion)
├── src (src)
├── commands (src/commands)
├── components (src/components)
├── config (src/config)
├── e2e (src/e2e)
├── harnesses (src/harnesses)
├── models (src/models)
├── scanner (src/scanner)
├── shared (src/shared)
├── storage (src/storage)
├── ui (src/ui)
└── e2e (test/e2e)
```

## 📦 Primary Subsystems
- **benchmarks** — `benchmarks` (3 files)
- **longmemeval** — `benchmarks/longmemeval` (4 files)
- **reranker-gate** — `benchmarks/reranker-gate` (2 files)
- **salvage-expansion** — `benchmarks/salvage-expansion` (2 files)
- **src** — `src` (12 files)
- **commands** — `src/commands` (29 files)
- **components** — `src/components` (14 files)
- **config** — `src/config` (11 files)
- **e2e** — `src/e2e` (1 file)
- **harnesses** — `src/harnesses` (22 files)
- **models** — `src/models` (4 files)
- **scanner** — `src/scanner` (18 files)
- **shared** — `src/shared` (2 files)
- **storage** — `src/storage` (13 files)
- **ui** — `src/ui` (4 files)
- **e2e** — `test/e2e` (12 files)

---
id: e1d4e4de-a20f-2d75-c34d-9d3df1116eb7
createdAt: 2026-08-10T19:12:14.067Z
importance: 5
tags:
  - architecture
  - topology
  - scan
  - deep
taskId: null
---
### 🧩 benchmarks (`benchmarks`)
Primary benchmarks module containing core application capabilities.

**Key Components & Export Contracts:**
- **`benchmarks/e2e-runner.js`**: Driver for the deep E2E benchmark & correctness suite. Pillar results come from vitest's JSON reporter and the metrics file the suite itself writes — never from scraping stdout. The previous revision inferred status with `!output.includes(name) || overallPassed`, which marked a pillar PASSED precisely when it had NOT run, so a suite that died early scored better than one that ran and failed.
- **`benchmarks/generate-dashboard.js`** (Exports: `generateDashboard`): Renders the benchmark dashboard from the artifacts the suites write. Self-contained output: inline CSS/SVG, no network fetches, no chart library. Charts use a single series hue because every plot here shows one measure across categories (magnitude), not competing identities — categorical colors would imply a distinction that does not exist. Pass/fail uses the reserved status palette and always pairs color with an icon and a text label, so state is never carried by hue alone.
- **`benchmarks/open-report.js`**: Regenerates the dashboard from whatever artifacts are on disk and opens it. Kept separate from the runner so the report can be viewed without re-running a benchmark that takes minutes.

---
id: d2e6ac08-26ec-d547-852f-3e6caeead816
createdAt: 2026-08-10T19:12:14.093Z
importance: 5
tags:
  - architecture
  - topology
  - scan
  - deep
taskId: null
---
### 🧩 longmemeval (`benchmarks/longmemeval`)
Primary longmemeval module containing core application capabilities.

**Key Components & Export Contracts:**
- **`benchmarks/longmemeval/dump_queries.py`**: Methods: set(), get_dataset(), load_queries(), get().
- **`benchmarks/longmemeval/neuron.py`** (Exports: `NeuronMemoryProvider`): Methods: NeuronMemoryProvider(), embeddings(), Fusion(), __init__().
- **`benchmarks/longmemeval/relevance_gate_eval.py`** (Exports: `eval_floor, eval_full_gate, reject, pctl`): Methods: leg(), prose(), fix(), result().
- **`benchmarks/longmemeval/retrieval_eval.py`**: Methods: len(), int(), max(), get_dataset().

---
id: 872900f6-5b8e-b51a-27b1-8a0831174785
createdAt: 2026-08-10T19:12:14.113Z
importance: 5
tags:
  - architecture
  - topology
  - scan
  - deep
taskId: null
---
### 🧩 src (`src`)
Primary src module containing core application capabilities.

**Key Components & Export Contracts:**
- **`src/cli.test.ts`**: Methods: describe(), join(), beforeAll(), mkdirSync().
- **`src/cli.ts`**: Methods: main(), slice(), log(), exit().
- **`src/db.test.ts`**: Methods: describe(), it(), openDatabase(), expect().
- **`src/db.ts`** (Exports: `createNodeSqliteWrapper, openDatabase, withSyncFileLock`): Synchronous cross-process mutex over `fn`, using `mkdir` as the atomic primitive — the same approach `MdStorageAdapter.acquireLock` uses for markdown writes, but blocking rather than `async`: `NeuronMemory`'s constructor runs its schema-migration chain synchronously, with no `await` point to yield at, so the wait between poll attempts uses `Atomics.wait` for a real OS-level sleep (Node's main thread, unlike a browser's, permits it) instead of a `setTimeout`-based one. Serializes `NeuronMemory.initialize()`'s migration chain across processes opening the same fresh database file concurrently — without it, two processes can both read `user_version` as `0` before either commits its first migration, producing `duplicate column name` / `no such table` races (the SQLite schema-migration race ticket, id `2fbfa9ff-1469-4b21- b781-cef371ea7d38` — this repo's wayfinder ticket numbers collide across maps, and bare "ticket 44" already names an unrelated declared-fields SQLite-column change elsewhere in this codebase, so this comment spells out the id rather than the number).
- **`src/enrichment.test.ts`**: Write-side enrichment, asserted at the transaction entry point — what ends up in the store. That was once two seams; the query seam carried the enrichment backlog's drain guarantee, and ticket 26 removed the only deferred job, so a read has no enrichment behaviour left to assert. Nothing here asserts how a tag was chosen. The category strategy in particular was A/B'd precisely because its winner was unknown, so tests that pinned the mechanism would have been rewritten by the experiment they existed to support.
- **`src/fieldSchema.test.ts`**: Declarable per-category frontmatter fields (ticket 43 / ADR 0013), asserted at the `transact()` choke point — required-but-missing, defaults, enum membership, and the reject-undeclared-field guard — plus the markdown round-trip that makes a written field value durable. Storage: SQLite column support for `vector`-storage categories shipped in ticket 44 — see `sqliteFieldSchema.test.ts` for the column migration and round-trip coverage. These tests use `storage.mode: md` where the markdown round-trip is meaningful.
- **`src/index.gitLog.test.ts`**: Bag-of-hashed-words, normalized — dot product tracks shared-word overlap, close enough to real embedding behavior for ranking assertions without a model.
- **`src/index.supersession.test.ts`**: Methods: primitives(), vecAt(), Float32Array(), describe().
- **`src/index.test.ts`**: Methods: describe(), it(), NeuronMemory(), getDb().
- **`src/index.ts`** (Exports: `GitLogHit, NeuronMemory`): A `searchGitLog` hit: an indexed commit that cleared the ADR 0012-style relevance gate.
- **`src/sqliteFieldSchema.test.ts`**: SQLite additive auto-migration for declared category fields (ticket 44 / ADR 0013) — the `vector`-storage counterpart to `fieldSchema.test.ts`'s markdown round-trip. Covers the migration mechanics (additive, idempotent, never `DROP COLUMN`) and the write-then-query round trip through real SQLite columns rather than frontmatter.
- **`src/statusCheckRepair.test.ts`**: `neuron status --check`/`--repair` (ticket 13 / ADR 0013): reporting and fixing live entries that violate a category's currently-declared field schema. The interesting case is always the same shape — a field became required (or was newly declared with a default, or newly declared enum) after some entries were already written — simulated below by writing against one `neuron.yaml`, then reopening a fresh `NeuronMemory` against the same store with an evolved config, exactly as a real upgrade would.

---
id: 4c073f22-ade1-c0da-6bc3-70c1334d89e4
createdAt: 2026-08-10T19:12:14.157Z
importance: 5
tags:
  - architecture
  - topology
  - scan
  - deep
taskId: null
---
### 🧩 commands (`src/commands`)
Primary commands module containing core application capabilities.

**Key Components & Export Contracts:**
- **`src/commands/exec.test.ts`**: Methods: describe(), join(), beforeAll(), mkdirSync().
- **`src/commands/exec.ts`** (Exports: `handleExecCommand`): Function handleExecCommand (Methods: handleExecCommand(), indexOf(), slice(), error()).
- **`src/commands/feedback.test.ts`**: Methods: describe(), join(), it(), buildGitHubIssueUrl().
- **`src/commands/feedback.ts`** (Exports: `buildGitHubIssueUrl, handleFeedbackCommand`): Function buildGitHubIssueUrl (Methods: buildGitHubIssueUrl(), URLSearchParams(), set(), toString()).
- **`src/commands/history.test.ts`**: Methods: describe(), join(), beforeAll(), mkdirSync().
- **`src/commands/history.ts`** (Exports: `handleHistoryCommand`): Function handleHistoryCommand (Methods: handleHistoryCommand(), error(), exit(), log()).
- **`src/commands/hook.test.ts`**: Methods: describe(), join(), beforeAll(), mkdirSync().
- **`src/commands/hook.ts`** (Exports: `handleHookCommand`): Extracts the exact suggested command from a `buildDiscoveryHint` line — everything after `run: `.
- **`src/commands/index.ts`**: No exported symbols detected.
- **`src/commands/init.test.ts`**: The end-to-end claim ticket 31 exists to make true: the README's Quick Start, run verbatim, leaves markdown in the repo rather than an invisible database.
- **`src/commands/init.ts`** (Exports: `HarnessFidelityReport, ProtocolWriteReport, ProtocolBlockDrift, checkProtocolBlockDrift, handleInitCommand`): The three points `recallStep()`/this file's own fidelity reporting have always meant by "recall" — deliberately excludes `pre-command` (ticket 22, neuron-2.4.0). Filtering the full `LIFECYCLE_POINTS` instead would mean a harness upgraded to a neuron version that knows about `pre-command` but not yet re-`init`'d reports recall as un-wired the moment `pre-command` isn't registered, even though session-start/pre-prompt recall itself never changed — exactly the kind of self-inflicted regression the capability-map design exists to avoid. `pre-command`'s own wiring is a separate question for `execStep()` (ticket 23) to answer, not this one.
- **`src/commands/learn.test.ts`**: Methods: describe(), join(), beforeAll(), mkdirSync().
- **`src/commands/learn.ts`** (Exports: `handleLearnCommand`): Function handleLearnCommand (Methods: handleLearnCommand(), error(), exit(), log()).
- **`src/commands/memory.supersession.test.ts`**: Methods: process(), vecAt(), Float32Array(), makeMemory().
- **`src/commands/memory.test.ts`**: A project whose config names a literal fallback category. The model is disabled under NODE_ENV=test, so the fallback is what makes the success path deterministic without loading 500M parameters.
- **`src/commands/memory.ts`** (Exports: `WhereClause, RefsSatisfyClause, handleMemoryCommand`): `field!=value` (ticket 45) — negates the comparison instead of requiring equality.
- **`src/commands/scan.determinism.test.ts`**: Ticket 37 verification: the blueprint card is a deterministic artifact. Repeated real ingests never duplicate the card (making SCAN_HELP's "updates that card in place" promise true), and repeated dry-runs are byte-identical across both output formats.
- **`src/commands/scan.fidelity.test.ts`**: The `--check` exit-code contract, which is what CI gates on: 0  clean and comparable 1  real architectural drift 2  incomparable — the baseline was produced by a different parser Code 2 is deliberately distinct from 1: failing a build for drift the user introduced is correct, and failing it because they upgraded neuron is a different problem with a different fix.
- **`src/commands/scan.test.ts`**: Methods: describe(), join(), it(), execSync().
- **`src/commands/scan.ts`** (Exports: `handleScanCommand`): Function handleScanCommand (Methods: handleScanCommand(), log(), parseFlags(), cwd()).
- **`src/commands/status.health.test.ts`**: Methods: process(), hookCacheDir(), on(), beforeEach().
- **`src/commands/status.test.ts`**: Methods: describe(), join(), beforeAll(), mkdirSync().
- **`src/commands/status.ts`** (Exports: `handleStatusCommand`): Truncates a content preview for the human-readable `--health` report only — the JSON payload always carries the full string.
- **`src/commands/sync.test.ts`**: A genuine content conflict (both sides present, different content) used to be silently resolved by comparing createdAt, which ties in the common case and defaulted to markdown winning — including when markdown was the stale side. Without --force, `sync` must now report the conflict, leave both stores untouched, and exit non-zero so a script or CI run notices rather than silently accepting a guessed resolution.
- **`src/commands/sync.ts`** (Exports: `handleSyncCommand, scaffoldNeuronDirectory`): Function handleSyncCommand (Methods: handleSyncCommand(), some(), includes(), error()).
- **`src/commands/ui.test.ts`**: Methods: describe(), afterEach(), close(), it().
- **`src/commands/ui.ts`** (Exports: `UiCommandOptions, handleUiCommand`): Function handleUiCommand (Methods: parseUiArgs(), parseInt(), findFreePort(), Promise()).
- **`src/commands/utils.test.ts`**: Methods: describe(), it(), spyOn(), mockImplementation().
- **`src/commands/utils.ts`** (Exports: `drawBox, parseFlags, updateMarkdownFile, getMemoryHelp`): Every option `parseFlags` understands with no `neuron.yaml` involved. Used to reject unrecognised flags and to suggest a correction — a typo'd flag used to be pushed into `positionals` and silently discarded, so `--importanc 5` looked like it worked and wrote the default instead. Re-exported from `config/neuronYaml.ts`, which is also where `validateNeuronYaml` checks a declared field's flag against this same list at config-load time (ticket 43) — one vocabulary, not two that can drift.

---
id: 7897e42e-c8c6-5178-0018-f26ebcd3a5f3
createdAt: 2026-08-10T19:12:14.202Z
importance: 5
tags:
  - architecture
  - topology
  - scan
  - deep
taskId: null
---
### 🧩 components (`src/components`)
Primary components module containing core application capabilities.

**Key Components & Export Contracts:**
- **`src/components/binaryVersion.test.ts`**: Builds a fake `<pkgRoot>/dist/cli.js`-shaped binary and returns its path.
- **`src/components/binaryVersion.ts`** (Exports: `BinaryVersionMismatch, checkBinaryVersionMismatch`): `version` from the cwd's own `package.json` — the source tree being developed.
- **`src/components/embedder.test.ts`**: Methods: describe(), it(), TransformersEmbedder(), embed().
- **`src/components/embedder.ts`** (Exports: `Embedder, TransformersEmbedder`): Class TransformersEmbedder (Methods: createRequire(), applyCrossPlatformShims(), require(), dirname()).
- **`src/components/enricher.ts`** (Exports: `Centroid, VocabularyEntry, buildTagVocabulary, buildCategoryCentroids, TagSelectionOptions, selectTags, selectCategory, CategoryOption, CategoryInferenceInput, CategoryInferenceResult, EnrichmentModel, LocalEnrichmentModelOptions, LocalEnrichmentModel, buildCategoryPrompt`): Write-side enrichment: inferring the metadata a caller did not supply. Two fields are inferred, by different machinery chosen from what each field actually is (see `docs/design/write-side-enrichment/spec.md`): tags       — selected from a closed vocabulary by centroid cosine. No model: the embedder is already loaded on the write path, and ADR 0010 §4 forbids the model from minting a tag, which makes tagging a ranking problem rather than a generation one. category   — centroid cosine by default, which beat the model 9/9 to 1/9 on the same corpus (Pillar 11). The model strategy survives as an opt-in because it can read a category's `description` as an instruction rather than merely as a similarity target. `importance` was a third inferred field and is not inferred any more. Pillar 10 measured the shipped 0.5B model's judgement as noise — discrimination of -0.5 then +0.167 across consecutive runs, per-entry stability 0.5, and a note about irreversible production data loss rated `1`. It shipped `off` in ticket 06 and was removed outright in ticket 26; an omitted `--importance` takes the column default. Git history holds the implementation if a larger model ever makes the question worth reopening.
- **`src/components/fts-query.test.ts`**: Methods: describe(), it(), expect(), toBe().
- **`src/components/fts-query.ts`** (Exports: `isStopword, cleanFtsQuery`): Converts a natural language query string into a safe SQLite FTS5 MATCH expression. ## Why stopwords are dropped The keyword leg is fused with the semantic leg by Reciprocal Rank Fusion, which rewards a document's rank position in each list rather than how well it actually matched. Because terms are joined with `OR`, a document matching a single common word enters the FTS ranking at all — and if it is the only match, it enters at rank 1 and collects the full RRF contribution. Observed: the query "what payment provider do we use" ranked a document about a Rust auth daemon above the correct billing document, because `"do"`, `"we"` and `"use"` were searchable terms. Noise words give noise a guaranteed seat. Dropping them means an all-stopword query produces an empty expression, which the caller treats as "no keyword leg" and answers semantically — the correct degradation, and far better than a MATCH that hits every row.
- **`src/components/generator.ts`** (Exports: `GeneratorProgress, getTextGenerator, isTextGeneratorLoaded, resetTextGenerator`): The shared text-generation model (`Xenova/Qwen1.5-0.5B-Chat`). Loading it costs ~3.2s and dominates its total cost — the load is 87% of a single-inference invocation, and every CLI command is its own process. The loader is therefore a module-level singleton so that a `neuron scan` which has already paid for the model can hand it to write-side enrichment for free, rather than each consumer loading its own copy.
- **`src/components/index.ts`**: No exported symbols detected.
- **`src/components/reranker.test.ts`**: Methods: describe(), it(), TransformersReranker(), score().
- **`src/components/reranker.ts`** (Exports: `Reranker, TransformersReranker`): Raw cross-encoder relevance logit for one query/passage pair — not a probability. Positive means the model predicts the pair relevant, negative means not; callers threshold at 0, not at 0.5.
- **`src/components/summarizer.test.ts`**: Handles dual storage reads and writes across Markdown and SQLite
- **`src/components/summarizer.ts`** (Exports: `SmolLM2Summarizer`): Delegates to the process-wide loader so write-side enrichment (which calls `getTextGenerator()` directly, `enricher.ts`) and anything else warming the model in the same process share one load rather than paying for it twice. Kept on this class only because `neuron init` already calls `preloadModel()` here to warm enrichment's model ahead of time (ticket 26 removed this class's own use of it \u2014 per-file architecture summaries are deterministic now, not model-generated).
- **`src/components/timeout.ts`** (Exports: `TimeoutError, withTimeout`): The timeout primitive. Before this, the only `timeout` in the codebase was SQLite's `busy_timeout`; a hung `generate()` hung its caller forever. ADR 0010 §3 requires every model call to be a bounded wait. It bounds the wait, not the work: the underlying ONNX generation cannot be cancelled, so a timed-out call keeps running to completion in the background and its result is discarded. That is acceptable because the process is short-lived — but it means a timeout does not free the CPU it was spending.

---
id: 55fd983b-b2b3-a012-2507-837b46e7e94b
createdAt: 2026-08-10T19:12:14.246Z
importance: 5
tags:
  - architecture
  - topology
  - scan
  - deep
taskId: null
---
### 🧩 config (`src/config`)
Primary config module containing core application capabilities.

**Key Components & Export Contracts:**
- **`src/config/categoryPath.test.ts`**: Methods: describe(), it(), baseConfig(), expect().
- **`src/config/categoryPath.ts`** (Exports: `resolveCategoryPath, rawCategoryPath, resolveAllCategoryRoots`): `categories.<name>.path > storage.path > '.neuron'` (ticket 05). Absolute per-category paths are allowed by design — a shared notes directory outside the repo is a plausible want, and `storage.path` itself already permitted absolute values. The `path.resolve` below is a no-op for an already-absolute `raw`.
- **`src/config/harness.test.ts`**: Methods: describe(), beforeEach(), mkdtempSync(), afterEach().
- **`src/config/harness.ts`** (Exports: `AgentHarness, isHarnessPresent, detectHarnesses, copySkill`): A narrower, harness-specific marker to check instead of `base`'s bare directory existence (ticket 31, neuron-2.4.0). Only `github` needs this: `.github/` is created for reasons that have nothing to do with Copilot (CI workflows, issue templates), so bare-directory detection there was a false-positive trap. `.claude/`/`.codex/`/`.cursor/` have no comparable unrelated-creator convention, so they keep the plain `base` check.
- **`src/config/index.ts`**: No exported symbols detected.
- **`src/config/neuronYaml.test.ts`**: Methods: describe(), join(), beforeAll(), mkdirSync().
- **`src/config/neuronYaml.ts`** (Exports: `StorageMode, StorageConfig, CategoryField, CategoryConfig, fieldKeyToFlagName, fieldKeyToColumnName, isValidColumnIdentifier, DeclaredFieldFlag, collectDeclaredFieldFlags, PullRuleDefault, PullRuleOnExec, PullRulesConfig, ScanConfig, LlmEnrichmentConfig, LlmConfig, RelevanceGateConfig, RelevanceConfig, RecallConfig, NeuronConfig, findNeuronYaml, findConfigFile, findWritableConfigPath, validateNeuronYaml, parseNeuronYaml, loadNeuronYaml, declareCategoryInNeuronYaml, loadConfig, resolveExecCategories`): Four deprecated spellings, all deleted by ticket 06 (neuron-2.3.0) or its predecessor ticket 28, all aliased rather than hard-failing — a config that errors on upgrade turns a rename into an outage (ADR 0011 §7): - `md-only` and `dual` are pre-2.2.0-rc5 spellings: `md-only` because every one of its defects traced to `this.db = null`, and `dual` because it was renamed to `md` — same mechanism, correct name now that `md-only` no longer exists to be confused with. - `vector-only` is the pre-2.3.0 top-level spelling of the vector-only mode, renamed to `vector` to converge with the per-category vocabulary (which never had an "-only" suffix to begin with). - `split` is deleted outright (ticket 06): the per-category override (`categories.<name>.storage`) is now always live regardless of the top-level mode, so `split` was never a third storage behaviour — it was a flag meaning "honour the overrides," which every mode now does. It aliases to `md` rather than `vector` because that is split's own pre-existing default for a category with no explicit override (`mdCategoriesForSplit` treated anything not explicitly `vector` as `md`) — aliasing to `md` reproduces every existing split config's behaviour byte-for-byte, overrides included, where aliasing to `vector` would silently flip every override-less category to vector-only.
- **`src/config/protocolBlock.test.ts`**: Methods: config(), parse(), describe(), it().
- **`src/config/protocolBlock.ts`** (Exports: `ProtocolFidelity, ProtocolBlockOptions, generateProtocolBlock, ProtocolWriteAction, UpsertProtocolBlockResult, findMarkerRange, upsertProtocolBlock`): Ticket 14: hooks own the read side on a harness with a deterministic adapter, so the generated protocol block only needs to teach the write side there. A harness with no such adapter (including every harness without a `HarnessAdapter` at all — 'best-effort' ones fall into this bucket too, since neither can guarantee the model ever sees a result) has nothing else performing recall, so it keeps the manual query step.
- **`src/config/scaffold.test.ts`**: The template is a contract with the user: a key in it that the schema does not read looks configured and does nothing. `llm.enrichment.importance` is the concrete hazard — removed by ticket 26, and silently dropped by Zod, so it would fail invisibly rather than loudly.
- **`src/config/scaffold.ts`** (Exports: `ScaffoldResult, scaffoldNeuronYaml`): The config `neuron init` writes when a project has none (ticket 31). Two rules govern what may appear here: 1. Every key is one the schema actually reads. An aspirational key in a generated file is worse than an undocumented one — it looks configured and does nothing. `llm.enrichment.importance` is the cautionary example: it was removed by ticket 26, and Zod silently strips it, so a template carrying it would advertise a setting that cannot take effect. `pullRules.default.minScore` is the same trap in a louder form: ticket 39 deprecated it (it cannot reject a top hit at any relevance, ADR 0012) and every command now warns on stderr when it's present — a template carrying it would make a fresh `neuron init` noisy on its very first run. 2. `architecture` is declared even though `scan.enabled` is `false`. `scan.category` defaults to `architecture`, so a config that sets up the scan without declaring the category it writes into leaves those entries outside `categories` — which in `md` mode means the reconcile pass never covers them. Declaring it costs one no-op reconcile per command and removes the trap for anyone who later flips `enabled: true`. 3. Nothing here turns on behaviour the schema defaults leave off. `scan.enabled` stays `false`, matching a config-less project, so generating this file changes what a project says rather than what it does. An `init` that quietly started scanning — loading the summarizer and filing a blueprint card nobody asked for — would be a behaviour change disguised as a convenience. The pull rules are the one place the template is opinionated rather than default, and they are opinionated in the file, where the user can read and change them. The `llm` block is deliberately omitted. Its defaults are the values ticket 06's A/B selected on evidence (`categoryStrategy: centroid`, 9/9 against the model's 1/9); pinning them into every generated file would freeze a measured result as a user setting and make future corrections invisible.

---
id: 6e5f19ef-c872-03a7-7893-f8fcbca2cb3b
createdAt: 2026-08-10T19:12:14.290Z
importance: 5
tags:
  - architecture
  - topology
  - scan
  - deep
taskId: null
---
### 🧩 e2e (`src/e2e`)
Primary e2e module containing core application capabilities.

**Key Components & Export Contracts:**
- **`src/e2e/mdFileManagement.e2e.test.ts`**: Methods: describe(), beforeEach(), mkdtempSync(), afterEach().

---
id: e701ba4b-1212-b872-6c97-b40d4f32b792
createdAt: 2026-08-10T19:12:14.299Z
importance: 5
tags:
  - architecture
  - topology
  - scan
  - deep
taskId: null
---
### 🧩 harnesses (`src/harnesses`)
Primary harnesses module containing core application capabilities.

**Key Components & Export Contracts:**
- **`src/harnesses/cacheDir.ts`** (Exports: `projectHash, hookCacheDir, sessionFileKey`): Same hash scheme `NeuronMemory` uses for its SQLite filename (`src/index.ts`), reused here so ledger/hook-state files land in a predictable, collision-resistant per-project directory without importing `NeuronMemory` itself — this module only ever touches the filesystem, never the memory store.
- **`src/harnesses/claudeCode.test.ts`**: Methods: describe(), join(), ClaudeCodeAdapter(), beforeEach().
- **`src/harnesses/claudeCode.ts`** (Exports: `ClaudeCodeAdapter`): Neuron's own lifecycle vocabulary, translated to Claude Code's event names.
- **`src/harnesses/codex.test.ts`**: Methods: describe(), join(), CodexAdapter(), beforeEach().
- **`src/harnesses/codex.ts`** (Exports: `CodexAdapter`): Neuron's own lifecycle vocabulary, translated to Codex CLI's event names. Confirmed identical to Claude Code's naming (`learn.chatgpt.com/docs/hooks`, fetched directly during this ticket): `SessionStart`, `UserPromptSubmit`, and `PreCompact` are named exactly the same on both harnesses.
- **`src/harnesses/copilot.test.ts`**: Methods: describe(), join(), CopilotAdapter(), beforeEach().
- **`src/harnesses/copilot.ts`** (Exports: `CopilotAdapter`): Neuron's own lifecycle vocabulary, translated to Copilot CLI's event names — camelCase, unlike Claude Code/Codex's PascalCase (confirmed via direct fetch of `docs.github.com/en/copilot/reference/hooks-reference` during this ticket). Only `session-start` has an entry: `pre-prompt` and `context-reset` are deliberately never wired (see `capability()` below), so the map only needs to cover the one point neuron can actually use.
- **`src/harnesses/cursor.test.ts`**: Methods: describe(), join(), CursorAdapter(), beforeEach().
- **`src/harnesses/cursor.ts`** (Exports: `CursorAdapter`): Neuron's own lifecycle vocabulary, translated to Cursor's event names (camelCase, confirmed via direct fetch of `cursor.com/docs/hooks` during this ticket — the same naming-convention family as Claude Code/Codex). `pre-prompt` has no entry: `beforeSubmitPrompt` fires every turn but its documented output is `{continue, user_message}` — permission allow/deny only, no context-carrying field — so neuron never wires a hook there at all, same design call ticket 01 made for Copilot CLI's `userPromptSubmitted`. Unlike Copilot, `context-reset` does get a real event (`preCompact`) — see `capability()` below for why wiring it still doesn't make the epoch reliably roll.
- **`src/harnesses/discoveryHint.test.ts`**: Methods: describe(), it(), expect(), toBeNull().
- **`src/harnesses/discoveryHint.ts`** (Exports: `buildDiscoveryHint`): Ticket 06 (neuron-2.4.0): a per-turn hint that teaches the agent the broader `neuron memory query` surface exists, fired only when this turn's relevance-gated recall actually left something on the table — never a generic "you can search" note, always the real command with the real count. Counts against the same per-turn char budget as everything else `hook.ts` injects (no reserved allotment), so a tight budget just drops it.
- **`src/harnesses/gitLog.test.ts`**: Methods: describe(), join(), git(), execFileSync().
- **`src/harnesses/gitLog.ts`** (Exports: `GitLogCommit, getHeadSha, listAllCommits, listCommitsSince`): Ticket 08 (neuron-2.4.0) / ADR-less design ruling on ticket 39 (neuron-2.3.0): pure git shell-out, no DB access, so the parsing itself is testable without a `NeuronMemory` instance. `NeuronMemory`'s own `refreshGitLogIndex`/`searchGitLog` (`src/index.ts`) own the SQLite side.
- **`src/harnesses/hintFollowLog.test.ts`**: Methods: describe(), join(), beforeEach(), rmSync().
- **`src/harnesses/hintFollowLog.ts`** (Exports: `HintEvent, recordHintFired, recordToolUse, readHintEvents`): Ticket 07 (neuron-2.4.0): does the per-turn discovery-command hint (ticket 06) actually get followed? This module is the recording half of that measurement — append-only, so a 'fired' event and a later 'query-run' event are two independent rows a separate analysis pass joins, never a single record mutated in place (no lock needed, no race between a pre-prompt hook and a concurrent post-tool-use hook writing at once). Deliberately not a `LifecyclePoint` / `HarnessAdapter` citizen: this is dogfood-only instrumentation for this one measurement, wired by hand into this repo's own `.claude/settings.json` `PostToolUse` entry, not part of what `neuron init` installs for a user's project.
- **`src/harnesses/hookState.ts`** (Exports: `recordFired, readFiringState`): Firing evidence, not inference from file contents. Ticket 10 found no harness researched documents an external way to confirm a registered hook actually fired — so neuron manufactures its own evidence: the hook command records a timestamp the moment it runs, before doing any of the work that could fail. `verify()` reads this file to answer "is this hook firing" as a fact, not a guess from `settings.json` being present.
- **`src/harnesses/index.ts`**: No exported symbols detected.
- **`src/harnesses/ledger.test.ts`**: Methods: entry(), describe(), join(), beforeEach().
- **`src/harnesses/ledger.ts`** (Exports: `EpochRecord, EpochState, loadEpochState, filterUnseen, remainingEpochBudget, recordSessionStartInjection, recordPrePromptTurn, recordPreCommandInjection, rollEpoch, RecallCostSummary, summarizeRecallCost, buildZeroSessionsWarning`): Session-scoped recall state (ADR 0014 §3 dedupe, extended by ticket 07 / neuron-2.3.0 with a per-epoch cost budget). An epoch is the span between session start (or the last compaction) and the next `context-reset` — not the whole session — because compaction deletes everything neuron previously injected, so re-injecting after one is recovery, not repetition. Both the dedupe ledger and the char-spend budget therefore share one lifecycle: `rollEpoch` resets both together rather than treating them as two files with two reset rules. A ledger older than this is treated as abandoned rather than tracked forever — sessions that never fire `context-reset` (compaction) or end cleanly would otherwise leak one file per session indefinitely.
- **`src/harnesses/payload.test.ts`**: Methods: entry(), describe(), it(), buildPayload().
- **`src/harnesses/payload.ts`** (Exports: `formatMemoryEntry, PayloadResult, buildPayload`): The payload budget, per ADR 0014 §4: no relevance floor ships (ticket 39 found every cosine floor from 0.50-0.70 regresses recall on real conversational text), so the character ceiling is the sole volume control, and it must sit strictly below the smallest known harness cap so neuron never relies on spill-to-file — spill hands the model a preview and a path, which turns deterministic recall back into agent-invoked recall at exactly the moment the payload is largest. Claude Code's own documented cap is 10,000 characters (`additionalContext` / `systemMessage` / stdout). Codex CLI's is ~2,500 tokens, which neuron counts as characters rather than tokens (exact, free, and tokenising on the hook path would spend per-turn latency approximating a limit one harness already states in characters) — even a generous 4 chars/token reading of that cap is 10,000 chars, and a conservative 3 chars/token reading is 7,500. Both budgets below are chosen to sit under every one of those readings, not just Claude Code's own cap, since this module is shared by every adapter (ticket 13 onward).
- **`src/harnesses/types.ts`** (Exports: `LifecyclePoint, SupportRecord, CapabilityMap, FidelityLabel, deriveFidelity, HookTarget, OverwritePolicy, InstallOptions, InstallResult, UninstallResult, VerifyPointStatus, VerifyResult, HarnessAdapter`): The recall adapter interface, per ADR 0014 / ticket 11. Capability is a per-lifecycle-point map, not a single enum: two harnesses can occupy the same `deterministic`/`best-effort` label while differing on exactly what they leave undocumented. The enum is derived for display only (`neuron init` output, the README matrix) and is never itself stored — see `deriveFidelity` below.

---
id: d0848aeb-fee5-aea5-8356-ea240769fcb0
createdAt: 2026-08-10T19:12:14.343Z
importance: 5
tags:
  - architecture
  - topology
  - scan
  - deep
taskId: null
---
### 🧩 models (`src/models`)
Primary models module containing core application capabilities.

**Key Components & Export Contracts:**
- **`src/models/index.ts`**: No exported symbols detected.
- **`src/models/maintenance.ts`** (Exports: `MaintenancePolicy, MaintenanceReport`): No exported symbols detected.
- **`src/models/memory.ts`** (Exports: `MemoryKind, MemoryQuery, Memory, MemoryMutation, MutationResult, FieldComplianceViolation, FieldRepairOutcome, DuplicateGroupEntry, DuplicateGroup, StoreHealth, DuplicateMergeOutcome, StoreHealthRepairReport`): @deprecated Use plain `string` for category names instead.
- **`src/models/options.ts`** (Exports: `NeuronMemoryOptions`): Injected write-side enricher. Tests supply a stub so the transaction seam can be exercised without loading a 500M-parameter model; production leaves it unset and gets `LocalEnrichmentModel`.

---
id: 7f35f81f-66b7-133b-1489-159eff5d10f1
createdAt: 2026-08-10T19:12:14.360Z
importance: 5
tags:
  - architecture
  - topology
  - scan
  - deep
taskId: null
---
### 🧩 scanner (`src/scanner`)
Primary scanner module containing core application capabilities.

**Key Components & Export Contracts:**
- **`src/scanner/analyzer.test.ts`**: Class ServerApp (Methods: describe(), join(), beforeAll(), mkdirSync()).
- **`src/scanner/analyzer.ts`** (Exports: `isIgnoredEntryName, ModuleSummary, ScanResult, scanProjectTopology`): Traversal rules shared by the topology scan and the drift fingerprint guard. Both must agree on exactly which files feed a scan: if the guard watches a narrower set than the scanner reads, edits to the difference are invisible and drift is never re-checked. Derived from the parser's own language list so the filter can never be narrower than what TreeSitterScanner can actually parse — a mismatch here silently hides whole languages (previously .tsx/.jsx/.cpp) from every scan.
- **`src/scanner/compressCard.test.ts`**: Methods: fakeIndex(), from(), join(), describe().
- **`src/scanner/compressCard.ts`** (Exports: `compressArchitectureCard`): Compresses the architecture index (ticket 28's small, always-injectable card — module list only, no per-file detail) down to a target character budget for injection, without touching the stored index `neuron scan --diff` reads. Ticket 30: this used to compress the old monolithic card (ticket 27), which needed real machinery to structurally degrade per-module per-file detail. Post-28, the stored card fetched here is the index — there's no per-file detail left in it to strip, only a header (purpose, dependency contract, subsystem map) and one line per module. So compression is now just: keep the header whole, then keep as many whole module-list lines as fit, never cutting a line in half. Real measurement on this repo (14 modules, ~1.6KB) shows the index uses ~27% of the 6,000-char injection budget, so this path is rarely exercised — but per-module-line growth is only ~40 bytes/module here, and the header itself grows with the dependency list, so a much larger repo can still exceed the budget. The "never cut silently" discipline (25/26/27) carries forward: a cut always reserves room for a note before laying out anything, so it's never dropped for lack of space.
- **`src/scanner/degradation-warning.test.ts`**: Scope item 2: a language that should have parsed from an AST but could not must say so loudly, not degrade in silence. The distinction that matters: Ruby and PHP have no grammar in 2.2.0 at all, so their regex fidelity is expected and unremarkable. TypeScript falling back means something went wrong with the install, and the resulting card is worse than the user has any reason to expect.
- **`src/scanner/diff.test.ts`**: Ticket 28 split `synthesizeArchitecture`'s output into an index plus per-module markdown (what actually gets stored). These round-trip tests exercise `parseBaselineBlueprint`, which still expects the pre-28 monolithic shape — the same reassembly `reassembleBaseline` (ingest.ts) does from storage for ticket 29, done here directly from the summarizer's output instead of via a memory store.
- **`src/scanner/diff.ts`** (Exports: `ModuleDiff, ExportDiff, DependencyDiff, ArchitecturalDiff, parseBaselineBlueprint, calculateArchitecturalDiff, formatArchitecturalDiffMarkdown, getArchitecturalDrift, autoRescanIfDriftDetected`): The baseline and the scan were produced by different parsers, so their difference is not drift. Mutually exclusive with `hasDrift`.
- **`src/scanner/fidelity.ts`** (Exports: `FidelityDescriptor, descriptorFor, fidelityFromComponents, areComparable, formatFidelitySection, parseFidelitySection`): Parser fidelity: how a blueprint card's symbols were obtained, and whether two cards can be meaningfully compared at all. A drift report is a comparison between two measurements. If the two were taken with different instruments, their difference is not drift — it is an artefact of the instrument change. Recording fidelity on the card is what lets `neuron scan --diff` tell those apart instead of reporting hundreds of phantom export changes the moment a user upgrades.
- **`src/scanner/fingerprint.test.ts`**: Methods: describe(), join(), beforeEach(), random().
- **`src/scanner/fingerprint.ts`** (Exports: `FingerprintInputs, computeProjectFingerprint, readReconciledFingerprint, writeReconciledFingerprint, clearReconciledFingerprint`): Cheap change-detection for the implicit drift re-scan. `scanProjectTopology` parses every source file's AST, which is far too expensive to run on every `memory query`. A stat-only walk over the same file set is orders of magnitude cheaper, so we fingerprint the tree and skip the scan entirely when nothing has moved since the last reconcile. This guard only gates the implicit re-scan. `neuron scan`, `--diff`, and `--check` always perform a real scan, so CI and explicit checks are never served a cached verdict.
- **`src/scanner/grammars.test.ts`**: Build an npm-shaped tarball containing the given `package/`-relative files.
- **`src/scanner/grammars.ts`** (Exports: `GrammarSpec, grammarCacheDir, grammarPaths, isGrammarCached, cachedLanguages, GrammarFetchOutcome, EnsureGrammarsOptions, ensureGrammars, GrammarLoader`): Tree-Sitter grammar acquisition. Compiled `.wasm` grammars are fetched at `neuron init` and cached on disk rather than bundled in the npm tarball. Eight grammars weigh ~8.5 MB against a 621 KB package, and the ONNX models already establish the fetch-at-init pattern, so grammars follow it. See docs/adr/0008. Artifacts come from the official `tree-sitter-<lang>` packages on the npm registry, which ship both a prebuilt `.wasm` and a `queries/tags.scm`.
- **`src/scanner/implicit-rebaseline.test.ts`**: The implicit path — the auto-rescan fired by `memory query`. On a fidelity mismatch it re-baselines exactly as it would for drift, and says nothing. A distinct announcement was considered and rejected: the drift and missing-baseline messages would both state something untrue here, and the migration is not something the user needs to act on when it self-heals.
- **`src/scanner/ingest.test.ts`**: Main app entry
- **`src/scanner/ingest.ts`** (Exports: `blueprintCardId, moduleCardId, parseModuleListFromIndex, IngestOptions, ingestScanResults, reassembleBaseline`): A stable id for "the" blueprint card in a category, derived rather than looked up. Re-running `neuron scan` must always resolve to the same row — a semantic search over the category can rank the card out of its result window once enough other entries share the category (ticket 37), so there is deliberately no query here at all: same category in, same id out. Ticket 28: this id now identifies the index — module list plus project-wide metadata — not the full blueprint. Per-module detail lives at `moduleCardId(category, modulePath)` instead.
- **`src/scanner/queries.ts`** (Exports: `SymbolKind, isIgnoredCapture, isTypeLikeAncestor, resolveKind, kindPrecedence, refineGoTypeSpec`): Per-language symbol extraction queries and the rules that turn a captured syntax node into a `ScannedSymbol`. Two things live here because they are one decision: which S-expression query finds declarations in a language, and how the node it captures maps to a symbol kind. Splitting them would let a query and its kind table drift. ## Why some queries are hand-written Most grammars ship a `queries/tags.scm` (ticket 01 caches it next to the `.wasm`). Those queries were written for code navigation — "jump to the thing under my cursor" — not for the declaration inventory a blueprint card needs, so each one is audited before adoption rather than trusted wholesale. TypeScript's shipped query fails that audit outright: it covers only ambient declaration forms (`function_signature`, `method_signature`, `abstract_class_declaration`, `interface_declaration`) and has no rule for `function_declaration` or `method_definition`. Against `export class Alpha { thing() {} }` it captures nothing but a stray generic parameter, where JavaScript's equivalent has 13 definition rules. Neuron is itself a TypeScript project, so TypeScript and TSX get the queries below and everything else uses its shipped `tags.scm`.
- **`src/scanner/treesitter.test.ts`**: These tests exercise the real grammars, not a mock. A mocked parser would only prove the query strings are strings — the whole point is whether the queries actually match the declaration forms each grammar produces. Grammars normally arrive via `neuron init`; fetch anything missing once so a cold checkout still runs. Every AST assertion below also asserts `fidelity === 'ast'`, so an offline machine fails loudly instead of quietly passing at regex fidelity — which is the failure mode ticket 02 exists to remove.
- **`src/scanner/treesitter.ts`** (Exports: `ScannedSymbol, ParserFidelity, ParsedFile, DynamicGrammarLoader, TreeSitterScanner`): Whether the symbol is part of the file's public surface. Methods are never exports — the class is. Keeping members out of this set is what stops `neuron scan --diff` reporting an export contract change every time a private helper is renamed.

---
id: ffa8d0d4-65bd-991a-bd89-847b5a0ea43f
createdAt: 2026-08-10T19:12:14.405Z
importance: 5
tags:
  - architecture
  - topology
  - scan
  - deep
taskId: null
---
### 🧩 shared (`src/shared`)
Primary shared module containing core application capabilities.

**Key Components & Export Contracts:**
- **`src/shared/projectRoot.ts`** (Exports: `findProjectRoot`): Single shared implementation of upward project-root discovery. Was duplicated byte-for-byte between `NeuronMemory.open()` (src/index.ts) and `commands/utils.ts` until ticket 30 (neuron-2.4.0): `autoRescanIfDriftDetected` and `neuron scan` derived their scan root from literal `process.cwd()` instead of this walk, so a CLI invocation from a project-marker-less subdirectory (any bare `.scratch` effort's `issues` dir qualifies) could scan and ingest a degenerate topology into the real project's store. Both surfaces now import this one function so the scan root and the storage root are provably the same resolution.
- **`src/shared/textMatch.ts`** (Exports: `editDistance, suggestClosest`): Cheap edit distance, only ever called on an error path (a typo'd CLI flag or enum value). Shared between `commands/utils.ts` (unknown-flag suggestions) and `NeuronMemory`'s field-schema enforcement (enum-value suggestions, ticket 43) so the two surfaces suggest corrections the same way rather than drifting into two slightly different heuristics.

---
id: f201921e-b8f4-7115-84d4-d1aa1534dff0
createdAt: 2026-08-10T19:12:14.417Z
importance: 5
tags:
  - architecture
  - topology
  - scan
  - deep
taskId: null
---
### 🧩 storage (`src/storage`)
Primary storage module containing core application capabilities.

**Key Components & Export Contracts:**
- **`src/storage/dualStorageRouter.pathChange.test.ts`**: Ticket 05's "data-loss-adjacent part": `md` mode's mirror deletes any vector row whose id isn't found in the markdown read from a category's current resolved root. If `neuron.yaml` changes `categories.learning.path` between two commands, the old file is still sitting at the old root — a naive reconcile against the new (empty) root would read that as "markdown deleted everything" and wipe the vector index. Per the maintainer's decision, the actual behaviour is a per-category reseed from the vector index into the new root instead — asserted end to end here rather than just unit-testing the resolver.
- **`src/storage/dualStorageRouter.test.ts`**: `update`/`delete` in md mode reports success if EITHER store actually changed within the same command — `vecResult` is consulted, not just the md outcome, so a real vector-side change is never reported as `not_found` just because the markdown-side write hiccupped in the same call. This used to also cover a second scenario — a markdown-only deletion made between commands, leaving a vector-only orphan for a later update/delete to salvage — but ticket 29's strict-mirror reconcile (below) now purges that orphan automatically on the very next command, before the mutation is even processed, so "not_found" on it is correct now rather than a bug.
- **`src/storage/dualStorageRouter.ts`** (Exports: `DualStorageRouter`): Ticket 06 (neuron-2.3.0) collapsed the old three-way `vector-only` / `split` / `md` dispatch into one always-live per-category resolution — `resolveCategoryStorage` decides each mutation's category individually, and `mdCategories()` (the subset that resolves to `md`) is what gets reconciled first. A pure-vector config (no category resolves to `md`) reconciles an empty list, which `reconcile()` short-circuits on immediately — the same zero-cost path the old `vector-only` branch's direct `vectorDb.transact` call gave, just reached without a special case.
- **`src/storage/index.ts`**: No exported symbols detected.
- **`src/storage/mdFileManagement.integration.test.ts`**: Methods: describe(), beforeEach(), mkdtempSync(), join().
- **`src/storage/mdStorage.ts`** (Exports: `MdStorage`): The markdown-storage surface every caller (`NeuronMemory`, `DualStorageRouter`, `syncMdWithVector`, `neuron sync`) actually depends on. Extracted so a caller can be handed either a single-root `MdStorageAdapter` or a `MultiRootMdStorage` that fans out across several resolved category roots (ticket 05) without knowing which.
- **`src/storage/mdStorageAdapter.challenger.test.ts`**: Methods: describe(), join(), now(), beforeEach().
- **`src/storage/mdStorageAdapter.test.ts`**: Methods: describe(), join(), now(), beforeEach().
- **`src/storage/mdStorageAdapter.ts`** (Exports: `MdStorageAdapterOptions, sanitizeCategoryFilename, MdStorageAdapter`): The same category → filename sanitization `getFilePath` applies, exported so config-time collision validation (ticket 05, `validateNeuronYaml`) can predict which file two categories would collide on without constructing an adapter.
- **`src/storage/mdVectorSync.test.ts`**: Previously named "Timestamp Conflict Resolution" and asserted that a newer `createdAt` on the markdown side won. That mechanism is gone: a normal `memory update` never touches `createdAt` on either side, and `.md` frontmatter has no `updatedAt`, so comparing `createdAt` was comparing two values that are almost always equal — which meant "md wins" fired on every real conflict, not just ones where md was genuinely newer. That silently reverted a real vector-side update to stale markdown content in production use. A conflict is now reported and left untouched unless --force explicitly says markdown wins.
- **`src/storage/mdVectorSync.ts`** (Exports: `SyncOptions, SyncResult, computeMemoryHash, cleanTmpFiles, cleanAllTmpFiles, syncMdWithVector`): Entries present on both sides with genuinely different content, left untouched. Neither store has a reliable last-modified signal — `.md` frontmatter has no `updatedAt`, and a normal `memory update` never touches `createdAt` on either side — so there is no safe way to guess which side is fresher. Guessing here is what caused a real regression: a legitimate vector-side update silently reverted to stale markdown content because their (unchanged, identical) `createdAt` values tied. Resolve explicitly with `--force` (markdown wins, matching its documented "force re-embed" semantics) after inspecting the conflict.
- **`src/storage/multiRootMdStorage.test.ts`**: Methods: keys(), describe(), join(), now().
- **`src/storage/multiRootMdStorage.ts`** (Exports: `MultiRootMdStorage`): Fans a single `MdStorage` surface out across every root a category's `categories.<name>.path > storage.path > '.neuron'` chain resolves to (ticket 05). Chosen over teaching `MdStorageAdapter` itself to resolve per-category: each resolved root keeps its own plain, single-root adapter underneath — unchanged internals, unchanged path-traversal containment (`getFilePath`'s sanitization still runs per adapter, so a malicious category name still can't escape its own resolved root) — and this class is just a thin lookup in front of a small, lazily-populated registry of them, keyed by resolved absolute directory so two categories sharing a root share one adapter instance (and one `readdirSync`, if it ever needs one). `overrideRoot`, when set, pins every category to one literal root, bypassing config resolution entirely — the same escape hatch `handleSyncCommand`'s `overrideStoragePath` parameter already gave callers before this ticket.

---
id: c8bf6476-d242-f304-be92-1693759439f2
createdAt: 2026-08-10T19:12:14.464Z
importance: 5
tags:
  - architecture
  - topology
  - scan
  - deep
taskId: null
---
### 🧩 ui (`src/ui`)
Primary ui module containing core application capabilities.

**Key Components & Export Contracts:**
- **`src/ui/html.ts`** (Exports: `generateDashboardHtml`): Function generateDashboardHtml (Methods: generateDashboardHtml(), rgba(), var(), Header()).
- **`src/ui/progress.test.ts`**: Methods: describe(), it(), PassThrough(), on().
- **`src/ui/progress.ts`** (Exports: `ScanProgress, ScanProgressBarOptions, ScanProgressBar`): Class ScanProgressBar (Methods: update(), max(), round(), repeat()).
- **`src/ui/server.ts`** (Exports: `UiServerOptions, UiServer, startUiServer`): Function startUiServer (Methods: close(), startUiServer(), createServer(), URL()).

---
id: 5a5c8cf9-def1-2a4e-72de-63800d4c82ae
createdAt: 2026-08-10T19:12:14.482Z
importance: 5
tags:
  - architecture
  - topology
  - scan
  - deep
taskId: null
---
### 🧩 e2e (`test/e2e`)
Primary e2e module containing core application capabilities.

**Key Components & Export Contracts:**
- **`test/e2e/adversarial-corpus.ts`** (Exports: `AdversarialFamily, AdversarialCase, buildFiller`): Adversarial retrieval corpus. The baseline recall pillar scores 1.0 because its distractors are only lexically noisy — templated strings that share vocabulary but are semantically unrelated, which hybrid search separates trivially. A metric pinned at its ceiling can detect a regression but can never show an improvement, and it predicts nothing about real retrieval quality. These cases are built to be genuinely hard, in four families: lexical-decoy  the wrong answer shares MORE query keywords than the right one, so keyword scoring alone picks the decoy paraphrase     near-miss neighbours that are topically identical but answer a different question contradiction  an outdated memory superseded by a newer one; the newer must win multi-hop      the query names none of the gold's salient terms and must be bridged conceptually
- **`test/e2e/adversarial-recall.test.ts`**: Pillar 7 — Adversarial Retrieval Quality. Runs the real embedder against hard negatives engineered to beat the gold answer on keyword overlap, topical proximity, or staleness. Unlike the baseline recall pillar this is expected to sit below ceiling: the point is a metric with headroom that can move in both directions when retrieval changes. Thresholds are therefore deliberately loose — this pillar earns its keep as a tracked score, not as a tripwire.
- **`test/e2e/antagonistic-corpus.ts`** (Exports: `AntagonisticFamily, AntagonisticCase`): Antagonistic (off-topic) query corpus — Pillar 13. Pillar 7's corpus builds hard negatives: distractors that share vocabulary or topic with the gold answer so ranking has to work to win. This corpus is the mirror case — queries engineered to share NOTHING with anything seeded by `adversarial-corpus.ts` (fillers, hard negatives, superseded entries, golds), so a correct system must return nothing at all. Every query here was checked, not assumed, against that seeded vocabulary: each non-stopword token was verified to not be a prefix of any token that appears anywhere in `adversarial-corpus.ts` (matching the FTS5 `"word"` prefix-match semantics `cleanFtsQuery` actually uses), so an accidental lexical hit can't produce a false "abstains" result. See ticket 17's own Comments for the verification script. Four families, all genuinely off-topic relative to a software engineering memory store — not absent-gold variants of an existing topic:
- **`test/e2e/antagonistic-write.test.ts`**: Pillar 14 — Antagonistic Write & Quality Gate (Diagnostic). Companion to Pillar 13 (antagonistic recall), applied to the write path instead of the read path. Diagnostic ticket for Map — neuron 2.4.1 ("write-time quality"): before building anything, find out which "bad write" cases the current gate already rejects and which pass through uncaught. Findings decide how tickets 2-4 get scoped, not just their order (in particular: this pillar's own results already answer case 3 without needing a ticket 2 experiment — see the assertions below). Two different gates are in play, tested at the layer where each actually lives: - the write-time supersession/similarity gate lives in the CLI's `memory add` handler (src/commands/memory.ts), ahead of `transact()`. Cases 1 & 2 spawn the real CLI with the real (non-mocked) embedder — the only way to get a meaningful similarity score out of it. - the declared-field schema gate (`enforceFieldSchema`) lives inside `transact()` itself and needs no embedder at all. Cases 3 & 5 call `NeuronMemory.transact()` directly against a purpose-built `neuron.yaml`, mirroring `fieldSchema.test.ts`'s own harness. Case 4 (vague/low-specificity content) is deliberately absent: no objective pass/fail criterion exists yet (see the map's own "Not yet specified"), so there is nothing yet to assert. Like Pillar 13, this is not a fix-and-forget floor — the assertions below are a snapshot of today's measured behavior (2026-08-15), reported honestly per ADR 0012, so a future change to the write gate shows up here as a failing assertion to update deliberately, not a silent drift.
- **`test/e2e/benchmark-suite.test.ts`**: Neuron Deep E2E Benchmark & Correctness Suite. This suite is deliberately NOT a unit test. It exercises the real production pipeline end to end — the real ONNX embedder and the real Qwen1.5-0.5B code summarizer — and records latency distributions alongside its assertions. IMPORTANT: vitest sets NODE_ENV=test, and both summarizer.preloadModel() and summarizer.summarizeFile() short-circuit on that value. Left alone, the whole suite would silently benchmark a string-heuristic fallback instead of the product, which is why the previous revision "passed" its SLAs by ~40x while completing in seconds. Pillar 6 exists to keep that regression from reappearing. ESM hoists the imports below above these assignments, which is fine: both flags are read at call time (inside summarizeFile / NeuronMemory.open), not at module evaluation, so setting them here still takes effect for every test.
- **`test/e2e/concurrency-stress.test.ts`**: Pillar 8 — Multi-Process Contention & Crash Recovery. Spawns real OS processes against one SQLite file. The original concurrency pillar ran `Promise.all` over a single in-process NeuronMemory handle, which shares one connection and one WAL writer — it can never produce cross-process lock contention, torn writes, or a dirty WAL, so "0 failures" there said nothing about multi-agent safety. Checks, in order of severity: 1. lost writes    — every committed record must be readable afterwards 2. lock handling  — SQLITE_BUSY is acceptable if surfaced, not if it eats data 3. crash recovery — SIGKILL mid-write must leave a readable, uncorrupted store
- **`test/e2e/enrichment-corpus.ts`** (Exports: `ImportanceLabel, LabelledEntry, CategoryCase`): The polarized corpus for the enrichment pillar. Discrimination is measured against entries that are unambiguous at both ends, so the corpus design supplies the labels and no human labelling session is required. There is deliberately no middle tier: whether a "4" is objectively a 4 is out of scope, but whether a note about irreversible data loss outranks a note about tab width is not a judgement call.
- **`test/e2e/enrichment.test.ts`**: Pillars 10-12 — Write-side enrichment. Pillar 10 was Importance Inference & Prune Safety and measured both halves. The inference half is gone: it measured the judgement as noise (discrimination -0.5 then +0.167, per-entry stability 0.5, a production-data-loss note rated `1`), the job shipped `off` on that evidence, and ticket 26 removed it. The prune-safety half is kept and is now the whole pillar, because ticket 23 left the underlying hazard live: the entry default and the `neuron memory prune` ceiling are both 3 and the comparison is inclusive. Runs against the real Qwen1.5-0.5B model. It is disabled under NODE_ENV=test, so this suite is the only place these jobs can be measured at all.
- **`test/e2e/init-lock.test.ts`**: Fast, focused repro/regression test for the SQLite schema-migration race (ticket id 2fbfa9ff-1469-4b21-b781-cef371ea7d38, neuron-2.4.0 — deliberately spelled out as an id, not the bare number "44", which this repo's own source already uses for an unrelated declared-fields ticket). Pillar 8 (`concurrency-stress.test.ts`) covers this as a side effect of a much larger read/write storm and takes minutes to run. This test isolates just the construction race — several processes each doing nothing but `new NeuronMemory(...)` against one database file that doesn't exist yet — so it can be red/green-verified in seconds. Runs several fresh-file rounds back to back, since the race is timing-dependent and a single round can pass by luck even on unguarded code.
- **`test/e2e/metrics.ts`** (Exports: `PillarMetrics, percentile, MetricsRecorder`): Latency/throughput recorder for the E2E benchmark suite. The suite is both a correctness gate and a benchmark, so every pillar records real measurements here rather than only asserting pass/fail. The collected numbers are written to a metrics file that the runner merges into its scorecard — the runner never has to infer results by scraping stdout.
- **`test/e2e/synthetic-generator.ts`** (Exports: `SyntheticGeneratorOptions, generateSyntheticPolyglotWorkspace`): Class SyntheticClass (Methods: generateSyntheticPolyglotWorkspace(), rmSync(), mkdirSync(), writeFileSync()).
- **`test/e2e/tier.ts`** (Exports: `BenchTier, byTier`): Benchmark tiering. The same pillar definitions run at two very different intensities: sanity — a fast pre-merge gate. Every pillar still executes end to end against the real pipeline, but at the smallest workload that can still fail meaningfully. Target: a couple of minutes. full   — the adversarial benchmark. Large corpora, deep sweeps, real multi-process contention, and hard negatives designed to drive scores off their ceiling. Target: long enough to hurt. Tier is selected with NEURON_BENCH_TIER; anything other than 'full' is treated as sanity so a bare `vitest run` on these files stays quick.

---
id: 881df7c6-e2ce-6531-2f0e-2236f5892e59
createdAt: 2026-08-12T22:10:57.517Z
importance: 5
tags:
  - architecture
  - topology
  - scan
  - deep
taskId: null
---
### 🧩 reranker-gate (`benchmarks/reranker-gate`)
Primary reranker-gate module containing core application capabilities.

**Key Components & Export Contracts:**
- **`benchmarks/reranker-gate/calibrate-threshold.ts`**: Ticket 29 threshold calibration: reuses the already-ingested LongMemEval-S database (500 questions, 23867 documents — the expensive part) and, for each query, records the RAW reranker score for its top-`ftsMatched` candidate (own partition) and a cross-partition negative control — without hard-filtering on it. Mirrors relevance_gate_eval.py's Run 1 cosine-floor sweep methodology (ticket 39), but for the reranker's raw logit instead of cosine similarity: measure first, choose a threshold from the swept frontier, never assume one. Bypasses `queryGated` entirely — calls the public `queryVector` directly so nothing gets rejected before this script sees it.
- **`benchmarks/reranker-gate/pilot-antagonistic-recall.ts`**: Ticket 29 pilot: re-runs Pillar 13 (Antagonistic Recall & Abstention, ticket 17) twice against the real pipeline — once with the shipped lexical-only gate, once with the new reranker leg (`relevance.gate.reranker.enabled`) also active — and reports both false-accept rates side by side. Not a vitest suite: a one-off pilot script per ticket 29's Verification section ("Results committed under `benchmarks/reports/`"). Seeds the exact same corpus `test/e2e/adversarial-recall.test.ts` seeds for this pillar (fillers, hard negatives, superseded entries, golds) so both runs face the same accidental-match surface, then asks every case in `ANTAGONISTIC_CASES` — queries verified to share no vocabulary with that corpus at all.

---
id: 1a2b7832-4bed-8b84-4b3f-5b02e66e831d
createdAt: 2026-08-13T14:28:20.802Z
importance: 5
tags:
  - architecture
  - topology
  - scan
  - deep
taskId: null
---
### 🧩 salvage-expansion (`benchmarks/salvage-expansion`)
Primary salvage-expansion module containing core application capabilities.

**Key Components & Export Contracts:**
- **`benchmarks/salvage-expansion/salvage-calibration.probe.ts`**: Ticket 07 calibration probe — throwaway. Question: does raw top-1 cosine `similarity` separate a query retrieval got RIGHT from a query it got WRONG? If it does not, the salvage trigger has nothing to fire on and ticket 07's scope step 3 kills it.
- **`benchmarks/salvage-expansion/vitest.probe.config.ts`**: Runs the salvage calibration probe on demand without letting it join the normal suites. The probe is named `.probe.ts` rather than `.test.ts` so a bare `vitest` run never collects it; this config names it explicitly. node ./node_modules/vitest/vitest.mjs run \ --config benchmarks/salvage-expansion/vitest.probe.config.ts
