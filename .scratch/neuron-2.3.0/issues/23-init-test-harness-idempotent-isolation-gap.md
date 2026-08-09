Type: task
Status: resolved
Blocked by: none
Band: catch-all

# 23 — `init.test.ts`'s "harness-idempotent-test" Case Still Pollutes the Real `.neuron` Store

## Question

Which one line does `src/commands/init.test.ts`'s idempotency test need
added to stop leaking into this repo's real `.neuron/` directory, matching
the isolation guard every sibling test in the file already uses?

## Context

Surfaced 2026-08-08 while resolving ticket
[06](06-storage-mode-override-remove-split.md): `git diff --stat -- .neuron/`
before a commit showed the real `decisions` category's architecture
blueprint card silently overwritten with test fixture content (project name
`harness-idempotent-test`, `0` modules). Traced to `init.test.ts`'s
`'is idempotent — running twice overwrites skill without error'` test:

```js
it('is idempotent — running twice overwrites skill without error', () => {
  const initTempDir = path.join(tempDbDir, 'harness-idempotent-test');
  fs.mkdirSync(path.join(initTempDir, '.agents'), { recursive: true });
  // no package.json written here
  const env = { ...process.env, NEURON_DB_PATH: tempDbPath, NEURON_MOCK_EMBEDDER: 'true' };
  execSync(`node ${cliPath} init`, { env, cwd: initTempDir });
  ...
```

No `package.json` is planted in `initTempDir`. `findProjectRoot`
(`src/commands/utils.ts:14-26`) walks upward from `cwd` and only stops when
it finds a `package.json` or `.git` — with neither present in the temp dir,
it keeps climbing (`temp-init` → `src/__tests__` → `src` → this repo's own
root) and lands on the real project. `neuron init`'s SQLite writes stayed
isolated (`NEURON_DB_PATH` is overridden), but its markdown/scan writes
under `storage.mode: md` went into the real `.neuron/decisions.md`. The
very next test in the same file
(`'installs Claude Code hooks non-interactively...'`) shows the correct
pattern — `fs.writeFileSync(path.join(initTempDir, 'package.json'), '{}')`
— that this one test is simply missing.

**This is a gap in [ticket 42](../neuron-2.2.0/issues/42-isolate-cli-tests-from-real-store.md)'s
audit, not a regression it introduced.** Ticket 42's own commit (`290ad3b`)
never touched `init.test.ts` at all — its Answer states the file was
"already safe... every test already plants its own package.json+cwd," which
holds for every other test in the file but not this one. Verified this
session that the pollution never reached the real production SQLite
database (only the `.neuron/*.md` mirror) — `NEURON_DB_PATH` isolation held;
only the markdown-path isolation this specific test forgot did not — and
the corrupted markdown was restored from `git show HEAD` before committing
ticket 06's own work.

## Scope

1. Add `fs.writeFileSync(path.join(initTempDir, 'package.json'), '{}')`
   (or equivalent) to the `'is idempotent...'` test, before the first
   `execSync` call — mirroring the very next test in the same file.
2. **Re-run the audit ticket 42 already established a pattern for**, but
   scoped to *every individual test*, not file-level skimming: grep every
   `execSync`/`spawnSync` invocation across `src/commands/*.test.ts` and
   `src/cli.test.ts` for a temp dir lacking its own `package.json` before
   the first CLI invocation that touches it. This one test proves file-level
   "this file already looks isolated" judgments can miss an individual test
   within an otherwise-safe file.
3. Verify: `git diff --stat -- .neuron/` is empty after `npm test`, run
   twice consecutively from a clean `git status` baseline — the exact
   verification ticket 42's own Answer used.

## Deliverables

- [x] `package.json` guard added to the `harness-idempotent-test` case
- [x] Every other `execSync`/`spawnSync`-based CLI test individually
      re-checked, not just file-level
- [x] `npm test` twice consecutively leaves `.neuron/*.md` byte-identical

## Answer

Fixed the named test, then found the per-test audit (Scope item 2) was load-
bearing: `init.test.ts` had **five** gaps, not one — the file has no global
`beforeEach` planting `package.json` the way every other CLI test file does,
so each test manages its own temp dir individually, and file-level "this file
already looks safe" judgments (ticket 42's mistake, repeated) miss individual
tests within it.

**Root cause, same as ticket 42's original audit:** `findProjectRoot`
(`src/commands/utils.ts:14-26`) only stops climbing on `package.json` or
`.git`; a temp dir with neither climbs past `.agents`/`.claude`/`.cursor`
markers (irrelevant to the climb) straight to this repo's real root. `neuron
init` triggers a real write via `ingestScanResults` whenever
`config.scan.enabled` is true — true for whatever `neuron.yaml` the climb
lands on, i.e. this repo's own — so an unguarded `init` test pollutes
`.neuron/decisions.md` for real, not just in principle.

**Gaps found and fixed, all in `src/commands/init.test.ts`:**
1. `'should support the init command to copy skills to detected harness dirs'`
   (line 24) — `initTempDir = 'init-test-project'`
2. `'copies skill to existing .agents/ directory when present'` (line 43) —
   `'harness-agents-test'`
3. `'copies skill to all detected harness dirs (.claude/ + .cursor/)'`
   (line 61) — `'harness-multi-test'`
4. `'falls back to .agents/skills/ when no harness dirs present'` (line 82) —
   `'harness-fallback-test'`
5. `'is idempotent — running twice overwrites skill without error'`
   (line 172, the ticket's original) — `'harness-idempotent-test'`

Each got `fs.writeFileSync(path.join(initTempDir, 'package.json'), '{}')`
added before its first `execSync`, matching the pattern every later test in
the same file (starting at line 101) already used.

**Audit method (Scope item 2):** grepped every `execSync`/`spawnSync` call
across `src/commands/*.test.ts` and `src/cli.test.ts` (10 files), then for
each file checked whether every individual test's temp dir gets a
`package.json` before its first CLI invocation — not just whether the file
"looks isolated" at a glance:
- `exec.test.ts`, `history.test.ts`, `hook.test.ts`, `learn.test.ts`,
  `cli.test.ts` — safe: a single top-level `describe` with one global
  `beforeEach` that plants `package.json` for every test, no nested
  `describe`s with separate setup.
- `memory.test.ts` — safe: three nested `describe` blocks each carry their
  own `beforeEach` planting `package.json`; the one top-level test also
  plants its own inline.
- `exec.test.ts`'s one exception (the ticket-41 relevance-gate test) uses
  `os.tmpdir()`, not a path under this repo — outside the climb's reach
  entirely, so no guard is needed there; already commented as deliberate.
- `feedback.test.ts` — no `cwd`/`env` override at all (runs at the real repo
  root by default), but the `feedback` command only builds a GitHub issue URL
  and never touches storage. Nothing to isolate.
- `scan.test.ts` — same real-root default, but every invocation passes
  `--dry-run`; confirmed no write path. `result.projectRoot === process.cwd()`
  is asserted deliberately.
- `status.test.ts` — same real-root default; `handleStatusCommand`
  (`src/commands/status.ts`) is read-only (status, cost summary, drift diff),
  confirmed by reading the command source.
- `init.test.ts` — the five gaps above; fixed.

**Verification (Scope item 3):** clean `git status` baseline on `.neuron/`,
`npm test` run twice consecutively — 552/552 both times, `git diff --stat --
.neuron/` empty after each run. `tsc --noEmit` also clean.
