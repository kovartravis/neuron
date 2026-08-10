Type: grilling
Status: unclaimed
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

## Comments

- Graduated 2026-08-10 from the map's own standing "Not yet specified" fog
  entry (moved from neuron-2.3.0 2026-08-10) once its stated prerequisite —
  the Copilot/Cursor adapters shipping — was confirmed resolved.
- Surfaced during a breadth-first grilling session chartering two new
  threads onto this map (repo-wide neuron dogfooding, and repo cleanup for
  readability); the maintainer asked for this to be added mid-session once
  the dogfooding-audit ticket's shape made the dependency concrete.
