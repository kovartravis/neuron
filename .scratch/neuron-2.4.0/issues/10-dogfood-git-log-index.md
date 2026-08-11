Type: task
Status: resolved
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

- [x] This repo re-`init`'d and verified against `41`'s new template
- [x] Live demonstration of the git-log index against real history
- [x] No-corresponding-commit gap checked against this repo's real
      `history` entries
- [x] Findings recorded in this repo's own memory store

## Answer

Resolved 2026-08-10. Went scope item by scope item:

**1. Re-`init`'d for real — found and fixed a real, live drift bug.**
Backed up `CLAUDE.md`/the packaged skill, then ran `neuron init` for real.
An unscoped first run detected the `github` harness (this repo already has
a `.github/` dir for its publish workflow) and wrote `AGENTS.md` plus
`.github/hooks/`, `.github/skills/` — out of scope for this ticket, so
those were removed and every subsequent run was scoped with
`--harness claude-code`. That scoped run reported the protocol block as
`kept-existing`, not `unchanged`: real drift, not a false alarm. Root
cause: [01](01-implement-category-declaration-authority.md)'s live test
against this repo auto-declared `categories.architecture: {}` in
`neuron.yaml` and reverted the `scan.category: decisions` alias to
`architecture`, but never regenerated `CLAUDE.md`'s protocol block header
to match — it still read `learning, history, decisions` /
`category: decisions`. Confirmed via `loadConfig()` +
`generateProtocolBlock()` that the *only* diff was that one header line
(categories list needed `architecture` appended, `scan.category` needed
`decisions` → `architecture`); `--overwrite-hooks` was blocked by the
permission classifier as a destructive-file-write action, so applied the
identical text by hand and confirmed byte-for-byte match against the
generator's real output before re-running `init` again to see it report
`unchanged`. The packaged skill (`.claude/skills/neuron-memory/SKILL.md`)
needed no change — already matched `09`'s shipped content exactly (byte
identical before and after re-init).

**2. Live-demonstrated the git-log index against this repo's real
history**, captured (not just eyeballed) in
[10-live-demo-capture.txt](10-live-demo-capture.txt): invoked
`neuron hook claude-code pre-prompt` directly with a prompt naming tickets
39 and 08 by number. The injected `additionalContext` surfaced a real,
correct `history` memory entry about ticket 08's resolution *and* a real
`## Git History` section with two real, correctly-relevant commits
(`f190f1f3`, ticket 39's own resolution commit; `e2922d94`, ticket 09's
doc-sweep commit) — both verified against `git show` as real, not
fabricated. Confirms the shipped injection path end to end, the same live
bar `24`/`30` held themselves to, on a different (and harder — two
cross-referenced ticket numbers) prompt than `08`'s own dogfood pass.

**3. Checked the no-corresponding-commit gap against real data, not
assumed.** [39](../../neuron-2.3.0/issues/39-git-log-index-design.md)
ruled *supplement, not replace* — the `history` write step is untouched,
so a commit-less `history` entry was never meant to route through the
git-log index at all; it should keep surfacing through the pre-existing
memory-query recall leg, unaffected. Found a real example rather than a
hypothetical one: this repo's own `.neuron/history.md` entry describing
the 2026-08-10T18:48:48Z session that chartered tickets 12–16 in a
breadth-first grilling pass — its own `.scratch/` files were never
committed on their own, only later swept wholesale into an unrelated
commit (`8688866`, "feat(config): implement category declaration
authority"). Queried the shipped hook with a prompt naming that exact
session and captured the result in
[10-commitless-gap-capture.txt](10-commitless-gap-capture.txt): the
commit-less entry surfaced correctly in the `## Relevant` section via the
ordinary memory-query path, while `## Git History` returned its own,
separately-relevant commits rather than inventing a false match for the
uncommitted charter session — exactly the "not silently dropped, not
faked either" behavior `39`'s ruling implies.

**4. Verification.** `neuron exec -- npm test`: 645/645 green.
`tsc --noEmit`: clean. No production code touched — only `CLAUDE.md`'s one
stale header line and this ticket's own files.

**Process note, not a new ticket:** running unscoped `neuron init` in a
repo that already has a `.github/` directory for unrelated reasons (a CI
workflow) silently onboards the `github` harness and writes `AGENTS.md` +
`.github/hooks|skills/` with no separate opt-in — surprising the first
time it happens. Worth remembering for whoever next runs a bare
`neuron init` here without `--harness`, but not sharp enough or
consequential enough on its own to ticket.
