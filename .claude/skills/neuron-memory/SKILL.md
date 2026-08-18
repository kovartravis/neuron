---
name: neuron-memory
description: Manage the ongoing operate loop for an already-configured @kovartravis/neuron project — load relevant memory at session start, wrap commands for pre-command lookup, record failures/decisions, sync markdown storage, run periodic maintenance and pruning, and troubleshoot common failure modes. For first-time setup on a fresh project, use neuron-onboarding instead.
---

# Neuron Memory Store Management

This skill guides how agents operate `@kovartravis/neuron` on a project that already has a working `neuron.yaml` — maintenance, help, and cleanup, not initial setup.

> [!NOTE]
> **First-time setup on a fresh project lives in `neuron-onboarding`**
> (wayfinder ticket 5, Map — MCP Server & Setup/Onboarding Skill Split):
> the ask-first interview, `neuron.yaml` generation, `AGENTS.md` sync, the
> write-side-enrichment and `strict`-mode interviews, initial
> architecture-scan configuration, and onboarding-migration of an existing
> `CLAUDE.md`/`AGENTS.md`/`CURSOR.md`. If you are onboarding a project that
> has no `neuron.yaml` yet, use `neuron-onboarding` first; come back here
> once setup is complete.

> [!CRITICAL]
> **USER INTERACTION & EXPLANATION MANDATE**
> Before taking ANY action or executing any memory operation (including querying memory, modifying `neuron.yaml` or `AGENTS.md`, writing learnings/decisions, running sync commands, or pruning entries), the agent **MUST ALWAYS**:
> 1. **Ask the User**: Ask the user what they want to do or confirm their explicit intent and options.
> 2. **Explain First**: Clearly explain the exact action, CLI command, or file modification it plans to perform before executing it.

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

## 7. Architectural Scan Execution & Blueprint (`neuron scan`)

> [!NOTE]
> **Initial scan configuration (`enabled`/`category`/`depth`, and writing the
> `scan:` block into `neuron.yaml`) lives in `neuron-onboarding`.** This
> section only covers running an already-configured scan and reading its
> output.

When asked to run an architectural scan for a project:

1. **Execute Architectural Scan**:
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

2. **Read the Blueprint Before Changing Module Boundaries**:
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

## 9. Troubleshooting

In-session diagnosis for the failure modes this skill's own commands produce.
This is "help" for an agent mid-operation, not a setup guide — for anything
about configuring a project for the first time, see `neuron-onboarding`.

### Enrichment silently degraded

**Symptom**: writes succeed, but tags/categories stop looking inferred — or
`neuron status`'s `enrichment.degraded` counter is non-zero.

**Cause**: `neuron memory add`'s inference job (tag/category selection) is
falling back rather than erroring loudly, so nothing on the write path
complains.

**Fix**: check `neuron status` for `enrichment.degraded` periodically — a
non-zero counter is the only signal, since a degraded write still succeeds.
Investigate the embedder/model path if it climbs; there is no auto-recovery.

### `sync` reports a conflict

**Symptom**: `neuron sync` exits non-zero and reports an entry as a
**conflict** instead of propagating a hand-edit to `.md` files.

**Cause**: the entry differs on both sides (markdown and the SQLite index)
and `sync` has no `updatedAt` in `.md` frontmatter to tell which side was
actually edited, so it refuses to guess and touches neither store.

**Fix**: run `neuron sync --force` to make markdown authoritative and push
the edit through. This is genuinely required after hand-editing a `.md`
file — a plain `neuron sync` will not resolve it. See §5 for the full sync
command reference.

### `prune` deleted far more than expected

**Symptom**: `neuron memory prune --category <name>` removed nearly an
entire category, not just a handful of "low-importance" entries.

**Cause**: every entry written *without* an explicit `--importance` is
stored at the default of `3`, and `prune`'s default ceiling is also `3`,
compared **inclusively**. A category that never rated its entries
explicitly loses almost everything older than `--days` on a bare prune.

**Fix**: there is no undo and no `--dry-run`. Before pruning, count matches
with `neuron memory list --category <category> --limit 1000`, then pass an
explicit, deliberate `--importance` threshold (e.g. `--importance 1` to
only catch entries explicitly marked lowest). See §6 for the full
procedure.

### `neuron scan --diff` says "Re-baseline Required"

**Symptom**: `neuron scan --diff` reports "Re-baseline Required" (exit code
`2`) instead of a drift report.

**Cause**: this is **not drift** — the stored blueprint card was produced by
a different parser version than the current scan, so the two aren't
comparable. Real drift is a separate condition (exit code `1`).

**Fix**: run `neuron scan` once to re-baseline. Nothing is wrong with the
code; see §8 above for the distinction between this and genuine drift.

### `strict: true` hard-errors an omitted `--category`

**Symptom**: `neuron memory add` fails outright, naming `strict: true` as
the cause, on a write that omitted `--category`.

**Cause**: under `strict` mode, category *inference* (centroid/model) never
runs — an omitted `--category` has no fallback to resolve to unless the
project's `neuron.yaml` configures a literal `llm.enrichment.category`
fallback name (which stays available even under `strict`, since a fixed
name isn't inference).

**Fix**: pass `--category` explicitly on every write under a `strict`
project, or ask whether the project should configure a fallback category
name. This is an intentional trade `strict` mode makes, not a bug — see
`neuron-onboarding`'s determinism interview for the full trade-off.
