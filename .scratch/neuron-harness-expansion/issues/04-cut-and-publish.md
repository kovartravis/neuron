Type: task
Status: unclaimed
Blocked by: 01, 02, 03

# 04 — Cut and Publish

## Question

Are all four harnesses supported, and does what neuron *claims* about each
one match what it *does*?

## Context

**Continued from [neuron-2.2.0's ticket 20](../../neuron-2.2.0/issues/20-cut-rc4.md)**
(there, "Cut and Publish 2.2.0-rc4"), closed out of scope on 2026-08-04 when
that map dropped the `rc4` band from its path entirely. The version this
lands as (a `2.2.x` point release, a `2.3.0` minor, or something else) is
not yet decided — that's this ticket's own call to make when the other three
are done, informed by what actually shipped between here and there.

## Scope

1. Decide and apply the version bump.
2. CHANGELOG covering the Copilot CLI and Cursor adapters, plus the
   `neuron init` reporting and README matrix upgrade from ticket `03`.
3. **Audit claim against behaviour, harness by harness.** For each of the
   four adapters, confirm the fidelity reported by `neuron init` and the
   README matrix is what the adapter actually delivers. Any gap is a release
   blocker, not a documentation nit — an overstated fidelity is the failure
   mode this entire theme was built to eliminate, and shipping one would be
   worse than shipping two adapters instead of four.
4. Confirm the config-safety matrix across all four: existing config
   preserved, install idempotent, uninstall clean, no double-injection when
   several harnesses coexist in one repo.
5. Note which harness versions each adapter was verified against.
6. Run `npm test` and `npm run test:e2e`.
7. Tag and publish.

## Deliverables

- [ ] Version published
- [ ] CHANGELOG covering both new adapters and the disclosure upgrade
- [ ] Claim-versus-behaviour audit passing for all four harnesses
- [ ] Config-safety matrix verified across all four
- [ ] Verified harness versions recorded
- [ ] Unit + E2E suites green
