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
status: resolved
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

**Reached 2026-08-20.** Ticket 1's winning direction (Pillars Beside Hero,
960px breakpoint) is folded into the real `site/src/pages/index.astro`.

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

- Ticket 1 (id `7aea8c90-0749-4431-85da-27ccdd2f6072`) — Prototype the Desktop Two-Column Layout — three variants prototyped (throwaway branch `prototype/homepage-desktop-layout`, commit `a286f48`); maintainer picked **Pillars Beside Hero**: hero becomes a two-column grid at 960px, existing pillars move into a bordered card panel beside it, no new visual element and no code/terminal chrome. Folded into the real `site/src/pages/index.astro`; mobile verified byte-identical below 960px by normalized CSS diff.

## Not yet specified

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
status: resolved
---
# 1 — Prototype the Desktop Two-Column Layout

## Question

What does the homepage's desktop breakpoint actually look like, adapted from the Split SaaS direction's two-column structure (Map — neuron.github.io Site (2.5.0)'s Ticket 4, throwaway branch `prototype/ticket4-homepage-variants`, commit `e8b6bbd`) but without its code-result card or any hero code/terminal chrome? What fills the second column — the existing pillars list moved beside the hero instead of stacked below it, a different visual element, or something else — and at what viewport width does the layout switch from Minimal Text-First's existing single-column mobile view to the new two-column desktop one?

## Context

First and only ticket on this map so far — unblocked. Use `/prototype` the same way the original Ticket 4 did: build concrete, reactable variants (via a throwaway branch or switchable static page, matching that ticket's own method) rather than describing the layout in prose. Mobile must be verified completely unaffected — screenshot or otherwise confirm the existing narrow-viewport behavior is untouched, not just visually similar. React live with the maintainer before folding a winning direction into the real `site/src/pages/index.astro`.

## Answer

Built three structurally different desktop (≥960px) treatments as a throwaway static Astro page (`prototype-homepage-desktop-layout.astro`, real shipped copy, switchable via `?variant=A|B|C`, matching Ticket 4's own method) and reacted live with the maintainer:

- **A — Pillars Beside Hero**: hero becomes a two-column grid (1.15fr/1fr); the existing pillars list moves into a bordered, shadowed card panel to the hero's right, replacing the code-result card the original Split SaaS direction used. **Winner.**
- **B — Persistent Sidebar**: pillars become a sticky left sidebar running the whole page (hero/aside/prose), not just the hero row.
- **C — Hero Callout + Horizontal Pillars Row**: hero's second column gets a pull-quote callout (reusing existing sub-copy verbatim) instead of the pillars, which drop to a horizontal 3-up row below the hero.

**Verdict**: Variant A. The existing pillars list fills the second column — moved beside the hero, not a new visual element — and the switch happens at **960px** (the 641–959px "tablet" range stays identical to the existing mobile/single-column look, matching production's current lack of any tablet-specific treatment). Verified structurally, not just visually, that mobile is untouched: a normalized diff of the CSS below 960px against the pre-change file was byte-identical except for prototype-only switcher plumbing.

Folded directly into `site/src/pages/index.astro`: wrapped the hero and pillars in a new `.hero-wrap` container (no other markup changed) and added one `@media (min-width: 960px)` block implementing Variant A's grid + panel styling — fully additive, no existing declaration touched (confirmed via `git diff`). `astro build` succeeds; dev server confirmed the real page renders the two-column desktop layout with real content.

Losing variants (B, C) and the full three-way comparison harness are captured on throwaway branch `prototype/homepage-desktop-layout` (commit `a286f48`) as the primary source, not left in main.

**Resolves this map's Destination** — no other tickets remain on this map, and the "Not yet specified" breakpoint-granularity question is now answered (960px, two-state split, no separate tablet treatment).

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

- Ticket 3 (id `afbf870e-8546-4fdd-8f21-4cbd89e9f9c7`) — Validate File-Behavior Capture: Generative vs. Retrieval vs. Deeper-Deterministic (A/B) — deeper deterministic call-graph/control-flow extraction beat both retrieval (this repo's own decisions/architecture/learning store) and generative (Qwen1.5-0.5B-Chat) on all summary stats; generative won 0/10 files, extending the model's prior six-for-six A/B loss streak to a 7th task. Feeds Ticket 1's mechanism design and reopens paused Ticket 2 once built.

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

## Design input from Ticket 3's resolution (deepen the scan deterministically)

Ticket 3 validated that per-file behavioral facts should come from deterministic AST extraction (call-graph + control-flow), not a generative model call — that's now settled, not open. Candidate next layers to fold into this ticket's mechanism design, roughly cheapest-first:

- **Cross-file dependency graph** — `src/scanner/analyzer.ts` already computes a `dependencyGraph` (file-to-file import edges) that is never read by `diff.ts` or the architecture card today (confirmed dead code during Ticket 2's investigation). Wiring this up is the cheapest lever and is the actual missing piece behind an "module X imports module Y" style fact — Ticket 2's own corpus had to fall back to scan --diff's real (much thinner) vocabulary specifically because this doesn't exist yet.
- **Git-history join per file/module** — `git_log_index` already exists as its own table; joining "which commits touched this file, with what subjects" into scan/query output serves this map's Destination directly (scan + git + decisions, unified), not just a nicer per-file summary. Bears directly on this ticket's own open question about whether `git_log_index` needs to become a real memory category.
- **Decision/ADR backlinks** — surface which `decisions`/`architecture` entries already mention a given file or symbol, so a query can point at *why* something looks the way it does, not just *what* it looks like now. This is close to the map's own canonical case ("why does this module look like this").
- **Type/error/side-effect signals** — same deterministic AST-extraction pattern Ticket 3 validated (calls, control-flow), extended to what a function throws or whether it performs I/O — a further layer of per-file fact richness, lower priority than the three above since it deepens a single file rather than connecting sources.

Raised live by the maintainer after Ticket 3 landed; not yet a decision of this ticket's own — folded in as input for whoever grills this ticket, not pre-resolved.

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

## Paused (unresolved)

Claimed and partially worked this session, then paused by live maintainer redirect before resolution: a fresh corpus (`benchmarks/nli-polarity-ab/corpus-arch-diff.ts`, 45 pairs) and harness (`run-ab-arch-diff.ts`) were built and run. Headline result before pausing: contradiction separates cleanly from compatible-paraphrase (min P 0.85 vs max P 0.74), but overlaps badly with compatible-related (max P 0.99) — and critically, of the 5/15 compatible-related pairs that would even clear this repo's own 0.70 relatedness pre-filter, 3 are still false-accepted by NLI at every threshold up to 0.99. Root cause traced to `scan --diff`'s own hypothesis vocabulary (`src/scanner/diff.ts`) being too information-poor — bare symbol/module/package names with no behavioral content — which starves both the relatedness gate and NLI of anything but weak lexical cues. That finding directly prompted the maintainer to ask whether deepening the architecture scan itself (capturing file *behavior*, not just import/export symbol lists) should happen first, since it would change what hypothesis text NLI is even asked to judge, or whether NLI is the right mechanism at all. Superseded for now by a new ticket testing three ways to capture "what a file does" with only local models; this ticket's own bar-setting question resumes after that lands. Left `unclaimed` rather than resolved — no answer recorded, do not treat as decided.

---
id: afbf870e-8546-4fdd-8f21-4cbd89e9f9c7
createdAt: 2026-08-20T03:25:19.236Z
importance: 4
tags:
  - architecture
  - scan
  - adr
taskId: null
kind: task
map: d37394c5-9fe0-4a3e-a105-8e31d2d7d359
status: resolved
---
# 3 — Validate File-Behavior Capture: Generative vs. Retrieval vs. Deeper-Deterministic (A/B)

## Question

`src/scanner/summarizer.ts`'s current per-file purpose text is 100% deterministic (JSDoc header-comment extraction, falling back to an AST-signature listing like "Methods: X, Y, Z") — despite the `SmolLM2Summarizer` class name, it makes zero model calls. `scan --diff`'s hypothesis vocabulary is even thinner (bare module/export/dependency existence). Ticket 2's own investigation found this starves both a relatedness gate and NLI polarity detection of real signal. Before deciding how (or whether) to deepen the scan, or whether NLI is even the right synthesis primitive downstream of it: which of three ways to capture 'what a file actually does', using only local models already in this repo's stack (no cloud calls), actually produces a good description?

1. **Generative** — `Xenova/Qwen1.5-0.5B-Chat` (the one model this repo already ships), few-shot prompted with extracted AST facts, producing one generated sentence.
2. **Retrieval** — embed the file's extracted signature via the existing bge-small-en-v1.5 embedder, retrieve the nearest human-authored prose already in this repo's own `decisions`/`architecture`/`learning` entries, reuse it as the description.
3. **Deeper deterministic** — extend the current AST-signature extraction with real call-graph/control-flow facts (what calls what, error-handling, branching), templated into a sentence — no model call, just richer static analysis.

## Context

Directly prompted by a live maintainer redirect during Ticket 2's session: 'this will change how the NLI works or whether we want it at all.' Blocks Ticket 2 (NLI polarity bar-setting resumes once hypothesis text is settled) and bears on Ticket 1 (mechanism design). Also directly relevant: [[qwen-05b-loses-every-ab]] — the shipped 0.5B model has lost every one of six prior A/Bs on classification/judgment tasks (tagging, category, importance, pruning, dedupe, salvage-expansion); none of those six was open-ended generation, so that record is a strong prior against option 1, not proof it fails here too. Evaluate against a small hand-assembled gold set (real files' existing JSDoc where present, agent-authored reference descriptions where absent, same disclosed-synthesis discipline as Ticket 8's corpus), scored by embedding-cosine against gold — no LLM-judge, consistent with this repo's local-only tooling.

## Answer

Ran a 3-way A/B (`benchmarks/file-behavior-ab/`) across 10 real files in this repo, each with a genuine human-authored purpose header withheld as gold and never shown to any mode. All three modes received the identical extracted-facts input (exported symbols, per-symbol doc comments already in the file, a lightweight call-graph, and control-flow counts) built from the file with its header stripped out first, so no mode could win by trivially echoing the withheld answer.

**Verdict: deeper deterministic extraction wins clearly.** Scored by cosine similarity (bge-small-en-v1.5) between each mode's output and the withheld human header:

| mode | mean | median | per-file wins |
|---|---|---|---|
| deterministic | 0.6925 | 0.6935 | 7/10 |
| retrieval | 0.6670 | 0.6564 | 3/10 |
| generative (Qwen1.5-0.5B-Chat) | 0.6377 | 0.6447 | 0/10 |

Generative never won a single file, and its outputs show real quality problems beyond just lower cosine — inverted claims (modelCacheLock.ts: 'Causes an exception when the cache object is locked' for what is actually a lock-*acquisition* helper), fabricated details absent from the facts (reranker.ts: 'may trigger various exceptions if not available or untrusted' — nothing in the facts mentions trust), and outright wrong domain (nliClassifier.ts: 'Resizes the input model class for compatibility across different browsers' — this file has nothing to do with browsers). This extends [[qwen-05b-loses-every-ab]] to a 7th task: the shipped 0.5B model has now also lost on open-ended generation, not just the six classification/judgement tasks it lost before — closing the one real gap in that prior evidence (none of the six was pure generation).

Retrieval's three wins concentrate where this repo's own decisions/learning store already holds a fix entry describing that exact file (e.g. nliClassifier.ts's win at sim=0.78 almost certainly retrieved Ticket 9's own 'second model loader' fix entry). Real strength for files with prior-art coverage, but not a general mechanism — a genuinely new file with no matching history gets nothing useful back.

**Recommendation**: deepen the architecture scan deterministically — real call-graph and control-flow extraction, as prototyped here — rather than adding a generative-model job. No model call needed, and it directly addresses the root cause Ticket 2's paused investigation traced: today's bare symbol/module-existence facts starve both a relatedness gate and NLI polarity detection of real signal. This should feed Ticket 1's mechanism design (what a per-file description contains) and reopen Ticket 2 with richer hypothesis text once built — not spinning up a separate ticket, since Ticket 1's own question already covers what synthesis looks like.

**Caveats**: n=10, hand-picked for having genuine header comments already (selection bias toward well-documented files — unclear how the deterministic template performs on sparse files with no existing per-symbol docs to lean on, since 7 of its wins draw on that legitimate but not-universal signal). Retrieval corpus was ~60 real entries with leave-one-out exclusion by filename, not exhaustive. Generative used only 2 few-shot examples with no prompt-tuning pass — but given the model's now 7-for-7 record against cheaper methods, further prompt investment doesn't look promising without a materially different/larger model. Scored by embedding cosine against a human reference, not a human judge directly — a proxy, not a guarantee of holistic quality.

Assets: `benchmarks/file-behavior-ab/corpus.ts` (10 cases, gold + strip ranges), `run-ab.ts` (extraction + 3 modes + scoring), `raw-scores.json` (full per-file output and scores) — uncommitted in the working tree as of this ticket's resolution.

---
id: 534a80b3-9bc0-4b79-887d-133eb7316d0f
createdAt: 2026-08-20T11:52:45.863Z
importance: 4
tags:
  - git
  - recall
  - release
taskId: null
blockedBy: 549f9e93-5233-415f-9ecd-4728c8b90b61
kind: grilling
map: d37394c5-9fe0-4a3e-a105-8e31d2d7d359
status: unclaimed
---
# 4 — Join Git History into Per-File/Module Query Output

## Question

`git_log_index` (`src/index.ts`) already indexes commit history and is already joined into general query results as a separate source — but not scoped to a specific file or module the way a cross-reference query would need. What does 'which commits touched this file/module, with what subjects' look like once folded into this map's unified query: raw commit list, ranked/filtered by relevance to the query, or summarized? Does `git_log_index` need to become a real memory category to participate cleanly in the same ranking/synthesis pipeline as scan and decisions output, or can it stay its own table and be cross-queried alongside the others — this is literally one of Ticket 1's own open questions, so this ticket is the concrete follow-on once that general shape is settled, applied specifically to the git-history source.

## Context

Raised during Ticket 3's design-input session (folded into Ticket 1) as one of the cheap, already-available levers toward this map's Destination (scan + git + decisions, unified) — the canonical case ('why does this module look like this') explicitly needs 'the commits that shaped it.' Blocked by Ticket 1 since the general cross-source query mechanism has to be settled before this source's own integration shape can be decided.

---
id: e2a9c001-b476-48bc-a647-40b61a2e865d
createdAt: 2026-08-20T11:52:46.476Z
importance: 4
tags:
  - adr
  - rc2
  - 2.2.0
taskId: null
blockedBy: 549f9e93-5233-415f-9ecd-4728c8b90b61
kind: grilling
map: d37394c5-9fe0-4a3e-a105-8e31d2d7d359
status: unclaimed
---
# 5 — Decision/ADR Backlinks from Scanned Files and Symbols

## Question

Which `decisions`/`architecture` entries already mention a given file, module, or exported symbol, and how should that be surfaced — a live query-time lookup (embedding/text match against the file's name and extracted facts), or a link recorded at write time (when a decision entry is created, detecting which files/symbols it discusses and recording the backlink then)? How specific does the match need to be (file path, module name, exported symbol name) before a 'mentions' relationship is trustworthy enough to surface, and what happens when a decision mentions a file that has since moved or been deleted?

## Context

Raised during Ticket 3's design-input session (folded into Ticket 1) — this is close to the map's own canonical case ('why does this module look like this' needs 'the decisions recorded about it'), so it's a direct, near-literal expression of the map's Destination rather than a tangential feature. Blocked by Ticket 1 since whether this is a live query-time join or a write-time-recorded relationship depends on the general synthesis mechanism Ticket 1 settles.

---
id: 2fbd38c6-a911-4a48-ad27-b17cc8381e48
createdAt: 2026-08-20T11:52:47.094Z
importance: 3
tags:
  - longmemeval
  - benchmark
  - adr
taskId: null
blockedBy: 549f9e93-5233-415f-9ecd-4728c8b90b61
kind: task
map: d37394c5-9fe0-4a3e-a105-8e31d2d7d359
status: unclaimed
---
# 6 — Extend Deterministic Extraction with Type/Error/Side-Effect Signals

## Question

Ticket 3 validated deterministic call-graph and control-flow extraction (what calls what, try/catch/loop/branch counts) as the winning way to describe a file's behavior, beating both retrieval and the shipped generative model on every summary stat. Does extending that same AST-extraction approach with further fact types — what a function throws, what parameter/return types it declares, whether it performs I/O (fs/network/db calls) — meaningfully improve description quality further, or does call-graph/control-flow already capture most of the signal (diminishing returns)? Worth a lightweight follow-up measurement against Ticket 3's own held-out gold set and harness (`benchmarks/file-behavior-ab/`) rather than assuming either way, mirroring Ticket 3's own discipline.

## Context

Raised during Ticket 3's design-input session (folded into Ticket 1) as the lowest-priority of the four candidates — it deepens a single file's description rather than connecting scan/git/decisions sources the way Tickets 4 and 5 do, so it's less central to this map's actual Destination. Blocked by Ticket 1 pending the general mechanism shape, though this one could plausibly be unblocked early if Ticket 1's answer doesn't touch per-file fact extraction directly — worth revisiting blocking once Ticket 1 resolves.
