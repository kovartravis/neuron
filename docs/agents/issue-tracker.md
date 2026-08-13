# Issue tracker: Neuron

Issues and specs (you may know a spec as a PRD) for this repo live in `neuron`
itself, as entries in the `tickets` category. Declared per
[ADR 0018 — Neuron as This Repo's Issue Tracker](../adr/0018-neuron-as-issue-tracker.md),
reusing [ADR 0011](../adr/0011-markdown-as-store-of-record.md)'s markdown
store of record and [ADR 0013](../adr/0013-configurable-frontmatter-schema.md)'s
declared-field schema — no new storage mechanism, no new top-level command.

## Conventions

- Every ticket and every map is one `tickets`-category entry. A map has no
  `kind`; its identity is that other entries' content links back to it. A
  child ticket sets `kind` to one of `research`/`prototype`/`grilling`/`task`.
- `status` (enum: `unclaimed`/`claimed`/`resolved`) and `blockedBy` (string,
  comma-separated ticket ids, omitted when unblocked) are declared fields —
  see `neuron.yaml`'s `categories.tickets.fields`.
  - `kind` is the declared-field name for what the rest of this repo's docs
    (including the wayfinder skill) call a ticket's **type**. It isn't named
    `type` in `neuron.yaml` because `--type` is already a reserved built-in
    CLI flag (`neuronYaml.ts`'s `RESERVED_FLAG_NAMES`) and a declared field
    that collides with a built-in flag is a hard config error
    (`validateDeclaredFields`). Same enum, same meaning, different key.
- A ticket's content is its full body (the question, and — once resolved —
  the answer). There's no separate file per ticket; `neuron memory update`
  replaces content in place.
- Blocking has no tracker-native relationship (neuron's storage has no
  graph/relationship primitive). It's the `blockedBy` field plus the
  frontier-as-scan convention below — the wayfinder skill's own documented
  fallback for a tracker without native blocking.

## When a skill says "publish to the issue tracker"

`neuron memory add --category tickets --kind <kind> --status unclaimed "<content>"`.
Link the new ticket from its map's content (an `update` on the map's own
entry), and set `--blocked-by` if it starts blocked.

## When a skill says "fetch the relevant ticket"

`neuron memory query "<ticket title or id>" --categories tickets`, or list and
filter by id if the id is already known (`neuron memory list --categories
tickets --json`). The user will normally pass the id or enough of the title
to find it.

## Wayfinding operations

Used by `/wayfinder`. The **map** is a `tickets` entry; its **children** are
`tickets` entries whose content links back to it.

- **Map**: one `tickets`-category entry — content holds the Destination /
  Notes / Decisions-so-far / Not yet specified / Out of scope body the
  wayfinder skill defines.
- **Child ticket**: one `tickets`-category entry with the question in its
  content. `kind` records the ticket type; `status` records
  `unclaimed`/`claimed`/`resolved`.
- **Blocking**: the `blockedBy` field holds comma-separated ticket ids. A
  ticket is unblocked when every id it lists names an entry with
  `status: resolved`.
- **Frontier**: `neuron memory list --category tickets --where "status=unclaimed"
  --refs-satisfy "blockedBy:status=resolved" --json`. `--where` and
  `--refs-satisfy` are generic, schema-agnostic `memory list` filters (any
  category, any declared field — not specific to this tracker's `status`/
  `blockedBy` naming), composed here to express this convention: keep
  entries whose declared field equals a value, and whose every
  comma-separated id in another field names a same-category entry
  satisfying its own field/value pair. A dangling `blockedBy` id (no
  matching entry at all) leaves the ticket blocked rather than silently
  unblocking it. `--limit` caps the returned result, not the internal fetch
  used to compute it — correctness needs to see every ticket. Note this
  pools every effort's tickets together (the schema has no per-map scoping
  field, only content backlinks), so cross-reference against the map you're
  working before picking one up.
- **Claim**: `neuron memory update <id> "<unchanged content>" --category
  tickets --status claimed` before any work.
- **Resolve**: `neuron memory update <id> "<content, with the answer
  appended>" --category tickets --status resolved`, then update the map
  entry's own content to append a context pointer (gist + link) to its
  Decisions-so-far.
