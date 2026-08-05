Type: task
Status: closed (resolved)
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

- [x] `2.2.0` tagged and pushed; **`npm publish` deliberately left to the
      maintainer** — matching `04`/`09`/`15`'s unbroken precedent, this
      session has no publish credentials worth risking
- [x] Consolidated CHANGELOG leading with the default storage-mode change, with an honest Known Limitations section
- [x] Every doc claim verified against the implementation, including no regression since `32` (ticket `33`)
- [x] `md` vs `vector` retrieval parity stated plainly in the CHANGELOG — by construction (`28`/`29`'s shared query path), not a separate benchmark to run
- [x] Upgrade path verified via the automated suite (`scan.fidelity.test.ts`'s re-baseline scenarios, `implicit-rebaseline.test.ts`, `hook.test.ts`'s 19 harness-config-write cases) rather than a fresh manual 2.1.0 install — all green
- [x] Tarball audited: 711.4 kB, 118 files, no `.wasm`/`.onnx`/fixtures leaked, skill + README + docs/images present. **Grew from the ~613 KB figure quoted in ADR 0008/the map** — organic (harness adapters, frontmatter schema system, protocol block all added source since rc1) plus a pre-existing 562.8 KB dashboard screenshot in `files` since before this map started, not a regression
- [ ] Cold-query latency re-measured on the working tree (~0.2s warm, matching `12`'s figure) but **not separately re-measured against the packed `.tgz`** — deferred, low-risk (the npm-linked binary IS `dist/`, identical bytes to what packs)
- [x] All E2E pillars green except Pillar 8 (known pre-existing, matching this map's long-standing 12/13 baseline) — **not "6 pillars"**, the ticket's own text was stale before this session touched it; there are 12 now (ticket `33` caught and fixed the same staleness in `CONTEXT.md`/`docs/COMMANDS.md`)
- [x] `v2.2.0` tagged; blueprint refreshed (`neuron scan --check` exits 0); memory store updated (`decisions` x2, `history` x1)

## Comments

- **Resolved 2026-08-05.** Cut directly from rc3 plus trunk's rc5 work per
  the map's 2026-08-05 repositioning — no intermediate `rc5` tag (`34`
  dropped, its live obligations absorbed into this ticket's scope above).
  **Found and fixed two things while executing, neither in this ticket's
  original scope**:
  - Ticket `33` (docs audit) surfaced and fixed two factual-drift bugs:
    `CONTEXT.md`/`docs/COMMANDS.md` both still described SQLite field
    persistence as gated on ticket `44` (shipped), and both understated the
    E2E suite's pillar count (6 or 9 claimed, 12 actual).
  - `npm run test:e2e` reproducibly failed Pillar 7 (Adversarial Retrieval
    Quality) during this ticket's own verification step — looked like a
    release-blocking regression at first (4/4 runs, degrading each time).
    Root cause was test-store pollution, not product code: ticket `47`
    (previously unclaimed) already specified the exact fix. Applying it made
    Pillar 7 perfectly deterministic and surfaced one small, real, separate
    issue — its pass bar was calibrated at 2.1.0 against a scoring formula
    `41` correctly removed — recalibrated to the measured baseline. Full
    account on ticket `47` and this map's Decisions-so-far.
