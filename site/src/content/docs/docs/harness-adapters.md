---
title: "Harness Adapters: How Neuron Wires Into Your Coding Agent"
description: "What a harness adapter is, why it exists, and the fidelity map across neuron's four shipped adapters."
---

## What a harness adapter is

A harness adapter is the interface between neuron and a coding agent's
harness (`detect`/`capability`/`install`/`uninstall`/`verify`), letting
`neuron init` wire a real hook into that harness rather than relying on an
instruction the agent may or may not follow. Capability is recorded as a
map from lifecycle point (session start, pre-prompt, context reset,
pre-command) to a support record — whether that point injects, its payload
cap, its failure posture, its timeout — not a single label. The
`deterministic`/`best-effort`/`instruction-only` fidelity shown in
`neuron init`'s output and in the table below is derived from that map for
display, never stored separately, so there's one source of truth for what
an adapter actually does.

## Recall fidelity by harness

| Harness | How recall lands |
|---|---|
| [Claude Code](/docs/harness-claude-code/) | Every turn, automatically — hooked into `SessionStart`, `UserPromptSubmit`, and `PreCompact` |
| [Codex CLI](/docs/harness-codex/) | Every turn, automatically — same three hook points |
| [GitHub Copilot CLI](/docs/harness-copilot/) | Once per session, automatically — the harness only exposes a session-start hook |
| [Cursor](/docs/harness-cursor/) | Once per session, automatically — same session-start-only constraint |
| Anything else | Instruction-based fallback via `AGENTS.md`, prompting the agent to query the store itself |

Claude Code and Codex CLI additionally get a `pre-command` hook, firing on
every shell tool call to surface a relevant memory before the command runs
— see each harness's own page for what's wired and what isn't.

## Limitations

Recall coverage varies by harness, and the difference is structural, not a
temporary gap: Claude Code and Codex CLI expose a per-turn hook point,
while GitHub Copilot CLI and Cursor only expose a session-start hook — a
memory recorded mid-session on those two won't surface again until the
next session starts. `neuron init` reports exactly what got wired, per
harness, so this is never silently assumed.

Source: [`README.md` "Recall your agent can't skip"](https://github.com/kovartravis/neuron/blob/main/README.md#recall-your-agent-cant-skip).
