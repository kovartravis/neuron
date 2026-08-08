Type: task
Status: claimed
Blocked by: 07

# 01 — GitHub Copilot CLI Adapter

## Question

What recall fidelity can neuron actually deliver on GitHub Copilot CLI, and does
the adapter interface hold without bending?

## Context

**Continued from [neuron-2.2.0's ticket 16](../../neuron-2.2.0/issues/16-copilot-adapter.md),**
closed out of scope there on 2026-08-04 when that map's destination narrowed to
a 3-pillar cut. Nothing below is new — this is the same ticket, carried
forward as a fresh effort rather than a resumption.

Of the harnesses researched on `neuron-2.2.0`
([ticket 10](../../neuron-2.2.0/issues/10-harness-compatibility-research.md)),
Copilot CLI has the **thinnest** extensibility surface confirmed: a real
`sessionStart` → `additionalContext` injection path exists, but there is no
per-turn (pre-prompt) injection point (`userPromptSubmitted` is
notification-only), and failure/timeout behavior, payload limits, a disable
switch, and verifiability are all undocumented.

**That is a legitimate outcome, not a failed ticket.** The value of shipping
it is that `neuron init` recognises the environment and tells the user the
truth about what they are getting, rather than staying silent and letting
them assume they have the same recall a Claude Code or Codex CLI user has.

## Scope

1. Implement detect / install / uninstall / verify / report-capability
   against the
   [11](../../neuron-2.2.0/issues/11-recall-adapter-architecture.md)
   interface (`src/harnesses/types.ts`), reusing the shared
   `payload`/`ledger`/`hookState` layer tickets
   [12](../../neuron-2.2.0/issues/12-claude-code-adapter.md)/
   [13](../../neuron-2.2.0/issues/13-codex-adapter.md) built — do not
   reimplement it.
2. Wire whatever injection surface exists (`sessionStart` only, per `10`'s
   findings). No per-turn point exists, so `pre-prompt`'s support record is
   `injects: false`, not omitted — a harness with no hook is a different
   fact from an undocumented one, and the capability map must say which.
3. Report the fidelity verdict truthfully for ticket `03`'s disclosure
   surface.
4. Honour the config-safety requirements ADR 0014 already settled:
   non-clobbering merge, idempotent re-install, clean uninstall.

## Verification

- Verify against a real Copilot CLI installation, not only against fixtures.
  `10`'s documented capabilities may behave differently in practice.
- Confirm the reported fidelity matches observed behaviour. A gap between
  what the adapter claims and what happens is the specific failure this
  whole design exists to prevent.

## Deliverables

- [x] Copilot CLI adapter implementing the shared `HarnessAdapter` interface
- [x] Injection wired at `session-start`; `pre-prompt` honestly reported as non-injecting
- [x] Truthful fidelity verdict feeding ticket `03`'s matrix
- [x] Config-safety cases verified
- [ ] Behaviour confirmed against a real installation

## Comments

**2026-08-08:** Implemented `src/harnesses/copilot.ts` (`CopilotAdapter`,
`id: 'copilot'`) and wired it into `getAdapters()` and
`ADAPTER_ID_BY_HARNESS_NAME` (`github` → `copilot`) in
`src/commands/init.ts`, matching the config harness entry `.github` /
`AGENTS.md` already in `src/config/harnesses.json`.

Two facts not in ticket `10`'s research, found via a direct fetch of
`docs.github.com/en/copilot/reference/hooks-reference` and
`.../use-hooks` during this ticket:

1. **Stdout contract differs from Claude Code/Codex.** Copilot expects a
   flat `{"additionalContext": "..."}` at the root, not the
   `hookSpecificOutput.additionalContext` wrapper the other two share.
   `src/commands/hook.ts`'s `emit()` now takes a `harness` parameter and
   branches on it — the one piece of per-harness logic the shared hook
   entrypoint needed.
2. **Hook entries are a flat array per event name**, not matcher-grouped
   the way Claude Code's and Codex's settings are — so `copilot.ts`'s
   "is this neuron's own entry" check is an array-index lookup
   (`findOwnEntry`), not a matcher-group shape check.

Design calls made, honoring the interface rather than reinterpreting it:

- Only `session-start` is ever wired. `pre-prompt` (`userPromptSubmitted`)
  is documented as "no output processed, notification only" — a known
  fact, not an `'unknown'` — so `install()`/`verify()` never touch it at
  all rather than installing a hook whose output is provably discarded.
- `context-reset` has no documented compaction-equivalent event on this
  harness at all (full event list: `sessionStart`, `sessionEnd`,
  `userPromptSubmitted`, `preToolUse`, `postToolUse`, `agentStop`,
  `subagentStart`, `subagentStop`, `errorOccurred`, `notification`).
  Disclosed as a `capability()` caveat: the session ledger epoch never
  rolls on this harness, so an unusually long session could in principle
  exhaust its epoch budget with no reset point to clear it. This is a
  real, harness-specific limitation beyond "doesn't inject," not a design
  choice.
- `session-start`'s `failurePosture` and `payloadCapChars` are both
  `'unknown'` (undocumented per ticket `10`'s research, unchanged by this
  session's direct fetch) — enough on its own, per `deriveFidelity`, to
  keep this harness `best-effort` rather than `deterministic`, matching
  the research's own net assessment.
- `project-local` collapses into the same file `project-committed` uses
  (`.github/hooks/neuron.json`), with a warning — no gitignored
  project-level scope is documented, the same gap Codex CLI has.

14 new tests in `copilot.test.ts` (detect, capability/fidelity, install
including the never-wired points, idempotency, conflict policies,
malformed-JSON refusal, uninstall, verify, `project-local` collapse,
`user-global` path). Full suite: 502/502 passing, `tsc --noEmit` clean.

**Follow-up correction, same session:** the `context-reset` caveat
originally overstated the epoch-exhaustion risk as live rather than
theoretical. Checked the actual numbers: `session-start`'s own
per-injection cap (`SESSION_START_CHAR_BUDGET`, 6,000 chars) is well under
the default 18,000-char epoch budget on its own, and since `pre-prompt` is
never wired for Copilot, session-start is the *only* point that ever
spends against the epoch — there is no repeated per-turn spend to
accumulate toward exhaustion. Tightened the caveat in `copilot.ts` to say
so plainly rather than imply an open risk that isn't actually reachable
under this adapter's own design.

**Real-install verification (the one remaining deliverable) is
deliberately not done this session.** Copilot CLI is not installed on
this machine; the maintainer chose to verify independently against a real
installation rather than have this session install it. This ticket is
left `claimed`, not `resolved`, until that verification happens — its own
Verification section makes real-install confirmation a hard requirement,
not an optional nice-to-have.
