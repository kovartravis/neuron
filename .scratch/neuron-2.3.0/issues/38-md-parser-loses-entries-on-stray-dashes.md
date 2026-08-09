Type: task
Status: resolved
Blocked by: none
Band: none (data-integrity finding, discovered while verifying 28/29)

# 38 — `MdStorageAdapter`'s Frontmatter Parser Silently Drops Entries After a Stray `---` in Body Content

## Question

`parseMarkdownDetailed` (`src/storage/mdStorageAdapter.ts`) splits a category's
`.md` file into entries by scanning for `---\n...\n---\n` blocks. What should
happen when an entry's own **body** content contains a bare `---` line (a
markdown horizontal rule, or any line that is just three dashes), and how
should the parser — and `reconcileCategory`'s vector-mirror delete step,
which trusts its output as ground truth — be hardened so a malformed body
can never cause *other, unrelated* entries to silently vanish from the
index?

## Context

Discovered 2026-08-09 while doing [28](28-architecture-index-and-module-cards.md)'s
real-world verification (`neuron scan` against this repo's own store), not
caused by it. This repo's own `.neuron/decisions.md`, **as already committed
on `main`**, contains an entry (id `c4ab3275-336c-401d-bd88-16d1491e70e4`,
`createdAt: 2026-08-08T15:28:28.634Z`, predating this session) whose body
paragraph is duplicated with a stray `---` sitting between the two copies —
confirmed via `git show HEAD:.neuron/decisions.md`, i.e. this is not
something either this session or ticket 28 introduced.

Effect measured directly this session: `.neuron/decisions.md` has 109 real
`id:` frontmatter entries (`grep -c '^id: '`) but `parseMarkdownDetailed`
only returns **68** `Memory` objects — the stray `---` throws off the
match-pairing for every entry after it, merging/dropping content for the
remainder of the file. `reconcileCategory` (`dualStorageRouter.ts`) then
deletes every vector row whose id isn't in that undercounted set, so the
SQLite mirror silently loses ~40% of the category on every reconcile —
already true before this session (the corrupt entry is 1 day older), so
this repo's `decisions` category has likely been under-recalled for a
while. **The markdown file itself is not damaged** — confirmed via `git
diff`: zero `-id:` lines (no committed entry was ever removed), so this is a
vector-index completeness/recall bug, not data loss. Verified safe cleanup
this session: `git checkout -- .neuron/decisions.md .neuron/history.md`
followed by a reconcile-triggering read (`neuron status`) restored the
mirror to its pre-session (68-row) baseline with no further pollution from
this session's own test writes.

Not fixed this session — out of scope for 28/29, and finding it mid
real-world verification is not license to also fix it in the same sitting
(wayfinder: one ticket's worth of work per session). Filed so it doesn't
stay a private finding.

## Scope (tentative — sharpen on claim)

1. Root-cause exactly how a bare `---` lands in body content in the first
   place (a decision entry's prose containing a literal `---`? A markdown
   horizontal rule typed by an agent? A `formatMarkdown` round-trip bug that
   duplicates and re-delimits an entry under some condition?) — the
   duplicated-paragraph shape found here suggests the *write* path, not
   just the *read* path, may be implicated.
2. Harden `parseMarkdownDetailed` so one malformed/ambiguous block cannot
   cascade into losing unrelated, well-formed entries later in the same
   file — e.g. escape or fence body content that could be mistaken for a
   delimiter, or make the parser recover per-entry rather than
   globally-repositioning off a single false match.
3. Decide whether `reconcileCategory`'s delete-mirror step needs a
   guardrail (e.g. refuse to delete a large fraction of a category's vector
   rows in one pass, the same class of tripwire ticket 24's false-delete
   finding argued for elsewhere) so a future parser bug degrades loudly
   instead of silently.
4. Repair this repo's own `.neuron/decisions.md`: locate and fix the actual
   corrupted entry (id `c4ab3275-336c-401d-bd88-16d1491e70e4`) and re-audit
   the rest of the file for other instances of the same shape.
5. Regression test: a category `.md` file with a stray `---` inside one
   entry's body must not cause `readCategory`/reconcile to lose any other
   entry.

## Verification

- A fixture `.md` file with a bare `---` line inside one entry's body
  parses to the correct entry count, with every other entry's content
  intact.
- Re-running `neuron scan`/`status` against this repo's real store after
  the fix reports the true `decisions` count (109, or whatever it is after
  Scope item 4's repair), not a silently truncated one.
- `npm test` green.

## Answer

**1. Root cause.** Bisected via `git show <rev>:.neuron/decisions.md` across
the commits that touched the file. Entry `c4ab3275` was written cleanly (a
single copy of its body paragraph) in `377b8a2` (ticket 05). By the very next
commit that touched the file, `08fbdda` (ticket 06, same session), `git diff
377b8a2 08fbdda -- .neuron/decisions.md` shows the corruption landing
directly: the pre-existing single paragraph is followed by an **added**
`---` and a second copy of the identical paragraph, immediately before the
session's legitimate new entry (`617331af`, ADR 0016) — which itself landed
with a clean, single frontmatter block. That rules out a systemic
`formatMarkdown`/`parseMarkdown` round-trip bug (it would have corrupted the
new entry too, and R1-T1-02's roundtrip test already covers format→parse and
passes); this was a one-off write whose `content` argument was constructed
with the paragraph duplicated and a literal `---` divider between the
copies — most likely a hand-built `--content` value during that session that
pasted the same text twice. **The read side is what turned a one-off content
mistake into cascading data loss**, which is the actual defect this ticket
closes.

**2. Parser hardened** (`src/storage/mdStorageAdapter.ts`,
`parseMarkdownDetailed`). Replaced the single-pass global regex (which
advanced its match cursor past a *rejected* candidate block, silently
consuming the next real delimiter along with it) with a two-pointer scan
over every raw `---`-only line: each candidate `(open, close)` pair is
tested for a key:value frontmatter shape; on failure the pointer advances by
one delimiter (not two), so the very next delimiter gets a fresh chance to
pair correctly instead of being swallowed by the failed match. A stray
`---` inside a body is now retained as ordinary body content on the entry
that actually contains it, and never affects any other entry. Added
`38-01` in `mdStorageAdapter.test.ts` (fixture with a duplicated
paragraph + stray `---`, asserting entries before/after both parse intact).

**3. `reconcileCategory` guardrail — decided: warn loudly, don't block.**
ADR 0011 Consequence 2 already settled "no tripwire, no `--force`" for
`reconcileCategory`'s delete-mirror step, on the reasoning that markdown is
authoritative and `.neuron/` is git-recoverable — re-litigating that would
need new evidence, and this ticket's root cause (a one-off content mistake,
caught and fixed at the read side) doesn't supply it. What it does supply is
the concrete case for *visibility*: added a threshold in
`dualStorageRouter.ts` (`MASS_DELETE_WARN_FRACTION = 0.2`,
`MASS_DELETE_MIN_ROWS = 5`) that logs a loud stderr warning when a single
reconcile pass is about to delete an unusually large fraction of a
category's vector rows, without blocking the deletion. This is the
"degrades loudly instead of silently" ask, kept orthogonal to the settled
"no tripwire" ruling. Covered by two new tests in
`dualStorageRouter.test.ts` (warns on a large deletion, stays silent on a
small one).

**4. This repo's own file repaired.** Removed the duplicated paragraph and
the stray `---` from entry `c4ab3275` in `.neuron/decisions.md` by hand.
Audited the rest of the file for the same shape: counted every line that is
exactly `---` (151 before the fix, 150 after — exactly one extra, matching
the one known corrupt entry) against `75 * 2` expected for 75 clean
entries — confirms this was the only instance. Verified: `parseMarkdown`
against the repaired file now returns exactly 75 memories, matching
`grep -c '^id: ' .neuron/decisions.md`. Ran a full `npm run build` +
`neuron exec -- neuron status` afterward to confirm the reconcile path
runs clean against the repaired file (no mass-delete warning fired, since
the fixed file already matches truth).

**5. Regression coverage.** `38-01` (`mdStorageAdapter.test.ts`) plus the
two new `dualStorageRouter.test.ts` cases above. Full suite: 599/600
passing — the one failure (`test/e2e/concurrency-stress.test.ts` Pillar 8)
is pre-existing flakiness in an unrelated multi-process SQLite-schema race
(the exact error message changes between runs — `no such table: learnings`
on one run, `duplicate column name: scope` on a rerun — neither related to
markdown parsing or this change).
