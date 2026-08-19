---
title: "Claude Code: Deterministic Recall on Every Turn"
description: "What neuron init wires for Claude Code — hook points, file targets, and MCP config."
---

## What gets wired

Claude Code is one of neuron's two `deterministic` adapters — recall is
enforced by the harness itself, not requested by agent judgment. `neuron
init` wires four lifecycle points into Claude Code's own hook system:

- `SessionStart` — a large, one-time payload (the architecture blueprint
  card, if [Architecture Scan](/docs/harness-adapters/) is enabled, plus an
  initial recall pull).
- `UserPromptSubmit` — a small, deduplicated pull on every turn, so a
  50-turn session doesn't re-inject the same entry 50 times.
- `PreCompact` — clears neuron's per-session injection ledger when context
  compacts, so an entry injected early and then compacted away is eligible
  to surface again rather than being treated as already delivered.
- `PreToolUse` (on `Bash` calls) — the `pre-command` hook, firing a
  pre-execution memory lookup automatically on every shell command your
  agent runs, as `additionalContext` next to the tool result.

## Where it writes

Hooks are written to `.claude/settings.json` — project-committed,
project-local (gitignored), or user-global, whichever scope you choose
during `neuron init`. The file is parsed and edited in place, only the
relevant array elements touched, never wholesale regenerated. Claude Code
also deduplicates hooks by command/args, so re-running `init` doesn't
double-register the same hook.

## MCP config

`neuron init` also writes `.mcp.json`, so `neuron mcp`'s three tools
(`neuron_remember`, `neuron_recall`, `neuron_query_exec`) are available to
any Claude Code session even though the deterministic hooks above already
cover recall and pre-command lookup without it.

## Write-side compliance

Claude Code also gets the `Stop` hook, which forces one more turn with a
reminder if nothing has been recorded to memory by the time your agent
tries to end its turn — empirically verified to force a continuation
rather than just suggest one.

Source: [ADR 0014 — Recall Adapter Architecture](https://github.com/kovartravis/neuron/blob/main/docs/adr/0014-recall-adapter-architecture.md).
