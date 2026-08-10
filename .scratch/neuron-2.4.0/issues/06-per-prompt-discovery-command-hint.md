Type: task
Status: unclaimed
Blocked by: none (31 resolved on neuron-2.3.0 before this ticket moved)
Band: context cost

# 06 — Per-Prompt Discovery-Command Hint

## Question

Right now, a future agent's only view into what a prior session decided or
built is whatever fits through the hook's per-epoch injection budget (ticket
07) — so a task like "write the README from everything neuron has learned"
only ever sees a fraction, via a mechanism (`neuron memory list`/`query`)
that already exists but the agent has no particular reason to reach for.

On every pre-prompt turn (`hook.ts`), after the existing relevance-gated
recall runs (`memory.query({ text: prompt, limit: 10 })`, store-wide, no
category filter, then ADR 0012's `ftsMatched` gate), run one cheap
`SELECT COUNT(*)` against the same FTS index using the same cleaned query
text (`cleanFtsQuery`) and the same store-wide scope, with no `LIMIT`. If
that count exceeds how many results actually got injected this turn, append
a literal, ready-to-run command to the pre-prompt payload — not a generic
"you can search" pointer, but the actual command with the actual delta, e.g.
`neuron memory query "<prompt text>" --limit 12`. Fires only when there's a
real, counted gap; a turn where recall already surfaced everything gets no
hint at all.

This deliberately does **not** get a session-start equivalent — a generic
"the query tool exists" note at session-start has no gap to point at yet
(nothing's been asked), so it would be exactly the kind of resident-but-
unearned content ticket 09 already trimmed elsewhere. The hint counts
against the ordinary per-turn `PRE_PROMPT_CHAR_BUDGET` (ticket 07) like any
other content — no special reservation, unlike ticket 11's architecture-index
carve-out, because this content is conditional by construction and never
needs a guarantee of appearing.

Open to the build session: exact construction of the command string (prompt
text sanitization/truncation/quoting for display, whether to name specific
categories or leave it store-wide matching the query it's extending).

## Comments

- Graduated 2026-08-09 from a grilling session that started as a
  postscript to ticket 13's own resolution — the maintainer wants future
  sessions' work reliably discoverable for downstream synthesis tasks (the
  README was the concrete example), modeled explicitly on tickets 28-30's
  index+detail-card restructuring of the architecture card, but for a
  different mechanism: tickets 28-30 make detail reachable via *ordinary
  relevance recall* (no hint needed, the right card just ranks in); this
  ticket instead has the hook *actively teach* the agent that the broader
  query surface exists, with a concrete, parameterized, ready-to-run
  command rather than a static repeated note.
- **Not the same redundancy ticket 08 measured against `history`.** Ticket
  08 found `history`'s pre-prompt injection ~100% textually redundant
  against `git log` because the same content repeats; this hint's content
  is parameterized by that turn's own prompt text, so it is not the same
  string twice — the redundancy concern doesn't transfer.
- Store-wide scope (not restricted to `history`/`decisions`) was a direct
  maintainer call: match whatever the existing pre-prompt query already
  searches, so the reported count is never a silent undercount, and
  `learning` entries are just as plausibly relevant to a doc-writing task
  as `history`/`decisions`.
- Related to, but distinct from, the standing fog item on this map about
  whether `git log` itself should become a hook-searchable source (see
  ticket 14 and "Not yet specified" → "The git-log-as-searchable-resident-
  source feature itself") — that is a different data source (git history,
  not neuron's own memory store) explored by a separate ticket; this one is
  scoped to neuron's own `memories` table.
- Graduates [33](07-measure-discovery-hint-usage.md) as its own
  proof-of-value ticket rather than asserting the hint gets used.
