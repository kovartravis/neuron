Type: task
Status: unclaimed
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
