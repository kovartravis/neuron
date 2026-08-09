Type: task
Status: resolved
Blocked by: none

# 13 — `neuron status --check`/`--repair`: Report and Repair Non-Compliant Entries

## Question

Implement the validation surface [ADR 0013](../../../docs/adr/0013-configurable-frontmatter-schema.md)
reopened, folded into `neuron status` rather than a new top-level command (the
no-new-commands non-goal stays intact).

`--check` lists entries that violate a category's currently-declared schema —
covering entries written before a field was declared required (reads never
hard-error on old data; only new create/update writes are gated).

`--repair` fixes what's safely fixable:
- Applies a configured `default:` fallback where one exists.
- Offers **centroid-based inference for enum-typed fields only** — same
  content-to-label mechanism as write-side tag/category centroids, which
  measured 9/9 against the model's 1/9 on `neuron-2.2.0`.
- **Never fabricates a value for a free-text identity field** (`reviewedBy`,
  `ticket`, …). There is no content signal that could produce a person's name
  or a ticket number, and `neuron-2.2.0`'s map already measured this exact
  failure shape three times (importance noise, ruled-out dedupe, the
  frontmatter reader's fabrication bug). Those fields are only listed as
  missing, for a human or an agent told to go find the real answer.

Needs SQLite column parity for declared fields (already shipped on
`neuron-2.2.0`) so `--check`/`--repair` cover `vector`-mode entries
identically to `md`-mode entries, not just markdown files.

## Comments

- Continued from [neuron-2.2.0's ticket 46](../../neuron-2.2.0/issues/46-status-check-repair.md),
  closed out of scope on 2026-08-05 when that map dropped its rc5 cut ticket
  and shipped stable without it — the validation surface `36`/ADR 0013
  reopened is real but not load-bearing for the three pillars 2.2.0 narrowed
  to on 2026-08-04. A fresh effort per wayfinder rules (closed-out-of-scope
  work returns only as a new ticket, not a resumption), but the design is
  already fully specified from `36`'s grilling and `43`/`44`/`45` shipped its
  prerequisites (declarable field schema, SQLite additive migration, `strict`
  mode) — so this ticket carries that design forward rather than re-deriving
  it.

## Answer

Built exactly to the design carried forward from `36`/ADR 0013/`46` — no open
design questions, so this was an implementation session, not a grilling one.

**`NeuronMemory.checkFieldCompliance()`** (`src/index.ts`): for every category
with at least one currently-`required` field, reads every live (non-superseded)
row directly from the SQLite mirror — forcing a reconcile first via the same
`router.query({ limit: 0 })` pattern `findById`/`findSupersessionCandidate`
already use, so `md`-mode entries are visible too — and reports
`{ id, category, missingRequiredFields }` for any row where a required
field's column is `NULL`. Scoped to *currently*-declared categories/fields
only, matching ADR 0013's "reads never hard-error on old data" posture: a
field removed from config, or a category the store holds rows for but
`neuron.yaml` no longer declares, is silently out of scope rather than
flagged.

**`NeuronMemory.repairFieldCompliance()`**: calls `checkFieldCompliance()`,
then per violation, per missing field:
1. A configured `default:` wins outright (no inference attempted).
2. A free-text (`string`-typed) field with no default is left in
   `unresolved` untouched — never fabricated.
3. An enum-typed field with no default gets centroid-based inference: builds
   one centroid per declared enum value from every other live entry in the
   same category already carrying a value for that field, via the exact same
   `buildCategoryCentroids`/`selectCategory` functions write-side category
   enrichment uses (repurposed directly — "category" is just a generic label
   parameter, so no duplicate centroid-math was needed), then picks the
   nearest label above `selectCategory`'s existing similarity floor against
   the violating entry's own stored embedding. No other entry to build a
   centroid from (a cold field) also lands in `unresolved`, never guessed.

Centroid sets are cached per `(category, field)` pair for the duration of one
repair run — built lazily, so a run with only default-fillable violations
never touches the embedding table at all. Fields that do get a value are
written back via one `transact([{ op: 'update', ... }])` per violating entry,
reusing `enforceFieldSchema`'s existing validation rather than bypassing it.

**CLI wiring** (`src/commands/status.ts`, `src/commands/utils.ts`,
`src/config/neuronYaml.ts`): `--repair` added as a new reserved flag
alongside the already-reserved `--check` (which existed for `neuron scan
--check` but had no `status` meaning yet). `neuron status --check`/`--repair`
short-circuit before the existing default JSON status payload, are mutually
exclusive (hard error if both are passed), and both exit `1` — `--check` when
any violation exists, `--repair` when anything is left `unresolved` after
the fixable ones are applied — the same CI-gate posture `scan --check`
already established. Added `STATUS_HELP`.

**Found and fixed a real, pre-existing async-ordering bug while wiring
this in**: `src/cli.ts`'s `status` branch did `return
handleStatusCommand(memory)` without `await`, inside a `try { ... } finally {
memory.close(); }`. Calling an async function executes it synchronously up to
its first *real* suspension point; `return <that promise>` hands control to
`finally` immediately rather than waiting for it, so `memory.close()` ran
before any pending continuation inside `handleStatusCommand` resumed. This
never surfaced as a visible bug before: the original status handler stayed
fully synchronous unless `scan.enabled` was true, and even then the only
`await` (`getArchitecturalDrift`) was already wrapped in a
`try/catch` that silently downgrades any error — including
"database connection is not open" — to `hasDrift: false`. `--check`/
`--repair` have no such catch-and-downgrade path, so the same race surfaced
immediately as a hard `TypeError` in the CLI-level test. Fixed by awaiting
(`return await handleStatusCommand(memory, args)`), matching every other
subcommand branch in `cli.ts`, which already awaited before returning.

**Testing**: `src/statusCheckRepair.test.ts` (8 new unit tests against
`NeuronMemory` directly, using the same deterministic hash-embedder pattern
`enrichment.test.ts` uses so centroid inference is actually exercised, not
just structurally invoked) plus 2 new CLI-level tests in
`src/commands/status.test.ts` (spawning `dist/cli.js`, simulating a real
schema-evolution upgrade by rewriting `neuron.yaml` between an add and a
`status --check`/`--repair` call). Full suite `npm test`: 578/578, up from
568. `tsc --noEmit` clean. `npm run test:e2e` not run — grepped for coupling
first (`status`/`--check`/`--repair`/`FieldCompliance` appear only in
unrelated synthetic-corpus fixtures and `benchmarks/e2e-runner.js`'s own
generic `--check` pass-through), same reasoning `05`/`06`/`23` used.
Dogfooded against this repo's own real store: `neuron status --check` →
`{"compliant":true,"violations":[]}` (this repo declares no required fields
today, so trivially compliant).

Docs swept: `docs/COMMANDS.md`'s `neuron status` section, `MASTER_HELP`'s
one-line command summary.
