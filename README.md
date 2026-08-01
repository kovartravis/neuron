# neuron 🧠

**Keep your AI coding agent's understanding of your codebase from going stale — offline, and across every agent you use.**

[![npm version](https://img.shields.io/npm/v/@kovartravis/neuron.svg)](https://www.npmjs.com/package/@kovartravis/neuron)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**Platforms:** macOS, Linux, Windows

---

## The problem: agents drift, silently

AI coding agents build a mental model of your repo early in a session — then keep
acting on it long after the codebase has moved on. A module gets renamed, an
export gets removed, a new dependency lands. The agent doesn't know, because
nothing tells it. So it confidently suggests patterns that no longer apply, or
calls a function that was deleted last week.

Most "agent memory" tools solve a narrower problem: helping an agent remember
what *you told it* last session. That's useful, but it doesn't catch the more
common failure — an agent working from an out-of-date picture of your *code*.

Neuron does both. Only one of them requires reading your repository directly.

## What makes Neuron different

Agents increasingly ship their own session memory, and you can bolt on a managed
memory service. Neuron's distinct part is the half those don't touch:

- 🏛️ **Architecture scanning & drift detection** — `neuron scan` builds a live
  blueprint of your module topology, tech stack, and exported symbols.
  `neuron scan --diff` / `--check` reports exactly what moved since the agent last
  looked: new modules, removed exports, dependency shifts.
- 🌳 **Real AST parsing** — symbols come from a parsed Tree-Sitter syntax tree, so
  an export contract is a contract, not a regex guess. Multi-line declarations are
  captured whole and call sites are never mistaken for declarations.
- 🔒 **100% offline & private** — local ONNX embeddings, no API keys, no cloud
  calls. Your code never leaves your machine, including during the scan.
- 🔌 **Not locked to one agent** — configures itself against `CLAUDE.md` or
  `AGENTS.md`, so the same memory store serves whichever agent you're using.
- 🖥️ **Local dashboard** — browse memory and inspect drift without leaving your
  machine.

Built-in agent memory is free and improving, so Neuron isn't trying to win at
"remembering what you said." It answers the question those tools don't ask:
**does the agent's understanding of your code still match reality?**

## 🚀 Quick start

```bash
# Install globally
npm install -g @kovartravis/neuron

# Initialize in your project (detects CLAUDE.md / AGENTS.md, fetches local models)
neuron init

# Scan your codebase into an architectural blueprint
neuron scan

# Check for drift — before an agent session, after one, or in CI
neuron scan --check
```

Then tell your agent:

> "Set up neuron memory for this project."

It runs the setup interview and configures the project for you.

## 🏛️ Architecture scanning

An agent that's never seen your repo burns its first several tool calls
rediscovering your directory layout — and its picture goes stale the moment the
code moves. `neuron scan` does that discovery once and stores it as a queryable
blueprint card. `--diff` keeps it honest afterwards.

The scan captures:

- **Module topology** — the subsystem tree, to `--depth` levels
- **Tech-stack manifests** — `package.json`, `Cargo.toml`, `go.mod`, `pyproject.toml`
- **Symbol contracts** — exported classes, interfaces, types and functions

Symbols are parsed from a real syntax tree for **TypeScript, TSX, JavaScript,
Python, Go, Rust, Java and C++** — ten of the fourteen supported extensions.
`.cs`, `.swift`, `.rb` and `.php` have no grammar yet and use a line-oriented
fallback, where multi-line declarations may be truncated. Every card records
which parser produced each file, so the two are never silently mixed.

```bash
neuron scan                    # scan and ingest the blueprint
neuron scan --dry-run          # preview without writing to memory
neuron scan --dry-run --json   # structured output for piping elsewhere
neuron scan --diff             # human-readable drift report
neuron scan --check            # non-zero exit on drift — for CI gates
```

An example drift report:

```
### ⚠️ Architectural Drift Detected

**Summary**: 1 new module, 3 export changes, 1 dependency shift

#### 🆕 New Modules & Subsystems (1)
- **`billing`** (`src/billing`): New module discovered

#### ⚡ Export Contract Changes (3)
- ➕ **`InvoiceService`** in `src/billing/invoice.ts` (added)
- ➖ **`legacyCharge`** in `src/payments/charge.ts` (removed)

#### 📦 Dependency Shifts (1)
- ➕ `stripe` (added)
```

Gate a pipeline on it:

```yaml
- run: neuron scan --check
```

`--check` exits `0` in sync, `1` on drift, and `2` when the stored blueprint was
produced by a *different parser* than the current scan — which is not drift, and
is fixed by re-running `neuron scan` once. Upgrading Neuron across a parser change
is the usual cause.

With `scan.enabled: true`, drift also surfaces passively: `neuron status` includes
a drift object, and `neuron exec` prints a non-blocking warning before running
your command. A fingerprint guard keeps this cheap — repeated commands don't
re-scan an unchanged tree.

## 🧠 Memory, underneath it all

Drift detection tells you what changed. Memory is where the agent's own
learnings, decisions and history live — architecture is one category among
several, and you define the rest.

**Storage engines** are configurable in `neuron.yaml`:

| Mode | Behaviour |
|---|---|
| `md-only` | Native `.neuron/*.md` files, in-memory semantic search, no SQLite |
| `vector-only` | Local SQLite vector DB with FTS5 keyword indexing |
| `dual` | Writes to both |
| `split` | Per-category routing (e.g. `learning` in Markdown, `history` in SQLite) |

**Context-aware pre-command safety** — `neuron exec` pulls relevant rules from
memory immediately before a command runs, and warns first if the codebase moved
since the last scan:

```bash
neuron exec -- npm test
```

Retrieval is hybrid: local vector embeddings fused with SQLite FTS5 keyword
search via Reciprocal Rank Fusion.

## 🖥️ Local dashboard

```bash
neuron ui
```

![Neuron dashboard](docs/images/dashboard.png)

Browse categories, run instant semantic queries, filter by scope and tags, and
inspect drift reports — all served locally.

## 📚 Documentation

- **[Command reference](https://github.com/kovartravis/neuron/blob/main/docs/COMMANDS.md)**
  — every command, flag, exit code, and the full `neuron.yaml` schema
- **[Architecture decision records](https://github.com/kovartravis/neuron/tree/main/docs/adr)**
  — why it's built the way it is
- **[Changelog](https://github.com/kovartravis/neuron/blob/main/CHANGELOG.md)**
  — including upgrade notes

Or run `neuron --help`, `neuron scan --help`, `neuron memory --help`.

## 📄 License

MIT © [Travis Kovar](https://github.com/kovartravis)
