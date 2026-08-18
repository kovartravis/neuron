# Category: tickets-future

---
id: d9883ef5-f8ac-4c3b-85bf-210b54e3254f
createdAt: 2026-08-16T18:57:41.301Z
importance: 3
tags:
  - cli
  - exec
  - config
taskId: null
kind: task
map: 19803cce-ad56-4774-9492-49f6f5d71f67
status: unclaimed
---
# Round out CLI subcommand topology and exit-code conventions

## Question

Should neuron add the missing operator-facing subcommands identified below
(shell completions, `neuron config`, `neuron hook status`/`dry-run`,
`neuron category` management) and establish one consistent exit-code
convention across all commands?

## Context

Verified as genuinely absent from current source during triage (no matches
for `completion`, `config`, or `category` as CLI subcommands; no `hook
status`/`hook dry-run` branch in `hook.ts`):

- No shell completion support (`neuron completion <bash|zsh|fish>`)
- No `neuron config get/set/validate` — `neuron.yaml` must be hand-edited
- No way to inspect what a hook would inject without actually running an
  agent turn (`neuron hook status` / `neuron hook dry-run "<prompt>"`)
- No `neuron category list/rename/clear` — renaming or deleting a category
  today means manually editing SQLite and the markdown files directly
- Exit codes are inconsistently set across commands (`process.exit(1)` vs.
  `process.exitCode = 1` vs. other codes) with no documented convention
  (e.g. 0=OK, 1=general error, 2=usage/flags, 3=drift/validation failed,
  4=lock busy)

These are independent, mostly-additive DX items rather than one cohesive
change — likely worth splitting further at pickup time if any single one
turns out bigger than expected (e.g. `neuron category rename` touches both
the SQLite and markdown storage adapters and may deserve its own ticket).

## Deliverables

- [ ] `neuron completion <bash|zsh|fish>`, including dynamic completion for
      categories declared in `neuron.yaml`
- [ ] `neuron config get/set/validate`
- [ ] `neuron hook status` and `neuron hook dry-run "<prompt>"`
- [ ] `neuron category list/rename/clear`
- [ ] A documented, consistently-applied exit-code convention across every
      command
- [ ] `npm test` and `tsc` clean

## Answer

_Not yet resolved._

## Comments

- 2026-08-15: Submitted by the maintainer as a backlog item from an
  external CLI/architecture review. All five gaps confirmed absent from
  current source during triage; flagged as likely needing to split further
  once picked up, since these are independent additions bundled here only
  for backlog-entry convenience.

---
id: 6156348e-e18e-4a06-8d49-bdca6e07ca74
createdAt: 2026-08-16T18:57:41.396Z
importance: 3
tags:
  - cli
  - exec
  - explanation
taskId: null
kind: research
map: 19803cce-ad56-4774-9492-49f6f5d71f67
status: unclaimed
---
# Evaluate a background daemon/resident socket for hook latency

## Question

Is a background daemon (resident process behind a local domain socket)
worth building to cut per-invocation latency for `neuron hook
pre-prompt`/`pre-command`, or does that cost (a long-lived process, IPC
surface, lifecycle/crash-recovery concerns) outweigh the latency it would
save?

## Context

Coding harnesses (Claude Code, Codex) invoke `neuron hook
pre-prompt`/`pre-command` on every turn or tool call. Each invocation
currently pays full Node process startup plus loading native modules
(`better-sqlite3`, ONNX runtime, tree-sitter). The originating review
estimates ~150-400ms of added latency per hook call and proposes a
resident daemon over `.neuron/neuron.sock` that CLI commands could
delegate to via IPC instead of spawning a fresh process each time,
estimating <10ms once resident.

This is a genuinely bigger architectural bet than the other tickets in
this batch — a long-lived background process introduces its own lifecycle
questions (start/stop, crash recovery, staleness after a `neuron.yaml`
edit, multi-repo/multi-project isolation, socket security) that a
stateless CLI invocation doesn't have. Framed as **research**, not
**task**: this ticket should measure the actual latency breakdown first
(how much is process startup vs. model loading vs. DB open) and weigh the
daemon against cheaper alternatives (e.g. the lazy-loading backlog item
above) before committing to building it.

## Deliverables

- [ ] Measure actual per-invocation latency breakdown for `neuron hook
      pre-prompt`/`pre-command` (process startup vs. import graph vs. DB
      open vs. model load) — don't take the ~150-400ms estimate on faith
- [ ] Survey how much of that latency the lazy-loading backlog item
      ("Lazy-load command dispatch...") alone would recover, before
      assuming a daemon is necessary on top of it
- [ ] If a daemon still looks warranted: sketch the lifecycle model
      (start/stop, staleness, crash recovery, per-project isolation) and
      socket security posture, and weigh against the added operational
      complexity
- [ ] Recommendation: build, don't build, or build a narrower version —
      not an implementation

## Answer

_Not yet resolved._

## Comments

- 2026-08-15: Submitted by the maintainer as a backlog item from an
  external CLI/architecture review. Scoped as research rather than task —
  a resident background process is a bigger architectural commitment than
  this batch's other items and deserves its own measure-first pass before
  any implementation ticket is written.

---
id: fe91f1a4-be7f-40b7-b327-a8798d6380dd
createdAt: 2026-08-16T18:57:41.488Z
importance: 4
tags:
  - sqlite
  - md-storage
  - failure-fix
taskId: null
kind: task
map: 19803cce-ad56-4774-9492-49f6f5d71f67
status: unclaimed
---
# Harden SQLite write path against multi-process lock contention

## Question

Should `better-sqlite3` initialization and write transactions be hardened
(native busy timeout, `BEGIN IMMEDIATE`, retry/backoff) to eliminate
`SQLITE_BUSY` failures under concurrent multi-agent writes?

## Context

Verified against current source: `src/db.ts:79` opens the database as
`new Database(dbPath)` with no `timeout` option set. (The originating
review's claim about transactions defaulting to deferred rather than
immediate locking was not independently re-verified during triage —
confirm as this ticket's first step.)

This is a live, known failure mode, not speculative: `CONTEXT.md`'s own
glossary entry for the Deep E2E Benchmark Suite records **Pillar 8
(multi-process contention) as a known pre-existing failure** (`3/50`
rejected writes against a `<5%` bar), reproduced on a clean tree during
ticket 26 and "owned by nobody yet." This ticket is a plausible fix for
that open failure, not a new problem.

## Deliverables

- [ ] Confirm current transaction locking mode (deferred vs. immediate) in
      `db.ts` before changing it
- [ ] Set a native `timeout` (e.g. 5000ms) on the `better-sqlite3`
      `Database` constructor at `db.ts:79`
- [ ] Wrap write transactions in `BEGIN IMMEDIATE` with exponential-backoff
      retry on `SQLITE_BUSY`
- [ ] Re-run Pillar 8 (multi-process contention) from the Deep E2E
      Benchmark Suite and confirm it now passes its `<5%` rejected-write
      bar
- [ ] `npm test` and `tsc` clean

## Answer

_Not yet resolved._

## Comments

- 2026-08-15: Submitted by the maintainer as a backlog item from an
  external CLI/architecture review. Ties directly to the pre-existing,
  previously-unowned Pillar 8 failure recorded in `CONTEXT.md`'s Deep E2E
  Benchmark Suite entry — this isn't a new finding, it's a candidate fix
  for a known open one.

---
id: eca653de-8e88-4b2a-851e-d5f1589c9eb6
createdAt: 2026-08-16T18:57:41.578Z
importance: 4
tags:
  - memory
  - benchmark
  - adr
taskId: null
kind: task
map: 19803cce-ad56-4774-9492-49f6f5d71f67
status: unclaimed
---
# Improve `neuron memory` command ergonomics

## Question

Should `neuron memory` gain batch ingestion, auto-resolved `--category` on
single-ID operations, and a keyword-only (no embedding model) query mode?

## Context

Verified against current source during triage:

- `memory.ts:176` hard-errors `Error: --category is required for 'memory
  ${subCommand}'` on `delete`/`update` even though entry ids are unique
  store-wide — `neuron memory get <id>` already resolves by id alone
  without requiring `--category`, and `docs/agents/issue-tracker.md`
  documents ids as unique store-wide. The requirement on `delete`/`update`
  looks like an inconsistency with that already-established behavior, not
  a deliberate design choice — worth confirming there wasn't a reason for
  it before removing.
- `neuron memory add` only accepts a single positional content string — no
  batch/stdin ingestion path. Onboarding a repo or migrating a batch of
  tickets currently means a shell loop, paying full process startup +
  embedder instantiation per item.
- `neuron memory query` always loads the ONNX embedder for vector search —
  no fast keyword-only/FTS-only mode for exact-match lookups (symbols,
  ticket numbers, stack traces) that don't need semantic search.
- The originating review also proposed an interactive TTY prompt for the
  existing duplicate/supersession flow (offer `--supersedes`/
  `--not-a-reversal`/cancel as a menu instead of erroring with
  instructions) — genuinely nice-to-have, lower priority than the three
  items above; include only if the rest of this ticket leaves room.

## Deliverables

- [ ] Auto-resolve `--category` on `memory delete <id>` / `memory update
      <id>` when omitted, matching `get`'s existing id-is-unique behavior
      (or document why delete/update deliberately differ, if a real reason
      turns up)
- [ ] `neuron memory add --batch <file>` or stdin support, sharing one
      process/embedder-load across all items in the batch
- [ ] `neuron memory query "<text>" --fts` (or similar flag) for a
      keyword-only path that skips embedder loading entirely
- [ ] Interactive TTY supersession prompt, if scope allows
- [ ] `npm test` and `tsc` clean

## Answer

_Not yet resolved._

## Comments

- 2026-08-15: Submitted by the maintainer as a backlog item from an
  external CLI/architecture review. `--category` requirement and
  batch/FTS gaps verified against current source during triage.

---
id: 035320f4-81d2-4db3-b775-565bc639a9c2
createdAt: 2026-08-16T18:57:41.677Z
importance: 3
tags:
  - cli
  - exec
  - failure-fix
taskId: null
kind: task
map: 19803cce-ad56-4774-9492-49f6f5d71f67
status: unclaimed
---
# Standardize output format across all CLI subcommands

## Question

Should every subcommand support a consistent `--json` (and optionally
`--jsonl`/`--quiet`) output contract, so both human terminal use and
agent/scripted consumption have one predictable shape instead of each
command inventing its own?

## Context

Current output formats are inconsistent by command (survey from the
originating review, not yet re-verified line-by-line against source —
worth confirming during this ticket's own work):

- `memory add/query/list/get`, `status`, and `scan` (ingest path) default
  to JSON on stdout with no flag needed.
- `status --health` and `scan --diff`/`--dry-run` default to
  human-formatted text/markdown, switching to JSON only via a flag.
- `sync` prints custom `[sync] ...` text log lines with no JSON option at
  all.
- `exec -- <cmd>` prints human diagnostic messages to stderr with no way
  to suppress or format them.
- `feedback` prints a boxed ASCII banner to stderr alongside JSON on
  stdout.

This matters more than usual for this project specifically because neuron
is consumed by both human operators and autonomous coding agents (Claude
Code, Codex, etc.) via `neuron exec` / hook injection — an agent parsing
stdout benefits from one predictable contract, not six.

## Deliverables

- [ ] Confirm the format survey above against current source (may have
      drifted since the originating review was written)
- [ ] Define one `--json` contract (and decide if `--jsonl`/`--ndjson`
      streaming is in scope now or a follow-up) that every subcommand
      implements
- [ ] Add `-q/--quiet` support to `exec` specifically, since its stderr
      diagnostics currently can't be suppressed in scripted/agent contexts
- [ ] `sync` gains a `--json` mode
- [ ] `npm test` and `tsc` clean

## Answer

_Not yet resolved._

## Comments

- 2026-08-15: Submitted by the maintainer as a backlog item from an
  external CLI/architecture review. Output-format survey not
  independently re-verified line-by-line during triage — flagged as this
  ticket's own first deliverable.

---
id: c0bba811-eed7-4d49-9d2e-23433bf2d9d4
createdAt: 2026-08-16T18:57:41.770Z
importance: 4
tags:
  - cli
  - exec
  - testing
taskId: null
kind: task
map: 19803cce-ad56-4774-9492-49f6f5d71f67
status: unclaimed
---
# Unify flag parsing across CLI subcommands

## Question

Should flag parsing be consolidated into one shared parser (declarative or
a small internal utility) instead of the current per-command ad-hoc
implementations, and should short-flag aliases be made consistent across
subcommands?

## Context

Verified against current source during triage:

- `src/commands/utils.ts` (689 lines) implements the flag parser used by
  `memory`, `scan`, `init`, `status` — only accepts `--category`, not `-c`.
- `src/commands/sync.ts:10-26` implements its own separate parser with a
  hardcoded `knownFlags` array (`['--dry-run', '--force', '-c',
  '--category']`) and does support `-c` (confirmed: `sync.test.ts:107`
  exercises `-c`).
- `src/commands/ui.ts` and `src/commands/exec.ts` each implement their own
  ad-hoc argument handling too.
- `utils.ts` calls `process.exit(1)` directly on an unknown flag (7 call
  sites confirmed: utils.ts:71, 297, 304, 310, 315, 320, 326) — bypasses any
  caller-level cleanup and makes the parser untestable without spawning a
  subprocess.
- Net effect: `-c` works for `sync` but not for `memory add -c` /
  `scan -c`, and there's no single place that defines what a "flag" means
  across the CLI.

## Deliverables

- [ ] Decide: hand-rolled shared internal parser vs. adopting a small
      dependency (e.g. `citty`, `commander`) — weigh against this
      project's stated aversion to unnecessary dependencies before picking
- [ ] One parser, one definition of global flags (`-h/--help`,
      `-c/--category`, `-q/--quiet`, etc.), used by every subcommand —
      `sync.ts`, `ui.ts`, `exec.ts`, and `utils.ts`'s callers converge on it
- [ ] Replace `utils.ts`'s direct `process.exit(1)` calls with thrown
      errors or a return value the caller decides how to handle, so the
      parser is unit-testable without a subprocess
- [ ] `npm test` and `tsc` clean; existing flag-handling tests (e.g.
      `sync.test.ts:107`'s `-c` case) still pass

## Answer

_Not yet resolved._

## Comments

- 2026-08-15: Submitted by the maintainer as a backlog item from an
  external CLI/architecture review. Concrete claims (ad-hoc parsers, `-c`
  inconsistency, direct `process.exit`) verified against current source
  during triage.

---
id: a9ee9c8a-b889-4b13-9896-f85bac50e3c4
createdAt: 2026-08-16T18:57:41.864Z
importance: 4
tags:
  - exec
  - architecture
  - failure-fix
taskId: null
kind: task
map: 19803cce-ad56-4774-9492-49f6f5d71f67
status: unclaimed
---
# Lazy-load command dispatch to avoid premature DB open and model instantiation

## Question

Should command dispatch in `src/cli.ts` defer opening the memory store
(SQLite + embedder instantiation) and loading heavy command modules until a
command is confirmed to need them, so lightweight/help invocations return
fast?

## Context

Verified against current source (`src/cli.ts`) during triage of this
backlog item:

- Top-level `--help`/`-h` (no subcommand) already short-circuits before
  `NeuronMemory.open()` — that part of the original review's claim doesn't
  hold as stated.
- But every other branch (`status`, `memory`, `ui`, and anything falling
  through to the default dispatch) calls `NeuronMemory.open(process.cwd())`
  unconditionally before dispatching, including when the actual subcommand
  is itself `--help` (e.g. `neuron memory --help` checks for help at
  `memory.ts:121`, but only *after* `NeuronMemory.open()` already ran in
  `cli.ts`). Subcommand-level help still pays full DB-open +
  schema-migration + embedder-instantiation cost.
- `NeuronMemory`'s constructor eagerly does `new TransformersEmbedder()`
  (`src/index.ts:145`) regardless of which command is being run — model
  loading may be internally lazy inside that class, but the object graph
  (and whatever setup its constructor does) is built on every `open()` call.
- `src/cli.ts` statically imports every command handler from
  `commands/index.js` at module top level — ESM static imports evaluate the
  whole module graph before any dispatch logic runs, so even a command that
  never touches SQLite still pays for loading whatever `commands/index.js`
  pulls in transitively.

## Deliverables

- [ ] Push the help-flag check down so it runs before `NeuronMemory.open()`
      for every subcommand, not just the top-level case
- [ ] Convert `commands/index.js`'s re-exports (or `cli.ts`'s own imports)
      to dynamic `import()` gated on `mainCommand`, so unrelated command
      modules aren't loaded
- [ ] Confirm (via a quick timing check, e.g. `time neuron memory --help`)
      that this actually reduces wall-clock time before/after — the
      original review's claim was about static imports specifically;
      verify the real bottleneck (DB open vs. import graph vs. embedder
      construction) before optimizing the wrong one
- [ ] `npm test` and `tsc` clean

## Answer

_Not yet resolved._

## Comments

- 2026-08-15: Submitted by the maintainer as a backlog item from an
  external CLI/architecture review. Framing partially corrected against
  current source during triage — top-level `--help` already fast-paths;
  the real remaining gap is subcommand-level help and unconditional
  `NeuronMemory.open()` / eager static imports.

---
id: fca8b0c9-437f-4fa9-afdd-d30aa240c682
createdAt: 2026-08-16T18:57:42.060Z
importance: 4
tags:
  - architecture
  - release
  - failure-fix
taskId: null
kind: research
map: 19803cce-ad56-4774-9492-49f6f5d71f67
status: unclaimed
---
# Audit the codebase for refactor opportunities

## Question

Survey `src/` and identify concrete refactor opportunities — not perform
them. Produce a prioritized findings doc the maintainer can turn into
follow-up tickets.

## Context

No specific pain point named — this is a general health audit, not a
response to a known problem. Scope it broadly but concretely: look for
real signals (duplicated logic, oversized modules, leaky abstractions,
inconsistent patterns across similar code, dead code, tangled
dependencies) rather than stylistic nitpicks. The `codebase-design` skill's
deep-module vocabulary (interface depth, where a seam belongs, testability)
is a good lens to audit through, if useful.

Two adjacent tickets from this same session are relevant context, not
duplicates: the benchmarks/ cleanup and test-relocation tickets are
structural/organizational (where files live); this ticket is about the
production code's own design (how modules are shaped), a different axis
entirely.

## Deliverables

- [ ] A findings doc (linked from this ticket, not pasted inline) listing
      each identified opportunity: where it is, what's wrong with the
      current shape, and a rough size/risk estimate for fixing it
- [ ] Findings prioritized — flag anything that's blocking or actively
      causing bugs/friction versus general improvement
- [ ] Explicit recommendation on which findings deserve their own
      follow-up ticket versus which are minor enough to fix opportunistically
- [ ] No code changes made as part of this ticket — audit only, per its
      own scope

## Answer

_Not yet resolved._

## Comments

- 2026-08-15: Requested directly by the maintainer as a standalone
  tracker entry (not attached to any wayfinder map).

---
id: 3f174be0-ece9-4879-8259-33e1c3df39c6
createdAt: 2026-08-16T18:57:42.138Z
importance: 4
tags:
  - release
  - git
  - failure-fix
taskId: null
kind: task
map: 19803cce-ad56-4774-9492-49f6f5d71f67
status: unclaimed
---
# Clean up stray files at the repo root

## Question

Several files sitting at the repo root look like leftover scratch/planning
artifacts rather than live, maintained documentation. Decide, for each,
whether to delete, relocate, or fold into an existing doc.

## Context

Found by direct inspection of the repo root:

- **`RELEASE_2.0.0.md`** — a release checklist/notes doc for v2.0.0
  specifically (last touched 2026-07-31, the 2.1.0-rc1 scanner/summarizer
  commit). The project is now well past that (`CHANGELOG.md` is the live,
  maintained release history and already covers 2.0.0 onward). This file
  reads as superseded by `CHANGELOG.md`, sitting at root as a one-off
  leftover rather than an ongoing reference.
- **`TEST_INFRA.md`** and **`TEST_READY.md`** — planning/coverage-tracking
  docs written while building the `md-file-management` e2e test module
  (`test/e2e/mdFileManagement.e2e.test.ts`). Both sit at repo root rather
  than in `docs/` or alongside the test module they describe. `TEST_INFRA.md`
  was last touched 2026-08-08 (a config-related commit, likely incidental),
  `TEST_READY.md` not touched since the original 2026-07-28 implementation
  commit — plausibly stale status trackers for work that's long since
  landed and is now covered by the actual test suite + `benchmarks/README.md`.
- **`tmp/`** — a root-level directory, tracked in git, holding two files
  (`24-live-capture-1.txt`, `24-live-capture-2.txt`) that are genuine
  ticket evidence (captured hook-injection output from Ticket 24 / Map —
  neuron 2.4.0's pre-command-hook dogfooding session) — not disposable
  scratch. But the directory is named and positioned exactly like a scratch
  space, and critically **is not in `.gitignore`** — anything else dropped
  in `tmp/` in the future (by a human or an agent) will get committed by
  accident, the opposite of what a directory named `tmp/` implies.

None of this is disposable-without-thought: the `tmp/` evidence in
particular is real ticket history and shouldn't just be deleted. This
ticket is about giving each of these an intentional home, not a blanket
sweep.

## Deliverables

- [ ] `RELEASE_2.0.0.md`: deleted (superseded by `CHANGELOG.md`) or
      explicitly kept with a stated reason
- [ ] `TEST_INFRA.md` / `TEST_READY.md`: deleted, merged into
      `benchmarks/README.md` or `docs/`, or relocated next to
      `test/e2e/mdFileManagement.e2e.test.ts` if any of their content is
      still load-bearing
- [ ] `tmp/`'s two evidence files relocated somewhere that reads as
      permanent record (e.g. alongside other ticket evidence under
      `docs/design/` or `benchmarks/reports/`), and the ticket(s) that
      might reference them checked for path updates
- [ ] Either `tmp/` is removed entirely once its current contents move, or
      it's kept as deliberate scratch space and added to `.gitignore` so
      this doesn't recur
- [ ] A quick pass for anything else in the same category (leftover
      root-level docs, accidentally-tracked scratch output) turned up
      during this ticket's own work, since this survey wasn't exhaustive

## Answer

_Not yet resolved._

## Comments

- 2026-08-15: Requested directly by the maintainer as a standalone
  tracker entry (not attached to any wayfinder map). Candidates above
  found by a direct root-level survey, not a full repo sweep — the last
  deliverable exists because this ticket's own execution is likely to
  surface more.

---
id: f946d84b-7049-4a81-9c6b-96643befde2a
createdAt: 2026-08-16T18:57:42.232Z
importance: 4
tags:
  - testing
  - deep
  - scan
taskId: null
kind: task
map: 19803cce-ad56-4774-9492-49f6f5d71f67
status: unclaimed
---
# Relocate tests out of src/ into test/

## Question

Move test files currently living inside `src/` into the top-level `test/`
folder, so `src/` holds only production source.

## Context

**Scale of the change**: 63 `*.test.ts` files currently live inside `src/`,
colocated next to the source file they exercise (e.g.
`src/components/reranker.ts` / `src/components/reranker.ts.test.ts`,
`src/storage/mdStorageAdapter.ts` / `.test.ts`). This is a full,
consistent pattern across the entire tree, not scattered debris — every
one of these follows the same naming convention and `tsconfig.json`
already carries a dedicated exclude for it (`"exclude": ["src/**/*.test.ts",
"src/e2e/**"]`), and `package.json`'s `test` script runs
`vitest run --dir src` specifically to pick them up in place. Colocated
unit tests next to source is itself a common, often deliberate convention
(easy to find the test for a file, easy to see coverage gaps) — worth
confirming this move is actually wanted, not just assumed, before doing
the mechanical work.

Separately, `test/e2e/` already exists as a **different** kind of test
suite — Pillar-based end-to-end/integration tests (e.g.
`test/e2e/antagonistic-write.test.ts`) that exercise the built CLI as a
subprocess, not individual units. That split (unit tests colocated in
src/, e2e tests in top-level test/) may be the intended architecture
already, in which case this ticket's job is confirming/documenting that
split rather than moving all 63 files into `test/`.

## Design questions to resolve before implementation

- Is colocation itself the problem (maintainer wants `src/` completely
  test-free, moving all 63 files into `test/` mirroring `src/`'s
  directory structure), or is the actual complaint something narrower —
  e.g. specific test files that don't follow the `*.test.ts` colocation
  pattern and are genuinely misplaced? Confirm which before starting;
  the two are very different amounts of work.
- If a full move is confirmed: mirrored directory structure under `test/`
  (e.g. `test/components/reranker.test.ts`) or flattened? Import paths in
  every one of the 63 files reference sibling source files by relative
  path (`../` chains) and will all need updating.
- Tooling that assumes colocation and needs updating in lockstep:
  `tsconfig.json`'s exclude list, `package.json`'s `test` script
  (`vitest run --dir src`), any vitest config controlling test discovery,
  and coverage configuration if it exists.
- Does `test/e2e/` stay where it is, or does this ticket also reorganize
  it as part of a single `test/` layout decision?

## Deliverables

- [ ] Scope decided (full move vs. narrower fix) with the maintainer
- [ ] Target `test/` layout decided
- [ ] All in-scope files moved, imports updated
- [ ] `tsconfig.json`, `package.json` test scripts, and any vitest config
      updated to match the new layout
- [ ] `npm test` runs clean at the same pass count as before the move
- [ ] `tsc` clean

## Answer

_Not yet resolved._

## Comments

- 2026-08-15: Requested directly by the maintainer as a standalone
  tracker entry (not attached to any wayfinder map).

---
id: 1c4b37a5-0fc2-491c-81fd-26dcc542d7ca
createdAt: 2026-08-16T18:57:42.325Z
importance: 4
tags:
  - architecture
  - release
  - failure-fix
taskId: null
kind: task
map: 19803cce-ad56-4774-9492-49f6f5d71f67
status: unclaimed
---
# Clean up benchmarks/ into a coherent, rerunnable release-benchmark module

## Question

`benchmarks/` mixes two genuinely different things under one folder with no
separation between them: (1) a real, documented, rerunnable release-benchmark
system, and (2) a growing pile of one-off validation scripts written per
wayfinder ticket that were never meant to run again. Decide the right
structure to make (1) presentable and reliably rerunnable for every new
release, and where (2) should live so it stops looking like part of the same
system.

## Context

**What's already coherent** (`benchmarks/README.md`): a documented
three-tier system — `npm test` (unit), `npm run test:e2e` (sanity,
`benchmarks/e2e-runner.js`), `npm run bench` (full, same runner
`--full`) — plus `bench:report`/`bench:view` to re-render results, and a
family of `bench:token-ab`/`bench:gitlog-ab`/`bench:swebench-ab`/
`bench:hint-follow` scripts wired into `package.json`. This part already
does what the ticket asks for.

**What isn't wired in at all**: at least 7 subdirectories —
`architecture-card-ab/`, `near-dup-ab/`, `nli-polarity-ab/`, `pruning-ab/`,
`reranker-gate/`, `salvage-expansion/`, plus assorted loose top-level
scripts (`token-economics.mjs`, `generate-dashboard.js`) — that are
one-time A/B validation scripts written to resolve a specific wayfinder
ticket (e.g. `near-dup-ab/run-ab.ts` for Ticket 7, `nli-polarity-ab/run-ab.ts`
for Ticket 8, both under Map — neuron 2.4.2). None of these have a
`package.json` script entry; each is invoked manually via
`npx tsx benchmarks/<dir>/run-ab.ts`. They were written as ticket evidence,
not as a recurring release gate — forcing them into the same "rerun every
release" shape as `bench:*` may not even be correct for all of them.

## Design questions to resolve before implementation

- Which existing subdirectories are genuinely **release benchmarks**
  (should be rerunnable, wired into `package.json`, part of the
  documented tier system) versus **one-time ticket-validation evidence**
  (historical, cited from a ticket/findings doc, not meant to be rerun on
  every release)? Sorting this is most of the work — don't assume every
  subdirectory belongs in the "coherent module."
- Where does ticket-validation evidence live once separated out — stays
  under `benchmarks/` in a clearly-labeled subtree (e.g.
  `benchmarks/validations/`), or moves closer to the findings docs that
  cite it (`docs/design/write-time-quality/*-findings.md` already link to
  `benchmarks/near-dup-ab/raw-scores.json` etc. by path — moving the
  scripts would break those links unless updated in lockstep)?
- For whatever counts as the real release-benchmark set: one consistent
  entry-point convention (npm script + CLI args), one consistent output
  location (`benchmarks/reports/` already exists — is everything supposed
  to land there?), one consistent corpus/fixture convention.
- `results/` vs `reports/` — two top-level output directories exist today;
  confirm whether both are still live or one is dead weight.
- `agent-memory-benchmark/` is an external harness (per `.gitignore`'s own
  comment, "cloned, not vendored") — confirm it's excluded correctly
  everywhere (docs, any future module boundary) and isn't accidentally
  swept into whatever "coherent module" packaging happens here.

## Deliverables

- [ ] Each existing subdirectory classified: release-benchmark or
      ticket-validation-evidence
- [ ] Release-benchmark set given one consistent entry-point/output
      convention, documented in `benchmarks/README.md`
- [ ] Ticket-validation evidence relocated (or explicitly left in place
      with rationale), with every doc/ticket link that references it by
      path updated to match
- [ ] `npm run bench` (or equivalent) runs clean end to end against a
      current build
- [ ] `npm test` and `tsc` clean

## Answer

_Not yet resolved._

## Comments

- 2026-08-15: Requested directly by the maintainer as a standalone
  tracker entry (not attached to any wayfinder map).

---
id: 19803cce-ad56-4774-9492-49f6f5d71f67
createdAt: 2026-08-17T00:45:36.259Z
importance: 4
tags:
  - planning
  - cleanup
taskId: null
kind: map
status: unclaimed
---
# Map — Codebase Cleanup & Engineering Health

## Destination

Every item in this backlog resolved to a clear call — build it, defer it, or
explicitly decline it — so nothing lingers as an unscoped "should we" hygiene
question. Two threads run through it: repo/file hygiene (`benchmarks/`
structure, test file layout, root-level cruft, a general refactor audit) and
CLI/engine ergonomics (command dispatch startup cost, flag parsing, output
format consistency, `neuron memory` ergonomics, SQLite write-path hardening,
a background-daemon feasibility call, and CLI subcommand/exit-code topology).
Reached when every ticket below is resolved — each with either a scoped
follow-up ticket outside this map, or an explicit "not doing this" recorded
on the ticket itself.

## Notes

- **Chartered 2026-08-16**, parked in `tickets-future` — these 11 tickets
  are pre-existing orphan backlog items (no `map` field) surfaced during
  Ticket 9 (neuron-2.4.3)'s tickets-category migration; that ticket's own
  Answer flagged them as an unresolved edge case ("the maintainer may want a
  different rule"). This map is that rule: give them a home. Nothing here is
  claimed or in progress — promote to `tickets-present` manually when ready
  to sequence.
- All 11 tickets already existed as fully-specified questions before this
  map was chartered — no `/grilling` pass was needed to sharpen them, only
  a container to index them under. Treat work on this map as review and
  prioritization, not fresh discovery.
- Most tickets are phrased as a yes/no design call ("should X"), verified
  against source at the time they were filed — re-verify against HEAD before
  resolving, since source may have drifted since.

## Decisions so far

(none yet)

## Not yet specified

(none — all in-scope work is already captured as the 11 tickets below;
nothing further is expected to graduate here unless resolving one of them
surfaces a new question)

## Out of scope

(none yet)
