---
title: "GitHub Copilot CLI: Best-Effort Recall at Session Start"
description: "What neuron init wires for GitHub Copilot CLI, and where its hook model stops short of Claude Code and Codex CLI."
---

## What gets wired

GitHub Copilot CLI is a `best-effort` adapter: `neuron init` wires a
session-start hook, injecting recall once when a session begins. There is
no per-turn hook point on this harness, so a memory recorded mid-session
won't surface again automatically until the next session starts.

## Where it writes

Repo-level hooks are written to `.github/hooks/neuron.json` (project),
mirroring the committed/local/user-global scope choice `neuron init` asks
for on every harness.

## MCP config

`neuron init` writes `.mcp.json`, the same file Claude Code uses, so
Copilot CLI can call `neuron_remember`, `neuron_recall`, and
`neuron_query_exec` directly via MCP.

## Write-side compliance

Copilot CLI gets `agentStop`, which forces a continuation with a reminder
if nothing has been recorded to memory by the end of a turn — per Copilot
CLI's own documented `agentStop` semantics, not independently verified
live the way Claude Code's `Stop` hook was.

## Limitations

Copilot CLI's `preToolUse` hook is documented as permission/gating-only —
it has no context-carrying field at all, unlike Claude Code and Codex
CLI's `PreToolUse`. That means the `pre-command` pre-execution memory
lookup available on those two harnesses has no equivalent here: this is a
structural ceiling of Copilot CLI's own hook model, not a gap a future
neuron version can close. Copilot CLI keeps the `neuron exec -- <command>`
CLI wrapper as its permanent path for pre-execution lookups, driven by
instruction rather than by hook.

Source: [ADR 0014 — Recall Adapter Architecture, 2026-08-10 amendment](https://github.com/kovartravis/neuron/blob/main/docs/adr/0014-recall-adapter-architecture.md#amendments).
