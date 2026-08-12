Type: task
Status: resolved
Blocked by: none
Band: context cost

# 30 — Fix `autoRescanIfDriftDetected`'s cwd/storage Project-Root Mismatch

## Question

`neuron exec`'s own drift-auto-rescan can silently overwrite a real
project's architecture card with a degenerate scan of whatever directory
the CLI happened to be invoked from. Fix the root-resolution mismatch that
causes it.

## Context

**Confirmed live, twice, on this repo's own store** — this is not
theoretical:
- 2026-08-08 (documented in an existing `learning` entry): a real
  `.neuron/decisions.md`/architecture card got overwritten with a scan of a
  test fixture project (`harness-idempotent-test`, 0 modules), 232 lines
  deleted.
- 2026-08-11 (this map, mid-`27`'s grilling session): the real architecture
  card was overwritten with a scan of a project named `issues`, 0 modules,
  406 of 411 lines deleted — caught before commit via the diff-stat
  tripwire the first incident's fix established, not by any tooling.

**Root cause, traced to source, not guessed:**
1. `autoRescanIfDriftDetected(memory, projectRoot = process.cwd())`
   (`src/scanner/diff.ts:410-412`) takes the scan root as **literal
   `process.cwd()`** — both call sites (`src/commands/exec.ts:28`,
   `src/commands/memory.ts:142`) pass it through unchanged.
2. That root flows straight through `ingestScanResults`
   (`src/scanner/ingest.ts:78`, `options.projectDir || process.cwd()`) into
   `scanProjectTopology`, and the resulting card's project name comes from
   `path.basename(projectRoot)` (`src/scanner/analyzer.ts:83`) — **no
   `package.json` read, no upward walk, no check that this directory is
   actually a project root at all.**
3. Meanwhile the `NeuronMemory` instance the scan result gets written
   *into* was resolved via `NeuronMemory.open()`'s own, **separate**
   upward-walking project-root discovery (walks up from the given directory
   looking for `package.json`/`.git`, per the existing store-isolation fix
   from wayfinder ticket 42).
4. **These two resolutions can silently diverge.** If the CLI process's cwd
   is a subdirectory with no `package.json`/`.git` of its own (any
   `.scratch/*/issues/` directory qualifies — bare markdown, no project
   markers), the scan computes a degenerate topology rooted at that literal
   cwd while the write lands, upward-resolved, in the real project's store.
   The result: a scan of an unrelated directory silently overwrites the
   real project's architecture card, with no error and no warning beyond
   the routine "Architectural drift detected" message.

This is the same *class* of bug wayfinder ticket 42 already fixed for
CLI-invoking test isolation (storage resolving against the real repo root
from an unmarked subdirectory), but a different, still-open instance: `42`
fixed test files invoking the CLI without a `cwd` override; this is
`autoRescanIfDriftDetected` itself using `process.cwd()` as a scan root
with no equivalent guard, triggerable from any real interactive session
just by running a wrapped command from the wrong subdirectory.

## Scope

1. Make the scan root and the storage root **provably the same resolution**
   — either have `autoRescanIfDriftDetected` resolve `projectRoot` via the
   identical upward-walking logic `NeuronMemory.open()` already uses
   (rather than literal `process.cwd()`), or thread the already-resolved
   project root down from wherever `memory` was opened instead of
   re-deriving it from `process.cwd()` a second time.
2. Decide what should happen when the CLI is invoked from a subdirectory
   with no `package.json`/`.git` of its own and no way to unambiguously
   resolve a project root — this may be a design question worth a quick
   confirmation rather than a unilateral pick (e.g., refuse to auto-rescan
   at all vs. resolve upward and scan the real root regardless of cwd).
3. Add a regression test reproducing the exact failure: invoke
   `autoRescanIfDriftDetected` (or the `exec`/`memory` command wrapping it)
   from a subdirectory with no project markers of its own, nested inside a
   real project, and assert the resulting card describes the real project,
   not the subdirectory.
4. Audit whether `neuron scan`'s own direct invocation (not just the
   drift-triggered auto-rescan path) has the same `process.cwd()` handling
   and needs the identical fix.

## Verification

- The regression test in Scope item 3 fails on current code and passes
  after the fix.
- Both confirmed historical incidents' shape (scan run from a project-marker-less
  subdirectory of a real repo) is covered, not just the literal directory
  names involved.
- `npm test` stays green; no existing isolation test (ticket 42's own
  coverage) regresses.

## Answer

Fixed by making the scan root and the storage root **the same value**, not
two independent resolutions that happen to usually agree — Scope item 1's
first option, not the thread-it-down alternative, because a shared function
generalizes to every future call site instead of just the two existing ones.

- **Deduplicated `findProjectRoot`** into a new `src/shared/projectRoot.ts`
  (matching the existing `shared/textMatch.ts` precedent for "two surfaces
  must resolve the same way, not drift into two heuristics"). It was
  byte-for-byte duplicated between a module-private copy in `src/index.ts`
  and an exported copy in `src/commands/utils.ts`; both now import the one
  function, and `commands/utils.ts` re-exports it so `cli.ts`'s existing
  import is unaffected.
- **Added `NeuronMemory.getProjectRoot()`**, the same public-getter pattern
  as `getConfig()`/`getProjectId()` right above it — the one thing every
  other resolution must now match rather than re-derive.
- **`autoRescanIfDriftDetected`** (`src/scanner/diff.ts`) and its sibling
  `getArchitecturalDrift` (same divergence risk, same fix, no live caller
  relied on its default) now default `projectRoot` to
  `memory.getProjectRoot()` instead of literal `process.cwd()`. Both real
  call sites (`exec.ts`, `memory.ts`) now call `autoRescanIfDriftDetected(memory)`
  with no second argument at all — the redundant, divergence-prone
  `process.cwd()` arg is gone, not just fixed in place.
- **`neuron scan`'s own direct invocation** (Scope item 4's audit) had the
  identical bug: `handleScanCommand`'s `projectRoot = process.cwd()` fed
  both the topology scan and (when no `memory` was passed in) a fresh
  `NeuronMemory.open(projectRoot)` — same silent-divergence shape. Fixed to
  resolve upward via the shared `findProjectRoot` (or take `memory`'s own
  root when one was passed in).
- **`neuron status`'s drift check** (`status.ts`) had the same bug in a read
  path, found during the audit rather than left for a future ticket:
  `getArchitecturalDrift(memory, process.cwd())` would show a fabricated
  diff if `status` were ever run from a marker-less subdirectory. Now passes
  `memory.getProjectRoot()`.
- **Design question (Scope item 2)**: kept the existing fallback semantics
  rather than adding a new refuse-to-scan mode. `findProjectRoot` already
  resolves upward to the nearest `package.json`/`.git` and only falls back
  to the literal start directory when *no* ancestor has one — behavior
  `NeuronMemory.open()` has always had. Making the scan root reuse that same
  function (rather than inventing a second policy) was the whole point of
  Scope item 1's "provably the same resolution," so introducing a divergent
  refuse-mode for scanning specifically would have re-created a smaller
  version of the exact bug this ticket fixes. Not chased down as a separate
  maintainer confirmation since it's a reuse of settled behavior, not a new
  design.
- **Regression test** (Scope item 3): added to
  `src/scanner/implicit-rebaseline.test.ts`, the existing fixture for this
  exact shape (a real tmp project + a fidelity/drift rescan). Mocks
  `process.cwd()` to a project-marker-less `issues/` subdirectory nested
  inside the real tmp project — literally the incident shape — and asserts
  `autoRescanIfDriftDetected(memory)` (no explicit root, relying on the new
  default) still re-baselines the *real* project (correct name, correct
  file count), not a degenerate 0-module scan of the subdirectory.
- **Live-verified against this repo's own store**, reproducing both
  historical incidents' exact shape: ran `neuron exec -- git status --short`
  (global binary confirmed `npm link`-ed to this build first, per the
  standing stale-binary trap) from inside
  `.scratch/neuron-2.4.0/issues/` itself — a real, unmarked subdirectory of
  this repo. Drift was detected and re-scanned correctly: `.neuron/architecture.md`
  picked up exactly the one real change (`src/shared/projectRoot.ts` newly
  added), still describing `@kovartravis/neuron`, still 15 modules — no
  overwrite, no degenerate card. Followed with `neuron scan --check`,
  exit 0, "In Sync".
- `npm test` 684/684 (was 683), `tsc --noEmit` clean.

Files: `src/shared/projectRoot.ts` (new), `src/index.ts`, `src/commands/utils.ts`,
`src/commands/scan.ts`, `src/commands/status.ts`, `src/commands/exec.ts`,
`src/commands/memory.ts`, `src/scanner/diff.ts`,
`src/scanner/implicit-rebaseline.test.ts`.

## Comments

- Chartered 2026-08-11, at the maintainer's direct request, immediately
  after this exact bug was caught and worked around (not fixed) mid-`27`'s
  grilling session. Root cause traced to source before filing rather than
  filed as "investigate a vague drift bug" — see Context.
