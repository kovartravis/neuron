Type: task
Status: resolved
Blocked by: 13, 14

# 16 — Curate This Repo's `.neuron/` Store as the Showcase

## Question

The maintainer's chosen showcase deliverable for "dogfood neuron everywhere
possible" isn't a separate demo doc or a screenshot gallery — it's this
repo's own `.neuron/` store: a curious reader should be able to look at
`.neuron/learning.md`, `.neuron/history.md`, `.neuron/decisions.md` (and
the architecture cards from `neuron scan`) directly and see a memory store
actually being used well, not a toy example.

This ticket is blocked on both audits because what the store looks like by
the time this runs depends on their outcomes: [13](13-audit-dogfooding-gaps.md)'s
fixes change what actually gets recorded and how (e.g. if CI or `neuron
scan` gets newly wired up, the store gains content it doesn't have today);
[14](14-neuron-as-tracker-design.md)'s resolution may change whether
wayfinder maps/tickets themselves become part of the store's visible
content, which would materially change what "curated" even means here.

Resolve, once unblocked:
- Does the store need active curation (pruning noise, ensuring category
  breadth so a reader sees `learning`/`history`/`decisions` — or whatever
  the current category set is post-14 — each meaningfully populated), or
  is organic usage from the other tickets already sufficient?
- Does this need a pointer from `README.md` ("see our own store") or does
  it stay something a reader discovers on their own by browsing `.neuron/`?
- Is there a quality bar to hit (e.g. no single-token entries — see this
  map's own standing fog item on write-time content-integrity) before this
  is genuinely showcase-worthy, or does that belong to a separate ticket?

## Comments

- Chartered 2026-08-10 in a breadth-first grilling session as the second,
  separate track of "dogfood neuron everywhere possible" — the maintainer
  explicitly wanted process-rigor ([13](13-audit-dogfooding-gaps.md)) and
  showcase kept as separate tracks with different bars for "done," and
  chose "the repo's own store" over a dedicated demo doc or UI screenshots
  when asked what the showcase deliverable actually is.

## Answer

**Active curation was needed — the store had real, showcase-undermining
noise, now fixed.** `neuron status --health` found 5 live duplicate groups:
architecture cards misfiled under `decisions` during the pre-ticket-01
`scan.category` alias bug, each a stale (2026-08-09) near-duplicate of the
correct, newer (2026-08-10) `architecture`-category card — exactly the "5
real architecture-card near-dups" ticket 20's own repair pass had already
found and correctly left for a human call. Deleted the 5 stale `decisions`
copies (maintainer-confirmed), matching this repo's own recorded precedent
for the same duplicate-card problem (ticket 37, `neuron-2.2.0`: "delete...
rather than migrating old ids forward"). `--health` now reports 0 duplicate
groups.

A second, larger sweep (content-length check, since the map's own fog
already flagged single-token entries as a known hazard) found 204 of 653
entries — 31% of the store — were pure junk from two already-fixed
historical bugs, not real content: 141 were literal test-fixture strings
("Scope Alpha rule", "original content", "Old entry", etc.) that leaked
into this real repo's `.neuron/` from `src/cli.test.ts` /
`src/commands/history.test.ts` / `src/commands/memory.test.ts` before
tickets 42 and 47 (`neuron-2.2.0`, both closed 2026-08-04) isolated CLI and
e2e tests from the real store; 63 were single-word truncations
("Completed", "Updated", "Fix", "Queried"...) from the shell
argv-word-splitting bug fixed in v2.1.2. Confirmed both root causes are
dead (no matching entries after 2026-08-05; ticket 47's own resolution
verified byte-identical `.neuron/*.md` across repeated isolated runs) before
deleting — maintainer-confirmed given the scale (204 entries). `npm test`
678/678, `tsc` clean, `git diff --stat .neuron/` shows only deletions in
substance (some line-count noise from the markdown adapter's whole-file
rewrite). Store afterward: `learning` 126, `history` 219, `decisions` 89,
`architecture` 15 entries — all four categories meaningfully populated,
importance histogram is a normal 3/4/5 spread with no more `1`s (the junk
skewed toward the low end).

**README pointer: added.** The `## 📁 What it looks like in your repo`
section illustrated the format with a synthetic snippet (a fabricated
"Chose Postgres over SQLite" entry) — kept, since it demonstrates the
declared-field-schema feature (`reviewedBy`/`ticket`) more clearly than a
random real entry would, but added a direct pointer immediately after it to
this repo's own `.neuron/*.md` files as the real, actively-used example,
answering the ticket's own "does this stay something a reader discovers on
their own" question: no, point at it explicitly.

**Quality bar:** met, and the two curation actions above *are* the bar —
zero duplicate groups, zero contentless entries, meaningful category
breadth, a direct README pointer. No further ticket needed for what this
audit found; both root causes were already fixed by prior tickets, so
there's no recurrence risk this ticket needs to hand off.
