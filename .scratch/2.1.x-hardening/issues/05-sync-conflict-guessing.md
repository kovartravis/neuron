Type: task
Status: resolved
Blocked by: none

# 05 — `neuron sync` Silently Overwrote Fresh Content With Stale Content

## Question

When `sync` finds an entry with different content on both sides, does it
pick the side that's actually newer?

## Context

`sync` resolved content conflicts by comparing `createdAt` between the
vector DB and the `.md` file, defaulting to markdown whenever `mdTime >=
dbTime`. The flaw: `.md` frontmatter has no `updatedAt` field at all, and a
normal `memory update` never touches `createdAt` on either side — it's set
once at creation and frozen forever. On any **genuine** conflict the two
timestamps are therefore almost always equal, and the tie-break always
resolved to markdown, regardless of which side actually held the newer
content.

Reproduced end to end:

```
$ neuron memory update <id> "the real, fresh, correct content" --category learning
{"status":"updated"}          # vector DB genuinely holds the fresh content

  (a transient divergence leaves the .md copy stale — the exact partial-
   failure shape ticket 04 was written to surface)

$ neuron sync
[sync] Sync complete: 1 to vector DB, 0 to markdown, 0 skipped.
  # the fresh update is GONE, silently replaced by stale markdown content
```

## Answer

Resolved 2026-08-02. `sync` now only auto-propagates entries missing
entirely from one side — genuinely unambiguous. An entry present on both
sides with different content is reported as a **conflict**: left untouched,
printed by category/id, non-zero exit. `--force` remains the explicit
override and keeps its pre-existing documented meaning ("force re-embed,
ignoring content hashes" = markdown wins). There is deliberately no
equivalent "vector wins" flag — an unresolved conflict already leaves the
vector data untouched, which is the safe default.

**This changes a documented workflow.** "Hand-edit a `.md` file, then run
`neuron sync`" no longer applies the edit by itself — a manual edit is, by
the identical reasoning, indistinguishable from vector-side drift, so it is
now also reported as a conflict. `neuron sync --force` is required for a
manual edit to take effect. Updated explicitly in the packaged skill rather
than left to be discovered.

Shipped as `v2.1.6`
([`a33d8a0`](https://github.com/kovartravis/neuron/commit/a33d8a0)), forward-
ported onto `feat/2.2.0-tree-sitter-grammars`. 4 new/rewritten regression
tests; one E2E test (`T4-05`) encoded the old silent-resolution assumption
directly and needed rewriting, not patching around.

## Comments

- 2026-08-02: The real fix here is architectural, not this ticket's
  mechanical safety net — there is still no reliable "which side is fresher"
  signal anywhere in the schema. See `06` for the deferred proper fix
  (`updatedAt` tracking on both sides).
