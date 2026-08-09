Type: task
Status: resolved
Blocked by: none
Band: context cost

# 31 — Fix `neuron memory` Query/List Default Ordering and Limits

## Question

`NeuronMemory.queryVector` has two independent, pre-existing bugs surfaced
while grilling ticket 32's prerequisites, both on the single `const limit =
q.limit ?? 5` / no-text "list mode" branch:

1. **Wrong default ordering.** List mode's SQL is `ORDER BY rowid ASC`
   (oldest-first), then slices to `limit`. `neuron memory list --category
   history` with no `--limit` today returns the 5 *oldest* history entries
   ever recorded, not the most recent — the opposite of what "catch me up"
   usage expects. (The deprecated `listHistory` wrapper already does this
   right — `ORDER BY rowid DESC` — so the unified `queryVector` path
   regressed behind its own deprecated predecessor.) Fix: list mode orders
   by recency.

2. **One shared default conflates two different questions.** The same
   `?? 5` default serves both list mode (no text — "what's in this
   category," an inventory question with no relevance ranking at all) and
   text-query mode (a ranked semantic search — "top-K most relevant").
   Diverge them: list mode gets its own, larger default (an inventory of 5
   is close to useless); text-query mode keeps 5 (a ranked top-5 is a
   reasonable default for "most relevant").

Every internal caller (`hook.ts`'s two call sites, `dualStorageRouter.ts`'s
reconcile, `mdVectorSync.ts`) already passes an explicit `limit` — nothing
internal relies on the implicit default, so this is scoped to bare CLI usage
(`neuron memory list`/`query` with no `--limit`) plus `hook.ts`'s
`fetchArchitectureCardPayload`, which does rely on list mode's ordering as
its category-fill fallback after the stable-id blueprint fetch (ticket 25) —
verify that fallback still behaves sanely (recency should if anything be a
better fallback signal than insertion order, but confirm no regression
against ticket 25's own test coverage).

## Comments

- Graduated 2026-08-09 out of a grilling session for ticket 32 (per-prompt
  discovery-command hint) — pointing an agent at a command that silently
  returns stale, capped-at-5 results would defeat that ticket's purpose, so
  the maintainer chose to fix this as its own contained ticket first rather
  than bundle a shipped-behavior change into a ticket about hook payload
  text. No test in the repo asserts either the ordering direction or a
  specific default-limit value, so blast radius is contained to actual
  behavior, not test churn.

## Answer

No open design questions — both bugs were exactly as scoped, and the fix
matched the Question's own stated direction without surprises.

**Fix 1 (ordering):** list mode's SQL in `NeuronMemory.queryVector`
(`src/index.ts`) changed from `ORDER BY rowid ASC` to `ORDER BY rowid DESC`,
matching the deprecated `listHistory` wrapper's own (correct) behavior.

**Fix 2 (default limit):** the single `const limit = q.limit ?? 5` at the
top of `queryVector` was removed and replaced with two independent
defaults, one per branch: text-query mode keeps `q.limit ?? 5` (unchanged —
a ranked top-5 is still a reasonable "most relevant" default); list mode
gets `q.limit ?? 20`, matching `listHistory`'s own existing default rather
than inventing a new number.

**Verification against the Question's own scoped call sites:**
- `hook.ts`'s `fetchArchitectureCardPayload` category-fill fallback
  (`memory.query({ categories: [category], limit: 4 })`) passes an explicit
  limit, so the default change doesn't touch it — but the ordering change
  does: it now fills from the most recent same-category entries instead of
  the oldest, which ticket 25's own stable-id test (`fetches the
  architecture card by its stable id even when other entries in the same
  category outrank it`) doesn't assert an order on, so no regression there.
  Confirmed by running the full suite, not just that one test.
- `dualStorageRouter.ts`'s reconcile and `mdVectorSync.ts` both already pass
  explicit limits, as the Question stated — verified by re-reading both
  call sites, not just trusting the Question's own claim.
- Bare CLI usage (`neuron memory list`/`query` with no `--limit`,
  `src/commands/memory.ts`) is exactly where both defaults now diverge
  correctly, since neither passes an explicit `limit` through from CLI
  flags when the user omits `--limit`.

**Found while verifying:** `src/commands/ui.test.ts`'s
`GET /api/learnings returns seeded learnings as a results array` test
asserted the old oldest-first order on a two-entry list-mode fetch (the UI
server passes an explicit `limit: 50` but no ordering override) — a real,
if minor, instance of the same bug the Question describes, just surfaced
through the HTTP API instead of the CLI. Updated the assertion to expect
the corrected newest-first order rather than loosening it.

Two new tests added to `src/index.test.ts` (list mode orders newest-first;
list mode's default limit exceeds text-query mode's), since the ticket's
own Comments confirmed neither was covered. `npx tsc --noEmit` clean;
`npm test` 580/580 (up from 578, both new tests, one pre-existing assertion
corrected). `npm run test:e2e` not run — grepped, every e2e call site
already passes both `text` and `limit` explicitly (text-query mode,
unaffected by either fix).

Unblocks [32 — Per-Prompt Discovery-Command Hint](32-per-prompt-discovery-command-hint.md).
