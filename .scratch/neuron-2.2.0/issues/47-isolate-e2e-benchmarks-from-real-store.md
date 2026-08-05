Type: task
Status: unclaimed
Blocked by: none
Band: unassigned

# 47 — Isolate E2E Benchmarks From the Real `.neuron` Store

## Question

Ticket [42](42-isolate-cli-tests-from-real-store.md) fixed the same-shaped bug
for every `execSync`-based CLI test `npm test` runs. While auditing it, two
files under `test/e2e/` — run by the separate `npm run test:e2e` command, not
`npm test` — turned out to carry the identical root cause via a different call
path: `NeuronMemory.open(workDir)`, where `workDir` is a subdirectory of this
repo with no `package.json`/`.git` of its own. `findProjectRoot` walks *up*
from `workDir` looking for a project boundary, doesn't find one until it
reaches this repo's own root, and resolves storage there — silently writing
into this repo's real `.neuron/*.md` instead of the intended isolated
workspace.

Confirmed live (via a raw `vitest run`, not `npm test`, so `test/e2e` was
included): `test/e2e/adversarial-recall.test.ts`'s `NeuronMemory.open(workDir)`
call added **10,633 lines** — its full synthetic filler/negative/gold corpus —
to the real `.neuron/learning.md` in a single run. `test/e2e/
benchmark-suite.test.ts` has the identical call shape
(`NeuronMemory.open(fixtureDir)` against `test/e2e/fixtures/
synthetic-polyglot`) and is presumed to have the same defect, though it
wasn't separately measured (its own synthetic workspace directory is
gitignored, but the resulting `.neuron` writes are not — the leak is in the
memory store, not the fixture).

Checked and confirmed **not** affected by this class of bug, no action
needed: `test/e2e/concurrency-stress.test.ts` and `test/e2e/
enrichment.test.ts` both resolve storage against an explicit `projectRoot`
passed directly to the `NeuronMemory` constructor (never `.open()`), which is
used literally rather than walked — isolated by construction.

## Fix shape

Same mechanism ticket 42 standardized on: write a `package.json` into
`workDir`/`fixtureDir` before the `NeuronMemory.open(...)` call, so
`findProjectRoot`'s upward walk stops at the intended isolated directory
instead of escaping into the real repo. One line in each file's setup,
matching the existing comment already left in `test/e2e/enrichment.test.ts`'s
`openStore` helper and `src/commands/init.test.ts`, both of which already do
this correctly.

## Deliverables

- [ ] Add the `package.json` guard to `test/e2e/adversarial-recall.test.ts`'s
      `beforeAll`
- [ ] Add the same guard to `test/e2e/benchmark-suite.test.ts`
- [ ] Run `npm run test:e2e` (or the specific files directly) against a clean
      `.neuron/*.md` baseline and confirm no diff afterward
- [ ] Re-check whether any other `test/e2e/*.test.ts` file uses
      `NeuronMemory.open()` against an unmarked subdirectory (only these two
      were found; not exhaustively re-audited beyond the four files listed
      above)

## Comments

- 2026-08-04: Split out of ticket 42's Answer. Not part of that ticket's
  literal deliverable (`npm test` never runs `test/e2e/*`, so it can't affect
  "`npm test` leaves `.neuron/*.md` byte-identical"), but the same bug shape,
  found during that ticket's audit, and real: anyone running
  `npm run test:e2e` locally is currently polluting their real store by
  10K+ lines per run.
