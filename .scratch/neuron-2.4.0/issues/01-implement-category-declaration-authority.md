Type: task
Status: resolved
Blocked by: (none)
Band: seed

# 01 — Implement Category Declaration Authority

## Question

Build [ADR 0017](../../../docs/adr/0017-category-declaration-authority.md)'s
design: categories stay advisory but self-maintaining, auto-declaring an
undeclared category in `neuron.yaml` on its first write, with existing
undeclared categories backfilled via `neuron status --repair`.

## Context

Fully designed on [neuron-2.3.0's ticket
35](../../neuron-2.3.0/issues/35-categories-authoritative-or-advisory.md) —
no open design questions remain. This is a straight implementation session
against the ADR, the same posture ticket 17 (implement memory supersession)
had against ADR 0015.

## Scope

Per ADR 0017's Decision section:

1. **Switch `neuron.yaml` I/O to the `yaml` package's `Document` API**
   (`src/config/neuronYaml.ts`, currently a plain `parse()` at line 686) so
   reads and writes preserve the user's own comments and formatting. This
   is a prerequisite for item 2 — verify round-trip fidelity (parse → no-op
   write → byte-identical, or close to it) before building the auto-declare
   write on top of it.
2. **Auto-declare hook inside `NeuronMemory.transact()`**
   (`src/index.ts:828`, the single choke point both `neuron memory add`
   (`src/commands/memory.ts:108`) and `neuron scan`'s `ingestScanResults`
   (`src/scanner/ingest.ts:47`) already funnel through). When a mutation's
   resolved category isn't in `this.config.categories`, append a minimal
   `categories.<name>: {}` block to `neuron.yaml` on disk via item 1's
   round-trip writer, and update the in-memory `config.categories` so the
   rest of the same process sees it as declared immediately (no stale
   second write for a category already added earlier in the same session).
3. **Leave inferred-category strictness untouched** — do not relax
   `matchDeclaredCategory` (`src/components/enricher.ts:205-213`) or the
   centroid path's `declared` set (`src/index.ts:1102`). This ticket only
   changes what happens when a category is *missing* from the declared
   set on an explicit or scan-originated write, not inference.
4. **Extend `neuron status --repair`** (`checkFieldCompliance`/
   `repairFieldCompliance`, `src/index.ts:905-945`) to detect categories
   with real rows in the store but no `neuron.yaml` entry, and declare them
   the same way (minimal block, same round-trip writer as item 2) —
   `neuron status --check` should report them as a distinct finding kind,
   not silently folded into per-entry field-compliance output.
5. **Revert this repo's own `neuron.yaml`**: remove the
   `scan: category: decisions` alias (added under ticket 31) so
   `scan.category` falls back to its real default (`'architecture'`),
   dogfooding the fix. Run `neuron scan` (or `neuron status --repair`)
   afterward and confirm `categories.architecture: {}` gets auto-declared
   for real, not just in a test fixture.
6. **Docs**: disclose that `neuron.yaml` is now a file the tool can write
   to, not just read — `docs/COMMANDS.md`, `CONTEXT.md`, and the packaged
   `neuron-memory` skill should each get a line, matching the audit pattern
   `neuron-2.3.0`'s ticket 34 used for its own trunk diff.

## Verification

- A fresh scaffolded project (`neuron init`, untouched template) with
  hand-added comments: writing to an undeclared category auto-appends a
  block without disturbing the hand-added comments elsewhere in the file.
- `neuron memory add --category newthing "..."` on a project without
  `categories.newthing` declared: succeeds, and `neuron.yaml` afterward has
  a `categories.newthing: {}` block.
- A second write to the same undeclared-turned-declared category in the
  same process does not attempt a second file write (in-memory config
  updated after the first).
- `neuron scan` on a project with no `scan.category` set (real default,
  `'architecture'`) auto-declares `categories.architecture: {}`.
- A store with pre-existing rows under an undeclared category (seeded
  directly, bypassing `transact()`, to simulate a pre-upgrade store):
  `neuron status --check` reports it; `neuron status --repair` declares it.
- Inferred-category behavior (centroid and model paths) unchanged — same
  fixtures/tests from ADR 0013/enricher.ts's existing suite still pass
  unmodified.
- This repo's own `neuron.yaml` reverted and re-verified live (Scope item
  5), matching the dogfooding precedent set on `neuron-2.3.0`.
- `npm test` green, `tsc --noEmit` clean.

## Deliverables

- [x] `neuron.yaml` read/write switched to `yaml`'s `Document` API
- [x] Auto-declare hook in `NeuronMemory.transact()`
- [x] `neuron status --check`/`--repair` extended to detect/declare
      pre-existing undeclared categories
- [x] This repo's own `scan.category` alias reverted and re-verified
- [x] Docs swept (`docs/COMMANDS.md`, `CONTEXT.md`, packaged skill)
- [x] Tests per Verification section; `npm test` green

## Answer

Built exactly against ADR 0017's Decision section, all six items:

1. **`neuron.yaml` I/O on the `Document` API.** `parseNeuronYaml`/`loadNeuronYaml`
   (`src/config/neuronYaml.ts`) now parse via `parseDocument(...).toJSON()`
   instead of the plain `parse()`. New export `declareCategoryInNeuronYaml(configPath, category)`
   re-reads the file fresh via `parseDocument`, no-ops if already declared
   (`doc.getIn(['categories', category]) !== undefined`), and otherwise
   `setIn`s a flow-style empty `YAMLMap` (`categories.<name>: {}`) and writes
   `doc.toString()` back — comments, key order and formatting survive.

   **Real bug found and fixed while testing this**: a `neuron.yaml` with no
   top-level `categories` key at all relies on `NeuronConfigSchema`'s Zod
   `.default(...)` for the whole block, which only fires when the key is
   *absent*. Auto-vivifying `categories.<name>` via `setIn` on such a file
   makes the key *present* with only the new entry, silently dropping every
   implicit default category and breaking `pullRules.default`'s own
   category reference. Fixed by seeding `DEFAULT_CONFIG.categories`
   explicitly first when `doc.get('categories') === undefined`, before
   appending the new category on top. Recorded as a `learning` entry.

2. **Auto-declare hook.** `NeuronMemory.transact()` (`src/index.ts`) now
   calls a private `autoDeclareCategory(m)` between `enrichUpsert` and
   `enforceFieldSchema`, scoped to `op === 'upsert' | 'update'` (matches
   `enforceFieldSchema`'s own op guard; `delete` never introduces a
   category). It delegates to `declareCategory(category)`, which mutates
   `this.config.categories[category] = {}` **in place** — `DualStorageRouter`
   and `MultiRootMdStorage` hold the exact same config object reference, so
   they see the declaration immediately with no extra wiring — then writes
   to disk via `declareCategoryInNeuronYaml` if `this.configPath` (tracked
   from `findNeuronYaml` at construction) is non-null. The in-memory check
   makes a second write for the same category in the same process a no-op
   before the disk-write path is ever reached.

3. **Minimal blocks.** `categories.<name>: {}`, no invented description or
   tags — a flow-style empty `YAMLMap`, not a block mapping.

4. **Inference untouched.** Neither `matchDeclaredCategory`
   (`enricher.ts`) nor the centroid path's `declared` set were touched.
   Regression test asserts an omitted `--category` on a cold store (no
   centroids yet) still hard-errors naming the cause, not silently landing
   in an undeclared category.

5. **This repo's own alias reverted, live.** Removed `scan: category: decisions`
   from this repo's `neuron.yaml`. Running `neuron exec -- npm run build`
   (which triggers `autoRescanIfDriftDetected`) live-declared
   `categories.architecture: {}` for real — confirmed via `neuron status --check`
   returning `{"compliant":true,"violations":[],"undeclaredCategories":[]}`.
   One stale architecture-blueprint card left orphaned in `decisions.md`
   from before the revert (the old alias-era scan write) was found and
   deleted via `neuron memory delete`.

6. **Docs disclosed.** `docs/COMMANDS.md` (a `[!NOTE]` on the Configuration
   section, plus the `neuron status` `--check`/`--repair` table), `CONTEXT.md`
   (new "category declaration authority (ADR 0017)" glossary entry), and the
   packaged `.claude/skills/neuron-memory/SKILL.md` (a `[!NOTE]` in the
   setup-interview section) all now disclose that `neuron.yaml` is a file
   the tool writes to, not just reads.

`neuron status --repair`/`--check` also gained `checkUndeclaredCategories`/
`repairUndeclaredCategories` (`src/index.ts`), surfaced as a distinct
`undeclaredCategories` JSON key — separate from `checkFieldCompliance`'s
per-entry `violations` — for the backfill case (item 6 of the ADR): a
category with real rows predating this hook.

Verification: full suite (604 tests, including new coverage in
`neuronYaml.test.ts`, `statusCheckRepair.test.ts`, `commands/status.test.ts`)
and `tsc --noEmit` both green, run via `neuron exec --` per this repo's own
protocol. Live dogfood run on this repo's real store confirmed the end-to-end
behavior, not just fixtures.
