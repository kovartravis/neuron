Type: task
Status: resolved
Blocked by: none

# 06 — `main` Was Orphaned at v2.1.0 While npm Shipped Through v2.1.2

## Question

Does `main` actually contain the code that's published to npm?

## Context

`main` was stuck at `v2.1.0`. `v2.1.1` and `v2.1.2` had been cut, tagged and
published to npm from a branch that was never merged back — `main` didn't
contain any released code at all, including two shipped bug fixes. `npm`
said `latest: 2.1.1` (later `2.1.2`); `main` said `2.1.0`. Anyone reading the
repository's default branch saw a stale, unreleased state.

## Answer

Resolved 2026-08-01. Fixed with a real merge
([`9b4ca22`](https://github.com/kovartravis/neuron/commit/9b4ca22)), not a
rebase, so already-published tags (`v2.1.1`, `v2.1.2`) stay reachable from
the exact commits they were cut from. `main`'s own two commits — notably the
restoration of 21 agent skills a `.agents`→`.claude` migration had silently
dropped — were preserved rather than discarded.

**Workflow changed as a direct result.** The first two patches in this
series (`01`, `02`) were cut on side branches
(`fix/2.1.2-...`, `fix/2.1.3-...`) then merged after the fact. Starting with
`03` (`v2.1.4`), the maintainer said "on main" — fix directly on `main`, tag,
push, forward-port to the active feature branch by cherry-pick. That's the
standing workflow for tickets `03` through `05` and going forward.

## Comments

- 2026-08-01: `main` now reads `v2.1.6` as of ticket `05`. **Four releases
  (`v2.1.3` through `v2.1.6`) are tagged and pushed but not yet published to
  npm** — only `v2.1.2` is live on `latest`. Publishing remains the
  maintainer's step.
