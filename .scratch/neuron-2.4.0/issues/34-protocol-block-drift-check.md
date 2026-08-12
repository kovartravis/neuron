Type: task
Status: unclaimed
Blocked by: none

# 34 — Detect `CLAUDE.md` Protocol-Block Drift From `neuron.yaml`

## Question

Add a check (CI step and/or `status --check` finding) that regenerates the
marker-bounded protocol block in memory via the existing
`generateProtocolBlock` function and diffs it against what's actually
committed in `CLAUDE.md` (or the equivalent file per harness), failing or
warning when they disagree — closing finding **F3** from
[ticket 13's audit](13-dogfooding-gaps-audit.md).

This already happened for real once: ticket 10 found this repo's own
`CLAUDE.md` header still read `learning, history, decisions` /
`category: decisions` after ticket 01's live auto-declare changed
`neuron.yaml` out from under it, caught only by a human doing a live
dogfood pass, not by any automated check. `neuron init` only regenerates
the block on `--overwrite-hooks` or interactive consent; a non-interactive
re-init just logs `kept-existing` and leaves the drift in place
indefinitely.

Resolve:
- CI step (in `build-and-test`, alongside `32`'s architecture-drift gate)
  vs. a `status --check` finding vs. both — the audit didn't commit to
  one, and this ticket should.
- Multi-harness scope: does this generalize to every generated
  protocol/config file (`AGENTS.md`, `.github/` skill files, etc.) or stay
  scoped to `CLAUDE.md` for now.

## Comments

- Graduated 2026-08-12 from [ticket 13](13-audit-dogfooding-gaps.md)'s
  audit finding F3 — reuses an existing generator function
  (`generateProtocolBlock`), no new generation logic needed.
