Type: task
Status: unclaimed
Blocked by: none

# 25 — Implement the Neuron-Backed Tracker: Declare `tickets` Category & Rewrite `issue-tracker.md`

## Question

Build what [14](14-neuron-as-tracker-design.md) and
[ADR 0018](../../../docs/adr/0018-neuron-as-issue-tracker.md) decided:

- Declare a `tickets` category in `neuron.yaml` with three user-defined
  fields per ADR 0013's schema machinery: `status` (enum:
  `unclaimed`/`claimed`/`resolved`), `type` (enum:
  `research`/`prototype`/`grilling`/`task`), `blockedBy` (string,
  comma-separated ticket ids, empty when unblocked).
- Confirm claim/resolve mutation works via the existing `transact({ op:
  'update', category: 'tickets', ... })` path — no new storage code should
  be required; this ticket is configuration plus verification, not new
  product surface.
- Rewrite `docs/agents/issue-tracker.md`: remove the "Issue tracker: Local
  Markdown" section entirely, replace with a single "Issue tracker: Neuron"
  section describing map/child/blocking/claim/frontier operations against
  the `tickets` category — including the frontier-as-scan convention (read
  unclaimed entries, keep those whose every `blockedBy` id resolves to a
  resolved entry) since blocking is a frontmatter field, not tracker-native.
- Update the wayfinder skill's tracker-doc pointer if it names
  `.scratch`/local-markdown anywhere directly.

Does not include the actual migration of the 19 existing `.scratch/`
efforts — that's [26](26-migrate-scratch-to-tickets-category.md), blocked
on this ticket landing first so the migration has a real category schema to
migrate into.

## Comments

- Graduated 2026-08-11 from [14](14-neuron-as-tracker-design.md)'s
  resolution, mirroring how ticket 12's grilling resolution graduated
  implementation (22/23/24) rather than building inline.
