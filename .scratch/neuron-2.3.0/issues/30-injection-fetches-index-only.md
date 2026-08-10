Type: task
Status: resolved
Blocked by: 28
Band: context cost

# 30 — Injection Fetches Only the Index; Module Cards Surface via Ordinary Recall

## Question

Once the architecture card is split into an index plus per-module cards
([28](28-architecture-index-and-module-cards.md)), what should `hook.ts`
actually inject, and does `27`'s structural compression still have a job?

## Context

`25` and `27` both exist to solve "the architecture card is bigger than the
injection budget" — but `28` changes the premise: the index is small *by
construction* (module names, paths, file counts — no per-file detail), so
for a typical repo it should fit the budget without any compression at
all. Per-module detail no longer needs to be force-fit into the session-
start/first-pre-prompt payload at all — per the design resolved this
session, it surfaces on its own through the *existing* pre-prompt
relevance query (`memory.query({ text: prompt, ... })`) once module cards
are ordinary queryable entries, since a prompt that's actually about a
given module will naturally rank that module's card the same way it ranks
any other relevant memory.

This ticket doesn't invalidate `25`'s or `27`'s underlying lessons — fetch
by stable id, not a ranked query; never cut silently — it applies them to
the new, smaller artifact instead of retiring them wholesale.

## Scope

1. `fetchArchitectureCardPayload` (`hook.ts`) fetches the index only, via
   `findById(blueprintCardId(category))` — same stable-id principle `25`
   established, now pointed at the smaller artifact.
2. **Decide `compressArchitectureCard`'s fate**: it was built to parse and
   degrade the *old* monolithic shape (`### 🧩 module` sections each with
   full file lists). The new index has a different shape (one line per
   module, no per-file section at all). Options: adapt it to a much
   simpler cap on the new index's module-list lines (same "never silent"
   discipline, far less machinery needed since there's no per-file detail
   left to strip), or retire it if the index reliably fits without any
   compression on realistic repo sizes — measure before deciding, per this
   map's own standing rule (`26` already got burned once by assuming
   instead of measuring).
3. **No new fetch for module cards** — this is the point of the reused-
   recall design. Don't add a second explicit query here; if ordinary
   pre-prompt recall doesn't reliably surface a relevant module's card in
   practice, that's a finding to record (possibly reopening the "explicit
   lookup" alternative the maintainer's `AskUserQuestion` answer declined
   this session), not something to route around by building the explicit
   mechanism anyway.
4. Session-start and the first-`pre-prompt`-of-epoch call site (`11`) both
   go through the same `fetchArchitectureCardPayload` — confirm both still
   behave correctly with the smaller index.

## Verification

- Real measured index size on this repo's actual 14 modules, compared
  honestly against the 6,000-character budget — report whether compression
  is even still needed, don't assume.
- A pre-prompt query whose text is clearly about a specific module (e.g.
  mentioning `src/harnesses` by name or a symbol only that module exports)
  surfaces that module's card through the *existing* recall path, with no
  new code added to make it happen — demonstrating the reused-mechanism
  design actually works before calling this ticket resolved.
- Existing `hook.test.ts` coverage for the architecture-card injection
  (first-pre-prompt re-injection, stable-id fetch surviving crowding,
  degrade-to-empty-when-no-card) still passes against the new index shape,
  updated where the old monolithic-shape assumptions no longer apply.
- `24`'s A/B harness content (`captured-card.txt`) refreshed against the
  final index-only injected payload.

## Deliverables

- [x] `fetchArchitectureCardPayload` fetches the index only
- [x] `compressArchitectureCard` adapted or retired, decided from a real
      measurement, not an assumption
- [x] Demonstrated: a module-relevant prompt recalls that module's card via
      existing pre-prompt recall, unmodified
- [x] `24`'s captured card content refreshed to match

## Answer

**Item 1 (index-only fetch) was already true by construction** — `28` moved
`blueprintCardId(category)` to identify the index specifically, so
`fetchArchitectureCardPayload`'s existing stable-id fetch was already
pulling only the index. Verified, not changed.

**Item 2 — adapted, not retired.** Measured this repo's real post-`28`/`29`
index honestly first, per this map's own standing rule (`26` got burned once
assuming instead of measuring): 1,591 chars against the 6,000-char
`SESSION_START_CHAR_BUDGET` — 26.5%, comfortably under. Per-module-list-line
cost is small (~41 bytes/line here), so this repo would need on the order of
100+ modules before module-list growth alone approached the cap — but the
header also grows with the dependency contract independent of module count,
so an unbounded-growth path still exists. Retiring compression outright
would mean a future large-monorepo index silently blows the budget with no
graceful path — `25`'s own title ("truncate instead of drop when oversized")
is a standing discipline this ticket owes forward, not something to drop
just because the artifact got smaller. Rewrote `compressArchitectureCard`
(`src/scanner/compressCard.ts`) from scratch for the new shape: the old
per-file/per-module structural parser (`### 🧩` headings, purpose-stripping)
is gone entirely — there's no per-file detail left in the index to strip.
The new version keeps the header (purpose/fidelity/dependencies/subsystem
map) whole, then includes as many complete `## 📦 Primary Subsystems`
module-list lines as fit — never cutting a line in half — with the same
"reserve the omission-note budget before laying out anything" discipline
25/27 established, now sized for the much shorter note this shape needs
(160 chars vs. the old 220). Falls back to a marked hard truncation
(`...[truncated]`) for content with no recognizable module-list heading at
all (the same degrade path `hook.test.ts`'s pre-existing oversized-card test
already exercises, unmodified). Much less code than the version it replaces
— confirms the "far less machinery needed" prediction in this ticket's own
Scope.

**Item 3 (no new fetch for module cards) surfaced a real bug, not just a
confirmation.** Dogfooding a live `session-start` call against this repo's
own store (no prompt in play at all) showed a full per-module detail card
(`ui`) riding along in the injected payload — reproduced this session's own
system-reminder context, which had literally been fed the `ui` module's full
card at the start of this conversation. Root cause: `fetchArchitectureCardPayload`'s
*existing* additive top-N-in-category query (`memory.query({categories:
[category], limit: 4})`, pre-dating `28`) was built when only the monolithic
card and unrelated decisions shared the category — post-`28`, every module
card shares the same category and tags as the index, so that query now
matches real module details unconditionally, exactly the un-budgeted
per-module content this ticket's whole index/module split exists to avoid.
Fixed in `src/commands/hook.ts`: the additive query now excludes every
module id belonging to the fetched index (`parseModuleListFromIndex` +
`moduleCardId`, both reused from `ingest.ts` unchanged), not just the
index's own id. Module detail now surfaces *only* through the pre-prompt
relevance query, matching the design `28` actually specified. New regression
test in `hook.test.ts` plants an index + a real module card sharing category
and tags, confirms the module card never appears in a `session-start`
injection. This is the one genuinely new piece of code this ticket
required beyond compression's adaptation — everything else in Scope items 1
and 3 was verification of prior work, not new implementation.

**Item 3's positive case (module-relevant recall) demonstrated live**, no
new code: `neuron memory query "what does src/harnesses do and what does
hook.ts import from it"` against this repo's real store returns the
`harnesses` module's detail card as the top hit (score 1, cosine similarity
0.79, FTS-matched) — the existing `memory.query({text, ...})` pre-prompt
path surfaces module detail on relevance alone, exactly as `28`'s design
called for, no explicit "fetch this module" mechanism added anywhere.

**Item 4** confirmed unchanged: both `session-start` and the first
`pre-prompt` of an epoch already route through the same
`fetchArchitectureCardPayload`, so the fix above applies to both call sites
identically. `hook.test.ts`'s existing epoch-reinjection coverage
(re-inject on first pre-prompt, skip on the second, re-inject after
`context-reset`) passes unmodified against the new index shape.

**`24`'s `captured-card.txt` refreshed** with a real live capture
(`neuron hook claude-code session-start`'s actual emitted
`additionalContext`) post-fix: 2,994 bytes (down from the stale ~6,084-byte
pre-`28` monolithic capture), zero `### 🧩` module headings. `24`'s own
tasks (`dependency-contract`, `subsystem-inventory`) only need the
dependency list and the per-module path list, both still present verbatim
in the index — no change needed to `tasks.mjs`/`fixtures.mjs`.

`compressCard.test.ts` fully rewritten for the new shape (8 tests: unchanged
passthrough, line-atomic truncation, omission-note presence, the two hard-
truncation fallbacks, zero/negative cap, determinism, never-exceeds-cap
across a cap sweep) — the old per-file-stripping tests no longer apply,
since there's no per-file content left in this artifact. One new test added
to `hook.test.ts` for the module-card-exclusion fix. `npm test`: 599/600 (up
from 598/599), the one failure the same pre-existing, unrelated
`concurrency-stress.test.ts` SQLite-migration-race flake prior sessions
already tracked independent of this ticket. `tsc --noEmit` clean.
