# ADR 0014 — Recall Adapter Architecture

- **Status:** Accepted (2026-08-03)
- **Relates to:** [ADR 0012 — Relevance Gate and Score Decontamination](0012-relevance-gate-and-score-decontamination.md),
  which this ADR's payload budget (Decision 4) depends on for its "no cosine
  floor" result
- **Ticket:** 11 — Recall Adapter Architecture (ticket `917944e7-36e8-403e-bebc-794602a03b52`)
- **Implemented by:** 12 — Claude Code Adapter (ticket `45d010f5-6f69-4984-9612-622e408f8679`),
  13 — Codex Adapter (ticket `84f987c7-058c-40e7-b8ec-06fd93d65cdb`)

## Context

2.2.0 moves recall from a `CLAUDE.md` instruction the agent may or may not act
on to per-harness native hooks — deterministic where a harness supports it.
Ticket 10 researched six harnesses and found genuinely unequal capabilities:
two ([Claude Code, Codex CLI](../design/harness-compatibility-research/harness-compatibility.md))
document per-turn injection with failure/timeout/payload semantics; two
(Copilot CLI, Cursor) inject only at session start; two (Antigravity, OpenCode)
have rich mechanisms but undocumented reliability.

The central hazard: an abstraction that makes all five (soon six) look alike
hides that some are deterministic and some are best-effort — precisely the
unreliability 2.2.0 exists to eliminate. Capability has to be a first-class,
inspectable part of the interface, not a footnote.

## Decision

### 1. Scope is what can be honestly described, not what a harness can do

- **rc3 ships `deterministic`:** Claude Code and Codex CLI, plus an
  `instruction-only` fallback — which, per ticket 10's finding that all six
  researched harnesses have *some* real mechanism, now serves only *unlisted*
  harnesses rather than any of the six.
- **rc4 ships `best-effort` where it is documented:** Copilot CLI (ticket 16)
  and Cursor (ticket 40).
- **Antigravity CLI (ticket 17) and OpenCode (ticket 18) are out of scope for
  2.2.0** — not for weak mechanisms (OpenCode's is the richest of the six
  researched) but because neuron would have to publish a capability record it
  has no source for. That is the abstraction lying this ADR exists to
  prevent. OpenCode carries a second reason: its mechanism is arbitrary
  plugin code, a different installation contract from every other adapter.

### 2. Capability is a per-lifecycle-point map; the headline label is derived

Neuron owns the lifecycle-point vocabulary (`session-start`, `pre-prompt`,
`context-reset`); each adapter translates into its harness's own names
(`SessionStart`, `sessionStart`, `PreInvocation`, `chat.message`, …).

Capability is `lifecyclePoint → supportRecord`, where the record carries
whether the point injects, its payload cap, failure posture, timeout, and
caveats. The `deterministic` / `best-effort` enum shown in `neuron init`
output and the README matrix is **derived for display and never stored** — one
source of truth, no drift between what the code enforces and what it claims.

The enum alone is insufficient: Copilot and Cursor occupy the same cell but
are not equivalent — Cursor documents fail-open behaviour with an opt-in
`failClosed`, while Copilot leaves failure, timeout, payload cap and disable
switch all undocumented. **`unknown` is a first-class support-record value**,
distinct from both a known value and "no" — an undocumented payload cap is not
the same fact as no cap, and a type that cannot express the difference cannot
let the code explain its own scope decisions (§1).

### 3. Pre-prompt injection is deduplicated by a session-scoped ledger

Unconditional per-turn injection means a 50-turn session re-injects the same
entries 50 times — one recall and 49 repetitions, walking into the PersonaMem
over-reasoning result ticket 05 relied on (large context, over-reasoning, not
under-retrieval). Neuron records which entry ids it has injected for a
session and injects only the delta. The relevance floor (Decision 4) sits
underneath so weak matches never enter the ledger.

**Load-bearing and unverified at design time:** this needs a stable session
identity from hook input. Ticket 10 investigated what a hook can pass to the
model, not what the hook *receives* on stdin — tickets 12/13 must confirm a
session id is actually available before building on this; if none is, the
ledger has nothing to key on and this design fails for that harness.

### 4. Payload budget: no relevance floor, a character ceiling, whole-entry drops

- **No relevance floor ships.** [ADR 0012 amendment (ticket 39)](0012-relevance-gate-and-score-decontamination.md#amendment-ticket-39-2026-08-03--the-cosine-floor-and-the-config-surface)
  ran a full 500-question LongMemEval sweep and found every cosine floor from
  0.50–0.70 regresses recall on real conversational text — the on-topic and
  negative-control distributions overlap more than they do on this project's
  own dense technical prose. The character ceiling is therefore the **sole**
  volume control.
- **Neuron enforces its own ceiling strictly below the smallest known harness
  cap, and never relies on spill-to-file.** Both deterministic harnesses cap
  injected context and spill overflow to a file (a preview plus a path).
  Spill converts deterministic recall back into *agent-invoked* recall — the
  model must choose to read the file — reintroducing the exact failure mode
  this release exists to eliminate, and it triggers precisely when the
  payload is largest. Where a harness's cap is `unknown`, use the most
  conservative known cap rather than assume headroom.
- **Count characters, not tokens.** Exact and free; tokenising on the hook
  path costs per-turn latency to approximate a limit one harness already
  states in characters.
- **Asymmetric budgets:** `session-start` is large (fires once, carries the
  blueprint card); `pre-prompt` is small (the repeated, deduplicated cost).
- **Drop whole entries, never truncate mid-entry.** A half-entry can assert
  what only the full entry qualifies. Dropped entries stay unledgered so they
  remain eligible next turn.

### 5. A third lifecycle point, `context-reset`, execution-only

Compaction silently invalidates the ledger (§3): an entry injected at turn 3
and compacted away at turn 40 is gone from context while the ledger still
says "delivered" — recall failing *quietly*.

The useful asymmetry: clearing a ledger is a side effect, not an injection.
Payload caps and `additionalContext` support are irrelevant to it; the hook
only has to *run*. Harnesses whose compaction hooks explicitly ignore stdout
(Codex's `PreCompact`/`PostCompact` do) can still clear the ledger this way —
`injects: false` is a legitimate, useful support record rather than a
disqualification, confirmed available on both deterministic harnesses. Where
unavailable, fall back to a turn-count TTL, so the degraded path fails toward
*repetition* rather than *silence*.

### 6. `neuron init` prompts for the hook target; uninstall is a real command

Committing a hook to `.claude/settings.json` means a colleague who clones the
repo has their harness executing `neuron` every turn — a binary they may not
have installed, configured by a command they never ran. It degrades rather
than breaks (both deterministic harnesses treat a failing hook as
non-blocking), but it is not a state to put someone in silently.

`init` asks how the user wants it set up: user-global, project-committed, or
project-local. `--yes` and `--no-hooks` cover non-interactive runs so init
never blocks on a prompt it cannot show. Uninstall is a real command, not a
documentation paragraph.

### 7. Init does not classify existing hook entries — it asks

Idempotency and config-merge safety collapse into one question: *given a
config file with hooks in it, which are mine?* Two mechanisms were proposed
and rejected, both for lacking a fixed referent across neuron versions:

- **Byte-identity against what neuron would write now** — a 2.2.0-written
  entry read by 2.3.0 differs from 2.3.0's canonical form, so 2.3.0
  misclassifies every correctly-installed hook as hand-edited. Fixing this
  requires a table of every prior version's output, which grows without
  bound.
- **Structural match on "fields neuron manages"** — the managed-field set is
  itself version-dependent, so the comparison shifts underneath a later
  version that manages a field an earlier one ignored. Same problem, smaller.

**Resolution: neuron does not classify. It asks.** If an entry already exists
at a hook point, init shows it and asks whether to overwrite — no provenance
record, no version history, no managed-field list.

- Non-interactive: `--overwrite-hooks` / `--keep-hooks`, defaulting to keep
  and warn, so CI never silently replaces anything.
- Consequence accepted: **neuron does not self-upgrade its hook.** A 2.2.0
  entry survives until someone re-runs init. `neuron status` can report "hook
  present, written by an older version" — reporting what it found, without
  classifying it.
- **Codex: write a sibling `hooks.json`, not `config.toml`.** TOML
  round-tripping typically destroys comments and key ordering, so a naive
  read-modify-write of a user's hand-maintained `config.toml` would strip
  annotations. A JSON file neuron owns avoids the class of bug entirely.
- **Claude Code:** plain JSON, parsed/modified/re-serialised losslessly
  enough — edit only the relevant array elements, never regenerate the file.
  Claude Code also deduplicates hooks by command/args, so an identical
  re-write is free there; Codex has no such documented behaviour, so
  idempotency is neuron's own job on that side.

### 8. Multi-harness resolution: wire every detected harness

A repo may have more than one harness's marker present (`.claude/` and
`.codex/`, or `.claude/` and a generic `AGENTS.md`). `neuron init` wires
hooks into **every detected harness**, not a chosen one — matching the
precedent `detectHarnesses` (`src/config/harness.ts:15-19`) already set for
skill-copying, which filters to all matches rather than the first. A repo
with signals for two harnesses more often means different contributors use
different tools than one person using both at once; picking "the one" would
silently leave a teammate's harness un-instrumented with no signal why. §6/§7's
per-target consent and overwrite-ask already give a finer-grained, per-harness
opt-out than an all-or-nothing choice at the multi-harness level would.

Four consequences follow:

1. **The `instruction-only` `AGENTS.md` fallback layers in only when *no*
   deterministic/best-effort harness matched at all** — never alongside a
   deterministic hook. Writing it unconditionally would restate step 1 of the
   `CLAUDE.md` protocol (self-invoked recall) on a harness where the settled
   protocol split (charted during the 2026-08-01 grilling session) already
   deletes that step, undermining the hook it would sit beside.
2. **The hook-target prompt (§6) is asked once per `init` run**, not once per
   harness, and applies uniformly to every harness being wired. It reflects
   how a contributor wants to work across their whole toolchain, not a
   per-harness preference; asking it per-harness would turn a
   three-harness repo's `init` into a wall of near-identical prompts.
3. **The overwrite-ask (§7) still fires per hook file**, unaffected by the
   above — whether a conflicting entry exists is a fact about that one file,
   not a preference answerable once and reused.
4. **New flag: `--harness <list>`** (e.g. `--harness claude,codex`) narrows
   wiring to a subset of *detected* harnesses. It only filters what
   `detectHarnesses` already found — it cannot force-wire a harness whose
   marker directory doesn't exist, since bootstrapping a harness from scratch
   is a different feature than choosing among the ones already present.
   Sits alongside `--yes` / `--no-hooks` / `--overwrite-hooks` /
   `--keep-hooks`.

## Consequences

1. **The capability record is the only place fidelity claims can come from.**
   `neuron init` output and the README matrix both read the same
   `lifecyclePoint → supportRecord` map — there is no second, hand-maintained
   description of what an adapter does to drift out of sync with it.
2. **Tickets 12/13 must verify the session-identity assumption (§3) before
   the ledger can be built on it.** If no session id reaches the hook, the
   dedup design for that harness needs to fall back to something else — not
   yet designed, since ticket 10 did not investigate hook input.
3. **Neuron will under-use a harness's real payload capacity by design.**
   Budgeting below the smallest known cap, and treating `unknown` caps as the
   most conservative known one, trades headroom for the guarantee that spill
   never silently degrades a deterministic recall into an agent-invoked one.
4. **A 2.2.0-installed hook does not self-upgrade.** A user must re-run
   `neuron init` to pick up a hook-command change in a later neuron version;
   until then `neuron status` reports its presence without claiming currency.
5. **Multi-harness repos get every detected harness wired by default**,
   which is more filesystem writes per `init` than picking one — mitigated
   by the per-target consent prompt (§6) and the new `--harness` allowlist
   (§8.4) for the user who wants fewer.
6. **Antigravity and OpenCode return only behind a research ticket that
   measures their behaviour**, per §1 — an adapter ticket cannot manufacture
   the capability facts it would need to declare.

## Amendments

### 2026-08-10 — Fourth lifecycle point: `pre-command`, Claude Code and Codex only

Ticket 12 (neuron-2.4.0) — Should `neuron exec`'s Pre-Command Lookup Become a Hook Instead? (ticket `5c0d8cd9-7f1c-4899-ae15-bd2b7398e4e1`)
extends this ADR with a fourth `LifecyclePoint`, `pre-command` — the same
reliability gap this ADR closed for recall (an agent-followed instruction
vs. a harness-executed hook) applied to `neuron exec -- <command>`, the
CLAUDE.md-instructed wrapper around the `onExec` gated query
(`src/commands/exec.ts`). Resolved by direct maintainer grilling, four
decisions:

1. **Scope: Claude Code and Codex CLI only — a permanent split, not a
   temporary one.** Unlike the three existing points, where all four
   shipped adapters have *some* injecting mechanism (a matter of degree —
   deterministic vs. session-start-only best-effort), tool-use/shell hooks
   split the four adapters in two categorically: Claude Code's
   `PreToolUse` and Codex's `PreToolUse` both support
   `hookSpecificOutput.additionalContext` (Claude Code confirmed directly
   against `code.claude.com/docs/en/hooks` on 2026-08-10; Codex confirmed
   in ticket 10's original 2.2.0 research, high confidence). Copilot CLI's
   `preToolUse` and Cursor's `beforeShellExecution` are both documented as
   **permission/gating-only** — no context-carrying field exists on either
   at all. This is not an unresearched gap ticket 13 or a future adapter
   version could close; it is what those two harnesses' hook models can
   do. Copilot CLI and Cursor keep the CLAUDE.md/AGENTS.md-instructed
   `neuron exec` step permanently, the same way they already keep the
   manual recall-query instruction today.
2. **This ADR is amended, not superseded by a new one.** `pre-command`
   reuses `CapabilityMap`/`SupportRecord` (`src/harnesses/types.ts`)
   unchanged — `injects`, `payloadCapChars`, `failurePosture`, `timeoutMs`.
   `PreToolUse` also carries a `permissionDecision` field neuron does not
   use: `neuron exec`'s existing behavior is purely informational (it
   always runs the real command; a match never blocks it), so the new
   handler only ever sets `additionalContext`, never touches the gate.
   No new field earns its place on `SupportRecord` for a capability this
   ADR's design has no use for.
3. **`additionalContext` for `PreToolUse` renders next to the tool
   result — after the command has already run, not before.** Raised and
   resolved live: `neuron exec` today already can't let the agent
   reconsider mid-execution either (it queries, prints, then spawns the
   real command synchronously in the same tool call, no intervening turn).
   The hook-based version is functionally equivalent on this axis, not a
   regression — in both cases the agent has the memory content in front of
   it before its *next* decision, never before the command that triggered
   the lookup.
4. **Protocol block and CLI surface.** `protocolBlock.ts`'s `execStep()`
   becomes fidelity-conditional the same way `recallStep()` already is —
   omitted from the generated CLAUDE.md for Claude Code/Codex once the
   hook ships, kept for Copilot/Cursor. `neuron exec`'s CLI surface is
   unchanged: it remains the Copilot/Cursor-instructed path, the
   manual/scripted/CI path, and the same underlying `onExec`
   category-matching/`queryGated` logic (`exec.ts`) the new `PreToolUse`
   handler calls too — the same reuse relationship `neuron memory
   query`'s CLI command already has with the pre-prompt hook's internal
   `memory.query()` call.

Implementation graduates as tickets 22 (adapter capability wiring + the
`pre-command` hook handler), 23 (fidelity-conditional `execStep()` +
CLAUDE.md/packaged-skill/README updates, mirroring ticket 09's role for
the git-log index), and 24 (dogfood-verify against this repo's own
install, mirroring ticket 10's role) — not designed further here.

### 2026-08-04 — `rc4` dropped; §1's Copilot CLI/Cursor line does not ship in 2.2.0

The destination narrowed to a fast, focused 3-pillar cut (deterministic
Claude Code/Codex recall, md-first storage, deterministic scanning) the day
after this ADR was accepted. §1's second bullet — "`rc4` ships `best-effort`
where it is documented: Copilot CLI (ticket 16) and Cursor (ticket 40)" — is
superseded, not withdrawn: the reasoning that produced it still holds (both
land `best-effort`, a real capability), it just isn't load-bearing for what
2.2.0 shipped. Both adapters continue unchanged as tickets `01`/`02` on
neuron-2.3.0 (map `cb2eaf8f-509a-4da8-a09b-b0c7d82deb3f` in the `tickets` category). Everything else this ADR
decided — the capability map, session-ledger dedup, payload budget, hook-target
prompting, multi-harness resolution — shipped in 2.2.0-rc3 exactly as
designed, for the two deterministic adapters.
