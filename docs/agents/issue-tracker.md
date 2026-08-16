# Issue tracker: Neuron

Issues and specs (you may know a spec as a PRD) for this repo live in `neuron`
itself, as entries spread across three categories by temporal status —
`tickets-present`, `tickets-past`, `tickets-future` (ticket 9, neuron-2.4.3;
design settled by ticket 3's `/grilling`). Declared per
[ADR 0018 — Neuron as This Repo's Issue Tracker](../adr/0018-neuron-as-issue-tracker.md),
reusing [ADR 0011](../adr/0011-markdown-as-store-of-record.md)'s markdown
store of record and [ADR 0013](../adr/0013-configurable-frontmatter-schema.md)'s
declared-field schema — no new storage mechanism, no new top-level command.

## The three categories

- **`tickets-present`** (`storage: md` — human-editable, the primary working
  set): every map actively being worked (sequenced), regardless of how many
  are open at once, plus **all** of its children — open and already-resolved
  alike. A map's children only ever leave `tickets-present` together, when
  the map itself closes (see "Archiving," below) — resolving one ticket does
  not move it out on its own.
- **`tickets-past`** (`storage: vector` — archived, no markdown mirror):
  closed maps and every ticket that was ever a child of one, moved as a unit
  when the map closed.
- **`tickets-future`** (`storage: vector`): maps chartered or parked but
  explicitly **not yet sequenced** against a real release — this repo's own
  standing phrase for "thematic, not version-numbered, until queued" (see
  Map — Global Config & Memory Store for the pattern). Promotion to
  `tickets-present` is manual only; there is no automatic trigger.

All three declare the identical field schema (`neuron.yaml`'s
`categories.tickets-present.fields`, reused via a YAML anchor by
`tickets-past`/`tickets-future`) — a ticket's `map` value resolves to a
parent map's id regardless of which of the three category either one lives
in. `id` is the real cross-category key: it is the SQLite primary key
store-wide (unique regardless of category), so a ticket's own id, and every
id referenced in its `blockedBy`/`map` fields, keeps resolving correctly
after a category move.

## Conventions

- Every ticket and every map is one entry in whichever of the three
  categories currently holds it. A map sets `kind: map` and carries no `map`
  value of its own (ticket 45). A child ticket sets `kind` to one of
  `research`/`prototype`/`grilling`/`task`, and `map` to its parent map's own
  entry id — that field, not prose, is the real child-to-map relationship.
- `status` (enum: `unclaimed`/`claimed`/`resolved`), `blockedBy` (string,
  comma-separated ticket ids, omitted when unblocked), and `map` (string, a
  child ticket's parent map's own entry id) are declared fields — see
  `neuron.yaml`'s `categories.tickets-present.fields` (shared by the other
  two categories via YAML anchor).
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
  fallback for a tracker without native blocking. `blockedBy` stays
  same-category by convention (ticket 3): archiving is whole-map-at-once, so
  a ticket's `blockedBy` only ever names siblings under the same still-open
  map, which by construction stays in the same category as it.

## When a skill says "publish to the issue tracker"

New tickets always start life in **`tickets-present`** — only an actively-
sequenced map (one already in `tickets-present`) takes new children.
`neuron memory add --category tickets-present --kind <kind> --status
unclaimed --map <this map's own entry id> "<content>"`. Link the new ticket
from its map's content (an `update` on the map's own entry), and set
`--blocked-by` if it starts blocked. A map entry itself is published with
`--kind map` instead, carries no `--map` of its own, and no longer
force-sets `--status resolved` as a stand-in for "this isn't a ticket"
(ticket 45) — `status` is left at its schema default (`unclaimed`) unless a
real value applies. A freshly-chartered map that isn't sequenced yet
publishes to `tickets-future` instead (still `--kind map`).

## When a skill says "fetch the relevant ticket"

`neuron memory get <id>` when the id is already known (ticket 45) — a direct
single-row fetch, not a full-category pull filtered client-side. `id` lookup
is store-wide and category-agnostic (`findById` takes no category param), so
this works identically no matter which of the three categories currently
holds the entry — omit `--category` unless you already know which of the
three it's in. `neuron memory query "<ticket title or id>" --categories
tickets-present,tickets-past,tickets-future` when only the title (or a
fragment of it) is known and the category isn't; narrow to just
`tickets-present` if you know the ticket is still live. The user will
normally pass the id or enough of the title to find it.

## Wayfinding operations

Used by `/wayfinder`. Every live operation below targets **`tickets-present`**
— the map(s) actually being worked and their children live there and nowhere
else, by construction (see "The three categories," above). The **map** is a
`tickets-present` entry (while open); its **children** are `tickets-present`
entries whose `map` field names it.

- **Map**: one `tickets-present`-category entry (or `tickets-future`, if not
  yet sequenced) — content holds the Destination / Notes / Decisions-so-far /
  Not yet specified / Out of scope body the wayfinder skill defines. `kind:
  map` is its real sentinel (ticket 45), replacing an earlier workaround that
  force-set `status: resolved` on every map for want of a 4th schema state
  (flagged, not fixed, by ticket 40). A map entry carries no `map` value of
  its own.
- **Child ticket**: one `tickets-present`-category entry with the question in
  its content. `kind` records the ticket type (`research`/`prototype`/
  `grilling`/`task`); `status` records `unclaimed`/`claimed`/`resolved`;
  `map` names its parent map's own entry id — required in practice on every
  child (by convention, not a schema constraint: a map has no `kind` and no
  `map` value to enforce required-ness against).
- **Blocking**: the `blockedBy` field holds comma-separated ticket ids. A
  ticket is unblocked when every id it lists names an entry with
  `status: resolved`. Same-category by convention (ticket 3) — a ticket's
  blockers are always siblings under the same still-open map, hence always in
  `tickets-present` alongside it.
- **Fetch one ticket by id**: `neuron memory get <id>` — a direct single-row
  fetch (ticket 45), not `list --json` filtered client-side, which used to
  mean pulling the entire category (up to hundreds of entries) to resolve one
  known id. `--category` is optional (ids are unique store-wide, across all
  three categories); passing it turns a category mismatch into
  `{"status": "not_found"}` instead of silently ignoring the flag.
- **Frontier, scoped to one map**: `neuron memory list --category
  tickets-present --where "status=unclaimed" --where "map=<this map's own
  id>" --refs-satisfy "blockedBy:status=resolved" --json`. `--where` is
  repeatable (ticket 45) — each occurrence ANDs onto the rest — so `status`
  and `map` compose as two separate flags rather than one clause. `--where`
  and `--refs-satisfy` stay generic, schema-agnostic `memory list` filters
  (any category, any declared field — not specific to this tracker's
  `status`/`map`/`blockedBy` naming): keep entries whose declared field
  equals (or, with `field!=value`, does not equal) a value, and whose every
  comma-separated id in another field names a same-category entry satisfying
  its own field/value pair — confirmed (ticket 9) to work identically against
  `tickets-present`'s `md` storage as it did against the old single `tickets`
  category, since `--where`/`--refs-satisfy` operate on `memory.query()` +
  `fields`, the same underlying SQLite index regardless of storage mode. A
  dangling `blockedBy` id (no matching entry at all) leaves the ticket
  blocked rather than silently unblocking it. `--limit` caps the returned
  result, not the internal fetch used to compute it — correctness needs to
  see every ticket. The `--where "map=<id>"` clause is what scopes this to
  one map at all — the schema has no other per-map relationship, only this
  field — so always include it; omitting it pools every open effort's
  tickets together (still just the open ones — `tickets-present` never holds
  a closed map's children, so nothing further to exclude).
- **Frontier, across every open map** (rare — the usual case is one map at a
  time): add `--where "kind!=map"` in place of the `map=` clause, so map
  entries themselves (which, unlike before, are never forced off
  `status: unclaimed` by a fake `resolved`) don't show up as if they were
  claimable child tickets. Still scoped to `tickets-present` — closed and
  not-yet-sequenced maps have no frontier to surface.
- **List every open map**: `neuron memory list --category tickets-present
  --where "kind=map" --json`. **List every map regardless of state**: run
  the same query against `tickets-past` and `tickets-future` too (three
  calls — `memory list` has no cross-category union) and combine.
- **Claim**: `neuron memory update <id> "<unchanged content>" --category
  tickets-present --status claimed` before any work.
- **Resolve**: `neuron memory update <id> "<content, with the answer
  appended>" --category tickets-present --status resolved`, then update the
  map entry's own content to append a context pointer (gist + link) to its
  Decisions-so-far. The ticket **stays in `tickets-present`** — resolving one
  child never moves it on its own; see "Archiving," next.

## Archiving (present → past) and promotion (future → present)

Not part of `/wayfinder`'s per-ticket loop — these are whole-map operations,
done once when a map's own state changes, not by the skill's normal
claim/resolve/record cycle.

- **Archiving a closed map**: once every child of a map in `tickets-present`
  is `resolved` and the maintainer considers the map's own Destination
  reached, move the map **and every one of its children** into
  `tickets-past` together, preserving each entry's id/content/tags/fields
  exactly (a same-id `delete` from the old category followed by an `upsert`
  into the new one — see ticket 9's migration script for the exact pattern;
  a same-id `upsert` alone will *not* move an existing row's category, since
  the vector-mode upsert path only `UPDATE`s an existing id and never
  touches its category column). Do this as one batch, not per-ticket as each
  resolves — the whole point of whole-map archiving is that `tickets-present`
  stays a stable working set for as long as the map is open.
- **Promoting a parked map**: manual only, no automatic trigger. When the
  maintainer sequences a `tickets-future` map into active work, move the map
  and its children into `tickets-present` the same way (delete-then-upsert,
  same ids).
