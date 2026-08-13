Type: research
Status: unclaimed
Blocked by: none

# 43 — Pillar 7's `recall@5 >= 0.4` Floor Is Too Tight Against Real Build-to-Build Noise

## Question

`test/e2e/adversarial-recall.test.ts`'s Pillar 7 (Adversarial Retrieval
Quality) regression-guard floor (`recall@5 >= 0.4`) started failing during
the 2.4.0-rc2 cut, measuring `0.375` deterministically. Is the floor itself
miscalibrated against real, already-documented variance in this pillar, and
if so, what should it be recalibrated to (mirroring the file's own prior MRR
floor recalibration precedent)?

## Context

Found while cutting [38 — Cut and Publish
2.4.0-rc2](38-cut-rc2.md). Investigated as a possible real quality
regression from [29 — reranker gate](29-build-pilot-reranker-gate.md),
since 29 shipped a real, accepted false-silence tradeoff (0%→19.8%) — but
ruled that out with certainty: Pillar 7 calls `memory.query()`, never
`memory.queryGated()`, and the reranker only runs inside `queryGated()`. The
gate code is structurally unreachable from this pillar.

Bisection (real, controlled, not guessed):

1. Built `v2.4.0-rc1` in a clean `git worktree` — Pillar 7 passes cleanly,
   `recall@5 = 0.5`.
2. Ran it a second time in the same worktree, no code change — **identical**
   per-case ranks both times, byte-for-byte (`decoy-retry-budget`: 10,
   `decoy-index-rebuild`: 4, `para-token-expiry`: null, `para-memory-growth`:
   6, `contra-storage-default`: 2, `hop-cold-start`: 3,
   `hop-ci-only-failure`: null). Confirms zero within-build randomness —
   the fixture, corpus, and embedder are fully deterministic given fixed
   code.
3. On the current branch (`feat/2.4.0-rc2`, HEAD at the time), same
   controlled re-run: `recall@5 = 0.375`, also byte-identical across repeat
   runs, but three cases that ranked 10/4/3 at rc1 now rank outside the
   top 10 entirely (`null`).
4. In the **same environment** (no new `npm install`, no worktree — just
   `git checkout v2.4.0-rc1 -- src/index.ts src/models/memory.ts
   src/models/options.ts src/config/neuronYaml.ts` on top of HEAD), Pillar 7
   passes again with rc1's exact ranks. Confirms the diff is inside ticket
   29's `src/index.ts` changes specifically, not an environment/dependency
   difference between the worktree and the main checkout.
5. Narrowed further: restored every file to HEAD, then made **one** isolated
   edit — replaced `this.reranker = options.reranker ?? new
   TransformersReranker();` with an inert stub object
   (`{ score: async () => 0 }`) that Pillar 7's code path never calls.
   That alone also restored rc1's exact ranks.

So: merely *constructing* an unused `TransformersReranker` instance (a class
with no explicit constructor, one field initialized to `null`, no top-level
import-time side effects) measurably changes the real embedder's ranking
output for this pillar's adversarial near-tie cases. The only explanation
that fits every observation (build-deterministic, but sensitive to
completely inert/unrelated code) is real-world floating-point
reduction-order sensitivity in multi-threaded ONNX inference — plausible
because this pillar's hard negatives are deliberately engineered to sit
close to the gold answer (that's what makes them adversarial), so a tiny
numeric perturbation is exactly what can flip a close top-10 rank. The test
file's own header comment already anticipates this class of variance:
"Thresholds are therefore deliberately loose... this pillar earns its keep
as a tracked score, not as a tripwire" — and it has recalibrated its MRR
floor once before (2026-08-05, 0.3→0.25) for a related reason.

Re-running the *unchanged* 2.4.0-rc2 build a further time (maintainer's own
call, given at the time) reproduced the identical `0.375` failure, as
expected from finding 2 above — this is not something a retry fixes, since
there is no within-build randomness to retry past.

## Scope

1. Characterize the real variance range properly (not just the two data
   points found above): rebuild from a handful of unrelated, small,
   inert code diffs (or just repeated clean `npm install`/`npm run build`
   cycles at the same commit, in case toolchain/build nondeterminism
   contributes too) and record `recall@5` each time, to get an honest
   distribution rather than a two-point anecdote.
2. Decide the new floor from that distribution the same way the MRR floor
   was recalibrated on 2026-08-05 (measure first, then set below the
   measured baseline with real headroom) — not a guessed round number.
3. Consider whether `byFamily` breakdown should also get per-family floors,
   given `lexical-decoy` and `multi-hop` both hit `0` in the failing run —
   or whether the aggregate floor alone is the right granularity.
4. Update the test file's own comment block (mirroring the existing MRR
   recalibration comment) to document why the floor sits where it does,
   including this ticket's build-sensitivity finding so a future session
   doesn't re-diagnose it from scratch.
5. Out of scope: actually fixing the ONNX-runtime nondeterminism itself
   (thread pinning, single-threaded execution provider, etc.) — that's a
   different, larger question (perf tradeoff) this ticket doesn't need to
   answer to recalibrate a test floor.

## Verification

- The recalibrated floor is set from a real measured distribution, cited in
  the ticket's Answer, not assumed.
- `npm run test:e2e` passes cleanly on the current `feat/2.4.0-rc2` branch's
  actual code (no src/ changes needed to make it pass — only the test
  file's threshold moves).
- The test file's comment block explains the floor's basis for the next
  reader, same standard as the existing MRR comment.

## Answer

_Not yet resolved._

## Comments
