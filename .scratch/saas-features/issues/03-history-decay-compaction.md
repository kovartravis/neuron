Type: grilling
Status: resolved
Blocked by: 01

## Question

How should history decay and compaction be scheduled and performed? What is the exact expiration duration (in days) for low-importance (1-2) history logs, and how does the compaction command interface filter and aggregate high-importance logs into learnings?

## Answer

### 1. History Decay Specification (`history prune`)

- **Expiration Cutoff**: Default of **30 days** (configurable via `--days <N>`).
- **Importance Threshold**: Only records with `importance <= 2` (low importance) created prior to the cutoff date (`created_at < cutoff`) are pruned.
- **High-importance preservation**: Records with `importance >= 3` are strictly preserved indefinitely unless deleted manually via `history delete <id>`.
- **API Method**: `NeuronMemory.pruneHistory({ days?: number; maxImportance?: number }): { deletedCount: number }`.
- **CLI Interface**: `neuron history prune [--days N] [--importance N]` returning JSON output: `{"status":"pruned","deletedCount":N,"project":"..."}`.

### 2. History Compaction Specification (`history consolidate`)

- **Cursor-based Consolidation**: Watermark tracking is stored in the `meta` table under keys `last_consolidated_rowid` and `last_consolidated_at`.
- **Selection Criteria**: Queries history records where `rowid > last_consolidated_rowid` ordered by `rowid ASC`.
- **API Method**: `NeuronMemory.consolidateHistory(): { entries: Array<...>; consolidatedAt: string; previousCursor: string | null; project: string }`.
- **CLI Interface**: `neuron history consolidate` returning JSON output with un-consolidated entries and updating the watermark.
- **Agent Integration**: External agent harnesses and periodic subagent tasks use the consolidated entries payload to extract actionable learnings and record them via `neuron learn add`.

