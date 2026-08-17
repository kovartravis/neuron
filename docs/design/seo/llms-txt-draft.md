# llms.txt / llms-full.txt draft

**Date:** 2026-08-17
**Status:** decision made, structural draft only — final link list waits on
Map — neuron.github.io Site (2.5.0)'s own Ticket 3 (Docs Information
Architecture), which commits the real page inventory and slugs. This
document curates by *topic*, using Ticket 2's flat `/docs/<slug>`
convention as the shape; swap in real slugs once Site's Ticket 3 resolves.

## Decision

**Publish both `llms.txt` and `llms-full.txt` at the site root.**

- **`llms.txt`**: yes. Cost is one small hand-maintained file; payoff is
  uncertain (no major provider confirms a crawl schedule as of 2026) but
  directionally aligned with where AI-readiness is heading, and it doubles
  as a genuinely useful curated index for a human skimming the repo too.
  Hand-maintained is fine here — the file is short and changes only when
  the docs IA changes.
- **`llms-full.txt`**: yes, but **build-generated, not hand-maintained** —
  a small Astro/Starlight integration step that concatenates every docs
  page's rendered Markdown (frontmatter title + body) into one file at
  build time. Hand-maintaining a full-content mirror would drift from the
  real docs the moment either one is edited; generating it costs nothing
  incremental once Site (2.5.0)'s Ticket 5 (Scaffold Astro+Starlight) has
  a real content collection to iterate over. This is an implementation
  note for whoever builds that ticket, not a separate decision to make
  later.

Both files live at the site root (`/llms.txt`, `/llms-full.txt`), matching
the [llms.txt convention](https://llmstxt.org) (H1 title, blockquote
summary, then H2-grouped Markdown link lists — no JSON, no custom schema).

## `llms.txt` structure (template)

```markdown
# neuron

> Give your AI coding agent a memory that's actually yours — plain
> markdown in your repo, enforced by a schema it can't write around.

neuron is a local-first memory store for AI coding agents (Claude Code,
Codex CLI, and others via MCP). Memory lives as human-readable, git-diffable
markdown in `.neuron/*.md`, validated at write time against a declared
schema, and recalled via a two-stage relevance gate (lexical filter + local
ONNX reranker) — no cloud calls, no opaque database.

## Docs

- [Getting Started](/docs/getting-started): install and first-run setup.
- [CLI Reference](/docs/cli-reference): every `neuron` subcommand and flag.
- [Configuration](/docs/configuration): `neuron.yaml` — categories,
  declared fields, pull rules.
- [Harness Adapters](/docs/harness-adapters): how Claude Code, Codex CLI,
  Copilot CLI, and Cursor integration works.
- [Wayfinder](/docs/wayfinder): planning large efforts as a tracked map.
- [Neuron vs. Alternatives](/docs/alternatives): how neuron compares to
  Mem0, Zep, Letta, and similar tools.

## How It Works

- [Hybrid Search & RRF Ranking](/docs/how-it-works-hybrid-search)
- [Write-Side Enrichment](/docs/how-it-works-write-side-enrichment)
- [Declared Field Schema](/docs/how-it-works-declared-field-schema)
- [Storage Adapters](/docs/how-it-works-storage-adapters)

## Optional

- [Architecture Decision Records](/docs/adr): the full ADR log, for anyone
  who wants the historical rationale rather than the curated summary above.
```

Notes on the template above:

- Section grouping (`Docs` / `How It Works` / `Optional`) mirrors the
  homepage/docs split already settled by Site (2.5.0)'s chartering notes
  (curated "How It Works" layer, no raw ADR dump as a *primary* doc — ADR
  log demoted to `## Optional`, which is exactly what that section is for
  per the llms.txt convention: present but lowest-priority).
  "Alternatives" page reflects Ticket 2's point 4 (Q&A/comparison content
  scoped to high-intent pages, this being one of them).
- Every slug above is provisional — a stand-in for whatever Site's Ticket 3
  actually commits. Regenerate this list against that ticket's real page
  inventory before publishing; don't ship the placeholder slugs verbatim.
- Getting Started / CLI Reference / Configuration / Harness Adapters /
  Wayfinder page names are inferred from Site (2.5.0)'s chartering notes
  ("user-facing usage: install, CLI reference, configuration, harness
  adapters, wayfinder") — Site's Ticket 3 is the actual source of truth.

## `llms-full.txt` generation (implementation note)

Concatenate every Starlight content-collection entry at build time, one
entry per doc page, in the same order as `llms.txt`'s link list:

```
# <page H1>

<page body, rendered to plain Markdown>

---
```

Wire this as a small Astro build step (an integration or a
`postbuild`/`astro:build:done` hook) reading Starlight's content collection
— not a hand-maintained file. Leave the exact hook mechanism to whoever
implements Site (2.5.0)'s Ticket 5; this ticket only fixes the *decision*
(generate, don't hand-write) and the *shape* (per-page H1 + body,
concatenated in `llms.txt` order).
