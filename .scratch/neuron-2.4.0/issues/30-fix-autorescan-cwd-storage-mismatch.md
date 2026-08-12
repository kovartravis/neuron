Type: task
Status: claimed
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

(none yet)

## Comments

- Chartered 2026-08-11, at the maintainer's direct request, immediately
  after this exact bug was caught and worked around (not fixed) mid-`27`'s
  grilling session. Root cause traced to source before filing rather than
  filed as "investigate a vague drift bug" — see Context.
