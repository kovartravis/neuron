Type: task
Status: resolved
Blocked by: 08
Band: context cost

# 09 — Update Generated Protocol Block, Packaged Skill & README for the Git-Log Index

## Question

Once [40](08-implement-git-log-index.md) ships the git-log index, what
does `neuron init` generate differently, what does the packaged
`neuron-memory` skill tell agents to do differently, and what does the
README claim — so that all three actually match what the shipped feature
does, rather than describing the pre-`40` world?

## Context

This map's own destination (map.md's "Destination" section) commits to
"what neuron *claims* matches what it *does*" for every config shape and
token claim — this ticket is that discipline applied to `40`'s change
specifically, the same sweep `06` did for its own storage-vocabulary
change (scaffold template, README, `docs/COMMANDS.md`, `CONTEXT.md`,
`TEST_INFRA.md`, the packaged skill).

Three concretely different surfaces, confirmed by direct investigation
this session (not assumed):

1. **`src/config/protocolBlock.ts`** generates the actual deterministic
   block `neuron init` writes into a project's `AGENTS.md`/`CLAUDE.md`
   between `<!-- neuron:protocol:start -->`/`<!-- neuron:protocol:end -->`
   markers — dynamically, per-project, interpolating that project's own
   `neuron.yaml` `categories` (`headerSection()`/`recallStep()`, confirmed
   this session: this repo's own root `CLAUDE.md` is neuron-generated
   output, not hand-written, and matches the template exactly against
   this repo's own `neuron.yaml`). If `39` ruled the `history` write step
   changes (replace or modify), `sessionEndStep()` needs to change to
   match, and every already-`init`'d project (including this repo) needs
   a re-`init` to pick it up.
2. **`.claude/skills/neuron-memory/SKILL.md`** — copied byte-identical
   into every project by `copySkill()` (`src/config/harness.ts`), no
   templating at all. Its own prose currently tells the agent to hand-sync
   `AGENTS.md` with `neuron.yaml` categories; if `40` changes what
   categories/write-steps exist, this file's prose needs the matching
   update, same as `06`'s skill sweep did.
3. **`README.md`** — currently doesn't document the protocol-block
   category-interpolation mechanism at all (confirmed: only says `init`
   "detects CLAUDE.md/AGENTS.md" and other harnesses "fall back to an
   instruction in CLAUDE.md/AGENTS.md", README.md:73,102). Needs whatever
   claim `40` actually earns — including an honest disclosure if `39`
   ruled "no measured difference" is the accurate characterization rather
   than a clean win, matching this map's own bar for honesty on `15`'s
   benchmark publication.

## Scope

1. Update `src/config/protocolBlock.ts` per `39`'s history-write-step
   ruling, with tests for the new generated output.
2. Update `.claude/skills/neuron-memory/SKILL.md`'s prose to match.
3. Update `README.md` to document the git-log index honestly (what it
   does, what it costs, what `14`'s actual measured result was).
4. Sweep `docs/COMMANDS.md`/`CONTEXT.md` the same way `06` did, if either
   references the `history` write step or the protocol block's shape.
5. Re-verify (don't just assume) that an existing `<!-- neuron:protocol:*
   -->`-marked file re-`init`s cleanly with the new block shape —
   idempotent upsert, not a duplicate block.

## Verification

- `npm test` green, `tsc --noEmit` clean.
- A real `neuron init` run against a fixture project shows the new block
  shape, not the old one.
- README's claim about the git-log index matches `14`'s actual numbers,
  not a rounded-up "faster" claim — same discipline `10`'s findings
  demanded of `03`/`04`.

## Deliverables

- [x] `protocolBlock.ts` + tests updated
- [x] Packaged skill updated
- [x] README updated
- [x] `docs/COMMANDS.md`/`CONTEXT.md` swept if applicable
- [x] Unblocks [10](10-dogfood-git-log-index.md)

## Answer

Resolved 2026-08-10. Went scope item by scope item:

**1. `protocolBlock.ts`: no code change, confirmed rather than assumed.**
[39](../../neuron-2.3.0/issues/39-git-log-index-design.md) ruled *supplement,
for now* on the history-write-step question — `sessionEndStep()` stays
exactly as-is, a full replace was explicitly deferred pending a design for
commit-less entries. Grepped `protocolBlock.ts` and its own tests to confirm
no `git`/`gitLog` reference exists anywhere in the generated block, matching
the existing precedent that hook-injected content the agent never has to
invoke (the architecture card, ticket 06's discovery hint) isn't described
in the protocol block either — only agent-actioned steps are. No new tests
needed since no new output exists; the pre-existing `protocolBlock.test.ts`
assertions (`## 3./4. Session Conclusion`) and `init.test.ts`'s "re-running
init leaves an unchanged protocol block alone" test already pin this shape
and both stayed green.

**2. Packaged skill updated.** `.claude/skills/neuron-memory/SKILL.md`
section 1's "skip this section on a deterministic harness" note now also
says the same pre-prompt hook searches an indexed copy of this repo's own
`git log` and injects relevant commits — so a manual `git log`/`git show`
search for past-decision context is redundant here too, not just memory
lookup — plus the ticket-number-collision caveat, since an agent trusting a
specific number from injected content without that caveat could act on a
decoy commit from a different wayfinder map.

**3. README updated — honestly, per the ticket's own bar.** Added "Your git
history is a searchable resident source too" right after the harness
fidelity table: what it does (pre-prompt-only, semantic match, ADR
0012-style gate), what it costs (~1,000 chars, additive, same epoch budget),
which harnesses get it (Claude Code/Codex CLI only — Copilot/Cursor have no
per-turn hook to key off), and the ticket-collision caveat. Deliberately
**did not** claim `14`'s favorable numbers as the shipped mechanism's own
result: `39`'s own Answer found that result was measured against
hand-picked oracle search terms, and the real semantic mechanism's own A/B
([11](11-rerun-gitlog-ab-semantic-mechanism.md)) hasn't run yet. Framed as
"surfaces real, correct commits" (true, confirmed by `08`'s own live
dogfood) rather than a quantified win — the same "no measured difference"
honesty this ticket's own Context called for.

**4. `docs/COMMANDS.md` swept, one line updated.** The `neuron hook
<harness> pre-prompt` description now mentions the gated commit-history
search alongside the memory query, pointing at the new README section for
detail rather than duplicating it. **`CONTEXT.md` swept, one glossary entry
added** ("git-log index") describing the table, the check-HEAD-on-read
refresh, the ADR 0012-style gate reuse, and the no-markdown-mirror
distinction from `memories` — matching the existing entries' depth and
style. `TEST_INFRA.md` was in `06`'s (neuron-2.3.0) own sweep but not named
in this ticket's own Scope item 4 — checked anyway: it documents only the
`md-file-management` E2E pillars, nothing about hooks, protocol blocks, or
git history, so there was nothing relevant to change.

**5. Idempotent re-init re-verified, not assumed.** Since the generated
block is byte-identical to before this ticket, `init.test.ts`'s existing
"re-running init leaves an unchanged protocol block alone" integration test
(asserting `action: 'unchanged'`) already covers this claim directly — ran
it as part of the full suite rather than treating "nothing changed" as
self-evidently safe.

**Verification:** `npm test` (645/645) and `tsc --noEmit` both clean — no
production code touched, only markdown/docs, so the only risk was a stale
assumption about the generated block, which the pre-existing tests above
rule out.

Unblocks [10 — Dogfood the Git-Log Index in This Repo](10-dogfood-git-log-index.md).
