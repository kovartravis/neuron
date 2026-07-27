---
name: neuron-memory
description: Manage agent session context by interviewing the user, configuring neuron.yaml, loading learnings, recording history, and pruning obsolete entries from the memory store.
---

# Neuron Memory Store Management

This skill guides how agents configure and interact with `@kovartravis/neuron` to maintain persistent, category-driven memory across sessions.

## 0. Initial Project Setup & Interview Protocol

When asked to set up memory for a project or configure memory settings:

1. **Interview the User (Setup Options)**:
   Briefly ask the user how they would like memory configured for their project:
   - **Default Categories**: `learning` (rules, conventions, failure fixes) and `history` (action logs & completed tasks).
   - **Custom Categories**: Offer options to add custom categories such as `decisions` (ADRs & design choices), `snippets` (reusable code), or `architecture`.
   - **Exec Triggers**: Ask if there are specific shell commands (e.g. `npm test`, `git commit`, `cargo build`) that should trigger rule lookups.

2. **Generate `neuron.yaml`**:
   Write `neuron.yaml` at the project root based on the user's answers (or standard defaults if they prefer default setup):
   ```yaml
   version: "1.0"

   categories:
     learning:
       description: Agent conventions, rules, and failure fixes
       tags:
         - rule
         - convention

     history:
       description: Action history log and completed task summary

     # Custom categories requested by user:
     decisions:
       description: Architectural Decision Records (ADRs) & design choices
       tags:
         - adr
         - architecture

   pullRules:
     default:
       categories:
         - learning
         - decisions
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
   - All declared categories from `neuron.yaml` (e.g., `learning`, `history`, `decisions`).
   - CLI command examples for querying custom categories (e.g. `neuron memory query "<query>" --categories learning,decisions`).
   - CLI command examples for adding entries to custom categories (e.g. `neuron memory add --category decisions "<ADR details>" --tags adr,<topic>`).

4. **Synchronize On Edits**:
   Whenever `neuron.yaml` is created or modified in any session, always update `AGENTS.md` immediately to keep category lists, CLI flags, and agent operating procedures strictly synchronized.

## 1. Beginning of Run (Context Loading)

At the very start of a session, before running any other commands or modifying files, load relevant past context:

1. Formulate a query matching your assigned task or current goal.
2. Run the query against active default categories:
   ```bash
   neuron learn query "<search query matching task>"
   ```
   Or query specific categories:
   ```bash
   neuron memory query "<search query>" --categories learning,decisions
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
3. If `neuron exec` is unavailable, run `neuron learn query "<command keywords>"` manually prior to execution.

## 3. Closed-Loop Failure Feedback (Failure-Triggered Learning Capture)

Whenever a command execution, test run, or tool invocation fails:

1. Investigate the failure and identify the verified root cause and fix.
2. Immediately after resolving the issue (and before moving to the next task), record the learning to prevent future agents from repeating the mistake. **Do NOT write 1-sentence summaries.** Memory entries MUST be detailed, multi-sentence explanations (at least 3-4 sentences) capturing context, root cause, exact fix, and code/command examples:
   ```bash
   neuron learn add "Fix for <error/issue>: <context & symptom>. <verified root cause>. <exact resolution steps & code/command example>." --tags failure-fix,<topic> --importance 4
   ```
   Or using the generic memory command:
   ```bash
   neuron memory add --category learning "Fix for <error>: ..." --tags failure-fix,<topic> --importance 4
   ```

## 4. End of Run (Memory Recording)

Before finishing your turn and ending the session:

1. **Log Action History**: Record the action you took using the history log:
   ```bash
   neuron history add "<summary of what was built or fixed>" --tags <related-topics> [--task-id <id>]
   ```
   - **`--tags`**: Use comma-separated tags from a standard vocabulary where possible (e.g., `tdd`, `db-schema`, `refactoring`, `debugging`, `git`).
   - **`--task-id`**: Link the history to the ticket or issue being resolved. Use the ticket/issue number (e.g., `01-db-schema-postgres` for local issues, or `#42` for GitHub/GitLab). Do NOT use process/task IDs like `task-144`.
2. **Record New Learnings**: If you established new rules, resolved configurations, or made architectural decisions, record them explicitly as detailed multi-sentence entries (3-4 sentences minimum):
   ```bash
   neuron learn add "<new rule/learning established with full context, rationale, and exact implementation details>" --tags <topic>
   ```

## 5. Periodic Maintenance (Clean & Refresh)

When the user requests memory maintenance (e.g., "clean memory", "prune obsolete learnings", or "refresh memory store"):

1. **Review Learnings**:
   - List active learnings:
     ```bash
     neuron learn list --limit 100
     ```
   - Cross-reference each learning with the current state of the codebase, `AGENTS.md`, and any `docs/adr/*.md` files.
   - Remove outdated or redundant learnings:
     ```bash
     neuron learn delete <id>
     ```
2. **Prune Old History**:
   - Run compaction or clean commands to delete low-importance history logs (importance 1–2) older than 30 days, while keeping high-importance logs.
