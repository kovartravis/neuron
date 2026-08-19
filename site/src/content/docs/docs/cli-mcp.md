---
title: "neuron mcp — MCP Server for Hook-less Editors"
description: "The three tools neuron mcp exposes over stdio — thin wrappers over the same store methods the CLI itself calls."
---

`neuron mcp` runs an MCP server over the standard stdio transport, built on
the official `@modelcontextprotocol/sdk`. It's additive to the
deterministic hook model `neuron init` wires for Claude Code and Codex
CLI — for editors with no per-turn hook point (Cursor, Windsurf, Zed,
Claude Desktop, Roo Code) — and available unconditionally to every client,
hook-covered or not.

It takes no flags.

## Tools exposed

Each tool is a thin wrapper over the same store methods the CLI itself
calls — `memory add`'s write-time supersession gate, `memory query`'s
relevance-gated search, `exec`'s pre-command lookup — never a parallel
logic path.

| Tool | Wraps | Input |
|---|---|---|
| `neuron_remember` | `memory add` | `content` (required), `category`, `importance` (1-5, default 3 — not inferred), `supersedes`, `companion_of`. No `tags` — server-inferred only |
| `neuron_recall` | `memory query` | `query` (required), `categories`. Returns `{ results, rejected }` |
| `neuron_query_exec` | `exec`'s pre-command lookup | `command_text` (required). Lookup only — never spawns the command |

## No auth or scoping

A local stdio server is a subprocess your editor spawns directly,
inheriting exactly the OS-level access any CLI invocation already has — no
sandboxing layer exists in the MCP protocol itself.

## Client config

No separate binary, no new `bin` entry — `neuron init` writes this
automatically for detected harnesses (see [neuron init](/docs/cli-init/#mcp-client-config-by-harness)),
or configure a client by hand:

```json
{
  "mcpServers": {
    "neuron": {
      "command": "npx",
      "args": ["-y", "@kovartravis/neuron", "mcp"]
    }
  }
}
```

## Limitations

`neuron mcp` is best-effort, not deterministic. A live A/B test found
agent-invoked `neuron_recall` with no hook backing it under-complied in
every session tested — called only 5 of 8 times, and never fully compliant
even when it was called. Ship it as reach for otherwise-unreachable
editors, not as a guarantee equivalent to the deterministic hooks Claude
Code and Codex CLI get.

Source: [`docs/design/rule-recall-ab/findings.md`](https://github.com/kovartravis/neuron/blob/main/docs/design/rule-recall-ab/findings.md).
