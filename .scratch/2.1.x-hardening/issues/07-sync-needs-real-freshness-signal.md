Type: task
Status: unclaimed
Blocked by: none

# 07 — Give `sync` a Real Last-Modified Signal

## Question

Ticket `05` made `sync` refuse to guess on a content conflict, which is
correct but incomplete: it turns silent data loss into a manual `--force`
step, without fixing the underlying reason a guess was ever necessary.
Should `sync` gain a reliable "which side changed more recently" signal, and
if so, how?

## Context

Neither store currently carries one. `.md` frontmatter has no `updatedAt`
field; the vector schema has `updated_at` internally but it's never surfaced
to or compared by `sync`. Without it, an entry edited only in the vector DB
and an entry edited only by hand in `.md` are indistinguishable — both
"conflict, needs `--force`" — even though the correct resolution direction
differs between them.

Options sketched during `05`'s investigation, none picked:

1. **Add `updatedAt` to `.md` frontmatter**, and read/compare `updated_at`
   from the vector schema instead of `createdAt`. Correct going forward, but
   changes the documented, git-committed `.md` file format — existing files
   won't have the field until next written, so old entries stay ambiguous
   indefinitely unless backfilled.
2. **Start writing it going forward, fall back to today's `conflict`
   behaviour when absent on either side.** No format break, but the
   ambiguity for legacy entries never resolves without a deliberate
   backfill pass.
3. **Leave it as `05` shipped it.** `--force` is a one-time cost per
   conflict, not a recurring one, and the honest "I don't know, you decide"
   is arguably the right permanent answer rather than a stopgap.

## Comments

- 2026-08-02: Not a regression — `05` already shipped the safe behaviour.
  This is a genuine improvement question, not a hazard, and belongs in
  front of the maintainer as a design choice rather than picked unilaterally.
