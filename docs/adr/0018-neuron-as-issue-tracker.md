# ADR 0018 — Neuron as This Repo's Issue Tracker

- **Status:** Accepted (2026-08-11)
- **Relates to:** [ADR 0011 — Markdown as Store of Record](0011-markdown-as-store-of-record.md),
  whose reconcile/repair posture this tracker inherits unchanged; [ADR 0013 —
  Configurable Frontmatter Schema](0013-configurable-frontmatter-schema.md),
  whose declared-field-schema machinery this decision reuses rather than
  extends
- **Ticket:** [14 — Design: Should Neuron Replace `.scratch/` as This Repo's
  Issue Tracker?](../../.scratch/neuron-2.4.0/issues/14-neuron-as-tracker-design.md)

## Context

`docs/agents/issue-tracker.md`'s local-markdown convention holds wayfinder
maps and tickets as flat files under `.scratch/`, one effort per directory —
19 of them as of this ADR, each with its own `map.md` and `issues/NN-*.md`
children. The maintainer wants to replace that mechanism with neuron's own
storage: a real dogfooding move (the memory tool becomes the planning tool)
that also removes most of what makes the repo root look sprawling to a
first-time reader.

This is a real design question, not a small one. Neuron's existing categories
(`learning`/`history`/`decisions`/`architecture`) are append-only fact logs.
A wayfinder ticket needs mutable state — claimed/unclaimed, blocked-by edges,
resolved-with-answer — that no existing category models.

## Decision

**Tickets are a new `tickets` category, built entirely from machinery ADR
0011 and ADR 0013 already shipped — no new storage mechanism.**

### A ticket is a declared-field entry, not a new entity type

`tickets` gets three user-defined fields via ADR 0013's schema:

- `status` — enum: `unclaimed` / `claimed` / `resolved`
- `type` — enum: `research` / `prototype` / `grilling` / `task`
- `blockedBy` — string, comma-separated ticket ids (empty when unblocked)

`id`/`createdAt` (structural) and `importance`/`tags` (semantic-reserved)
carry over unchanged. A map is itself a `tickets`-category entry — same
schema, `type` distinguishes nothing (a map has no `type`; its identity is
that other entries reference it) so a map is simply the entry other tickets'
content links back to.

### Mutation is the existing `update` op — no new capability

Claiming a ticket, resolving it, and appending an answer are all
`transact({ op: 'update', category: 'tickets', ... })` calls against
`NeuronMemory`'s existing mutation path (`src/index.ts`, already exercised
today by resolution flows and violation repair — see `src/index.ts:1245`,
`:1714`). This ADR introduces no new op, no new storage table shape, and no
new reconcile behavior: a `tickets` entry is bound by the same strict-mirror
reconcile and repair-incomplete/refuse-ambiguous policy ADR 0011 established
for every other category.

### Blocking is a frontmatter field, not a tracker-native relationship

The wayfinder skill's stated preference is a tracker's *native* dependency
relationship, so blocked state renders visibly in the tracker's own UI.
Neuron's storage has no graph/relationship primitive and this ADR does not
add one — building real native blocking (a computed status, a `neuron
ticket frontier` command) would be new product surface serving a
repo-internal tooling need, working against the very "no new top-level
commands" non-goal ADR 0013 already leans on.

`blockedBy` is therefore a plain declared string field, and the wayfinder
skill's own already-defined fallback applies: frontier computation is a scan
— read `tickets`-category entries with `status: unclaimed`, keep those whose
every `blockedBy` id resolves to a `status: resolved` entry. This is a
documentation-level convention (see below), not new code.

### `docs/agents/issue-tracker.md` is rewritten, not extended

The local-markdown section is **removed outright**, not kept as a coexisting
or legacy-marked alternative. It is replaced by a single "Issue tracker:
Neuron" section describing the same five operations
(map/child/blocking/claim/frontier) in terms of the `tickets` category
above. There is one tracker convention for this repo going forward, and the
doc says so unambiguously — no `.scratch` references survive the rewrite.

### Migration: bulk, all at once, then `.scratch/` is deleted

All 19 existing `.scratch/` effort directories are migrated in a single
mechanical pass: each `issues/NN-*.md` becomes a `tickets`-category entry
(`Status:`/`Type:`/`Blocked by:` lines map onto the declared fields
verbatim, body becomes content, any `## Answer` section is preserved in
content), each `map.md` becomes its own entry that child tickets reference.
Once migrated and verified, `.scratch/` is deleted from the repository.

Two alternatives were rejected:

- **Permanent read-only archive.** Incompatible with removing `.scratch`
  references from the tracker doc — agents would still need to know how to
  read a mechanism the docs no longer describe.
- **Lazy, on-next-touch migration.** Leaves an indefinite, silently-decaying
  set of stragglers (mostly closed/resolved efforts nobody happens to
  reopen) sitting undocumented in a directory the docs no longer mention —
  the exact sprawl this decision exists to eliminate, just deferred rather
  than avoided.

A bounded one-time mechanical cost beats an indefinite inconsistency.

## Consequences

- **Positive:** the planning tool and the memory tool become provably the
  same mechanism — the dogfooding claim is structural, not asserted. Repo
  root sprawl (19 `.scratch` directories) is eliminated in one pass rather
  than incrementally cleaned up. No new storage code is written; this ADR is
  entirely a configuration and convention decision on top of ADR 0011/0013.
- **Negative:** blocking and frontier state are not visually native the way
  a real issue tracker's UI would render them — a session still has to run
  the scan-and-filter convention by hand (or via a documented `neuron memory
  query` pattern) to find the frontier, same limitation the local-markdown
  tracker already had.
- **Follow-on work:** declaring the `tickets` category schema and rewriting
  `docs/agents/issue-tracker.md`, then running the bulk migration and
  deleting `.scratch/`, are implementation tickets graduated from this
  decision rather than built as part of it — mirroring how ADR 0014's
  pre-command-hook decision (ticket 12) graduated its own implementation
  rather than building inline.
