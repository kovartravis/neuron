---
title: "Neuron: Markdown-Backed Memory for AI Coding Agents"
description: "What neuron is, and where to start — installation, guides, how it works internally, and the CLI/config reference."
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
