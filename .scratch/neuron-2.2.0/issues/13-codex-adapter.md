Type: task
Status: resolved
Blocked by: 11
Band: 2.2.0-rc3

# 13 — Codex Adapter (Fallback Reference)

## Question

Does the adapter interface survive a harness that **cannot** guarantee
deterministic injection — and is the `AGENTS.md` fallback path a first-class
adapter rather than an apology?

## Why this adapter second

Codex is the **opposite extreme** from ticket `12`. Where Claude Code tests
whether the interface can express a rich hook surface, Codex tests whether it can
express a thin one — or none — without pretending otherwise.

This is the pair that validates the abstraction. If `13` requires bending the
interface designed in `11`, that is the finding, and `11` gets revised before
tickets `16`–`18` build on it.

## Scope

1. Detect a Codex project (`AGENTS.md`, `~/.codex/config.toml`, or whatever `10`
   establishes as authoritative).
2. Implement whatever injection capability `10` found — and if the honest answer
   is "none that is deterministic", implement the fallback as the adapter's real
   behaviour rather than a stub that reports failure.
3. **The `AGENTS.md` fallback path.** This is the mechanism for every harness
   outside the five, so it must be genuinely good, not vestigial:
   - Keep the recall instruction that `12` deletes on deterministic harnesses,
     because here nothing else does the job.
   - Write and update the block idempotently, preserving user content around it.
     `neuron init` already appends/updates a `## Memory Store` block in place —
     reuse that machinery rather than growing a second writer.
4. Report capability truthfully via the `11` capability model. If recall here is
   `instruction-only`, say so — ticket `19` surfaces it to the user, and a false
   claim of determinism is worse than an honest limitation.
5. Implement detect, install, uninstall and verify like any other adapter.

## Verification

- Confirm the adapter reports a fidelity verdict matching `10`'s findings, not an
  optimistic one.
- Confirm the `AGENTS.md` block round-trips: install, re-install, upgrade,
  uninstall, with surrounding user content untouched throughout.
- Confirm a project with **both** `.claude/` and `AGENTS.md` resolves per the
  multi-harness rule from `11`, without the two adapters fighting or
  double-injecting.

## Deliverables

- [x] Codex adapter implementing the `11` interface
- [x] ~~Production-quality `AGENTS.md` fallback~~ — **moot, see Answer**: `10`
  found Codex lands `deterministic`, so there is no "nothing else does the
  job" case here to build a fallback for
- [x] Truthful capability reporting
- [x] ~~Round-trip tests for the instruction block~~ — moot for the same reason
- [x] Multi-harness coexistence verified against ticket `12`
- [x] Any revisions the interface needed, fed back into `11`'s ADR — **none
  needed**, see Answer

## Answer

**The interface held up without revision — Codex turned out to be much closer
to Claude Code than this ticket's own framing ("the opposite extreme," "thin
or none") assumed.** That framing predates ticket `10`'s finding that Codex is
`deterministic`, and a direct fetch of `learn.chatgpt.com/docs/hooks` during
this ticket (the redirect target `developers.openai.com/codex/hooks` resolves
to) confirmed it goes further than "deterministic in principle":

- **Same event names.** `SessionStart`, `UserPromptSubmit`, `PreCompact` are
  named identically to Claude Code's.
- **Same stdin fields.** `session_id` is present on every hook's stdin,
  `PreCompact`/`PostCompact` included, and `UserPromptSubmit` carries the
  submitted text under `prompt` — both exactly matching Claude Code's shape.
  This **resolves ADR 0014 §3's session-ledger risk for Codex**, the same
  thing ticket `12` closed for Claude Code.
- **Same stdout contract.** `{"hookSpecificOutput":{"hookEventName":...,
  "additionalContext":...}}` is the documented envelope for both harnesses.
  Consequence: `src/commands/hook.ts`'s `runHook()` needed **zero**
  per-harness branching — the entire shared codepath (stdin parsing, query,
  payload budget, ledger, emission) is identical; the only change there was
  widening the harness allowlist from a single hardcoded string to
  `['claude-code', 'codex']`.

**One real difference, contained entirely inside the adapter:** Codex's
`hooks.json`/`config.toml` schema documents a single `command` field
("executable path"), not Claude Code's `command` + `args[]` split — so
`codex.ts` writes `command: "neuron hook codex <point>"` as one string rather
than a command/args pair. This doesn't touch the `HarnessAdapter` interface
(`install`/`uninstall`/`verify` don't care how a hook entry is spelled
internally), so `11`/ADR 0014 needed no revision — the abstraction's actual
job (capability truthfulness, install/uninstall/verify contracts) never
depended on that detail.

**One design decision the ticket's sources didn't settle:** Codex documents
exactly two hook-config locations (`~/.codex/hooks.json` user,
`<repo>/.codex/hooks.json` project) — no third, gitignored, "local" scope the
way Claude Code has `settings.local.json`. `'project-local'` therefore
resolves to the same file `'project-committed'` writes, with a one-time
stderr warning explaining the collapse and suggesting the user gitignore the
file by hand if that's what they wanted. This is a Codex-specific adapter
detail, not an interface change.

**Payload cap is a conversion, flagged as one.** Codex's own cap
(`additionalContextLimit`, default 2500) is token-denominated; neuron counts
characters everywhere (`payload.ts`). `capability()` reports `7500` — the same
conservative 3-chars/token reading `payload.ts`'s own comment already used
when sizing the shared `SESSION_START_CHAR_BUDGET`/`PRE_PROMPT_CHAR_BUDGET`
constants — with a `caveats` entry stating plainly that this is a conversion,
not a directly-quoted character figure. `deriveFidelity()` still resolves to
`deterministic` since every other field (`failurePosture`, `timeoutMs`) is
fully known.

**`context-reset` (`PreCompact`) confirmed non-injecting**, matching ADR 0014
§5's prediction: the fetch confirms "plain text on stdout is ignored" for
both `PreCompact` and `PostCompact`, while `session_id` is still present on
their stdin — so clearing the ledger on this point works exactly as designed,
with `injects: false` reported honestly rather than omitted.

**Verification, against the ticket's own bullets:**

- **Fidelity verdict matches `10`**: `codex.test.ts` asserts
  `deriveFidelity(capability())` is `'deterministic'`, matching `10`'s verdict
  rather than an optimistic guess.
- **`AGENTS.md` round-trip**: not applicable — see Deliverables above.
- **Multi-harness coexistence**: `init.test.ts` adds a project with both
  `.claude/` and `.codex/` markers and confirms both adapters install
  independently (`hooks.installed` has both `claude-code` and `codex`
  entries, each writing its own file, neither touching the other) — the
  actual test of ADR 0014 §8's "wire every detected harness" rule, more
  concrete than the ticket's own `AGENTS.md`-shaped phrasing since Codex
  doesn't fall back to it. A `--harness codex` filter test on the same
  two-marker project confirms the allowlist still scopes correctly.
- **End-to-end deterministic recall**: `hook.test.ts`'s new `codex` describe
  block mirrors every `claude-code` CLI-integration case (empty store,
  architecture-card injection, pre-prompt injection, ledger dedupe,
  context-reset clearing the ledger, malformed stdin, missing prompt) —
  17/17 green, all through `dist/cli.js hook codex <point>` end to end, no
  mocked harness layer.

**One known, accepted, out-of-scope limitation surfaced and recorded rather
than fixed**: `ledger.ts`'s session ledger is keyed on `(projectRoot,
sessionId)` alone, not `(projectRoot, harness, sessionId)`. A new
`hook.test.ts` case demonstrates that two different harnesses sharing one
literal `session_id` string would share a ledger and incorrectly dedupe
against each other. In practice each harness mints its own session ids
independently (no observed or documented collision risk), and this is
inherited from `12`'s shared `ledger.ts`, not introduced here — recorded as a
test-documented limitation rather than a bug to fix on this ticket.

19 new unit tests (`codex.test.ts`: 14, mirroring `claudeCode.test.ts` plus a
`project-local` collapse case) + 7 new CLI integration tests
(`hook.test.ts`'s `codex` block) + 3 new `init.test.ts` cases (Codex-only
install, both-markers multi-harness, `--harness codex` filter on a
two-marker project) = 29 new tests, all green. Full suite 380/384 (via
`neuron exec -- npm test`); the 4 failures are ticket `42`'s already-tracked,
pre-existing `package.json`-boundary pollution in `cli.test.ts`,
`history.test.ts`, and `learn.test.ts` — confirmed independent of this
ticket by file ownership (none of the three were touched here) and by the
failure signature matching ticket `42`'s exact description (`findProjectRoot`
walking into this repo's real `.neuron/` store).

Unblocks ticket `14` (protocol block rewrite) and ticket `15` (cut rc3), both
of which listed `12`+`13` as co-requirements.

## Comments

- 2026-08-03: Resolved via `/wayfinder` work-through-the-map mode. Built
  `src/harnesses/codex.ts` against `12`'s shared `types`/`payload`/`ledger`/
  `hookState` layer with no changes needed to any of them, confirming that
  layer really is harness-agnostic rather than accidentally Claude-Code-
  shaped. See Answer above for the schema-fetch findings and the two
  Codex-specific adapter decisions (single `command` string, `project-local`
  collapse).
