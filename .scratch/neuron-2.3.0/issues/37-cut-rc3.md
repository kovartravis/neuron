Type: task
Status: resolved
Blocked by: 29, 30, 32
Band: 2.3.0-rc3

# 37 — Cut and Publish 2.3.0-rc3

## Question

Once the architecture-index-and-module-cards restructure
([28](28-architecture-index-and-module-cards.md)/
[29](29-diff-baseline-reassembly.md)/
[30](30-injection-fetches-index-only.md)) and the per-prompt discovery-command
hint ([32](32-per-prompt-discovery-command-hint.md)) have landed, is
everything on trunk since `v2.3.0-rc2` safe to tag as a real, installable
release candidate — and do the README, CHANGELOG, and packaged
`neuron-memory` skill accurately describe what it does?

## Context

**Maintainer decision, 2026-08-09** (recorded while scoping this map's
remaining tickets against the two live release options — one more rc cut vs.
pushing straight to the full `2.3.0` cut): the next rc is **gated on `28`-`30`
and `32` landing**, not cut immediately. An immediate rc3 would ship almost
no new user-visible content over `rc2` — since `rc2`, only the publish
workflow itself has changed (Node 22 bump, OIDC trusted publishing), which is
repo infrastructure, not a package-runtime change worth its own rc. `28`-`30`
and `32` are the two bands with real, in-flight feature work that aren't
release blockers of [04](04-cut-and-publish.md) but are close enough to
landing to be worth a snapshot.

**Not the same gate as `04`'s own blockers.** `04` (the full `2.3.0` cut)
remains blocked on `01`/`02`/`03`/`15` — two real-harness-install
verifications (`20`, `22`) and a live-credentialed A/B pilot (`14`), none of
which this rc depends on and none of which this rc unblocks. This ticket and
`04` are independent forks from here: whichever HITL step clears first
(harness installs/credentials, or `28`-`30`/`32` landing) determines whether
this rc or the full `04` cut happens next. Both can proceed in parallel.

**Precedent**: follow [ticket `34`'s own
approach](34-cut-rc2.md) — audit `git log v2.3.0-rc2..HEAD` directly for what
actually shipped, not the nominal band structure, since there is no per-band
branch in this workflow. Do not claim anything from tickets `14`/`19`/`24`
(no live run yet) or state `28`-`30`'s restructure as the final shape of
anything it doesn't itself finish (e.g., if `24`'s A/B is still open when
this cuts, say so).

## Scope

1. Version bump to `2.3.0-rc3`.
2. CHANGELOG entry covering the real trunk diff since `rc2`, expected to
   include at minimum: the architecture blueprint's storage split into an
   index + per-module cards (with the resulting change to what `scan --diff`
   reads, if user-visible), and the per-prompt discovery-command hint
   (`neuron memory query`/`list` surfaced conditionally on a counted recall
   gap). Audit for anything else that landed incidentally, same as `34`'s own
   Scope item 2 required.
3. Doc sweep: README, `docs/COMMANDS.md`, `CONTEXT.md`, and the packaged
   `.claude/skills/neuron-memory/SKILL.md` against the same diff — same
   sources `34` swept, checked fresh rather than assumed still current.
4. Run `npm test` and `npm run test:e2e`.
5. Tag `v2.3.0-rc3`, commit, push. Do not run `npm publish` — left to the
   maintainer, same precedent as every prior rc cut on this and the
   `neuron-2.2.0` map (irreversible, no session credentials worth risking).

## Deliverables

- [ ] `2.3.0-rc3` version-bumped, committed, tagged `v2.3.0-rc3`, and pushed
- [ ] CHANGELOG entry covering the real trunk diff since `rc2`
- [ ] Doc sweep against the same diff, updated where stale
- [ ] Unit + E2E suites green
- [ ] `npm publish --tag rc` left explicitly to the maintainer

## Answer

**Superseded, not cut — 2026-08-10.** Scoping this map's remaining tickets
against the maintainer's remaining weekly usage budget, `32` (the ticket
this rc was also gated on) moved to [neuron-2.4.0](../../neuron-2.4.0/map.md)
along with the rest of the work `04` never actually depended on. That
leaves this ticket gated only on `28`/`29`/`30`, both already resolved — but
cutting a third interim rc (its own version bump, CHANGELOG audit, doc
sweep, tag, and push) spends a session `04`'s own direct blockers
(`01`/`02`/`03`, all waiting on `20`/`22`'s real-install verification) don't
need. Ruled to skip straight to the full `04` cut once `01`/`02`/`03` clear,
rather than insert an rc3 the destination doesn't require. `28`-`30`'s
architecture-index restructure still ships — it lands in `04`'s own
CHANGELOG audit of the full `v2.3.0-rc2..HEAD` diff instead of a dedicated
interim snapshot. Not reopened as a `neuron-2.4.0` ticket: there is no
`2.4.0-rc3` to cut, since rc numbering belongs to this release. Closed as
resolved (an actual decision was made — don't cut it), not out of scope
(the destination never excluded it, its prerequisite just got deferred).
