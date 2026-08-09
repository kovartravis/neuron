Type: task
Status: unclaimed
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

- [ ] `neuron.yaml` read/write switched to `yaml`'s `Document` API
- [ ] Auto-declare hook in `NeuronMemory.transact()`
- [ ] `neuron status --check`/`--repair` extended to detect/declare
      pre-existing undeclared categories
- [ ] This repo's own `scan.category` alias reverted and re-verified
- [ ] Docs swept (`docs/COMMANDS.md`, `CONTEXT.md`, packaged skill)
- [ ] Tests per Verification section; `npm test` green

## Answer

_Pending._
