Type: task
Status: resolved
Blocked by: none
Band: 2.2.0-rc2

# 26 — Remove Model-Based Importance Inference

## Question

Ticket `06` measured the 0.5B model's importance judgement as a non-signal and
shipped it `off` by default. Should a dead-by-default path stay in the codebase
at all — and what does removing it touch?

**Answered in advance by the maintainer on 2026-08-02: remove it.** This ticket
is the execution, not the decision. What remains open is only the mechanical
question of what removal touches.

## Context

The evidence is ticket `06`'s own, from Pillar 10:

- Discrimination between deliberately unambiguous critical and trivial entries
  measured at **-0.5** and **+0.167** across two consecutive runs. That is noise,
  and one of the two runs is *negatively* correlated with the truth.
- Per-entry stability **0.5** — the same entry, asked twice, gets two answers
  half the time.
- Asked to rate a note about irreversible production data loss, the model
  answered **`1`** — the most prune-eligible value available.

Shipping it `off` was already an admission that it does not work. The maintainer's
judgement is that keeping unreachable machinery costs documentation, config
surface and maintenance in exchange for a measured non-signal nobody should
enable. It stays recoverable from git history if a larger model ever makes the
question worth reopening.

### One structural wrinkle found while grilling `07`

`LocalEnrichmentModel.inferCategoryAndImportance` (`src/components/enricher.ts:213`)
calls `inferImportance` **unconditionally**. So the opt-in
`categoryStrategy: 'model'` path invokes importance inference regardless of the
`llm.enrichment.importance: 'off'` default. The `off` default was never the whole
guard it appeared to be — this is worth stating in the removal commit, because it
means the dead path was not entirely dead.

## Scope

1. Delete `inferImportance`, `buildImportancePrompt` and `parseImportance` from
   `src/components/enricher.ts`; drop `ImportanceInferenceResult` and the
   `inferImportance` member of the `EnrichmentModel` interface.
2. Make `inferCategoryAndImportance` category-only. Rename it to match what it
   does — a method named for two fields that returns one is a trap for the next
   reader.
3. Remove the `llm.enrichment.importance` key from `src/config/neuronYaml.ts`
   (`:82`) and its tests (`neuronYaml.test.ts:197-229`).
4. Decide the migration for an existing `neuron.yaml` that sets the key. Zod
   ignores unknown keys by default, so it likely degrades silently — **verify
   rather than assume**, and if it throws, that is a breaking change on an
   rc-only key and needs a CHANGELOG line either way.
5. Entries take the default importance unless `--importance` is passed. Confirm
   the enrichment result type no longer carries `importance` anywhere it could be
   read as inferred.
6. Update the `06` spec, `CONTEXT.md` and any doc asserting the model infers
   importance.

## Verification

- Unit suite green; the enrichment tests that asserted the `off` default are
  removed rather than inverted.
- Pillar 10 (Importance Inference & Prune Safety) no longer has an importance
  arm to measure. **Decide deliberately whether the pillar is deleted or
  re-pointed at prune safety alone** — the prune-safety half is still meaningful
  and ticket `23` left the underlying hazard live.
- `neuron memory add` without `--importance` writes the default. Assert it.

## Deliverables

- [ ] Inference code and config key removed
- [ ] `inferCategoryAndImportance` category-only and renamed
- [ ] Existing-config migration behaviour verified, not assumed
- [ ] Pillar 10's fate decided and recorded
- [ ] `06` spec, `CONTEXT.md` and docs corrected
- [ ] Unit + E2E green

## Answer

Removed — and the removal reached one layer further than this ticket scoped,
with the maintainer's approval taken before cutting.

### The cascade the scope missed

`enrichUpsert` is the only path that writes `enriched_at`, and it only left it
NULL for `deferred = wantsImportance && importance === undefined`. Delete
importance inference and `wantsImportance` is always false, so **nothing can ever
enter the enrichment backlog again** — and migration v6 had already backfilled
every pre-existing NULL. That made the entire deferral apparatus unreachable:
`drainEnrichment`, `countPendingEnrichment`, `drainEnrichmentIfPending` (called
on every `query`), the `neuron memory enrich` subcommand, `enrichment.pending` in
`neuron status`, and `clampImportance`, whose only two callers were the two
inference sites.

Keeping it would have shipped a CLI subcommand that could only ever report
`drained: 0` — this ticket's own argument about dead machinery, applied to the
thing the ticket didn't look at. **Maintainer chose to remove the backlog too**,
and to keep the `enriched_at` column and its partial index: the timestamp is
still an honest record of a write having been enriched, and dropping a column
would make an rc1/rc2 database non-downgradable for no gain.

### Scope items, as resolved

1-3. Done. `inferCategoryAndImportance` is renamed **`inferCategory`** and does
only that; `ImportanceInferenceResult`, `inferImportance`,
`buildImportancePrompt`, `parseImportance` and the `importance` field of
`CategoryInferenceResult` are gone, as is `llm.enrichment.importance`.

4. **Verified, not assumed.** Zod strips unknown keys, so a `neuron.yaml` still
   setting `llm.enrichment.importance: infer` parses without error and the key is
   ignored — confirmed by running the built CLI against exactly that config, and
   now asserted by a unit test rather than left to inspection. No breaking
   change; the CHANGELOG says the line can be deleted at leisure.

5. Confirmed. `CategoryInferenceResult` no longer carries `importance` anywhere
   it could be read as inferred, and `neuron memory add` without `--importance`
   stores `3` (verified against the built CLI, asserted in both suites).

6. `06` spec banner-superseded rather than rewritten — it is the honest record of
   what `06` was asked to build. `CONTEXT.md`, `docs/COMMANDS.md`, ADR 0010,
   `CLAUDE.md` and the packaged `neuron-memory` skill all corrected; the skill
   was still telling users to run `neuron memory enrich` and documenting an
   `importance` config key.

### Pillar 10: re-pointed at prune safety, not deleted

The inference half has nothing left to measure; the prune-safety half is still
live because ticket `23`'s hazard is unfixed. **Pillar 10 is now "Prune Safety"**
and measures the only thing that actually protects an entry: half the
known-critical corpus written with an explicit `--importance 5`, then a prune
previewed at every threshold. On the 12-entry corpus:

| Threshold | Deleted | Critical deleted |
|---|---|---|
| 1, 2 | 0 | 0 |
| **3 (the default)** | **9 of 12** | **3 of 6** |
| 5 | 12 | 6 |

Every critical entry deleted at the default ceiling is one that did not pass the
flag; all three guarded entries survive. That is ticket `23`'s hazard quantified
and the guard verified in a single run. Its hard assertions are that nothing
infers importance any more (every unguarded entry sits on exactly `3` — a
different value means inference has returned from somewhere) and that
`--importance` protects. It no longer loads the model, so the pillar dropped from
minutes to milliseconds.

### Verification

- `npx tsc --noEmit` clean; **270 tests green** (267 unit + 3 enrichment pillars).
- Full suite: 279/280. The one failure is **Pillar 8 (multi-process contention)**,
  `3/50 writes rejected` against a `<5%` bar — **confirmed pre-existing by
  stashing this branch's changes and reproducing it on the clean tree**, not
  assumed. Unrelated to enrichment; owned by nobody yet.
- Built CLI checked directly rather than through `neuron exec`, which resolves
  the *global* binary (the trap recorded in ticket `04`).

### Deliverables

- [x] Inference code and config key removed
- [x] `inferCategoryAndImportance` category-only and renamed to `inferCategory`
- [x] Existing-config migration behaviour verified, not assumed
- [x] Pillar 10's fate decided and recorded — re-pointed at prune safety
- [x] `06` spec, `CONTEXT.md` and docs corrected
- [x] Unit + E2E green

## Comments

- 2026-08-02: Filed during ticket `07`'s grilling. Filed as new work rather than
  reopening `06`, because `06` honestly shipped what it measured — this ticket
  acts on that measurement, and the map should read as a route rather than a
  rewrite. Blocks [09 — Cut and Publish 2.2.0-rc2](09-cut-rc2.md) so it lands in
  the same rc as the enrichment it amends.
- ADR 0010 carries the decision under its 2026-08-02 amendment.
