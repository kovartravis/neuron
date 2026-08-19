# Docs information architecture

**Date:** 2026-08-18
**Ticket:** 3 — Docs Information Architecture (Map — neuron.github.io Site (2.5.0))
**Status:** resolved, feeding Ticket 8 (docs content) and Ticket 9 (CLI/config reference)

Grilled live with the maintainer. This resolves the sitemap and each page's
scope — not the content itself.

## Scope change from chartering

The map's chartering notes originally scoped docs depth as "install, CLI
reference, configuration, harness adapters, wayfinder." Wayfinder is dropped
from the public docs entirely in this resolution — it's an internal
dogfooding practice (this repo's own issue tracker), not a feature to
document for evaluators. See the map's Notes for the corrected scope.

Architecture Scan (`neuron scan`, drift detection, the blueprint pipeline) was
also considered for a How It Works page and deliberately left out — despite
being a major feature, and despite the SEO & GEO Groundwork map's keyword
research flagging "architecture linter for AI agents" as an open positioning
angle. The maintainer wants a dedicated map to deepen that feature first,
rather than documenting it at its current depth. Not a ticket on this map;
flagged as a future charter.

## Sidebar groups, in order

1. **Getting Started**
2. **Guides**
3. **How It Works**
4. **Reference**

Reference last, matching Stripe/Supabase's own reference-last nav ordering
(Ticket 1's survey) — it's a lookup destination, not a read-through.

## Full sitemap

`/docs` — dedicated landing/index page. Not just a re-list of the sidebar;
the entry point into all four sections.

### Getting Started

- `/docs/install`
- `/docs/quickstart` — `neuron init`, first `memory add`/`query`, what just
  happened

Kept separate rather than combined: install needs to be independently
linkable/citable from "what do I do next," per the SEO map's
self-contained-quotability rule.

### Guides

- `/docs/configuration` — `neuron.yaml` end-to-end in one page (storage,
  categories, declared fields, scan settings). One coherent file a user
  edits once, not fragmented sub-concepts — the field-by-field lookup lives
  separately in Reference.
- `/docs/harness-adapters` — concept overview: what an adapter is (protocol
  block, MCP config writing, hooks), links to the four below.
- `/docs/harness-claude-code`
- `/docs/harness-codex`
- `/docs/harness-copilot`
- `/docs/harness-cursor`

One page per harness rather than one page with tabs, per Ticket 1's survey
pattern 5 (one quickstart per framework beats a single tabbed quickstart).
Flat slugs, prefixed (`harness-`) rather than nested, per the SEO map's
Ticket 2 flat-URL rule.

### How It Works

Scoped to exactly the four concepts named at chartering — one page each,
independently citable:

- `/docs/hybrid-search` — hybrid search + Reciprocal Rank Fusion (RRF)
  together; RRF is the fusion mechanism inside hybrid search, not an
  independently citable concept on its own.
- `/docs/write-side-enrichment`
- `/docs/declared-field-schema`
- `/docs/storage-adapters`

Architecture Scan intentionally excluded — see "Scope change," above.

### Reference

One page per command, matching README's own public command-reference table
exactly (`README.md` "📖 Command reference" section) — excludes `neuron hook`
(internal plumbing invoked by harness configs, never typed by a user
directly) and `neuron learn` (explicitly deprecated in favor of
`memory --category learning`, per its own `--help` text).

- `/docs/cli-init`
- `/docs/cli-memory` — all subcommands (`add`/`update`/`query`/`list`/`get`/
  `delete`/`consolidate`/`prune`) as H2 sections within this one page, not
  split further. A command and its subcommands are one concept; splitting
  `memory` alone would push Reference past 20 pages for marginal citability
  gain.
- `/docs/cli-exec`
- `/docs/cli-scan`
- `/docs/cli-sync`
- `/docs/cli-status`
- `/docs/cli-ui`
- `/docs/cli-mcp`
- `/docs/cli-feedback`
- `/docs/config-reference` — full `neuron.yaml` field-by-field lookup,
  distinct from the narrative `/docs/configuration` guide above.

Slugs prefixed `cli-`/`config-reference` rather than bare command names
(`/docs/init` would read ambiguously against the Getting Started concept of
the same name) — same disambiguation pattern as the `harness-` prefix.

**Total: 23 pages** (1 landing + 2 Getting Started + 6 Guides + 4 How It
Works + 10 Reference).

## Feeds forward

- **Ticket 8 (docs content)**: this sitemap is the page list to write against
  — Getting Started, Guides, How It Works.
- **Ticket 9 (CLI & Config Reference)**: the 10 Reference pages above, with
  `cli-memory`'s per-subcommand H2 structure specified.
- **Future map (flagged, not chartered here)**: deepening Architecture Scan
  as a product feature, which would eventually add a How It Works page once
  that map lands.
