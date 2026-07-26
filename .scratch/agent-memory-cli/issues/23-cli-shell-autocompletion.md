# 23 — CLI Shell Autocompletion (`neuron completion`)

**What to build:** Add a `neuron completion <bash|zsh|fish>` command that outputs shell completion scripts for auto-completing commands (`init`, `exec`, `status`, `learn`, `history`, `ui`), subcommands, flags (`--importance`, `--scope`, `--tags`, `--limit`), and active project scopes.

**Blocked by:** 01 — CLI Commands & Schema

**Status:** todo

- [ ] Implement `handleCompletionCommand` in `src/commands/completion.ts`.
- [ ] Support generating `zsh`, `bash`, and `fish` completion scripts.
- [ ] Auto-complete subcommands (`add`, `query`, `list`, `delete`, `update`, `consolidate`, `prune`).
- [ ] Add unit test verifying completion script generation.
