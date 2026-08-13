Type: task
Status: claimed
Blocked by: none
Band: 2.4.0-rc2

# 39 — Category Auto-Declare Can Write to an Ancestor `neuron.yaml` Outside an Isolated `projectRoot`

## Question

`NeuronMemory`'s category auto-declare hook (ticket 01, ADR 0017) writes to
whatever `neuron.yaml` `findConfigFile()` resolves — which walks upward from
`projectRoot` with no floor. When a caller passes a `projectRoot` that has no
`neuron.yaml` of its own, should the write floor at `projectRoot` (create a
local config there, or refuse) instead of silently mutating whatever
ancestor config it happens to find?

## Context

Found live while cutting [37 — Cut and Publish
2.4.0-rc1](37-cut-rc1.md): running `npm run test:e2e` mutated this repo's
real root `neuron.yaml`, appending `stress: {}` under `categories`, even
though `test/e2e/concurrency-stress.test.ts` instantiates its
`NeuronMemory` with `projectRoot: path.join(process.cwd(),
'src/__tests__/temp-contention')` — a directory scoped away from the repo
root, specifically so the stress pillar's fixture data doesn't land in this
repo's real showcase store ([16](16-curate-neuron-store-showcase.md) just
finished cleaning that store of exactly this kind of pollution).

The category *content* itself was correctly isolated — no `stress.md` file
was created under this repo's real `.neuron/`, confirmed by inspection — so
this is narrower than a full store-isolation break. Only the **auto-declare
side effect on `neuron.yaml`** escaped, because `src/config/neuronYaml.ts`'s
`findConfigFile(startDir)` walks upward from `startDir` with no stopping
condition tied to the caller's intended root, and the fixture directory
(`src/__tests__/temp-contention/`) has no `neuron.yaml` of its own for the
walk to stop at — so it climbed straight to the real repo root's config and
wrote there for real.

Reverted by hand before this cut's release commit (`git checkout --
neuron.yaml`); not a blocker for `37` since the write is idempotent and
inert (an unused `stress: {}` block, no data behind it), but it's a real
latent bug: any real-world deployment where a project's working directory
has no `neuron.yaml` yet — e.g. a fresh subdirectory of a monorepo whose
root happens to have one from an unrelated tool or a different Neuron
project — would hit the identical silent cross-project write, not just this
test fixture.

## Scope

1. Decide the correct floor: should `findConfigFile` (or specifically the
   auto-declare write path) refuse to walk above an explicitly-passed
   `projectRoot`, or should auto-declare write a fresh local `neuron.yaml`
   at `projectRoot` instead of climbing further? (Read-only config resolution
   for normal `neuron.yaml`-having projects may have legitimate reasons to
   walk upward — e.g. subdirectory invocation within one real project — so
   the fix likely needs to distinguish "no config yet, about to write" from
   "config exists somewhere above me, keep reading it.")
2. Fix the write path accordingly; add a regression test that mirrors this
   ticket's own reproduction (an isolated `projectRoot` with no local
   `neuron.yaml`, one ancestor directory up that does have one, triggering
   an auto-declare write) and asserts the ancestor file is untouched.
3. Audit whether `test/e2e/concurrency-stress.test.ts` (and any other e2e
   fixture using a bare subdirectory `projectRoot`) should scaffold its own
   `neuron.yaml` regardless, as defense in depth — matching `08`'s own
   `GIT_CEILING_DIRECTORIES` precedent for the equivalent git-log-index leak.

## Deliverables

- [ ] Decision recorded on the correct floor/fix shape
- [ ] Fix implemented, regression test added and failing pre-fix / passing
      post-fix
- [ ] `test/e2e/concurrency-stress.test.ts` (and any sibling fixtures found
      by the audit) scaffold their own isolated config

## Answer

_Not yet resolved._

## Comments
