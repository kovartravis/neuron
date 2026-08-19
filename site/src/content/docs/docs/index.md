---
title: "Neuron: Markdown-Backed Memory for AI Coding Agents"
description: "What neuron is, and where to start — installation, guides, how it works internally, and the CLI/config reference."
faq:
  - q: "What does neuron actually store, and where?"
    a: "Structured entries — learnings, decisions, architecture notes, tickets, whatever categories a project declares in neuron.yaml — written to plain .neuron/*.md files in your repo. A schema declared in neuron.yaml is enforced on every write, and SQLite sits underneath only as a disposable semantic-search index rebuilt from the markdown; deleting it loses nothing."
  - q: "Do I need an API key or internet connection to use neuron?"
    a: "No. Neuron embeds text locally with ONNX models and stores everything in a local SQLite/markdown store — no API keys, no telemetry, nothing leaves your machine."
  - q: "How is neuron different from a CLAUDE.md or AGENTS.md file?"
    a: "A CLAUDE.md or AGENTS.md file is static prose an agent rereads in full every prompt, whether it's relevant or not, and it only grows over time. Neuron stores memory as schema-enforced entries and surfaces only what's relevant to the current query via relevance-gated recall, instead of dumping one file into every prompt. See the declared field schema for how that enforcement works."
  - q: "Does neuron work with agents other than Claude Code?"
    a: "Yes — neuron ships harness adapters for Claude Code, OpenAI Codex CLI, Cursor, and GitHub Copilot CLI. Recall fidelity differs by harness: Claude Code and Codex CLI get memory injected automatically on every turn, while Cursor and Copilot CLI get it once per session, since those harnesses only expose a session-start hook. See harness adapters for the full comparison."
---

## What neuron is

Neuron is a memory store for AI coding agents that keeps its record in plain
`.neuron/*.md` files inside your repo, instead of a database only a special
viewer can open. A schema declared in `neuron.yaml` is enforced on every
write — a malformed entry (missing a required field, an invalid enum value)
is refused by the CLI, not silently accepted. SQLite sits underneath as a
disposable semantic-search index, rebuilt from the markdown automatically;
delete it any time and nothing is lost.

## Getting started

New to neuron? [Install it](/docs/install/) via npm or a standalone
binary, then work through the [quickstart](/docs/quickstart/) —
initializing a project, recording a memory, and querying it back — in about
five minutes.

## Guides

Task-oriented guides cover [`neuron.yaml` configuration](/docs/configuration/)
end to end, and how neuron wires into your coding agent via
[harness adapters](/docs/harness-adapters/) — with a dedicated page
for each of the four shipped harnesses: Claude Code, Codex CLI, GitHub
Copilot CLI, and Cursor.

## How it works

For the mechanisms behind neuron's behavior — not just the commands that
trigger them — see the concept pages on
[hybrid search & RRF ranking](/docs/hybrid-search/),
[write-side enrichment](/docs/write-side-enrichment/),
[the declared field schema](/docs/declared-field-schema/), and
[storage adapters](/docs/storage-adapters/).

## Reference

Every CLI command and every `neuron.yaml` field, listed exhaustively for
lookup rather than read-through, lives in Reference.

Weighing neuron against a cloud memory API or a CLAUDE.md/AGENTS.md file?
See [neuron vs. alternatives](/docs/alternatives/) for an honest,
sourced comparison.

## Questions

**What does neuron actually store, and where?**
Structured entries — learnings, decisions, architecture notes, tickets,
whatever categories a project declares in `neuron.yaml` — written to plain
`.neuron/*.md` files in your repo. A schema declared in `neuron.yaml` is
enforced on every write, and SQLite sits underneath only as a disposable
semantic-search index rebuilt from the markdown; deleting it loses nothing.
See [storage adapters](/docs/storage-adapters/) for the full mechanics.

**Do I need an API key or internet connection to use neuron?**
No. Neuron embeds text locally with ONNX models and stores everything in a
local SQLite/markdown store — no API keys, no telemetry, nothing leaves
your machine.

**How is neuron different from a CLAUDE.md or AGENTS.md file?**
A CLAUDE.md or AGENTS.md file is static prose an agent rereads in full
every prompt, whether it's relevant or not, and it only grows over time.
Neuron stores memory as schema-enforced entries and surfaces only what's
relevant to the current query via relevance-gated recall, instead of
dumping one file into every prompt. See
[the declared field schema](/docs/declared-field-schema/) for how that
enforcement works.

**Does neuron work with agents other than Claude Code?**
Yes — neuron ships harness adapters for Claude Code, OpenAI Codex CLI,
Cursor, and GitHub Copilot CLI. Recall fidelity differs by harness: Claude
Code and Codex CLI get memory injected automatically on every turn, while
Cursor and Copilot CLI get it once per session, since those harnesses only
expose a session-start hook. See
[harness adapters](/docs/harness-adapters/) for the full comparison.
