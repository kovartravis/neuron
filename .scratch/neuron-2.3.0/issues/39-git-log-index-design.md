Type: grilling
Status: resolved
Blocked by: (none)
Band: context cost

# 39 — Git-Log Index: Replace-vs-Supplement and Refresh Mechanism

## Question

Now that [14](14-git-log-hook-vs-agent-log-ab.md) has tested the premise
(hook-injected git-log search beat agent-invoked `git log` on every raw
number, though technically "no measured difference" by the harness's own
spread discipline — see `14`'s Answer) and the maintainer has ruled to
build it, how does the feature actually work: does a git-log index REPLACE
the `history` category's write step in the generated protocol block
(`sessionEndStep()` in `src/config/protocolBlock.ts`), only SUPPLEMENT it,
and does the index refresh via an installed git hook or a
check-HEAD-on-read comparison run at session-start/pre-prompt?

## Context

Carried over verbatim from this map's own fog (map.md's "Not yet
specified" — "The git-log-as-searchable-resident-source feature itself"),
which explicitly could not be ticketed until `14` answered whether the
premise held. It now has.

Two design questions, both real:

1. **Refresh mechanism.** A git hook (`post-commit`/`post-merge`) needs a
   separate install step during `neuron init` and can be silently bypassed
   (uninstalled, `--no-verify`'d around, or just never installed on a
   pre-existing clone). The map's own working lean is a check-HEAD-on-read
   comparison instead — compare the index's last-indexed commit SHA
   against `git rev-parse HEAD` at session-start/pre-prompt and re-index
   the delta if stale — which needs no install step and can't be silently
   skipped, but this was never decided, only leaned toward.
2. **Replace vs. supplement the `history` write step.** `history` entries
   that never correspond to any commit (this repo's own `.neuron/history.md`
   has examples — pure narrative/decision entries with no matching commit)
   are exactly what a git-log index cannot cover. If the index REPLACES the
   `history` write step in the protocol block, those entries stop getting
   captured anywhere. If it SUPPLEMENTS (both stay), the write-side cost
   `09` fought to shrink partially comes back. These are materially
   different products, not an implementation detail.

`14`'s task set and its git-log search prototype (`gitlog-search.mjs`) used
a generic `git log --grep` OR-matched keyword search — worth deciding
whether the shipped index reuses that primitive or something more
structured (a persisted per-commit summary, searchable via FTS like the
existing memory store) now that it's not just a measurement prototype.

## Scope

1. Rule refresh mechanism: check-HEAD-on-read vs. installed git hook (or
   both, with one as fallback).
2. Rule replace vs. supplement for the `history` write step, and what
   happens to entries with no corresponding commit under a "replace"
   ruling.
3. Rule the index's storage/search primitive: `gitlog-search.mjs`'s
   `git log --grep` shell-out verbatim, or a persisted structured index.
4. Rule where in the hook pipeline injection happens: session-start only
   (mirroring the architecture card), pre-prompt only (mirroring ordinary
   relevance recall), or both.
5. Scope what "the index" actually covers — full `git log`, or bounded
   (e.g. last N commits, or only commits touching paths related to the
   current prompt) — given `09`'s resident-footprint discipline this band
   has held to throughout.

## Verification

- Every Scope item has an explicit ruling, not left open.
- The ruling on item 2 (replace/supplement) explicitly addresses the
  no-corresponding-commit gap, not just the common case.
- Full design recorded either as an ADR (if it changes a documented
  contract like ADR 0014's adapter architecture) or inline in this
  ticket's Answer if it doesn't rise to that level — same judgment call
  `09` made about ADR 0014.

## Deliverables

- [x] Rulings on all five Scope items, grilled with the maintainer
- [x] Unblocks [40 — Implement the Git-Log Index](40-implement-git-log-index.md)

## Answer

Grilled all five original Scope items with the maintainer via `AskUserQuestion`. Item 3's answer overturned an assumption mid-session, which reopened item 1 and required two follow-on questions beyond the original five — recorded together below.

**1. Refresh mechanism: check-HEAD-on-read, incremental, with a one-time backfill.** Compare a stored last-indexed commit SHA against `git rev-parse HEAD` at session-start/pre-prompt; embed only the commits since that SHA. First-ever run on a given repo pays a one-time full-history backfill (every commit gets embedded once); steady-state cost after that is proportional to commits-since-last-turn, not repo size. No install step, can't be silently bypassed — same reasoning as the map's original working lean, now load-bearing rather than moot (see item 3).

**2. Replace vs. supplement: supplement, for now.** The `history` write step in `sessionEndStep()` (`src/config/protocolBlock.ts`) stays exactly as-is. A full replace is explicitly **deferred**, not ruled out — it needs a real home for commit-less entries (pure narrative/decision content with no matching commit, which this repo's own `.neuron/history.md` has real examples of) before it can be considered, and that's a separate, not-yet-chartered design question. Whoever eventually tackles replace should treat "where do commit-less entries go" as its own prerequisite ticket, not something to solve inline.

**3. Storage/search primitive: semantic embedding match, not `git log --grep`** — this is a real revision of the ticket's own framing, not a straightforward pick between the two options originally scoped. Built and ran a small offline, zero-spend comparison (`benchmarks/token-ab/results/39-git-log-term-extraction-ab/compare.mjs`) against ticket 14's own three real tasks, each of which has a maintainer-hand-verified `gitLogQuery` (e.g. `['DualStorageRouter', 'reseed', 'strict mirror']`) that ticket 14 confirmed surfaces the right commit. Tested two ways of deriving `--grep` terms automatically from the raw prompt (`Intl.Segmenter` word candidates vs. `compromise` noun-phrase candidates, both ranked by embedding cosine similarity to the whole prompt) — **both scored near-zero overlap against the verified terms on all three tasks.** Root cause, confirmed by inspecting the actual commits each method surfaced: ticket 14's gold terms are internal code-symbol names (`DualStorageRouter`, `rollEpoch`, `clearLedger`) that **never appear in the prompt's own words at all** — they're vocabulary a domain expert would know to search for only after already knowing the answer, not something any purely extractive method can recover from the question text. This means ticket 14's favorable result was measured against an oracle, not the mechanism that could actually ship — a real, previously-undisclosed gap in what `14` had shown.

Ruled instead: embed each commit's subject+body once into a new `git_log_index` SQLite table in neuron's existing DB (columns: hash, subject, body, embedding BLOB, committed_at, last-indexed-SHA meta), searched with the exact same in-process linear dot-product scan `memories`/`query()` already uses (embeddings are pre-normalized, so dot product is cosine similarity) — no new infra, no ANN index, no new dependency. At query time, embed the prompt and rank indexed commits by similarity. This sidesteps the vocabulary-mismatch problem entirely, the same way ordinary `memory.query({text: prompt})` already does for memory content.

**No markdown mirror, and no ADR.** Unlike `memories`, `git_log_index` has no markdown counterpart — git itself, already versioned on disk, is the source of truth; this table is a derived cache over content that already exists elsewhere, not authoritative content neuron owns. ADR 0011/0016's md/vector storage-mode vocabulary doesn't apply to it, and no existing documented contract (ADR 0011, 0014, 0016) changes as a result — this is a new, separate mechanism alongside them, not a revision to any of them. Confirmed with the maintainer that this reasoning belongs inline here, not a new ADR (the same call `09` made about ADR 0014).

**Consequence for the term-extraction sub-question this ticket's own grilling opened: moot.** Semantic match needs no discrete `--grep` terms — it embeds the whole (cleaned) prompt directly, the same input `memory.query` already takes. The `compromise` npm dependency installed mid-session to run the comparison above was uninstalled once semantic match was ruled; `package.json` has no new dependency from this ticket. Reusing the prompt embedding `hook.ts`'s ordinary pre-prompt relevance query already computes (rather than embedding the prompt a second time) is a real efficiency opportunity, but it's an implementation detail for `40`, not a structural decision — `memory.query()` has no exposed precomputed-embedding parameter today, so `40` will decide whether that's worth adding or whether a second local embed call (cheap, no network/LLM cost) is simply acceptable.

**4. Injection point: pre-prompt only, keyed off the prompt's own embedding.** Same reasoning as originally scoped — ticket 14's own tasks were pre-prompt-shaped (a real question needing a specific past decision), and there's no natural query to embed against at session-start (no prompt exists yet). Unaffected by item 3's revision.

**5. Scope: full history, bounded output only.** The index backfills every commit once (item 1), so "full history" no longer carries a live per-turn cost the way an unbounded live `git log --all` shell-out would have under the original grep framing — the ongoing cost is indexing new commits since last check, not searching the whole history every turn. Output stays bounded: top-K matches (mirroring `gitlog-search.mjs`'s `maxCommits=6`), each truncated (mirroring its `bodyChars=240`) — exact constants are `40`'s to tune, not a structural ruling.

**6. Relevance gating (surfaced mid-session, not one of the original five).** The semantic search reuses the existing ADR 0012 relevance-gate machinery rather than always injecting its top-K regardless of score — silence on a genuinely unrelated prompt beats injecting weakly-related commits just because something has to rank #1, the same posture ordinary memory recall already takes.

**7. Ticket-number collision across concurrent wayfinder maps (inherited from `14`'s own findings, surfaced again via `40`'s Context, not one of the original five).** Ruled to accept as a disclosed limitation for now, not solve in this ticket. No map/directory metadata exists on a commit to disambiguate from — a commit message just says "ticket 14," and semantic match is exactly as capable of conflating two same-numbered tickets from different maps as literal grep was (this repo's own commit convention, `(ticket N, <map-slug>)`, could resolve it in a future ticket, but that's new scope this one didn't chart). Ship with an explicit caveat in the injected note, same posture `gitlog-search.mjs`'s prototype already takes ("may be incomplete, verify yourself").

Unblocks [40 — Implement the Git-Log Index](40-implement-git-log-index.md). Graduated [43 — Re-run the Git-Log A/B Against the Real (Semantic) Mechanism](43-rerun-gitlog-ab-semantic-mechanism.md), blocked by `40`, since `14`'s original favorable numbers were measured against oracle search terms this ticket's own evidence shows the real mechanism cannot reach on its own — the real mechanism needs its own measurement, not an inherited one.
