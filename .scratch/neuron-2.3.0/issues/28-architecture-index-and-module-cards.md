Type: task
Status: resolved
Blocked by: none
Band: context cost

# 28 — Architecture Card: Split into an Index Entry + Per-Module Detail Cards

## Question

Can `ingestScanResults` store the architecture blueprint as one small,
always-injectable index entry plus N separately-addressable per-module
detail entries, instead of one monolithic card — so the *stored*
representation itself scales with repo size instead of needing ever-more
aggressive compression at injection time?

## Context

Surfaced 2026-08-08, immediately after [27](27-structural-card-compression.md):
the maintainer rejected structural compression as a real fix — "This is a
fairly small repo though so on a large repo how is this supposed to work
... I don't see how this could work as neuron grows or its in a larger
repo." Correct: `27`'s compression still tries to cram a comprehensive
inventory into one fixed-size injection, so on a repo with hundreds of
subsystems the long tail is permanently invisible regardless of how tight
the compression gets — a fixed-size single card cannot hold unbounded
content, no matter how it's rendered.

**Design resolved via `AskUserQuestion` this session** (two decisions, both
answered, no open design questions left for whoever claims this):

1. **Follow mechanism**: reuse existing pre-prompt relevance recall. Per-
   module cards become ordinary queryable memory entries — no new "fetch
   specific module" mechanism, no new CLI affordance. When the agent's
   current prompt is actually about a given area of code, the *existing*
   `memory.query({ text: prompt, ... })` pre-prompt path naturally surfaces
   that module's detail card, the same way any other memory entry gets
   recalled today.
2. **Storage model**: single source of truth. The monolithic blueprint is
   retired outright, not kept alongside a derived index — `scan --diff`'s
   baseline is reconstructed by reading the index (for the module list) plus
   each module's own card, concatenated back into the legacy shape
   `parseBaselineBlueprint` already parses. This is [29](29-diff-baseline-reassembly.md),
   a required companion, not an optional follow-up — `scan --diff` will
   misbehave against a split-but-unreassembled baseline, so `28` and `29`
   ship together in effect even though they're separate tickets.

## Scope

1. **New id scheme** in `src/scanner/ingest.ts`: `blueprintCardId(category)`
   (existing, unchanged hash) now identifies *the index*, not the full
   blueprint. New `moduleCardId(category, modulePath)` — same derived-not-
   searched-for pattern ticket 37 established for the same reason: `sha256(
   'neuron:architecture-module:' + category + ':' + modulePath)`, formatted
   the same UUID-shape.
2. **`synthesizeArchitecture` (`summarizer.ts`) returns three things**, not
   two: `{ summary, index, modules }`.
   - `index`: system purpose, parser fidelity, dependency contract,
     subsystem dependency map (all unchanged, already small) plus a new
     `## 📦 Primary Subsystems` section — one line per module: name, path,
     file count. **Format this without backticks inside the bold module-
     name markers** (e.g. `- **name** — \`path\` (N files)`, not `- **`name`**
     ...`) so it can never collide with `parseBaselineBlueprint`'s file-line
     regex, which specifically requires backticks *inside* the bold markers.
   - `modules`: `Array<{ path: string; markdown: string }>` — one entry per
     module, each `### 🧩 name (path)` + `**Key Components & Export
     Contracts:**` + its file lines, exactly the block that used to be
     inlined in the monolithic card. Purpose text stays here (not stripped
     — these aren't injected wholesale by default, so `26`'s size pressure
     doesn't apply the same way).
3. **`ingestScanResults` upserts index + all module cards in one
   transaction**, and **deletes stale module cards**: parse the *previous*
   index's module list (read via `blueprintCardId`, same dedicated regex
   from item 2), diff its paths against the current scan's module paths,
   and delete any module card whose module no longer exists — otherwise a
   removed subsystem's detail card becomes an orphan that can still surface
   via ordinary relevance recall, describing code that's gone.
4. **`neuron init`'s and `analyzer.ts`'s existing behavior otherwise
   unchanged** — this ticket only changes what gets written, not the scan
   traversal itself.

## Verification

- A real `neuron scan` on this repo produces one index entry (small — no
  per-file detail) plus one entry per module (14 on this repo today).
- Re-running `neuron scan` twice with no code changes produces byte-
  identical index and module card content (same determinism guarantee
  ticket 37 established for the single-card version).
- Removing a module from the scanned tree and re-scanning deletes that
  module's stale card, not just stops updating it.
- `npm test` green; new tests cover the multi-entry upsert and the stale-
  cleanup path specifically (a fixture that removes a module between two
  scans).

## Deliverables

- [x] `moduleCardId` added alongside `blueprintCardId`
- [x] `synthesizeArchitecture` returns index + per-module markdown separately
- [x] `ingestScanResults` upserts all of them in one transaction
- [x] Stale module cards deleted when a module disappears from the scan
- [x] Tests for determinism (multi-entry) and stale-cleanup

## Answer

Built exactly to Scope, no open design questions. `src/scanner/ingest.ts`:
`moduleCardId(category, modulePath)` (same derived-hash pattern as
`blueprintCardId`, now `sha256('neuron:architecture-module:...')`);
`parseModuleListFromIndex` reads the index's `## 📦 Primary Subsystems`
list back into `{name, path}` pairs via a dedicated regex that requires no
backticks inside the bold module-name markers, so it can never collide with
`parseBaselineBlueprint`'s file-line regex in `diff.ts`. `synthesizeArchitecture`
(`summarizer.ts`) now returns `{ summary, index, modules }` — `index` is the
small always-injectable card (system purpose, fidelity, dependencies,
subsystem map, one-line-per-module list); `modules` is
`Array<{path, markdown}>`, one full `### 🧩 name (path)` +
`**Key Components & Export Contracts:**` block per module, exactly the
content that used to be inlined. `ingestScanResults` upserts index + all
module cards in one `memory.transact()` call, and deletes stale module
cards (a module removed from the repo) by diffing the *previous* index's
parsed module list against the current scan's module paths — verified with
a real determinism test (two scans, byte-identical index+module content)
and a real stale-cleanup test (remove a module's directory, re-scan, its
card is gone, the surviving module's card is untouched).

**Landed together with [29](29-diff-baseline-reassembly.md) in this same
session**, not sequentially as separately chartered, because `28` alone
breaks `scan --diff`/`--check` — verified concretely: `getArchitecturalDrift`'s
old baseline fetch (`memory.query({categories, text: 'Repository
Architectural Blueprint'}).find(...)`) matches on a `'scan'` tag that both
the index *and every module card* now carry, so it could resolve to the
wrong entry, and even when it resolves to the index, the index alone lacks
the per-file/export detail `parseBaselineBlueprint` needs — every module
would report as spuriously "removed." The map's own Notes already
anticipated this ("28 and 29 ship together in effect") and 29's scope was
small and fully specified, so resolving both kept the test suite green
rather than landing 28 with a known, disclosed regression. Full detail on
`29`'s own file.

**Real-world verification surfaced an unrelated, pre-existing bug**
(filed as [38](38-md-parser-loses-entries-on-stray-dashes.md), not fixed
here): a real `neuron scan` against this repo's own store confirmed the
index+module split and byte-identical re-scan determinism worked correctly,
but `neuron scan --check` afterward hit a data-integrity defect already
present in `.neuron/decisions.md` on `main` (a stray `---` inside one
entry's body, predating this session, silently drops ~40% of that
category from the SQLite mirror on every reconcile). Confirmed via `git
diff` that no committed content was lost (markdown is the source of truth
and was untouched); reverted this session's own experimental writes
(`git checkout -- .neuron/`) and let a reconcile restore the pre-session
baseline. `28`'s own correctness is verified by the test suite (`npm test`,
584/584) against clean synthetic fixtures, immune to that unrelated bug —
see `38` for the finding.

`npm test`: 584/584 (3 new tests in `ingest.test.ts` — index+module split,
determinism, stale-cleanup — plus 1 new regression test in `diff.test.ts`
for `29`'s category-crowding fix, offset by updates to 3 pre-existing
`ingest.test.ts` tests and 2 `summarizer.test.ts` tests for the new return
shape rather than a net count change). `tsc --noEmit` clean.
