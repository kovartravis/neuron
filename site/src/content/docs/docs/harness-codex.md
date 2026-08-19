---
title: "Codex CLI: Deterministic Recall via a Sibling Hooks File"
description: "What neuron init wires for OpenAI Codex CLI — hook points, file targets, and MCP config."
---

## What gets wired

Codex CLI is neuron's other `deterministic` adapter, wired to the same four
lifecycle points as Claude Code: `session-start` (the large, one-time
payload), `pre-prompt` (the small, deduplicated per-turn pull),
`context-reset` (clearing the injection ledger on compaction — Codex's
`PreCompact`/`PostCompact` hooks explicitly ignore stdout, but neuron's
ledger-clear only needs the hook to *run*, not to inject anything, so this
still works), and `pre-command` (a `PreToolUse` handler firing on every
shell tool call).

## Where it writes

Codex hooks are written to a sibling `.codex/hooks.json` file — either
`~/.codex/hooks.json` (user-level) or `<repo>/.codex/hooks.json`
(project-level) — rather than editing `config.toml` directly. TOML
round-tripping typically destroys comments and key ordering, so neuron
avoids a naive read-modify-write of a file you may hand-maintain by owning
a separate file entirely. Unlike Claude Code, Codex has no documented
hook-deduplication behavior, so idempotency on re-running `neuron init` is
neuron's own responsibility here.

## MCP config

`neuron init` writes Codex's MCP server registration into `.codex/config.toml`
as a `[mcp_servers.neuron]` table, exposing the same three tools
(`neuron_remember`, `neuron_recall`, `neuron_query_exec`) as every other
harness's MCP config.

## Write-side compliance

Codex CLI also gets a `Stop`-hook-forced continuation with a reminder if
nothing has been recorded to memory by the end of a turn, per Codex's own
documented `Stop` semantics.

Source: [ADR 0014 — Recall Adapter Architecture](https://github.com/kovartravis/neuron/blob/main/docs/adr/0014-recall-adapter-architecture.md).
