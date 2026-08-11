Type: task
Status: unclaimed
Blocked by: 22

# 23 — Fidelity-Conditional Command Execution Step

## Question

Once [22](22-implement-precommand-hook.md) ships the real `pre-command`
hook, make `protocolBlock.ts`'s `execStep()` fidelity-conditional the same
way `recallStep()` already is (per [12](12-precommand-hook-vs-exec.md)'s
ruling 4), and sweep the other agent/human-facing surfaces that document
the old `neuron exec`-only story — mirrors
[09](09-update-init-skill-readme-for-git-log-index.md)'s role for the
git-log index.

## Scope

1. `src/config/protocolBlock.ts`: `execStep()` becomes conditional on
   `ProtocolFidelity`, excluded from the generated CLAUDE.md/AGENTS.md for
   a harness with a wired `pre-command` hook (Claude Code, Codex), kept
   for one without (Copilot CLI, Cursor, any unlisted harness) —
   structurally the same branch `recallStep()` already has, not a new
   mechanism.
2. Packaged skill (`.claude/skills/neuron-memory/SKILL.md`) and `README.md`:
   confirm what, if anything, needs updating to tell agents the
   deterministic hook now also covers command-execution lookup, not just
   memory recall and git-log search (git-log's own `09` already added a
   precedent section for this shape).
3. `docs/COMMANDS.md`/`CONTEXT.md` sweep for any description of `neuron
   exec` that assumes it's always agent-invoked.
4. This repo's own `CLAUDE.md`: re-run `neuron init` (or hand-verify byte
   parity per `10`'s established pattern) once `22` ships, so this repo's
   own generated protocol block reflects the new fidelity split.

## Verification

- `npm test` and `tsc --noEmit` clean.
- Generated CLAUDE.md content diffed against the new `protocolBlock.ts`
  output for a Claude-Code-detected project, confirmed the Command
  Execution step is gone.
