Type: task
Status: resolved
Blocked by: none

# 02 — Packaged Skill Understated `memory prune`'s Blast Radius by the Entire Dataset

## Question

Does the shipped `neuron-memory` skill describe what `neuron memory prune`
actually deletes?

## Context

The skill — which `neuron init` copies into every user's project as agent
instructions, and which ships inside the npm tarball — said pruning removes
*"low-importance history logs (importance 1–2)"*.

The shipped code deletes `importance <= 3`, inclusive. Every entry written
without an explicit `--importance` is stored at the default of `3`. Measured
against this project's own store:

| | entries matched |
|---|---|
| documented rule (`<=2`) | **0** of 160 |
| actual code (`<=3`) | **158** of 160 |

No undo, no `--dry-run`. A user following the documentation would believe
they were clearing a handful of trivial notes and instead lose essentially
their entire history.

## Answer

Resolved 2026-08-01, documentation only — no code behaviour changed. The
packaged skill's §6 now carries an explicit warning stating the real
defaults and the inclusive comparison, a preview-first instruction (`neuron
memory list` before pruning, since `prune` has no `--dry-run`), and worked
examples. Both `--help` blocks now label `prune` as destructive and state
the inclusive default at the point of use.

Shipped as `v2.1.3`
([`3474f2d`](https://github.com/kovartravis/neuron/commit/3474f2d)), forward-
ported onto `feat/2.2.0-tree-sitter-grammars`.

**Also caught in the same pass, same branch:** `CLAUDE.md` and the 2.2.0
skill claimed omitting `--importance` lets write-side enrichment infer it.
It does not — `importance` ships `off` (ticket 06 on the 2.2.0 map), so an
omitted `--importance` is simply stored as `3`, colliding with this same
prune ceiling. Both documents corrected in the same commit.

## Comments

- 2026-08-01: The live hazard this describes (default write importance `3`
  == default prune ceiling `3`) is **not** fixed by this ticket — only the
  documentation is now honest about it. The actual fix was wayfinder ticket
  `25` on the neuron 2.2.0 map, which the maintainer deferred. See
  `.scratch/neuron-2.2.0/issues/25-prune-config-and-collision-fix.md`.
