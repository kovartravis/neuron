Type: research
Status: unclaimed
Blocked by: none

# 09 — Does `computeMemoryHash` Ever Get Compared Across Different IDs?

## Question

`computeMemoryHash` hashes `content|tags|scope|importance|taskId` — notably
**not** `id`. `sync` uses it to decide "has this entry changed" by comparing
the hash of the md-side and vector-side copies **of the same id**. Is there
any path where hashes get compared, deduplicated, or matched *across*
different ids, where two genuinely different entries with coincidentally
identical content would collide?

## Context

Unverified suspicion, not a reproduction. `mdVectorSync.ts`'s duplicate-ID
handling (`seenIds` in `syncMdWithVector`) dedupes by `id`, not by hash, so
that path looks safe on inspection. Worth checking:

- Whether any future consolidation/dedupe work (wayfinder ticket `08` on the
  `neuron-2.2.0` map — currently out of scope, but its supersession
  question may return) would reuse `computeMemoryHash` for candidate
  matching in a way that conflates "same content" with "same entry."
- Whether `sync`'s own hash comparison could ever run against the wrong
  counterpart entry if `mdMap`/`dbMap` keying ever diverges from `id`.

## Comments

- 2026-08-02: Genuinely speculative — flagged from reading the hash
  function's shape while auditing `05`, not from any observed failure.
  Lowest priority of the open items in this batch; may resolve to "no bug
  here" on a first pass.
