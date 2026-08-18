# Dev-tool marketing & docs site survey

**Date:** 2026-08-18
**Ticket:** 1 — Survey Dev-Tool Marketing + Docs Sites for Patterns
(Map — neuron.github.io Site (2.5.0))
**Status:** research findings, feeding Ticket 2 (Homepage Messaging &
Positioning) and Ticket 4 (Homepage Visual & Brand Direction).

## Method and a caveat on confidence

Six sites surveyed — the five named in the ticket (Stripe, Linear, Vercel,
Resend, Supabase) plus one closer analogue among local-first/dev-tool CLI
products (Turso, an embedded/local-first SQLite platform targeting the same
"AI agent" developer audience neuron does). Homepages and docs landing pages
were fetched and read directly; findings below are grounded in that content,
not general impressions.

**Caveat:** the fetch tool reads server-rendered/static HTML converted to
markdown. Several of these sites (Stripe and Supabase in particular) are
known — per outside design-breakdown sources, not independently confirmed
here against the live rendered DOM — to use client-side-rendered interactive
code-tab components in their hero sections. The static fetch may therefore
**undercount** homepage code samples relative to what a real browser shows.
Where this matters (pattern 7, below), it's flagged explicitly rather than
stated as fact — Ticket 4's `/prototype` session should verify live in a
browser before treating "no code on the homepage" as settled.

## Sites surveyed

| Site | Category | Docs IA fetched |
|---|---|---|
| [stripe.com](https://stripe.com) / [docs.stripe.com](https://docs.stripe.com) | Payments infra, enterprise-heavy | Yes |
| [linear.app](https://linear.app) / [linear.app/docs](https://linear.app/docs) | Product/issue tracking SaaS | Yes |
| [vercel.com](https://vercel.com) / [vercel.com/docs](https://vercel.com/docs) | Deployment/hosting infra | Yes |
| [resend.com](https://resend.com) / [resend.com/docs](https://resend.com/docs) | Email API, small focused product | Yes |
| [supabase.com](https://supabase.com) / [supabase.com/docs](https://supabase.com/docs) | Open-source backend platform | Yes |
| [turso.tech](https://turso.tech) | Local-first embedded database (closest analogue to neuron's audience) | No (homepage only) |

## Concrete, reusable patterns

1. **The H1 states what the tool *is* plus who it's for, not a mood.**
   Resend: "Resend is the email API for developers." Turso: "The Database
   for the Age of AI Agents." Neither leans on adjectives — both name the
   category noun (email API, database) and the audience (developers, AI
   agents) in one clause. Stripe's H1 ("Financial infrastructure to grow
   your revenue") does the same for its own audience. Directly reusable:
   neuron's H1 should name what it is (a category noun) and who it's for
   (coding agents / developers running them), not a tagline.

2. **The subheadline carries the differentiator the H1 has no room for.**
   Supabase's subheadline — "an open source Firebase alternative built on
   Postgres" — packs category + differentiator ("alternative to X") +
   technical grounding ("built on Y") into one line. This is the same
   "X vs Y" / "alternative to" framing this map's own keyword research
   (Ticket 1 on the SEO & GEO Groundwork map) found as the open, winnable
   query intent — Supabase's subheadline is a working example of that
   positioning technique on a real homepage, not just a search-query
   pattern.

3. **"For AI agents" is now a first-class, foregrounded homepage/docs
   audience, not a footnote.** Resend's homepage explicitly opens with "For
   AI agents and automation, use the tools below" ahead of any traditional
   sales copy. Vercel's docs homepage leads with a "Build with AI" section
   (AI Gateway, agents, Sandbox) *before* "Build your applications."
   Stripe's docs homepage's very first content block is "Start here:
   Integrate with Stripe using skills and plugins" — install the Stripe
   CLI, run `stripe agent setup` — ahead of any human-facing quickstart.
   This is direct, working precedent (not just a hypothesis from the
   competitive-landscape doc) for making "coding agent" neuron's homepage's
   named primary audience rather than a secondary use case.

4. **Docs pages are directly agent-fetchable as markdown, and that's
   advertised, not hidden.** `docs.stripe.com` pages are fetchable at a
   literal `.md` URL suffix (e.g. `docs.stripe.com/agents.md`), and the
   docs homepage tells a *human* reader how to do this too ("Read this page
   in your terminal: install the Stripe CLI... and run `stripe docs`").
   This is a stronger, more concrete version of the plain-markdown/llms.txt
   approach this map's SEO & GEO Groundwork sibling map already committed
   to (Ticket 5, llms.txt/llms-full.txt) — Stripe's version makes *every*
   docs page individually fetchable, not just a curated top-level index.
   Worth a note back to that ticket's own scope, not a re-opening of it.

5. **One quickstart per language/framework, not one quickstart with a
   language switcher.** Resend ships 13 separate quickstart pages (a card
   grid linking to `/nodejs-quickstart`, `/python-quickstart`, etc.) rather
   than a single page with in-page language tabs. Supabase does the same
   at the concept level — Database/Auth/Storage/Realtime are fully separate
   doc trees, each with its own quickstart. This directly validates (real
   precedent, not just a design choice made in the abstract) the SEO & GEO
   Groundwork map's own Ticket 2 ruling: flat, one-concept-per-page URLs
   over grouped multi-topic pages.

6. **Reference is always its own top-level nav item, never blended into
   narrative guides.** True across every docs IA fetched: Stripe
   (product-organized reference pages), Supabase ("Reference" as a
   dedicated top-nav category alongside Start/Products/Build/Manage), and
   Vercel (a separate `/docs/sitemap`). No site interleaves hand-written
   "how this works" prose and API/CLI reference in the same page tree.
   Validates Site (2.5.0)'s existing split between Ticket 8 (docs content /
   "How It Works") and Ticket 9 (CLI & Config Reference) as separate
   tracks, not a structural risk to reconsider.

7. **No homepage surveyed shows a live/interactive demo.** None of the six
   — including Turso, the closest audience-analogue — embeds an
   asciinema-style terminal recording, embedded playground, or other
   interactive demo directly on the marketing homepage. Where CLI usage
   appears at all (Turso's `npx turso@latest`, Vercel's deploy commands
   referenced in docs, not the homepage), it's static text, not something
   interactive. This is a direct, concrete answer to this map's own "Not
   yet specified" fog item ("whether the homepage needs a live/interactive
   demo") — the surveyed precedent leans toward **no**, a live demo is not
   a homepage norm in this category. Caveat from the Method section above
   still applies to Stripe/Supabase specifically — verify live before
   Ticket 4 treats this as fully settled for every candidate.

8. **A dedicated "why the status quo isn't enough" section, immediately
   after the hero, before any feature list.** Turso's homepage runs
   Hero → "Why Agents Need a New Database" → feature breakdown →
   testimonials → use cases. That section exists specifically to
   articulate the pain point of the *previous* default tool before
   describing the replacement — structurally, this is the same
   pain-point-first move the competitive-landscape doc
   (`docs/design/site/competitive-landscape-and-positioning.md`) already
   proposed for neuron's "amnesia tax" framing. Turso is now a working,
   audience-adjacent example of that structure shipping on a real
   homepage, not just a hypothesis.

9. **Structured metadata can be visible in the page itself, not only
   hidden JSON-LD.** Vercel's fetched docs page carried literal YAML
   frontmatter at the top of the content (`title`, `canonical_url`,
   `summary`, `prerequisites`, `related`, `last_updated`) — a
   machine-readable self-description a crawler or citing AI engine can
   read without parsing embedded `<script type="application/ld+json">`.
   Worth flagging to the SEO & GEO Groundwork map's Ticket 3 (Structured
   Data & Schema.org Strategy) as a supplementary technique to consider
   alongside the JSON-LD already decided there — not a contradiction of
   that decision, an addition worth a look.

## Patterns to deliberately avoid

- **Section sprawl from an enterprise-breadth homepage.** Stripe's
  homepage runs eleven distinct sections (customer logos, product grid,
  personalization form, enterprise case studies, startup spotlights,
  builder testimonials, dev-infra section, news carousel, and more) —
  appropriate for a company selling across many verticals and company
  sizes, wrong shape for a single-audience open-source dev tool. Resend
  and Turso's shorter, tighter section counts (5-9 sections, one audience)
  are the closer model for neuron's own homepage scope.
- **Duplicated headline copy competing with itself.** Vercel's fetch showed
  a promo banner directly above a hero headline making a similar claim in
  different words — reads as redundant rather than reinforcing. One clear
  claim per screen, not near-duplicate phrasings stacked on top of each
  other.

## Feeds forward

- **Ticket 2 (Homepage Messaging & Positioning)**: patterns 1, 2, 3, and 8
  bear directly on headline/subheadline construction and the "why now"
  framing — read alongside `competitive-landscape-and-positioning.md`
  before that grilling session.
- **Ticket 4 (Homepage Visual & Brand Direction)**: pattern 7 answers the
  live-demo fog item (lean no, verify live per the Method caveat); the
  "Patterns to deliberately avoid" section bounds the homepage's section
  count before prototyping starts.
- **SEO & GEO Groundwork map**: patterns 4 and 9 are supplementary notes
  for that map's own Tickets 3 and 5 — not a reopening of either, both
  already resolved.
