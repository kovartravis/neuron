---
name: neuron-memory
description: Manage agent session context by interviewing the user, configuring neuron.yaml, loading learnings and decisions, and pruning obsolete entries from the memory store.
---

# Neuron Memory Store Management

This skill guides how agents configure and interact with `@kovartravis/neuron` to maintain persistent, category-driven memory across sessions.

> [!NOTE]
> **First-time setup on a fresh project now lives in `neuron-onboarding`**
> (wayfinder ticket 5, Map — MCP Server & Setup/Onboarding Skill Split):
> the ask-first interview, `neuron.yaml` generation, `AGENTS.md` sync, the
> write-side-enrichment and `strict`-mode interviews, initial
> architecture-scan configuration, and onboarding-migration of an existing
> `CLAUDE.md`/`AGENTS.md`/`CURSOR.md`. Sections 0/0a/0b and §7 steps 1-2
> below still document that content today and remain correct — trimming
> them out of this file once every reader can be assumed to reach
> `neuron-onboarding` instead is ticket 6's job, not yet done. If you are
> onboarding a project that has no `neuron.yaml` yet, use `neuron-onboarding`
> first; come back here once setup is complete.

> [!CRITICAL]
> **USER INTERACTION & EXPLANATION MANDATE**
> Before taking ANY action or executing any memory operation (including querying memory, modifying `neuron.yaml` or `AGENTS.md`, writing learnings/decisions, running sync commands, or pruning entries), the agent **MUST ALWAYS**:
> 1. **Ask the User**: Ask the user what they want to do or confirm their explicit intent and options.
> 2. **Explain First**: Clearly explain the exact action, CLI command, or file modification it plans to perform before executing it.

## 0. Initial Project Setup & Interview Protocol

When asked to set up memory for a project or configure memory settings:

> [!IMPORTANT]
> **`neuron init` already wrote a working `neuron.yaml`.** As of 2.2.0 the
> project is usable before this interview runs: `init` scaffolds a config with
> `storage.mode: md`, the four standard categories, and default pull rules. So
> this interview is a **refinement** step, not the only path to a working
> project — and it now has an existing file to reason about.
>
> That changes two things. First, **read the file before asking anything** and
> present the questions below as *"here is what you have; what should change?"*
> rather than as a blank-slate questionnaire. Second, **never rewrite the file
> wholesale** — it may already carry the user's edits. Change the keys the user
> asked about and leave the rest alone.

> [!NOTE]
> **`neuron.yaml` is a file the tool itself can write to, not just the agent
> (ADR 0017).** Categories stay advisory, not validated: a write against a
> category `neuron.yaml` doesn't yet declare is never rejected. Instead it
> auto-appends a minimal `categories.<name>: {}` block to the file on disk
> (comments and formatting preserved) the first time that category is
> written. So a `categories` entry with no `description`/`tags` you didn't
> add yourself is expected, not a sign something else edited the file — it's
> this hook converging the declared set toward what the store actually
> contains. `neuron status --repair` backfills any category that already had
> rows before this hook existed.

1. **Ask & Explain First (Interview Protocol)**:
   Before taking any action or writing configuration files, explain to the user what setup steps will be performed, and ask how they would like memory configured for their project:
   - **Default Categories**: `learning` (rules, conventions, failure fixes).
   - **Custom Categories**: Offer options to add custom categories such as `decisions` (ADRs & design choices), `snippets` (reusable code), or `architecture`.
   - **Storage Mode**: Ask whether memory should live as markdown files with SQLite kept as a derived index (`md` — the default, and what `init` wrote) or in the SQLite vector database only with no `.md` files (`vector`). Either can be overridden per category — see "Per-category storage" below — so routing e.g. a high-volume category to `vector` while everything else stays `md` doesn't need a special top-level mode; the override is always live. `md-only`, `dual`, `vector-only`, and `split` are all pre-2.3.0 spellings: `md-only` and `dual` now mean `md`, `vector-only` now means `vector`, and `split` (which used to be the only way to make a per-category override take effect) also now means `md` — all four still parse and warn on `stderr`. Do not write any of them into a new config.
     - Under `md`, the `.md` files are the **record of truth**: they are reconciled into the index on every command, and an entry deleted from a `.md` file is deleted from the index. That is the point of the mode, but say it out loud before recommending it — it means hand-editing those files is a supported operation *and* a destructive one.
   - **Per-category storage**: Ask if any individual category should override the top-level mode (e.g. `categories.telemetry.storage: vector` to keep a high-volume category out of markdown while the rest stays `md`). Precedence is `categories.<name>.storage > storage.mode > "md"`. If a category's resolved storage flips from `md` to `vector` and it already has an existing `.md` file, that file is left on disk but stops being updated — mention this so it doesn't go unnoticed.
   - **Exec Triggers**: Ask if there are specific shell commands (e.g. `npm test`, `git commit`, `cargo build`) that should trigger rule lookups.
   - **Architectural Scan Config**: Ask whether to enable automatic architecture scanning (`enabled: true/false`), target category (default `architecture`), and directory traversal depth (default `3`). Explain how the scan analyzes codebase structure to ingest architecture cards into memory.
   - **Write-Side Enrichment**: Ask which metadata the agent should keep supplying by hand and which `neuron memory add` should infer. See §0a below — this question has two halves, config *and* agent instructions, and answering only one produces a store that silently does not enrich.

2. **Generate `neuron.yaml`**:
   Write `neuron.yaml` at the project root based on the user's answers (or standard defaults if they prefer default setup):
   ```yaml
   version: "1.0"

   storage:
     mode: md            # md | vector
     path: .neuron       # directory where .md category files are stored

   categories:
     learning:
       description: Agent conventions, rules, and failure fixes
       tags:
         - rule
         - convention

     # Custom categories requested by user:
     architecture:
       description: Architectural blueprints & structure cards
       tags:
         - architecture
         - topology
         - scan

   scan:
     enabled: true          # auto-scan on init; also enables drift reporting
                            # in `neuron status` and `neuron exec`
     category: architecture # target category for the blueprint card
     depth: 3               # structural traversal depth

   pullRules:
     default:
       categories:
         - learning
         - architecture
       limit: 5
       minScore: 0.35

     onExec:
       - commandPattern: ".*"
         categories:
           - learning
         limit: 5

       - commandPattern: "^(git|gh|npm) "
         categories:
           - learning
           - decisions
         limit: 8
   ```

3. **Configure & Align `AGENTS.md` / Instruction Files (Mandatory)**:
   Always write or update `AGENTS.md` (or `CLAUDE.md`, `CURSOR.md`) immediately after creating or updating `neuron.yaml`. Ensure `AGENTS.md` explicitly documents:
   - All declared categories from `neuron.yaml` (e.g., `learning`, `decisions`, `architecture`).
   - Architectural scan settings (e.g., `Architecture scan settings: enabled: true, category: architecture, depth: 3`).
   - CLI command examples for querying custom categories (e.g. `neuron memory query "<query>" --categories learning,decisions`).
   - CLI command examples for adding entries to custom categories (e.g. `neuron memory add --category decisions "<ADR details>" --tags adr,<topic>`).
   - If `storage.mode` (or any category's `storage` override) resolves to `md` (i.e. not `vector`), document the `.neuron/` directory, that those files are the record of truth, and the `neuron sync` command.

4. **Synchronize On Edits**:
   Whenever `neuron.yaml` is created or modified in any session, always update `AGENTS.md` immediately to keep category lists, CLI flags, and agent operating procedures strictly synchronized.

## 0a. Write-Side Enrichment Interview

`neuron memory add` can infer the metadata the caller did not supply. Every field
is optional, and **anything passed explicitly is honoured untouched** — inference
only ever fills a gap.

### The trade-off to present

| Posture | Write latency | Failure risk | Tag vocabulary |
|---|---|---|---|
| Agent passes all three flags | none | none | fragmented |
| Agent omits all three | up to ~3.5s per write | hard error when inference cannot answer | converged |
| **Agent passes `--category`, omits `--tags` and `--importance`** | **none** | **none** | **converged** |

**Recommend the third.** It is not a compromise: `--category` is the only field
whose omission can trigger a model load and the only one that can hard-fail the
write, while tags are selected by the already-loaded embedder for about a
millisecond.

> [!IMPORTANT]
> **`--importance` is never inferred.** There is no setting that infers it: the
> job was measured, found to be noise, and removed. An omitted `--importance` is
> stored as the default **`3`** — no model call, no inference. A trivial typo fix
> and a critical data-loss warning both land on `3`.
>
> This matters because `3` is also `neuron memory prune`'s default ceiling and
> the comparison is inclusive, so **every entry written without `--importance`
> becomes prune-eligible** once it is older than `--days`. Passing
> `--importance 4` or `5` at write time is the *only* thing that protects an
> entry from a bare prune. See §6.

Recommend the second posture for humans adding memories ad hoc, where a few
seconds are invisible and a readable error beats learning the project's taxonomy
first. The two can coexist — posture is protocol wording, not config.

### Why omitting `--tags` is the point

Tags and content are what the full-text index covers, so a fragmented tag
vocabulary is fragmented keyword recall: an entry tagged `treesitter` is
invisible to a query that says `tree-sitter`. Inferred tags are *selected* from a
closed vocabulary — every tag declared in `neuron.yaml`, plus every store tag
carried by at least three entries — so inference can only converge the
vocabulary, never widen it. Minting a new tag stays a deliberate act: pass it.

### The config half

```yaml
llm:
  enrichment:
    enabled: true          # master toggle; false is the A/B control arm
    category: infer        # infer | <declared-category-name> | off
    tags: infer            # infer | off
    categoryStrategy: centroid   # centroid | model
    timeoutMs: 15000
    maxTags: 3
    minTagSimilarity: 0.5
```

Points worth raising with the user:

- **`enabled` is separate from the per-field keys on purpose.** `enabled: false`
  disables the whole job and is the measurement arm; `category: off` is a
  standing preference that leaves the other fields inferring.
- **A literal category name is the *fallback***, used when inference cannot
  answer. Left as `infer`, that case is a hard error instead — which is the
  right default if filing an entry into the wrong category would be worse than
  being told to pass the flag.
- **There is no `importance` key.** It existed through 2.2.0-rc1/rc2 and was
  removed: the local 0.5B model's importance judgement benchmarked as
  *negatively* discriminating, so it shipped `off` and then went entirely. A
  `neuron.yaml` still carrying the key parses fine — the key is ignored. Tell the
  user to pass `--importance` on writes that must survive a prune.
- **`categoryStrategy: centroid` beat `model` 9/9 to 1/9** on the benchmark
  corpus. Its one weakness: a store with no entries has no centroids, so on a
  cold store an omitted `--category` hard-errors until the first entries are
  filed explicitly.

### The agent-instruction half (do not skip)

After writing `neuron.yaml`, update `AGENTS.md` / `CLAUDE.md` so the protocol's
command examples match the chosen posture. Config that infers tags while the
protocol still tells the agent to pass `--tags` on every write produces a store
where enrichment never runs — the config looks right and does nothing.

### Operating it

```bash
neuron memory add "<content>" --category learning   # recommended posture
neuron status                                       # degradation counters
```

Enrichment resolves inline on every write — both inferred fields use the
embedder that is already loaded on the write path — so there is nothing to drain
and no backlog to watch. Check `enrichment.degraded` in `neuron status`
occasionally: a non-zero counter means inference is silently falling back, which
is how a broken local model otherwise goes unnoticed for months.

## 0b. Determinism: Shape, Byte, Value — and `strict` Mode

"Deterministic" is not one property — neuron's own design work (ADR 0013,
ticket 36) split it into three, and only two of them ship on by default:

| Property | What it means | On by default? |
|---|---|---|
| **Shape** | Every entry conforms to its category's declared field schema — a required field with no `default:` hard-errors the write rather than landing malformed. | Yes, always enforced at `transact()`, the single choke point every writer shares. |
| **Byte** | A given input produces byte-identical output every time — the architecture card in particular (ticket 35/37) only changes when the codebase does. | Yes, always. |
| **Value** | The *values* a stored entry ends up with depend only on what the caller passed, never on unrelated store state. | **No — only under `strict: true`.** Off by default because centroid-based tag and category inference (§0a) is on by default, and centroids are built from whatever else is in the store, so the same content can enrich differently as the store changes. |

Value determinism is unreachable while inference runs, by construction — it
is not a bug the other two properties happen to share. A project that wants
to claim "fully deterministic," not just "schema- and byte-deterministic,"
has to give up inference's convenience for it. That trade is what `strict`
mode is for.

### What `strict: true` does

```yaml
strict: true   # top-level key, sibling to storage/categories/llm
```

- **Disables tag inference** (`llm.enrichment.tags: infer` becomes a no-op) —
  an entry gets exactly the tags the caller passed, or none.
- **Disables category *inference*** (`llm.enrichment.categoryStrategy`'s
  centroid/model call never runs) — an omitted `--category` hard-errors,
  naming `strict: true` as the cause, unless a fallback is configured (next
  bullet).
- **Does not touch a literal `llm.enrichment.category` fallback name.** A
  fixed category name is a constant, content-independent default, not
  inference — it stays available as the answer for an omitted `--category`
  even under `strict`, and using it never calls the embedder or the model.
- **Does not affect shape or byte determinism** — those are already always on
  and unaffected by this key.

### The trade-off to present

Recommending `strict` trades away §0a's "pass `--category`, let tags infer"
posture: **every write needs an explicit `--category`** (or a configured
fallback name), and **tags never auto-fill** — an agent that wants tags under
`strict` must pass `--tags` itself, which reintroduces the fragmented-
vocabulary risk §0a's inference exists to avoid. Recommend `strict` only when
the user has explicitly said the literal "deterministic" claim matters more
than that convenience; it is not the default recommendation from §0a's own
interview.

## 1. Beginning of Run (Context Loading)

> [!IMPORTANT]
> **Skip this section entirely on a harness with a deterministic recall hook
> wired** (as of 2.2.0: Claude Code, Codex CLI — see `neuron init`'s
> `hooks.installed` output). There, `neuron hook <harness> pre-prompt` already
> injects matching memory into context before every turn, so a manual query
> here would just repeat what the harness already delivered. As of 2.4.0 the
> same hook also searches an indexed copy of this repo's own `git log`
> (subject + body, semantically matched, gated the same way memory recall is)
> and injects any relevant commits — so a manual `git log`/`git show` search
> for "what changed and why" is also redundant here, not just memory lookup.
> Ticket/issue numbers in a matched commit message can still collide across
> concurrent planning efforts, so verify a specific number against `git show`
> before treating it as certain. The steps below are the fallback for a
> harness with no deterministic hook: query manually, because nothing else
> will.

At the very start of a session, before running any other commands or modifying files, load relevant past context:

1. Formulate a query matching your assigned task or current goal.
2. Run the query against the categories relevant to the task:
   ```bash
   neuron memory query "<search query matching task>" --categories learning,decisions
   ```
   Omitting `--categories` searches every category:
   ```bash
   neuron memory query "<search query matching task>"
   ```
3. Read retrieved entries and treat relevant rules/decisions as active system instructions.
4. If the query returns no results, try a broader term (e.g., `git`, `database`, `tdd`).

## 2. Pre-Command Memory Lookup & Execution

> [!IMPORTANT]
> **Skip this section entirely on a harness with the `pre-command` hook
> wired** (as of 2.4.0: Claude Code, Codex CLI — see `neuron init`'s
> `hooks.installed` output). There, `neuron hook <harness> pre-command`
> already fires the same `onExec` lookup before every Bash tool call, so a
> manually-typed `neuron exec -- <command>` wrapper would just repeat what
> the harness already delivered. Unlike §1's recall hook, this one is a
> permanent structural ceiling for Copilot CLI and Cursor — neither exposes a
> context-carrying hook field for shell commands at all (ADR 0014's
> 2026-08-10 amendment) — so they keep this section indefinitely, not just
> until a future adapter update. The steps below are the fallback for a
> harness with no `pre-command` hook: wrap manually, because nothing else
> will.

Before executing critical build, test, database, or tool commands:

1. Wrap command execution with `neuron exec`:
   ```bash
   neuron exec -- <command>
   ```
   *Example:* `neuron exec -- npm test` or `neuron exec -- npx vitest run`
2. `neuron exec` evaluates `pullRules.onExec` from `neuron.yaml` and prints matching entries from active categories to `stderr` before executing the command.
3. If `neuron exec` is unavailable, run `neuron memory query "<command keywords>" --categories learning` manually prior to execution.

## 3. Closed-Loop Failure Feedback (Failure-Triggered Learning Capture)

Whenever a command execution, test run, or tool invocation fails:

1. Investigate the failure and identify the verified root cause and fix.
2. Immediately after resolving the issue (and before moving to the next task), record the learning to prevent future agents from repeating the mistake. **Do NOT write 1-sentence summaries.** Memory entries MUST be detailed, multi-sentence explanations (at least 3-4 sentences) capturing context, root cause, exact fix, and code/command examples:
   ```bash
   neuron memory add --category learning "Fix for <error/issue>: <context & symptom>. <verified root cause>. <exact resolution steps & code/command example>." --importance 4
   ```
   Tags are left to inference (§0a) — a failure-fix's category and content already
   carry `failure-fix`-style signal for the centroid to select from.

## 4. End of Run (Memory Recording)

Before finishing your turn and ending the session, check whether this session
produced a `decisions`/`learning` entry — that is what makes the session
worth recording at all. There is no separate action-log category by
default; if nothing was decided, there is nothing else to write.

1. **Record New Learnings**: If you established new rules, resolved
   configurations, or fixed a failure, record it as a detailed multi-sentence
   entry (3-4 sentences minimum), linked to the task it came from:
   ```bash
   neuron memory add --category learning "<new rule/learning established with full context, rationale, and exact implementation details>" --task-id <id>
   ```
2. **Record Architectural Decisions**: If you changed module boundaries or
   made a design choice worth preserving, write it to the `decisions`
   category, linked the same way:
   ```bash
   neuron memory add --category decisions "<decision, rationale, and alternatives considered>" --task-id <id>
   ```
   - **`--tags`**: leave it to inference (§0a) — pass it explicitly only to
     mint a genuinely new tag, which is a deliberate act, not the default.
   - **`--task-id`**: Link the entry to the ticket or issue being resolved.
     Use the ticket/issue number (e.g., `01-db-schema-postgres` for local
     issues, or `#42` for GitHub/GitLab). Do NOT use process/task IDs like
     `task-144`.
3. **Refresh the Blueprint** if the session changed the codebase structure — see Section 8.

> [!NOTE]
> **A project that keeps its own append-only action-log category** (any
> name — nothing ships one by default) should shrink that category's entry
> to a short pointer sharing the same `--task-id` whenever step 1 or 2 above
> already wrote the detail, rather than restating it in full. That is a
> project-specific convention to ask about during setup (§0), not a
> built-in behavior.

> **Note**: `neuron learn` still works as an alias but is deprecated as of
> 2.1.0 and prints a warning to `stderr`. Prefer
> `neuron memory --category learning`. `neuron history` and the `history`
> category it defaulted to are gone, not merely deprecated — nothing ships
> it as a default, alias, or hardcoded assumption anymore.

## 5. Markdown File Storage & Sync (`storage.mode: md`, or a category's `storage: md` override)

Under `md` (the default, whether set at the top level or via a per-category override), memory entries are stored as category-based Markdown files inside the `storage.path` directory (default: `.neuron/`), and those files are the **record of truth** — SQLite is a derived index reconciled from them on every command, not a second copy:

- **File Layout**: One `.md` file per category: `.neuron/learning.md`, `.neuron/decisions.md`.
- **Entry Format**: Each entry is a YAML frontmatter block followed by body text:
  ```markdown
  ---
  id: 01j8x92a3b4c
  category: learning
  createdAt: 2026-07-29T04:00:00.000Z
  importance: 4
  tags:
    - failure-fix
    - gemini
  ---
  Always run the linter before pushing to CI...
  ```
- **Git-Trackable**: Commit `.neuron/*.md` files to Git to share memory across team members.
- **Sync Command**: After manually editing `.neuron/*.md` files or pulling a colleague's changes, run:
  ```bash
  neuron sync                  # bidirectional sync: Markdown <-> vector DB
  neuron sync --dry-run        # preview changes without writing
  neuron sync --force          # force re-embed all entries ignoring content hashes
  ```

  > [!IMPORTANT]
  > **A manual `.md` edit needs `--force` to actually take effect.** `sync`
  > only auto-propagates entries that exist on just one side — that's
  > unambiguous. When an entry exists on **both** sides with **different**
  > content, `sync` has no reliable way to tell which side was actually
  > edited (there is no `updatedAt` in `.md` frontmatter, and a normal
  > `memory update` never changes `createdAt` on either side), so it reports
  > the entry as a **conflict**, exits non-zero, and touches neither store
  > rather than guess. Run `neuron sync --force` to make markdown
  > authoritative and push your edit through — this is genuinely required
  > after hand-editing a `.md` file, not merely a `--dry-run`-style option.
- **Auto-Scaffold**: On first `neuron init` or `neuron sync`, the `.neuron/` directory and default category files are created automatically if missing.

## 6. Periodic Maintenance (Clean & Refresh)

When the user requests memory maintenance (e.g., "clean memory", "prune obsolete learnings", or "refresh memory store"):

1. **Review Learnings**:
   - List active learnings:
     ```bash
     neuron memory list --categories learning --limit 100
     ```
   - Cross-reference each learning with the current state of the codebase, `AGENTS.md`, and any `docs/adr/*.md` files.
   - Remove outdated or redundant learnings:
     ```bash
     neuron memory delete <id> --category learning
     ```
2. **Prune Old Entries from One Category** — read this before running it:

   > [!WARNING]
   > **`neuron memory prune --category <name>` deletes far more than
   > "low-importance" entries, and there is no undo.**
   >
   > `--category` is required — prune always targets exactly one category,
   > never the whole store. The defaults are `--days 30` and `--importance 3`,
   > and the importance comparison is **inclusive** (`importance <= 3`). Every
   > entry written *without* an explicit `--importance` is stored at the
   > default of **3**, so a bare prune deletes **every entry in that category
   > older than 30 days that was not explicitly marked 4 or 5** — in practice,
   > almost the whole category for one that's never rated its entries
   > explicitly, not the handful the phrase "low-importance" suggests.

   **Always preview before deleting.** There is no `--dry-run` for `prune`, so
   count the matches first:

   ```bash
   # How many entries in <category> would a default prune remove?
   neuron memory list --category <category> --limit 1000
   ```

   Then prune deliberately, passing the threshold you actually mean:

   ```bash
   neuron memory prune --category <category> --days 30 --importance 1   # only entries marked 1
   neuron memory prune --category <category> --days 90 --importance 2   # older, still conservative
   neuron memory prune --category <category>                           # DANGER: --importance 3, i.e. nearly everything
   ```

   Because importance defaults to `3` on write, importance is only a useful
   prune filter if entries are **explicitly** rated as they are created. If a
   category's entries were written without `--importance`, treat `prune` as
   "delete all of this category older than N days" and decide on that basis.

3. **Sync After Prune** (if any category resolves to `md` storage):
   - After pruning entries from the vector DB, run `neuron sync` to keep Markdown files consistent:
     ```bash
     neuron sync
     ```

## 7. Architectural Scan & Configuration Protocol (`neuron scan`)

When asked to run an architectural scan or configure architecture analysis for a project:

1. **Ask & Explain Options First**:
   Before running any scan or modifying `neuron.yaml`, explain the available architectural scan options to the user and ask for their preferences:
   - **`enabled`** (`true` / `false`): Enables or disables automatic architecture scanning on `neuron init`.
   - **`category`** (e.g. `architecture`): Specifies which memory category stores the generated architecture blueprint card (default: `architecture`).
   - **`depth`** (integer, default `3`): Controls directory tree traversal depth when analyzing codebase structure.
   - **Config Persist Option**: Ask the user if they would like to add or update these scan settings directly in `neuron.yaml`.

2. **Update Config & `AGENTS.md` (if confirmed by user)**:
   If the user confirms adding or updating scan configuration:
   - Add or update the `scan:` block in `neuron.yaml`:
     ```yaml
     scan:
       enabled: true
       category: architecture
       depth: 3
     ```
   - Immediately update `AGENTS.md` to document the active architecture scan settings (`Architecture scan settings: enabled: true, category: architecture, depth: 3`).
   - Explain the exact configuration edits made to the user.

3. **Execute Architectural Scan**:
   - Run the scan command:
     ```bash
     neuron scan --category architecture --depth 3
     ```
     Or wrap command execution with `neuron exec`: `neuron exec -- neuron scan`
   - Explain the scan output (generated memory entry ID, target category, and summary of codebase structure) to the user.
   - Re-running `neuron scan` updates the existing blueprint card in place. It
     does not create a second card, so a re-scan after significant refactoring
     is safe and is the correct way to refresh a stale baseline.
   - Preview without writing to memory using `neuron scan --dry-run`
     (add `--json` for structured topology output).

4. **Read the Blueprint Before Changing Module Boundaries**:
   The scan stores one **Repository Architectural Blueprint** card containing
   the subsystem tree, tech-stack manifests, and exported symbol contracts.
   Query it before moving code between modules or changing a public API:
   ```bash
   neuron memory query "<subsystem or symbol name>" --categories architecture
   ```

## 8. Architectural Drift Protocol (`neuron scan --diff` / `--check`)

Drift is the gap between what the memory store believes the codebase looks like
and what it actually looks like now. A stale blueprint is actively misleading —
it will confidently describe modules that no longer exist.

1. **Check for drift when architecture matters**:
   ```bash
   neuron scan --diff            # human-readable drift report
   neuron scan --diff --json     # structured, for programmatic handling
   neuron scan --check           # exits 1 when drift exists (CI gating)
   ```

2. **Read the four buckets.** The report separates variance into:
   - `newModules` — directories or primary source files that appeared.
   - `removedModules` — directories or primary source files that disappeared.
   - `exportChanges` — exported classes, interfaces, functions, or structs added or removed.
   - `dependencyShifts` — package manifest additions or removals.

3. **React to drift, don't ignore it.** When drift is reported:
   - If the changes are the intended result of work just completed, **ask the
     user** whether to refresh the baseline, then run `neuron scan` to upsert
     the blueprint.
   - If the changes are unexpected, surface them to the user before proceeding
     — an unexplained removed module or dropped dependency is worth a question.
   - Do not silently re-scan to make a warning disappear.

4. **Passive drift signals.** When `scan.enabled: true`, drift also appears
   without an explicit check:
   - `neuron status` includes `drift: { hasDrift, changesCount, summary }`.
   - `neuron exec` prints a non-blocking warning to `stderr` before the command.
   Treat both as a prompt to run `neuron scan --diff` and read the detail.

5. **Refresh the baseline at session end** if the session changed module
   boundaries, added or removed a subsystem, or changed a public export
   contract. Pair it with the `decisions` entry explaining *why*:
   ```bash
   neuron scan
   neuron memory add --category decisions "<why the boundary changed>"
   ```

### Scanner accuracy

Symbols come from a parsed Tree-Sitter syntax tree for TypeScript, TSX,
JavaScript, Python, Go, Rust, Java and C++. For those, `exportChanges` is a
precise contract diff: call sites are no longer recorded as `method` symbols,
and multi-line declarations are captured whole.

`.cs`, `.swift`, `.rb` and `.php` have no grammar in 2.2.0 and fall back to
line-oriented matching, where multi-line declarations may still be truncated.
Treat their export contracts as a strong signal rather than a precise diff.

If `neuron scan --diff` reports **"Re-baseline Required"**, the stored card was
produced by a different parser than the current scan, so the two cannot be
compared. That is not drift and nothing is wrong with the code — run
`neuron scan` once to re-baseline. `--check` reports this as exit code `2`,
distinct from `1` for real drift.
