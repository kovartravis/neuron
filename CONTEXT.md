# Context: Neuron Memory Store

Glossary and domain language for the `neuron` memory store project.

## Glossary

### init

The process of bootstrapping a project to support agentic memory store workflows. It searches for an existing `CLAUDE.md` or `AGENTS.md` (defaulting to creating `AGENTS.md` if neither is present, overridable via `--file`/`-f`) and appends or updates the `## Memory Store` instructions block in-place.

### neuron-memory

The standard Antigravity skill (located at `.agents/skills/neuron-memory/SKILL.md`) that codifies how agents load memory store context at startup, record action history and new learnings at shutdown, and prune obsolete/redundant memories during periodic maintenance.

### task-id

The identifier used to link logged history entries back to specification artifacts or requirements (e.g. ticket numbers like `01-db-schema-postgres` or issue references like `#42`). It should not refer to transient execution task/process IDs.

### scope promotion & demotion

The mechanism executed during consolidation that dynamically adjusts a learning's visibility tier (`people` -> `project` -> `global`) based on query frequency in a rolling 30-day window.

### manual scope lock

A flag (`is_manual_scope`) set when a user explicitly assigns a scope to a learning. It locks the learning's scope and exempts it from automated promotion or demotion.

