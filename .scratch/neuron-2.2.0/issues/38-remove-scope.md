Type: task
Status: resolved
Blocked by: none
Band: 2.2.0-rc5

# 38 — Remove `scope`

## Question

`scope` was designed for a multi-tenant ambition that is not being pursued.
Remove it, and everything that exists to serve it — which is what makes
"markdown is the store of record, SQLite is a rebuildable index" true rather
than aspirational.

## Why this is not merely cleanup

Ticket [`28`](28-md-only-parity-design.md) audited the SQLite schema against the
markdown frontmatter to test whether the vector store really is a pure cache. It
is not, today, in exactly two places — and both exist to serve `scope`:

- `is_manual_scope`, the shield that stops the auto-promotion loop rewriting a
  hand-set scope
- `query_logs` and `learning_query_matches`, the usage corpus that loop reads

Neither is derivable from the `.md` files. So **`scope` is the reason the cache
claim is false**, and removing it is a prerequisite for the claim the whole rc5
band is built on, not a tidy-up that can slip.

It also directly resolves a collision: `scope` *is* a frontmatter field, so a
human hand-edits `scope: global`, runs `neuron memory maintain`, and the
promotion loop reads `is_manual_scope = 0` from SQLite and demotes it —
rewriting the file. Markdown was supposed to win. Removing the field removes the
contradiction rather than adjudicating it.

## The measurement

Against this repository's live store, 2026-08-02:

| | |
|---|---|
| Distinct `scope` values across 264 entries | **1** — every row is `neuron` |
| Rows with `is_manual_scope = 1` | **0** |
| Rows in `learning_query_matches` | **0** — the promotion loop has never fired |
| Rows in `query_logs` | **837**, spanning 2026-07-15 → 2026-08-02 |
| `query_logs` payload | **1.36 MB of a 3.1 MB database** |

`query_logs` and `learning_query_matches` have **exactly one reader** in the
codebase: the autoPromote loop at `src/index.ts:841-918`. Every
`neuron memory query` writes a 1.5 KB embedding blob (`src/index.ts:434`) to
feed a feature that has produced zero observed effects in three weeks of heavy
use, and that grows without bound.

Note the `.md` files already carry five distinct scope values (`custom-scope`,
`updated-scope`, `global`, `project`, `neuron`) against SQLite's one — residue
from tests. The two stores are already divergent on this field.

## Scope

1. Drop `scope` and `is_manual_scope` from the `memories` schema; drop the
   `query_logs` and `learning_query_matches` tables. Migration, not a fresh
   schema — an existing 2.1.x/rc1 database must upgrade cleanly.
2. Remove the autoPromote loop (`src/index.ts:841-918`) and the query-log write
   at `:434`. Check whether `maintain()` retains any purpose once it is gone;
   `neuron memory maintain` (`src/commands/memory.ts:135`) passes
   `autoPromote: true`.
3. Remove `scope` / `scopes` from `MemoryQuery`, `Memory`, the mutation union
   (`src/models/memory.ts`), and all router filtering.
4. Stop writing `scope:` to frontmatter (`mdStorageAdapter.ts:233`). A `scope:`
   key found on read is **ignored, not an error**, and dropped on the next
   write.
5. **Keep `--scope` and `--scopes` in `KNOWN_FLAGS`**, parsed, ignored, warning
   on stderr. `unknownFlag()` (`src/commands/utils.ts:92-103`) hard-exits 1, so
   removing them turns a rename into an outage for any existing script or agent
   invocation. Match the existing `neuron learn` / `neuron history` deprecation
   posture. Update the help text at `utils.ts:397-440` to mark them deprecated.
6. Purge `scope` from docs — `docs/COMMANDS.md`, `CONTEXT.md`, `README`, the
   packaged `neuron-memory` skill, and `CLAUDE.md` if it mentions it.

## Verification

- A 2.1.x database with populated `query_logs` migrates without error and loses
  no memory entries.
- `neuron memory add --scope foo` succeeds, warns, and stores an entry with no
  scope.
- Database size on this repo's store drops by roughly the measured 1.36 MB.
- An existing `.md` file containing `scope:` lines reads cleanly and drops them
  on rewrite.
- Unit + E2E green.

## Deliverables

- [x] `scope`, `is_manual_scope`, `query_logs`, `learning_query_matches` gone
- [x] autoPromote loop and query-log write removed
- [x] Migration verified against a real pre-existing database
- [x] `--scope`/`--scopes` deprecated, not removed
- [x] Docs purged

## Answer

Removed, exactly as scoped — AFK, TDD (`/tdd`), no design deviation from the
five points above.

- **Migration v7** in `initialize()` drops `scope`/`is_manual_scope` from
  `memories` and drops `query_logs`/`learning_query_matches` outright, via
  `ALTER TABLE ... DROP COLUMN` (supported on both better-sqlite3 and
  `node:sqlite`'s bundled versions — neither column is indexed or referenced by
  the `importance` CHECK). Verified against a hand-built v6-shaped database
  (populated `query_logs`, an `is_manual_scope=1` row): upgrades to
  `schema_version 7` with the memory row intact and both tables gone.
- **autoPromote loop removed** from `maintain()` (`src/index.ts:841-918` at the
  time of filing) along with the query-log `INSERT` in `queryVector`,
  `policy.autoPromote`/`report.promotions` from `MaintenancePolicy`/
  `MaintenanceReport`, and `checkAutoPromotions()`. `consolidateHistory()` and
  `neuron memory consolidate` keep working via `consolidate: true` alone —
  `maintain()`'s other purpose (pruning) is untouched.
- **`scope`/`scopes` removed** from `Memory`, `MemoryQuery`, `MemoryMutation`,
  and every read/write path: `queryVector`, `transactVector`,
  `DualStorageRouter` (all four `writeEntry`/`updateEntry` call sites plus the
  `queryMarkdownOnly` scope filter), `MdStorageAdapter` (`writeEntry` no longer
  defaults a scope, `formatEntry` never emits the key, `parseMarkdownDetailed`
  no longer reads it into the object), `mdVectorSync`'s `computeMemoryHash` and
  sync push/backfill, the five deprecated `NeuronMemory` wrapper methods, and
  the UI's `scopeTag()` helper/CSS.
- **`--scope`/`--scopes` stay in `KNOWN_FLAGS`**, still consumed by
  `parseFlags` so a value never leaks into positionals, but no longer returned
  on `options` — each occurrence now prints a `[neuron warning]` line to
  stderr, matching the `neuron learn`/`neuron history` deprecation posture
  exactly. Help text in `MEMORY_HELP`/`LEARN_HELP`/`HISTORY_HELP` marks both
  flags deprecated.
- **A `scope:` frontmatter key is silently dropped**, not an error and not a
  repair (no warning, no rewrite-on-read) — verified by a new test that reads
  a file with a stray `scope:` line, confirms it doesn't surface on the
  `Memory` object and the file is untouched, then confirms the key disappears
  after the entry's next write.
- **Docs purged**: `CONTEXT.md`'s "scope promotion & demotion" and "manual
  scope lock" glossary entries removed, `README.md`'s dashboard blurb no longer
  claims a scope filter, `docs/COMMANDS.md`'s `consolidate` description
  corrected (no longer "promote/demote by query frequency"). `docs/adr/0011`
  is the design doc this ticket implements and was left as-is.
- Every test asserting old scope/autoPromote behaviour was rewritten to match
  the new behaviour (not deleted wholesale) except the two tests whose entire
  premise was scope-based filtering or promotion/demotion, which no longer
  have anything to assert and were removed. `npm test` (build + full suite):
  35 files, 279 tests, green.

## Comments

- 2026-08-02: Filed by [`28`](28-md-only-parity-design.md)'s resolution.
  Sequenced **before** [`29`](29-md-only-semantic-search.md) because it shrinks
  what the reconcile engine has to mirror — doing it afterwards means building
  reconcile logic for a field that is about to disappear.
  See [ADR 0011](../../../docs/adr/0011-markdown-as-store-of-record.md) §
  *Consequence 1*.
