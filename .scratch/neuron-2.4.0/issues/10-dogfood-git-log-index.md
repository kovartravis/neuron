Type: task
Status: unclaimed
Blocked by: 08, 09
Band: context cost

# 10 — Dogfood the Git-Log Index in This Repo

## Question

Once [40](08-implement-git-log-index.md) and
[41](09-update-init-skill-readme-for-git-log-index.md) ship, does running
the shipped feature for real against this repo's own git history and its
own `neuron.yaml`/`CLAUDE.md`/skill install actually work end to end — the
same live-demonstration bar `28`/`30` held themselves to, not just green
tests against synthetic fixtures?

## Context

The maintainer directly asked for this as a distinct step from building
the feature ("we need to... start dogfooding this"), matching the pattern
this repo already follows for its own tooling: this repo's root
`CLAUDE.md`, `.neuron/`, and `.claude/skills/neuron-memory/SKILL.md` are
themselves neuron's own dogfood output, not just documentation about it.

## Scope

1. Re-run `neuron init` against this repo for real, confirm the
   regenerated `CLAUDE.md` protocol block matches `41`'s new template
   (idempotent upsert against the existing marker-bounded block, not a
   duplicate or a destructive rewrite).
2. Confirm the packaged skill at `.claude/skills/neuron-memory/SKILL.md`
   in this repo's own tree matches `41`'s updated version.
3. Live-demonstrate the git-log index against this repo's own real
   history: a prompt referencing a real past ticket/decision should
   surface real, correct git-log content through the shipped injection
   path — captured the same way `24`'s `captured-card.txt` and `30`'s
   live demonstration were.
4. If `39` ruled "replace" for the `history` write step, confirm this
   repo's own `history` category entries with no corresponding commit
   (audit `.neuron/history.md` for any) are handled per `39`'s ruling for
   that gap, not silently dropped.
5. Record in this repo's own `decisions`/`history` categories (via the
   protocol this ticket's own resolution follows) that the dogfood pass
   happened and what it found.

## Verification

- Live demonstration against this repo's real git history and real
  `.neuron/` store, not synthetic fixtures.
- No regression in this repo's own `npm test`/`tsc --noEmit` after
  re-`init`.
- The no-corresponding-commit gap explicitly checked against this repo's
  real data, not assumed away.

## Deliverables

- [ ] This repo re-`init`'d and verified against `41`'s new template
- [ ] Live demonstration of the git-log index against real history
- [ ] No-corresponding-commit gap checked against this repo's real
      `history` entries
- [ ] Findings recorded in this repo's own memory store
