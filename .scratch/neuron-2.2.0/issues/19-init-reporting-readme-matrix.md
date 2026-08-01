Type: task
Status: unclaimed
Blocked by: 16, 17, 18
Band: 2.2.0-rc4

# 19 — Compatibility Disclosure: `neuron init` Reporting & README Matrix

## Question

How does a user learn which recall fidelity they are actually getting, at the
moment it matters?

## The settled decision

Disclosure happens in **two places**:

1. **`neuron init` output** — reports what it detected, what it wired, and what
   fidelity that yields.
2. **A README compatibility matrix** — the static reference across all five
   harnesses plus the fallback.

A re-runnable `neuron doctor` command was considered and ruled **out of scope**.

## Why this ticket carries weight

The recall theme's honesty rests here. Tickets `12`, `13`, `16`, `17` and `18`
each report a fidelity verdict; if that never reaches the user, neuron has an
abstraction that quietly equalises unequal harnesses — the exact failure the
architecture was designed to avoid. This is where the truth surfaces.

## Scope

1. `neuron init` reports per detected harness: detected / wired / fidelity, and
   for anything less than deterministic, **what the user can do about it** — even
   if the answer is "nothing, this harness has no hook surface".
2. Use each adapter's `verify` (from `12`) rather than inferring from config file
   contents. Reporting "wired" because a key was written, when the hook is not
   firing, is worse than reporting nothing.
3. README matrix: harness × mechanism × fidelity, including the `AGENTS.md`
   fallback row for unrecognised harnesses.
4. Explain the fidelity levels in the README in plain language. A user needs to
   understand that `instruction-only` means *the agent might skip recall* — that
   is the whole reason 2.2.0 exists, and it is the sentence that makes the matrix
   meaningful rather than decorative.
5. Note the known staleness risk: the matrix is static and harnesses change. Add
   a "verified against version X, as of date Y" line so a reader can judge its age.
6. Keep init output readable when several harnesses are present — this is the
   user's one exposure to the information.

## Deliverables

- [ ] Per-harness detection/fidelity reporting in `neuron init`, driven by `verify`
- [ ] Actionable remediation text for non-deterministic harnesses
- [ ] README compatibility matrix with a fallback row
- [ ] Plain-language explanation of the fidelity levels
- [ ] Verified-as-of version and date recorded on the matrix
