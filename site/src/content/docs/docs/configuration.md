---
title: "Configuring neuron.yaml: Storage, Categories, and Declared Fields"
description: "The full neuron.yaml surface — storage modes, per-category overrides, declared required fields, and pull rules — in one page."
---

## What neuron init generates

This is exactly what `neuron init` writes for a new project:

```yaml
version: "1.0"

storage:
  mode: md
  path: .neuron

categories:
  learning:
    description: Agent conventions, rules, and failure fixes
    tags: [rule, convention, failure-fix]

  decisions:
    description: Architectural Decision Records (ADRs) & design choices
    tags: [adr, architecture, design]

  architecture:
    description: Architectural blueprints & structure cards
    tags: [architecture, topology, scan]

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

## Storage: two modes, one guarantee

`storage.mode` picks where entries live: `md` (the default) keeps
`.neuron/*.md` files as the source of truth, with SQLite as a rebuildable
semantic-search index reconciled from those files on every command — delete
the database at any time and neuron rebuilds it. `vector` skips markdown
entirely and keeps entries only in SQLite. Whichever mode a category
resolves to, it gets identical schema enforcement — storage backend is not
a caveat on that guarantee. See [storage adapters](/docs/storage-adapters/)
for how the two modes work internally.

## Per-category storage path and mode

A category doesn't have to live at the project-wide `storage.path`, or
share the project-wide `storage.mode`. Setting `path` or `storage` directly
on a category overrides the top-level default just for it:

```yaml
storage:
  mode: md
  path: .neuron

categories:
  decisions:
    description: Architectural Decision Records (ADRs) & design choices
    path: docs/adr      # overrides storage.path for this category only
  telemetry:
    description: High-volume, low-value entries
    storage: vector      # this category alone skips markdown
```

Precedence is the same shape for both: `categories.<name>.path >
storage.path > ".neuron"`, and `categories.<name>.storage > storage.mode >
"md"`. Absolute paths work too — a notes directory shared across projects,
even outside the current repo.

## Declaring required fields

Add a `fields` block to any category to make specific frontmatter fields
mandatory. The CLI both enforces them at write time and exposes them as
flags:

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

Declared fields extend `neuron memory --help` dynamically, so an agent
reading `--help` learns a project's schema without it being restated
anywhere else. `string`, `enum`, and `commitRef` are the only supported
field types — see [the declared field schema](/docs/declared-field-schema/)
for why, and for the full three-tier field model this sits inside.

## Pull rules

`pullRules` governs which categories get proactively injected into your
agent's context, and how many entries. `default` applies to normal
session-start/pre-prompt recall; `onExec` matches shell commands by regex
(`commandPattern`) and injects a category-scoped lookup before they run —
this is what backs `neuron exec`'s pre-execution safety check.

## Limitations

Configuration controls *what* gets recalled and *how it's shaped* — it
doesn't make your agent write to the store in the first place. Recall
solves reading memory back; it doesn't make an agent write to it. See the
[quickstart's own Limitations section](/docs/quickstart/#limitations) for
the write-side compliance mechanism that addresses this.

Source: [`README.md` "⚙️ Configuration (neuron.yaml)"](https://github.com/kovartravis/neuron/blob/main/README.md#%EF%B8%8F-configuration-neuronyaml).
