Type: grilling
Status: resolved

## Question

How should the CLI handle memory lifecycle and consolidation? For example, when and how should raw history events be consolidated into general rules/learnings, and what is the pruning/expiration strategy for old history?

## Answer

### Consolidation

- **Trigger**: Explicit command only — `neuron history consolidate`. No automatic/background promotion. The calling tool (agent harness) performs all reasoning; the CLI is a pure data accessor.
- **Mechanism**: Cursor-based. The CLI stores `last_consolidated_at` in the `meta` table. On each `consolidate` call, the CLI returns all history entries with `created_at > last_consolidated_at`, then advances the watermark to `now()` before returning.

### `neuron history consolidate` JSON output

```json
{
  "entries": [
    {
      "id": "uuid",
      "content": "Ran tests with vitest before committing",
      "tags": ["testing"],
      "taskId": null,
      "createdAt": "2026-07-11T12:00:00.000Z"
    }
  ],
  "consolidatedAt": "2026-07-11T13:28:00.000Z",
  "previousCursor": "2026-07-10T09:00:00.000Z",
  "project": "neuron"
}
```

- `entries` — history records since previous cursor (empty array if nothing new)
- `consolidatedAt` — the new watermark, advanced immediately on the call
- `previousCursor` — the cursor before this call (`null` on first run)

The tool reads `entries`, distills learnings, calls `neuron learn add` for each rule. No second round-trip needed.

### History lifecycle

- **Keep forever**: History is append-only, never deleted automatically. Storage cost is trivial (~1.5 MB / 1,000 entries). The `consolidate` cursor ensures old entries are never re-processed.
- **No prune command in v1**: Auto-expiry would risk deleting unconsolidated history. Can be added as `neuron history prune --before <date>` in a future version.

### Deduplication

- **None in v1**: The CLI stores whatever `learn add` receives. The calling tool is responsible for avoiding duplicates (it can read existing learnings via `neuron learn list` before deciding what to add). Embedding-threshold dedup in the CLI would require a magic number and add complexity with no clear correct value.
