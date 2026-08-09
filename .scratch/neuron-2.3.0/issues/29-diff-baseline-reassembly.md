Type: task
Status: unclaimed
Blocked by: 28
Band: context cost

# 29 — Reassemble the Diff Baseline from the Index + Module Cards

## Question

Can `scan --diff`/`--check` keep working unchanged once the blueprint is
split into an index plus per-module cards ([28](28-architecture-index-and-module-cards.md)),
by reconstructing the legacy monolithic markdown shape at read time rather
than teaching `parseBaselineBlueprint`/`calculateArchitecturalDiff` a new
multi-entry format?

## Context

`parseBaselineBlueprint` (`src/scanner/diff.ts:59`) and
`calculateArchitecturalDiff` are the only consumers that need the
architecture data *complete* — drift detection has to see every module and
every file+export to compute what's new, removed, or changed. `28` splits
storage into an index (module list only) plus N per-module cards, so these
two functions can no longer read one stored blob directly.

**Chosen approach: reassemble, don't rewrite.** Fetch the index, parse its
module list (the same dedicated regex `28` adds), fetch each module's card
by `moduleCardId(category, path)`, and concatenate index-prefix + each
module's markdown back into exactly the shape the monolithic card used to
have. Feed that reconstructed string to `parseBaselineBlueprint` completely
unchanged. This is deliberately the smaller, safer change — no risk to
`calculateArchitecturalDiff`'s existing, working diff logic, only to how
the baseline string reaches it.

**Also found while scoping this**: `getArchitecturalDrift`'s current
baseline fetch (`diff.ts:377-390`) uses a generic ranked `memory.query({
categories, text: 'Repository Architectural Blueprint', limit: 10 })` plus
a `.find()` filter — the exact same category-crowding vulnerability ticket
[25](25-architecture-card-stable-id-and-truncation.md) fixed for the
injection path, still live here. Fix both at once: switch this fetch to
`findById(blueprintCardId(category))` directly, same as `25` did for
`hook.ts`.

## Scope

1. New reassembly helper (`diff.ts` or `ingest.ts` — whichever avoids a
   circular import, check before choosing) that: fetches the index by
   `blueprintCardId`, parses its module list, fetches each module card by
   `moduleCardId`, and concatenates them into the pre-`28` monolithic shape.
   A module whose card is missing (shouldn't happen post-`28`, but don't
   trust it) is skipped with the loss surfaced as a lower-fidelity diff
   rather than a crash.
2. `getArchitecturalDrift` calls the reassembly helper instead of the
   generic ranked query, and switches its own baseline lookup to
   `findById` per the crowding-bug fix above.
3. `parseBaselineBlueprint`/`calculateArchitecturalDiff` themselves:
   **no functional changes** — Scope item 1 exists specifically so these
   don't need to change. If reassembly turns out not to reproduce a shape
   these can parse without modification, that's a defect in the reassembly
   helper, not a reason to start patching the parser.
4. `ingestScanResults`'s re-ingest path (called from
   `autoRescanIfDriftDetected`) already re-upserts index + module cards per
   `28` — confirm no change needed there beyond what `28` already does.

## Verification

- `scan --diff`/`--check` against this repo's own real post-`28` store
  reports "In Sync" with no drift, same as before the split.
- A real change (add a file with a new export to one module, remove a file
  from another, remove a whole module) is still detected correctly through
  the reassembled baseline — added/removed/modified exports and modules all
  attributed correctly.
- A fresh project with no baseline yet still reports `isMissingBaseline`
  correctly (reassembly returns nothing to parse, not a crash).
- The `findById`-based baseline fetch survives the same category-crowding
  scenario `25`'s own test reproduces (plant several unrelated same-category
  entries more recent than the index; baseline is still found).

## Deliverables

- [ ] Reassembly helper: index + module cards → legacy monolithic shape
- [ ] `getArchitecturalDrift` uses reassembly + `findById`, not a ranked query
- [ ] `parseBaselineBlueprint`/`calculateArchitecturalDiff` unchanged
- [ ] `scan --diff`/`--check` verified against this repo's real post-`28` store
- [ ] Regression test for the crowding-bug fix on the baseline fetch
