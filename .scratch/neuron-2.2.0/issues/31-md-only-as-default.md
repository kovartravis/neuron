Type: task
Status: unclaimed
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

- [ ] Schema default is `md-only`
- [ ] `neuron init` writes a working `neuron.yaml`
- [ ] `init` idempotent, existing config untouched
- [ ] Packaged skill reconciled for the storage-mode half
- [ ] `neuron scan`'s category resolves under a README-shaped config

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
