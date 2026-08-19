---
title: "neuron scan — Architecture Blueprint & Drift Detection"
description: "Ingest a Repository Architectural Blueprint card, diff it against the live codebase, and gate CI on real drift."
---

`neuron scan` scans project topology, manifests, and source symbols, then
ingests a single **Repository Architectural Blueprint** card into the
memory store. Re-running updates that card in place rather than adding a
duplicate. With `--diff` or `--check`, it compares the live codebase against
the stored blueprint instead of ingesting, reporting drift across new
modules, removed modules, export changes, and dependency shifts.

## Flags

| Flag | Effect |
|---|---|
| `--category <name>` | Target memory category for blueprint ingestion (default: `architecture`) |
| `--depth <n>` | Max directory traversal depth (default: `3`) |
| `--diff` | Report drift against the stored blueprint instead of ingesting |
| `--check` | Like `--diff`, but sets a non-zero exit code — for CI |
| `--dry-run` | Print the blueprint card without ingesting it |
| `--format <json\|md>` | Output format for `--dry-run`, `--diff`, and `--check` (default: `md`) |
| `--json` | Shortcut for `--format json` |
| `--no-progress` | Disable the terminal progress bar |

Defaults for `--category`, `--depth`, and whether scanning runs
automatically come from the `scan:` block in `neuron.yaml` — see the
[config reference](/docs/config-reference/#scan).

## Exit codes (--check)

| Code | Meaning |
|---|---|
| `0` | In sync with the baseline |
| `1` | Architectural drift detected |
| `2` | Baseline is not comparable — re-baseline required |

**Exit `2` is not drift.** It means the stored card was produced by a
different parser than the current scan, usually because neuron was
upgraded across a change to symbol extraction. Comparing across that
boundary would report changes nobody made, so `scan` refuses. Run
`neuron scan` once (no flags) to re-baseline. Re-baselining is destructive
to drift history — changes accumulated before it are absorbed into the new
card rather than itemized.

## Parser fidelity

Cards record which parser produced each file, as `<parser>/<generation>`:

| Extensions | Parser |
|---|---|
| `.ts`, `.tsx`, `.js`, `.jsx`, `.py`, `.go`, `.rs`, `.java`, `.cpp`, `.hpp` | Tree-Sitter AST |
| `.cs`, `.swift`, `.rb`, `.php` | Line-oriented fallback |

A language that *has* a grammar but fails to load it degrades to the
fallback and warns loudly on `stderr`. A language with no grammar at all
stays silent, since its fidelity is expected.

## Examples

```bash
neuron scan                    # scan and ingest the blueprint
neuron scan --dry-run          # preview without writing to memory
neuron scan --diff             # what changed since the last scan
neuron scan --check --json     # gate CI, machine-readable
```
