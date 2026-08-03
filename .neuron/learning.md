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
id: 19367ee1-8640-4591-979d-e11b9debe2d3
createdAt: 2026-07-29T12:17:45.292Z
importance: 4
tags:
  - md-storage
  - test
taskId: null
---
Markdown

---
id: 567edbf1-6ca0-47ed-aa03-db312deea40d
createdAt: 2026-07-29T12:38:26.883Z
importance: 4
tags:
  - vitest
  - test
taskId: null
---
Vitest test runner requires --runInBand

---
id: 4a7734c5-5eba-4f2b-b751-23105db380cb
createdAt: 2026-07-29T12:38:27.706Z
importance: 3
tags:
  - test
  - tdd
taskId: null
---
Always test first

---
id: 3f4f7380-b8fe-428b-b359-531f83294e87
createdAt: 2026-07-29T12:38:40.595Z
importance: 5
tags:
  - design
taskId: null
---
Important design rule

---
id: 2443cd4e-96b6-4442-9fda-7b862383d15d
createdAt: 2026-07-29T12:38:41.604Z
importance: 5
tags:
  - updated
taskId: null
---
Updated learning content

---
id: f29bdaa4-c022-44fb-8b08-8ffde4cf2f34
createdAt: 2026-07-29T12:38:49.871Z
importance: 4
tags:
  - failure-fix
  - build
taskId: null
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
id: 80c47466-6a0e-4e81-83d6-53c417cd9363
createdAt: 2026-07-28T01:29:20.487Z
importance: 4
tags:
  - failure-fix
  - cli
  - macOS
taskId: null
---
Fix

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
id: 67955238-e019-4a65-8cba-1b6371ec69c7
createdAt: 2026-07-29T04:25:59.891Z
importance: 4
tags:
  - failure-fix
  - md-storage
  - typescript
taskId: null
---
Fixed

---
id: ddb83446-656f-4858-874e-d1015801ef6d
createdAt: 2026-07-29T04:26:36.463Z
importance: 4
tags:
  - failure-fix
  - build
taskId: null
---
Fix

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
id: 1ab69d96-c0f6-49a3-9a22-017318a47090
createdAt: 2026-07-29T04:29:44.789Z
importance: 5
tags:
  - failure-fix
  - md-storage
  - testing
taskId: null
---
Fix

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
id: 875ff5bb-ee54-4202-a825-f4c023b3e980
createdAt: 2026-07-31T19:06:45.310Z
importance: 4
tags:
  - failure-fix
  - scan
  - onnx
  - chatml
taskId: null
---
Fix

---
id: fe74ff30-fbb5-473d-9caf-12950b69b1f8
createdAt: 2026-07-31T19:36:00.664Z
importance: 5
tags:
  - architecture
  - ingest
  - scan
taskId: null
---
Implemented

---
id: ad6c5350-9744-498d-89b4-964f14bce2ea
createdAt: 2026-07-31T19:36:49.112Z
importance: 5
tags:
  - documentation
  - convention
  - rule
taskId: null
---
Always

---
id: a41b1f87-72ac-485a-a582-a6f39254500e
createdAt: 2026-07-31T19:41:17.693Z
importance: 4
tags:
  - config
  - scan
  - yaml
taskId: null
---
When

---
id: 56700784-48e7-445e-bff0-c0b890e0650e
createdAt: 2026-07-31T19:44:39.949Z
importance: 4
tags:
  - failure-fix
  - scan
  - ingest
taskId: null
---
Fix

---
id: a5fc5c12-57e6-40e9-8d95-e6ba8d416f99
createdAt: 2026-07-31T19:56:56.031Z
importance: 5
tags:
  - skill
  - user-interaction
  - neuron-memory
taskId: null
---
Updated

---
id: 8f8e2c82-abca-4bd7-9a66-18e0ae5aec53
createdAt: 2026-07-31T20:01:03.236Z
importance: 5
tags:
  - skill
  - architecture-scan
  - neuron-memory
taskId: null
---
Updated

---
id: edcd900b-c295-4a3f-938f-cf789f2dbed4
createdAt: 2026-07-31T20:07:08.385Z
importance: 5
tags:
  - config
  - scan
  - architecture
  - neuron-memory
taskId: null
---
Configured

---
id: 57b4493b-5ff5-4723-9376-5dc067c39bb0
createdAt: 2026-07-31T20:19:13.921Z
importance: 5
tags:
  - scan
  - ingest
  - md-storage
  - upsert
taskId: null
---
Implemented

---
id: 16b34627-0cf4-482c-a57c-07132a325172
createdAt: 2026-07-31T20:25:34.471Z
importance: 5
tags:
  - scan
  - drift
  - auto-rescan
taskId: null
---
Configured

---
id: aeb4c3dc-fef2-459a-b4ab-b746e1161b56
createdAt: 2026-07-31T20:28:04.687Z
importance: 5
tags:
  - scan
  - drift
  - learn-query
taskId: null
---
Updated

---
id: 96a54886-5f0c-4cb1-b181-604235b97dcf
createdAt: 2026-07-31T20:30:34.934Z
importance: 5
tags:
  - cli
  - deprecation
  - memory
taskId: null
---
Folded

---
id: cecf003f-f2ee-4a68-9fd4-e3be2c1bec28
createdAt: 2026-07-31T20:33:49.140Z
importance: 5
tags:
  - scan
  - config
  - baseline
taskId: null
---
When

---
id: c3353c47-4544-4f9f-96bf-275e6077d32b
createdAt: 2026-07-31T20:36:32.088Z
importance: 5
tags:
  - summarizer
  - qwen
  - cjk-filter
taskId: null
---
When

---
id: fc8faf48-8d84-4ac5-ac98-3805d3b71737
createdAt: 2026-07-31T20:48:59.059Z
importance: 5
tags:
  - e2e
  - benchmark
  - scorecard
taskId: null
---
Established

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
