---
title: "neuron sync — Force a Markdown/SQLite Rebuild"
description: "The explicit, forced reconciliation between markdown files and the SQLite index — ordinary commands already do this automatically."
---

`neuron sync` synchronizes memories between markdown files and the SQLite
database. Relevant for any category resolving to `md` storage (the
top-level `storage.mode`, or a per-category override) — SQLite is a
rebuildable semantic-search index for those categories, and `sync` is the
*explicit*, forced rebuild. Ordinary commands (`memory add`, `memory
query`, and so on) already reconcile markdown into the index automatically;
`sync` exists for cases where you've hand-edited a `.md` file directly and
want the index caught up without waiting for the next command to trigger
it.

## Flags

| Flag | Effect |
|---|---|
| `--dry-run` | Report what would change without writing |
| `--force` | Re-process entries even when hashes match |
| `--category <name>` (`-c`) | Restrict sync to one category instead of every category `neuron.yaml` declares |

## Conflicts

If an entry's content differs between the vector DB and its markdown file,
and neither side is known to be fresher, `sync` leaves it untouched rather
than guessing which one wins — it reports the conflicting `category/id`
pairs and exits non-zero. Re-run with `--force` to make markdown
authoritative for those entries.

## Examples

```bash
neuron sync                    # reconcile every declared category
neuron sync --dry-run          # preview without writing
neuron sync --category learning --force
```
