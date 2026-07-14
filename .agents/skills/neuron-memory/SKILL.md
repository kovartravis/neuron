---
name: neuron-memory
description: Manage agent session context by loading learnings, recording history, and pruning obsolete entries from the memory store.
---

# Neuron Memory Store Management

This skill guides how agents interact with the `@kovartravis/neuron` memory store CLI tool to maintain a persistent memory space across multiple sessions and runs.

## 1. Beginning of Run (Context Loading)

At the very start of a session, before running any other commands or modifying files, load relevant past learnings:

1. Formulate a query matching your assigned task or current goal.
2. Run the query:
   ```bash
   neuron learn query "<search query matching task>"
   ```
3. Read the retrieved learnings. If they apply to your task, treat them as active system rules/guidelines for the rest of your session.
4. If the query returns no results, try a broader term (e.g., `git`, `database`, `wayfinder`, or `tdd`).

## 2. End of Run (Memory Recording)

Before finishing your turn and ending the session:

1. **Log Action History**: Record the action you took using the history log:
   ```bash
   neuron history add "<summary of what was built or fixed>" --tags <related-topics> [--task-id <id>]
   ```
   - **`--tags`**: Use comma-separated tags from a standard vocabulary where possible (e.g., `wayfinder`, `tdd`, `db-schema`, `refactoring`, `debugging`, `git`).
   - **`--task-id`**: Link the history to the ticket or issue being resolved. Use the ticket/issue number (e.g., `01-db-schema-postgres` for local issues, or `#42` for GitHub/GitLab). Do NOT use process/task IDs like `task-144`.
2. **Record New Learnings**: If you established new rules, resolved configurations, or discovered conventions that future sessions must follow, record them explicitly:
   ```bash
   neuron learn add "<new rule/learning established>" --tags <topic>
   ```

## 3. Periodic Maintenance (Clean & Refresh)

When the user requests memory maintenance (e.g., "clean memory", "prune obsolete learnings", or "refresh memory store"):

1. **Review Learnings**:
   - List the active learnings:
     ```bash
     neuron learn list --limit 100
     ```
   - Cross-reference each learning with the current state of the codebase, `AGENTS.md`, and any `docs/adr/*.md` files.
   - If a learning is outdated, contradictory, or redundant, remove it:
     ```bash
     neuron learn delete <id>
     ```
2. **Prune Old History**:
   - Run compaction or clean commands to delete low-importance history logs (importance 1–2) older than 30 days, while keeping high-importance logs.
