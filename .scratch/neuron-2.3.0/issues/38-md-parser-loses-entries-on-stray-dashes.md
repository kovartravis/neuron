Type: task
Status: unclaimed
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
