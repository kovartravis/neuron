---
title: "neuron vs. Claude Code auto memory, Mem0, Zep, claude-mem, agentmemory, and Beads"
description: "How neuron's shared, in-repo, markdown-as-source-of-truth model compares to harness-native memory, the closest cloud memory layers, coding-agent memory tools, and issue-tracker-plus-memory tools."
faq:
  - q: "Is neuron a replacement for Mem0 or Zep?"
    a: "Only if you're specifically memory-augmenting a coding agent and want that memory to live in your repo as plain markdown. Mem0 and Zep are cloud-hosted, general-purpose agent memory layers built for a broader range of applications than coding agents alone; neuron is scoped narrowly to the coding-agent workflow and runs 100% offline."
  - q: "Does neuron replace Claude Code's built-in auto memory?"
    a: "They can coexist, but they solve different problems. Claude Code's auto memory is stored per user under ~/.claude/projects/<repo>/memory/ and loaded only for you; neuron's store is committed to the repo, so every teammate's agent — on Claude Code, Codex, Cursor or Copilot — reads the same entries, and changes to it go through code review."
  - q: "Can I use neuron alongside an existing CLAUDE.md or AGENTS.md file?"
    a: "Yes — they solve different problems. CLAUDE.md/AGENTS.md is static prose reread in full every prompt; neuron is schema-enforced structured entries surfaced only when relevant. Nothing about neuron requires deleting an existing CLAUDE.md/AGENTS.md file, though its content often migrates naturally into neuron's declared-field categories over time."
  - q: "Does neuron do anything graph-based, like Zep or Beads?"
    a: "No. Neuron's data model is flat, schema-validated markdown entries with a disposable SQLite search index — not a knowledge graph (Zep) or a Dolt-backed dependency graph (Beads). If you need graph-native memory or multi-agent merge semantics, those tools solve for that in a way neuron doesn't."
---

## Where neuron sits

Neuron is scoped to one job: giving a coding agent (Claude Code, Codex CLI,
Cursor, GitHub Copilot CLI) persistent, schema-enforced memory that lives
in your repo as plain markdown, with a disposable SQLite index underneath
for hybrid search. That's narrower than a general-purpose agent-memory
platform and different in kind from a graph-backed issue tracker — the
comparisons below focus on the tools closest to that specific scope, not
every memory-adjacent product.

## Harness-native memory (Claude Code auto memory, Cursor memories)

The closest thing to neuron most users already have. Claude Code's
[auto memory](https://code.claude.com/docs/en/memory) lets Claude record
learnings on its own into a per-project directory under your home folder
(`~/.claude/projects/<repo>/memory/`), with a `MEMORY.md` index whose first
200 lines (or 25 KB) are loaded at the start of every session and topic
files read on demand. Cursor's memories work on a similar per-user basis.

The architectural difference is scope, not quality: that memory belongs to
one user on one machine and one harness, and nothing about it passes
through a pull request. Neuron's store is committed to the repo, so it is
shared by every clone and every teammate's agent regardless of which
harness they use, changes to it are reviewed as diffs, and a schema
declared in `neuron.yaml` constrains what can be written. Recall is also
different in kind — a hook-driven, relevance-gated lookup per prompt rather
than a fixed prefix loaded once — though for a single developer on a single
tool the native feature may be all you need. The two can run side by side;
nothing in neuron disables or depends on the harness's own memory.

## Mem0

[Mem0](https://mem0.ai/) self-describes as a "Universal memory layer for
AI Agents" on its GitHub repository and is cloud-hosted with a
Python/LangChain-first SDK; its own blog markets a 5-minute Claude Code
integration
([mem0.ai/blog/claude-code-memory](https://mem0.ai/blog/claude-code-memory)).
Neuron's difference is architectural, not a claim about which is better:
Mem0 stores memory behind an API you call; neuron stores memory as
`.neuron/*.md` files you can open, diff, and edit directly, with no API
key or account required to run it.

## Zep

[Zep](https://www.getzep.com/) positions itself as "Agent memory at
enterprise scale" and owns a dedicated definitional page for "temporal
knowledge graph"
([getzep.com/ai-agents/temporal-knowledge-graph](https://www.getzep.com/ai-agents/temporal-knowledge-graph/)) —
an enterprise, conversational-agent framing, not a coding-agent-specific
one. Neuron doesn't use a knowledge graph at all; its schema is flat,
declared per category in `neuron.yaml`, which is a different tradeoff
(simpler mental model, no relationship-graph queries) rather than a
strictly smaller one.

## claude-mem

[claude-mem](https://github.com/thedotmack/claude-mem) captures
Claude Code session activity, "compresses it with AI, and injects relevant
context back into future sessions." The compression step is the key
architectural difference from neuron: claude-mem's stored memory is an
AI-generated summary, while neuron's markdown files are the literal source
of truth an agent (or a human) wrote — nothing summarizes or rewrites an
entry on the way in.

## agentmemory

[agentmemory](https://github.com/rohitg00/agentmemory) is local-only, like
neuron, and supports multiple harnesses including Claude Code, Copilot
CLI, and Cursor. It doesn't declare a schema per category, enforce
required fields at write time, or generate a codebase architecture
blueprint — neuron's closest local-only competitor, differentiated on the
schema-enforcement and blueprint-scan mechanisms rather than on
"runs locally," which agentmemory already does too.

## Beads and Beans

[Beads](https://github.com/gastownhall/beads) is the closest analog to
neuron's issue-tracker category specifically: a "Distributed graph issue
tracker for AI agents, powered by Dolt," also marketed as "a memory
upgrade for your coding agent." It's graph- and Dolt-backed rather than
plain-markdown, with its own versioning model distinct from a plain-text
git diff. [Beans](https://github.com/hmans/beans) is closer to neuron's
plain-markdown-file model — a flat-file `.beans` directory readable by
humans and machines — but is scoped to issue tracking only, with no
learnings/decisions/architecture categories or relevance-gated recall.

## Questions

**Is neuron a replacement for Mem0 or Zep?**
Only if you're specifically memory-augmenting a coding agent and want that
memory to live in your repo as plain markdown. Mem0 and Zep are
cloud-hosted, general-purpose agent memory layers built for a broader
range of applications than coding agents alone; neuron is scoped narrowly
to the coding-agent workflow and runs 100% offline.

**Does neuron replace Claude Code's built-in auto memory?**
They can coexist, but they solve different problems. Claude Code's auto
memory is stored per user under `~/.claude/projects/<repo>/memory/` and
loaded only for you; neuron's store is committed to the repo, so every
teammate's agent — on Claude Code, Codex, Cursor or Copilot — reads the same
entries, and changes to it go through code review.

**Can I use neuron alongside an existing CLAUDE.md or AGENTS.md file?**
Yes — they solve different problems. CLAUDE.md/AGENTS.md is static prose
reread in full every prompt; neuron is schema-enforced structured entries
surfaced only when relevant. Nothing about neuron requires deleting an
existing CLAUDE.md/AGENTS.md file, though its content often migrates
naturally into neuron's declared-field categories over time.

**Does neuron do anything graph-based, like Zep or Beads?**
No. Neuron's data model is flat, schema-validated markdown entries with a
disposable SQLite search index — not a knowledge graph (Zep) or a
Dolt-backed dependency graph (Beads). If you need graph-native memory or
multi-agent merge semantics, those tools solve for that in a way neuron
doesn't.

## Limitations

The descriptions above are drawn from each project's own public
README, docs, or marketing copy as of September 2026, not independent hands-on testing
of their live behavior — treat them as directional, not as neuron's
verified benchmark against a competitor, and check the linked source
directly before relying on a specific claim. Tools in this space change
quickly; a comparison page is inherently a snapshot, not a live sync.
