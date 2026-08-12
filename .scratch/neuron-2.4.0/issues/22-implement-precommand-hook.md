Type: task
Status: resolved
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

## Answer

Built exactly the four scope items, all against real, direct-fetched harness
docs rather than assumed numbers:

1. **`pre-command` added as `LifecyclePoint`'s fourth value**
   (`src/harnesses/types.ts`), `CapabilityMap`/`SupportRecord` unchanged —
   no `permissionDecision` field, per `12`'s ruling 2.
2. **Capability records, verified live, not carried over from `pre-prompt`**:
   - **Claude Code**: `injects: true`, `payloadCapChars: 10000` (same cap as
     every other point — confirmed shared), `failurePosture: 'fail-open'`,
     `timeoutMs: 600000` — direct fetch of `code.claude.com/docs/en/hooks`
     confirmed `PreToolUse` uses the general 600s command-hook default, **not**
     `UserPromptSubmit`'s own 30s figure, and fails open on timeout/error/
     non-zero exit regardless (the tool call proceeds through normal
     permission flow either way).
   - **Codex CLI**: `injects: true`, `payloadCapChars: 7500` (same
     token-to-character conversion as its other points), `failurePosture:
     'fail-open'`, `timeoutMs: 600000` — direct fetch of
     `learn.chatgpt.com/docs/hooks` confirmed identical `tool_name`/
     `tool_input.command` stdin fields to Claude Code's, and that an erroring
     hook is marked failed/reported but never blocks the tool call.
   - **Copilot CLI and Cursor**: `injects: false` permanently, per `12`'s
     ruling 1 — confirmed by direct fetch, not inferred: Copilot's
     `preToolUse` only returns `permissionDecision`/`permissionDecisionReason`/
     `modifiedArgs` (`additionalContext` is documented as specific to
     `postToolUse`/`notification`); Cursor's `beforeShellExecution` only
     returns `{permission, user_message, agent_message}`. Neither has any
     context-carrying field at all — a structural ceiling, not a research
     gap that could close later.
3. **Hook handler** (`src/commands/hook.ts`): a new `extractBashCommand()`
   helper (shared with the existing `runPostToolUse` measurement point,
   which read the same `tool_name`/`tool_input.command` fields inline) reads
   the command text and returns `undefined` for any non-`Bash` tool call,
   which the `pre-command` branch treats as a no-op before ever touching the
   store. A real command reuses `exec.ts`'s `resolveExecCategories`/
   `queryGated` call path verbatim, packs the gated results via the existing
   `buildPayload` under a new `PRE_COMMAND_CHAR_BUDGET` (1500 chars,
   `src/harnesses/payload.ts`), and emits through the existing per-harness
   `emit()` — no new envelope branch needed, `PreToolUse` reuses the same
   `hookSpecificOutput` wrapper Claude Code/Codex's other points already use.
   Deliberately **not** wired into the session-ledger epoch budget: unlike
   `session-start`/`pre-prompt`, `pre-command` fires per tool call rather
   than per turn and has no ledger of its own to dedupe or budget against
   yet (left as a fixed per-injection cap; a future ticket can decide whether
   it needs one).
4. **Silence-on-failure**: no new failure path — reuses the same
   `withTimeout`-wrapped, try/catch-swallowed `runHook` call every other
   point already goes through (`HOOK_TIMEOUT_MS['pre-command'] = 8000`,
   matching `pre-prompt`'s inner budget for a similarly-shaped
   embed-and-query call).

**Found and fixed a real latent bug along the way**, not itself in scope but
a direct, foreseeable consequence of adding a fourth always-injecting point
for two of the four adapters: `init.ts`'s `resolveHarnessFidelity`/
`buildHarnessFidelityReport` (the "Recall fidelity by harness" report
`neuron init`/`neuron status --check` print) computed "is every injecting
point registered" over the *entire* capability map. Left as-is, a Claude
Code/Codex project already fully wired for recall, upgraded to this neuron
version but not yet re-`init`'d, would report recall itself as newly
un-wired the instant `pre-command` — a different feature — wasn't yet
installed, even though session-start/pre-prompt recall never changed at
all. Scoped both functions to a new `RECALL_LIFECYCLE_POINTS` constant
(`session-start`/`pre-prompt`/`context-reset`, excluding `pre-command`)
rather than the raw `LIFECYCLE_POINTS`/full capability map. `pre-command`'s
own wiring is `23`'s question for `execStep()` to answer, not this report's.

Adapter capability/install/uninstall tests updated across all four adapters
(`claudeCode.test.ts`, `codex.test.ts`, `copilot.test.ts`, `cursor.test.ts`)
and `init.test.ts` for the new fourth point (`removedCount` +1 for Claude
Code/Codex, `points` gaining an `'unchanged'` `pre-command` entry for
Copilot/Cursor, which never install it). New `hook.test.ts` coverage under a
`pre-command` describe block (claude-code) plus one representative case in
the existing `codex` describe block: a real `onExec` match injects via
`PreToolUse`; a command with no lexical/FTS overlap stays silent (mirrors
`exec.test.ts`'s own gate-rejection case); a non-`Bash` tool call is a no-op
even when its arguments would otherwise match; a missing `tool_input.command`
or fully malformed stdin degrades to silence rather than crashing.

`npm test` 676/676 (was 670), `tsc --noEmit` clean. Unblocks `23` directly
(listed as its only blocker); `24` stays blocked (needs both `22` and `23`).
