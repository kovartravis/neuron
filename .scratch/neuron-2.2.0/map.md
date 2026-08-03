# Map — neuron 2.2.0

## Destination

`@kovartravis/neuron` **v2.2.0** published stable to npm, reached progressively
through five release candidates. The release covers four themes: real
WebAssembly Tree-Sitter AST parsing, embedder-based write-side enrichment with a
measured boundary on what a 0.5B model can be trusted with, harness-native
recall across five coding agents with an `AGENTS.md` fallback for everything
else, and — added 2026-08-02 — **deterministic, schema-enforced plain-markdown
memory as the product's primary claim**.

> **Theme 4 was added on 2026-08-02, mid-route, and it is a repositioning.**
> The trigger was competitive: `codebase-memory-mcp` (tree-sitter + hybrid LSP,
> 32.7k stars) already owns the architecture-analysis niche this project had been
> pitching into. Neuron's defensible edge is the opposite of depth — memory that
> lives as `.md` files a developer can open, diff, hand-edit and review in a PR.
> Architecture scanning becomes a **supporting** feature, not the headline.
>
> This theme is not a docs exercise. The repositioning was drafted as a README
> first, and checking that README against the shipped CLI found its central
> promise is **not currently true**: `md-only` is not the default, `neuron init`
> writes no `neuron.yaml` at all, and `md-only` has **no semantic search** — it
> falls back to whole-string substring matching. The band below is the
> engineering that makes the claim honest, and only then the README that makes it.
>
> **Sharpened later the same day.** "Memory as markdown files" is not defensible
> — telling an agent to append to a `.md` file is a prompt, not a product. The
> claim that is defensible is the *guarantee*: **an agent using the CLI cannot
> write a malformed entry**, because the entry schema is declared in
> `neuron.yaml` and enforced on write. That makes the CLI load-bearing rather
> than a convenience wrapper, and it is a *governance* claim rather than a
> capability claim — orthogonal to `codebase-memory-mcp`'s analysis depth
> instead of competing with it. Tickets `35` and `36` carry it. Note the
> guarantee is currently false in a second way that has nothing to do with
> writing: the **reader** silently fabricates field values on hand-edited files
> (`35`), which is the exact feature the pitch is built on.
>
> **Extended to `neuron scan` the same day.** Architecture scanning stops being
> the apologetic *"lightweight, not as deep as purpose-built tools"* footnote and
> comes under the same claim: **a deterministic way to get your architecture into
> a markdown file that stays up to date.** Against `codebase-memory-mcp` this is
> depth-versus-artifact rather than depth-versus-depth — they analyse; neuron
> produces a file a human and an agent both read and a `git diff` can gate on.
> That collapses the whole product to one idea — *deterministic markdown
> artifacts your agent maintains and you review* — instead of a memory pitch with
> a scanner bolted beside it. Measured: the card is **already** byte-identical
> across runs except for a wall-clock `mtime` line, so the claim is one line and
> one identity fix away (`37`).

> **Theme 2 was rewritten on 2026-08-02, after the band was walked.** It read
> *"expanded use of the shipped Qwen1.5-0.5B model"*. That was the bet; the
> measurement went the other way. Across `05`–`08`, `23`, `24` and `26`, every
> A/B concluded a cheaper method beat the model, and rc2 adds **zero** default-on
> model jobs — `neuron scan` summarization remains the only one, as in 2.1.0.
> The theme now names what was actually built and learned, because a destination
> that advertises a result the route disproved is how a map starts lying.

Reaching the end means: the way to `v2.2.0` is walked, not merely charted —
every ticket resolved, every rc cut, stable published.

## Notes

- **This map carries execution.** Tickets are worked one at a time; each rc band
  ends with a cut-and-publish ticket. This follows the precedent of
  `.scratch/architecture-scans-2.1.0/map.md`, which ran the same way.
- **Theme order is fixed: tree-sitter → LLM → recall.** Accurate AST symbols are
  the input to both the summarizer and the blueprint cards that recall serves.
  Doing tree-sitter last would mean re-baselining twice.
- **Skills to consult:** `/grilling` and `/domain-modeling` for decision tickets;
  `/research` for ticket `10`; `/tdd` for implementation tickets. Read
  `CONTEXT.md` and `docs/adr/*.md` before changing module boundaries.
- **Protocol:** every session follows the `CLAUDE.md` memory-store loop. Record
  ADRs under `decisions`, session logs under `history`.
- Ticket `10` (harness compatibility research) is **AFK and unblocked from day
  one**. It does not depend on tree-sitter and can run in parallel with rc1
  rather than idling until rc3.
- Supersedes
  [06 — Real Tree-Sitter AST Engine](../architecture-scans-2.1.0/issues/06-real-tree-sitter-ast-engine.md)
  from the 2.1.0 map. Its requirements are split across `01`–`03` here.

## Release bands

| Band | Tickets | Delivers |
|------|---------|----------|
| `2.2.0-rc1` | `01`–`04` | Real Tree-Sitter AST engine |
| `2.2.0-rc2` | `05`, `06`, `09`, `24`, `26` | Centroid write-side enrichment, a timeout primitive, degradation counters — **and no new model jobs at all**: `07` and `08` are out of scope, `23`/`24` removed automatic pruning, `25` is deferred, `06` shipped with the model off the write path, and `26` removes the last model call from it |
| `2.2.0-rc3` | `10`–`15` | Recall adapter layer + 2 reference adapters |
| `2.2.0-rc4` | `16`–`20` | Remaining 3 adapters + disclosure |
| `2.2.0-rc5` | `28`–`38` | **Markdown-first**: markdown as the store of record with the vector store demoted to a rebuildable index, `scope` removed, `md` as the default mode, deterministic schema-enforced writes, a byte-stable architecture card, repositioned README and docs |
| `2.2.0` | `21` | Stable release |

> **rc5 has no technical dependency on rc3/rc4** and can be pulled forward if the
> competitive pressure that motivated it outweighs the recall adapters. It is
> placed last only because that is where the band was added. Nothing in `28`–`34`
> reads anything rc3 or rc4 produces.

## Decisions so far

<!-- one line per resolved ticket: enough to judge relevance, then open the ticket for detail -->

- [01 — Tree-Sitter Grammar Acquisition & Init-Time Caching](issues/01-grammar-acquisition-caching.md)
  — Grammars fetch at `neuron init` from the **official `tree-sitter-<lang>` npm
  packages** (8.49 MB, all 8 in ~1.0s) into an `env-paths` cache, pinned and
  manifest-attributed. Tarball holds at 612.6 KB with zero `.wasm`.
  [ADR 0008](../../docs/adr/0008-tree-sitter-grammar-distribution.md).
- [02 — Replace Regex Extraction with Parsed-AST Symbol Queries](issues/02-ast-extraction-rewrite.md)
  — Symbols now come from parsed ASTs; kind is read from the **node type**, not
  the capture name. Symbol count on this repo **3290 → 233 (−92.9%)**; 94% of the
  old total was call sites recorded as methods. Scope grew to `analyzer.ts`,
  which had its own duplicate regex parser and was the only thing the blueprint
  actually used — it missed every `export async function`. `ScannedSymbol` gains
  `exported`; new `parseFile` reports per-file fidelity for `03`.
- [03 — Parser Fidelity Labelling & Baseline Migration](issues/03-fidelity-labelling-baseline-migration.md)
  — Cards record their parser as `<parser>/<generation>` (`ast/2`), stored as a
  **default plus exceptions**. A fidelity mismatch is refused **wholesale** as an
  incomparable measurement, never reported as drift; `--check` exits **2**.
  Explicit `--diff` names the fix, the implicit rescan re-baselines **silently**.
  The fingerprint was deliberately left parser-blind — the migration surfaces on
  the next explicit check or next source edit.
  [ADR 0009](../../docs/adr/0009-parser-fidelity-and-baseline-comparability.md).
- [04 — Cut and Publish 2.2.0-rc1](issues/04-cut-rc1.md) — `v2.2.0-rc1` cut,
  tagged and pushed; **npm publish is outstanding and owned by the maintainer**
  (`npm publish --tag rc`). 227 unit tests green, 9/10 E2E pillars, tarball
  613.1 KiB with zero `.wasm`. Docs restored to describe AST parsing scoped to
  **8 grammars / 10 extensions** (the ticket's "9 languages" was wrong).
  ADR 0003 now *Implemented*. Key trap found: `neuron exec` runs the **global**
  binary, so a stale 2.1.0 install silently re-baselined the card to `regex/1`
  during verification — `npm link` before verifying a release.

- [05 — LLM Job Quality & Latency Guardrails](issues/05-llm-quality-latency-guardrails.md)
  — Seven guardrails for the 0.5B model's new jobs. Expansion becomes **salvage**
  (fires only on empty/weak retrieval), triggered by **raw cosine, not `score`**
  (which is rank-based and ≥0.75 for any top hit). Silent degrade + a timeout
  that does not yet exist + counters in `neuron status`. Auto-tagging is
  **closed-vocabulary** — the model cannot mint a tag. Dedupe **detects and
  selects, never writes**; losers are superseded, not deleted. Bar for all three
  is **strict non-regression, A/B against job-disabled**.
  [ADR 0010](../../docs/adr/0010-llm-job-guardrails.md).
  **Two of its seven guardrails are since withdrawn** (2026-08-02): salvage
  expansion is out of scope, and the "≥0.75 for any top hit" claim behind the
  raw-cosine trigger is factually wrong — measured 0.4375–0.5565. The
  non-regression bar, the silent-degrade posture and the timeout all stand.

- [06 — Write-Side Enrichment: Auto Tags, Importance, Category](issues/06-write-side-enrichment.md)
  — Shipped, and **the model ended up off the write path entirely**. Tags and
  category are both centroid cosine over the already-loaded embedder; only
  importance uses the model, and it ships `off`. The benchmark overrode the spec
  three times: the category A/B inverted its premise (**centroid 9/9, model
  1/9**), importance discrimination measured as noise (**-0.5 then +0.167**, so
  it is floored at the default and disabled by default), and the prompts had to
  become few-shot — instruction-only prompting left **12 of 12** inferences
  unparseable. Pillar 12 met ADR 0010 §7's bar exactly: **delta 0.0** on
  recall@1/@5/MRR between arms. The spec's absolute prune-safety assertion was
  restated as a relative one, because it fails identically with the feature
  switched off — that is ticket `23`'s hazard, now quantified.
  252 unit tests, 14/14 pillars.

- [23 — Configurable Automatic Pruning](issues/23-configurable-automatic-pruning.md)
  — Pruning is a **recall-quality** feature for history noise only; disk was
  ruled out at 2.9 MB. **Hard `DELETE`, no undo** — soft-delete rejected on the
  21 read sites it would tax, and `08`'s supersession kept separate (*lineage*
  vs *routine-and-old*). Config is per-category and opt-in, where an **absent
  `prune` block means never pruned** — which makes the upgrade path safe by
  construction. A **usage gate was rejected**: it punishes the rare-critical
  failure fix. The real finding is that ticket `06`'s importance failure was
  **the ask, not the model** — an absolute scalar on an underspecified concept
  with generic exemplars, ignoring 78 labelled entries. Split into `24` (the
  A/B) and `25` (ships regardless). **Bar committed in advance: pruning must
  beat no-prune, and a double null removes it from 2.2.0.**
  [Test plan](../configurable-pruning/ab-test-plan.md).
- [24 — Pruning A/B](issues/24-pruning-ab-test.md) — **Automatic pruning is
  removed from 2.2.0.** Both candidate judgement arms failed Experiment 1's
  pre-committed bar before Experiment 2 could even run: the recoverability
  binary (A1) false-deleted 2 of 11 ground-truth-unrecoverable entries, the
  recalibrated 1–5 scale (A2) false-deleted 4 of 11 — one shared miss was a
  `decisions`-category ADR that reads like ordinary prose, showing content-only
  judgement can't structurally distinguish an architectural record from a
  routine note even re-shot on real exemplars. Per the plan's own rule, a
  double disqualification collapses Experiment 2 ("no safe judgement to prune
  with"), so the real/synthetic retrieval comparison was not run — the
  disqualification is evidence stronger than a double null, not weaker.
  Ticket `06`'s `importance: off` default stands with no ADR reversal.
  [Full report and reusable scripts](../configurable-pruning/).
- [26 — Remove Model-Based Importance Inference](issues/26-remove-model-importance-inference.md)
  — Removed, **and the enrichment backlog went with it**. Importance was the only
  field that ever deferred, so once the job was gone no row could be written with
  a NULL `enriched_at` and the whole deferral apparatus was unreachable:
  `drainEnrichment`, the drain-on-read hook, `neuron memory enrich` and
  `enrichment.pending`. Keeping it would have shipped a subcommand that could
  only report `drained: 0`. `enriched_at` itself is kept — an honest record, and
  dropping a column would make an rc1/rc2 DB non-downgradable. Migration
  verified, not assumed: **Zod strips unknown keys, so a stale
  `llm.enrichment.importance` is ignored, not a hard fail** — now asserted by a
  test. Pillar 10 re-pointed from *Importance Inference & Prune Safety* to
  **Prune Safety**, where it quantifies ticket `23`'s live hazard and verifies the
  only guard against it: at the default ceiling **9 of 12 entries delete,
  including 3 of 6 critical ones — every one of them an entry that did not pass
  `--importance`**, while all three guarded entries survive. 270 tests green.
  [ADR 0010 amendment](../../docs/adr/0010-llm-job-guardrails.md).

- [09 — Cut and Publish 2.2.0-rc2](issues/09-cut-rc2.md) — **`v2.2.0-rc2` cut,
  tagged and pushed; npm publish left to the maintainer**, matching `04`'s
  precedent. The ticket's original gating question was void by the time it was
  worked: none of the three LLM jobs it was written to gate shipped (`07`/`08`
  ruled out before reaching the bar, `23`/`24` removed on the A/B verdict), and
  `06` shipped with the model off the write path entirely — the model's
  default-on job list is unchanged from 2.1.0. Query-path latency baseline
  recorded for rc3: cold ~4.8s, warm p50 ~223ms/p95 ~229ms. Found and fixed two
  real gaps while executing: `CLAUDE.md` and the packaged skill's mandatory
  protocol steps still hardcoded `--tags` on every example, directly
  contradicting their own "prefer omitting `--tags`" guidance; and ticket `06`'s
  actual shipped feature (centroid tag/category inference) had no CHANGELOG
  entry at all, only its later importance-removal amendment did. **This build
  also carries rc5's `scope` removal and frontmatter fixes** (`35`, `38`),
  which reached trunk first — documented under rc2 rather than held back,
  since what an `rc` tag ships is whatever is on trunk when it's cut. 290 unit
  tests green; 12/13 E2E pillars (Pillar 8 multi-process contention is a
  pre-existing, unrelated failure).

- [28 — What `md-only` Parity Actually Means](issues/28-md-only-parity-design.md)
  — **`md-only` is deleted, not fixed.** The question was wrong: `md-only`
  reached markdown-first storage by *removing* SQLite, while `dual` already
  reaches it by *demoting* SQLite — with full hybrid retrieval, working
  enrichment and honest counts, because the database is present. Every defect the
  ticket catalogued traces to one line, `this.db = null`. So `dual` is renamed
  **`md`**, modes become `vector`/`md`/`split`, and the claim becomes *"your
  memory is markdown; the vector store is a rebuildable index"* — stronger than
  "no database," and unlike it, true. **Retrieval parity is achieved by
  construction** (same hybrid RRF code path), so the README owes no caveat and
  `queryMarkdownOnly`'s 80 lines of substring matching are deleted.
  **`scope` is removed** — it was the *only* reason the cache claim was false,
  and it is measurably dead: 1 distinct value across 264 entries, 0
  manual-scope rows, 0 promotion matches ever, and 1.36 MB of a 3.1 MB database
  spent on `query_logs` feeding a loop with one reader. Reconcile is a **strict
  mirror** (markdown written first, absence means deletion, git is the recovery
  story) with per-entry content hashing — 0.006 ms to detect, 2.39 ms to repair
  one entry vs ~630 ms for its category. The one exception is a **bootstrap
  seed**: first `md` run against a populated store exports vector → markdown and
  records `meta.md_seeded_at`, without which "not seeded yet" and "a human
  deleted everything" are the same state — the difference between exporting 264
  entries and destroying 249 on this very repo. Hand-edits **repair the
  incomplete, refuse the ambiguous**. Ships in 2.2.0 with `md-only`/`dual` and
  `--scope`/`--scopes` aliased and warning.
  [Spec](../md-first/spec.md);
  [ADR 0011](../../docs/adr/0011-markdown-as-store-of-record.md).

- [29 — The Markdown↔Vector Reconcile Engine](issues/29-md-only-semantic-search.md)
  — Built the mechanism `28` specified: markdown-first write ordering (vector
  embed only attempted after the markdown write succeeds; a vector-side
  failure now warns to stderr instead of a swallowed `catch {}`), and a
  reconcile pass on every `md`/`split`-mode command, gated on
  `meta.md_seeded_at`. Unseeded → bootstrap-export vector to markdown once.
  Seeded → per-entry content-hash diff (reusing `mdVectorSync.ts`'s
  `computeMemoryHash`, not reimplemented): changed or missing-in-vector
  entries re-embed with markdown always winning (no conflict to report,
  unlike the two-way `neuron sync` command, which survives unchanged as the
  explicit forced rebuild); entries absent from markdown are deleted from the
  vector index, no tripwire. Measured on a 264-entry store: **~6.5ms
  steady-state, ~7ms with one changed entry** — recorded for `32`. The
  `split` dispatch no-op is fixed **by elimination**: once `md-only`'s
  substring matcher is gone, its query-side `mdCats`/`vecCats` branch had no
  remaining behavioral effect, so `query()` now just delegates unconditionally
  after reconciling; per-category vocabulary gets the identical `dual`→`md`
  rename as the top level. Two pre-existing tests encoding the old
  "vector-only orphan survives until a later update/delete salvages it" model
  were rewritten — strict-mirror reconcile now purges that orphan
  automatically on the next command, so `not_found` on it is correct rather
  than a regression. 303 tests green.

- [35 — Frontmatter Round-Trip Integrity](issues/35-frontmatter-roundtrip-integrity.md)
  — Both reproductions fixed by a single **repair-the-incomplete,
  refuse-the-ambiguous** rule in `MdStorageAdapter`, per ADR 0011 Consequence 4.
  Missing `id`/`createdAt`/`importance` (including a file with no frontmatter
  block at all) is generated **once** and **written back to disk**, closing the
  churn loop `28` flagged as fatal under strict-mirror reconcile. Duplicate
  `id`, unparseable YAML, non-numeric `importance`, and a wrong-typed `tags`
  value now **hard-error naming the file** instead of silently fabricating or
  dropping data — the line-by-line YAML-recovery fallback is deleted, not
  fixed. Every repair prints one `[neuron warning]` to stderr, matching the
  existing deprecation-warning convention (ADR 0010 §3). Fallout: `mdVectorSync`
  carried its own duplicate-id tolerance that became dead code once the reader
  refuses duplicates itself — removed; a category with a duplicate id now fails
  that category's sync outright rather than silently picking a winner. Two
  existing tests asserting the old silent-recovery behaviour rewritten; one of
  them (`expect(async () => {}).not.toThrow()`) was tautological and had been
  masking the fix as an unhandled rejection rather than a real failure.
  12 new tests, 292 total, full suite green.

- [38 — Remove `scope`](issues/38-remove-scope.md) — Gone: `scope`,
  `is_manual_scope`, `query_logs`, `learning_query_matches`, the autoPromote
  loop, and `checkAutoPromotions()`, via a real migration (v7, verified
  against a hand-built pre-existing database) — the two tables had exactly one
  reader and zero observed effect in three weeks of use while writing an
  unbounded 1.5 KB log row per query. `--scope`/`--scopes` stay parsed and
  ignored, warning on stderr, matching the `neuron learn`/`neuron history`
  posture; a stray `scope:` frontmatter key is silently dropped, not an error.
  This was the last thing keeping SQLite from being a pure, derivable cache of
  the `.md` files (ADR 0011). Unblocks
  [29 — The Markdown↔Vector Reconcile Engine](issues/29-md-only-semantic-search.md)
  alongside `28` and `35`, both already resolved.
  279 tests, full suite green.

### Settled while charting

These came out of the charting grilling session and are recorded here because no
ticket resolved them; they are premises the tickets are built on.

- **Grammar distribution** — `.wasm` grammars fetch at `neuron init` and cache in
  the `env-paths` data dir, matching how the ONNX models already work
  (`src/commands/init.ts:28-43`). Keeps the tarball at ~621 KB rather than ~20 MB.
- **Missing-grammar behaviour** — degrade to the regex scanner, warn loudly, and
  record parser fidelity per-file in the blueprint card. Drift refuses to compare
  across mismatched fidelity rather than reporting phantom changes.
- **LLM jobs for 2.2.0** — write-side enrichment, query expansion, and
  consolidation dedupe. Recall synthesis was considered and ruled out.
- **Recall mechanism** — per-harness native hooks for Claude Code, Codex,
  Copilot, Antigravity CLI and OpenCode, falling back to `AGENTS.md` instructions
  for any harness without a hook surface.
- **Protocol split** — hooks own the read side (step 1 of the `CLAUDE.md`
  protocol is deleted); the agent keeps the write side (steps 2–4), because
  deciding what is worth recording is editorial judgment a 0.5B model cannot make.
- **Disclosure** — compatibility is reported by `neuron init` output plus a
  static README matrix.

## Priority override — lifted 2026-08-01

**[22 — LongMemEval Harness](issues/22-longmemeval-harness.md) jumped ahead of the
rc2 band and has now been stood down.** Its retrieval tier is published
(recall@1 83.3%, @5 96.2%, @10 98.3%, 0 leakage — see
[the report](../../docs/benchmarks/longmemeval-retrieval.md)); its end-to-end
tier is **parked on cost**, at the maintainer's direction. The evidence gap that
justified the jump is substantially closed, for $0. **Work resumes at `06`.**

Rationale for the original jump, recorded during ticket `05`'s grilling: tickets
`06`–`08` are **parity features**. Automatic memory extraction is Mem0's headline
feature; temporal supersession is Zep/Graphiti's — both with frontier models
against neuron's 0.5B local one. Meanwhile competitors publish LongMemEval
numbers and neuron published none. That gap is *evidence*, not features, and no
amount of rc2 work closes it.

**What `22` hands to `06`–`08`:** retrieval is measurably *not* the weak link
(98.3%@10 on a standard benchmark), which independently confirms the PersonaMem
finding `05` relied on. The strict non-regression bar is the right one, and `22`
also supplies the A/B instrument to enforce it — `retrieval_eval.py` is
deterministic, free, and would have caught the 2.1.1 stopword bug as a recall
drop.

Also recorded: drift detection is **not** the uncontested moat it was assumed to
be — `mex`, Sentrux, Drift and VibeDrift all occupy that space. The defensible
claim is **deterministic hook-based recall (rc3/rc4)**, since every competitor
surveyed is agent-invoked. Whether rc3 should also jump rc2 is open.

## Deferred

- **[25 — Prune Config & Collision Fix](issues/25-prune-config-and-collision-fix.md)**
  — **deferred by the maintainer on 2026-08-01; do not implement.** It previously
  read "ships whatever `24` concludes" and was listed here as the highest-value
  thing on the frontier; that is **superseded**. Rationale for the deferral is
  not yet recorded.
  **The hazard it was to fix is still live and unfixed:** default entry
  importance and default prune threshold are both `3` and the prune is
  inclusive, so **155 of this project's 157 history entries become prune-eligible
  from 2026-08-10**, with the hardcoded `category = 'history'` the only thing
  shielding the 9 `decisions` entries at importance 3. Deferring the ticket did
  not defer the hazard. **`26` gave it a permanent tripwire**: the re-pointed
  Pillar 10 measures it on every E2E run (9 of 12 deleted at the default ceiling,
  3 of 6 critical) and asserts that `--importance` still protects — so the hazard
  is now monitored rather than merely remembered.
  A later session claimed this ticket by mistake because every durable artifact
  still said to work it — see the ticket's postmortem, and
  *"When a decision is not written down"* under **Not yet specified**.

## Not yet specified

<!-- in-scope fog: real, but not yet sharp enough to ticket -->

- **Plan-vs-architecture-diff (`diffAgainstArchitecture`).** Requested in the
  2026-08-02 repositioning handoff as a generic per-category flag in
  `neuron.yaml`, letting a category's entries (e.g. `plans`) be compared against
  the architecture diff by a two-stage pipeline — embedding similarity for
  matching, the 0.5B model only for phrasing already-confirmed matches, never for
  the match decision itself. **Cannot be ticketed: the handoff cites a full spec
  at `neuron-plan-vs-drift-handoff.md` that does not exist in this repo or
  anywhere reachable.** The handoff is explicit that the feature must be scoped
  *exactly* as that spec has it — no new package, no PM-software creep, no
  hardcoded category-name logic — so writing a replacement spec from the
  one-paragraph summary would be inventing the thing it says not to invent.
  Graduates the moment the spec is supplied. Note the two-stage shape is
  consistent with everything this map measured: embedder decides, model only
  phrases.

- **Capturing a maintainer decision, not just an agent action.** Surfaced on
  2026-08-01 when a session re-claimed the deferred ticket `25`. Protocol step 4
  records what the *agent did*; nothing records what the *maintainer decided*,
  so a verbal "don't do 25" left no trace in `neuron`, in the map, or in the
  ticket — while three artifacts kept asserting the opposite. Retrieval worked
  perfectly and returned the wrong answer, which means **rc3's deterministic
  hooks do not fix this**: hooks own the read side, and this is a write-side
  capture gap. What is unformed is whose job the write is (a protocol step the
  agent must obey is the same reliability failure, relocated) and how a
  reversal *supersedes* a stale high-confidence entry rather than merely
  competing with it. That supersession question came up independently in ticket
  `08`, which is now **out of scope** — so if supersession is worth building, it
  graduates from *this* fog patch as its own ticket, and inherits nothing from
  dedupe except ADR 0010 §6's "mark superseded, never delete" posture.
- **A write-time content-integrity floor.** 61 of 239 entries (26%) hold a
  single token — `Fix`, `Updated`, `When` — because unquoted shell arguments
  word-split and `neuron memory add` keeps only `positionals[0]`. The rows are
  otherwise well-formed (correct category, distinct meaningful tags, real
  importance), so nothing flags them and they still occupy an embedding slot.
  Whether the fix is a length floor, a whitespace check, a confirmation prompt,
  or an argument-count guard is unformed — but a quarter of this store's recall
  surface is destroyed content, which bears on every retrieval measurement the
  map has taken.

- **Bootstrapping category centroids on a cold store.** Unchanged by `28`, which
  checked: a fresh `md` project has exactly the cliff a fresh `vector` project
  has, no better and no worse, because both read centroids from the same
  database. It is not a storage-mode problem. Originally surfaced by `06`:
  centroid category inference beat the model 9/9 to 1/9, but it needs entries to
  form centroids from, so a brand-new project cannot infer a category until a
  few entries are filed explicitly. Whether that cliff is worth removing — and
  how, given the spec's rejection of embedding short label strings — is
  unformed. It may simply be acceptable: the recommended posture passes
  `--category` anyway.
- **Tag vocabulary is a full-table read per process.** `06` reads every tagged
  row's embedding to build centroids on the first inferring write. Fine at 224
  entries; it wants a cached centroid table or an index long before it is a real
  problem. Not ticketed because the trigger — what store size actually hurts —
  has not been measured.
- **Should `neuron exec`'s pre-command lookup also become a hook?** Step 2 of the
  protocol still asks the agent to wrap commands. A `PreToolUse`-style hook could
  enforce it, but only on harnesses that expose one. Hangs on ticket `10`.
- **Recall payload token budget.** The PersonaMem sanity run retrieved 28k tokens
  successfully and the *large* model then over-reasoned on it. Auto-injection on
  every turn makes this sharper, not softer. Needs a budget, a truncation
  strategy, and possibly a relevance floor. Hangs on ticket `11`.
- **Restructuring the packaged `neuron-memory` skill.** Once step 1 leaves
  `CLAUDE.md`, the shipped skill at `.claude/skills/neuron-memory/SKILL.md`
  describes a protocol that no longer matches. Scope of the rewrite is unclear
  until `14` lands. **Partly graduated by `25`**, which makes the skill the
  one-stop setup shop and adds prune configuration to it; what remains fogged is
  the read-side protocol rewrite that depends on `14`. `26` corrected the skill's
  factually-wrong half — it was documenting an `importance` config key and a
  `neuron memory enrich` command that no longer exist — but that was a
  correction, not the restructure; this patch stays fogged.
- **Grammars for the remaining 6 languages.** Ticket `02` covers the 8 languages
  the old ticket 06 required. Ruby, PHP, Swift, C# and the rest stay at regex
  fidelity — whether they graduate in 2.2.0 or later is open. Sharpened by `02`:
  these languages now also carry a crude `export|public|pub` line test for the
  new `exported` flag, so their export contracts are weaker than the AST
  languages' in a second, less obvious way. **Explicitly deprioritised on
  2026-08-02**: the repositioning handoff asked for a tree-sitter migration as its
  "ticket group 3", not knowing `02` had already shipped it in rc1 — what actually
  remains is these four extensions. The handoff's own ruling stands and is now
  easier to accept: this is a *supporting-feature accuracy fix*, sequenced behind
  markdown-memory work, but it should land before `scan --diff` fidelity is
  advertised with confidence anywhere.
- **Threat model for grammar delivery.** Ticket `01` fetches `.wasm` from the npm
  registry over TLS with pinned versions, but does not verify the registry's
  `dist.integrity` checksum — it bypasses npm, so npm's own verification does not
  apply. A compromised mirror could serve a bad grammar. Not ticketed because the
  prior question is unformed: what threat model does a local-only dev tool owe its
  users? Answer that and the hardening follows, or is consciously declined.
- **Cross-harness testing strategy.** Five adapters need verification against
  five real harnesses. Whether that is CI-automatable or stays manual is unknown
  until `10` reports.

## Out of scope

<!-- ruled beyond this destination; closed, never graduates -->

- **`@neuron/core` — a separate package, SDK, or pluggable-provider system.**
  Considered and explicitly deprioritised in the 2026-08-02 repositioning
  handoff. Ruled out here so a later session does not rediscover it as an
  attractive refactor while doing rc5's storage work — the reconcile engine in
  `29` is exactly the kind of seam that invites it. (This originally named the
  `md-only` embedding layer, which `28` deleted.)
- **Competing on architecture-analysis depth** — AST completeness, call graphs,
  cross-repo indexing. This is the repositioning's central concession:
  `codebase-memory-mcp` (tree-sitter + hybrid LSP, 32.7k stars) owns that niche,
  and the 2026-08-02 handoff rules out contesting it. `neuron scan` stays
  deliberately lightweight. Does not affect rc1's shipped AST work, which was
  about *accuracy* of a supporting feature, not depth.
- **New top-level CLI commands**, unless something in `28`–`34` proves genuinely
  insufficient without one. From the same handoff. Note this map had already
  ruled out `neuron doctor` on separate grounds; that ruling now has a second
  reason behind it.

- **[30 — Write-Side Enrichment and Honest Counts in `md-only`](issues/30-md-only-enrichment-and-status.md)**
  — superseded **2026-08-02** by `28`. Every defect it was filed to fix —
  `tags: []` on every entry, an omitted `--category` hard-erroring 100% of the
  time, dropped degradation counters, `neuron status` reporting `totalCount: 0`
  — is a symptom of `md-only` setting `this.db = null`. `28` deletes the mode
  rather than repairing it, so the database is present and all four work
  unchanged. The work **vanishes rather than being done**, which is why this is
  a scope boundary and not a step on the route. Its one durable item, cold-store
  centroid bootstrapping, returned to **Not yet specified** unchanged.

- **[07 — Salvage Expansion for Weak Retrieval](issues/07-query-expansion.md)**
  — killed **2026-08-02** by its own scope step 3, which pre-committed to
  calibrating the weakness floor rather than guessing it and to reporting a
  failure to separate as a finding. It does not separate. Best top-1 cosine on
  queries retrieval got **wrong** (mean 0.7779, max **0.9516**) is *higher* than
  on queries it got **right** (mean 0.7518, min 0.6548) — every measured failure
  is a *confidently wrong* retrieval, not a weak one, and no rewritten query
  fixes a ranking that is confidently inverted. The floor *does* cleanly separate
  no-answer and terse queries (≤0.6173 vs ≥0.6548), which is the `CLAUDE.md`
  "try a broader keyword" case — but that population never appears in Pillar 7,
  so the A/B bar would have returned delta 0.0 regardless. Also corrected: ADR
  0010 §2's premise that a nonsense query's top hit scores ≥0.75 is **false**
  (measured 0.4375–0.5565, because a nonsense query gets no FTS hits and
  `normRrf` caps at 0.5), so raw `similarity` was never surfaced. The usable
  half survives as [27](issues/27-minscore-is-inert.md).
  [Evidence and re-runnable probe](../salvage-expansion/README.md);
  [ADR 0010 amendment](../../docs/adr/0010-llm-job-guardrails.md).

- **[08 — LLM-Assisted Consolidation & Dedupe](issues/08-consolidation-dedupe.md)**
  — ruled out by the maintainer on **2026-08-01**, before being designed,
  because the premise was measured and did not survive. Pairwise cosine over all
  239 store entries found **exactly one** genuine same-category semantic
  duplicate (a byte-identical repeat, findable by content hash with no model),
  and the band you would have to open to catch more is full of semantic
  *opposites* — `Explained NEURON_MOCK_EMBEDDER check` vs `Removed
  NEURON_MOCK_EMBEDDER check` sit at cos **0.9210**. Adjudicating those needs
  reliable negation detection, the weakest capability of both a 0.5B model and
  the embedder shortlisting for it — the same shape that disqualified both arms
  in `24`. Most apparent duplication was a *different* bug: collided
  single-token rows from the argv-truncation defect fixed in `v2.1.2`.
  Retrieval was already measured at recall@10 **98.3%** (`22`), so the
  "near-duplicates crowd retrieval" premise had no supporting evidence.
  ADR 0010 §6 still governs the design *if* it ever returns. **Its supersession
  half may return as a new ticket on its own merits** — see *"Capturing a
  maintainer decision"* under **Not yet specified** — but that would be a
  supersession ticket, not a revival of dedupe.

- **Recall synthesis / briefing compression via the 0.5B model** — considered as
  the highest-value LLM job and declined. A small model compressing retrieved
  memories fails invisibly: the consumer cannot tell a dropped detail from an
  absent one. Revisit only with a larger model.
- **`neuron doctor` diagnostic command** — a re-runnable per-harness fidelity
  check was proposed; `neuron init` output plus a README matrix was chosen
  instead. Reconsider if the static matrix proves to go stale.
- **MCP server** — rejected on the merits, not on cost. MCP exposes tools the
  agent *chooses* to call, which is the same reliability failure as a `CLAUDE.md`
  instruction, relocated. Only hooks make recall deterministic.
- **`neuron completion` shell autocompletion** — deferred out of 2.1.0 and still
  unscheduled. Tracked at
  [04 — Shell Autocompletion & DX](../architecture-scans-2.1.0/issues/04-shell-autocompletion-dx.md).
