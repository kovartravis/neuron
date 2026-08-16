# neuron 🧠

**Give your AI coding agent a memory that's actually yours — plain markdown in your repo, enforced by a schema it can't write around.**

[![npm version](https://img.shields.io/npm/v/@kovartravis/neuron.svg)](https://www.npmjs.com/package/@kovartravis/neuron)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**Platforms:** macOS, Linux, Windows

---

## Your agent's memory shouldn't be a black box

Most persistent-memory tools stash what your agent learns in a database or a
compiled index — somewhere you'd need a special viewer just to look at. The
thing shaping your agent's behavior every session lives somewhere you can't
open, diff, or put in a pull request.

**Neuron puts it in your repo instead.** Conventions, past fixes, decisions,
project notes — all plain `.neuron/*.md` files, right next to your code.
Open them in any editor. Read them top to bottom. Fix a line by hand.
Review changes to them exactly like you review changes to code, in a normal
git diff.

And it's not just "tell the agent to write markdown" — anyone can write
that prompt, and nothing stops an agent from ignoring it. **Neuron's CLI
enforces your schema at write time.** Declare that every `decisions` entry
needs a `ticket` and a `reviewedBy`, and the write is refused without
them — no matter what the agent's prompt says.

## Why teams reach for Neuron

- 📄 **Markdown is the source of truth.** `.neuron/*.md` files —
  human-readable, git-diffable, hand-editable. SQLite sits underneath as a
  disposable semantic-search index, rebuilt from the markdown automatically.
  Delete it any time; nothing is lost. It lives in a per-machine cache by
  default — nothing to commit, nothing to `.gitignore`.
- 🔒 **A malformed entry simply can't land.** Declare required and
  enum-typed fields per category in `neuron.yaml`, and every write — from
  the CLI or from `neuron scan` — is validated before it lands, with an
  error naming exactly what's missing.
- 🔌 **Recall that's guaranteed, not requested.** On Claude Code and OpenAI
  Codex CLI, `neuron init` wires a hook that injects relevant memory before
  the model ever sees the prompt. The harness enforces it — no agent
  judgment call required.
- 🎯 **A two-stage relevance gate.** Every candidate clears a lexical
  filter, then a local ONNX cross-encoder reranker — no remote API call —
  before it's ever injected. On the hardest out-of-corpus test we could
  build, that cut the false-accept rate from 99.80% to 19.4%.
- 🏛️ **Your architecture, as a living markdown artifact.** `neuron scan`
  parses your codebase with real Tree-Sitter ASTs and writes a blueprint
  card that stays byte-identical until the code actually changes — gate CI
  on it like any other diff.
- 🕵️ **Your git history becomes searchable memory too.** Commits get
  indexed and matched against every prompt with the same relevance
  mechanism as your notes, so "how did we fix X" surfaces the actual commit
  that did it.
- 🔒 **100% offline & private.** Local ONNX embeddings, no API keys, no
  cloud calls, ever. Your code and your memory never leave your machine.

## 🚀 Quick start

```bash
# Install globally
npm install -g @kovartravis/neuron

# Initialize in your project (detects CLAUDE.md/AGENTS.md, pre-downloads local models)
neuron init

# Save a note the agent should remember
neuron memory add --category learning "Always use the Repository Pattern for database access in src/services"

# Search stored memory
neuron memory query "How do we handle database access?"
```

Or just tell your agent:

> "Set up neuron memory for this project."

It runs the setup interview and configures the project for you.

## Recall your agent can't skip

`neuron init` wires a hook directly into your harness — the harness itself
runs the memory query and injects the result before the model sees the
prompt. No instruction to forget, no judgment call to skip. `neuron init`
reports exactly what got wired, per harness, straight from each harness's
real hook registration.

| Harness | How recall lands |
|---|---|
| **Claude Code** | Every turn, automatically — hooked into `SessionStart`, `UserPromptSubmit`, and `PreCompact` |
| **OpenAI Codex CLI** | Every turn, automatically — same three hook points |
| **GitHub Copilot CLI** | Once per session, automatically — the harness only exposes a session-start hook |
| **Cursor** | Once per session, automatically — same session-start-only constraint |
| **Anything else** | Instruction-based fallback via `AGENTS.md`, prompting the agent to query the store itself |

Full fidelity details, including exactly which hook points each harness
supports, are in [`docs/COMMANDS.md`](docs/COMMANDS.md).

### Your git history is a searchable resident source too

On the two harnesses with a per-turn hook, every prompt is also matched
against an index of your repo's own commit history — subject and body,
embedded and searched the same way memory content is. Ask about a feature
or a bug, and the commit that actually shipped the fix surfaces alongside
your notes. It backfills once and stays current incrementally — no git
hook to install, nothing to fall out of sync.

Live-measured against the real semantic search mechanism: it matched a
hand-tuned oracle's 0% failure rate and clearly beat an agent manually
running `git log` on its own (11.1% failure). Full numbers in
[`benchmarks/token-ab/results/11-rerun-gitlog-ab-semantic-mechanism/findings.md`](benchmarks/token-ab/results/11-rerun-gitlog-ab-semantic-mechanism/findings.md).

### Command execution gets the same treatment

`neuron exec -- <command>` — a pre-execution memory lookup — doesn't have
to be a manual step either. On Claude Code and Codex CLI, `neuron init`
wires a `pre-command` hook that fires automatically on every shell tool
call, surfacing a relevant hit as context instead of requiring the agent to
remember to ask. Purely informational — it never blocks the command.

### Write-side compliance gets a nudge, not just a reminder

Recall solves reading memory back; it doesn't make an agent write to it in
the first place. An A/B test measured that gap directly: under realistic
multi-step conditions, an agent with no nudge recorded a fix only 20% of the
time it should have. `neuron init` wires a `pre-stop` hook that fires when
the agent is about to end its turn, and — once per session — forces one more
turn with a reminder if nothing has been recorded yet:

| Harness | Mechanism |
|---|---|
| **Claude Code** | `Stop` — forces a continuation, empirically verified |
| **OpenAI Codex CLI** | `Stop` — forces a continuation, per documentation |
| **GitHub Copilot CLI** | `agentStop` — forces a continuation, per documentation |
| **Cursor** | `stop`'s `followup_message` — auto-submits a continuation, per documentation |

Full fidelity details are in [`docs/COMMANDS.md`](docs/COMMANDS.md).

## 📁 What it looks like in your repo

```
.neuron/
  learning.md      # conventions, rules, failure fixes
  decisions.md     # architectural decision records
```

Open any of them. They're just markdown, with a small YAML frontmatter block
per entry:

```markdown
# Category: decisions

---
id: e9d606cd-0d61-4073-9da8-1675c6d7adfd
createdAt: 2026-08-05T15:02:38.494Z
importance: 3
tags: []
taskId: null
reviewedBy: alice
ticket: NEU-42
---
Chose Postgres over SQLite for concurrent writes
```

Readable, greppable, diffable, and safe to hand-edit — `neuron status`
catches anything that ends up missing or malformed, so nothing is ever
silently guessed at.

**This isn't a toy example.** Neuron dogfoods itself: this repository's own
[`.neuron/learning.md`](.neuron/learning.md),
[`.neuron/decisions.md`](.neuron/decisions.md), and
[`.neuron/architecture.md`](.neuron/architecture.md) are the real store this
project's own agent sessions read from and write to on every release. Open
them to see real usage, not a curated demo.

## ⚙️ Configuration (`neuron.yaml`)

This is exactly what `neuron init` generates for a new project:

```yaml
version: "1.0"

# Your memory lives in markdown. SQLite is kept as a rebuildable index that is
# reconciled from these files on every command — the .md files are the record.
#   md      markdown is authoritative, vector index derived from it (default)
#   vector  local SQLite vector DB with FTS5 only, no .md files
# Any category below may set its own "storage:" to override this just for it.
# Precedence: categories.<name>.storage > storage.mode > "md".
storage:
  mode: md
  path: .neuron

categories:
  # Any category below may set its own "path:" to override storage.path just
  # for it (e.g. "path: docs/adr" to keep decisions.md alongside other docs).
  # Precedence: categories.<name>.path > storage.path > ".neuron".
  learning:
    description: Agent conventions, rules, and failure fixes
    tags: [rule, convention, failure-fix]

  decisions:
    description: Architectural Decision Records (ADRs) & design choices
    tags: [adr, architecture, design]

  architecture:
    description: Architectural blueprints & structure cards
    tags: [architecture, topology, scan]

# Set enabled: true to scan on init and to surface drift in
# 'neuron status' and 'neuron exec'. Writes into the category named below,
# which must be one of the categories declared above.
scan:
  enabled: false
  category: architecture
  depth: 3

pullRules:
  default:
    categories: [learning, decisions]
    limit: 5

  onExec:
    - commandPattern: ".*"
      categories: [learning]
      limit: 5
```

**Two storage modes.** `md` (the default) keeps markdown authoritative,
with SQLite as a rebuildable semantic-search index — delete the database
any time and Neuron rebuilds it from your files. `vector` skips markdown
entirely for projects that want no files on disk at all, same schema
guarantee either way.

### Per-category storage path

A category's markdown doesn't have to live under the project-wide
`storage.path`. Set `path` on the category itself to send just that one
elsewhere — a shared notes directory, or `decisions.md` living next to your
other docs:

```yaml
storage:
  mode: md
  path: .neuron

categories:
  decisions:
    description: Architectural Decision Records (ADRs) & design choices
    path: docs/adr   # overrides storage.path for this category only
  learning:
    description: Agent conventions, rules, and failure fixes
```

Precedence is `categories.<name>.path > storage.path > ".neuron"`. Absolute
paths work too — a notes directory shared across projects, even outside
this repo.

### Per-category storage mode

Set `storage` on a category to override the top-level `storage.mode` just
for it — keep `learning` in reviewable markdown while routing a high-volume
category straight to SQLite:

```yaml
storage:
  mode: md
  path: .neuron

categories:
  learning:
    description: Agent conventions, rules, and failure fixes
  telemetry:
    description: High-volume, low-value entries
    storage: vector   # this category alone skips markdown
```

### The guarantee in practice: declaring required fields

Add a `fields` block to any category to make specific frontmatter fields
mandatory, and the CLI both enforces them and exposes them as flags:

```yaml
categories:
  decisions:
    description: Architectural Decision Records (ADRs) & design choices
    fields:
      ticket:
        type: string
        required: true
      reviewedBy:
        type: enum
        values: [alice, bob]
        required: true
```

```bash
$ neuron memory add --category decisions "Chose Postgres over SQLite"
Error: --ticket is required for category "decisions" (neuron.yaml categories.decisions.fields.ticket). Pass --ticket <value>, or add a "default:" in neuron.yaml.

$ neuron memory add --category decisions --ticket NEU-42 --reviewed-by alice "Chose Postgres over SQLite"
{"id":"e9d606cd-0d61-4073-9da8-1675c6d7adfd","status":"created","project":"neuron"}
```

Every entry conforms to your schema, and serializes identically every
time — real, enforced structure, not a convention your agent might forget.

## 📖 Command reference

| Command | Description |
|---|---|
| `neuron init` | Bootstraps the project, pre-downloads local ONNX models, fetches Tree-Sitter grammars, wires recall hooks |
| `neuron memory add/query/list/get/update/delete/consolidate/prune` | Multi-category memory operations, backed by plain `.md` files by default. `list --where`/`--refs-satisfy` filter on any declared field — schema-agnostic, no field name baked into the CLI |
| `neuron exec -- <command>` | Runs a command with a pre-execution safety lookup pulled from stored memory, plus a non-blocking drift warning if the codebase moved |
| `neuron scan` / `scan --diff` / `scan --check` | Ingests an architectural blueprint card; reports drift; exits non-zero in CI on real drift |
| `neuron sync` | Explicit forced rebuild between markdown and SQLite — ordinary commands already reconcile automatically |
| `neuron status` / `status --health` / `status --check` | Storage, embedding model, drift and relevance-gate status as JSON; `--health` reports near-duplicate groups and store-hygiene signals (`--repair` auto-merges what's safe to); `--check` validates against your declared schema |
| `neuron ui` | Launches the local dashboard |
| `neuron feedback [message]` | Generates pre-filled GitHub issue links |

Declared fields extend this automatically — `neuron memory --help` lists
`--ticket`, `--reviewed-by`, or whatever your `neuron.yaml` declares, so an
agent reading `--help` learns your project's schema without it being
restated anywhere else. Full flag listings: [`docs/COMMANDS.md`](docs/COMMANDS.md).

### Scheduled and cron writers

`neuron memory add`'s write-time supersession gate normally hard-blocks a
near-duplicate write and asks an interactive caller to resolve it — a human
loop a cron job can't complete. Pass `--if-novel` instead: on a gate hit it
skips the write cleanly (exit 0, job still succeeds) rather than erroring,
and it's never silent about it — the skip is printed to stderr and noted in
the JSON result.

## 🏛️ Architecture awareness, as a deterministic artifact

`neuron scan` turns your codebase's structure into a markdown file that
stays current, instead of something your agent has to re-derive by
re-reading the repo every session.

```bash
neuron scan                    # scan and ingest the blueprint
neuron scan --dry-run          # preview without writing to memory
neuron scan --diff             # human-readable drift report
neuron scan --check            # non-zero exit on drift — for CI gates
```

Real, parsed Tree-Sitter syntax trees — not a regex guess — across
**TypeScript, TSX, JavaScript, Python, Go, Rust, Java and C++**. `.cs`,
`.swift`, `.rb` and `.php` fall back to a line-oriented scanner until they
get a grammar, and every card records which parser produced each file.

The card is byte-identical across repeated scans of an unchanged tree, and
a re-scan updates it in place — so `git diff` on `.neuron/architecture.md`
shows real drift, not scan-to-scan noise.

```yaml
- run: neuron scan --check
```

## 📊 Measured, not just claimed

We ran a real counterfactual — same agent, same tasks, memory hook on vs.
off — on actual SWE-bench Lite instances (real matplotlib and Django
checkouts pinned before the real fix landed, so the answer is structurally
absent without help) and let a deterministic grader decide.

| Task | Without neuron | With neuron | Reduction |
|---|---|---|---|
| `matplotlib-24265` | 26,076 tokens | **6,933** | **73.4%** |
| `django-11019` | 12,458 tokens | **9,354** | 24.9% |
| **Pooled** | **19,267** | **8,144** | **57.7%** |

**16 of 16 sessions answered correctly in both arms** — the savings aren't
bought with worse answers. On `matplotlib-24265` the two arms separate
completely: every neuron session finished in exactly 2 turns, every
control session took 4–5. Cost per run roughly halved, $0.46 → $0.22.

A narrower follow-up isolated just the architecture card the session-start
hook pushes proactively:

| Task | Without the card | With the card | Reduction |
|---|---|---|---|
| Module/subsystem inventory | 29,244 tokens | **5,112** | **82.5%** |
| Dependency list | 8,906 tokens | 9,994 | -12% (noise) |

Naming a project's module boundaries is a judgment call a directory listing
doesn't hand you for free — the card earns its keep there. Listing npm
dependencies is cheap either way, so the card doesn't move that number.

**Every harness here is real and re-runnable**, documented in
[`benchmarks/token-ab/README.md`](benchmarks/token-ab/README.md):

```bash
npm run bench:swebench-ab:dry-run                          # free — validates fixtures + grading
npm run bench:swebench-ab -- --k=4 --effort=low --cap=2.0  # the run above: ~$0.70, ~15 min
```

Every session's full answer text, token breakdown, and per-gate grade is
written to `results.json`, so you can re-grade the verdicts yourself.

```bash
npm run bench:report   # free, ~10s — re-renders from the result files already in this repo
npm run bench:view     # same, then opens benchmarks/reports/index.html
```

## 🖥️ Local dashboard

```bash
neuron ui
```

![Neuron dashboard](docs/images/dashboard.png)

Browse categories, run instant semantic queries, filter by tags, and inspect
drift reports — all served locally.

## 🧪 Testing

```bash
npm test          # unit + integration suite, ~7s
npm run test:e2e  # deeper E2E benchmark & correctness suite
```

## 📚 Documentation

- **[Command reference](https://github.com/kovartravis/neuron/blob/main/docs/COMMANDS.md)**
  — every command, flag, exit code, and the full `neuron.yaml` schema
- **[Architecture decision records](https://github.com/kovartravis/neuron/tree/main/docs/adr)**
  — why it's built the way it is
- **[Changelog](https://github.com/kovartravis/neuron/blob/main/CHANGELOG.md)**
  — including upgrade notes

## 📄 License

MIT © [Travis Kovar](https://github.com/kovartravis)
