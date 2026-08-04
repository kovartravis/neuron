Type: grilling
Status: resolved
Blocked by: none
Band: 2.2.0-rc3

# 11 — Recall Adapter Architecture

## Question

What is the interface between neuron and a harness, such that five backends with
genuinely unequal capabilities can sit behind it without the abstraction lying
about what any of them does?

## Context

Ticket `10` establishes what each harness can do. This ticket decides the shape
that accommodates them.

The central design hazard: an abstraction that makes all five look alike will
hide that some are deterministic and some are best-effort. That is precisely the
unreliability 2.2.0 exists to eliminate. **Capability must be a first-class part
of the interface**, not a footnote — ticket `19` has to report it to the user, and
per settled decision the `CLAUDE.md` protocol changes *differently* depending on
whether a given harness enforces recall.

## Decisions this ticket must resolve

1. **The adapter interface.** What does a harness adapter implement — detect,
   install, uninstall, verify, report-capability? What does `install` mean for a
   harness with no hook surface (answer: write the `AGENTS.md` fallback)?
2. **Capability model.** Is fidelity an enum (`deterministic` / `best-effort` /
   `instruction-only`), or per-lifecycle-point (a harness might do deterministic
   session-start but not pre-prompt)? The latter is more truthful and more complex.
3. **What gets injected, and when.** Session start seeds the blueprint card once;
   pre-prompt injects query results per turn. Are both always on? Configurable in
   `neuron.yaml`?
4. **Payload budget.** The hard one. The PersonaMem run retrieved 28k tokens
   successfully and the *large* model then over-reasoned on it. Auto-injecting on
   every turn makes this worse, not better. Decide the token ceiling, the
   relevance floor, and the truncation strategy. Ticket `09` supplies the measured
   query latency this must fit inside.
5. **Detection vs. consent.** `neuron init` writing into `.claude/settings.json`
   or `~/.codex/config.toml` modifies files the user did not ask it to touch. Is
   that opt-in, opt-out, or prompted? What about uninstall?
6. **Multi-harness projects.** A repo may have both `.claude/` and `AGENTS.md`.
   Do all detected harnesses get wired, or only a chosen one?
7. **Idempotency and upgrades.** Re-running `neuron init`, or a neuron upgrade
   that changes the hook command, must not duplicate or orphan hook entries.
8. **Existing-config safety.** Users have their own hooks. Merging into their
   config without clobbering it is a hard requirement — and a likely source of
   the worst bug in this release.

## Deliverables

- [x] ADR recording the adapter interface and capability model
- [x] Payload budget: token ceiling, relevance floor, truncation strategy
- [x] Consent/opt-in policy for writing harness config, plus an uninstall path
- [x] Multi-harness resolution rule
- [x] Idempotency + config-merge safety requirements for `12`–`13` and `16`–`18`

## Settled — grilling session 2026-08-03

Seven of the eight decision points are resolved. **Point 6 was not reached** —
the ticket stays open for it alone.

**Point 4 resolved 2026-08-03 by `39`: the relevance floor is *none*.** Full
500-question LongMemEval run found no (cosine floor, band) pair clears the
pre-committed bar — every floor from 0.50 to 0.70 regresses recall on real
conversational text, because on-topic and negative-control top-1 cosine
overlap too far to cut cleanly (a *thinner* margin than technical prose, the
opposite of what the pilot's own hedge worried about). The lexical leg's
false-silence rate, the other open risk, measured 0% across all 500 questions
and every category. So the payload budget's floor and truncation strategy are
now **both** settled by argument alone: the character ceiling (point 5) is the
sole volume control, and there is no relevance-based rejection beneath it in
this release. Detail: [ADR 0012's amendment](../../docs/adr/0012-relevance-gate-and-score-decontamination.md#amendment-ticket-39-2026-08-03--the-cosine-floor-and-the-config-surface).

### 1. Scope cut to what can be described — points 1, and the premise of the rest

`10` found all six harnesses have a real injection mechanism, so the
`instruction-only` tier came back **empty of researched harnesses** — it now
serves only *unlisted* ones. But the four `best-effort` harnesses fail for four
different reasons, and two of those reasons are *"the reliability cannot be
stated at all"*.

- **rc3 ships `deterministic`:** Claude Code + Codex CLI, plus the
  `instruction-only` fallback for unlisted harnesses.
- **rc4 ships `best-effort` where it is documented:** Copilot CLI (`16`) and
  Cursor (`40`, new).
- **`17` (Antigravity CLI) and `18` (OpenCode) are out of scope for 2.2.0** — not
  for weak mechanisms (OpenCode's is the richest of the six) but because neuron
  would have to label a capability it has no source for. That is the abstraction
  lying, which is this ticket's stated hazard.

Two implementations is exactly enough to test whether the interface survives
contact, which is what `12`/`13` were for.

### 2. Capability is a per-point map, the headline label is derived

Neuron owns the lifecycle-point vocabulary; each adapter translates into its
harness's names (`SessionStart`, `sessionStart`, `PreInvocation`, `chat.message`).

Capability is `lifecyclePoint → supportRecord`, where the record carries injects
(yes/no), payload cap, failure posture, timeout, and caveats. The
`deterministic`/`best-effort` enum is **derived for display** (`neuron init`
output, README matrix) and **never stored** — one source of truth, no drift.

The enum alone is insufficient because Copilot and Cursor occupy the same cell
and are not equivalent: Cursor documents fail-open with opt-in `failClosed`;
Copilot leaves failure, timeout, payload cap and disable switch undocumented.
That difference is invisible to a lifecycle map that only records coverage.

**`unknown` is a first-class value, distinct from both a known value and "no".**
An undocumented payload cap is not the same as no cap. This is precisely what
justified the scope cut above — if the type cannot express it, the code cannot
explain its own scope decision, and the next reader assumes blanks mean "none".

### 3. Pre-prompt injection is deduplicated by a session-scoped ledger

Unconditional per-turn injection means a 50-turn session re-injects the same
entries 50 times — one recall and 49 repetitions, each paying context, walking
straight into the PersonaMem over-reasoning result this ticket cites.

Neuron records which entry ids it has injected for a session and **injects only
the delta**. The relevance floor (point 4) sits underneath so weak matches never
enter the ledger.

**Load-bearing and unverified:** this needs a session identity from hook input.
`10` investigated what hook output can *reach* the model, **not what the hook
receives** — grepping the research for `session_id`/stdin/transcript returns
nothing. `12`/`13` must verify this before building on it. If no session id is
available the ledger has nothing to key on and this design fails.

### 4. A third lifecycle point, `context-reset`, execution-only

Compaction silently invalidates the ledger: an entry injected at turn 3 and
compacted away at turn 40 is gone from context while the ledger still says
"delivered" — recall that fails *quietly*.

The useful asymmetry: **clearing a ledger is a side effect, not an injection.**
Payload caps and `additionalContext` support are irrelevant; the hook only has to
*run*. So harnesses whose compaction hooks explicitly ignore stdout (Codex's
`PreCompact`/`PostCompact` do) can still clear the ledger. `injects: false` is a
legitimate, useful support record rather than a disqualification — confirmed
available on **both** deterministic harnesses.

Where unavailable, fall back to a **turn-count TTL**, so the degraded path fails
toward *repetition* rather than *silence*. Repetition costs tokens; silence costs
the recall this release exists to guarantee.

### 5. Neuron enforces its own ceiling and never relies on spill — point 4, partial

Both deterministic harnesses cap injected context and both spill overflow to a
file, showing the model a preview plus a path.

**Overflow converts deterministic recall back into agent-invoked recall** — the
model must *choose* to read the file. That is the exact failure this release
exists to eliminate, reintroduced at the last inch by a size limit, and it
triggers precisely when the payload is largest, i.e. when the query matched a
lot.

- Neuron budgets **strictly below the smallest harness cap** and never relies on
  spill. Where a harness's cap is `unknown`, use the most conservative known cap
  rather than assuming headroom.
- **Count characters, not tokens.** Exact and free; tokenising on the hook path
  costs per-turn latency to approximate a limit one harness states in characters
  anyway.
- **Asymmetric budgets:** `session-start` large (fires once, carries the
  blueprint card), `pre-prompt` small (the repeated cost, and deduplicated).
- **Drop whole entries, never truncate mid-entry.** A half-entry can assert what
  the full entry qualifies. Dropped entries stay unledgered so they remain
  eligible next turn.

**Still open:** the relevance floor's numbers → **`39`**.

### 7. `neuron init` prompts for the hook target

The sharp axis is *which file*, because that determines blast radius. Committing
a hook to `.claude/settings.json` means a colleague who clones the repo has their
harness executing `neuron` every turn — a binary they may not have installed,
configured by a command they never ran. It degrades rather than breaks (both
harnesses treat a failing hook as non-blocking), but it is not a state to put
someone in silently.

**Init asks** how the user wants it set up, offering user-global / project-committed
/ project-local. `--yes` and `--no-hooks` for non-interactive runs, so init never
blocks on a prompt it cannot show. **Uninstall is a real command**, not a
documentation paragraph.

### 8. Init asks before overwriting an existing entry

Idempotency and config safety are the same question: *given a config file with
hooks in it, which are mine?*

Two mechanisms were proposed and **both rejected during the grilling**, for the
same underlying reason — each needs a referent that drifts across versions:

- **Byte-identity against what neuron would write** — has no fixed referent. An
  entry written by 2.2.0 and read by 2.3.0 differs from 2.3.0's canonical form,
  so 2.3.0 classifies every correctly-installed hook as hand-edited and refuses
  to upgrade it. Carrying a table of every prior version's output fixes it and
  grows without bound.
- **Structural match on "fields neuron manages"** — the managed-field set is
  itself version-dependent, so 2.3.0 managing a field 2.2.0 ignored shifts the
  comparison underneath. Same problem, smaller.

**Resolution: neuron does not classify. It asks.** If an entry already exists at
a hook point, init shows it and asks whether to overwrite. No provenance record,
no version history, no managed-field list.

- Non-interactive: `--overwrite-hooks` / `--keep-hooks`, defaulting to **keep and
  warn**, so CI never silently replaces anything.
- Consequence to accept: **neuron does not self-upgrade its hook.** A 2.2.0 entry
  survives until someone re-runs init. Fine while the hook command stays
  backward-compatible; `neuron status` can report "hook present, written by an
  older version" — reporting what it found without classifying it.

Format targets, which make this tractable:

- **Codex: write `hooks.json`, not `config.toml`.** Hooks may live in a sibling
  `hooks.json` (`~/.codex/hooks.json` or `<repo>/.codex/hooks.json`). TOML
  round-tripping typically destroys comments and key ordering, so a naive
  read-modify-write of `config.toml` would strip annotations from a file the user
  hand-maintains. Writing a JSON file neuron owns avoids the class entirely.
- **Claude Code:** plain JSON, so parse/modify/serialise is lossless enough — but
  edit only the relevant array elements and re-serialise the rest untouched.
  Never regenerate the file. Claude Code also deduplicates hooks by command/args,
  so an identical re-write is free there; Codex has no such documented behaviour,
  making idempotency neuron's own job on that side.

### Correction to the record — surfaced, not resolved

The map records ticket `09`'s query-latency baseline as **cold ~4.8 s**, warm p50
~223 ms. Measured on this machine, three consecutive fresh processes:
**0.20 / 0.20 / 0.22 s**. A hook pays a fresh process every turn, so the cold
figure was the number the payload budget was supposed to fit inside — and it does
not reproduce. Likely a genuine first-ever run (model fetch, cold page cache).
Steady-state per-turn cost is ~200 ms, comfortably inside Claude Code's 30 s
`UserPromptSubmit` timeout.

Separately, the map's gist of `05` reads *"measured 0.4375–0.5565"* as though any
top hit scores that low. The source (`07`'s out-of-scope entry) is *a **nonsense**
query's top hit **score*** — RRF, not cosine, and a different population. It cost
a wrong turn during this grilling before the source was checked. **No
contradiction**; `39` carries a one-word fix to the gist.

## Answer

**Point 6 (multi-harness resolution), grilled 2026-08-03, closing the ticket.**

`neuron init` wires hooks into **every detected harness**, not a chosen one —
matching the precedent `detectHarnesses` (`src/config/harness.ts:15-19`)
already set for skill-copying, which filters to all matches rather than the
first. A repo with both `.claude/` and `.codex/` more often means different
contributors use different harnesses than one person using both at once;
picking "the one" would silently leave a teammate's harness un-instrumented
with no signal why. Point 7/8's per-target consent and overwrite-ask already
give a finer-grained per-harness opt-out than an all-or-nothing choice here
would.

Four sub-decisions fall out of "wire all":

1. **The `AGENTS.md` instruction-only fallback is layered, not additive.** It
   is written only when **no** deterministic/best-effort harness matched at
   all — never alongside a deterministic hook. Writing it unconditionally
   would restate step 1 of the `CLAUDE.md` protocol (self-invoked recall) on a
   harness where the settled "protocol split" already deletes that step,
   undermining the hook it sits next to.
2. **The hook-target prompt (point 7) is asked once per `init` run**, not
   once per harness, and the answer (user-global / project-committed /
   project-local) applies uniformly to every harness being wired. It reflects
   how this contributor wants to work across their toolchain, not a
   per-harness preference — asking it per-harness would turn a
   three-harness repo's `init` into a wall of near-identical prompts.
3. **The overwrite-ask (point 8) still fires per hook file**, unaffected by
   the above — whether a conflicting entry exists is a fact about that one
   file, not a preference that can be answered once and reused.
4. **New flag: `--harness <list>`** (e.g. `--harness claude,codex`) narrows
   wiring to a subset of *detected* harnesses. It only filters what
   `detectHarnesses` already found — it cannot force-wire a harness whose
   marker directory doesn't exist, since bootstrapping a harness from
   scratch is a different feature than choosing among the ones already
   present. Sits alongside the existing `--yes` / `--no-hooks` /
   `--overwrite-hooks` / `--keep-hooks` flags from points 5 and 8.

Full decision record for all eight points:
[ADR 0014 — Recall Adapter Architecture](../../docs/adr/0014-recall-adapter-architecture.md).

## Comments

- 2026-07-31: Decision ticket — resolve with `/grilling` and `/domain-modeling`
  before any adapter is built. `12` and `13` are the two implementations that
  test whether this interface survives contact.
- 2026-08-03: Grilled six of eight points (above). Unclaimed rather than
  resolved: point 4 acquired blocker `39`, and **point 6 (multi-harness
  resolution) was never reached** — a repo with both `.claude/` and `AGENTS.md`
  still has no rule. Resume there; it is independent of `39` and could be
  grilled before the benchmark lands.
- 2026-08-03: Point 4 resolved by `39` (no cosine floor ships). Point 6
  grilled and resolved (above) — all eight decision points now settled.
  Ticket closed. Unblocks `12` (Claude Code adapter) and `13` (Codex adapter).
