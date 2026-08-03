# Changelog

All notable changes to `@kovartravis/neuron` will be documented in this file.

## [Unreleased]

### Changed — markdown is the default, and `neuron init` says so on disk

The product's claim is that your agent's memory is markdown you can open, diff
and hand-edit. Until now that was reachable only by a path the README mentioned
in passing: the schema default was `vector-only`, and `neuron init` wrote no
`neuron.yaml` at all, so following the Quick Start verbatim produced a SQLite
database and **zero `.md` files**.

- **`storage.mode` now defaults to `md`.** SQLite is kept — under `md` it is a
  rebuildable index reconciled from the markdown on every command (ADR 0011),
  not removed. Existing projects that name their mode explicitly are unaffected.
- **`neuron init` writes a `neuron.yaml`** when the project has none, declaring
  `md` mode and the four standard categories. An existing config — including one
  in an ancestor directory that already governs the project — is never touched,
  rewritten, or merged into. `init` is re-run routinely to refresh skills, models
  and grammars, and anything it edits it would edit again over your changes. The
  JSON output gains a `config` object reporting which file governs the project
  and whether this run created it.
- **The bootstrap seed now exports undeclared categories too.** Nothing validates
  `--category` against `neuron.yaml`, so a store routinely holds categories the
  config never declares — `neuron scan` writes into `architecture`, which
  `scan.category` defaults to. Seeding only the declared set left those entries
  in the index with no markdown behind them, and the strict mirror then deleted
  them the moment someone declared the category. Measured before the fix: 1 of 2
  entries destroyed, silently, on the `vector-only` → `md` → declare-the-category
  path this default flip puts upgrading users on.
- **A failed markdown write now explains itself** on `stderr` instead of
  returning a bare `status: "error"`. An unwritable `storage.path` was
  unreachable under a `vector-only` default and is reachable under this one.
- Upgrading an existing `vector-only` project is a one-line config change: the
  first `md`-mode command exports the vector store to markdown and records
  `meta.md_seeded_at` before any mirroring happens.

## [2.2.0-rc2] - 2026-08-02

This band set out to expand the shipped Qwen1.5-0.5B model's job list and
measured its way to the opposite conclusion: **the model still has exactly the
one default-on job it had in 2.1.0** — code summarization during `neuron scan`.
Three candidate jobs were tried and none shipped: salvage query expansion and
LLM-assisted dedupe were both killed by their own pre-committed measurement bar
before reaching review, and automatic pruning's judgement arms both
false-deleted ground-truth-unrecoverable entries in testing and were removed.
What did ship moved work *off* the model instead — tags and category inference
now run on the embedder already loaded on the write path, not the LLM.

**Known pre-existing failure, unrelated to this band:** Pillar 8
(multi-process contention) fails at `3/50` rejected writes against a `<5%`
bar. Reproduced on a clean tree with this band's changes stashed; it is SQLite
write-lock contention, not enrichment.

This build also carries two entries from the markdown-first band (rc5),
which reached trunk first: `scope` removal and frontmatter round-trip fixes.
They are documented below rather than held back, since what ships in this
`rc` tag is whatever is on trunk when it is cut, not only the tickets
originally planned for it.

### Added — write-side enrichment (tags & category)

`neuron memory add` (and `update`) can now infer metadata the caller leaves
unset, instead of requiring every field up front.

- **Tags are *selected*, never generated**: cosine similarity against
  per-tag centroids (the mean embedding of entries already carrying that tag)
  over a closed vocabulary — every tag declared in `neuron.yaml`, plus every
  store tag carried by at least 3 entries. The floor of 3 is a requirement of
  the centroid method, not a tuning knob: a singleton tag's centroid is
  identical to its one entry.
- **Category defaults to the same centroid strategy**
  (`categoryStrategy: centroid`), which beat an LLM-based alternative 9 times
  out of 9 in benchmarking (the model won once). `categoryStrategy: model`
  remains available but is not the default.
- **`--category` is conditionally required**: mandatory whenever enrichment is
  disabled (`llm.enrichment.enabled: false`) or category inference is off
  (`llm.enrichment.category: off`); optional otherwise. A cold store with no
  centroids yet is the one case where inference still hard-errors and asks for
  `--category` explicitly.
- **A shared timeout primitive** (`src/components/timeout.ts`) bounds every
  enrichment call; a timeout degrades to leaving the field unset rather than
  blocking the write.
- **Degradation is counted, not silent**: `neuron status` reports
  `enrichment.degraded`, broken down by reason (`timeout`,
  `model_unavailable`, `embedder_unavailable`, `category_not_declared`,
  `no_declared_categories`, `model_disabled`, `empty_generation`) — a nonzero
  counter is how a silently-falling-back inference otherwise goes unnoticed.
- Both inferred fields reuse the embedder already loaded on the write path
  (~4ms), not a separate model load.

**Gated on strict non-regression** (ADR 0010 §7): Pillar 12 measured **delta
0.0** on `recallAt1`/`recallAt5`/`mrr` between the enrichment-on and
enrichment-off arms.

Ticket [06](.scratch/neuron-2.2.0/issues/06-write-side-enrichment.md); guardrail
design in [ADR 0010](docs/adr/0010-llm-job-guardrails.md).

### Not shipped — salvage expansion, dedupe, automatic pruning

Three jobs this band evaluated for the model's list did not clear the bar
ticket [05](.scratch/neuron-2.2.0/issues/05-llm-quality-latency-guardrails.md)
set, and none of the three shipped:

- **Query expansion for weak retrieval** — the weakness floor the design
  depended on is *inverted* on the failures it was meant to catch: the mean
  top-1 cosine on queries retrieval got wrong (0.7779) is *higher* than on
  queries it got right (0.7518). Every measured failure is confidently wrong,
  not weak, so no rewritten query could have fixed it. Ruled out before
  implementation. [Ticket 07](.scratch/neuron-2.2.0/issues/07-query-expansion.md).
- **LLM-assisted consolidation & dedupe** — pairwise cosine over 239 store
  entries found exactly one genuine same-category duplicate, findable by
  content hash with no model. The band that would catch more is full of
  semantic *opposites* sitting at cosine 0.92, which needs reliable negation
  detection neither the 0.5B model nor the embedder has. Ruled out before
  design. [Ticket 08](.scratch/neuron-2.2.0/issues/08-consolidation-dedupe.md).
- **Automatic pruning** — both candidate judgement methods (a recoverability
  binary and a recalibrated 1–5 importance scale) false-deleted
  ground-truth-unrecoverable entries in pre-committed testing (2 of 11 and 4
  of 11 respectively), including a `decisions`-category ADR that reads like
  ordinary prose. **Removed from 2.2.0.**
  [Ticket 23](.scratch/neuron-2.2.0/issues/23-configurable-automatic-pruning.md),
  [ticket 24](.scratch/neuron-2.2.0/issues/24-pruning-ab-test.md).

**The prune hazard this would have addressed is still live and unfixed**:
`neuron memory prune`'s default importance ceiling (`3`) is also the default
value every entry gets when written without `--importance`, so a bare
`neuron memory prune` deletes nearly everything older than its `--days`
window. Deferred rather than fixed —
[ticket 25](.scratch/neuron-2.2.0/issues/25-prune-config-and-collision-fix.md) —
by deliberate maintainer decision. Pass `--importance 4` or `5` on anything
that must survive a prune.

### Changed — query-path latency baseline

Measured `neuron memory query` end to end, each invocation its own process:
first invocation in a shell session (cold OS/model file cache) **~4.8s**;
steady state on repeated invocations (warm cache), **p50 ~223ms, p95 ~229ms**
over 20 runs (min 221ms, max 232ms). Write-side enrichment runs on `add`, not
`query`, so this band did not change the number — it is recorded here as the
baseline budget rc3's auto-injection hooks have to fit inside.

### Removed — `scope`

`scope` was designed for a multi-tenant ambition that was never pursued.
Measured on this project's own store: 1 distinct value across 264 entries, 0
manually-locked rows, and a promotion loop that had never fired in three weeks
of use while writing an unbounded 1.5 KB log row on every query (1.36 MB of a
3.1 MB database). It was also the only reason SQLite wasn't a pure,
rebuildable cache of the `.md` files — removing it is a prerequisite for that
claim, not a tidy-up (`docs/adr/0011`).

- **`scope` and `is_manual_scope` are dropped from the `memories` table**, and
  the `query_logs`/`learning_query_matches` tables are dropped entirely, via a
  real migration — an existing database upgrades in place with no data loss.
- **The automatic scope promotion/demotion loop is removed**, along with
  `checkAutoPromotions()`.
- **`--scope`/`--scopes` remain accepted everywhere** (`memory add/update`,
  `learn`, `history`, `query`) so existing scripts and agent invocations don't
  hard-fail, but they are now parsed, ignored, and warn on stderr — matching
  the existing `neuron learn`/`neuron history` deprecation posture.
- **A `scope:` key found in hand-edited frontmatter is silently ignored**, not
  an error, and disappears the next time that entry is written.

Ticket [38](.scratch/neuron-2.2.0/issues/38-remove-scope.md).

### Fixed — frontmatter round-trip integrity

Hand-editing a `.md` entry no longer silently corrupts it. Two defects, both
reproducible by deleting a single frontmatter line:

- **A missing `importance` line used to read back as `1`** (prune-eligible at
  every threshold) even though the writer's own default is `3`. The reader now
  agrees with the writer.
- **A missing `id` used to mint a new random UUID on every read**, with no
  write-back — `memory update`/`delete` could never target the entry again, and
  `sync` would duplicate it forever. Missing `id`/`createdAt`/`importance` is now
  generated **once** and written back to the file, so a second read is stable.
- **Duplicate `id`, unparseable YAML frontmatter, a non-numeric `importance`, or
  a `tags` value that is neither an array nor a string now hard-error**, naming
  the file, instead of silently fabricating or dropping a value. `neuron sync`
  surfaces this as a per-category error rather than picking a winner.
- Every repair writes a `[neuron warning]` line to stderr naming the file and
  field, matching the existing `neuron history`/`neuron learn` deprecation
  warnings — nothing is silent, nothing is printed to stdout.

Ticket [35](.scratch/neuron-2.2.0/issues/35-frontmatter-roundtrip-integrity.md).

### Removed — model-based importance inference

`importance` is no longer inferred. The shipped 0.5B model's judgement was
measured as noise (discrimination of -0.5 then +0.167 across consecutive runs,
per-entry stability 0.5, and a note about irreversible production data loss rated
`1`), so it shipped `off` by default in rc2 — and a dead-by-default path costs
documentation, config surface and maintenance for a signal nobody should enable.

- **`llm.enrichment.importance` is removed from `neuron.yaml`.** No action
  required: unknown keys are ignored, so a config still setting it parses without
  error. Delete the line at your convenience.
- **`neuron memory enrich` is removed.** It drained a backlog that only ever held
  entries with deferred importance; nothing defers now, so it had nothing to do.
- **`enrichment.pending` is removed from `neuron status`.** It was always `0`.
- The `enriched_at` column is kept and still stamped on every write. No
  migration, no data change.

**An omitted `--importance` stores `3`.** That is also the default ceiling for
`neuron memory prune`, and the prune compares inclusively — so passing
`--importance 4` or `5` is what keeps an entry out of a bare prune. This is
unchanged behaviour, but it is now the *only* thing that protects an entry, so it
is worth stating plainly.

## [2.2.0-rc1] - 2026-08-01

The real AST release. `TreeSitterScanner` finally uses Tree-Sitter.

### Upgrading from 2.1.0 — action required

**Your first `neuron scan --diff` after upgrading will report "Re-baseline
Required" instead of drift. Run `neuron scan` once. That is the whole migration.**

2.2.0 replaces regex symbol extraction with real Tree-Sitter AST parsing, which
changes what a scan finds. On this repository the symbol count fell from 3290 to
233 — almost all of the difference being call sites the old scanner had recorded
as `method` symbols — while genuinely *adding* symbols it had never seen, because
its export pattern matched `export function` but not `export async function`.

A blueprint card written by 2.1.0 and a scan performed by 2.2.0 are therefore
measurements taken with different instruments. Rather than report the difference
as hundreds of changes you did not make, neuron now refuses the comparison and
tells you to re-baseline.

**If you gate CI on `neuron scan --check`**, note the new exit code:

| Code | Meaning |
|------|---------|
| `0` | In sync |
| `1` | Architectural drift detected |
| `2` | Baseline not comparable — re-baseline required |

A build that starts failing with **exit 2** immediately after upgrading is
reporting the migration, not a regression. Run `neuron scan` to re-baseline.
Re-baselining is destructive to drift history: changes accumulated before it are
absorbed into the new card rather than itemised.

Users who never run `--diff` explicitly need do nothing — the implicit re-scan
behind `memory query` re-baselines silently on the next source edit.

### Added

- **Real Tree-Sitter AST symbol extraction**: `src/scanner/treesitter.ts` now
  runs S-expression queries against a parsed syntax tree instead of matching
  line-oriented regexes. Covers **TypeScript, TSX, JavaScript, Python, Go, Rust,
  Java and C++** — ten of the fourteen supported extensions. `.cs`, `.swift`,
  `.rb` and `.php` have no grammar yet and keep the line-oriented fallback.
  See ADR 0003.
  - Multi-line declarations are captured whole, with true line numbers.
  - Call sites are no longer recorded as `method` symbols. On this repository
    that alone removed 3101 phantom symbols.
  - Symbols gain `exported`, and a file's export contract is now its public
    surface rather than every symbol found in it. Methods are not exports.
  - TypeScript and TSX use hand-written queries; the `tags.scm` shipped with
    those grammars covers only ambient declaration forms.
- **Tree-Sitter grammars fetched at `neuron init`**: eight compiled `.wasm`
  grammars (8.49 MB) are downloaded from the official `tree-sitter-<lang>` npm
  packages and cached in the `env-paths` data dir, alongside the existing ONNX
  models. Pinned by version and attributed by a manifest, so an unattributable
  `.wasm` is ignored rather than loaded. Not bundled in the tarball, which stays
  ~612 KB. Honours `npm_config_registry`; a fetch failure leaves that language on
  the regex scanner rather than failing the install. See ADR 0008.
- **`NEURON_GRAMMAR_DIR`**: overrides the grammar cache location, for CI cache
  restoration and constrained environments.
- **Parser fidelity on the blueprint card**: a `## 🔬 Parser Fidelity` section
  records the parser that produced the card as `<parser>/<generation>` — a
  default plus only the files that deviate from it. See ADR 0009.
- **Incomparable-baseline detection**: `neuron scan --diff` reports
  `needsRebaseline` and names `neuron scan` as the fix rather than emitting
  phantom drift; `--check` exits `2`.
- **Loud grammar degradation**: a language that has a Tree-Sitter grammar but
  could not load it now warns on `stderr`, naming the language and `neuron init`.
  Languages with no grammar at all (Ruby, PHP, Swift, C#) stay silent, since
  their regex fidelity is expected.

### Changed

- **`web-tree-sitter`** is now a runtime dependency (~4.4 MB in `node_modules`).
  It is the only dependency added in this release.
- **Documentation describes AST parsing again.** 2.1.0 deliberately walked back
  its AST claims to match what actually shipped; those descriptions in
  `README.md`, `CONTEXT.md`, `SCAN_HELP` and the packaged `neuron-memory` skill
  are restored — but scoped to the eight grammars that exist, with the remaining
  four extensions still described as line-oriented.
- **ADR 0003 is marked implemented**, no longer deferred.

### Removed

- **`neuron scan --force`**: the flag was documented as "bypass the content cache
  and force a full re-scan" but was never read by the ingest path. It did
  nothing. `neuron scan` already re-scans and updates the card in place.
## [2.1.6] - 2026-08-02

### Fixed

- **`neuron sync` could silently overwrite fresh content with stale content.**
  When an entry existed on both the vector DB and its `.md` file with
  different content, `sync` picked a winner by comparing `createdAt` — but
  `.md` frontmatter has no `updatedAt`, and a normal `memory update` never
  changes `createdAt` on either side, so the two values are almost always
  equal. The tie-break (`mdTime >= dbTime`) then always favoured markdown,
  regardless of which side was actually newer:

  ```
  $ neuron memory update <id> "the real, fresh, correct content" --category learning
  {"status":"updated"}                    # vector DB now holds the fresh content

  # ...some time later, .md happens to still hold stale content (a transient
  # write hiccup, a stale git checkout, anything) ...

  $ neuron sync
  [sync] Sync complete: 1 to vector DB, 0 to markdown, 0 skipped.
  # the vector DB's fresh content has just been overwritten with the stale
  # markdown content, and nothing said so
  ```

  `sync` now only auto-propagates entries that exist on **just one side**
  (unambiguous). An entry present on both sides with genuinely different
  content is reported as a **conflict** — left untouched, printed by id, and
  causes a non-zero exit — rather than resolved by a guess. `--force`
  remains the explicit way to make markdown authoritative, matching its
  existing documented "force re-embed, ignoring content hashes" meaning.

  **This changes the documented "hand-edit a `.md` file, then run
  `neuron sync`" workflow.** A manual edit is, by the same reasoning,
  indistinguishable from vector-side drift — there is still no reliable
  signal for "which side was actually edited" — so it is also now reported
  as a conflict. `neuron sync --force` is required to make a manual `.md`
  edit take effect; a bare `neuron sync` is no longer sufficient. Updated in
  the packaged `neuron-memory` skill.
## [2.1.5] - 2026-08-02

### Fixed

- **`dual`-mode `update` and `delete` reported only the markdown side's
  outcome, ignoring what actually happened in the vector database.** `upsert`
  has always trusted the vector result (`vecResult.status`); `update` and
  `delete` computed the same `vecResult` and never looked at it, deciding
  success or failure purely from whether the corresponding `.md` file
  operation found the id.

  When the two stores disagree — a prior write that landed on only one side,
  a manual `.md` edit not yet reconciled with `neuron sync` — this produced a
  false negative on a real change:

  ```
  # entry exists in the vector DB; its .md copy was already removed
  $ neuron memory delete <id> --category learning
  {"status":"not_found"}   # the row WAS deleted from the vector DB
  ```

  The same happened on `update`: content was overwritten in the vector DB
  while the CLI reported `not_found`, giving no indication a change had
  occurred. There was also no signal anywhere that the two stores had
  diverged.

  Both operations now report success if **either** store actually changed,
  matching the precedent `upsert` already set. Affects `storage.mode: dual`
  and `split`-mode categories whose per-category `storage` resolves to `dual`
  (including the unconfigured default). `vector-only` and `md-only` modes
  were never affected.

- Aligned a cosmetic default-value mismatch in `split`-mode storage
  resolution (write path defaulted an unconfigured category's storage to
  `'dual'`, read path defaulted to `'vector'`). Both branches only ever
  dispatch on `=== 'md'`, so this had no behavioural effect, but the
  mismatched literal read as if it might.
## [2.1.4] - 2026-08-01

### Fixed

- **`neuron memory delete` and `neuron memory update` ignored `--category`.**
  Both subcommands require `--category` on the CLI, but it was never part of
  the SQL predicate — `delete` ran `WHERE id = ? AND project_id = ?`, so any id
  could be deleted while claiming any category, and the same was true for
  `update`. The required flag validated nothing; it looked like a safety check
  and was ceremony:

  ```
  $ neuron memory delete <id-of-a-history-entry> --category learning
  {"status":"deleted"}     # deleted regardless of the entry's real category
  ```

  Both now include `AND category = ?`. A mismatched category is treated the
  same as a nonexistent id — `{"status":"not_found"}` — and nothing is
  modified. This is a behaviour change: a call that previously "succeeded"
  against the wrong category now fails, which is what the required flag always
  implied it would do.

  This directly affected the maintenance workflow the packaged skill
  documents: it lists entries across every category (see next item), then
  passes whatever id it finds to `delete --category learning` — which
  previously deleted the entry regardless of its actual category.

- **`neuron memory list --categories a,b` silently ignored the filter.**
  `list` read only the singular `--category`; `query` already read both. A
  multi-category filter parsed without error and returned every category
  unfiltered. `list` now reads `--categories` the same way `query` does.
## [2.1.3] - 2026-08-01

Documentation only. No behaviour changes — but it corrects documentation that
described a destructive command as doing far less than it does.

### Fixed

- **`neuron memory prune` was documented as deleting "low-importance" entries
  when it deletes nearly everything.** The packaged `neuron-memory` skill told
  agents that pruning removes "low-importance history logs (importance 1–2)".
  The actual defaults are `--days 30` and `--importance 3`, and the importance
  comparison is **inclusive**.

  Because an entry written without an explicit `--importance` is stored at the
  default of **3**, a bare `neuron memory prune` deletes every history entry
  older than 30 days that was not deliberately marked 4 or 5. On the reference
  store that is **158 of 160 history entries**, against the 0 that the
  documented "importance 1–2" rule would have matched.

  There is no undo and no `--dry-run`. Nothing about the command changed in
  this release; only the documentation now describes it accurately. If you have
  run `neuron memory prune` on the strength of the old wording, the deleted
  entries are not recoverable from the database.

  Corrected in the packaged skill (§6) and in `neuron memory --help` /
  `neuron history --help`, which now label `prune` as destructive and state the
  inclusive default at the point of use.

## [2.1.2] - 2026-08-01

### Fixed

- **Unquoted arguments were silently truncated to their first word.** An
  argument containing spaces arrives as several separate `argv` entries. The
  memory subcommands read only the first and discarded the rest, then exited
  `0` and reported success:

  ```
  $ neuron memory add --category learning Fix for ONNX crash: pin onnxruntime
  {"status":"created"}          # stored the single word "Fix"
  ```

  `add` and `update` now refuse the write with a non-zero exit and a message
  naming the likely cause, rather than storing a fragment. Nothing is written
  on refusal.

  `neuron memory query` was affected in the same way — `neuron memory query
  tree sitter grammar` searched for `tree` alone, which surfaced as poor recall
  rather than as an error. A query is now joined and run in full. Reads are
  joined rather than refused because a read harms nothing and retrying is free;
  the write path is the one that must be strict.

- **Mistyped and unrecognised flags were swallowed and ignored.** Any unknown
  `--flag` fell through to the positional list and was discarded, so
  `--tag onnx` (instead of `--tags`) and `--importanc 5` (instead of
  `--importance`) both parsed as success while dropping the value:

  ```
  $ neuron memory add --category learning "content" --tag onnx --importanc 5
  {"status":"created"}          # tags: [], importance: 3 (default)
  ```

  Unrecognised flags are now rejected with a suggestion for the nearest valid
  option. Use `--` to end flag parsing when a value legitimately begins with a
  dash: `neuron memory add --category learning -- "--dash-leading content"`.

  `neuron exec -- <command>` is unaffected — its passthrough arguments are
  split off before flag parsing and are never interpreted.

- **`neuron memory add --help` stored a memory instead of printing help.**
  `--help` was treated as content by any subcommand that did not check for it
  first. `--help` and `-h` are now recognised everywhere.

## [2.1.0] - 2026-07-31

The architecture-awareness release. Neuron can now read the shape of a codebase
into memory and tell an agent when that shape has changed underneath it.

### Added

- **Codebase Architecture Scanning (`neuron scan`)**: Walks project topology,
  parses tech-stack manifests (`package.json`, `Cargo.toml`, `go.mod`,
  `pyproject.toml`), extracts symbol contracts across 14 source extensions, and
  ingests a single **Repository Architectural Blueprint** card into the memory
  store with `bge-small-en-v1.5` embeddings. Flags: `--category`, `--depth`,
  `--dry-run`, `--format json|md`, `--json`, `--force`, `--no-progress`.
- **Architectural Drift Detection (`neuron scan --diff` / `--check`)**: Compares
  live topology against the stored blueprint and reports variance in four
  buckets — `newModules`, `removedModules`, `exportChanges`, `dependencyShifts`.
  `--check` exits `1` when drift is present, for CI gating. See ADR 0006.
- **Drift Surfaced Across Commands**: `neuron status` reports
  `drift: { hasDrift, changesCount, summary }`, and `neuron exec` emits a
  non-blocking `stderr` warning on drift — both gated on `scan.enabled`.
- **Drift Guard Fingerprint**: `src/scanner/fingerprint.ts` records a reconciled
  project fingerprint after each scan so subsequent queries skip redundant
  re-scans. Primed by both `neuron init` and `neuron scan`.
- **In-Place Blueprint Upsert**: Re-scanning updates the existing blueprint card
  by id in both the vector DB and `.neuron/<category>.md` rather than appending
  a duplicate.
- **Deep Code Summarizer**: `Xenova/Qwen1.5-0.5B-Chat` runs offline via ONNX to
  produce real semantic summaries of scanned modules and export contracts.
- **Scan Progress Indicator**: `ScanProgressBar` renders phase and percentage on
  `stderr`, keeping `stdout` clean for Markdown or JSON piping.
- **Deep E2E Benchmark & Correctness Suite (`npm run test:e2e`)**: 6-pillar
  adversarial suite under `test/e2e/` covering polyglot traversal at scale,
  distractor-resistant semantic recall, high-concurrency multi-agent stress,
  drift detection and latency SLAs, storage corruption self-healing, and real
  pipeline integrity. Driven by `benchmarks/e2e-runner.js`, with results in
  `benchmarks/reports/e2e-benchmark-scorecard.json`. See ADR 0007.
- **`architecture` Default Category**: Registered in the default config for
  blueprint cards.

### Changed

- **`neuron exec` uses the real embedder.** It previously forced
  `NEURON_MOCK_EMBEDDER=true`, which returns an all-zero vector and silently
  reduced pre-command lookup to keyword matching. Semantic retrieval now
  actually runs; set `NEURON_MOCK_EMBEDDER` yourself if you want the stub.
- **Default scan category is now `architecture`** (was `decisions`), in both the
  config schema default and `neuron init`.
- **`neuron memory list` and `query` no longer require `--category`.**
  `--category` is now required only for `add`, `delete`, and `update`.
- **`neuron learn` and `neuron history` are deprecated.** Both now print a
  deprecation warning to `stderr` and delegate to `neuron memory` with the
  corresponding `--category`. Behavior is otherwise unchanged; they will be
  removed in 3.0.0.
- **Packaged skill moved** from `.agents/skills/neuron-memory/` to
  `.claude/skills/neuron-memory/`, and the repo's `AGENTS.md` is now `CLAUDE.md`.
- **Benchmark scripts reworked**: `bench:sanity` / `bench:full` are replaced by
  `test:e2e`, `bench`, `bench:report`, and `bench:view`.
- **`npm test` is scoped to `--dir src`**, keeping the unit suite (~5s) separate
  from the E2E benchmark suite.

### Fixed

- **`neuron exec` no longer mangles quoted arguments.** It joined `argv` with
  spaces and re-ran the result through a shell, so the shell word-split any
  argument containing spaces — `neuron exec -- git commit -m "two words"`
  reached `git` as four separate arguments. Multi-argument commands now spawn
  their `argv` directly with no shell. A **single** argument is still run
  through a shell, so `neuron exec -- "a && b"` keeps working for pipes and
  operators; commands needing shell syntax must be passed as one quoted string.
- **Duplicate blueprint cards** on repeated scans, caused by ingest always
  inserting instead of upserting against the existing scan entry.
- **Phantom drift immediately after ingest**: the fingerprint is captured
  *before* the scan runs, so a file edited mid-scan re-scans next time instead
  of caching a baseline that never reflected the edit.

### Known Limitations

- **`TreeSitterScanner` does not use Tree-Sitter.** Despite the class name and
  ADR 0003, symbol extraction is line-oriented pattern matching —
  `web-tree-sitter` is not a dependency and no `.wasm` grammar is loaded.
  Multi-line declarations may be truncated, and some call sites are recorded as
  `method` symbols. Documentation in this release describes the shipped
  behavior; ADR 0003 is marked **Deferred**. Tracked in
  `.scratch/architecture-scans-2.1.0/issues/06-real-tree-sitter-ast-engine.md`.
- **`neuron completion`** (shell autocompletion) was planned for this release
  and is **not** included. It moves to the next minor.
- **`npm run test:e2e` requires a local ONNX model cache** and is not runnable
  in a fully cold offline CI without a model-fetch step. A cold summarizer cache
  makes the first run substantially longer (~13 min for the 500-file fixture).

## [2.0.0] - 2026-07-31

### Added
- **Stable 2.0.0 Major Release**: Official release of offline agent memory store CLI and SDK.
- **GitHub Star Callout**: Added GitHub repository callout banner and `githubUrl` property to `neuron init`.
- **User Feedback Command**: Added `neuron feedback [message]` command with `--type` and `--title` flags to generate pre-filled GitHub issue creation URLs.
- **Native Markdown Storage Engine (`md-only`)**: In-memory vector embedding search over `.neuron/*.md` files with timestamp cache invalidation and zero `.sqlite` disk footprint.
- **Hybrid Search & Rank Aggregation**: Reciprocal Rank Fusion (RRF) combining vector embeddings and SQLite FTS5 keyword indexing.
- **Cross-Platform `node:sqlite` Fallback**: Automatic fallback when native `better-sqlite3` bindings are unavailable.
- **Local Dashboard UI (`neuron ui`)**: Dark-mode web interface for real-time memory management.
- **Bi-Directional Markdown Sync (`neuron sync`)**: Direct synchronization between Markdown memory files and SQLite vector DB.
