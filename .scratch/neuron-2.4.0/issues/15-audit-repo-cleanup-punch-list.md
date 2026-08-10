Type: task
Status: unclaimed
Blocked by: none

# 15 — Audit: Repo Cleanup Punch List

## Question

Sweep the repo for both code readability and repo hygiene, and produce a
concrete, prioritized punch list — this ticket does not fix anything
itself, it makes the cleanup scope visible so fix tickets can graduate
from its answer, mirroring [13](13-audit-dogfooding-gaps.md)'s pattern.

Known candidates found during this map's own recon (not exhaustive — the
point of this ticket is to make it exhaustive):
- Root-level docs that look like one-off working notes rather than
  intentional repo documentation: `RELEASE_2.0.0.md`, `TEST_INFRA.md`,
  `TEST_READY.md`. Determine per-file whether each is stale (delete),
  superseded by something in `docs/` (consolidate/redirect), or still
  load-bearing (keep, but maybe relocate).
- `tmp/` is untracked and not covered by `.gitignore` — currently holds at
  least `tmp/token-ab-dryrun-check/results.json`. Decide whether it should
  be gitignored, relocated under an existing ignored path, or cleaned up
  as stray output.
- `src/` readability and structure: dead code, module boundaries that
  don't match the current 14-subsystem architecture card, anything that
  reads as legacy scaffolding. 12 files currently contain `console.log`
  calls — audit which are intentional CLI output vs. debug residue left
  behind.
- `CHANGELOG.md` is large (58KB); determine if it needs trimming,
  archiving older entries, or is fine as-is for a project at this stage.

Explicitly **excluded** from this audit's scope: `.scratch/` itself is
governed by [14](14-neuron-as-tracker-design.md), not this ticket — don't
duplicate that decision here even though `.scratch/`'s sprawl is part of
what prompted this thread.

Deliverable: a markdown summary (linked asset) listing each item found,
why it's flagged, and a rough size/risk note per item, sufficient for
graduating each into its own implementation ticket in a following session.

## Comments

- Chartered 2026-08-10 in a breadth-first grilling session as the
  process-audit half of a "clean up the repo for readability" thread —
  mirrors [13](13-audit-dogfooding-gaps.md)'s audit-first pattern at the
  maintainer's request, rather than guessing at fixes without a full sweep.
- `.scratch/` was originally going to be scoped inside this ticket; the
  maintainer's answer to a scoping question redirected it into its own
  design ticket ([14](14-neuron-as-tracker-design.md)) instead — see that
  ticket's Comments for the full context.
