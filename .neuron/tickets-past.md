# Category: tickets-past

---
id: be2f8cba-5d34-4e8f-9a92-1cf737ca77f2
createdAt: 2026-08-16T18:24:55.148Z
importance: 4
tags:
  - wayfinder
  - 2.2.0
  - rc2
taskId: null
kind: task
map: 5768f1c7-0f3c-46e3-90db-c11e4c5df748
status: resolved
---
Ticket 14 — Split docs/design/site/competitive-landscape-and-positioning.md Out of the Ticket 6 Commit (code review finding). This untracked file sits in the same uncommitted working tree as neuron-2.4.3 Ticket 6's write-side compliance trigger work, but its own header states it's input for a different, unrelated effort (neuron.github.io Site 2.5.0, Ticket 2 — Homepage Messaging) — it has no relationship to Ticket 6's pre-stop lifecycle/harness work. Bundling it into the same commit as Ticket 6 makes that commit's history misleading and couples two unrelated efforts' review/revert history together. Fix: commit it separately (or under Site 2.5.0's own map/tickets if that map already exists), not as part of Ticket 6's commit. Found by /code-review's Spec axis (2026-08-16), not yet fixed.

## Answer

Committed separately: docs/design/site/competitive-landscape-and-positioning.md landed in its own commit (127487f, docs(site): add competitive-landscape input for Site 2.5.0 Ticket 2), pushed before the Ticket 6 commit (b9666d7, wayfinder(neuron-2.4.3): resolve ticket 6 and code-review follow-ups (11-13)). No new ticket needed under Map — neuron.github.io Site (2.5.0) — the file already self-identifies as raw input to that map's own Ticket 2 (Homepage Messaging & Positioning) in its header, so it needs no separate tracker entry, just its own commit history distinct from Ticket 6's.

---
id: e54fd0dd-c635-4ce2-a635-f6611d79d01e
createdAt: 2026-08-16T18:24:51.238Z
importance: 4
tags:
  - wayfinder
  - rc2
  - 2.2.0
taskId: null
kind: task
map: 5768f1c7-0f3c-46e3-90db-c11e4c5df748
status: resolved
---
Ticket 13 — Fix Stale Ticket 6 Decision Entry in .neuron/decisions.md (code review finding). The uncommitted diff modifies .neuron/decisions.md's live (non-superseded) decision entry for Ticket 6 (id 05759e7b-d3ee-4bbe-ba18-8cea0a628288), but that entry still records the ticket's FIRST, pre-correction design: it names the lifecycle point session-end, maps it to each harness's literal SessionEnd/sessionEnd event, and claims Codex gets an explicit-instruction prose fallback for lacking real support. This directly contradicts both the actual shipped code (pre-stop point, real Stop-family events on all four harnesses, no Codex fallback) and .neuron/tickets.md's own resolution text for Ticket 6, which documents the mid-/tdd correction made 2026-08-16. A memory record describing the wrong design as final defeats the store's own purpose. Fix: update decisions.md's entry 05759e7b to record the corrected pre-stop design (or supersede it with a corrected entry, consistent with how the map's own git-notes/decisions conventions handle corrections elsewhere in this file). Found by /code-review's Spec axis against Ticket 6 (2026-08-16), not yet fixed.

## Answer

Superseded, not edited in place -- matches this same file's own precedent (270115a5 -> 05759e7b) for correcting a decisions.md entry after a mid-session design change. Wrote a new decisions entry (id f2bc6c9d-f1de-4dd7-9518-466028f1f340, same taskId ae0e3d5d-8564-471e-a2ed-73e54480c7e0) via 'neuron memory add --supersedes 05759e7b-d3ee-4bbe-ba18-8cea0a628288', recording the corrected design: lifecycle point named pre-stop (not session-end), mapped to each harness's real per-turn stop-and-escalate event (Stop/agentStop/stop, not a fire-and-forget SessionEnd-family event), Claude Code's exact Stop field shape confirmed empirically, and Codex CLI's real Stop support corrected in (the earlier 'no hook, needs a prose fallback' conclusion had checked the wrong event name) -- all four harnesses now get real support, none get a prose fallback. 05759e7b now carries supersededBy: f2bc6c9d and is hard-excluded from default query/list, matching Decision 2 of ADR 0015 (hard-exclude by default, never delete). The row itself is untouched -- it remains reachable by direct id lookup, same guarantee ADR 0015 gives every superseded entry.

---
id: 45a743c6-9054-4d06-9466-c6cec8929139
createdAt: 2026-08-16T18:24:45.638Z
importance: 4
tags:
  - wayfinder
  - rc2
  - 2.2.0
taskId: null
kind: task
map: 5768f1c7-0f3c-46e3-90db-c11e4c5df748
status: resolved
---
Ticket 12 — Amend ADR 0015 for --companion-of (code review finding, Ticket 6). ADR 0015 (memory-supersession) Decision 1 documents exactly two gate-resolution paths (--supersedes / an override) and its own Amendments section still reads '(none yet),' but the uncommitted neuron-2.4.3 Ticket 6 diff adds a third resolution mechanism, --companion-of, without touching the ADR. This repo's established convention for exactly this situation is a dated Amendments entry on the original ADR (see ADR 0010, 0013, and 0014's own Amendments sections, all of which record a later ticket extending a previously-decided mechanism) rather than leaving the ADR silently stale. Fix: add a 2026-08-16 Amendment to ADR 0015 recording --companion-of as a third gate-resolution path, referencing Ticket 6. Found by /code-review's Standards axis against the uncommitted diff (2026-08-16), not yet fixed.

## Answer

Added a dated '### 2026-08-16 — Third gate-resolution path: --companion-of' entry to ADR 0015's Amendments section (docs/adr/0015-memory-supersession.md), matching the format already used by ADR 0014's own Amendments section. It documents --companion-of <id> as a third resolution to the Decision 1 write-time gate (alongside --supersedes and the explicit override): exempts the write from the gate only against the named id, for a deliberate companion write, not a blanket bypass; the named id is validated to exist same as --supersedes; and it notes this closes the gate friction Ticket 5 found live (an agent's own session-conclusion entries tripping the gate against each other). Explicitly scoped as additive to Decision 1 only, not touching Decisions 2-6.

---
id: f43d4a3d-14c5-433d-ac04-220af43c0860
createdAt: 2026-08-16T18:24:42.381Z
importance: 4
tags:
  - longmemeval
  - adr
  - rc2
taskId: null
kind: task
map: 5768f1c7-0f3c-46e3-90db-c11e4c5df748
status: resolved
---
Ticket 11 — Fix --companion-of/--if-novel Mutual-Exclusion Gap (code review finding, Ticket 6). docs/COMMANDS.md's uncommitted text for the four gate-resolution flags states they are 'mutually exclusive with each other,' but src/commands/utils.ts only cross-checks --companion-of against --supersedes/--not-a-reversal, and --if-novel against --supersedes/--not-a-reversal — neither guard tests the companion-of+if-novel combination, so the two can be passed together silently, contradicting the diff's own shipped documentation. memory.supersession.test.ts has no test covering that combination either.

## Answer

Maintainer's call (asked directly rather than picked silently, per this ticket's own instruction): **block the combination**, keeping the docs' four-way mutual-exclusion story intact rather than carving out a compositional exception. Considered and rejected: letting --if-novel and --companion-of compose (they operate on different axes — scope-narrowing vs. fire-outcome — so a semantic argument existed), but the maintainer preferred the simpler, fully-symmetric rule.

Implementation: added the missing guard to src/commands/utils.ts's parseFlags — `if (companionOf && ifNovel) { ... process.exit(1) }` — matching the existing three guards' error-message style. Updated both --if-novel's and --companion-of's --help text (utils.ts) to name each other in their mutual-exclusion list (previously each only named --supersedes/--not-a-reversal, so --help itself under-stated the rule docs/COMMANDS.md already claimed). docs/COMMANDS.md's table needed no change — its 'mutually exclusive with each other' claim is now actually true. Added a covering test in memory.supersession.test.ts ('--companion-of and --if-novel together are rejected by parseFlags (ticket 11)'), mirroring the three existing pairwise-rejection tests. `npm test`: 793/793 across 71 files. `tsc --noEmit`: clean.

---
id: 11fc1352-06cd-4ba1-8360-72e91f17acc0
createdAt: 2026-08-16T17:42:39.812Z
importance: 3
tags:
  - 2.2.0
  - wayfinder
  - rc2
taskId: null
kind: research
map: 5768f1c7-0f3c-46e3-90db-c11e4c5df748
status: resolved
---
# 10 — Research OpenCode Harness Support

## Question

Should neuron add an OpenCode adapter (`src/harnesses/`), and if so, does OpenCode now document enough of its hook behavior (failure mode, timeout, payload limit, verification) to meet this project's capability-record bar?

## Context

Spun off from Ticket 6 (Write-Side Compliance Trigger Mechanism) while deciding which harnesses get the new `session-end` LifecyclePoint — OpenCode has no adapter in this codebase at all today (not in `src/harnesses/`, not in `src/config/harnesses.json`), so this is full new-harness scoping, not just wiring one more point onto an existing adapter.

Map — neuron 2.2.0's own ticket 11 (2026-08-03) already ruled OpenCode out of scope once, specifically because at the time it didn't document failure/timeout/payload-limit/verification behavior anywhere reachable — this project's capability model treats an undocumented-behavior adapter as 'the abstraction lying that ticket 11 exists to prevent' (publishing a capability record with no source). That verdict is nearly a year old; re-verify against OpenCode's current docs rather than assuming it still holds or assuming it's stale.

## Deliverables

- [x] OpenCode's current hook/lifecycle documentation reviewed directly (not assumed from memory)
- [x] Verdict: does it now meet the capability-record bar ticket 11 set? Go/no-go on building an adapter at all
- [x] If go: capability map per LifecyclePoint (including session-end, to stay consistent with Ticket 6), fidelity tier (deterministic/best-effort/unsupported per point)
- [x] If go: which map/ticket lineage this belongs to decided (this map's destination is write-compliance/cleanup, not harness breadth — Map 2.3.0/2.4.0 covered prior harness-expansion work; this ticket's own home may need to move)

## Answer

**No-go, unchanged.** Re-verified live against `opencode.ai/docs/plugins/`, the current `@opencode-ai/plugin` package (v1.18.15), and GitHub issue search on `anomalyco/opencode` (2026-08-16). Every gap ticket 11 originally flagged is still a gap: `failurePosture`, `timeoutMs`, and `payloadCapChars` (per `src/harnesses/types.ts`'s `SupportRecord`) are undocumented anywhere for `chat.message`/`chat.params` — OpenCode's still-richest injection surface of any harness researched (full code-level control over the outgoing prompt, firing every turn). Installation is still arbitrary plugin code, not declarative config — a materially different, higher-risk install contract than every other adapter neuron ships.

New since the original ruling: two live, current GitHub issues give the abstract "undocumented failure behaviour" gap a concrete shape. `vectorize-io/hindsight#2656` — a real recall/memory plugin attempting the exact feature shape neuron would ship — registered hooks under names OpenCode silently discards with no error, silently breaking its own auto-recall feature in production. `anomalyco/opencode#7006` shows `permission.ask` is defined in the SDK's `Hooks` type but never actually triggered. Neither is `chat.message`/`chat.params` specifically, but both confirm OpenCode's plugin dispatch has real, current, silently-failing gaps between "defined" and "invoked" — turning the original "no evidence either way" into a live case study of exactly the harness-lying risk ADR 0014's capability-record bar exists to prevent.

Since the verdict is no-go, there's no adapter-build ticket to home on a different map — nothing to route. Returns only behind a future research ticket that measures `chat.message` failure/timeout behavior empirically against a real OpenCode install, not another documentation read.

Full findings, sourcing, and the section-by-section diff against the original research: [`docs/design/harness-compatibility-research/opencode-followup-2026-08-16.md`](../../docs/design/harness-compatibility-research/opencode-followup-2026-08-16.md).

## Comments

- 2026-08-16: Spawned by Ticket 6's resolution, at the maintainer's direct request.
- 2026-08-16: Resolved. No-go confirmed; see Answer.

---
id: 83676ec0-81e3-4438-b21d-5693bfb21a52
createdAt: 2026-08-16T17:19:30.470Z
importance: 3
tags:
  - wayfinder
  - rc2
  - 2.2.0
taskId: null
kind: task
map: 5768f1c7-0f3c-46e3-90db-c11e4c5df748
status: resolved
---
# 9 — Implement the Past/Present/Future Ticket Storage Split

## Question

Execute the design [Ticket 3](8b77da80-6df1-4683-8ec0-8495e7a7605e) settled with the maintainer: split the single `tickets` category into three (`tickets-past`, `tickets-present`, `tickets-future`), migrate all existing data into them, update docs, and verify.

## Context

Ticket 3 resolved all design questions live with the maintainer via `/grilling`. This ticket is pure execution against that settled design — nothing left to decide, per the design decisions recorded on Ticket 3's own Answer. Read Ticket 3's full Answer before starting; it is the spec for this ticket.

Settled design (see Ticket 3 for full rationale):

1. **Category names & storage modes**: `tickets-present` (md, the map(s) actively being worked + their open children), `tickets-past` (vector-only, closed maps + every resolved ticket under them), `tickets-future` (vector-only, maps chartered/parked but "not yet sequenced").
2. **Archive trigger**: whole map, on close — not per-ticket on resolve.
3. **Promotion trigger**: manual only (maintainer explicitly sequences a map into present) — no map-level `blockedBy`/automation to build.
4. **Migration**: this ticket sorts all ~13 existing maps and their children into the three categories per rule 1, using each map's current state (closed → past; actively worked → present; "not yet sequenced" language in its own Notes, e.g. Map — Global Config & Memory Store → future).
5. **Tracker operations parity**: already confirmed identical across storage modes by code inspection (`findById` is store-wide id-agnostic; `--where`/`--refs-satisfy` operate on `memory.query()` + `fields`, same underlying SQLite index regardless of `md`/`vector` mode) — no code change needed here, just confirm post-migration with a real `--where`/`--refs-satisfy` frontier query against `tickets-present`.
6. **`blockedBy` scope**: same-category only, by convention (archiving is whole-map, so blockedBy stays within one map's category by construction) — `--refs-satisfy`'s existing single-`--category` requirement (`src/commands/memory.ts:56-61`) needs no change.
7. **Sequencing vs. Ticket 2's cleanup pass**: moot, Ticket 2 already resolved leave-as-is.

## Deliverables

- [x] `neuron.yaml`: declare `tickets-present` (storage: md), `tickets-past` (storage: vector), `tickets-future` (storage: vector), with the same declared fields (`status`, `blockedBy`, `map`, `kind`) as today's `tickets` category
- [x] Migrate all existing `tickets`-category entries into the three new categories per the maps' current state (closed maps + their resolved children → past; actively-sequenced maps + open children → present; "not yet sequenced" maps + children → future)
- [x] `docs/agents/issue-tracker.md` updated: category names, the "Frontier, scoped to one map" query (now scoped to `tickets-present`), "List every map" query, claim/resolve commands
- [x] `/wayfinder` skill (`.claude/skills/wayfinder/SKILL.md` or wherever it documents tracker-specific ops) cross-checked against the doc update above
- [x] Legacy `tickets` category confirmed empty/retired after migration (or explicitly deleted from `neuron.yaml` if the schema requires it)
- [x] Live verification: a real `--where "status=unclaimed" --where "map=<id>" --refs-satisfy "blockedBy:status=resolved"` frontier query against `tickets-present` returns the same results it would have against the old `tickets` category for at least one currently-open map
- [x] `npm test` and `tsc` clean

## Answer

**Built and migrated.** `neuron.yaml` now declares `tickets-present` (`storage: md`), `tickets-past` (`storage: vector`), `tickets-future` (`storage: vector`), all three sharing one `fields` block via a YAML anchor (`&ticketsFields`/`*ticketsFields`) so a change to the schema only has one place to land. The old `tickets:` block is gone entirely — no code changes were needed anywhere else, since per-category storage mode was already a live, generic mechanism (Ticket 3 verified this by inspection).

**Migration**: a one-off script (`NeuronMemory.open(process.cwd())`, matching the CLI's own bootstrap — not committed, deleted after running, mirroring Ticket 40's precedent) classified and moved all 259 live entries (14 maps + 245 children/orphans):

- Map classification: `status === 'resolved'` → past (the old force-set-closed marker on pre-ticket-45 maps); content matches `/not yet sequenced/i` → future; else → present. All 4 non-legacy maps (2.4.3, 2.4.2, MCP Server & Setup/Onboarding Skill Split, neuron.github.io Site) landed present; Map — Global Config & Memory Store (the one map carrying the literal "Not yet sequenced" phrase) landed future; the 9 legacy/closed maps (2.1.x Hardening, 2.2.0, 2.3.0, 2.4.0, and 5 unnamed pre-ticket-45 scratch maps) landed past.
- Child tickets inherited their parent map's tier, whole-map — an already-resolved ticket under a still-open map (e.g. 2.4.3's own Tickets 1/4/5/6/11) stayed in `tickets-present` alongside it, per the whole-map-on-close archive rule.
- 12 orphan tickets (no `map` field — pre-date the map-based structure entirely, e.g. "Audit the codebase for refactor opportunities") aren't covered by Ticket 3's design at all. Judgment call, not a decided rule: classified by their own `status` (11 unclaimed → present, 1 resolved → past), treating an orphan as a standalone always-open backlog item until it resolves — flagging this here since the maintainer may want a different rule.
- Final split: **58 present / 198 past / 3 future** — matched a hand-computed distribution exactly before the live run (dry-run gate via a `DRY_RUN=true` env check), and the store was backed up (`.neuron/tickets.md` copied aside) before mutating. Confirmed with the user (AskUserQuestion) before running against the live store, given the delete-then-upsert pattern is a real bulk mutation across the whole category. Ran clean: 259/259 moved, 0 remaining in `tickets`.
- **Real bug found while designing the migration, not from Ticket 3's own code-inspection claim**: `transactVector`'s upsert path only `UPDATE`s an existing id's row and never touches the `category` column — a same-id upsert into a new category would silently leave the row stranded under its old category. Ticket 3's "tracker operations parity" claim was about read-side filtering (`--where`/`--refs-satisfy`), which is unaffected; this is a write-side gap in the *move* primitive specifically, not a pre-existing bug in shipped behavior (no caller does a same-id cross-category upsert today). Worked around procedurally: delete from the old category first, then upsert into the new one, so the second write always hits the `INSERT` branch (which does set category correctly) rather than the `UPDATE` branch. Documented in the new "Archiving" section of `docs/agents/issue-tracker.md` as the pattern any future archive/promotion move must follow — not filed as its own bug ticket, since no shipped code path is exposed to it (`update`'s CLI surface requires `--category` to already match, so it can never trigger the `UPDATE`-into-wrong-category case).

**Docs**: `docs/agents/issue-tracker.md` rewritten — a new "The three categories" section explains the tiers and the id-is-the-real-cross-category-key point; every operation (fetch/publish/frontier/list-every-map/claim/resolve) updated to target `tickets-present` (new tickets always publish there; only present maps take children); added a new "Archiving (present → past) and promotion (future → present)" section documenting the delete-then-upsert pattern and the bug above, since neither operation existed before this ticket. `.claude/skills/wayfinder/SKILL.md` needed no change — it was already tracker-agnostic by design, deferring entirely to this doc's "Wayfinding operations" section.

**Verification**: `neuron memory list --category tickets-present --where "status=unclaimed" --where "map=<2.4.3's id>" --refs-satisfy "blockedBy:status=resolved"` returns exactly Tickets 10/12/13/14 (Ticket 9 itself correctly excluded, since it's `claimed`) — identical to what the same query against the old `tickets` category returned pre-migration. `neuron status --check` came back `compliant: true` (`undeclaredCategories: []`) after the run — this also caught a real drift: `CLAUDE.md`'s protocol-block header still named the old `learning, decisions, architecture, tickets, git-notes` category list, so it's now regenerated to name all three tiers. `npm test`: 777/777 across 65 files, no pollution of the real store from the run (`tickets-present.md` line count unchanged before/after). `tsc --noEmit`: clean. The now-empty `.neuron/tickets.md` stub was deleted rather than left as dead weight.

## Comments

- 2026-08-16: Spawned by Ticket 3's resolution — design settled via `/grilling`, execution handed to `/tdd` per this map's own precedent (Ticket 6's implementation plan handoff).
- 2026-08-16: Resolved. No new `src/` behavior was needed — per-category storage mode was already live — so this ended up being config + a one-off migration + docs, not a red/green `/tdd` cycle; handed off to `/tdd` at spawn time on the (reasonable, but ultimately unnecessary) assumption there'd be a code seam to test.

---
id: ae0e3d5d-8564-471e-a2ed-73e54480c7e0
createdAt: 2026-08-16T04:11:01.765Z
importance: 3
tags:
  - rc2
  - longmemeval
  - 2.2.0
taskId: null
kind: grilling
map: 5768f1c7-0f3c-46e3-90db-c11e4c5df748
status: resolved
---
# 6 — Design the Write-Side Compliance Trigger Mechanism

## Question

Ticket 5's hard-mode A/B reversed ticket 4's no-go: under realistic conditions (full CLAUDE.md content, a multi-step session with real competing work), `control` compliance collapsed to 20% while `nudge` and `explicit-instruction` both held 100% — an 80-point margin. Per ticket 1's own decision rule, this is a go. Design the real trigger mechanism: hand-wired dogfood-only `Stop` hook, or a full `LifecyclePoint` extension (the way ticket 06/07's read-side discovery hint and `hintFollowLog.ts` were built)?

## Context

- Ticket 5's own Recommendation (docs/design/write-compliance/nudge-ab-findings.md, Part 2) frames the two arms tested as two different real designs, not just two conditions: `nudge` (session-end reminder) is higher-fidelity to an actual `Stop` hook but costs an extra turn and inherited real friction from Map 2.4.2's write-time duplicate-detection gate (agents' own §1 + §2 entries reading as near-duplicates of each other, costing retries in ~30% of nudge sessions). `explicit-instruction` (system-prompt requirement) was cheaper and equally effective in this run but has no session-end `LifecyclePoint` analog today — it's a weaker test of what a real trigger needs to be, since it isn't tied to session end at all.
- This map's own Notes name `/tdd` as the fit "once that design is settled and implementation is graduated," mirroring how ticket 06/07 were built — same precedent this ticket should follow once the design question above is resolved.
- Should ship dogfood-only on this repo, or to every project `neuron init` touches? Flagged as fog on the map ("Should a write-compliance mechanism ship to every project...") — resolve here now that a mechanism is actually being designed, not still moot.
- The gate-friction finding (ticket 5) may itself deserve a design response (e.g. should §2's session-conclusion write skip the supersede-gate check when it's a deliberate companion entry to a just-written §1 fix?) — worth raising during this ticket's own grilling, not presupposed here.

## Deliverables

- [x] Trigger mechanism chosen (hand-wired Stop hook vs. LifecyclePoint extension) with rationale
- [x] Ship scope decided (dogfood-only vs. neuron init default)
- [x] Gate-friction finding addressed or explicitly deferred with rationale
- [x] Implementation plan handed to /tdd

## Answer

**Trigger mechanism: full `LifecyclePoint` extension** — a new `pre-stop` point, not a hand-wired dogfood-only `Stop` hook. Ticket 5 already proved the mechanism moves compliance from 20% to 100%; the reason Ticket 1 deferred real-hook engineering (unproven value) no longer applies, and `neuron init` has no precedent for a dogfood-only hook among the existing 4 points.

**Correction (2026-08-16, mid-`/tdd`):** this ticket's first resolution named the point `session-end` and mapped it to each harness's literal `SessionEnd`/`sessionEnd` event. Direct verification against each harness's current hook docs, done at implementation time rather than assumed, found that event is fire-and-forget on every harness — its output never reaches the model and can never force another turn, because the session has already terminated by the time it fires:

| Harness | `SessionEnd`-named event | Reaches the model / extends the session? |
|---|---|---|
| Claude Code | `SessionEnd` | No — "no more model turns" (official docs) |
| Copilot CLI | `sessionEnd` | No — `"Output processed: No"` (official docs) |
| Cursor | `sessionEnd` | No — "logged but not used, fire-and-forget" (official docs) |
| Codex CLI | `SessionEnd` | No — advisory/cleanup only; also the event closed `not_planned` in `openai/codex#20374` |

Wiring the nudge there, as first resolved, would have shipped a mechanism that compiles and installs but never actually nudges anyone — exactly the overstated-fidelity failure mode this project's own capability discipline exists to catch. Every harness does have a real, functional per-turn "agent about to stop" event that **can** force one more turn — the actual analog to what Ticket 5 measured (intercept the finish call, deliver a reminder, require a second one):

| Harness | Real event | Mechanism | Verified via |
|---|---|---|---|
| Claude Code | `Stop` | `hookSpecificOutput: {decision:"escalate", additionalContext:<text>}` | **empirically** — see below |
| Codex CLI | `Stop` | Blocks + `additionalContext` via `hookSpecificOutput` (docs also mention `decision:"block"`+`reason`) | official docs only |
| Copilot CLI | `agentStop` | `decision: "block"` + `reason` becomes the next prompt (no `additionalContext` field) | official docs only |
| Cursor | `stop` | `followup_message`, auto-submitted as the next user message | official docs only |

**Claude Code's exact field shape is empirically confirmed, not doc-sourced.** Three fetches of the same doc page returned three conflicting claims for which field carries visible text (`decision:"escalate"` alone; `+ reason`; `additionalContext` alone). Rather than guess, this session — itself a Claude Code session — built a throwaway probe project with a real `Stop` hook and ran an actual headless `claude -p` invocation against it. The transcript's `hook_success`/`hook_additional_context` attachments show definitively: `decision:"escalate"` forces the continuation, and **only `hookSpecificOutput.additionalContext`'s content reaches the model** — a parallel `reason` field was accepted (exit 0, no error) but never surfaced to the model in any form. `reason` is harmless to keep (visible in hook-execution logs, costs nothing) but `additionalContext` is the field doing the real work.

Codex/Copilot/Cursor remain doc-sourced only — no equivalent empirical check was run against them (no local install), so their adapter capability records carry an explicit "unverified against a real installation" caveat, matching the honesty `cursor.ts`'s existing capability record already models for its own unverified figures, rather than a false "confirmed" claim.

**Nudge behavior: blocks once per session**, mirroring Ticket 5's proven design exactly rather than a weaker, untested non-blocking variant. The first `pre-stop` firing in a session escalates/blocks and delivers the reminder; a per-session ledger entry (same shape as `pre-prompt`'s existing dedup ledger) marks it delivered, so every subsequent `pre-stop` in that session allows the stop through — one nudge per session, not a nag on every turn.

**Ship scope: general, via `neuron init`**, matching how `pre-prompt`/`context-reset`/`pre-command` already ship — not dogfood-only. All four harnesses get the real hook now that the corrected mapping is in place — **no explicit-instruction fallback is needed on any harness**, so that implementation-plan item is dropped entirely (Codex's fallback was only ever needed under the incorrect `SessionEnd`-based mapping).

**Gate-friction: fixed as part of this ticket's implementation plan, not deferred.** New `--companion-of <id>` flag on `neuron memory add`: when a §2 (session-conclusion) write names a just-written §1 entry as its companion, the near-dup/supersession gate (`NEAR_DUP_RERANK_BAR` in `findSupersessionCandidate`) skips the check against that specific id. Explicit opt-in only — no time-based/session-scoped magic — matching the existing `--supersedes`/`--not-a-reversal`/`--if-novel` shape; the flag's target id is validated to exist, same as `--supersedes`. Unaffected by the trigger-mechanism correction above.

**Out of scope, spun off:** OpenCode harness support. No adapter exists for it anywhere in this codebase today (`src/harnesses/` has only Claude Code, Codex, Cursor, Copilot; no entry in `src/config/harnesses.json`) — full new-harness work, unrelated to wiring a `pre-stop` point onto harnesses neuron already supports. Spawned as a standalone ticket (see Comments) rather than folded in here.

## Implementation plan (handed to `/tdd`, now built — see Comments)

1. `src/harnesses/types.ts`: add `pre-stop` to the `LifecyclePoint` union and `LIFECYCLE_POINTS`.
2. `src/harnesses/complianceNudge.ts` (new): pure function building the once-per-session reminder text, reusing `docs/design/write-compliance/nudge-ab-findings.md`'s proven `NUDGE_TEXT` wording (`benchmarks/write-compliance-ab/fixtures.mjs`) rather than inventing new copy.
3. `src/commands/hook.ts`: add `pre-stop` to `VALID_POINTS` and `HOOK_TIMEOUT_MS`; add a `runHook` branch that checks the session ledger, and on first firing per session escalates/blocks and emits the nudge, recording delivery in the ledger; every later firing in the same session is a no-op allow. A new `emitStop()` (distinct from the existing `emit()`, since pre-stop's semantics are force-continue, not just inject) writes the empirically-confirmed Claude Code shape (`decision:"escalate"` + `additionalContext`, `reason` included redundantly) and the doc-sourced Codex/Copilot/Cursor shapes per harness.
4. Per-adapter `capability()` records: `claudeCode.ts` (`Stop`, empirically confirmed), `codex.ts` (`Stop`, corrected from unsupported, doc-sourced only), `copilot.ts` (`agentStop`, doc-sourced only), `cursor.ts` (`stop`, doc-sourced only) all wire `pre-stop` → real support, `injects: true`, `fail-open`, with an explicit "unverified against a real installation" caveat on Codex/Copilot/Cursor.
5. `neuron init`: installs the `pre-stop` hook generally, same install/idempotency/uninstall discipline as the other 4 points — no dogfood-only branch, no fallback branch.
6. `src/commands/memory.ts` / `src/index.ts` (`findSupersessionCandidate`): add `--companion-of <id>` to `neuron memory add`, validated against an existing id, skips the near-dup/supersession gate check against that id only. Mutually exclusive with `--supersedes`/`--not-a-reversal` (same shape as `--if-novel`'s existing exclusivity).
7. Docs: split the growing `## 📖 Command reference` section out of `README.md` into a new `docs/commands.md`; README links to it instead of listing every flag inline. `docs/commands.md` documents the full gate-resolution flag family together (`--supersedes`, `--not-a-reversal`, `--if-novel`, new `--companion-of`) so an agent reads one place for "how do I resolve a write-time gate," plus the new `pre-stop` hook point.
8. README's harness support matrix: add a `pre-stop` row — ✅ on all four harnesses, with the Claude Code/Codex field-shape caveat linked rather than presented as flatly confirmed.
9. `npm test` and `tsc` clean.

## Comments

- 2026-08-16: Spawned by ticket 5's go verdict, per ticket 1's own routing for a go outcome.
- 2026-08-16: Claimed and resolved via live `/grilling` with the maintainer. Note for future sessions: an earlier, interrupted session had reached a *different* draft design for this same ticket (a generic declarative `neuron.yaml` injection layer, gate-friction deferred rather than fixed, Cursor assumed unsupported) and left a stray `decisions`-category entry plus a premature map bullet describing it — neither ticket 6 itself, nor a Ticket 7/8 it referenced, were ever actually created. Both the map bullet and the decisions entry have been corrected/superseded to match this session's actual resolution; see this map's own history if the discrepancy resurfaces elsewhere.
- 2026-08-16: OpenCode harness support spun off as its own ticket — see the map's Decisions-so-far for the link. Note for whoever picks it up: Map — neuron 2.2.0's own ticket 11 (2026-08-03) already ruled OpenCode out of scope once, specifically because it doesn't document failure/timeout/payload-limit/verification behavior anywhere reachable, which this project's capability model treats as disqualifying (publishing a capability record with no source is "the abstraction lying that ticket 11 exists to prevent"). Worth re-verifying whether that's still true before committing to full adapter support, not re-litigating blind.
- 2026-08-16: **Correction during `/tdd implement ticket 6`**, before any code was written. Verifying exact hook payload caps against real docs (routine step for this implementation) surfaced that the chosen trigger point, `session-end`, cannot reach the model on any of the four harnesses — see the Answer's Correction subsection above for the full finding. Re-grilled live with the maintainer on three points: renamed the point to `pre-stop` (mapped to each harness's real `Stop`/`agentStop`/`stop` event), kept the nudge blocking rather than softening it to non-blocking (mirrors Ticket 5's proven design), and dropped the Codex explicit-instruction fallback since Codex turns out to have real support once mapped to the right event. No code had been written under the old design — this correction landed before the first test, not as a follow-up fix.
- 2026-08-16: **Implementation plan built, all 9 steps.** Full red→green TDD: `src/harnesses/types.ts` (`pre-stop` added to `LifecyclePoint`/`LIFECYCLE_POINTS`), new `src/harnesses/complianceNudge.ts` + `complianceNudge.test.ts`, all four adapters (`claudeCode.ts`/`codex.ts`/`copilot.ts`/`cursor.ts`) wire `pre-stop` with matching test updates, new `hasPreStopNudgeFired`/`recordPreStopNudgeFired` in `ledger.ts` (session-scoped, deliberately not epoch-scoped — survives a `context-reset`), new `PRE_STOP_CHAR_BUDGET` in `payload.ts`, `src/commands/hook.ts` gets a new `emitStop()` (distinct from `emit()`) and a `pre-stop` `runHook` branch, `--companion-of` added across `utils.ts`/`memory.ts`/`neuronYaml.ts`'s `RESERVED_FLAG_NAMES`, `init.test.ts` updated for the fifth point. README gets a new "Write-side compliance gets a nudge" section; `docs/COMMANDS.md` gets a "Write-side compliance by harness" section, the `pre-stop` hook point, and the full gate-resolution flag family (`--supersedes`/`--not-a-reversal`/`--if-novel`/`--companion-of`) documented together for the first time — that table didn't fully exist before this ticket. Claude Code's exact `Stop` field shape (`decision:"escalate"` + `additionalContext`) was verified **empirically**, not just doc-sourced: a live headless-session probe was built and run from within this repo's own Claude Code session, mid-implementation, after three separate doc fetches of the same page gave three different answers. `npm test`: 792/792 across 71 files. `tsc --noEmit`: clean. `git status` checked after the full run — confirmed no `.neuron/*.md` pollution and reverted four `benchmarks/reports/*.json` files that only changed timestamps as a side effect of running the e2e suite.

---
id: e38c5a30-2ef0-4f15-81b1-cf160498188f
createdAt: 2026-08-16T03:53:53.768Z
importance: 3
tags:
  - longmemeval
  - benchmark
  - adr
taskId: null
kind: research
map: 5768f1c7-0f3c-46e3-90db-c11e4c5df748
status: resolved
---
# 5 — Harder Write-Compliance Follow-Up A/B (Ceiling-Effect Retest)

## Question

Ticket 4's A/B found a clean ceiling effect (100% compliance in all three arms) rather than a real no-signal result: control's task was maximally easy (the §1 protocol snippet as the only system-prompt content, one obvious bug, a 4-13 turn session). Design and run a harder version of the same A/B — full real CLAUDE.md content, a longer/noisier multi-step session with real competing work, more turns between the fix and session end — to see whether the no-go verdict survives a fairer test. Budget: $2 hard cap.

## Design (extends ticket 4's, not a fresh pass)

- Same three arms (control/nudge/explicit-instruction), same grading (grading.mjs, unchanged), same harness family (benchmarks/write-compliance-ab/), same model/session-loop machinery (session.mjs), reused not rebuilt.
- **What changes**: the system note is the full real CLAUDE.md Memory Store Protocol block (§1 Failure-Fix Recording + §2 Session Conclusion + Metadata flags), not just the §1 excerpt — so the failure-fix trigger now competes with real neighboring content, including a second, easily-confused instruction (§2) about writing memory at session end. Tasks become multi-step: a real early failure-fix moment, followed by genuine unrelated follow-on work (a new function to implement against an existing test, a lint-style check, a changelog line) that pushes session length and turn-distance from the fix up substantially before finish_task.

## Deliverables

- [x] Harder task(s) built (multi-step, full-CLAUDE.md system note) — `tasksHard.mjs`, `fixtures.mjs`'s hard-mode additions
- [x] Cost calibrated via a small live pilot before sizing the full run
- [x] A/B run within the $2 cap, real results captured ($1.5616, 30 sessions)
- [x] Verdict recorded: does ticket 4's no-go survive this harder test?
- [x] Findings appended to docs/design/write-compliance/nudge-ab-findings.md (Part 2) + raw results linked as assets

## Answer

**No — ticket 4's no-go does not survive a fairer test. This reverses to a clean go.**

`control` compliance collapsed from ticket 4's 100% to **20% (2/10)** once
the fix was one step of a real multi-step session with the full CLAUDE.md
protocol block (not just the §1 excerpt) competing for attention. `nudge`
and `explicit-instruction` both held **100% (10/10)** — an **80-point
margin** for both, task-solve rate 100% in every arm, balanced across both
tasks (1/5 each for control, not concentrated in one scenario). Cost
$1.5616 of the $2 cap; nothing skipped.

Per ticket 1's own decision rule ("go if nudge and/or explicit-instruction
show a clear compliance-rate margin over control"), this is as clean a go
as the rule can produce. **Recommendation: build the trigger mechanism.**
Spawned as [Ticket 6 — Design the Write-Side Compliance Trigger
Mechanism](ae0e3d5d-8564-471e-a2ed-73e54480c7e0), per ticket 1's own routing
for a go outcome.

**Unplanned finding, not part of the verdict but worth carrying forward:**
nearly every `nudge`/`explicit-instruction` session's `neuron memory add`
attempt tripped Map — neuron 2.4.2's own duplicate/supersede-detection gate
— the agent's own §1 `learning` entry reading as near-duplicate to its own
§2 `decisions`/`history` follow-up (cosine ≈0.77–0.96). Every session
recovered, but this cost real turns/tokens (3 of 10 `nudge` sessions ran
11-18 turns resolving it) — flagged for Ticket 6 to consider, not addressed
here.

Full setup, per-session breakdown, and the reasoning behind why this design
(not just a rerun) broke the ceiling effect:
[`docs/design/write-compliance/nudge-ab-findings.md`](../../docs/design/write-compliance/nudge-ab-findings.md),
Part 2.

## Process note

A path collision during this ticket's own calibration pilot (`--out=pilot`
reused across `run.mjs` and `run-hard.mjs`) overwrote and then deleted
ticket 4's original pilot smoke-test JSON. Fixed at the source: both
scripts now write under ticket-numbered subdirectories
(`results/4-write-compliance-nudge-ab/`, `results/5-harder-write-compliance-ab/`)
so this can't recur. No effect on either ticket's verdict — see ticket 4's
own Comments for the correction.

## Comments

- 2026-08-16: Graduated from the map's own fog item ("Whether to trust this no-go or design a harder follow-up A/B first"), at the maintainer's direct request.
- 2026-08-16: Resolved. Harness: `benchmarks/write-compliance-ab/run-hard.mjs`
  (+ `tasksHard.mjs`, `fixtures.mjs` hard-mode additions, `session.mjs`
  generalized for configurable turn/wall-clock caps — everything else
  reused from ticket 4 unchanged). Findings: Part 2 of
  `docs/design/write-compliance/nudge-ab-findings.md`. Raw results:
  `benchmarks/write-compliance-ab/results/5-harder-write-compliance-ab/full/results.json`.
  `npm test` (757 passed) and `tsc` clean.

---
id: 623be167-6f64-4616-8328-d42d29ac3952
createdAt: 2026-08-16T03:19:58.029Z
importance: 3
tags:
  - rc2
  - setup
  - adr
taskId: null
kind: research
map: 5768f1c7-0f3c-46e3-90db-c11e4c5df748
status: resolved
---
# 4 — Build & Run the Write-Side Compliance Nudge A/B

## Question

Build and run the A/B test designed in ticket "1 — Write-Side Compliance
Nudge & Instrumentation" (Map — neuron 2.4.3): does an active nudge
actually change whether an agent calls `neuron memory add` when the
CLAUDE.md protocol calls for it, versus today's passive-prose-only
behavior? Report a go/no-go on building a real trigger mechanism.

## Design (decided by ticket 1 — build to this spec, not a fresh design pass)

- **Three arms**: `control` (today's behavior — passive CLAUDE.md protocol
  text only) / `nudge` (a simulated session-end-style reminder injected
  into context, standing in for a real `Stop` hook that doesn't exist in
  `LifecyclePoint` yet — simulate it in the harness the same way
  `token-ab`'s `injection` arm simulates `session-start` payload
  rendering without a live hook) / `explicit-instruction` (system prompt
  states directly that `neuron memory add` must be called before
  finishing).
- **Scenario**: reuse existing SWE-bench task fixtures already wired in
  `benchmarks/token-ab/swebench-fixtures.mjs` — pick 1-2 that produce a
  clean failure-fix moment per CLAUDE.md §1.
- **Harness**: reuse `benchmarks/token-ab/session.mjs`'s manual tool-use
  loop (same pattern as `run-swebench-ab.mjs`), not a new agent-running
  mechanism.
- **Grading**: deterministic tool-call pattern match for a real `neuron
  memory add` invocation in the transcript — mirror `hintFollowLog.ts`'s
  `recordToolUse` approach (anchored at a real command position,
  quote-aware, not a bare substring test). No LLM judge.
- **Decision rule**: go (build the real trigger mechanism — routes to a
  new ticket deciding hand-wired dogfood-only `Stop` hook vs. full
  `LifecyclePoint` extension) if `nudge` and/or `explicit-instruction`
  show a clear compliance-rate margin over `control`; no-go if all three
  land close together. Exact numeric bar left to emerge from the data
  (same approach ticket 13 used for its joint-low bar), not fixed in
  advance.

## Not decided by ticket 1 — resolve here

- Exact nudge wording for the `nudge` and `explicit-instruction` arms.
- Sample size/repeats per arm and budget cap (mirror `token-ab`'s
  `--k`/`--cap` flags and existing run conventions).
- Where the harness script and findings doc land: convention from
  tickets 7/8/11/13 is `benchmarks/<name>-ab/` for the script and
  `docs/design/write-time-quality/` for the dated findings writeup —
  confirm this fits or pick a more apt location (this isn't an NLI/
  write-time-quality question in the same sense; may warrant its own
  `benchmarks/write-compliance-ab/` directory instead).

## Deliverables

- [x] Nudge/explicit-instruction wording finalized
- [x] Harness built (adapted from `session.mjs` — see Comments for why not a verbatim reuse)
- [x] A/B run — real results captured (24 live Sonnet 5 sessions, $0.9106 total)
- [x] Go/no-go verdict recorded per the decision rule
- [x] Findings doc + raw results linked as assets

## Answer

**No-go on building a dedicated trigger mechanism (`Stop` hook or
`LifecyclePoint` extension), on the strength of this evidence — with a real
caveat that keeps the underlying concern open.**

All three arms hit 100% compliance (24/24 sessions called a real `neuron
memory add`, verified against a live wrapped CLI, not simulated) and 100%
task-solve rate. Margin over control: nudge = 0pts, explicit-instruction =
0pts. Per the decision rule ("no-go if all three land close together"),
identical numbers across all three arms is the cleanest possible no-go —
there's no signal to build a mechanism against.

**But this is a ceiling effect, not proof the write-compliance gap this map
worries about doesn't exist.** control's task was maximally easy: the §1
protocol text was the *only* content in the system prompt, the fixture was
a single small file with one obvious bug, and sessions ran 4-13 turns. A
real session buries that same protocol text inside CLAUDE.md's full content
among many competing instructions, spans far more turns, and the
failure-fix moment can be many turns removed from wherever the model's
attention is by the time the session ends — none of which this harness
models. Read the result as "passive prose works when it's the only thing
being asked," not "passive prose works in general."

Two honest paths forward — this ticket does not choose between them, it's a
maintainer call:
1. Accept the no-go and close this thread; treat passive prose as
   sufficient until real dogfood evidence says otherwise.
2. Design a harder follow-up harness (longer/noisier session, full real
   CLAUDE.md content, competing instructions) before trusting a no-go —
   real new design work, not a rerun of this one.

Full findings, setup, and per-session data:
[`docs/design/write-compliance/nudge-ab-findings.md`](../../docs/design/write-compliance/nudge-ab-findings.md).

**Design decisions made here (not fixed by ticket 1):**
- Nudge text: a one-time simulated session-end reminder injected right
  after the *first* `finish_task` call, intercepting it so the agent gets
  one more turn before really ending — verified firing in all 8 nudge-arm
  sessions (`nudgeDelivered: true`).
- Explicit-instruction text: appended directly to the system prompt as an
  imperative ("you MUST call `neuron memory add`... This is not optional").
- Sample size: k=4 repeats x 2 tasks x 3 arms = 24 sessions, `--cap=3`
  (actual spend $0.91).
- Location: `benchmarks/write-compliance-ab/` for the harness (its own
  directory, not folded into `token-ab/`) and
  `docs/design/write-compliance/` for the findings doc (not
  `write-time-quality/` — this isn't an NLI/dedup question in that sense).

## Deviation from ticket 1's Design

Ticket 1 named `benchmarks/token-ab/swebench-fixtures.mjs`'s existing tasks
as the scenario source. Checked first: both live tasks there
(`matplotlib-24265`, `django-11019`) are diagnose-and-describe questions —
the agent investigates and writes prose to `ANSWER.md`, but no command ever
actually fails and gets fixed. CLAUDE.md §1's trigger condition ("a failing
command/build/test gets fixed") never fires on them, so reusing them
verbatim would have tested nothing. Running the real SWE-bench test suites
to get a genuine fail→pass loop was considered and rejected: none of those
instances' Python dependency sets are pinned anywhere in this harness, so a
live run would need a working, network-fetched environment per task — slow
and orthogonal to what this ticket measures. Built two small, self-contained,
dependency-free Node fixtures instead (`tasks.mjs`), each a genuine
fail→pass loop graded by a real exit code — same reuse-before-build spirit,
smaller grain.

## Comments

- 2026-08-15: Spawned by ticket 1's resolution.
- 2026-08-16: Resolved. Harness: `benchmarks/write-compliance-ab/`
  (`run.mjs`, `session.mjs`, `fixtures.mjs`, `tasks.mjs`, `grading.mjs`,
  `README.md`). Findings:
  `docs/design/write-compliance/nudge-ab-findings.md`. Raw results (the real
  24-session run, the evidentiary basis for the verdict above):
  `benchmarks/write-compliance-ab/results/4-write-compliance-nudge-ab/full/results.json`.
  `npm test` (757 passed) and `tsc` clean.
- 2026-08-16: **Correction.** The n=1 pilot smoke-test JSON this comment
  originally cited as "kept for provenance" no longer exists — ticket 5's
  own hard-mode calibration pilot wrote to the same unnamespaced
  `results/pilot/results.json` path and overwrote it, then a cleanup step
  deleted that directory. Fixed at the source: both `run.mjs` and
  `run-hard.mjs` now write under ticket-numbered subdirectories
  (`results/4-write-compliance-nudge-ab/`, `results/5-harder-write-compliance-ab/`)
  so this can't recur. No loss to the verdict itself — the pilot was a
  smoke test, not evidence; the full run's data (the actual basis for the
  Answer above) was untouched and is intact at the path named above. The
  pilot's own scorecard (for the record, not re-verifiable): 3 sessions
  (1 per arm), all 3 complied, $0.172 total.

---
id: 707532ee-3377-4822-9111-8f44cff06dde
createdAt: 2026-08-16T18:57:40.590Z
importance: 3
tags:
  - rc2
  - wayfinder
  - 2.2.0
taskId: null
kind: task
map: 94bf37ad-fb5d-4e2c-8865-3fe1782cefd4
status: resolved
---
# 48 — Implement Session-Conclusion Recording Redesign (History Pointer + --task-id on Decisions/Learning)

## Question

Build what Ticket 12 designed: stop CLAUDE.md's `## 2. Session Conclusion`
protocol and the `neuron-memory` skill's `## 4. End of Run` section (same
duplicating instructions in two places) from producing two full-narrative
entries — one in `history`, one in `decisions`/`learning` — for the same
session resolution.

## Deliverables

- [x] `decisions`/`learning` command examples in both CLAUDE.md and
  `neuron-memory` SKILL.md gain `--task-id <ticket-id>`, matching the
  `history` example (neither currently passes it — confirmed live: 133/133
  `learning` entries and 86/96 `decisions` entries in this repo's own store
  carry `taskId: null`, consistent with the documented command never
  including the flag, not with entries bypassing the CLI).
- [x] Both protocol docs' `history` step: when a `decisions`/`learning`
  entry is also being written this session for the same task, the
  `history` entry shrinks to a short pointer (one or two lines: what
  happened, plus the same `--task-id`) instead of restating the resolution.
  When no `decisions`/`learning` entry exists (pure execution, nothing
  decided), `history` keeps today's full-narrative shape — there is nothing
  else to point at.
- [x] Wayfinder's own resolution-recording step is untouched — already
  gist+link only (Decisions-so-far), not full restatement; confirmed during
  Ticket 12's grilling, not this ticket's concern.
- [x] No backfill: the ~219 existing null-`taskId` `decisions`/`learning`
  entries and their paired full-narrative `history` entries are left as-is,
  per Ticket 12's explicit maintainer call (write path going forward only —
  retroactive backfill is this map's own stated out-of-scope).
- [x] No new `neuron status --check` finding, no new field-schema tier —
  explored during Ticket 12's grilling and explicitly declined by the
  maintainer as unneeded scope.

## Context

Graduated from Ticket 12 — Redesign Session-Conclusion Recording to
Eliminate Cross-Category Duplication's design resolution, mirroring how
Ticket 2/3/4 each graduated their own implementation to a separate ticket
(5/6/9) rather than building in the grilling session itself.

Ticket 6 — Implement Near-Duplicate Suppression (Widen + Rerank Gate) is
blocked on this ticket landing, not merely on Ticket 12's design being
settled: Ticket 6's gate is only safe from the cross-category
false-positive shape (Ticket 7's A/B 4, 83 of 214 pairs) once new sessions
actually stop producing full-restatement pairs. Until these doc edits land,
every session run under the old protocol keeps adding more of exactly the
pairs Ticket 6's gate would misfire on.

## Answer

Edited both protocol docs exactly as Ticket 12 specified: CLAUDE.md's
`## 2. Session Conclusion` and the `neuron-memory` skill's `## 4. End of
Run` now branch on whether the session produced a `decisions`/`learning`
entry. When it did, that entry is written first (now with `--task-id
<ticket-id>`, matching `history`'s existing flag), and `history` shrinks to
a one-or-two-line pointer sharing the same `--task-id` — the link between
the two, not a separate id-to-id field. When nothing was decided (pure
execution), `history` keeps its full-narrative shape unchanged.

One layer deeper than the two docs Ticket 12 named: this repo's own
CLAUDE.md managed block (between the `<!-- neuron:protocol:start/end -->`
markers) is not hand-written — it's generated by `sessionEndStep()` in
`src/config/protocolBlock.ts`, which was still emitting the old duplicating
template. Hand-editing only the rendered CLAUDE.md would have left that
generator out of sync: a future `neuron init` re-run (this repo dogfoods
its own tool) would either silently fight the manual edit or, on an
`--overwrite` policy, revert it — and every other project `neuron init`
scaffolds would still get the old broken protocol. Updated
`sessionEndStep()` to emit the new branching text, then replaced CLAUDE.md's
managed block with the generator's literal output (verified byte-identical
via `generateProtocolBlock` run against this repo's live `neuron.yaml`)
rather than hand-transcribing a copy that could drift. That also picked up
a small, pre-existing, unrelated drift for free: the block's category list
was missing `git-notes` (added by Ticket 5, never synced into CLAUDE.md's
header) — the generator produces the correct list from the live config, so
regenerating fixed both issues in one pass. `neuron-memory` SKILL.md has no
equivalent generator (it's a plain hand-maintained skill file), so it was
edited directly.

`npm test` 746/746, `tsc` clean — `protocolBlock.test.ts` doesn't hardcode
the session-conclusion prose (it asserts headings/structure only), so no
test edits were needed alongside the generator change.

## Comments

- 2026-08-15: Created by Ticket 12's resolution.
- 2026-08-15: Resolved. See Answer.

---
id: e5aeaa6a-bc94-4b3e-b6a1-3086924b939e
createdAt: 2026-08-16T18:57:40.682Z
importance: 4
tags:
  - longmemeval
  - rc2
  - benchmark
taskId: null
kind: task
map: 94bf37ad-fb5d-4e2c-8865-3fe1782cefd4
status: resolved
---
# 13 — A/B Test Alternative NLI Models for Hard-Block Viability

## Question

Ticket 11 decided **test before deciding Ticket 9's posture**, rather than
defaulting to soft-flag: Ticket 8's A/B validation found
`cross-encoder/nli-MiniLM2-L6-H768` does not cleanly separate contradiction
from compatible-related pairs at any threshold (27% false-accept at bar
0.90, 40% false-silence at bar 0.98) — traced to a known SNLI/MultiNLI
annotation artifact ("hypothesis states a fact the premise doesn't
mention" gets labeled contradiction), not a capacity limit of this
specific model.

This ticket A/B tests a shortlist of alternative pretrained NLI
cross-encoders against the exact same three-way corpus and method Ticket 8
used (`benchmarks/nli-polarity-ab/corpus.ts` — 15 contradiction / 15
compatible-paraphrase / 15 compatible-related pairs; same bar-frontier
sweep reporting false-silence and false-accept-related jointly, same
P(contradiction)-and-margin scoring approach), to see whether a hard-block
posture can be justified after all — no new corpus, no new evaluation
method, only the model under test changes.

**Shortlist** (per Ticket 11's resolution): prioritize models trained
(also) on ANLI — Adversarial NLI, collected specifically to counter this
exact annotation artifact — over models trained only on SNLI/MultiNLI like
the current one. Include one larger SNLI/MultiNLI-only model as a control,
to confirm or refute the hypothesis that bigger-same-data reproduces the
bias rather than fixing it. Candidate research/selection (confirm hub
availability, license, and `@huggingface/transformers` loadability before
committing to the final list) is this ticket's own first step, not
pre-decided here.

**Success criterion**: a bar that gets both false-silence (missed real
contradictions) and false-accept (wrongly flagged compatible-related
pairs) low *simultaneously* — Ticket 7's bar-3 shape (0%/0% on both axes),
not merely "better than `nli-MiniLM2-L6-H768`" on one axis at the other's
expense.

**Branch on result** (Ticket 9 depends on this, not just informed by it):
- A candidate clears the joint-low bar → Ticket 9 builds **hard-block**
  using that model and its calibrated bar.
- No candidate does → Ticket 9 builds **soft-flag** instead (the accepted
  fallback per Ticket 11).

Findings should land as a dated markdown doc under
`docs/design/write-time-quality/`, same convention as Tickets 7 and 8.

## Answer

**No-go across every candidate tested.** Shortlisted three models per
Ticket 11's criteria — `anli-base` (`Xenova/DeBERTa-v3-base-mnli-fever-anli`,
MultiNLI+Fever-NLI+ANLI, ~184M, MIT), `anli-large`
(`Xenova/DeBERTa-v3-large-mnli-fever-anli-ling-wanli`, +LingNLI+WANLI,
~400M, MIT), and `control-large-snli-mnli` (`Xenova/nli-deberta-v3-large`,
SNLI+MultiNLI only, ~400M, Apache-2.0, the bigger-same-data control) — all
three ONNX-mirrored by the Xenova org for `@huggingface/transformers`
compatibility, hub availability/license/loadability confirmed before
committing, all three loaded and scored on the first attempt. One
necessary generalization over Ticket 8's script: `id2label` order is NOT
consistent across models (the two ANLI candidates use
`{0:entailment,1:neutral,2:contradiction}`, not Ticket 8's
`{0:contradiction,1:entailment,2:neutral}`) — resolved per-model from each
model's own config rather than assumed.

Every model, original included, cleanly separates contradiction from
compatible-**paraphrase** (0% false-accept at every bar, no exception). The
entire verdict turns on compatible-**related** (same topic, different,
non-conflicting fact) — none of the three candidates gets false-silence and
false-accept-related low simultaneously. Ranked by joint-worst
(false-silence/false-accept-related, lower better): original Ticket-8 model
(20% at bar 0.95) < `anli-large` (27% at bar 0.98) < `anli-base` (40% at
bar 0.99) < `control-large-snli-mnli` (60% at bar 0.99). **The small model
Ticket 8 already rejected is still the best of the four on this corpus** —
neither ANLI training nor scale recovered the joint-low bar Ticket 7 found
for the analogous relatedness gate.

Two secondary findings: (1) ANLI training helps only when combined with
other adversarial/diverse data (`anli-large`, trained on ANLI+LingNLI+WANLI
together, cut argmax-level false-accept-related from 12/15 to 8/15) — ANLI
alone at base scale (`anli-base`) produced no measurable improvement over
the original (12/15, unchanged). (2) Scale alone, holding training data
fixed at SNLI+MultiNLI, made things *worse*, not neutral —
`control-large-snli-mnli`'s median P(contradiction) on compatible-related
pairs (0.9976) is dramatically higher than the small original model's
equivalent (0.7892): more capacity sharpened the same annotation-artifact
bias rather than correcting it.

**Verdict, per Ticket 11's pre-agreed branch: no candidate clears the
joint-low bar → Ticket 9 builds soft-flag**, not hard-block. Not resolved
here: whether a non-DeBERTa-v3 family, a fine-tuned model, or a non-NLI
signal would do better — routed to the maintainer as an open question, not
another blind model swap.

Findings: `docs/design/write-time-quality/nli-alt-models-ab-findings.md`.
Raw scores: `benchmarks/nli-polarity-ab/raw-scores-{anli-base,anli-large,control-large-snli-mnli}.json`.
Script: `benchmarks/nli-polarity-ab/run-ab-alt-models.ts`.

## Comments

- 2026-08-15: Created by Ticket 11's resolution — re-blocks Ticket 9.
- 2026-08-15: Resolved. No-go on hard-block for all three candidates;
  Ticket 9 unblocked to build soft-flag.

---
id: c29a3c30-95ba-4f63-b74e-037f9d52dce6
createdAt: 2026-08-16T18:57:41.965Z
importance: 4
tags:
  - longmemeval
  - rc2
  - wayfinder
taskId: null
kind: grilling
map: 94bf37ad-fb5d-4e2c-8865-3fe1782cefd4
status: resolved
---
# 12 — Redesign Session-Conclusion Recording to Eliminate Cross-Category Duplication

## Question

Ticket 10's A/B 4 counterfactual (near-dup gate validation) found 83 of 214
real-store false-positive pairs are cross-category hits between
`decisions`/`learning` and `history` (plus `tickets`) — and confirmed
these are not detection errors: the reranker is right that the content
restates the same fact. This repo's own session-conclusion workflow
(CLAUDE.md's `## 2. Session Conclusion` protocol: "log a history entry,
plus any new learnings/decisions") *intentionally* records a single piece
of work twice — once as a `decisions`/`learning` entry, once as a
`history` log entry describing the same resolution.

Ticket 10 resolved by declining to teach the near-dup gate to tolerate this
pattern (a config-driven allowlist or taskId-based exemption were both
considered and rejected) — the maintainer's call was that the duplication
itself, not the gate's reaction to it, is the thing to fix. Recording a
ticket resolution should produce one entry, cross-referenced from wherever
else it needs to be findable, not two entries stating the same fact in two
categories.

This ticket designs that replacement. Open questions it needs to resolve:

- What does "one entry, cross-referenced" look like concretely? A single
  write with a category chosen by content type, plus a lightweight pointer
  (e.g. reusing `taskId`, or a new reference field) from the categories
  that would otherwise have duplicated it?
- Which existing protocols does this touch? At minimum CLAUDE.md's
  `## 2. Session Conclusion` block and the `neuron-memory` skill
  (`.claude/skills/neuron-memory/SKILL.md`) that codifies it. Possibly also
  the wayfinder skill's own resolution-recording step (resolution comment +
  close + Decisions-so-far pointer) if it has the same shape — check
  whether wayfinder already avoids this (it records the answer once, on the
  ticket itself, and only *points* to it from the map) before assuming it
  needs the same fix.
- Backward compatibility: does this apply only to new writes, or does it
  imply anything about the ~106 already-live `history`/`decisions`/
  `learning` pairs the A/B 4 counterfactual found? (Retroactive re-scoring
  of existing entries is this map's own stated out-of-scope — check whether
  that non-goal covers this too before proposing any backfill.)
- Once this lands, does it fully eliminate the need for any cross-category
  handling in the near-dup gate, or does a residual case remain (e.g. a
  genuine accidental duplicate landing in two categories despite the new
  single-write pattern)?

This ticket blocks Ticket 6 — Implement Near-Duplicate Suppression (Widen +
Rerank Gate), alongside Ticket 10's own deterministic-template-fingerprint
resolution, for the cross-category piece specifically.

Full findings behind the 83-pair figure:
`docs/design/write-time-quality/near-dup-detection-ab-findings.md` (§5).

## Answer

One entry, cross-referenced via the existing `taskId` field (no new field,
no new mechanism) — `decisions`/`learning` and `history` both set `--task-id
<ticket-id>` for the same session, and that shared value is the link, not a
direct id-to-id pointer.

**Concrete shape**: when a session produces a `decisions`/`learning` entry,
its `history` entry for the same session shrinks to a short pointer (what
happened, in a line or two, plus the same `--task-id`) instead of restating
the resolution. When a session has nothing to decide (pure execution against
a `task`-kind ticket, nothing new decided), `history` keeps today's
full-narrative shape — there's nothing else to point at. Mirrors the
index/detail split wayfinder's own map already uses (Decisions-so-far is a
gist + link, never a restatement) — same pattern, applied to CLAUDE.md's
protocol instead of invented fresh.

**Protocols touched**: CLAUDE.md's `## 2. Session Conclusion` and the
`neuron-memory` skill's `## 4. End of Run` (`.claude/skills/neuron-memory/SKILL.md`)
— confirmed both carry the same duplicating instructions independently, so
both need the same edit. Wayfinder's own resolution-recording (ticket
=full detail, map = gist + link) already avoids this pattern; confirmed by
reading the wayfinder skill directly, not assumed — no change needed there.

**Backward compatibility, maintainer call**: write path going forward only,
no backfill. Checked first whether the ~219 existing null-`taskId`
`decisions`/`learning` entries (86/96 `decisions`, 133/133 `learning`) were
evidence of writes bypassing the CLI — they are not: the split matches
CLAUDE.md's own documented command exactly (`history`'s example passes
`--task-id`, `decisions`/`learning`'s doesn't), so these went through the CLI
correctly per the old, incomplete protocol. Backfilling them would be a
retroactive migration pass, which collides with this map's own stated
out-of-scope (`Retroactive re-scoring of existing live entries`); raised
that tension directly rather than assuming either way, and the maintainer
chose to leave the ~219 as-is. A follow-on idea (a new `neuron status
--check` finding, either blanket-`taskId`-null or a new non-required
`recommended:` field-schema tier, to catch drift going forward) was explored
and explicitly declined as unneeded scope for this ticket.

**Residual near-dup-gate handling**: none needed. This is the source-side
fix Ticket 10 chose over gate-side special-casing (Ticket 10 already
rejected a config allowlist / taskId exemption inside the gate itself). Once
the new protocol is followed, a short `history` pointer and its paired full
`decisions`/`learning` entry are structurally dissimilar in length and
content, so they won't reproduce the near-duplicate shape Ticket 7's A/B 4
found (83 of 214 false-positive pairs) — but only for writes made under the
new protocol. The already-live 83 pairs are inert either way: Ticket 6's
gate only ever compares a *new* write against existing entries, never
existing entries against each other, so they were never actually at risk of
being re-flagged by the live gate (only by Ticket 7's own offline replay
script) — consistent with the no-backfill call above.

Implementation graduated to Ticket 48 — Implement Session-Conclusion
Recording Redesign (History Pointer + --task-id on Decisions/Learning),
matching the Ticket 2→5 / 3→6 / 4→9 precedent of not building in the
grilling session itself. Ticket 6 — Implement Near-Duplicate Suppression
now blocks on Ticket 48 specifically (added alongside Ticket 10 and this
ticket in its `blockedBy`), not just this design ticket, since Ticket 6's
gate is only safe from the cross-category false-positive shape once new
sessions actually stop producing full-restatement pairs — every session run
under the old protocol between now and Ticket 48 landing keeps adding more
of exactly the pairs Ticket 6 would misfire on.

## Comments

- 2026-08-15: Created by Ticket 10's resolution — the maintainer chose to
  fix the cross-category duplication at its source (the session-conclusion
  recording pattern) rather than have the near-dup gate special-case it.
  Blocks Ticket 6.
- 2026-08-15: Resolved via /grilling with the maintainer. Design: shared
  `taskId` links a short `history` pointer to its full `decisions`/`learning`
  entry; write path only, no backfill of the ~219 existing null-`taskId`
  entries; no new status-check finding (explored, declined). Implementation
  graduated to Ticket 48. Ticket 6's `blockedBy` updated to include it.

---
id: 8b77da80-6df1-4683-8ec0-8495e7a7605e
createdAt: 2026-08-16T18:57:42.421Z
importance: 4
tags:
  - rc2
  - wayfinder
  - 2.2.0
taskId: null
kind: grilling
map: 5768f1c7-0f3c-46e3-90db-c11e4c5df748
status: resolved
---
# 3 — Past/Present/Future Ticket Storage Split; Verify Architecture-Scan Upsert Behavior

## Question

Restructure how this repo's own issue tracker (ADR 0018, the single
`tickets` category) is stored: split it into three categories by temporal
status — **past** (archived: closed maps and resolved tickets, vector-only
storage), **present** (md storage, the map(s) actually being worked and
their open tickets), and **future** (vector-only storage, maps that have
been chartered/parked but aren't the current focus) — and confirm whether
`neuron scan` already updates an existing architecture card in place
rather than creating a new one on every run.

## Context

**The storage-mode mechanism this needs already exists.** `neuron.yaml`
already supports `categories.<name>.storage` overriding the global
`storage.mode`, and `vector`/`md` are already the two canonical modes
(`src/config/neuronYaml.ts`, precedence documented in
`src/config/scaffold.ts`). This ticket is about applying that existing
mechanism to a 3-way split of the current single `tickets` category, plus
the migration and archiving-trigger logic around it — not inventing
per-category storage mode itself.

**The architecture-scan half may already be solved.**
`src/scanner/ingest.ts`'s `blueprintCardId(category)` and
`moduleCardId(category, modulePath)` derive a *deterministic* id from a
sha256 hash of category (+ module path) — "same category in, same id
out" by design, specifically so re-running `neuron scan` upserts the same
row instead of duplicating it (stale module cards are even explicitly
deleted when a module disappears between scans). Confirm this in practice
(e.g. `neuron scan` run twice, diff `architecture` category row count and
ids) before treating this as new work — if it's already correct, this
half of the ticket is a verification note, not a build.

**Related but distinct from Ticket 2 — Memory Store Cleanup Pass (this
map)**: Ticket 2 is a one-time content-quality pass over the existing
store via `neuron status --health`/`--repair` (dedupe, prune, fix). This
ticket is a structural/schema change to how the tracker itself is stored
and organized going forward — complementary, not overlapping. Sequencing
between them (does the cleanup pass happen before or after the category
split?) is itself one of this ticket's open questions.

## Design questions to resolve before implementation

- **What does "current" mean in a repo that runs multiple wayfinder maps
  concurrently by design?** This repo's own tracker right now has several
  simultaneously-open maps (Map — neuron 2.4.2, Map — neuron 2.4.3, Map —
  Global Config & Memory Store, plus older maps like Map — 2.1.x
  Hardening that never formally closed). Is "present" (a) literally one
  map at a time, (b) every map not yet closed, regardless of how many, or
  (c) something else?
- **What triggers an archive move (present → past)?** Per-ticket, the
  moment it resolves? Or only the whole map, once every child ticket
  under it is closed?
- **What triggers a promotion (future → present)?** Manual (maintainer
  says "start this one now"), or automatic once its blocking conditions
  clear (if it has any)?
- **Migration of existing data.** Does this ticket also perform the
  one-time migration (sorting every existing map into past/present/future
  by the rule decided above), or does migration wait and only new
  maps/tickets use the new split going forward?
- **Does every tracker operation still work unchanged against vector-only
  storage?** In particular: `memory get <id>` direct fetch, and whether
  `--where`/`--refs-satisfy` filtering is available identically on
  `vector` mode or is md-only today.
- **Does `blockedBy` cross category boundaries?** A present-category
  ticket could plausibly reference a `blockedBy` id that now lives in
  `past` (an archived blocker).
- **Sequencing against Ticket 2's cleanup pass** (this map): decide
  whether the health/prune pass happens before this split or after.

## Deliverables

- [x] Design decisions above resolved with the maintainer
- [x] `neuron scan` upsert-in-place behavior confirmed (or, if actually
      broken, root-caused and fixed)
- [ ] `neuron.yaml` schema updated: `tickets` category split into three
      (naming per the decisions above), each with the correct
      `storage.mode` — handed to the spawned implementation ticket
- [ ] `docs/agents/issue-tracker.md` and the `/wayfinder` skill's own
      tracker-specific operations updated to match the new category
      names/behavior — handed to the spawned implementation ticket
- [ ] Migration path for existing tracker data decided and executed —
      handed to the spawned implementation ticket
- [ ] `npm test` and `tsc` clean — handed to the spawned implementation
      ticket

## Answer

**Architecture-scan upsert: verified clean, no bug.** Ran `neuron exec --
neuron scan` twice against this repo's live store: `architecture`
category held 19 rows (1 index + 18 module cards) before and after, `git
status --short .neuron/architecture.md` showed zero diff after the
second run. This matches an existing `learning` entry documenting the
deterministic-sha256-id upsert fix (`blueprintCardId`/`moduleCardId`,
`src/scanner/ingest.ts`) that already closed this exact class of bug.
Confirmed behavior, not new work.

**Design questions, resolved live with the maintainer:**

1. **"Present" scope**: `present` = every map actively being worked
   (sequenced), regardless of count, plus its open children. `future` =
   maps chartered/parked but explicitly "not yet sequenced" — this repo
   already uses that exact phrase for Map — Global Config & Memory Store,
   so no new vocabulary. `past` = closed maps + every resolved ticket
   under them.
2. **Archive trigger (present → past)**: **whole map, on close** — not
   per-ticket on resolve. A map's tickets move together once the map
   itself closes, so present stays a live working set for as long as the
   map is open, mirroring how a map's own body already only surfaces
   open children by query, not one at a time as they resolve.
3. **Promotion trigger (future → present)**: **manual only**. The
   maintainer explicitly sequences a map (no map-level `blockedBy`
   equivalent is being added — that's new schema work out of this
   ticket's scope).
4. **Migration of existing data**: **yes, this ticket's follow-up
   performs it** — all ~13 existing maps and their children get sorted
   into the three categories per rule (1) above, rather than leaving a
   permanent two-tier split between old and new data.
5. **Tracker operations on vector-mode storage**: **already identical,
   confirmed by code inspection, not a gap to fix.** `findById` (used by
   `memory get <id>`) takes no category param — id lookup is store-wide
   regardless of storage mode (`src/index.ts:919`). `filterList`'s
   `--where`/`--refs-satisfy` (`src/commands/memory.ts:48-82`) both
   operate on `memory.query()` results using each entry's `fields`, and
   every storage mode keeps the same underlying SQLite index (`src/
   index.ts:163-169` — `md-only`, which dropped the DB, was deleted by
   ticket 28). So `--where`/`--refs-satisfy` work identically on
   `tickets-past`/`tickets-future` (vector) as on `tickets-present` (md).
6. **`blockedBy` across category boundaries**: **same-category only, by
   convention** — no code change to `--refs-satisfy`. Since archiving is
   whole-map-at-once (decision 2), a ticket's `blockedBy` only ever names
   siblings under the same still-open map, which by construction stays
   in the same category. Cross-*map* sequencing (e.g. the MCP Server map
   blocking the Site map's Ticket 2) remains a Notes-prose convention, as
   it already is today, not a `blockedBy` field value. `--refs-satisfy`'s
   existing single-category requirement (`src/commands/memory.ts:56-61`)
   is therefore correct as-is and needs no loosening.
7. **Sequencing against Ticket 2's cleanup pass**: **moot** — Ticket 2
   already resolved (leave-as-is, no prune/repair action taken), so the
   split proceeds against the current store with nothing to sequence.

**Category names**: `tickets-past` / `tickets-present` / `tickets-future`
(prefixed, not bare `past`/`present`/`future`) — keeps them sorted
together in category listings and reads unambiguously as part of the
tickets domain. Storage modes as originally proposed and unchallenged:
`tickets-past` and `tickets-future` vector-only, `tickets-present` md.

**Implementation not built this session** — design-only ticket, matching
this map's own Ticket 6 precedent ("Implementation plan handed to /tdd,
not built this session"). Spawned as a follow-up task ticket; see the
map's Decisions-so-far for the link.

## Comments

- 2026-08-15: Requested directly by the maintainer, alongside four
  standalone codebase-hygiene tickets (benchmarks/ cleanup, stray test
  relocation, stray file cleanup, refactor-opportunity audit) created the
  same session but not attached to any map — see those tickets'
  own entries.
- 2026-08-16: Resolved via `/grilling`, one question at a time, per this
  map's own Notes. All seven design questions settled; architecture-scan
  half verified clean by direct inspection (no live bug). Implementation
  spawned as a follow-up ticket rather than built in this session.

---
id: 5a0b8be0-5f5b-4e2a-a177-c7a3ebe30ea4
createdAt: 2026-08-16T18:57:42.516Z
importance: 4
tags:
  - retrieval
  - longmemeval
  - benchmark
taskId: null
kind: grilling
map: 94bf37ad-fb5d-4e2c-8865-3fe1782cefd4
status: resolved
---
# 11 — Resolve Hard-Block Posture Given NLI False-Positive Rate on Compatible-Related Pairs, Before Building Ticket 9

## Question

Ticket 8's A/B validation found `cross-encoder/nli-MiniLM2-L6-H768` cleanly
separates contradiction from paraphrase, but does **not** cleanly separate
contradiction from compatible-related pairs (same topic, different,
non-conflicting fact) — the exact population Ticket 9's gate would run
against constantly, since it only ever scores candidates that already
cleared Ticket 3/6's relatedness pre-filter. At bar-free argmax alone the
model already calls 80% (12/15) of compatible-related pairs "contradiction"
as its top class. No threshold in the swept range gets both false-silence
(missed real contradictions) and false-accept (wrongly blocked
compatible-related writes) low at once: bar 0.90 still false-accepts 27% of
compatible-related pairs; tightening to bar 0.98 to suppress that pushes
false-silence to 40%.

This isn't a rare edge case a bigger corpus would need to surface — it's
visible directly in a 15-pair hard-negative set, and traces to a known
annotation-artifact bias in the SNLI/MultiNLI training distribution this
model was built on: hypotheses stating a fact the premise doesn't mention
get read as "contradiction" rather than "unrelated slot, no conflict."

A secondary finding: within the contradiction set itself, the model is
reliable on lexical/numeric value-swap contradictions (10/15 scored
P >= 0.94) but unreliable on contradictions requiring policy/cardinality
reasoning rather than a value swap (the two weakest cases, P = 0.19 and
0.52, are both this shape).

This ticket decides what to do about it before Ticket 9 builds a hard-block
gate against a signal that would misfire on 1-in-4-to-8 legitimate writes
in the plausible operating range. Candidate directions (not evaluated,
this ticket's job to weigh, not to build):

- Reopen Ticket 4's refuse-vs-flag choice specifically for this signal —
  soft-flag (surface the possible conflict, don't hard-block) instead of
  refuse, given the measured false-positive rate.
- Narrow the gate's scope to the contradiction subtype the model is
  actually reliable on (lexical/numeric value swaps) and decline to catch
  policy/cardinality contradictions at all, rather than trying to catch
  everything NLI training calls "contradiction."
- A different or fine-tuned polarity model — e.g. one trained or
  calibrated specifically to distinguish "different slot" from "same slot,
  different value," rather than general-purpose SNLI/MultiNLI contradiction.
- An additional filter ahead of the NLI call (analogous to what Ticket 10
  is weighing for the relatedness gate) that narrows candidates to
  same-slot pairs before polarity scoring runs at all.
- Something else entirely — may be `/domain-modeling` territory, the same
  "restates vs. disagrees" distinction the map's own Notes anticipated for
  Ticket 4.

Full findings, method, and every measured number:
`docs/design/write-time-quality/nli-polarity-detection-ab-findings.md`.

## Answer

Sequenced as **test before deciding Ticket 9's posture** — do not default
to soft-flag preemptively. A new ticket, Ticket 13 — A/B Test Alternative
NLI Models for Hard-Block Viability (ticket e5aeaa6a-bc94-4b3e-b6a1-3086924b939e),
graduates from this ticket to test a shortlist of alternative NLI models
against the same three-way corpus (contradiction / compatible-paraphrase /
compatible-related) and the same joint-bar method Ticket 7/8 already used.

Shortlist prioritizes models trained (also) on ANLI — Adversarial NLI,
collected specifically to counter the "hypothesis states a fact the
premise doesn't mention = contradiction" annotation artifact this ticket's
findings traced the failure to (e.g. `MoritzLaurer/DeBERTa-v3-base-mnli-fever-anli`-family
candidates) — over just a bigger model trained on the same SNLI/MultiNLI
data, which is expected to reproduce the same bias more confidently, not
fix it. One larger same-data model included as a control to confirm that
hypothesis.

**Branch on Ticket 13's result:**
- If some candidate model finds a bar with both low false-silence and low
  false-accept (a real joint-low point, Ticket 7's bar-3 shape — not just
  "better than `nli-MiniLM2-L6-H768`") — Ticket 9 builds **hard-block**
  using that model and bar.
- If no candidate does — Ticket 9 builds **soft-flag** instead (surface
  the possible conflict, don't refuse the write), as the accepted
  fallback. This is a narrow amendment to Ticket 4's refuse-vs-flag choice,
  scoped to this one signal — not a reopening of the map's broader
  conflict-detection design.

Ticket 9's `blockedBy` updated to point at Ticket 13 instead of this
ticket.

## Comments

- 2026-08-15: Created by Ticket 8's resolution — this map's own "plan,
  don't do" discipline means Ticket 8 measures and reports the problem, it
  doesn't unilaterally pick the mitigation. Blocks Ticket 9.
- 2026-08-15: Resolved via live `/grilling` session with the maintainer.
  Decided to test alternative NLI models before committing Ticket 9's
  posture, rather than default to soft-flag now — created Ticket 13 to
  A/B test primarily ANLI-trained candidates. Hard-block survives if a
  model clears a joint-low bar; otherwise falls back to soft-flag.
  Re-blocks Ticket 9.

---
id: d121513e-0942-461b-87d0-77830d44e71a
createdAt: 2026-08-16T18:57:42.615Z
importance: 3
tags:
  - retrieval
  - longmemeval
  - rc2
taskId: null
kind: grilling
map: 94bf37ad-fb5d-4e2c-8865-3fe1782cefd4
status: resolved
---
# 10 — Resolve Template/Structural False-Positive Risk Before Building Ticket 6

## Question

Ticket 7's real-store counterfactual (A/B 4) found that the widen/rerank/bar
gate Ticket 3 designed and Ticket 7 calibrated (N=10, bar=3) massively
over-triggers on this repo's own live content — 214 of the "new" pairs it
would catch beyond today's 0.97-cosine gate, and the large majority are not
genuine near-duplicates. Two content shapes drive this, neither modeled in
Ticket 7's synthetic corpus:

1. **Shared structural/narrative template, different facts.** This repo's
   `architecture` category is scanner-generated from a fixed template
   ("### 🧩 X (path) Primary X module containing core application
   capabilities..."); its `history` category is written through a fixed
   wayfinder-session template ("Wayfinder pickup on the neuron-X.Y.Z map:
   resolved ticket N..."). A cross-encoder reranker trained on natural
   relevance treats shared phrasing as a real similarity signal even when
   the underlying facts are unrelated.
2. **By-design cross-category restatement.** This repo's own workflow
   records the same piece of work twice on purpose — once as a
   `decisions`/`learning` entry, once as a `history` log entry. 83 of the
   214 new pairs were exactly this shape.

A genuine false positive was also found within a single category with no
template involved: two distinct `decisions` entries about the same
pruning-ceiling topic, stating different decisions, scored 4.72 (above
bar=3). So the problem isn't solely "exclude templated categories" — some
real same-category, same-topic, different-fact pairs need distinguishing
too.

This ticket decides how the gate tells "shares scaffolding/topic" apart
from "restates the same fact," before Ticket 6 builds against a bar that
would visibly misfire on this repo's own store on day one. Candidate
directions (not evaluated, this ticket's job to weigh, not to build):

- Exclude scanner-generated categories (`architecture`) from the gate
  entirely — cuts 17 of 214 pairs, leaves cross-category and history
  collisions untouched.
- Scope the gate to same-category comparisons only — cuts the 83
  cross-category pairs, leaves the ~106 same-category `history` template
  collisions and the genuine `decisions` false positive untouched.
- A template/boilerplate pre-filter ahead of reranking (e.g. structural
  fingerprint or a fixed-prefix check) that suppresses candidates sharing a
  known template regardless of reranker score.
- A separately-calibrated, much higher bar for boilerplate-heavy
  categories specifically, accepting a real-content-specific tradeoff
  rather than one bar for the whole store.
- Something else entirely — this is real /domain-modeling territory, the
  same kind of "restates vs. disagrees" distinction the map's own Notes
  already anticipated for Ticket 4.

Full findings, method, and every measured number:
`docs/design/write-time-quality/near-dup-detection-ab-findings.md`.

## Answer

Split resolution across the two false-positive shapes Ticket 7 found — they
turned out to need different fixes, not one mechanism:

**Template/structural collision (architecture's 17 + history's ~106
pairs): deterministic template fingerprint, no new model.** Both offending
templates are fixed strings this codebase itself generates (the
`neuron scan` architecture-card template, the wayfinder-session history
template) — not fuzzy natural language requiring a model's judgment to
separate "shares wording" from "shares meaning." A model-based
template/boilerplate detector was raised and explicitly rejected: it would
reopen this map's own "no new model or reranker" non-goal in a way Ticket
4/8's narrow NLI carve-out (justified specifically because polarity isn't
structurally approximable) doesn't cover — a known, fixed, deterministic
string doesn't need a model to recognize it. Direction: strip or fingerprint
the known template boilerplate from each candidate before it reaches the
reranker, so shared scaffolding stops contributing to the score at all,
regardless of bar. Ticket 6 owns the concrete mechanism (regex/fingerprint
against the known templates); new template shapes discovered later need a
code change to recognize, same tradeoff as any other closed enum.

**By-design cross-category restatement (83 pairs, decisions/learning ↔
history ↔ tickets): not a gate problem — deferred to a new ticket that
redesigns the recording pattern itself.** Cross-category comparison stays
in the gate (a genuine duplicate landing in two categories should still be
catchable) — the gate was *not* scoped to same-category-only. But the
83-pair source isn't a detection error: the reranker is correctly measuring
that these pairs restate the same fact, because this repo's own
session-conclusion workflow intentionally writes that fact twice. A
config-driven category-pair allowlist and a taskId-based exemption were
both considered and rejected in favor of fixing the duplication at its
source rather than teaching the gate to tolerate it. Graduated to
**Ticket 12 — Redesign Session-Conclusion Recording to Eliminate
Cross-Category Duplication**, which now blocks Ticket 6 for this piece
specifically (Ticket 6's `blockedBy` updated to list both this ticket and
Ticket 12).

**Residual genuine same-category false positive (the two independent
`decisions` entries on the pruning-ceiling topic, scored 4.72, no template
involved): accepted, no new mechanism.** This is exactly the shape the gate
is designed to surface — same topic, different fact, close enough to
warrant a second look. Resolved via the existing
`--supersedes`/`--not-a-reversal`/`--if-novel` override UX, same as any
other flagged pair; some real friction on genuine same-category near-dups
is the accepted cost, not a bug to engineer away here.

## Comments

- 2026-08-15: Created by Ticket 7's resolution — this map's own "plan,
  don't do" discipline means Ticket 7 measures and reports the problem, it
  doesn't unilaterally pick the mitigation. Blocks Ticket 6.
- 2026-08-15: Resolved via live `/domain-modeling` session with the
  maintainer. Split verdict: deterministic template fingerprint for the
  template-collision shape (Ticket 6 to implement); cross-category by-design
  restatement fixed at the recording-pattern source, not in the gate
  (graduated to Ticket 12, which now co-blocks Ticket 6 alongside this
  ticket); residual same-category false positive accepted, resolved via the
  existing override UX.

---
id: 78c7b32d-274a-4cac-bab6-55e83fa868b8
createdAt: 2026-08-16T18:57:43.535Z
importance: 3
tags:
  - longmemeval
  - rc2
  - benchmark
taskId: null
blockedBy: e5aeaa6a-bc94-4b3e-b6a1-3086924b939e,ab516584-1fc6-4522-a046-2da2397095ab
kind: task
map: 94bf37ad-fb5d-4e2c-8865-3fe1782cefd4
status: resolved
---
# 9 — Implement Conflict Detection at Write Time

## Question

Build the write-time conflict gate: `neuron memory add`/`transact` runs
an NLI polarity signal against candidates that already cleared Ticket 3/6's
relatedness pre-filter, and **soft-flags** (per Ticket 13's resolution —
see Context) when the calibrated confidence bar is crossed.

## Context

Graduated from Ticket 4's design resolution (ticket
bc1fad4b-9317-4c2f-8cff-1ba8329283e9). Gated on Ticket 8's validation — the
confidence bar this ticket gates on is Ticket 8's output, not a value to
invent here.

**Ticket 8 resolved (2026-08-15) with a split verdict, not a clean go.**
The model cleanly separates contradiction from paraphrase (any bar >= 0.7
works, 0% false-accept). But its own real-negative set — compatible-related
pairs, same topic, different, non-conflicting fact, exactly what this
gate's pre-filtered input looks like in practice — overlaps contradiction
severely: 80% false-accept at argmax alone, and no bar in the swept range
gets both false-silence and false-accept-related low simultaneously (bar
0.90 still false-accepts 27%; bar 0.98 gets that to 7% but false-silences
40% of real contradictions). Full detail:
`docs/design/write-time-quality/nli-polarity-detection-ab-findings.md`.

**Ticket 11 resolved (2026-08-15)**: test alternative NLI models before
committing this ticket's posture, rather than default to soft-flag
outright. Blocked on Ticket 13 — A/B Test Alternative NLI Models for
Hard-Block Viability (ticket e5aeaa6a-bc94-4b3e-b6a1-3086924b939e).

**Ticket 13 resolved (2026-08-15): no-go on hard-block for every candidate
tested.** Three alternative models (two ANLI-trained, one larger
SNLI/MultiNLI-only control) were A/B tested against the same corpus and
method as Ticket 8 — none cleared the joint-low false-silence/false-accept
bar. The original Ticket 8 model remains the best of the four tested. Per
Ticket 11's pre-agreed branch, this ticket now builds **soft-flag**, not
hard-block: on a crossed confidence bar, the write is flagged (not
refused) — exact UX (inline warning vs. a queryable pending-review state)
is this ticket's own design decision, not fixed by Ticket 13. Full detail:
`docs/design/write-time-quality/nli-alt-models-ab-findings.md`.

**Two open design points confirmed with the maintainer before building
(2026-08-15):** neither the surfacing mechanism nor the soft-flag bar was
actually fixed by any prior ticket — Ticket 8/13's bar sweep was calibrated
for a hard-block posture Ticket 13 then ruled out, and this ticket's own
deliverables explicitly named the surfacing mechanism as its own call. Both
confirmed directly rather than assumed (see Answer).

## Deliverables

- [x] NLI model wired into the write path, scoped to Ticket 3/6's pre-filter
  survivors only (no full-category scan)
- [x] **Soft-flag** behavior (updated 2026-08-15 per Ticket 13 — NOT the
  hard-block UX originally scoped): write succeeds, flagged with a pointer
  to the compatible-related-or-contradicting entry it may conflict with;
  exact surfacing mechanism (CLI warning output vs. a persisted flag state)
  is this ticket's own design decision
- [x] Pillar 14 extended to assert case 2 (and any new cases from Ticket 8)
  is now caught by the soft-flag path
- [x] `npm test` and `tsc --noEmit` clean

## Answer

Built exactly as scoped, all four deliverables done, `npm test` 757/757,
`tsc --noEmit` clean.

**Two open design points, confirmed with the maintainer before building
rather than assumed:**

1. **Surfacing mechanism: inline CLI warning only, not persisted state.**
   Matches the existing gate's UX (the `--if-novel` skip message shape) and
   avoids reopening the map's own "no PM-software creep... no workflow
   states beyond live/superseded" non-goal, which a new persisted flag
   field would have collided with.
2. **Soft-flag bar: `NLI_CONTRADICTION_BAR = 0.90`.** Ticket 8's own
   findings doc names this as the best joint operating point in its sweep
   (13% false-silence, 27% false-accept against compatible-related pairs) —
   adopted directly since it's already-measured, not invented; a stricter
   bar (0.98) was offered and declined as favoring quiet over useful. This
   is a fresh pick for a soft-flag (low-cost-false-accept) posture, not a
   value Ticket 8/13 themselves chose — those tickets calibrated for
   hard-block, which Ticket 13 ruled out entirely.

**Implementation.** New `TransformersNLIClassifier`
(`src/components/nliClassifier.ts`, `PolarityClassifier` interface) —
`cross-encoder/nli-MiniLM2-L6-H768`, same cache/load conventions as
`TransformersReranker`, softmax-normalized 3-way logits, `id2label`
asserted rather than assumed (Ticket 13 found label order varies by model —
a silently-wrong assumption would score the wrong class as "contradiction"
with no visible failure). Two deliberate departures from
`TransformersReranker`'s pattern, both load-bearing:
- **No `dtype: 'q8'`.** Ticket 8/13's A/B scripts loaded this model at full
  precision with no dtype override, and `NLI_CONTRADICTION_BAR` was
  calibrated against those runs — a quantized variant was never measured.
- **`env.allowRemoteModels` is always set explicitly, in both branches.**
  `@huggingface/transformers`'s `env` is a process-wide singleton shared
  with the reranker; the reranker's own conditional-only-false pattern
  left this classifier inheriting a stale `false` from an earlier reranker
  load in the same process, which blocked this model's first-ever download
  outright (`local_files_only` error, caught live during manual smoke
  testing before Pillar 14 ran). Fixed on this loader only — the reranker's
  own pattern is unaffected in production since its model is already
  cached.

`NeuronMemory.classifyPolarity(premise, hypothesis)` (`src/index.ts`) wraps
the classifier, returning the raw probability — the bar decision is the
caller's, not baked in, so a caller can inspect the raw score independent
of the bar. `NLI_CONTRADICTION_BAR = 0.90` exported alongside
`NEAR_DUP_RERANK_BAR`.

`src/commands/memory.ts`'s `add` handler: when `findSupersessionCandidate`
finds a candidate (Ticket 3/6's relatedness gate already cleared,
`--supersedes`/`--not-a-reversal` not given), `classifyPolarity` runs
before deciding hard-block vs. `--if-novel` skip vs. plain refusal. At or
above the bar: write proceeds, a `[neuron] possible conflict` warning
prints to stderr naming the candidate, and the returned JSON gains a
`possibleConflict` field (`candidateId`, `category`, `content`,
`contradictionProbability`) — nothing persisted, this is a one-call
response augmentation only. Below the bar: today's Ticket 6 hard-block
behavior (including `--if-novel`) is completely unchanged. `--supersedes`
and `--not-a-reversal` both still bypass the whole check, as before — NLI
is never called on either path.

**Live-measured (Pillar 14 / `test/e2e/antagonistic-write.test.ts`, real
embedder + reranker + NLI, dist rebuilt):** case 1 (near-dup paraphrase)
still hard-blocks — NLI correctly reads it as compatible-paraphrase, not
contradiction, so the soft-flag never fires. Case 2 (numeric contradiction)
now downgrades from Ticket 6's hard-block to a soft-flag — P(contradiction)
= 0.996, comfortably above 0.90 — write succeeds with the conflict pointer
instead of forcing a `--supersedes`/`--not-a-reversal` decision on two
independently-assessable facts. `runCli`'s test helper switched from
`execSync` to `spawnSync`: `execSync` only exposes stderr via the thrown
error's `.stderr` on a non-zero exit, which silently discarded the
soft-flag's real (exit-0) stderr warning — caught by the first attempt at
this assertion failing outright, not assumed.

**New unit coverage:** `src/commands/memory.conflict.test.ts` (5 tests) —
mock reranker (always clears `NEAR_DUP_RERANK_BAR`) + mock polarity
classifier, isolating the soft-flag decision itself: crosses the bar
(write succeeds, pointer surfaced, correct premise/hypothesis order
verified), does not cross the bar (Ticket 6 hard-block unchanged),
`--not-a-reversal` never calls NLI, a soft-flagged write proceeds even with
`--if-novel` set (conflict is a different outcome than "skip a
supersession candidate"), and `--if-novel` still skips normally when NLI
doesn't flag.

## Comments

- 2026-08-15: Created by Ticket 4 — Conflict Detection at Write Time's
  resolution, gated on Ticket 8's validation.
- 2026-08-15: Ticket 8 resolved. Re-blocked on Ticket 11 — its
  false-positive rate against compatible-related pairs does not survive
  contact with the hard-block posture as scoped (see Context above).
- 2026-08-15: Ticket 11 resolved. Re-blocked on Ticket 13 — model A/B
  testing runs before this ticket's hard-block-vs-soft-flag posture is
  decided, rather than defaulting to soft-flag now.
- 2026-08-15: Ticket 13 resolved, no-go on hard-block for all candidates
  tested. Unblocked — posture is soft-flag, deliverables updated above.
- 2026-08-15: Tracker hygiene — added Ticket 6 (ab516584-1fc6-4522-a046-2da2397095ab) to blockedBy. This ticket's own deliverables scope the NLI check to 'Ticket 3/6's pre-filter survivors' but Ticket 6 (the widen+rerank relatedness gate replacing findSupersessionCandidate) has not landed yet — the production code still only has the single-candidate 0.97-cosine supersession gate, which is the wrong relatedness bar for this purpose (case 2 in Ticket 1's findings shows a genuine contradiction pair sitting below 0.97 cosine, i.e. invisible to that gate). Building this ticket against the current gate would not exercise the pre-filter it's specified to depend on. Re-blocked pending Ticket 6.
- 2026-08-15: Ticket 6 resolved and unblocked this ticket. Picked up in the
  same session; surfacing mechanism and soft-flag bar confirmed with the
  maintainer before implementation (see Context and Answer above).

---
id: b8900ad0-0579-4263-98f5-6f8acee75025
createdAt: 2026-08-16T18:57:43.631Z
importance: 3
tags:
  - retrieval
  - longmemeval
  - benchmark
taskId: null
kind: task
map: 94bf37ad-fb5d-4e2c-8865-3fe1782cefd4
status: resolved
---
# 8 — Validate NLI Polarity Detection (A/B)

## Question

Does `cross-encoder/nli-MiniLM2-L6-H768` reliably distinguish "restates" from
"disagrees with" on real write-time pairs, and what confidence bar should
trigger Ticket 9's hard-block?

## Context

Graduated from Ticket 4's design resolution (ticket
bc1fad4b-9317-4c2f-8cff-1ba8329283e9): the NLI cross-encoder is the chosen
polarity signal, layered on Ticket 3/6's widen-then-rerank relatedness gate
as a pre-filter — the NLI model only ever scores candidates that already
cleared that bar, never a whole category. This ticket validates the premise
and calibrates the threshold before Ticket 9 spends engineering time
building against it, mirroring Ticket 7's role for Ticket 6.

Reuse Pillar 14 (`test/e2e/antagonistic-write.test.ts`)'s existing cases as
a starting corpus — case 2 (direct numeric contradiction) is the known
must-catch case. Also construct compatible-but-related pairs (same topic,
non-conflicting detail) to measure the false-positive rate a hard-block
posture can't tolerate being high.

## Deliverables

- [ ] Confidence bar (or score range) that separates contradiction from
  neutral/entailment on real pairs, not just SNLI/MultiNLI's original
  benchmark distribution
- [ ] False-positive rate measured against compatible-but-related pairs
- [ ] Verdict: does this justify Ticket 9's hard-block posture as scoped, or
  does Ticket 4's refuse-vs-flag decision need revisiting first

## Answer

Split verdict, same shape as Ticket 7's. On a 45-pair corpus (15 fresh
contradiction pairs generalizing Pillar 14 case 2's shape, plus Ticket 7's
own `near-dup`/`related-distinct` corpora reused verbatim as the
compatible classes): the model cleanly separates contradiction from
**paraphrase** (any bar >= 0.7 gives 0% false-accept), but does **not**
separate contradiction from **compatible-related** (same topic, different,
non-conflicting fact) at any bar — 80% false-accept at argmax alone, still
27% at bar 0.90, only reaching single digits past bar 0.98 at the cost of
40%+ false-silence on real contradictions. This is the exact population
Ticket 9's gate sees in practice (everything that already cleared Ticket
3/6's relatedness pre-filter), so it's not a corner case.

Root cause, not just the number: `cross-encoder/nli-MiniLM2-L6-H768` is
trained on SNLI/MultiNLI's "contradiction" label, which crowdworkers wrote
by introducing any specific fact absent from the premise — a known
annotation-artifact bias. `compatible-related` pairs are structurally
exactly that shape, so the model reads them as contradiction by design of
its training target, not by threshold miscalibration.

Secondary finding: within the contradiction set itself, the model is
reliable on lexical/numeric value-swap contradictions (10/15 scored
P >= 0.94) but unreliable on ones requiring policy/cardinality reasoning
(the two weakest cases, P = 0.19 and 0.52, are both this shape).

**Verdict: no-go on Ticket 9's hard-block posture as scoped.** Does not
justify hard-blocking on this model's raw output at any threshold — Ticket
4's refuse-vs-flag decision needs revisiting. Graduated to Ticket 11 —
Resolve Hard-Block Posture Given NLI False-Positive Rate on
Compatible-Related Pairs, Before Building Ticket 9 (ticket
5a0b8be0-5f5b-4e2a-a177-c7a3ebe30ea4) rather than picked unilaterally here,
mirroring Ticket 7 -> Ticket 10's precedent — a validation ticket measures
and reports, it doesn't choose the mitigation.

Scripts: `benchmarks/nli-polarity-ab/run-ab.ts`, corpus:
`benchmarks/nli-polarity-ab/corpus.ts`. Full findings:
`docs/design/write-time-quality/nli-polarity-detection-ab-findings.md`.

## Comments

---
id: 4615099c-aebf-4088-ac18-52b55677e61a
createdAt: 2026-08-16T18:57:43.727Z
importance: 3
tags:
  - retrieval
  - longmemeval
  - benchmark
taskId: null
kind: task
map: 94bf37ad-fb5d-4e2c-8865-3fe1782cefd4
status: resolved
---
# 7 — Validate Near-Duplicate Detection Approach (A/B Tests)

## Question

Before Ticket 6 builds the widen-then-rerank near-dup gate, does the
approach Ticket 3 designed actually work better than the alternatives it
was chosen over? Run the measurements that test the assumption, not just
the calibration Ticket 6 already plans to do.

## Context

Ticket 3 (Near-Duplicate Suppression) decided the *shape* of the fix
(widen candidates by cosine, rerank, gate on a freshly-calibrated
reranker-score bar) largely on structural grounds — prior calibration
failures elsewhere in this codebase (ADR 0015, ticket 39) ruled out a new
raw-cosine threshold, and reranking was the fallback with existing infra
behind it. That's a sound reason to *try* reranking; it isn't yet evidence
that reranking actually separates near-duplicates better than cosine does
on *this* task — the reranker's only proven track record is the
asymmetric query-vs-passage relevance task (ticket 29/ADR 0012), not
entry-vs-entry equivalence. This ticket runs that check, plus three more,
before Ticket 6 commits engineering time to the approach.

Blocks Ticket 6 — its calibration deliverable ("seed pairs, measure
distribution, pick a bar") is a subset of this ticket's A/B 1 and A/B 3;
running them here first means Ticket 6 starts from a validated approach
and a real dataset instead of re-deriving both mid-implementation.

## Design questions to resolve

Five measurements, not one — mirroring the same measure-don't-assume
discipline this codebase already used for `RERANKER_ACCEPT_THRESHOLD=-8`
(ticket 29) and the cosine-floor sweep (ticket 39):

- **A/B 1 — Reranking vs. raw cosine, on this task.** Build a labeled
  corpus (near-dup pairs, related-but-distinct pairs, unrelated pairs),
  extending ticket 1's Pillar 14 case-1 fixture (the real paraphrase pair
  that slipped through 0.97 uncaught). Score every pair two ways: raw
  cosine, and top-N-by-cosine → reranker score. Compare separation between
  near-dup and related-but-distinct for each. If reranking doesn't clearly
  beat cosine here, Ticket 3's approach itself needs to go back to the
  maintainer, not just the bar.
- **A/B 2 — Widen count (N) sensitivity.** Sweep N ∈ {5, 10, 20, 50}:
  does near-dup recall keep improving past some N, or flatten? Each extra
  candidate is a real reranker inference call, so this is a real
  cost/recall tradeoff, not a free knob.
- **A/B 3 — Reranker bar: false-accept vs. false-silence frontier.** Same
  method as ticket 29/39: sweep the reranker-score bar across the A/B 1
  corpus, report the frontier, pick a bar with a stated rationale rather
  than a single guessed number.
- **A/B 4 — Counterfactual: gate on vs. gate off, real store growth.**
  Same shape as ticket 10's counterfactual A/B. Replay a session (or this
  repo's own write history) through `memory add` twice — gate active,
  gate inactive — and diff `getStoreHealth()`'s `duplicateGroups` output.
  This is the only measurement that tests the thing the map's Destination
  actually cares about (store quality), not just gate mechanics.
- **A/B 5 — False-positive friction on legitimate iterative writes.** Run
  the calibrated gate against a sample of this repo's own genuinely-similar
  but non-duplicate entries (amended ADRs, sequential ticket resolutions
  that restate prior context by design). If it over-blocks these, the bar
  from A/B 3 is too aggressive regardless of what the frontier said.

## Deliverables

- [x] Labeled near-dup / related-but-distinct / unrelated corpus built
      (feeds A/B 1, 3, and Ticket 6's own calibration deliverable) —
      `benchmarks/near-dup-ab/corpus.ts`, 40 pairs across 15 topic groups
      plus 41 distractor seeds
- [x] A/B 1 run: reranking vs. raw cosine separation compared; go/no-go
      on the reranking approach itself — **go**, reranker reaches a clean
      0%/0% false-silence/false-accept point (bar 3-4) that no raw-cosine
      floor reaches on this corpus (best cosine floor still leaves 13%
      cross-pool false-accept)
- [x] A/B 2 run: widen count (N) chosen from the sweep, documented
      rationale — **N=10**; N=5 already saturates recall on this corpus,
      N=10 kept as a real-store margin, not because a larger N measurably
      helped
- [x] A/B 3 run: reranker bar chosen from the frontier, documented
      rationale — **bar=3** (own reranker-score scale); tightest point
      where false-silence and cross-pool false-accept both hit 0%,
      confirmed the existing `RERANKER_ACCEPT_THRESHOLD=-8` does not
      transfer (93% false-accept at that threshold on this task)
- [x] A/B 4 run: counterfactual store-growth impact measured and
      reported — **the decisive result**: replayed against all 683 live
      entries in this repo's own store, the bar=3/N=10 gate flags 214 new
      pairs beyond today's 0.97-cosine gate, and the large majority are
      false positives driven by shared structural templates
      (`architecture`'s scanner-generated cards, `history`'s
      wayfinder-session template) and by-design cross-category
      restatement, not modeled in the A/B 1-3 corpus
- [x] A/B 5 run: false-positive friction on real iterative writes
      checked — answered directly by A/B 4 (a real-write-history replay);
      friction is severe — concrete example: two distinct `decisions`
      entries about the same pruning-ceiling topic scored 4.72, above
      bar=3
- [x] Findings doc (mirroring `docs/design/write-time-quality/
      antagonistic-write-findings.md`'s shape) with all five results and
      a clear go/no-go recommendation for Ticket 6 —
      `docs/design/write-time-quality/near-dup-detection-ab-findings.md`
- [x] Ticket 6 updated — not with a clean "apply this ticket's findings"
      as originally envisioned, since A/B 4 found the findings alone
      aren't sufficient. Ticket 6 re-blocked on a new Ticket 10 — Resolve
      Template/Structural False-Positive Risk Before Building Ticket 6.

## Answer

Split verdict, not a clean go. **A/B 1's core premise holds**: reranking
does separate near-dup restatements from same-topic-different-fact hard
negatives better than raw cosine on isolated prose pairs (N=10, bar=3
reaches 0%/0% false-silence/false-accept; no cosine floor does). **But the
calibration doesn't transfer to this repo's own real content** — A/B 4's
counterfactual replay against all 683 live entries found the same bar/N
produces 214 mostly-false-positive "duplicate" flags, dominated by two
content shapes the synthetic corpus never modeled: entries sharing a
structural/narrative template (scanner-generated `architecture` cards,
templated `history` session logs) with unrelated facts, and by-design
cross-category restatement (this repo's own workflow records the same
ticket's resolution once as a `decisions`/`learning` entry and again as a
`history` log entry, on purpose). A genuine same-category false positive
was also found with no template involved (two independent `decisions`
entries about the same pruning-ceiling topic, scored 4.72).

Ticket 6 cannot proceed against this ticket's bar/N alone — see
**Ticket 10 — Resolve Template/Structural False-Positive Risk Before
Building Ticket 6**, created by this resolution and now blocking Ticket 6,
for the open design question this surfaced (deliberately not decided
here — a validation ticket measures, it doesn't design the mitigation).

Full method, every measured number, and the counterfactual's category
breakdown: `docs/design/write-time-quality/near-dup-detection-ab-findings.md`.
Raw data: `benchmarks/near-dup-ab/raw-scores.json`,
`benchmarks/reports/near-dup-ab4-counterfactual.json`.

## Comments

- 2026-08-15: Created at the maintainer's request, to run before Ticket 6
  rather than fold calibration into that ticket's own implementation pass.
- 2026-08-15: Resolved. Ticket 6 updated and re-blocked on new Ticket 10.

---
id: 7fed4f53-3251-4b7a-94a0-3d344fb9a59a
createdAt: 2026-08-16T18:57:43.823Z
importance: 3
tags:
  - rc2
  - wayfinder
  - 2.2.0
taskId: null
kind: task
map: 5768f1c7-0f3c-46e3-90db-c11e4c5df748
status: resolved
---
# 1 — Remove the `history` Category (Superseded)

## Question

Retire the `history` category: it's superseded by what the `tickets`
category (ADR 0018) now captures on every wayfinder ticket's own
`Answer`/`Comments` sections. What does removal actually require, and what
happens to the 20 entries already in it?

## Context

`history` is still live infrastructure, not dead weight to just delete:

- Declared in `neuron.yaml` (`categories.history`) and referenced in
  `pullRules.onExec`'s `npm test`/`git commit` rule (alongside `learning`
  and `decisions`).
- CLAUDE.md's protocol block explicitly instructs every session to log one
  at conclusion: `neuron memory add --category history "<summary>"
  --task-id <ticket-id>`.
- 20 entries currently live in the category (`neuron memory list
  --category history`).

Wayfinder-driven sessions (this repo's actual majority of work, per its own
git log) already record an equivalent-or-richer summary on the ticket
itself — Question/Context/Deliverables/Answer/Comments, plus the map's own
Decisions-so-far gist-and-link. A `history` entry for a wayfinder session
is close to a duplicate of what the ticket it references already holds,
just in a separate, less-structured category with no link back to the
ticket beyond an optional `--task-id`.

## Design questions to resolve before implementation

- Do the 20 existing entries get migrated (into `decisions`? left
  as-is and just excluded from future writes?), or deleted outright? This
  map's own non-goals rule out autonomous/unattended deletion — any
  removal needs review, not an automatic pass.
- Does `history` fully disappear, or does non-wayfinder work (a session
  with no ticket to record against) still need somewhere to log a
  completed-task summary? If so, what replaces it?
- `CLAUDE.md`'s protocol block, `AGENTS.md`, and `pullRules.onExec` all
  reference `history` by name and need to change in lockstep with
  `neuron.yaml` — per the standing failure-fix precedent, a partial update
  (config changes, docs don't) silently drifts.
- Does this need a migration/deprecation path (matching how `minScore` was
  deprecated with a warning rather than hard-removed), or is a clean
  removal appropriate since this is this project's own store, not a
  published feature other projects depend on?

## Deliverables

- [x] Fate of the 20 existing `history` entries decided
- [x] Fate of non-wayfinder session summaries decided (if `history` had
      a use beyond wayfinder work)
- [x] `neuron.yaml`, `CLAUDE.md`, `AGENTS.md`, and `pullRules.onExec`
      updated in lockstep
- [x] Implementation

## Answer

**Scale correction found mid-session**: the "20 entries" this ticket's own
Context named was wrong — `neuron memory list --category history` silently
caps at a default limit. The real count was 238, dating back to
2026-07-11 (this repo's first commit). Flagged to the maintainer directly
since reviewing 238 individually collides with this map's own "no
retroactive migration pass" non-goal and Ticket 12's own precedent
(declined an equivalent backfill for the same reason) — maintainer chose to
run the same triage method at the corrected scale rather than downgrade
to a frozen-archive treatment.

**Disposition of the 238 entries**: reviewed via two passes — (1) a
structural argument that every "resolved wayfinder ticket" narrative
already has its full detail preserved on that ticket's own `Answer` in the
`tickets` category (verified spot-checks against tickets 3, 4, 5, 7, 13,
14, 18, 22, 30, 31, 34, 36, 39, 40, 42, 43, 44, 45), so those are safe to
drop with nothing lost; (2) a signal-phrase sweep for incidental/standalone
findings not tied to a ticket's main scope ("found and fixed", "separately
found", "not chartered", etc.) across all 234 non-pointer entries, manually
reviewed. Two genuine orphans surfaced and were migrated forward as new
`learning` entries before deletion: the `npm run build` not chmod +x'ing
`dist/cli.js` trap (still real, unfixed), and the pre-command hook's
missing dedup ledger / `RECALL_PROVENANCE_PREFIX` fix (neuron-2.4.1 ticket
1). A third orphan — the `publish.yml`/branch-ruleset release-automation
finding — was only preserved in the operator's own private cross-session
memory, not this project's store; migrated forward as a `decisions` entry.
Everything else (pure git-log-equivalent release/commit narration, an
abandoned early PersonaMem/Gemini benchmark line superseded by the current
LongMemEval harness, ~17 near-identical duplicate entries from a stuck
benchmark loop, Q&A-style session logs) was confirmed redundant or
ephemeral and dropped. All 238 entries (plus one `supersededBy`-marked row
invisible to `list`'s default exclusion) were deleted via `neuron memory
delete`; `.neuron/history.md` removed.

**Non-wayfinder fallback**: none. Maintainer's call — wayfinder is the only
path for a completed-work summary now; a session with nothing decided has
nothing else to log.

**Removal style**: clean cut, no deprecation warning — this project's own
dogfood config, not a published feature other projects depend on.

**Scope grew twice, both confirmed with the maintainer before proceeding**:

1. `history` turned out to be more than a config entry — it was baked into
   the type system (`MemoryKind`, deprecated `kind` field on
   `Memory`/`MemoryQuery`/`MemoryMutation`), the CLI (`neuron history`
   deprecated alias), the UI (`/api/history` route), and hardcoded default
   category arrays across `src/storage/*.ts`/`src/config/*.ts`. Maintainer
   chose full removal of this generic backward-compat surface, not just
   this repo's own config.
2. `neuron memory prune`/`consolidate` were discovered to be hardcoded to
   `category = 'history'` in raw SQL (`src/index.ts`'s `maintain()`) — not
   a generic per-category tool despite the CLI surface implying one. This
   predates ADR 0013's user-declared categories and would have made both
   commands permanently inert for this repo once `history` was gone (and
   were already inert for any project that never had a `history`
   category). Maintainer chose to generalize now rather than defer: added
   a required `--category` flag to both, threaded through
   `MaintenancePolicy`/`maintain()`'s SQL.

**Implementation** (commit-sized summary; see the diff for detail):
- `neuron.yaml`: dropped `categories.history` and its `pullRules.onExec`
  reference.
- `src/config/protocolBlock.ts`: `sessionEndStep()` was hardcoding
  `history`-pointer instructions into every generated `CLAUDE.md`
  regardless of whether a project declares the category — the real bug
  this ticket's Deliverables undersold. Made it config-driven
  (`'history' in config.categories`), with a generic decisions/learning-only
  fallback when absent. `CLAUDE.md` regenerated via the real generator
  (`neuron init --overwrite-hooks`), not hand-edited, matching this repo's
  own standing precedent against hand-drifted protocol blocks.
- `src/index.ts`/`src/models/`: `maintain()`'s consolidate/prune SQL
  parameterized on `policy.category` (required, hard-errors if unset);
  removed `MemoryKind`, the deprecated `kind` field from
  `Memory`/`MemoryQuery`/`MemoryMutation`, the `kind`→`category`
  backward-compat branches, and the whole "DEPRECATED METHODS...TO KEEP
  TESTS HAPPY TEMPORARILY" `history`-specific wrapper block
  (`addHistory`/`queryHistory`/`listHistory`/`deleteHistory`/
  `consolidateHistory`/`pruneHistory` — all dead code, never called outside
  their own tests; the `learning`-specific siblings are untouched, out of
  this ticket's scope). `getStatus()`'s hardcoded `learnCount`/
  `historyCount` fields replaced with a generic `categoryCounts: Record<string, number>`
  (same bug class, same fix shape).
- `src/cli.ts`/`src/commands/`: removed `neuron history` (the file, its
  CLI wiring, its help text); `neuron learn` is untouched (learning isn't
  retired). `src/commands/memory.ts`: `--category` now required for
  `consolidate`/`prune` too.
- `src/storage/*.ts`, `src/config/{neuronYaml,scaffold}.ts`,
  `src/commands/sync.ts`, `src/ui/server.ts`: dropped `history` from every
  hardcoded default/fallback category array (`neuron init`'s scaffolded
  `neuron.yaml`, the Zod schema default, storage-adapter scaffold
  defaults) and removed the `/api/history` UI route (matching the CLI
  alias removal).
- Docs: `README.md`, `CONTEXT.md`, `docs/COMMANDS.md`, and the packaged
  `.claude/skills/neuron-memory/SKILL.md` (this repo's own copy *is* the
  shipped template — one edit covers both) updated to stop documenting
  `history` as a default/example and to document the new `--category`
  requirement on `prune`/`consolidate`. `docs/design/*` and `docs/adr/*`
  deliberately left untouched — frozen historical record, several
  explicitly self-declared "read as history, not instructions."
  `AGENTS.md` doesn't exist in this repo (Claude-only harness), so that
  Deliverable item is moot here.
- Tests: deleted `src/commands/history.test.ts` (tested the removed CLI
  command wholesale); updated ~20 assertions across `cli.test.ts`,
  `index.test.ts`, `commands/ui.test.ts`, `config/neuronYaml.test.ts`,
  `config/scaffold.test.ts`, `storage/mdStorageAdapter.test.ts` that
  exercised removed surface (`addHistory` et al., `kind` field,
  `learnCount`/`historyCount`, default-category-list assertions); added
  new coverage for `--category` requiring itself on `prune`/`consolidate`
  and for `--category` actually scoping deletion/consolidation to one
  category without touching another (`src/commands/memory.test.ts`).

**Verification**: `npm test` 771/771, `tsc --noEmit` clean (note: excludes
`*.test.ts` per this repo's own tsconfig), `neuron status --check` clean
(`protocolBlockDrift: []`), `neuron scan --check`/`--diff` clean after a
full re-scan (module removal and export-contract changes correctly
reflected in the blueprint card).

## Comments

- Resolved directly (kind `task` — this map's Notes carry execution, no
  grilling needed beyond three scope check-ins with the maintainer:
  the corrected 238-entry scale, the generalize-prune-now call, and the
  full-CLI/API-removal call).

---
id: ab516584-1fc6-4522-a046-2da2397095ab
createdAt: 2026-08-16T18:57:43.922Z
importance: 3
tags:
  - retrieval
  - longmemeval
  - rc2
taskId: null
blockedBy: d121513e-0942-461b-87d0-77830d44e71a,c29a3c30-95ba-4f63-b74e-037f9d52dce6,707532ee-3377-4822-9111-8f44cff06dde
kind: task
map: 94bf37ad-fb5d-4e2c-8865-3fe1782cefd4
status: resolved
---
# 6 — Implement Near-Duplicate Suppression (Widen + Rerank Gate)

## Question

Build the widen-then-rerank near-duplicate gate that Ticket 3 — Near-Duplicate
Suppression designed but deliberately did not build: apply the validated
bar/N from Ticket 7's A/B tests, then replace `findSupersessionCandidate`'s
cosine-only single-candidate lookup with a widen-by-cosine, rerank,
gate-on-calibrated-bar implementation.

## Context

Graduated from Ticket 3's resolution (2026-08-15), mirroring how Ticket 2 —
Provenance Enforcement graduated its own implementation to Ticket 5 rather
than building in-session. Ticket 3's design decisions, not to be
re-litigated here:

- **One unified gate.** This replaces `findSupersessionCandidate`
  (`src/index.ts`) internals; it does not add a second, parallel gate. The
  CLI surface (`--supersedes` / `--not-a-reversal` / `--if-novel` in
  `src/commands/memory.ts`) is unchanged — it now also fires on near-dup
  restatements, not just reversals.
- **Signal is reranker score, not raw cosine.** Widen to the top-N
  candidates by raw cosine (a cheap pre-filter, not a decision), then score
  each with the existing `TransformersReranker`
  (`src/components/reranker.ts`).
- **The existing `RERANKER_ACCEPT_THRESHOLD = -8` (`src/index.ts`) does not
  transfer.** It's calibrated for an asymmetric task (query-vs-passage
  relevance, ticket 29 / ADR 0012) and deliberately loose. This gate needs
  its own bar.
- **Hit behavior is inherited, not new**: hard refuse, candidate id/content
  surfaced, `--supersedes <id>` / `--not-a-reversal` named as the
  resolution — the existing gate's behavior already covers this.

**Ticket 7 resolved (2026-08-15) with a split verdict, not a clean go.** On
its own 40-pair synthetic corpus, reranking does separate near-dup from
same-topic-different-fact hard negatives better than raw cosine (N=10,
bar=3 — see its findings doc). But Ticket 7's own real-store counterfactual
(A/B 4) found that same bar/N produces 214 false-positive-dominated
"duplicate" pairs against this repo's actual 683 live entries — driven by
two shapes the synthetic corpus never modeled: shared structural/narrative
templates (`architecture`'s scanner-generated cards, `history`'s
wayfinder-session template) and by-design cross-category restatement
(`decisions`/`learning` + `history` recording the same ticket twice on
purpose). A genuine same-category false positive was also found with no
template involved. Full detail:
`docs/design/write-time-quality/near-dup-detection-ab-findings.md`.

**Blocked on Ticket 10 — Resolve Template/Structural False-Positive Risk
Before Building Ticket 6**, created by Ticket 7's resolution. This ticket's
own deliverables below (in particular "apply Ticket 7's chosen N and
bar" — no longer sufficient on its own) are stale until Ticket 10 decides
how the gate is meant to tell "shares scaffolding/topic" apart from
"restates the same fact." Do not start implementation from the deliverables
below as currently written; they need Ticket 10's answer folded in first.

## Deliverables

- [x] Apply Ticket 7's chosen widen count (N) and reranker bar — no
      re-derivation here
- [x] `findSupersessionCandidate` reimplemented: widen by cosine → rerank →
      gate on Ticket 7's bar, replacing the single-candidate 0.97 cosine
      check
- [x] Existing CLI flags (`--supersedes` / `--not-a-reversal` / `--if-novel`)
      verified to still resolve the gate correctly against the new
      mechanism
- [x] Config-driven per the map's own non-goals (no hardcoded
      category-name logic) — verify the new gate, like the old one, applies
      uniformly across categories with no category-scoped special-casing
- [x] `npm test` and `tsc` clean
- [x] **Added 2026-08-15, pending Ticket 10:** apply whichever
      template/structural-collision mitigation Ticket 10 decides on, before
      or alongside the widen/rerank/bar mechanism above — the deliverable
      list above is necessary but, per Ticket 7's findings, not sufficient.

## Answer

Built exactly as Ticket 3 designed and Ticket 7/10 calibrated, all six
deliverables done, `npm test` 752/752, `tsc` clean.

`findSupersessionCandidate` (`src/index.ts`) is now three stages instead of
one cosine check: **widen** to the top `NEAR_DUP_WIDEN_N=10` candidates by
raw embedding cosine (a cheap pre-filter, not a decision) → **strip** each
candidate's known template boilerplate via a new
`stripKnownTemplates` (`src/components/templateFingerprint.ts`) → **rerank**
the stripped pair with the existing `TransformersReranker` and gate on
`NEAR_DUP_RERANK_BAR=3`. `SUPERSESSION_SIMILARITY_THRESHOLD` (0.97) is no
longer the write-time gate; it's left in place only for `getStoreHealth`'s
own separate store-wide clustering.

`stripKnownTemplates` implements Ticket 10's decision: two deterministic,
content-pattern regexes (not category-scoped — no category-name branching
anywhere in the new code, satisfying the map's own non-goal) strip the
`architecture` module-card heading + generic fallback purpose sentence, and
the wayfinder-pickup history opener in each of its observed phrasings,
before either side of a pair reaches the reranker. Covered by its own unit
suite (`templateFingerprint.test.ts`, 4 tests).

CLI surface is unchanged (`--supersedes` / `--not-a-reversal` / `--if-novel`
in `src/commands/memory.ts` still resolve the gate identically); the
refusal message now shows both the reranker score (the actual decision
variable) and the raw cosine, and the `--if-novel` JSON payload gained a
`rerankerScore` field alongside the existing `similarity` one — additive,
not a breaking rename.

**Live-measured effect (Pillar 14 / `test/e2e/antagonistic-write.test.ts`,
real embedder + real reranker, dist rebuilt):** case 1 (near-dup paraphrase)
flips from uncaught to caught (reranker score 8.5, bar 3) — the exact gap
Ticket 1 originally found. Case 2 (a same-shape numeric contradiction) also
now catches — not because this gate detects contradiction, but because
"restates the same fact" and "states a different fact in near-identical
phrasing" aren't yet distinguishable by a relevance-trained reranker alone
(reranker score 8.2, same bar). That distinction is explicitly out of this
ticket's scope — it's Ticket 9's job (conflict/polarity detection, still
soft-flag-only per Ticket 13's no-go) — and refusing pending
`--supersedes`/`--not-a-reversal` confirmation is the correct fallback
either way: a human sees the real prior entry on both the true near-dup and
the contradiction. Both Pillar 14 assertions updated to the new measured
values, per that file's own "snapshot to update deliberately" discipline.

**Incidental fallout, fixed:** the reranker was already real and already
ran during writes at the CLI layer once `findSupersessionCandidate` used it
(it always fired during reads via `queryGated`). Several pre-existing
subprocess-CLI tests across `hook.test.ts`, `memory.test.ts`, `cli.test.ts`,
and `history.test.ts` write intentionally near-templated fixture content
("Blocker one"/"Blocker two", "Repository Pattern note ${i}: ...", etc.) for
reasons unrelated to supersession (FTS-count behavior, `--where` query
composition, deprecated-flag handling, prune-by-age) — under the old
cosine-only gate these never collided (the `NEURON_MOCK_EMBEDDER` fixture
embeds everything to an all-zero vector, so cosine similarity was always
0.000, never near the 0.97 floor); under the new gate, cosine is only a
widen pre-filter, so these started genuinely tripping the real reranker.
Fixed at the fixture level (`--not-a-reversal` added to each affected
helper/call site) rather than by weakening the gate — these writes were
never meant to exercise supersession, so declaring them explicitly novel is
the semantically correct fix, not a workaround.

## Comments

- 2026-08-15: Created by Ticket 3 — Near-Duplicate Suppression's resolution.
- 2026-08-15: Blocked on Ticket 7, created at the maintainer's request so
  the approach and its parameters are validated before this ticket builds
  against them.
- 2026-08-15: Ticket 7 resolved. Re-blocked on Ticket 10 — its bar/N
  calibration alone does not survive contact with this repo's own real
  content (see Context above).
- 2026-08-15: Ticket 10 resolved (template fingerprint for
  structural/template collision; cross-category restatement deferred to
  Ticket 12, which co-blocked this ticket alongside Ticket 10). Both
  blockers now resolved; picked up and resolved in this session.

---
id: eb84d876-7222-4b4c-85da-2c48f59e0e96
createdAt: 2026-08-16T18:57:44.020Z
importance: 4
tags:
  - 2.4.0
  - rc2
  - planning
taskId: null
kind: task
map: 5768f1c7-0f3c-46e3-90db-c11e4c5df748
status: resolved
---
# 2 — Memory Store Cleanup Pass (This Repo)

## Question

Using the existing `neuron status --health` (and `--repair` where
appropriate) surface, comb through this repo's own live memory store and
decide what to fix, dedupe, or prune.

## Context

Not `neuron doctor` — that name was considered and rejected twice already
(ADR 0013 / ticket 13, and ticket 20 / neuron-2.4.0) in favor of folding
store-health signals (duplicates, importance distribution, superseded
count) into `neuron status --health`, with `--repair` acting on what it
finds. Both already exist; this ticket is about running them against this
repo's real store and making judgment calls on what they surface, not
building new tooling — unless the review turns up a real gap `--health`/
`--repair` don't already cover.

This is a retroactive, one-time pass over already-live entries — exactly
what Map — neuron 2.4.2's own Out of scope rules out for that map, which
is why it's chartered here instead.

## Design questions to resolve before implementation

- Run `neuron status --health` first and review its findings live with
  the maintainer before anything is repaired or pruned — no autonomous
  deletion, per this map's own non-goals.
- Does `--repair` alone cover what's found, or does anything need a
  manual `--supersedes` resolution (per ADR 0015's supersession design)
  the automated repair path can't make on its own?
- Scope: this repo's store only, or does a finding here motivate a
  broader default (e.g. a recommended prune/health cadence documented for
  every project)? Likely the latter is its own ticket if it comes up —
  don't presuppose it here.

## Deliverables

- [x] `neuron status --health` run and findings reviewed with the
      maintainer
- [x] Each finding triaged: repair, supersede, prune, or leave as-is,
      with rationale
- [x] Actions applied (none — see Answer)
- [x] `neuron status --health` re-run to confirm the store is clean
      (re-run not needed: no action was taken, so the original run
      already reflects current state)

## Answer

`neuron status --health` on this repo's live store found nothing for
`--repair` to act on: **0 duplicate/near-duplicate groups**, **0 repair
candidates**. Importance histogram: 258 @ 3, 155 @ 4, 97 @ 5, none at 1
or 2. 40 superseded entries — expected, tracked by design, never
auto-deleted.

The only remaining lever was a manual age-based `prune` (importance ≤3,
older than N days) — destructive, no undo, no dry-run. Reviewed live with
the maintainer: **no prune run**. Rationale — there is no automated
signal recommending it (both `--health` and `--repair` came back clean),
and this store already has a standing verdict that automated judgment of
prune-worthiness was tried and disqualified (both arms of the
pruning-judgment A/B failed, see the map's own linked history on
`pruning_ab_verdict`). Blind age+importance pruning of the 258
importance-3 entries risks real data loss with no recovery path — the
same shape of risk the v2.1.3 prune-docs incident already demonstrated
concretely (documented prune rule matched 0/160 entries, actual code
matched 158/160). Absent a reliable way to distinguish genuinely stale
importance-3 entries from ones merely written at the honest unscored
default, leaving the store untouched is the correct call, not an
omission.

**Triage: leave-as-is, all findings.** No repair, no supersede, no prune.

This is also a data point (not yet a full answer) toward the map's
"Not yet specified" question on whether staleness recurs enough to
warrant a periodic policy: one pass, on this store, right now, found no
staleness to clean up. Left as fog rather than graduated — one clean pass
doesn't establish a reaccumulation rate.

## Comments

---
id: de4f45be-34e0-45df-9a50-f72d0bdc5905
createdAt: 2026-08-16T18:57:44.125Z
importance: 4
tags:
  - rc2
  - 2.2.0
  - wayfinder
taskId: null
kind: grilling
map: 5768f1c7-0f3c-46e3-90db-c11e4c5df748
status: resolved
---
# 1 — Write-Side Compliance Nudge & Instrumentation

## Question

Should neuron add an active mechanism that nudges the agent to record
memories when the CLAUDE.md protocol calls for it — mirroring ticket 06's
read-side discovery hint and ticket 07's hint-follow-log instrumentation
(both neuron-2.4.0) — and if so, what does "nudge" and "measure" mean on
the write side specifically?

## Context

Today, write-side compliance is enforced entirely by passive prose: the
CLAUDE.md protocol block tells every session to log history/decisions/
learnings before finishing, but nothing active reminds the agent, and
nothing measures whether it actually happens. No `Stop`/`SessionEnd` hook
is currently registered in this repo's own `.claude/settings.json`.

The read side already solved the analogous problem for recall: ticket 06
fires a per-turn hint (`neuron memory query ...`) only when relevant
matches were left on the table, and ticket 07's `hintFollowLog.ts` records
both `fired` and `query-run` events so compliance is a measured fact, not
a guess. This ticket is about building the write-side counterpart of that
pair, not inventing a new pattern from scratch.

## Design questions to resolve before implementation

- What event should trigger the nudge? Session end is the obvious
  candidate (matches "before finishing" in the CLAUDE.md protocol), but
  there's no `Stop`/`SessionEnd` hook registered today — is adding one in
  scope for this ticket, or does it depend on harness support that
  doesn't exist yet for every adapter (`claudeCode.ts`, `codex.ts`,
  `cursor.ts`, `copilot.ts`)?
- What counts as "compliance"? A literal `neuron memory add` call, or
  satisfying the protocol block's intent some other way? Ticket 06/07's
  own measurement (`hintFollowLog.ts`) only needed to match one command
  shape (`neuron memory query`) — the write side has several distinct
  commands (`memory add` across `learning`/`history`/`decisions`/
  `tickets`), so "did compliance happen" is a broader question than
  ticket 07's own.
- Dogfood-only on this repo, or shipped generally via `neuron init`? See
  the map's own "Not yet specified" — `hintFollowLog.ts` was deliberately
  kept dogfood-only ("not part of what `neuron init` installs for a
  user's project"). Does the same reasoning apply here, or is write-side
  compliance valuable enough to every project that it should ship by
  default?
- What does the nudge actually say, and where does it fit in an already
  budget-constrained injection surface (`hook.ts`'s per-turn/per-session
  char budget, the same one ticket 06's hint competes for)?

## Deliverables

- [x] Trigger event — **not decided directly; routed through an A/B test
      first** (see Answer). Fact established while grilling: `LifecyclePoint`
      (`src/harnesses/types.ts:28`) is a closed 4-value union
      (`session-start`/`pre-prompt`/`context-reset`/`pre-command`) with no
      stop/session-end point in any of the four harness adapters today —
      so "wire a Stop hook" is a real structural change, not a config
      tweak, and not worth committing to before we know nudging works at
      all.
- [x] Definition of "compliance," made measurable — **decided**: a
      deterministic tool-call pattern match for a real `neuron memory add`
      invocation in the session transcript, mirroring
      `hintFollowLog.ts`'s quote-aware, separator-anchored
      `recordToolUse` approach. No LLM judge.
- [ ] Dogfood-only vs. ship-generally — **deferred**, moot unless the A/B
      returns a go.
- [ ] Nudge content and injection surface — **deferred** to the execution
      ticket (exact wording is a build detail, not decided here); the
      *category* of nudge to test (session-end-style reminder) is decided.
- [ ] Implementation — **deferred**; this ticket does not build the
      mechanism. See Answer.

## Answer

**Don't commit to the trigger/mechanism yet — test whether nudging
changes agent behavior first**, using neuron's own established real-agent
A/B pattern (`benchmarks/token-ab`: same agent, same task, run twice,
graded deterministically — "nothing here asks a model to score a model"),
not the offline-corpus-scoring pattern the NLI model A/Bs (tickets 7/8/13)
used. That pattern doesn't fit here: this is a question about live agent
behavior under different context conditions, not about a classifier's
separation quality on a fixed corpus.

**A/B design, decided this session:**

- **Three arms**: `control` (today's behavior — passive CLAUDE.md protocol
  text only, no active reminder) / `nudge` (a simulated session-end-style
  reminder injected into context, standing in for a real `Stop` hook that
  doesn't exist yet — the harness simulates it the same way `token-ab`'s
  `injection` arm simulates `session-start` payload rendering without a
  live hook) / `explicit-instruction` (system prompt states directly "you
  must call `neuron memory add` before finishing" — isolates whether a
  dedicated triggered event matters at all versus just stating the rule
  more forcefully, since a live `Stop` hook is real engineering work this
  ticket doesn't want to pay for before knowing it moves the needle).
- **Scenario**: reuse existing SWE-bench task fixtures already wired in
  `benchmarks/token-ab/swebench-fixtures.mjs` — a real failure-fix trigger
  per CLAUDE.md §1, zero new fixture-building work.
- **Grading**: deterministic tool-call pattern match for a real `neuron
  memory add` invocation (same approach as `hintFollowLog.ts`'s
  `recordToolUse` — anchored at a real command position, quote-aware, not
  a bare substring test). No LLM judge, matching this project's standing
  `token-ab` rule.
- **Decision rule**: go (build the real trigger mechanism) if `nudge`
  and/or `explicit-instruction` show a clear compliance-rate margin over
  `control`; no-go if all three land close together — meaning the agent's
  behavior doesn't move regardless of nudging, so a hook wouldn't help.
  Exact numeric bar left to emerge from the data (same approach ticket 13
  used), not fixed in advance.
- **Not decided here** (deferred to the execution ticket, or to a further
  ticket after its result): exact nudge wording, sample size/budget,
  dogfood-only-vs-`neuron init` (moot unless go), and the original
  trigger-architecture question this ticket opened with (hand-wired
  dogfood-only `Stop` hook vs. full `LifecyclePoint` extension across all
  four harness adapters) — that becomes the next decision *after* a go
  result, not now.

**This ticket's own scope is the design, not the build** — mirrors how
ticket 11 decided "test before deciding" and spawned ticket 13 to actually
run the A/B. A new `kind: research` child ticket is spawned to build the
harness (reusing `benchmarks/token-ab/session.mjs`'s manual tool-use loop)
and run it.

## Comments

- 2026-08-15: Resolved via `/grilling`. Spawns a new child ticket to build
  and run the designed A/B; that ticket's result determines whether this
  map's trigger-architecture question (Stop hook: hand-wired dogfood-only
  vs. full `LifecyclePoint` extension) becomes live.

---
id: 7c785243-17da-44e2-af28-3436a0e92520
createdAt: 2026-08-16T18:57:44.227Z
importance: 4
tags:
  - release
  - 2.2.0
  - git
taskId: null
kind: task
map: 94bf37ad-fb5d-4e2c-8865-3fe1782cefd4
status: resolved
---
# 5 — Implement `commitRef` Field Type & `git-notes` Category

## Question

Build what ticket 2 (Provenance Enforcement) designed: a new `commitRef`
declared-field type that validates a write-time value resolves to a real
commit in this repo's git history, plus a new `git-notes` category that
uses it.

## Context

Graduated from ticket 2's resolution (Map — neuron 2.4.2, "Provenance
Enforcement"). The design is settled; this ticket is pure implementation,
test-first (`/tdd` fits, mirrors ticket 1's own shape — design and build
in one pass, just split across two sessions here since the maintainer
chose to record the design and stop rather than implement live).

## Design (settled by ticket 2 — implement as specified, do not re-litigate)

- New declared-field type `commitRef`, added alongside the existing
  `string`/`enum` types (touches the field-def schema/validation in
  `src/config/neuronYaml.ts` and the enforcement path in `src/index.ts`'s
  `enforceFieldSchema`).
- Validates existence via a git shell-out (e.g. `git cat-file -e <value>`
  or `git rev-parse --verify <value>^{commit}`), reusing the
  `execFileSync` pattern already established in `src/harnesses/gitLog.ts`
  rather than inventing a second git-shelling mechanism.
- Must handle: valid full SHA, valid abbreviated SHA, a nonexistent hash
  (hard refuse — same "a refused write must not be a partial write"
  posture the rest of `enforceFieldSchema` already follows), and the
  not-a-git-repo case (a clear error, not a silent pass).
- New `git-notes` category declared in this repo's own `neuron.yaml`:
  `fields.commitRef: { type: commitRef, required: true }`. Purpose:
  durable commentary attached to an already-existing commit — why an
  approach was later reversed, a regression traced back to it, context
  that didn't belong in the commit message itself — distinct from the
  existing `git_log_index`, which is an auto-populated, read-only mirror
  of commit messages.

**Explicitly out of scope for this ticket** (ruled by ticket 2, do not
re-open here):
- Dogfooding `commitRef`/required provenance onto the existing
  `decisions`/`learning` categories — collides with this project's
  own same-session decision-recording convention.
- Any traversal/graph capability linking commits to `git-notes` entries —
  parked as fog on the map ("Not yet specified"), not this ticket's job.
- A general custom-code verifier field — rejected outright by ticket 2 as
  a pluggable-provider surface the map's non-goals rule out.

## Deliverables

- [x] `commitRef` field type implemented and validated at write time
- [x] Tests: valid full SHA, valid abbreviated SHA, invalid/nonexistent
      hash, non-git-repo case
- [x] `git-notes` category declared in this repo's own `neuron.yaml` with
      required `commitRef`
- [x] Docs updated to name the new field type and category, per this
      project's own documentation discipline (`docs/agents/issue-
      tracker.md` and/or wherever declared-field types are documented for
      `neuron.yaml` authors)

## Answer

Implemented exactly as ticket 2 specified — no re-litigation needed.

- **`CategoryFieldCommitRefSchema`** added to the discriminated union in
  `src/config/neuronYaml.ts` (`{ type: 'commitRef', required, default }`),
  alongside the existing string/enum variants. The "type floor" comment
  above it, and `--help`'s per-field kind display (`src/commands/utils.ts`),
  both updated to name it rather than silently falling through to the
  `string` default label.
- **`verifyCommitRef(projectRoot, ref)`** added to `src/harnesses/gitLog.ts`,
  reusing the module's existing `execFileSync` pattern rather than a new
  git-shelling mechanism. Returns a tagged result — `{valid:true}` /
  `{valid:false, reason:'not-a-git-repo'}` /
  `{valid:false, reason:'unknown-commit'}` — so the two refusal cases the
  design called out stay distinguishable at the call site, rather than
  collapsing to one boolean the way `runLog`'s read-path catch-all
  deliberately does. `not-a-git-repo` is detected via
  `git rev-parse --is-inside-work-tree` *before* attempting ref resolution
  — an empty-but-real repo (`git init`, zero commits) correctly reports
  `unknown-commit`, not `not-a-git-repo`; only a directory that isn't a git
  repo at all gets the latter. Ref resolution is
  `git rev-parse --verify --quiet <ref>^{commit}`, which accepts both full
  and abbreviated SHAs and rejects non-commit objects.
- **`enforceFieldSchema`** (`src/index.ts`) gained a `commitRef` branch in
  its existing per-field validation loop, alongside the `enum` branch —
  same choke point, same "refused write must not be a partial write"
  posture, distinct error text per failure reason. `this.projectRoot` (a
  field the class already carried) is the check target, so no constructor
  or call-site changes were needed. The pre-existing `def.type !== 'enum'`
  guard in `repairFieldCompliance` already treats `commitRef` as
  unresolved-not-fabricable for free — no change needed there; a missing
  commit ref has no safe synthesizable default, same reasoning ADR 0013
  already applied to free-text identity fields.
- **`git-notes`** declared in this repo's own `neuron.yaml`:
  `fields.commitRef: { type: commitRef, required: true }`, with a
  description distinguishing it from the auto-populated `git_log_index`.
  Smoke-tested live against this repo's own history (`neuron memory add
  --category git-notes --commit-ref <real HEAD sha> "..."` succeeded; the
  all-zero placeholder hash was hard-refused with "does not resolve to a
  commit in this repository's history"); the smoke-test entry was deleted
  afterward, so `.neuron/git-notes.md` carries only its header, no content.
- **Docs**: `docs/COMMANDS.md`'s "Project-declared fields" section now
  lists `commitRef` alongside `string`/`enum` with a `git-notes` example,
  plus a paragraph on its git-history-backed validation and the two
  refusal cases. `docs/adr/0013-configurable-frontmatter-schema.md` got a
  new Amendment (2026-08-15) recording this as one narrow, closed addition
  to the ADR's original "string and enum only" type-floor decision — not a
  reopening of the no-pluggable-verifier stance. `docs/agents/issue-
  tracker.md` was not touched — it documents the `tickets` category
  specifically, not the general field-type vocabulary, and `git-notes` has
  no wayfinder relationship to describe there.
- **Tests**: `src/harnesses/gitLog.test.ts` gained a `verifyCommitRef`
  describe block (full SHA, abbreviated SHA, nonexistent hash, not-a-repo,
  and the empty-repo edge case distinguishing the two failure reasons).
  New `src/commitRefField.test.ts` covers write-time enforcement through
  `NeuronMemory.transact()` against a real temp git repo: accepts full and
  abbreviated SHAs, hard-refuses a nonexistent hash, confirms no partial
  entry is created on refusal, gives the distinct not-a-git-repo error, and
  confirms required-ness still fires when `commitRef` is omitted entirely.
  `npm test`: 746/746 (was 728/728 before this ticket — Pillar 14 plus this
  ticket's 31 new tests). `tsc --noEmit` clean.

## Comments

---
id: bc1fad4b-9317-4c2f-8cff-1ba8329283e9
createdAt: 2026-08-16T18:57:44.415Z
importance: 3
tags:
  - benchmark
  - adr
  - longmemeval
taskId: null
blockedBy: 0a5895e6-e5cd-4aea-90c0-7f4bdfc4d7de
kind: task
map: 94bf37ad-fb5d-4e2c-8865-3fe1782cefd4
status: resolved
---
# 4 — Conflict Detection at Write Time

## Question

Should `neuron memory add` flag or refuse a new entry that directly
contradicts a live entry in the same category?

## Context

The highest-risk, highest-value ticket, and the one most likely to brush
up against the `trust_state` boundary — sequenced last, after tickets 1-3
have established the pattern of "compare against live entries via
embedding similarity" at smaller scale.

**Guardrail to hold firm during implementation**: this checks consistency
with existing memory, not truth. A new entry that contradicts a live entry
gets flagged or refused with a pointer to the conflicting entry and a
prompt to use `--supersedes`. The system is not adjudicating which one is
correct.

**Update, 2026-08-15 — Ticket 3 resolved.** Ticket 3 (Near-Duplicate
Suppression) settled on widening `findSupersessionCandidate` to a top-N
cosine pre-filter, reranking each candidate with the existing
`TransformersReranker`, and gating on a freshly-calibrated reranker-score
bar (not raw cosine — ADR 0015 and ticket 39 both found no usable
intermediate cosine band). This ticket's own design question below ("does
this reuse the existing reranker") is now a concrete option: reuse Ticket
3/6's widen-then-rerank primitive directly, rather than inventing a second
scoring mechanism. What is still open, and still this ticket's own job: a
reranker score alone tells you *how related* two entries are, not whether
they *agree* — Ticket 3's mechanism has no notion of polarity. Whatever
signal distinguishes "restates" from "disagrees with" is this ticket's
real content, not something Ticket 3 resolved for it.

## Design questions to resolve before implementation

- What counts as "likely contradiction" vs. "similar but compatible"?
  High embedding similarity alone isn't enough signal — two entries can be
  near-duplicates without conflicting, or dissimilar in wording while
  directly conflicting in meaning.
- Does this reuse the existing reranker (already scoring semantic
  relatedness) rather than inventing a second scoring mechanism?
- Refuse outright, or flag-and-require-acknowledgment? A hard refuse risks
  blocking legitimate writes on a false positive; the write gate's
  existing design principle ("a refused write must not be a partial
  write") suggests refuse-clean-or-not-at-all, but this may need a softer
  posture than schema refusal does.

## Deliverables

- [x] "Likely contradiction" defined precisely enough to test
- [x] Scoring mechanism decided (reuse reranker vs. new)
- [x] Refuse vs. flag-and-acknowledge decided
- [ ] Implementation — graduated to Tickets 8 and 9, see Answer

## Answer

**Resolved 2026-08-15, via `/grilling`.** All three design questions
decided; implementation graduated to two new tickets rather than built
this session, mirroring how Ticket 3 graduated to Ticket 6 gated on
Ticket 7.

1. **Polarity signal — an NLI cross-encoder, not a heuristic and not a
   chat model.** `cross-encoder/nli-MiniLM2-L6-H768` (verified to exist and
   ship its own quantized ONNX export directly in its HF repo — same
   L6-H768 size class and `AutoModelForSequenceClassification` loading
   pattern as the already-shipped `Xenova/ms-marco-MiniLM-L-6-v2` reranker,
   no separate Xenova conversion needed) outputs a 3-way
   entailment/contradiction/neutral classification per pair — no
   generation, no parsing, sidestepping the failure mode that sank several
   of the six Qwen1.5-0.5B-Chat attempts this project has already tried and
   rejected (see the `qwen-05b-loses-every-ab` memory). **This amends the
   map's own non-goal** ("No new embedding model or reranker") —
   deliberately, not silently: the non-goal against a *pluggable/swappable
   model system* stands unchanged; this is one fixed, purpose-built
   classifier for one purpose (polarity), not a second general-purpose
   reranker or a provider abstraction.
2. **Layering — reuses Ticket 3/6's relatedness gate as a pre-filter,
   doesn't replace or duplicate it.** The NLI model only ever runs on
   candidates that already cleared the widen-then-rerank relatedness bar;
   it never scans a whole category. Ticket 3/6's mechanism answers "how
   related," the NLI model answers "how they relate" for the handful of
   survivors.
3. **Refuse vs. flag — hard-block**, same interactive UX the existing 0.97
   gate and Ticket 3/6's widened gate already use: refuse the write, point
   at the conflicting entry, require `--supersedes`/`--not-a-reversal`/
   `--if-novel` to proceed. One consistent resolution path regardless of
   which signal (relatedness or polarity) triggered the hit — no second
   interaction paradigm for the user to learn.

**Implementation graduated, not built this session:**
- Ticket 8 — Validate NLI Polarity Detection (A/B) (ticket
  b8900ad0-0579-4263-98f5-6f8acee75025) — calibrates the confidence bar
  against Pillar 14's antagonistic-write cases plus new compatible-but-
  related pairs (false-positive check), before any code is written.
  Mirrors Ticket 7's role for Ticket 6.
- Ticket 9 — Implement Conflict Detection at Write Time (ticket
  78c7b32d-274a-4cac-bab6-55e83fa868b8) — gated on Ticket 8, builds the
  NLI-on-survivors gate with the hard-block UX above.

## Comments

---
id: c0d494fb-ab8b-447d-916c-48298b701cb7
createdAt: 2026-08-16T18:57:44.512Z
importance: 3
tags:
  - adr
  - benchmark
  - enrichment
taskId: null
blockedBy: 0a5895e6-e5cd-4aea-90c0-7f4bdfc4d7de
kind: task
map: 94bf37ad-fb5d-4e2c-8865-3fe1782cefd4
status: resolved
---
# 3 — Near-Duplicate Suppression

## Question

Should `neuron memory add` catch a near-duplicate (paraphrase, not
exact-hash match) of a live entry, and if so, how?

## Context

Extends the existing `computeMemoryHash` exact-match dedup to an
embedding-similarity check using the same infra already computing
embeddings for recall. Config-level threshold, same pattern as `minScore`
in `pullRules`.

## Design questions to resolve before implementation

- Threshold: reuse an existing calibrated value, or does this need its
  own? The atlas review flagged the read-side reranker threshold of `-8`
  as "unfitted" — don't repeat that pattern here without at least a
  documented rationale.
- Behavior on hit: hard refuse, or refuse-with-suggestion (surface the
  near-duplicate's ID and require `--supersedes` or an explicit override
  flag)?

## Deliverables

- [ ] Threshold decided and documented with a rationale
- [ ] Hit behavior decided (hard refuse vs. refuse-with-suggestion)
- [ ] Implementation, config-driven per the map's own non-goals (no
      hardcoded category-name logic)

## Answer

Resolved 2026-08-15, via `/grilling` with the maintainer.

**No new cosine threshold.** ADR 0015 §2 already found no calibrated
intermediate cosine band exists (the 0.97 same-topic band has "almost no
intermediate range"), and ticket 39's LongMemEval sweep (0.50–0.70)
confirmed this generalizes to real conversational text — every floor
regressed recall. Ticket 1's diagnostic found a genuine near-dup paraphrase
slips under 0.97 with no known score, which would have reopened exactly
the anti-pattern ADR 0015 already disqualified once. Picking a new guessed
cosine floor was rejected outright rather than attempted.

**Mechanism: widen-then-rerank, replacing `findSupersessionCandidate`.**
Instead of a single closest-match-by-cosine at a fixed threshold, the gate
widens to the top-N candidates by raw cosine (a cheap pre-filter, not a
decision) and reranks each with the existing `TransformersReranker`
(`src/components/reranker.ts`, already resident for the read-path
relevance gate, ticket 29 / ADR 0012). The reranker score — not raw
cosine — becomes the decision signal. This directly sharpens the map's own
"Not yet specified" question on whether tickets 3 and 4 share a code path:
ticket 4 (Conflict Detection) can evaluate reusing this same
widen-then-rerank primitive rather than inventing a second scoring
mechanism, though it will still need a different signal than magnitude
alone to tell "restates" from "disagrees with" — that distinction remains
ticket 4's own open question.

**The existing `-8` reranker bar does not transfer.** It's calibrated for
an asymmetric task (query-vs-passage relevance, ticket 29 / ADR 0012) and
deliberately loose (19.4% false-accept rate, tuned to avoid false silence
on retrieval) — the opposite failure mode from what a write-time block
wants. Near-dup detection needs its own calibration pass: seed genuine
near-dup, related-but-distinct, and unrelated pairs (extending ticket 1's
Pillar 14 case-1 fixture), score them with the reranker, and pick a bar
from the measured distribution with a documented rationale — the same
discipline ticket 29 used to derive `-8` and ticket 39 used to test (and
reject) a cosine floor, applied fresh to a new task rather than assumed to
carry over.

**Architecture: one unified gate, not two.** This replaces
`findSupersessionCandidate`'s internals; it does not add a second,
parallel gate. Ticket 1 already found the existing supersession gate
cannot distinguish "reworded" from "disagrees" — both currently hard-block
identically — so one gate catching near-dups in addition to reversals fits
the existing shape rather than adding new surface. The CLI surface
(`--supersedes` / `--not-a-reversal` / `--if-novel`) is unchanged.

**Hit behavior: inherited, not a new decision.** The existing gate already
combines hard refusal with a specific suggested resolution (surfaces the
candidate id/content/similarity, names `--supersedes <id>` and
`--not-a-reversal` as next steps) — this already is
"refuse-with-suggestion" in the ticket's own original framing. No new
behavior needed.

**Deliberately not decided here**: the widen count (N) for the cosine
pre-filter, and the calibrated reranker bar's actual number — both real
engineering/measurement work, graduated to Ticket 6 — Implement
Near-Duplicate Suppression (Widen + Rerank Gate) rather than built in this
session (matching ticket 2 → Ticket 5's precedent).

## Comments

- 2026-08-15: Grilled with the maintainer. Implementation (calibration +
  widen-then-rerank build) graduated to Ticket 6 — Implement
  Near-Duplicate Suppression (Widen + Rerank Gate).

---
id: e98d9b8e-6280-421b-993a-c0dc320be2ad
createdAt: 2026-08-16T18:57:44.613Z
importance: 3
tags:
  - enrichment
  - adr
  - release
taskId: null
blockedBy: 0a5895e6-e5cd-4aea-90c0-7f4bdfc4d7de
kind: task
map: 94bf37ad-fb5d-4e2c-8865-3fe1782cefd4
status: resolved
---
# 2 — Provenance Enforcement

## Question

Does a category that should require a source (e.g. `decisions`) already
get that enforced via a required declared field, or is real engineering
needed?

## Context

Only scoped as engineering work if ticket 1's case 3 shows a real gap. If
a required `sourceRef`-style declared field already causes a correct
refusal, this ticket becomes documentation (show users how to configure
it) rather than code.

If ticket 1 shows a gap: define what "requires a source" means precisely
(a ticket ID? a commit hash? free text with a minimum length?) before
writing any validation logic — this is exactly the kind of underspecified
requirement that caused the `plans`-category hardcoding mistake in an
earlier design pass.

## Deliverables

- [ ] If already solved: a docs update showing how to configure a required
      provenance field, ticket closed as documentation
- [ ] If a real gap: a precise definition of "requires a source" for this
      map's purposes, then the validation logic itself

## Answer

Real engineering, not documentation — confirmed by ticket 1: this repo's
`decisions` category declares no `fields:` block, so `enforceFieldSchema`
has nothing to check (findings doc §2.3).

**"Requires a source" now covers two distinct field types, not one:**

1. **Free text** — already works today via the existing `type: string,
   required: true` mechanism, no new code: a category declares a required
   string field (e.g. `source`), and `enforceFieldSchema` already
   hard-errors on a missing value.
2. **`commitRef`** (new) — a field type that validates the value resolves
   to a real commit in this repo's git history (a git existence check,
   e.g. `git cat-file -e <value>` / `git rev-parse --verify`, reusing the
   `execFileSync` shell-out pattern already established in
   `src/harnesses/gitLog.ts`, not a second git-shelling mechanism).
   Presence-only free text was ruled adequate for "cite something," but
   the maintainer wants commit-linked provenance specifically —
   resolvable, not just present.

**Explicitly rejected: a general custom-code verifier field** (project-
authored validation logic per field). This would be a pluggable-provider
surface and directly contradicts this map's own stated non-goal ("No new
package, SDK, or pluggable-provider system") — it also opens a
code-execution-on-write security question that a small, closed set of
built-in validator types avoids entirely. Decided instead: a closed set of
built-in field types, extended by the project over time (starting with
`commitRef`), never arbitrary project-authored code.

**Dogfooding**: not applied to this repo's existing `decisions`/`learning`
categories. Doing so collides with this project's own session-time
decision-recording convention — a `decisions` entry is often written
before the commit that resolves it exists, so a required `commitRef`
there would be unsatisfiable at write time. Instead, a **new category,
`git-notes`**, gives the mechanism a real, live consumer without that
collision: durable commentary *attached to* an already-existing commit
(why an approach was later reversed, a regression traced back to it,
context that didn't belong in the commit message itself) — written in a
later session, once the commit already exists, not the session that makes
it. Distinct from the existing `git_log_index`, which is an auto-
populated, read-only mirror of commit messages themselves. Schema:
`git-notes.fields.commitRef: { type: commitRef, required: true }`.

**Parked as fog, not folded into this ticket**: a knowledge-graph
traversal capability (commit → linked `git-notes`/learning entries, agent
follows the edge) — genuinely valuable but out of scope for a
write-time-quality map, and the codebase currently states outright it has
no graph/relationship primitive at all (`docs/agents/issue-tracker.md`);
this would be the first real one. Recorded in the map's "Not yet
specified," not ticketed.

**Implementation deferred** to a follow-up ticket (graduated: Ticket 5 —
Implement `commitRef` Field Type & `git-notes` Category) — the maintainer
chose to record the design and stop here rather than build it in this
session, unlike ticket 1's precedent of designing and shipping in one
pass.

## Comments

---
id: 0a5895e6-e5cd-4aea-90c0-7f4bdfc4d7de
createdAt: 2026-08-16T18:57:44.711Z
importance: 3
tags:
  - adr
  - longmemeval
  - failure-fix
taskId: null
kind: task
map: 94bf37ad-fb5d-4e2c-8865-3fe1782cefd4
status: resolved
---
# 1 — Antagonistic-Write Test Pillar (Diagnostic)

## Question

Which categories of "bad write" does the current write gate
(`enforceFieldSchema`) already reject, and which pass through uncaught?

## Context

Diagnostic, not a fix. Mirrors the existing `Pillar 13` (antagonistic
recall) structure, applied to the write path instead of the read path.
Its findings decide how tickets 2-4 get scoped, not just their order —
in particular, case 3 below may already close ticket 2 without any new
engineering if a category's own declared-fields schema already covers it.

## Candidate red cases to build and run

| # | Case | Expected today | Status to confirm |
|---|------|-----------------|--------------------|
| 1 | Near-duplicate content (paraphrase, not exact-hash match) of a live entry | Passes through uncaught — only exact-hash dedup exists | Confirm |
| 2 | Content that directly contradicts a live entry in the same category, no `--supersedes` given | Passes through uncaught — no conflict detection exists | Confirm |
| 3 | Entry in a category that *should* require a source (e.g. `decisions`) written without one | May already fail correctly if the category has a required declared field — check this first, it may already be solved | Confirm |
| 4 | Vague/low-specificity content | No objective pass/fail criterion yet | Not testable as-is — out of scope until one exists (see the map's own Not yet specified) |
| 5 | Existing shape violations (missing required field, bad enum) | Should already fail — regression-style re-assertion so the whole "bad write" story lives in one place | Confirm (should already pass) |

## Deliverables

- [x] A dated findings doc (same spirit as the 2.2.0 cycle's
      `handoff-response.md` audit) stating, per case, whether the current
      binary catches it
- [x] If case 3 already passes: note that ticket 2 closes as documentation,
      not engineering — it does NOT already pass; see Answer.
- [x] New test file mirroring `Pillar 13`'s structure, covering cases 1,
      2, 3, and 5 for real (case 4 excluded — no criterion yet)

## Answer

Ran all four testable cases (case 4 excluded, no criterion yet) against the
real write gate — the CLI's supersession/similarity check
(`src/commands/memory.ts`, real embedder) for cases 1-2, and
`NeuronMemory.transact()`'s `enforceFieldSchema` (mock embedder, synthetic
config mirroring this repo's real category shapes) for cases 3 and 5. Full
findings, method, and scoping implications for tickets 3/4:
`docs/design/write-time-quality/antagonistic-write-findings.md`. New pillar:
`test/e2e/antagonistic-write.test.ts` (Pillar 14, wired into
`benchmarks/e2e-runner.js`'s `SUITES`). `npm test` 728/728, `tsc --noEmit`
clean.

Results, all confirming the map's own expectations:

- **Case 1** (near-dup paraphrase): uncaught. A semantic paraphrase doesn't
  cross the supersession gate's 0.97 cosine threshold.
- **Case 2** (direct contradiction, no `--supersedes`): uncaught. Same
  mechanism, same threshold — a same-shape numeric contradiction doesn't
  cross it either, and the gate has no way to distinguish "restates" from
  "disagrees with" even when it does fire (embedding proximity only).
- **Case 3** (missing provenance on `decisions`): uncaught, and **not**
  already solved as the map's sequencing rationale flagged as possible —
  this repo's own `decisions` category declares no `fields:` block at all,
  so `enforceFieldSchema` has nothing to check. Ticket 2 is real work: at
  minimum a real config change (a required `source`/`ticket`-style field,
  which any project can already declare today) plus deciding whether/how
  that becomes the documented default posture rather than an opt-in a
  project has to discover on its own.
- **Case 5** (shape violations): both sub-cases caught, as expected —
  missing required field and undeclared enum value both hard-error with the
  existing messages (already unit-tested in `fieldSchema.test.ts`;
  re-asserted here as the regression the ticket asked for).

Scoping note for tickets 3-4 (see findings doc §3 for detail): the existing
supersession gate is interactive/binary (hard-stop above 0.97, human
resolves via `--supersedes`/`--not-a-reversal`/`--if-novel`) and only
compares against the single closest match. Both ticket 3 (near-dup) and
ticket 4 (conflict) will need a materially lower similarity band to catch
cases 1-2, and — per case 2's finding — something beyond cosine similarity
alone to tell "duplicate" from "conflicting" once they do; that
distinguishing signal is real design work for ticket 4, not decided here.

## Comments

---
id: d7f9052c-8f20-4360-967f-b4d2a18c727b
createdAt: 2026-08-16T19:11:24.724Z
importance: 4
tags:
  - adr
  - enrichment
  - md-storage
taskId: null
kind: task
map: 5768f1c7-0f3c-46e3-90db-c11e4c5df748
status: resolved
---
Ticket 15 — Fix transactVector's Upsert Silently Stranding a Row's Category on a Same-Id Move (found by Ticket 9). NeuronMemory.transactVector's op:'upsert' branch (src/index.ts) checks whether an id already exists with a store-wide, category-agnostic lookup (SELECT 1 FROM memories WHERE id = ? AND project_id = ?), so upserting an existing id under a NEW category hits the UPDATE branch rather than INSERT — and that UPDATE's column list never includes category, so the row silently stays under its old category while every other field (content, tags, fields, etc.) updates as if the write succeeded cleanly. No shipped caller hits this today: the CLI's 'update' op requires --category to already match the existing row (a mismatch is reported as not_found, never a wrong-category update), so the gap is only reachable by code doing a same-id cross-category upsert directly — which is exactly the shape ticket 9's tickets-category-split migration needed, and had to work around procedurally (delete from the old category, then upsert into the new one, so the second write hits INSERT instead) rather than rely on the primitive. Fix: either make the UPDATE branch also SET category = ? whenever the mutation's category differs from the existing row's, or scope the upsert 'exists' check to (id, category) like 'update' already does and let a same-id-different-category upsert fall through to INSERT (mirroring how a real move should behave) — maintainer's call on which semantics to ship, since the two produce different behavior if two categories both legitimately hold entries with colliding ids (should not currently be possible, since id is a global primary key, but worth confirming before choosing). Add a regression test covering a same-id upsert across two categories, asserting the row ends up under the new category and only one row exists for that id afterward. Not urgent — this is the second, safer archiving primitive Map — neuron 2.4.3's own docs/agents/issue-tracker.md Archiving section now documents a workaround for; fixing this properly would let that workaround go away.

## Answer

Shipped the first option: the `UPDATE` branch in `transactVector` (src/index.ts) now unconditionally includes `category = ?` in its `SET` list, using the same `resolveCategory(m)` value already computed for the `INSERT` branch. Chose this over scoping the `exists` check to `(id, category)` and falling through to `INSERT`, because `id` is the table's real primary key — a same-id `INSERT` after a category-scoped miss would hit a `UNIQUE` constraint violation rather than actually moving the row, so that path would need its own delete-old-row-first step to work at all, i.e. it collapses into the same fix with more moving parts. The `UPDATE` branch already always executes (it unconditionally sets `updated_at`), so adding `category` to the same `SET` list is free: a same-category upsert or an `update` (whose `exists` check already requires the category to match) just re-sets the identical value; a cross-category upsert now actually moves the row instead of silently leaving it stranded.

Added a regression test (`src/index.test.ts`, "Ticket 15: transactVector upsert moves a row across categories instead of stranding it"): upserts a fixture into `learning`, upserts the same id into `history`, and asserts exactly one row remains for that id, now under `history`, with `learning`'s query returning empty and `history`'s returning the one row. `npm test`: 778/778 across 65 files. `tsc --noEmit`: clean.

This retires the delete-then-upsert workaround ticket 9's migration needed and documented in `docs/agents/issue-tracker.md`'s Archiving section — that section still describes the pattern as the safe move primitive, which remains true (it still works), but a same-id upsert into a new category is now itself safe to use directly.

---
id: 5768f1c7-0f3c-46e3-90db-c11e4c5df748
createdAt: 2026-08-16T18:57:38.743Z
importance: 3
tags:
  - planning
taskId: null
kind: map
status: unclaimed
---
# Map — neuron 2.4.3

## Destination

Close the loop on whether this store actually contains good memory, on the
two axes Map — neuron 2.4.2 deliberately doesn't touch: **getting more
high-quality entries written in the first place** (the agent voluntarily
using `neuron memory add` when the CLAUDE.md protocol calls for it, not
just when it happens to remember to), and **cleaning up what's already
accumulated** in this repo's own live store.

2.4.2 is about the write *gate* — validating the quality of an entry as it
gets written. This map is about the two things a gate can't fix: writes
that never happen at all, and writes that already happened before any gate
existed.

## Notes

- **Prepared 2026-08-15**, spun out mid-session from Map — neuron 2.4.2's
  ticket 2 (Provenance Enforcement) grilling. The maintainer raised two
  concerns that don't fit that map's write-gate destination and directly
  collide with its own stated Out of scope ("Retroactive re-scoring of
  existing live entries... not a backfill/migration pass") — rather than
  fold them in, they're chartered here as their own effort.
- **Non-goals**:
  - Not re-litigating the write-gate/validation mechanism itself — that's
    Map — neuron 2.4.2's job. This map assumes whatever it ships and
    builds around it, not instead of it.
  - `neuron doctor` does not exist and isn't being revived under that
    name — it was rejected twice already (ADR 0013 / ticket 13, and
    ticket 20 / neuron-2.4.0) in favor of folding health/repair signals
    into `neuron status`. Any cleanup work here uses the existing
    `neuron status --health`/`--repair` surface, not a new command.
  - No autonomous/unattended deletion. Cleanup is reviewed before
    anything is pruned or repaired — matches this project's standing
    discipline around destructive actions.
- **What already exists, relevant to the write-compliance question**
  (not yet chartered as its own ticket): the read side has an active
  mechanism for exactly this shape of problem — ticket 06 (neuron-2.4.0)
  built a per-turn discovery hint nudging `neuron memory query` when
  relevant recall was left on the table, and ticket 07 built
  `hintFollowLog.ts`, instrumentation measuring whether the hint actually
  gets followed. The write side has no equivalent: no `Stop`/`SessionEnd`
  hook is registered in this repo's own `.claude/settings.json`, and
  nothing measures whether `neuron memory add` gets called when the
  protocol calls for it. Enforcement today is 100% passive prose (the
  CLAUDE.md protocol block).
- **What already exists, relevant to the store-cleanup question** (not
  yet chartered as its own ticket beyond Ticket 1 below): `neuron status
  --health` reports store-health signals (duplicates, importance
  distribution, superseded count); `--repair` acts on what `--health`
  finds. Both already shipped (ticket 13/ADR 0013, ticket 20/neuron-2.4.0)
  — this map is about *using* them on this repo's own store, not building
  anything new, unless the review turns up a real gap.
- **Skills to consult**: the write-compliance question is squarely
  `/grilling` territory (same shape as Map — neuron 2.4.2's own ticket 2
  resolution) — trigger, measurement, and dogfood-vs-ship-generally are
  all maintainer calls, not facts to look up. `/tdd` fits once that
  design is settled and implementation is graduated, mirroring how
  ticket 06/07 were built.

## Decisions so far

<!-- one line per resolved ticket: enough to judge relevance, then open the ticket for detail -->

- [Ticket 1 — Write-Side Compliance Nudge & Instrumentation](de4f45be-34e0-45df-9a50-f72d0bdc5905) — don't commit to a trigger mechanism yet; test first via a 3-arm real-agent A/B (control/nudge/explicit-instruction, reusing `token-ab`'s pattern), deterministic tool-call grading, go/no-go decision rule. Build/run spawned as [Ticket 4](623be167-6f64-4616-8328-d42d29ac3952).
- [Ticket 4 — Build & Run the Write-Side Compliance Nudge A/B](623be167-6f64-4616-8328-d42d29ac3952) — ran it: 24 live sessions, all three arms hit 100% compliance and 100% task-solve, zero margin. **No-go on building a trigger mechanism**, per the decision rule — but it's a ceiling effect (control's task was maximally easy), not proof the real-world gap doesn't exist. See the ticket's Answer and [`docs/design/write-compliance/nudge-ab-findings.md`](../../docs/design/write-compliance/nudge-ab-findings.md), Part 1, for the full caveat.
- [Ticket 5 — Harder Write-Compliance Follow-Up A/B (Ceiling-Effect Retest)](e38c5a30-2ef0-4f15-81b1-cf160498188f) — reran it harder (full real CLAUDE.md, multi-step sessions with real competing work, $2 budget): control collapsed to 20% compliance while nudge and explicit-instruction both held 100% — an 80-point margin. **Reverses Ticket 4's no-go to a clean go.** Also surfaced an unplanned finding: Map 2.4.2's own duplicate-detection gate creates real retry friction when an agent's §1 and §2 entries read as near-duplicates of each other. Routes to [Ticket 6 — Design the Write-Side Compliance Trigger Mechanism](ae0e3d5d-8564-471e-a2ed-73e54480c7e0). See Part 2 of the same findings doc.
- [Ticket 1 — Remove the `history` Category (Superseded)](7fed4f53-3251-4b7a-94a0-3d344fb9a59a) — retired `history`: real entry count was 238, not the 20 first seen (`list`'s default limit hid the rest); reviewed via ticket-answer redundancy + an incidental-finding sweep, migrated 3 genuine orphans forward (2 `learning`, 1 `decisions`), deleted the rest. No non-wayfinder fallback category. Scope grew twice with the maintainer's sign-off: `history` was also baked into the type system/CLI/UI (`MemoryKind`, `neuron history` alias, `/api/history`) and `neuron memory prune`/`consolidate` were hardcoded to `category = 'history'` in raw SQL — both fully removed/generalized (`prune`/`consolidate` now take a required `--category`), not left as dogfood-only patches. `npm test` 771/771, `tsc`/`status --check`/`scan --check` clean.

- [Ticket 2 — Memory Store Cleanup Pass (This Repo)](eb84d876-7222-4b4c-85da-2c48f59e0e96) — ran `neuron status --health`/`--repair` against this repo's live store: 0 duplicate groups, 0 repair candidates, importance histogram clean (none at 1-2). Reviewed live with the maintainer: **no prune run** — the only remaining lever (age-based prune) has no automated signal behind it, and this store already carries a standing verdict that automated prune-judgment was tried and disqualified. Triage: leave-as-is. One data point (not yet an answer) toward whether staleness recurs.

- [Ticket 3 — Past/Present/Future Ticket Storage Split; Verify Architecture-Scan Upsert Behavior](8b77da80-6df1-4683-8ec0-8495e7a7605e) — architecture-scan upsert confirmed clean by live re-scan (no bug, no build needed). Design settled via `/grilling`: `tickets-present` (md, actively-sequenced maps + open children) / `tickets-past` (vector, closed maps + resolved children) / `tickets-future` (vector, not-yet-sequenced maps); archiving is **whole-map-on-close**, not per-ticket; promotion future→present is **manual only**; this ticket's own migration sorts all ~13 existing maps into the split; `--where`/`--refs-satisfy` already work identically across storage modes (verified by code inspection, no gap); `blockedBy` stays same-category by convention (archiving is whole-map, so no cross-category resolution needed). Implementation spawned as [Ticket 9 — Implement the Past/Present/Future Ticket Storage Split](83676ec0-81e3-4438-b21d-5693bfb21a52), handed to `/tdd`, not built this session.

- [Ticket 6 — Design the Write-Side Compliance Trigger Mechanism](ae0e3d5d-8564-471e-a2ed-73e54480c7e0) — full `LifecyclePoint` extension, a new `pre-stop` point, shipped generally via `neuron init`, not a dogfood-only hook. **Corrected mid-`/tdd` (2026-08-16):** the ticket's first resolution named the point `session-end` and mapped it to each harness's literal `SessionEnd` event — verified at implementation time to be fire-and-forget on all four harnesses (never reaches the model, can't force another turn). Re-grilled live: renamed to `pre-stop`, remapped to each harness's real per-turn stop-and-escalate event (`Stop`/`agentStop`/`stop`); Claude Code's exact field shape (`decision:"escalate"` + `additionalContext`) confirmed **empirically** via a live headless-session probe, not doc-sourced; Codex CLI turns out to have real support too (`Stop`, doc-sourced) — the earlier "no hook exists" conclusion had checked the wrong event name. All four harnesses now get real support; the Codex explicit-instruction fallback is dropped as unneeded. Claude Code's exact `Stop` field shape verified **empirically** via a live headless-session probe run from this repo's own Claude Code session — resolved a 3-way contradiction across doc fetches that plain research couldn't settle. Nudge blocks once per session (new session-scoped `ledger.ts` state, deliberately not epoch-scoped), mirroring Ticket 5's proven design. Gate-friction from Ticket 5 **fixed, not deferred**: new `--companion-of <id>` flag on `neuron memory add` skips the near-dup gate against a named companion entry. Command docs split out of README into `docs/COMMANDS.md`, which also gained the full gate-resolution flag family (`--supersedes`/`--not-a-reversal`/`--if-novel`/`--companion-of`) documented together for the first time. OpenCode support spun off as [Ticket 10 — Research OpenCode Harness Support](11fc1352-06cd-4ba1-8360-72e91f17acc0) rather than folded in. **Built this session**, all 9 implementation-plan steps via full red→green `/tdd`: `npm test` 792/792 across 71 files, `tsc --noEmit` clean. `/code-review` against the uncommitted diff (2026-08-16) surfaced four unresolved follow-ups before commit: [Ticket 11 — Fix --companion-of/--if-novel Mutual-Exclusion Gap](f43d4a3d-14c5-433d-ac04-220af43c0860), [Ticket 12 — Amend ADR 0015 for --companion-of](45a743c6-9054-4d06-9466-c6cec8929139), [Ticket 13 — Fix Stale Ticket 6 Decision Entry in .neuron/decisions.md](e54fd0dd-c635-4ce2-a635-f6611d79d01e), [Ticket 14 — Split docs/design/site/competitive-landscape-and-positioning.md Out of the Ticket 6 Commit](be2f8cba-5d34-4e8f-9a92-1cf737ca77f2).

- [Ticket 11 — Fix --companion-of/--if-novel Mutual-Exclusion Gap](f43d4a3d-14c5-433d-ac04-220af43c0860) — maintainer's call: block the combination rather than let the two compose, keeping the four-flag mutual-exclusion story symmetric. Added the missing utils.ts guard, corrected both flags' --help text (each previously omitted the other from its own mutual-exclusion list), and a covering test. `npm test` 793/793, `tsc --noEmit` clean.

- [Ticket 12 — Amend ADR 0015 for --companion-of](45a743c6-9054-4d06-9466-c6cec8929139) — added a dated Amendments entry to ADR 0015 (memory-supersession) documenting `--companion-of` as a third gate-resolution path alongside `--supersedes`/the explicit override, matching the Amendments format already used by ADR 0014. Follows this repo's convention (ADR 0010/0013/0014) of amending the original ADR rather than leaving it silently stale.

- [Ticket 13 — Fix Stale Ticket 6 Decision Entry in .neuron/decisions.md](e54fd0dd-c635-4ce2-a635-f6611d79d01e) — superseded the stale entry (05759e7b) rather than editing it in place, matching this file's own existing correction precedent: a new decisions entry (f2bc6c9d) now records the corrected pre-stop design (real per-turn Stop-family events on all four harnesses, no Codex prose fallback), and 05759e7b carries `supersededBy` pointing to it per ADR 0015's hard-exclude-never-delete rule.

- [Ticket 14 — Split docs/design/site/competitive-landscape-and-positioning.md Out of the Ticket 6 Commit](be2f8cba-5d34-4e8f-9a92-1cf737ca77f2) — committed the site-input doc separately (127487f) ahead of the Ticket 6 commit (b9666d7), rather than editing tracker state to invent a new home for it — its own header already self-identifies as raw input to Map — neuron.github.io Site (2.5.0)'''s Ticket 2, so no new tracker entry was needed, just separate commit history.

- [Ticket 9 — Implement the Past/Present/Future Ticket Storage Split](83676ec0-81e3-4438-b21d-5693bfb21a52) — executed Ticket 3's settled design: `neuron.yaml` now declares `tickets-present`/`tickets-past`/`tickets-future` in place of the single `tickets` category; a one-off script (delete-then-upsert per entry, not a same-id upsert — that path silently leaves the category column stale, a real gap found while building this) migrated all 259 live entries (58 present / 198 past / 3 future), confirmed against the store live before running. `docs/agents/issue-tracker.md` rewritten for the three-tier model, including a new Archiving/promotion section neither operation had before. Live frontier query against `tickets-present` reproduced the pre-migration result exactly; `neuron status --check` came back clean after also regenerating `CLAUDE.md`'s protocol-block header, which the rename had gone stale. `npm test` 777/777, `tsc --noEmit` clean. No new `src/` code — per-category storage mode was already live, so despite being handed to `/tdd` at spawn time this turned out to be config + migration + docs, not a red/green cycle. The upsert-category gap itself spun off as [Ticket 15 — Fix transactVector's Upsert Silently Stranding a Row's Category on a Same-Id Move](d7f9052c-8f20-4360-967f-b4d2a18c727b) rather than fixed inline, since no shipped code path is exposed to it today.

- [Ticket 10 — Research OpenCode Harness Support](11fc1352-06cd-4ba1-8360-72e91f17acc0) — **no-go, unchanged**, re-verified live against OpenCode's current docs and package (2026-08-16): `failurePosture`/`timeoutMs`/`payloadCapChars` are still undocumented for `chat.message`/`chat.params`, and install is still arbitrary plugin code, not declarative config. New this pass: two live GitHub issues (`vectorize-io/hindsight#2656`, `anomalyco/opencode#7006`) show OpenCode's plugin dispatch silently drops unrecognized/untriggered hooks in production — one case is a real recall plugin whose auto-recall feature is silently broken this exact way — turning the original "undocumented" gap into a demonstrated one. Returns only behind a future empirical-measurement ticket, not another doc read. See [`docs/design/harness-compatibility-research/opencode-followup-2026-08-16.md`](../../docs/design/harness-compatibility-research/opencode-followup-2026-08-16.md).

- [Ticket 15 — Fix transactVector's Upsert Silently Stranding a Row's Category on a Same-Id Move](d7f9052c-8f20-4360-967f-b4d2a18c727b) — shipped the SET-category-unconditionally fix over the scoped-exists-check alternative: id is the table's real primary key, so a same-id INSERT after a category-scoped miss would just hit a UNIQUE violation rather than actually moving the row. The UPDATE branch (src/index.ts) now always includes `category = ?`, using the same resolveCategory(m) value the INSERT branch already computes — free, since the branch already unconditionally sets updated_at. Regression test covers a same-id upsert across two categories. npm test 778/778, tsc clean. This map's frontier is now empty — every ticket is resolved.

## Not yet specified

- **Whether this repo's broader cleanup work surfaces a recurring policy**
  (e.g. a periodic health check) rather than a one-time pass — stays fog
  until a one-time pass actually runs and shows whether staleness
  reaccumulates fast enough to matter.

## Out of scope

- **The write-gate/validation mechanism itself** — Map — neuron 2.4.2's
  job, not this map's. See that map's own Destination and tickets.

---
id: 94bf37ad-fb5d-4e2c-8865-3fe1782cefd4
createdAt: 2026-08-16T18:57:38.839Z
importance: 3
tags:
  - planning
  - rc2
  - benchmark
taskId: null
kind: map
status: unclaimed
---
# Map — neuron 2.4.2

## Destination

A release theme focused on **write-time quality**: gathering and enforcing
high-quality memory at write time, closing the gap the Agent Memory Atlas
review named directly — *"a well-formed but false `decisions` entry is not
stopped by the field validator."*

The write gate (`enforceFieldSchema`) already enforces *shape*: required
fields, undeclared fields, enum membership. It does not, and was never
designed to, enforce *quality*: whether an entry duplicates something
already live, contradicts it, or shows up unsourced. The atlas review
independently confirmed this is the honest boundary of the current
mechanism, not an oversight — a well-scoped next target, not a reach.

Everything proposed reuses infrastructure that already exists: the
embedding pipeline behind recall, the declared-fields schema language, the
supersession primitive, and the existing antagonistic-recall test pillar
(`Pillar 13`) as a direct template for a write-side counterpart. No new
storage engine, no new package, no new top-level command.

## Notes

- **Prepared 2026-08-15**, brought by the maintainer as an already-charted
  document (not a `/grilling` session on this map) immediately after
  Map — neuron 2.4.0 (ticket 0a1d6d69-54ea-42bf-bc30-6ae4522172fd)'s Destination was reached and closed. Ticket 1
  is a diagnostic, not a fix — its findings determine how tickets 2-4 get
  scoped, not just their order. This map has not resolved any of its own
  tickets yet.
- **Renamed 2.4.1 → 2.4.2, 2026-08-15, same effort continued.** Ticket 1
  (the diagnostic) resolved clean, and a second, unrelated hook-hygiene
  ticket surfaced live during that session and was resolved alongside it
  (see that ticket's own standalone entry, not a child of this map). The
  maintainer chose to cut and publish v2.4.1 with just those two small,
  already-done items rather than hold the release open for tickets 2-4 —
  which are real engineering (ticket 1's own findings ruled out ticket 2
  closing as documentation-only) and were never going to fit the same
  release. This map's own Destination, Notes, and remaining tickets
  (2-4) are unchanged — only the version label wrapping them moved,
  because the number it was named after already shipped without them.
- **Non-goals (stated explicitly, per standing project discipline)**:
  - This is not a truth judgment. Consistency enforcement ≠ truth
    enforcement. A conflict check compares a new entry against *existing
    live memory*, not against reality. Do not reopen the `trust_state`
    decision the atlas review explicitly praised withholding — no
    `verified`/`disputed`/confidence score anywhere in this map.
  - No new package, SDK, or pluggable-provider system.
  - No hardcoded category-name logic — any mechanism here that's
    category-scoped must be config-driven (mirrors the
    `diffAgainstArchitecture` flag precedent from the plan-vs-drift spec).
  - No PM-software creep (no due dates, assignees, workflow states beyond
    live/superseded).
  - No new embedding model or reranker — reuse whatever the read-side
    pipeline already uses. Confirm the exact model/component name against
    the current codebase before ticket 3/4 land — do not assume it matches
    an older doc's reference. **Confirmed 2026-08-15 (ticket 3's grilling):
    `TransformersReranker`, `src/components/reranker.ts`.** **Amended
    2026-08-15 (ticket 4's grilling):** this non-goal is scoped to a
    *pluggable/swappable* model system, not to a single fixed-purpose
    classifier — Ticket 4 adds one specific NLI cross-encoder
    (`cross-encoder/nli-MiniLM2-L6-H768`) for polarity detection only,
    layered on top of `TransformersReranker`'s relatedness gate rather
    than replacing it.
  - No new *raw-cosine* threshold band, below the existing 0.97
    supersession gate. Settled 2026-08-15 by ticket 3's grilling: ADR 0015
    §2 and ticket 39's LongMemEval sweep both already found no reliable
    intermediate cosine band exists on real text — any mechanism here that
    wants a similarity-based bar must calibrate a reranker-score bar
    instead (per Ticket 29 / ADR 0012's own `-8` derivation method), not a
    freshly-guessed cosine number.
- **In scope**: a test pillar proving which "bad write" categories are
  currently caught and which aren't (ticket 1); config-only provenance
  enforcement, if ticket 1 shows it's already possible via declared fields
  (ticket 2); near-duplicate suppression, extending the existing
  content-hash dedup to embedding similarity (ticket 3); write-time
  conflict detection against live entries in the same category, using
  existing embedding infra (ticket 4).
- **Out of scope**: see the Out of scope section below.
- **Sequencing rationale**: ticket 1 goes first and is a diagnostic, not a
  fix. It defines red cases for each candidate bad-write category, runs
  them against the current binary, and records what already fails vs.
  passes. That record — not a guess — decides which of tickets 2-4
  actually need to be built and in what order. Provenance (ticket 2) is
  checked first *within* that diagnostic because it may cost nothing: if a
  category is already configured with a required `sourceRef`-style field,
  the enforcement already exists and there's no ticket to write.
- **Sequencing against current work, superseded 2026-08-15**: the
  original document gated this map's start on `2.4.0`'s ticket 38 merging
  and its overdue breadth-first re-grill — neither condition still applies.
  `2.4.0` published stable to npm's `latest` dist-tag the same session this
  map was chartered, and its map closed *without* running that re-grill (a
  direct maintainer choice to cut now rather than re-grill first — see
  Map — neuron 2.4.0 (ticket 0a1d6d69-54ea-42bf-bc30-6ae4522172fd)'s own close-out Notes). This map is not
  jumping any queue; it's next.
- **Skills to consult**: `/tdd` fits ticket 1's own shape (a new
  antagonistic-write test pillar, directly mirroring how `Pillar 13`
  itself was built). `/domain-modeling` if ticket 4's "likely
  contradiction vs. similar-but-compatible" distinction needs a term
  coined for it.

## Decisions so far

<!-- one line per resolved ticket: enough to judge relevance, then open the ticket for detail -->

- 1 — Antagonistic-Write Test Pillar (Diagnostic) (ticket 0a5895e6-e5cd-4aea-90c0-7f4bdfc4d7de) — measured all four testable cases (case 4 excluded, no criterion yet) against the real write gate: near-duplicate paraphrase (case 1) and a same-shape numeric contradiction (case 2) both pass uncaught — the CLI's supersession gate (0.97 cosine) doesn't reach either; missing provenance on `decisions` (case 3) also passes uncaught and is **not** already solved as the map's sequencing rationale hoped — this repo's own `decisions` category declares no `fields:` block, so ticket 2 is real work, not documentation; shape violations (case 5) are already caught, as expected. New resident `Pillar 14: Antagonistic Write & Quality Gate` (`test/e2e/antagonistic-write.test.ts`) plus a dated findings doc (`docs/design/write-time-quality/antagonistic-write-findings.md`) with scoping notes for tickets 3-4. `npm test` 728/728, `tsc` clean.
- 2 — Provenance Enforcement (ticket e98d9b8e-6280-421b-993a-c0dc320be2ad) — real engineering, confirmed by ticket 1. Two field types, not one: free text already works today via existing `type: string, required: true` (no new code); a new `commitRef` type is needed for commit-linked provenance specifically, validating a value resolves to a real commit via a git existence check (reusing `src/harnesses/gitLog.ts`'s shell-out pattern). A general custom-code verifier field was explicitly rejected — it's a pluggable-provider surface this map's own non-goals rule out; decided instead on a small, closed set of built-in field types. Not dogfooded onto this repo's `decisions`/`learning` (collides with same-session decision-recording); instead a new `git-notes` category (commentary attached to an already-existing commit, distinct from the auto-populated `git_log_index`) gives `commitRef` a real live consumer. Implementation graduated to Ticket 5 — Implement `commitRef` Field Type & `git-notes` Category (ticket 7c785243-17da-44e2-af28-3436a0e92520) rather than built in this session.
- 3 — Near-Duplicate Suppression (ticket c0d494fb-ab8b-447d-916c-48298b701cb7) — rejected a new raw-cosine threshold outright: ADR 0015 and ticket 39 both already found no reliable intermediate cosine band exists on real text, and ticket 1 found a genuine paraphrase slips under 0.97 uncaught. Instead, `findSupersessionCandidate` gets rebuilt as one unified gate — widen to the top-N candidates by cosine (a cheap pre-filter, not a decision), rerank each with the existing `TransformersReranker`, and gate on a freshly-calibrated reranker-score bar (the existing `-8` is tuned for a different, asymmetric task and doesn't transfer). Same CLI surface (`--supersedes`/`--not-a-reversal`/`--if-novel`), now catching near-dup restatements as well as reversals; hit behavior is inherited for free. Implementation graduated to Ticket 6 — Implement Near-Duplicate Suppression (Widen + Rerank Gate) (ticket ab516584-1fc6-4522-a046-2da2397095ab), but Ticket 6 is itself gated on Ticket 7 — Validate Near-Duplicate Detection Approach (A/B Tests) (ticket 4615099c-aebf-4088-ac18-52b55677e61a), created afterward at the maintainer's request to test the reranking-beats-cosine premise itself (plus N-sensitivity, the bar frontier, a real counterfactual store-growth measurement, and a false-positive friction check) before Ticket 6 spends engineering time building against it.
- 4 — Conflict Detection at Write Time (ticket bc1fad4b-9317-4c2f-8cff-1ba8329283e9) — polarity signal is an NLI cross-encoder (`cross-encoder/nli-MiniLM2-L6-H768`), not a heuristic and not a chat model — a deliberate, narrow amendment to this map's own "no new model" non-goal (see Notes), distinct from the pluggable-provider system that stays banned. Layered on Ticket 3/6's relatedness gate as a pre-filter — the NLI model only ever scores candidates that already cleared that bar, never a full-category scan. Hits hard-block on the same `--supersedes`/`--not-a-reversal`/`--if-novel` UX as the existing gate, one consistent resolution path regardless of trigger. Implementation graduated to Ticket 8 — Validate NLI Polarity Detection (A/B) (ticket b8900ad0-0579-4263-98f5-6f8acee75025), gating Ticket 9 — Implement Conflict Detection at Write Time (ticket 78c7b32d-274a-4cac-bab6-55e83fa868b8) — mirroring the Ticket 6/7 precedent.
- 5 — Implement `commitRef` Field Type & `git-notes` Category (ticket 7c785243-17da-44e2-af28-3436a0e92520) — built exactly as ticket 2 specified: `verifyCommitRef` (`src/harnesses/gitLog.ts`) resolves full/abbreviated SHAs via `git rev-parse --verify --quiet <ref>^{commit}`, distinguishing `not-a-git-repo` from `unknown-commit` (an empty-but-real repo correctly reports the latter). Wired into `enforceFieldSchema`'s existing per-field loop alongside `enum`, same choke point, same refused-write-is-never-partial posture. `git-notes` category declared in this repo's own `neuron.yaml` and smoke-tested against real HEAD. ADR 0013 amended (2026-08-15) to record this as one narrow, closed addition to the "string and enum only" type floor — no pluggable-verifier reopening. `npm test` 746/746, `tsc` clean.
- 7 — Validate Near-Duplicate Detection Approach (A/B Tests) (ticket 4615099c-aebf-4088-ac18-52b55677e61a) — split verdict. On a 40-pair synthetic corpus, reranking cleanly beats raw cosine (N=10, bar=3 reaches 0%/0% false-silence/false-accept; no cosine floor does) — A/B 1's premise holds. But the real-store counterfactual (A/B 4, replayed against all 683 live entries in this repo's own store) found that same bar/N flags 214 mostly-false-positive pairs, dominated by content the synthetic corpus never modeled: shared structural templates (`architecture`'s scanner-generated cards, `history`'s wayfinder-session template) and by-design cross-category restatement (`decisions`/`learning` + `history` recording the same ticket twice on purpose) — plus one genuine same-category false positive (two independent `decisions` entries on the same topic, scored 4.72). Ticket 6 re-blocked on new Ticket 10 — Resolve Template/Structural False-Positive Risk Before Building Ticket 6 (ticket d121513e-0942-461b-87d0-77830d44e71a) rather than proceeding on this ticket's bar/N alone. Findings: `docs/design/write-time-quality/near-dup-detection-ab-findings.md`.
- 8 — Validate NLI Polarity Detection (A/B) (ticket b8900ad0-0579-4263-98f5-6f8acee75025) — split verdict, same shape as Ticket 7's. `cross-encoder/nli-MiniLM2-L6-H768` cleanly separates contradiction from paraphrase (0% false-accept at any bar >= 0.7), but does **not** separate contradiction from compatible-related pairs (same topic, different, non-conflicting fact) — 80% false-accept at bar-free argmax alone, still 27% at bar 0.90, only single digits past bar 0.98 at the cost of 40%+ false-silence on real contradictions. Root cause: the model's SNLI/MultiNLI training target reads "premise doesn't mention this fact" as contradiction by design, not miscalibration — and compatible-related pairs are structurally exactly that shape. Secondary finding: the model is reliable on lexical/numeric value-swap contradictions but weak on ones requiring policy/cardinality reasoning. **No-go on Ticket 9's hard-block posture as scoped.** Ticket 9 re-blocked on new Ticket 11 — Resolve Hard-Block Posture Given NLI False-Positive Rate on Compatible-Related Pairs, Before Building Ticket 9 (ticket 5a0b8be0-5f5b-4e2a-a177-c7a3ebe30ea4) rather than proceeding on Ticket 4's refuse-vs-flag assumption unrevisited. Findings: `docs/design/write-time-quality/nli-polarity-detection-ab-findings.md`.
- 10 — Resolve Template/Structural False-Positive Risk Before Building Ticket 6 (ticket d121513e-0942-461b-87d0-77830d44e71a) — split resolution, the two false-positive shapes needed different fixes. Template/structural collision (architecture's 17 + history's ~106 pairs): deterministic template fingerprint/strip against the known fixed templates, no new model — a model-based detector was raised and rejected as reopening the map's own "no new model" non-goal beyond Ticket 4/8's narrow NLI carve-out, when a known fixed string doesn't need a model to recognize it. By-design cross-category restatement (83 pairs, decisions/learning ↔ history ↔ tickets): not a gate problem — the reranker is correctly scoring these as real restatements, so a config-driven allowlist and a taskId exemption were both rejected in favor of fixing the duplication at its source. Graduated to Ticket 12 — Redesign Session-Conclusion Recording to Eliminate Cross-Category Duplication (ticket c29a3c30-95ba-4f63-b74e-037f9d52dce6), which now co-blocks Ticket 6 alongside this ticket. Residual same-category false positive (the two independent `decisions` entries at 4.72): accepted, resolved via the existing `--supersedes`/`--not-a-reversal`/`--if-novel` override — no new mechanism.
- 11 — Resolve Hard-Block Posture Given NLI False-Positive Rate on Compatible-Related Pairs, Before Building Ticket 9 (ticket 5a0b8be0-5f5b-4e2a-a177-c7a3ebe30ea4) — decided to test before deciding, not default to soft-flag outright: rather than picking a fallback posture unvalidated, chartered Ticket 13 — A/B Test Alternative NLI Models for Hard-Block Viability (ticket e5aeaa6a-bc94-4b3e-b6a1-3086924b939e) to test a shortlist of alternative NLI models — prioritizing ANLI-trained ones, which counter the specific SNLI/MultiNLI annotation artifact Ticket 8 traced the failure to, plus one larger same-data model as a control — against Ticket 8's own corpus and joint-bar method. Branches on that result: a model clearing a joint-low false-silence/false-accept bar lets Ticket 9 build hard-block; none clearing it falls back to soft-flag as Ticket 4's refuse-vs-flag choice, narrowly amended for this one signal. Ticket 9 re-blocked on Ticket 13.
- 13 — A/B Test Alternative NLI Models for Hard-Block Viability (ticket e5aeaa6a-bc94-4b3e-b6a1-3086924b939e) — no-go across every candidate tested. Shortlisted two ANLI-trained models (`anli-base`, `anli-large`) plus one larger SNLI/MultiNLI-only control per Ticket 11's criteria; none clears the joint-low false-silence/false-accept bar. Every model, original Ticket 8 baseline included, cleanly separates contradiction from paraphrase — the entire verdict turns on compatible-related pairs, where none improves enough. Ranked by joint-worst: original Ticket 8 model (20%) < `anli-large` (27%) < `anli-base` (40%) < the larger same-data control (60%, dramatically worse — scale alone amplifies the same annotation-artifact bias rather than fixing it). ANLI training helped only when combined with other adversarial/diverse data (`anli-large`), not alone at base scale (`anli-base`). Per Ticket 11's pre-agreed branch, Ticket 9 is unblocked to build **soft-flag**, not hard-block. Findings: `docs/design/write-time-quality/nli-alt-models-ab-findings.md`.
- 12 — Redesign Session-Conclusion Recording to Eliminate Cross-Category Duplication (ticket c29a3c30-95ba-4f63-b74e-037f9d52dce6) — shared `taskId` links a short `history` pointer to its full `decisions`/`learning` entry, replacing today's full restatement in both; write path only, no backfill of the ~219 existing null-`taskId` entries (maintainer call — backfill collides with this map's own out-of-scope non-goal); a follow-on `neuron status --check` finding for drift was explored and declined. Implementation graduated to Ticket 48 — Implement Session-Conclusion Recording Redesign (ticket 707532ee-3377-4822-9111-8f44cff06dde), which now blocks Ticket 6 alongside Ticket 10 — Ticket 6's gate is only safe from the cross-category false-positive shape once sessions actually stop producing full-restatement pairs, not merely once this design is settled. Tracker hygiene, same session: Ticket 9 — Implement Conflict Detection at Write Time was missing a real dependency in its own `blockedBy` — its deliverables assume Ticket 3/6's relatedness pre-filter exists, but Ticket 6 hasn't landed (still blocked); added ab516584-1fc6-4522-a046-2da2397095ab to Ticket 9's `blockedBy` so it stops showing as frontier-unblocked before that foundation exists.

- 48 — Implement Session-Conclusion Recording Redesign (ticket 707532ee-3377-4822-9111-8f44cff06dde) — built Ticket 12's design: CLAUDE.md's `## 2. Session Conclusion` and the `neuron-memory` skill's `## 4. End of Run` both now branch on whether a `decisions`/`learning` entry was written this session — if so it gains `--task-id`, and `history` shrinks to a short pointer sharing that id instead of restating the resolution; if not, `history` keeps its full-narrative shape. Went one layer deeper than the two docs Ticket 12 named: this repo's CLAUDE.md managed block is generated, not hand-written, by `sessionEndStep()` in `src/config/protocolBlock.ts` — updated the generator too and replaced CLAUDE.md's block with its literal output (verified byte-identical) rather than a hand copy that could drift, which also fixed an unrelated pre-existing gap (the block's category list was missing `git-notes`, added by Ticket 5). `npm test` 746/746, `tsc` clean. Ticket 6 — Implement Near-Duplicate Suppression is now fully unblocked (its other two blockers, Ticket 10 and Ticket 12, were already resolved).

- 6 — Implement Near-Duplicate Suppression (Widen + Rerank Gate) (ticket ab516584-1fc6-4522-a046-2da2397095ab) — built exactly as Ticket 3 designed and Ticket 7/10 calibrated: `findSupersessionCandidate` (`src/index.ts`) is now widen-by-cosine (`NEAR_DUP_WIDEN_N=10`) → strip known template boilerplate (new `stripKnownTemplates`, `src/components/templateFingerprint.ts`, implementing Ticket 10's fingerprint decision, no category-name branching) → rerank with the existing `TransformersReranker` → gate on `NEAR_DUP_RERANK_BAR=3`, replacing the old single-candidate 0.97-cosine check. CLI surface (`--supersedes`/`--not-a-reversal`/`--if-novel`) unchanged; the refusal message and `--if-novel` payload now also surface the reranker score alongside cosine. Live-measured via Pillar 14 (real embedder + reranker): case 1's near-dup paraphrase now correctly hard-blocks (reranker score 8.5), closing the exact gap Ticket 1 found; case 2's numeric contradiction also now blocks, since a relevance reranker alone can't yet tell "restates" from "contradicts" — that distinction stays Ticket 9's job, not a defect here. Fixed incidental fallout in several pre-existing subprocess-CLI tests (`hook.test.ts`, `memory.test.ts`, `cli.test.ts`, `history.test.ts`) whose near-templated fixture writes started genuinely tripping the now-always-real write-time reranker; fixed by declaring those writes `--not-a-reversal` at the fixture level, not by weakening the gate. `npm test` 752/752, `tsc` clean.

- 9 — Implement Conflict Detection at Write Time (ticket 78c7b32d-274a-4cac-bab6-55e83fa868b8) — built the soft-flag gate Ticket 13 scoped: new `TransformersNLIClassifier` (`src/components/nliClassifier.ts`, `cross-encoder/nli-MiniLM2-L6-H768`, full precision — Ticket 8/13's calibration never measured a quantized variant) plugs into `src/commands/memory.ts`'s `add` handler between "candidate found" and "decide hard-block" — a candidate with `P(contradiction) >= NLI_CONTRADICTION_BAR (0.90)` downgrades from Ticket 6's hard-block to a non-blocking `possibleConflict` pointer (stderr warning + JSON field, nothing persisted); below the bar, Ticket 6's hard-block (including `--if-novel`) is unchanged. Two open design points this ticket's own text flagged as undecided — surfacing mechanism and the soft-flag bar — were confirmed with the maintainer before building rather than assumed: inline warning only (not a persisted flag state, which would have reopened the map's "no workflow states beyond live/superseded" non-goal), and bar=0.90 (Ticket 8's own findings doc names this the best joint operating point in its sweep — adopted directly since it was already-measured for a lower-cost posture, not invented). Live-measured via Pillar 14: case 2's numeric contradiction now soft-flags (P=0.996) instead of hard-blocking; case 1's paraphrase is unaffected (NLI correctly reads it as compatible, not contradiction). Caught and fixed two real bugs before Pillar 14 could measure anything: a `dtype: 'q8'` mismatch against an uncalibrated model variant, and `env.allowRemoteModels` (a process-wide singleton shared with the reranker) inheriting a stale `false` from an earlier reranker load and blocking this classifier's own first download. `npm test` 757/757, `tsc` clean. This map's frontier is now empty — every ticket 1-13 is resolved; Ticket 6/9's own graduated implementation work is done, and no new tickets or fog were surfaced by either.

## Not yet specified

- **Commit-to-entry knowledge-graph traversal.** Once `commitRef`/`git-notes`
  exist (ticket 5), a commit could carry a real, traversable edge to the
  entries that cite it — the agent hopping from a git-log result to its
  linked `git-notes`/learning entry, and back. Genuinely valuable, raised
  during ticket 2's grilling, and deliberately parked rather than ticketed:
  the codebase currently states outright it has no graph/relationship
  primitive at all (`docs/agents/issue-tracker.md`), and "the basics of a
  knowledge graph" is a much bigger, still-unsharpened question than a
  single reverse lookup — does the edge stay commit-only, or does every
  relationship (e.g. `blockedBy`) eventually become traversable the same
  way? Not decidable until that's scoped, and not this map's destination
  (write-time quality, not read-time traversal) — likely its own future
  effort rather than a ticket here.

- **Vague/low-specificity content detection.** No objective, testable
  definition exists yet — stays fog until one does, not a ticket.

## Out of scope

- **Vague/low-specificity content detection** — no objective test
  criterion exists; explicitly parked as an open question above, not ruled
  out permanently, but not this map's work until one exists.
- **Anything that scores or ranks entries by "truthiness"** — the
  `trust_state` boundary this map deliberately does not cross.
- **Retroactive re-scoring of existing live entries** — this map is about
  the write path going forward, not a backfill/migration pass.
