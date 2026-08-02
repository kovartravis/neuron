Type: task
Status: resolved
Blocked by: none
Band: 2.2.0-rc5

# 35 — Frontmatter Round-Trip Integrity

## Question

Hand-editing a `.md` entry is the repositioning's headline feature. Two ordinary
hand-edits currently corrupt data silently. Make the reader refuse or report
rather than fabricate.

## Context

Measured against the built CLI in an `md-only` project on 2026-08-02. Both are
reproducible in under a minute.

### Defect 1 — reader and writer disagree on the `importance` default

`formatEntry` writes `importance: 3` when unset
(`src/storage/mdStorageAdapter.ts:229`). `parseMarkdown` reads a *missing*
`importance` as **`1`** (`:328-330`).

So deleting one line from an entry's frontmatter silently changes its importance
from 3 to 1. Importance `1` is prune-eligible at **every** threshold, and
`neuron memory prune`'s default ceiling is `3` compared inclusively — so an
ordinary hand-edit converts an entry into the most deletable state the system
has. Demonstrated on an entry explicitly written with `--importance 5`: remove
the line, and it reads back as `1`.

### Defect 2 — a missing `id` mints a new UUID on every read

`parseMarkdown` falls back to `crypto.randomUUID()` when frontmatter carries no
`id` (`:326`), and to `new Date().toISOString()` for a missing `createdAt`
(`:327`). The UUID fallback is not memoised, so **consecutive reads of the same
unchanged file return different ids**:

```
id before = e6674523-9322-4411-a708-b8d13288a1ae
id after  = 530f825b-7dc1-4808-ab39-ba1252002079   # id: line deleted
id again  = eb3d472f-d209-4b60-b30b-7e60686bbb9a   # same file, read again
```

Consequences: `memory update <id>` and `memory delete <id>` can never target the
entry again; in `dual`/`split` mode the entry duplicates on every `sync`; and
any consumer holding an id has a dangling reference.

This is the same defect class the store's `learning` category already records
against `MdStorageAdapter` — a frontmatter-splitting regex that dropped
delimiters, assigned fallback UUIDs, and broke every roundtrip. That one was
fixed; the fallback behaviour that made it *silent* was not.

### Why this is its own ticket

These are live bugs with a data-loss consequence, independent of whether the
configurable-schema feature in [`36`](36-configurable-frontmatter-schema.md)
ever ships. They should be fixed on their own merits. They are also the concrete
evidence that "deterministic" is a claim worth making — a pitch built on
hand-editable files cannot ship on top of a reader that silently invents field
values when a human edits a file by hand.

## Scope

1. Make the reader's defaults agree with the writer's, or remove reader defaults
   entirely in favour of an explicit outcome. Prefer the latter: a missing field
   is a fact about the file, not a value to guess.
2. A missing or malformed `id` must not mint a UUID silently. Decide the
   behaviour — refuse the entry, report it as malformed, or repair it in place
   and say so — and make it the same behaviour every time.
3. Audit the remaining coercions in the same region for the same shape: `tags`
   accepted as either a YAML array or a comma-separated string (`:333-337`),
   `taskId` string-coerced (`:343`), `scope` defaulted (`:339`), and the
   no-frontmatter fallback path at `:277-286` that assigns `importance: 1`.
   Each is a place a hand-edit produces a value the human did not write.
4. Whatever the chosen behaviour, it must be **observable**. ADR 0010 §3's
   posture applies: silence without counters is how this went unnoticed.

## Verification

- The two reproductions above, as automated tests.
- A round-trip property test: write an entry, read it, write it again — the file
  bytes must be identical, and every field must survive unchanged.
- A hand-edit of an entry's *body* (the case users will actually do most) must
  preserve every frontmatter field exactly.
- Unit + E2E green.

## Deliverables

- [ ] Reader and writer defaults reconciled, or reader defaults removed
- [ ] Missing/malformed `id` handled identically every time, never silently
- [ ] Remaining silent coercions audited and resolved
- [ ] Round-trip byte-stability test
- [ ] Behaviour observable, not silent

## Comments

- 2026-08-02: Filed after the maintainer proposed repositioning around
  deterministic, schema-enforced markdown writes. Found while checking whether
  "deterministic" is a claim the code can currently support. It is not — and
  these two defects are why. Unblocked and independent: nothing else in rc5 needs
  to land first, and this fix stands on its own as a data-loss bug.
- Graduates part of the map's *"Hand-edit semantics for markdown entries"* fog
  patch — specifically the "edited body with unchanged id" and "deleted
  frontmatter" cases. The duplicate-`id` and malformed-YAML cases stay fogged
  pending `36`.

- 2026-08-02: **Promoted to a hard prerequisite of
  [`29`](29-md-only-semantic-search.md)** by [`28`](28-md-only-parity-design.md).
  This ticket was filed as a standalone integrity fix; `28`'s design makes it
  blocking, because a third defect of the same family becomes fatal rather than
  merely untidy.

  `mdStorageAdapter.ts:326` mints a fresh `crypto.randomUUID()` on **every read**
  for an entry missing its `id`, with no dedupe and no write-back. Under `28`'s
  strict mirror plus reconcile-on-every-command that is a permanent churn loop:
  read → `UUID-A` → absent from index → insert and embed; next command → read →
  `UUID-B` → `UUID-A` now absent from markdown → **delete**, `UUID-B` → insert
  and embed again; repeat forever. One entry missing one line churns the store
  indefinitely. `createdAt` fabricating `now()` per read has the same shape and
  additionally defeats `prune --days` permanently.

  The contract `28` settled, which this ticket implements: **repair the
  incomplete, refuse the ambiguous.** Missing `id`/`createdAt`/`importance` is
  generated once and **written back to the file**; duplicate `id` or unparseable
  YAML **hard-errors** naming the file. The test is whether the system has to
  guess. See [ADR 0011](../../../docs/adr/0011-markdown-as-store-of-record.md)
  § *Consequence 4*.

## Answer

Implemented test-first in `src/storage/mdStorageAdapter.ts`. `parseMarkdown`
stays a pure, public seam (unchanged signature); a new private
`parseMarkdownDetailed` does the real work and additionally returns which
fields (if any) needed repair. `readCategory` is the only effectful caller: if
any entry needed repair, it reformats and writes the whole category file back
once, then emits one `[neuron warning]` line per repair to stderr (never
stdout) — matching the existing `neuron history`/`neuron learn` deprecation
warning convention and ADR 0010 §3's "silent, bounded, observable" posture.

**Repaired (missing → generated once, written back):**
- `importance` — now defaults to `3` on both read and write (was `1` on read,
  `3` on write). Also fixed a related bug: explicit `importance: 0` used to be
  treated as "missing" by a truthy check and silently promoted to `1`; it now
  round-trips as `0`.
- `id` — minted once via `crypto.randomUUID()` and written back, so a second
  read returns the same id. Previously minted a new UUID on every read with no
  write-back (ADR 0011's cited churn-loop hazard).
- `createdAt` — same one-time-mint-and-write-back treatment.
- A file with content but **no frontmatter delimiters at all** (not just a
  missing field) goes through the same repair path: id/createdAt/importance
  are minted once and the file is rewritten with a proper frontmatter block,
  rather than fabricating a fresh identity on every read.

**Refused (hard error naming the file, no silent recovery):**
- Two entries with the same explicit `id` in one category file.
- Unparseable YAML frontmatter — the old behaviour fell back to a line-by-line
  regex key extraction that silently recovered a partial, possibly-wrong
  record; that fallback is deleted, not fixed.
- `importance` present but not coercible to a finite number (previously
  silently became `NaN` after this ticket's cycle 1 fix, or `1` before it).
- `tags` present but neither an array nor a string (previously silently
  dropped to `[]`).

**Audited, not changed:** `tags` as an array vs. a comma-separated string, and
`taskId` string-coercion, are format-tolerant parsing of a value the human
actually wrote — not fabrication of a missing one — so both keep their
existing dual-format acceptance. `scope`'s reader path was already `undefined`
when absent (no fabricated default); only `writeEntry`'s default of `'project'`
for a brand-new entry defaults it, which is a different, non-defective code
path (choosing a value for a new record, not guessing at an existing one).

**Fallout fixed in the same change:** `mdVectorSync.ts` carried its own
duplicate-id tolerance (pick the first, log and continue) that is now
unreachable — `readCategory` throws before it ever sees two entries sharing an
id. Removed the dead code; a category with a duplicate id now fails that
category's sync outright (surfaced in `result.errors`, naming the file)
instead of silently picking a winner, which is a categorical improvement given
`28`'s promise that sync doesn't guess on conflicts. Two existing tests
(`R1-T2-02`, challenger `3.1`) asserted the old silent-YAML-recovery behaviour
as a feature; rewritten to assert the hard-error instead. One of the two
(challenger `3.1`) was itself a tautological test — `expect(async () => {...}).not.toThrow()`
can never fail regardless of what the async body does, and it was masking the
new error as an *unhandled rejection* rather than a real test failure until
rewritten with `rejects.toThrow`.

12 new tests, full unit + E2E suite green (292 tests) across two consecutive
full runs. One flaky, unrelated failure observed on one of several runs and
left alone: `test/e2e/concurrency-stress.test.ts` Pillar 8, a real-subprocess
SQLite lock-contention benchmark (`3/50 dropped writes` vs. a `<5%` threshold)
that touches only `NeuronMemory`'s SQLite path, never `MdStorageAdapter` — not
in this ticket's change surface. Confirmed unrelated by stashing this ticket's
diff and re-running the same test against the pre-ticket-35 tree, where it
also failed (on an unrelated stale-build init error, underscoring that this
suite is environment-sensitive independent of ticket 35).
