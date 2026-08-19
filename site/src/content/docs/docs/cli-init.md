---
title: "neuron init — Bootstrap a Project"
description: "Every flag neuron init accepts: hook targets, harness detection, MCP client config, and the --uninstall-hooks escape hatch."
---

`neuron init` bootstraps a project: writes a `neuron.yaml` if none exists,
detects every harness present, installs recall hooks, writes each detected
harness's MCP client config, writes the memory-store instructions block into
each harness's instructions file, pre-downloads the local ONNX models,
fetches Tree-Sitter grammars, and runs the initial scan if `scan.enabled` is
set. An **existing** `neuron.yaml` — including one in an ancestor directory
that already governs the project — is never touched or rewritten; `init` is
safe to re-run routinely to refresh skills, models and grammars.

## Flags

| Flag | Effect |
|---|---|
| `--yes` | Non-interactive: accept defaults for every prompt (hook target defaults to `project-committed`) |
| `--no-hooks` | Skip installing recall hooks entirely; harnesses still get the fallback instructions block |
| `--hook-target <target>` | Where to install hooks: `user-global`, `project-committed`, or `project-local`. Asked once per run, applied to every harness being wired |
| `--overwrite-hooks` | Replace a neuron-authored hook entry that differs from what this run would write, without asking |
| `--keep-hooks` | Keep a differing neuron-authored hook entry as-is, without asking (the non-interactive default) |
| `--harness <list>` | Comma-separated harness ids (e.g. `claude,codex`) narrowing hook install to a subset of *detected* harnesses. Cannot force-wire an undetected one, and doesn't affect which harnesses get their instructions file written — that's detection alone |
| `--uninstall-hooks` | Remove every hook entry neuron installed, for the harnesses selected by `--harness` (or all detected adapters if omitted). Does nothing else |

`--overwrite-hooks` and `--keep-hooks` are mutually exclusive. A conflicting
neuron-authored hook entry is never touched without one of these flags or an
interactive answer — a user's own, non-neuron hooks are never read or
modified, even sharing the same event array. The MCP client-config write
reuses this exact same `--hook-target`/`--overwrite-hooks`/`--keep-hooks`/
`--harness`/`--no-hooks` posture, not a second policy invented for MCP —
`--no-hooks` skips both writes together.

## MCP client config by harness

`neuron init` writes each detected harness's MCP client config, pointing at
`npx -y @kovartravis/neuron mcp`:

| Harness | `project-committed` / `project-local` | `user-global` |
|---|---|---|
| Claude Code | `.mcp.json` (project root) | `~/.claude.json` (top-level `mcpServers`) |
| Cursor | `.cursor/mcp.json` (no separate `project-local` scope) | `~/.cursor/mcp.json` |
| Codex CLI | `.codex/config.toml`, `[mcp_servers.neuron]` (requires the project be marked trusted in `~/.codex/config.toml`, or Codex silently ignores it) | `~/.codex/config.toml`, `[mcp_servers.neuron]` |
| GitHub Copilot CLI | `.mcp.json` — not `.github/mcp.json`; Copilot CLI prefers `.mcp.json` whenever both exist | `~/.copilot/mcp-config.json` |

Codex's `config.toml` is edited by a targeted text splice of just the
`[mcp_servers.neuron]` table — comments and the rest of the file are left
untouched, not a general TOML parse-and-restringify.

## What the generated neuron.yaml declares

A freshly-written `neuron.yaml` sets `storage.mode: md` and declares
`learning`, `decisions`, and `architecture` as categories. See the
[config reference](/docs/config-reference/) for every field it's allowed to
declare.

## JSON output

`init` prints a JSON summary: `config.path`/`config.created` for which
`neuron.yaml` governs the project, `hooks.installed` per harness,
`mcp.configured` per harness, and `protocol.written` — the fidelity each
harness's instructions file ended up with, derived from a real `verify()`
call rather than inferred from a file merely existing.
`harnesses.newlyOnboarded` is the subset of `harnesses.detected` with no
earlier evidence of being wired here before; onboarding one for the first
time also prints a note naming it to `stderr`, so it's never a silent side
effect.

Model and grammar downloads are best-effort — a failure leaves that
capability degraded rather than failing the whole bootstrap.

## Examples

```bash
neuron init                              # interactive, detects every harness present
neuron init --yes                        # non-interactive, accepts every default
neuron init --harness claude,codex       # narrow hook install to two detected harnesses
neuron init --uninstall-hooks            # remove every hook neuron installed
```
