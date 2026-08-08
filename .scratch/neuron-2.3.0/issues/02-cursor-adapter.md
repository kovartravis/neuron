Type: task
Status: claimed
Blocked by: 07, 22

# 02 — Cursor Adapter

## Question

What recall fidelity can neuron deliver on Cursor, and does the shared
adapter interface hold for a harness whose one injection point has a
documented hole in it?

## Context

**Continued from [neuron-2.2.0's ticket 40](../../neuron-2.2.0/issues/40-cursor-adapter.md),**
closed out of scope there on 2026-08-04 when that map's destination narrowed
to a 3-pillar cut. Nothing below is new — this is the same ticket, carried
forward as a fresh effort rather than a resumption.

Cursor was added to
[ticket 10](../../neuron-2.2.0/issues/10-harness-compatibility-research.md)'s
research scope mid-investigation and came back `best-effort` — the
**better-documented** of the two `best-effort` harnesses this effort ships,
which is why it survived the cut while Antigravity and OpenCode did not (see
`neuron-2.2.0`'s Out of scope):

- `sessionStart` / `postToolUse` inject `additional_context` deterministically.
- **No per-turn injection.** `beforeSubmitPrompt` fires on every turn but is
  documented as permission-only (allow/deny), not a context carrier. Same
  shape as Copilot CLI (`01`).
- **Failure model is documented**: explicit fail-open default with an opt-in
  `failClosed` — materially better than Copilot's, where failure, timeout,
  payload cap and disable switch are all undocumented.
- **A real determinism hole**: several hooks, `sessionStart` among them, do
  not run at all in cloud/background agents. Cursor's only injection point
  is therefore absent in an execution mode Cursor itself offers.

## Scope

1. Implement detect / install / uninstall / verify / report-capability
   against the shared `HarnessAdapter` interface (`src/harnesses/types.ts`),
   reusing the `payload`/`ledger`/`hookState` layer.
2. Capability map: `session-start` supported, `pre-prompt` **not** (`injects:
   false` — the hook exists but cannot carry context, a different fact from
   "no hook," and the map must say so). `context-reset` per `10`'s findings.
3. Record the cloud/background-agent caveat as a **caveat on the
   `session-start` support record**, not as prose in the README. The
   capability map is what the code reads and the headline fidelity label is
   derived from it; a reliability hole that lives only in documentation is
   exactly the abstraction lying ADR 0014 exists to prevent.
4. Honour the config policy ADR 0014 already settled: init prompts for the
   hook target, and asks before overwriting any existing entry.

## Verification

- Verify against a real Cursor installation, not fixtures.
- **Specifically verify the cloud/background-agent hole**, since it is the
  one documented behaviour that would make a reported capability false in
  practice. If it cannot be exercised, say so — an unverified caveat is
  still worth more than a silent one, but it must be labelled as unverified.

## Deliverables

- [x] Cursor adapter implementing the shared `HarnessAdapter` interface
- [x] Capability map with the `pre-prompt` `injects: false` record and the
      cloud-agent caveat attached to `session-start`
- [x] Truthful fidelity verdict feeding ticket `03`'s matrix
- [x] Config-safety cases verified
- [ ] Behaviour confirmed against a real installation

## Comments

**2026-08-08:** Implemented `src/harnesses/cursor.ts` (`CursorAdapter`,
`id: 'cursor'`) and wired it into `getAdapters()` and
`ADAPTER_ID_BY_HARNESS_NAME` (`cursor` → `cursor`) in `src/commands/init.ts` —
`src/config/harnesses.json` already had a `cursor` entry (`.cursor` /
`CURSOR.md`) waiting for a real adapter.

Two facts not fully nailed down by ticket `10`'s research, resolved via a
direct fetch of `cursor.com/docs/hooks` during this ticket:

1. **Stdout contract is a third distinct shape.** Cursor expects a flat,
   **snake_case** `{"additional_context": "..."}` at the root — neither
   Claude Code/Codex's `hookSpecificOutput.additionalContext` wrapper nor
   Copilot's flat but camelCase `additionalContext`. `src/commands/hook.ts`'s
   `emit()` gained a third branch.
2. **`preCompact` exists and runs in cloud/background agents** (the
   supported-hooks table lists it "Yes," unlike `sessionStart` and most other
   hooks), **but its stdin carries no `session_id` field at all** — unlike
   `sessionStart`'s. `rollEpoch` only ever fires when a session id is
   present, so wiring `preCompact` still can't make the epoch reliably roll
   on this harness. Wired anyway (the event and the firing evidence are
   real); the `context-reset` caveat says so rather than silently shipping a
   hook that can never do its one job.

Design calls made, honoring the interface rather than reinterpreting it:

- Only `session-start` and `context-reset` are ever wired. `pre-prompt`
  (`beforeSubmitPrompt`) is confirmed via direct fetch to output only
  `{continue, user_message}` — permission allow/deny, no context field — so
  `install()`/`verify()` never touch it, same design call ticket `01` made
  for Copilot's `userPromptSubmitted`.
- `session-start`'s `failurePosture` is a known `'fail-open'` (Cursor's
  documented default, with an opt-in per-hook `failClosed`) — better
  documented than Copilot's `'unknown'` — but `payloadCapChars` and
  `timeoutMs` stay `'unknown'` (no concrete figures found anywhere reached),
  which is enough on its own to keep this harness `best-effort` rather than
  `deterministic` (`deriveFidelity`), matching the map's and the research's
  expected verdict.
- The cloud/background-agent hole (`sessionStart` doesn't run there, nor do
  user-level hooks at all) is recorded as a caveat on the `session-start`
  support record, per Scope item 3 — not as README prose.
- `version: 1` is written only when creating a hooks.json fresh, never
  overwriting a pre-existing value — unlike Copilot's file, Cursor's own
  documented top-level schema names `version` explicitly, so this isn't
  inventing a field the way it would have been for Copilot.
- `project-local` collapses into the same file `project-committed` uses
  (`.cursor/hooks.json`), with a warning — no gitignored project-level scope
  is documented, the same gap Copilot CLI and Codex CLI both have.

14 new tests in `cursor.test.ts` (detect, capability/fidelity, install
including both wired points, idempotency, conflict policies, malformed-JSON
refusal, uninstall, verify, `project-local` collapse, `user-global` path),
plus a `cursor` describe block in `hook.test.ts` (8 tests) exercising the CLI
hook entrypoint end-to-end, specifically asserting the flat snake_case
`additional_context` shape rather than assuming it matches an existing
harness's contract, and a no-`session_id`-on-context-reset case matching the
documented `preCompact` gap. Full suite passing (one pre-existing, unrelated
flake in `test/e2e/concurrency-stress.test.ts` — a SQLite migration race
condition in `NeuronMemory.initialize`, reproduces on `main` independent of
this ticket's changes), `tsc --noEmit` clean.

**Real-install verification (the one remaining deliverable) is deliberately
not done this session.** Cursor is not installed on this machine. Split into
ticket [22](22-verify-cursor-adapter-real-install.md), same split-
verification-from-build move ticket `01`/`20` used. `02`'s `Blocked by` now
includes `22`; this ticket stays `claimed`, not `resolved`, until `22`
resolves.
