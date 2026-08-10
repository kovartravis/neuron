Type: task
Status: unclaimed
Blocked by: 40
Band: context cost

# 41 — Update Generated Protocol Block, Packaged Skill & README for the Git-Log Index

## Question

Once [40](40-implement-git-log-index.md) ships the git-log index, what
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

- [ ] `protocolBlock.ts` + tests updated
- [ ] Packaged skill updated
- [ ] README updated
- [ ] `docs/COMMANDS.md`/`CONTEXT.md` swept if applicable
- [ ] Unblocks [42](42-dogfood-git-log-index.md)
