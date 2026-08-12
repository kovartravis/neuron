Type: task
Status: resolved
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

## Answer

Built exactly the four scope items:

1. **`protocolBlock.ts`'s `execStep()` made independently fidelity-
   conditional**, mirroring `recallStep()`'s existing treatment rather than
   coupling to it. `ProtocolBlockOptions` gained a second `execFidelity:
   ProtocolFidelity` field alongside `fidelity` (recall); `generateProtocolBlock`
   now builds its step list by checking each independently and numbering by
   position (`recallStep()`'s own heading stays hardcoded `## 1. Recall`
   since, whenever present, it's always first). Four states are now
   reachable — both hooked (neither manual step), recall-only, exec-only,
   neither — not just the previous two.
2. **`init.ts` wired to compute `execFidelity` the same way `fidelity` is
   computed**, not assumed identical: generalized `resolveHarnessFidelity`
   to take a `points: readonly LifecyclePoint[]` parameter, added
   `EXEC_LIFECYCLE_POINTS = ['pre-command']` beside the existing
   `RECALL_LIFECYCLE_POINTS`, and `writeProtocolBlocks` now derives both
   fidelities per `mdFile` group from `adapter.verify()`'s real registration
   state rather than inferring exec fidelity from recall fidelity — a
   project can (and, until `24` dogfoods this repo's own install, currently
   does) have recall wired without pre-command wired. `ProtocolWriteReport`
   gained `execFidelity` for the same transparency `fidelity` already gets
   in `neuron init`'s JSON output.
3. **Packaged skill and docs swept**, not just the generator:
   `.claude/skills/neuron-memory/SKILL.md`'s `## 2. Pre-Command Memory
   Lookup & Execution` section gained the same `[!IMPORTANT]` skip-this-
   section framing `## 1. Beginning of Run` already carries for recall,
   noting the Copilot/Cursor split is a permanent structural ceiling (ADR
   0014's 2026-08-10 amendment), not a future-adapter gap. `README.md`
   gained a new "Command execution gets the same treatment as recall"
   subsection (same shape as `09`'s git-log precedent) under the recall-
   fidelity discussion. `docs/COMMANDS.md`'s `neuron init` and `neuron hook`
   sections were missing `pre-command` entirely (only listed the three
   recall points) — added. `CONTEXT.md`'s **protocol block** and
   **pre-command lookup** glossary entries were flatly wrong post-`22`
   (described one fidelity variant and a CLI-only mechanism); rewritten to
   describe both independent fidelities and both reachable paths (CLI
   wrapper, always available; `pre-command` hook, Claude Code/Codex only).
4. **This repo's own `CLAUDE.md` checked, not blindly regenerated.**
   Hand-verified byte parity per `10`'s established pattern: generated a
   block via the built `generateProtocolBlock()` against this repo's real
   `neuron.yaml` with `fidelity: 'deterministic'`, `execFidelity: 'fallback'`
   (this repo's own `.claude/settings.json` has no `PreToolUse` entry yet —
   installing it is `24`'s dogfooding job, still blocked until this ticket
   resolved) and diffed it against `CLAUDE.md`'s current managed region:
   byte-identical. No file change needed; re-running `init` here now would
   also silently install the `pre-command` hook, stepping on `24`'s own
   scope, so deliberately left un-run.

**Verification**: `tsc --noEmit` clean. `npm test`: 678/678 (was 676 going
in; two new `protocolBlock.test.ts` cases cover the exec-only and
recall-only combinations `generateProtocolBlock` can now produce).
`init.test.ts`'s Claude-Code protocol-block test renamed and its assertion
flipped from asserting `## 1. Command Execution` present to asserting
`Command Execution` absent entirely and `## 1. Failure-Fix Recording` in
its place — the fresh-project CLI path installs both recall and
pre-command hooks together via `LIFECYCLE_POINTS`, so a real `neuron init`
against a clean Claude Code project now produces the fully-deterministic,
zero-manual-step block. Five other `protocol block wiring` tests gained
`execFidelity` assertions alongside their existing `fidelity` ones for
symmetry. Unblocks `24` directly (its only remaining blocker along with the
already-resolved `22`).
