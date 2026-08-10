Type: task
Status: resolved
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

## Answer

Built on `hook.ts`'s existing pre-prompt path. A new `NeuronMemory.countFtsMatches(text)`
(`src/index.ts`) runs `cleanFtsQuery`'s cleaned text against `memories_fts`
directly — same store-wide scope and superseded-exclusion as `queryVector`'s
keyword leg, but a raw `COUNT(*)` with no `LIMIT` and no ranking. A new
`buildDiscoveryHint()` (`src/harnesses/discoveryHint.ts`) turns a real gap
into a single bullet-formatted line matching `formatMemoryEntry`'s own
`- [...]` convention (`- [more available] N more match(es) not shown — run:
neuron memory query "<prompt>" --limit <total>`), dropped whole (never
truncated) if it doesn't fit whatever budget remains — no reserved
allotment, per the ticket's own instruction.

**The one real design call the build session had to make wasn't in the
ticket's "open to the build session" list:** what "how many results
actually got injected this turn" means once the session ledger enters the
picture. Comparing the FTS total against the *final* injected count
(`turnIds.length`, after ledger dedup and char-budget packing) is the most
literal reading of the ticket text, but it breaks a guarantee several
existing tests already encode — a repeat turn over an already-shown entry
must stay silent (the ledger's whole reason to exist). Under that literal
reading, a single-entry store makes the hint re-fire every subsequent turn
pointing at the same one entry the agent already saw, because the ledger
(correctly) drops it from `turnIds` every time. Reproduced live: four of
the pre-existing dedup/ledger tests in `hook.test.ts` turned red the moment
the comparison used the post-dedup count.

Resolved by comparing against `results.length` instead — this turn's
gated, RRF-ranked recall capped at the query's own `limit: 10`, *before*
ledger dedup and *before* `buildPayload`'s budget-packing. That isolates
exactly the gap this ticket is actually about (the fixed `limit: 10` on
`memory.query({ text, limit: 10 })` hiding the tail of a large match set —
the ticket's own motivating case, "write the README from everything neuron
has learned"), without coupling the hint to session-scoped dedup (already
ticket 07/the ledger's job) or to this turn's own char-budget truncation
(also already ticket 07's job, self-reporting via `recallCost` telemetry).
Both the no-`sessionId` and `sessionId` pre-prompt branches use the same
`results.length` comparison for consistency, even though the no-`sessionId`
branch has no ledger to conflict with.

Prompt text for display: collapsed whitespace, truncated to 80 chars with
`...`, backslash/double-quote escaped so it reads as a valid quoted shell
argument (`src/harnesses/discoveryHint.ts`'s `sanitizeForHint`) — it is
never actually executed by neuron, only shown.

Also changed both pre-prompt branches' final emit-or-not check from
`includedIds.length === 0` to `!text`, since the hint can now make `text`
non-empty even when zero memory entries were injected (an all-dedup'd turn
with a real FTS gap still deserves the hint, per the ticket).

New coverage: `src/harnesses/discoveryHint.test.ts` (5 unit tests on
`buildDiscoveryHint` — gap detection, whole-line-drop on budget miss,
truncation/escaping) plus two `hook.test.ts` integration cases (hint fires
across a real `limit: 10` gap; stays silent when a turn's recall already
covered every store-wide match). Full existing suite (124 tests across
`hook.test.ts` + `harnesses/`) green, plus `tsc --noEmit` and `npm run
build` clean. The one pre-existing failure in the wider suite
(`concurrency-stress.test.ts`'s Pillar 8) is unrelated and pre-existing —
reproduced identically on a clean stash of this ticket's changes, itself a
`duplicate column name: scope` schema-migration race unconnected to this
ticket's files.
