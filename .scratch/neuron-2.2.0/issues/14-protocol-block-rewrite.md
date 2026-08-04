Type: task
Status: resolved
Blocked by: 12, 13
Band: 2.2.0-rc3

# 14 — Protocol Block Rewrite: Hooks Own Read, Agent Owns Write

## Question

What does the memory-store protocol block say once the harness performs recall —
and how does it say something *different* on a harness that cannot?

## The settled decision

**Hooks own the read side; instructions keep the write side.**

- **Step 1** (*"your VERY FIRST tool call MUST be to query the memory store"*) is
  **deleted** on deterministic harnesses. The harness does it.
- **Steps 2–4** stay as instructions: `neuron exec` wrapping, failure-fix
  recording, session-conclusion logging.

The reasoning: recall is a retrieval problem, which a hook solves completely.
Capture is an **editorial** problem — deciding what was worth learning from a
session is judgment, and neither a hook nor a 0.5B model can supply it. Steps 3
and 4 stay with the agent because the agent is the only participant that knows
what happened.

A secondary gain: the block stops claiming "MANDATORY" for something nothing
enforced. After this ticket, what it mandates is what the agent alone can do.

## Scope

1. Rewrite the generated protocol block: step 1 removed, steps 2–4 retained and
   renumbered.
2. **Make the block capability-aware.** This is the substance of the ticket. A
   deterministic harness gets the short block; an `instruction-only` harness keeps
   step 1, because there nothing else performs recall. One generator, output
   varying by the capability model from `11`.
3. Update `neuron init`'s writer for both variants.
4. Update this repo's own `CLAUDE.md` — neuron dogfoods its own protocol, and it
   is a Claude Code project, so it takes the short variant.
5. Update the packaged skill at `.claude/skills/neuron-memory/SKILL.md`, which
   ships in the npm tarball and currently teaches the 4-step loop.
6. Remove the *"if no results return, try a broader keyword"* workaround if
   ticket `07` shipped query expansion.
7. Confirm existing users' customised blocks upgrade cleanly rather than being
   silently rewritten with content they had edited.

## Verification

- On a Claude Code project with the short block, confirm recall still happens —
  this is the end-to-end proof that `12` replaced step 1 rather than merely
  supplementing it.
- On an `instruction-only` harness, confirm step 1 survives. A harness losing its
  only recall mechanism to a doc rewrite is the sharpest regression risk here.

## Deliverables

- [x] Capability-aware protocol block generator
- [x] `neuron init` writer updated for both variants
- [x] This repo's `CLAUDE.md` migrated to the short variant
- [x] Packaged `neuron-memory` skill updated
- [x] Upgrade path verified for customised existing blocks
- [x] End-to-end recall confirmed on both a short-block and a full-block harness

## Answer

Built from scratch, not just edited: there was no existing `CLAUDE.md`/`AGENTS.md`
writer anywhere in `neuron init` to modify — `harnesses.json`'s `mdFile` field
was already declared but unused, and this repo's own `CLAUDE.md` protocol block
was hand-authored, not generated. So the deliverable is a new module,
`src/config/protocolBlock.ts`, plus its wiring into `init.ts`.

**One generator, two variants.** `generateProtocolBlock({ fidelity, config })`
produces a marker-wrapped (`<!-- neuron:protocol:start/end -->`) markdown block.
`fidelity: 'deterministic'` drops the old step 1 entirely and renumbers
Command Execution / Failure-Fix Recording / Session Conclusion down to 1–3;
`fidelity: 'fallback'` keeps Recall as step 1 (unnumbered "MANDATORY"/"VERY
FIRST tool call MUST be" framing removed throughout, per the ticket's own
rationale that nothing enforces those steps beyond the agent's own diligence).
Categories and the architecture-scan line are read live from `neuron.yaml`
rather than hand-typed, so the block can't drift from the config the way the
hand-authored original had (its "Architecture scan settings" line happened to
be accurate for this repo's own config by luck, not by construction).

**Fidelity is resolved from ground truth, not from this run's flags.**
`resolveHarnessFidelity` in `init.ts` calls each adapter's `capability()` +
`verify(projectDir)` — a harness only earns `'deterministic'` if it has an
adapter, `deriveFidelity` says `'deterministic'`, *and* every injecting
lifecycle point is actually registered on disk right now. That means a hook
installed by an earlier `init` still yields the short block even if this
invocation passed `--no-hooks`, and `--no-hooks` on a project with no prior
hook correctly falls back to the full block (verified in
`init.test.ts`). Several harness names can share one `mdFile` (`agents`/
`github`/`codex` all point at `AGENTS.md`) — per ADR 0014 §8.1, that file gets
the short block the moment *any* harness targeting it has a working hook, so a
`.agents/` + `.codex/` project's `AGENTS.md` goes short once Codex is wired
(also verified).

**Upgrades ask, matching the hooks' own posture (ADR 0014 §7).**
`upsertProtocolBlock` finds the marker pair and replaces only that region — a
brand-new insertion into a file with no prior block never asks (nothing to
conflict with), but replacing a *differing* existing managed region reuses the
same `--overwrite-hooks`/`--keep-hooks`/interactive-prompt machinery
`installHooks` already has, rather than inventing a parallel flag pair. An
identical existing block is left untouched (`action: 'unchanged'`), so
`init` is idempotent and doesn't rewrite the file every run.

**Scope items resolved as no-ops:** item 6 (drop the "try a broader keyword"
workaround) doesn't apply — ticket `07` never shipped, it's out of scope, so
the workaround line stays in the fallback variant. The packaged skill (item
5) got a narrow, scoped addition rather than the full read-side restructure
the map's "Not yet specified" section already flagged as still-fogged: a
callout at the top of `## 1. Beginning of Run` saying to skip manual querying
entirely on a harness with a wired deterministic hook, same shape as tickets
`26`/`45`'s prior narrow corrections to that file.

**Found and fixed one bug while wiring this in**: `copySkill`'s own
`.agents/skills` fallback (when no harness is detected) creates `.agents/` as
a side effect, and a naive re-scan of the filesystem for "detected harnesses"
after that ran would then mistake its own side effect for a detected `agents`
harness. Fixed by snapshotting `detectedHarnessNames` once, before `copySkill`
or `installHooks` touch the filesystem, and threading that snapshot into
`writeProtocolBlocks` instead of re-scanning — covered by
`'writes nothing when no harness is detected'` in `init.test.ts`.

15 new unit tests (`protocolBlock.test.ts`) plus 6 new CLI-level tests
(`init.test.ts`), all green; full suite otherwise unaffected (the 4 failing
files are ticket `42`'s pre-existing CLI/real-store pollution bug, reproduced
identically on the pre-ticket-14 code before any of these changes landed).
