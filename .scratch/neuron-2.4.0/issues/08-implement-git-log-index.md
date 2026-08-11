Type: task
Status: resolved
Blocked by: none (39 resolved on neuron-2.3.0 before this ticket moved)
Band: context cost

# 08 — Implement the Git-Log Index

## Question

Build the git-log-as-searchable-resident-source feature per
[39](../../neuron-2.3.0/issues/39-git-log-index-design.md)'s rulings: the index itself, its refresh
mechanism, and its wiring into `src/commands/hook.ts`'s
session-start/pre-prompt injection path.

## Context

`14`'s `gitlog-search.mjs` is a measurement-only prototype (generic
`git log --grep` OR-matched keyword search, top 6 commits by recency,
formatted with an explicit "may be incomplete, verify yourself" caveat) —
`14` Scope item 3 deliberately told it not to be over-built before the A/B
answered whether the premise held. It now has, and `39` settles the shape.
This ticket is the real build, not a verbatim reuse of the prototype file
unless `39` ruled that its primitive is good enough to ship as-is.

`14` also surfaced a real search-quality risk worth designing around, not
just disclosing: ticket numbers collide across this repo's own concurrent
wayfinder maps (a naive keyword search for "ticket 14" surfaced a decoy
commit from `neuron-2.2.0`'s own, differently-numbered ticket 14). Whatever
this ticket builds should not regress on that — either scope queries away
from raw ticket numbers, or disambiguate by map/directory.

## Scope

1. Implement the index/search mechanism `39` ruled on (structured index or
   direct `git log` shell-out, per `39`'s Scope item 3 ruling).
2. Implement the refresh mechanism `39` ruled on (check-HEAD-on-read vs.
   git hook vs. both).
3. Wire injection into `src/commands/hook.ts` at the point(s) `39` ruled
   on (session-start / pre-prompt / both), reserving budget the same way
   `07`'s per-epoch char budget already does for other injected content —
   this is additive resident-footprint cost, not exempt from that
   accounting.
4. Implement whichever `history`-write-step change `39` ruled (removal of
   the `sessionEndStep` history-logging instruction in
   `src/config/protocolBlock.ts`, a modification of it, or no change if
   `39` ruled supplement-only) — NOTE: do not touch
   `src/config/protocolBlock.ts`'s actual generated output in this ticket;
   that's `41`'s scope. This ticket only implements the underlying
   mechanism a write-step change would rely on.
5. Tests: unit coverage for the index/search/refresh logic, plus a
   regression test reproducing the ticket-number-collision risk found in
   `14` if `39` ruled a disambiguation fix rather than accepting the risk
   as disclosed-only.

## Verification

- `npm test` green.
- `tsc --noEmit` clean.
- The injected git-log content is measurably bounded (reserves/charges
  budget through the same mechanism `07`/`11` use), not an unaccounted
  resident-cost regression.
- Manually dogfooded against this repo's own git history before marking
  resolved (a prompt naming a real past ticket/commit surfaces real,
  correct git-log content) — same live-demonstration bar `28`/`30` used.

## Deliverables

- [x] Git-log index + refresh mechanism implemented per `39`'s rulings
- [x] Wired into `hook.ts`'s injection path with budget accounting
- [x] Tests, `npm test`/`tsc` clean
- [x] Unblocks [09](09-update-init-skill-readme-for-git-log-index.md) and
      [11](11-rerun-gitlog-ab-semantic-mechanism.md) directly; [10](10-dogfood-git-log-index.md)
      still waits on `09` too

## Answer

Built exactly what `39` ruled, in three pieces:

**1. `src/harnesses/gitLog.ts` — pure git shell-out, no DB.** `getHeadSha`/`listAllCommits`/`listCommitsSince` parse `git log --format=%H\x1fsubject\x1fbody\x1fdate\x1e` (ASCII record/unit separators, not newlines — a commit body routinely contains newlines and even pipes/backticks/colons, so those can't be delimiters). Every failure mode (not a repo, no commits yet, a stale/rewritten SHA) degrades to `null`/`[]` rather than throwing, matching ADR 0014's fail-safe posture for anything on the hook path.

**2. `src/index.ts` — migration v9 + two new `NeuronMemory` methods.** `git_log_index` (hash/subject/body/embedding/committed_at) plus `git_log_fts`, an FTS5 table built exactly like `memories_fts` (content table + insert-only trigger, since commits are immutable). No `project_id` column — confirmed each project already gets its own SQLite file (`NeuronMemory.open`'s `projectHash`-named path), so the column `memories` carries for historical reasons doesn't apply here.
- `refreshGitLogIndex()`: check-HEAD-on-read. Reads `meta.git_log_last_indexed_sha`; if it equals current `HEAD`, no-op (verified via an embed-call-count spy: a second call with no new commits triggers zero embed calls). Otherwise embeds only the delta (`listCommitsSince`) or, on a store with no prior SHA, does the one-time full backfill (`listAllCommits`).
- `searchGitLog(text, limit)`: the literal reuse of ADR 0012's gate `39` called for — `ftsMatched` there is `cleanFtsQuery` + an FTS predicate against `memories_fts`; here it's the identical `cleanFtsQuery` against `git_log_fts`. Rows failing that lexical leg are filtered out *before* ranking, not demoted, so a topically-absent prompt yields true silence. Rows that pass are ranked by the same pre-normalized `dotProduct`/`toFloat32` dot-product scan `queryVector` already runs — no ANN index, no new dependency, exactly as `39` ruled.

**3. `src/commands/hook.ts` — pre-prompt only, additive budget.** A new `GIT_LOG_CHAR_BUDGET` (1000 chars, `harnesses/payload.ts`) is carved out of whatever's left of the epoch's `remaining` after the re-injected architecture card and this turn's memory recall — the same reservation shape the card itself already uses, so this is genuinely additive resident-footprint cost per the ticket's own Scope item 3, not a free ride. Formatting (`buildGitLogPayload`) mirrors `benchmarks/token-ab/gitlog-search.mjs`'s prototype constants (`maxCommits=6`, `bodyChars=240`) and carries `39` item 7's disclosure caveat verbatim in its header (ticket-number collisions across concurrent wayfinder maps — accepted as disclosed, not solved, per `39`'s ruling). Dedup reuses the session ledger's generic id-string set (`loadEpochState(...).injectedIds`) — a commit hash is just another opaque id there, so no parallel ledger mechanism was needed. On a zero-hit turn there is no "no matches" message (unlike the prototype) — true silence, per `39` item 6.

`sessionEndStep()` / `protocolBlock.ts` is untouched, per `39` item 2's supplement (not replace) ruling — nothing in this ticket's Scope item 4 required a change, since `39` ruled supplement-only.

**A real test-isolation bug surfaced and got fixed along the way, unrelated to the feature's own correctness but load-bearing for every other hook test:** `hook.test.ts`'s temp project directories have no `.git` of their own and sit nested inside this real repo's working tree — without a ceiling, `git rev-parse`/`git log` silently walk up and find *this* repo's actual history, which broke eight pre-existing tests expecting deterministic (mocked-store-only) output the moment real git-log content started riding along. Fixed by adding `GIT_CEILING_DIRECTORIES` to the test harness's `env()` — pointed at `tempDbDir` (`projectDir`'s parent), not `projectDir` itself; empirically, listing a directory as its own ceiling does not stop git from ascending one level past it, only listing an ancestor does. Tests that specifically exercise the git-log index `git init` their own `projectDir` first, becoming self-contained repos the ceiling never needs to matter for.

**Verification:** `npm test` (645/645) and `tsc --noEmit` both clean. One pre-existing test (`index.test.ts`'s v6→latest migration test) had its hardcoded `user_version` expectation bumped from 8 to 9 — a legitimate update, not a regression, since this ticket adds the ninth schema migration. New coverage: `src/harnesses/gitLog.test.ts` (9 tests — SHA/commit parsing against a real disposable repo, including a delimiter-safety case with pipes/backticks/colons in the body), `src/index.gitLog.test.ts` (8 tests — backfill, incremental-embeds-only-the-delta via a call-count spy, the FTS gate rejecting/accepting, ranking, and limit bounding), and four new integration tests in `hook.test.ts` (injection with the disclosure caveat present, true silence on a topical miss, ledger dedup + context-reset reappearance, and graceful degradation when the project isn't a git repo at all). Manually dogfooded against this repo's own real git history (per the `28`/`30` live-demonstration bar): a prompt naming ticket 06 by name correctly surfaced `65b9fcf6` (the real ticket-06 commit) and `e4742a9` (the follow-on ticket-07 commit) alongside real architecture-card and memory-recall content, with no stray files left in the working tree afterward.

Unblocks [09 — Update Generated Protocol Block, Packaged Skill & README for the Git-Log Index](09-update-init-skill-readme-for-git-log-index.md) and [11 — Re-run the Git-Log A/B Against the Real (Semantic) Mechanism](11-rerun-gitlog-ab-semantic-mechanism.md) directly. [10 — Dogfood the Git-Log Index in This Repo](10-dogfood-git-log-index.md) still waits on `09` too.
