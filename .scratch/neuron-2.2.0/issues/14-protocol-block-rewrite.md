Type: task
Status: unclaimed
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

- [ ] Capability-aware protocol block generator
- [ ] `neuron init` writer updated for both variants
- [ ] This repo's `CLAUDE.md` migrated to the short variant
- [ ] Packaged `neuron-memory` skill updated
- [ ] Upgrade path verified for customised existing blocks
- [ ] End-to-end recall confirmed on both a short-block and a full-block harness
