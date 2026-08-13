Type: task
Status: resolved
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

- [x] Decision recorded on the correct floor/fix shape
- [x] Fix implemented, regression test added and failing pre-fix / passing
      post-fix
- [x] Audited `test/e2e/concurrency-stress.test.ts` and every sibling
      fixture using `projectRoot:` — decided against scaffolding (see Answer)

## Answer

**Decision (Scope 1):** the write-side resolver never climbs above
`projectRoot` — full stop, no "write a fresh local `neuron.yaml`" fallback.
`projectRoot` is the caller's declared boundary; a config file that lives
anywhere else, however it was found, belongs to a different project by
construction. The read-side upward walk (`findNeuronYaml`/`loadNeuronYaml`,
which resolves the actual runtime `config` object) is deliberately
untouched — it's real, tested behaviour for genuine subdirectory invocation
within one project (`neuronYaml.test.ts`'s "should walk up directories to
find neuron.yaml"), and the ticket's own Context confirms the read side was
never the reported bug (the isolated fixture's *category content* was
already correctly isolated — only the config write escaped).

Chose "in-memory only, no disk write" over "create a fresh local
`neuron.yaml` at `projectRoot`" for the no-local-config case: it's already
an existing, tested code path (`declareCategory`'s `if (this.configPath)`
guard predates this ticket), and it avoids surprising a caller who scoped
`projectRoot` to an isolated subdirectory specifically to avoid landing
anything there (creating a stray `neuron.yaml` in a fixture directory would
just be a smaller version of the same unwanted-artifact problem).

**Fix (Scope 2):** added `findWritableConfigPath(projectRoot)` in
`src/config/neuronYaml.ts` — checks only `projectRoot` itself for
`neuron.yaml`/`neuron.yml`, no upward walk at all. `NeuronMemory`'s
constructor (`src/index.ts`) now derives `this.configPath` from this
instead of `findNeuronYaml`, which stays exactly as it was for the `config`
read path. Traced why the old boundary check (stop at a `package.json`/
`.git` directory) didn't already prevent this: the loop checks for the
config file *before* checking for the boundary marker at each directory, so
a real ancestor project's root — which has both — always wins the config
check first, before the boundary check ever gets a chance to reject it.
That boundary only ever stopped a walk through directories with *neither*.

Added three unit tests in `neuronYaml.test.ts` covering
`findWritableConfigPath` directly (found at `projectRoot`; null for a
marker-less subdirectory even though `findNeuronYaml` finds the ancestor;
and the ancestor file provably untouched), plus two end-to-end tests in
`index.test.ts` against a real `NeuronMemory` + `transact()` upsert — one
reproducing this ticket's exact shape (isolated `projectRoot` nested inside
a real ancestor project, `git checkout`-style byte-for-byte assertion that
the ancestor's `neuron.yaml` never changes, plus confirming the write still
lands in-memory for the rest of the process), one confirming the ordinary
case (config at `projectRoot` itself) still declares to disk.

**Live-verified the actual reported bug, both directions.** `contention-worker.mjs`
(the real process `test/e2e/concurrency-stress.test.ts` spawns) imports from
`dist/index.js`, not `src/` — so the first live-repro attempt against a
stale `dist/` still reproduced the original bug (`git diff` showed
`stress: {}` appended to this repo's real root `neuron.yaml`, confirmed via
`git stash` on the source fix) even though the *source* fix was already
correct, purely because the build was stale. After `npm run build`, the
identical live run (real spawned processes, real repo root as the
unrelated "ancestor" project) left `neuron.yaml` byte-for-byte unchanged.
Recorded as a `learning` memory entry — this is the same stale-build trap
this repo has hit before (`neuron exec` from a stale global install), now
confirmed for `dist/` vs `src/` within a single repo checkout too.

**Audit (Scope 3):** grepped every test using `projectRoot:` (18 files).
Only `test/e2e/concurrency-stress.test.ts`'s `workDir =
path.join(process.cwd(), 'src/__tests__/temp-contention')` uses a bare
subdirectory nested inside this real repo's tree with no marker of its own
— the exact vulnerable shape. Every other fixture uses either
`fs.mkdtempSync(os.tmpdir())` (a real OS temp directory, no real ancestor
project above it to accidentally adopt) or a fully synthetic,
never-created-on-disk path like `/test/project` (nothing for a real
filesystem walk to find). **Decided against adding defense-in-depth
scaffolding**, unlike `08`'s `GIT_CEILING_DIRECTORIES` precedent: that
precedent guards an *out-of-process* escape (git's own directory discovery,
which no amount of in-process code correctness can constrain — a real `git`
binary will always walk up to a real `.git` unless told not to via
environment). This bug was the opposite — a pure in-process resolution
choice inside `NeuronMemory`'s own constructor, now fixed at the source with
full regression coverage. A second defensive layer in the fixture itself
would duplicate what the fix and its tests already guarantee, not cover a
gap they can't reach.

`npm test` 709/709, `tsc` clean. `test/e2e/concurrency-stress.test.ts`'s own
Pillar 8 still fails — but on a different, pre-existing, already-documented
error (`no such table: learnings` / `no such column: "scope"`, a concurrent
SQLite schema-migration race across multiple processes opening a fresh
database at once). Confirmed unrelated to this fix by reproducing the
identical failure on the pre-fix code too (via `git stash`): both before and
after, the same race fires; only the `neuron.yaml` mutation differs. This is
the same class ticket 17 flagged as an off-band finding ("Pillar 8's own
real e2e-runner.js run failed on a `no such column: 'scope'`
concurrent-migration race, confirmed pre-existing... squarely 18's
territory") — `18` fixed the equivalent race for markdown storage
read-modify-write cycles, not this SQLite schema-migration race, so it
remains open and out of this ticket's scope. Worth its own ticket if
pursued; not chartered here since it doesn't touch config resolution.

## Comments
