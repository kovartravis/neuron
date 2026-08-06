Type: task
Status: unclaimed
Blocked by: 01, 02, 03, 05, 06, 07, 08, 09, 10, 11, 13

# 04 — Cut and Publish 2.3.0

## Question

Are all four harnesses supported, is the config vocabulary one vocabulary, and
does what neuron *claims* match what it *does* in both cases?

## Context

**Continued from [neuron-2.2.0's ticket 20](../../neuron-2.2.0/issues/20-cut-rc4.md)**
(there, "Cut and Publish 2.2.0-rc4"), closed out of scope on 2026-08-04 when
that map dropped the `rc4` band from its path entirely.

The version was left open here — "a `2.2.x` point release, a `2.3.0` minor, or
something else" — and was **settled as `2.3.0`** on 2026-08-04 when this map
was renamed from `neuron-harness-expansion` and took on the config band
(`05`/`06`). A removed config mode is a minor-version change on its own, and
this map is now the next release rather than a single theme, so the cut is
`2.3.0` and this ticket's job is to ship it, not to pick it.

**Scope grew with the map.** `05` and `06` change the `neuron.yaml` storage
vocabulary — per-category path override, per-category mode override, `split`
deleted — so this cut carries a config migration story alongside the harness
one. It is also a **catch-all** release: anything else admitted to this map
before the cut lands here too, so re-read the map's Decisions-so-far before
writing the CHANGELOG rather than assuming these six tickets are all of it.

## Scope

1. Apply the `2.3.0` version bump.
2. CHANGELOG covering the Copilot CLI and Cursor adapters, the `neuron init`
   reporting and README matrix upgrade from ticket `03`, and the `05`/`06`
   config changes — the latter with an explicit **upgrade note**: which old
   spellings still parse, what warning they emit, and what a config carrying a
   previously-inert `categories.*.storage` value now does.
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
6. **Upgrade a real pre-`2.3.0` project.** Take a `2.2.x` config using each
   old spelling (`split`, `vector-only`, and a plain `mode: md` carrying a
   per-category `storage` value) and confirm the documented behaviour is what
   happens — including that no markdown file or index row is lost. `05` and
   `06` both touch the strict mirror, which deletes index entries absent from
   markdown; a migration bug here loses data silently rather than erroring.
7. Run `npm test` and `npm run test:e2e`.
8. Tag and publish.

## Deliverables

- [ ] `2.3.0` published
- [ ] CHANGELOG covering both new adapters, the disclosure upgrade, and the config vocabulary change with its upgrade note
- [ ] Claim-versus-behaviour audit passing for all four harnesses
- [ ] Config-safety matrix verified across all four
- [ ] Real pre-`2.3.0` config upgraded with no data loss, per old spelling
- [ ] Verified harness versions recorded
- [ ] Unit + E2E suites green
