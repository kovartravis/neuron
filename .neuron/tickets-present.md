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
    configuration, harness adapters) plus a curated "How It Works" layer
    (hybrid search/RRF, write-side enrichment, declared field schema,
    storage adapters). No raw ADR link-dump — `CONTEXT.md`'s glossary is
    the primary source, not `docs/adr/` directly. **Revised by Ticket 3**:
    wayfinder dropped entirely (internal dogfooding, not a public feature);
    Architecture Scan considered and deliberately left out pending a future
    map to deepen that feature first.
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
- **Cross-map dependency, added 2026-08-15, resolved 2026-08-19**: Ticket 2
  (Homepage Messaging & Positioning) was blocked on Map — MCP Server &
  Setup/Onboarding Skill Split's Tickets 4 and 6. A maintainer-submitted
  positioning-strategy review (competitive landscape, developer pain
  points, a candidate positioning statement) arrived as input to this
  map's Ticket 2 — but two of its "actionable ideas" (an MCP server, an
  onboarding-migration flow) turned out to be real product engineering
  rather than site content, and graduated into that standalone map
  instead. Both tickets shipped 2026-08-17 (that map has since archived to
  `tickets-past`), unblocking Ticket 2, which is now resolved. Full
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

- [Survey Dev-Tool Marketing + Docs Sites for Patterns](ab6103ac-1b08-4ea6-aadd-816a8d5d4e46) —
  9 reusable patterns from Stripe/Linear/Vercel/Resend/Supabase/Turso, most
  load-bearing: H1 = category noun + audience; subheadline carries the
  differentiator; "for AI agents" is a foregrounded primary audience on
  several surveyed docs homepages, not a footnote; no homepage surveyed
  embeds a live demo. Full findings:
  docs/design/site/dev-tool-marketing-docs-survey.md.
- [Docs Information Architecture](ee1b0d6f-783a-4dc5-95f9-dc39d6828910) —
  23-page sitemap across 4 sidebar groups (Getting Started, Guides, How It
  Works, Reference) plus a dedicated `/docs` landing page. Wayfinder dropped
  from scope (dogfooding-only); Architecture Scan deliberately left out
  pending a future map. Reference is one page per README's public command
  table, `memory`'s subcommands as H2 sections on one page. Full sitemap:
  docs/design/site/docs-information-architecture.md.
- [Scaffold Astro + Starlight in This Repo](2cfb58c4-305e-414f-b40d-f2d4e46ad016) —
  site source lives at `/site`, a standalone nested npm project (own
  `package.json`, not a workspace); `astro.config.mjs` sets `site`/`base`
  for the `kovartravis.github.io/neuron` project-page URL. `npm run build`
  and `npm run dev` both verified clean from `/site`; root TS/vitest
  pipeline untouched (scoped to `src/**/*` only) and re-verified after.
  Placeholder Starlight starter content only — unblocks Ticket 7 (Build
  the Homepage) and Map — SEO & GEO Groundwork's Ticket 4
  (Sitemap/Robots.txt/Canonical Setup).
- [GitHub Pages Deploy Pipeline](b7e4dab5-5b0f-44e9-bcb8-0c8475ed785c) —
  `.github/workflows/deploy-site.yml` builds `/site` via `withastro/action`
  and deploys via `actions/deploy-pages` on push to `main` (paths-scoped to
  `site/**`); Pages enabled with `build_type: workflow` via `gh api`, no
  manual UI step. Live end-to-end verified after merge:
  `https://kovartravis.github.io/neuron/` resolves (HTTP 200) with the
  correct `/neuron` base path baked into canonical URL/sitemap/assets.
- [Write Docs Content Pages](ab00735c-765e-4575-aa0d-4bacaaa0cd1c) — all 13
  pages Ticket 3's IA scoped here (docs landing, Getting Started, Guides,
  How It Works — Reference stays Ticket 9's own scope) written in one
  session as `site/src/content/docs/docs/*.md`, sourced from README.md,
  CONTEXT.md, and ADRs 0001/0010/0011/0013/0014/0016. Applied every
  settled convention (flat `/docs/<slug>` URLs, H1/H2-only headings,
  self-contained quotability, Ticket 6's Limitations/evidence-linking/
  banned-word rules) and wired the sidebar's real nav groups. Surfaced a
  gap: nothing implements Map — SEO & GEO Groundwork's Ticket 3
  (`TechArticle`/`Person` JSON-LD) on the docs template — filed as this
  map's new Ticket 11.
- [Homepage Messaging & Positioning](96a9be90-1b56-4a78-9162-e9584f706877) —
  category framing settled as "local-first memory engine for coding
  agents" (local-first foregrounded, not a buried pillar); hero contrasts
  by pattern not product (no Mem0/Zep/CLAUDE.md named); pillars in order
  Zero-Cloud Privacy → Zero-Amnesia Execution → Context Budget Diet;
  pain-point section follows the pillars rather than opening with them;
  primary CTA is the curl install one-liner tabbed with npx. Greenlit a
  light homepage-only mention of `neuron scan --check` as a CI/CD
  "architecture linter" (doesn't touch the deferred Architecture Scan
  depth question below). Full decision record and drafted hero copy:
  docs/design/site/homepage-messaging-positioning.md.
- [Homepage Visual & Brand Direction](19f204e7-ed0c-4883-8a86-9416bb257c02) —
  prototyped 3 directions (Terminal Anchor, Split SaaS, Minimal Text-First),
  reacted to live. Winner: **Minimal Text-First** — warm off-white ground,
  near-black text, a single sparing deep-green accent, system sans
  throughout, no code block/terminal chrome in the hero at all. Settles
  the "live/interactive demo" fog item below as **no**, confirming Ticket
  1's survey finding live rather than just from the survey. Pillars render
  as a plain numbered list (no cards); pain-points as flowing prose after
  them. Includes a mobile breakpoint (added after initial review). Full
  prototype (all 3 variants) captured on throwaway branch
  `prototype/ticket4-homepage-variants` (commit `e8b6bbd`) for Ticket 7 to
  fold from — not on main.
- [Build the Homepage](531c631b-cf9b-4a6b-be27-b3fa5529a202) — built at
  `site/src/pages/index.astro`, folding Ticket 4's winning Minimal
  Text-First prototype and Ticket 2's settled copy verbatim into a real
  Astro page outside the Starlight layout. Also implements Map — SEO & GEO
  Groundwork's Ticket 3 directly: a visible 4-question Q&A block (grounded
  in README facts, per that map's Ticket 1 search-intent research and
  Ticket 2 IA convention) plus `WebSite`+`SoftwareApplication`+`FAQPage`
  JSON-LD with a shared `Person` author. Verified via `npm run build` and
  Playwright screenshots at desktop and mobile widths.

## Not yet specified

- **Analytics/telemetry for the live site** — low priority, not worth
  pinning down before the site exists to put it on.
- **Distribution channels** (README badge linking to the site, any tool
  directory submissions) — deliberately out of scope for Map — SEO & GEO
  Groundwork (id `64cc32f8-4b9b-48dd-b18c-ca0788b96cba`), which owns the technical/on-site half of
  this fog item instead. Still fog here until that map's foundation ships
  and there's a site worth badging/submitting.
- **A future map to deepen Architecture Scan as a product feature** —
  flagged by the maintainer while resolving Ticket 3: `neuron scan`/drift
  detection/the blueprint pipeline is a major feature and an open SEO
  positioning angle ("architecture linter for AI agents," per the SEO & GEO
  Groundwork map's Ticket 1), but isn't documented at a depth worth a How
  It Works page yet. Not sharp enough to ticket on this map — belongs to a
  separate chartering session, not a resumption of this one.

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
- **Benchmark-proof marketing collateral** (a token-cost comparison +
  failure-repeat demo, idea C from the competitive-landscape doc) — ruled
  out during Ticket 2's grilling session. The doc's own figures were
  illustrative placeholders, not measured against this repo; producing
  real numbers is a separate future effort if ever pursued, not a
  resumption of this map.

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
status: resolved
---
# 9 — Write CLI & Config Reference Pages

## Question

Write hand-authored reference pages for every CLI command and every neuron.yaml declared field/config option, accurate to the current (2.4.x) surface.

## Context

Kept separate from ticket 8 because reference pages need exhaustive accuracy against the actual CLI surface (neuron <cmd> --help, neuronYaml.ts), not prose — a different kind of writing task.

## Answer

Wrote all 10 Reference pages Ticket 3's IA scoped to this ticket, as `site/src/content/docs/docs/cli-{init,memory,exec,scan,sync,status,ui,mcp,feedback}.md` and `config-reference.md`. Sourced from the live CLI surface, not docs/COMMANDS.md alone — verified every flag against actual source (`npx tsx src/cli.ts <cmd> --help` for `memory`/`scan`/`status`, which support it; direct source reads of `init.ts`/`exec.ts`/`sync.ts`/`ui.ts`/`mcp.ts`/`feedback.ts` for the rest, which don't) and against `neuronYaml.ts`'s Zod schemas for `config-reference.md`.

`cli-memory.md` structures the 8 subcommands as H2 sections per Ticket 3's spec, plus general flags, --where/--refs-satisfy, the supersession-gate flags, and declared-field flags. `config-reference.md` covers every top-level key including three not documented anywhere else on the site — `strict`, `llm.enrichment.*`, and `recall.epochCharBudget` — plus environment variables.

**Real drift found and corrected while verifying, not just written around:**
- `memory add`'s `--category` is optional (write-side-enrichment infers it) — `docs/COMMANDS.md`'s own table wrongly marks it required for `add`. Site page reflects the verified (optional) behavior.
- `neuron ui`'s `--port`/`--no-open` flags exist in source but were undocumented anywhere, including `docs/COMMANDS.md`. Now documented.
- Two existing site pages (`declared-field-schema.md`, `configuration.md`, both Ticket 8) claimed declared fields support only `string`/`enum`, missing `commitRef` (added by ADR 0013's 2026-08-15 amendment, ticket 5/neuron-2.4.2). Corrected both in place since my own new pages cross-link them and would otherwise contradict them.
- **Site-wide bug found and fixed**: hand-written markdown links (`[text](/docs/foo/)`) were never getting the `/neuron` base path prepended in the built output — only Starlight's own generated sidebar links were. Verified by inspecting `dist/` directly: every inline cross-reference across all 13 of Ticket 8's existing pages, not just this ticket's new ones, would 404 on the deployed site. Added a small rehype plugin in `site/astro.config.mjs` (`rehypeBaseLinks`) that prepends `base` to any bare root-relative `href` at build time — fixes every existing and future content-page link in one place, verified against the rebuilt `dist/` output (spot-checked old and new pages) and against a live `astro preview` server.

Updated `site/astro.config.mjs`'s Reference sidebar group from its leftover Starlight-starter `autogenerate: { directory: 'reference' }` placeholder (never replaced when Ticket 8 updated the other three groups) to the real 10 explicit entries, and deleted the placeholder `site/src/content/docs/reference/example.md` plus its now-empty directory.

Verified: `npm run build` clean (25 pages, up from 16), zero banned-superlative hits (grepped), zero H3+ headings across all 10 new pages, every internal cross-reference anchor checked against its target page's real heading slugs and confirmed present in the built HTML. Root TS/vitest pipeline untouched — `site/**` only.

## Comments

- 2026-08-16: Created — blocked on Ticket 3 (Docs IA) and Ticket 5 (Astro scaffold).
- 2026-08-19: Claimed and resolved. All 10 Reference pages live under `site/src/content/docs/docs/`.

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
status: resolved
---
# 8 — Write Docs Content Pages

## Question

Write the docs content (Starlight markdown pages) for every section ticket 3's IA settles, sourced primarily from CONTEXT.md's glossary and the relevant ADRs for the "How It Works" layer.

## Context

May need to graduate into further per-section tickets once ticket 3 resolves and the real page count is known — expected, not a planning failure.

## Answer

Wrote all 13 pages ticket 3's IA scoped to this ticket (the docs landing page, the 2 Getting Started pages, the 6 Guides pages, and the 4 How It Works pages — Reference stays ticket 9's separate scope), directly as `site/src/content/docs/docs/*.md`. Did not need to graduate into per-section tickets — 13 pages sourced cleanly from README.md, CONTEXT.md, and the relevant ADRs (0001, 0010, 0011, 0013, 0014, 0016) in one session.

Applied every settled convention: ticket 2's flat single-segment `/docs/<slug>` URLs, strict H1(frontmatter title, declarative)/H2-only headings (verified: zero H3+ across all 13 pages), and self-contained-quotability. Ticket 6's content-authoring style guide applied throughout — Limitations sections added only where README.md discloses a real, specific caveat for that exact page's topic (harness-adapters.md, harness-copilot.md, harness-cursor.md, quickstart.md, configuration.md; explicitly *not* added to write-side-enrichment.md or storage-adapters.md, whose plausible caveats live in CONTEXT.md/ADRs but aren't README-disclosed, per the rule's letter). Every measured/quantitative claim links its source file on GitHub. Zero banned-superlative hits (grepped).

Also updated `site/astro.config.mjs`'s sidebar to real Getting Started/Guides/How It Works groups (was a single placeholder "Example Guide"), and deleted the placeholder `guides/example.md` it replaced. `npm run build` verified clean: all 13 pages route correctly under `/docs/*`, and root-relative markdown links (`/docs/install/` etc.) are auto-rewritten to include the `/neuron` base by Starlight, confirmed by inspecting the built HTML.

**Gap surfaced, not fixed here**: the SEO & GEO Groundwork map's Ticket 3 (Structured Data & Schema.org Strategy) decided every docs page should carry `TechArticle` + `Person` JSON-LD, but no ticket on either map owns implementing that markup in a shared Starlight layout/template — Site (2.5.0)'s own Ticket 7 (Build the Homepage) only covers the homepage's JSON-LD. Filed as a new ticket on this map rather than folded into this one, since it's template-level engineering, not content authoring.

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
status: resolved
---
# 7 — Build the Homepage

## Question

Implement the homepage in Astro against ticket 2's settled messaging and ticket 4's resolved visual direction.

## Context

Blocked on both decision tickets plus the scaffold (ticket 5) existing to build into.

## Answer

Built at `site/src/pages/index.astro` — a plain Astro page (not a Starlight
page), so it renders at the site root outside Starlight's docs layout.
Folds ticket 4's winning prototype direction (Minimal Text-First, branch
`prototype/ticket4-homepage-variants`, commit `e8b6bbd`) into real markup:
warm off-white ground, single deep-green accent, no terminal/code chrome
in the hero beyond the inline curl command, numbered-list pillars, prose
pain-point paragraph, italic CI aside, and the mobile breakpoint refinement
(stacked full-width CTAs, wrapping install command, tightened pillar
numerals) — all copied verbatim from ticket 4's settled answer.

Copy is ticket 2's settled hero/pillars/pain-point text verbatim, in its
settled section order (Hero → Pillars → Pain-points). CTAs: primary "Get
started" → `/docs/quickstart/`, secondary "View on GitHub" → the GitHub
repo, both base-path-aware via `import.meta.env.BASE_URL`.

**Also implements two decisions this ticket was explicitly built against**
(Map — SEO & GEO Groundwork's Ticket 3 fed this ticket directly):
- A visible Q&A block (4 questions), per that map's Ticket 2 IA convention
  scoping FAQ blocks to high-intent pages including the homepage. Questions
  target real search-intent clusters from that map's Ticket 1 research
  (cloud/local, cross-harness support, CLAUDE.md/AGENTS.md comparison,
  pricing). Answers are grounded in README.md facts (offline/ONNX/SQLite,
  the harness support table's per-turn vs. session-start-only split, MIT
  license) — no invented claims, no banned-superlative words (ticket 6's
  style guide).
- JSON-LD (`WebSite` + `SoftwareApplication` + `FAQPage`, stacked via
  `@graph`) exactly per that map's Ticket 3 table: `Offer` with `price: "0"`,
  a shared `Person` (Travis Kovar) as `author`, `FAQPage.mainEntity` mapped
  1:1 from the visible Q&A block. No `BreadcrumbList` (ticket 3 explicitly
  skips it).

Verified: `npm run build` from `/site` completes clean (16 pages, including
`index.html` at the root); `grep` confirmed the canonical URL, favicon
path, JSON-LD block (7 `@type` entries: WebSite, SoftwareApplication,
Offer, Person, FAQPage, 4×Question/Answer), and both CTA hrefs render with
the correct `/neuron` base prefix. Screenshotted via Playwright at
1280×1400 (desktop) and 375×900 (mobile) — mobile breakpoint confirmed
working (stacked CTAs, wrapped install command, tightened pillar list).

Root TS/vitest pipeline untouched — this is a `site/**` addition only.

## Comments

- 2026-08-16: Created — blocked on Ticket 2, Ticket 4, Ticket 5, and Map —
  SEO & GEO Groundwork's Ticket 3.
- 2026-08-19: Claimed and resolved. Homepage live at `site/src/pages/index.astro`.

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
status: resolved
---
# 6 — GitHub Pages Deploy Pipeline

## Question

Wire a GitHub Actions workflow that builds the Astro site and deploys it to GitHub Pages on merge to main (or on release), and enable Pages in the repo settings pointed at that deployment. Confirm the live URL actually resolves to kovartravis.github.io/neuron.

## Context

Needs a real build to deploy against, hence blocked on ticket 5's scaffold. Try gh api / gh CLI for the Pages settings step before assuming it needs manual GitHub UI action.

## Answer

`.github/workflows/deploy-site.yml` builds `/site` via the official `withastro/action@v3` and deploys via `actions/deploy-pages@v4`, triggered on push to `main` scoped to `site/**` (plus `.github/workflows/deploy-site.yml` itself) so unrelated CLI-tool changes don't fire it, with `workflow_dispatch` for manual runs.

Pages enabled via `gh api repos/kovartravis/neuron/pages -X POST -f build_type=workflow` (no manual UI step needed) — Actions-based deployment source, confirmed via the same API returning `html_url: https://kovartravis.github.io/neuron/`.

End-to-end verified after merge (PR #18, commit 2742ea3): the `Deploy Site to GitHub Pages` workflow ran (build 23s, deploy 11s, both green — run 32204295159), and `https://kovartravis.github.io/neuron/` resolves live (HTTP 200), serving the Starlight placeholder with the correct `/neuron` base path baked into its canonical URL, sitemap link, and asset paths.

Note: `workflow_dispatch` can't be used to test a brand-new workflow file before it exists on the default branch (GitHub only dispatches workflows already present on `main`), so this ticket's live-URL verification necessarily happened after merge rather than before — same shape as any first-run deploy workflow, not specific to this repo.

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
status: resolved
---
# 5 — Scaffold Astro + Starlight in This Repo

## Question

Stand up a working Astro + Starlight site (placeholder content) inside this repo, configured for the kovartravis.github.io/neuron project-page base path, with local dev (astro dev) running clean and not colliding with the existing TypeScript/npm build or test pipeline. Decide and document where the site source lives (e.g. /site).

## Context

Purely mechanical — no design or content decision blocks this from starting immediately. AFK-drivable.

## Answer

Site source lives at `/site` — a standalone nested npm project (its own `package.json`/`node_modules`/`.gitignore`), not an npm workspace of the root package. Scaffolded via `npm create astro@latest -- site --template starlight`.

`site/astro.config.mjs` sets `site: 'https://kovartravis.github.io'` and `base: '/neuron'` for the GitHub Pages project-page URL settled at chartering. Verified both `npm run build` (produces `site/dist/`, 4 pages, all under the `/neuron` base) and `npm run dev` (serves `/neuron/` at `http://localhost:4321`, HTTP 200) from inside `/site`.

No collision with the root TS/npm pipeline: root `tsconfig.json`'s `include` is `src/**/*` only, and root `package.json`'s `test` script runs vitest with `--dir src` only — neither traverses `site/`. Root `npm run build` re-verified clean after the scaffold landed. `site/node_modules/` and `site/dist/` are excluded by `site/.gitignore` (Astro's own generated one), so the root `.gitignore`'s bare `node_modules/`/`dist/` patterns are redundant-but-harmless for this path, no edit needed there.

Placeholder-only: still the default Starlight starter content (`title: 'neuron'`, one example guide/reference page, GitHub social link pointed at this repo). Real IA (ticket "Docs Information Architecture"), homepage build, and content land in later tickets against this scaffold.

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
status: resolved
---
# 4 — Homepage Visual & Brand Direction

## Question

What should the homepage actually look and feel like — layout, color, typography, hero treatment, whether it needs a live/interactive demo? Use /prototype to produce a rough, concrete homepage draft to react to, informed by ticket 1's survey and ticket 2's settled messaging.

## Context

This is where "does the homepage need a live terminal demo" (currently fog on the map's Not yet specified) gets resolved — don't pre-decide it here, let the prototype session surface it.

## Answer

Prototyped three structurally different directions (Terminal Anchor, Split SaaS, Minimal Text-First) as a static Astro page, `?variant=A|B|C`, reacted to live with the maintainer. **Winner: Minimal Text-First** (variant C), with a follow-up mobile-breakpoint refinement.

**Visual identity:**
- Warm off-white ground (`#f7f5f0`), near-black text (`#16150f`), a single sparing deep-green accent (`#1a5f3f`) used only on the primary CTA and inline emphasis — not a UI-wide accent.
- System sans-serif stack throughout (no custom webfont) — Linear-style stark minimalism, tight letter-spacing on the H1 (`-0.02em`), generous line-height on body copy (`1.65`).
- No visual chrome in the hero at all: no terminal window, no card, no code block beyond a single inline `<code>` line for the curl install command. This settles the map's "live/interactive demo" fog item as **no** — confirms ticket 1's survey finding (no dev-tool homepage surveyed embeds one) live, for real, not just from the survey.

**Layout:**
- Hero: centered, narrow column (max 640px), H1 → subhead → one inline install command → secondary npm alternative as a text link → two CTAs (primary "Get started" filled button, secondary "View on GitHub" as an underlined text link, not a second button).
- Pillars: a plain vertical numbered list (01/02/03, large light-weight numerals), not cards — no borders, just hairline dividers between items. Chosen over A/B's card/grid treatments as the better fit for the minimal, text-first direction.
- Pain-points: a single flowing prose paragraph after the pillars (not a table, not cards), framing the amnesia tax / rule blindness / memory bit rot as failure modes the pillars above already resolved — matches Ticket 2's settled pillars-then-pain-points order.
- CI mention: one italic aside line, `neuron scan --check` as a CI/CD architecture-drift catch — homepage-light per Ticket 2's scoping, no dedicated section.

**Mobile (added after initial review):** hero padding tightens, H1 drops to `2.1rem`, the install command wraps instead of overflowing, both CTAs stack full-width, and pillar-list items tighten their gap/numeral size at `max-width: 640px`.

**Primary source:** the full prototype (all three variants + the switcher) is captured on branch `prototype/ticket4-homepage-variants` (commit `e8b6bbd`), not on main — Ticket 7 (Build the Homepage) folds the winning direction into the real Astro homepage from that reference, then the branch is done being a live reference.

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
status: resolved
---
# 3 — Docs Information Architecture

## Question

What pages/sections does the docs half of the site actually have, in what order, under what nav structure — within the "user-facing + architecture overview" depth already scoped on the map (Getting Started, CLI Reference, Configuration, Harness Adapters, Wayfinder, How It Works, anything else)? Resolve the sitemap and each page's scope, not the content itself.

## Context

Feeds ticket 8 (docs content) and ticket 9 (CLI/config reference) — both need a settled structure before writing lands anywhere durable. Can run in parallel with tickets 1/2 — it doesn't depend on messaging or the competitive survey.

## Answer

Grilled live with the maintainer. 23-page sitemap across 4 sidebar groups (Getting Started, Guides, How It Works, Reference) plus a dedicated `/docs` landing page, in that order. Two scope changes from chartering: Wayfinder dropped entirely (internal dogfooding, not a public feature); Architecture Scan deliberately left out of How It Works pending a future map to deepen that feature first. Reference is one page per README's own public command table (init, memory, exec, scan, sync, status, ui, mcp, feedback) — excludes internal `hook` and deprecated `learn` — with `memory`'s subcommands as H2 sections on one page, not split further. Harness Adapters gets one page per harness (Claude Code, Codex, Copilot, Cursor) plus a concept-overview page. Full sitemap and rationale: docs/design/site/docs-information-architecture.md.

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
status: resolved
---
# 2 — Homepage Messaging & Positioning

## Question

What's neuron's actual value prop and headline message for a developer landing on the homepage cold — what does it do, why does it matter over the status quo (plain CLAUDE.md/AGENTS.md prose memory), and what's the call to action? Resolve the headline, the supporting sections' framing, and how (if at all) neuron is positioned against alternatives.

## Context

Feeds ticket 4 (homepage visual prototype) and ticket 7 (homepage build) — a design pass without settled words to design around isn't useful. Use CONTEXT.md's glossary for accurate terminology (hybrid search, harness adapter, wayfinder, etc.) rather than inventing marketing language that drifts from what the tool actually does. Informed by ticket 1's survey.

Was blocked (added 2026-08-15) on Map — MCP Server & Setup/Onboarding Skill Split's Ticket 4 (MCP server shipped) and Ticket 6 (setup/maintenance skill split complete), since a maintainer-submitted positioning-strategy review leaned on MCP/cross-editor support as a differentiator and this ticket shouldn't lock in messaging that promises either before they actually shipped. Both resolved 2026-08-17 (that map has since archived to `tickets-past`), unblocking this ticket. Full competitive-landscape and positioning analysis from that review (candidate positioning statement, three-pillar framing, developer pain points, competitive matrix — none of it independently verified, all of it raw input for this ticket's own grilling session): `docs/design/site/competitive-landscape-and-positioning.md`.

## Answer

Grilled live with the maintainer. Full decision record, including drafted hero copy: `docs/design/site/homepage-messaging-positioning.md`.

**Category framing**: "Local-first memory engine for coding agents" — tightened from the competitive doc's candidate statement to one category noun (memory engine), with local-first foregrounded as the throughline per the maintainer's explicit instruction, not a supporting pillar buried third.

**Hero copy**: H1 "The local-first memory engine for coding agents"; subheadline contrasts by pattern, not product ("Not another cloud memory API. Not another bloated rules file dumped into every prompt...") — no direct Mem0/Zep/CLAUDE.md naming anywhere in hero or supporting copy.

**Section order**: Hero → Pillars → Pain-point section → rest of homepage (Ticket 7's scope). Pillars lead; pain-point section (amnesia tax, rule blindness, bit rot, no product names) follows as reinforcement, not an opening pitch.

**Pillars, in order**: (1) Zero-Cloud Privacy — leads on the maintainer's explicit local-first instruction; (2) Zero-Amnesia Execution; (3) Context Budget Diet. All three map to shipped, verifiable capabilities.

**CTA**: primary = curl install one-liner (`curl -fsSL https://raw.githubusercontent.com/kovartravis/neuron/main/install.sh | sh`), tabbed alongside an npx alternative; "View on GitHub" tertiary.

**Architecture-linter CI framing (idea D)**: greenlit, homepage-light only (one line/small block) — does not un-defer the map's existing Architecture Scan "Not yet specified" fog item, which stays parked as-is.

**Benchmark-proof collateral (idea C)**: ruled out of scope for this map (not deferred) — the competitive doc's figures were illustrative, not measured; a real measurement pass is a separate future effort if ever pursued.

## Comments

- 2026-08-15: Created while chartering Map — neuron.github.io Site (2.5.0). Blocked on Ticket 1 and on Map — MCP Server & Setup/Onboarding Skill Split's Tickets 4 and 6.
- 2026-08-19: Claimed and resolved via live grilling session.

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
status: resolved
---
# 1 — Survey Dev-Tool Marketing + Docs Sites for Patterns

## Question

What do best-in-class developer-tool sites (marketing homepage + docs) actually do well that neuron's site should borrow or deliberately avoid — hero-section structure, how they explain a technical value prop, docs IA, code-sample presentation, whether/how they use a live demo? Survey 4-6 real sites (e.g. Stripe, Linear, Vercel, Resend, Supabase, or closer analogues among local-first/dev-tool CLI products) and produce a markdown summary of concrete, reusable patterns — not just impressions — as a linked asset.

## Context

Chartered directly from the "something like a SaaS would have" framing in the original request. Collected once here so ticket 2 (messaging) and ticket 4 (homepage prototype) don't each re-derive inspiration from scratch.

## Answer

Surveyed 6 sites — Stripe, Linear, Vercel, Resend, Supabase, and Turso (a closer local-first/embedded-database analogue targeting the same AI-agent developer audience) — homepages plus docs landing pages for all but Turso. Full findings with per-pattern citations: docs/design/site/dev-tool-marketing-docs-survey.md.

Nine concrete, reusable patterns found, most load-bearing for Ticket 2/4:

1. H1 states category noun + audience, not a mood (Resend, Turso, Stripe).
2. Subheadline carries the differentiator/"X alternative built on Y" framing the H1 has no room for (Supabase) — a working example of the SEO map's own winnable-query-intent finding.
3. "For AI agents" is a foregrounded primary homepage/docs audience on Resend, Vercel, and Stripe's docs homepage, not a footnote — real precedent for making coding agents neuron's own named primary audience.
4. Docs pages fetchable directly as markdown (docs.stripe.com's .md URL suffix), advertised to human readers too — supplementary note for the llms.txt ticket, not a reopening.
5. One quickstart per language/framework (Resend, Supabase), not a single tabbed page — validates the SEO map's flat one-concept-per-page IA ruling with real precedent.
6. Reference always its own top-level nav item, never blended with narrative guides (all 3 docs IAs fetched) — validates Site's own Ticket 8/9 split.
7. **No homepage surveyed embeds a live/interactive demo** — direct answer to this map's own "live demo?" fog item, leaning no. Caveat: the fetch method may undercount JS-rendered code blocks on Stripe/Supabase specifically, so Ticket 4 should verify live before treating this as fully settled.
8. A dedicated "why the status quo isn't enough" section right after the hero, before feature lists (Turso) — working precedent for the competitive-landscape doc's own amnesia-tax framing.
9. Visible YAML frontmatter in the docs page itself (Vercel), not just hidden JSON-LD — supplementary note for the SEO map's structured-data ticket.

Also flagged patterns to avoid: Stripe's 11-section enterprise-breadth homepage (wrong shape for a single-audience OSS tool) and duplicated near-identical headline copy stacked on itself (Vercel).

Verification note: this is a research ticket — no code/tests to run. The one factual claim needing live re-verification before it's load-bearing is pattern 7's live-demo absence on the two client-rendered sites (see the doc's own Method section).

---
id: eecdcad3-343f-458b-af19-33ee5ed0f293
createdAt: 2026-08-19T13:38:54.297Z
importance: 4
tags:
  - geo
  - seo
  - planning
taskId: null
kind: task
map: 943650ce-f12c-47f6-9c61-63f79305d055
status: unclaimed
---
# 11 — Implement TechArticle/Person JSON-LD on the Docs Page Template

## Question

Map — SEO & GEO Groundwork's Ticket 3 (Structured Data & Schema.org Strategy) decided every docs page carries `TechArticle` JSON-LD uniformly, with `FAQPage` stacked on the four pages Ticket 2 scoped Q&A blocks to, and a shared `Person` (Travis Kovar) fragment reused as `author`. No ticket on either map currently owns wiring that markup into Starlight's docs page rendering — Ticket 7 (Build the Homepage) only implements the homepage's own `WebSite`+`SoftwareApplication`+`FAQPage` stack.

Where should this markup be injected (a shared Starlight component override vs. per-page frontmatter-driven head injection), and does it need Starlight frontmatter fields (datePublished/dateModified) that Ticket 5's scaffolding didn't set up?

## Context

Surfaced while resolving Ticket 8 (Write Docs Content Pages) — the 13 pages that ticket wrote are real `TechArticle` candidates with nothing rendering the markup Ticket 3 already decided. Independent of Ticket 9 (CLI & Config Reference) — those pages need the same template-level markup once they exist, so this ticket should land before or alongside Ticket 9's content, not after.
