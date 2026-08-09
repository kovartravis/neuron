Type: task
Status: unclaimed
Blocked by: 01, 02

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

- [ ] Per-harness detection/fidelity reporting in `neuron init`, driven by `verify()`, for all four adapters
- [ ] Actionable remediation text for non-deterministic harnesses
- [ ] README compatibility matrix with a fallback row, superseding the minimal two-row note
- [ ] Plain-language explanation of the fidelity levels
- [ ] Verified-as-of version and date recorded on the matrix

## Comments

**2026-08-08, added by ticket 18's resolution:** Ticket 18 re-ran ticket
10's counterfactual A/B after the memory-supersession fix (ticket 17) and
found the regression that originally motivated this disclosure work is now
fixed (0% memory-arm failure vs 33% control on the regressed 2-task
subset, up from 67% before the fix). Not directly load-bearing for this
ticket's harness-fidelity scope, but relevant context if this ticket's
disclosure work ever touches recall-quality claims alongside fidelity
claims. Full detail: `benchmarks/token-ab/results/18-rerun-counterfactual-ab-post-supersession/findings.md`.
