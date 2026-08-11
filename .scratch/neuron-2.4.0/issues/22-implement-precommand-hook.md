Type: task
Status: unclaimed
Blocked by: none

# 22 — Implement the Pre-Command Hook

## Question

Build the `pre-command` lifecycle point [12](12-precommand-hook-vs-exec.md)
ruled: a `PreToolUse`-driven hook for Claude Code and Codex CLI that runs
the same gated `onExec` lookup `neuron exec` performs today
(`src/commands/exec.ts`'s `resolveExecCategories`/`queryGated`), fired
automatically on every bash/shell tool call instead of only when the agent
remembers to type `neuron exec -- <command>`.

## Scope

1. Add `'pre-command'` to `LifecyclePoint`
   (`src/harnesses/types.ts`) — fourth value alongside `session-start`,
   `pre-prompt`, `context-reset`. `CapabilityMap`/`SupportRecord` shape is
   unchanged (per `12`'s ruling 2): `injects`, `payloadCapChars`,
   `failurePosture`, `timeoutMs`. Do not add a field for `PreToolUse`'s
   `permissionDecision` gate — neuron never sets it.
2. Wire real capability records for `ClaudeCodeAdapter`
   (`src/harnesses/claudeCode.ts`) and `CodexAdapter`
   (`src/harnesses/codex.ts`) — confirm the exact payload cap, failure
   posture, and timeout for `PreToolUse` specifically against each
   harness's docs (don't assume the same numbers as `pre-prompt` without
   checking; `12`'s research only confirmed the injection *capability*
   exists, not that every other field matches `pre-prompt`'s record
   verbatim). Copilot CLI and Cursor's adapters get `injects: false` for
   `pre-command`, matching `12`'s ruling 1 — no capability-map entry that
   implies a future fix will change this.
3. Add the hook handler (`src/commands/hook.ts`, alongside the existing
   `session-start`/`pre-prompt`/`context-reset` branches): on
   `pre-command`, extract the command text from the harness's own stdin
   shape (verify the actual field per harness empirically — e.g. Claude
   Code's `tool_input.command` for the `Bash` tool — the same
   "verify against real hook input, don't assume" discipline ADR 0014 §3
   already required for session identity), then reuse `exec.ts`'s
   `resolveExecCategories`/`queryGated` call path and emit
   `additionalContext` the same way `pre-prompt` already does.
   Non-bash tool calls (file edits, etc.) should no-op, not query.
4. Degrade toward silence on failure/missing input, same posture as every
   other lifecycle point (ADR 0014, "must degrade toward 'skip this
   feature' rather than fail the turn").

## Verification

- Unit tests for the handler (mirroring `hook.test.ts`'s existing
  per-point coverage) including: a real `onExec` match injects
  `additionalContext`; no match stays silent; a non-bash tool call is a
  no-op; a missing/malformed stdin field degrades to silence, not a
  crash.
- `npm test` and `tsc --noEmit` clean.
