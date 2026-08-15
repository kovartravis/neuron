# Issue tracker: Neuron

Issues and specs (you may know a spec as a PRD) for this repo live in `neuron`
itself, as entries in the `tickets` category. Declared per
[ADR 0018 — Neuron as This Repo's Issue Tracker](../adr/0018-neuron-as-issue-tracker.md),
reusing [ADR 0011](../adr/0011-markdown-as-store-of-record.md)'s markdown
store of record and [ADR 0013](../adr/0013-configurable-frontmatter-schema.md)'s
declared-field schema — no new storage mechanism, no new top-level command.

## Conventions

- Every ticket and every map is one `tickets`-category entry. A map sets
  `kind: map` and carries no `map` value of its own (ticket 45). A child
  ticket sets `kind` to one of `research`/`prototype`/`grilling`/`task`, and
  `map` to its parent map's own entry id — that field, not prose, is the
  real child-to-map relationship.
- `status` (enum: `unclaimed`/`claimed`/`resolved`), `blockedBy` (string,
  comma-separated ticket ids, omitted when unblocked), and `map` (string, a
  child ticket's parent map's own entry id) are declared fields — see
  `neuron.yaml`'s `categories.tickets.fields`.
  - `kind` is the declared-field name for what the rest of this repo's docs
    (including the wayfinder skill) call a ticket's **type**. It isn't named
    `type` in `neuron.yaml` because `--type` is already a reserved built-in
    CLI flag (`neuronYaml.ts`'s `RESERVED_FLAG_NAMES`) and a declared field
    that collides with a built-in flag is a hard config error
    (`validateDeclaredFields`). Same enum, same meaning, different key. Its
    `map` value (ticket 45) is a real sentinel for "this entry is a map, not
    a ticket," replacing an earlier workaround that force-set
    `status: resolved` on every map for want of a 4th schema state.
- A ticket's content is its full body (the question, and — once resolved —
  the answer). There's no separate file per ticket; `neuron memory update`
  replaces content in place.
- Blocking has no tracker-native relationship (neuron's storage has no
  graph/relationship primitive). It's the `blockedBy` field plus the
  frontier-as-scan convention below — the wayfinder skill's own documented
  fallback for a tracker without native blocking.

## When a skill says "publish to the issue tracker"

`neuron memory add --category tickets --kind <kind> --status unclaimed --map
<this map's own entry id> "<content>"`. Link the new ticket from its map's
content (an `update` on the map's own entry), and set `--blocked-by` if it
starts blocked. A map entry itself is published with `--kind map` instead,
carries no `--map` of its own, and no longer force-sets `--status resolved`
as a stand-in for "this isn't a ticket" (ticket 45) — `status` is left at
its schema default (`unclaimed`) unless a real value applies.

## When a skill says "fetch the relevant ticket"

`neuron memory get <id> --category tickets` when the id is already known
(ticket 45) — a direct single-row fetch, not a full-category pull filtered
client-side. `neuron memory query "<ticket title or id>" --categories
tickets` when only the title (or a fragment of it) is known. The user will
normally pass the id or enough of the title to find it.

## Wayfinding operations

Used by `/wayfinder`. The **map** is a `tickets` entry; its **children** are
`tickets` entries whose `map` field names it.

- **Map**: one `tickets`-category entry — content holds the Destination /
  Notes / Decisions-so-far / Not yet specified / Out of scope body the
  wayfinder skill defines. `kind: map` is its real sentinel (ticket 45),
  replacing an earlier workaround that force-set `status: resolved` on every
  map for want of a 4th schema state (flagged, not fixed, by ticket 40). A
  map entry carries no `map` value of its own.
- **Child ticket**: one `tickets`-category entry with the question in its
  content. `kind` records the ticket type (`research`/`prototype`/`grilling`/
  `task`); `status` records `unclaimed`/`claimed`/`resolved`; `map` names its
  parent map's own entry id — required in practice on every child (by
  convention, not a schema constraint: a map has no `kind` and no `map` value
  to enforce required-ness against).
- **Blocking**: the `blockedBy` field holds comma-separated ticket ids. A
  ticket is unblocked when every id it lists names an entry with
  `status: resolved`.
- **Fetch one ticket by id**: `neuron memory get <id>` — a direct single-row
  fetch (ticket 45), not `list --json` filtered client-side, which used to
  mean pulling the entire category (up to hundreds of entries) to resolve one
  known id. `--category` is optional (ids are unique store-wide); passing it
  turns a category mismatch into `{"status": "not_found"}` instead of
  silently ignoring the flag.
- **Frontier, scoped to one map**: `neuron memory list --category tickets
  --where "status=unclaimed" --where "map=<this map's own id>" --refs-satisfy
  "blockedBy:status=resolved" --json`. `--where` is repeatable (ticket 45) —
  each occurrence ANDs onto the rest — so `status` and `map` compose as two
  separate flags rather than one clause. `--where` and `--refs-satisfy` stay
  generic, schema-agnostic `memory list` filters (any category, any declared
  field — not specific to this tracker's `status`/`map`/`blockedBy` naming):
  keep entries whose declared field equals (or, with `field!=value`, does not
  equal) a value, and whose every comma-separated id in another field names a
  same-category entry satisfying its own field/value pair. A dangling
  `blockedBy` id (no matching entry at all) leaves the ticket blocked rather
  than silently unblocking it. `--limit` caps the returned result, not the
  internal fetch used to compute it — correctness needs to see every ticket.
  The `--where "map=<id>"` clause is what scopes this to one map at all — the
  schema has no other per-map relationship, only this field — so always
  include it; omitting it pools every effort's tickets together.
- **Frontier, across every map** (rare — the usual case is one map at a
  time): add `--where "kind!=map"` in place of the `map=` clause, so map
  entries themselves (which, unlike before, are never forced off
  `status: unclaimed` by a fake `resolved`) don't show up as if they were
  claimable child tickets.
- **List every map**: `neuron memory list --category tickets --where
  "kind=map" --json`.
- **Claim**: `neuron memory update <id> "<unchanged content>" --category
  tickets --status claimed` before any work.
- **Resolve**: `neuron memory update <id> "<content, with the answer
  appended>" --category tickets --status resolved`, then update the map
  entry's own content to append a context pointer (gist + link) to its
  Decisions-so-far.
