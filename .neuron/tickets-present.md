# Category: tickets-present

---
id: 943650ce-f12c-47f6-9c61-63f79305d055
createdAt: 2026-08-16T18:57:38.551Z
importance: 4
tags:
  - planning
  - setup
  - publish
taskId: null
kind: map
status: unclaimed
---
# Map — neuron.github.io Site (2.5.0)

## Destination

A live, published dev-tool site at `kovartravis.github.io/neuron` — Astro +
Starlight, in this repo — with a SaaS-quality homepage that sells neuron to
developers evaluating it for their own agentic coding setups, and dev docs
(usage + a curated architecture overview, not raw ADR dumps) accurate to the
current release. Reached when the site is live at that URL *and* a
docs-review step exists in the release process, so the docs don't start
rotting the moment 2.5.0 ships.

## Notes

- **Prepared 2026-08-15**, chartered at the maintainer's direct request to
  give neuron a public face ahead of 2.5.0.
- **Settled during chartering** (pre-ticket scoping calls, not tickets):
  - **Site location**: `kovartravis.github.io/neuron`, a GitHub Pages
    *project* page served from this repo. No org named `neuron` exists
    (repo is `kovartravis/neuron`), so a literal org-level page isn't
    available; a custom domain was considered and declined. Repo is already
    public, MIT-licensed (confirmed via `gh repo view`).
  - **Stack**: Astro + Starlight — plain Astro pages for a fully custom
    homepage, Starlight for docs nav/search/structure.
  - **Audience**: developers evaluating neuron for adoption, not a
    portfolio piece — the homepage needs a real value prop and a working
    quickstart, not just a showcase.
  - **Docs depth**: user-facing usage (install, CLI reference,
    configuration, harness adapters, wayfinder) plus a curated "How It
    Works" layer (hybrid search/RRF, write-side enrichment, declared field
    schema, storage adapters). No raw ADR link-dump — `CONTEXT.md`'s
    glossary is the primary source, not `docs/adr/` directly.
  - **Versioning**: docs track latest only. No versioned doc snapshots.
  - **Reference pages**: CLI/config reference is hand-written and reviewed
    per release, not generated from source — a generated approach would
    better guarantee sync but was explicitly declined in favor of manual
    review.
  - **Sync enforcement**: a manual checklist item in the existing release
    process (mirrors the CHANGELOG/version-bump discipline already there),
    not a CI gate. See ticket 10.
- **Skills to consult**: `/prototype` for the homepage's visual direction
  (ticket 4); `/grilling` and `/domain-modeling` for messaging (ticket 2)
  and docs IA (ticket 3) — pull vocabulary from `CONTEXT.md` rather than
  inventing marketing language that drifts from what the tool does.
- **This map carries execution**, per the wayfinder skill's own override
  clause — the destination is a live site, not a spec, so build/deploy
  tickets (5-9) are in scope alongside the decision tickets.
- **Cross-map dependency, added 2026-08-15**: Ticket 2 (Homepage Messaging
  & Positioning) is now blocked on Map — MCP Server & Setup/Onboarding
  Skill Split's Tickets 4 and 6. A maintainer-submitted positioning-
  strategy review (competitive landscape, developer pain points, a
  candidate positioning statement) arrived as input to this map's Ticket 2
  — but two of its "actionable ideas" (an MCP server, an onboarding-
  migration flow) turned out to be real product engineering rather than
  site content, and graduated into that standalone map instead. Ticket 2
  waits so messaging doesn't promise either feature before it ships. Full
  analysis linked from Ticket 2's own content:
  `docs/design/site/competitive-landscape-and-positioning.md`.


- **Map — SEO & GEO Groundwork chartered 2026-08-16** (id `64cc32f8-4b9b-48dd-b18c-ca0788b96cba`),
  sequenced by the maintainer to run before this map's homepage-build work.
  Real cross-map wiring: its Ticket 2 blocks this map's Ticket 3 (Docs IA);
  its Ticket 3 blocks this map's Ticket 7 (Build the Homepage); its Ticket 6
  blocks this map's Ticket 2 (Homepage Messaging), alongside the existing
  MCP-server blockers. This map's own Ticket 5 (Scaffold Astro+Starlight)
  in turn unblocks that map's Ticket 4 (Sitemap/Robots.txt setup).

## Decisions so far

## Not yet specified

- **Whether the homepage needs a live/interactive demo** (e.g. an
  asciinema-style terminal recording) — likely surfaces once ticket 4's
  prototype session has something concrete to react to; not sharp enough
  to ticket yet.
- **Analytics/telemetry for the live site** — low priority, not worth
  pinning down before the site exists to put it on.
- **Distribution channels** (README badge linking to the site, any tool
  directory submissions) — deliberately out of scope for Map — SEO & GEO
  Groundwork (id `64cc32f8-4b9b-48dd-b18c-ca0788b96cba`), which owns the technical/on-site half of
  this fog item instead. Still fog here until that map's foundation ships
  and there's a site worth badging/submitting.

## Out of scope

- **Custom domain** — `kovartravis.github.io/neuron` chosen instead;
  revisiting this would be a fresh scoping decision, not a resumption of
  this map.
- **A new GitHub org named `neuron`** — same reasoning; the project-page
  URL was chosen over standing up new org infrastructure.
- **Versioned docs per release** — latest-only chosen; if release cadence
  later demands version-pinned docs, that's a new effort.
- **Generating reference docs from source** — considered, declined in
  favor of hand-written pages reviewed per release.

---
id: f075521d-16fc-4873-a27c-0e96eb73727e
createdAt: 2026-08-16T18:57:42.710Z
importance: 4
tags:
  - release
  - git
  - failure-fix
taskId: null
kind: task
map: 943650ce-f12c-47f6-9c61-63f79305d055
status: unclaimed
---
# 10 — Add a Docs-Review Step to the Release Checklist

## Question

Add a "docs reviewed against this release's CLI/config surface" checklist item to wherever this repo's release process is already documented (mirrors the discipline already given to CHANGELOG/version-bump steps), so the manual sync the maintainer chose (over a CI gate) has a real home instead of living only in this map's Notes.

## Context

Independent of every other ticket — editing process documentation, not building anything. First needs to locate where the release checklist actually lives in this repo.

---
id: 61c267a2-de42-4fae-a581-7435c0f4e9f7
createdAt: 2026-08-16T18:57:42.771Z
importance: 4
tags:
  - config
  - memory
  - setup
taskId: null
blockedBy: ee1b0d6f-783a-4dc5-95f9-dc39d6828910,2cfb58c4-305e-414f-b40d-f2d4e46ad016
kind: task
map: 943650ce-f12c-47f6-9c61-63f79305d055
status: unclaimed
---
# 9 — Write CLI & Config Reference Pages

## Question

Write hand-authored reference pages for every CLI command and every neuron.yaml declared field/config option, accurate to the current (2.4.x) surface.

## Context

Kept separate from ticket 8 because reference pages need exhaustive accuracy against the actual CLI surface (neuron <cmd> --help, neuronYaml.ts), not prose — a different kind of writing task.

---
id: ab00735c-765e-4575-aa0d-4bacaaa0cd1c
createdAt: 2026-08-16T18:57:42.829Z
importance: 4
tags:
  - adr
  - md-storage
  - enrichment
taskId: null
blockedBy: ee1b0d6f-783a-4dc5-95f9-dc39d6828910,2cfb58c4-305e-414f-b40d-f2d4e46ad016
kind: task
map: 943650ce-f12c-47f6-9c61-63f79305d055
status: unclaimed
---
# 8 — Write Docs Content Pages

## Question

Write the docs content (Starlight markdown pages) for every section ticket 3's IA settles, sourced primarily from CONTEXT.md's glossary and the relevant ADRs for the "How It Works" layer.

## Context

May need to graduate into further per-section tickets once ticket 3 resolves and the real page count is known — expected, not a planning failure.

---
id: 531c631b-cf9b-4a6b-be27-b3fa5529a202
createdAt: 2026-08-16T18:57:42.911Z
importance: 4
tags:
  - planning
  - release
  - wayfinder
taskId: null
blockedBy: 96a9be90-1b56-4a78-9162-e9584f706877,19f204e7-ed0c-4883-8a86-9416bb257c02,2cfb58c4-305e-414f-b40d-f2d4e46ad016,3e0edd28-4651-4fc8-897f-5f44dad8b294
kind: task
map: 943650ce-f12c-47f6-9c61-63f79305d055
status: unclaimed
---
# 7 — Build the Homepage

## Question

Implement the homepage in Astro against ticket 2's settled messaging and ticket 4's resolved visual direction.

## Context

Blocked on both decision tickets plus the scaffold (ticket 5) existing to build into.

---
id: b7e4dab5-5b0f-44e9-bcb8-0c8475ed785c
createdAt: 2026-08-16T18:57:42.968Z
importance: 4
tags:
  - git
  - release
  - publish
taskId: null
blockedBy: 2cfb58c4-305e-414f-b40d-f2d4e46ad016
kind: task
map: 943650ce-f12c-47f6-9c61-63f79305d055
status: unclaimed
---
# 6 — GitHub Pages Deploy Pipeline

## Question

Wire a GitHub Actions workflow that builds the Astro site and deploys it to GitHub Pages on merge to main (or on release), and enable Pages in the repo settings pointed at that deployment. Confirm the live URL actually resolves to kovartravis.github.io/neuron.

## Context

Needs a real build to deploy against, hence blocked on ticket 5's scaffold. Try gh api / gh CLI for the Pages settings step before assuming it needs manual GitHub UI action.

---
id: 2cfb58c4-305e-414f-b40d-f2d4e46ad016
createdAt: 2026-08-16T18:57:43.029Z
importance: 4
tags:
  - publish
  - setup
  - release
taskId: null
kind: task
map: 943650ce-f12c-47f6-9c61-63f79305d055
status: unclaimed
---
# 5 — Scaffold Astro + Starlight in This Repo

## Question

Stand up a working Astro + Starlight site (placeholder content) inside this repo, configured for the kovartravis.github.io/neuron project-page base path, with local dev (astro dev) running clean and not colliding with the existing TypeScript/npm build or test pipeline. Decide and document where the site source lives (e.g. /site).

## Context

Purely mechanical — no design or content decision blocks this from starting immediately. AFK-drivable.

---
id: 19f204e7-ed0c-4883-8a86-9416bb257c02
createdAt: 2026-08-16T18:57:43.089Z
importance: 4
tags:
  - planning
  - ui
  - release
taskId: null
blockedBy: ab6103ac-1b08-4ea6-aadd-816a8d5d4e46,96a9be90-1b56-4a78-9162-e9584f706877
kind: prototype
map: 943650ce-f12c-47f6-9c61-63f79305d055
status: unclaimed
---
# 4 — Homepage Visual & Brand Direction

## Question

What should the homepage actually look and feel like — layout, color, typography, hero treatment, whether it needs a live/interactive demo? Use /prototype to produce a rough, concrete homepage draft to react to, informed by ticket 1's survey and ticket 2's settled messaging.

## Context

This is where "does the homepage need a live terminal demo" (currently fog on the map's Not yet specified) gets resolved — don't pre-decide it here, let the prototype session surface it.

---
id: ee1b0d6f-783a-4dc5-95f9-dc39d6828910
createdAt: 2026-08-16T18:57:43.151Z
importance: 4
tags:
  - adr
  - 2.2.0
  - rc2
taskId: null
blockedBy: 4b5c1114-812d-4533-a992-7bebb4ca3ec1
kind: grilling
map: 943650ce-f12c-47f6-9c61-63f79305d055
status: unclaimed
---
# 3 — Docs Information Architecture

## Question

What pages/sections does the docs half of the site actually have, in what order, under what nav structure — within the "user-facing + architecture overview" depth already scoped on the map (Getting Started, CLI Reference, Configuration, Harness Adapters, Wayfinder, How It Works, anything else)? Resolve the sitemap and each page's scope, not the content itself.

## Context

Feeds ticket 8 (docs content) and ticket 9 (CLI/config reference) — both need a settled structure before writing lands anywhere durable. Can run in parallel with tickets 1/2 — it doesn't depend on messaging or the competitive survey.

---
id: 96a9be90-1b56-4a78-9162-e9584f706877
createdAt: 2026-08-16T18:57:43.213Z
importance: 4
tags:
  - benchmark
  - planning
  - setup
taskId: null
blockedBy: ab6103ac-1b08-4ea6-aadd-816a8d5d4e46,fada539c-31ee-4a3a-9f4a-2b3fe86165b4,0c51a772-ff20-4d78-89dd-49a018b01b55,a3cc1972-e455-4c61-9ec4-bcc873c6353d
kind: grilling
map: 943650ce-f12c-47f6-9c61-63f79305d055
status: unclaimed
---
# 2 — Homepage Messaging & Positioning

## Question

What's neuron's actual value prop and headline message for a developer landing on the homepage cold — what does it do, why does it matter over the status quo (plain CLAUDE.md/AGENTS.md prose memory), and what's the call to action? Resolve the headline, the supporting sections' framing, and how (if at all) neuron is positioned against alternatives.

## Context

Feeds ticket 4 (homepage visual prototype) and ticket 7 (homepage build) — a design pass without settled words to design around isn't useful. Use CONTEXT.md's glossary for accurate terminology (hybrid search, harness adapter, wayfinder, etc.) rather than inventing marketing language that drifts from what the tool actually does. Informed by ticket 1's survey.

**Blocked (added 2026-08-15) on Map — MCP Server & Setup/Onboarding Skill
Split's Ticket 4 (MCP server shipped) and Ticket 6 (setup/maintenance
skill split complete).** A maintainer-submitted positioning-strategy
review leans on MCP/cross-editor support as a differentiator — this
ticket shouldn't lock in messaging that promises either before they
actually ship. Full competitive-landscape and positioning analysis from
that review (candidate positioning statement, three-pillar framing,
developer pain points, competitive matrix — none of it independently
verified yet, all of it raw input for this ticket's own grilling session):
`docs/design/site/competitive-landscape-and-positioning.md`.

---
id: ab6103ac-1b08-4ea6-aadd-816a8d5d4e46
createdAt: 2026-08-16T18:57:43.289Z
importance: 4
tags:
  - planning
  - benchmark
  - setup
taskId: null
kind: research
map: 943650ce-f12c-47f6-9c61-63f79305d055
status: unclaimed
---
# 1 — Survey Dev-Tool Marketing + Docs Sites for Patterns

## Question

What do best-in-class developer-tool sites (marketing homepage + docs) actually do well that neuron's site should borrow or deliberately avoid — hero-section structure, how they explain a technical value prop, docs IA, code-sample presentation, whether/how they use a live demo? Survey 4-6 real sites (e.g. Stripe, Linear, Vercel, Resend, Supabase, or closer analogues among local-first/dev-tool CLI products) and produce a markdown summary of concrete, reusable patterns — not just impressions — as a linked asset.

## Context

Chartered directly from the "something like a SaaS would have" framing in the original request. Collected once here so ticket 2 (messaging) and ticket 4 (homepage prototype) don't each re-derive inspiration from scratch.

---
id: 64cc32f8-4b9b-48dd-b18c-ca0788b96cba
createdAt: 2026-08-17T01:00:19.690Z
importance: 4
tags:
  - planning
  - seo
  - geo
taskId: null
kind: map
status: unclaimed
---
# Map — SEO & GEO Groundwork

## Destination

The technical foundation and on-site content conventions that let
`kovartravis.github.io/neuron` (Map — neuron.github.io Site (2.5.0)) get
found by traditional search *and* cited inside AI answer engines (ChatGPT,
Claude, Perplexity, Google AI Overviews) once it ships — structured data,
crawlability, IA/URL conventions, and a content house-style, decided once so
Site (2.5.0) builds against them instead of re-deriving them mid-build.
Reached when every ticket below is resolved and Site (2.5.0)'s IA, homepage,
and content tickets have what they need from this map to proceed.

## Notes

- **Chartered 2026-08-16**, at the maintainer's explicit request, sequenced
  to run **before** both Map — MCP Server & Setup/Onboarding Skill Split and
  Map — neuron.github.io Site (2.5.0)'s homepage-build work. No prior
  SEO/GEO experience on the maintainer's side, so this map exists to lay the
  domain out breadth-first, not just execute an already-known plan.
- **Scope, settled at chartering**: technical + on-site content foundations
  only. Active distribution/outreach (HN/Reddit launch posts, awesome-list
  PRs, directory submissions, backlink campaigns) is explicitly **out of
  scope** — keeps this map finishable instead of an open-ended marketing
  backlog. See Out of scope, below.
- **Crawler policy, settled at chartering (not a ticket)**: allow every
  crawler — AI training crawlers (GPTBot, anthropic-ai, CCBot, etc.) and
  real-time retrieval/search crawlers (OAI-SearchBot, ChatGPT-User,
  ClaudeBot, Claude-SearchBot, PerplexityBot) alike. Maximize AI visibility
  over guarding against training use. Ticket 4 implements this call; it
  isn't this map's own decision to re-litigate.
- Research grounding this map's chartering (2026 general web search, not
  primary-source-verified — re-check before relying on specifics): GEO
  ("Generative Engine Optimization") targets being *quoted inside* an AI
  answer, distinct from classic SEO's rank-and-click; `llms.txt` is real
  but unofficial, cheap to add, uncertain payoff; content with explicit
  limitations/attribution sections is reported to get cited more; "entity
  authority" (third-party mentions, directory listings) is displacing
  backlinks as the trust signal AI engines lean on.
- **This map carries execution**, per the wayfinder skill's own override
  clause, matching Site (2.5.0) and MCP Server's own posture — several
  tickets here (sitemap/robots.txt, llms.txt) are direct implementation,
  not just decisions.
- **Cross-map wiring, added at chartering**: Ticket 2 (IA & Citability
  Conventions) blocks Site (2.5.0)'s Ticket 3 (Docs IA); Ticket 3
  (Structured Data Strategy) blocks Site's Ticket 7 (Build the Homepage);
  Ticket 6 (Content-Authoring Guidelines) blocks Site's Ticket 2 (Homepage
  Messaging), alongside its existing MCP-server blockers. In the other
  direction, this map's own Ticket 4 (Sitemap/Robots.txt/Canonical Setup)
  is blocked by Site's Ticket 5 (Scaffold Astro+Starlight), since it needs
  a real site to generate a sitemap against.

## Decisions so far

- [1 — Keyword & Search-Intent Research](docs/design/seo/keyword-search-intent-research.md) —
  bare category phrases ("claude code memory," "AI agent long-term memory")
  are saturated (Mem0, SEO-farmed roundups); long-tail/comparison/
  alternatives phrasing and CLAUDE.md-pain-point vocabulary (amnesia,
  goldfish, context rot, drift) are open. Closest direct competitor found:
  `gastownhall/beads` (issue tracker + agent memory, graph/Dolt-backed).
  No competitor combines markdown-as-source-of-truth + schema enforcement +
  issue tracker + architecture blueprint — that combination, and
  "architecture linter for AI agents," are open. Feeds Ticket 2 and
  Ticket 6.
- [2 — Information Architecture & URL/Citability Conventions](4b5c1114-812d-4533-a992-7bebb4ca3ec1) — flat
  single-segment `/docs/` slugs, one concept per page, strict H1-title/
  H2-only headings (docs-only), Q&A blocks scoped to high-intent pages
  only, self-contained-quotability as a hard rule (carries to homepage),
  and permanent slugs (restructure via new pages, not renames). Grilled
  live with the maintainer. Feeds Site (2.5.0)'s Ticket 3 (Docs IA) and
  informs Ticket 6.
- [3 — Structured Data & Schema.org Strategy](3e0edd28-4651-4fc8-897f-5f44dad8b294) —
  homepage carries `WebSite` + `SoftwareApplication` + `FAQPage`; every
  docs page carries `TechArticle` uniformly, with `FAQPage` added on the
  four pages Ticket 2 scoped Q&A blocks to; attribution is `Person`
  (Travis Kovar), not `Organization` — solo-maintained OSS project;
  `BreadcrumbList` explicitly skipped given the flat URL IA. Grilled live
  with the maintainer. Feeds Site (2.5.0)'s Ticket 7 (Build the Homepage).
- [5 — llms.txt / llms-full.txt Decision & Draft](787c805a-69dd-409f-8060-91efa97fa044) —
  publish both: `llms.txt` hand-maintained, `llms-full.txt` build-generated
  from Starlight's content collection at Site (2.5.0) Ticket 5's build step
  to avoid drift. Structural template (Docs / How It Works / Optional
  sections, ADR log demoted to Optional) drafted against Ticket 2's IA with
  placeholder slugs — final link list waits on Site (2.5.0)'s Ticket 3.
  Full draft: docs/design/seo/llms-txt-draft.md.
- [6 — Content-Authoring Guidelines for AI Citability](a3cc1972-e455-4c61-9ec4-bcc873c6353d) —
  four rules, grounded in patterns already live in README.md: limitations
  sections are content-driven (only pages whose topic has a real
  README-disclosed caveat get a `## Limitations` H2, always last on the
  page); source attribution covers both byline (`Person`, Ticket 3) and
  evidence-linking (every measured claim links its source); factual/
  quotable phrasing enforced via both a positive rule (no standalone
  adjective claims) and a concrete banned-superlatives list. Grilled live
  with the maintainer. Feeds Site (2.5.0)'s Ticket 2. Full guide:
  docs/design/seo/content-authoring-style-guide.md.
- [7 — GEO Citation Measurement Approach](406c9701-a5bf-4001-9bbc-a69c85463c67) —
  manual, no-cost monthly check across all four target engines (ChatGPT,
  Claude, Perplexity, Google AI Overviews) against a fixed 8-query set
  drawn from Ticket 1; logs the full mention spectrum (linked, named-but-
  unlinked, or unattributed) rather than a binary yes/no. Grilled live
  with the maintainer. Log and query set: docs/design/seo/geo-citation-log.md.

## Not yet specified

- What triggers a content refresh once real citation data exists — Ticket 7
  settled the check's own cadence (monthly) and what counts as a citation,
  but not how a maintainer should react to a bad run (e.g. a page that
  never gets cited after several checks). Can't specify until the site is
  live and Ticket 7's log has real data to react to.

## Out of scope

- **Active distribution/outreach** — HN/Reddit launch posts, awesome-list
  PRs, directory submissions, backlink campaigns. Ruled out at chartering
  (maintainer's explicit scope call) to keep this map finishable; may
  become its own future effort once the technical/content foundation here
  ships.

---
id: 1cca44ce-a2c7-4bae-9aed-c42b96ab2cee
createdAt: 2026-08-17T01:00:19.924Z
importance: 4
tags:
  - planning
  - seo
  - geo
taskId: null
kind: research
map: 64cc32f8-4b9b-48dd-b18c-ca0788b96cba
status: resolved
---
# 1 — Keyword & Search-Intent Research

## Question

What do developers actually search for when they'd want a tool like neuron
— around agent/coding-assistant memory, CLAUDE.md/AGENTS.md pain points,
and competing categories (vector-DB memory layers, mem0-style products,
plain markdown context files)? Produce a short findings doc: the real query
phrases, their intent (informational vs. solution-seeking), and which ones
neuron can credibly rank/cite for.

## Context

Grounds every downstream IA, content, and messaging decision in this map
and Site (2.5.0) in actual search behavior rather than guesswork — neither
the maintainer nor this map's own chartering session has direct SEO
experience to draw on otherwise. Feeds Ticket 2 (IA) and Ticket 6
(Content-Authoring Guidelines) directly, and indirectly informs Site
(2.5.0)'s own Ticket 1 (marketing/docs site survey) and Ticket 2 (Homepage
Messaging).

## Answer

Full findings, with sources cited per claim:
`docs/design/seo/keyword-search-intent-research.md`.

**No ranking tool (Ahrefs/SEMrush/GSC) or browser was available**, so this
is qualitative (SERP-population-based), not a measured keyword-volume
study — treat "wide open" / "contested" judgments as directional, and
re-verify with real tooling before spending content-production effort
against any single phrase.

**Query landscape**: bare category phrases ("claude code memory",
"persistent memory for llm agents", "AI agent long-term memory") are
saturated — dominated by Mem0's content marketing, Anthropic's own docs,
and SEO-farmed "best of 2026" roundups (Braintrust, Vectorize, EverMind,
Powerdrill all list the same six tools; neuron is in none of them).
Long-tail and comparison phrases are more winnable: "mem0 alternatives"
pages already exist as their own query intent; "X vs Y" comparison posts
(Vectorize, SourceForge) are a well-established pattern with no neuron
pairing yet; hand-written multi-tool comparison posts (e.g. a Medium
six-way comparison) don't include neuron and are a more realistic near-term
target than organic ranking against Mem0's domain authority.

**CLAUDE.md/AGENTS.md pain points** (verified primary sources): GitHub
issue `anthropics/claude-code#14227` ("It's a goldfish," "amnesia in the
CLI," closed as not-planned by Anthropic), HN thread `#47034087` on the
AGENTS.md effectiveness study ("This file could be renamed CONTRIBUTING.md"),
and claudelint's docs confirming Claude Code warns at 40KB. Real developer
vocabulary to reuse in content: amnesia, goldfish, context rot, drift,
stale, unwieldy. "Context rot" itself is shared vocabulary, not
vendor-owned — open for neuron's relevance-gated injection (ADR 0012) to
answer directly.

**Competing categories** — the field is more crowded than this map's
sibling `docs/design/site/competitive-landscape-and-positioning.md`
suggested: `gastownhall/beads` is the closest direct competitor found
(issue tracker + agent memory, "memory upgrade for your coding agent," but
graph+Dolt-backed rather than plain-markdown); `rohitg00/agentmemory`
claims "#1 persistent memory for AI coding agents"; `hmans/beans` is a
plain-markdown issue tracker. **No competitor found combines
markdown-as-source-of-truth + schema enforcement + issue tracker +
architecture blueprint the way neuron does** — that combination, and the
exact phrase "architecture linter for AI agents" (maps to `neuron scan
--check`), are open on this pass.

**Feeds forward**: Ticket 2 (IA & Citability Conventions) and Ticket 6
(Content-Authoring Guidelines) should prioritize the long-tail/comparison/
alternatives phrasing and the amnesia/context-rot vocabulary over
competing head-on for saturated category terms.

---
id: 4b5c1114-812d-4533-a992-7bebb4ca3ec1
createdAt: 2026-08-17T01:00:19.958Z
importance: 4
tags:
  - planning
  - seo
  - geo
taskId: null
blockedBy: 1cca44ce-a2c7-4bae-9aed-c42b96ab2cee
kind: grilling
map: 64cc32f8-4b9b-48dd-b18c-ca0788b96cba
status: resolved
---
# 2 — Information Architecture & URL/Citability Conventions

## Question

What URL structure, page-chunking, and heading conventions make the site
both crawlable by traditional search engines and easy for an AI answer
engine to lift a self-contained, correctly-attributed quote from? (e.g. one
concept per page vs. long single-page docs, stable/short URLs, heading
hierarchy, whether/how to structure FAQ-style Q&A blocks.)

## Context

This is the conventions layer Site (2.5.0)'s own Ticket 3 (Docs Information
Architecture) needs before it can commit to a real IA — building docs IA
twice (once naively, once GEO-aware) is exactly the rework this map exists
to prevent. Informed by Ticket 1's search-intent findings. Blocks Site
(2.5.0)'s Ticket 3.

## Answer

Grilled live with the maintainer. Seven conventions, settled:

1. **URL structure**: flat, single-segment slugs off `/docs/`
   (e.g. `/docs/wayfinder`, `/docs/how-it-works-hybrid-search`) — no
   nested URL segments, even if Starlight's source content is organized
   into folders. Shorter, more stable, and a citation doesn't depend on
   knowing the site's nav to make sense.

2. **Page granularity**: one concept per page. Each "How It Works" topic
   (hybrid search/RRF, write-side enrichment, declared field schema,
   storage adapters) gets its own page/slug rather than being grouped —
   lets each compete for its own query and gives an AI engine a single
   focused URL to attribute a quote to, rather than a grab-bag page.

3. **Heading hierarchy** (docs pages only, see point 7): strict H1
   (declarative page title, stating the concept as a claim — e.g. "Hybrid
   Search & RRF Ranking," not "Overview") / H2-only subsections, no H3+
   nesting. A page needing H3-deep structure is a signal it should be
   split into more pages (point 2), not a case for relaxing this.

4. **FAQ/Q&A blocks**: scoped, not boilerplate. Only on high-intent pages
   — homepage, Getting Started, CLI Reference, and a dedicated
   alternatives/comparison page (per Ticket 1's finding that
   comparison/"alternatives" query intent is the open, winnable space).
   This is content-placement convention only; the actual `FAQPage`
   JSON-LD markup is Ticket 3 on this map's call (Structured Data &
   Schema.org Strategy), not this ticket's.

5. **Self-contained quotability** (hard rule, carries to homepage — see
   point 7): every H2 section (or homepage section) must stand alone —
   define its own terms, no "as mentioned above," no pronoun references
   to prior sections. An AI engine extracting one section has no access
   to what came before it on the page, so a section that leans on prior
   context risks being quoted wrong. Accept light repetition (e.g.
   restating "neuron" instead of "it") as the cost of this — Ticket 6
   should treat it as settled, not relitigate it as a prose nitpick.

6. **URL stability**: slugs are permanent once published. Restructuring
   means adding a new page (new slug) and, if needed, marking the old one
   deprecated with a pointer forward — not renaming or moving an existing
   URL out from under a citation an AI engine may have already indexed.
   Redirect/canonical tag mechanics themselves belong to Ticket 4
   (Sitemap, Robots.txt & Canonical URL Setup) on this map.

7. **Scope — docs vs. homepage**: points 1-3 (URL structure, page
   granularity, heading cap) are docs-only — the homepage is a single
   page whose visual layout is Site (2.5.0)'s Ticket 4's own `/prototype`
   call, not constrained by a docs-oriented structural rule. Points 4-5
   (Q&A block placement, self-contained quotability) are citability rules
   and carry over to the homepage too.

**Feeds forward**: Site (2.5.0)'s Ticket 3 (Docs Information Architecture)
can now build the real page list/nav against these conventions instead of
deciding them ad hoc. Ticket 6 (Content-Authoring Guidelines) should adopt
point 5 (self-contained quotability) as settled house style rather than
re-deciding it.

---
id: 3e0edd28-4651-4fc8-897f-5f44dad8b294
createdAt: 2026-08-17T01:00:19.991Z
importance: 4
tags:
  - planning
  - seo
  - geo
taskId: null
blockedBy: 4b5c1114-812d-4533-a992-7bebb4ca3ec1
kind: grilling
map: 64cc32f8-4b9b-48dd-b18c-ca0788b96cba
status: resolved
---
# 3 — Structured Data & Schema.org Strategy

## Question

Which JSON-LD schema.org types does the site need (`SoftwareApplication`
for the homepage/product, `TechArticle` or `FAQPage` for docs,
`Organization`/`Person` for attribution) and on which page templates does
each attach?

## Context

Structured data doesn't change what a page says, only how unambiguously a
crawler (search or AI) can parse it — worth deciding once as a
template-level convention rather than ad hoc per page. Feeds Site
(2.5.0)'s Ticket 7 (Build the Homepage), which should implement against
this ticket's decision rather than invent its own markup. Blocks Site
(2.5.0)'s Ticket 7.

## Answer

Grilled live with the maintainer. Per-template JSON-LD convention, settled:

1. **Homepage**: `WebSite` (site-level container: name, url) +
   `SoftwareApplication` (applicationCategory: DeveloperApplication,
   operatingSystem, offers with price: "0", author) stacked together, plus
   `FAQPage` sourced from the homepage's own visible Q&A block (Ticket 2
   scoped Q&A placement; this ticket settles its markup).

2. **Docs pages**: `TechArticle` uniformly across every docs page — Getting
   Started, CLI Reference, every "How It Works" concept page, and the
   alternatives/comparison page. One template-level rule, no per-page
   judgment calls about which pages count as technical. Carries headline
   (the H1), description, author, and datePublished/dateModified if
   Starlight's frontmatter tracks them (Ticket 7/Ticket 5's scaffolding
   call, not decided here).

3. **FAQPage, additionally**: on exactly the four pages Ticket 2 already
   scoped Q&A blocks to — homepage, Getting Started, CLI Reference, and the
   alternatives/comparison page. Each Question/acceptedAnswer pair maps 1:1
   to a real visible Q&A block already in the page content — no markup for
   synthetic or hidden questions. Stacks alongside that page's primary type
   (e.g. `TechArticle` + `FAQPage` together on Getting Started).

4. **Attribution**: `Person` (Travis Kovar, GitHub profile url), not
   `Organization` — this is a solo-maintained OSS project (LICENSE: Travis
   Kovar, MIT; no registered org behind `kovartravis`), and claiming an
   `Organization` would misrepresent it ahead of Ticket 6's citability
   principles. One shared `Person` fragment reused as `author` on the
   homepage's `SoftwareApplication` and on every docs page's `TechArticle`,
   not re-typed per page.

5. **Explicitly skipped**: `BreadcrumbList`. Ticket 2's flat, single-segment
   `/docs/` URL IA removes the usual reason for it (inferring hierarchy from
   the URL path), and nothing else in this map calls for a docs taxonomy —
   low marginal signal for a new template obligation.

**Feeds forward**: Site (2.5.0)'s Ticket 7 (Build the Homepage) implements
this table directly rather than inventing its own markup. A page may stack
multiple JSON-LD blocks (the homepage carries three).

---
id: a8719d5c-34a9-4ebe-b1c2-f48408c963df
createdAt: 2026-08-17T01:00:20.021Z
importance: 4
tags:
  - planning
  - seo
  - geo
taskId: null
blockedBy: 4b5c1114-812d-4533-a992-7bebb4ca3ec1,2cfb58c4-305e-414f-b40d-f2d4e46ad016
kind: task
map: 64cc32f8-4b9b-48dd-b18c-ca0788b96cba
status: unclaimed
---
# 4 — Sitemap, Robots.txt & Canonical URL Setup

## Question

Implement sitemap.xml generation, robots.txt, and canonical tag conventions
for the live site.

## Context

**Crawler policy settled at this map's chartering (not a ticket):** allow
every crawler, including AI training crawlers (GPTBot, anthropic-ai,
CCBot, etc.) alongside real-time retrieval/search crawlers (OAI-SearchBot,
ChatGPT-User, ClaudeBot, Claude-SearchBot, PerplexityBot) — maximize
visibility over guarding against training use. This ticket is the
mechanical implementation of that call, not a re-litigation of it. Needs
the Astro+Starlight scaffold in place to generate against (Site (2.5.0)'s
Ticket 5) and this map's Ticket 2's URL/IA conventions so the sitemap
reflects the real structure, not a placeholder.

---
id: 787c805a-69dd-409f-8060-91efa97fa044
createdAt: 2026-08-17T01:00:20.053Z
importance: 4
tags:
  - planning
  - seo
  - geo
taskId: null
blockedBy: 4b5c1114-812d-4533-a992-7bebb4ca3ec1
kind: task
map: 64cc32f8-4b9b-48dd-b18c-ca0788b96cba
status: resolved
---
# 5 — llms.txt / llms-full.txt Decision & Draft

## Question

Should the site publish an `llms.txt` (and/or `llms-full.txt`) at its
root, and if so, what does it curate?

## Context

`llms.txt` is not an official standard as of 2026 — no major LLM provider
has confirmed it crawls the file on a schedule — but it's cheap to add and
directionally aligned with where AI-readiness is heading (a curated,
machine-readable map of the site's key content). Low cost, uncertain
payoff: worth a deliberate yes/no rather than skipping by default or
cargo-culting it in. If yes, draft it against Ticket 2's IA once real URLs
exist.

## Answer

**Publish both.** `llms.txt`: yes, hand-maintained (short, changes rarely).
`llms-full.txt`: yes, but build-generated from Starlight's content
collection at Site (2.5.0) Ticket 5's Astro build step, not hand-mirrored —
avoids drift for zero incremental cost once a real content collection
exists. Both live at the site root per the llms.txt convention (H1 title,
blockquote summary, H2-grouped Markdown link lists).

Since Site (2.5.0)'s own Ticket 3 (Docs IA) hasn't committed a real page
inventory yet, this ticket drafts `llms.txt`'s **structure and topic
curation** (Docs / How It Works / Optional sections, ADR log demoted to
Optional per the map's no-raw-ADR-dump stance) against Ticket 2's flat
`/docs/<slug>` convention, using placeholder slugs standing in for
Site's Ticket 3's real ones. Full template, rationale, and the
`llms-full.txt` generation approach:
docs/design/seo/llms-txt-draft.md.

---
id: a3cc1972-e455-4c61-9ec4-bcc873c6353d
createdAt: 2026-08-17T01:00:20.084Z
importance: 4
tags:
  - planning
  - seo
  - geo
taskId: null
blockedBy: 1cca44ce-a2c7-4bae-9aed-c42b96ab2cee
kind: grilling
map: 64cc32f8-4b9b-48dd-b18c-ca0788b96cba
status: resolved
---
# 6 — Content-Authoring Guidelines for AI Citability

## Question

What house style should every piece of site copy (homepage, docs,
reference pages) follow to be both genuinely useful and more likely to be
quoted by an AI answer engine — e.g. explicit "limitations/tradeoffs"
sections, clear source attribution, factual/quotable phrasing over
marketing language, avoiding unverifiable superlatives?

## Context

Research consulted at this map's chartering found content with explicit
limitation sections and clear attribution reported to get cited measurably
more often by AI answer engines than purely promotional copy. This ticket
turns that into a concrete, referenceable house style. Feeds Site
(2.5.0)'s Ticket 2 (Homepage Messaging & Positioning) directly — messaging
shouldn't be drafted before this exists, alongside its existing
MCP-server-shipped blockers. Blocks Site (2.5.0)'s Ticket 2.

## Answer

Grilled live with the maintainer. Four rules, all grounded in patterns
already live in README.md rather than invented:

1. **Limitations sections are content-driven, not page-type-driven** — a
   docs page gets a `## Limitations` H2 (always last on the page, after
   any Q&A block) only if its topic already has a real caveat disclosed in
   README.md (e.g. per-harness recall coverage, exec being purely
   informational, the write-side compliance gap). No manufactured
   limitations on pages with nothing genuine to disclose.
2. **Source attribution, both senses**: byline attribution to Travis Kovar
   as `Person` (Ticket 3's schema.org decision) *and* evidence-linking —
   every quantitative/measured claim must link to its backing source
   (benchmark file, A/B results), mirroring README's existing citation
   pattern. A bare number is not publishable copy.
3. **Factual/quotable phrasing, both a positive rule and a banned list**:
   every claim must be falsifiable/backed by a fact or link (no adjective
   allowed to stand alone); plus a concrete banned-superlatives list
   (best-in-class, revolutionary, seamless, blazing-fast, cutting-edge,
   world-class, state-of-the-art, game-changing, effortless, robust,
   powerful, next-gen, unparalleled) — verified README.md already avoids
   all of these, so this locks in existing practice rather than imposing a
   new one.

Feeds Site (2.5.0)'s Ticket 2 directly. Full guide:
docs/design/seo/content-authoring-style-guide.md.

---
id: 406c9701-a5bf-4001-9bbc-a69c85463c67
createdAt: 2026-08-17T01:00:20.121Z
importance: 4
tags:
  - planning
  - seo
  - geo
taskId: null
kind: grilling
map: 64cc32f8-4b9b-48dd-b18c-ca0788b96cba
status: resolved
---
# 7 — GEO Citation Measurement Approach

## Question

Once the site is live, how will we know whether it's actually being
surfaced/cited by AI answer engines (ChatGPT, Claude, Perplexity, Google AI
Overviews) — a lightweight, low/no-cost manual check, or a paid tracking
tool?

## Context

Paid GEO-tracking tools (Otterly.ai, Semrush's AI toolkit, Ahrefs Brand
Radar) exist but are built for teams running continuous campaigns, likely
overkill for a solo-maintained OSS project. A cheap alternative is a
periodic manual prompt-and-check routine (ask each engine neuron's target
queries, log whether/how it's cited). Decide the approach now so it's ready
to run the moment the site ships, rather than improvised later. Doesn't
block anything else in this map — can resolve any time.

## Answer

Grilled live with the maintainer. Manual, no-cost routine — no paid
tracking tool:

1. **Engines**: all four named at chartering — ChatGPT, Claude, Perplexity,
   Google AI Overviews.
2. **Queries**: a fixed set of 8, pulled from Ticket 1's keyword research,
   reused every check so results are comparable month to month (not
   re-derived per check).
3. **Cadence**: monthly, starting once the site ships.
4. **Citation definition**: log the full spectrum, not a binary yes/no —
   direct source link, named-but-unlinked mention, or content clearly
   drawn from the site without attribution.
5. **Log location**: `docs/design/seo/geo-citation-log.md`, dated entries
   per check.

Full query list, table template, and log:
docs/design/seo/geo-citation-log.md.
