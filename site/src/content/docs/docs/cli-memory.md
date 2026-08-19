---
title: "neuron memory — Every Subcommand"
description: "add, query, list, get, update, delete, consolidate, and prune — every flag, the write-time supersession gate, and declared-field flags."
---

`neuron memory <subcommand>` is where every read and write against the
store happens. `query` and `list` span every category by default;
subcommands that mutate a specific entry (`update`, `delete`,
`consolidate`, `prune`) require `--category`.

## add

Adds a new entry.

```bash
neuron memory add --category learning "..." --tags failure-fix --importance 4
```

`--category` is the one subcommand where it's optional — write-side
enrichment infers it from the categories already in the store, or the write
fails naming the cause. It stays required everywhere else, where it selects
an existing entry rather than something to infer. See
[write-side enrichment](/docs/write-side-enrichment/) for how inference
works, and the [declared field schema](/docs/declared-field-schema/) for
how a category's own required fields extend `add` with project-specific
flags.

## query

Semantic + keyword hybrid search.

```bash
neuron memory query "auth flow" --categories learning,decisions
```

Spans every category unless `--categories` narrows it. See
[hybrid search & RRF](/docs/hybrid-search/) for how results are ranked and
gated.

## list

Lists entries, newest first by default.

```bash
neuron memory list --category tickets-present --where "status=unclaimed"
```

Combine `--where` and `--refs-satisfy` (below) to filter on any declared
field, in any category — schema-agnostic, no field name baked into the CLI
itself.

## `get <id>`

Fetches a single entry by id directly — a row lookup, not a filtered
`list`.

```bash
neuron memory get 033459c0-d6a6-4366-a1a8-9f16c357c05d
```

`--category` is optional here too, but means something different than on
`add`: ids are unique store-wide, so passing it doesn't narrow the search —
it only asserts the caller's own assumption. A mismatch between the id's
real category and the one passed reads as `not_found`, not as the flag
being ignored.

## `update <id> "<content>"`

Updates an entry in place. `--category` is required, and must match the
entry's existing category.

```bash
neuron memory update <id> "revised content" --category learning --importance 5
```

A partial patch: any flag you omit (`--tags`, `--importance`, `--task-id`,
a declared field) is left untouched rather than cleared or re-demanded.

## `delete <id>`

Deletes an entry. `--category` is required.

```bash
neuron memory delete <id> --category learning
```

## consolidate

Summarizes an append-only category's entries logged since the last
consolidation cursor. `--category` is required.

```bash
neuron memory consolidate --category learning
```

## prune

Deletes old entries from one category. **Destructive — no undo.**
`--category` is required.

```bash
neuron memory prune --category learning --days 30
```

`--days` sets the cutoff age (default `30`). `--importance` sets the prune
*ceiling*, inclusive (default `3`) — every entry at or below that
importance, older than the cutoff, is deleted. An entry written without an
explicit `--importance` at write time defaults to `3`, so a bare
`neuron memory prune` deletes nearly all of a category's entries older than
30 days, not a handful of low-value ones. Pass a higher `--importance`
ceiling deliberately, or write entries you want to survive a prune at `4`
or `5` in the first place.

## General flags

| Flag | Applies to | Effect |
|---|---|---|
| `--category <name>` | most subcommands | Single category. Required for `update`/`delete`/`consolidate`/`prune`; inferred on `add` when omitted; optional (identity-asserting) on `get` |
| `--categories <a,b>` | `query`, `list` | Restrict to specific categories |
| `--tags <a,b>` | `add`, `update` | Attach tags (inferred from the store's own tag vocabulary when omitted) |
| `--importance <1-5>` | `add`, `update` | Never inferred — an omitted value stores `3` |
| `--task-id <id>` | `add`, `update` | Link an entry to a ticket or spec |
| `--limit <n>` | `query`, `list` | Caps returned results, not the internal scan used to compute them |
| `--include-superseded` | `query`, `list` | Include entries hard-excluded by default because a later entry supersedes them. Superseded rows are never deleted |

## Filtering with --where and --refs-satisfy

`list` only. Both are schema-agnostic — they work against any category and
any declared field, not a fixed vocabulary baked into the CLI.

| Flag | Meaning |
|---|---|
| `--where <field>=<value>` | Keep entries whose declared field equals `value`. `field!=value` negates. Repeatable — each occurrence ANDs onto the rest |
| `--refs-satisfy <field>:<sub>=<value>` | Keep entries where every comma-separated id in `field` names another same-category entry whose own `sub` field equals `value`. A dangling id (no matching entry) fails the check rather than silently passing. Requires exactly one `--category` |

```bash
neuron memory list --category tickets-present \
  --where "status=unclaimed" --where "map=<id>" \
  --refs-satisfy "blockedBy:status=resolved"
```

`--limit` caps the filtered result, not the internal fetch used to compute
it.

## Resolving the write-time supersession gate

`add` hard-blocks a write whose content looks like a near-duplicate of an
existing entry, naming the candidate id. Exactly one of four flags resolves
it — mutually exclusive with each other:

| Flag | Meaning |
|---|---|
| `--supersedes <id>` | This write is a genuine reversal/update of `<id>`: marks it as superseded, which hard-excludes it from ordinary `query`/`list` going forward. `<id>` is validated to exist first |
| `--not-a-reversal` | Explicit override confirming this write is not a reversal — skips the gate without marking anything superseded |
| `--if-novel` | Non-interactive resolution for cron/scheduled writers that can't answer the gate by hand: on a hit, skip the write cleanly (exit `0`, not an error) rather than blocking a scheduled job. Never silent — reason and candidate id print to `stderr`, and `{"skipped": true, ...}` replaces the written entry on stdout |
| `--companion-of <id>` | Exempts this write from the gate **only** against the named `<id>` — for a deliberate companion write that intentionally restates something just written under a different category. If the gate's real near-dup candidate is a *different* entry, the gate still fires normally. `<id>` is validated to exist, same as `--supersedes` |

## Project-declared fields

A category can declare its own `string`/`enum`/`commitRef` frontmatter
fields in `neuron.yaml` — each becomes its own CLI flag on `add`/`update`,
not a generic `--field k=v` escape hatch. `neuron memory --help` lists a
project's actual declared flags once `neuron.yaml` declares any. Full
mechanics, the three field tiers, and why the type floor stops at
`string`/`enum`/`commitRef`: [declared field schema](/docs/declared-field-schema/)
and the [config reference](/docs/config-reference/#declaring-required-fields).

```bash
neuron memory add --category decisions --ticket NEU-42 --confidence high "..."
```

A required field with no configured `default:` hard-errors on `add`,
naming the field and category, when omitted. `update` treats a declared
field the same as `--tags`/`--importance`: an omitted one is left
untouched, never re-demanded or cleared.
