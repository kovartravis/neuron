Type: grilling
Status: resolved
Blocked by: none

# 14 — Design: Should Neuron Replace `.scratch/` as This Repo's Issue Tracker?

## Question

`.scratch/` currently holds 20+ effort directories of wayfinder maps and
tickets as flat markdown files, per
[docs/agents/issue-tracker.md](../../../docs/agents/issue-tracker.md)'s
local-markdown tracker convention. The maintainer wants to explore
replacing that with neuron's own storage as the tracker mechanism —
which would itself be a dogfooding move (the memory tool becomes the
planning tool) and would address most of what makes `.scratch/` look
sprawling to a first-time reader of the repo.

This is a real design question, not a small one: neuron's existing
categories (`learning`/`history`/`decisions`, or whatever a project
configures per [ADR 0013](../../../docs/adr/0013-configurable-frontmatter-schema.md))
are append-only fact logs. A wayfinder map/ticket needs mutable state
(claimed/unclaimed, blocked-by edges, resolved-with-answer) that nothing
in neuron's current storage model represents. Resolve, at minimum:

- Does a "ticket" become a new kind of category, a new frontmatter schema
  variant, or something structurally different from a memory entry
  entirely? What does mutation (claim, resolve, re-open) mean for a
  storage layer built around append-only markdown sections
  ([ADR 0011](../../../docs/adr/0011-markdown-as-store-of-record.md))?
- How does native blocking (a first-class requirement of the wayfinder
  skill — tickets must render their blocked state visibly, per the skill's
  own preference for a tracker's *native* dependency relationship) get
  represented? Does this tracker even qualify as having "native" blocking,
  or does it fall back to the body-convention `Blocked by:` line the
  wayfinder skill already treats as the fallback case?
- How does the wayfinder skill's per-repo tracker doc
  (`docs/agents/issue-tracker.md`) change — does a "neuron tracker" become
  a second tracker-doc section describing its own map/child/blocking/claim/
  frontier operations, replacing the local-markdown one, or coexisting
  with it?
- **Migration**: what happens to the existing 20+ `.scratch/` effort
  directories? The maintainer wants this ticket to decide whether/how they
  get imported into the new mechanism (not just left behind as an archive)
  — resolve the migration approach (all at once, lazily on next touch,
  or left as a permanent historical archive read via markdown while new
  efforts start fresh) as part of this same ticket.
- Does this need its own ADR, given it changes how the project itself is
  planned, not just a product feature?

## Comments

- Chartered 2026-08-10 in a breadth-first grilling session, raised by the
  maintainer directly in response to a scoping question about whether
  `.scratch/` itself was in scope for the repo-cleanup thread
  ([15](15-audit-repo-cleanup-punch-list.md)). The maintainer's answer
  reframed the question entirely — rather than cleaning up `.scratch/` in
  place, replace the mechanism it represents.
- Deliberately **not** folded into [13](13-audit-dogfooding-gaps.md) or
  [15](15-audit-repo-cleanup-punch-list.md) despite touching both threads:
  this is an architecture decision (grilling/HITL), not an audit (task/AFK)
  — it needs a live design conversation, not a sweep.

## Answer

Grilled with the maintainer 2026-08-11, five questions in sequence:

1. **Tickets are a new `tickets` category**, built entirely from ADR 0011
   (markdown store of record, strict-mirror reconcile) and ADR 0013
   (declared-field schema) machinery — no new storage mechanism. Three
   user-defined fields: `status` (enum: `unclaimed`/`claimed`/`resolved`),
   `type` (enum: `research`/`prototype`/`grilling`/`task`), `blockedBy`
   (string, comma-separated ids). Mutation is the existing `transact({ op:
   'update', ... })` path, already exercised today by resolution flows and
   violation repair (`src/index.ts:1245`, `:1714`) — no new capability.
2. **Blocking is a plain frontmatter field, not tracker-native.** Neuron's
   storage gets no new relationship primitive; building one (a computed
   status, a `neuron ticket frontier` command) would be new product surface
   serving a repo-internal need, against ADR 0013's own no-new-top-level-
   commands non-goal. Frontier computation falls back to the wayfinder
   skill's own documented fallback: scan unclaimed entries, keep those whose
   every `blockedBy` id resolves to a resolved entry.
3. **`docs/agents/issue-tracker.md`'s local-markdown section is removed
   outright**, replaced by a single "Issue tracker: Neuron" section — no
   coexistence, no legacy-marked leftover section. No `.scratch` references
   survive the rewrite.
4. **Migration is bulk, all at once**, not lazy/on-touch and not a
   permanent read-only archive. All 19 `.scratch/` effort directories
   migrate in one mechanical pass into the `tickets` category; `.scratch/`
   is deleted once verified. Lazy migration was rejected as trading a
   bounded one-time cost for an indefinite, silently-decaying set of
   undocumented stragglers — the exact sprawl this ticket exists to remove.
5. **Yes, a new ADR** — [ADR 0018 — Neuron as This Repo's Issue
   Tracker](../../../docs/adr/0018-neuron-as-issue-tracker.md) — rather than
   an amendment onto ADR 0013, since it sets a repo-process convention (how
   this project itself is planned), not a product feature, even though it
   reuses ADR 0013's schema machinery wholesale.

**Implementation graduated rather than built here**, mirroring ticket 12's
own grilling→implementation split:
[25 — Implement the Neuron-Backed Tracker](25-implement-neuron-tracker.md)
(declare the `tickets` category, rewrite `issue-tracker.md`; unblocked) and
[26 — Migrate All 19 `.scratch/` Efforts, Then Delete
`.scratch/`](26-migrate-scratch-to-tickets-category.md) (blocked by `25`).
