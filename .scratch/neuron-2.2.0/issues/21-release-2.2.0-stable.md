Type: task
Status: unclaimed
Blocked by: 15, 29, 31, 32, 33, 35, 37, 38, 43, 44, 45
Band: 2.2.0

# 21 — Release 2.2.0 Stable

## Question

Is the whole release coherent — and does every claim in the docs match the code,
this time?

## Why that framing

2.1.0 shipped with `README`, `CONTEXT.md` and ADR 0003 all describing "static AST
analysis" that the code did not perform. The fix was correcting the documentation
during release prep. **The lesson recorded from that release is the standard this
one is held to**: verify each claim against the implementation before publishing,
rather than assuming the docs kept pace across four rcs.

## Scope

1. Version bump straight to `2.2.0` stable; publish to `latest`. (`rc4` was
   dropped from this map's path on 2026-08-04 — see map.md's Destination
   callout — and `rc5`'s separate tag+publish step was dropped in turn on
   2026-08-05 as ticket `34` — see its Comments — so this cuts directly from
   rc3 plus trunk's rc5 work, with no intermediate rc5 tag.)
2. Consolidate the CHANGELOG into a single 2.2.0 section — Added / Changed /
   Fixed / **Known Limitations**. **Lead with the default storage-mode
   change** (`31`'s `md` becoming the default is the single most user-visible
   thing in this release and changes where memory physically lives —
   absorbed from `34`'s scope). The limitations section is not optional:
   - languages still at regex fidelity (the 6 beyond ticket `02`'s 9)
   - **deterministic recall ships for Claude Code and Codex CLI only** —
     Copilot CLI and Cursor land `best-effort` per ticket `10`'s research and
     continue in [neuron-2.3.0](../neuron-2.3.0/map.md),
     not this release; say so as a roadmap item, not an apology
   - any LLM job disabled or held back at ticket `09`
3. **Documentation audit against the code**, not against the rc notes:
   - `README.md` — AST claims scoped to supported languages; compatibility matrix
   - `CONTEXT.md` — `TreeSitterScanner`, Qwen1.5-0.5B, drift entries; new glossary
     terms for the recall adapter layer and fidelity model
   - `CLAUDE.md` and `.claude/skills/neuron-memory/SKILL.md` — the short protocol
   - `MASTER_HELP`, `SCAN_HELP`
   - ADRs 0003, 0008 and everything landed by `05`, `11`
   - Confirm no README claim regressed between `32`'s audit and this cut
     (absorbed from `34`'s scope) — `33` and `31` both landed after `32`.
4. **Gate honestly on the parity bar `28` set** — state the `md` vs `vector`
   retrieval comparison plainly; do not ship "parity" as a word if the
   measurement says otherwise (absorbed from `34`'s scope).
5. Verify the upgrade path end to end from a real 2.1.0 install: baseline
   migration (`03`), protocol block rewrite (`14`), and harness config writes
   (`12`, `13`) all landing on a user who did not read the notes.
6. Confirm the tarball is still ~621 KB — no grammars, no models, no fixtures
   leaked — **and that it contains the repositioned docs and skill**
   (`package.json`'s `files` array has silently dropped a skill before;
   absorbed from `34`'s scope).
7. Re-run `29`'s cold-query latency measurement on the built tarball rather
   than the working tree, and confirm the README's performance wording
   survives it (absorbed from `34`'s scope).
8. Run `npm test` and `npm run test:e2e`; all 6 pillars green (Pillar 8
   multi-process contention is a known pre-existing failure, reproduced on a
   clean tree during `26` — do not let it absorb attention that belongs to
   new failures).
9. Tag `v2.2.0` and publish.
10. Refresh the blueprint: `neuron exec -- neuron scan --diff`, then
    `neuron exec -- neuron scan`. This release changes module boundaries
    substantially — a new adapter subsystem, a rewritten scanner.
11. Record the release in the memory store: an ADR under `decisions` for the
    architecture, a `history` entry for the release itself.

## Deliverables

- [ ] `2.2.0` published to `latest`
- [ ] Consolidated CHANGELOG leading with the default storage-mode change, with an honest Known Limitations section
- [ ] Every doc claim verified against the implementation, including no regression since `32`
- [ ] `md` vs `vector` retrieval parity measured and stated plainly
- [ ] Upgrade path from 2.1.0 verified end to end
- [ ] Tarball size verified and contents confirmed (docs + skill present)
- [ ] Cold-query latency re-measured on the built tarball
- [ ] All 6 E2E pillars green (Pillar 8's known failure distinguished from new ones)
- [ ] `v2.2.0` tagged; blueprint refreshed; memory store updated
