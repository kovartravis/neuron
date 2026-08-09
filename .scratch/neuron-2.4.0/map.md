# Map — neuron 2.4.0

## Destination

`@kovartravis/neuron` **v2.4.0** published to npm. Like
[neuron-2.3.0](../neuron-2.3.0/map.md) (itself renamed from a
narrower-scoped predecessor), this map is a **catch-all for the next
release** — its destination is "whatever `2.4.0` ships," fixed only by its
own eventual cut-and-publish ticket, not chartered here yet.

Seeded with one concrete piece of known work rather than a blank slate:
[ADR 0017 — Category Declaration Authority](../../docs/adr/0017-category-declaration-authority.md),
designed and fully resolved on `neuron-2.3.0`'s own
[ticket 35](../neuron-2.3.0/issues/35-categories-authoritative-or-advisory.md),
redirected here mid-session once its real scope became clear (a
comment-preserving `neuron.yaml` round-trip write path, plus a `status
--repair` backfill) — bigger than a same-map implementation ticket on a
map already accumulating toward its own rc2 cut.

Reaching the end means at minimum ADR 0017's design is implemented and
verified, plus whatever else lands here before a cut ticket is chartered
and closes it out.

## Notes

- **Split off from [neuron-2.3.0](../neuron-2.3.0/map.md) on 2026-08-09**,
  mid-grilling-session, at the maintainer's direct request — not a full
  chartering session (no breadth-first frontier grilling has happened
  yet). The single seed ticket below is real, sized, and unblocked; nothing
  else has been surfaced or fogged in yet. Treat this map as thin by
  design, not as a sign the destination is small — the next session
  working this map should breadth-first grill for what else `2.4.0` should
  admit, the same way `neuron-2.3.0` accreted its config/context-cost bands
  after its own initial harness-expansion charter.
- **This map carries execution**, matching `neuron-2.3.0`'s own posture
  (and, before it, `neuron-2.2.0`'s and `architecture-scans-2.1.0`'s) —
  tickets are worked one at a time, ending with a cut-and-publish ticket
  once one is chartered.
- **Skills to consult:** `/tdd` for ticket `01`'s implementation (schema
  migration to comment-preserving I/O plus a new write-time hook is exactly
  the shape prior tickets like `17`/`05`/`06` used `/tdd` for).
- **Protocol:** every session follows the `CLAUDE.md` memory-store loop.
  Record ADRs under `decisions`, session logs under `history`.

## Decisions so far

<!-- one line per resolved ticket: enough to judge relevance, then open the ticket for detail -->

(none yet — this map has not resolved any of its own tickets)

## Not yet specified

<!-- in-scope fog: real, but not yet sharp enough to ticket -->

- **Everything else `2.4.0` admits.** This map is a catch-all seeded from a
  single redirected ticket, not yet breadth-first grilled. What else lands
  here (new bands, carried-over fog from `neuron-2.3.0` that doesn't get
  resolved before that map cuts, fresh maintainer asks) is unknown until a
  session runs that grilling pass.

## Out of scope

<!-- ruled beyond this destination; closed, never graduates -->

(none yet)
