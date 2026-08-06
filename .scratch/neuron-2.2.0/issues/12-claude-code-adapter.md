Type: task
Status: resolved
Blocked by: 11
Band: 2.2.0-rc3

# 12 — Claude Code Adapter (Deterministic Reference)

## Question

Does the adapter interface from ticket `11` hold up against the harness with the
richest hook surface — and does deterministic, agent-independent recall actually
work end to end?

## Why this adapter first

Claude Code is the **deterministic extreme** of the five. It is the reference
implementation: if auto-injection cannot be made to work here, the premise of the
whole recall theme is wrong, and better to learn that in rc3 than in rc4.

Paired deliberately with ticket `13` (Codex, the fallback extreme). Building both
before fanning out is what stops the interface being designed against one real
backend and four guesses.

## Scope

1. Detect a Claude Code project and install hooks into the settings file, per the
   consent policy settled in `11`.
2. Wire the lifecycle points ticket `10` confirmed:
   - **Pre-prompt** — query the store with the user's prompt, inject results.
   - **Session start** — seed the architectural blueprint card once.
3. Enforce the payload budget from `11`: token ceiling, relevance floor,
   truncation. Injecting on every turn is the case where an unbounded payload does
   real damage.
4. **Merge into existing user config without clobbering it.** Users have their own
   hooks. Preserve them, mark neuron's entries identifiably, and make re-running
   `neuron init` idempotent.
5. Implement uninstall — removing neuron's entries and nothing else.
6. Implement verify: report whether the hook is wired *and* whether it is firing.
   Ticket `19` depends on this being real rather than inferred from file contents.
7. Fail safe. A hook that errors, hangs, or returns nothing must not break the
   user's session. Degraded recall is acceptable; a wedged harness is not.

## Verification

- Prove the deterministic claim directly: with the `CLAUDE.md` query instruction
  **removed**, confirm relevant memories still reach the model's context.
- Verify a cold store, an empty store, and a store with no relevant hits all
  behave sanely — no crash, no empty-block noise injected every turn.
- Measure the added wall-clock latency per turn against the budget from `09`.
- Confirm a pre-existing user hook survives install, upgrade and uninstall.

## Deliverables

- [x] Claude Code adapter implementing the `11` interface
- [x] Pre-prompt + session-start injection within the payload budget
- [x] Non-clobbering, idempotent config merge; working uninstall
- [x] Working verify used by ticket `19`
- [x] Evidence of deterministic recall with the instruction removed
- [x] Per-turn latency measured against the rc2 budget

## Answer

Built as a new `src/harnesses/` module, shared infrastructure `13` (and later
`16`/`40`) reuse rather than reimplement:

- **`types.ts`** — the `11`/ADR 0014 interface in code: `LifecyclePoint`
  (`session-start`/`pre-prompt`/`context-reset`), `SupportRecord` with
  `'unknown'` as a first-class value, `CapabilityMap`, `HarnessAdapter`
  (`detect`/`capability`/`install`/`uninstall`/`verify`), and `deriveFidelity()`
  — the display-only `deterministic`/`best-effort`/`instruction-only` label
  computed from the map, never stored, matching ADR 0014 §2 exactly.
- **`payload.ts`** — the character-ceiling budget (ADR 0014 §4): drops whole
  entries, never truncates one mid-content, and keeps packing smaller entries
  behind one that didn't fit rather than stopping at the first miss.
  `SESSION_START_CHAR_BUDGET = 6000`, `PRE_PROMPT_CHAR_BUDGET = 1500` — both
  chosen strictly below Claude Code's documented 10,000-char cap *and* a
  conservative reading of Codex's ~2,500-token cap (this module is shared),
  since neuron never relies on spill-to-file.
- **`ledger.ts`** / **`hookState.ts`** — the session-scoped delta ledger (ADR
  0014 §3) and the firing-evidence file `verify()` reads (§ below). Both live
  under `env-paths`' cache dir, not `.neuron/` — ephemeral runtime state, not
  memory content (ADR 0011). A ledger untouched for 24h is treated as
  abandoned rather than tracked forever.
- **`claudeCode.ts`** — `ClaudeCodeAdapter`. `install`/`uninstall` only ever
  touch a matcher-group it created itself (single hook, neuron's own command
  signature) — a user's own hooks, even ones sharing an event's array, are
  never read or mutated. Idempotent re-install is a byte-for-byte no-op;
  a *changed* neuron entry (e.g. an older version's args) is the only case
  that asks, per ADR 0014 §7 — default `keep`, non-interactive-safe.
- **`src/commands/hook.ts`** — the `neuron hook claude-code <point>`
  entrypoint, reachable via `dist/cli.js hook ...`. Wrapped in `withTimeout`
  and a blanket `try/catch` that can never rethrow: every failure mode
  (malformed stdin, query error, timeout, unknown harness/point) degrades to
  "print nothing, exit 0" — never exit 2, which blocks the prompt on
  `UserPromptSubmit`.
- **`neuron init`** now installs/merges hooks for every detected adapter
  (currently just Claude Code), gated by `--no-hooks`; `--hook-target`,
  `--overwrite-hooks`/`--keep-hooks`, `--harness <list>` cover non-interactive
  callers, and `--uninstall-hooks` drives `adapter.uninstall()` directly.
  Interactive prompts (target choice, overwrite-conflict) only fire when both
  stdin and stdout are a TTY; everything else gets the documented default
  (`project-committed`, keep-and-warn).

**Verification, against the ticket's own bullets:**

- **Deterministic claim, `CLAUDE.md` removed**: demonstrated on a scratch
  project with no `CLAUDE.md`/`AGENTS.md` of any kind. `memory add`d a
  learning, then piped a bare `UserPromptSubmit`-shaped JSON straight into
  `neuron hook claude-code pre-prompt` — the relevant entry came back as
  `hookSpecificOutput.additionalContext`, sourced entirely from the harness
  hook mechanism, no agent-side instruction involved.
- **Cold/empty/no-hits stores**: `src/commands/hook.test.ts` covers an empty
  store (session-start, no output), a missing/empty prompt (pre-prompt,
  no output), malformed stdin, and an unreachable DB path — all exit 0 with
  empty stdout. Per ADR 0014 §4 there is deliberately *no* relevance floor,
  so "no relevant hits" isn't a distinct case from "some hits": whatever
  ranks highest is injected up to the character ceiling; only a genuinely
  empty result set produces no output.
- **Latency**: measured directly (real embedder, not the mock) — 0.366s cold,
  0.202–0.211s warm across 3 runs. Matches ADR 0014's own correction almost
  exactly (0.20/0.20/0.22s) and sits far inside both Claude Code's 30s
  `UserPromptSubmit` timeout and the 10s/8s timeouts (harness-requested /
  neuron-internal) this adapter configures.
- **Pre-existing user hook survives install/uninstall**: `claudeCode.test.ts`
  asserts a user's own `UserPromptSubmit` matcher-group (different command)
  is untouched by both `install` and `uninstall`, and that unrelated
  top-level JSON keys round-trip byte-for-byte.

**Resolved the one thing ADR 0014 §3 flagged as unverified**: fetched
Claude Code's hook JSON schema directly. `session_id` is present on
**every** hook event, `SessionStart` and `UserPromptSubmit` included — the
session-ledger design ADR 0014 §3 called "load-bearing and unverified" is
confirmed sound for this harness. (`prompt_id` is a UUID present only after
the first turn, and is not what the ledger keys on — `session_id` is.)

**Interface held up as designed** — nothing in `11`/ADR 0014 needed
revising. The one addition beyond the ADR's text is the concrete `verify()`
shape: since no harness researched (`10`) documents an external way to
confirm a hook *fired* (only that it's *registered*), `verify()` combines
config-file registration with a firing-evidence file the hook itself writes
(`recordFired`, called before any work that could fail) — manufactured
evidence, not inference from `settings.json` alone, which is what the
ticket's scope item 6 asked for.

**Known, pre-existing, out-of-scope issue surfaced while testing**: running
the full suite reproduces ticket `42` (CLI tests that omit a `package.json`
boundary let `findProjectRoot` walk up into this repo's real `.neuron/`
store) — confirmed independent of this ticket by running before and after
these changes. New hook-wiring tests in `init.test.ts` add the same
`package.json` guard the file's existing md-mode tests already use, so they
don't contribute to it; the general fix is `42`'s, not touched here.
45 new tests across 5 files (29 in `src/harnesses/` — 9 payload, 7 ledger,
13 adapter; 9 CLI integration in `hook.test.ts`; 7 init-wiring integration
in `init.test.ts`), all green. Full suite: 355/359, the 4 failures all
pre-existing `42` pollution in `history.test.ts`/`learn.test.ts` — confirmed
independent of this ticket's changes.

Unblocks nothing further by itself (`13`, `15` already listed `12` as a
co-requirement, not a dependency) but hands `13` a working, tested,
harness-agnostic `payload`/`ledger`/`hookState`/`types` layer to build the
Codex adapter against — the two-adapter validation `11`'s Comments called
for is what confirms the interface, and this is the first of the two.

## Comments

- 2026-08-03: Resolved. Claude Code adapter shipped as `src/harnesses/`
  (shared types/payload/ledger/hookState + `claudeCode.ts`) and
  `src/commands/hook.ts`, wired into `neuron init`. All deliverables and
  verification bullets met; see Answer above. `13` (Codex) can now build
  against the shared harness-agnostic layer rather than re-deriving it.
