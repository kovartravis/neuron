Type: task
Status: closed (resolved)
Blocked by: 32
Band: 2.2.0-rc5

# 33 — Repoint the Docs from Architecture-First to Markdown-First

## Question

The README is one document among many that carry the old positioning. Audit the
rest and bring them into line — or record why a given document keeps its framing.

## Context

The repositioning demotes architecture scanning from headline to supporting
feature. Several documents were written when it was the headline, and several
describe `vector-only` as the real mode with `md-only` as an alternative. The
README (`32`) is the source of truth for messaging; this ticket propagates it.

Known surfaces, from a sweep on 2026-08-02 — treat as a starting list, not an
exhaustive one:

- **`CONTEXT.md`** — the domain glossary. Its storage-mode entries and its
  write-side-enrichment section both describe the vector path as the normal case.
  Note `26` has already corrected its `enriched_at` and importance entries; do
  not re-edit those.
- **`docs/COMMANDS.md`** — the flag reference. Its `neuron.yaml` example still
  shows `mode: md-only` in a config whose *schema* default was `vector-only`,
  which will become correct via `31` — verify rather than assume it needs an
  edit. Its `scan` section is the longest in the file, which is itself a
  positioning statement.
- **`.claude/skills/neuron-memory/SKILL.md`** — the packaged skill, which ships
  in the npm tarball. `31` touches its storage-mode half; this ticket covers the
  rest. **Beware:** the map already fogs a larger rewrite of this skill pending
  ticket `14` (hooks own the read side). Do not do that rewrite here — restrict
  to positioning and storage-mode framing, and leave the protocol structure alone.
- **`CLAUDE.md`** — this repo's own agent manual. It is also the template users
  see, so its framing propagates.
- **`docs/adr/*.md`** — ADRs are historical records and must **not** be rewritten
  to match new positioning. If an ADR's *decision* is superseded by the
  repositioning, amend it with a dated note, as ADR 0010 does. Rewriting an ADR
  to look prescient is how a decision log stops being evidence.
- **`docs/agents/domain.md`**, `docs/agents/issue-tracker.md` — check whether
  they carry positioning at all; they may be purely procedural.

## Scope

1. Sweep the above and anything else under `docs/`. Produce the list before
   editing, so the scope is visible rather than discovered mid-edit.
2. Bring each into line with `32`'s wording, or record why it keeps its framing.
   Both are acceptable outcomes; silently leaving one stale is not.
3. Apply the ADR rule above: amend with dated notes, never retro-edit.
4. Flag anything too large for this ticket rather than half-doing it — the
   packaged skill's protocol rewrite is the known example, and it belongs to
   `14`, not here.

## Verification

- `grep` the repo for the old framing (architecture-first, "primary feature",
  vector-only-as-default) and confirm each remaining hit is deliberate.
- The npm tarball's shipped docs match the repo's.

## Deliverables

- [ ] Full surface list produced before editing
- [ ] Each surface repointed or consciously exempted, with the reason recorded
- [ ] ADRs amended, not rewritten
- [ ] Anything oversized flagged as its own ticket rather than partly done

## Comments

- 2026-08-02: Filed as part of the rc5 markdown-first band, covering the
  handoff's "ticket group 2". Blocked by `32` because the README is the source of
  truth these documents are being aligned *to* — doing this first would mean
  aligning to a draft.
- **Resolved 2026-08-05.** Full surface sweep against `32`'s wording found the
  positioning itself already coherent everywhere checked: `CONTEXT.md`'s
  glossary already orders memory/markdown terms ahead of `Architecture Scan`,
  `CLAUDE.md` carries no architecture-first framing, `docs/agents/*.md` are
  purely procedural (confirming the ticket's own hedge), and
  `.claude/skills/neuron-memory/SKILL.md`'s storage-mode section already
  matches the shipped vocabulary. The real staleness found was **factual, not
  positional** — two doc-vs-code drifts the sweep's grep for old framing
  wouldn't have caught on its own:
  - `CONTEXT.md` and `docs/COMMANDS.md` both still said SQLite column storage
    for declared fields on `vector-only`/`split` categories was an open gap
    "until ticket 44 ships" — `44` shipped. Both corrected to state every mode
    persists declared fields identically now.
  - `CONTEXT.md` said the E2E suite spans "6 pillars" and `docs/COMMANDS.md`
    said "nine"; the actual test files (`test/e2e/*.test.ts`) define 12,
    Pillars 1–12. Both corrected to the full, named list, with Pillar 8's
    known pre-existing failure called out inline so it isn't mistaken for a
    new regression by whoever reads it next.
  - ADR 0013 amended (dated note, not rewritten) to record that ticket `46`
    — listed in its "Implemented by" — closed out of scope and continues as
    [neuron-2.3.0's ticket 13](../../neuron-2.3.0/issues/13-status-check-repair.md);
    the rest of the ADR's decisions shipped as designed.
  - ADR 0014 amended (dated note) to record that `rc4`'s Copilot CLI/Cursor
    line (§1) never shipped in 2.2.0 — superseded by the 2026-08-04
    narrowing, which predates this ticket but had never been recorded on the
    ADR itself. Both adapters continue unchanged as
    [neuron-2.3.0](../../neuron-2.3.0/map.md) tickets `01`/`02`.
  `docs/adr/*.md` otherwise left alone per the ADR rule (amend, never
  rewrite); `RELEASE_2.0.0.md`, `TEST_INFRA.md` and `CHANGELOG.md`'s existing
  entries are historical records of past releases, out of scope for the same
  reason. No surface needed a positioning rewrite — `32`'s repositioning had
  already propagated correctly everywhere it touched; this ticket's real
  yield was catching two facts the codebase had moved past since those docs
  were last touched.
