# Repo Cleanup Punch List

Deliverable for [ticket 15 — Audit: Repo Cleanup Punch
List](15-audit-repo-cleanup-punch-list.md). Sweep of code readability and
repo hygiene, `.scratch/` excluded per that ticket's scope (governed by
[ticket 14](14-neuron-as-tracker-design.md) instead). Each item below is
sized so it can graduate directly into its own implementation ticket.

## Root-level stray docs

| File | Size | Verdict | Why |
|---|---|---|---|
| `RELEASE_2.0.0.md` | 2.2KB | **Delete** | A pre-release checklist for `2.0.0`, fully subsumed by `CHANGELOG.md`'s own `## [2.0.0]` entry (same six feature bullets, same content, already dated and in the canonical place). Zero repo-wide cross-references (checked: no doc, script, or `package.json` field points to it). Pure working-note residue from before the changelog existed as the release record. |
| `TEST_INFRA.md` | 2.3KB | **Delete or fold into `md-file-management`'s own test file** | Documents a single feature's (`md-file-management`, R1-R4) test-tier breakdown from `2.0.0`-era work. Zero cross-references anywhere in the repo — not linked from `README.md`, `CONTEXT.md`, or `docs/`. Scoped far narrower than the current 14-subsystem, multi-hundred-test codebase; reads as a one-off planning artifact for a single PR, not living documentation. If the tiered-testing methodology itself is worth keeping as a convention, it belongs in `docs/` (e.g. a short section in `CONTEXT.md` or a dedicated `docs/testing.md`), not a root file scoped to one already-shipped feature. |
| `TEST_READY.md` | 960B | **Delete** | A "tests are green, here's the tally" snapshot for the same `md-file-management` work `TEST_INFRA.md` covers — same 53-test breakdown, restated. Zero cross-references. Strictly a point-in-time status note; `npm test`'s own output is the current source of truth for pass/fail, and CI (if/when added) supersedes a hand-written snapshot entirely. |

Risk: low. None of the three is referenced by code, `package.json`, or other
docs — deleting them can't break a build or a documented workflow. Size:
trivial (three `rm` calls plus, optionally, migrating `TEST_INFRA.md`'s
tiered-methodology description into `CONTEXT.md` if the maintainer wants the
*convention* kept even though this specific write-up is retired).

## `tmp/`

`tmp/` is untracked, holds `tmp/token-ab-dryrun-check/results.json`, and is
**not** covered by `.gitignore` (confirmed: no `tmp` entry in `.gitignore`,
which otherwise carefully lists specific generated paths like
`benchmarks/reports/e2e-vitest-results.json` and
`src/__tests__/temp-*/`). Two live options, not a size/risk call this ticket
should make unilaterally:

- Add `tmp/` to `.gitignore` if it's an accepted scratch convention for
  benchmark dry-run output (matches the existing pattern of gitignoring
  specific regenerable benchmark artifacts).
- Delete the current contents and route future dry-run output somewhere
  already-ignored (e.g. under `benchmarks/reports/`) if `tmp/` itself
  shouldn't exist as a convention.

Risk: low, size: trivial either way — this is a one-line `.gitignore`
decision plus a `rm -rf tmp/`, not new code.

## `src/` readability and structure

**`console.log` audit — no debug residue found.** All 12 files grep flagged
turned out to be legitimate on inspection, not a candidate list needing
triage:

- `src/scanner/fingerprint.test.ts:69` and `src/scanner/treesitter.test.ts:120`
  are both false positives — the string `console.log(...)` appears *inside*
  fixture source code being fed to the scanner/parser under test, not as an
  actual call in test logic.
- The other 10 (`cli.ts`, `commands/{feedback,history,init,learn,memory,scan,status,sync,ui}.ts`)
  are all intentional CLI output: help text, `--json` output contracts, or
  user-facing progress lines (`sync.ts`'s `[sync] ...` progress, gated on
  `process.stdout.isTTY`). None read as leftover debug statements.

No action item here — audited and cleared, not a punch-list entry.

**`src/__tests__/` is empty and untracked.** Not a git hygiene problem (git
doesn't track empty directories, so it isn't showing as untracked in `git
status`) but it exists on disk as a leftover from test runs targeting
`src/__tests__/temp-*/` (already gitignored). No action needed — this is
expected transient scaffolding, not repo drift.

**`src/outside_dir.md` and `src/traversal_test.md` are intentional, not
stray.** Initially looked like fixture files that escaped a temp directory
(same shape as the `tmp/` finding above), but both are tracked since
`111be94` (`v2.0.0-rc2`) and are actively read by
`src/storage/multiRootMdStorage.test.ts:79` and
`src/storage/mdStorageAdapter.challenger.test.ts:133` as path-traversal
attack fixtures (`../../outside_dir` as a malicious category name, verifying
the storage layer rejects escaping its root). Checked, not flagged.

**Module boundaries vs. the 14-subsystem architecture card: one real gap.**
`src/__tests__/` aside (transient, addressed above), the on-disk `src/`
top-level layout matches the architecture card's 14 subsystems
(`commands`, `components`, `config`, `e2e`, `harnesses`, `models`, `scanner`,
`shared`, `storage`, `ui`, plus `benchmarks`/`longmemeval` outside `src/` and
`src/` itself) with no orphaned or undocumented directory. `src/shared` is
notably thin (1 file) relative to its neighbors (`components` 10,
`harnesses` 22) but that's a size observation, not a structural problem —
not sized as a punch-list item.

**Duplicate-looking `e2e` directories are two different things, not a
duplication.** `src/e2e/` (1 file) and `test/e2e/` (9 files) look redundant
at a glance but serve different roles: `src/e2e/` holds the in-source E2E
suite compiled and run by `npm test` (`mdFileManagement.e2e.test.ts`, per
`TEST_INFRA.md`'s own Tier 4 description), while `test/e2e/` is the
standalone benchmark/scorecard harness (`benchmarks/e2e-runner.js` targets
it, per `package.json`'s `test:e2e`/`bench` scripts) with its own fixtures
directory already gitignored
(`test/e2e/fixtures/synthetic-polyglot/`). Naming collision, not a code
problem — if it's worth resolving, the fix is a rename (e.g. `test/e2e` →
`test/benchmark-e2e` or similar) purely for human navigability, not a
merge. Small, cosmetic; not urgent.

No dead-code or legacy-scaffolding candidates surfaced beyond the above —
this was a structural/naming sweep, not a per-file line-level review, and
none of the size numbers (28 files in `commands/`, 22 in `harnesses/`, etc.)
stood out as anomalous for an actively-developed CLI at this stage.

## `CHANGELOG.md`

58KB across 11 release sections (`2.0.0` through `2.3.0`, including two
`-rc` entries), each written in the prose style seen in `2.3.0`'s own entry
above (multi-paragraph, not terse bullet lists) — that verbosity is *why*
it's large, not because of clutter or duplication. Determination: **fine
as-is for now.** This project is ~2 weeks into active, frequent releases;
the size is proportional to real release density, and nothing in it reads
as stale or wrong. Revisit if/when the file crosses a size that makes it
unwieldy to open or diff (no such threshold observed yet) — likely by
archiving pre-2.x entries to a `CHANGELOG-archive.md` at that point, not by
trimming content. Not sized as a punch-list item today.

## Summary — candidates to graduate

1. **Delete `RELEASE_2.0.0.md`, `TEST_INFRA.md`, `TEST_READY.md`** (optionally
   migrating `TEST_INFRA.md`'s tiered-methodology description into
   `CONTEXT.md` first, maintainer's call whether that's worth keeping).
   Trivial size, low risk.
2. **Decide `tmp/`'s fate**: gitignore it as an accepted scratch convention,
   or delete its contents and stop using it. Trivial size, low risk.
3. *(Optional, cosmetic)* Rename `test/e2e/` to disambiguate it from
   `src/e2e/` — not urgent, human-navigability only.

Everything else audited in this sweep (`console.log` calls, `src/__tests__`,
the traversal-test fixtures, module boundaries, `CHANGELOG.md` size) was
checked and cleared, not flagged.
