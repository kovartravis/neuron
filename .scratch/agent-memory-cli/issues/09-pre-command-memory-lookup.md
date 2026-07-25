# 09 — `neuron exec` CLI Core & Stderr Banner

**What to build:** The `neuron exec -- <target command>` CLI subcommand. It parses the command string after `--`, strips common wrapper prefixes (`npx`, `npm run`, `bun run`, `sudo`), queries `learnings` semantically (`memory.query({ text: cleanCmd, kind: 'learning', limit: 5 })`), applies a relevance score threshold (`score >= 0.35`), formats and outputs matched learnings to `stderr` with a `[neuron]` header, and executes the target command with inherited `stdio` (`stdin`, `stdout`, `stderr`) returning the child's exit code.

**Blocked by:** None — can start immediately.

**Status:** resolved

- [x] `neuron exec -- <command>` parses the target command line.
- [x] Strips generic execution prefixes (`npx`, `npm run`, `bun run`, `sudo`).
- [x] Performs vector search against `learnings` with relevance threshold (`score >= 0.35`).
- [x] Outputs formatted matching learnings to `stderr` under `[neuron]` header when present.
- [x] Spawns child command with inherited `stdio` and passes through exit code.
