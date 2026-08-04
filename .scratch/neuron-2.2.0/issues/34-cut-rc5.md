Type: task
Status: unclaimed
Blocked by: 29, 31, 32, 33, 35, 37, 38, 43, 44, 45, 46
Band: 2.2.0-rc5

# 34 — Cut and Publish 2.2.0-rc5

## Question

Does `md-only` now support the claim the product is pitched on — and is the
repositioning coherent across the README, the docs and the shipped defaults?

## Context

rc5 is the markdown-first band. Unlike rc1–rc4 it ships a *positioning* as well
as code, so the cut has an extra obligation: the release must not advertise a
claim the band failed to land. The rc2 band is the cautionary precedent — its
theme was rewritten after the route disproved it, and the map now carries a note
saying a destination that advertises a result the route disproved is how a map
starts lying.

## Scope

1. Version bump to `2.2.0-rc5`.
2. CHANGELOG covering the band. **Lead with the default change** — `md-only`
   becoming the default is the single most user-visible thing in 2.2.0, and it
   changes where memory physically lives. Even with no install base to protect
   (`31`), the release note owes a plain statement of it.
3. **Gate honestly on the parity bar `28` set.** If `md-only` retrieval is worse
   than `vector-only` on the same corpus, say so with the numbers and state
   whether that is acceptable for the recommended default. Do not ship "parity"
   as a word if the measurement says otherwise.
4. Re-run `29`'s cold-query latency measurement on the built tarball rather than
   the working tree, and confirm the README's performance wording survives it.
5. Verify the shipped tarball actually contains the repositioned docs — the
   packaged skill is listed in `package.json`'s `files` array specifically, and a
   past migration silently dropped skills from it.
6. Confirm no README claim regressed between `32`'s audit and the cut. The band
   is long enough that `31` or `33` may have moved something under it.
7. Run `npm test` and `npm run test:e2e`.
8. Tag and publish under the `rc` dist-tag.

## Known-red before you start

**Pillar 8 (multi-process contention)** fails at `3/50` rejected writes against a
`<5%` bar. Reproduced on a clean tree during ticket `26`, so it is pre-existing
and owned by nobody. `npm run test:e2e` will not be all-green; do not let it
absorb attention that belongs to this band's own failures.

## Deliverables

- [ ] `2.2.0-rc5` published under the `rc` dist-tag
- [ ] CHANGELOG leading with the default storage-mode change
- [ ] `md-only` vs `vector-only` retrieval measured and stated plainly
- [ ] Cold-query latency re-measured on the tarball
- [ ] Shipped tarball contains the repositioned docs and skill
- [ ] Unit + E2E suites run, with Pillar 8's known failure distinguished from new ones

## Comments

- 2026-08-02: Filed as the closing ticket of the rc5 markdown-first band.
