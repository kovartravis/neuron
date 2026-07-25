# 13 — Default History Pruning Threshold Update (`importance <= 3`)

**What to build:** Updates `maintain()` policy defaults and `neuron history prune` CLI options so that `pruneHistoryBeforeDays` defaults to `maxPruneImportance = 3` (pruning default & minor entries `importance <= 3` older than 30 days), preserving high-importance history entries (`importance 4–5`) indefinitely.

**Blocked by:** 10 — High-Importance (4–5) Scope Lock in Maintenance

**Status:** resolved

- [x] `maintain()` defaults `maxPruneImportance` to 3 when `pruneHistoryBeforeDays` is set.
- [x] `neuron history prune` defaults `--importance` / `maxPruneImportance` to 3.
- [x] History logs with `importance <= 3` older than 30 days are pruned during routine maintenance.
- [x] History logs with `importance 4–5` are preserved indefinitely unless explicitly overridden.
