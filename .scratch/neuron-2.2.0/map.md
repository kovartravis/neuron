# Map — neuron 2.2.0

## Destination

`@kovartravis/neuron` **v2.2.0** published stable to npm, reached progressively
through four release candidates. The release covers three themes: real
WebAssembly Tree-Sitter AST parsing, expanded use of the shipped Qwen1.5-0.5B
model, and harness-native recall across five coding agents with an `AGENTS.md`
fallback for everything else.

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
| `2.2.0-rc2` | `05`–`07`, `09`, `24` | Expanded Qwen1.5-0.5B usage — **much narrower than charted**: `08` is out of scope, `23`/`24` removed automatic pruning, `25` is deferred, and `06` shipped with the model off the write path |
| `2.2.0-rc3` | `10`–`15` | Recall adapter layer + 2 reference adapters |
| `2.2.0-rc4` | `16`–`20` | Remaining 3 adapters + disclosure |
| `2.2.0` | `21` | Stable release |

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
  not defer the hazard.
  A later session claimed this ticket by mistake because every durable artifact
  still said to work it — see the ticket's postmortem, and
  *"When a decision is not written down"* under **Not yet specified**.

## Not yet specified

<!-- in-scope fog: real, but not yet sharp enough to ticket -->

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

- **Bootstrapping category centroids on a cold store.** Surfaced by `06`:
  centroid category inference beat the model 9/9 to 1/9, but it needs entries to
  form centroids from, so a brand-new project cannot infer a category until a
  few entries are filed explicitly. Whether that cliff is worth removing — and
  how, given the spec's rejection of embedding short label strings — is
  unformed. It may simply be acceptable: the recommended posture passes
  `--category` anyway.
- **Enrichment in `md-only` storage mode.** Tag and category centroids are
  computed from the vector store, which `md-only` does not have, so enrichment
  silently does nothing there. Whether md-only deserves parity, a documented
  limitation, or a warning depends on how first-class that mode is meant to be —
  a question this map has not asked.
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
  the read-side protocol rewrite that depends on `14`.
- **Grammars for the remaining 6 languages.** Ticket `02` covers the 8 languages
  the old ticket 06 required. Ruby, PHP, Swift, C# and the rest stay at regex
  fidelity — whether they graduate in 2.2.0 or later is open. Sharpened by `02`:
  these languages now also carry a crude `export|public|pub` line test for the
  new `exported` flag, so their export contracts are weaker than the AST
  languages' in a second, less obvious way.
- **Threat model for grammar delivery.** Ticket `01` fetches `.wasm` from the npm
  registry over TLS with pinned versions, but does not verify the registry's
  `dist.integrity` checksum — it bypasses npm, so npm's own verification does not
  apply. A compromised mirror could serve a bad grammar. Not ticketed because the
  prior question is unformed: what threat model does a local-only dev tool owe its
  users? Answer that and the hardening follows, or is consciously declined.
- **Cross-harness testing strategy.** Five adapters need verification against
  five real harnesses. Whether that is CI-automatable or stays manual is unknown
  until `10` reports.
- **Duplicate blueprint cards.** Surfaced by `04`: four blueprint cards exist in
  the `decisions` category. `ingestScanResults` locates "the" card with a
  semantic query plus `.find()`, so which one it upserts is not guaranteed
  stable and duplicates accumulate — while `SCAN_HELP` promises "Re-running
  updates that card in place rather than adding a duplicate". The fix is
  probably a deterministic card identity rather than a similarity search, but
  whether that is a stable id, a tag, or a dedicated table is unformed.

## Out of scope

<!-- ruled beyond this destination; closed, never graduates -->

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
