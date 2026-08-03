Type: task
Status: resolved
Blocked by: none
Band: 2.2.0-rc5

# 37 — The Architecture Card as a Deterministic Artifact

## Question

`neuron scan` is being repositioned as *a deterministic way to get your
architecture into a markdown file that stays up to date*. Two things stop that
being true: the card changes on every scan even when nothing did, and there is
no reliable way to say which card is "the" card.

## Context

The repositioning (2026-08-02) reframes `scan` out of the
apologetic *"lightweight, not as deep as purpose-built analysis tools"* framing
and into the same claim as the memory store: a **deterministic markdown artifact
your agent maintains and you review in a diff**. Against
`codebase-memory-mcp` this is depth-versus-artifact rather than depth-versus-depth
— they analyse, neuron produces a file a human and an agent both read and a
`git diff` can gate on.

The claim is much closer to true than expected. Measured 2026-08-02 on this repo,
two consecutive `neuron scan --dry-run` runs:

```
=== byte-identical across two runs? ===
NO — differs:
5c5
< mtime: 2026-08-02T14:00:53.052Z
> mtime: 2026-08-02T14:00:56.392Z
```

**One line of 228.** `synthesizeArchitecture` (`src/components/summarizer.ts`) is
a pure template — the overview is a format string, `allDependencies` is `.sort()`ed
before rendering, and despite the `SmolLM2Summarizer` name the architecture path
makes no model call. Everything that describes the *code* is deterministic
already.

### Blocker 1 — `mtime` defeats the diff

The frontmatter carries `mtime: ${new Date().toISOString()}`, stamped fresh on
every scan. So every run dirties the card, and a `git diff` after a scan shows a
change whether or not the architecture moved. For a feature whose pitch is "you
review it in a PR", the noise *is* the failure: a reviewer who learns the card
always changes stops reading it.

Note the field is not obviously load-bearing — `scan --diff` compares parsed
blueprint content, not frontmatter timestamps — but **verify that before removing
it**, and check `parseBaselineBlueprint`, the drift fingerprint cache, and the
`enriched_at`/`updatedAt` columns for readers.

### Blocker 2 — there is no stable card identity

Already on the map as fog, now load-bearing: **four blueprint cards exist in this
repo's `decisions` category.** `ingestScanResults` locates "the" card with a
semantic query plus `.find()`, so which one it upserts is not guaranteed stable
and duplicates accumulate — while `SCAN_HELP` promises *"Re-running updates that
card in place rather than adding a duplicate."*

Under the old positioning this was a nuisance. Under the new one it is
disqualifying: **you cannot deterministically keep a file up to date if you
cannot deterministically say which file it is.** The fog patch left the fix open
between a stable id, a tag, or a dedicated table; the repositioning narrows it —
whatever is chosen must be exact-match identity, never a similarity search.

## Scope

1. Make the card byte-stable across runs on unchanged source. Remove `mtime`, or
   derive it from something that only changes when the content does. Prove it
   with a repeat-scan byte comparison, not by inspection.
2. Give the blueprint card a deterministic identity and make `ingestScanResults`
   resolve it by exact match. Reconcile the existing duplicates — decide whether
   to merge, delete, or leave them and adopt one, and say which in the commit.
3. Make `SCAN_HELP`'s "updates that card in place" promise true, or change the
   text. It is currently a documented guarantee the code does not provide.
4. Confirm the repeat-scan stability holds across the `--format md` and
   `--format json` paths, and for `--dry-run` versus a real ingest.
5. Check the interaction with [`35`](35-frontmatter-roundtrip-integrity.md) and
   [`36`](36-configurable-frontmatter-schema.md): the card is a memory entry in a
   category, so if categories gain a declared frontmatter schema, the card has to
   satisfy the `architecture` category's schema. `36` raises this as an open
   question; whichever ticket lands second owns making them agree.

## Verification

- Two consecutive scans on unchanged source produce byte-identical cards. As an
  automated test — this is the claim the README will make.
- A source edit produces a card that differs *only* in the affected region, so a
  reviewer sees the architectural change and nothing else.
- Repeated `neuron scan` never increases the blueprint-card count.
- `git status` is clean after a scan on unchanged source.
- Unit + E2E green.

## Deliverables

- [x] Card byte-stable across runs on unchanged source
- [x] Deterministic card identity, resolved by exact match not similarity
- [x] Existing duplicate cards reconciled
- [x] `SCAN_HELP`'s in-place promise true or rewritten
- [ ] Interaction with `36`'s category schema resolved — deferred, `36` lands second

## Answer

**Resolved 2026-08-03, via TDD, AFK.**

Both blockers were real, and a third — undiagnosed at filing — turned out to be
load-bearing for both of them.

1. **Byte-stability.** `synthesizeArchitecture` (`src/components/summarizer.ts`)
   didn't just carry a stray `mtime`: its *entire* embedded
   `---\ncategory:...\ntitle:...\ntags:...\nmtime:...\n---` block was dead
   weight — nothing in the codebase reads `category`/`title`/`tags` from
   inside the card's own content (`title` duplicates the H1 heading
   immediately below it; the real tags live in the storage-level frontmatter
   the caller already sets). Deleted the whole block rather than patching
   `mtime` alone.
2. **Deterministic identity.** That deletion mattered for a second reason,
   found while writing the identity test: the embedded block is shaped
   exactly like YAML frontmatter, and `MdStorageAdapter.parseMarkdownDetailed`
   finds frontmatter with one global regex over the *whole category file*,
   not per-entry — so the card's own nested block was mistaken for a second
   entry's frontmatter the moment any other entry shared the file, hard-
   erroring "Malformed YAML frontmatter" (ticket `35`'s intentional
   hard-fail posture, working exactly as designed against corrupted input).
   `ingestScanResults`' semantic-search lookup (`memory.query` + `.find()`
   over a top-10 window) is replaced with a derived id —
   `sha256('neuron:architecture-blueprint:' + category)`, formatted as a
   UUID-shaped string, passed straight to the upsert. No query at all: both
   storage backends (`transactVector`, `MdStorageAdapter.writeEntry`) already
   do exact-id-match upsert, confirmed by reading them before writing the fix.
3. **A third bug, found chasing byte-stability to zero.** Even after 1 and 2,
   repeat real scans on this repo still weren't byte-identical.
   `MdStorageAdapter.writeEntry` minted a fresh `createdAt` on *every* call,
   even when replacing an existing id — unlike `updateEntry` and the SQLite
   upsert path, which both correctly leave `createdAt` alone on update. Fixed
   by looking up the existing entry's `createdAt` via the already-computed
   `existingIndex` before falling back to `new Date()`. Without this, `git
   status` was never clean after a no-op scan, which is the ticket's own
   verification bar.
4. **Reconciliation.** This repo's own `.neuron/decisions.md` held 6
   scan-tagged entries under the old lookup (4 with content, 2 empty —
   almost certainly artifacts of the same nested-frontmatter corruption).
   Deleted all 6 and let a fresh `neuron scan` recreate exactly one canonical
   card under the new scheme, rather than migrating an old id forward — none
   of the 6 were individually addressable, and 2 were already corrupt.
5. **`SCAN_HELP`.** No text changed. "Updates that card in place rather than
   adding a duplicate" is now true, verified in
   `src/commands/scan.determinism.test.ts` rather than asserted by inspection.
6. **Interaction with `36`** is unaddressed, per this ticket's own Scope item
   5 ("whichever lands second owns making them agree") — `36` is still
   unclaimed on the map, so `37` is landing first.

**Verification:** `git status` is clean after a repeat real `neuron scan`
against this repo; three consecutive scans resolve to the same card id;
`--dry-run --format md` and `--format json` are each byte-identical across two
runs. 8 tests added/updated across `summarizer.test.ts`, `ingest.test.ts`,
`mdStorageAdapter.test.ts`, and a new `scan.determinism.test.ts`. Full suite:
305/309 green — the 4 failures are a pre-existing, unrelated test-isolation
gap (see **Fallout** below and new ticket `42`), confirmed via `git stash`
comparison against pre-`37` code, where the identical failures and identical
real-store pollution reproduce unchanged.

### Fallout — a live bug found, not fixed here

Running `npm test` in this repo **pollutes the maintainer's real
`.neuron/{learning,history}.md`**: several CLI-invoking test files
(`learn.test.ts`, `history.test.ts`, `cli.test.ts`, and others) override
`NEURON_DB_PATH` to isolate SQLite but never isolate the markdown storage path
or `chdir` into a tmp project — so under `storage.mode: md` (default since
ticket `31`), they read and write the real store. Confirmed test-created
entries (`"Always test first"`, `"Vitest test runner requires
--runInBand"`) landing in the real `.neuron/learning.md` after a run, and
reverted them by hand each time. This is out of scope for `37` (it's
test-infrastructure hygiene, not the architecture card), so it's split out as
[42 — Isolate CLI Tests From the Real `.neuron` Store](42-isolate-cli-tests-from-real-store.md).

## Comments

- 2026-08-02: Filed when the maintainer extended the determinism reframing to AST
  scanning. Graduates the map's *"Duplicate blueprint cards"* fog patch, which
  was surfaced by ticket `04` and had been waiting on a reason to be sharp.
  The repositioning supplied it.
- Unblocked and independent — no design question in the rc5 band gates it, and
  the `mtime` half is close to trivial.
