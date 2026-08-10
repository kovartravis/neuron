Type: task
Status: unclaimed
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
