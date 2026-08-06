# neuron 🧠

**Your AI coding agent's memory, as plain markdown files in your repo — no knowledge graph, no binary, no database to inspect.**

[![npm version](https://img.shields.io/npm/v/@kovartravis/neuron)](https://www.npmjs.com/package/@kovartravis/neuron)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

Platforms: macOS, Linux, Windows

---

## The problem: agent memory you can't see or review

Most persistent-memory tools for AI coding agents store what they've learned in a database or a compiled index — a SQLite file, a knowledge graph, something you'd need a special viewer or CLI query to inspect. That's powerful, but it also means the thing shaping your agent's behavior lives somewhere you can't casually open, diff, or review in a pull request.

**Neuron takes the opposite approach.** By default, everything your agent learns — conventions, past fixes, decisions, project notes — is stored as plain `.neuron/*.md` files, right in your repo. Open them in any editor. Read them top to bottom. Edit a line by hand if the agent got something wrong. Review changes to them the same way you review changes to code, in a normal git diff.

If you already treat your notes, docs, or specs as version-controlled markdown, Neuron fits directly into that workflow instead of asking you to adopt a new one.

## Why plain markdown, specifically

- 📄 **Human-readable by default** — no query language, no dashboard required to know what your agent remembers. Open the file.
- 🔍 **Git-native** — memory changes show up in `git diff` and pull requests like any other file. Your team can review what an agent has "learned" the same way they review code.
- ✏️ **Editable by hand** — wrong or outdated memory isn't a database row you have to script your way into fixing; it's a markdown line you edit and commit.
- 🔒 **100% Offline & Private** — local ONNX embeddings for semantic search over those files, zero API keys, zero cloud calls.
- 🔌 **Cross-agent** — works with Claude, Cursor, Antigravity, and Codex, rather than being tied to one vendor's built-in memory.

This isn't a claim to be the most powerful codebase-analysis engine available — there are tools built for large-scale structural analysis if that's what you need. Neuron is for developers who'd rather keep their agent's memory as simple, inspectable text they fully own.

## 🚀 Quick Start

```bash
# Install globally
npm install -g @kovartravis/neuron

# Initialize in your project (auto-detects Claude/Cursor/Codex config)
neuron init

# Save a note the agent should remember
neuron memory add --category learning "Always use the Repository Pattern for database access in src/services"

# Search stored memory
neuron memory query "How do we handle database access?"
```

Then tell your agent:
> "Set up neuron memory for this project."

It'll run the setup interview and configure your project automatically.

## 📁 What it looks like in your repo

With the default `md-only` storage mode, memory lives as ordinary files:

```
.neuron/
  learning.md      # conventions, rules, failure fixes
  history.md       # action history log
  decisions.md      # architectural decision records
```

Open any of them. They're just markdown — readable, greppable, diffable, and safe to hand-edit if something needs correcting.

## ⚙️ Configuration (`neuron.yaml`)

```yaml
version: "1.0"

storage:
  mode: md-only   # Options: md-only, vector-only, dual, split
  path: .neuron

categories:
  learning:
    description: Agent conventions, rules, and failure fixes
    tags: [rule, convention, failure-fix]

  history:
    description: Action history log and completed task summary
    tags: [task, history]

  decisions:
    description: Architectural Decision Records (ADRs) & design choices
    tags: [adr, architecture]

pullRules:
  default:
    categories: [learning, decisions]
    limit: 5
    minScore: 0.35
```

Storage is fully configurable:

- **`md-only`** — pure markdown, in-memory semantic search, zero SQLite overhead. The differentiator: everything is inspectable, diffable, and hand-editable.
- **`vector-only`** — fast local SQLite vector DB with FTS5 keyword indexing, for teams that want faster large-scale recall and don't need the files themselves to be human-readable.
- **`dual`** — writes to both, so you get SQLite-speed queries and a markdown copy you can still open and review.
- **`split`** — per-category routing, e.g. `learning` in `.md` for reviewability, `history` in SQLite for volume.

`md-only` is the default because it's what makes the "review your agent's memory like code" pitch true out of the box — but the vector-backed modes are first-class, not a fallback, for projects that want SQLite-level performance or scale beyond what markdown files comfortably handle.

## 🖥️ Local Dashboard UI (`neuron ui`)

Prefer a visual view over reading files directly? Launch the local dashboard to browse categories and run semantic queries:

```bash
neuron ui
```

## 📖 Command Reference

| Command | Description |
|---|---|
| `neuron init` | Bootstraps project, pre-downloads local ONNX models, configures your agent |
| `neuron memory add/query/list/update/delete/consolidate/prune` | Multi-category memory operations, backed by plain `.md` files by default |
| `neuron exec -- <command>` | Runs a command with pre-execution safety lookup pulled from stored memory |
| `neuron sync` | Syncs memories between Markdown files and SQLite DB (if using `dual`/`split` mode) |
| `neuron status` | Displays storage, embedding model, and drift status as JSON |
| `neuron ui` | Launches the local dashboard |
| `neuron feedback [message]` | Generates pre-filled GitHub issue links (`--type bug\|feature\|general`) |

Run `neuron --help`, `neuron memory --help` for full flag listings.

## 🏛️ Architecture awareness, for context

Neuron also includes `neuron scan` / `scan --diff` for a lightweight architectural blueprint of your repo, useful for catching when an agent's mental model of your code has gone stale. This is a supporting feature, not the core pitch — if you need deep structural analysis (call graphs, cross-service linking, large-monorepo indexing), there are tools purpose-built for that; Neuron's scan is intentionally lightweight and markdown-first like everything else here.

## 🧪 Testing

```bash
npm test          # unit + integration suite, ~5s
npm run test:e2e  # deeper E2E benchmark & correctness suite
```

## 📄 License

MIT © Travis Kovar
