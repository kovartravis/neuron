# 05 — CLI `neuron sync` Command & Scaffolding

**What to build:** Implement the `neuron sync` CLI command to manually force vector-markdown resynchronization and scaffold missing `.neuron/` file structures.

**Blocked by:** 04 — Markdown Vector Sync Engine (`md-sync`)

**Status:** resolved

- [x] Add `neuron sync` subcommand to CLI with `--dry-run` and `--force` flag support.
- [x] Scaffold `.neuron/` directory and default category files (`learning.md`, `history.md`) during `neuron init`.
- [x] Output clear visual progress log during CLI sync execution.
- [x] Provide end-to-end unit tests for `neuron sync` CLI command.
