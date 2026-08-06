Type: task
Status: out of scope — 2026-08-04, rc4 dropped from this map's path (see map.md's Destination callout); continues as ticket 04 in ../neuron-2.3.0/map.md, do not implement here
Blocked by: 16, 40, 19
Band: 2.2.0-rc4

# 20 — Cut and Publish 2.2.0-rc4

## Question

Are all five harnesses supported, and does what neuron *claims* about each one
match what it *does*?

## Scope

1. Version bump to `2.2.0-rc4`.
2. CHANGELOG covering the Copilot, Antigravity and OpenCode adapters, plus the
   `neuron init` reporting and README matrix.
3. **Audit claim against behaviour, harness by harness.** For each of the five,
   confirm the fidelity reported by `neuron init` and the README matrix is what
   the adapter actually delivers. Any gap is a release blocker, not a
   documentation nit — an overstated fidelity is the failure mode this entire
   theme was built to eliminate, and shipping one would be worse than shipping
   four adapters.
4. Confirm the config-safety matrix across all five: existing config preserved,
   install idempotent, uninstall clean, no double-injection when several
   harnesses coexist in one repo.
5. Note which harness versions each adapter was verified against.
6. Run `npm test` and `npm run test:e2e`.
7. Tag and publish under the `rc` dist-tag.

## Deliverables

- [ ] `2.2.0-rc4` published under the `rc` dist-tag
- [ ] CHANGELOG covering the three adapters and disclosure surfaces
- [ ] Claim-versus-behaviour audit passing for all five harnesses
- [ ] Config-safety matrix verified across all five
- [ ] Verified harness versions recorded
- [ ] Unit + E2E suites green
