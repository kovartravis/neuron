# Changelog

All notable changes to `@kovartravis/neuron` will be documented in this file.

## [2.4.4] - 2026-08-17

**`neuron` is now installable without Node.js.** `curl -fsSL
https://raw.githubusercontent.com/kovartravis/neuron/main/install.sh | sh`
(macOS/Linux) and `powershell -c "irm
https://raw.githubusercontent.com/kovartravis/neuron/main/install.ps1 |
iex"` (Windows) install a real standalone binary — packaged with
`@yao-pkg/pkg`, built for macOS/Linux/Windows across x64/arm64 in a new CI
matrix, published as GitHub Release assets in the same run as the npm
publish. Both install scripts verify the downloaded binary against the
release's `SHA256SUMS` and refuse to install on a mismatch. `npm install -g
@kovartravis/neuron` stays fully supported — this is an additive second
path, not a replacement. `neuron upgrade` self-updates a standalone-binary
install in place (checksum-verified, atomic); it's a no-op pointing at `npm
install -g @kovartravis/neuron@latest` for an npm install. `neuron
--version` is new. Binaries ship unsigned at launch (no code-signing
credentials available yet), so macOS/Windows will show a Gatekeeper/
SmartScreen warning on first run — expected, not a bug; the packaged
ONNX-backed features (embeddings, reranking, NLI, summarization) currently
run on the WASM fallback rather than the native `onnxruntime-node` binding,
since it can't load inside a pkg snapshot.

## [2.4.3] - 2026-08-16

**The write gate now catches near-duplicate paraphrases and flags real
contradictions, not just malformed entries.** `enforceFieldSchema` already
enforced *shape*; this release closes the *quality* gap the antagonistic-write
pillar measured in 2.4.1. Near-duplicate detection (`--supersedes` /
`--not-a-reversal` / `--if-novel`) is rebuilt as a widen-by-cosine →
strip-known-template → rerank pipeline, replacing the old single-candidate
0.97-cosine check that a genuine paraphrase could slip under. A same-category
write that likely *contradicts* a live entry (measured via a local NLI
cross-encoder) now soft-flags with a `possibleConflict` pointer instead of
silently landing — A/B-tested against several alternative NLI models first;
none cleared the bar for a harder, refusing hard-block, so this ships as
soft-flag. A new `commitRef` field type plus a `git-notes` category let a
memory entry cite a real commit, validated against the repo at write time. A
new `--companion-of <id>` flag exempts a deliberate companion write from the
near-dup gate against one named entry. Session-conclusion recording no longer
duplicates a full `decisions`/`learning` entry into `history` — `history`
now carries a short pointer sharing the same `taskId`.

**Agents are now nudged to record what they decided, not just what they
did.** A live A/B test found close to zero natural compliance with this
project's own write-side memory protocol once a session has real competing
work (control collapsed to 20%) — a nudge or explicit instruction both held
100%. A new `pre-stop` lifecycle point, backed by each harness's real
per-turn stop-and-escalate hook (`Stop`/`agentStop`/`stop` — not a
fire-and-forget session-end event), ships this generally via `neuron init`
on every supported harness, not as a dogfood-only mechanism.

**Tracker hygiene.** The `history` category is retired — real usage was 238
entries deep (list's default limit had been hiding most of it), and every
special-cased reference to it in the type system, CLI, and UI is now a
generic, config-driven `--category` instead. This repo's own issue tracker
now splits tickets into `tickets-present` / `tickets-past` / `tickets-future`
by temporal status, so an actively-sequenced map's working set no longer
shares a single ever-growing file with hundreds of closed tickets from prior
releases. A same-id `upsert` into a different category now actually moves
the row instead of silently leaving it stranded under its old category.

npm test 778/778, tsc clean.

## [2.4.1] - 2026-08-15

**The `pre-command` hook no longer repeats itself, and every hook injection
now says where it came from.** `pre-command` (the automatic pre-execution
safety lookup shipped in 2.4.0) fired fresh on every single Bash tool call
with no memory of what it had already shown — a busy session could see the
identical entry reinjected dozens of times. It now shares the same
session-scoped dedupe ledger `pre-prompt`/`session-start` already use, so
an entry shown once by any hook point doesn't repeat again until the next
compaction — without borrowing their char budget, so a burst of tool calls
can't starve a turn's own prompt-time recall. Every injected block —
`session-start`, `pre-prompt`, and `pre-command` alike — now also opens
with a short, stable label identifying it as recalled from the project's
own local memory store, so it reads as what it is rather than an
unattributed block indistinguishable in shape from adversarial content
elsewhere in a tool's output.

**A new resident test pillar answers whether the write path catches bad
writes, not just malformed ones.** `enforceFieldSchema` already rejects a
missing required field or an undeclared enum value, but was never designed
to catch a near-duplicate paraphrase, a direct contradiction of a live
entry, or a category that should require a source and doesn't. Measured
directly rather than assumed: none of those three are caught today. In
particular, this repo's own `decisions` category has no required
provenance field, so an unsourced decision entry is accepted with no error
— a real, now-confirmed gap the next release's write-time-quality work
addresses.

## [2.4.0] - 2026-08-15

This section supersedes and consolidates `2.4.0-rc1`, `2.4.0-rc2`, and
`2.4.0-rc3` below into one stable release.

**Recall is more accurate and covers more ground.** A local, offline
cross-encoder reranker now second-gates every relevance match before it's
injected — on the hardest out-of-corpus test we could build, that cut the
false-accept rate from 99.80% to 19.4%, with no remote API call involved.
Your repo's own commit history joins memory as a searchable resident
source: a prompt naming a feature or a bug now surfaces the real commit
that shipped the fix, not just your written notes — live-measured to match
a hand-tuned oracle's 0% failure rate. And on Claude Code and Codex CLI,
the pre-execution safety lookup that used to be a manual step now fires
automatically on every shell command, the same way prompt-time recall
already did.

**`neuron status` grew from a health check into a real diagnostic
surface.** `--health`/`--repair` finds and cleans up near-duplicate
entries; `--check` now also catches a stale global binary and a
`CLAUDE.md`/`AGENTS.md` instructions file that's drifted from what your
config would generate today — all four checks are gated in this repo's own
CI, not just available locally.

**Several real, previously-latent bugs got found and fixed** while working
on other things this cycle: `neuron init` was silently onboarding harnesses
you don't use whenever a bare `.github/` directory existed; drift detection
could resolve the wrong project root and overwrite your architecture card
with a scan of the wrong tree; category auto-declare could climb past an
isolated project's own root and mutate an *ancestor* project's config; a
fresh SQLite database opened by multiple processes at once could hit a
migration race.

**The memory store's filtering primitives are now schema-agnostic and
reusable for any structured category** — `neuron memory get <id>`,
repeatable and negatable `list --where`, and `--refs-satisfy` for
cross-referencing declared fields, none of it tied to any one project's
vocabulary.

Full detail on every change is in the `2.4.0-rc1`/`rc2`/`rc3` sections
below.

## [2.4.0-rc3] - 2026-08-14

Third interim checkpoint on the neuron-2.4.0 map, audited directly from
`git log v2.4.0-rc2..HEAD` rather than assumed from the map's nominal
ticket numbering.

- **Fixed a real SQLite schema-migration race**: multiple processes opening
  a fresh database concurrently could hit `no such column` errors mid-write.
  Now serialized with a synchronous, cross-process file lock (mirrors rc1's
  markdown-storage lock, but blocking rather than async, since the database
  constructor has no `await` point to yield at). `:memory:` databases skip
  the lock — no cross-process audience.
- **`memory get`/`list --where` got sharper**: `neuron memory get <id>`
  fetches a single entry directly (no full-category scan); `--where` is now
  repeatable (ANDed) and supports negation (`field!=value`); `--refs-satisfy`
  composes with both to cross-reference declared fields across entries in
  the same category — built for this repo's own dogfooded issue tracker but
  nothing about the implementation is tracker-specific.

## [2.4.0-rc2] - 2026-08-13

Second interim checkpoint on the neuron-2.4.0
map, audited directly from `git log v2.4.0-rc1..HEAD` rather
than assumed from the map's nominal ticket numbering.

- **Closes rc1's flagged known issue: a local reranker cuts the relevance
  gate's false-accept rate by 5x.** A second-stage gate
  (`Xenova/ms-marco-MiniLM-L-6-v2`, a local ONNX cross-encoder — no remote
  API call) ANDs onto the existing lexical leg. Calibrated live against the
  real LongMemEval-S split: false-accept drops from 99.80% to 19.4% at the
  shipped threshold. A full threshold sweep proved the original "~zero new
  false-silence" target unreachable on two candidate models, so the bar was
  amended live with the swept frontier in hand — the shipped point trades a
  roughly symmetric 19.8% false-silence for that false-accept reduction.
  Ships unconditionally alongside the lexical leg; no config switch.
- **Fixed `neuron init` silently onboarding harnesses you don't use.** A
  bare `.github/` directory — created for CI workflows and issue templates
  far more often than for real Copilot CLI use — used to be enough on its
  own to trigger writing `AGENTS.md` and a skills directory, with nothing in
  the run's own output distinguishing that from refreshing a harness
  already in use. Copilot detection now requires
  `.github/copilot-instructions.md` specifically (or evidence neuron already
  onboarded it before); the other three harnesses' detection is unchanged.
  Onboarding any harness for the first time is now also visible in the
  run's own output (`harnesses.newlyOnboarded`).
- **Fixed a real drift-detection bug**: `neuron exec`'s auto-rescan — and,
  found via the same fix, `neuron scan` and `neuron status`'s own drift
  checks — resolved the scan root from the working directory separately
  from the storage root a project's config actually lives under. Running
  from a subdirectory with no config of its own could silently overwrite
  the real architecture card with a scan of the wrong tree. Both roots now
  resolve through the same lookup.
- **Re-ran rc1's git-log-index A/B against the real shipped semantic search
  mechanism** (rc1's own number used an oracle stand-in). The real mechanism
  matched the oracle ceiling's 0% failure rate and clearly beat the
  no-search agent baseline's 11.1% — the win the oracle prototype suggested
  holds under the real mechanism. Token usage landed between the two (about
  39% below the agent baseline, about 75% above the oracle ceiling), but the
  gap didn't clear this harness's own noise-floor guard given
  session-to-session variance, so it's reported as directional, not a
  confirmed percentage.
- **`memory list` gained schema-agnostic filtering**, built for this repo's
  own dogfooded issue tracker but nothing about the implementation is
  tracker-specific: `--where <field>=<value>` and `--refs-satisfy
  <field>:<sub>=<value>` filter and cross-reference on any declared field of
  any category.
- **`neuron status --check` gained two more finding kinds**:
  `binaryVersionMismatch` (the running `neuron` binary is stale relative to
  the current project's own `package.json`, symlinks followed — for
  projects developing neuron itself) and `protocolBlockDrift` (a harness's
  generated instructions file no longer matches what `neuron.yaml` would
  generate today). Both are report-only — re-link/reinstall, or
  `neuron init --overwrite-hooks`, respectively.
- **Fixed a real, previously-latent bug**: category auto-declare could
  climb past an isolated project's own root and mutate an *ancestor*
  project's real `neuron.yaml`.
- This repo's own CI now gates pull requests on architecture-card and
  `CLAUDE.md` protocol-block drift, runs a weekly scheduled store-health
  check, and exercises the free dry-run benchmark harnesses on every push —
  dogfooding the checks above rather than only shipping them.

## [2.4.0-rc1] - 2026-08-12

Interim release candidate — most of the neuron-2.4.0
map remains open (13+ tickets unclaimed or
blocked, including the reranker-gate work chartered off the finding below).
This tag is an installable checkpoint of everything that landed on trunk
since `v2.3.0`, audited directly from `git log v2.3.0..HEAD` rather than
assumed from the map's nominal ticket numbering.

- **Categories declare themselves.** Writing to an undeclared category in
  `neuron.yaml` now auto-appends a minimal `categories.<name>: {}` block on
  first write (comments and formatting preserved) instead of relying on an
  implicit default; `neuron status --check`/`--repair` gained a distinct
  finding kind to backfill pre-existing configs. See [ADR
  0017](docs/adr/0017-category-declaration-authority.md).
- **Your git history is a searchable resident source too.** A new
  `git_log_index` joins the existing memory recall path: commits are indexed
  incrementally (check-HEAD-on-read, one-time backfill) and searched through
  the same FTS-gated relevance mechanism as memory entries, so a prompt
  naming a ticket or feature can surface the real commit that shipped it —
  live-verified against this repo's own history.
- **Pre-command hook: deterministic recall on every shell command, not just
  every turn.** Claude Code and Codex CLI now get relevant memory/git-log
  context injected ahead of each `Bash` tool call (10,000/7,500-char caps,
  fail-open), not only at prompt time — confirmed structural for Copilot CLI
  and Cursor to stay instruction-only, since neither's pre-execution hook
  has any context-carrying field. `neuron init`'s generated protocol block
  and recall-fidelity reporting are conditional on this independently of
  prompt-time recall.
- **`neuron status --health` (and `--repair`).** Reports near-duplicate
  entry groups (embedding-cosine, union-find clustering), an importance
  histogram, and superseded-entry counts; `--repair` auto-merges
  exact-content duplicate subgroups and leaves genuinely different-worded
  near-dups for a human `--supersedes` call.
- **Discovery-command hint.** When a prompt has real, unrecalled matches in
  the store beyond what was injected, a `neuron memory query` line
  suggesting the full search is appended — measured passively via a
  zero-cost dogfooding instrument rather than a paid A/B run; outcome
  quality (not just fire-rate) is still open.
- **Fixed a real concurrent-write data-loss bug** in markdown storage:
  simultaneous writers to the same category file could silently lose one
  side's change. Now serialized with a per-category-file lock plus a
  read-back verify.
- **`--if-novel` on `memory add`**, for cron/scheduled writers: a
  supersession-gate hit now skips the write (exit 0, reason on stderr,
  `{"skipped": true, ...}` on stdout) instead of hard-erroring the job.
- **Proactive warning when recall is never invoked** (`sessionsObserved:
  0`): fires once per session at session-start alongside the architecture
  card, not gated behind an explicit health check.

**Known issue, not fixed in this rc:** the lexical relevance gate's
false-accept rate on out-of-corpus negatives measures **99.80%** against the
real LongMemEval-S split (this repo's own adversarially-disjoint benchmark
corpus measures 0%, by contrast — the gap is corpus construction, not a
flaky bug). A local, offline cross-encoder reranker as a second-stage gate
is decided (>5x false-accept reduction, ~zero new false-silence is the
acceptance bar) but not yet built.

## [2.3.0] - 2026-08-10

**Four harnesses now supported, and `neuron init` tells you truthfully what
you're getting on each.** GitHub Copilot CLI and Cursor join Claude Code and
OpenAI Codex CLI with real recall adapters — both new ones are `best-effort`
(session-start injection only; neither harness has a per-turn hook point) —
and `neuron init`'s own output now reports, per detected harness, whether a
hook is actually registered (`verify()`-driven, not inferred from a config
file existing) and what fidelity that delivers, with a concrete remediation
line whenever it's short of deterministic. The README's compatibility
section got the same honesty pass: a plain-language glossary of what
deterministic/best-effort/instruction-only mean, a real `Harness | Mechanism
| Fidelity` table naming actual hook event names, and a dated verified-as-of
line. **Copilot CLI's adapter was confirmed against a real installation**
(install, session-start injection, and clean uninstall all matched
documented behavior); **Cursor's was not** — no maintainer access to Cursor
for this cycle — and ships on fixture/documentation evidence alone, by
explicit maintainer decision to rely on user reports rather than delay the
release. Both the code (`cursor.ts`'s own `capability()` caveat) and the
docs say this plainly.

Alongside the harness work, the storage config vocabulary is simpler:
`storage.path`/`storage.mode` are now settable at the top level and
overridable per category, and `split` is deleted as a distinct mode (see
Upgrading, below). The architecture card moved from one monolithic blueprint
to a small always-injected index plus per-module detail cards fetched via
ordinary relevance recall — the monolithic-card compression approach tried
mid-cycle didn't scale to a large repo and was replaced, not patched.
`neuron status --check`/`--repair` shipped for validating and backfilling
required fields on existing entries. A published, re-runnable benchmark
suite (`npm run bench:report`) now backs the token-economics and
recall-quality claims this project makes about itself — see [Measured, not
just claimed](README.md#-measured-not-just-claimed) for the headline
numbers and their caveats.

This section supersedes and consolidates `2.3.0-rc1` and `2.3.0-rc2`; there
is no separate `rc3` tag.

### Upgrading from 2.2.0 — two things to check, nothing to migrate

1. **If your `neuron.yaml` uses `storage.mode: split`, `vector-only`,
   `md-only`, or `dual`, or a category's `storage:` field set to `dual`** —
   all four still parse and behave exactly as before, with a one-time
   stderr warning naming the canonical spelling to switch to
   (`split`/`dual` → `md`, `vector-only` → `vector`). Nothing is
   auto-migrated or refused; a config carrying these values today keeps
   working unchanged. Verified this cycle with a live upgrade test: a
   `split` + `categories.*.storage: dual` project, seeded with real
   entries, upgraded cleanly under the `2.3.0` binary — warnings fired,
   `neuron.yaml` was left byte-identical, and every entry remained
   queryable. See [ADR 0016](docs/adr/0016-per-category-storage-vocabulary.md).
2. **`neuron init`'s output has a new `harnessFidelity` field** and prints a
   new "Recall fidelity by harness" block to stderr. Nothing about hook
   installation or protocol-block generation changed; this is additive
   reporting only, driven by the same `verify()` calls `neuron status`
   already used.

### Harnesses verified this cycle

Claude Code and Codex CLI's `deterministic` adapters have shipped since
`2.2.0` and are exercised continuously by dogfooding this project's own
development in both — no pinned external version, since neither harness's
hook contract has changed since `2.2.0`'s research. Copilot CLI's adapter
was confirmed 2026-08-10 against a real Copilot CLI installation (exact
version not captured). Cursor's adapter has **not** been run against a real
Cursor installation at all — capability is sourced entirely from a direct
fetch of `cursor.com/docs/hooks` plus 14 fixture tests; treat it as the one
harness in this matrix without independent confirmation.

**Known pre-existing failure, unrelated to any band in this release:**
`test/e2e/concurrency-stress.test.ts`'s Pillar 8 (multi-process contention)
fails intermittently under concurrent `NeuronMemory` initialization —
reproduced three times while cutting this release with three *different*
symptoms (a dropped write, `no column named scope`, `duplicate column name:
superseded_by`), confirming it's a genuine SQLite schema-migration race
between concurrent processes rather than one specific bug with one fixed
signature. Disclosed in `2.2.0`'s CHANGELOG as a write-drop rate under a 5%
bar; now understood to be the same underlying race surfacing as transient
migration errors too. Not touched by anything in this release; not wired as
a blocker of any ticket.

## [2.3.0-rc2] - 2026-08-09

Interim release candidate — most of the neuron-2.3.0
map remains open (real-install verification
for both new harness adapters, the compatibility-disclosure surface, the
benchmark-suite publication band). This tag is an installable checkpoint of
everything that landed on trunk since `v2.3.0-rc1`, audited directly from
`git log v2.3.0-rc1..HEAD` rather than assumed from the map's nominal band
structure.

- **Cursor adapter.** `neuron init` now wires a `best-effort` hook into
  Cursor: `session-start` and `context-reset` are wired, `pre-prompt` is
  not (Cursor's `beforeSubmitPrompt` is permission-only, no context field),
  so query-time recall on Cursor still falls back to the instruction
  protocol. **Not yet verified against a real Cursor installation** — do
  not read this as parity with the Copilot CLI row, which already has that
  verification.
- **Per-category storage path and mode, `split` removed as its own mode.**
  `storage.path`/`storage.mode` are now settable at the top level and
  overridable per category (`categories.<name>.path` /
  `categories.<name>.storage`). `split` is deleted as a distinct mode — it
  now aliases to `md`, joining `vector-only` (→ `vector`), `md-only`, and
  `dual` as deprecated spellings that still parse with a one-time stderr
  warning, never auto-migrated. **Upgrade note:** a `neuron.yaml` naming its
  mode explicitly is unaffected in behavior; only the accepted spelling set
  changed. See [ADR 0016](docs/adr/0016-per-category-storage-vocabulary.md).
- **Architecture card: per-epoch re-injection, stable-id fetch, smaller
  payload.** The card now re-injects on the first `pre-prompt` of each
  session epoch (previously only at session start, so it never returned
  after a context compaction) and is fetched by its own stable id first, so
  it can no longer be crowded out of a category's top-N query results. Its
  generation dropped the per-file LLM summarization call entirely in favor
  of a tightened deterministic template, and injection now structurally
  compresses the card to fit its budget (whole modules, in fixed order,
  rather than an arbitrary text truncation) instead of silently cutting off
  after however many subsystems happen to fit first. **This is not the
  final shape** — compressing a single monolithic card was rejected
  mid-band as not solving the underlying scaling problem on a large repo,
  and is being replaced by an index-plus-per-module-card model (tickets
  `28`–`30` on the map above), not yet landed.
- **`neuron status --check`/`--repair`.** Reports (and, with `--repair`,
  fixes) live entries missing a *currently*-required frontmatter field —
  `--repair` applies a configured `default:` first, then centroid-based
  inference for enum-typed fields only, and leaves free-text/low-evidence
  fields `unresolved` rather than fabricating a value. Both exit `1` on
  remaining non-compliance, matching `scan --check`'s CI-gate posture.
- **`neuron memory list`/`query` default ordering and limit fix.** `list`
  mode was silently ordering oldest-first; it now orders most-recent-first,
  matching the already-deprecated `listHistory` wrapper it had regressed
  behind. `list` mode's default limit is now `20` (previously shared
  `query` mode's `5`, despite answering a different question — "show me
  recent entries" vs. "find entries matching this text"). A real, if minor,
  user-visible behavior change for anyone relying on the old defaults.
- **Repo infrastructure:** a GitHub Actions workflow now handles npm
  publishing on push to `main` (dist-tag chosen from `package.json`'s own
  version string; skips a push that doesn't bump the version; gated by a
  GitHub Environment for reviewer approval). Not a package-runtime change —
  noted here only because it's the mechanism that will publish future `rc`
  and stable tags going forward.

No claims from the git-log-recall or SWE-bench-synthetic-fixture benchmark
harnesses (both built this cycle) — neither has a live run yet.

`npm publish --tag rc` is left to the maintainer, same as every prior `rc`
cut on this and the 2.2.0 map.

## [2.2.0] - 2026-08-05

**Your memory is markdown now, by default.** `storage.mode` defaults to `md`:
`.neuron/<category>.md` files are the store of record, hand-editable and
diffable in a PR, with SQLite kept underneath as a rebuildable index rather
than removed. This is the single most user-visible change in the release — it
changes where memory physically lives — and every mode retrieves identically
(`md` falls through to the same hybrid RRF query path `vector-only` always
used), so there is no retrieval trade-off for taking the new default.

Alongside it, this release's other headline: **recall is now enforced by the
harness, not requested by an instruction.** `neuron init` wires a hook into
Claude Code and OpenAI Codex CLI that queries the memory store and injects
results before the model ever sees the prompt — the agent's cooperation is no
longer required. Both harnesses were researched and verified to support this
deterministically (ADR 0014); everything else evaluated (Copilot CLI, Cursor,
Antigravity CLI, OpenCode) is out of scope for 2.2.0 and continues in
neuron-2.3.0 — see
the neuron-2.2.0 map's Out of Scope section for why. `neuron scan`
also moved to real Tree-Sitter AST parsing this release, and its output is now
byte-stable — a re-scan of an unchanged tree reproduces the identical card.

This section supersedes and consolidates every `2.2.0-rc*` tag published
during development (`rc1`–`rc3`); there is no separate `rc4` or `rc5` tag —
both bands were folded directly into this release (see
the neuron-2.2.0 map for why).

### Upgrading from 2.1.0 — three things change on disk

1. **Your first `neuron scan --diff` will report "Re-baseline Required"
   instead of drift.** Tree-Sitter AST parsing replaces regex symbol
   extraction, which changes what a scan finds (on this repository, the
   symbol count fell from 3290 to 233 — almost all of it call sites the old
   scanner had miscounted as methods). A card written by 2.1.0 and a scan
   performed by 2.2.0 are measurements taken with different instruments, so
   neuron refuses to diff across them rather than report phantom changes.
   **Run `neuron scan` once** — that is the whole migration. If you gate CI on
   `neuron scan --check`, its exit code `2` ("baseline not comparable") means
   this, not a regression. Users who never run `--diff` explicitly need do
   nothing — the implicit re-scan behind `memory query` re-baselines silently
   on the next source edit.
2. **`neuron init` now writes into your harness's own config**, not just
   `CLAUDE.md`/`AGENTS.md` — `.claude/settings.json` and/or `.codex/hooks.json`
   for the two harnesses with an adapter. It asks where to install
   (user-global / project-committed / project-local) before touching
   anything, and asks again before overwriting any existing neuron-authored
   hook entry it finds; it never reads or modifies a hook it didn't write,
   even one sharing the same event array. Non-interactive runs (CI, `--yes`)
   default to **keep and warn**, never silently replacing anything;
   `--hook-target`, `--overwrite-hooks`/`--keep-hooks`, `--harness <list>`,
   `--no-hooks` and `--uninstall-hooks` give scripted control over all of it.
   On a harness where the hook actually fires, the generated protocol block
   also loses its first step ("query the store yourself") since the hook
   already does it.
3. **`storage.mode` now defaults to `md`.** Existing projects that name their
   mode explicitly in `neuron.yaml` are unaffected. A project on the old
   default upgrades with a one-line config change: the first `md`-mode
   command exports the existing vector store to markdown and records
   `meta.md_seeded_at` before any reconciliation runs, so nothing is lost on
   the switch.

**Known pre-existing failures, unrelated to any one band:** Pillar 8
(multi-process contention) drops up to 3 of 50 writes against a `<5%` bar —
reproduced repeatedly on a clean tree across the release, SQLite write-lock
contention rather than anything a specific ticket touched. Four unit test
files (`cli.test.ts`, `history.test.ts`, `learn.test.ts`, `memory.test.ts`)
failed when run against this repo's own populated `.neuron/` store rather
than an isolated fixture, inherited from the `md`-default flip — fixed by
ticket 42.

### Added — deterministic recall hooks for Claude Code and Codex CLI

- **`neuron hook <harness> <point>`** is the new entrypoint both adapters
  install: `session-start` seeds the architectural blueprint card once per
  session, `pre-prompt` queries the store with the user's prompt and injects
  results before every turn, and `context-reset` clears the per-session
  dedup ledger on compaction (`PreCompact`/`PostCompact`) so a 50-turn
  session doesn't re-inject the same entries 50 times.
- **Injection is deduplicated by a session-scoped ledger, keyed on the
  harness's own `session_id`** (confirmed present on every hook event for
  both harnesses by fetching their schemas directly) — only the delta since
  the last turn is injected. Where compaction can't clear it, a turn-count
  TTL degrades toward *repeating* an entry rather than *silently dropping*
  it.
- **A hard character ceiling, not a relevance floor** — full LongMemEval
  measurement (ticket `39`, 500 questions) found no cosine cutoff that
  doesn't regress recall on conversational text, so the payload budget is
  volume-only: 6,000 characters at session start, 1,500 per pre-prompt turn,
  both strictly below either harness's own documented cap. Entries are
  dropped whole, never truncated mid-content, and a dropped entry stays
  unledgered so it's eligible again next turn.
- **Fails toward silence, never toward blocking the prompt.** A malformed
  hook payload, a query error, a timeout, or an unreachable database all
  degrade to "inject nothing, exit 0" — a hook that hangs or errors can
  degrade recall but can never wedge the harness. Measured latency: ~0.2s
  warm per turn (real embedder, not mocked), comfortably inside Claude
  Code's 30s `UserPromptSubmit` timeout.
- **`verify()` reports whether a hook actually *fired*, not just whether it's
  registered** — no harness researched documents an external way to confirm
  this, so the hook itself writes firing evidence (a timestamp) before doing
  any work that could fail.
- A project with both `.claude/` and `.codex/` gets both adapters wired
  independently, each writing only its own config file.

Tickets 11,
12,
13;
[ADR 0014](docs/adr/0014-recall-adapter-architecture.md).

### Changed — the protocol block is capability-aware

`neuron init` now generates one of two variants depending on whether the
target harness has a currently-registered, currently-firing deterministic
hook (checked live via `verify()`, not inferred from config-file contents or
this run's flags):

- **Deterministic** (Claude Code, Codex CLI once wired): the old step 1
  ("your VERY FIRST tool call MUST be to query the memory store") is deleted;
  Command Execution / Failure-Fix Recording / Session Conclusion renumber to
  steps 1–3.
- **Fallback** (any harness without a working hook): step 1 is unchanged.

Categories and architecture-scan settings are now read live from
`neuron.yaml` into the generated block instead of being hand-typed, so the
block can no longer silently drift from the config it describes. This
repo's own `CLAUDE.md` and the packaged `neuron-memory` skill both carry the
short variant as of this release.

Ticket 14.

### Added — `neuron init` reports per-harness fidelity

The JSON output's `hooks.installed` (what was found and wired, per harness)
and `protocol.written` (the fidelity each harness's instruction file ended
up with, derived from `verify()`) together give an honest, machine-readable
account of what recall guarantee a project actually has after `init` runs —
no harness is ever reported as more reliable than it verifiably is.

### Changed — `minScore` is deprecated; no relevance floor ships

`pullRules.default.minScore` and `pullRules.onExec[].minScore` blend
relevance with `importance` in a way that structurally cannot reject a top
hit at any similarity (measured: a nonsense query's top hit still scores
0.44–0.56). Both keys still parse — no hard failure on an existing config —
but now print a one-time `stderr` warning naming `ADR 0012` and pointing at
`relevance.gate.enabled`, the new switch (default `true`) for the
structural, cosine-free relevance gate landing in a follow-up ticket. A full
500-question LongMemEval sweep (0.50–0.70) found **every** cosine floor
regresses recall on real conversational text — even the gentlest costs
3.3–4.2% recall for a 4.4% volume reduction — so `minScore` is not
reinterpreted as that floor; there is no floor to reinterpret it as.

Ticket 39;
[ADR 0012 amendment](docs/adr/0012-relevance-gate-and-score-decontamination.md#amendment-ticket-39-2026-08-03--the-cosine-floor-and-the-config-surface).

### Fixed — the architecture card is now a deterministic artifact

Re-running `neuron scan` on an unchanged tree used to still be able to
produce a byte-different card, and on a store with enough other entries in
the same category, a semantic-search lookup for "the" existing blueprint
card could miss it entirely and write a duplicate. Both are fixed by the
same change: the card's id is now derived (`sha256` of the category name),
never looked up, so the same category always resolves to the same row. The
embedded `---category/title/tags/mtime---` frontmatter block inside the
card's own markdown — dead weight nothing read, and a shape that could
corrupt the file parser the moment another entry shared its category file —
is deleted rather than patched. A related bug surfaced while chasing this to
zero: the markdown storage adapter was re-minting `createdAt` on every
upsert instead of preserving it, unlike every other write path — fixed.

Ticket 37.

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

The shipped Qwen1.5-0.5B model's job list was evaluated for expansion and the
measurement went the other way: **the model has exactly the one default-on job
it had in 2.1.0** — code summarization during `neuron scan`. Salvage query
expansion and LLM-assisted dedupe were both killed by their own pre-committed
measurement bar before reaching review; automatic pruning's judgement arms
both false-deleted ground-truth-unrecoverable entries in testing and were
removed (see Not Shipped, below). What did ship moved work *off* the model
instead — tags and category inference run on the embedder already loaded on
the write path, not the LLM.

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

Ticket 06; guardrail
design in [ADR 0010](docs/adr/0010-llm-job-guardrails.md).

### Not shipped — salvage expansion, dedupe, automatic pruning

Three jobs evaluated for the model's list did not clear the bar ticket
05 set,
and none of the three shipped:

- **Query expansion for weak retrieval** — the weakness floor the design
  depended on is *inverted* on the failures it was meant to catch: the mean
  top-1 cosine on queries retrieval got wrong (0.7779) is *higher* than on
  queries it got right (0.7518). Every measured failure is confidently wrong,
  not weak, so no rewritten query could have fixed it. Ruled out before
  implementation. Ticket 07.
- **LLM-assisted consolidation & dedupe** — pairwise cosine over 239 store
  entries found exactly one genuine same-category duplicate, findable by
  content hash with no model. The band that would catch more is full of
  semantic *opposites* sitting at cosine 0.92, which needs reliable negation
  detection neither the 0.5B model nor the embedder has. Ruled out before
  design. Ticket 08.
- **Automatic pruning** — both candidate judgement methods (a recoverability
  binary and a recalibrated 1–5 importance scale) false-deleted
  ground-truth-unrecoverable entries in pre-committed testing (2 of 11 and 4
  of 11 respectively), including a `decisions`-category ADR that reads like
  ordinary prose. **Removed from 2.2.0.**
  Ticket 23,
  ticket 24.

**The prune hazard this would have addressed is still live and unfixed**:
`neuron memory prune`'s default importance ceiling (`3`) is also the default
value every entry gets when written without `--importance`, so a bare
`neuron memory prune` deletes nearly everything older than its `--days`
window. Deferred rather than fixed —
ticket 25 —
by deliberate maintainer decision. Pass `--importance 4` or `5` on anything
that must survive a prune.

### Changed — query-path latency baseline

Measured `neuron memory query` end to end, each invocation its own process:
first invocation in a shell session (cold OS/model file cache) **~4.8s**;
steady state on repeated invocations (warm cache), **p50 ~223ms, p95 ~229ms**
over 20 runs (min 221ms, max 232ms). Write-side enrichment runs on `add`, not
`query`, so this did not change the number — it is recorded here as the
baseline budget the auto-injection hooks above have to fit inside (measured
independently at ~0.2s warm per turn).

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

Ticket 38.

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

Ticket 35.

### Removed — model-based importance inference

`importance` is no longer inferred. The shipped 0.5B model's judgement was
measured as noise (discrimination of -0.5 then +0.167 across consecutive runs,
per-entry stability 0.5, and a note about irreversible production data loss rated
`1`), so it shipped `off` by default — and a dead-by-default path costs
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

### Added — real AST parsing (`TreeSitterScanner` finally uses Tree-Sitter)

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

### Changed — AST dependency and restored documentation

- **`web-tree-sitter`** is now a runtime dependency (~4.4 MB in `node_modules`).
  It is the only dependency added in this release.
- **Documentation describes AST parsing again.** 2.1.0 deliberately walked back
  its AST claims to match what actually shipped; those descriptions in
  `README.md`, `CONTEXT.md`, `SCAN_HELP` and the packaged `neuron-memory` skill
  are restored — but scoped to the eight grammars that exist, with the remaining
  four extensions still described as line-oriented.
- **ADR 0003 is marked implemented**, no longer deferred.

### Removed — dead `--force` flag

- **`neuron scan --force`**: the flag was documented as "bypass the content cache
  and force a full re-scan" but was never read by the ingest path. It did
  nothing. `neuron scan` already re-scans and updates the card in place.

### Added — markdown is the store of record, vector demoted to a rebuildable index

`md-only` is deleted rather than fixed — it reached markdown-first storage by
*removing* SQLite, which also removed semantic search (a whole-string
substring match), enrichment, and honest counts. The old `dual` mode already
reached markdown-first storage by *demoting* SQLite instead, with none of
those defects, so it is renamed **`md`** and becomes the vocabulary: `storage.mode`
is now `vector-only` / `md` / `split`. `md-only` and `dual` both still parse as
deprecated aliases for `md`, warning on `stderr`.

- **Strict-mirror reconcile runs on every `md`/`split`-mode command**: markdown
  writes land first, the vector index follows only on success (a vector-side
  failure now warns to `stderr` instead of a swallowed error), and an entry
  present in the index but absent from markdown is deleted — no tripwire, git
  is the recovery story. Detection is a per-entry content hash: measured at
  0.006 ms to diff a 264-entry store, 2.39 ms to re-embed one changed entry
  versus ~630 ms for its whole category under the old per-category cache.
- **A one-time bootstrap seed** exports an existing vector store to markdown
  the first time `md`/`split` mode runs against it, recording
  `meta.md_seeded_at` — without it, "not seeded yet" and "a human deleted
  everything" are the same observable state. The seed exports the **union** of
  every category `neuron.yaml` declares and every category actually present in
  the store (`neuron scan`'s `architecture` category is the standing example
  of one that often isn't declared) — seeding only the declared set was found
  to silently destroy undeclared entries the moment someone later declared
  that category.
- **Retrieval parity is by construction, not a separate implementation**: `md`
  mode's `query()` falls through to the same hybrid RRF path `vector-only`
  always used, so there is no "markdown mode searches worse" caveat to state.
- Per-category `storage: dual` is renamed `storage: md` to match, with `dual`
  aliased and warning.

[ADR 0011](docs/adr/0011-markdown-as-store-of-record.md);
tickets 28,
29.

### Added — configurable per-category frontmatter schema

A category can now declare its own `string`/`enum` frontmatter fields in
`neuron.yaml`, enforced everywhere an entry gets written — the CLI, and
`neuron scan`'s own direct writes — so an agent using the CLI cannot produce
an entry that violates the declared shape:

```yaml
categories:
  decisions:
    fields:
      ticket:
        type: string
        required: true
      confidence:
        type: enum
        values: [low, medium, high]
        default: medium
```

- **A declared field becomes its own CLI flag** (`ticket` → `--ticket`), not a
  generic `--field k=v` escape hatch — `neuron memory --help` lists a
  project's declared fields dynamically, and a typo'd flag name gets the same
  edit-distance suggestion built-in flags already had.
- **Required-but-missing hard-errors on `add`**, naming the field and
  category, unless the category config supplies a `default:` — the same
  policy already governing an omitted `--category`. `update` is a partial
  patch and never re-demands a field.
- **Every declared field also lives as a nullable SQLite column**, added by an
  additive, idempotent auto-migration that diffs `neuron.yaml` against
  `PRAGMA table_info` on every store open and only ever adds columns, never
  drops one when a field is removed from config — `vector-only` and `split`
  categories persist declared fields identically to `md`.
- **Pre-existing entries against a newly-declared schema are read and
  reported, never refused** — a missing value isn't fabricated (no safe
  default exists for a free-text field like `reviewedBy`) and isn't ambiguous,
  so it's simply reported as missing.
- **An opt-in `strict: true` top-level config key** disables both tag and
  category centroid inference, trading their convenience for a claim `md`
  mode alone can't make: the same `memory add` produces the same field
  values every time, not just the same shape and bytes.

[ADR 0013](docs/adr/0013-configurable-frontmatter-schema.md);
tickets 43,
44,
45.

### Changed — the relevance gate ships; `score` no longer blends in `importance`

Ticket `39`'s full LongMemEval sweep found no cosine floor that doesn't
regress recall on real conversational text, so the gate that actually ships is
lexical-only: a result whose top hit has no keyword (FTS) match at all is
rejected, run through one choke point (`NeuronMemory.queryGated()`) that both
`neuron exec` and `neuron memory query` share, so hooks and legacy query paths
inherit it for free. `importance` is removed from the ranking `score` entirely
(it displaced a cosine-1st-ranked result with an importance-5 3rd-ranked one
on a live measurement) and survives only as a `prune`-time field. A rejected
result is now an **announced** zero, not silence: both surfaces print a
rejected count, and `neuron status` reports it cumulatively as
`relevance.rejectedTotal`.

Ticket 41;
[ADR 0012](docs/adr/0012-relevance-gate-and-score-decontamination.md).

### Known Limitations

- **Four languages stay on the line-oriented fallback**: `.cs`, `.swift`,
  `.rb`, `.php` have no Tree-Sitter grammar in 2.2.0 and carry weaker export
  detection (a crude `export|public|pub` line test) than the ten AST-covered
  extensions.
- **Deterministic recall ships for Claude Code and Codex CLI only.** Copilot
  CLI and Cursor were researched and land `best-effort` — a real capability,
  just not one neuron can wire a verified deterministic hook for yet — and
  continue as roadmap items in
  neuron-2.3.0, not this release.
- **`neuron status --check`/`--repair`** — the validation surface for
  declared-field schema violations — is designed (ADR 0013) but not shipped;
  it continues as neuron-2.3.0's ticket 13.
- **Automatic pruning was evaluated and removed**, not shipped: both
  candidate judgement methods false-deleted ground-truth-unrecoverable
  entries in pre-committed testing. The hazard it would have addressed is
  still live — `neuron memory prune`'s default importance ceiling (`3`) is
  also the default value every entry gets when written without `--importance`
  — so pass `--importance 4` or `5` on anything that must survive a prune.
- **Salvage query expansion and LLM-assisted dedupe were evaluated and not
  built** — both were ruled out by their own pre-committed measurement bar
  before implementation began; see the entries below for the numbers.
- **Pillar 8 (multi-process contention)** is a known pre-existing failure —
  up to `3/50` rejected writes against a `<5%` bar, SQLite write-lock
  contention unrelated to any 2.2.0 change — reproduced repeatedly on a
  clean tree throughout the release. Owned by nobody yet.

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

## [2.1.1] - 2026-08-01

### Fixed

- **Keyword-only matches on common words could outrank the correct result.**
  Hybrid search fuses its semantic and FTS legs with Reciprocal Rank Fusion,
  which rewards a document's rank *position* rather than how well it matched.
  Because query terms were joined with `OR` and every word was searchable, a
  document matching a single common word entered the FTS ranking — and when it
  was the only match, it entered at rank 1 and collected the full RRF
  contribution.

  Observed on a three-document store: the query *"what payment provider do we
  use"* returned a document about a Rust auth daemon at score `0.869`, above the
  correct billing document at `0.500`. The word `use` prefix-matched `used`,
  while the correct document matched no keyword terms at all.

  `cleanFtsQuery` now drops standard English stopwords and the FTS operator
  words, and deduplicates terms. A query made entirely of stopwords produces an
  empty expression, which is already handled as "no keyword leg" and answered
  semantically — better than a `MATCH` that hits every row.

  Short domain terms are deliberately preserved: `git`, `db` and `ci` are exactly
  the terse fallback queries the agent protocol recommends.

  This affects retrieval quality for every `neuron memory query`, `neuron exec`
  pre-command lookup, and drift-triggered recall. No configuration change or
  re-indexing is required — the fix applies at query time.

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
  behavior; ADR 0003 is marked **Deferred**. Tracked as ticket 06 — Replace the
  Pattern-Matching Scanner with a Real Tree-Sitter AST Engine (ticket
  `e93dae93-844b-43b3-a5aa-316fa45d23b1`).
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
