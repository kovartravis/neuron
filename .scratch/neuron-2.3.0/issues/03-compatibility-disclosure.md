Type: task
Status: resolved
Blocked by: none

# 03 — Compatibility Disclosure: `neuron init` Reporting & README Matrix

## Question

How does a user learn which recall fidelity they are actually getting, at
the moment it matters — now that neuron ships a mix of `deterministic` and
`best-effort` harnesses?

## Context

**Continued from [neuron-2.2.0's ticket 19](../../neuron-2.2.0/issues/19-init-reporting-readme-matrix.md),**
closed out of scope there on 2026-08-04 at its *full* scope: with only two
`deterministic` harnesses shipping in that release, a matrix and a
remediation UX cost more than they were worth, so that map absorbed a
minimal two-row disclosure note into its own cut ticket instead. **Build on
that minimal version — do not start from scratch.** Find it in the shipped
README and `neuron init`'s output as of `neuron-2.2.0`'s stable release.

This ticket is where the original full scope becomes worth its cost: with
Copilot CLI and Cursor (`01`/`02`) landing `best-effort`, there is now a real
less-than-deterministic case to explain truthfully.

## Why this ticket carries weight

The recall theme's honesty rests here. Every adapter (`12`, `13` from
`neuron-2.2.0`; `01`, `02` here) reports a fidelity verdict; if that never
reaches the user, neuron has an abstraction that quietly equalises unequal
harnesses — the exact failure the architecture was designed to avoid. This
is where the truth surfaces.

## Scope

1. `neuron init` reports per detected harness: detected / wired / fidelity,
   and for anything less than deterministic, **what the user can do about
   it** — even if the answer is "nothing, this harness has no per-turn hook
   surface."
2. Use each adapter's `verify()` rather than inferring from config file
   contents. Reporting "wired" because a key was written, when the hook is
   not firing, is worse than reporting nothing.
3. README matrix: harness × mechanism × fidelity, covering all four shipped
   adapters (Claude Code, Codex CLI, Copilot CLI, Cursor) plus an
   `AGENTS.md`-fallback row for unrecognised harnesses. Replaces the
   two-row note `neuron-2.2.0` shipped.
4. Explain the fidelity levels in the README in plain language. A user needs
   to understand that `best-effort` means "recall may not refresh every
   turn," which is the sentence that makes the matrix meaningful rather than
   decorative.
5. Note the known staleness risk: the matrix is static and harnesses change.
   Add a "verified against version X, as of date Y" line so a reader can
   judge its age.
6. Keep init output readable when several harnesses are present — this is
   the user's one exposure to the information.

## Deliverables

- [x] Per-harness detection/fidelity reporting in `neuron init`, driven by `verify()`, for all four adapters
- [x] Actionable remediation text for non-deterministic harnesses
- [x] README compatibility matrix with a fallback row, superseding the minimal two-row note
- [x] Plain-language explanation of the fidelity levels
- [x] Verified-as-of version and date recorded on the matrix

## Answer

Resolved 2026-08-10, built in the same session that closed `01`/`02`/`20`/`22`.
Two deliverables were partially pre-existing (a `Harness | Recall` table
already covered all four adapters plus a fallback note, added ad hoc during
`34`'s rc2 doc audit without its own ticket bookkeeping) — corrected an
earlier mid-session claim to the user that the README had *no* disclosure at
all; the gap was narrower than that, but still missing three of five Scope
items.

**`src/commands/init.ts`**: new `buildHarnessFidelityReport()` /
`formatHarnessFidelityReport()`, called for every entry in
`detectedHarnessNames`. Per Scope item 2, `wired` comes from `adapter.verify()`
— every capability-injecting lifecycle point must show `registered: true` —
never from whether this run's `installHooks` just ran or from config-file
presence alone; a hook installed by an earlier session, or one this run
declined to overwrite, still reports correctly. Four cases, each with
distinct remediation text: wired + `deterministic` ("nothing to do"), wired +
`best-effort` (surfaces the adapter's own first `capability()` caveat, so
the remediation text is never out of sync with the truthful capability
record), detected-but-not-wired regardless of underlying capability
(`instruction-only`, remediation names the exact `neuron hook install
--harness <id>` command), and no-adapter-at-all (`instruction-only`,
remediation explains the model must self-invoke `neuron memory query`).
Printed as a readable block to stderr (matching the existing grammar-warning/
star-callout convention) and returned as structured `harnessFidelity` in the
JSON stdout payload for programmatic use. 5 new tests in `init.test.ts`
covering all four cases plus the no-harness-detected empty case; full suite
29/29 in that file, 599/600 overall (the one failure is `concurrency-
stress.test.ts`'s pre-existing, unrelated SQLite migration-race flake, noted
by tickets `34`/`38`). `tsc --noEmit` clean.

**`README.md`**: rewrote the "Recall is enforced, not requested" section —
added a plain-language three-item glossary of what
deterministic/best-effort/instruction-only actually mean before the table
(Scope item 4), restructured the table to genuine `Harness | Mechanism |
Fidelity` columns naming the real hook event names per adapter (`SessionStart`/
`UserPromptSubmit`/`PreCompact` for Claude Code and Codex CLI; `sessionStart`
only for Copilot CLI; `sessionStart`/`preCompact` for Cursor), added the
`AGENTS.md` fallback as a real table row instead of trailing prose (Scope
item 3), and added a verified-as-of line dated 2026-08-10 with an explicit
staleness caveat (Scope item 5) — no fabricated per-harness version numbers,
since neuron doesn't pin external harness versions; "verified against
documented behavior as of date" is the honest claim available. Cursor's row
states plainly it is **not** verified against a real installation, linking
to ticket `22`'s own Answer — the one asymmetry with Copilot CLI (`01`),
which was real-install-confirmed. Also added a matching caveat directly into
`cursor.ts`'s own `capability()` record for `session-start` (not just the
README), so the unverified-install fact lives in the truthful capability
source `neuron init`'s own reporting reads, not only in prose a user might
not open.

Nothing in `claudeCode.ts`/`codex.ts`/`copilot.ts` changed — their `verify()`-
driven reports were already accurate; this ticket was pure reporting/
disclosure work, no adapter behavior changed.

## Comments

**2026-08-08, added by ticket 18's resolution:** Ticket 18 re-ran ticket
10's counterfactual A/B after the memory-supersession fix (ticket 17) and
found the regression that originally motivated this disclosure work is now
fixed (0% memory-arm failure vs 33% control on the regressed 2-task
subset, up from 67% before the fix). Not directly load-bearing for this
ticket's harness-fidelity scope, but relevant context if this ticket's
disclosure work ever touches recall-quality claims alongside fidelity
claims. Full detail: `benchmarks/token-ab/results/18-rerun-counterfactual-ab-post-supersession/findings.md`.
