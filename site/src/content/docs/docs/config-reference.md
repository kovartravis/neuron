---
title: "neuron.yaml — Full Field Reference"
description: "Every field neuron.yaml accepts, its type, and its default — the field-by-field lookup, distinct from the narrative configuration guide."
---

Every field `neuron.yaml` accepts, by top-level key, with its type and
default. For the narrative walkthrough — what storage modes mean, how
declared fields work end to end — see the
[configuration guide](/docs/configuration/). This page is the lookup table.

`neuron.yaml` is a file neuron writes to as well as reads: a write against
an undeclared category auto-appends a minimal `categories.<name>: {}` block
on disk, preserving your own comments and formatting, rather than being
rejected. Categories stay advisory, never validated at write time.

## version and strict

| Field | Type | Default | Notes |
|---|---|---|---|
| `version` | string | `"1.0"` | |
| `strict` | boolean | `false` | Disables the two content-driven write-side inference mechanisms (tag centroid selection, category centroid/model inference), so a project can additionally claim *value* determinism — an entry's stored fields depend only on what the caller passed. The tradeoff: every write needs an explicit `--category`, and gets no automatic tags |

## storage

| Field | Type | Default | Notes |
|---|---|---|---|
| `storage.mode` | enum: `md`, `vector` | `md` | `md` keeps `.neuron/*.md` files as the source of truth, SQLite as a rebuildable index. `vector` skips markdown entirely. Deprecated spellings `md-only`/`dual`/`vector-only`/`split` still parse, aliased with a warning |
| `storage.path` | string | *(none — falls through to `.neuron`)* | Absence is meaningful: it's what lets `categories.<name>.path > storage.path > ".neuron"` fall through correctly. An explicit `.neuron` is not the same as omitting the field |

## categories

| Field | Type | Default | Notes |
|---|---|---|---|
| `categories.<name>.description` | string | *(none)* | |
| `categories.<name>.tags` | string[] | *(none)* | |
| `categories.<name>.storage` | enum: `md`, `vector` | inherits `storage.mode` | Per-category override, always live regardless of top-level mode. Precedence: `categories.<name>.storage > storage.mode > "md"`. Deprecated `dual` aliases to `md` |
| `categories.<name>.path` | string | inherits `storage.path` | Per-category override. Precedence: `categories.<name>.path > storage.path > ".neuron"`. Absolute paths are allowed — a notes directory shared across projects, even outside the current repo |

If `categories` is omitted entirely, it defaults to `learning`,
`decisions`, and `architecture`, each with a description but no tags —
exactly what a freshly-generated `neuron.yaml` declares.

## Declaring required fields

`categories.<name>.fields.<key>` declares a project-specific frontmatter
field, becoming its own CLI flag on `add`/`update` (see
[declared field schema](/docs/declared-field-schema/) for the full model
and why the type floor stops here):

| Field | Type | Default | Notes |
|---|---|---|---|
| `fields.<key>.type` | enum: `string`, `enum`, `commitRef` | *(required)* | `commitRef` validates against a real commit in the project's own git history at write time |
| `fields.<key>.required` | boolean | `false` | A required field with no `default:` hard-errors on `add` when omitted, naming the field and category |
| `fields.<key>.default` | string | *(none)* | Must be one of `values` when `type: enum` |
| `fields.<key>.values` | string[] | *(required for `type: enum`)* | At least one value |

A declared field key becomes a CLI flag by kebab-casing (`reviewedBy` →
`--reviewed-by`) and must not collide with a built-in flag name.

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

## scan

| Field | Type | Default | Notes |
|---|---|---|---|
| `scan.enabled` | boolean | `false` | Whether `neuron init` and other commands auto-run a scan |
| `scan.category` | string | `"architecture"` | Default `--category` for `neuron scan` |
| `scan.depth` | number | `3` | Default `--depth` for `neuron scan` |

See [neuron scan](/docs/cli-scan/) for the command itself.

## pullRules.default

Governs which categories get proactively injected into your agent's
context at session-start/pre-prompt recall.

| Field | Type | Default | Notes |
|---|---|---|---|
| `pullRules.default.categories` | string[] | `[learning]` | Must be non-empty |
| `pullRules.default.limit` | number | *(none)* | |
| `pullRules.default.minScore` | number | *(none)* | **Deprecated** (ADR 0012) — still parses, but gates nothing; the quantity it filtered on can never reject a top hit at any relevance. Use `relevance.gate.enabled` instead |

## pullRules.onExec

Matches shell commands by regex and injects a category-scoped lookup
before they run — what backs [`neuron exec`](/docs/cli-exec/)'s
pre-execution check.

| Field | Type | Default | Notes |
|---|---|---|---|
| `pullRules.onExec[].commandPattern` | string (regex) | *(required)* | Must be non-empty |
| `pullRules.onExec[].categories` | string[] | *(required)* | Must be non-empty |
| `pullRules.onExec[].limit` | number | *(none)* | |
| `pullRules.onExec[].minScore` | number | *(none)* | **Deprecated** — see `pullRules.default.minScore` above |

When more than one rule matches a command, `limit`/`minScore` resolve as
**last-match-wins** — list a broad catch-all first and a more specific
override after it. `categories` still union across every matching rule.

```yaml
pullRules:
  onExec:
    - commandPattern: ".*"
      categories: [learning]
      limit: 8
    - commandPattern: "^(git|npm|gh) "
      categories: [learning, decisions]
      limit: 5
```

## llm.enrichment

Write-side enrichment: filling in tags and category automatically on
`memory add`. See [write-side enrichment](/docs/write-side-enrichment/) for
how each mechanism works.

| Field | Type | Default | Notes |
|---|---|---|---|
| `llm.enrichment.enabled` | boolean | `true` | Disables the whole job when `false` |
| `llm.enrichment.category` | string | `"infer"` | `infer`, `off`, or a literal category name used as the fallback when inference can't produce an answer. Left as `infer`, an inference failure is a hard error instead |
| `llm.enrichment.tags` | enum: `infer`, `off` | `"infer"` | |
| `llm.enrichment.timeoutMs` | number | `15000` | Bounds every model call — a cold model load alone can exceed 3s |
| `llm.enrichment.maxTags` | number | `3` | Top-K cap on centroid tag selection |
| `llm.enrichment.minTagSimilarity` | number | `0.5` | Similarity floor — a weakly-related entry gets few tags or none |
| `llm.enrichment.categoryStrategy` | enum: `model`, `centroid` | `"centroid"` | `centroid` is the default on evidence — it won 9/9 against the model strategy's 1/9 on the same benchmark corpus. A store with no entries yet has no centroids, so an omitted `--category` on a cold store still hard-errors until the first few entries are filed explicitly |

## relevance.gate

| Field | Type | Default | Notes |
|---|---|---|---|
| `relevance.gate.enabled` | boolean | `true` | The single retrieval-layer on/off switch, governing both `neuron exec` and `neuron memory query` identically — a per-path split was considered and declined. Covers both the lexical leg (a topicality predicate) and the reranker leg (a small local cross-encoder run only on candidates that already pass it) as one gate, not two |

There is deliberately no `cosineFloor` key — measured on a 500-question
benchmark and found to regress recall on real conversational text at every
floor tested, because on-topic and negative-control top-1 cosine similarity
overlap too far to cut cleanly.

## recall

| Field | Type | Default | Notes |
|---|---|---|---|
| `recall.epochCharBudget` | number (positive integer) | `18000` | Caps what the recall hook holds resident in the live context window per epoch — a session-start card (6,000 chars) plus 8 worst-case `pre-prompt` turns (1,500 chars each). Resets when the ledger resets (on `context-reset`), not once per whole session. Published as roughly 6,000 tokens at a conservative 3 chars/token |

## Environment variables

Not part of `neuron.yaml`, but read alongside it:

| Variable | Purpose |
|---|---|
| `NEURON_DB_PATH` | Override the SQLite database location |
| `NEURON_CACHE_DIR` | Override the drift-fingerprint cache location |
| `NEURON_GRAMMAR_DIR` | Override the Tree-Sitter grammar cache — useful for CI cache restoration |
| `npm_config_registry` | Honored when fetching Tree-Sitter grammars, so corporate mirrors work |
