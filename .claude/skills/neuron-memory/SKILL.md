---
name: neuron-memory
description: Manage agent session context by interviewing the user, configuring neuron.yaml, loading learnings, recording history, and pruning obsolete entries from the memory store.
---

# Neuron Memory Store Management

This skill guides how agents configure and interact with `@kovartravis/neuron` to maintain persistent, category-driven memory across sessions.

> [!CRITICAL]
> **USER INTERACTION & EXPLANATION MANDATE**
> Before taking ANY action or executing any memory operation (including querying memory, modifying `neuron.yaml` or `AGENTS.md`, writing learnings/history/decisions, running sync commands, or pruning entries), the agent **MUST ALWAYS**:
> 1. **Ask the User**: Ask the user what they want to do or confirm their explicit intent and options.
> 2. **Explain First**: Clearly explain the exact action, CLI command, or file modification it plans to perform before executing it.

## 0. Initial Project Setup & Interview Protocol

When asked to set up memory for a project or configure memory settings:

1. **Ask & Explain First (Interview Protocol)**:
   Before taking any action or writing configuration files, explain to the user what setup steps will be performed, and ask how they would like memory configured for their project:
   - **Default Categories**: `learning` (rules, conventions, failure fixes) and `history` (action logs & completed tasks).
   - **Custom Categories**: Offer options to add custom categories such as `decisions` (ADRs & design choices), `snippets` (reusable code), or `architecture`.
   - **Storage Mode**: Ask whether entries should be stored in the vector database only (`vector-only`), as Markdown files only (`md-only`), or both simultaneously (`dual` or `split`). Default is `vector-only`.
   - **Exec Triggers**: Ask if there are specific shell commands (e.g. `npm test`, `git commit`, `cargo build`) that should trigger rule lookups.
   - **Architectural Scan Config**: Ask whether to enable automatic architecture scanning (`enabled: true/false`), target category (default `architecture`), and directory traversal depth (default `3`). Explain how the scan analyzes codebase structure to ingest architecture cards into memory.
   - **Write-Side Enrichment**: Ask which metadata the agent should keep supplying by hand and which `neuron memory add` should infer. See §0a below — this question has two halves, config *and* agent instructions, and answering only one produces a store that silently does not enrich.

2. **Generate `neuron.yaml`**:
   Write `neuron.yaml` at the project root based on the user's answers (or standard defaults if they prefer default setup):
   ```yaml
   version: "1.0"

   storage:
     mode: dual          # vector-only | md-only | dual | split
     path: .neuron       # directory where .md category files are stored

   categories:
     learning:
       description: Agent conventions, rules, and failure fixes
       tags:
         - rule
         - convention

     history:
       description: Action history log and completed task summary

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
           - history
         limit: 8
   ```

3. **Configure & Align `AGENTS.md` / Instruction Files (Mandatory)**:
   Always write or update `AGENTS.md` (or `CLAUDE.md`, `CURSOR.md`) immediately after creating or updating `neuron.yaml`. Ensure `AGENTS.md` explicitly documents:
   - All declared categories from `neuron.yaml` (e.g., `learning`, `history`, `architecture`).
   - Architectural scan settings (e.g., `Architecture scan settings: enabled: true, category: architecture, depth: 3`).
   - CLI command examples for querying custom categories (e.g. `neuron memory query "<query>" --categories learning,decisions`).
   - CLI command examples for adding entries to custom categories (e.g. `neuron memory add --category decisions "<ADR details>" --tags adr,<topic>`).
   - If `storage.mode` is `dual` or `md-only`, document the `.neuron/` directory and `neuron sync` command.

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

## 1. Beginning of Run (Context Loading)

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
   neuron memory add --category learning "Fix for <error/issue>: <context & symptom>. <verified root cause>. <exact resolution steps & code/command example>." --tags failure-fix,<topic> --importance 4
   ```

## 4. End of Run (Memory Recording)

Before finishing your turn and ending the session:

1. **Log Action History**: Record the action you took using the history log:
   ```bash
   neuron memory add --category history "<summary of what was built or fixed>" --tags <related-topics> [--task-id <id>]
   ```
   - **`--tags`**: Use comma-separated tags from a standard vocabulary where possible (e.g., `tdd`, `db-schema`, `refactoring`, `debugging`, `git`).
   - **`--task-id`**: Link the history to the ticket or issue being resolved. Use the ticket/issue number (e.g., `01-db-schema-postgres` for local issues, or `#42` for GitHub/GitLab). Do NOT use process/task IDs like `task-144`.
2. **Record New Learnings**: If you established new rules, resolved configurations, or made architectural decisions, record them explicitly as detailed multi-sentence entries (3-4 sentences minimum):
   ```bash
   neuron memory add --category learning "<new rule/learning established with full context, rationale, and exact implementation details>" --tags <topic>
   ```
3. **Record Architectural Decisions**: If you changed module boundaries or made a design choice worth preserving, write it to the `decisions` category:
   ```bash
   neuron memory add --category decisions "<decision, rationale, and alternatives considered>" --tags adr,<topic>
   ```
4. **Refresh the Blueprint** if the session changed the codebase structure — see Section 8.

> **Note**: `neuron learn` and `neuron history` still work as aliases but are
> deprecated as of 2.1.0 and print a warning to `stderr`. Prefer
> `neuron memory --category <name>`.

## 5. Markdown File Storage & Sync (`storage.mode: dual | md-only`)

When `storage.mode` is set to `dual`, `md-only`, or `split`, memory entries are stored as category-based Markdown files inside the `storage.path` directory (default: `.neuron/`):

- **File Layout**: One `.md` file per category: `.neuron/learning.md`, `.neuron/history.md`, `.neuron/decisions.md`.
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
2. **Prune Old History** — read this before running it:

   > [!WARNING]
   > **`neuron memory prune` deletes far more than "low-importance" entries, and
   > there is no undo.**
   >
   > The defaults are `--days 30` and `--importance 3`, and the importance
   > comparison is **inclusive** (`importance <= 3`). Every entry written
   > *without* an explicit `--importance` is stored at the default of **3**, so
   > a bare `neuron memory prune` deletes **every history entry older than 30
   > days that was not explicitly marked 4 or 5**.
   >
   > In practice that is almost the whole category. On the reference store,
   > 158 of 160 history entries match the default prune — not the handful the
   > phrase "low-importance" suggests.

   **Always preview before deleting.** There is no `--dry-run` for `prune`, so
   count the matches first:

   ```bash
   # How many entries would a default prune remove?
   neuron memory list --category history --limit 1000
   ```

   Then prune deliberately, passing the threshold you actually mean:

   ```bash
   neuron memory prune --days 30 --importance 1   # only entries marked 1
   neuron memory prune --days 90 --importance 2   # older, still conservative
   neuron memory prune                            # DANGER: --importance 3, i.e. nearly everything
   ```

   Because importance defaults to `3` on write, importance is only a useful
   prune filter if entries are **explicitly** rated as they are created. If your
   entries were written without `--importance`, treat `prune` as "delete all
   history older than N days" and decide on that basis.

3. **Sync After Prune** (if using `dual` or `md-only` mode):
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
   neuron memory add --category decisions "<why the boundary changed>" --tags adr,architecture
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
