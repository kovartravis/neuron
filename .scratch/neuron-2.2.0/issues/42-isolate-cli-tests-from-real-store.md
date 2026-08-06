Type: task
Status: resolved
Blocked by: none
Band: unassigned

# 42 — Isolate CLI Tests From the Real `.neuron` Store

## Question

Several CLI-invoking test files run `execSync` against `dist/cli.js` and
override `NEURON_DB_PATH` to get an isolated SQLite database, but never
isolate (or `chdir` away from) the markdown storage path. Under
`storage.mode: md` — the default since ticket
[31](31-md-only-as-default.md) — that means they read and write this
project's own real `.neuron/learning.md` and `.neuron/history.md`.

Confirmed while resolving ticket
[37](37-architecture-card-deterministic-artifact.md): running `npm test`
leaves test-authored entries (`"Always test first"`,
`"Vitest test runner requires --runInBand"`, etc.) in the real store, and
several assertions fail or go flaky because they count real pre-existing
entries the test never created (e.g. `expect(listRes).toHaveLength(1)`
receiving 5). Verified via `git stash` that this reproduces identically on
pre-`37` code — it is not a regression from `37`, it is fallout from `31`
that nothing has hit until now.

Affected so far (found by running the full suite once, not an exhaustive
audit): `src/commands/learn.test.ts`, `src/commands/history.test.ts`,
`src/cli.test.ts`, `src/commands/exec.test.ts`. There may be others — a full
audit of every `execSync`-based CLI test is part of this ticket.

## Fix shape

`src/commands/scan.fidelity.test.ts` and `src/commands/scan.determinism.test.ts`
already show the pattern that avoids this: construct a tmp project directory,
`process.chdir()` into it (or pass an explicit storage path), and construct
storage against that directory rather than inheriting `process.cwd()`. The
open questions are mechanical, not design: whether to standardize on
`chdir` + tmp `neuron.yaml`, an env var that overrides the markdown storage
path the same way `NEURON_DB_PATH` overrides the SQLite path, or something
else — and how many of the existing `execSync`-based CLI tests need the
same treatment.

## Deliverables

- [x] Audit every CLI test that shells out to `dist/cli.js` for this gap
- [x] Pick one isolation mechanism and apply it consistently
- [x] `npm test` leaves `.neuron/learning.md`, `.neuron/history.md`,
      `.neuron/decisions.md` byte-identical to before the run
- [x] The 4 currently-failing assertions (`learn.test.ts`,
      `history.test.ts` ×2, `cli.test.ts`) pass once isolated

## Comments

- 2026-08-03: Split out of ticket 37's Fallout section. Not a design
  question — typed `task` rather than `grilling` — but real and currently
  live: every `npm test` run in this repo pollutes the maintainer's actual
  memory store until this lands.

## Answer

**Mechanism chosen: plant a `package.json` in a per-test tmp project directory
(nested under the file's existing gitignored `src/__tests__/temp-*` dir), then
pass `cwd: projectDir` to every `execSync`/`spawnSync` call.** `package.json`
alone is sufficient — `findProjectRoot`/`findNeuronYaml` both stop walking
upward the instant they see one, so the process falls through to schema
defaults (`DEFAULT_CONFIG`, which already declares `learning`/`history`/
`decisions`/`architecture` — no hand-written `neuron.yaml` needed for plain
CRUD tests). This is not a new pattern — it is the one `init.test.ts` and
`memory.test.ts`'s own `the --category contract` block already used
correctly; the fix is applying it everywhere else in this file family, not
inventing a new mechanism (the ticket's other candidates — `chdir` globally,
or a new `NEURON_MD_PATH`-style env var touching production config
resolution — were both rejected: `chdir` mutates global process state for a
whole vitest worker, and the env var means changing `src/config/neuronYaml.ts`
for what turns out to be a purely mechanical test-only gap).

**Audit findings, precisely scoped to what `npm test` (`vitest run --dir
src`) actually runs** — it does *not* include `test/e2e/*.test.ts`, which is
a separate `npm run test:e2e` command:

- Unisolated and fixed: `src/cli.test.ts` (all 3 tests), `src/commands/
  exec.test.ts` (first 5 of 6 tests — the 6th already had its own correct
  isolation), `src/commands/history.test.ts` (all 4 tests),
  `src/commands/learn.test.ts` (all 4 tests), `src/commands/memory.test.ts`
  (the top-level test plus the `argv boundary handling` and `category
  enforcement` blocks — `the --category contract` block was already
  isolated and untouched).
- Confirmed already safe, no change needed: `src/commands/init.test.ts`
  (every test already plants its own `package.json`+`cwd`),
  `src/commands/scan.test.ts` (all 3 invocations pass `--dry-run` or
  `--json`, both of which gate `handleScanCommand` into a read-only path
  before any ingest runs), `src/commands/feedback.test.ts` (never touches
  `NeuronMemory` at all), `src/commands/status.test.ts` (reads only —
  triggered a real-store reconcile but produced zero diff in every observed
  run).
- **Scope note beyond the ticket's literal text**: `test/e2e/
  adversarial-recall.test.ts` and `test/e2e/benchmark-suite.test.ts` carry
  the *same* root bug via `NeuronMemory.open(workDir)` (which walks
  `findProjectRoot` up past an unmarked `workDir` to this repo's root) —
  confirmed by re-running the suite once via a raw `vitest run` (not `npm
  test`), which added 10,633 real lines to `.neuron/learning.md` from
  `adversarial-recall.test.ts`'s filler corpus alone. Left unfixed here:
  `npm test` never runs `test/e2e/*`, so it's out of *this* ticket's literal
  deliverable (byte-identical after `npm test`), and E2E ownership/tiering
  is a different surface — filed as a fresh, precisely-scoped follow-up
  rather than silently expanding this ticket's diff.
  `test/e2e/concurrency-stress.test.ts` and `test/e2e/enrichment.test.ts`
  were checked and are already safe (both resolve storage paths relative to
  an explicit `projectRoot` passed straight to the constructor, which is
  never walked, unlike `.open()`).

**A masked regression, found only because isolation removed the noise
hiding it**: `cli.test.ts`'s `--scopes`-is-a-no-op test asserted
`history query "pipeline" --scopes gamma` returns 2 results, but one of its
two seeded entries ("Beta deployment finished") shares no token with
"pipeline" at all. Under the old unisolated setup this passed by accident —
the real store's own unrelated noise supplied enough incidental FTS matches
to satisfy the count regardless of what the test itself added. Once
isolated, ticket 41's lexical relevance gate (landed the same day, ahead of
this ticket in the rc5 band) correctly rejects the unrelated entry and the
count drops to 1 — a real, pre-existing test bug that store pollution had
been silently masking, not something this fix caused. Corrected by making
both seeded entries share the query token (`"Beta pipeline finished"`),
mirroring the pattern the test already uses one block above it for the
`learn query "rule"` case — the point of the assertion is that `--scopes` is
a no-op, not that unrelated content should surface.

**Verification**: reverted the real `.neuron/*.md` pollution accumulated
during audit exploration via `git checkout -- .neuron/*.md` (safe — those
three files are git-tracked, and the diff was pure test-run noise), then ran
`npm test` twice consecutively from that clean baseline: 44/44 files,
437/437 tests green both times, `git status`/`git diff --stat .neuron/`
empty after each run.
