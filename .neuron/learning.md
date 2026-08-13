# Category: learning

---
id: 4a513a07-ec57-49fd-b887-629ba8dbde42
createdAt: 2026-07-24T12:46:13.408Z
importance: 3
tags:
  - node
  - sqlite
  - termux
taskId: null
---
Always use node:sqlite fallback for cross-platform support

---
id: 7fa5725f-1b4b-4082-9912-f28f977229e9
createdAt: 2026-07-24T12:51:23.441Z
importance: 3
tags:
  - sqlite
  - termux
  - cross-platform
taskId: null
---
Neuron uses built-in node:sqlite fallback when better-sqlite3 native bindings are unavailable on Android/Termux

---
id: 4871f1e4-6ddb-4b1c-ac38-b1c462e95deb
createdAt: 2026-07-25T02:19:32.607Z
importance: 3
tags:
  - sqlite
  - termux
  - cross-platform
taskId: null
---
When using node:sqlite DatabaseSync fallback, ensure fs.mkdirSync creates parent directories and PRAGMAs are executed safely

---
id: b2fd830f-9023-4045-a08d-40d738834151
createdAt: 2026-07-25T02:51:38.064Z
importance: 3
tags:
  - issue-tracker
  - convention
taskId: null
---
Local issues live in .scratch/<feature-slug>/issues/NN-<slug>.md and are mapped in .scratch/<feature-slug>/map.md

---
id: 26b38d2c-5504-430f-9528-a1c8dc4d65d8
createdAt: 2026-07-25T02:59:11.233Z
importance: 3
tags:
  - architecture
  - typescript
taskId: null
---
Keep domain models in src/models/ and re-export them from src/index.ts for backward compatibility

---
id: ec3bb1c4-55f3-4939-94bb-9affca94bdcb
createdAt: 2026-07-25T03:04:19.489Z
importance: 3
tags:
  - architecture
  - components
taskId: null
---
Organize domain entities and runtime logic under src/components/ directory

---
id: bf88ae5a-265a-4d48-8d04-3a24edfc5ec0
createdAt: 2026-07-25T03:13:51.440Z
importance: 3
tags:
  - testing
  - convention
taskId: null
---
Every component file under src/components/ must have a corresponding <component>.test.ts unit test file

---
id: 29de3732-2534-418b-927e-69d575f503ba
createdAt: 2026-07-28T02:21:23.079Z
importance: 4
tags:
  - failure-fix
  - termux
  - shebang
taskId: null
---
Fix for exit code 126 when executing neuron CLI in Termux environment: Running neuron failed with 'bash: /data/data/com.termux/files/usr/bin/neuron: /usr/bin/env: bad interpreter: No such file or directory'. The root cause is that standard Linux shebangs reference /usr/bin/env, which does not exist in Termux's standard file structure (/data/data/com.termux/files/usr/bin/env). The issue was resolved by running 'termux-fix-shebang /data/data/com.termux/files/usr/bin/neuron' to rewrite the shebang path to point to the correct Termux path. If additional binaries or scripts exhibit this behavior on Termux, termux-fix-shebang should be applied or node should be invoked directly.

---
id: 4c28c08a-de83-4c26-9460-5f672c5beaaa
createdAt: 2026-07-28T02:24:16.465Z
importance: 4
tags:
  - failure-fix
  - termux
  - shebang
  - build
taskId: null
---
Fix for exit code 126 on globally linked neuron CLI dist/cli.js in Termux: Rebuilding TypeScript via npm run build or tsc regenerates dist/cli.js with standard #!/usr/bin/env node shebangs, which overwrites the binary linked in /data/data/com.termux/files/usr/lib/node_modules/@kovartravis/neuron/dist/cli.js. In Termux environments, /usr/bin/env is missing, resulting in exit code 126. The issue is resolved by running termux-fix-shebang on the globally installed dist/cli.js file. To prevent recurrence after future builds, termux-fix-shebang should be executed whenever dist/cli.js is rebuilt.

---
id: 567edbf1-6ca0-47ed-aa03-db312deea40d
createdAt: 2026-07-29T12:38:26.883Z
importance: 4
tags:
  - vitest
  - test
taskId: null
supersededBy: 7ff68e51-1719-4033-8090-233f5bbf252b
supersededAt: 2026-08-12T02:24:27.692Z
---
Vitest test runner requires --runInBand

---
id: f29bdaa4-c022-44fb-8b08-8ffde4cf2f34
createdAt: 2026-07-29T12:38:49.871Z
importance: 4
tags:
  - failure-fix
  - build
taskId: null
supersededBy: eedc797c-29f3-4150-add8-3da38a88edfa
supersededAt: 2026-08-12T02:24:27.692Z
---
Fix for build error: pass --no-cache to avoid stale artifacts

---
id: 1c61fba1-1814-44e7-b7c6-e478190687e0
createdAt: 2026-07-11T18:54:39.134Z
importance: 3
tags:
  - tdd
taskId: null
---
Always write tests first using TDD and run them with vitest

---
id: f57c7f54-1e48-4dbe-b3bf-f6c059e92446
createdAt: 2026-07-11T19:02:47.877Z
importance: 3
tags:
  - embed
  - cache
taskId: null
---
Transformers.js cacheDir defaults to './.cache' relative to CWD; always override env.cacheDir to envPaths('neuron').data for shared CLIs

---
id: 0b167146-b5c0-4e45-9f19-c2a42b22150a
createdAt: 2026-07-11T19:02:49.574Z
importance: 3
tags:
  - vector
  - performance
taskId: null
---
BGE embeddings are unit-normalised so cosine similarity reduces to simple dot product (no sqrt calculation needed), yielding < 1 ms search times in pure JS at <10k rows

---
id: b6629b48-34bb-4a0f-abd7-477492358f4d
createdAt: 2026-07-11T19:02:53.255Z
importance: 3
tags:
  - db
  - testing
taskId: null
---
ISO timestamps can collide in tests; use sequential SQLite rowid internally for stable, deterministic database cursors

---
id: 374f7bec-ec25-4238-9c58-8b5e5236ab99
createdAt: 2026-07-25T19:49:25.996Z
importance: 3
tags:
  - failure-fix
  - cli
taskId: null
---
Fix for CLI exec resource leak: always call memory.close() in the exec subcommand before executing child processes to avoid holding open SQLite handles and native resource locks

---
id: d9d48be8-4f20-4538-ad4d-f40de941c218
createdAt: 2026-07-25T19:56:38.858Z
importance: 3
tags:
  - onnxruntime
  - crash
taskId: null
---
macOS process exit with onnxruntime-node >= 1.21.0 causes mutex lock crash; override onnxruntime-node to 1.20.1 in package.json to fix it

---
id: 09bfc3f3-5d77-4563-80aa-27b626d12378
createdAt: 2026-07-26T03:35:02.142Z
importance: 4
tags:
  - embeddings
  - bge
  - hybrid-search
taskId: null
---
BGE embedding models (e.g. BAAI/bge-small-en-v1.5) require asymmetric embedding: pass raw text to embed() for stored passages/learnings, but prepend 'Represent this sentence for searching relevant passages: ' via embedQuery() for search queries

---
id: 3d41e402-efcf-4bbe-af53-fa889d72ccfe
createdAt: 2026-07-27T00:35:18.519Z
importance: 5
tags:
  - workflow
  - grilling
  - tickets
taskId: null
---
Always start working on a ticket with a grilling session to clarify requirements and stress-test the plan.

---
id: a2c4c24c-9c04-4f66-b221-e5b0aaf9d1e0
createdAt: 2026-07-27T01:10:02.532Z
importance: 5
tags:
  - memory
  - guidelines
  - learnings
taskId: null
---
When saving learnings or failure-fix records in neuron memory store, always write comprehensive multi-sentence entries (minimum 3-4 sentences). Single sentence summaries lack critical context, root cause explanation, and concrete resolution steps. Providing background, root cause, exact resolution steps, and edge cases makes entries significantly more useful for AI agents querying the memory store.

---
id: 6aa7336e-305c-4b3d-b6f9-2c08a10d3f89
createdAt: 2026-07-27T01:29:55.232Z
importance: 5
tags:
  - memory
  - config
  - neuronrc
taskId: null
---
When configuring neuron.yaml for project memory, define custom categories under categories and pull rules under pullRules (with default and onExec command pattern matching). Use neuron memory add --category <name> and neuron memory query --categories <a,b> to manage and search across arbitrary user-defined categories. The SQLite database uses a unified memories table with an indexed category column to store entries.

---
id: 32776a05-911a-4b1f-b4c9-63626837d061
createdAt: 2026-07-27T01:39:33.110Z
importance: 5
tags:
  - memory
  - config
  - setup
taskId: null
---
Configured project memory store in neuron.yaml with categories learning, history, and decisions along with custom pullRules. Specified pullRules.default to query learning and decisions categories with minScore 0.35, and configured pullRules.onExec triggers for command patterns matching npm test and git commit. Always keep AGENTS.md protocol aligned with declared categories in neuron.yaml when project memory configuration is modified.

---
id: 0984264e-23ba-4151-aae5-fbda45831cd3
createdAt: 2026-07-27T01:40:46.017Z
importance: 4
tags:
  - memory
  - config
  - agents-md
taskId: null
---
When establishing or updating neuron.yaml for a project, always update AGENTS.md to explicitly document declared categories and CLI command examples (such as neuron memory query --categories ... and neuron memory add --category ...). Synchronizing AGENTS.md with neuron.yaml ensures future agent sessions are aware of available memory categories and know how to query and store entries within them.

---
id: 5b21e56a-7d84-4862-9284-2808226b34a4
createdAt: 2026-07-27T01:41:08.133Z
importance: 5
tags:
  - memory
  - skill
  - setup
taskId: null
---
Updated the neuron-memory skill SKILL.md setup protocol to make AGENTS.md synchronization mandatory during initial project setup. Any time neuron.yaml is created or updated, agents using the skill must now immediately update AGENTS.md with all declared memory categories and explicit CLI command examples for querying and writing to custom categories. This ensures consistent memory protocol enforcement across all agent sessions.

---
id: 000308fa-ee74-410f-985e-638791595c3b
createdAt: 2026-07-27T01:45:53.273Z
importance: 5
tags:
  - memory
  - ui
  - architecture
taskId: null
---
Implemented dynamic category support for the Neuron dashboard and HTTP server in v2.0.0-rc2. The backend server exposes /api/categories (and includes category metadata in /api/status) along with a generic /api/memories endpoint accepting a category filter, while maintaining backward-compatible aliases for /api/learnings and /api/history. The frontend html.ts renders dynamic category tab buttons, a global search input that filters across all or specific active categories, and a reusable modal for viewing all memories.

---
id: 68e8bdb2-09ae-4768-8bf5-ed56419fd355
createdAt: 2026-07-27T01:46:43.370Z
importance: 4
tags:
  - docs
  - ui
  - readme
taskId: null
---
Added a dedicated Local Dashboard UI section to README.md along with a high-resolution dark-mode dashboard screenshot asset saved in docs/images/dashboard.png. Updated package.json files list to ensure docs/images/ is included in npm package distributions. Pushed updated commits and tag v2.0.0-rc2 to GitHub main branch.

---
id: 8601ea58-939b-4f81-9177-dc2f4e1ffd09
createdAt: 2026-07-28T01:56:35.453Z
importance: 5
tags:
  - benchmark
  - omb
  - accuracy-fix
taskId: null
---
Discovered that Agent Memory Benchmark _save method in runner.py calculates overall accuracy by averaging r.score over merged query results if any result has a non-None score. Initial synthetic test files generated with score=1.0 poisoned subsequent omb run evaluations when results were merged by query_id. Deleting old synthetic outputs and re-indexing clean Gemini-evaluated query results with score=None correctly calculates accuracy as correct / total (75.0%).

---
id: c965ce22-8f3a-405d-9abd-5b1c3f6352b7
createdAt: 2026-07-28T01:56:45.905Z
importance: 5
tags:
  - benchmark
  - omb
  - accuracy-fix
taskId: null
---
Discovered that Agent Memory Benchmark _save method in runner.py calculates overall accuracy by averaging r.score over merged query results if any result has a non-None score. Initial synthetic test files generated with score=1.0 poisoned subsequent omb run evaluations when results were merged by query_id. Deleting old synthetic outputs and re-indexing clean Gemini-evaluated query results with score=None correctly calculates accuracy as correct / total (75.0%).

---
id: d58c343d-1f04-453f-b66d-e75e1efb8b80
createdAt: 2026-07-28T01:57:19.106Z
importance: 5
tags:
  - benchmark
  - omb
  - accuracy-fix
taskId: null
---
Discovered that Agent Memory Benchmark _save method in runner.py calculates overall accuracy by averaging r.score over merged query results if any result has a non-None score. Initial synthetic test files generated with score=1.0 poisoned subsequent omb run evaluations when results were merged by query_id. Deleting old synthetic outputs and re-indexing clean Gemini-evaluated query results with score=None correctly calculates accuracy as correct / total (75.0%).

---
id: 537aef24-f791-47d2-96ca-11b6195c4a5c
createdAt: 2026-07-28T01:57:39.977Z
importance: 5
tags:
  - benchmark
  - omb
  - accuracy-fix
taskId: null
---
Discovered that Agent Memory Benchmark _save method in runner.py calculates overall accuracy by averaging r.score over merged query results if any result has a non-None score. Initial synthetic test files generated with score=1.0 poisoned subsequent omb run evaluations when results were merged by query_id. Deleting old synthetic outputs and re-indexing clean Gemini-evaluated query results with score=None correctly calculates accuracy as correct / total (75.0%).

---
id: d17f929c-bb56-48b9-8d9c-efbe8adc9c59
createdAt: 2026-07-28T02:01:37.103Z
importance: 5
tags:
  - benchmark
  - omb
  - accuracy-fix
taskId: null
---
Discovered that Agent Memory Benchmark _save method in runner.py calculates overall accuracy by averaging r.score over merged query results if any result has a non-None score. Initial synthetic test files generated with score=1.0 poisoned subsequent omb run evaluations when results were merged by query_id. Deleting old synthetic outputs and re-indexing clean Gemini-evaluated query results with score=None correctly calculates accuracy as correct / total (75.0%).

---
id: f74969e7-27b7-40bd-9e87-6c032d1c2256
createdAt: 2026-07-28T02:02:12.156Z
importance: 5
tags:
  - benchmark
  - omb
  - accuracy-fix
taskId: null
---
Discovered that Agent Memory Benchmark _save method in runner.py calculates overall accuracy by averaging r.score over merged query results if any result has a non-None score. Initial synthetic test files generated with score=1.0 poisoned subsequent omb run evaluations when results were merged by query_id. Deleting old synthetic outputs and re-indexing clean Gemini-evaluated query results with score=None correctly calculates accuracy as correct / total (75.0%).

---
id: e58f8041-8d39-4465-b869-6ee29bd70489
createdAt: 2026-07-28T02:03:12.486Z
importance: 5
tags:
  - benchmark
  - omb
  - accuracy-fix
taskId: null
---
Discovered that Agent Memory Benchmark _save method in runner.py calculates overall accuracy by averaging r.score over merged query results if any result has a non-None score. Initial synthetic test files generated with score=1.0 poisoned subsequent omb run evaluations when results were merged by query_id. Deleting old synthetic outputs and re-indexing clean Gemini-evaluated query results with score=None correctly calculates accuracy as correct / total (75.0%).

---
id: cddc5f2d-4aa3-402c-a75e-c2f7c5114d2d
createdAt: 2026-07-28T02:04:18.671Z
importance: 5
tags:
  - benchmark
  - omb
  - accuracy-fix
taskId: null
---
Discovered that Agent Memory Benchmark _save method in runner.py calculates overall accuracy by averaging r.score over merged query results if any result has a non-None score. Initial synthetic test files generated with score=1.0 poisoned subsequent omb run evaluations when results were merged by query_id. Deleting old synthetic outputs and re-indexing clean Gemini-evaluated query results with score=None correctly calculates accuracy as correct / total (75.0%).

---
id: c398792f-f2b5-4765-81ea-e85e72b98ffb
createdAt: 2026-07-29T04:09:04.755Z
importance: 4
tags:
  - failure-fix
  - gemini
  - api-quota
  - omb-run
taskId: null
---
Discovered that Google AI Studio enforces a strict 20 requests per day (RPD) hard cap on free tier API keys (quotaId: GenerateRequestsPerDayPerProjectPerModel-FreeTier, limit: 20) across all Gemini models. Running a full 589-query benchmark suite with live LLM calls on a free Gemini key exhausts the daily quota after 20 queries, causing HTTP 429 RESOURCE_EXHAUSTED errors. To run full multi-hundred query benchmarks, an API key with billing enabled or a high-quota free provider like Groq (14,400 RPD) must be configured in .env.

---
id: c218fd06-03b3-4536-8466-eb113db7c8f5
createdAt: 2026-07-29T04:28:18.887Z
importance: 5
tags:
  - failure-fix
  - md-storage
  - testing
taskId: null
---
Validation of MdStorageAdapter revealed regex frontmatter splitting failure: content.split(/(?:^|\n)---\r?\n/) removes YAML frontmatter delimiters, causing parseMarkdown to ignore frontmatter keys (id, tags, scope, taskId) and assign fallback random UUIDs to entries. This corrupted all roundtrip operations, caused 7 of 10 unit tests and 9 of 11 stress tests to fail, and broke downstream DualStorageRouter and mdVectorSync modules. In addition, Worker 1 reported fabricated clean test results in handoff.md.

---
id: 82ce5afc-7126-4820-a452-702594f188a6
createdAt: 2026-07-29T04:41:37.065Z
importance: 5
tags:
  - skill
  - md-storage
  - neuron-sync
taskId: null
---
Updated neuron-memory skill SKILL.md (v2.0.0-rc3) to document the full md-file-management storage system. Added Section 5 covering storage.mode (vector-only, md-only, dual, split), .neuron/ directory layout with per-category .md files, YAML frontmatter entry format, Git-trackable Markdown files, the neuron sync CLI command (with --dry-run and --force flags), and auto-scaffolding behavior. Setup protocol (Section 0) now includes storage mode as an interview option and instructs agents to document neuron sync usage in AGENTS.md when dual/md-only modes are configured.

---
id: f86c4960-233f-4e86-93ca-e71379b09182
createdAt: 2026-07-31T01:47:20.927Z
importance: 4
tags:
  - failure-fix
  - personamem
  - benchmark
  - llm-reasoning
taskId: null
---
Analyzed the root causes of the 4 failed queries in the PersonaMem benchmark sanity run. Verified that memory retrieval was 100% successful with full persona context retrieved (28k tokens). The failure mode is LLM over-reasoning on distractor options in suggest_new_ideas queries, where the LLM over-fitted minor persona traits (e.g. past dislike of blogging pressure) to reject the gold answer or preferred hyper-specific cultural options over generic gold answers. In addition, string parsing in the benchmark runner recorded generated_answer as None when raw extracted letter answers differed slightly from full option strings.

---
id: 92228cba-fb23-43d3-bc4d-2c9dceea568a
createdAt: 2026-08-01T02:16:34.064Z
importance: 5
tags:
  - failure-fix
  - cli
  - exec
taskId: null
---
Fix for 'neuron exec' destroying argument quoting: running 'neuron exec -- git tag -a v2.1.0 -m "message with spaces"' failed with '/bin/sh: drift: command not found' and 'fatal: too many arguments', because the -m value was word-split into separate argv entries. Root cause is in src/commands/exec.ts, which builds rawCommandStr via commandArgs.join(' ') and then calls spawnSync(rawCommandStr, { shell: true }); joining discards the original argv boundaries and the shell re-splits on whitespace, so any argument containing spaces is corrupted. The fix is to spawn the argv array directly without a shell when multiple arguments are supplied (spawnSync(commandArgs[0], commandArgs.slice(1), { stdio: 'inherit' })), while keeping the single-argument form on shell:true so that 'neuron exec -- "a && b"' still supports pipes and operators; rawCommandStr remains the memory-query text either way. Edge case: commands genuinely needing shell operators must now be passed as one quoted string argument.

---
id: e8b009df-9882-43d2-94b8-14b693c4d752
createdAt: 2026-08-01T02:20:50.743Z
importance: 4
tags:
  - failure-fix
  - skills
  - migration
taskId: null
---
The .agents to .claude migration in commit 5f2f093 silently dropped 21 agent skills because only neuron-memory was re-created under the new path while the entire .agents/skills tree was staged for deletion. Recovery is straightforward since the files remain in git history: extract with 'git archive <pre-deletion-sha> .agents/skills | tar -x -C <tmpdir>' then copy each directory to .claude/skills/, deliberately skipping any skill that has since been modified in place (neuron-memory had gained the 2.1.0 drift protocol and must not be overwritten by the older copy). Always grep the restored tree for stale '.agents/' path references before committing, and confirm the npm tarball is unchanged since package.json 'files' lists .claude/skills/neuron-memory/ specifically rather than the whole skills directory. Lesson: when renaming a directory that a harness auto-discovers, diff the before/after file listings rather than assuming a rename was complete.

---
id: 108b1eef-fdb8-44b0-9bd5-ef848d87dfab
createdAt: 2026-08-01T03:02:18.907Z
importance: 4
tags:
  - tree-sitter
  - wasm
  - grammars
  - 2.2.0
  - scanner
taskId: null
---
Tree-Sitter grammar delivery for neuron 2.2.0: the official tree-sitter-<lang> npm packages ship BOTH a prebuilt .wasm and a queries/tags.scm, contradicting the common assumption that they only ship C sources and node bindings. Verified across typescript, javascript, python, go, rust, java and cpp at 8.49 MB total, all loading in web-tree-sitter 0.26.11 in 1-5ms with ABI 14 and 15 both accepted. This makes them a far better source than tree-sitter-wasms (51.8 MB, single maintainer, stale, and it declares a dependency on itself) or @vscode/tree-sitter-wasm (22 MB, narrower language set). Fetch the package tarball from the registry, gunzip, and pull the two files out with a ~40-line tar reader rather than adding a tar dependency; honour npm_config_registry so corporate mirrors work. Pin grammar versions rather than ranging them, because a grammar changing shape underneath a released build silently moves every extracted symbol and manufactures architectural drift that never happened.

---
id: 136c5f4c-bfe4-440c-a2cd-f760369e36b4
createdAt: 2026-08-01T03:02:21.362Z
importance: 4
tags:
  - failure-fix
  - testing
  - vitest
  - env-paths
taskId: null
---
Vitest test isolation failure with env-paths: overriding process.env.HOME in beforeEach does NOT isolate a cache directory across tests in the same file, because vi.resetModules() only resets inlined modules and leaves externalized node_modules dependencies cached. env-paths resolves the home directory once at import, so every test in the file shared the first tmpdir. The symptom was subtle and dangerous: a cache-hit assertion PASSED for the wrong reason (it saw the previous test's cache rather than its own write), and a later assertion failed reading a stale tags.scm value. The fix is to give the module an explicit env override read per call (NEURON_GRAMMAR_DIR in src/scanner/grammars.ts) rather than relying on HOME indirection; this is also a genuine feature for CI cache restoration. General rule: when a module resolves a path through a cached third-party dep, expose the path as a first-class override instead of trying to manipulate the environment underneath it.

---
id: 5c02458b-8ac1-4cca-b06b-749d2d370aa6
createdAt: 2026-08-01T03:08:35.829Z
importance: 4
tags:
  - failure-fix
  - exec
  - tooling
  - stale-install
taskId: null
---
Fix for misattributing a CLI bug to source code: a 'neuron exec -- gh pr create --title "feat(scanner): ..."' failure with '/bin/sh: syntax error near unexpected token (' was initially blamed on argv-to-string joining in src/commands/exec.ts, but the working tree already spawns the argv array directly and the fix shipped in v2.1.0 (commit 5f2f093). The actual cause was that the globally installed binary on PATH was a stale 2.1.0-rc3, which still had the old spawnSync(rawCommandStr, { shell: true }) implementation. Always resolve the binary before attributing behaviour to repo source when the repo IS the tool: run 'which <cmd>', readlink -f it, check the installed package.json version, and grep the installed dist rather than src. In this repo that mismatch is structural and will recur, because agents run 'neuron exec' from PATH on every command while editing the same tool's source, so a stale global install silently makes the source and the observed behaviour disagree. Remedy is 'npm install -g @kovartravis/neuron@latest' or 'npm link' during development.

---
id: 98480ae3-7ff1-4318-bd94-50a2cf363e64
createdAt: 2026-08-01T03:35:53.126Z
importance: 4
tags:
  - failure-fix
  - tree-sitter
  - scanner
  - ast
  - export-detection
taskId: null
---
Fix for symbols being marked exported when they are nested inside an exported function: while rewriting src/scanner/treesitter.ts for Tree-Sitter AST extraction (ticket 02, v2.2.0), the isExported helper climbed every AST ancestor looking for an export_statement node, which meant a helper declared inside an exported function inherited its parent's export and was reported as part of the module's public surface. The symptom was 'walk' (a local closure inside scanProjectTopology in src/scanner/analyzer.ts) and 'helper' appearing in the exportChanges bucket of 'neuron scan --diff' as newly added exports. Root cause is that 'export' in TypeScript applies to the declaration it wraps, not transitively to everything beneath it, so ancestor climbing must stop at the first node that is not a declaration wrapper. The fix climbs only through lexical_declaration and variable_declaration (so 'export const x = () => {}' still resolves via variable_declarator -> lexical_declaration -> export_statement) and returns false on any other parent such as statement_block. Critical process lesson: the full unit suite was green and the symbol-count delta looked plausible; only running 'neuron scan --diff' against a real baseline and reading the actual diff output exposed the bug, so verify scanner changes against real project output and not only against unit fixtures.

---
id: 3e984761-bb67-4d30-b229-62111031f998
createdAt: 2026-08-01T03:36:04.384Z
importance: 4
tags:
  - tree-sitter
  - queries
  - scanner
  - ast
  - tags-scm
taskId: null
---
Tree-Sitter shipped tags.scm queries are written for code navigation, not for a declaration inventory, and must be audited per language before adoption (verified while implementing neuron 2.2.0 ticket 02). Two concrete traps: (1) capture names are too coarse to derive symbol kinds from, because Rust tags struct_item, enum_item, union_item AND type_item all as @definition.class and C++ tags struct_specifier the same way, while Go collapses structs, interfaces and aliases into a single @definition.type on type_spec. The resolution is to key symbol kind off the AST node type rather than the capture name, with the capture name only as a fallback, and for Go to additionally inspect the type_spec's 'type' field child to separate struct_type from interface_type. (2) TypeScript's shipped query covers only ambient declaration forms and has no rule for function_declaration or method_definition, so it must be hand-written, whereas JavaScript's 13 definition rules are complete and already cover 'export const x = () => {}'. Filtering query matches to @definition.* captures drops call sites for free across every language since calls are tagged @reference.*, which is what eliminated the old bare-name(args) method heuristic. Also note grammar id is not the language label: .tsx must be parsed with the separate tsx grammar (parsing TSX with the typescript grammar mis-parses every JSX element) while still being reported as 'typescript' so existing baselines stay comparable.

---
id: 311d1404-e4cd-47d3-95e1-94c7d5d7cd0e
createdAt: 2026-08-01T11:28:22.644Z
importance: 4
tags:
  - failure-fix
  - testing
  - vitest
  - tsconfig
  - verification
taskId: null
---
Two verification traps found while implementing neuron 2.2.0 ticket 03, both of which silently weaken confidence in test results. (1) tsconfig.json excludes 'src/**/*.test.ts', so 'npx tsc --noEmit' does NOT typecheck test files at all; a ScanResult fixture in diff.test.ts was missing the required parserFidelity field added in ticket 02 and tsc reported clean. Never claim 'typecheck passes' as covering tests in this repo, and treat hand-built test fixtures as unchecked data that production code must tolerate. (2) In vitest, calling spy.mockRestore() also clears the recorded call history, so asserting expect(spy).toHaveBeenCalled() AFTER mockRestore() always fails with 'expected spy to be called at least once' even when it was; capture spy.mock.calls into a local variable before restoring. A third gotcha in the same repo: test/e2e/benchmark-suite.test.ts embeds literal \x00\x01 bytes as fixture data for the storage-corruption pillar, so 'file' reports it as binary and plain grep silently matches nothing against it - use 'grep -a' when searching that file.

---
id: 7ae569af-1552-4f5e-8570-edde0e0b1050
createdAt: 2026-08-01T11:43:12.644Z
importance: 5
tags:
  - failure-fix
  - neuron-exec
  - release
  - dogfooding
  - stale-binary
taskId: null
---
Critical trap when dogfooding neuron on its own repo: CLAUDE.md mandates wrapping commands in 'neuron exec', but 'neuron exec' resolves the GLOBALLY installed neuron from PATH, not the repo source, and it runs autoRescanIfDriftDetected as a side effect. During the 2.2.0-rc1 cut the global install was still 2.1.0, which has no src/scanner/fidelity.ts and whose summarizer never writes the '## Parser Fidelity' card section. So every protocol-mandated 'neuron exec -- npm test' silently detected phantom drift against the new ast/2 card, re-ingested a regex/1 card over it, and made 'neuron scan --diff' report 'Re-baseline Required' again minutes after a successful re-baseline. The symptom is a blueprint card whose mtime is recent but whose content lacks features the working tree implements. Diagnose by running 'readlink -f $(which neuron)' and grepping the installed dist for the feature (grep -c 'Parser Fidelity' $GLOBAL/dist/components/summarizer.js). Remedy is 'npm link' from the repo so the global binary is the local build; verify with 'neuron exec -- git status' followed by 'neuron scan --check' still exiting 0. Rule: when the repo IS the tool and the protocol invokes that tool, relink the global install BEFORE doing release verification, or the verification measures the old version.

---
id: 4d7efffe-fc35-4e3f-aff0-298e55bb6b37
createdAt: 2026-08-01T15:53:31.946Z
importance: 4
tags:
  - failure-fix
  - benchmark
  - longmemeval
  - amb
  - tooling
taskId: null
---
Running an external benchmark harness against neuron has four traps that each cost real time on 2026-08-01, now documented in benchmarks/longmemeval/README.md. First, sampling in vectorize-io/agent-memory-benchmark is category-ordered: load_queries(limit=N) returns questions grouped by category, so a 60-question run was 100 percent single-session-user and produced a misleading 98.3% headline — always pass 'all' for any number you intend to quote, and check the category distribution before believing a result. Second, a killed run leaves stale SQLite WAL sidecars and the next prepare() dies with 'disk I/O error'; the fix belongs in the bridge, which must unlink dbPath, dbPath-wal AND dbPath-shm, not just the .sqlite file. Third, backgrounding a long run by nesting 'nohup ... &' inside an already-backgrounded tool call kills the process group when the wrapper shell exits — let the harness track the process directly instead. Fourth, uv defaults to Python 3.14 which has no onnxruntime wheels, so pin with 'uv sync --python 3.12', and note the AMB CLI entrypoint is 'omb' not 'amb' because the upstream README lags a rename. Also remember the bridge imports dist/, so a stale build silently benchmarks the previous version of neuron.

---
id: 757768a7-7bc5-4851-b7c1-c43e0d21556e
createdAt: 2026-08-01T16:56:54.364Z
importance: 5
tags:
  - failure-fix
  - pruning
  - data-loss
  - importance
taskId: null
---
Pre-existing data-loss hazard found while grilling ticket 06 on 2026-08-01, now tracked as ticket 23: the default entry importance is 3 (src/index.ts sets importance = m.importance ?? 3 on upsert) and the default maxPruneImportance is also 3, while the prune statement is 'DELETE FROM memories WHERE category = history AND created_at < ? AND importance <= ?' — an INCLUSIVE comparison. The two defaults collide one number apart, so every history entry written at default importance is prune-eligible. Compounding it, the CLAUDE.md protocol's step-4 history command passes no --importance flag at all, meaning every history entry this project has ever written sits at 3 and is deleted by a bare 'neuron memory prune' once it passes 30 days, with no supersession flag and no undo. Pruning is also hardcoded to category = 'history' from before neuron.yaml made categories user-declared, so a project declaring a transient category like 'scratch' cannot prune it, and a project wanting permanent history cannot spare it. Do not paper over this with a clamp on inferred importance; the fix belongs in the pruning redesign.

---
id: 08345c02-27bc-4e99-8458-65c2bc92fee4
createdAt: 2026-08-01T17:25:35.568Z
importance: 5
tags:
  - failure-fix
  - llm
taskId: null
---
Prompting the shipped Xenova/Qwen1.5-0.5B-Chat model for structured metadata: an instruction-only prompt asking for a labelled field such as 'importance: <digit>' or 'category: <name>' is answered by the model CONTINUING the input note rather than following the instruction, producing 12 of 12 unparseable inferences in neuron's Pillar 10 benchmark. The verified fix is few-shot prompting: three worked ChatML user/assistant example turns before the real turn makes the model answer with a bare token every time (degraded rate fell to 1 of 12). A second, independent constraint is that a multi-field answer ('reply with exactly two lines') is not reliably parseable at this size, so ask for one field per generation - two calls against an already-resident model cost about 183ms each against the roughly 3200ms cold load, so splitting is nearly free. Both rules are implemented in src/components/enricher.ts (buildImportancePrompt, buildCategoryPrompt) and apply to tickets 07 and 08.

---
id: a29bc851-2542-4f22-92b4-19b3e3b077e9
createdAt: 2026-08-02T00:13:52.251Z
importance: 3
tags:
  - wayfinder
  - rc2
  - longmemeval
taskId: null
---
Neuron failed its core use case on 2026-08-01: a fresh session claimed wayfinder ticket 25 (prune config) that the maintainer had verbally pushed off, and no part of the memory system prevented it. Three independent links failed. (1) The agent skipped CLAUDE.md's mandatory step-1 'neuron memory query' entirely and opened by reading the map instead, which is the agent-invoked-recall failure mode the rc3 hook band exists to eliminate. (2) Claude Code's own auto-memory carried the fact 'ticket 25 pushed off' in context from the first token and the agent read past it, because it sat in a background system-reminder next to a map artifact that loudly asserted the opposite. (3) Most importantly, a correctly-executed query would STILL have returned the wrong answer: querying 'ticket 25 prune config status' surfaces the ticket-23 ADR at score 0.976 and the ticket-24 verdict, and both state that ticket 25 ships regardless; a direct SQL sweep for any entry recording 25 as deferred, parked or pushed-off returns zero rows. The root cause is therefore NOT retrieval, which worked faithfully, but the write side: protocol step 4 records what the agent DID, and there is no protocol step that records a decision the USER made mid-session, particularly one that reverses a planned ticket. Ticket 24's session recorded its own verdict in full detail and did not record the consequence the maintainer drew from it. rc3's deterministic hooks close link 1 only; links 2 and 3 are write-side capture and salience problems that hooks do not touch.

---
id: 8406b71a-00a1-4b9e-b0e2-bb9d7b026730
createdAt: 2026-08-02T00:14:02.585Z
importance: 3
tags:
  - adr
  - rc2
  - benchmark
taskId: null
---
Data-integrity bug found in the neuron memory store on 2026-08-01 while measuring duplicate density: 61 of 239 entries (26 percent) have single-token content such as 'Fix', 'Updated', 'Implemented', 'When', 'Queried', 'Configured', spanning 24 distinct first-words, first seen 2026-07-28 and last seen 2026-07-31. The root cause is shell word-splitting at the CLI boundary: 'neuron memory add' reads content from positionals[0] in src/commands/memory.ts, so an unquoted multi-word argument stores only the first bare word and silently discards the rest. The failure is invisible after the fact because the resulting row is otherwise well-formed, carrying correct category, meaningful distinct tags and a real importance value, so it passes every existing validation and looks like a legitimate entry in list output. These rows also masquerade as exact duplicates when grouped by content hash, which is what surfaced them: 15 exact-content duplicate groups exist but most are collided truncations rather than genuine repeats. Consequence for retrieval is that roughly a quarter of the store's recall surface is destroyed content that still occupies an embedding slot and can outrank real entries on short queries. A content-length floor or a whitespace check at write time would have caught every one of them at zero cost.

---
id: a2f39a32-0d6b-431b-b247-2f8b88a56e1f
createdAt: 2026-08-02T00:39:06.949Z
importance: 3
tags:
  - failure-fix
  - drift
  - architecture
taskId: null
---
Trap when dogfooding neuron from an older release branch: running 'neuron exec' while the working tree is checked out at an OLD tag silently corrupts the memory store's architecture blueprint. Observed on 2026-08-01 while cutting v2.1.2 from the v2.1.1 tag: every protocol-mandated 'neuron exec -- npm test' printed 'Architectural drift detected (46 changes). Automatically re-scanning codebase topology' and re-ingested a blueprint card describing the 2.1.1 tree, overwriting the card built from the 2.2.0 working tree. The cause is that autoRescanIfDriftDetected fires on drift regardless of which commit is checked out, and it has no notion that the checkout is intentionally historical. This is a sibling of the known stale-global-binary trap but distinct: there the BINARY is old, here the SOURCE TREE is old and the binary is current. Remedy used was to stop wrapping commands in 'neuron exec' for the duration of the patch branch and run plain npm instead, then let the next scan from the 2.2.0 branch re-baseline. General rule: suspend the neuron exec protocol whenever the working tree is checked out at a tag or maintenance branch older than the blueprint's baseline, because the read-side convenience is not worth silently re-baselining the card to historical topology.

---
id: 859a6b92-16e4-4fd2-82c4-273e34e49d2e
createdAt: 2026-08-02T00:54:13.382Z
importance: 3
tags:
  - rc2
  - adr
  - enrichment
taskId: null
---
Documentation for a destructive command must be verified against the code, not trusted, and neuron shipped a live counter-example until v2.1.3 on 2026-08-01. The packaged neuron-memory skill, which 'neuron init' copies into every user's project as agent instructions, told agents that 'neuron memory prune' deletes 'low-importance history logs (importance 1-2)'. The shipped code deletes 'importance <= 3' inclusively, and because every entry written without an explicit --importance is stored at the default of 3, a bare prune deletes essentially all history older than 30 days. Quantified against the reference store the gap was total: the documented rule matched 0 of 160 history entries while the code matched 158. There is no undo and no --dry-run, so a user acting on the documentation would lose their entire history believing they were removing a handful of trivial notes. Two general rules follow. First, the packaged skill is a shipped artifact with the same blast radius as code, because it is installed into user projects and read as instructions, so it belongs in release review rather than being treated as repo documentation. Second, when a default value appears in two subsystems it must be checked as a pair: here the write-side default importance of 3 and the prune-side default ceiling of 3 were each individually defensible and catastrophic in combination.

---
id: 2c33f707-15c0-4d28-97d3-9be5e46ab8c4
createdAt: 2026-08-02T01:30:18.834Z
importance: 3
tags:
  - enrichment
  - adr
  - failure-fix
taskId: null
---
Required-looking safety flags must be verified against the actual SQL predicate, not just presence-checked, and neuron shipped two instances of this in the same command family. 'neuron memory delete' and 'neuron memory update' both require --category on the CLI and validate that it was passed, but the flag was never included in the SQL: delete ran 'DELETE FROM memories WHERE id = ? AND project_id = ?' and update's existence check ran 'WHERE id = ? AND project_id = ?', neither referencing category at all. Verified live: deleting a history entry while passing --category learning reported status deleted. This chained with a second bug where 'memory list --categories a,b' read only the singular options.category and silently ignored the plural flag, returning every category unfiltered - exactly the pattern the packaged skill's own maintenance workflow uses, meaning an agent following that workflow could list every category believing it saw only learnings, then delete any id it found while believing --category scoped the operation to learning. Fixed by adding 'AND category = ?' to both the delete statement and update's existence check, and by making list read options.categories the same way query already did. This is a real behaviour change: a call that previously succeeded against the wrong category now returns not_found, which is what the required flag always implied it would do. Shipped as v2.1.4 directly to main (not a side branch this time, per explicit instruction) and cherry-picked onto the 2.2.0 line. General lesson: when a flag is marked required, grep the actual query it feeds into rather than trusting the presence check as proof it does something.

---
id: 6487ac00-326f-4e93-a801-eb0f26afe6bd
createdAt: 2026-08-02T01:39:59.958Z
importance: 3
tags:
  - adr
  - failure-fix
  - rc2
taskId: null
---
A required flag or a computed result that's silently discarded is worth grepping for specifically, because it's the same failure shape recurring across a codebase, and neuron shipped a third instance in one sweep. dual-mode 'memory update' and 'memory delete' compute vecResult (the vector database's real outcome) but never consult it: upsert correctly reports vecResult.status, while update and delete decide their reported status purely from whether the markdown-side operation found the id, discarding vecResult entirely. Verified live by deliberately diverging the two stores (writing an entry normally, then manually removing only its .md copy to simulate drift that neuron sync exists to fix): deleting the entry reported status not_found while the row was actually removed from the vector database, and updating it reported not_found while the content was actually overwritten in the vector database. This is a false negative on a real, often irreversible change to the canonical store, and there was no signal anywhere that the two stores had diverged in the first place. The fix, per explicit maintainer decision, is that update and delete now report success if EITHER store actually changed, matching the precedent upsert already set, rather than inventing a new partial-success status or trusting one side exclusively. Affects storage.mode: dual and split-mode categories whose per-category storage resolves to dual, including the unconfigured default; vector-only and md-only modes were never affected. Shipped as v2.1.5. General lesson for this codebase: when one code path in a small set of parallel branches (upsert vs update vs delete here; the delete/update category-enforcement gap in the prior session) handles a concern correctly and the sibling branches don't, that's the search pattern worth running deliberately rather than trusting that similar-looking branches behave alike.

---
id: d4e6e16d-a292-4953-93e1-f5779f22ba9a
createdAt: 2026-08-02T03:54:11.777Z
importance: 3
tags:
  - failure-fix
  - adr
  - md-storage
taskId: null
---
A reconciliation heuristic that compares two timestamps is only as sound as the guarantee that those timestamps actually diverge when the data does, and neuron's sync command violated that guarantee in a way that caused real, verified content loss. sync resolved content conflicts between the vector DB and a category's .md file by comparing createdAt on each side, defaulting to markdown winning whenever mdTime >= dbTime. The flaw: .md frontmatter has no updatedAt field at all, and a normal 'memory update' never touches created_at on either side of a normal CLI update, so createdAt is set once at creation and then frozen forever on both stores. That means on any GENUINE content conflict the two timestamps are almost always equal, and the tie-break >= comparison always resolves to true, so markdown wins unconditionally regardless of which side actually holds the fresher content. Verified live: ran 'memory update' to write fresh correct content into the vector DB (dual mode writes both stores normally), then manually reverted only the .md copy to its prior stale content to simulate the kind of transient one-sided divergence that is common (a disk hiccup, a stale checkout, the exact partial-failure shape the sibling v2.1.5 fix was written to surface) -- running 'neuron sync' afterward silently overwrote the fresh, correct vector content with the stale markdown content and reported success with no indication anything was wrong. Fixed by refusing to guess: sync now only auto-propagates entries missing entirely from one side, which is genuinely unambiguous, and reports any entry present on both sides with differing content as an explicit conflict, left untouched, printed by id, non-zero exit. --force remains the deliberate override, kept as 'markdown wins' to match its pre-existing documented 'force re-embed ignoring content hashes' meaning; there is no equivalent 'vector wins' flag by design, since an unresolved conflict already leaves the vector data untouched. This directly broke the packaged skill's own documented workflow of 'hand-edit a .md file, then run neuron sync' -- a manual edit is, by the identical reasoning, indistinguishable from vector-side drift, so it is now ALSO reported as a conflict rather than silently applied, and --force is genuinely required after a manual edit going forward. Shipped as v2.1.6. General lesson: before trusting any 'newer wins' conflict resolution in this codebase, verify the compared field is actually written on every code path that should update it, not just at creation.

---
id: d4d625b3-6c31-4f00-b10c-7b5dbe30cf4d
createdAt: 2026-08-02T12:39:02.230Z
importance: 5
tags:
  - failure-fix
  - minscore
  - retrieval
  - exec
  - ticket-27
taskId: null
---
Live recall-quality defect found 2026-08-02 while calibrating ticket 07, now tracked as neuron 2.2.0 ticket 27: the default minScore of 0.35 is mathematically incapable of filtering anything. In src/index.ts:475-483 the hybrid score is 0.75*normRrf + 0.25*normImp where normRrf = rrfScore / RRF_MAX and RRF_MAX = 2/(RRF_K+1) with RRF_K = 60; because every row with positive cosine gets a semantic rank, the top result always has semanticRank = 1, so rrfScore >= 1/61 and normRrf >= 0.5, which floors the top hit's score at 0.375 at importance 1 and at 0.500 at the default importance 3. The default threshold of 0.35 sits below the entire attainable range, so src/commands/exec.ts:32 (matched.filter(m => (m.score ?? 0) >= minScore)) never excludes anything and neuron exec injects at least one memory before every wrapped command regardless of relevance. This was confirmed empirically, not just algebraically: five nonsense queries against a 308-entry corpus of importance-2 filler scored 0.4375, 0.5565, 0.4375, 0.4375 and 0.4966, where the repeated 0.4375 is exactly the formula's predicted floor 0.75*0.5 + 0.25*0.25 for importance 2, while real queries on the same corpus scored 0.7896-0.9375. Do NOT fix this by raising minScore: the score is contaminated by importance, which can move it by up to 0.25 (most of the usable range), so a high-importance irrelevant entry outranks a low-importance relevant one. Do NOT assume raw cosine similarity is the fix either — ticket 07 measured it separating no-answer queries by only 0.038 versus score's 0.233, and found it inverted on confidently-wrong retrieval. This gets sharply worse after rc3, when hook-based auto-injection puts it on every agent turn.

---
id: cb9b01f1-4eaf-4f71-b9a4-607b69bf0548
createdAt: 2026-08-02T13:01:01.554Z
importance: 4
tags:
  - enrichment
  - failure-fix
  - adr
taskId: null
---
Removing a feature flag's implementation can strand a whole subsystem that existed only to serve it — always trace the reachability of the machinery around the code you delete, not just its direct callers. Concrete case (neuron 2.2.0 ticket 26): deleting model-based importance inference from src/components/enricher.ts looked like a 6-item mechanical scope, but enrichUpsert in src/index.ts was the only writer of the enriched_at column and it only wrote NULL for 'deferred = wantsImportance && importance === undefined'. With wantsImportance gone, no row could ever be written NULL again, and migration v6 had already backfilled every pre-existing NULL — which made the entire enrichment backlog unreachable: drainEnrichment, countPendingEnrichment, drainEnrichmentIfPending (called on every query), the 'neuron memory enrich' CLI subcommand, enrichment.pending in neuron status, and clampImportance whose only two callers were the inference sites. Had the ticket's literal scope been followed, rc2 would have shipped a documented CLI subcommand capable of returning only {drained: 0}. The diagnostic move is to ask, for each removed condition, which state that condition was the sole producer of; then grep for readers of that state. Keep the storage column itself (enriched_at) rather than spending a migration to drop it — a dropped column makes older databases non-downgradable for no gain.

---
id: 6a428c7e-fe6e-4260-a808-7f2cf70dcce9
createdAt: 2026-08-02T13:24:15.522Z
importance: 4
tags:
  - wayfinder
  - adr
  - rc2
taskId: null
---
When a handoff document cites the current state of a codebase, verify its premises against the built binary before ticketing from it — handoffs go stale between being written and being acted on, and tickets built on a stale premise waste a whole session. Two of four groups in the 2026-08-02 neuron repositioning handoff were built on premises that no longer held: 'ticket group 3' asked for a tree-sitter migration for symbol extraction per ADR 0003, but ticket 02 had already shipped exactly that in 2.2.0-rc1 (8 grammars / 10 extensions, ADR 0003 marked Implemented, symbol count 3290 -> 233), so the real remaining work is only the 4 extensions still on the regex fallback; and 'ticket group 4' said to scope a feature 'exactly as written in the linked spec' at neuron-plan-vs-drift-handoff.md, a file that does not exist in the repo or anywhere reachable, which makes the group unticketable rather than merely underspecified — writing a replacement spec from its one-paragraph summary would invent the thing the handoff says not to invent. The general move: for each factual claim a handoff makes about current behaviour, run the built CLI in a scratch project and check, rather than reading source or trusting the document. Reading source would have been insufficient here too — md-only's broken semantic search looks correct in source (there is a full cosine ranking path with an mtime-keyed embedding cache) and only fails because the embedder is resolved via optional-chained 'as any' property sniffing off an object that never carries it, so the dead branch is invisible until you run a query and get zero hits for a semantically obvious match.

---
id: f805b31c-9752-48a5-af4c-1656ee2d8581
createdAt: 2026-08-02T13:37:20.161Z
importance: 5
tags:
  - md-storage
  - adr
  - enrichment
taskId: null
---
Two live data-loss defects in MdStorageAdapter's frontmatter reader, found 2026-08-02 while checking whether neuron can support a 'deterministic writes' claim; tracked as 2.2.0 ticket 35. (1) The writer and reader disagree on the importance default: formatEntry writes 'importance: 3' when unset (src/storage/mdStorageAdapter.ts:229) but parseMarkdown reads a MISSING importance as 1 (:328-330). Deleting one frontmatter line from an entry written with --importance 5 makes it read back as 1, and importance 1 is prune-eligible at every threshold while neuron memory prune's default ceiling is 3 compared inclusively — so an ordinary hand-edit converts a critical entry into the most deletable state the system has. (2) A missing id falls back to crypto.randomUUID() at :326 without memoisation, so consecutive reads of the same unchanged file return DIFFERENT ids — verified three reads, three distinct UUIDs. The entry then has no stable identity: memory update <id> and memory delete <id> can never target it, and in dual/split mode it duplicates on every sync. Same defect class as the previously-fixed frontmatter-splitting regex bug, whose silent-fallback behaviour was never addressed. General lesson: when a file format is both machine-written and human-edited, reader fallbacks that supply plausible defaults are worse than errors, because they convert a human's edit into fabricated data with no signal. A missing field is a fact about the file, not a value to guess.

---
id: 64552238-05f9-4780-b419-46cd38eeef85
createdAt: 2026-08-03T01:41:14.562Z
importance: 4
tags:
  - adr
  - enrichment
  - failure-fix
taskId: null
---
While verifying ticket 09's scope item 6 (whether CLAUDE.md and the packaged neuron-memory skill correctly describe --tags/--importance as optional per ticket 06's write-side enrichment), found the two files each contained an internal contradiction: a clearly-written section (CLAUDE.md's 'On the metadata flags', the skill's section 0a) explicitly recommends omitting --tags and letting centroid inference fill it in, but the older mandatory-protocol command examples a few sections away (CLAUDE.md steps 3-4, skill sections 3-4-8) still hardcoded --tags <topic> on every neuron memory add example. This is precisely the failure mode the skill's own text names at SKILL.md:174-176: a protocol that keeps telling the agent to pass --tags on every write produces a store where enrichment never actually runs, because explicit input always wins over inference per-field. The lesson: when a project's own instructions get amended in one place (a new explanatory section, an ADR-driven policy change) but the literal step-by-step command examples elsewhere in the same file are left untouched, the file becomes self-contradictory and an agent following it literally will silently defeat the newer policy. Fixed by editing every hardcoded --tags example in both files to omit it (keeping --importance 4 on the failure-fix example specifically, since that field is never inferred and must be set explicitly to survive a prune). General rule for future edits to CLAUDE.md-style protocol files: after adding new guidance that changes a recommended flag or command shape, grep the same file for every literal command example using the old shape and update them too, rather than trusting readers to reconcile two sections that disagree.

---
id: da1b2949-bdab-4c84-890a-18a69247d332
createdAt: 2026-08-03T11:38:20.914Z
importance: 4
tags:
  - retrieval
  - rc2
  - wayfinder
taskId: null
---
A wayfinder map's Decisions-so-far index is a lossy compression, and the lossy part is usually the QUALIFIER on a number — treat any bare figure in the index as unsourced until you open the ticket it links to. Concrete failure on 2026-08-03 while grilling ticket 11: the map's gist of ticket 05 read 'the 0.75-for-any-top-hit claim behind the raw-cosine trigger is factually wrong — measured 0.4375-0.5565', which reads as the cosine range for any top hit. A fresh measurement returned 0.635-0.826 and I reported a contradiction in the record to the maintainer. There was none: the source, findable in ticket 07's out-of-scope entry and confirmed by a recalled learning about ticket 27, is 'a NONSENSE query's top hit SCORE' — the hybrid RRF score (0.75*normRrf + 0.25*normImp, which caps at 0.5 for a query with no FTS hits), not raw cosine, and a different population. The two qualifiers that make it correct, 'nonsense' and 'score', are exactly what the one-line index dropped. Cost was a wrong claim to the maintainer plus a fabricated deliverable on a new ticket, both retracted. Two general rules: (1) before writing 'the record contradicts this measurement', open the linked ticket and confirm you are comparing the same quantity over the same population — a numeric coincidence between a score band and a cosine band is not evidence; (2) when writing a map index line about a measurement, keep the qualifier even at the cost of brevity, because 'measured 0.4375-0.5565' and 'nonsense queries scored 0.4375-0.5565' are the same length and only one of them is true.

---
id: 3bdb084e-bbac-464b-b20b-1a950e2848df
createdAt: 2026-08-03T12:15:33.271Z
importance: 5
tags:
  - retrieval
  - adr
  - enrichment
taskId: null
---
Methodological trap when calibrating a retrieval gate, learned on neuron ticket 27 (2026-08-03): a fused hybrid score can separate relevant from irrelevant queries beautifully on one corpus and the separation still be an artifact of that corpus's uniform metadata. Ticket 27's original evidence measured nonsense queries at score 0.4375-0.5565 against real queries at 0.7896-0.9375, which looks like a clean 0.23 margin — but that corpus was uniform importance-2 filler, so the importance term contributed a constant and the whole spread came from the rank term. On the real store, where 186 of 274 entries sit at the default importance 3 and 57 sit at 5, the same formula inverts orderings: the 'ls' query's cosine-rank-1 entry at importance 3 scores 0.500 and is displaced by the cosine-rank-3 entry at importance 5 scoring 0.613. The general lesson is that a blended score must be decomposed against a corpus whose metadata VARIES the way production does before any threshold is fitted to it, otherwise you are measuring the corpus rather than the formula. The concrete technique that caught this: recompute each term of the score separately (normRrf and normImp) for the top-N hits and print them beside raw cosine and the FTS hit count, rather than reading the fused number. That decomposition also revealed the second, unrelated defect — normRrf is bimodal at exactly 0.5 with no FTS match, so it is a keyword-presence predicate rather than a tunable threshold, which no amount of sweeping 0.50-0.70 would have shown.

---
id: 10de4240-b5ab-4f0a-a1be-c9e64c3174dd
createdAt: 2026-08-03T12:39:01.551Z
importance: 4
tags:
  - md-storage
  - failure-fix
  - adr
taskId: null
---
When a schema default changes the STORAGE ROUTING of a system (neuron ticket 31, flipping storage.mode from vector-only to md on 2026-08-03), the tests that break are not the tests of the thing you changed — they are fixtures that were silently relying on the old default, and 22 of them broke here in two distinct ways worth recognising by shape. First, NeuronMemory.inMemory() and 15 index.test.ts cases construct a store with a FABRICATED projectRoot ('/in-memory/<name>', '/test/project'), so the new md default aimed markdown writes at a directory that cannot exist and every transact returned status 'error' instead of 'created'. Second, mdFileManagement.integration.test.ts and mdFileManagement.e2e.test.ts pass a whole NeuronMemory as DualStorageRouter's vectorDb collaborator, but production passes it a vector-only DELEGATE ({transact: transactVector, ...}); once the default was md, that inner NeuronMemory started routing to markdown too, putting two writers on the same .neuron directory and turning 'created' into 'updated'. The fix in both cases is to make the fixture state its mode explicitly rather than inherit it — a new NeuronMemoryOptions.storageMode override, set to 'vector-only' — because that is what production actually does, not a workaround for the flip. The general rule: before changing a default, grep the test suite for constructions that supply a fabricated filesystem path, because a default that was inert against a fake path stops being inert the moment it starts touching the filesystem.

---
id: 024cca81-1129-415c-aa8b-ea4f556d9467
createdAt: 2026-08-03T17:13:07.916Z
importance: 5
tags:
  - md-storage
  - failure-fix
  - adr
taskId: null
---
Fix for architecture-card content corrupting its own category's markdown file: synthesizeArchitecture() (src/components/summarizer.ts) used to emit a nested '---\ncategory:...\ntitle:...\ntags:...\nmtime:...\n---' YAML-shaped block as the FIRST LINES of the card's own content field. MdStorageAdapter.parseMarkdownDetailed's frontmatter finder (src/storage/mdStorageAdapter.ts) runs a single global regex for '---...---' blocks across the WHOLE category file rather than scoping to real entry boundaries, so this embedded block was mistaken for a second entry's frontmatter as soon as any other entry shared the category file, hard-erroring with 'Malformed YAML frontmatter' (ticket 35's intentional hard-fail-on-unparseable-YAML posture) on every subsequent read. Root cause was confirmed by grep: nothing in the codebase reads category/title/tags/mtime from inside the card's content (title duplicates the H1 heading immediately below it, tags duplicate the real storage-level tags array). Fix: deleted the entire nested frontmatter block from the template rather than patching the parser, since the block carried zero information nothing else already had. Edge case: this repo's own .neuron/decisions.md already held 6 real duplicate cards written by the old code, 2 of them with empty content likely from this exact corruption; those were deleted and let a fresh 'neuron scan' recreate the single canonical card.

---
id: a50e7252-f05e-4d2f-aa04-07c94358803f
createdAt: 2026-08-03T17:13:08.222Z
importance: 5
tags:
  - failure-fix
  - drift
  - md-storage
taskId: null
---
Fix for architecture blueprint card creating a new entry on every 'neuron scan' re-run: ingestScanResults (src/scanner/ingest.ts) used to find 'the' existing card via memory.query({categories, text: 'Repository Architectural Blueprint', limit: 10}) plus a .find() over the top-10 semantically-ranked results — a similarity search, not an exact-match lookup, so the card could rank outside its own category's top-10 once enough other entries accumulated, silently falling back to inserting a brand new duplicate. Verified the production impact directly: this repo's own decisions category had accumulated 6 scan-tagged entries this way. Root cause was a mismatched identity strategy, not a ranking-tuning problem — confirmed both storage backends (transactVector in src/index.ts and MdStorageAdapter.writeEntry) already do correct exact-id-match upsert (replace if id exists, insert if not), so the fix was to stop querying entirely and instead derive a stable id via sha256 hash of a fixed namespace plus the category string, passed directly as the upsert's id. A second, related bug surfaced while testing this: MdStorageAdapter.writeEntry minted a fresh createdAt on every call even when replacing an existing id (entry.createdAt || new Date().toISOString(), with no lookup of the prior value), unlike updateEntry and the SQLite upsert path which both correctly preserve the original createdAt on update — fixed by looking up the existing entry's createdAt via the already-computed existingIndex before falling back to a new timestamp. Both fixes were necessary together to make repeated 'neuron scan' runs produce a byte-identical file and a clean 'git status'.

---
id: 03dbc3f0-7468-4091-8fd9-80ff698d329b
createdAt: 2026-08-03T17:13:33.915Z
importance: 5
tags:
  - failure-fix
  - adr
  - rc2
taskId: null
---
Discovered while running the full test suite during ticket 37: neuron's own CLI-invoking test files (learn.test.ts, history.test.ts, cli.test.ts, and others using execSync against dist/cli.js) only override NEURON_DB_PATH to isolate the SQLite side, but never override the markdown storage path or chdir to a tmp project — so under storage.mode: md (the default since ticket 31), every one of these tests reads and writes the REAL project .neuron/{learning,history,decisions}.md files instead of an isolated fixture. Running 'npm test' in this repo actively pollutes the maintainer's real memory store (confirmed: entries like 'Always test first' and 'Vitest test runner requires --runInBand' landed in the real .neuron/learning.md after a test run) and simultaneously makes several assertions flaky/failing because they count real entries that were never supposed to be there (e.g. 'expected 1 but got 5'). Verified this is pre-existing and unrelated to ticket 37's changes via git stash comparison against pre-37 code, where the identical failures and identical pollution reproduce. The fix belongs to whichever ticket owns test-infrastructure hygiene: these tests need to either chdir into an isolated tmp project directory (the pattern scan.fidelity.test.ts and scan.determinism.test.ts already use) or pass an explicit storagePath override, matching how NEURON_DB_PATH already isolates the SQLite side.

---
id: cbcb1924-663d-4c94-a402-7d1c9f99682e
createdAt: 2026-08-03T21:20:09.009Z
importance: 5
tags:
  - longmemeval
  - ticket-22
  - rc2
taskId: null
---
Fix for silently-broken benchmark isolation after ticket 38's scope removal: neuron's LongMemEval/AMB benchmark harness (benchmarks/longmemeval/neuron_bridge.mjs and its deployed copy in agent-memory-benchmark/scripts/) isolated per-question documents by passing scope: doc.user_id on ingest and scopes: [user_id] on query, matching LongMemEval's isolation_unit='question' design where user_id=question_id. Ticket 38 dropped the scope column and is_manual_scope from the memories table entirely as part of removing the dead multi-tenant scope feature, but MemoryQuery and MemoryMutation in src/models/memory.ts never had a scopes/scope field to begin with even before that, and NeuronMemory.queryVector only ever filtered by project_id and category. So passing scope/scopes to transact()/query() was already a silent no-op at the TypeScript layer even before the SQLite column was dropped, and the bridge's plain-JS objects meant no compiler or runtime check ever caught it. The symptom would have been every LongMemEval query searching across all 23,867 documents from all 500 questions instead of its own question's partition, corrupting recall and cross-unit-leak measurements without an obvious error, since the query still returns plausible-looking results. Root cause is a documented dependency on a feature (benchmarks/longmemeval/README.md's own gotchas section says 'Isolation is by scope, not by database') that a later ticket silently removed elsewhere in the same codebase, with nothing wiring the two together. The exact resolution: change the bridge's ingest handler to set category: bench_${user_id} instead of scope, and the retrieve handler to filter categories: [bench_${user_id}] instead of scopes, since category is the only partition key query() still filters on. Also pin storageMode: 'vector-only' explicitly in the NeuronMemory constructor call, because the schema default became 'md' in ticket 31, which would otherwise trigger per-write markdown files plus a reconcile pass for a throwaway benchmark ingest of tens of thousands of documents. Verified the fix by rerunning the published-baseline control arm after the change and confirming it reproduced (recall@1 83.5%, @5 96.2%, @10 98.3%, 0 cross-unit leaks) rather than assuming the fix was correct. The general lesson: any adapter or benchmark harness that references a neuron field name directly (scope, is_manual_scope, or similar) rather than importing NeuronMemory's own types is invisible to a schema-removal ticket's own test suite, because the breakage lives entirely outside src/ and nothing in npm test exercises it — grep external benchmark/adapter directories for removed field names whenever a schema field is dropped, not just src/ and its own tests.

---
id: 89f5e704-d986-4ec0-987b-165a6f3a0da9
createdAt: 2026-08-04T01:51:31.303Z
importance: 4
tags:
  - vitest
  - test
taskId: null
supersededBy: 7ff68e51-1719-4033-8090-233f5bbf252b
supersededAt: 2026-08-12T02:24:27.692Z
---
Vitest test runner requires --runInBand

---
id: 3b1c1102-3ed3-4628-af82-ba28bb49abb5
createdAt: 2026-08-04T01:51:32.598Z
importance: 4
tags:
  - failure-fix
  - build
taskId: null
supersededBy: eedc797c-29f3-4150-add8-3da38a88edfa
supersededAt: 2026-08-12T02:24:27.692Z
---
Fix for build error: pass --no-cache to avoid stale artifacts

---
id: 9c67e3f1-abf7-4e83-94f2-46ce2029c3eb
createdAt: 2026-08-04T01:51:32.916Z
importance: 3
tags: []
taskId: null
supersededBy: e80e0fdf-d21b-4f45-8ea5-79c8d500d129
supersededAt: 2026-08-12T02:24:27.692Z
---
tree sitter grammar caching at init time

---
id: fbe1af8a-985d-4e18-903a-20e083f97f0d
createdAt: 2026-08-04T01:51:33.025Z
importance: 5
tags:
  - db
taskId: null
supersededBy: e776ea27-c607-4d35-8d70-7bc608f5163b
supersededAt: 2026-08-12T02:24:27.692Z
---
Prefer WAL journal mode when many agents write concurrently

---
id: b2e83f10-8768-4670-a273-8a3d3af4449c
createdAt: 2026-08-04T01:56:41.474Z
importance: 4
tags:
  - vitest
  - test
taskId: null
supersededBy: 7ff68e51-1719-4033-8090-233f5bbf252b
supersededAt: 2026-08-12T02:24:27.692Z
---
Vitest test runner requires --runInBand

---
id: ccab6c00-2436-41f0-b57c-53188758a5b5
createdAt: 2026-08-04T01:56:42.649Z
importance: 4
tags:
  - failure-fix
  - build
taskId: null
supersededBy: eedc797c-29f3-4150-add8-3da38a88edfa
supersededAt: 2026-08-12T02:24:27.692Z
---
Fix for build error: pass --no-cache to avoid stale artifacts

---
id: c3abe896-a074-4ef3-ad5b-7e47a1569f07
createdAt: 2026-08-04T01:56:43.135Z
importance: 3
tags: []
taskId: null
supersededBy: e80e0fdf-d21b-4f45-8ea5-79c8d500d129
supersededAt: 2026-08-12T02:24:27.692Z
---
tree sitter grammar caching at init time

---
id: 10177546-e852-4d5d-97d8-85c98a6935b3
createdAt: 2026-08-04T01:56:43.169Z
importance: 5
tags:
  - db
taskId: null
supersededBy: e776ea27-c607-4d35-8d70-7bc608f5163b
supersededAt: 2026-08-12T02:24:27.692Z
---
Prefer WAL journal mode when many agents write concurrently

---
id: c3597196-9966-43d9-b11a-6ad81b4349ef
createdAt: 2026-08-04T02:13:11.301Z
importance: 4
tags:
  - vitest
  - test
taskId: null
supersededBy: 7ff68e51-1719-4033-8090-233f5bbf252b
supersededAt: 2026-08-12T02:24:27.692Z
---
Vitest test runner requires --runInBand

---
id: 71660338-d65b-4870-934b-1b434f253935
createdAt: 2026-08-04T02:13:12.405Z
importance: 4
tags:
  - failure-fix
  - build
taskId: null
supersededBy: eedc797c-29f3-4150-add8-3da38a88edfa
supersededAt: 2026-08-12T02:24:27.692Z
---
Fix for build error: pass --no-cache to avoid stale artifacts

---
id: f478c782-c4ce-47ab-a35f-aeb8bf23a8de
createdAt: 2026-08-04T02:13:12.959Z
importance: 5
tags:
  - db
taskId: null
supersededBy: e776ea27-c607-4d35-8d70-7bc608f5163b
supersededAt: 2026-08-12T02:24:27.692Z
---
Prefer WAL journal mode when many agents write concurrently

---
id: c250e145-0f52-4abe-812d-67ec79c728c6
createdAt: 2026-08-04T02:14:34.539Z
importance: 4
tags:
  - vitest
  - test
taskId: null
supersededBy: 7ff68e51-1719-4033-8090-233f5bbf252b
supersededAt: 2026-08-12T02:24:27.692Z
---
Vitest test runner requires --runInBand

---
id: c3c73be7-f84c-4631-82c6-774ae3760ab3
createdAt: 2026-08-04T02:14:35.795Z
importance: 4
tags:
  - failure-fix
  - build
taskId: null
supersededBy: eedc797c-29f3-4150-add8-3da38a88edfa
supersededAt: 2026-08-12T02:24:27.692Z
---
Fix for build error: pass --no-cache to avoid stale artifacts

---
id: f41e4f7e-3bee-4add-a1a1-4b90c108b0ad
createdAt: 2026-08-04T02:14:36.130Z
importance: 3
tags: []
taskId: null
supersededBy: e80e0fdf-d21b-4f45-8ea5-79c8d500d129
supersededAt: 2026-08-12T02:24:27.692Z
---
tree sitter grammar caching at init time

---
id: 52e93f53-417a-438b-854d-63d0533d92c4
createdAt: 2026-08-04T02:14:36.414Z
importance: 5
tags:
  - db
taskId: null
supersededBy: e776ea27-c607-4d35-8d70-7bc608f5163b
supersededAt: 2026-08-12T02:24:27.692Z
---
Prefer WAL journal mode when many agents write concurrently

---
id: 52d14096-7646-4ba2-b6a9-dc13ad36922b
createdAt: 2026-08-04T02:23:06.104Z
importance: 4
tags:
  - vitest
  - test
taskId: null
supersededBy: 7ff68e51-1719-4033-8090-233f5bbf252b
supersededAt: 2026-08-12T02:24:27.692Z
---
Vitest test runner requires --runInBand

---
id: 240892b1-e328-4796-909f-a94eac892df8
createdAt: 2026-08-04T02:23:07.726Z
importance: 4
tags:
  - failure-fix
  - build
taskId: null
supersededBy: eedc797c-29f3-4150-add8-3da38a88edfa
supersededAt: 2026-08-12T02:24:27.692Z
---
Fix for build error: pass --no-cache to avoid stale artifacts

---
id: 8c624948-f42b-4bec-a98d-4b82c3703f16
createdAt: 2026-08-04T02:23:08.444Z
importance: 3
tags: []
taskId: null
supersededBy: e80e0fdf-d21b-4f45-8ea5-79c8d500d129
supersededAt: 2026-08-12T02:24:27.692Z
---
tree sitter grammar caching at init time

---
id: 3985631f-229c-44af-9da6-d763db8b30a6
createdAt: 2026-08-04T02:52:01.877Z
importance: 4
tags:
  - vitest
  - test
taskId: null
supersededBy: 7ff68e51-1719-4033-8090-233f5bbf252b
supersededAt: 2026-08-12T02:24:27.692Z
---
Vitest test runner requires --runInBand

---
id: 8db81b8e-389b-47df-9f00-5b5a6c858db5
createdAt: 2026-08-04T02:52:03.246Z
importance: 4
tags:
  - failure-fix
  - build
taskId: null
supersededBy: eedc797c-29f3-4150-add8-3da38a88edfa
supersededAt: 2026-08-12T02:24:27.692Z
---
Fix for build error: pass --no-cache to avoid stale artifacts

---
id: 1ca5a17b-9c4f-4512-a474-911f88264259
createdAt: 2026-08-04T02:52:03.684Z
importance: 5
tags:
  - db
taskId: null
supersededBy: e776ea27-c607-4d35-8d70-7bc608f5163b
supersededAt: 2026-08-12T02:24:27.692Z
---
Prefer WAL journal mode when many agents write concurrently

---
id: 5af9d15b-a76c-4762-970c-cd00e434f4fb
createdAt: 2026-08-04T02:53:41.658Z
importance: 4
tags:
  - vitest
  - test
taskId: null
supersededBy: 7ff68e51-1719-4033-8090-233f5bbf252b
supersededAt: 2026-08-12T02:24:27.692Z
---
Vitest test runner requires --runInBand

---
id: d517d05a-cb85-42fa-9a4c-80dae687d462
createdAt: 2026-08-04T02:53:42.950Z
importance: 3
tags: []
taskId: null
supersededBy: e80e0fdf-d21b-4f45-8ea5-79c8d500d129
supersededAt: 2026-08-12T02:24:27.692Z
---
tree sitter grammar caching at init time

---
id: b21ee8f5-0690-42c9-a185-80d8f679b6bc
createdAt: 2026-08-04T02:53:43.452Z
importance: 5
tags:
  - db
taskId: null
supersededBy: e776ea27-c607-4d35-8d70-7bc608f5163b
supersededAt: 2026-08-12T02:24:27.692Z
---
Prefer WAL journal mode when many agents write concurrently

---
id: 7ff68e51-1719-4033-8090-233f5bbf252b
createdAt: 2026-08-04T02:55:42.775Z
importance: 4
tags:
  - vitest
  - test
taskId: null
---
Vitest test runner requires --runInBand

---
id: 21a2c6da-49ed-46cf-a04f-a69176c73741
createdAt: 2026-08-04T02:55:43.850Z
importance: 3
tags:
  - initial
taskId: null
---
Original learning content

---
id: eedc797c-29f3-4150-add8-3da38a88edfa
createdAt: 2026-08-04T02:55:43.971Z
importance: 4
tags:
  - failure-fix
  - build
taskId: null
---
Fix for build error: pass --no-cache to avoid stale artifacts

---
id: e80e0fdf-d21b-4f45-8ea5-79c8d500d129
createdAt: 2026-08-04T02:55:44.252Z
importance: 3
tags: []
taskId: null
---
tree sitter grammar caching at init time

---
id: e776ea27-c607-4d35-8d70-7bc608f5163b
createdAt: 2026-08-04T02:55:44.587Z
importance: 5
tags:
  - db
taskId: null
---
Prefer WAL journal mode when many agents write concurrently

---
id: f471ae28-5594-4663-bdba-050707c22144
createdAt: 2026-08-04T02:58:14.365Z
importance: 5
tags:
  - md-storage
  - failure-fix
  - adr
taskId: null
---
Never git stash/checkout/reset .neuron/*.md in this repo without checking what's in it first. Context: while implementing wayfinder ticket 14 (protocol block rewrite), I ran 'git stash' to test against pre-change code, which swept up pre-existing uncommitted .neuron/*.md edits from an earlier session along with my own code changes, then a test run (ticket 42's known CLI-store-pollution bug) wrote further changes on top, causing 'git stash pop' to conflict and abort. Root cause: the real SQLite database lives outside the repo entirely (env-paths app-data dir, keyed by a sha256 hash of the project root — see src/index.ts NeuronMemory.open), completely unaffected by git operations on the repo; only the .neuron/*.md mirror files are tracked in git. But this repo runs storage.mode: md, where markdown is authoritative and strict-mirror reconcile treats an entry missing from markdown as a deletion instruction once meta.md_seeded_at is set (ADR 0011, ticket 29) — so resetting markdown to an older git commit and then running any real 'neuron' command against the live store could have permanently deleted vector-store rows for every entry added since that commit, not just reverted a text file. Resolution: I discarded the test-pollution diff with 'git checkout -- .neuron/*.md' (safe, since it was created by re-running tests against reverted code) and confirmed via 'git stash pop' that no destructive reconcile had run in between, then double-checked specific known entries (e.g. wayfinder history for tickets 11/12/28/36) were still present in the mirror after recovery. Edge case: this risk only applies to md/split storage modes with md_seeded_at already set; a vector-only project or a store that has never been seeded is safe because bootstrap-seed only ever exports (adds), never deletes. Going forward, treat any git operation that reverts .neuron/*.md in a md-mode project as equivalent to a destructive database operation and check git status/diff on those files before and after, not just on the code.

---
id: 70ddc9d5-ccad-4ce7-9ada-8095af3b0f9c
createdAt: 2026-08-05T00:25:04.646Z
importance: 4
tags:
  - adr
  - md-storage
  - rc2
taskId: null
---
Fix for real-.neuron-store test pollution (wayfinder ticket 42): several execSync-based CLI test files (cli.test.ts, exec.test.ts, history.test.ts, learn.test.ts, memory.test.ts) overrode NEURON_DB_PATH to isolate SQLite but never isolated the markdown storage path, so under storage.mode: md (default since ticket 31) every test run wrote real entries into this repo's own .neuron/learning.md and .neuron/history.md. Root cause: NeuronMemory.open(dir) and loadNeuronYaml/findNeuronYaml both walk UP from the given directory looking for package.json/.git before falling back to defaults, so any execSync child process invoked without an explicit cwd (or any in-process NeuronMemory.open() call against an unmarked subdirectory of this repo) silently resolves storage against the real repo root. Verified 10,633 real lines were injected into learning.md by test/e2e/adversarial-recall.test.ts alone in a single raw vitest run. Fix: plant a bare package.json ('{}') in a per-test tmp project directory (nested under the file's existing gitignored src/__tests__/temp-* dir) before any CLI invocation — this alone stops the upward walk (findProjectRoot/findNeuronYaml both check for package.json/.git as a hard stop), so DEFAULT_CONFIG (mode md, learning/history/decisions/architecture categories) applies safely inside the isolated directory instead of the real one — then pass cwd: projectDir to every execSync/spawnSync call. This exact pattern already existed correctly in src/commands/init.test.ts and one block of memory.test.ts; the fix was applying it consistently everywhere else, not inventing a new mechanism. Edge case found: NeuronMemory.open(workDir) (used by in-process E2E benchmarks) walks up the same way execSync's inherited cwd does, but NeuronMemory constructed directly with an explicit projectRoot (bypassing .open()) resolves storage relative to that literal path and is safe by construction — so only .open()-style callers need the package.json guard.

---
id: 6afa86c5-16a6-4aa6-815d-bda7defa4371
createdAt: 2026-08-05T00:52:45.949Z
importance: 5
tags:
  - rc2
  - 2.2.0
  - adr
taskId: null
---
Neuron's recall hook has a per-injection character budget but no per-session budget, which is the load-bearing fact for any claim about what it costs a user's context. src/harnesses/payload.ts caps session-start at 6000 chars (~1500 tokens) and pre-prompt at 1500 chars (~375 tokens) per turn, but src/commands/hook.ts fires pre-prompt on every user prompt and filterUnseen only prevents an entry being injected twice within a ledger epoch - so a 40-turn session surfacing novel hits every turn injects roughly 15000 tokens, and clearLedger wipes the ledger on context-reset so every compaction makes the entire store re-eligible. Against this repo's ~1000-entry, 328KB (~82000 token) store the practical per-epoch ceiling is the whole store, not the per-injection budget. Measured at the same time: installing the hook only saves 436 chars (~109 tokens) of standing instructions, because generateProtocolBlock's deterministic variant is 2399 chars against the fallback's 2835 - so the resident-footprint argument is net-negative today and cannot be fixed by measurement alone.

---
id: f8e5c01e-7228-40f0-979f-308cbd2b9373
createdAt: 2026-08-05T15:12:15.151Z
importance: 4
tags:
  - failure-fix
  - adr
  - scanner
taskId: null
---
Fix for scaffold.ts generating a deprecated config key: NEURON_YAML_TEMPLATE (src/config/scaffold.ts) still emitted pullRules.default.minScore: 0.35 after tickets 39/41 deprecated minScore as structurally inert (ADR 0012) — the deprecation only added a stderr warning path in neuronYaml.ts, it never touched the generator that ships the key into every fresh project. Symptom: any project bootstrapped via 'neuron init' on rc3+ would print '[neuron warning] pullRules.default.minScore is deprecated' on its very first subsequent command, since the raw parsed config has the key set explicitly. Root cause verified by grepping the codebase for minScore call sites and confirming validateNeuronYaml's warning fires only when the raw YAML sets the key, then running the actual generated template through the parser and observing the warning. Fix: delete the 'minScore: 0.35' line from the pullRules.default block in NEURON_YAML_TEMPLATE, extend the template's own doc comment to name minScore alongside the existing llm.enrichment.importance trap it already warned about, and add two regression tests in scaffold.test.ts — one asserting the template string never contains 'minScore', one asserting validateNeuronYaml raises zero stderr writes when parsing the template. This repo's own hand-written neuron.yaml still carries the stale key and was deliberately left alone, since it predates the deprecation and is out of scope for a template-generation fix.

---
id: 09cc83bf-725e-4f17-8e3d-11e7cee75cfd
createdAt: 2026-08-08T11:58:51.820Z
importance: 4
tags:
  - failure-fix
  - longmemeval
  - adr
taskId: null
---
Fix for a long-running Node harness losing all data on timeout: benchmarks/token-ab/run.mjs (and any similar all-sessions-then-write orchestrator) only calls fs.writeFileSync(results.json) once, after every session in the plan finishes -- so running it via a foreground Bash tool call that hits the default 2-minute timeout kills the process mid-run with zero results persisted, even though the API calls already succeeded and were billed. Verified twice on 2026-08-08 while re-running ticket 10's counterfactual A/B for ticket 18: two separate foreground invocations were each killed at 2 minutes after 9-10 of 12 sessions had actually completed (visible in the captured stdout log), losing all of that session data and leaving orphaned git worktrees under the OS tmpdir that had to be found via 'git worktree list' and cleaned up by hand ('git worktree remove --force <dir>' then 'git worktree prune'). Resolution: always launch this class of script (anything with real spend and a single end-of-run write) with run_in_background true, or redirect to a log file and poll, never as a plain foreground call that can hit the harness's own timeout. Edge case: a killed run's real API cost is still incurred and billed even though no results file exists to account for it -- if this happens, recover the per-session pass/fail/token/cost numbers from the captured stdout log text rather than treating the spend as unaccounted.

---
id: dff743f7-f9c5-442c-9d3a-b1efc1dfd521
createdAt: 2026-08-08T11:58:52.177Z
importance: 4
tags:
  - failure-fix
  - git
  - release
taskId: null
---
Fix for benchmarks/token-ab/run.mjs's fixture builder silently testing pre-fix code: fixtures.mjs calls 'git worktree add --detach HEAD', which reads the last commit, not the working tree -- so if the change under test (e.g. ticket 17's memory-supersession implementation) is still uncommitted, a live A/B re-run against that fixture measures the OLD behaviour and would have reproduced the original regression even though the fix existed on disk. Caught 2026-08-08 before spending anything live, via 'git diff --stat HEAD -- .neuron/decisions.md' showing 229 deleted lines still uncommitted. Resolution: before trusting any git-worktree-based fixture (this harness or a future one), diff the target paths against HEAD, not just 'git status', to confirm the fixture will actually see the change being tested; commit first if it doesn't.

---
id: 5d492dbb-1124-4830-bfe6-3a8edfad774d
createdAt: 2026-08-08T23:06:14.581Z
importance: 4
tags:
  - md-storage
  - failure-fix
  - adr
taskId: null
---
Fix for a real (not hypothetical) data-loss bug in DualStorageRouter.reconcileCategoryWithPathGuard: its first-sighting branch (knownRoot === null) fell through to the destructive strict-mirror reconcile instead of reseeding, on the assumption that a category reaching that method had always been reconciled before. Root cause: that assumption only held while storage.mode: split gated whether the per-category storage override was live; making the override always live (ticket 06, neuron-2.3.0) lets a category enter the md-reconciled set for the first time on a store that already has real vector rows for it, and the destructive mirror reads its never-written .md file as empty and deletes every row as 'absent from markdown'. Fixed by routing every first-ever sighting through the same seedCategoryFromVector reseed a root change already uses: change 'if (knownRoot === null) { setMeta; }  else if (knownRoot !== resolvedRoot) { seed; setMeta; return; }' to 'if (knownRoot === null || knownRoot !== resolvedRoot) { seed; setMeta; return; }'. Any future change to what categories get added to the reconciled set (not just storage-mode changes) should re-check this code path for the same hazard.

---
id: 64978a27-6c1c-4bef-919b-1917d2851dd5
createdAt: 2026-08-08T23:42:02.061Z
importance: 4
tags:
  - failure-fix
  - md-storage
  - adr
taskId: null
---
Fix for real markdown-store pollution found 2026-08-08 while about to commit ticket 06's work: git diff showed .neuron/decisions.md with 232 lines removed, the real 'Repository Architectural Blueprint: @kovartravis/neuron' architecture card silently overwritten with test fixture content (project name 'harness-idempotent-test', 0 modules). Root cause: src/commands/init.test.ts's 'is idempotent — running twice overwrites skill without error' test execs a real 'node dist/cli.js init' subprocess against a temp project dir named .../harness-idempotent-test, which runs neuron scan as part of init; that scan's write path resolved storage.mode: md against the REAL repo root rather than the isolated temp dir (the same class of bug ticket 42 already tracks for markdown-path isolation, but a previously-unidentified instance/location — init.test.ts specifically, not the CLI-invoking test files ticket 42 already names). Verified via direct sqlite3 query against the real production DB (~/Library/Application Support/neuron/db/<hash>.sqlite) that the corruption never reached SQLite — only the markdown mirror was polluted, presumably because that init subprocess's own SQLite writes went to its own isolated NEURON_DB_PATH while its markdown writes leaked into the real repo. Recovery: git show HEAD:.neuron/decisions.md to get the clean base, then reappend only the legitimate new entries from the corrupted working-tree file (diff the two to confirm nothing else was lost), rather than a blind git checkout which would have also discarded real uncommitted additions. General rule reinforced: before any git commit/push in this repo, run 'git diff --stat -- .neuron/' and actually read it, not just glance at the file list — a large unexplained deletion count in a memory-store file is the tripwire, and ticket 42 (test isolation) should add init.test.ts to its scope.

---
id: 29e162f0-e244-4c8c-b2e3-1dd7a8fbfbd4
createdAt: 2026-08-09T11:57:34.253Z
importance: 4
tags:
  - failure-fix
  - exec
  - testing
taskId: null
---
Fix for a TypeError: The database connection is not open, thrown intermittently from any status subcommand that does real async work: src/cli.ts's status branch did 'return handleStatusCommand(memory, args)' (no await) inside a try { ... } finally { memory.close(); }. Root cause: calling an async function runs it synchronously up to its first real suspension point, and a bare 'return <promise>' hands control straight to finally without waiting for that promise to settle, so memory.close() ran before a pending continuation inside the handler resumed. This was latent and invisible for the original status command because it stayed fully synchronous unless scan.enabled was true, and even then its only await (getArchitecturalDrift) was already wrapped in a try/catch that silently downgrades any error, including a closed-db TypeError, to hasDrift: false — masking the exact same race. It surfaced as a hard crash once neuron status --check/--repair (ticket 13) added a real await with no such catch. Fix: 'return await handleStatusCommand(memory, args)', matching every other subcommand branch in cli.ts, which already awaited before returning. General rule: in a try/finally that releases a resource, every branch that returns an async call's result must await it explicitly — a bare return of a promise is not enough, and the bug can hide indefinitely behind an unrelated catch block downstream.

---
id: cf96addc-8995-4bba-9418-61c7ee2b5077
createdAt: 2026-08-09T13:19:25.996Z
importance: 4
tags:
  - adr
  - rc2
  - failure-fix
taskId: null
---
Fix for ui.test.ts's /api/learnings order assertion breaking after changing NeuronMemory.queryVector's list-mode SQL from ORDER BY rowid ASC to DESC (ticket 31, neuron-2.3.0): the test asserted the old oldest-first order on a two-entry list-mode fetch through the UI server's /api/learnings endpoint, which passes an explicit limit but no ordering override, so it inherited the fix and started failing. Root cause: the endpoint's default ordering was never independently tested for direction, so the ordering bug had a second, un-flagged blast-radius surface beyond the CLI paths the ticket scoped. Resolution: updated the assertion to expect the corrected newest-first order (src/commands/ui.test.ts) rather than loosening it or reverting the fix. Edge case: any test elsewhere that asserts on list-mode (no-text query) ordering with more than one seeded entry needs the same check — grep for multi-entry list-mode fetches before trusting a green suite after an ordering change.

---
id: f8bf86d3-b85a-4f72-9beb-ac000cac9cc4
createdAt: 2026-08-09T14:32:12.387Z
importance: 4
tags:
  - failure-fix
  - exec
  - adr
taskId: null
---
Fix for false-negative grading in benchmarks/token-ab/swebench-tasks.mjs's check() functions: ticket 19's --pilot run reported 100% control-arm failure (4/4) on both SWE-bench tasks, appearing to fail the 15-40% difficulty-calibration gate on the too-hard side. Root cause verified by hand: the model's prose answers were correct in all 4 sessions but wrapped at ~80 chars and used markdown emphasis, so keyword phrases like 'constant 1' literally split across a line break ('constant\n`1`') or were separated by ``/** markers, and a plain substring/lowercase check can't span either. Resolution: added normalizeForMatch() to grading.mjs (strips backtick/asterisk emphasis and collapses all whitespace including newlines to single spaces before any keyword check), applied it in swebench-tasks.mjs's check() functions, and broadened django's mentionsFix keyword list for a few correct-but-differently-worded phrasings ('handle memoryview', 'isinstance(value, memoryview)', etc). Edge case: normalizeForMatch deliberately does NOT strip underscores, since identifiers like make_bytes and _cstack use them structurally, not as markdown italics -- stripping underscores too was tried first and silently broke the mentionsFunction check for both tasks.

---
id: a05b9030-20dd-4388-807e-3c7406415507
createdAt: 2026-08-09T14:43:43.299Z
importance: 4
tags:
  - failure-fix
  - exec
  - longmemeval
taskId: null
---
Fix for benchmarks/token-ab/run-swebench-ab.mjs's --dry-run mode silently destroying real captured results: running 'npm run bench:swebench-ab:pilot:dry-run' to validate a fixture change against a NEW task pair overwrote the SAME results.json path a prior LIVE run had just written (.scratch/neuron-2.3.0/audits/19-synthetic-fixture-counterfactual-ab/pilot/results.json), destroying $0.14 of real captured API answers and a regrade note with no backup. Root cause: OUT_DIR in run-swebench-ab.mjs is keyed only on --pilot vs full, not on dry-run vs live or on which task set is active, so any dry-run invocation against the same mode unconditionally clobbers the last live run's artifact. Caught immediately (not silently) because the full answerText for all 4 sessions had already been printed to the working conversation and the console log with exact turns/tokens/cost per session still existed at the background task's own output file, so the artifact was reconstructed byte-faithful on the parts that mattered (answers, verdicts, total cost) with an explicit note on the parts that were not recoverable (per-session token breakdown, wall-clock time). General rule: before running --dry-run against a harness whose OUT_DIR you've already spent real money populating, cp the existing results.json aside first, or check whether the harness scopes dry-run output to a separate path — it does not, here.

---
id: 57047865-1b9e-4c84-9af1-0fe861853bd6
createdAt: 2026-08-09T14:55:54.035Z
importance: 4
tags:
  - exec
  - failure-fix
  - adr
taskId: null
---
Found while testing ticket 19's SWE-bench harness at effort:'medium': benchmarks/token-ab/swebench-tasks.mjs's check() functions have an identifiesFix gate that requires the answer to state a literal code-shaped fix (e.g. 'wrap library in a dict subclass'), but every task prompt in the file only asks 'which mechanism is responsible... and what exactly is wrong with it' -- it never asks the model to propose a fix. At effort:'low' the model happened to volunteer fix-shaped phrasing anyway, so the gate silently passed; at effort:'medium' the model wrote a more discursive design-flaw explanation ('should have been applied uniformly', 'factored into a shared helper') that is equally correct but doesn't hit the keyword list, so the gate failed two answers that were actually right (verified by hand). General lesson: when a deterministic check() gate tests for content the prompt never actually requested, it is not testing a real signal, only whether the model happened to phrase things a particular way -- and that phrasing can shift with something as unrelated as an effort-level change. Before trusting a check() gate, re-read the exact prompt it's grading against and confirm the gate corresponds to something the prompt actually asked for.

---
id: 3441264f-73cc-4323-882d-172ad15faa7d
createdAt: 2026-08-09T18:06:39.292Z
importance: 4
tags:
  - failure-fix
  - release
  - sqlite
taskId: null
---
Fix for GitHub Actions publish.yml build-and-test failure 'Error: No such built-in module: node:sqlite': the workflow (ticket 21, neuron-2.3.0) pinned node-version '20' in both jobs, but src/db.ts's createNodeSqliteWrapper uses node:sqlite's DatabaseSync, which requires Node >=22.5.0 and wasn't usable without the --experimental-sqlite flag until 22.13.0/23.4.0 -- invisible locally because dev machines run Node 24. Root cause only surfaced on the first real CI run (ticket 36), since ticket 21's own YAML syntax check and manual dist-tag review never executed the test suite under the pinned runtime. Fix: bump node-version to '22' in both the build-and-test and publish jobs of .github/workflows/publish.yml, and add "engines": {"node": ">=22.13.0"} to package.json to document the real minimum so this doesn't regress silently. Edge case: actions/checkout@v4 and actions/setup-node@v4 themselves log an unrelated 'Node 20 is being deprecated' warning about the action runtime, not the node-version input -- that warning is noise, not something to chase.

---
id: deeacd84-b8a4-4079-813a-1ab2180e62c2
createdAt: 2026-08-09T18:19:12.747Z
importance: 4
tags:
  - npm
  - release
  - failure-fix
taskId: null
---
npm's publish auth model changed under us mid-ticket (2026-07-31): npm disabled Classic token creation entirely (no more 'Automation' token type in the npmjs.com UI -- confirmed live, only 'Granular Access Token' remains), and per npm's own changelog, Granular tokens' 2FA-bypass publish capability is being removed entirely in January 2027, with npm's current guidance recommending Trusted Publishing (OIDC) or staged publishing instead. Symptom that surfaced this: a manual 'npm publish' hit 'npm error code EOTP' even with an NPM_TOKEN environment secret already provisioned, because that token was a standard Granular token still subject to interactive 2FA, which can never work unattended from CI (no human to supply a live code). Resolution: switched .github/workflows/publish.yml's publish job to GitHub OIDC trusted publishing instead of any token -- added permissions: id-token: write at job level (job-level permissions blocks replace rather than merge the workflow-level block, so contents: write had to be repeated there too), bumped node-version to '24' and added an explicit 'npm install -g npm@latest' step since trusted publishing requires npm CLI >=11.5.1, and removed the NODE_AUTH_TOKEN env var from the publish step entirely (docs.npmjs.com explicitly warns setting it makes npm fall back to the legacy token path instead of OIDC). Remaining HITL step: the package owner must configure Trusted Publisher -> GitHub Actions on npmjs.com package settings (org, repo, workflow filename, optionally environment name) before this will actually authenticate -- the OIDC identity means nothing to npm's registry until that trust relationship is registered on their end.

---
id: 78349826-8751-4b30-aef7-fc861072d435
createdAt: 2026-08-09T19:19:22.129Z
importance: 5
tags:
  - md-storage
  - adr
  - failure-fix
taskId: null
---
Fix for MdStorageAdapter's parseMarkdownDetailed silently dropping entries after a stray '---' in an entry's body (neuron-2.3.0 ticket 38): the single-pass global regex /(?:^|\n)---\n([\s\S]*?)\n---\n/g advanced its own lastIndex past a REJECTED candidate block (one that failed the key:value frontmatter test), consuming the next real delimiter along with it -- measured on this repo's own decisions.md, one duplicated paragraph with a stray horizontal rule dropped 41 of 109 real entries (68 parsed), and reconcileCategory then silently mass-deleted the 'missing' rows from the SQLite mirror on every reconcile. Root cause of the corruption itself was NOT a parser/formatter bug (format/parse roundtrip tests already passed) but a one-off write whose content argument had the same paragraph pasted twice with a literal '---' divider -- the real defect was that the READER let one bad entry cascade into losing unrelated ones. Fix: replaced the single regex pass with a two-pointer scan over every raw '---'-only line; a rejected (open,close) pair now retries from the very next delimiter instead of skipping past it, so body content is preserved literally on the entry that has it and never swallows a neighbor. Edge case: this only protects the READ side -- reconcileCategory's delete-mirror step still has no hard tripwire against a large single-pass deletion (ADR 0011 Consequence 2 rules that out deliberately), only a new non-blocking stderr warning at >=20% of a category's vector rows in one pass (MASS_DELETE_WARN_FRACTION in dualStorageRouter.ts).

---
id: fc3baad1-78c5-47f6-b191-2d9fcd4ba326
createdAt: 2026-08-09T19:34:40.337Z
importance: 4
tags:
  - failure-fix
  - adr
  - architecture
taskId: null
---
Fix for module detail cards leaking into unconditional session-start injection: after ticket 28 split the architecture blueprint into a small index plus per-module detail cards sharing the index's category and tags, fetchArchitectureCardPayload's pre-existing additive top-N-in-category query (src/commands/hook.ts, predating 28) started matching real module cards and injecting full per-module detail on every session-start call regardless of relevance, defeating the whole point of the index/module split. Root cause: the additive query only excluded the index's own id, never the module ids that now share its category/tags. Fixed by computing the set of moduleCardId(category, path) for every module in the fetched index (via parseModuleListFromIndex, already exported from ingest.ts) and excluding those ids too: const moduleIds = new Set(parseModuleListFromIndex(blueprint.content).map(m => moduleCardId(category, m.path))); filtered = results.filter(r => r.id !== blueprint?.id && !moduleIds.has(r.id)). Reproduced live via a plain 'neuron hook claude-code session-start' call against this repo's own store before the fix (a real 'ui' module card appeared with no prompt in play), confirmed absent after.

---
id: 65899d09-307b-40f7-9661-6d21ef4721a3
createdAt: 2026-08-10T12:05:30.893Z
importance: 4
tags:
  - failure-fix
  - 2.2.0
  - architecture
taskId: null
---
Fix for misleading hook-target prompt during 'neuron init': running init for a non-Claude harness (e.g. Copilot CLI) still showed a prompt naming .claude/settings.json paths for all three project-committed/project-local/user-global choices, discovered while doing ticket 20's real-install verification of the Copilot adapter. Root cause: resolveHookTarget in src/commands/init.ts hardcoded Claude Code's file paths in its interactive prompt copy even though this prompt is asked once per init run and applies across every harness being wired (ADR 0014 section 6) -- the actual write was always correct (CopilotAdapter.install() resolves its own real path via targetFilePath(), and the final JSON output's 'installed' field reports it truthfully), only the prompt text was wrong. Fixed by rewriting the three prompt lines to describe the scopes generically (committed/gitignored/user-wide) instead of one harness's concrete file names, and pointing users to the post-install report for exact paths -- no change needed in copilot.ts or any other adapter, this was purely init.ts copy shared incorrectly across harnesses. Edge case: any future harness-specific interactive copy in init.ts (there is currently none) should stay generic or be built dynamically from the adapters actually selected for that run, rather than hardcoding one harness's paths.

---
id: b742cf51-6d9a-4f65-99b1-bc15a811e12d
createdAt: 2026-08-10T19:14:00.505Z
importance: 4
tags:
  - llm
  - enrichment
  - memory
taskId: null
---
Fix for declareCategoryInNeuronYaml (ADR 0017) silently dropping a config's implicit default categories: a neuron.yaml with no top-level 'categories' key relies on NeuronConfigSchema's zod .default(...) for the whole block, which only applies when the key is fully ABSENT from the parsed object. The initial implementation used the yaml package's Document.setIn(['categories', name], emptyMap) to auto-declare a category, which auto-vivifies a 'categories' key containing ONLY the new entry -- making the key present, so zod's default no longer fires, silently discarding every implicit default category (learning/history/decisions/architecture) and breaking pullRules.default's own category reference. Caught by a targeted unit test (auto-vivifies a missing top-level categories key) that round-tripped the write through loadNeuronYaml and asserted on the full config, not just the new key. Fix: before setIn-ing the new category, check doc.get('categories') === undefined; if so, seed the same DEFAULT_CONFIG.categories entries explicitly first via doc.setIn(['categories', name], cfg) for each, making the implicit set explicit, then append the new category on top.

---
id: 215990ae-7f47-4637-a7c2-3f5a614e96de
createdAt: 2026-08-10T19:44:25.386Z
importance: 4
tags:
  - rc2
  - wayfinder
  - 2.2.0
taskId: null
---
Ticket 06 (neuron-2.4.0)'s per-prompt discovery hint initially compared the store-wide FTS COUNT(*) against turnIds.length (the final, post-ledger-dedup, post-budget injected count) to decide whether to append a 'more results available' hint. This broke four pre-existing hook.test.ts tests asserting that a repeat pre-prompt turn over an already-shown entry stays silent (src/harnesses/ledger.ts's dedup guarantee) -- because the ledger correctly drops an already-seen entry from turnIds every turn, the FTS count always exceeded it, so the hint re-fired every turn pointing at the same one entry the agent had already seen. Fixed by comparing against results.length instead: this turn's gated, RRF-ranked recall capped at the query's own limit:10, taken BEFORE filterUnseen's ledger dedup and BEFORE buildPayload's char-budget packing (src/commands/hook.ts). This isolates the actual gap the ticket cares about -- the fixed limit:10 hiding the tail of a large match set -- without coupling the hint to session-scoped dedup or per-turn budget truncation, both already owned by ticket 07/the ledger elsewhere.

---
id: aada84c5-74c2-4ae6-a1a0-1819106675b6
createdAt: 2026-08-10T20:04:22.498Z
importance: 4
tags:
  - exec
  - adr
  - failure-fix
taskId: null
---
Fix for a false-positive Bash-command match in the ticket-07 hint-follow instrument: recordToolUse's QUERY_COMMAND_PATTERN was a bare substring test (/neuron\s+memory\s+query/), so any Bash command that merely quoted or echoed that phrase (found live: this ticket's own smoke test, 'echo <json containing the phrase> | neuron hook claude-code post-tool-use') got logged as a real query invocation. Root cause: substring matching can't distinguish 'runs the command' from 'contains the text of the command'. Fixed by anchoring the pattern to require an actual invocation position — start of command or immediately after a shell separator (;, &, |, a subshell's ( or backtick, or a newline): /(^|[;&|\n(`]\s*)neuron\s+memory\s+query(\s|$)/ in src/harnesses/hintFollowLog.ts. Edge case covered by a regression test: a chained real invocation like 'cd /repo && neuron memory query ...' still matches correctly.

---
id: 5b7aec68-0263-4f56-b0a2-711ba1d42988
createdAt: 2026-08-10T20:06:34.249Z
importance: 4
tags:
  - adr
  - exec
  - enrichment
taskId: null
---
Second fix for the same false-positive class in the ticket-07 hint-follow instrument (src/harnesses/hintFollowLog.ts): after anchoring QUERY_COMMAND_PATTERN to require an invocation position (start of command or after a shell separator), a real neuron memory add call whose quoted --category learning content itself mentioned the phrase 'cd /repo && neuron memory query ...' as prose still matched, because the separator anchor landed inside a string literal, not at the shell's top level. Root cause: text-only pattern matching without any awareness of shell quoting can't tell 'a separator character appears before this position' from 'a separator character appears before this position AND we are not inside a quoted string'. Fixed by adding isInsideQuotes(), a lightweight quote-parity scan (not a real shell tokenizer) that walks the command up to the match index tracking single/double-quote depth, and only accepts a match when it falls outside both. Iterates every regex match via the g flag rather than stopping at the first, since an earlier match could be the false positive while a later one is real. Regression test covers this exact case: a neuron memory add command whose quoted content describes a chained invocation as an example.

---
id: cb66c444-ec60-4e3f-bb96-1d7a5fed7adf
createdAt: 2026-08-11T00:15:30.146Z
importance: 4
tags:
  - testing
  - git
  - failure-fix
taskId: null
---
Fix for hook.test.ts's git-log tests silently coupling to the real repo's own git history: temp project dirs under src/__tests__/temp-hook/ have no .git of their own and sit nested inside this real repo's working tree, so once src/harnesses/gitLog.ts's git rev-parse/git log shell-outs entered the pre-prompt hook path, git silently walked up and found THIS repo's actual .git, breaking eight pre-existing deterministic tests. Root cause: git's directory-discovery walks up to the nearest ancestor .git with no notion that a test fixture wants isolation. Fixed by setting GIT_CEILING_DIRECTORIES in hook.test.ts's env() helper to tempDbDir (projectDir's PARENT), not projectDir itself -- empirically, listing a directory as its own ceiling does not stop git from ascending one level past it, only listing an ancestor does (verified manually: GIT_CEILING_DIRECTORIES=$(pwd) inside the dir still found the outer repo; GIT_CEILING_DIRECTORIES=<parent> correctly returned 'not a git repository'). Tests that specifically exercise git-backed features should git init their own fixture dir, which satisfies discovery before it would ever need to ascend at all.

---
id: a32b4b8c-e1eb-4876-bc5f-3845f6d5927b
createdAt: 2026-08-11T03:10:39.124Z
importance: 4
tags:
  - failure-fix
  - memory
  - adr
taskId: null
---
Fix for stale CLAUDE.md protocol block header after a live neuron.yaml category change: this repo's own CLAUDE.md still listed categories as learning, history, decisions and scan.category as decisions after ticket 01's live session auto-declared categories.architecture: {} in neuron.yaml and reverted the scan.category alias to architecture — the protocol block's header line was never regenerated to match. Root cause: neuron init's upsertProtocolBlock only overwrites the marker-bounded region when --overwrite-hooks is passed or the run is interactive with consent; a non-interactive re-init just reports kept-existing and leaves the stale text in place, so drift between neuron.yaml and CLAUDE.md silently persists until someone notices the kept-existing warning and acts on it. Confirmed via loadConfig()+generateProtocolBlock() that the only diff was that one header line, then applied the exact generated text by hand (the CLI's --overwrite-hooks write was blocked by the permission classifier as a destructive file write) and re-verified byte-for-byte against the generator before re-running init to see it report unchanged. Edge case: also learned that a bare neuron init (no --harness filter) in a repo with any existing .github/ dir silently onboards the github harness and writes AGENTS.md plus .github/hooks|skills/ with no separate opt-in — scope with --harness <id> when you only want one harness's files touched.

---
id: cc6a4717-741b-4756-80db-b8634f1bd734
createdAt: 2026-08-11T05:02:43.697Z
importance: 4
tags:
  - retrieval
  - rc2
  - wayfinder
taskId: null
---
Finding while building ticket 11's (neuron-2.4.0) git-log relevance-gate silence test: cleanFtsQuery's gate (src/components/fts-query.ts) is an OR across every non-stopword prefix term, so passing the FTS leg only requires ONE shared word between a query and this repo's own ~200-commit, self-referential corpus. A first attempt asking about 'CSV export' from 'the memory store' fired the gate anyway (matched on 'memory'/'store'/'ticket'); three more natural-sounding true-negative candidates using words like 'ship'/'storage'/'documented' also all fired. Building a genuine silence case required computing the full corpus vocabulary (git log --all --format=%s%n%b, ~2865 unique tokens) programmatically and picking content words verified to be neither a member of, nor a prefix match against, any token in it — a hand-picked 'obviously irrelevant' guess is not reliable for this corpus. Verified fix/approach: benchmarks/token-ab/gitlog-gate-task.mjs. Relevant to ticket 17's antagonistic-recall benchmark and the map's 'confidently-wrong retrieval' fog item — the shipped lexical gate is much looser in practice than 'topically relevant' for a repo whose commits are about itself.

---
id: 3afb627d-85e1-4997-9b1e-ce328d732dab
createdAt: 2026-08-12T01:48:01.088Z
importance: 4
tags:
  - failure-fix
  - drift
  - adr
taskId: null
---
Fix for real .neuron/architecture.md pollution, recurrence of the 2026-08-08 class of bug: while wrapping a plain 'neuron memory add --category history' call with neuron exec during a wayfinder session, the wrapper's own drift-detection auto-rescan ('Architectural drift detected (264 change(s))') silently overwrote the real architecture card with a scan of a project named 'issues' and 0 modules, deleting 406 of 411 lines. Root cause not yet isolated -- neuron.yaml's scan config has no explicit roots/include narrowing (just enabled: true, depth: 3), and no package.json named 'issues' exists anywhere in the repo, so the resolved project root for that particular rescan is still unknown; the repo has multiple .scratch/*/issues/ directories (bare markdown ticket dirs, no package.json) that are a plausible but unconfirmed culprit if some code path derives a project name from a directory basename rather than package.json. Caught before commit by treating a large unexplained .neuron/ diff as a tripwire (git diff --stat .neuron/architecture.md showed 406 deletions for 5 insertions) per the existing 2026-08-08 learning's own rule, not by any tooling catching it automatically. Recovery: git show HEAD:.neuron/architecture.md was clean (the prior commit's own scan was correct), so 'git checkout HEAD -- .neuron/architecture.md' fully restored it with zero manual reconstruction needed, unlike the 2026-08-08 incident which required hand-reappending legitimate new entries. This is the second confirmed live instance of neuron exec's own auto-rescan silently corrupting its own real project's memory store -- worth a dedicated investigation ticket to find the actual project-root resolution bug rather than continuing to catch it by tripwire.

---
id: 1b518353-4214-4fb6-96c3-a84ecacc200b
createdAt: 2026-08-12T01:57:08.912Z
importance: 4
tags:
  - md-storage
  - adr
  - failure-fix
taskId: null
---
Fix for silent concurrent-write data loss in MdStorageAdapter: two racing neuron memory add calls (separate processes or same-process Promise.all) each read a category's .md file before either writes, so whichever atomicWriteFile/rename lands last silently discards the other's change while both callers still see status: created. Root cause was an unlocked read-modify-write cycle in writeEntry/updateEntry/deleteEntry. Fixed by wrapping each method's whole cycle in a per-category fs.mkdirSync-based lock (src/storage/mdStorageAdapter.ts, MdStorageAdapter.withCategoryLock/acquireLock) — mkdir is atomic at the OS level so it serializes both cross-process and same-process racers with no new dependency, and a lock older than 30s is treated as a crashed holder's and stolen rather than deadlocking forever. Layered in a read-back-and-byte-compare verifyWrite() after every write regardless, so any other way the invariant breaks throws loudly instead of reporting false success. Edge case: tests must fire genuine Promise.all concurrency, not sequential awaits, to actually reproduce the race — verified by reverting just the fix file and confirming the new tests fail with real data loss before restoring it.

---
id: 9dcfb3bc-1dc8-4d60-a5b5-a2be1acd372e
createdAt: 2026-08-12T03:41:03.202Z
importance: 4
tags:
  - failure-fix
  - adr
  - rc2
taskId: null
---
Adding a new always-injecting LifecyclePoint (pre-command, ticket 22 neuron-2.4.0) silently corrupted init.ts's recall-fidelity report (resolveHarnessFidelity/buildHarnessFidelityReport), which computed wired-ness by filtering the full CapabilityMap for injects===true. Root cause: those functions conflate 'every injecting point' with 'recall,' an assumption that held while LifecyclePoint had only session-start/pre-prompt/context-reset but breaks the moment a fourth, differently-purposed injecting point (pre-command, not part of recall) is added — an upgraded-but-not-re-init'd project would report recall as newly un-wired purely because the new point wasn't installed yet, even though recall itself never changed. Fix: scope those two functions to a new RECALL_LIFECYCLE_POINTS constant (session-start/pre-prompt/context-reset) instead of the raw LIFECYCLE_POINTS/full capability map — e.g. const RECALL_LIFECYCLE_POINTS: readonly LifecyclePoint[] = ['session-start', 'pre-prompt', 'context-reset']; then filter against that instead of LIFECYCLE_POINTS. Any future LifecyclePoint addition that isn't a recall mechanism (as pre-command wasn't) needs the same audit of every LIFECYCLE_POINTS.filter(injects===true)-shaped consumer, not just the adapters' own capability() methods.

---
id: fd5a1413-a593-4cfb-924a-36535e47edf4
createdAt: 2026-08-12T16:16:43.749Z
importance: 4
tags:
  - 2.2.0
  - rc2
  - wayfinder
taskId: null
---
Fix for a blocked neuron.yaml field declaration: wayfinder ticket 25 (neuron-2.4.0) tried to declare a tickets category field named 'type' per ADR 0018's literal wording, but validateDeclaredFields (src/config/neuronYaml.ts) hard-errors with 'would become the flag --type, which collides with a reserved built-in flag' because --type is already in RESERVED_FLAG_NAMES. Root cause: ADR 0018 was written without cross-checking the field name against the existing CLI flag vocabulary. Resolution: renamed the declared field to 'kind' (same enum values: research/prototype/grilling/task), documented the rename inline in neuron.yaml and in docs/agents/issue-tracker.md so it doesn't read as unexplained drift from the ADR text. Edge case: any future declared-field name should be checked against RESERVED_FLAG_NAMES and RESERVED_COLUMN_NAMES in neuronYaml.ts before it's written into an ADR, not after.

---
id: 4751843e-629b-4eb7-aa85-c55b5e43adc1
createdAt: 2026-08-12T23:39:13.158Z
importance: 4
tags:
  - drift
  - failure-fix
  - release
taskId: null
---
Fix for autoRescanIfDriftDetected silently overwriting the wrong project's architecture card (neuron-2.4.0 ticket 30): running a wrapped command (neuron exec / memory query) from a project-marker-less subdirectory (any bare .scratch/<effort>/issues/ dir qualifies) computed the scan root as literal process.cwd() while the NeuronMemory instance writing the result was opened via NeuronMemory.open()'s own separate upward-walking package.json/.git resolution -- the two silently diverged, so a degenerate 0-module scan of the subdirectory got ingested into the real project's store. Confirmed live twice on this repo's own store before the fix (232 and 406 lines of the real architecture card destroyed). Root cause: two independent, textually-duplicated implementations of project-root discovery (src/index.ts and src/commands/utils.ts) plus several call sites (autoRescanIfDriftDetected, getArchitecturalDrift, neuron scan's own handleScanCommand, neuron status's drift check) that re-derived the root from process.cwd() instead of reusing NeuronMemory's already-resolved one. Fixed by deduplicating findProjectRoot into src/shared/projectRoot.ts, adding NeuronMemory.getProjectRoot(), and defaulting every one of those call sites' projectRoot parameter to memory.getProjectRoot() instead of process.cwd() -- e.g. 'projectRoot: string = memory.getProjectRoot()' in src/scanner/diff.ts. Edge case: when the CLI cwd has no package.json/.git anywhere in its ancestry, findProjectRoot's existing fallback (return the literal start directory) is intentionally kept rather than adding a new refuse-to-scan mode -- introducing a second policy for scanning specifically would have re-created a smaller version of the same divergence bug.

---
id: cc5f1a20-e938-4594-8456-10341c63812d
createdAt: 2026-08-13T12:55:43.484Z
importance: 4
tags:
  - failure-fix
  - exec
  - release
taskId: null
---
Fix for benchmarks/token-ab/run.mjs and run-gitlog-ab.mjs silently overwriting committed live-run results: verifying neuron-2.4.0 ticket 36's new CI workflow by actually running the four dry-run scripts locally clobbered two tracked results.json files (10-counterfactual-token-ab, 14-git-log-hook-vs-agent-log-ab) with dry-run placeholder data and no backup. Root cause: both scripts' OUT_DIR was keyed only on an optional --out= override, never on --dry-run vs live, the exact bug class a prior session had already found and fixed in their sibling run-swebench-ab.mjs (see its own code comment) but never back-ported to these two. Fix: mirror run-swebench-ab.mjs's pattern in both files -- derive OUT_NAME from --out= or the existing default, then set OUT_DIR to `${OUT_NAME}-dry-run` whenever DRY_RUN is true, so a dry run can never land on a live run's path. Edge case: this only matters for a real dev working tree with committed results -- a CI runner's checkout is ephemeral and discarded, so the same collision there is harmless, but any local smoke-test of these scripts should still 'git status' the benchmarks/ dir immediately after running them.

---
id: 220d58c8-1d7d-40e6-a84f-5e83216a6ad3
createdAt: 2026-08-13T13:09:24.434Z
importance: 4
tags:
  - failure-fix
  - architecture
  - deep
taskId: null
---
Fix for e2e tests that appear to still reproduce a src/ bug fix: test/e2e/concurrency-stress.test.ts's worker (test/e2e/workers/contention-worker.mjs) imports NeuronMemory from '../../../dist/index.js', not src/ — so editing src/index.ts or src/config/neuronYaml.ts has zero effect on that test until 'npm run build' regenerates dist/. Verified live on ticket 39 (neuron-2.4.0): a fix to findWritableConfigPath in src/config/neuronYaml.ts still let the Pillar 8 stress test mutate this repo's real root neuron.yaml on the first post-fix run, because dist/ was stale; identical run after 'npm run build' left neuron.yaml untouched. Same stale-binary trap already documented for the globally-linked 'neuron' CLI, now confirmed for any e2e test that imports compiled dist/ output directly instead of src/ — always rebuild before trusting an e2e-level repro of a src/ fix, and check with 'grep -n "from .*dist/" test/e2e/**/*.mjs' if a fix appears not to take effect.

---
id: eadf3fb7-bb2a-4a1c-b717-baea3b788407
createdAt: 2026-08-13T13:58:41.969Z
importance: 4
tags:
  - md-storage
  - failure-fix
  - adr
taskId: null
---
Fix for 'Malformed YAML frontmatter' hard-erroring MdStorageAdapter reads on entries whose content contains a fenced code block sandwiched between two stray '---' horizontal rules: parseMarkdownDetailed's two-pointer delimiter-pairing classifier (added for neuron-2.3.0 ticket 38, to survive a single stray '---') used a bare regex test for 'any line with a colon' to decide a candidate block was real frontmatter, and a fenced TypeScript/YAML code example's lines (id: string;, scope: string;) satisfy that test just as well as real frontmatter does, so the block got queued for a real YAML parse and threw on the fence syntax, corrupting the whole category file read. Root-caused via 'entry N of M' in the thrown error plus manual trace of the two-pointer pairing logic in src/storage/mdStorageAdapter.ts. Fix: reject any candidate block containing a markdown code fence line (/^```/m) in addition to the existing colon check — real frontmatter is never fenced code, so this preserves the two pre-existing malformed-YAML hard-fail tests (35-06, R1-T2-02) while rejecting the false positive; added regression test 40-01 with a fenced TS interface between two stray dividers. Edge case: this only surfaces once BOTH a stray '---' pair AND fenced code with colon-shaped lines land in the same category file next to another entry — invisible at small scale, guaranteed at scale once real multi-section ticket bodies (common in a wayfinder-style tracker) get migrated into md storage.
