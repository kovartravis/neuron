Type: task
Status: unclaimed
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

- [ ] `package.json` guard added to the `harness-idempotent-test` case
- [ ] Every other `execSync`/`spawnSync`-based CLI test individually
      re-checked, not just file-level
- [ ] `npm test` twice consecutively leaves `.neuron/*.md` byte-identical
