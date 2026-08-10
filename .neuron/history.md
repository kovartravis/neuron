# Category: history

---
id: 9a0c7899-8641-454c-9460-7626d641b084
createdAt: 2026-07-24T12:46:16.499Z
importance: 3
tags:
  - bugfix
  - termux
taskId: null
---
Fixed neuron cross-platform database and embedder support on Termux

---
id: e8926cdb-4940-4cf6-a339-cdceee52f2de
createdAt: 2026-07-24T12:51:21.896Z
importance: 3
tags:
  - termux
  - sqlite
  - bugfix
taskId: null
---
Fixed neuron cross-platform database and embedder support on Termux via node:sqlite fallback

---
id: 9be6cfaf-281b-4d2d-97e9-b5be6d321ca7
createdAt: 2026-07-25T02:19:31.374Z
importance: 3
tags:
  - test
  - sqlite
  - termux
taskId: null
---
Verified full test suite passes with 28/28 tests green, including node:sqlite cross-platform fallback and isolated SQLite tests

---
id: 4b2407e9-5c14-4132-8334-ceee9764bb1b
createdAt: 2026-07-25T02:51:36.914Z
importance: 3
tags:
  - issue-tracker
  - cleanup
  - neuron
taskId: null
---
Logged issue 09 (Pre-Command Memory Lookup) and issue 10 (Importance Prototype) in local issue tracker; cleaned codebase

---
id: 6ef6cdd5-60e0-466e-9eab-9b944ec8d283
createdAt: 2026-07-25T02:59:10.058Z
importance: 3
tags:
  - refactoring
  - models
  - architecture
taskId: null
---
Refactored src/index.ts models into src/models/ directory and database helpers into src/db.ts

---
id: 1f686935-3ea9-4fd2-bcc9-b1bfc7b354bc
createdAt: 2026-07-25T03:04:18.217Z
importance: 3
tags:
  - refactoring
  - components
  - architecture
taskId: null
---
Renamed src/models to src/components directory and updated index imports

---
id: 587c5c39-ef40-4537-bb19-c252bd911245
createdAt: 2026-07-25T03:13:50.199Z
importance: 3
tags:
  - testing
  - components
  - vitest
taskId: null
---
Created dedicated unit test files for each component in src/components and src/db.ts; 37/37 tests passing

---
id: 10aef88c-d6ea-44c8-9f54-f21d7d64561d
createdAt: 2026-07-28T02:21:45.904Z
importance: 3
tags:
  - task-queue
  - triage
taskId: null
---
Queried the memory store and task queue under .scratch/ to identify upcoming tickets. Identified issue #01 (.neuronrc Configuration Schema & Parser under md-file-management) and issue #18 (Memory Import/Export & Git Sync under agent-memory-cli) as the next unblocked items in the task queue.

---
id: 4b3daa4b-e755-4e13-a630-8f4f1cc23866
createdAt: 2026-07-28T02:38:36.621Z
importance: 3
tags:
  - git
  - stash
  - pull
taskId: null
---
Fetched

---
id: cd1cd4b2-1138-43ed-b677-2925c3d35109
createdAt: 2026-07-29T12:14:25.613Z
importance: 3
tags:
  - git
  - merge
  - pull
  - stash
taskId: null
---
Stashed local changes, pulled latest commits from origin/main, resolved merge conflicts in package.json and package-lock.json for Termux compatibility, popped stash, and verified TypeScript build.

---
id: b74da757-9789-487e-b690-0f5ae0f7b71c
createdAt: 2026-07-29T12:38:28.013Z
importance: 3
tags:
  - cli
  - test
taskId: task-123
---
Wrote test for CLI

---
id: 1d4c0547-0847-48a2-ae95-5940c2488ebd
createdAt: 2026-07-29T12:38:42.473Z
importance: 1
tags: []
taskId: null
---
Old entry

---
id: 70bed94f-c336-4152-88d5-0c84f9969aca
createdAt: 2026-07-29T12:38:45.130Z
importance: 4
tags:
  - CI
taskId: null
---
Crucial pipeline update

---
id: f81e6e39-975e-4918-ad7f-798784f3ace7
createdAt: 2026-07-29T12:38:46.767Z
importance: 3
tags: []
taskId: null
---
Old default entry

---
id: 92861ee5-562f-4e7f-b8ef-22a997c4e5c7
createdAt: 2026-07-29T12:38:49.691Z
importance: 4
tags: []
taskId: null
---
Old important entry

---
id: 7b5ab054-6356-4ac8-b8ac-8b6b215bbd69
createdAt: 2026-07-11T18:54:40.807Z
importance: 3
tags:
  - setup
  - publish
taskId: null
---
Successfully set up, built, tested, and published the @kovartravis/neuron package to npm

---
id: 99fc9e12-ed6b-4741-a259-0c1f03df32c1
createdAt: 2026-07-11T19:02:07.473Z
importance: 3
tags:
  - setup
  - publish
  - cli
taskId: null
---
Implemented, tested, and published 'neuron init' command for auto-scaffolding agent rules

---
id: 6104d10a-3dd1-4b73-a30f-d92b1be72314
createdAt: 2026-07-11T19:02:45.275Z
importance: 3
tags:
  - setup
  - tdd
  - db
  - vector
  - publish
taskId: null
---
Built, tested, and published the @kovartravis/neuron agent memory CLI, featuring local SQLite migrations, unit-normalised vector dot-product search via BGE-small, cursor-based consolidation, and project init bootstrapping

---
id: 0854af70-be22-424c-af3d-df17ed71230a
createdAt: 2026-07-11T19:08:04.159Z
importance: 3
tags:
  - git
  - github
  - publish
taskId: null
---
Created git repository and published neuron codebase to GitHub under kovartravis/neuron using gh CLI

---
id: 17008d3e-f5a8-4cca-b3ee-38c432daf1e2
createdAt: 2026-07-11T19:09:07.874Z
importance: 3
tags:
  - documentation
  - github
taskId: null
---
Added comprehensive, user-friendly README.md using the beads project as an example, and pushed updates to GitHub

---
id: 66172d24-c3d2-4f03-ab50-e0f0b0e233d9
createdAt: 2026-07-11T19:11:11.009Z
importance: 3
tags:
  - documentation
  - github
taskId: null
---
Rewrote README to match Steve Yegge's beads project style, format, and structure

---
id: f4379b5f-e5ed-4c08-8850-02dd717bc7b3
createdAt: 2026-07-11T19:12:22.819Z
importance: 3
tags:
  - license
  - github
taskId: null
---
Added standard MIT License file and pushed to GitHub

---
id: 78ee54a6-e1ca-412b-9226-ec4e446c0b3b
createdAt: 2026-07-12T21:24:36.545Z
importance: 3
tags:
  - planning
  - wayfinder
taskId: null
---
Created wayfinding map and 4 open tickets for SaaS features (importance ranking, hybrid retrieval, history decay, team mode, database adapter, and scoped auto-promotion)

---
id: c336bef4-fb6b-4209-982c-f3bd362e3d3a
createdAt: 2026-07-15T03:17:26.172Z
importance: 3
tags:
  - git
  - pull
taskId: null
---
Pulled the latest changes from GitHub, fast-forwarding to main branch.

---
id: 19b5a452-8c42-4ea6-88f3-5915a230d20b
createdAt: 2026-07-15T03:20:07.872Z
importance: 3
tags:
  - release
  - npm
  - git
taskId: null
---
Bumped version to 1.1.1, published to npm registry, and pushed git commit and tag v1.1.1 to GitHub.

---
id: e4500466-6f0b-45b0-b69a-31b01815fc6e
createdAt: 2026-07-15T03:21:01.307Z
importance: 3
tags:
  - config
  - npm
  - metadata
taskId: null
---
Updated package.json to include repository, homepage, and bugs metadata, and explicitly included README.md and LICENSE in the files array; bumped version to 1.1.2 and published to npm.

---
id: 2d7ac47a-20f1-4496-a8c7-77a7d2331100
createdAt: 2026-07-15T03:25:09.318Z
importance: 3
tags:
  - release
  - npm
  - public
taskId: null
---
Bumped version to 1.1.3 and published to npm with public access (--access public), and pushed commits and tag v1.1.3 to GitHub.

---
id: 49f21081-12da-471f-b529-6e715910e52a
createdAt: 2026-07-15T03:44:16.603Z
importance: 3
tags:
  - spec
  - init
  - harness
  - neuron-memory
taskId: null
---
Grilled, designed, and published spec 06-init-harness-integration: neuron init multi-harness skill scaffolding with auto-detection and fallback.

---
id: f9851e32-b105-4455-b1ef-5b029c3e5f16
createdAt: 2026-07-15T03:46:20.454Z
importance: 3
tags:
  - tickets
  - init
  - harness
  - neuron-memory
taskId: 06-init-harness-integration
---
Published tickets 07 and 08 for spec 06 (init harness integration): bundle skill file + harness auto-detection and scaffolding.

---
id: 4f0da669-1401-4453-83f6-2d5c7b95f8e9
createdAt: 2026-07-15T03:49:01.979Z
importance: 3
tags:
  - tdd
  - init
  - neuron-memory
  - release
taskId: 07-bundle-skill-and-update-block
---
Implemented ticket 07: replaced MEMORY_STORE_BLOCK with prose-only template referencing neuron-memory skill by name; added .agents/skills/ to package.json files array; updated init test. All 10 tests green.

---
id: 5f07a8c4-8a86-4777-9d7e-74afb12d5551
createdAt: 2026-07-15T03:52:10.042Z
importance: 3
tags:
  - tdd
  - init
  - harness
  - neuron-memory
taskId: 08-harness-detection-and-skill-scaffolding
---
Implemented ticket 08 via TDD: harness auto-detection + neuron-memory skill scaffolding in neuron init. 4 red-green cycles, 14 tests total, all green.

---
id: 91ca724f-a516-4c39-88b0-45d63392963f
createdAt: 2026-07-15T03:53:28.600Z
importance: 3
tags:
  - release
  - npm
  - init
  - harness
  - neuron-memory
taskId: null
---
Released v1.2.0 to npm (public): neuron init harness auto-detection, neuron-memory skill scaffolding, prose-only Memory Store block. Only neuron-memory/SKILL.md bundled in tarball.

---
id: e6725f37-e1e4-438a-816b-ff4ac9be3e34
createdAt: 2026-07-15T04:00:15.838Z
importance: 3
tags:
  - release
  - npm
  - fix
  - init
  - harness
taskId: null
---
Released v1.2.1: fixed harness detection to probe project root only (not home dir), eliminating false positives from globally-installed tools like ~/.agents/.

---
id: e10a7f24-f163-4b4b-8689-f518864d6568
createdAt: 2026-07-16T22:49:40.531Z
importance: 3
tags:
  - git
  - npm
taskId: null
---
Pulled latest commits from GitHub, bumped package version to 1.2.2, pushed commit and tag v1.2.2 to GitHub, and published @kovartravis/neuron@1.2.2 to npm

---
id: 3779bb06-93f1-48cf-ab0d-0e67fc1d0031
createdAt: 2026-07-25T19:48:43.374Z
importance: 3
tags:
  - wayfinder
  - db-schema
taskId: 05-multi-tenant-isolation
---
Deferred multi-tenant isolation ticket as wontfix (SaaS features out of scope for now)

---
id: 94618b29-7b77-4b30-a299-e450843fa0fc
createdAt: 2026-07-25T19:48:48.162Z
importance: 3
tags:
  - wayfinder
  - db-schema
taskId: 05-multi-tenant-isolation
---
Deferred multi-tenant isolation ticket as wontfix (SaaS features out of scope for now)

---
id: e393f6c3-01dc-49f1-a93a-245d0514462b
createdAt: 2026-07-25T19:56:36.042Z
importance: 3
tags:
  - cli
  - exec
  - failure-fix
taskId: 16-fix-exec-mutex-lock-crash
---
Fixed native onnxruntime-node process teardown crash in exec subcommand on macOS by pinning to version 1.20.1

---
id: eddcf8ee-38cf-41e7-93a6-ec1af23b53e3
createdAt: 2026-07-25T20:01:36.935Z
importance: 3
tags:
  - github
  - metadata
  - package-json
taskId: null
---
Populate repository topics/tags on GitHub and keywords in package.json to improve search discoverability

---
id: 09f2fdaf-fc07-491b-b3fc-a5cc6f458bb8
createdAt: 2026-07-25T20:03:55.361Z
importance: 3
tags:
  - documentation
taskId: null
---
Update README.md with developer-focused value proposition, recent CLI feature additions, and workflow guide

---
id: f11d25a3-bd6a-4a1a-a1c0-3cf3b5e68ef8
createdAt: 2026-07-25T20:06:35.037Z
importance: 3
tags:
  - documentation
  - bugfix
taskId: null
---
Fix Mermaid diagram syntax error in README.md by escaping quotes

---
id: aae2dbb4-22e5-45af-96e7-1a0a116dcca4
createdAt: 2026-07-25T20:19:19.051Z
importance: 3
tags:
  - tdd
  - hybrid-search
  - fts5
  - db-schema
taskId: 01-fts5-schema-migration-triggers
---
Implemented ticket 01-fts5-schema-migration-triggers via TDD: v4 SQLite migration adds learnings_fts and history_fts external content tables, AFTER INSERT/DELETE/UPDATE triggers, and backfill of existing records

---
id: 1cd9c654-b357-48bb-b030-239c0fa886e2
createdAt: 2026-07-26T03:02:25.698Z
importance: 3
tags:
  - tdd
  - hybrid-search
  - fts5
taskId: 02-fts-query-sanitizer-parser
---
Implemented ticket 02-fts-query-sanitizer-parser via TDD: cleanFtsQuery function tokenizes alphanumeric words and builds OR-joined FTS5 wildcard expressions, stripping punctuation and reserved chars

---
id: b7727e79-220b-419b-9991-8ffc500c8450
createdAt: 2026-07-26T03:08:23.186Z
importance: 3
tags:
  - tdd
  - hybrid-search
  - rrf
  - fts5
taskId: 03-hybrid-retrieval-rrf-engine
---
Implemented ticket 03-hybrid-retrieval-rrf-engine via TDD: rewrote query() to run FTS5 keyword search (cleanFtsQuery) and vector search in parallel, merge via RRF (k=60), normalize, and combine 75% RRF + 25% importance. Added zero-similarity guard so records with no semantic match don't get a free rank boost.

---
id: aa967d8d-9abe-42b5-b593-de4adde04c70
createdAt: 2026-07-26T03:11:00.447Z
importance: 3
tags:
  - tdd
  - hybrid-search
  - tests
taskId: 04-hybrid-search-test-suite
---
Implemented ticket 04-hybrid-search-test-suite: 4 integration tests pinning semantic ranking, importance tiebreaking, scope filtering, and cross-table (learnings+history) hybrid query behavior

---
id: 7bd114f7-92f3-43a6-bed5-87ecb14b4a73
createdAt: 2026-07-26T03:24:04.157Z
importance: 3
tags:
  - tdd
  - bge
  - embeddings
  - hybrid-search
taskId: 05-bge-query-instruction-prefix
---
Implemented ticket 05-bge-query-instruction-prefix via TDD: added embedQuery method to Embedder interface and TransformersEmbedder, prepending BGE search prefix 'Represent this sentence for searching relevant passages: ', and updated NeuronMemory.query() to use embedQuery

---
id: 8054e5d0-5b91-4dd5-aa71-caa531844206
createdAt: 2026-07-26T03:34:59.530Z
importance: 3
tags:
  - hybrid-search
  - fts5
  - rrf
  - embeddings
  - bge
  - release
taskId: v1.3.3-release
---
Completed hybrid search milestone and version bump: implemented FTS5 schema migration v4, cleanFtsQuery sanitizer, RRF hybrid search engine (k=60), integration test suite, BGE query instruction prefix (embedQuery), and bumped package to v1.3.3

---
id: 9b4c69ea-7a6b-441c-b210-bdc40ac763a2
createdAt: 2026-07-26T03:43:13.820Z
importance: 3
tags:
  - embedder
  - refactor
taskId: null
---
Removed fallback embedder in embedder.ts so pipeline initialization errors throw directly

---
id: e4fc9543-d3e4-4291-9769-a6ec1e7e2ddf
createdAt: 2026-07-26T03:44:52.004Z
importance: 3
tags:
  - models
  - refactor
taskId: null
---
Separated pure models (memory, maintenance, options) into src/models directory and updated components re-exports

---
id: faaca6cf-397d-41b1-b1d1-73d60b662726
createdAt: 2026-07-26T03:45:13.889Z
importance: 3
tags:
  - models
  - cleanup
taskId: null
---
Removed unit test files for pure models in src/models

---
id: 2a4c6513-ec82-4c8e-bcf7-b16088795e03
createdAt: 2026-07-26T03:47:09.200Z
importance: 3
tags:
  - cli
  - refactor
taskId: null
---
Modularized CLI commands (init, exec, status, learn, history) into separate files in src/commands/

---
id: bd990979-ca27-4b41-be54-a989492b4436
createdAt: 2026-07-26T03:47:36.682Z
importance: 3
tags:
  - git
  - push
taskId: null
---
Committed and pushed CLI, embedder, and models refactoring changes to GitHub

---
id: adbd4915-b7a0-4857-bc7c-ad200f7a8f21
createdAt: 2026-07-26T03:49:08.154Z
importance: 3
tags:
  - exec
  - refactor
taskId: null
---
Removed cleanCommandStr logic in exec.ts to query memory store directly with rawCommandStr

---
id: 525e70c1-7149-4f8d-b2e4-1f92b0b01b57
createdAt: 2026-07-26T03:50:37.501Z
importance: 3
tags:
  - exec
  - search
taskId: null
---
Removed kind filter from memory query in exec.ts to search both history and learnings

---
id: f11e0f59-93cb-4bdf-9abd-dd1f36800be9
createdAt: 2026-07-26T03:51:20.625Z
importance: 3
tags:
  - explanation
  - cli
taskId: null
---
Explained NEURON_MOCK_EMBEDDER environment check and score threshold in exec.ts

---
id: 485074be-6411-406d-b80a-cdf319418035
createdAt: 2026-07-26T03:52:16.206Z
importance: 3
tags:
  - exec
  - refactor
taskId: null
---
Removed NEURON_MOCK_EMBEDDER check from exec.ts and set constant threshold

---
id: f8799235-7d3c-43cf-aa9d-ee8f4dad7e4b
createdAt: 2026-07-26T03:54:01.966Z
importance: 3
tags:
  - testing
  - cli
taskId: null
---
Split monolithic cli.test.ts into command-specific test files under src/commands/

---
id: a69f24c2-1aca-4b01-ab85-42a7053ad0a4
createdAt: 2026-07-26T03:56:30.547Z
importance: 3
tags:
  - inquiry
  - explanation
taskId: null
---
Answered user inquiry regarding neuron feedback and how it influenced memory handle closing in exec.ts

---
id: da928f03-3129-47f3-9438-2949bea08e9f
createdAt: 2026-07-26T03:58:36.380Z
importance: 3
tags:
  - architecture
  - passive-memory
taskId: null
---
Provided architectural recommendations for passive background memory and history logging

---
id: 18f41fae-dbe8-4c28-bc13-cf1a0a798492
createdAt: 2026-07-26T03:59:42.647Z
importance: 3
tags:
  - subagent
  - background-observer
taskId: null
---
Defined and demonstrated background neuron-observer subagent for passive memory logging

---
id: 8ff1f30a-8597-4730-80f0-4d625cd4ed2f
createdAt: 2026-07-26T04:00:34.369Z
importance: 3
tags:
  - subagent
  - cleanup
taskId: null
---
Killed and removed subagents as requested by user

---
id: 9756c77b-dbca-4396-bd54-cfc66d7ae073
createdAt: 2026-07-26T04:05:08.237Z
importance: 3
tags:
  - refactor
  - config
taskId: null
---
Extracted agent harness configurations and detectHarnesses into src/config/harness.ts

---
id: 68dcbe4d-c33c-4652-a881-2e74cd5a6c4a
createdAt: 2026-07-26T04:08:22.209Z
importance: 3
tags:
  - config
  - harnesses
taskId: null
---
Extracted agent harness configurations, markdown file mappings, and skills directories into src/config/harnesses.json

---
id: d944c7b7-eaa4-47b4-a652-630bce2c6fbd
createdAt: 2026-07-26T04:10:40.411Z
importance: 3
tags:
  - roadmap
  - planning
taskId: null
---
Analyzed project architecture and provided strategic next steps for neuron memory store improvements

---
id: ffdc2f37-8238-4d93-a1cc-28245ba43d28
createdAt: 2026-07-26T04:13:52.367Z
importance: 3
tags:
  - tickets
  - todo
taskId: null
---
Logged Web UI dashboard, import/export, git sync, and analytics tasks as markdown tickets in .scratch issue tracker

---
id: c9c61848-645d-472b-8514-44c1f934b45a
createdAt: 2026-07-26T04:14:49.051Z
importance: 3
tags:
  - roadmap
  - ideas
taskId: null
---
Proposed strategic TODO feature ideas for neuron roadmap

---
id: 8a71b217-ce8a-420f-b801-98415323df67
createdAt: 2026-07-26T04:16:46.434Z
importance: 3
tags:
  - tickets
  - roadmap
taskId: null
---
Logged feature issue tickets 20-24 into .scratch issue tracker

---
id: a6a668b1-659f-488b-ae6b-fbf79b7eaf47
createdAt: 2026-07-27T00:29:30.061Z
importance: 3
tags:
  - backlog
  - issue-tracker
  - md-file-management
taskId: md-file-management
---
Added .md file management and .neuronrc configuration scope to the backlog under .scratch/md-file-management/

---
id: f8f53cda-d5eb-4e67-a453-03e1d072894a
createdAt: 2026-07-27T00:33:03.593Z
importance: 3
tags:
  - triage
  - roadmap
taskId: null
---
Queried and listed next queued up tickets across agent-memory-cli and md-file-management features

---
id: 6f747c10-be39-4357-b251-2733a96e13d0
createdAt: 2026-07-27T00:55:22.550Z
importance: 4
tags:
  - ui
  - tdd
  - ticket-17
  - web
taskId: ticket-17
---
Built ticket-17: neuron ui dashboard — TDD'd src/ui/server.ts, src/ui/html.ts, src/commands/ui.ts across 6 green tests covering S3 (GET /), S2a/b/c (/api/status, /api/learnings, /api/history), and S1 (server lifecycle). Wired into cli.ts and commands/index.ts. Full glassmorphism dark-mode dashboard with live hybrid embeddings search, view-all modals, scope/importance badges.

---
id: 501588d7-2af5-444a-a351-3bb9aec1e641
createdAt: 2026-07-27T01:02:48.372Z
importance: 3
tags:
  - git
  - ticket-17
  - ui
taskId: ticket-17
---
Pushed ticket-17 neuron ui dashboard to GitHub — commit f56f3ad on main

---
id: 9566f40d-db84-4868-99f6-af233e86d23d
createdAt: 2026-07-27T01:04:16.169Z
importance: 3
tags:
  - version-bump
taskId: null
---
Bumped package version to 1.3.5 in package.json and package-lock.json

---
id: 4d58c5bd-8c46-4866-9bf7-26812e98efe1
createdAt: 2026-07-27T01:06:08.794Z
importance: 3
tags:
  - npm
  - publish
taskId: null
---
Answered npm publish command typo issue

---
id: 4ca2db79-e3af-4400-9859-52fe35cc171c
createdAt: 2026-07-27T01:06:58.659Z
importance: 3
tags:
  - npm
  - publish
taskId: null
---
Attempted npm publish --access public; failed due to npm 401 Unauthorized / 404 (user not logged in to npm registry).

---
id: 015bb2c9-35e2-4e31-adbe-060e9c521be2
createdAt: 2026-07-27T01:10:03.564Z
importance: 3
tags:
  - memory
  - protocol
taskId: null
---
Updated memory store protocols in AGENTS.md, SKILL.md, and harness configuration to require detailed multi-sentence memory entries (3-4 sentences minimum) instead of 1-sentence summaries.

---
id: 241b19c5-a423-499e-9b6d-09980b0c2687
createdAt: 2026-07-27T01:16:39.243Z
importance: 3
tags:
  - memory
  - skill
  - neuronrc
taskId: null
---
Updated neuron-memory skill to include instructions for writing .neuronrc.yaml and configuring AGENTS.md and agents.json files with project categories while keeping neuron init for skill copying.

---
id: b712eed7-0838-49e6-bd14-5af3743f47fc
createdAt: 2026-07-27T01:29:56.893Z
importance: 3
tags:
  - memory
  - config
  - database
  - cli
taskId: null
---
Implemented neuron.yaml configuration loader, unified memories database table migration v5, neuron memory CLI command suite for N dynamic categories, onExec pull rule evaluation in neuron exec, and updated neuron-memory skill documentation.

---
id: bcbf0adf-79cf-41a9-a95b-2fa8fa5749f0
createdAt: 2026-07-27T01:30:54.887Z
importance: 3
tags:
  - readme
  - config
  - docs
taskId: null
---
Updated README.md to document neuron.yaml configuration and neuron memory CLI command suite, and removed zero-config phrasing from the main tagline.

---
id: 0e7cfe8a-19c1-4188-af90-c48ce144bfa9
createdAt: 2026-07-27T01:31:47.184Z
importance: 3
tags:
  - release
  - git
  - github
taskId: null
---
Bumped package version to 2.0.0-rc1, committed changes, tagged git release v2.0.0-rc1, and pushed commits and tags to GitHub.

---
id: d24bc9d8-4cab-438d-a692-7db9cc5c1e74
createdAt: 2026-07-27T01:33:33.635Z
importance: 3
tags:
  - readme
  - docs
  - config
taskId: null
---
Completely rewrote README.md with updated Killer Features section, new 5-step Quickstart guide, full neuron.yaml configuration specification, and generic neuron memory CLI command suite documentation.

---
id: 5fba0450-ffb8-44ee-b6ce-2e038132a9c7
createdAt: 2026-07-27T01:35:29.282Z
importance: 3
tags:
  - readme
  - skill
  - agent-first
taskId: null
---
Updated README.md quickstart section and SKILL.md setup protocol to be completely agent-first, where agents interview the user for setup options, create neuron.yaml, and configure AGENTS.md automatically.

---
id: fb1f2229-3c7c-4702-903d-84a9d882d438
createdAt: 2026-07-27T01:39:31.979Z
importance: 3
tags:
  - memory
  - config
  - setup
taskId: null
---
Configured project memory store via neuron.yaml with learning, history, and decisions categories, established pull rules for default search and shell exec triggers, verified AGENTS.md protocol compliance, and validated neuron exec lookup functionality.

---
id: 920c38a1-4a8b-4942-aea0-1b18577e1fee
createdAt: 2026-07-27T01:40:44.912Z
importance: 3
tags:
  - memory
  - config
  - agents-md
taskId: null
---
Updated AGENTS.md to explicitly document the memory categories configured in neuron.yaml (learning, history, decisions) and added CLI examples for querying and adding entries to custom categories.

---
id: 6d1f4a93-5c60-43dc-9a04-6c1d93522ca4
createdAt: 2026-07-27T01:41:07.114Z
importance: 3
tags:
  - memory
  - skill
  - config
taskId: null
---
Updated neuron-memory skill SKILL.md to explicitly mandate aligning AGENTS.md with neuron.yaml during setup, requiring documented categories and custom category CLI query/add command examples.

---
id: 7da9354d-0821-4ee7-9472-bc590a2d4043
createdAt: 2026-07-27T01:41:35.760Z
importance: 3
tags:
  - memory
  - config
  - explanation
taskId: null
---
Answered user question explaining that neuron.yaml is dynamically loaded and executed by the neuron CLI (specifically during neuron exec and memory queries to evaluate pull rules and categories).

---
id: b92fbe1d-c2a6-4f5e-83dc-6d6b96a1de14
createdAt: 2026-07-27T01:45:51.843Z
importance: 3
tags:
  - memory
  - ui
  - release
taskId: ui-n-categories
---
Enacted dynamic category dashboard feature (v2.0.0-rc2). Updated src/ui/server.ts with /api/categories and /api/memories endpoints, updated src/ui/html.ts with dynamic category tabs, global search bar, and reusable modal, added domain documentation in CONTEXT.md and ADR 0002, bumped version to 2.0.0-rc2, passed all 61 vitest unit tests, and pushed commit and tag v2.0.0-rc2 to GitHub.

---
id: 704f1653-8c1e-45ab-9a68-58301cd8c2b1
createdAt: 2026-07-27T01:46:41.312Z
importance: 3
tags:
  - docs
  - readme
  - ui
taskId: ui-readme
---
Updated README.md with a dedicated Local Dashboard UI section and UI screenshot asset in docs/images/dashboard.png, updated package.json files array to include docs/images/, and pushed commits and tag v2.0.0-rc2 to GitHub.

---
id: 2690c334-f500-4fa9-924a-fb238dba81d3
createdAt: 2026-07-28T01:29:24.410Z
importance: 3
tags:
  - benchmark
  - integration
taskId: null
---
Cloned

---
id: 7bd5942e-d91e-415d-af36-bf9996c8c831
createdAt: 2026-07-28T01:49:32.389Z
importance: 3
tags:
  - benchmark
  - gemini
  - eval
taskId: null
---
Executed

---
id: 526fb22a-61a4-43ef-8d1f-50ae06ab6ccb
createdAt: 2026-07-28T01:58:01.991Z
importance: 3
tags:
  - benchmark
  - omb
  - full-run
taskId: null
---
Launched full 589-query Agent Memory Benchmark evaluation for Neuron on personamem/32k dataset using Gemini 2.5 Flash Lite under free tier rate limits. The run executes in the background, automatically managing 15 RPM backoff pauses, and will auto-compress and update results-manifest.json upon completion.

---
id: d99e1c58-0840-410f-b0a6-16ae07cbe7b6
createdAt: 2026-07-28T02:06:00.427Z
importance: 3
tags:
  - benchmark
  - omb
  - full-run
taskId: null
---
Launched full 589-query Agent Memory Benchmark evaluation for Neuron on personamem/32k dataset using Gemini 2.5 Flash Lite under free tier rate limits. The run executes in the background, automatically managing 15 RPM backoff pauses, and will auto-compress and update results-manifest.json upon completion.

---
id: fce52bd0-8889-4ae1-b8f9-2474de92b088
createdAt: 2026-07-28T02:06:45.175Z
importance: 3
tags:
  - benchmark
  - omb
  - full-run
taskId: null
---
Launched full 589-query Agent Memory Benchmark evaluation for Neuron on personamem/32k dataset using Gemini 2.5 Flash Lite under free tier rate limits. The run executes in the background, automatically managing 15 RPM backoff pauses, and will auto-compress and update results-manifest.json upon completion.

---
id: 1df096af-db4a-4808-ad5a-a2bb2409a5e8
createdAt: 2026-07-28T02:06:49.120Z
importance: 3
tags:
  - benchmark
  - omb
  - full-run
taskId: null
---
Launched full 589-query Agent Memory Benchmark evaluation for Neuron on personamem/32k dataset using Gemini 2.5 Flash Lite under free tier rate limits. The run executes in the background, automatically managing 15 RPM backoff pauses, and will auto-compress and update results-manifest.json upon completion.

---
id: 43c72d1b-4a1e-4950-ae40-85479a1fcc41
createdAt: 2026-07-28T02:10:24.107Z
importance: 3
tags:
  - benchmark
  - omb
  - full-run
taskId: null
---
Launched full 589-query Agent Memory Benchmark evaluation for Neuron on personamem/32k dataset using Gemini 2.5 Flash Lite under free tier rate limits. The run executes in the background, automatically managing 15 RPM backoff pauses, and will auto-compress and update results-manifest.json upon completion.

---
id: 4fb68838-34a4-4776-a508-1b00e5d2e656
createdAt: 2026-07-28T02:29:53.660Z
importance: 3
tags:
  - benchmark
  - gemini-2.5-flash
  - overnight
taskId: null
---
Updated benchmark configuration to use gemini-2.5-flash which provides 1,500 RPD daily free quota (resolving the 20 RPD cap on gemini-2.5-flash-lite). Verified model API calls with HTTP 200 OK responses and launched the full 589-query benchmark run in the background via npm run bench:full for overnight execution.

---
id: ae3031b4-10a6-43c2-b6a6-af6837ef0897
createdAt: 2026-07-28T02:31:04.064Z
importance: 3
tags:
  - git
  - gitignore
  - push
taskId: null
---
Added .env and .env.* patterns to .gitignore to prevent local environment configuration files from being tracked in git. Also added benchmarks/agent-memory-benchmark/ to .gitignore to prevent embedded repository conflicts. Verified the changes by running all unit tests via npm test, ensuring all 61 tests pass cleanly. Committed all staged changes and pushed the latest main branch to GitHub.

---
id: bfd60a25-c585-41bb-b1b1-365516a91259
createdAt: 2026-07-28T02:31:33.268Z
importance: 3
tags:
  - benchmark
  - gemini-2.5-flash
  - overnight
taskId: null
---
Updated benchmark configuration to use gemini-2.5-flash which provides 1,500 RPD daily free quota (resolving the 20 RPD cap on gemini-2.5-flash-lite). Verified model API calls with HTTP 200 OK responses and launched the full 589-query benchmark run in the background via npm run bench:full for overnight execution.

---
id: 2de3c6e1-5272-4ebd-8e72-d5860a02c39e
createdAt: 2026-07-28T03:19:46.122Z
importance: 3
tags:
  - benchmark
  - gemini-2.5-flash
  - overnight
taskId: null
---
Updated benchmark configuration to use gemini-2.5-flash which provides 1,500 RPD daily free quota (resolving the 20 RPD cap on gemini-2.5-flash-lite). Verified model API calls with HTTP 200 OK responses and launched the full 589-query benchmark run in the background via npm run bench:full for overnight execution.

---
id: ff30abe7-0208-4ac3-aa6b-5019cbdf7b91
createdAt: 2026-07-28T18:04:37.421Z
importance: 3
tags:
  - benchmark
  - gemini-2.5-flash
  - overnight
taskId: null
---
Updated benchmark configuration to use gemini-2.5-flash which provides 1,500 RPD daily free quota (resolving the 20 RPD cap on gemini-2.5-flash-lite). Verified model API calls with HTTP 200 OK responses and launched the full 589-query benchmark run in the background via npm run bench:full for overnight execution.

---
id: 9c76e787-4f01-4d5f-9c99-bbd91046fe15
createdAt: 2026-07-28T18:05:05.306Z
importance: 3
tags:
  - benchmark
  - gemini-2.5-flash
  - overnight
taskId: null
---
Updated benchmark configuration to use gemini-2.5-flash which provides 1,500 RPD daily free quota (resolving the 20 RPD cap on gemini-2.5-flash-lite). Verified model API calls with HTTP 200 OK responses and launched the full 589-query benchmark run in the background via npm run bench:full for overnight execution.

---
id: 594d7b0e-b894-4efd-9d62-67c200a3a20b
createdAt: 2026-07-28T18:05:40.580Z
importance: 3
tags:
  - benchmark
  - gemini-2.5-flash
  - overnight
taskId: null
---
Updated benchmark configuration to use gemini-2.5-flash which provides 1,500 RPD daily free quota (resolving the 20 RPD cap on gemini-2.5-flash-lite). Verified model API calls with HTTP 200 OK responses and launched the full 589-query benchmark run in the background via npm run bench:full for overnight execution.

---
id: 51e98b4a-5fed-4807-9913-c5e4d90d851d
createdAt: 2026-07-28T18:07:55.024Z
importance: 3
tags:
  - benchmark
  - gemini-2.5-flash
  - overnight
taskId: null
---
Updated benchmark configuration to use gemini-2.5-flash which provides 1,500 RPD daily free quota (resolving the 20 RPD cap on gemini-2.5-flash-lite). Verified model API calls with HTTP 200 OK responses and launched the full 589-query benchmark run in the background via npm run bench:full for overnight execution.

---
id: 95893688-000c-4580-9574-58f4a6064e6c
createdAt: 2026-07-28T18:17:57.560Z
importance: 3
tags:
  - benchmark
  - gemini-2.5-flash
  - overnight
taskId: null
---
Updated benchmark configuration to use gemini-2.5-flash which provides 1,500 RPD daily free quota (resolving the 20 RPD cap on gemini-2.5-flash-lite). Verified model API calls with HTTP 200 OK responses and launched the full 589-query benchmark run in the background via npm run bench:full for overnight execution.

---
id: d0190493-718e-411e-b3bc-2ff436a66831
createdAt: 2026-07-28T18:29:50.913Z
importance: 3
tags:
  - benchmark
  - gemini-2.5-flash
  - overnight
taskId: null
---
Updated benchmark configuration to use gemini-2.5-flash which provides 1,500 RPD daily free quota (resolving the 20 RPD cap on gemini-2.5-flash-lite). Verified model API calls with HTTP 200 OK responses and launched the full 589-query benchmark run in the background via npm run bench:full for overnight execution.

---
id: e71866b5-7576-4eb2-886a-d436a7aa256b
createdAt: 2026-07-28T18:30:15.770Z
importance: 3
tags:
  - benchmark
  - gemini-2.5-flash
  - overnight
taskId: null
---
Updated benchmark configuration to use gemini-2.5-flash which provides 1,500 RPD daily free quota (resolving the 20 RPD cap on gemini-2.5-flash-lite). Verified model API calls with HTTP 200 OK responses and launched the full 589-query benchmark run in the background via npm run bench:full for overnight execution.

---
id: 75b5f4f8-86ff-4093-a3ba-7e9e38fec795
createdAt: 2026-07-28T18:49:49.013Z
importance: 3
tags:
  - benchmark
  - gemini-2.5-flash
  - overnight
taskId: null
---
Updated benchmark configuration to use gemini-2.5-flash which provides 1,500 RPD daily free quota (resolving the 20 RPD cap on gemini-2.5-flash-lite). Verified model API calls with HTTP 200 OK responses and launched the full 589-query benchmark run in the background via npm run bench:full for overnight execution.

---
id: 08599da1-0c4a-47ee-8cee-44eb58e1c5c4
createdAt: 2026-07-28T19:50:59.831Z
importance: 3
tags:
  - benchmark
  - gemini-2.5-flash
  - overnight
taskId: null
---
Updated benchmark configuration to use gemini-2.5-flash which provides 1,500 RPD daily free quota (resolving the 20 RPD cap on gemini-2.5-flash-lite). Verified model API calls with HTTP 200 OK responses and launched the full 589-query benchmark run in the background via npm run bench:full for overnight execution.

---
id: d2a6212d-8518-4903-8cc2-e4060dd07eb3
createdAt: 2026-07-28T20:21:50.665Z
importance: 3
tags:
  - benchmark
  - gemini-2.5-flash
  - overnight
taskId: null
---
Updated benchmark configuration to use gemini-2.5-flash which provides 1,500 RPD daily free quota (resolving the 20 RPD cap on gemini-2.5-flash-lite). Verified model API calls with HTTP 200 OK responses and launched the full 589-query benchmark run in the background via npm run bench:full for overnight execution.

---
id: a44c9ebd-dd00-4f68-a579-dee1ad3c3bea
createdAt: 2026-07-28T20:22:25.406Z
importance: 3
tags:
  - benchmark
  - gemini-2.5-flash
  - overnight
taskId: null
---
Updated benchmark configuration to use gemini-2.5-flash which provides 1,500 RPD daily free quota (resolving the 20 RPD cap on gemini-2.5-flash-lite). Verified model API calls with HTTP 200 OK responses and launched the full 589-query benchmark run in the background via npm run bench:full for overnight execution.

---
id: 455f1266-88e0-4d34-815f-28f210f0dae6
createdAt: 2026-07-28T20:23:39.587Z
importance: 3
tags:
  - benchmark
  - gemini-2.5-flash
  - overnight
taskId: null
---
Updated benchmark configuration to use gemini-2.5-flash which provides 1,500 RPD daily free quota (resolving the 20 RPD cap on gemini-2.5-flash-lite). Verified model API calls with HTTP 200 OK responses and launched the full 589-query benchmark run in the background via npm run bench:full for overnight execution.

---
id: 0eef662c-00e1-48ee-acec-4eb18bcfedd8
createdAt: 2026-07-28T20:24:24.211Z
importance: 3
tags:
  - benchmark
  - gemini-2.5-flash
  - overnight
taskId: null
---
Updated benchmark configuration to use gemini-2.5-flash which provides 1,500 RPD daily free quota (resolving the 20 RPD cap on gemini-2.5-flash-lite). Verified model API calls with HTTP 200 OK responses and launched the full 589-query benchmark run in the background via npm run bench:full for overnight execution.

---
id: 95ecdd53-ded4-4da0-81ce-3fd5efe65c48
createdAt: 2026-07-29T04:10:03.030Z
importance: 3
tags:
  - benchmark
  - gemini-2.5-flash
  - overnight
taskId: null
---
Updated benchmark configuration to use gemini-2.5-flash which provides 1,500 RPD daily free quota (resolving the 20 RPD cap on gemini-2.5-flash-lite). Verified model API calls with HTTP 200 OK responses and launched the full 589-query benchmark run in the background via npm run bench:full for overnight execution.

---
id: 30860d38-5e8d-4604-adf2-f0c62a423643
createdAt: 2026-07-29T04:10:50.425Z
importance: 3
tags:
  - benchmark
  - gemini-2.5-flash
  - overnight
taskId: null
---
Updated benchmark configuration to use gemini-2.5-flash which provides 1,500 RPD daily free quota (resolving the 20 RPD cap on gemini-2.5-flash-lite). Verified model API calls with HTTP 200 OK responses and launched the full 589-query benchmark run in the background via npm run bench:full for overnight execution.

---
id: 0145abde-a969-4ee4-9992-6cc6806655ca
createdAt: 2026-07-29T04:12:41.433Z
importance: 3
tags:
  - benchmark
  - gemini-2.5-flash
  - overnight
taskId: null
---
Updated benchmark configuration to use gemini-2.5-flash which provides 1,500 RPD daily free quota (resolving the 20 RPD cap on gemini-2.5-flash-lite). Verified model API calls with HTTP 200 OK responses and launched the full 589-query benchmark run in the background via npm run bench:full for overnight execution.

---
id: 51d9cc74-0cb2-42e1-87a0-7043c6a5035b
createdAt: 2026-07-29T04:17:00.162Z
importance: 3
tags:
  - config
  - neuronYaml
  - zod
taskId: 01-neuronrc-config-schema-parser
---
Completed ticket 01-neuronrc-config-schema-parser: Added Zod schema validation for neuron.yaml / neuron.yml files in src/config/neuronYaml.ts. Replaced neuronrc naming completely, added storage.mode ('vector-only' | 'md-only' | 'dual' | 'split') and storage.path ('.neuron') options, and added unit tests in src/config/neuronYaml.test.ts. All 63 unit tests passed cleanly.

---
id: 5e6eea06-ea1b-4b38-896d-caa2aa979b2d
createdAt: 2026-07-29T04:17:44.592Z
importance: 3
tags:
  - benchmark
  - gemini-2.5-flash
  - overnight
taskId: null
---
Updated benchmark configuration to use gemini-2.5-flash which provides 1,500 RPD daily free quota (resolving the 20 RPD cap on gemini-2.5-flash-lite). Verified model API calls with HTTP 200 OK responses and launched the full 589-query benchmark run in the background via npm run bench:full for overnight execution.

---
id: 8e13c3e7-f3fb-446c-9439-debd6d19b1f3
createdAt: 2026-07-29T04:20:22.896Z
importance: 3
tags:
  - benchmark
  - gemini-2.5-flash
  - overnight
taskId: null
---
Updated benchmark configuration to use gemini-2.5-flash which provides 1,500 RPD daily free quota (resolving the 20 RPD cap on gemini-2.5-flash-lite). Verified model API calls with HTTP 200 OK responses and launched the full 589-query benchmark run in the background via npm run bench:full for overnight execution.

---
id: e59efdf9-f60b-4d1a-9212-e274a2cc286e
createdAt: 2026-07-29T04:21:02.998Z
importance: 3
tags:
  - teamwork
  - md-file-management
  - delegation
taskId: null
---
Crafted and launched teamwork prompt draft for implementing all remaining tickets in the md-file-management module (tickets 02, 03, 04, 05 covering MdStorageAdapter, DualStorageRouter, mdVectorSync, and neuron sync CLI command). Delegated execution to the teamwork_preview subagent team (conversation ID: 76e03d06-4eac-4091-8c8d-993ce49e28cf).

---
id: 48aa8bc6-ea42-4f09-9950-6b59e6596e08
createdAt: 2026-07-29T04:21:21.783Z
importance: 3
tags:
  - teamwork
  - md-file-management
  - delegation
taskId: null
---
Crafted and launched teamwork prompt draft for implementing all remaining tickets in the md-file-management module (tickets 02, 03, 04, 05 covering MdStorageAdapter, DualStorageRouter, mdVectorSync, and neuron sync CLI command). Delegated execution to the teamwork_preview subagent team (conversation ID: 76e03d06-4eac-4091-8c8d-993ce49e28cf).

---
id: 4ce06b9f-a505-4ff3-b7cf-3e2e66c8d0b6
createdAt: 2026-07-29T04:22:29.319Z
importance: 3
tags:
  - md-sync
  - explorer
  - survey
taskId: "04"
---
Explored

---
id: 9c258536-2287-4dc7-b94d-7dc9451f6fb1
createdAt: 2026-07-29T04:22:33.589Z
importance: 3
tags:
  - md-file-management
  - survey
  - architecture
taskId: md-file-management-survey
---
Completed

---
id: 3e1eb7fa-b2de-44f3-8530-dae64526ea8f
createdAt: 2026-07-29T04:22:35.740Z
importance: 3
tags:
  - cli
  - scaffolding
  - sync
  - survey
taskId: "05"
---
Completed

---
id: e201f102-7bfd-4423-945f-c32ab1ec550f
createdAt: 2026-07-29T04:22:46.627Z
importance: 3
tags:
  - test-survey
  - md-file-management
taskId: explorer_survey_2
---
Completed

---
id: 69999f34-b537-4e70-9eea-41fab6b96ebf
createdAt: 2026-07-29T04:22:49.979Z
importance: 3
tags:
  - spec-mining
  - md-file-management
taskId: md-file-management
---
Completed

---
id: 420083b1-cc41-4dc2-9a34-f6b6714860c3
createdAt: 2026-07-29T04:22:52.736Z
importance: 3
tags:
  - spec-mining
  - e2e-strategy
taskId: md-file-management-survey-3
---
Completed

---
id: f07e7a3f-41ac-479e-a6cd-8de0b7fd5223
createdAt: 2026-07-29T04:26:01.299Z
importance: 3
tags:
  - md-storage
  - adapter
  - testing
taskId: "02"
---
Implemented

---
id: 16cdd503-b7c9-4fea-9ede-92bc942e5f73
createdAt: 2026-07-29T04:28:13.869Z
importance: 3
tags:
  - challenger
  - md-storage
  - rejection
taskId: null
---
Challenged MdStorageAdapter implementation; rejected due to catastrophic frontmatter parsing breakdown, test fabrication, content mutation, and path traversal security flaw.

---
id: 7bfa21ae-e45b-4aa9-b1b3-77b07b51fca7
createdAt: 2026-07-29T04:28:35.483Z
importance: 3
tags:
  - verification
  - mdStorageAdapter
  - challenger
taskId: "02"
---
Completed

---
id: 879a3904-1a44-45a5-a765-da1c17770328
createdAt: 2026-07-29T04:29:47.226Z
importance: 3
tags:
  - md-storage
  - remediation
  - m1-retry
taskId: ticket-02
---
Completed

---
id: adcad23f-075a-4603-aeec-725ab17a1ba5
createdAt: 2026-07-29T04:29:59.312Z
importance: 3
tags:
  - testing
  - integration
  - e2e
taskId: md-file-management
---
Completed

---
id: 459647c0-246f-46f3-bf94-0a869fd86189
createdAt: 2026-07-29T04:30:20.688Z
importance: 3
tags:
  - testing
  - storage
  - sync
taskId: md-file-management
---
Completed

---
id: 336a9cdd-5755-40bc-873e-99b3e2c38741
createdAt: 2026-07-29T04:30:27.923Z
importance: 3
tags:
  - md-file-management
  - completion
  - testing
taskId: md-file-management-epic
---
Completed all Markdown file storage feature tickets (01, 02, 03, 04, 05 in .scratch/md-file-management/issues/). Implemented MdStorageAdapter with atomic swap writes and YAML frontmatter parsing, DualStorageRouter for storage mode routing, mdVectorSync for bidirectional content-hash vector synchronization, and neuron sync CLI command with scaffolding. All 127 unit, integration, challenger, and end-to-end tests passed across 20 test files.

---
id: 8018b969-0ea1-49dc-93e3-9fa1cca8b3d9
createdAt: 2026-07-29T04:30:29.625Z
importance: 3
tags:
  - e2e-testing
  - md-file-management
taskId: task-e2e
---
Designed and built comprehensive 4-Tier E2E test suite for md-file-management (covering R1 MdStorageAdapter, R2 DualStorageRouter, R3 mdVectorSync, R4 CLI neuron sync). Dispatched 5 subagents to survey specifications, design 53 test scenarios across Tiers 1-4, implement test runner suites, and verify 100% test execution pass rate (127/127 tests passed across 20 files). Published TEST_INFRA.md and TEST_READY.md at project root.

---
id: 1da3f017-cdca-46c1-9ceb-ed6c992daac4
createdAt: 2026-07-29T04:30:30.556Z
importance: 3
tags:
  - forensic-audit
  - m1-gate
taskId: m1-gate
---
Completed

---
id: c099e80a-4371-4333-b787-339f297fc2e7
createdAt: 2026-07-31T01:35:59.359Z
importance: 3
tags:
  - md-file-management
  - task-query
taskId: null
---
Queried

---
id: 7758243f-aa84-4bc2-b91b-7bb7d80cdcc1
createdAt: 2026-07-31T01:37:15.233Z
importance: 3
tags:
  - backlog
  - project-status
taskId: null
---
Queried

---
id: 37d6e5d9-15cc-492a-918a-017e8fa64bf6
createdAt: 2026-07-31T01:46:08.272Z
importance: 3
tags:
  - benchmark
  - sanity-check
  - personamem
taskId: null
---
Accessed and inspected the latest PersonaMem sanity benchmark run output for Neuron (20 queries). Extracted performance metrics (80% accuracy, 16/20 correct, 9.3s ingestion for 195 docs, 78.3ms average retrieval latency) and analyzed the 4 failed queries across topic categories (musicRecommendation and bookRecommendation under suggest_new_ideas).

---
id: 29723af5-35a5-4fef-a8cc-cf132467edc9
createdAt: 2026-07-31T01:47:22.395Z
importance: 3
tags:
  - benchmark
  - personamem
  - diagnosis
taskId: null
---
Conducted deep failure mode diagnosis of the PersonaMem sanity benchmark run. Inspected full LLM reasoning logs, options, and retrieved memory contexts for all 4 failed queries. Identified LLM over-reasoning on distractor options and persona trait over-fitting in suggest_new_ideas scenarios as the primary root cause.

---
id: 7625eb56-7192-47a3-b4d9-3bf2575971e0
createdAt: 2026-07-31T19:03:38.812Z
importance: 3
tags:
  - scan
  - evaluation
  - llm-as-judge
taskId: null
---
Executed

---
id: 7e2c6b87-dcd7-4f94-aa91-3565bee99b67
createdAt: 2026-07-31T19:06:47.136Z
importance: 3
tags:
  - scan
  - progress
  - summarizer
taskId: null
---
Implemented

---
id: 4090d527-a2d8-4ccc-b5bb-70880539b25b
createdAt: 2026-07-31T19:07:34.427Z
importance: 3
tags:
  - cache
  - clean
  - testing
taskId: null
---
Purged

---
id: d873c6e0-7afa-4c4f-aec2-1ff9bb871984
createdAt: 2026-07-31T19:27:23.637Z
importance: 3
tags:
  - release-plan
  - tickets
taskId: null
---
Queried

---
id: 0f9bdab2-47c0-43d6-932e-6f91e96c48e3
createdAt: 2026-07-31T19:28:39.015Z
importance: 3
tags:
  - release-plan
  - rc-bump
taskId: null
---
Updated

---
id: 908418b8-f680-4ee5-99e1-bb31eabac361
createdAt: 2026-07-31T19:36:02.847Z
importance: 3
tags:
  - ticket-02
  - release-plan
taskId: "02"
---
Completed

---
id: 80678e0f-90f1-4312-83a5-229b24f15427
createdAt: 2026-07-31T19:37:27.816Z
importance: 3
tags:
  - documentation
  - help
  - skill
taskId: null
---
Updated

---
id: ad41f1b6-dd4b-411b-8367-1b297e2a7318
createdAt: 2026-07-31T19:39:29.453Z
importance: 3
tags:
  - init
  - ui
  - progress
taskId: null
---
Fixed issue where handleInitCommand displayed 'Scanning:' on the terminal progress bar during ONNX model initialization and downloading. Added a configurable prefix option to ScanProgressBarOptions and ScanProgress so progress bars can display custom task titles. Configured handleInitCommand to pass prefix: 'Initializing' when setting up the progress bar for ONNX model preloading and update to 'Scanning' when performing initial architecture scanning. Added comprehensive unit test coverage in progress.test.ts to verify custom progress bar prefixes.

---
id: 4bc5777b-6146-4410-8bc9-b57939a59b7a
createdAt: 2026-07-31T19:41:15.864Z
importance: 3
tags:
  - config
  - scan
  - yaml
taskId: null
---
Added

---
id: 05dede41-ec7f-486d-8198-0156c14cd56b
createdAt: 2026-07-31T19:41:57.842Z
importance: 3
tags:
  - config
  - scan
  - documentation
taskId: null
---
Explained

---
id: 0b088642-324e-4059-9554-0720953da720
createdAt: 2026-07-31T19:44:41.419Z
importance: 3
tags:
  - scan
  - memory
  - init
  - diffing
taskId: null
---
Implemented

---
id: 429a08f3-6109-40b6-bc14-7db720992099
createdAt: 2026-07-31T19:45:37.014Z
importance: 3
tags:
  - scan
  - qa
  - explanation
taskId: null
---
Answered

---
id: 58645c68-0464-4e96-9da2-3188b10ab016
createdAt: 2026-07-31T19:46:27.278Z
importance: 3
tags:
  - scan
  - refactor
  - cleanup
taskId: null
---
Removed

---
id: fbb178c4-04e7-4866-9434-5a195e036327
createdAt: 2026-07-31T19:49:15.353Z
importance: 3
tags:
  - release
  - git
taskId: release-v2.1.0-rc2.1
---
Updated package.json version to 2.1.0-rc2.1 and verified all 152 unit tests pass. Staged all changes and committed release commit v2.1.0-rc2.1. Created git tag v2.1.0-rc2.1 and successfully pushed main branch and tags to GitHub repository.

---
id: fcc481f1-50d3-4f91-9aa6-4024a14885b2
createdAt: 2026-07-31T19:50:23.813Z
importance: 3
tags:
  - package
  - release
  - version
taskId: null
---
Updated package.json version string from 2.1.0-rc2.1 to 2.1.0-rc3 per user request. Verified that no other references to the release candidate version string existed in the codebase. Ran the test suite via neuron exec to confirm all 152 unit tests across 27 test files continue to pass cleanly.

---
id: 3eb1cabd-133f-43af-8d71-0919c9e9c523
createdAt: 2026-07-31T19:56:54.907Z
importance: 3
tags:
  - skill
  - neuron-memory
taskId: null
---
Updated

---
id: e7ef10ac-7c40-4a5f-86c9-382cd5340a3f
createdAt: 2026-07-31T20:01:00.783Z
importance: 3
tags:
  - skill
  - architecture-scan
  - neuron-memory
taskId: null
---
Updated

---
id: 289cdcdc-7577-4423-b0ee-96a0eefa8466
createdAt: 2026-07-31T20:07:06.368Z
importance: 3
tags:
  - config
  - scan
  - architecture
  - neuron-memory
taskId: null
---
Updated

---
id: 781ca207-f991-4c31-abfa-e3c3b982ba46
createdAt: 2026-07-31T20:19:08.909Z
importance: 3
tags:
  - architecture
  - drift
  - diff
  - ticket-03
taskId: 03-drift-detection-diffing
---
Completed

---
id: 3419446c-4cbf-4683-930c-c2679f4004bf
createdAt: 2026-07-31T20:25:32.536Z
importance: 3
tags:
  - scan
  - drift
  - auto-rescan
taskId: 03-drift-detection-diffing
---
Enabled

---
id: c21fc957-482e-40e8-a509-893ebfcab1f4
createdAt: 2026-07-31T20:28:03.105Z
importance: 3
tags:
  - scan
  - drift
  - learn-command
taskId: 03-drift-detection-diffing
---
Updated

---
id: 39ad4d0a-2f99-4c67-9498-a23ff57734f0
createdAt: 2026-07-31T20:30:33.509Z
importance: 3
tags:
  - deprecation
  - cli
  - memory
taskId: 03-drift-detection-diffing
---
Folded

---
id: 6065b589-f77c-4d3a-98ed-fa82d40929e4
createdAt: 2026-07-31T20:33:47.712Z
importance: 3
tags:
  - scan
  - config
  - auto-scan
taskId: 03-drift-detection-diffing
---
Updated

---
id: 7a781419-e0f0-4fcb-8dc6-44e8a631e9dd
createdAt: 2026-07-31T20:36:29.768Z
importance: 3
tags:
  - summarizer
  - onnx
  - cjk-filter
taskId: 03-drift-detection-diffing
---
Added

---
id: 7c0033f2-11d6-4d06-8bc7-61497df26152
createdAt: 2026-07-31T20:48:57.308Z
importance: 3
tags:
  - e2e
  - benchmark
  - testing
  - ticket-04
taskId: 04-deep-testing-suite
---
Implemented

---
id: 32e4942b-71e6-45f1-a10c-55ff72658296
createdAt: 2026-08-01T02:18:08.239Z
importance: 3
tags:
  - release
  - 2.1.0
  - scanner
  - drift
taskId: 05-release-verification-2.1.0
---
Released @kovartravis/neuron v2.1.0 stable, promoting 2.1.0-rc5 and packaging the architecture-tree feature set: neuron scan blueprint ingestion, 4-bucket drift detection via --diff/--check, the fingerprint drift guard, and the 6-pillar deep E2E benchmark suite. Rewrote README, .claude/skills/neuron-memory/SKILL.md, CLAUDE.md, CONTEXT.md, MASTER_HELP and SCAN_HELP, and wrote a full CHANGELOG 2.1.0 section covering Added/Changed/Fixed/Known Limitations. Corrected the false tree-sitter AST claims across docs since TreeSitterScanner is regex-based and web-tree-sitter was never a dependency, marked ADR 0003 Deferred, and filed tracking ticket 06-real-tree-sitter-ast-engine.md. Also excluded tests from the tsc build (tarball 142 to 82 files) and fixed neuron exec destroying quoted arguments. 179/179 unit tests pass; commit 5f2f093 and tag v2.1.0 pushed to origin/main.

---
id: 9754dda9-0d4e-4b21-939d-0a659da980cd
createdAt: 2026-08-01T02:48:22.791Z
importance: 3
tags:
  - wayfinder
  - 2.2.0
  - planning
  - release
taskId: neuron-2.2.0
---
Ran /wayfinder to chart the neuron 2.2.0 release map after publishing v2.1.0. Conducted a grilling session covering destination, rc slicing, grammar distribution, missing-grammar behaviour, LLM job selection, recall mechanism, compatibility disclosure, recall rc splitting, and the fate of the 4-step protocol block. Created .scratch/neuron-2.2.0/map.md plus 21 child tickets in issues/, wired the blocking graph, and verified it (frontier is tickets 01 and 10; ticket 10 harness research is AFK and unblocked from day one so it can run parallel with rc1). Superseded .scratch/architecture-scans-2.1.0/issues/06-real-tree-sitter-ast-engine.md by splitting it into new tickets 01-03 and marked the 2.1.0 map complete. Surfaced one gap the old ticket 06 missed: existing users' 2.1.0 regex-derived drift baselines will manufacture phantom drift across all four buckets when compared against 2.2.0 AST scans, which breaks 'neuron scan --check' in CI for anyone gating on it; this is now ticket 03.

---
id: a6a98b0b-b19c-4f8e-9f47-a3315ff251e5
createdAt: 2026-08-01T03:02:31.797Z
importance: 3
tags:
  - wayfinder
  - 2.2.0
  - tree-sitter
  - rc1
taskId: neuron-2.2.0-01
---
Resolved wayfinder ticket 01 (Tree-Sitter Grammar Acquisition & Init-Time Caching) on the neuron 2.2.0 map, the first ticket of the 2.2.0-rc1 band. Added web-tree-sitter@0.26.11 as the only new runtime dependency and created src/scanner/grammars.ts implementing GRAMMAR_SPECS for 8 pinned grammars, a manifest-attributed disk cache under env-paths (overridable via NEURON_GRAMMAR_DIR), npm registry tarball fetching with a hand-rolled tar reader, and a GrammarLoader that returns null rather than throwing for unavailable grammars. Wired fetching into neuron init with progress reporting and a stderr warning plus JSON field listing unavailable grammars. Wrote 14 tests covering cache hit, cache miss, multi-grammar single download, unreachable registry, 404, corrupt tarball, missing artifact, version bump invalidation, unattributable wasm, and registry mirror support; full unit suite green at 193 tests across 30 files. Verified end to end against the live registry: all 8 grammars fetch in 1.0s totalling 8.49 MB and load in 1-5ms, tarball holds at 612.6 KB with zero wasm files. Landed ADR 0008 and moved ADR 0003 from Deferred to Partially implemented. Discovered and fed into ticket 02 that TypeScript's shipped tags.scm is unusable for symbol extraction (no function_declaration or method_definition rules) so TypeScript and TSX need hand-written queries, while the other languages can filter the shipped queries to @definition.* captures to drop call sites.

---
id: e8885ca8-516c-4ba3-bba5-4e2bb211f37d
createdAt: 2026-08-01T03:36:33.466Z
importance: 3
tags:
  - 2.2.0
  - tree-sitter
  - scanner
  - ast
  - wayfinder
taskId: "02"
---
Resolved wayfinder ticket 02 (Replace Regex Extraction with Parsed-AST Symbol Queries) on the neuron 2.2.0 map, band 2.2.0-rc1. Created src/scanner/queries.ts holding the hand-written TypeScript/TSX S-expression query plus the node-type-to-kind tables, rewrote src/scanner/treesitter.ts to parse real syntax trees via the GrammarLoader from ticket 01, and wired src/scanner/analyzer.ts to the scanner while deleting its duplicate ScannedSymbol interface and parseSymbolsFromFile regex. Added parseFile returning per-file ParserFidelity (ast/regex/unsupported) and a parserFidelity tally on ScanResult as the input ticket 03 needs; widened the kind union with type/enum/module and added an 'exported' flag. Grew src/scanner/treesitter.test.ts from 4 to 22 tests covering multi-line signatures, nested declarations, decorated Python defs, a pure-call-site file yielding zero symbols, per-language kind correctness for Python/Go/Rust/Java/C++/JavaScript, tsx JSX parsing, and the polyglot-monorepo fixture. Full unit suite is 212 tests across 30 files, all green; the one failing e2e test (concurrency-stress multi-process contention) was verified to fail identically on a clean stash of HEAD and is unrelated flake. Symbol count on this repo fell 3290 to 233 (-92.9%) with 106 exported, cross-checked against grep to confirm no real declarations were lost. Left the blueprint baseline deliberately un-refreshed for ticket 03.

---
id: 64c53574-1f84-4c0f-99ea-b9ee696cf5e4
createdAt: 2026-08-01T11:28:36.105Z
importance: 3
tags:
  - 2.2.0
  - fidelity
  - drift
  - scanner
  - wayfinder
  - tdd
taskId: "03"
---
Resolved wayfinder ticket 03 (Parser Fidelity Labelling & Baseline Migration) on the neuron 2.2.0 map, band 2.2.0-rc1, after a /grill-with-docs design session that settled four decisions recorded in ADR 0009. Created src/scanner/fidelity.ts holding the SCANNER_GENERATION constant, the FidelityDescriptor type, and the parse/format/compare functions; summarizer.ts now writes a '## Parser Fidelity' section to the blueprint card as a default plus deviating files; diff.ts parses it back, refuses incomparable baselines wholesale via a new needsRebaseline result, and renders a 'Re-baseline Required' report instead of falsely claiming 'In Sync'; scan.ts exits 2 on incomparable versus 1 on drift; autoRescanIfDriftDetected re-baselines silently on mismatch; and analyzer.ts warns loudly on stderr when a grammar-capable language degrades to regex. Built test-first across five pre-agreed seams plus one added for the degradation warning, every slice red before green. Three pre-existing diff tests began failing correctly because they diffed against the legacy fixture that the new rule refuses, and were repointed at a new comparableBaselineMarkdown fixture. Final state 227 unit tests across 33 files plus all 6 E2E pillars green including Pillar 4 drift detection. Verified the whole migration end-to-end on this repo: scan --check exited 2 against the real 2.1.0 card, neuron scan re-baselined it, scan --check then exited 0. Also removed the dead 'neuron scan --force' flag, corrected the now-false SCAN_HELP note claiming extraction is line-oriented rather than AST-based, added four glossary terms to CONTEXT.md, and wrote the 2.1.0 to 2.2.0 CHANGELOG upgrade note.

---
id: aae7efd0-0631-48b7-a7d7-c187b7fb7d73
createdAt: 2026-08-01T11:48:04.115Z
importance: 3
tags:
  - 2.2.0
  - release
  - rc1
  - readme
  - docs
  - wayfinder
taskId: "04"
---
Cut wayfinder ticket 04 (Cut and Publish 2.2.0-rc1) on the neuron 2.2.0 map, then reworked the README on request. Bumped 2.1.0 to 2.2.0-rc1, wrote the CHANGELOG release section folding in tickets 01/02/03, restored the AST wording that 2.1.0 deliberately walked back across README.md, CONTEXT.md, SCAN_HELP and the packaged neuron-memory skill, and moved ADR 0003 from Partially implemented to Implemented. Corrected the ticket's stated scope of '9 languages' to the accurate 8 grammars covering 10 extensions, with 4 extensions remaining on the regex fallback, which reconciles to the 14 in SUPPORTED_SOURCE_EXTENSIONS. Verification: 227 unit tests across 33 files green, 9 of 10 E2E pillars pass with Pillar 4 reporting baselinePhantomChanges 0, and the packed tarball measured 613.1 KiB across 84 files with zero .wasm confirming grammars did not leak into the files array. Pillar 8 multi-process contention fails at droppedWriteRatio 0.08 against a 0.05 threshold but was previously proven pre-existing by stashing all scanner work and reproducing it on a clean tree. Committed and tagged v2.2.0-rc1 and pushed both, but deliberately did NOT run npm publish because the session was npm 401 and publishing is irreversible; the maintainer runs 'npm publish --tag rc'. Separately split the 250-line README into a selling-points README plus docs/COMMANDS.md, removing the now-false line-oriented-extraction caveat, the deleted --force flag, the stale 'exit 1 on drift' description and the stale '6-pillar' E2E count. Also surfaced that four duplicate blueprint cards exist in the decisions category because ingestScanResults locates the card by semantic query plus find rather than a stable identity; logged as fog on the map rather than deleted.

---
id: 067d429f-9f70-4888-a158-05ded24ef2c8
createdAt: 2026-08-01T13:09:11.594Z
importance: 5
tags:
  - benchmark
  - longmemeval
  - amb
  - harness
  - ticket-22
  - retrieval
taskId: null
---
LongMemEval benchmark harness restored and validated for neuron (ticket 22, top priority ahead of rc2). The AMB harness (github.com/vectorize-io/agent-memory-benchmark) is cloned shallow at benchmarks/agent-memory-benchmark/ (1.2GB, gitignored), with local-modifications.patch applied and the salvaged scripts/, src/memory_bench/memory/neuron.py and .env copied from ~/Repos/neuron-amb-integration-backup. Setup notes: the CLI entrypoint is 'omb' not 'amb' (README lags a rename); requires Python 3.11-3.13 so use 'uv sync --python 3.12' because uv defaults to 3.14 which has no onnxruntime wheels; uv installs to ~/.local/bin. Verified neuron is a registered provider and longmemeval split 's' has 500 questions across 6 categories (multi-session 133, temporal-reasoning 133, knowledge-update 78, single-session-user 70, single-session-assistant 56, single-session-preference 30). Correctness check passed: longmemeval sets isolation_unit='question' with user_id=question_id on both queries and documents, which maps onto neuron's scope filter, so there is no cross-question leakage even though the provider's prepare() ignores unit_ids and uses one shared sqlite file. Wrote scripts/neuron_retrieval_only.py which measures recall@1/5/10 with ZERO LLM calls (local embeddings only), making it free and deterministic and therefore suitable as a CI regression gate. Key trap found: load_queries(limit=N) returns questions in category order, so a limit-60 sample was 100% single-session-user (the easiest category) and produced a misleading 98.3% recall; always stratify before quoting a number. Measured ingestion at 43ms/doc, retrieval p50 56ms p95 108ms.

---
id: 104a98aa-5241-407c-8a92-b9ea0956dd23
createdAt: 2026-08-01T15:53:08.927Z
importance: 3
tags:
  - wayfinder
  - longmemeval
  - benchmark
  - ticket-22
  - ticket-06
  - rc2
taskId: "22"
---
Session 2026-08-01: packaged the LongMemEval benchmarking work into two shareable deliverables and then parked its paid half at the maintainer's direction. Delivered (a) docs/benchmarks/longmemeval-retrieval.md, a public report leading with recall@1 83.3%, recall@5 96.2%, recall@10 98.3% across 479/500 scored questions and 23,867 documents with zero cross-unit leakage, plus a per-category table, p50/p95 latency, full method, and an explicit 'What this is not' section stating these are retrieval-only figures NOT comparable to AMB's end-to-end hindsight 94.6% or hybrid-search 74.0%; and (b) benchmarks/longmemeval/, a self-contained harness holding neuron.py (AMB MemoryProvider), neuron_bridge.mjs (stdio JSON bridge, made location-independent via a NEURON_DIST env var), retrieval_eval.py (zero-LLM recall runner), setup.sh and a README documenting the six traps that cost time. Then updated wayfinder ticket 22 to Status parked with the retrieval deliverables checked off, recorded four corrections to its original premises, and wrote an explicit unpark command and ~4 dollar budget into the ticket; lifted the map's Priority-override block so future sessions no longer see 22 outranking the rc2 band, and claimed ticket 06 (write-side enrichment). Ticket 06 was left at the very start of its TDD loop: seams identified (withTimeout, resolveVocabulary, MemoryEnricher.enrich, the memory add CLI path, neuron status counters) and src/components/timeout.test.ts written and RED with no implementation behind it — that untracked file will fail npm test until src/components/timeout.ts exists or the test is removed.

---
id: 8e650898-e498-4f99-a251-82290875ae82
createdAt: 2026-08-01T16:57:03.169Z
importance: 3
tags:
  - wayfinder
  - grilling
  - enrichment
  - spec
taskId: "06"
---
Wayfinder session on the neuron 2.2.0 map: picked up ticket 06 (write-side enrichment), which the previous session had claimed without starting, and ran a full grilling session across eight questions before publishing a spec. The grilling reshaped the ticket substantially rather than confirming it — tags left the LLM entirely for centroid cosine after timing showed the 0.5B model costs 3205ms to load per process against the embedder's 177ms, content-hash caching was dropped as cargo-culted from the summarizer, and the --category flag became optional on add only with no default. Published .scratch/write-side-enrichment/spec.md labelled ready-for-agent, rewrote ticket 06's Design and Deliverables to point at it, created ticket 23 (configurable automatic pruning) after the maintainer redirected a clamp-on-importance question into a full pruning redesign, and updated the map with an 'In flight' section plus the rc2 band table. No implementation code was written; ticket 06 remains claimed with implementation outstanding.

---
id: c5d2c5d1-261e-4e96-b657-d2bb13826789
createdAt: 2026-08-01T17:26:00.180Z
importance: 3
tags:
  - enrichment
  - llm
  - wayfinder
taskId: 06-write-side-enrichment
---
Implemented and resolved wayfinder ticket 06 (write-side enrichment) for neuron 2.2.0-rc2, AFK from the ready-for-agent spec at .scratch/write-side-enrichment/spec.md. Added the llm.enrichment config namespace with cross-reference validation, centroid-cosine tag selection over a closed vocabulary (src/components/enricher.ts), both category strategies, a schema v6 enriched_at column with an unbounded backlog drain that fires before any query, the 'neuron memory enrich' subcommand, the withTimeout primitive the codebase lacked, degradation counters in 'neuron status', and a process-level Qwen singleton so a scan and enrichment share one 3.2s model load. Made --category optional on 'memory add' only. Wrote three new E2E pillars (10 importance and prune safety, 11 category strategy A/B, 12 enrichment retrieval non-regression) and registered them in benchmarks/e2e-runner.js; Pillar 12 met ADR 0010 section 7's bar with delta 0.0 on recall@1, recall@5 and MRR between the enabled and disabled arms. Final state: 252 unit tests green (was 231), 14 of 14 pillars green, blueprint re-baselined with 'neuron scan --check' exiting 0. Updated CLAUDE.md, the packaged neuron-memory skill with an enrichment interview section, CONTEXT.md with six glossary entries, and amended ADR 0010.

---
id: 092258c7-11e5-4b95-a550-2957e391d514
createdAt: 2026-08-01T21:22:33.628Z
importance: 3
tags:
  - wayfinder
  - adr
  - enrichment
taskId: "23"
---
Grilled ticket 23 (configurable automatic pruning) for the neuron 2.2.0 wayfinder map and wrote the executable handoff at .scratch/configurable-pruning/ab-test-plan.md. Settled ten decisions: pruning is a recall-quality feature for history-shaped noise only (not disk, the DB is 2.9MB); hard DELETE with no undo, no soft-delete column and no reuse of ticket 08's supersession because superseded means lineage while pruned means routine-and-old; per-category config with defaultImportance plus a prune block whose absence means never pruned, which makes the upgrade path safe by construction since no existing neuron.yaml has that block; lazy trigger off neuron memory query behind a last_prune_check_at 24h skip in meta; and usage-based deletion explicitly rejected because it punishes the rare-but-critical failure fix that is never retrieved until it matters. The A/B was scoped to two experiments with a pre-committed ship bar: Experiment 1 compares a recoverability binary against a rescaled 1-5 importance prompt, disqualifying any arm that false-deletes an unrecoverable entry; Experiment 2 is a paired damage-versus-gain comparison over the real store then a synthetic 1500-entry scale probe, and a double null means automatic pruning is removed from 2.2.0 rather than shipped disabled. Ticket 23 is left claimed and unresolved pending the verdict, and a proposed split into tickets 24 and 25 awaits maintainer approval.

---
id: 6306b075-224a-4277-a42e-6ec794208393
createdAt: 2026-08-01T21:59:20.362Z
importance: 3
tags:
  - wayfinder
  - adr
  - rc2
taskId: "24"
---
Executed wayfinder ticket 24 (pruning A/B) AFK per .scratch/configurable-pruning/ab-test-plan.md end to end. Labelled all 158 history entries plus 25 learning/decisions negative controls (11 ground-truth unrecoverable), scored A1 (recoverability binary) and A2 (recalibrated 1-5 scale) against them using the real shipped Qwen1.5-0.5B model; both arms disqualified under the plan's own bar (A1 false-deleted 2 of 11 unrecoverable entries including one ADR, A2 false-deleted 4 of 11 including three ADRs), which per the plan's section 3 collapses Experiment 2 since there is no safe judgement to prune with, so the real/synthetic retrieval comparison was not executed though its infrastructure (query filter, keyword-overlap relevance labels, paired-comparison runner) was built and validated. A scoring-integrity pass caught and fixed two of my own labelling errors before finalizing, and the qualitative disqualification held either way. Verdict: automatic pruning is removed from 2.2.0; ticket 06's importance:off default stands with no ADR reversal; ticket 25 ships its config-schema and collision-fix scope only. Live store verified byte-identical throughout (2,916,352 bytes, MD5 16c9555c39668438e1de1a10c18119d0) using SQLite's online backup API rather than a raw file copy, since a live neuron ui process held it open under WAL for the entire session; all experiment work ran against scratch copies outside both the repo and the neuron data dir.

---
id: 77192012-5e0f-4282-a9db-98d68208f9ba
createdAt: 2026-08-02T00:38:55.584Z
importance: 3
tags:
  - failure-fix
  - rc2
  - adr
taskId: v2.1.2
---
Shipped v2.1.2 fixing a silent data-loss defect in the neuron CLI, found while grilling wayfinder ticket 08. Root cause is one family of bug with four symptoms: argv boundaries were discarded. An unquoted argument arrives as several argv entries, and 'memory add' and 'memory update' read only positionals[0] while dropping the rest, 'memory query' truncated the same way so 'memory query tree sitter grammar' silently searched for 'tree' alone, unknown or mistyped flags such as --tag and --importanc fell through to positionals and vanished so their values were silently defaulted, and '--help' was itself unrecognised so 'neuron memory add --help' stored a memory whose content was the literal string '--help'. All four exited 0 and reported success. Verified that published stable 2.1.1, the default install for every user, was affected at all five call sites, introduced in commit 7c6eac5 on 2026-07-26. Fixed by rejecting unrecognised dash-prefixed tokens in parseFlags with a nearest-match suggestion and a '--' end-of-flags escape, adding per-subcommand positional-count guards that refuse rather than truncate, joining query positionals, and recognising --help in parseFlags. Confirmed 'neuron exec' passthrough is unaffected because it splits at '--' before flag parsing and never calls parseFlags. Shipped as a patch off the v2.1.1 tag on branch fix/2.1.2-argv-boundaries, tagged v2.1.2, then cherry-picked onto feat/2.2.0-tree-sitter-grammars. 189 tests pass on the patch branch and 258 on the 2.2.0 branch, including 6 new regression tests covering every symptom. npm publish is outstanding and owned by the maintainer.

---
id: 0afc0640-462f-45b1-bcb6-7c8c8752b37d
createdAt: 2026-08-02T04:17:24.667Z
importance: 3
tags:
  - tickets
  - 2.1.x-hardening
taskId: null
---
Filed nine tickets under .scratch/2.1.x-hardening/ documenting the session's bug-sweep work across v2.1.2 through v2.1.6: five resolved tickets (01 argv-boundary truncation, 02 prune-docs blast radius, 03 delete/update ignoring --category, 04 dual-mode status misreport, 05 sync conflict guessing) each linking its exact commit hash on main, one resolved ticket for the main-orphaned-from-releases incident that changed the working pattern partway through the session (06), and three open/unclaimed tickets for items surfaced but not chased down: giving sync a real last-modified signal (07, the deferred proper fix for 05's stopgap), whether split-mode concurrent writes are race-safe (08, unverified suspicion from mdStorageAdapter's read-modify-write shape), and whether computeMemoryHash is ever compared across different ids (09, speculative). Built a map.md index following this repo's existing feature-directory convention (Destination/Notes/Decisions so far/Not yet specified/Out of scope/Frontier), matching the shape already used by .scratch/md-file-management and the neuron-2.2.0 wayfinder map, though this is a bug-tracking effort rather than a wayfinder-charted feature. Committed and pushed to main only; not forward-ported to the 2.2.0 branch since the tickets are about the 2.1.x hardening line specifically and the underlying code fixes are already cherry-picked there.

---
id: bf065516-9c27-4edf-a436-77c9ad0f432b
createdAt: 2026-08-02T12:39:22.492Z
importance: 3
tags:
  - wayfinder
  - ticket-07
  - ticket-26
  - ticket-27
  - rc2
  - 2.2.0
taskId: "07"
---
Wayfinder session 2026-08-02 on the neuron 2.2.0 map (branch feat/2.2.0-tree-sitter-grammars, where the map lives — NOT main). Claimed the frontier ticket 07 (salvage expansion) and ran /grill-with-docs on it. Rather than designing the feature, the session ran ticket 07's own scope step 3 first: built a calibration probe reusing Pillar 7's ADVERSARIAL_CASES against the real embedder, which took about a second and killed the feature. Outcome: ticket 07 ruled out of scope with a full Answer; ADR 0010 amended (sections 1 and 2 withdrawn, its false '>= 0.75 for any top hit' premise corrected, section 7's row for 07 struck, ADR left Accepted because sections 3, 5 and 7's method still govern 06); ticket 26 filed to remove model-based importance inference entirely and wired to block 09; ticket 27 filed for the structurally-inert minScore defect, unbanded and on the frontier; ticket 09 rewired from 'blocked by 05, 06, 07, 24' to 'blocked by 05, 06, 24, 26' with its scope corrected in four places where it still promised salvage expansion, four LLM jobs, and a CONTEXT.md edit that is now the opposite of correct. The map's Destination theme 2 was rewritten and the rc2 band row updated. Probe, results and a written report preserved at .scratch/salvage-expansion/ with a vitest config so it re-runs on demand without joining the normal suites. Frontier now reads 10, 26, 27. Process note for future sessions: the naming collision between ADR 0007's Pillar 2 title and the later Pillar 7 sent the ticket's stated bar at a corpus pinned to recall 1.0 — always check a named benchmark's current measured numbers before trusting a ticket's choice of bar.

---
id: 12145e62-0cf9-4b16-a70c-e858936030f8
createdAt: 2026-08-02T13:01:31.406Z
importance: 4
tags:
  - enrichment
  - importance
  - llm
taskId: "26"
---
Resolved neuron 2.2.0 wayfinder ticket 26 (Remove Model-Based Importance Inference), the last blocker on ticket 09 (Cut and Publish 2.2.0-rc2). Deleted inferImportance, buildImportancePrompt, parseImportance, ImportanceInferenceResult and the importance field of CategoryInferenceResult from src/components/enricher.ts; renamed inferCategoryAndImportance to inferCategory; removed the llm.enrichment.importance key from src/config/neuronYaml.ts. After confirming with the maintainer, also removed the now-unreachable enrichment backlog: drainEnrichment, countPendingEnrichment, drainEnrichmentIfPending, clampImportance, the 'neuron memory enrich' subcommand and enrichment.pending from neuron status, while keeping the enriched_at column and migration v6. Re-pointed E2E Pillar 10 from importance inference to prune safety, where it now quantifies ticket 23's live hazard (9 of 12 entries deleted at the default ceiling, 3 of 6 critical) and asserts that --importance protects; it no longer loads the model so it runs in milliseconds instead of minutes. Corrected CONTEXT.md, docs/COMMANDS.md, ADR 0010, CLAUDE.md, CHANGELOG.md and the packaged neuron-memory skill, which was still documenting an importance config key and a 'neuron memory enrich' command. Verification: tsc clean, 270 tests green (267 unit + 3 enrichment pillars); the one full-suite failure is Pillar 8 multi-process contention at 3/50 rejected writes, confirmed pre-existing by stashing the branch and reproducing on a clean tree.

---
id: d79d688b-8f48-4571-91f2-aca67fec1d6c
createdAt: 2026-08-02T13:24:25.709Z
importance: 4
tags:
  - wayfinder
  - 2.2.0
  - rc2
taskId: "28"
---
Charted the 2.2.0-rc5 markdown-first band on the wayfinder map at .scratch/neuron-2.2.0/ from the maintainer's repositioning handoff, adding tickets 28-34 and updating the map destination from three themes to four. Before charting, audited the supplied README draft against the built 2.2.0-rc1 CLI in a scratch project and found four load-bearing claims false, which reshaped the band: md-only is not the default and neuron init writes no neuron.yaml; md-only has no semantic search (measured: exact substring 1 hit, same meaning 0 hits, same words reordered 0 hits); md-only enrichment infers nothing and hard-errors on omitted --category; neuron status reports totalCount 0 with entries on disk. Tickets: 28 grilling on the md-only embedding layer and parity bar (blocks the rest), 29 real semantic search, 30 enrichment plus honest counts, 31 make md-only the actual default, 32 ship the README, 33 docs audit, 34 cut rc5. Ticket 21 (stable) now also blocked by 34. Cleared the 'Enrichment in md-only storage mode' fog patch as graduated into 30; added two new fog patches (plan-vs-architecture-diff, blocked on a spec file that does not exist; and hand-edit semantics for markdown entries). Recorded three non-goals as out-of-scope. Frontier is now 09, 10, 27, 28.

---
id: bdbea175-cfa8-4269-b90e-c034db8bf775
createdAt: 2026-08-02T18:55:03.497Z
importance: 4
tags:
  - wayfinder
  - rc2
  - 2.2.0
taskId: null
---
Worked neuron 2.2.0 wayfinder ticket 28 (What md-only Parity Actually Means) as a grilling session, resolving it and re-scoping the rc5 band. Skipped ticket 09 at the head of the frontier because it is a release cut rather than a grilling, and chose 28 over 27 because it blocked five tickets. Seven decisions were put to the maintainer one at a time, each grounded in a measurement taken during the session rather than in the ticket text: embedder throughput (127 ms warm model load, 2.39 ms per embed), SHA-256 over the whole store (0.006 ms), the live scope distribution (1 distinct value across 264 entries, 0 manual-scope rows, 0 promotion matches, 837 query_logs rows worth 1.36 MB of a 3.1 MB database), and the SQLite-versus-markdown entry counts on this repo (264 versus 15). The maintainer overrode the first proposed answer, correctly observing that a bespoke env-paths embedding cache was dual mode with extra steps, which redirected the whole design toward deleting md-only instead of fixing it. Three findings changed the map rather than just the ticket: ticket 35 was promoted from sibling to hard prerequisite because mdStorageAdapter.ts:326 mints a fresh UUID on every read for an entry missing its id, which under strict mirror plus reconcile-on-every-command becomes a permanent insert-delete churn loop that re-embeds forever; ticket 30 was ruled out of scope because its defects vanish rather than get fixed; and ticket 31 carried a prior maintainer ruling against building an upgrade path that this session superseded, since a bare default flip under strict mirror would delete 249 entries from the maintainer own store. Wrote the spec at .scratch/md-first/spec.md, ADR 0011, new ticket 38 (remove scope), rewrote ticket 29 as the reconcile engine, and rewired blockers on 31, 32 and 34. Frontier is now 09, 10, 27, 35, 37, 38.

---
id: dbb076f1-50f8-4c37-8241-e0ae32353c7e
createdAt: 2026-08-02T21:42:24.372Z
importance: 3
tags:
  - wayfinder
  - rc2
  - 2.2.0
taskId: ticket-29
---
Implemented and resolved neuron 2.2.0 ticket 29 (the Markdown<->Vector Reconcile Engine) in a single AFK session, invoked via /wayfinder work-through-the-map mode naming ticket 29 and /tdd for implementation. Claimed the ticket (its blockers 28, 35 and 38 were already resolved), read the neuron-2.2.0 map, ADR 0011, and the md-first spec for full context, then worked test-first in vertical slices: config-layer mode aliasing, NeuronMemory always keeping its database plus new getMeta/setMeta methods, DualStorageRouter's flipped markdown-first write ordering, the new reconcile engine (bootstrap seed, per-entry content-hash diff, strict-mirror deletion), and the split-mode dispatch fix, each with red tests confirmed failing before implementation. Rewrote several pre-existing tests whose assertions encoded now-superseded behavior (md-only substring search, per-category mtimeMs cache invalidation, and vector-only-orphan salvage-on-next-update) rather than leaving them passing against dead code paths. Measured reconcile latency informally on a 264-entry store for ticket 32's benchit needs. Ran the full unit and e2e suite repeatedly to green (303 tests), diagnosed and ruled out one intermittent concurrency-stress test failure as a pre-existing multi-process migration race unrelated to this ticket's changes. Closed ticket 29 with a detailed Answer section, updated its Deliverables checklist, and appended a Decisions-so-far entry to the neuron-2.2.0 map. Ticket 31 (make md the actual default) is now unblocked as a result.

---
id: 5ae0a8ee-0b50-4a53-b441-023ac920e87e
createdAt: 2026-08-03T01:41:14.291Z
importance: 4
tags:
  - wayfinder
  - 2.2.0
  - rc2
taskId: "09"
---
Resolved wayfinder ticket 09 (Cut and Publish 2.2.0-rc2) via /wayfinder work-through-the-map mode. First committed leftover uncommitted work from ticket 29 (markdown-vector reconcile engine) separately, verifying 290 unit tests green before committing, since it belonged to rc5 not rc2. Then executed ticket 09's scope: bumped package.json/package-lock.json to 2.2.0-rc2, wrote a CHANGELOG section covering write-side enrichment (ticket 06 had shipped with zero CHANGELOG entry for the actual feature, only its later importance-removal amendment), stated the 05 gating bar honestly per-job (06 passed non-regression, 07/08 never reached the bar because their premises failed first, 23/24 removed on the A/B verdict), and measured neuron memory query latency (cold ~4.8s first invocation, warm p50 ~223ms/p95 ~229ms over 20 runs) as the budget baseline for rc3's auto-injection. Ran npm test (290/290 green) and npm run test:e2e (12/13 pillars, Pillar 8 multi-process contention pre-existing and unrelated). Tagged and pushed v2.2.0-rc2, leaving npm publish to the maintainer per ticket 04's precedent.

---
id: dd9278a5-bb98-4686-9091-f9a7115e8b8d
createdAt: 2026-08-03T11:38:04.445Z
importance: 4
tags:
  - wayfinder
  - 2.2.0
  - rc2
taskId: "11"
---
Worked wayfinder ticket 11 (recall adapter architecture) for neuron 2.2.0 rc3 as a grilling session; it ended UNCLAIMED rather than resolved because two of its eight decision points remain open. Settled six points and wrote them into the ticket: the adapter scope is cut from five harnesses to four on the principle 'ship only what neuron can honestly describe' (17 Antigravity and 18 OpenCode ruled out of scope for undocumented reliability despite having the strongest mechanisms, new ticket 40 created for Cursor which ticket 10 researched but never ticketed); capability modelled as a lifecyclePoint-to-supportRecord map with a first-class 'unknown' value and a derived rather than stored fidelity label; a session-scoped injection ledger so pre-prompt recall injects deltas instead of re-injecting the same entries every turn; a third execution-only lifecycle point 'context-reset' to clear that ledger on compaction with a turn-count TTL fallback; a neuron-enforced character ceiling that never relies on the harnesses' spill-to-file overflow because spill silently converts deterministic recall back into agent-invoked recall; and two neuron init consent policies that both resolve to ASKING the user (which hook target, and whether to overwrite an existing entry) after two classification-based designs were rejected during the grilling for needing a referent that drifts across versions. Point 4's relevance floor acquired a new blocking ticket 39 after a pilot measurement (271 entries, 20 queries, script and report saved under research/) found a viable cosine gate at 0.60 resting on only a 0.061 margin; ticket 39 sweeps three gate quantities on the existing free LongMemEval retrieval harness (500 questions, 23867 docs, zero LLM calls) against a bar committed in advance of zero recall regression, measurable volume reduction and 0 percent false silence. Point 6 (multi-harness resolution) was never reached and is flagged for the resuming session. Two record corrections: ticket 09's cold query latency of 4.8s does not reproduce (three fresh processes measured 0.20-0.22s, which is what a per-turn hook actually pays), and the map's one-line gist of ticket 05 compresses 'a nonsense query's top hit SCORE' into what reads as any top hit's cosine, which caused a wrong turn mid-grilling until ticket 07's entry and a recalled learning confirmed the provenance.

---
id: 84fd2777-3cf5-41e3-89c2-4374d17eb37f
createdAt: 2026-08-03T12:15:46.793Z
importance: 4
tags:
  - wayfinder
  - rc2
  - retrieval
taskId: "27"
---
Worked neuron 2.2.0 wayfinder ticket 27 ('minScore Is Structurally Inert') to resolution on 2026-08-03 via a /grilling session, claiming it as the first unblocked unclaimed ticket on the frontier. Grilled nine decisions with the maintainer and grounded each against the live 274-entry store rather than the ticket's algebra: kept a gate rather than dropping to bare top-k, stripped importance from the fused score (rejecting the tie-break framing as a fiction since RRF ranks are unique per row), kept importance as a prune-only field after enumerating all six of its remaining consumers, adopted a conjunctive lexical+cosine gate after measuring that the two legs fail on disjoint query sets, made zero-results an announced output carrying the rejected-candidate count, moved the gate into the retrieval layer to run on both exec and memory query at the maintainer's override, left minScore untouched since no release ships before ticket 39, and folded the onExec rule-merge defect (Math.max on limit / Math.min on minScore, so overlapping rules always widen) into the implementation ticket. Deliverables: ticket 27 resolved with a ten-section answer; new ticket 41 created (unblocked, rc3) carrying every change justified structurally rather than by a fitted constant; ticket 39's design rewritten because 27 superseded its three-quantity sweep — the hybrid-score arm ceased to exist and the normRrf arm proved bimodal rather than sweepable — leaving it one fitted constant plus the lexical leg's false-silence rate, with its pre-committed bar deliberately untouched; ADR 0012 written; map updated with the decision, the rc3 band row, a rewritten ticket-11 note, a graduated payload-budget fog patch and a new fog patch recording that confidently-wrong retrieval remains unowned. Measured impact recorded throughout: neuron exec -- ls currently injects 5 entries and 4245 characters for a command unrelated to anything in the store.

---
id: 5bc8e911-6d96-4a03-82e7-a4dfb759214f
createdAt: 2026-08-03T12:39:45.963Z
importance: 4
tags:
  - failure-fix
  - adr
  - md-storage
taskId: "31"
---
Resolved neuron 2.2.0 wayfinder ticket 31 (Make 'md' the Actual Default) on 2026-08-03, the lowest-numbered ticket on the frontier. Flipped both schema defaults in src/config/neuronYaml.ts from vector-only to md, added src/config/scaffold.ts so 'neuron init' writes a neuron.yaml when a project has none (never touching an existing one, including an ancestor directory's), reported the governing config in init's JSON output, reconciled the packaged neuron-memory skill's storage-mode vocabulary (md-only/dual are gone; md is default; the interview is now a refinement step because init already produced a working project), and corrected docs/COMMANDS.md plus a CHANGELOG entry. Scope item 5 — 'check neuron scan's default category still resolves' — turned out to hide a silent data-loss bug in bootstrapSeed, which seeded only declared categories and left undeclared ones (scan's 'architecture') to be deleted by the strict mirror the moment a user declared them; measured 1 of 2 entries destroyed on the CLI, fixed by seeding the union of requested and stored categories. Also added NeuronMemoryOptions.storageMode to pin fabricated-projectRoot fixtures, and made a failed markdown write name its reason on stderr instead of returning a bare status 'error'. Tests 290 to 303, full suite green; 12/13 E2E pillars with Pillar 8 the pre-existing 'no column named scope' failure. Deliberately not done: README.md (ticket 32's, which was handed the generated template as its contract) and flipping this repo's own neuron.yaml, which would bootstrap-seed 264 entries into .neuron/*.md and is the maintainer's call.

---
id: bb334b32-f4a6-49a0-bfd8-b87f17ecde1e
createdAt: 2026-08-03T17:13:34.204Z
importance: 4
tags:
  - drift
  - md-storage
  - adr
taskId: "37"
---
Resolved ticket 37 (Architecture Card as a Deterministic Artifact) via TDD, AFK. Removed the non-deterministic mtime and the entire redundant nested frontmatter block from synthesizeArchitecture's card template; replaced ingestScanResults' semantic-search card lookup with a deterministic id derived from a sha256 hash of the category, passed directly to the upsert (no query at all); fixed a related MdStorageAdapter.writeEntry bug where createdAt was re-minted on every upsert instead of being preserved on update. Verified end-to-end against this repo's own store: 6 pre-existing duplicate/corrupt blueprint cards in .neuron/decisions.md reconciled down to 1, repeated real 'neuron scan' runs now produce a byte-identical file and a clean git status, and 3 consecutive dry-run/real-ingest calls all resolve to the same card id. 8 new/updated tests added across summarizer, ingest, mdStorageAdapter and a new scan.determinism.test.ts; full suite at 305/309 passing, the 4 failures confirmed pre-existing and unrelated (see the test-isolation learning entry just recorded).

---
id: e9c50f12-af20-453d-80f1-704a707ec508
createdAt: 2026-08-03T19:30:05.170Z
importance: 4
tags:
  - wayfinder
  - 2.2.0
  - rc2
taskId: "36"
---
Wayfinder pickup session on the neuron-2.2.0 map: claimed the frontier's first unblocked ticket, 36 (Configurable Frontmatter Schema), and ran a full /grilling session with the maintainer through all seven of its open design questions plus two that surfaced mid-session (SQLite vector-only parity via auto-migration, and the neuron doctor validation-surface question, which the maintainer wants folded into neuron status --check/--repair with only enum-field centroid inference allowed, never free-text fabrication). Resolved ticket 36, wrote ADR 0013 documenting the decision, and graduated four implementation tickets (43-46) rather than pre-slicing further. Rewired ticket 34 (cut rc5) and ticket 32 (repositioned README) to block on the new implementation tickets instead of the now-resolved grilling ticket, and appended the resolution as a Decisions-so-far entry on map.md. Left ticket 36's file with a full Answer section; the next wayfinder session should pick up the new frontier, which now includes 43 as the first unblocked implementation ticket.

---
id: 9cb38f56-faa0-4ae2-88d4-7fa192b7094c
createdAt: 2026-08-03T21:20:09.349Z
importance: 4
tags:
  - retrieval
  - rc2
  - longmemeval
taskId: "39"
---
Resolved neuron 2.2.0 ticket 39 (Relevance Floor Validation), unblocking ticket 11 point 4. Ran the full LongMemEval-S benchmark (500 questions, 23,867 documents, zero LLM calls) against ADR 0012's pre-committed three-condition bar for a cosine relevance floor and found no candidate floor from 0.50 to 0.70 clears it, so the maintainer's default ships with no cosine floor; the lexical leg's false-silence rate measured a clean 0% across all 500 questions and all six question-type categories, closing ADR 0012 Consequence 6 so ticket 41 can ship it as a hard conjunct without demotion. Found and fixed a real prerequisite blocker before trusting any measurement: ticket 38's already-on-trunk scope removal had silently broken the LongMemEval benchmark harness's per-question isolation, so every query would have searched all 23,867 documents instead of its own question's partition; fixed by isolating on category instead in the bridge script, and confirmed the fix by reproducing the published baseline recall numbers exactly. Added similarity and ftsMatched debug fields to NeuronMemory's query results (src/index.ts, src/models/memory.ts) so the gate's two raw legs could be measured from outside, since ticket 41 has not shipped and the fused score hides both. Landed the config surface ticket 27 section 8 deferred here: deprecated pullRules minScore with a stderr warning, added a new relevance.gate.enabled boolean switch for ticket 41's lexical-only gate, and deliberately did not add a cosineFloor config key since no validated number exists to default it to. Updated ADR 0012 in place with a full amendment, and updated tickets 11 and 39 plus map.md's Decisions-so-far. 18 new unit tests added (config schema + query instrumentation), full suite green apart from the 4 pre-existing store-isolation failures ticket 42 already tracks.

---
id: f9909523-94a7-4f69-84c7-31434773280f
createdAt: 2026-08-04T01:32:01.959Z
importance: 4
tags:
  - wayfinder
  - 2.2.0
  - rc2
taskId: "11"
---
Wayfinder session for the neuron 2.2.0 map: claimed the frontier ticket, 11 (Recall Adapter Architecture), which was unclaimed with only one of eight decision points outstanding (point 6, multi-harness resolution) after a prior 2026-08-03 grilling session settled the other seven. Verified the remaining open state against the neuron memory store first (query returned the prior grilling's decision record and confirmed no newer contradicting entry existed), then ran a /grilling session with the maintainer covering five sub-questions: whether to wire every detected harness or prompt to choose one (every detected harness, matching the existing detectHarnesses skill-copy precedent), whether the AGENTS.md instruction-only fallback layers alongside a deterministic hook or only when nothing else matched (only when nothing else matched), whether the hook-target consent prompt fires once per init run or once per harness (once, applied to all), whether a harness-subset selection flag was worth adding now (yes, --harness), and whether that flag can force-wire an undetected harness or only filter detected ones (filter detected only). Wrote ADR 0014 (Recall Adapter Architecture) to carry the full eight-point decision record, since the ticket's own deliverables named an ADR that had never been written despite most of the ticket already being settled — matching this map's own convention of pairing every architecture-level grilling ticket with an ADR (0008, 0009, 0010, 0011, 0012, 0013 all precede it). Closed ticket 11: appended the Answer section and ADR link to the ticket file, checked off all five deliverables, added a Decisions-so-far entry to map.md, and replaced the map's stale 'partially grilled, not resolved' callout with the now-superseded-by-27 floor-shape note it had been layered under. This unblocks ticket 12 (Claude Code adapter) and ticket 13 (Codex adapter), the next frontier tickets, both of which already reference the ticket 11 decisions their scope depends on.

---
id: 5c8c8e04-81a0-4600-88ae-ed948ed20410
createdAt: 2026-08-04T01:51:32.669Z
importance: 4
tags:
  - CI
taskId: null
---
Crucial pipeline update

---
id: 21747de2-f9ec-4fc6-bb51-18680670923c
createdAt: 2026-08-04T01:51:33.679Z
importance: 3
tags:
  - cli
  - test
taskId: task-123
---
Wrote test for CLI

---
id: 99b6a424-39fa-44da-bec8-8fc528f584c7
createdAt: 2026-08-04T01:51:34.358Z
importance: 1
tags: []
taskId: null
---
Old entry

---
id: 2a59584f-8ca3-4f15-92ee-37eb6a2fffa1
createdAt: 2026-08-04T01:51:34.441Z
importance: 3
tags: []
taskId: null
---
a history entry

---
id: 5aad5d1e-f792-460f-a9ed-c692612d69f2
createdAt: 2026-08-04T01:51:34.796Z
importance: 3
tags: []
taskId: null
---
Old default entry

---
id: 56a0e253-d40b-4bfc-858f-5a5f1f2b5b46
createdAt: 2026-08-04T01:51:34.954Z
importance: 3
tags: []
taskId: null
---
a history entry

---
id: c73b4444-49cc-4963-a2b1-6901270943fb
createdAt: 2026-08-04T01:51:35.103Z
importance: 4
tags: []
taskId: null
---
Old important entry

---
id: 0364d91e-5847-44d7-91e2-ac1d0f51d0bc
createdAt: 2026-08-04T01:51:35.718Z
importance: 1
tags: []
taskId: null
---
New entry

---
id: 7a3267ac-b83b-4826-8afd-afc43f656f36
createdAt: 2026-08-04T01:56:42.715Z
importance: 4
tags:
  - CI
taskId: null
---
Crucial pipeline update

---
id: 50899155-fe20-4339-9053-cca2a07dbcda
createdAt: 2026-08-04T01:56:43.411Z
importance: 3
tags:
  - cli
  - test
taskId: task-123
---
Wrote test for CLI

---
id: 4d32afb3-db9a-4008-b627-c1c921f1844f
createdAt: 2026-08-04T01:56:44.026Z
importance: 1
tags: []
taskId: null
---
Old entry

---
id: b8ed1044-318b-47f8-9006-6e1f94d0a85a
createdAt: 2026-08-04T01:56:44.396Z
importance: 3
tags: []
taskId: null
---
Old default entry

---
id: 09b267f3-a61c-4feb-9b3a-faee511df946
createdAt: 2026-08-04T01:56:44.575Z
importance: 3
tags: []
taskId: null
---
a history entry

---
id: e365ab75-cd79-4cbf-94da-16f55de7111d
createdAt: 2026-08-04T01:56:44.679Z
importance: 4
tags: []
taskId: null
---
Old important entry

---
id: 183323b9-dfb2-4ffd-a9a7-ef31d707532f
createdAt: 2026-08-04T01:56:45.008Z
importance: 3
tags: []
taskId: null
---
a history entry

---
id: 1cf2bd8c-395d-4a29-90c4-8c0bb0154b96
createdAt: 2026-08-04T01:56:45.152Z
importance: 1
tags: []
taskId: null
---
New entry

---
id: ff34700c-7b16-4628-8eb0-1dff2c42af60
createdAt: 2026-08-04T01:58:50.699Z
importance: 5
tags:
  - 2.2.0
  - wayfinder
  - rc2
taskId: "12"
---
Resolved wayfinder ticket 12 (Claude Code Adapter) end to end: built src/harnesses/{types,payload,ledger,hookState,cacheDir,claudeCode}.ts, the neuron hook claude-code <point> CLI entrypoint in src/commands/hook.ts wired into cli.ts, and full install/uninstall/verify wiring into neuron init (new flags --hook-target, --overwrite-hooks/--keep-hooks, --harness, --no-hooks, --uninstall-hooks). Verified all four of the ticket's verification bullets directly: fetched Claude Code's actual hook JSON schema and confirmed session_id is present on every event, resolving ADR 0014 section 3's previously-unverified risk; demonstrated deterministic recall on a scratch project with zero CLAUDE.md/AGENTS.md present by piping a bare UserPromptSubmit payload into the hook and getting the relevant memory back; measured real-embedder latency at 0.366s cold and ~0.2s warm, matching ADR 0014's own prior measurement and comfortably inside Claude Code's 30s timeout; and tested the non-clobbering merge and uninstall against a synthetic pre-existing user hook. Added 45 new tests across 5 files, full suite 355/359 green -- the 4 failures are a pre-existing, already-tracked test-isolation bug (ticket 42: CLI tests missing a package.json boundary let findProjectRoot walk into this repo's real .neuron store), confirmed independent of this ticket by reproducing it before any of these changes; the new init.test.ts cases that would have added to it were given the same package.json guard the file's own existing tests already use. Updated the wayfinder map's Decisions-so-far and marked ticket 12 resolved, unblocking nothing further by itself but handing ticket 13 (Codex adapter) a working harness-agnostic payload/ledger/hookState/types layer to build against.

---
id: 5615d9bf-aec6-4689-a980-7b961ff37526
createdAt: 2026-08-04T02:13:12.306Z
importance: 4
tags:
  - CI
taskId: null
---
Crucial pipeline update

---
id: e3aa318f-adb3-43ee-bbea-8ea6463c13ec
createdAt: 2026-08-04T02:13:13.247Z
importance: 3
tags:
  - cli
  - test
taskId: task-123
---
Wrote test for CLI

---
id: f2c1f59a-dcb5-48f1-9da4-fb377d0a8e85
createdAt: 2026-08-04T02:13:13.719Z
importance: 1
tags: []
taskId: null
---
Old entry

---
id: 375fe403-853f-40df-b27f-5fdfdad514ff
createdAt: 2026-08-04T02:13:13.757Z
importance: 3
tags: []
taskId: null
---
a history entry

---
id: af934054-adcf-4804-baf0-c5d2242dacb0
createdAt: 2026-08-04T02:13:14.156Z
importance: 3
tags: []
taskId: null
---
Old default entry

---
id: e670230f-4be6-4024-9150-d9858aa7905e
createdAt: 2026-08-04T02:13:14.308Z
importance: 3
tags: []
taskId: null
---
a history entry

---
id: e0e4fc92-bb4a-4980-aa40-5dc32b2103d4
createdAt: 2026-08-04T02:13:14.499Z
importance: 4
tags: []
taskId: null
---
Old important entry

---
id: b91aed90-7050-4366-aa1c-2cffde42fa79
createdAt: 2026-08-04T02:13:14.885Z
importance: 1
tags: []
taskId: null
---
New entry

---
id: cc95ef8b-bf93-4121-b851-a1ba92542440
createdAt: 2026-08-04T02:14:35.802Z
importance: 4
tags:
  - CI
taskId: null
---
Crucial pipeline update

---
id: 17dff89f-a196-4247-8211-7e09102bbef2
createdAt: 2026-08-04T02:14:36.918Z
importance: 3
tags:
  - cli
  - test
taskId: task-123
---
Wrote test for CLI

---
id: 272a8b8f-831d-4135-b16b-232bc84ffa9e
createdAt: 2026-08-04T02:14:37.388Z
importance: 1
tags: []
taskId: null
---
Old entry

---
id: 42e589ac-3fd0-4d2e-ae6b-4be5b7d725f4
createdAt: 2026-08-04T02:14:37.694Z
importance: 3
tags: []
taskId: null
---
a history entry

---
id: 1cbafc40-8e04-49d1-8cd4-aa66107270fc
createdAt: 2026-08-04T02:14:37.801Z
importance: 3
tags: []
taskId: null
---
Old default entry

---
id: 18571a4f-9704-434f-bf8a-650e1d3325f9
createdAt: 2026-08-04T02:14:38.128Z
importance: 3
tags: []
taskId: null
---
a history entry

---
id: 65bb77ff-fa9d-4ada-86c3-83e4db93b0d2
createdAt: 2026-08-04T02:14:38.205Z
importance: 4
tags: []
taskId: null
---
Old important entry

---
id: a2a9174a-53e2-4385-9e3a-0d97ce29f750
createdAt: 2026-08-04T02:14:38.581Z
importance: 1
tags: []
taskId: null
---
New entry

---
id: 171484f9-05d1-4421-896c-1b437256efaa
createdAt: 2026-08-04T02:15:55.449Z
importance: 4
tags:
  - 2.2.0
  - wayfinder
  - rc2
taskId: "13"
---
Resolved wayfinder ticket 13 (Codex Adapter) end to end: built src/harnesses/codex.ts against ticket 12's shared types/payload/ledger/hookState layer with zero changes needed to that layer, confirming it is genuinely harness-agnostic. Fetched Codex's actual hooks docs (learn.chatgpt.com/docs/hooks, the developers.openai.com/codex/hooks redirect target) and found event names, stdin fields (session_id on every event including PreCompact/PostCompact, prompt on UserPromptSubmit), and the stdout hookSpecificOutput envelope byte-identical to Claude Code's -- resolving ADR 0014 section 3's session-ledger risk for Codex the same way ticket 12 resolved it for Claude Code, and letting src/commands/hook.ts stay fully harness-agnostic (only the harness allowlist widened from a hardcoded string to a two-item list). The one real difference is contained inside the adapter: Codex's schema documents a single command string rather than Claude Code's command+args split, so 11's HarnessAdapter interface needed no revision. Verified multi-harness coexistence directly (a project with both .claude/ and .codex/ gets both adapters wired independently) and end-to-end deterministic recall via dist/cli.js hook codex <point>; 29 new tests all green, full suite 380/384 with the 4 failures being ticket 42's already-tracked pre-existing package.json-boundary pollution in files this ticket never touched. Unblocks ticket 14 (protocol block rewrite) and ticket 15 (cut rc3).

---
id: 703b9d01-6f3e-4858-80d4-5b54151eacdc
createdAt: 2026-08-04T02:23:07.920Z
importance: 4
tags:
  - CI
taskId: null
---
Crucial pipeline update

---
id: 74899737-ece0-4edc-a1be-35778e9ac6d8
createdAt: 2026-08-04T02:23:09.384Z
importance: 3
tags:
  - cli
  - test
taskId: task-123
---
Wrote test for CLI

---
id: ec717c56-b675-4856-88dc-c09b54c500ec
createdAt: 2026-08-04T02:23:10.075Z
importance: 3
tags: []
taskId: null
---
a history entry

---
id: 45d2c219-29c6-41d2-82b2-7f1a183fa30e
createdAt: 2026-08-04T02:23:10.385Z
importance: 3
tags: []
taskId: null
---
Old default entry

---
id: adbeac9b-07e6-4054-a371-c07c8d414841
createdAt: 2026-08-04T02:23:10.624Z
importance: 3
tags: []
taskId: null
---
a history entry

---
id: 2e35187f-04ab-42ec-8339-5fae036923d4
createdAt: 2026-08-04T02:23:10.787Z
importance: 4
tags: []
taskId: null
---
Old important entry

---
id: 1a647f1d-e036-47b0-89d5-c1378c9e801d
createdAt: 2026-08-04T02:52:03.340Z
importance: 4
tags:
  - CI
taskId: null
---
Crucial pipeline update

---
id: 5d517af7-0f34-4118-83b5-7c99ed47f6be
createdAt: 2026-08-04T02:52:04.238Z
importance: 3
tags:
  - cli
  - test
taskId: task-123
---
Wrote test for CLI

---
id: 68438e7b-8814-4d03-839a-65aade509571
createdAt: 2026-08-04T02:52:04.831Z
importance: 3
tags: []
taskId: null
---
a history entry

---
id: f154a623-e513-4160-bf17-e8709c45050d
createdAt: 2026-08-04T02:52:05.306Z
importance: 3
tags: []
taskId: null
---
Old default entry

---
id: 2b1cd8f5-dc13-41e9-9e1b-16ddc024b5c9
createdAt: 2026-08-04T02:52:05.492Z
importance: 3
tags: []
taskId: null
---
a history entry

---
id: c8a3f9d5-f650-4416-b16f-b3e34cfbebbe
createdAt: 2026-08-04T02:52:05.801Z
importance: 4
tags: []
taskId: null
---
Old important entry

---
id: be05fc7a-5579-46a3-bde0-80a9f9dddef0
createdAt: 2026-08-04T02:53:42.735Z
importance: 4
tags:
  - CI
taskId: null
---
Crucial pipeline update

---
id: 2da0ee55-05f6-4464-9400-4d8a3ba8bebd
createdAt: 2026-08-04T02:53:43.947Z
importance: 3
tags:
  - cli
  - test
taskId: task-123
---
Wrote test for CLI

---
id: 9b70a95f-0f75-49e7-88c1-9cfc03315f17
createdAt: 2026-08-04T02:53:44.418Z
importance: 3
tags: []
taskId: null
---
a history entry

---
id: e1b22b9e-47f0-4619-8040-a9d6e3d53519
createdAt: 2026-08-04T02:53:44.642Z
importance: 1
tags: []
taskId: null
---
Old entry

---
id: 61630f98-5148-433b-807b-ebff94ee12a9
createdAt: 2026-08-04T02:53:45.065Z
importance: 3
tags: []
taskId: null
---
Old default entry

---
id: 98bb251d-e9ae-4ddf-a019-048b1eab9859
createdAt: 2026-08-04T02:53:45.471Z
importance: 4
tags: []
taskId: null
---
Old important entry

---
id: ca1f174b-63af-4833-93be-870d8ba13a74
createdAt: 2026-08-04T02:53:45.750Z
importance: 1
tags: []
taskId: null
---
New entry

---
id: 35a09410-98da-47e0-9e23-19e78d8aab1d
createdAt: 2026-08-04T02:55:43.865Z
importance: 4
tags:
  - CI
taskId: null
---
Crucial pipeline update

---
id: c0581bb2-7fbf-4e40-ba5b-efab535c4a69
createdAt: 2026-08-04T02:55:44.975Z
importance: 3
tags:
  - cli
  - test
taskId: task-123
---
Wrote test for CLI

---
id: 5f02fff8-6306-45e8-a3d2-ca3dfe043db4
createdAt: 2026-08-04T02:55:45.499Z
importance: 1
tags: []
taskId: null
---
Old entry

---
id: 62970f03-5271-4306-be99-996aa1198566
createdAt: 2026-08-04T02:55:45.673Z
importance: 3
tags: []
taskId: null
---
a history entry

---
id: 83f94dab-5c8f-4c15-991d-634dc6475ff5
createdAt: 2026-08-04T02:55:45.925Z
importance: 3
tags: []
taskId: null
---
Old default entry

---
id: f68f1fce-153e-4b6f-adf5-d0f92fb98ec6
createdAt: 2026-08-04T02:55:46.125Z
importance: 3
tags: []
taskId: null
---
a history entry

---
id: 6dadf2cc-3d0e-4f65-b5f6-0b36632d8f0f
createdAt: 2026-08-04T02:55:46.231Z
importance: 4
tags: []
taskId: null
---
Old important entry

---
id: 8760ab92-d71b-45c7-b8c2-b91b459c2201
createdAt: 2026-08-04T02:59:27.311Z
importance: 4
tags:
  - 2.2.0
  - wayfinder
  - rc2
taskId: "14"
---
Resolved wayfinder ticket 14 (Protocol Block Rewrite: Hooks Own Read, Agent Owns Write) on the neuron-2.2.0 map. Built src/config/protocolBlock.ts from scratch since no CLAUDE.md/AGENTS.md writer existed anywhere in neuron init despite harnesses.json's unused mdFile field -- this repo's own prior CLAUDE.md protocol block had been hand-authored, not generated. One generator (generateProtocolBlock) produces two marker-wrapped variants read live from neuron.yaml: 'deterministic' drops the old mandatory step 1 (manual recall query) entirely and renumbers Command Execution/Failure-Fix Recording/Session Conclusion to 1-3, 'fallback' keeps Recall as step 1 for any harness with nothing else performing recall; both drop the old MANDATORY/VERY-FIRST-tool-call framing since nothing enforces those steps beyond the agent's own diligence. Wired into init.ts via resolveHarnessFidelity, which reads ground truth (adapter.capability() + adapter.verify(projectDir)) rather than this run's flags, so a hook installed by an earlier init still yields the short block under --no-hooks, and harness names sharing one mdFile (agents/github/codex all point at AGENTS.md) get the short block the moment any of them has a working hook, per ADR 0014 section 8.1. upsertProtocolBlock finds the neuron:protocol marker pair and touches only that region, reusing the existing --overwrite-hooks/--keep-hooks/interactive-ask machinery from hook installation rather than inventing a parallel flag pair, and leaves an identical block untouched so re-running init is idempotent. Migrated this repo's own CLAUDE.md to the short variant and added a narrow capability-aware callout to the packaged neuron-memory skill's section 1 (not the full read-side restructure, which the map still has fogged pending ticket 14's completion signal). Found and fixed a real bug while wiring this in: copySkill's own .agents/skills fallback creates .agents/ as a side effect when no harness is detected, which a naive filesystem re-scan for detected harnesses afterward would mistake for a detected 'agents' harness -- fixed by snapshotting detectedHarnessNames once before copySkill or installHooks touch the filesystem. 15 new unit tests (protocolBlock.test.ts) plus 6 new CLI-level tests (init.test.ts), all green; the same 4 pre-existing files fail identically to a run against the unmodified pre-ticket-14 code, confirming they are ticket 42's known CLI/real-store pollution bug and not a regression. Updated the map's Decisions-so-far and marked ticket 14 resolved; this unblocks ticket 15 (cut and publish 2.2.0-rc3), now the next frontier ticket.

---
id: b9ce185b-56c4-4e19-a676-e3dd0600c9e1
createdAt: 2026-08-04T12:32:44.151Z
importance: 4
tags:
  - rc2
  - adr
  - 2.2.0
taskId: "43"
---
Resolved ticket 43 (Declarable Category Field Schema: Tiers, Types, CLI Flag Surface) from the neuron-2.2.0 wayfinder map's rc5 band. Implemented the schema + CLI mechanism ADR 0013 designed: CategoryFieldSchema (string/enum, required, default) on categories.<name>.fields in neuron.yaml; config-load-time validation (field-key format, enum-default membership, reserved-flag collision, and the scan.category-requires-defaults cross-check); config-derived KNOWN_FLAGS/parseFlags capturing declared field values into options.fields; dynamic neuron memory --help listing a project's declared fields; and required-ness/enum enforcement centralized in NeuronMemory.transact(), the single choke point both the CLI and neuron scan's direct transact() call share. Wired the markdown side of storage (MdStorageAdapter formatEntry/parseMarkdownDetailed/writeEntry/updateEntry, DualStorageRouter.transactMdMutation) so declared field values round-trip through frontmatter today; SQLite column storage for vector-only/split categories is explicitly deferred to ticket 44 (blocked-by this ticket), with a stderr warning covering that gap rather than silent loss. Found and fixed one real bug while wiring it in: mdVectorSync.ts's pushMdToVector (used by the explicit neuron sync command) called vectorDb.transact() — the real NeuronMemory.transact(), not the reconcile-only delegate — without passing the entry's existing fields, which would have made required-field enforcement break sync for any category with a required field; fixed by passing mdEntry.fields through. 40 new/updated tests (29 additions across neuronYaml.test.ts, utils.test.ts, plus a new fieldSchema.test.ts with 11 enforcement/round-trip tests); full suite 429-430/434 passing, the 4-5 failures being the pre-existing, unrelated ticket-42 real-store test pollution (reproduced identically against unmodified code before this session's changes, to rule out a regression). Updated docs/COMMANDS.md and CONTEXT.md; ADR 0013 already existed from ticket 36's grilling and needed no amendment.

---
id: 19450d5f-1b59-4480-85f2-7edac80bd3c6
createdAt: 2026-08-04T13:08:13.696Z
importance: 3
tags:
  - wayfinder
  - 2.2.0
  - rc2
taskId: "41"
---
Wayfinder session on the neuron 2.2.0 map: picked up the frontier ticket 41 (Decontaminate the Ranking Score and Land the Lexical Gate), the lowest-numbered of four unblocked/unclaimed tickets (41, 42, 44, 45). Claimed it, implemented all six in-scope structural changes plus one item ADR 0012's amendment had assigned to this ticket (neuron status rejection-count visibility), added/rewrote tests, updated docs/COMMANDS.md, CONTEXT.md and ADR 0012 with an implementation amendment, then resolved the ticket with a full Answer and updated the map's Decisions-so-far. Did not touch tickets 42/44/45 or start any further work, per the one-ticket-per-session rule. Left uncommitted: this ticket's own code/doc changes plus a prior session's already-resolved-but-uncommitted ticket 43 (declarable field schema) work that was present in the working tree at session start and was not authored by or altered in this session.

---
id: fc5ab1e2-3115-4887-ae3a-fd223537504d
createdAt: 2026-08-05T00:25:17.180Z
importance: 3
tags:
  - rc2
  - 2.2.0
  - wayfinder
taskId: "42"
---
Resolved wayfinder ticket 42 (Isolate CLI Tests From the Real .neuron Store): audited every execSync-based CLI test file npm test runs and isolated the ones that pollute the real .neuron/*.md store (cli.test.ts, exec.test.ts, history.test.ts, learn.test.ts, memory.test.ts) by planting a package.json in a per-test tmp project dir and passing cwd to every execSync/spawnSync call, matching the pattern init.test.ts already used correctly. Also found and fixed a masked regression in cli.test.ts's --scopes no-op test, which only passed before because real-store noise supplied incidental FTS matches — isolating it exposed that ticket 41's lexical relevance gate correctly rejects the test's own genuinely-unrelated seeded entry, so the test's seed content was corrected to share the query token, matching the pattern the test already used one block above it. Verified stable across two consecutive npm test runs from a clean git baseline: 44/44 files, 437/437 tests green, zero .neuron/*.md diff both times. Found the same root-cause bug (NeuronMemory.open(dir) walking up past an unmarked subdirectory to this repo's real root) also live in test/e2e/adversarial-recall.test.ts and test/e2e/benchmark-suite.test.ts, measured at 10,633 real lines injected into learning.md in one run — but npm test never runs test/e2e/*, so that's out of this ticket's literal scope and was split off as a fresh ticket 47 rather than silently widening this diff. Updated the neuron-2.2.0 map's Decisions-so-far with ticket 42's resolution and appended ticket 47 as a new child issue.

---
id: 2af691ef-dc77-43ca-b416-c482eaebcf6a
createdAt: 2026-08-05T00:39:36.409Z
importance: 4
tags:
  - 2.2.0
  - wayfinder
  - rc2
taskId: null
---
Wayfinder session: added two config tickets to the next-release map and renamed that map from neuron-harness-expansion to neuron-2.3.0 per maintainer decision. Wrote .scratch/neuron-2.3.0/issues/05-per-category-storage-path.md (categories.*.path overriding storage.path, one shared precedence resolver, multi-root reconcile/bootstrap-seed/sync, path-traversal containment per root, collision validation) and 06-storage-mode-override-remove-split.md (collapse the vector-only|md|split and vector|md vocabularies into one md|vector pair settable at both levels, split/vector-only/md-only/dual all deprecated aliases, router split branches deleted, ticket 44's field-column warning restated). Rewrote the map's destination and Notes for the catch-all posture, wired 04 as blocked by 01,02,03,05,06 and settled its version as 2.3.0, added two fog patches (whether categories is authoritative or advisory, and what else 2.3.0 admits), and repointed every neuron-2.2.0 link to the new directory. No source code was touched.

---
id: b00188a3-d77a-4eec-8f51-6099ef3c8d70
createdAt: 2026-08-05T00:52:55.719Z
importance: 4
tags:
  - rc2
  - benchmark
  - wayfinder
taskId: null
---
Charted the context-cost band on the neuron-2.3.0 wayfinder map in response to the maintainer's question about proving neuron is token-worthwhile. Wrote four tickets: 07 (session-scoped token budget plus per-session cost telemetry reported through neuron status, with the compaction-reset ruling as its crux), 08 (offline injection-redundancy audit measuring what share of injected tokens restate CLAUDE.md or git log, reported per category, no LLM), 09 (shrink the ~600-token resident protocol block, with disclosing an irreducible floor as a legitimate resolution), and 10 (counterfactual token A/B with a reasoned decision not to run it as a valid resolution, and the inverted-cosine risk arm reported as headline not footnote). Wired 01 and 02 as blocked by 07, 08 by 07, 09 by 08, 10 by 08 and 09, and the cut 04 by all nine. Updated the map's destination to three bands, added Notes recording the measured cost model and that no existing benchmark measures token economics, and added a fog patch for what happens if the finding is unfavourable. Frontier is now 05 and 07.

---
id: 226b47d9-d34d-4514-8bcb-06a95abb400e
createdAt: 2026-08-05T03:46:52.575Z
importance: 4
tags:
  - rc2
  - 2.2.0
  - wayfinder
taskId: "07"
---
Resolved neuron-2.3.0 ticket 07 (Session Token Budget & Cost Telemetry). Grilled six sequential design questions before coding: the budget is per-epoch not per-session since context-reset deletes injected text so re-injection after compaction is recovery not repetition; exhaustion is a hard stop rather than decay because the hook's stdin only carries session_id and prompt, no signal to decay against; default is 18000 chars (6000 for the architecture card plus 8 worst-case 1500-char turns) published as approximately 6000 tokens at a conservative 3 chars-per-token ratio; and clearLedger became rollEpoch, archiving each finished epoch's cost into a history array on the same file the dedupe ledger already used rather than adding a second file with a second reset rule. Implemented in src/harnesses/ledger.ts (loadEpochState, remainingEpochBudget, recordSessionStartInjection, recordPrePromptTurn, rollEpoch, summarizeRecallCost), wired into src/commands/hook.ts's session-start and pre-prompt branches, added recall.epochCharBudget to src/config/neuronYaml.ts, and exposed the aggregate via a new recallCost section in neuron status. Surfaced ticket 11 as a new ticket: the architecture card injected at session-start never returns after a compaction because context-reset is execution-only per ADR 0014, an asymmetry found while implementing rather than during charting. 07's own budget default already reserves room for ticket 11 landing. All 453 unit tests pass across 44 files including new hard-stop and telemetry coverage in hook.test.ts, and the real .neuron store was confirmed byte-identical in content (grepped for test fixture strings, zero matches) after the full suite ran. Tickets 01 and 02 (Copilot and Cursor adapters) are now unblocked on the neuron-2.3.0 map.

---
id: 909d38b3-da5c-4662-8bb1-d7d3dd9af1b8
createdAt: 2026-08-05T04:05:35.328Z
importance: 4
tags:
  - wayfinder
  - 2.2.0
  - rc2
taskId: "08"
---
Wayfinder pickup session on the neuron-2.3.0 map: claimed ticket 08 (Injection Redundancy Audit), then found its Scope item 4 assumed real per-session telemetry that did not actually exist — ticket 07's rewrite of the ledger format (chars/turns/history, no payload text) was implemented but sitting uncommitted, so zero sessions had ever run under it, and the two pre-existing real ledger files for this repo covered only 2 sessions and 5 entries under the old injectedIds-only format, skewed away from the history category the ticket most suspects. Grilled the maintainer on how to source evidence (reconstruct from past queries vs ship-and-wait vs widen 'real' to this map's own sessions); ruled ship-and-wait, so committed ticket 07's implementation (src/harnesses/ledger.ts, src/commands/hook.ts, src/commands/status.ts, src/config/neuronYaml.ts plus tests, 71 tests green) this session so real telemetry starts accruing. Also confirmed the maintainer's actual stated goal this session — a benchmarking session proving neuron reduces or is neutral to agent token consumption — is ticket 10's destination, not ticket 08's; maintainer chose to finish 08 as scoped rather than re-sequence. Created ticket 12 (Accumulate Real Per-Session Telemetry) as the new blocker, reverted ticket 08 to unclaimed with Blocked by: 07, 12, and updated map.md's sequencing notes and frontier line (now 01, 02, 05, 11, 12) accordingly. None of ticket 08's substantive Scope questions (definition of already-had context, redundancy measure, textual-vs-timeliness ruling) were resolved this session.

---
id: 2f889eac-f42b-4aed-9b82-9b9bb4a9685e
createdAt: 2026-08-05T13:18:32.769Z
importance: 4
tags:
  - rc2
  - wayfinder
  - adr
taskId: "44"
---
Resolved wayfinder ticket 44 (SQLite Additive Auto-Migration for Declared User-Defined Fields) on the neuron-2.2.0 map. Implemented migrateDeclaredFields() in src/index.ts: an eager, idempotent, additive-only migration that diffs every field declared across neuron.yaml's categories against PRAGMA table_info(memories) on every store-open and runs ALTER TABLE memories ADD COLUMN <snake_case> TEXT for whatever is missing, never dropping a column when a field is later removed from config. Wired the resulting columns into transactVector's INSERT/UPDATE (write) and queryVector's two SELECTs plus a new extractFields helper (read), and deleted ticket 43's now-obsolete 'cannot be persisted yet' stderr warning since every storage mode persists declared fields now. While wiring in the read path, found and fixed a wider pre-existing gap: NeuronMemory.query() never returned fields in any mode, including md, because DualStorageRouter.query() always delegates to the SQLite-backed vectorDb.query() and nothing populated field columns there before this ticket -- ticket 43's own tests only verified the round trip via MdStorageAdapter.readCategory() directly. Also fixed two dropped-fields bugs in DualStorageRouter's reconcile/bootstrapSeed paths. Added neuronYaml.ts's fieldKeyToColumnName plus a three-layer column-identifier validation (config load time, and again immediately before each DDL/DML interpolation site) with two new collision checks -- reserved memories columns (content, createdAt->created_at) and cross-key column folding (fooBar/FooBar). 13 new tests plus 1 rewritten across a new sqliteFieldSchema.test.ts, neuronYaml.test.ts, and fieldSchema.test.ts; full suite 466/466 green across all 45 files. Wrote the resolution into issues/44-sqlite-additive-field-migration.md's Answer section, set Status: resolved, and appended the decision to map.md's Decisions-so-far, unblocking ticket 46 (status --check/--repair).

---
id: 2b203c8b-07a7-422a-aa37-2845f8ef3b7b
createdAt: 2026-08-05T15:12:35.445Z
importance: 3
tags:
  - wayfinder
  - 2.2.0
  - rc2
taskId: "32"
---
Wayfinder pickup session on the neuron-2.2.0 map: claimed the frontier's first unblocked ticket, 32 (Ship the Repositioned README), a rc5 execution ticket (the map carries execution per its Notes) rather than a grilling ticket. Rewrote README.md from the maintainer's markdown-first draft, re-auditing every claim against the built CLI in an isolated scratch project (fresh npm link, neuron init, and every documented command executed verbatim) rather than trusting source, per the ticket's own methodology since that approach is what found the original four gaps. Resolved items 5-7: dropped the inert minScore key from the config example, narrowed the cross-agent claim to Claude Code and Codex CLI only with best-effort harnesses named as roadmap (no link to the internal neuron-2.3.0 map from a public README), and rewrote the no-database claim after verifying the SQLite file lives entirely outside the project root in a per-machine env-paths cache keyed by a project-root hash. Rewrote the Architecture awareness section under the determinism frame (byte-identical repeated scans and update-in-place both re-verified live) rather than the draft's apologetic framing, and added a new section demonstrating the ticket/reviewedBy required-fields guarantee with real captured CLI output. Found and fixed a live bug while re-auditing item 5: scaffold.ts's NEURON_YAML_TEMPLATE still emitted the pullRules.default.minScore key that tickets 39/41 deprecated, meaning every fresh neuron init since rc3 would warn on its first subsequent command; fixed by deleting the line and adding two regression tests, 473/473 tests green. Also corrected a stale neuron sync mode claim (md/split, not vector-only/split) found by checking docs/COMMANDS.md against a live --help. Deliberately did not claim neuron status --check/--repair since ticket 46 is still open on the frontier, and deliberately left this repo's own hand-written neuron.yaml carrying the stale minScore key alone since fixing dogfood config was out of this ticket's scope. Ticket 32 resolved and marked on the map; this unblocks ticket 33 (docs repositioning audit), which now joins 46 and 47 as the frontier for the next wayfinder session. No CHANGELOG entry added, deferred to ticket 34 (cut rc5) per the 04/09/15 precedent of writing CHANGELOG entries at the cut rather than per contributing ticket.

---
id: 1c41478d-e74a-490e-8fb9-435e8b0b50d9
createdAt: 2026-08-05T19:39:19.566Z
importance: 5
tags:
  - wayfinder
  - 2.2.0
  - rc2
taskId: "21"
---
Repositioned the neuron-2.2.0 wayfinder map at the maintainer's direction and shipped v2.2.0 stable. Dropped ticket 34's separate rc5 cut (no intermediate tag/publish; its verification obligations folded into ticket 21) and closed ticket 46 (neuron status --check/--repair) out of scope, continuing it unchanged as neuron-2.3.0's ticket 13. Resolved ticket 33 (docs repositioning audit): swept CONTEXT.md, docs/COMMANDS.md, CLAUDE.md, the packaged skill, and the ADRs -- found the README's markdown-first positioning already coherent everywhere, but caught two factual staleness bugs a framing grep wouldn't (ticket-44 SQLite persistence claim, and the E2E suite's pillar count understated at 6/9 instead of 12); amended ADRs 0013 and 0014 with dated notes rather than rewriting them. During release verification, npm run test:e2e reproducibly failed Pillar 7 (Adversarial Retrieval Quality), 4/4 runs, worsening each time -- investigated and found it was test-store pollution (adversarial-recall.test.ts missing the package.json isolation guard ticket 42 already established elsewhere, ticket 47, previously unclaimed), not a product regression: isolating it made the pillar perfectly deterministic and exposed one real, small issue underneath -- its MRR bar was calibrated at 2.1.0 against a scoring formula ticket 41 correctly removed, so recalibrated the bar to the measured baseline. Executed ticket 21: rewrote CHANGELOG.md into one consolidated 2.2.0 section (previously three separate, incomplete rc sections), bumped package.json/package-lock.json to 2.2.0, verified the tarball (711.4 kB, no leaked grammars/models/fixtures -- the size grew from organic feature additions plus a pre-existing dashboard screenshot, not a regression), ran the full verification (473/473 unit tests, 12/13 E2E pillars with Pillar 8 the sole known pre-existing failure matching this map's long-standing baseline), refreshed the architecture blueprint via neuron scan, committed, tagged v2.2.0, and pushed both the branch and the tag -- npm publish left to the maintainer, matching every prior cut's precedent.

---
id: 23680a0a-a4b4-4016-9ca0-9dd78584a190
createdAt: 2026-08-08T02:53:18.417Z
importance: 4
tags:
  - 2.2.0
  - wayfinder
  - rc2
taskId: "12"
---
Resolved neuron-2.3.0 wayfinder ticket 12 (Accumulate Real Per-Session Telemetry), picked up in response to the maintainer wanting to start on the tests that prove neuron saves agent tokens. Ticket 12 existed because ticket 07's new {epoch, injectedIds, charsSpent, turns, history} ledger format had shipped uncommitted with zero real sessions recorded, leaving ticket 08's redundancy audit with only 2 thin pre-07-format sessions to sample from. Checked neuron status's recallCost section (sessionsObserved: 7, epochsObserved: 5, up from the 2-session/0-epoch baseline) and cross-referenced every injectedId in the 5 new-format ledger files under ~/Library/Caches/neuron/hooks/a8541890092e7e49/ against the id: frontmatter in .neuron/history.md, decisions.md and learning.md, finding real history-category injections in 5 of 5 new-format sessions (28 of 45 total ids) and zero unresolved ids. Ruled enough had accumulated and resolved ticket 12, which unblocked ticket 08 (injection redundancy audit) — the next ticket in the context-cost band toward tickets 09 and 10, the actual token-savings claims; noted learning-category coverage is thin (1 id) and no session has yet rolled a second epoch, both carried forward as stated limitations for ticket 08 rather than blockers.

---
id: 3cfe6403-f084-4c1c-84b1-9f99ab5f3dcc
createdAt: 2026-08-08T03:09:28.591Z
importance: 4
tags:
  - wayfinder
  - rc2
  - 2.2.0
taskId: null
---
Resolved wayfinder ticket 08 (Injection Redundancy Audit) on the neuron-2.3.0 map: built an offline audit over the 5 real session ledgers ticket 12 characterized, embedding each injected memory entry (via neuron's own bge-small-en-v1.5 embedder, no LLM/no billing) against a resident corpus of CLAUDE.md plus the full git log. Found history redundancy against git log is total (18/18 entries, 29/29 occurrences score >=0.70 cosine similarity, the noise floor ticket 39 already established for this embedder), decisions is substantially redundant (72-83%, with the one exception being a vacuous single-word entry rather than a genuinely novel one), and learning remains a single data point too thin to conclude from. Corrected the ticket's own literal instruction to prefer a measure that understates redundancy -- ruled with the maintainer that this contradicted the band-wide posture ticket 07 set of erring toward overstating neuron's own cost, so implemented embedding similarity (which overstates via paraphrase/topical false positives) instead of lexical overlap. Wrote up full findings and reproducible scripts at .scratch/neuron-2.3.0/audits/08-injection-redundancy/, updated the map's Decisions-so-far, and unblocked ticket 09 (Shrink the Resident Footprint), which now has history's saturation finding as its strongest input.

---
id: f26f3b6f-14c4-46d9-b82b-af20e7e45c88
createdAt: 2026-08-08T03:33:45.232Z
importance: 3
tags:
  - 2.2.0
  - wayfinder
  - rc2
taskId: "09"
---
Wayfinder pickup on the neuron-2.3.0 map: claimed ticket 9 (Shrink the Resident Footprint), the context-cost band's ticket on reducing the ~600-token resident protocol block injected by CLAUDE.md/AGENTS.md. Measured the current deterministic and fallback block sizes against this repo's real neuron.yaml (2,323 / 2,759 chars), broke the deterministic block down by section, and found the metadata-flags section alone was 31% of it and mostly rationale prose rather than instruction. Drafted a compressed rewrite, measured a 491-char (~123 token, 21%) net saving, and put a three-way ruling to the maintainer (compress+disclose, disclose-only, or also open ADR 0014 via grilling for a hook-driven exec step) with the recommended option pre-selected; maintainer chose compress+disclose. Implemented the compression in src/config/protocolBlock.ts (metadataFlagsSection, failureFixStep, sessionEndStep), updated the two protocolBlock.test.ts assertions that hardcoded the old wording, regenerated this repo's own CLAUDE.md managed region to match, and confirmed the full src/config/ suite (66/66) and protocolBlock.test.ts (15/15) pass under neuron exec. Resolved ticket 9 with a full Answer section, appended the resolution to map.md's Decisions-so-far, updated the map's Frontier note and the 'neuron exec as a hook' fog entry to record that 09 revisited but did not resolve it, and confirmed ticket 9's resolution unblocks ticket 10 (the counterfactual token A/B), which was blocked by both 08 and 09.

---
id: 1a6b6e9e-7870-4606-8257-e58d85b48e01
createdAt: 2026-08-08T03:58:26.430Z
importance: 4
tags:
  - 2.2.0
  - wayfinder
  - rc2
taskId: null
---
Picked up wayfinder ticket 10 (Counterfactual Token A/B) on the neuron-2.3.0 map. Settled the harness's open funding/model questions with the maintainer (scripted Claude API harness against their own Console balance rather than a Code subscription, Claude Sonnet 5 chosen over Haiku 4.5 to avoid conflating a weak driver model's failures with the memory-hook effect being measured), then built benchmarks/token-ab/ (tasks.mjs, fixtures.mjs, session.mjs, run.mjs): 4 objective memory-relevant tasks graded by deterministic checks against ANSWER.md, git-worktree fixtures isolating .neuron/ presence as the only difference between arms, and npm run bench:token-ab / --dry-run. Validated the full pipeline end to end with --dry-run (fixture build/cleanup, grading against gold and plausible-wrong answers) at zero API spend. Left unresolved: no Anthropic credentials are available in this environment to run the real 24-session (~ estimated) A/B, so ticket 10 stays claimed rather than resolved pending a fresh non-leaked API key from the maintainer.

---
id: b2e856fe-f56d-4b16-85ff-f15a3cf44ce9
createdAt: 2026-08-08T04:30:57.068Z
importance: 4
tags:
  - wayfinder
  - 2.2.0
  - rc2
taskId: null
---
Resolved wayfinder ticket 10 (Counterfactual Token A/B) on the neuron-2.3.0 map. Authenticated via ant auth login (browser OAuth, no key entered chat) after the maintainer's initial pasted key was flagged as leaked and never used. Ran an 8-session --k=1 pilot that caught a real harness bug (model resolved 'repository root' to filesystem root /, read-only -- fixed by spelling out the absolute fixture path), then the full 24-session --k=3 run for $5.20 total against the $20 approved budget. After the run, caught and fixed a negation-blind grading bug (regex matched 'intentional' inside 'this is *not* intentional design') by re-grading all 24 stored answers offline against the raw answerText, no extra spend. Final result: no measured token difference between memory and no-memory arms, and a HIGHER failure rate for the memory arm (33% vs 17%), both misses caused by a superseded .neuron/decisions.md entry outcompeting the later entry that reverses it -- a live instance of this project's own 'confidently-wrong retrieval' and 'write-side capture gap' fog items, not a new problem. Findings written to .scratch/neuron-2.3.0/audits/10-counterfactual-token-ab/findings.md and fed into the map's Decisions-so-far with an explicit instruction that 03's disclosure and 04's claim-versus-behaviour audit must not round this toward a favorable or neutral result. Unblocked 14 and 15.

---
id: 292742b0-8372-4b28-a336-482abca731e2
createdAt: 2026-08-08T05:08:21.562Z
importance: 3
tags:
  - wayfinder
  - 2.2.0
  - rc2
taskId: "16"
---
Wayfinder pickup on the neuron-2.3.0 map: claimed ticket 16 (Memory Supersession) and ran a full /grilling session with the maintainer through all six of its Scope items -- trigger (hard block on neuron memory add via embedder-only candidate shortlisting, agent resolves with --supersedes), retrieval effect (hard-exclude by default, never delete), schema (dedicated superseded_by/superseded_at columns, not the generic fields mechanism), direction/multiplicity (one-way, no undo -- a correction is a new forward-linking entry), existing-store migration (the two known-reversed pairs hand-fixed, no migration tool), and importance/prune interaction (none, confirmed orthogonal). Wrote ADR 0015 recording the decision. Resolved and closed ticket 16, graduated ticket 17 (Implement Memory Supersession) for the build, and -- per the maintainer's mid-session request to keep verification separate from the build -- split out ticket 18 (Re-run Counterfactual A/B After Supersession, blocked by 17) so the build ticket doesn't grade its own outcome against ticket 10's regression. Rewired ticket 04 (cut-and-publish) to block on 18 instead of the now-resolved 16. Updated the neuron-2.3.0 map's Decisions-so-far and Notes accordingly; frontier is now 01, 02, 05, 11, 13, 14, 17.

---
id: d615ac49-fcb0-402e-9739-821dba32020e
createdAt: 2026-08-08T05:26:50.769Z
importance: 4
tags:
  - rc2
  - adr
  - wayfinder
taskId: "17"
---
Implemented ticket 17 (Memory Supersession) per ADR 0015: additive superseded_by/superseded_at SQLite migration (schema v8) with markdown frontmatter round-trip, a write-time embedding-similarity gate on 'neuron memory add' (threshold 0.97, calibrated against ticket 27/39's same-topic band per the ticket's own instruction) that hard-blocks near-duplicate writes unless resolved via --supersedes <id> or --not-a-reversal, default hard-exclusion of superseded rows from neuron memory query/list/exec with a query-only --include-superseded escape hatch, and a findById direct-lookup method. Reconcile/sync/bootstrap-seed's internal reads were switched to includeSuperseded:true and computeMemoryHash now folds in supersededBy, since those are store-management paths that must never lose track of a superseded row. Mid-implementation, discovered neither of ticket 10's two known-reversed pairs actually had a corresponding correction entry in this repo's own .neuron/decisions.md -- the maintainer's rulings were captured only in Claude's own cross-session memory and in CHANGELOG.md prose, a live instance of the write-side capture gap this feature exists to fix -- so both missing correction entries were written for real via the new --supersedes flow rather than fabricating links between two pre-existing entries. Added 15 new tests across index.supersession.test.ts, commands/memory.supersession.test.ts and a new dualStorageRouter.test.ts case; updated 3 pre-existing tests for the new schema shape. Full suite: 488/488 passing.

---
id: 5a83b915-8276-4ace-9756-15653c7c5657
createdAt: 2026-08-08T11:59:07.451Z
importance: 3
tags:
  - wayfinder
  - 2.2.0
  - rc2
taskId: "18"
---
Wayfinder pickup on the neuron-2.3.0 map: claimed and resolved ticket 18 (Re-run Counterfactual A/B After Supersession). Found ticket 17's entire implementation uncommitted, which would have made the A/B harness's git-worktree fixtures silently test pre-fix code (they build from 'git worktree add HEAD', not the working tree) -- committed ticket 17 in two scoped commits (memory-mirror sync, then the code/tests/ADR) after confirming with the maintainer. Also caught and disclosed a self-inflicted accident: a --dry-run sanity check overwrote ticket 10's own results.json with zeros (untracked, unrecoverable, findings.md unaffected). Ran a live 12-session re-run (Claude Sonnet 5, $1.11) on the 2-task subset that actually regressed in ticket 10, after two aborted attempts wasted ~$2.10 to a foreground-timeout operator mistake (logged as a learning entry). Result: memory-arm failure on the regressed tasks dropped from ticket 10's 67% to 0%, beating control's unchanged 33% -- both named regression repeats individually verified, not just the aggregate. Found and fixed a real grading-heuristic gap in tasks.mjs mid-run (missed negation on 'not a bug' and 'rather than a bug'), re-graded all 12 captured answers offline at zero extra spend, same move ticket 10 made for its own negation bug. Added forward-pointer comments to tickets 03, 04, 10, and 15 so the corrected finding replaces ticket 10's original unfavorable one, and updated the map's Decisions-so-far. Unblocks ticket 04's dependency on 18; frontier is now 01, 02, 05, 11, 13, 14.

---
id: aa772611-4ff7-4f17-9f82-fea1ab5ac8e7
createdAt: 2026-08-08T12:32:26.033Z
importance: 4
tags:
  - 2.2.0
  - wayfinder
  - rc2
taskId: "01"
---
Wayfinder pickup on the neuron-2.3.0 map: found six already-resolved tickets (12, 08, 09, 10, 16, 17, 18) plus ticket 19's creation sitting fully uncommitted from prior sessions, spanning code, tracker files, and audits. Split the backlog into 8 ticket-scoped commits matching this repo's existing one-commit-per-ticket convention, reconstructing map.md's cumulative Notes/Decisions-so-far prose by hand since it had been edited in place across sessions rather than appended cleanly; verified the final reconstructed map.md against the true final content by confirming the git blob hash matched exactly. Then claimed and worked ticket 01 (GitHub Copilot CLI adapter): implemented CopilotAdapter against ADR 0014's HarnessAdapter interface, discovering via direct fetch of GitHub's hooks docs that Copilot's stdout contract is a flat additionalContext object (not Claude Code/Codex's hookSpecificOutput wrapper) and that its hook entries are a flat array per event rather than matcher-grouped -- both required real code changes (hook.ts's emit() now branches on harness id). Only session-start is wired; pre-prompt and context-reset are honestly left unwired since Copilot documents the former as notification-only and has no compaction-equivalent event at all. 14 new tests, full suite 502/502 passing. Real-install verification -- Copilot CLI isn't installed on this machine -- was deliberately left to the maintainer's own independent verification per their explicit choice; ticket 01 stays claimed, not resolved. Also refreshed the architecture blueprint card, which had gone stale (describing an unrelated test fixture instead of this repo).

---
id: a17d2ee8-62be-4915-8fc7-c3001bc36c38
createdAt: 2026-08-08T13:54:23.716Z
importance: 3
tags:
  - 2.2.0
  - wayfinder
  - rc2
taskId: "02"
---
Wayfinder pickup on the neuron-2.3.0 map: claimed and built ticket 02 (Cursor Adapter). Implemented CursorAdapter (src/harnesses/cursor.ts) against ADR 0014's HarnessAdapter interface, wired into getAdapters()/ADAPTER_ID_BY_HARNESS_NAME in src/commands/init.ts and src/harnesses/index.ts. A direct fetch of cursor.com/docs/hooks resolved two things ticket 10's research left open: Cursor's stdout contract is a third distinct shape, flat and snake_case additional_context, so src/commands/hook.ts emit() gained a third branch alongside Claude/Codex's wrapped form and Copilot's flat camelCase one; and preCompact (Cursor's compaction-equivalent event) exists and runs in cloud/background agents but carries no session_id on its stdin, so it is wired for real firing evidence but can never actually roll the session ledger epoch, unlike Copilot which has no compaction event at all. Both session-start and context-reset are wired; pre-prompt stays unwired since beforeSubmitPrompt is confirmed permission-only. Verdict stays best-effort: failurePosture is a known fail-open (better documented than Copilot), but payload cap and timeout stay unknown. 14 new tests in cursor.test.ts plus an 8-test cursor block in hook.test.ts, full suite passing modulo one pre-existing unrelated concurrency-stress.test.ts flake (a SQLite migration race, reproduces independent of this session's changes). Real-install verification -- Cursor is not installed on this machine -- was split into new ticket 22, following the ticket 01/20 precedent; ticket 02 stays claimed, not resolved, blocked by 22. Updated the map's Notes and frontier (now 05, 11, 13, 14, 19, 20, 21, 22) and refreshed the architecture blueprint card via neuron scan, which had drifted far out of date (237 changes) independent of this session.

---
id: 64c1056a-951f-4d46-b156-62d1323dc276
createdAt: 2026-08-08T13:57:08.054Z
importance: 3
tags:
  - wayfinder
  - 2.2.0
  - rc2
taskId: "02"
---
Pushed ticket-02 Cursor adapter (neuron-2.3.0) to GitHub -- commit 23fe2b5 on feat/2.3.0.

---
id: a35d57b6-89d6-4695-8a57-be020b210727
createdAt: 2026-08-08T15:28:16.744Z
importance: 4
tags:
  - 2.2.0
  - wayfinder
  - rc2
taskId: "05"
---
Wayfinder pickup on the neuron-2.3.0 map: claimed and resolved ticket 05 (Per-Category Storage Path). Built the categories.<name>.path > storage.path > '.neuron' resolver (src/config/categoryPath.ts) and a MultiRootMdStorage adapter-per-root registry (src/storage/multiRootMdStorage.ts) that fans out over the existing single-root MdStorageAdapter rather than rewriting it. Settled four open design questions with the maintainer via AskUserQuestion before writing code: adapter-per-root registry over a self-resolving adapter; absolute per-category paths allowed; a category's resolved root changing between runs triggers a per-category re-export from the vector index into the new location (new md_root:<category> meta key extending bootstrapSeed's md_seeded_at pattern) rather than a physical file move, leaving the old file orphaned on disk; and a path set on a vector-mode category warns rather than errors. storage.path is now undefined by default (no baked-in .default('.neuron')) so top-level-unset is observable to the resolver -- an intentional, tested config-shape change. Updated index.ts, dualStorageRouter.ts, sync.ts, mdVectorSync.ts, neuronYaml.ts (schema + validateCategoryPaths collision/warn checks), scaffold.ts and README to match. 23 new tests (categoryPath.test.ts, multiRootMdStorage.test.ts, dualStorageRouter.pathChange.test.ts, neuronYaml.test.ts additions); npm test 546/546 green, tsc --noEmit clean. Deliberately skipped npm run test:e2e (the real-pipeline benchmark suite) after confirming zero coupling to anything this ticket touched. ADR deferred per the ticket's own instruction -- one ADR covers both 05 and 06's storage-vocabulary changes, written by whichever lands second; 06 (per-category storage.mode override, deletes split) is now unblocked and is the new frontier's first ticket. Updated map.md's Decisions-so-far and frontier (now 01, 02, 06, 11, 13, 14, 19).

---
id: ea073842-72b2-4794-8d03-9a47eeb84709
createdAt: 2026-08-08T15:44:36.454Z
importance: 3
tags:
  - wayfinder
  - rc2
  - release
taskId: "05"
---
Pushed ticket-05 per-category storage path (neuron-2.3.0) to GitHub -- commit 377b8a2 on feat/2.3.0.

---
id: 54fbf602-2441-43bf-a3f9-2d1fbf037ccd
createdAt: 2026-08-08T23:06:24.848Z
importance: 3
tags:
  - rc2
  - wayfinder
  - md-storage
taskId: "06"
---
Resolved wayfinder ticket 06 (neuron-2.3.0 map): Storage Mode - Top-Level Default with Per-Category Override, split Removed. Grilled the upgrade-hazard question with the maintainer via AskUserQuestion before writing code (three rulings: reseed-on-first-sighting fix for a real data-loss bug found while grounding the questions, split aliases to md not vector, and category flips from md to vector warn once on stderr rather than refusing/auto-migrating). Collapsed StorageModeEnum to md|vector with four deprecated aliases (md-only, dual, vector-only, split); DualStorageRouter.transact/query now use one resolveCategoryStorage(category) resolver instead of a three-way mode dispatch; fixed reconcileCategoryWithPathGuard's first-sighting branch to reseed instead of running the destructive strict mirror. Ticket 44's field-column warning turned out already moot (ticket 44 shipped unconditional column support). Wrote ADR 0016 covering both ticket 05's and this ticket's storage-vocabulary changes. Swept docs: README, scaffold.ts template, docs/COMMANDS.md, CONTEXT.md, TEST_INFRA.md, and the packaged neuron-memory skill (explicit maintainer request mid-session). npm test 552/552 green, tsc clean, npm run test:e2e skipped (no coupling). Updated map.md Decisions-so-far; frontier is now 11, 13, 14, 19, 20, 21, 22.

---
id: c241551d-1c68-43d9-94f3-9e994f9684bc
createdAt: 2026-08-08T23:42:36.497Z
importance: 3
tags:
  - rc2
  - wayfinder
  - release
taskId: "06"
---
Pushed ticket-06 storage mode override / split removal (neuron-2.3.0) to GitHub -- commit 08fbdda on feat/2.3.0.

---
id: df31902c-aba7-4186-a2dc-95f1c6b447f4
createdAt: 2026-08-09T00:12:40.963Z
importance: 4
tags:
  - 2.2.0
  - wayfinder
  - rc2
taskId: null
---
Resolved wayfinder ticket 23 (neuron-2.3.0): fixed init.test.ts's missing package.json isolation guard, first in the named harness-idempotent-test case, then found 4 more identical gaps in the file's first four tests via a full per-test audit of every execSync/spawnSync CLI test file. All five fixed; npm test run twice consecutively (552/552 both times) confirmed .neuron/ stays byte-identical. Ticket resolved, map updated, frontier now 11/13/14/19/20/21/22.

---
id: 358959e8-6335-40be-b308-6791007d4225
createdAt: 2026-08-09T11:57:16.489Z
importance: 4
tags:
  - 2.2.0
  - wayfinder
  - rc2
taskId: "13"
---
Wayfinder pickup on the neuron-2.3.0 map: claimed the frontier's first ticket, 13 (neuron status --check/--repair), an implementation task carrying forward ADR 0013's design with no open design questions. Built NeuronMemory.checkFieldCompliance()/repairFieldCompliance() in src/index.ts, reusing write-side category enrichment's buildCategoryCentroids/selectCategory directly (not duplicated) for enum-field inference, applying configured defaults first, and never fabricating free-text identity fields. Wired into 'neuron status --check'/'--repair' (mutually exclusive, both exit 1 on remaining non-compliance, matching scan --check's CI-gate posture). Found and fixed a real pre-existing bug mid-session: cli.ts's status branch returned handleStatusCommand(memory) without awaiting it inside a try/finally that closes the db, a race silently absorbed until now by the old scan-drift path's blanket catch. 10 new tests (8 unit in src/statusCheckRepair.test.ts, 2 CLI-level in status.test.ts); npm test 578/578; tsc clean; docs swept (COMMANDS.md, MASTER_HELP). Resolved ticket 13 on the map, refreshed the architecture blueprint (two new exported types), and left the frontier at 14, 19, 20, 21, 22, 28.

---
id: e781939b-f850-4765-8d20-c400809b547e
createdAt: 2026-08-09T12:20:49.073Z
importance: 3
tags:
  - wayfinder
  - 2.2.0
  - rc2
taskId: null
---
Wayfinder session continued after resolving ticket 13: ran a full /grilling session with the maintainer (10 sequential decisions) sparked by a postscript question about making future session work discoverable for downstream synthesis (README-writing was the trigger example). Landed on a per-prompt, count-gated, literal ready-to-run neuron memory query command injected into the pre-prompt hook payload -- not a static hint, not a session-start addition, and not the same redundancy shape ticket 08 already ruled out. Graduated tickets 31 (query/list default bugs -- oldest-first ordering, shared limit default), 32 (the hint itself, blocked by 31), and 33 (measure real usage/benefit, blocked by 32, matching this map's 11-to-24 and 17-to-18 proof-of-value-split precedent) onto the neuron-2.3.0 map rather than spinning up a new map. Appended a Notes entry to map.md documenting the reasoning. No code written this half of the session -- planning only, per wayfinder's plan-don't-do default. Frontier is now 14, 19, 20, 21, 22, 28, 31.

---
id: 2ebad7e3-5481-4e46-ba1f-db4515251b4f
createdAt: 2026-08-09T13:07:07.891Z
importance: 4
tags:
  - wayfinder
  - 2.2.0
  - rc2
taskId: "19"
---
Wayfinder pickup on the neuron-2.3.0 map: claimed ticket 19 (Run the Counterfactual A/B on Synthetic Repos with Synthetic Memory Sets), the first frontier ticket. Ran a full /grilling session resolving all six Scope items: supplement (not replace) the real-repo run from tickets 10/18; pivoted from a hand-authored fake repo to real SWE-bench Lite instances (astropy__astropy-12907, django__django-11133) at the maintainer's suggestion, borrowing only their repos/issues/gold-patches (no Docker, no hidden-test execution) with tasks reshaped to diagnose-and-describe questions graded by deterministic keyword checks; memory arm gets a fabricated CLAUDE.md-shaped prior-fix-recorded entry; prompts stripped to symptom-level after rejecting several candidate instances whose issue text already leaked the fix; live-fetch with no vendored cache; a difficulty-calibration pilot required before full spend; and a hard $5 budget cap (scaled from an initial $15 float) enforced in code, N=2 x k=2, 12 sessions worst case. Built and dry-run-validated the full harness (swebench-instances.mjs, swebench-tasks.mjs, swebench-fixtures.mjs, run-swebench-ab.mjs) end to end including a real live git fetch of both repos at their pinned commits, and verified grading against gold/wrong/near-miss answers. Hit the same expired-ant-credential wall tickets 10 and 14's first pickups did, so left ticket 19 claimed and open rather than resolved -- the live pilot (npm run bench:swebench-ab:pilot) is the next step for a session with working credentials. npm test 578/578 unaffected.

---
id: 9f7d246e-cbdc-48d8-a86c-2165c0cc55f7
createdAt: 2026-08-09T13:19:37.515Z
importance: 3
tags:
  - rc2
  - wayfinder
  - 2.2.0
taskId: "31"
---
Resolved ticket 31 (Fix neuron memory Query/List Default Ordering and Limits) on the neuron-2.3.0 wayfinder map. NeuronMemory.queryVector's list-mode branch (src/index.ts) changed ORDER BY rowid ASC to DESC (recency, matching the deprecated listHistory wrapper) and split its default limit from text-query mode's shared 'q.limit ?? 5' into its own 'q.limit ?? 20'. Verified hook.ts's fetchArchitectureCardPayload category-fill fallback (explicit limit, inherits ordering fix only) and dualStorageRouter.ts/mdVectorSync.ts (both already pass explicit limits) are unaffected or improved, not regressed. Found and fixed a live instance of the same ordering bug in src/commands/ui.test.ts's /api/learnings test, which asserted the old oldest-first order. Added two new tests to src/index.test.ts covering list-mode ordering and the list-vs-text default-limit divergence, since neither was covered before. npm test 580/580, tsc --noEmit clean. Prior session's uncommitted work on tickets 14 and 19 (git-log and SWE-bench A/B harnesses, both blocked on expired ant OAuth credentials) was committed first, at the maintainer's request, before starting this ticket. Ticket 20 (Copilot real-install verification) was the actual first-in-line frontier ticket but is HITL requiring the maintainer's own GitHub Copilot subscription/auth, which this session cannot provide; the maintainer chose to skip to ticket 31 instead and leave 20 unclaimed for a session worked with them live. Unblocks ticket 32 (per-prompt discovery-command hint). New frontier: 20, 21, 22, 28, 32.

---
id: 79a407f8-0dfc-464b-bd95-4aa18d16f910
createdAt: 2026-08-09T14:33:37.974Z
importance: 3
tags:
  - 2.3.0
  - wayfinder
  - ticket-19
taskId: null
---
Wayfinder pickup on the neuron-2.3.0 map: picked up ticket 19 (Synthetic-Fixture Counterfactual A/B), which had been claimed-and-built-but-not-resolved since 2026-08-08, blocked only on live Anthropic credentials. A live ant OAuth token was available this session, clearing that wall. Ran npm run bench:swebench-ab:pilot for real (4 sessions, $0.14) -- it initially scored 100% control-arm failure on both SWE-bench-sourced tasks (astropy-12907-separability, django-11133-memoryview), which the harness itself flagged as outside the 15-40% difficulty-calibration target band. Inspecting the captured answers found all 4 were actually correct diagnoses; the deterministic keyword grader was the thing that failed, because markdown line-wraps and emphasis split phrases like 'constant 1' across a literal newline or emphasis markers, so a plain substring check missed them. Fixed via a new normalizeForMatch() helper in benchmarks/token-ab/grading.mjs (strips backtick/asterisk, collapses whitespace -- deliberately not underscore, which is load-bearing in identifiers like make_bytes/_cstack), re-graded the same 4 captured answers offline at zero extra spend (same move ticket 18 made for its own grading bug), and re-verified the corrected checker still rejects hand-written wrong and near-miss answers so the fix isn't just loosened. npm test 580/580 unaffected. Corrected pilot result: 0/4 failures -- still outside the target band, now too easy rather than too hard. Did not spend on the full 8-session A/B since the calibration gate still doesn't pass; whether the fix is harder SWE-bench instances or reconsidering the diagnose-and-describe task shape is left as an open question for the maintainer, since instance selection was already a grilled Scope item 5 decision. Ticket 19 stays claimed, not resolved. Updated the ticket's own Comments, the pilot's results.json (regradedAt/regradeNote, same convention ticket 18 used), and map.md's Notes. $0.14 of the $5 approved cap spent.

---
id: 118c40da-fda9-4de8-801e-e080580ba51e
createdAt: 2026-08-09T14:56:10.130Z
importance: 3
tags:
  - 2.3.0
  - wayfinder
  - ticket-19
taskId: null
---
Wayfinder continuation on ticket 19 (Synthetic-Fixture Counterfactual A/B), same session as the credential-wall pickup: after the first pilot's grading fix showed 0/4 failures (too easy), swapped in two harder SWE-bench instances (matplotlib-24265, django-11019, picked by patch complexity and verified against real baseCommit content) at the maintainer's direction -- also 0/4, an accidental --dry-run overwrote the prior real results.json (recovered byte-faithful, recorded as a learning entry), 8/8 correct diagnoses total across two independently-chosen pairs. At the maintainer's further direction, made effort a parameter in the shared session.mjs (default 'low' preserves tickets 10/14/18) and re-ran the same pair at effort:'medium': mixed result, django-11019 still 2/2 pass, matplotlib-24265 flipped to 2/2 fail -- but hand-inspection showed both 'failed' answers were actually correct and more thorough, exposing that check()'s identifiesFix gate tests for a proposed fix no task prompt in the file (including the original retired pair) ever actually asks for; it only passed historically because models happened to volunteer fix-shaped phrasing. Stopped after three live-spend rounds (0.92 USD of the 5 USD cap) rather than patching a fourth time unilaterally, since each round surfaced a new judgment call (a real grading bug, a too-easy signal, then a prompt/grading design gap) -- checked in with the maintainer instead. npm test 580/580 throughout. All three pilot runs archived separately under .scratch/neuron-2.3.0/audits/19-synthetic-fixture-counterfactual-ab/ (pilot-retired-astropy-django, pilot-low-effort-mpl-django11019, pilot-medium-effort-mpl-django11019). Ticket 19 stays claimed, not resolved; the open question is now whether to drop the identifiesFix gate, rewrite prompts to explicitly ask for a fix, or pursue a different calibration lever entirely.

---
id: 68257ee4-e576-4e2a-ba9a-707903cbeaf9
createdAt: 2026-08-09T15:00:03.194Z
importance: 3
tags:
  - 2.3.0
  - wayfinder
  - ticket-19
taskId: null
---
Wayfinder session on ticket 19 (Synthetic-Fixture Counterfactual A/B) concluded: after the effort:'medium' pilot exposed that check()'s identifiesFix gate tests for a proposed fix no task prompt ever actually asked for, the maintainer chose to rewrite the prompts rather than drop the gate or leave it open. Added an explicit "...and how would you fix it?" clause to all four task prompts in swebench-tasks.mjs -- both live (matplotlib-24265-seaborn-alias, django-11019-media-merge-order) and retired (astropy-12907-separability, django-11133-memoryview), for consistency even though the retired pair isn't run by default. check() logic itself is unchanged, only the prompt text. npm test 580/580. Deliberately not re-run live this session -- the medium-effort pilot's captured "failed" answers were generated under the old prompt and won't retroactively pass, so confirming the fix needs a fresh pilot, which is the natural next pickup rather than a fourth live-spend round in one session. Total session spend: 0.92 USD of the 5 USD cap (4.08 USD remaining). Ticket 19 stays claimed, not resolved; next step is npm run bench:swebench-ab:pilot with either effort level against the four now-updated prompts.

---
id: 4a1e7096-174b-4548-b578-09d91f5da642
createdAt: 2026-08-09T17:34:56.789Z
importance: 4
tags:
  - 2.2.0
  - wayfinder
  - rc2
taskId: null
---
Wayfinder pickup session on neuron-2.3.0: frontier's first-in-order ticket (20, verify Copilot adapter) turned out to need a real GitHub Copilot CLI install/subscription this session doesn't have, and 22 has the same shape for Cursor; at the maintainer's request, graduated fog item 'is categories authoritative or advisory' into a fresh grilling ticket (35) instead of taking a build/verify task off the frontier. Ran a full grilling session covering the core advisory-vs-validate fork, the inferred-vs-explicit category strictness asymmetry, this repo's own scan.category alias, backfill migration, block shape, and the concrete single hook point (NeuronMemory.transact, traced via code search rather than assumed). Landed on advisory-but-self-maintaining: an undeclared category auto-declares itself in neuron.yaml on first write via a new comment-preserving Document-API round-trip writer, existing gaps backfilled through an extended neuron status --repair. Wrote ADR 0017. Mid-session the maintainer redirected the resulting implementation off neuron-2.3.0 (already accumulating toward its rc2 cut) onto a freshly chartered neuron-2.4.0 map, seeded with ticket 01 (implement ADR 0017) as its first, unblocked ticket. Ticket 35 itself resolves on neuron-2.3.0's own map; neuron-2.3.0's frontier is otherwise unchanged (20, 21, 22, 28, 32, 34).

---
id: 431a13ee-a825-41c5-aea7-e0c2b42bf5c9
createdAt: 2026-08-09T17:42:05.005Z
importance: 4
tags:
  - 2.2.0
  - wayfinder
  - release
taskId: neuron-2.3.0
---
Wayfinder pickup on the neuron-2.3.0 map: skipped frontier tickets 20/22 (need real harness installs) per maintainer instruction, claimed ticket 21 (GitHub Action: Automated npm Publish on Push to Main). Grilled two open Scope decisions via AskUserQuestion (only -rcN prereleases get a dist-tag, anything else fails loudly; failure visibility stays GitHub Actions UI only) and built .github/workflows/publish.yml: a build-and-test job that always runs npm ci/npm test and resolves version+dist-tag+already-published, feeding a separate publish job gated by environment: npm-publish. Mid-session the maintainer asked what stops someone from opening a branch and publishing; answered that the push-to-main trigger already excludes branches/PRs and the real gate is branch protection (maintainer configuring themselves) plus the new environment approval gate (inert until the npm-publish environment and NPM_TOKEN are created). Split real-run verification into ticket 36 since NPM_TOKEN/environment don't exist yet; ticket 21 stays claimed, not resolved, blocked by 36. Frontier is now 20, 22, 28, 32, 34, 36.

---
id: 3ed18ffd-65dc-4c7c-8a7b-08f03fe03b42
createdAt: 2026-08-09T18:06:46.130Z
importance: 3
tags:
  - release
  - 2.2.0
  - wayfinder
taskId: "34"
---
Resolved ticket 34 (Cut and Publish 2.3.0-rc2, neuron-2.3.0): audited git log v2.3.0-rc1..HEAD directly, wrote the CHANGELOG entry, fixed README's stale Cursor line, found and fixed a genuinely stale CONTEXT.md harness-adapter claim, verified 580/580 unit + tsc clean + 12/13 e2e (Pillar 8 a known pre-existing flake), tagged v2.3.0-rc2 and pushed. At the maintainer's explicit direction, also merged feat/2.3.0 into main early (a deliberate one-time exception to this map's merge-at-epic-end cadence) specifically to unblock ticket 36's real-push verification of the new publish workflow. Hit and recovered from the documented autoRescanIfDriftDetected merge trap, and discovered main already has an active GitHub ruleset ("Protect", id 20346327) that an earlier session's check missed by only querying the legacy branch-protection endpoint.

---
id: 624620c1-920a-4a2a-b163-39f264df0b3c
createdAt: 2026-08-09T18:06:51.666Z
importance: 3
tags:
  - release
  - failure-fix
  - wayfinder
taskId: "36"
---
Worked ticket 36 (Verify the Publish Workflow Against a Real Push, neuron-2.3.0): unblocked by ticket 34's merge to main, which triggered publish.yml for the first time. Run 1 failed build-and-test with node:sqlite requiring Node >=22.13 against the workflow's pinned Node 20 -- fixed by bumping to Node 22 and adding an engines field to package.json (commit e9157a1, pushed to main). Run 2 confirmed the fix: build-and-test passed for real, and the publish job ran and failed cleanly at npm publish with ENEEDAUTH since no NPM_TOKEN secret exists yet -- no side effects, nothing published. Ticket stays claimed, not resolved: Scope items covering NPM_TOKEN provisioning, a real stable-version push, an unbumped-push skip check, and branch-protection-rejection verification remain blocked on the maintainer provisioning credentials.

---
id: bc446638-5085-4735-b7e8-0ff40469f38d
createdAt: 2026-08-09T19:19:42.718Z
importance: 4
tags:
  - wayfinder
  - 2.2.0
  - rc2
taskId: "38"
---
Wayfinder pickup on the neuron-2.3.0 map: skipped the two lowest-numbered frontier tickets (20, 22 -- verify Copilot/Cursor real installs) since both are HITL-blocked on real subscriptions/installs this session doesn't have, and claimed the next AFK-workable frontier ticket, 38 (MdStorageAdapter's frontmatter parser silently drops entries after a stray '---' in body content). Root-caused the corruption to a one-off duplicated-content write in commit 08fbdda (not a systemic formatter bug), hardened parseMarkdownDetailed with a two-pointer delimiter-pairing scan so a malformed body can never cascade into dropping unrelated later entries, added a non-blocking mass-deletion warning to reconcileCategory (kept orthogonal to ADR 0011's settled 'no tripwire' ruling), and repaired this repo's own corrupted decisions.md entry (75/75 now parse cleanly). Landed as two separate commits per this repo's own convention: 2377509 (the actual ticket-38 fix, minimal .neuron/decisions.md diff) and 0bbaee9 (a purely-additive chore refreshing the architecture blueprint card to ticket 28's index+module-card format, a side effect of relinking the global neuron binary to this session's rebuild in order to test the fix against real neuron exec commands). Full suite 599/600 green (the one failure is Pillar 8's known pre-existing concurrency flake, already noted on ticket 34). Resolved ticket 38, appended Decisions-so-far entry to map.md. Frontier is now 20, 22 (still HITL-blocked), 30, 32.

---
id: 8ad04973-265f-4e72-8f75-7d806fa1fdcb
createdAt: 2026-08-09T19:34:51.036Z
importance: 3
tags:
  - 2.2.0
  - wayfinder
  - rc2
taskId: "30"
---
Wayfinder pickup on the neuron-2.3.0 map: claimed and resolved ticket 30 (Injection Fetches Only the Index). Verified fetchArchitectureCardPayload was already index-only by construction (ticket 28's change), so the real work was deciding compressArchitectureCard's fate and verifying Scope item 3. Measured this repo's real post-28/29 index honestly (1,591 of 6,000 chars, 26.5%) before deciding, per the map's own standing rule; rewrote compressArchitectureCard (src/scanner/compressCard.ts) from scratch for the index's line-per-module shape rather than retiring it, keeping the never-cut-silently discipline tickets 25/27 established but with far less code since there's no per-file detail left to strip. Dogfooding a plain 'neuron hook claude-code session-start' call against this repo's own store surfaced a real, previously undetected bug: the pre-existing additive top-N-in-category query in hook.ts (predating ticket 28) matched real module detail cards since they now share the index's category and tags, injecting a full module card (ui) on every session-start regardless of relevance -- reproduced live and confirmed against this very session's own injected context. Fixed by excluding every module id belonging to the fetched index from that query. Demonstrated the reused-recall design works with no new code: a prompt naming src/harnesses surfaces that module's real card as the top hit via ordinary memory.query. Refreshed ticket 24's captured-card.txt to a real post-fix capture (2,994 bytes, down from ~6,084 stale pre-28 bytes); its tasks needed no changes since both only depend on the dependency list and per-module path list, still present verbatim in the index. compressCard.test.ts fully rewritten (8 tests) for the new shape; one new regression test added to hook.test.ts for the module-card-exclusion fix. npm test 599/600 (one pre-existing, unrelated concurrency-stress.test.ts flake). tsc --noEmit clean. Updated map.md's Notes and Decisions-so-far; frontier is now 20, 22, 32.
