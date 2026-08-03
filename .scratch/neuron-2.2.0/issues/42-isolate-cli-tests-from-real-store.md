Type: task
Status: unclaimed
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

- [ ] Audit every CLI test that shells out to `dist/cli.js` for this gap
- [ ] Pick one isolation mechanism and apply it consistently
- [ ] `npm test` leaves `.neuron/learning.md`, `.neuron/history.md`,
      `.neuron/decisions.md` byte-identical to before the run
- [ ] The 4 currently-failing assertions (`learn.test.ts`,
      `history.test.ts` ×2, `cli.test.ts`) pass once isolated

## Comments

- 2026-08-03: Split out of ticket 37's Fallout section. Not a design
  question — typed `task` rather than `grilling` — but real and currently
  live: every `npm test` run in this repo pollutes the maintainer's actual
  memory store until this lands.
