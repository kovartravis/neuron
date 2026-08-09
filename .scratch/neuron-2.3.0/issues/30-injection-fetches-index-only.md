Type: task
Status: unclaimed
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

- [ ] `fetchArchitectureCardPayload` fetches the index only
- [ ] `compressArchitectureCard` adapted or retired, decided from a real
      measurement, not an assumption
- [ ] Demonstrated: a module-relevant prompt recalls that module's card via
      existing pre-prompt recall, unmodified
- [ ] `24`'s captured card content refreshed to match
