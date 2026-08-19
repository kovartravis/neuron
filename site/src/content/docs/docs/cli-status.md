---
title: "neuron status — Health, Compliance, and Drift Checks"
description: "Storage, embedding model, and drift status as JSON, plus --check/--repair schema compliance and --health duplicate detection."
---

`neuron status` prints database, markdown storage, embedding model, and
architectural drift status as JSON. `--check`/`--repair` and `--health` add
four further validation surfaces on top of the plain status output.

## What --check / --repair validate

1. **Field-schema violations** (ADR 0013) — entries whose category's
   *currently*-declared `fields` schema they violate, most commonly a
   field declared `required` after the entry was already written. Reads
   never hard-error on this; these flags are the only surface that reports
   it.
2. **Undeclared categories** (ADR 0017) — categories holding live rows in
   the store but absent from `neuron.yaml`'s own `categories:` block.
   Config-file drift, reported separately from the per-entry violations
   above. Most writes never reach this, since a category missing from
   `neuron.yaml` auto-declares itself on its first write; this only catches
   categories that predate that hook.
3. **`binaryVersionMismatch`** — the running `neuron` binary's own resolved
   version disagrees with the current directory's own `package.json`. Only
   fires when that `package.json` names `@kovartravis/neuron` itself, so an
   ordinary consumer project never trips it. No `--repair` counterpart —
   the fix is re-linking or reinstalling the binary, not a store write.
4. **`protocolBlockDrift`** — a harness's generated instructions file (e.g.
   `CLAUDE.md`) no longer matches what `neuron.yaml` would generate today.
   No `--repair` counterpart either — run `neuron init --overwrite-hooks`.

## Flags

| Flag | Effect |
|---|---|
| `--check` | List entries missing a currently-required field, undeclared categories, a stale binary, and protocol-block drift. Exits `1` if any is non-empty |
| `--repair` | Apply a configured `default:`, or centroid-based inference for enum-typed fields only, and declare every undeclared category found. Never fabricates a value for a free-text field (e.g. `reviewedBy`, `ticket`). Exits `1` if anything is left unresolved. No effect on `binaryVersionMismatch`/`protocolBlockDrift` |
| `--health` | Reports near-duplicate entry groups (embedding-cosine, clustered store-wide), an importance histogram, and the superseded-entry count |
| `--health --repair` | Auto-merges exact-content duplicate subgroups within a cluster — the latest-created entry survives, the rest are marked superseded (never deleted). Differently-worded near-dups are left for a human `--supersedes` call |
| `--json` | With `--health`, print JSON instead of the human-readable report |

`--check` cannot be combined with `--repair` or `--health`. `--health` and
`--repair` combine freely with each other.

## Exit codes (--check / --repair / --health --repair)

| Code | Meaning |
|---|---|
| `0` | Compliant/merged, or every violation repaired |
| `1` | Violations found, or something left unresolved |

## Examples

```bash
neuron status                    # full status JSON
neuron status --check            # list non-compliant entries, exit 1 if any
neuron status --repair           # fix what's fixable, exit 1 if anything remains
neuron status --health           # human-readable store-health report
neuron status --health --json    # same report, as JSON
neuron status --health --repair  # merge exact-duplicate clusters
```
