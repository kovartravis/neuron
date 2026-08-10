Type: grilling
Status: unclaimed
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
