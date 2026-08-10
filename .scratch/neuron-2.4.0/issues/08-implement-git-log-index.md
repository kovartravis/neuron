Type: task
Status: unclaimed
Blocked by: none (39 resolved on neuron-2.3.0 before this ticket moved)
Band: context cost

# 08 — Implement the Git-Log Index

## Question

Build the git-log-as-searchable-resident-source feature per
[39](../../neuron-2.3.0/issues/39-git-log-index-design.md)'s rulings: the index itself, its refresh
mechanism, and its wiring into `src/commands/hook.ts`'s
session-start/pre-prompt injection path.

## Context

`14`'s `gitlog-search.mjs` is a measurement-only prototype (generic
`git log --grep` OR-matched keyword search, top 6 commits by recency,
formatted with an explicit "may be incomplete, verify yourself" caveat) —
`14` Scope item 3 deliberately told it not to be over-built before the A/B
answered whether the premise held. It now has, and `39` settles the shape.
This ticket is the real build, not a verbatim reuse of the prototype file
unless `39` ruled that its primitive is good enough to ship as-is.

`14` also surfaced a real search-quality risk worth designing around, not
just disclosing: ticket numbers collide across this repo's own concurrent
wayfinder maps (a naive keyword search for "ticket 14" surfaced a decoy
commit from `neuron-2.2.0`'s own, differently-numbered ticket 14). Whatever
this ticket builds should not regress on that — either scope queries away
from raw ticket numbers, or disambiguate by map/directory.

## Scope

1. Implement the index/search mechanism `39` ruled on (structured index or
   direct `git log` shell-out, per `39`'s Scope item 3 ruling).
2. Implement the refresh mechanism `39` ruled on (check-HEAD-on-read vs.
   git hook vs. both).
3. Wire injection into `src/commands/hook.ts` at the point(s) `39` ruled
   on (session-start / pre-prompt / both), reserving budget the same way
   `07`'s per-epoch char budget already does for other injected content —
   this is additive resident-footprint cost, not exempt from that
   accounting.
4. Implement whichever `history`-write-step change `39` ruled (removal of
   the `sessionEndStep` history-logging instruction in
   `src/config/protocolBlock.ts`, a modification of it, or no change if
   `39` ruled supplement-only) — NOTE: do not touch
   `src/config/protocolBlock.ts`'s actual generated output in this ticket;
   that's `41`'s scope. This ticket only implements the underlying
   mechanism a write-step change would rely on.
5. Tests: unit coverage for the index/search/refresh logic, plus a
   regression test reproducing the ticket-number-collision risk found in
   `14` if `39` ruled a disambiguation fix rather than accepting the risk
   as disclosed-only.

## Verification

- `npm test` green.
- `tsc --noEmit` clean.
- The injected git-log content is measurably bounded (reserves/charges
  budget through the same mechanism `07`/`11` use), not an unaccounted
  resident-cost regression.
- Manually dogfooded against this repo's own git history before marking
  resolved (a prompt naming a real past ticket/commit surfaces real,
  correct git-log content) — same live-demonstration bar `28`/`30` used.

## Deliverables

- [ ] Git-log index + refresh mechanism implemented per `39`'s rulings
- [ ] Wired into `hook.ts`'s injection path with budget accounting
- [ ] Tests, `npm test`/`tsc` clean
- [ ] Unblocks [41](09-update-init-skill-readme-for-git-log-index.md) and
      [42](10-dogfood-git-log-index.md)
