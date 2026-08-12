Type: task
Status: unclaimed
Blocked by: 40, 41

# 42 — Sweep Repo-Wide `.scratch/` References & Delete `.scratch/`

## Question

Per [26](26-migrate-scratch-to-tickets-category.md)'s ruling: once
[40](40-migrate-wayfinder-efforts-to-tickets.md) and
[41](41-relocate-scratch-asset-dirs.md) have given every real effort and
asset a permanent home, fix every remaining live reference to `.scratch/`
outside `.scratch/` itself, then delete the tree.

A repo-wide grep as of `26`'s resolution found direct links in:
`README.md`, `CHANGELOG.md`, `CLAUDE.md`, ADRs `0003`, `0012`–`0018` (0010
and 0011 are `41`'s responsibility), `.claude/skills/ask-matt/SKILL.md`,
`.claude/skills/setup-matt-pocock-skills/SKILL.md` and its
`issue-tracker-local.md`, `.claude/skills/to-tickets/SKILL.md`,
`.claude/skills/code-review/SKILL.md`, `.claude/settings.local.json`, and
`src/components/enricher.ts`. Re-grep before starting — `40`/`41` may add
or resolve some of these themselves.

**Leave `.neuron/architecture.md`, `.neuron/decisions.md`,
`.neuron/history.md`, and `.neuron/learning.md` untouched.** Their
`.scratch/` mentions are frozen historical record of what was true when
each entry was written; rewriting them to point at post-migration paths
would falsify the record.

Before deleting `.scratch/`:

- Confirm `neuron memory list --categories tickets --json`, filtered per
  `docs/agents/issue-tracker.md`'s frontier convention, finds the same
  open/unblocked set across all 9 migrated efforts that the old
  `.scratch` bookkeeping would have — not just the two efforts `40`
  spot-checked.
- Confirm every path this ticket updated actually resolves (no dangling
  link left behind by the sweep itself).

Then `git rm -r .scratch/` and commit.

## Comments

- Graduated 2026-08-12 from [26](26-migrate-scratch-to-tickets-category.md)'s
  resolution, alongside [40](40-migrate-wayfinder-efforts-to-tickets.md) and
  [41](41-relocate-scratch-asset-dirs.md). Blocked on both landing first so
  nothing points at a `.scratch/` path that's about to stop existing.
