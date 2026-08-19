---
title: "Cursor: Best-Effort Recall at Session Start"
description: "What neuron init wires for Cursor, and where its hook model stops short of Claude Code and Codex CLI."
---

## What gets wired

Cursor is neuron's other `best-effort` adapter, occupying the same
session-start-only fidelity cell as GitHub Copilot CLI — but the two
aren't equivalent underneath. Cursor documents fail-open behavior on its
hooks, with an opt-in `failClosed` setting; Copilot CLI leaves failure,
timeout, payload cap, and disable switch all undocumented. Cursor's
`sessionStart` hook also does not run in cloud or background agent
execution modes — an execution mode Cursor itself offers — and user-level
hooks (`~/.cursor/hooks.json`) never run in cloud agents at all, since
there's no home directory there.

## Where it writes

Hooks are written to `.cursor/hooks.json` — either `~/.cursor/hooks.json`
(user-level) or `<repo>/.cursor/hooks.json` (project-level), matching the
scope you choose during `neuron init`.

## MCP config

`neuron init` writes `.cursor/mcp.json`, giving Cursor direct access to
`neuron_remember`, `neuron_recall`, and `neuron_query_exec` via MCP.

## Write-side compliance

Cursor gets `stop`'s `followup_message`, which auto-submits a continuation
with a reminder if nothing has been recorded to memory by the end of a
turn, per Cursor's own documented `followup_message` semantics.

## Limitations

Like Copilot CLI, Cursor has no per-turn hook point — a memory recorded
mid-session won't surface again until the next session starts. Cursor's
`beforeShellExecution` hook is also documented as permission/gating-only,
with no context-carrying field, so the `pre-command` pre-execution lookup
available on Claude Code and Codex CLI has no equivalent here either; this
is a structural limit of Cursor's own hook model, not an unresearched gap.
Cursor keeps the `neuron exec -- <command>` CLI wrapper as its permanent
path for pre-execution lookups.

Source: [ADR 0014 — Recall Adapter Architecture, 2026-08-10 amendment](https://github.com/kovartravis/neuron/blob/main/docs/adr/0014-recall-adapter-architecture.md#amendments).
