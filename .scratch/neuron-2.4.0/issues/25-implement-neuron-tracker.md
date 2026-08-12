Type: task
Status: resolved
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

## Answer

Built exactly what [14](14-neuron-as-tracker-design.md) and
[ADR 0018](../../../docs/adr/0018-neuron-as-issue-tracker.md) decided, with
one forced rename found while implementing:

- **`neuron.yaml`**: declared the `tickets` category with three fields —
  `status` (enum `unclaimed`/`claimed`/`resolved`, `default: unclaimed`, so
  a bare `memory add` never hard-errors), the ADR's `type` field (enum
  `research`/`prototype`/`grilling`/`task`, no default — a map omits it
  entirely, matching the ADR's "a map has no type" ruling), and `blockedBy`
  (string, no default — omitted means unblocked).
- **Forced rename: `type` → `kind`.** `--type` is already a reserved
  built-in CLI flag (`src/config/neuronYaml.ts`'s `RESERVED_FLAG_NAMES`,
  line 224), and `validateDeclaredFields` hard-errors ("would become the
  flag `--type`, which collides with a reserved built-in flag. Rename the
  field.") on any category that tries to declare it. Confirmed live —
  `neuron.yaml` with a literal `type:` field under `categories.tickets`
  throws on every command. ADR 0018's text names the field `type`; this is
  a mechanical rename to `kind` with the same enum values and meaning, not
  a design change — documented inline in `neuron.yaml` and in the rewritten
  tracker doc so the discrepancy from the ADR's literal wording doesn't read
  as an unexplained drift later.
- **Mutation verified live, no new storage code**, per the ticket's own
  scope: `memory add --category tickets --status unclaimed --kind task
  "..."` creates an entry with `fields: {status, kind}`; `--kind bogus`
  hard-errors with the enum's allowed values (existing `transact()`
  validation, unchanged); `memory update <id> "<content>" --category
  tickets --status claimed --blocked-by "05,06"` patches fields in place;
  `memory delete` removes cleanly. `neuron status --check` reports
  `{"compliant":true,"violations":[],"undeclaredCategories":[]}` after the
  declaration. All verification entries created during this session were
  deleted afterward — no test data left in the live store.
- **Frontier primitive: `memory list`, not `memory query`.** The tracker
  doc originally implied a semantic search for the frontier scan; `list`
  (`neuron memory list --categories tickets --json`) is the correct
  primitive instead — it's a real enumeration (newest-first, every entry in
  the category, no relevance ranking or gate), where `query` can silently
  omit a low-scoring ticket. Documented explicitly in the rewritten doc so
  a future session doesn't reach for `query` here by habit.
- **Rewrote `docs/agents/issue-tracker.md`** end to end: removed the "Issue
  tracker: Local Markdown" section outright (no coexisting/legacy-marked
  alternative, per the ADR), replaced with "Issue tracker: Neuron" covering
  the same five wayfinder operations (map/child/blocking/claim/frontier)
  against the `tickets` category, plus the `kind`-not-`type` naming note
  and the `list`-not-`query` frontier note above.
- **Wayfinder skill checked, not changed.** `.claude/skills/wayfinder/SKILL.md`
  doesn't name `.scratch` or local-markdown directly — it defers to "the
  tracker doc" generically ("If no tracker has been provided, default to
  the local-markdown tracker"), so the rewritten `issue-tracker.md` is a
  complete fix with no skill-file edit needed.
- **`CLAUDE.md`'s one-line pointer updated too** (not in this ticket's
  original Question, but a direct, obvious consequence of it): it named
  `.scratch/` as the tracker and is the first doc a session reads. Updated
  to point at the new mechanism, with an explicit caveat that `.scratch/`
  is still the tracker for the 19 efforts [26](26-migrate-scratch-to-tickets-category.md)
  hasn't migrated yet (including this map itself) — so the doc doesn't
  claim `.scratch/` is already gone.
- **Scope boundary held**: did not touch `.scratch/` contents, did not
  migrate any existing effort, did not delete `.scratch/` — that's
  [26](26-migrate-scratch-to-tickets-category.md), which is now unblocked.
- **Found and fixed the same protocol-block-drift class `10` already hit
  once**: declaring `tickets` in `neuron.yaml` left `CLAUDE.md`'s generated
  header stale (`categories: learning, history, decisions, architecture`,
  missing the new one) since a non-interactive session never re-runs
  `--overwrite-hooks`. Confirmed via `loadConfig()` +
  `generateProtocolBlock()` that the only diff was that one line, applied
  the exact generated text by hand, and re-diffed byte-for-byte to confirm
  the match before moving on — same verification shape `10`'s own fix used.
  `npm test` 678/678, `tsc` clean; only `neuron.yaml`,
  `docs/agents/issue-tracker.md`, and `CLAUDE.md` changed — no `src/` edits.
