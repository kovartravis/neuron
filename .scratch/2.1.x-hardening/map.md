# Map — 2.1.x Hardening

## Destination

A `2.1.x` line — and the storage/CLI layer `2.2.0` is built on — whose
required-looking flags, reported statuses, and reconciliation logic actually
do what they claim. Not a feature effort: this tracks bugs found and fixed
while auditing the codebase for release-readiness, after the maintainer
inherited it from a prior, lower-quality agent and found it "hard to tell
people to use."

Reaching the end looks like: every ticket here resolved or explicitly
deferred, and the pattern that produced them (a mechanism that looks
validated but isn't, downstream of a piece of state that's never actually
written) stops recurring on a fresh pass.

## Notes

- Every ticket here shipped as an actual patch release (`v2.1.2`–`v2.1.6`),
  tagged and pushed to `main`, then forward-ported by cherry-pick onto
  `feat/2.2.0-tree-sitter-grammars`. Ticket `01`'s Answer section has the
  exact commit for each.
- **`npm publish` is the maintainer's step**, per the precedent set at
  `v2.2.0-rc1`. As of ticket `06`, four releases (`v2.1.3`–`v2.1.6`) are
  tagged and pushed but not yet published — only `v2.1.2` is live.
- The recurring shape worth naming: every bug here is a mechanism that
  *looks* validated — a required flag, a reported status, a "newer wins"
  comparison — but isn't, because the thing it depends on (a SQL predicate,
  a second store's result, a timestamp) is either never checked or never
  actually written. Worth grepping for deliberately, not just reacting to.

## Decisions so far

- [01 — Argv Boundaries Silently Discarded on add/update/query](issues/01-argv-boundary-truncation.md)
  — Unquoted content truncated to its first word on write, one word searched
  on read, typo'd flags vanished, `--help` stored as content. All exit `0`.
  26% of this project's own store was destroyed this way. `v2.1.2`.
- [02 — Packaged Skill Understated prune's Blast Radius](issues/02-prune-docs-blast-radius.md)
  — Docs said `importance 1–2` (0 of 160 entries); code deletes `<=3`
  inclusive (158 of 160). Docs-only fix. `v2.1.3`.
- [03 — delete/update Required --category, Then Never Used It](issues/03-delete-update-ignore-category.md)
  — Both validated the flag's presence and ignored it in the SQL predicate;
  any id could be deleted or overwritten under any claimed category.
  `list --categories` had the matching read-side bug. `v2.1.4`.
- [04 — dual-Mode update/delete Reported Only Markdown's Outcome](issues/04-dual-mode-status-misreport.md)
  — `vecResult` computed and never consulted; a real vector-side delete or
  update could report `not_found`. `v2.1.5`.
- [05 — sync Silently Overwrote Fresh Content With Stale Content](issues/05-sync-conflict-guessing.md)
  — Conflict resolution compared `createdAt`, which never changes after
  creation on either side, so the tie-break always favoured markdown
  regardless of actual freshness. Now reports conflicts instead of
  guessing; changes the documented manual-edit workflow. `v2.1.6`.
- [06 — main Was Orphaned at v2.1.0 While npm Shipped Through v2.1.2](issues/06-main-orphaned-from-releases.md)
  — Two releases published from a branch never merged back. Fixed by real
  merge, not rebase. Changed the working pattern for `03`–`05` to "patch
  directly on `main`."

## Not yet specified

- Whether the `--force`/"markdown always wins" resolution in `05` and the
  reported-conflict UX need a richer story once real usage happens — e.g. a
  `--prefer-vector` flag, if `07` doesn't make the question moot.

## Out of scope

- Cleaning up the 61 argv-truncated entries in this project's own memory
  store (ticket `01`) — maintainer declined; the shipped defect mattered
  more than this store's own damage.

## Frontier

- [07 — Give sync a Real Last-Modified Signal](issues/07-sync-needs-real-freshness-signal.md)
  — Design question, not a hazard: `05` already shipped the safe behaviour.
- [08 — Are split-Mode Concurrent Writes Race-Safe?](issues/08-split-mode-concurrent-write-races.md)
  — Unverified suspicion from reading `mdStorageAdapter.ts`'s read-modify-
  write shape, not a reproduction.
- [09 — Does computeMemoryHash Ever Get Compared Across Different IDs?](issues/09-hash-collision-dedup-risk.md)
  — Lowest-priority, most speculative of the three; may resolve to "no bug
  here."
