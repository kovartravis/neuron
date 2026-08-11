Type: grilling
Status: resolved
Blocked by: none

# 12 — Should `neuron exec`'s Pre-Command Lookup Become a Hook Instead?

## Question

Step 1 of the deterministic protocol block (Command Execution) still asks
the agent to wrap commands itself: `neuron exec -- <command>`. That is an
instruction the agent may or may not follow — exactly the failure mode
[ADR 0014](../../../docs/adr/0014-recall-adapter-architecture.md) exists to
eliminate for per-turn recall, which now runs through a native harness hook
instead of an instruction wherever a harness supports it.

The prerequisite fact this ticket depends on is now settled: with
[neuron-2.3.0's `01`](../../neuron-2.3.0/issues/01-github-copilot-cli-adapter.md)
(Copilot CLI) and [`02`](../../neuron-2.3.0/issues/02-cursor-adapter.md)
(Cursor) both resolved, all four shipped harness adapters (Claude Code,
Codex CLI, Copilot CLI, Cursor) now expose some real hook point ADR 0014
already classified — two `deterministic`, two `best-effort`. So the
question is no longer "do harnesses even have a hook point for this" — it's
whether pre-command lookup should move onto that same adapter
infrastructure the way pre-prompt recall already did, or stay an
instruction-driven `neuron exec` wrapper.

Resolve, at minimum:
- Does this reopen [ADR 0014](../../../docs/adr/0014-recall-adapter-architecture.md)
  itself (a new `HarnessAdapter` lifecycle point, e.g. a `PreToolUse`-style
  hook for shell/bash tool calls) or introduce a new, adjacent ADR?
- What capability tier does pre-command lookup get per harness — does it
  inherit the same `deterministic`/`best-effort` split ADR 0014 already
  drew for recall, or does bash/shell tool interception have different
  reliability per harness that needs its own accounting?
- What happens to the `## Memory Store Protocol` block's Command Execution
  step and the `onExec` rules in `neuron.yaml` if the wrapping becomes
  automatic — does the instruction get deleted the way the deterministic
  variant already deletes the "query the store first" step for pre-prompt
  recall, or does it stay as a fallback for harnesses without the hook?
- Does this affect `neuron exec`'s CLI surface at all, or only which
  mechanism triggers the lookup (hook-invoked vs. agent-invoked, same
  underlying query path either way)?

This ticket's resolution is a direct input to
[13 — Audit: Dogfooding Gaps in This Repo](13-audit-dogfooding-gaps.md),
which should audit against whatever mechanism this ticket lands on rather
than the current `neuron exec` convention it might replace — hence the
blocking edge.

## Answer

Resolved by direct maintainer grilling, 2026-08-10/11 — four decisions,
recorded as [ADR 0014's 2026-08-10 amendment](../../../docs/adr/0014-recall-adapter-architecture.md#2026-08-10--fourth-lifecycle-point-pre-command-claude-code-and-codex-only):

1. **Scope: Claude Code and Codex CLI only, permanently.** Both confirmed
   to support `PreToolUse`/`additionalContext` injection (Claude Code
   verified live against `code.claude.com/docs/en/hooks`; Codex from
   ticket 10's 2.2.0 research). Copilot CLI's `preToolUse` and Cursor's
   `beforeShellExecution` are both documented permission/gating-only, with
   no context-carrying field at all — a structural ceiling, not a research
   gap. They keep the CLAUDE.md/AGENTS.md-instructed `neuron exec` step
   permanently, the same as they already do for recall.
2. **Amends ADR 0014; does not need a new ADR.** `pre-command` reuses
   `CapabilityMap`/`SupportRecord` unchanged. `neuron exec`'s behavior is
   purely informational (never blocks the real command), so the new
   handler only ever sets `additionalContext`, never `PreToolUse`'s
   `permissionDecision` gate field — no new field earns its place on
   `SupportRecord`.
3. **Timing nuance, raised and resolved live**: Claude Code's docs place
   `PreToolUse`'s `additionalContext` "next to the tool result" — after
   the command runs, not before. Confirmed as functionally equivalent to
   today's `neuron exec` (which also can't let the agent reconsider
   mid-execution — it queries, prints, then spawns the real command
   synchronously in the same tool call), not a regression.
4. **`protocolBlock.ts`'s `execStep()` becomes fidelity-conditional**, the
   same way `recallStep()` already is — excluded for Claude Code/Codex once
   the hook ships, kept for Copilot/Cursor. `neuron exec`'s CLI surface is
   otherwise unchanged: same `onExec`/`queryGated` logic
   (`src/commands/exec.ts`), called from a hook instead of an
   agent-typed wrapper for the two harnesses that get one.

Implementation graduated as three tickets rather than designed further
here, mirroring this map's own `08`/`09`/`10` split for the git-log index:
[22 — Implement the Pre-Command Hook](22-implement-precommand-hook.md)
(adapter capability wiring + the `pre-command` handler),
[23 — Fidelity-Conditional Command Execution Step](23-fidelity-conditional-exec-step.md)
(`execStep()` + CLAUDE.md/packaged-skill/README updates), and
[24 — Dogfood the Pre-Command Hook in This Repo](24-dogfood-precommand-hook.md)
(live verification against this repo's own install).

## Comments

- Graduated 2026-08-10 from the map's own standing "Not yet specified" fog
  entry (moved from neuron-2.3.0 2026-08-10) once its stated prerequisite —
  the Copilot/Cursor adapters shipping — was confirmed resolved.
- Surfaced during a breadth-first grilling session chartering two new
  threads onto this map (repo-wide neuron dogfooding, and repo cleanup for
  readability); the maintainer asked for this to be added mid-session once
  the dogfooding-audit ticket's shape made the dependency concrete.
