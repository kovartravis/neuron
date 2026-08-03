# Command reference

Full flag listings for `@kovartravis/neuron`. For what Neuron is and why, see the
[README](../README.md).

Every command also responds to `--help`.

---

## `neuron init`

Bootstraps a project: writes a `neuron.yaml` if the project has none, detects
`CLAUDE.md` or `AGENTS.md` (creating `AGENTS.md` if neither exists), appends or
updates the memory-store instructions block in place, pre-downloads the local
ONNX models with a progress bar, fetches Tree-Sitter grammars, and runs the
initial scan if configured.

| Flag | Description |
|---|---|
| `--file`, `-f` | Target instructions file instead of auto-detecting |

The generated `neuron.yaml` sets `storage.mode: md` and declares `learning`,
`history`, `decisions` and `architecture`. An **existing** config — including one
in an ancestor directory that already governs this project — is never touched,
rewritten or merged into; `init` is re-run routinely to refresh skills, models
and grammars, and anything it edits it would edit again over your changes. The
JSON output reports which config governs the project under `config`.

Model and grammar downloads are best-effort — a failure leaves that capability
degraded rather than failing the whole bootstrap.

---

## `neuron scan`

Scans project topology, manifests and source symbols, then ingests a single
**Repository Architectural Blueprint** card into the memory store. Re-running
updates that card in place rather than adding a duplicate.

| Flag | Description |
|---|---|
| `--category <name>` | Target memory category (default: `architecture`) |
| `--depth <n>` | Max directory traversal depth (default: `3`) |
| `--diff` | Report drift against the stored blueprint instead of ingesting |
| `--check` | Like `--diff`, but sets a non-zero exit code — for CI |
| `--dry-run` | Print the blueprint card without ingesting it |
| `--format <json\|md>` | Output format for `--dry-run`, `--diff`, `--check` (default: `md`) |
| `--json` | Shortcut for `--format json` |
| `--no-progress` | Disable the terminal progress bar |

### Exit codes (`--check`)

| Code | Meaning |
|---|---|
| `0` | In sync with the baseline |
| `1` | Architectural drift detected |
| `2` | Baseline is not comparable — re-baseline required |

**Exit `2` is not drift.** It means the stored card was produced by a different
parser than the current scan, usually because Neuron was upgraded across a change
to symbol extraction. Comparing across that boundary would report changes nobody
made, so Neuron refuses. Run `neuron scan` once to re-baseline.

Re-baselining is destructive to drift history: changes accumulated before it are
absorbed into the new card rather than itemised.

### Parser fidelity

Cards record which parser produced each file, as `<parser>/<generation>`:

| Extensions | Parser |
|---|---|
| `.ts`, `.tsx`, `.js`, `.jsx`, `.py`, `.go`, `.rs`, `.java`, `.cpp`, `.hpp` | Tree-Sitter AST |
| `.cs`, `.swift`, `.rb`, `.php` | Line-oriented fallback |

A language that *has* a grammar but fails to load it degrades to the fallback and
warns loudly on `stderr`. Languages with no grammar at all stay silent, since
their fidelity is expected. See
[ADR 0009](adr/0009-parser-fidelity-and-baseline-comparability.md).

### Examples

```bash
neuron scan                    # scan and ingest the blueprint
neuron scan --dry-run          # preview without writing to memory
neuron scan --diff             # what changed since the last scan
neuron scan --check --json     # gate CI, machine-readable
```

---

## `neuron exec -- <command>`

Runs a command with a pre-execution memory lookup. Matching rules are printed to
`stderr` above a relevance threshold; the command runs with inherited `stdio` and
its exit code passes through. When `scan.enabled` is set, a non-blocking drift
warning prints first.

```bash
neuron exec -- npm test
neuron exec -- git commit -m "message with spaces"
```

Arguments are spawned as an argv array, so quoting is preserved. To use shell
operators, pass the whole thing as one quoted string:

```bash
neuron exec -- "npm run build && npm test"
```

> **Developing Neuron itself?** `neuron exec` runs the *globally installed*
> binary, not your working tree. Run `npm link` so the two agree, or the
> pre-execution hooks will behave like the released version.

---

## `neuron memory <subcommand>`

Multi-category memory operations.

| Subcommand | Description |
|---|---|
| `add` | Add an entry. `--category` required |
| `query` | Semantic + keyword hybrid search |
| `list` | List entries |
| `update` | Update an entry. `--category` required |
| `delete` | Delete an entry. `--category` required |
| `consolidate` | Summarize history entries logged since the last consolidation |
| `prune` | Remove obsolete or redundant entries |

| Flag | Description |
|---|---|
| `--category <name>` | Single category — required for `add`, `update`, `delete` |
| `--categories a,b` | Restrict `query`/`list` to specific categories |
| `--tags a,b` | Attach or filter by tags |
| `--importance <1-5>` | Entry importance. Never inferred — an omitted value stores `3`, which is also the default `prune` ceiling |
| `--task-id <id>` | Link an entry to a ticket or spec |
| `--limit <n>` | Max results |

`query` and `list` span every category by default.

```bash
neuron memory query "auth flow" --categories learning,decisions
neuron memory add --category learning "..." --tags failure-fix --importance 4
```

---

## `neuron sync`

Synchronizes memories between Markdown files and the SQLite database. Relevant in
`md` and `split` storage modes, where it is the *explicit* forced rebuild —
ordinary commands already reconcile markdown into the index automatically.

| Flag | Description |
|---|---|
| `--dry-run` | Report what would change without writing |
| `--force` | Re-process entries even when hashes match |

---

## `neuron status`

Prints database, Markdown storage, embedding model and architectural drift status
as JSON.

---

## `neuron ui`

Launches the local web dashboard.

---

## `neuron feedback [message]`

Generates pre-filled GitHub issue links.

| Flag | Description |
|---|---|
| `--type <bug\|feature\|general>` | Issue template |
| `--title <text>` | Issue title |

---

## Deprecated

`neuron learn …` and `neuron history …` are thin aliases that delegate to
`neuron memory --category learning|history` and warn on `stderr`. Removed in
3.0.0.

---

## Configuration (`neuron.yaml`)

```yaml
version: "1.0"

storage:
  mode: md               # md (default) | vector-only | split
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

  architecture:
    description: Architectural blueprints & structure cards
    tags: [architecture, topology, scan]

scan:
  enabled: true
  category: architecture
  depth: 3

pullRules:
  default:
    categories: [learning, decisions]
    limit: 5
    minScore: 0.35

  onExec:
    - commandPattern: ".*"
      categories: [learning]
      limit: 5
    - commandPattern: "^(git|npm|gh) "
      categories: [learning, history]
      limit: 8
```

`scan.category` and `scan.depth` supply the defaults for `neuron scan`'s
`--category` and `--depth`.

### Environment variables

| Variable | Purpose |
|---|---|
| `NEURON_DB_PATH` | Override the SQLite database location |
| `NEURON_CACHE_DIR` | Override the drift-fingerprint cache location |
| `NEURON_GRAMMAR_DIR` | Override the Tree-Sitter grammar cache — useful for CI cache restoration |
| `npm_config_registry` | Honoured when fetching grammars, so corporate mirrors work |

---

## Testing & benchmarks

```bash
npm test            # unit + integration suite
npm run test:e2e    # deep E2E benchmark & correctness suite
npm run bench:view  # open the HTML scorecard
```

`test:e2e` exercises the **real** pipeline — the ONNX embedder and the Qwen
summarizer, not test stubs — across nine pillars: polyglot AST traversal at
scale, adversarial semantic recall, high-concurrency multi-agent stress,
architectural drift latency, storage corruption self-healing, real pipeline
integrity, adversarial retrieval quality, multi-process contention and crash
recovery, and the retrieval scale curve.

It needs a warm local ONNX model cache; a cold cache makes the first run
substantially longer. See
[ADR 0007](adr/0007-deep-e2e-benchmark-suite-matrix.md).
