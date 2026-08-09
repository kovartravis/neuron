Type: task
Status: resolved
Blocked by: none
Band: context cost

# 25 — Architecture Card: Fetch by Stable Id, Truncate Instead of Drop When Oversized

## Question

Does the actual scan-produced architecture blueprint reliably reach the
model at all, on a real repo?

## Context

Surfaced 2026-08-08 mid-session while scoping [24](24-architecture-card-ab.md)
(the maintainer's requested A/B proving the architecture card's value),
dogfooding this repo's own real store. Two independent, compounding gaps
found — neither is "stale content," which was this session's first
(incorrect) read; both are corrected here:

1. **Wrong entry retrieved.** `src/scanner/ingest.ts`'s `blueprintCardId`
   deliberately computes a stable, deterministic id for the scan-produced
   card — its own comment states why: "a semantic search over the category
   can rank the card out of its result window once enough other entries
   share the category." Both `session-start` and `11`'s new first-`pre-
   prompt`-of-epoch injection fetch via a generic `memory.query({categories:
   [category], limit: 3})` instead of that stable id — exactly the failure
   mode the comment warns about. Confirmed live on this repo: `scan.category`
   is configured to `decisions` (a shared, growing bucket, per `CLAUDE.md`'s
   own protocol block), and a real `neuron hook claude-code session-start`
   invocation returned three ordinary decision-log entries, never the
   blueprint card itself.
2. **Oversized single entry silently dropped, not truncated.**
   `buildPayload` drops a whole entry that doesn't fit the char budget
   rather than truncating it (by design, for its normal use — ranked lists
   of many small entries, where showing fewer whole entries beats mangling
   one). This repo's real blueprint card is ~53,000 characters against a
   6,000-character `SESSION_START_CHAR_BUDGET` — even if fetched correctly,
   it would be dropped entirely, every time, on any repo whose blueprint
   exceeds the budget (any repo of a non-trivial size, going by this one).

Both gaps predate `11` — they affect the original `session-start` injection
too, not just the new epoch-reinjection path — so this ticket fixes the
shared root cause once, at the one place both call sites fetch from, rather
than patching each site separately.

**Deliberately not touched**: the *shared epoch budget* itself. `11`'s own
Scope required the card's chars come out of the same pool `07` built, "not a
separate allowance — a second uncounted budget would undo `07`'s bound." The
maintainer raised exempting the card from the budget entirely as an option;
rejected here — even a dedicated larger allowance can't fit a 53,000-char
document under any harness's actual hard cap (Claude Code's own documented
ceiling is 10,000 characters, full stop), so the fix has to be about the
card's own size reaching the model *within* the budget it already has, not
about carving out more budget.

## Scope

1. Export `blueprintCardId` from `src/scanner/ingest.ts` (currently
   module-private) and fetch the card via `memory.findById(blueprintCardId
   (category))` at both `session-start` and `11`'s first-`pre-prompt`-of-
   epoch call site — a single shared helper, not two copies.
2. **Truncate, don't drop**, specifically for this single-entry case: if the
   formatted card line exceeds its cap, slice to fit and append a visible
   truncation marker, rather than calling `buildPayload` (whose drop-whole-
   entry semantics are wrong for a single large document).
3. **Additive, not a replacement**: the existing generic top-N-in-`category`
   query stays — this repo's own `scan.category: decisions` config choice is
   a deliberate way to also surface general decision-log content, not a
   misconfiguration. The stable-id blueprint fetch runs first and gets
   priority on the card's char allotment; whatever's left goes to the
   existing top-N query, excluding the blueprint's own id from that second
   query's results so it never shows twice.
4. Budget accounting unchanged from `11`/`07`: both parts still come out of
   the same capped allotment (`SESSION_START_CHAR_BUDGET` at session-start,
   the reserved-then-leftover split `11` built at first-`pre-prompt`).

## Verification

- A card fetched by stable id is found regardless of how many other entries
  share its category (reproduces this repo's real `scan.category: decisions`
  shape as a test case).
- An oversized card is truncated with a visible marker, not silently
  dropped — some real content reaches the model rather than none.
- The existing top-N-in-category content still appears when it fits in
  what's left, and never duplicates the blueprint entry.
- No change to the shared epoch-budget accounting `07`/`11` built.

## Deliverables

- [x] `blueprintCardId` exported and reused (no duplicated hash logic)
- [x] Stable-id fetch at both `session-start` and first-`pre-prompt`-of-epoch
- [x] Truncate-not-drop for an oversized single card entry
- [x] Existing top-N-in-category behaviour preserved, deduped against the card

## Answer

Built a shared `fetchArchitectureCardPayload(memory, category, cap)` in
`src/commands/hook.ts`, called from both `session-start` and `11`'s first-
`pre-prompt`-of-epoch branch — one implementation, not two copies.

- **Stable-id fetch**: `blueprintCardId` exported from `src/scanner/
  ingest.ts` (was module-private) and looked up via `memory.findById(...)`
  first. Verified live against this repo's own store: `scan.category:
  decisions` (this repo's real `neuron.yaml`) meant the pre-existing generic
  `memory.query({categories: [category], limit: 3})` was returning ordinary
  decision-log entries, never the blueprint — confirmed by a real `neuron
  hook claude-code session-start` invocation before this fix. Test:
  "fetches the architecture card by its stable id even when other entries in
  the same category outrank it" plants 5 more-recent same-category entries
  after the card and confirms the card still surfaces.
- **Truncate, not drop**: if the formatted card line exceeds its cap, it's
  sliced to fit with a `...[truncated]` marker appended, rather than routed
  through `buildPayload` (whose whole-entry-drop semantics fit a ranked list
  of many small entries, not one large document). Test: a 20,000-char card
  against the default 6,000-char budget comes back non-empty, shorter than
  the original, and marked as truncated.
- **Additive, not a replacement**: after the card claims its share, whatever
  budget remains still goes to the existing top-N-in-`category` query
  (excluding the card's own id), preserving this repo's own deliberate
  `scan.category: decisions` setup — general decision-log content keeps
  showing up alongside the guaranteed blueprint, not instead of it.
- **What this does not change**: the shared per-epoch budget model `07`/`11`
  built — both parts of the combined payload still come out of the same
  capped allotment. The maintainer raised exempting the card from the budget
  entirely; rejected, since even a dedicated larger allowance can't fit a
  document past a harness's own hard cap (Claude Code's is 10,000 characters
  regardless of neuron's own budget) — the fix had to be about the card
  reaching the model *within* its existing cap, not a bigger cap.
- Dogfooding this repo's own real store while building this surfaced that
  `neuron exec`'s `autoRescanIfDriftDetected` correctly re-freshened
  `.neuron/decisions.md`'s blueprint card mid-session as this ticket's own
  source changes landed — confirming the blueprint itself isn't stale
  content (a wrong read earlier in this same session); the separate,
  unrelated general `decisions` log entries that *do* read as dated are
  ordinary append-only history, working as designed.
- 2 new tests in `hook.test.ts` (stable-id-survives-crowding,
  truncate-not-drop), full suite 559/559, `tsc --noEmit` clean.
