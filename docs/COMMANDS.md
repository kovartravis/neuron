# Command reference

Full flag listings for `@kovartravis/neuron`. For what Neuron is and why, see the
[README](../README.md).

Every command also responds to `--help`.

---

## `neuron init`

Bootstraps a project: writes a `neuron.yaml` if the project has none, detects
every harness present (`CLAUDE.md`/`.claude/`, `AGENTS.md`, `.codex/`,
`.github/`, `.cursor/` — writing `AGENTS.md` if none exist), installs
deterministic recall hooks for every harness with an adapter (Claude Code,
Codex CLI), writes the capability-aware memory-store instructions block into
each detected harness's instructions file, pre-downloads the local ONNX
models with a progress bar, fetches Tree-Sitter grammars, and runs the
initial scan if configured.

| Flag | Description |
|---|---|
| `--yes` | Non-interactive: accept defaults for every prompt (hook target defaults to `project-committed`) |
| `--no-hooks` | Skip installing recall hooks entirely; harnesses still get the fallback instructions block |
| `--hook-target <target>` | Where to install hooks: `user-global`, `project-committed`, or `project-local`. Asked once per run, applied to every harness being wired |
| `--overwrite-hooks` | Replace a neuron-authored hook entry that differs from what this run would write, without asking |
| `--keep-hooks` | Keep a differing neuron-authored hook entry as-is, without asking (the non-interactive default) |
| `--harness <list>` | Comma-separated harness ids (e.g. `claude,codex`) to narrow wiring to a subset of *detected* harnesses; cannot force-wire an undetected one |
| `--uninstall-hooks` | Remove every hook entry neuron installed, for the harnesses selected by `--harness` (or all adapters if omitted); does nothing else |

`--overwrite-hooks` and `--keep-hooks` are mutually exclusive. A conflicting
neuron-authored hook entry is never touched without one of these flags or an
interactive answer — a user's own, non-neuron hooks are never read or
modified, even when they share the same event array. The same
overwrite/keep policy also governs the generated protocol block: an existing
managed region that differs from what this run would write is asked about,
never silently replaced.

The generated `neuron.yaml` sets `storage.mode: md` and declares `learning`,
`history`, `decisions` and `architecture`. An **existing** config — including one
in an ancestor directory that already governs this project — is never touched,
rewritten or merged into; `init` is re-run routinely to refresh skills, models
and grammars, and anything it edits it would edit again over your changes. The
JSON output reports which config governs the project under `config`, per-harness
hook install results under `hooks.installed`, and the fidelity each harness's
instructions file ended up with (derived from `verify()`, not inferred) under
`protocol.written`.

Model and grammar downloads are best-effort — a failure leaves that capability
degraded rather than failing the whole bootstrap.

---

## `neuron hook <harness> <point>`

The entrypoint `neuron init` wires into a harness's own hook configuration —
not typically run by hand. `<harness>` is `claude-code` or `codex`; `<point>`
is `session-start` (seeds the architecture blueprint card once), `pre-prompt`
(queries the store with the submitted prompt and injects results, plus a
gated search of an indexed commit-history table — see the README's "Your git
history is a searchable resident source too"), or `context-reset` (clears the
per-session dedup ledger on compaction). Reads a harness-shaped JSON payload
from stdin, writes `{"hookSpecificOutput": ...}` to stdout on a hit, and
**always exits `0`** — a malformed payload, a query error, a timeout, or an
unreachable store all degrade to printing nothing rather than blocking the
harness's prompt.

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

Runs a command with a pre-execution memory lookup. Matches are printed to
`stderr`, filtered through the relevance gate (ADR 0012): a result whose top
hit has no keyword (FTS) match at all is rejected, regardless of semantic
similarity. If the gate rejects every candidate, `neuron exec` still prints a
line naming the command and how many candidates it rejected, so an empty
result is distinguishable from an empty store. The command runs with
inherited `stdio` and its exit code passes through. When `scan.enabled` is
set, a non-blocking drift warning prints first.

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

### Project-declared fields (ticket 43 / ADR 0013)

A category can declare its own `string`/`enum` frontmatter fields in
`neuron.yaml` — each one becomes its own CLI flag on `add`/`update`, not a
generic `--field k=v` escape hatch:

```yaml
categories:
  decisions:
    fields:
      ticket:
        type: string
        required: true
      confidence:
        type: enum
        values: [low, medium, high]
        default: medium
```

```bash
neuron memory add --category decisions --ticket NEU-42 --confidence high "..."
```

A required field with no `default:` hard-errors, naming the field and
category, when omitted on `add`. `update` is a partial patch, the same as
`--tags`/`--importance`/`--task-id`: an omitted field is left untouched
rather than re-demanded or cleared. `neuron memory --help` lists a project's
declared fields once `neuron.yaml` declares any.

Every declared field also lives as a nullable SQLite column (`vector`-storage
categories), added by an additive, idempotent auto-migration (ticket
44) — every storage mode persists declared fields identically.

---

## `neuron sync`

Synchronizes memories between Markdown files and the SQLite database. Relevant
for any category resolving to `md` storage (`storage.mode`, or a per-category
override), where it is the *explicit* forced rebuild — ordinary commands
already reconcile markdown into the index automatically.

| Flag | Description |
|---|---|
| `--dry-run` | Report what would change without writing |
| `--force` | Re-process entries even when hashes match |

---

## `neuron status`

Prints database, Markdown storage, embedding model and architectural drift status
as JSON.

`--check`/`--repair` fold in two validation surfaces:

- ADR 0013: entries whose category's *currently*-declared `fields` schema
  (see Configuration below) they violate — most commonly a field declared
  `required` after the entry was written. Reads never hard-error on this;
  these flags are the only surface that reports it.
- ADR 0017: categories holding live rows in the store but absent from
  `neuron.yaml`'s own `categories` block — config-file drift, reported as its
  own finding kind (`undeclaredCategories`), distinct from the per-entry
  `violations` above. Most writes never reach this, since a category missing
  from `neuron.yaml` auto-declares itself on its first write (see
  Configuration below); it only catches categories that predate that hook.

| Flag | Description |
|---|---|
| `--check` | List entries missing a currently-required field and undeclared categories; exits `1` if either is non-empty |
| `--repair` | Apply a configured `default:`, or centroid-based inference for enum-typed fields only, and declare every undeclared category found. Never fabricates a value for a free-text field (e.g. `reviewedBy`, `ticket`) — those come back unresolved, and `--repair` exits `1` if anything is left unresolved |

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

> [!NOTE]
> `neuron.yaml` is a file the tool can write to, not just read (ADR 0017).
> Categories stay advisory, not validated: `neuron memory add --category <x>`
> and `neuron scan` are never rejected for using an undeclared category.
> Instead, the first write that introduces one auto-appends a minimal
> `categories.<name>: {}` block to `neuron.yaml` on disk — preserving your own
> comments and formatting via the `yaml` package's `Document` API, never
> inventing a description or tags. `neuron status --repair` backfills any
> category that already had rows before this hook existed.

```yaml
version: "1.0"

storage:
  mode: md               # md (default) | vector
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

  onExec:
    - commandPattern: ".*"
      categories: [learning]
      limit: 8
    - commandPattern: "^(git|npm|gh) "
      categories: [learning, history]
      limit: 5

relevance:
  gate:
    enabled: true          # the conjunctive relevance gate (ADR 0012)
```

`scan.category` and `scan.depth` supply the defaults for `neuron scan`'s
`--category` and `--depth`.

`pullRules.default.minScore` / `pullRules.onExec[].minScore` are **deprecated**
(ADR 0012): they still parse but gate nothing — the quantity they filtered on
could never reject a top hit at any relevance. Use `relevance.gate.enabled`
instead. When more than one `onExec` rule matches a command, `limit`/`minScore`
resolve as **last-match-wins**: list a broad catch-all first and a more
specific override after it, since the later matching rule's value replaces
the earlier one outright (categories still union across every matching rule).

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
summarizer, not test stubs — across 12 pillars: polyglot AST traversal at
scale, adversarial semantic recall, high-concurrency multi-agent stress,
architectural drift latency, storage corruption self-healing, real pipeline
integrity, adversarial retrieval quality, multi-process contention and crash
recovery, the retrieval scale curve, prune safety, category-strategy A/B, and
enrichment retrieval non-regression. Pillar 8 (multi-process contention) is a
known pre-existing failure (`3/50` rejected writes against a `<5%` bar), not
specific to any one release.

It needs a warm local ONNX model cache; a cold cache makes the first run
substantially longer. See
[ADR 0007](adr/0007-deep-e2e-benchmark-suite-matrix.md).
