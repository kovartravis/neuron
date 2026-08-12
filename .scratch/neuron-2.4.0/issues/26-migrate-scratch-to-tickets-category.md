Type: task
Status: resolved
Blocked by: 25

# 26 — Migrate All 19 `.scratch/` Efforts into the `tickets` Category, Then Delete `.scratch/`

## Question

Per [14](14-neuron-as-tracker-design.md) and
[ADR 0018](../../../docs/adr/0018-neuron-as-issue-tracker.md)'s migration
ruling: bulk-migrate all 19 existing `.scratch/` effort directories into the
`tickets` category [25](25-implement-neuron-tracker.md) declares, in one
mechanical pass, then delete `.scratch/` from the repository.

Per effort directory:

- Each `map.md` becomes a `tickets`-category entry (no `type`; other
  entries' content references it as their map).
- Each `issues/NN-*.md` becomes a `tickets`-category entry: `Status:` →
  `status`, `Type:` → `type`, `Blocked by:` → `blockedBy` (ticket ids need
  translating to whatever id scheme the migration assigns — decide and
  record the id-collision-avoidance approach, since ticket numbers collide
  across concurrent maps today, e.g. "ticket 39" existing on both
  neuron-2.3.0 and elsewhere), body → content, any `## Answer` section
  preserved in content.
- This map (`neuron-2.4.0`) is itself one of the 19 and gets migrated
  mid-effort — including this very ticket's own migrated form. Decide how a
  live wayfinder session handles migrating the map it's currently working
  through (snapshot-then-cutover, or pause wayfinder sessions for the
  duration).

Verify the migration (spot-check a sample of migrated entries against their
source files, confirm frontier computation via the new
scan-and-filter convention finds the same open/unblocked set the old
`.scratch` bookkeeping would have) before deleting `.scratch/`.

## Comments

- Graduated 2026-08-11 from [14](14-neuron-as-tracker-design.md)'s
  resolution alongside [25](25-implement-neuron-tracker.md), blocked on it
  landing first.

## Answer

Live investigation before touching anything found this ticket's own framing
("19 efforts, one mechanical pass") doesn't match what's actually in
`.scratch/`, and the real shape is bigger and more cross-cutting than a
single-session mechanical migration should attempt safely. Resolved as a
design/scoping pass, mirroring `12`→22/23/24, `14`→25/26, and `27`→28/29 on
this same map: decide the open questions, graduate sized execution tickets,
don't cram a high-blast-radius, ~200-file, repo-wide-reference migration
into one sitting.

**What's actually there (not 19 efforts):**

- **9 real wayfinder efforts** (have their own `map.md` +
  `issues/NN-*.md`): `2.1.x-hardening`, `agent-memory-cli`,
  `architecture-scans-2.1.0`, `hybrid-search`, `md-file-management`,
  `neuron-2.2.0`, `neuron-2.3.0`, `neuron-2.4.0` (this map), `saas-features`.
  These are what actually need migrating into the `tickets` category.
- **4 asset-only directories**, not efforts at all — confirmed by reading
  each one, not assumed: `configurable-pruning` and `salvage-expansion` are
  experiment harnesses (scripts, JSON logs, a verdict/README) for
  already-resolved tickets on `neuron-2.2.0` (tickets `24` and `07`
  respectively); `md-first` and `write-side-enrichment` are design specs for
  already-shipped/superseded decisions (`neuron-2.2.0` tickets `28` and `06`).
  None of these have a `map.md` or `issues/` shape — they don't fit the
  `tickets` category schema and shouldn't be forced into it. They relocate,
  not migrate.
- **5 dead loose scripts** at `.scratch/*.py` (`add_mem.py`,
  `check_saved.py`, `log_adr.py`, `log_final_session.py`, `log_session.py`)
  — pre-CLI, one-off `subprocess` wrappers for logging to memory by hand,
  confirmed zero references anywhere else in the repo. Delete outright, no
  relocation needed.
  ADR 0018's "19" was an overcount of this same directory listing without
  checking which entries were real efforts versus assets/cruft.

**Id-collision-avoidance scheme:** migrated tickets take their identity from
`neuron memory add`'s own generated UUID, not a carried-over sequential
number — ticket numbers already collide across concurrent maps today (e.g.
"ticket 39" exists on both `neuron-2.3.0` and this map), so preserving them
as the real id would just relocate the collision into the new store.
Migration is two-pass, mirroring the wayfinder skill's own
create-then-wire convention for fresh tickets: pass one creates every
migrated entry (map and children) and records an
`<effort-slug>#<old-number> → <new-id>` table; pass two rewrites each
entry's `blockedBy` field and any in-content cross-links (`[NN](...)`) from
old numbers to new ids using that table. The old number stays visible in
prose (e.g. "originally ticket 26 on neuron-2.4.0") purely so existing
citations elsewhere — git history, PR descriptions, `.neuron/*.md`'s frozen
history entries — stay human-resolvable, but it is never the entry's real
identity going forward.

**Self-referential map (this map is one of the 9):** snapshot-then-cutover,
not pause-wayfinder-sessions. The execution ticket migrates
`neuron-2.4.0`'s content exactly as it stands when that ticket runs
(including this ticket, `26`, in whatever state it's in at that point),
then every wayfinder session against `neuron-2.4.0` from that point on
targets the `tickets` category exclusively — `.scratch/neuron-2.4.0`
becomes a frozen snapshot, deleted along with the rest once the sweep
ticket verifies nothing still points at it.

**Cross-repo blast radius (the part that makes this too big for one
ticket):** `.scratch/` isn't only referenced from within its own tree.
A repo-wide grep found direct links from `README.md`, `CHANGELOG.md`,
`CLAUDE.md`, ten ADRs (`0003`, `0010`–`0018`), four `.claude/skills/*`
files, `.claude/settings.local.json`, and `src/components/enricher.ts`.
Separately, `.neuron/architecture.md|decisions.md|history.md|learning.md`
also reference `.scratch/` paths — those are **frozen historical record**
(what was true when each entry was written) and must **not** be rewritten
to point at new locations; only the live, committed docs/skills/source get
swept.

**Disposition of the 4 asset dirs:** `configurable-pruning` and
`salvage-expansion` relocate to `benchmarks/` (matches this repo's existing
convention for exactly this shape of thing — `benchmarks/token-ab`,
`benchmarks/architecture-card-ab`, `benchmarks/hint-follow`);
`md-first` and `write-side-enrichment` (pure prose specs, no runnable
harness) relocate to a new `docs/design/`. ADR 0010's line 268 and
ADR 0011's lines 7–8 link them directly and need their paths updated as
part of the move, not left dangling.

**Graduated three execution tickets** rather than migrating inline:

- [40 — Migrate the 9 Wayfinder Efforts into the `tickets`
  Category](40-migrate-wayfinder-efforts-to-tickets.md) — the mechanical
  content migration (map.md + issues/*.md → `tickets`-category entries,
  two-pass id/blockedBy wiring) per the scheme above. Unblocked.
- [41 — Relocate `.scratch` Asset Directories & Fix Their ADR
  Links](41-relocate-scratch-asset-dirs.md) — move `configurable-pruning`
  and `salvage-expansion` under `benchmarks/`, `md-first` and
  `write-side-enrichment` under `docs/design/`, delete the 5 dead scripts,
  update ADR 0010/0011. Unblocked, independent of `40`.
- [42 — Sweep Repo-Wide `.scratch/` References & Delete
  `.scratch/`](42-sweep-scratch-references-and-delete.md) — fix every
  remaining live reference (README, CHANGELOG, CLAUDE.md, the eight
  untouched ADRs, the four skills, `settings.local.json`,
  `enricher.ts`), leave `.neuron/*.md` historical entries untouched, verify
  the new `tickets`-category frontier scan finds the same open/unblocked
  set the old `.scratch` bookkeeping would have, then delete `.scratch/`.
  Blocked by `40` and `41` — nothing should point at `.scratch/` paths that
  are about to stop existing until both the ticket content and the asset
  dirs have somewhere real to land.

Did not attempt the migration itself this session — that's `40`/`41`/`42`,
now the map's next frontier alongside whatever else was already open.
