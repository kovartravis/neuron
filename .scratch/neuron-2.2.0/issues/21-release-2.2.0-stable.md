Type: task
Status: unclaimed
Blocked by: 20, 34
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

1. Promote `2.2.0-rc4` to `2.2.0` stable; publish to `latest`.
2. Consolidate the CHANGELOG into a single 2.2.0 section — Added / Changed /
   Fixed / **Known Limitations**. The limitations section is not optional:
   - languages still at regex fidelity (the 6 beyond ticket `02`'s 9)
   - harnesses at `best-effort` or `instruction-only` recall
   - any LLM job disabled or held back at ticket `09`
3. **Documentation audit against the code**, not against the rc notes:
   - `README.md` — AST claims scoped to supported languages; compatibility matrix
   - `CONTEXT.md` — `TreeSitterScanner`, Qwen1.5-0.5B, drift entries; new glossary
     terms for the recall adapter layer and fidelity model
   - `CLAUDE.md` and `.claude/skills/neuron-memory/SKILL.md` — the short protocol
   - `MASTER_HELP`, `SCAN_HELP`
   - ADRs 0003, 0008 and everything landed by `05`, `11`
4. Verify the upgrade path end to end from a real 2.1.0 install: baseline
   migration (`03`), protocol block rewrite (`14`), and harness config writes
   (`12`, `13`, `16`–`18`) all landing on a user who did not read the notes.
5. Confirm the tarball is still ~621 KB — no grammars, no models, no fixtures leaked.
6. Run `npm test` and `npm run test:e2e`; all 6 pillars green.
7. Tag `v2.2.0` and publish.
8. Refresh the blueprint: `neuron exec -- neuron scan --diff`, then
   `neuron exec -- neuron scan`. This release changes module boundaries
   substantially — a new adapter subsystem, a rewritten scanner.
9. Record the release in the memory store: an ADR under `decisions` for the
   architecture, a `history` entry for the release itself.

## Deliverables

- [ ] `2.2.0` published to `latest`
- [ ] Consolidated CHANGELOG with an honest Known Limitations section
- [ ] Every doc claim verified against the implementation
- [ ] Upgrade path from 2.1.0 verified end to end
- [ ] Tarball size verified
- [ ] All 6 E2E pillars green
- [ ] `v2.2.0` tagged; blueprint refreshed; memory store updated
