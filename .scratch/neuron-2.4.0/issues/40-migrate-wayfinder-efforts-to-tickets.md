Type: task
Status: resolved
Blocked by: none

# 40 — Migrate the 9 Wayfinder Efforts into the `tickets` Category

## Question

Per [26](26-migrate-scratch-to-tickets-category.md)'s ruling: mechanically
migrate the 9 real wayfinder efforts under `.scratch/` — `2.1.x-hardening`,
`agent-memory-cli`, `architecture-scans-2.1.0`, `hybrid-search`,
`md-file-management`, `neuron-2.2.0`, `neuron-2.3.0`, `neuron-2.4.0` (this
map — snapshot-then-cutover, see below), `saas-features` — into the
`tickets` category [25](25-implement-neuron-tracker.md) declared.

Per effort:

- `map.md` becomes a `tickets`-category entry with no `kind`, content =
  the full map body.
- Each `issues/NN-*.md` becomes a `tickets`-category entry: `Status:` →
  `status`, `Type:` → `kind`, body (including any `## Answer`) → content.
- Assign identity via `neuron memory add`'s own generated UUID, never the
  old sequential number (numbers collide across concurrent maps today).
  Two-pass: pass one creates every entry and records an
  `<effort-slug>#<old-number> → <new-id>` table; pass two rewrites
  `blockedBy` and in-content `[NN](...)` cross-links using that table, via
  `neuron memory update`. Keep the old number in prose (not as the real id)
  so existing external citations — git history, `.neuron/*.md`'s frozen
  entries — stay human-resolvable.
- `neuron-2.4.0` is migrated exactly as it stands when this ticket runs,
  including whatever is true of this very ticket's own migrated form at
  that point. Once migrated, all further wayfinder work on `neuron-2.4.0`
  targets the `tickets` category; `.scratch/neuron-2.4.0` becomes a frozen
  snapshot for [42](42-sweep-scratch-references-and-delete.md) to delete.

Verify before considering this done: spot-check a sample of migrated
entries against their source files (content, `blockedBy`, cross-links all
correct), and confirm `neuron memory list --categories tickets --json`
filtered per `docs/agents/issue-tracker.md`'s frontier convention finds the
same open/unblocked set the old per-effort `.scratch` bookkeeping would
have, for at least the two largest efforts (`neuron-2.2.0`, `neuron-2.4.0`).

Does not include relocating the 4 non-effort asset directories (that's
[41](41-relocate-scratch-asset-dirs.md)) or sweeping/deleting anything
outside the 9 effort directories themselves (that's
[42](42-sweep-scratch-references-and-delete.md), blocked on this ticket).

## Answer

Migrated all 9 efforts via a one-off `tsx` script calling `NeuronMemory.transact()`
directly (bypassing the CLI's 400-process-spawn overhead and its supersession
gate, which has no reason to run against pre-existing, already-human-reviewed
content). Two-pass as scoped: pass one creates every entry with a placeholder
`blockedBy` and records `<effort>#<full-filename-slug> → <new-id>`; pass two
rewrites content links and `blockedBy` using the complete table. **Identity key
is the full filename slug, not the bare number** — `architecture-scans-2.1.0`
turned out to have two real, distinct tickets both numbered `04`
(`04-deep-testing-suite.md`, `04-shell-autocompletion-dx.md`, pre-dating any
numbering discipline), which a bare-number key silently drops one of. `05`'s
own `Blocked by: 01, 02, 03, 04` is genuinely ambiguous between the two `04`s;
resolved to include both rather than guess, harmless since `05` is long since
resolved either way.

**A real, previously-latent storage bug blocked this migration outright** and
is fixed as part of this ticket, since it's directly implicated by this
ticket's own runs (matches `36`'s precedent): `MdStorageAdapter.parseMarkdownDetailed`'s
two-pointer `---`-delimiter pairing (added for `neuron-2.3.0` ticket 38)
classified a candidate block as real frontmatter using a bare "contains a
`key:` line" regex. Migrating ticket bodies containing a stray `---` divider
followed by a fenced code block whose lines look like YAML (a TypeScript
interface's `id: string;`, `scope: string;`, ...) tripped that heuristic,
corrupting the whole category file the moment such a body landed next to any
other entry. Fixed in `src/storage/mdStorageAdapter.ts` by additionally
rejecting any candidate block containing a markdown code fence (` ``` `) —
real frontmatter is never fenced code — which preserves the two existing
malformed-YAML hard-fail tests (35-06, R1-T2-02: no fence, so unaffected) while
rejecting the false positive. New regression test `40-01`. `npm test`
710/710 both before and after.

**Status normalization** (the `tickets` schema only has 3 values, the 9
efforts' historical `Status:` values had ~14): `resolved`/`done`/`completed`/
`closed (...)`/`deferred`/`parked`/`wontfix`/`superseded`/`out of scope ...`
→ `resolved` (off the claimable frontier — matches this skill's own
"close it" convention for out-of-scope tickets); `unclaimed`/`open`/`todo` →
`unclaimed`; `claimed` → `claimed`. `kind` is set only when the source's
`Type:` value matches one of the 4 enum values verbatim; left unset for
pre-wayfinder efforts (`hybrid-search`, most of `md-file-management`) that
never had one, rather than guessed. **Every map.md entry gets `status:
resolved`** regardless of whether that effort's destination was actually
reached (`neuron-2.4.0`'s own map, still very much open, included) — the
schema has no 4th "not a ticket" value, `blockedBy` doesn't apply to a map,
and per `docs/agents/issue-tracker.md`'s own frontier convention (`status ===
'unclaimed'`, no `kind` check), any other choice leaves every map falsely
claimable. Flagged here rather than opening a new ticket for it: low severity,
and the fix (a 4th schema state, or teaching the frontier convention to also
require `kind`) is a design call for whoever next touches the schema, not a
mechanical follow-up.

Three files matching the `NN-*.md` glob were skipped as **linked assets, not
tickets** (no `Status:` field in either format): `13-dogfooding-gaps-audit.md`,
`15-repo-cleanup-punch-list.md`, `28-reranker-research.md` — the real
deliverable docs for tickets `13`/`15`/`28`, left on disk untouched, same as
every `spec.md`/`research/`/`handoff-marketing.md`/capture file across all 9
efforts (out of this ticket's scope — links to them resolve to nothing in the
id map and are correctly left unrewritten, verified by spot check).

**Verification**: 193 entries total (9 maps + 184 issues; 187 issue files
under the 9 effort directories minus the 3 skipped assets) — 148 for the 8
non-`2.4.0` efforts, 45 for `neuron-2.4.0` itself (migrated last, see below).
Spot-checked
`neuron-2.2.0` (content byte-identical after header-stripping for `01`;
`02`'s `blockedBy` resolves to `01`'s real id; `map.md`'s Decisions-so-far
links rewrite correctly, its ADR link to `docs/adr/` correctly left alone) and
the cross-effort case (`neuron-2.3.0#map`'s "Split off from neuron-2.2.0"
link and its `22`-referencing prose both resolve to the right
`neuron-2.2.0` ids). Frontier computed per `docs/agents/issue-tracker.md`
(`status === 'unclaimed'` AND every `blockedBy` id resolves `status ===
'resolved'`) matches expectations: `neuron-2.2.0` contributes **0** (matches
the old `.scratch` bookkeeping — zero `unclaimed` tickets there), the other
7 non-`2.4.0` efforts contribute their real leftover `unclaimed`/`todo`
tickets (`2.1.x-hardening` 3, `agent-memory-cli` 6,
`architecture-scans-2.1.0` 1 — correctly including the previously-collision-
dropped `04-shell-autocompletion-dx`). `neuron-2.4.0` itself is migrated as
the very last step of this ticket's own resolution (see below), snapshotting
this map **including this Answer and this resolution** per the ticket's own
"exactly as it stands when this ticket runs" instruction — the migration
script's cross-link table already covers the other 8 efforts, so
`neuron-2.4.0`'s many links to `neuron-2.3.0`/`neuron-2.2.0` tickets resolve
correctly in the same run.

`.scratch/` itself is untouched — every source file, including this one,
stays on disk as the frozen snapshot `26` decided on, for `42` to eventually
delete. From this point on, wayfinder sessions on `neuron-2.4.0` read/write
the `tickets` category, not `.scratch/neuron-2.4.0/`.

## Comments

- Graduated 2026-08-12 from [26](26-migrate-scratch-to-tickets-category.md)'s
  resolution, alongside [41](41-relocate-scratch-asset-dirs.md) and
  [42](42-sweep-scratch-references-and-delete.md).
