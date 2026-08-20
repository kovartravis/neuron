# Category: tickets-present

---
id: 61deb508-7ed0-4c69-a1d9-f3dfb576c268
createdAt: 2026-08-19T22:51:20.163Z
importance: 4
tags:
  - site
  - homepage
  - design
  - layout
taskId: null
kind: map
status: unclaimed
---
# Map — Homepage Desktop Layout

## Destination

The live homepage (`site/src/pages/index.astro`,
kovartravis.github.io/neuron) gains a real desktop-scale layout. Its
mobile view stays exactly as it is — already prototyped, reacted to live,
and shipped by Map — neuron.github.io Site (2.5.0)'s Ticket 4, no reason
to touch it. The desktop breakpoint reflows into a two-column structure
adapted from that same ticket's Split SaaS prototype direction, without
reintroducing a code-result card or any terminal/code chrome in the hero —
keeps the prior map's "no live demo in the hero" decision intact; only the
column-layout question is being reopened, not the content-type question.
Reached when the live desktop homepage no longer reads as a narrow
centered text column with large empty margins — verified live in a
browser at real desktop widths.

## Notes

- **Chartered 2026-08-19**, from the maintainer flagging (with a live
  screenshot) that the shipped homepage looks good on mobile but not
  desktop — its CSS caps every section at a 560-640px max-width, centered,
  with only a `@media (max-width: 640px)` mobile breakpoint and zero
  desktop-specific treatment.
- **Settled at chartering**: reopens Map — neuron.github.io Site (2.5.0)'s
  Ticket 4 (Homepage Visual & Brand Direction) specifically on the
  column-layout question, pulling structure from that ticket's
  already-prototyped-but-unshipped Split SaaS direction (light two-column
  with a code-result card, on throwaway branch
  `prototype/ticket4-homepage-variants`, commit `e8b6bbd`) — but explicitly
  does NOT reopen messaging/copy (Ticket 2) or the "no code chrome in the
  hero" decision (Ticket 4 itself, grounded in Ticket 1's survey finding
  that no competitor homepage embeds a live demo).
  See `docs/design/site/dev-tool-marketing-docs-survey.md`.
- **This map carries execution**, per the wayfinder skill's own override
  clause — matches the original homepage ticket's own precedent
  (prototype and ship in the same lineage of tickets).
- **Skills to consult**: `/prototype` for the desktop two-column
  variant(s) — the second column's actual content isn't decided at
  chartering, that's exactly this map's first ticket's question, not
  something to pre-specify here.

## Decisions so far

## Not yet specified

- **Breakpoint granularity beyond the existing mobile/desktop split** —
  whether an intermediate tablet-width range needs its own treatment, or
  a clean two-state mobile/desktop split is enough. Depends on how the
  prototype ticket's variants actually look at intermediate widths.

## Out of scope

- **Homepage copy/messaging** — Ticket 2's (Map — neuron.github.io Site
  2.5.0) settled positioning, hero copy, and pillar order stay as-is; this
  map is a layout change, not a messaging one.
- **A code-result card or any hero code/terminal chrome** — explicitly
  ruled out at this map's own chartering, even while adopting Split SaaS's
  two-column structure.
- **The mobile view** — already approved and shipped; not being redesigned
  or touched by this map.

---
id: 7aea8c90-0749-4431-85da-27ccdd2f6072
createdAt: 2026-08-19T22:51:30.014Z
importance: 4
tags:
  - site
  - homepage
  - design
  - layout
taskId: null
kind: prototype
map: 61deb508-7ed0-4c69-a1d9-f3dfb576c268
status: unclaimed
---
# 1 — Prototype the Desktop Two-Column Layout

## Question

What does the homepage's desktop breakpoint actually look like, adapted from the Split SaaS direction's two-column structure (Map — neuron.github.io Site (2.5.0)'s Ticket 4, throwaway branch `prototype/ticket4-homepage-variants`, commit `e8b6bbd`) but without its code-result card or any hero code/terminal chrome? What fills the second column — the existing pillars list moved beside the hero instead of stacked below it, a different visual element, or something else — and at what viewport width does the layout switch from Minimal Text-First's existing single-column mobile view to the new two-column desktop one?

## Context

First and only ticket on this map so far — unblocked. Use `/prototype` the same way the original Ticket 4 did: build concrete, reactable variants (via a throwaway branch or switchable static page, matching that ticket's own method) rather than describing the layout in prose. Mobile must be verified completely unaffected — screenshot or otherwise confirm the existing narrow-viewport behavior is untouched, not just visually similar. React live with the maintainer before folding a winning direction into the real `site/src/pages/index.astro`.

---
id: d37394c5-9fe0-4a3e-a105-8e31d2d7d359
createdAt: 2026-08-20T03:04:05.441Z
importance: 4
tags:
  - architecture
  - scan
  - git
  - memory
  - recall
taskId: null
kind: map
status: unclaimed
---
# Map — Cross-Referenced Recall: Scan, Git & Decisions

## Destination

A new recall capability that answers questions spanning neuron's three
separate signal sources at once — architecture scan output (per-module
blueprint cards), git history (the indexed commit log), and memory
(`decisions`/`architecture` entries) — instead of each staying its own
isolated query surface. The canonical case: "why does this module look
like this" pulls the module's current structure, the commits that shaped
it, and the decisions recorded about it, into one synthesized answer. Built
on neuron's existing hybrid-search/relevance-gated recall infrastructure —
explicitly **not** a knowledge graph, consistent with neuron's stated
architecture and the site's own positioning (the alternatives page
contrasts neuron against Zep's temporal knowledge graph and Beads's
Dolt-backed graph as things neuron deliberately doesn't do). Reached when
a real query can traverse all three sources and return a coherent,
synthesized answer — not three separate result lists a human has to
reconcile by hand.

## Notes

- **Chartered 2026-08-19**, superseding Map — Architecture Scan:
  Decision-Contradiction Detection (id `62a35315-8f42-48d9-844f-fb0376e494d0`,
  archived to `tickets-past`) — that map's destination (flag scan changes
  that contradict recorded decisions) is one concrete expression of this
  broader capability, not a separate effort. Its one ticket (validating
  the NLI polarity model on architecture-decision text) carries forward
  unchanged as this map's Ticket 2.
- **Settled at chartering, grilled live with the maintainer** across
  several rounds (the full back-and-forth — an initial proposal to remove
  architecture scanning entirely and chase broad Mem0 feature parity,
  reversed; a knowledge-graph framing floated, then walked back — is not
  repeated here; this Notes section reflects only where it landed):
  - **"Unify" means one new capability, not a shared data model or a
    positioning story.** Scan, git, and memory become joint inputs to one
    new mechanism, not three things merely described together.
  - **No knowledge graph.** Built on the existing embedder + reranker +
    cross-category hybrid search, the same infrastructure memory recall
    already uses — not a new graph storage paradigm.
  - **Real groundwork already exists, verified by reading the code**:
    architecture blueprint output is already split into an index card plus
    per-module detail cards (ticket 28, each with a stable id, queryable
    via the normal memory pipeline — see `src/scanner/ingest.ts`'s
    `moduleCardId`/`parseModuleListFromIndex`). Git commits are already
    indexed and joined into query results via a separate `git_log_index`
    table (`src/index.ts`), not a memory category — the two live in
    structurally different places today, which is exactly the seam this
    map's first ticket needs to design across.
  - **Mem0 feature-for-feature parity is explicitly unrelated** — a
    separate, broader strategic question (raised, then set aside) with no
    real overlap with this map's destination. Not tracked as fog here; a
    future chartering session on its own if it comes up again.
  - **This map carries execution**, per the wayfinder skill's own override
    clause, matching every other map chartered today.
- **Skills to consult**: `/grilling` and `/domain-modeling` for the
  cross-reference query mechanism itself (Ticket 1) — genuinely
  underspecified, expect more design/research tickets before any build
  ticket.

## Decisions so far

## Not yet specified

- **CLI/API/MCP surface** for the resulting capability (a new `neuron`
  subcommand, an extension of `neuron scan --diff`, a new MCP tool) —
  depends on Ticket 1's design.
- **Whether `git_log_index` needs to become a real memory category** (vs.
  staying its own table, cross-queried separately) to participate cleanly
  in a unified query — depends on Ticket 1's design.

## Out of scope

- **A knowledge graph / graph database** — considered and explicitly
  ruled out at this map's own chartering, even though it was floated
  mid-conversation. Reversing neuron's "not a knowledge graph" positioning
  would be its own, separately-scoped decision if ever revisited.
- **Broad Mem0 feature-for-feature parity** — raised as a possible
  direction in the same conversation that led to this map, explicitly set
  aside as unrelated. A future map of its own if pursued, not folded in
  here.

---
id: 549f9e93-5233-415f-9ecd-4728c8b90b61
createdAt: 2026-08-20T03:04:16.443Z
importance: 4
tags:
  - architecture
  - scan
  - git
  - memory
  - recall
taskId: null
kind: grilling
map: d37394c5-9fe0-4a3e-a105-8e31d2d7d359
status: unclaimed
---
# 1 — Design the Cross-Reference Query Mechanism

## Question

How does one query actually traverse architecture scan output (per-module blueprint cards, already in the `architecture` category), git history (the separate `git_log_index` table), and memory (`decisions`/`architecture` entries), and synthesize a single coherent answer instead of three separate result lists? Concretely: what does the query take as input (a module name/path? free text? both?); does synthesis mean ranking-and-concatenating the top hits from each source, or does it need real generation (an LLM combining them into prose, and if so, local model or existing enrichment infrastructure)? Does `git_log_index` need to become a real memory category to participate cleanly, or can it stay its own table and be cross-queried alongside the others?

## Context

First ticket on this map, unblocked — the foundational design question everything else depends on. Runs in parallel with Ticket 2 (NLI validation), not blocked by it: this ticket can proceed on the mechanism design regardless of what Ticket 2 finds about contradiction-detection precision specifically, though its answer should account for Ticket 2's eventual verdict on whether an explicit "contradicts" judgment is even the right synthesis primitive versus plain relevance ranking. Use `/grilling` and `/domain-modeling` — this is genuinely underspecified, not a fact to look up.

---
id: aa711ba1-ac54-48e3-aafd-6d8f46ea1d9b
createdAt: 2026-08-20T03:04:29.918Z
importance: 4
tags:
  - architecture
  - scan
  - nli
taskId: null
kind: task
map: d37394c5-9fe0-4a3e-a105-8e31d2d7d359
status: unclaimed
---
# 2 — Validate NLI Polarity Detection on Architecture-Decision Text (A/B)

## Question

Does `cross-encoder/nli-MiniLM2-L6-H768` (the model already shipped in `src/components/nliClassifier.ts` for write-time memory conflict detection) reliably separate "contradicts" from "compatible-but-related" on the kind of text this map's cross-reference capability will actually run against — `decisions`/`architecture` category entries as the premise, and a natural-language description of a scan-detected structural change (e.g. "module `scanner` now imports module `commands`") as the hypothesis? What confidence bar, if any, gives an acceptable false-accept rate for an advisory (never CI-blocking) signal?

## Context

Carried forward unchanged from the now-archived Map — Architecture Scan: Decision-Contradiction Detection (superseded, see this map's Notes). neuron-2.4.2's own Ticket 8 (archived, id `b8900ad0-0579-4263-98f5-6f8acee75025`) validated this exact model against short memory-entry pairs and found a real, measured precision ceiling: 27-40% false-accept on compatible-but-related pairs depending on threshold, an SNLI/MultiNLI training-bias artifact, not a tuning miss — which is why that gate shipped soft-flag-only, never hard-block. This ticket's job is to find out whether that same ceiling holds, is worse, or is better on this map's different kind of text. Do not assume Ticket 8's threshold transfers — measure it fresh, mirroring Ticket 8's methodology (`benchmarks/nli-polarity-ab/run-ab.ts` as the harness template, a fresh corpus of real/synthesized premise-hypothesis pairs drawn from this repo's own `decisions`/`architecture` entries and real scan-diff output).

Unblocked, runs in parallel with Ticket 1 — an empirical measurement question independent of the mechanism-design question, though Ticket 1's eventual design should account for whatever posture this ticket's verdict supports (a usable contradiction-flagging bar, or none at any threshold).
