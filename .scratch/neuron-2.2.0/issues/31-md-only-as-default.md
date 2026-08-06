Type: task
Status: resolved
Blocked by: 29, 38
Band: 2.2.0-rc5

# 31 — Make `md` the Actual Default

## Question

The repositioning says `md-only` is the default. It is not. Make it so, and make
`neuron init` produce a project that matches what the README describes.

## Context

Two separate facts combine into one gap:

1. **The schema default is `vector-only`** — `src/config/neuronYaml.ts:12`
   (`mode: StorageModeEnum.default('vector-only')`) and again at `:115`
   (`storage: StorageConfigSchema.default({ mode: 'vector-only', path: '.neuron' })`).
2. **`neuron init` never writes a `neuron.yaml`.** There is no config-file
   generation in `src/commands/init.ts` at all — it detects the agent
   instructions file, downloads ONNX models, fetches grammars, and runs a scan.

So a user who follows the README's Quick Start verbatim — `npm install -g`,
`neuron init`, `neuron memory add` — gets a SQLite database and **zero `.md`
files**. The section headed *"What it looks like in your repo"*, showing
`.neuron/learning.md`, describes something that only happens if the user
separately asks an agent to run the setup interview and that interview chooses
`md-only`. The product's headline claim is currently reachable only by a path the
README mentions in passing.

**Migration is explicitly not a concern here.** The maintainer's ruling
(2026-08-02): *"I have basically no users anyway."* Do not build detection for
pre-existing SQLite stores, do not write a dual-mode fallback, do not add an
upgrade path. Flip the default and move on. If this turns out to be wrong, the
fix is a release note, not architecture.

## Scope

1. Change the schema default to `md-only` in both places in
   `src/config/neuronYaml.ts`, and audit for any third place a default mode is
   assumed (`DEFAULT_*` consts, test fixtures, the `neuron ui` code path).
2. Have `neuron init` write a `neuron.yaml` when none exists, containing at
   minimum the storage block and the default categories. It should match the
   README's configuration example — that example is the contract.
3. Decide what `init` does when a `neuron.yaml` already exists. Leaving it
   untouched is almost certainly right; say so in the code rather than leaving it
   implicit.
4. Reconcile with the packaged `neuron-memory` skill, which owns the setup
   interview today. If `init` now writes a working default config, the interview
   becomes a *refinement* step rather than the only way to get a usable project —
   the skill's §0 needs to say that. Note the map already fogs a larger rewrite of
   this skill pending `14`; keep this edit to the storage-mode half.
5. Check `neuron scan`'s default category (`architecture`) still resolves — the
   README's config example declares only `learning`, `history` and `decisions`,
   so a scan against a README-shaped config may file into an undeclared category.
   This is a real interaction, not a hypothetical: verify it.

## Verification

- In an empty directory: `neuron init && neuron memory add --category learning
  "..."` produces `.neuron/learning.md` and no SQLite file.
- `neuron init` twice in a row is idempotent and does not clobber an edited
  `neuron.yaml`.
- The generated `neuron.yaml` parses, and every key in it is one the current
  schema actually reads — no aspirational keys. (`llm.enrichment.importance` was
  removed by [`26`](26-remove-model-importance-inference.md); do not reintroduce
  it in a template.)
- Unit + E2E green, including whatever fixtures assumed `vector-only`.

## Deliverables

- [x] Schema default is `md` (rescoped from `md-only` by `28`)
- [x] `neuron init` writes a working `neuron.yaml`
- [x] `init` idempotent, existing config untouched
- [x] Packaged skill reconciled for the storage-mode half
- [x] `neuron scan`'s category resolves under a README-shaped config

## Answer

**The default is `md`, and `neuron init` now writes the config that says so.**
Two lines in `src/config/neuronYaml.ts` (`StorageConfigSchema.mode` and
`NeuronConfigSchema.storage`) plus a new `src/config/scaffold.ts` that `init`
calls before anything reads config. The audit for a third place found none:
`neuron ui`, `neuron status` and `neuron sync` all read the mode rather than
assume one, and the only other literal is the router's invalid-mode fallback,
which is **deliberately not** a duplicate of the default (see below).

### The scope item that turned out to hide a data-loss bug

Scope item 5 asked whether `neuron scan`'s default category `architecture`
"still resolves" under a config that declares only `learning`/`history`/
`decisions`. It resolves — writes land in `.neuron/architecture.md` and the card
is queryable, because nothing validates `--category` against `neuron.yaml`. But
asking the question surfaced a worse one, one number away from it.

`bootstrapSeed` seeded only the **declared** categories, then set
`meta.md_seeded_at`. An undeclared category's vector rows were therefore never
exported to markdown — harmless, because the mirror never visits an undeclared
category either — right up until someone declares it. The mirror then visits a
category whose markdown was never written, finds index rows markdown does not
have, and deletes them. Exactly as designed, on data the seed skipped.

Measured on the CLI before the fix, on the `vector-only` → `md` →
declare-`architecture` sequence: **1 of 2 entries destroyed, silently.** This is
this ticket's bug, not `29`'s: before the default flip, nobody reached `md` mode
without asking for it, and `scan.category` defaults to `architecture` while no
config template is required to declare it.

Fixed by making the seed take the **union** of the requested and the stored
categories — a seed is a one-time complete export or it is not a safety net.
Steady-state reconcile still runs on the declared set only, since that is a
per-command cost and an undeclared category is inert there. Needed one new
public method, `NeuronMemory.listStoredCategories()`. The regression test fails
without the fix (verified by reverting the one line).

### Decisions

1. **`init` never touches an existing config** — not to add missing keys, not to
   merge. `init` is re-run routinely to refresh skills, models and grammars, so
   anything it edits it edits again over the user's hand-tuning. Detection reuses
   `findNeuronYaml`, so a config in an **ancestor** directory that already
   governs the project counts as present; writing a second file would silently
   shadow the first. Stated in code, per scope item 3.
2. **The generated file is the contract; the README must match it.** The ticket
   said the README example is the contract, but that example predates `28` (it
   says `mode: md-only`, a mode that no longer exists) and omits `architecture`
   while `scan.category` defaults to it. A generated file executes; a README
   example is prose. `32` should publish `NEURON_YAML_TEMPLATE` rather than the
   draft's block.
3. **The template turns nothing on that the schema defaults leave off.**
   `scan.enabled` stays `false`, matching a config-less project, so generating
   the file changes what a project *says*, not what it does. An `init` that
   quietly started scanning — loading the summarizer, filing a blueprint card
   nobody asked for — would be a behaviour change disguised as a convenience.
4. **The router's invalid-mode fallback stays `vector-only`** and is now
   documented as intentionally different from the schema default. It fires only
   for a mode string that bypassed Zod. `md` runs a mirror that deletes; guessing
   `md` on a config we do not understand converts "unrecognised setting" into
   data loss. The safe failure direction is the read-only mode.
5. **`NeuronMemoryOptions.storageMode` added** to pin the mode for callers whose
   `projectRoot` is fabricated. `NeuronMemory.inMemory()` invents
   `/in-memory/<name>`, so the new default aimed markdown writes at a path that
   cannot exist; 22 test fixtures constructing a `NeuronMemory` as the router's
   *vector collaborator* had the same problem, since production passes the router
   a vector-only delegate, not a `NeuronMemory` that routes again. Pinning makes
   the fixtures match production rather than papering over the flip.
6. **A failed markdown write now names its reason on stderr.** `status: "error"`
   with no explanation was unreachable under a `vector-only` default and is
   reachable under this one (read-only checkout, unwritable `storage.path`).
   Verified with `chmod 500 .neuron`.

### Corrections to this ticket's own text

- *"and no SQLite file"* in Verification is void. `28` deleted `md-only`; under
  `md` the database is always present as a rebuildable index. The observable
  claim is that the **project directory** holds `.md` files, and the SQLite file
  lives outside it in the `env-paths` data dir unless `NEURON_DB_PATH` says
  otherwise.
- The *"migration is not a concern"* paragraph was already superseded by the
  2026-08-02 comment; the seed bug above is the second, unanticipated way that
  original ruling was wrong.

### Not done, deliberately

- **The README** stays for `32`, which is blocked on this ticket precisely so it
  can describe the finished state. Its storage-mode table still names `md-only`
  and `dual`, which `28` deleted — a factual error `28` introduced, and `32`'s to
  fix, not one to half-repair here.
- **This repo's own `neuron.yaml` still says `vector-only`.** Flipping it would
  bootstrap-seed 264 vector entries into `.neuron/*.md` on the next command —
  a real, consequential change to the maintainer's own store, and the maintainer's
  call, not this ticket's. Worth making, since the project not dogfooding its own
  headline default is how the next defect goes unfound.

### Verification

- Empty dir: `neuron init` → `neuron.yaml` with `mode: md`;
  `neuron memory add --category learning "…"` → `.neuron/learning.md`. ✅
- `init` twice: second run reports `created: false`, hand-edited config
  byte-identical. ✅
- Generated config parses, and a round-trip test asserts **every** key in the
  template survives `NeuronConfigSchema.parse` — no aspirational keys, and
  `llm.enrichment.importance` (removed by `26`) is asserted absent. ✅
- `scan.enabled: true` against the generated config: card written to
  `.neuron/architecture.md`, queryable, counted by `neuron status`. ✅
- **290 → 303 unit tests, full suite green.** 12/13 E2E pillars; Pillar 8
  (`table memories has no column named scope`) is the pre-existing failure `09`
  already recorded, unrelated to storage mode.

## Comments

- 2026-08-02: Filed as part of the rc5 markdown-first band. Blocked by `29` and
  `30` deliberately: flipping the default before `md-only` has search and
  enrichment would make the out-of-box experience *worse* than today's, which is
  the opposite of the repositioning's point.
- 2026-08-02: **Rescoped by [`28`](28-md-only-parity-design.md).** The mode being
  defaulted to is now `md` (today's `dual`, renamed), not `md-only`, which is
  deleted. Blocker `30` is gone (out of scope); `38` added.

  **One ruling above is superseded.** The *"Migration is explicitly not a
  concern here… do not build detection for pre-existing SQLite stores, do not add
  an upgrade path"* paragraph was made when the default flip was harmless. It is
  no longer, because `28` also settled a **strict mirror**: an entry absent from
  markdown is deleted from the index. Flipping the default with no upgrade path
  now means an existing store's entries are deleted on the next command rather
  than merely ignored.

  The evidence is this repository, which is the maintainer's own store — SQLite
  holds **264** entries, `.neuron/*.md` holds **15**, last written 2026-07-29.
  A bare default flip destroys 249 entries that were never in a `.md` file for
  git to restore. "No users" does not cover the maintainer.

  The upgrade path is therefore **in scope, and lives in
  [`29`](29-md-only-semantic-search.md)**, not here: the bootstrap seed exports
  vector → markdown on first `md` run and records `meta.md_seeded_at`. This
  ticket may assume it exists and must not flip the default without it. That is
  why `29` blocks this ticket.

  Scope item 1 changes: the schema default becomes `md`, and `md-only`/`dual`
  alias to it with a deprecation warning rather than being removed as config
  values.
