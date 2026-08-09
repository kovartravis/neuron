Type: task
Status: unclaimed
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
