Type: task
Status: resolved
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

## Answer

Resolved 2026-08-11. Full punch list published as a linked asset:
[15-repo-cleanup-punch-list.md](15-repo-cleanup-punch-list.md).

Three of the four recon candidates turned out to be real, sized-down to two
concrete graduation candidates:

1. **Delete `RELEASE_2.0.0.md`, `TEST_INFRA.md`, `TEST_READY.md`** — all
   three are zero-cross-reference `2.0.0`-era working notes, fully subsumed
   by `CHANGELOG.md`'s own `[2.0.0]` entry or superseded by `npm test`'s live
   output. Trivial size, low risk (confirmed no doc/script/`package.json`
   references any of them).
2. **Decide `tmp/`'s fate** — untracked, not gitignored, currently holds one
   stray benchmark dry-run output file. Either gitignore it as an accepted
   scratch convention or delete its contents and stop writing there.

The other two recon candidates were checked and cleared, not flagged:

- **`console.log` audit**: all 12 grep hits across `src/` are either fixture
  source code inside test strings (2 files) or intentional CLI output — help
  text, `--json` contracts, TTY-gated progress lines (10 files). No debug
  residue found.
- **`src/` structure vs. the 14-subsystem architecture card**: matches
  cleanly, no orphaned directories. Two things that looked like findings on
  first pass turned out not to be: `src/outside_dir.md` /
  `src/traversal_test.md` are intentional path-traversal test fixtures
  (tracked since `v2.0.0-rc2`, actively read by two storage tests), not
  stray files that escaped a temp dir; `src/e2e/` vs `test/e2e/` is a naming
  collision between two legitimately different suites (in-source E2E vs. the
  standalone benchmark harness), not duplication — flagged only as an
  optional, non-urgent rename for human navigability.
- **`CHANGELOG.md` size** (58KB, 11 releases): proportional to real release
  density at prose-per-release verbosity, not clutter. Judged fine as-is;
  revisit with an archive split only if it becomes unwieldy, no such
  threshold observed yet.

`.scratch/` itself stayed out of scope throughout, per this ticket's own
exclusion and [ticket 14](14-neuron-as-tracker-design.md)'s governance.

Unblocks nothing directly (no ticket in this map lists it as a blocker) —
its punch list is the input the maintainer or a future session graduates
implementation tickets from, mirroring how `13`'s audit is meant to feed
`16`.
