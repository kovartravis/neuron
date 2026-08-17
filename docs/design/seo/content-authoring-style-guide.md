# Content-authoring style guide for AI citability

**Date:** 2026-08-17
**Status:** decided — house style for all site copy (homepage, docs,
reference pages). Grilled live with the maintainer against Ticket 6
(Content-Authoring Guidelines for AI Citability), Map — SEO & GEO
Groundwork.

Grounded in the map's chartering research: content with explicit
limitations/attribution sections is reported to get cited measurably more
by AI answer engines than purely promotional copy. This guide turns that
into four concrete, checkable rules, modeled directly on patterns already
live in `README.md` rather than invented from scratch.

## 1. Limitations sections — content-driven, not page-type-driven

A page gets a `## Limitations` section **only if its topic already has a
real caveat surfaced in `README.md`** — the same test as "would this page
have had a limitations note if it were a section of the README?" Don't
manufacture a limitation to fill the section; don't add one to a page
whose topic has no genuine boundary to disclose.

Examples of existing README caveats that carry over to their corresponding
docs page once it exists:

- Recall coverage varies by harness — Cursor and Copilot CLI only get a
  session-start hook, not per-turn (`README.md`'s Recall table) → carries
  to the Harness Adapters page.
- `neuron exec` is purely informational and never blocks the command
  (`README.md` "Command execution gets the same treatment") → carries to
  the CLI Reference page's `exec` entry.
- Recall solves reading memory back; it doesn't make an agent write to it
  (`README.md` "Write-side compliance gets a nudge, not just a reminder")
  → carries to the Getting Started / Configuration pages covering
  write-side enrichment.

A page whose topic has no README-disclosed boundary (e.g. a page that's
purely a command syntax listing) carries no `## Limitations` section —
don't add one for form's sake.

**Heading and placement**: always the literal H2 `## Limitations` (never
reworded per page — reused verbatim so it reads consistently across the
site), and always the **last** section on the page, after any Q&A block
Ticket 2 scoped to that page.

## 2. Source attribution — both senses apply

**Byline attribution**: every page attributes to Travis Kovar as a
`Person`, per Ticket 3's structured-data decision (`Person`, not
`Organization` — solo-maintained OSS project). This is a schema/metadata
concern (Ticket 3's scope), not new copy to write per page — noted here so
the two decisions are read together.

**Evidence-linking attribution**: every quantitative or measured claim
must link to the source that backs it — mirroring `README.md`'s existing
pattern (e.g. "matched a hand-tuned oracle's 0% failure rate... Full
numbers in
[`benchmarks/token-ab/results/.../findings.md`](../../../benchmarks/token-ab/results/11-rerun-gitlog-ab-semantic-mechanism/findings.md)").
A number with no link is not publishable copy. This applies to benchmark
results, A/B test outcomes, and any other claim of the form "X% faster,"
"reduced Y by Z," etc. — link to the file, not just assert the figure.

## 3. Factual/quotable phrasing — banned list + positive rule, both enforced

**Positive rule**: every claim must be falsifiable or backed by a fact or
link. An adjective is not allowed to stand alone as the entire claim — if
copy says a thing is fast, robust, or seamless, it must be immediately
followed by the fact that makes that true (a number, a mechanism, a link),
not left as an assertion on its own.

**Banned-word list** (unverifiable superlatives — reject in review if
found unqualified): best-in-class, revolutionary, seamless, blazing-fast,
cutting-edge, world-class, state-of-the-art, game-changing, effortless,
robust, powerful, next-gen, unparalleled. `README.md` already avoids all
of these as of this ticket (verified by grep against the current file) —
this list documents and locks in that existing practice rather than
introducing a new constraint the current flagship copy doesn't itself
meet.

These two mechanisms are complementary: the banned list catches the most
common offenders outright; the positive rule catches everything the list
doesn't name (any other adjective used as a standalone claim).

## Applying this guide

This house style applies to homepage copy, every docs page, and reference
pages alike. It feeds Site (2.5.0)'s Ticket 2 (Homepage Messaging &
Positioning) directly — that ticket drafts against these four rules
rather than re-deriving a style from scratch.
