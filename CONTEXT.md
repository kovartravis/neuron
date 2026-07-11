# Context: Neuron Memory Store

Glossary and domain language for the `neuron` memory store project.

## Glossary

### init

The process of bootstrapping a project to support agentic memory store workflows. It searches for an existing `CLAUDE.md` or `AGENTS.md` (defaulting to creating `AGENTS.md` if neither is present, overridable via `--file`/`-f`) and appends or updates the `## Memory Store` instructions block in-place.
