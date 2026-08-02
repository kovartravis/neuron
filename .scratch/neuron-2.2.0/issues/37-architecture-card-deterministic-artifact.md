Type: task
Status: unclaimed
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

- [ ] Card byte-stable across runs on unchanged source
- [ ] Deterministic card identity, resolved by exact match not similarity
- [ ] Existing duplicate cards reconciled
- [ ] `SCAN_HELP`'s in-place promise true or rewritten
- [ ] Interaction with `36`'s category schema resolved

## Comments

- 2026-08-02: Filed when the maintainer extended the determinism reframing to AST
  scanning. Graduates the map's *"Duplicate blueprint cards"* fog patch, which
  was surfaced by ticket `04` and had been waiting on a reason to be sharp.
  The repositioning supplied it.
- Unblocked and independent — no design question in the rc5 band gates it, and
  the `mtime` half is close to trivial.
