Type: task
Status: resolved
Blocked by: none
Band: context cost

# 27 — Structurally Compress the Architecture Card at Injection Time

## Question

Can the injected architecture card actually fit its budget, covering as
much of the real repository as possible, instead of being truncated at
whatever byte offset the budget happens to land on?

## Context

Surfaced 2026-08-08 directly from the maintainer's rejection of `25`'s and
`26`'s combined result: `25` made an oversized card degrade to truncation
instead of silent drop, and `26` removed the LLM and shrank the card
~10.3% — but on this repo (128 file entries, 14 subsystems), the injected
card was still ~49,000 characters against a 6,000-character budget, so
truncation still cut off after roughly 2 of 14 subsystems, arbitrarily,
by document order. The maintainer's response: "That's not acceptable, the
architecture needs to be compressible."

**Key discovery that unlocked the fix**: `parseBaselineBlueprint`
(`src/scanner/diff.ts:107`), the only consumer that needs the card to be
*complete* (drift detection, `neuron scan --diff`), parses exactly two
things off each component line — the file path and its `Exports:` list.
The purpose/prose text after the colon is **never read by anything** at
all. That means prose can be dropped freely from an *injected* rendering
without ever desyncing `scan --diff`, as long as the stored card
(`.neuron/decisions.md`) stays untouched and every file+export line
survives in whatever's shown.

## Scope

1. New `src/scanner/compressCard.ts`, `compressArchitectureCard(markdown,
   cap)`: parses the card into header + per-module file lists (file +
   `Exports:` only, purpose stripped), then lays sections back out against
   `cap` in fixed order — header always whole, then each module in document
   order, either whole, partially (as many file lines as fit), or omitted
   entirely once the budget runs out. Never touches the stored card; this
   runs only on the copy about to be injected.
2. **A cut is never silent.** A fixed budget (`OMISSION_NOTE_RESERVE`, 220
   chars — sized for the worst-case wording) is reserved for the omission
   note *before* any module is laid out, not computed after the fact —
   ticket 25's marker could get silently dropped if there was no room left
   once the cut was known, which the first version of this ticket's own
   code initially reproduced before being caught by its own test.
3. Wired into `hook.ts`'s `fetchArchitectureCardPayload` (both `session-
   start` and `11`'s first-`pre-prompt`-of-epoch call site, since both share
   the one function), replacing `25`'s raw-string truncation.
4. Unstructured content (no recognizable `### 🧩 module (path)` headings at
   all) degrades to a marked hard truncation of the header text — the same
   honest-marker discipline, for content this function can't parse.

## Verification

- `neuron scan --diff` / `--check` unaffected — confirmed clean against this
  repo's own store after the change (stored card untouched).
- Real result on this repo: 49,243-byte stored card compresses to
  5,970 injected characters (fits the 6,000-char budget), covering 7 of 14
  subsystems in **full** file+export detail plus an honest note naming how
  many more subsystems were omitted — versus the pre-fix truncation, which
  cut off partway through subsystem 2 of 14 with no coverage indication.
- Dedicated unit tests (`compressCard.test.ts`, 9 cases): fits-unchanged,
  purpose-stripped-but-complete, file+exports preserved, never-silent-cut,
  omission-count reported, unstructured-content fallback, zero/negative cap,
  determinism, and — the one that caught the reserve-budget bug — never
  exceeds cap even including the note, across five different cap sizes.
- `npm test` 568/568 (9 new + all prior green); `tsc --noEmit` clean.

## Deliverables

- [x] `compressArchitectureCard` built and unit-tested
- [x] Wired into `hook.ts`, replacing raw truncation
- [x] Omission note always present when anything is cut, never silently dropped
- [x] Verified `scan --diff`/`--check` unaffected
- [x] Real measured before/after on this repo's own card

## Answer

Built as scoped — see Context and Scope above for the mechanism and the
`parseBaselineBlueprint` finding that made it safe. Final measured result:
the injected card now fits (5,970 of 6,000 chars) and covers half this
repo's subsystems in complete file+export detail, with an honest note about
the rest, rather than an arbitrary partial-subsystem cutoff. `24`'s
`captured-card.txt` refreshed to match.
