Type: task
Status: resolved
Blocked by: none

# 34 — Detect `CLAUDE.md` Protocol-Block Drift From `neuron.yaml`

## Question

Add a check (CI step and/or `status --check` finding) that regenerates the
marker-bounded protocol block in memory via the existing
`generateProtocolBlock` function and diffs it against what's actually
committed in `CLAUDE.md` (or the equivalent file per harness), failing or
warning when they disagree — closing finding **F3** from
[ticket 13's audit](13-dogfooding-gaps-audit.md).

This already happened for real once: ticket 10 found this repo's own
`CLAUDE.md` header still read `learning, history, decisions` /
`category: decisions` after ticket 01's live auto-declare changed
`neuron.yaml` out from under it, caught only by a human doing a live
dogfood pass, not by any automated check. `neuron init` only regenerates
the block on `--overwrite-hooks` or interactive consent; a non-interactive
re-init just logs `kept-existing` and leaves the drift in place
indefinitely.

Resolve:
- CI step (in `build-and-test`, alongside `32`'s architecture-drift gate)
  vs. a `status --check` finding vs. both — the audit didn't commit to
  one, and this ticket should.
- Multi-harness scope: does this generalize to every generated
  protocol/config file (`AGENTS.md`, `.github/` skill files, etc.) or stay
  scoped to `CLAUDE.md` for now.

## Answer

Landed as a fourth `status --check` finding kind, `protocolBlockDrift`,
following `01`'s `undeclaredCategories` and `33`'s `binaryVersionMismatch`
precedent exactly — plus a dedicated CI step, resolving both halves of the
open question rather than picking one:

- **CI step vs. `status --check` vs. both → both, for different reasons.**
  Protocol-block drift is a pure, git-committed-config-vs-generated-content
  check (no local-machine state involved, unlike `33`'s binary-version
  check, which is structurally local-only and would never fire in CI). That
  makes it cheap to run in both places with one implementation. Rather than
  invent a narrower CI-only surface, added a "Config/protocol compliance
  check" step to `publish.yml`'s `build-and-test` job (right after `32`'s
  Architecture drift check) that runs the *existing* `status --check`
  wholesale — so this also closes a pre-existing gap where `status --check`'s
  other three finding kinds (field compliance, undeclared categories, binary
  mismatch) were never actually gated anywhere. Confirmed safe before wiring
  it in: this repo's own tree was already 100% compliant
  (`{"compliant":true,...}`), and `binaryVersionMismatch` is structurally
  always `null` in CI (the running binary and `cwd` are the same checkout).
- **Multi-harness scope → every detected harness's own `mdFile`, not just
  `CLAUDE.md`.** Refactored `writeProtocolBlocks`'s grouping/fidelity-
  resolution logic (`byMdFile` map, `resolveHarnessFidelity` calls) out into
  a new shared `resolveProtocolTargets()`, so the check reuses the exact same
  "what should this harness's file contain right now" resolution the real
  write path uses — no duplicated logic, matching this ticket's own comment
  that no new generation logic is needed. `.claude/skills/neuron-memory/
  SKILL.md`-style skill-directory files are explicitly out of scope: they're
  a different mechanism (`copySkill`'s static template copy), not something
  `generateProtocolBlock` produces.

`checkProtocolBlockDrift()` (`src/commands/init.ts`) walks every detected
harness's resolved target file, extracts the managed region via
`findMarkerRange()` (exported from `protocolBlock.ts` for this purpose), and
flags a mismatch against what `generateProtocolBlock()` would produce today.
A target file that doesn't exist yet, or has no managed region at all, is
*not* drift — that's `neuron init`'s own job to create, not a compliance
violation. No `--repair` counterpart, mirroring `33`: the fix is `neuron
init --overwrite-hooks`, which already has its own conflict-handling.

Live-verified against this repo's own real, committed `CLAUDE.md`:
`node dist/cli.js status --check` reports `protocolBlockDrift: []` — clean,
not just clean in fixtures. New tests reproduce the real `10`/`01` incident
shape end to end (init a fixture project, hand-edit `neuron.yaml`'s
categories the way `01`'s live auto-declare did, confirm drift is reported
and the exit code is 1, confirm `init --overwrite-hooks` clears it) plus a
no-detected-harness null case. `npm test` 704/704, `tsc` clean.

## Comments

- Graduated 2026-08-12 from [ticket 13](13-audit-dogfooding-gaps.md)'s
  audit finding F3 — reuses an existing generator function
  (`generateProtocolBlock`), no new generation logic needed.
