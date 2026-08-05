# Map — neuron 2.2.0

## Destination

`@kovartravis/neuron` **v2.2.0** published stable to npm, reached progressively
through release candidates, carrying three shippable, marketable pillars:
**(1)** deterministic, hook-based recall for **Claude Code and Codex CLI** — no
agent cooperation required, verified end to end with the instruction removed;
**(2)** **markdown as the store of record**, with the vector store demoted to a
rebuildable index and writes schema-enforced so an agent using the CLI cannot
produce a malformed entry; **(3)** **deterministic, byte-stable architecture
scanning** via real Tree-Sitter AST parsing, producing a card that only changes
when the codebase does.

> **Narrowed on 2026-08-04, close to a weekly usage limit, to ship a focused
> major release rather than let the map sprawl toward a fifth.** The three
> pillars above were already ~90% landed (tickets `01`–`13`, `23`, `24`, `26`–`29`,
> `31`, `35`–`39` all resolved) — what remained open was mostly the `rc4`
> best-effort-harness band (`16`, `19`, `40`) plus its cut (`20`), which was
> never load-bearing for any of the three pillars: `10`'s own research already
> found Copilot CLI and Cursor land `best-effort`, a real but harder-to-market
> claim than "deterministic," and rc5 (the markdown-first band) has **no
> technical dependency on rc3/rc4** per the note below — it was only sequenced
> last because that's where the band was added.
>
> `16`, `40`, `20`, and `19`'s full compatibility-matrix scope are **closed
> out of scope here** and continue as a fresh effort at
> [neuron-2.3.0](../neuron-2.3.0/map.md) — recall for
> Copilot CLI and Cursor, and the fuller disclosure UX that becomes worth
> building once there is a *less-than-deterministic* harness to explain.
> (That map was created the same day as `neuron-harness-expansion` and
> **renamed to `neuron-2.3.0` later on 2026-08-04**, when the maintainer
> widened it into the catch-all next-release map and added a config-vocabulary
> band; the four tickets moved from here are unchanged by the rename.) `19`'s
> minimal duty — truthfully reporting Claude Code/Codex fidelity in `neuron
> init` and a two-row README note — is small enough now to fold into `15`
> rather than carry its own ticket. See **Out of scope** below for the
> per-ticket pointers, and this map's remaining path is now
> `rc3 → rc5 → stable` — `rc4`'s slot is reserved for the follow-on effort,
> not renumbered away.

The release covers four themes: real WebAssembly Tree-Sitter AST parsing,
embedder-based write-side enrichment with a measured boundary on what a 0.5B
model can be trusted with, harness-native recall — narrowed above to Claude
Code and Codex CLI for this cut — and — added 2026-08-02 — **deterministic,
schema-enforced plain-markdown memory as the product's primary claim**.

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
| `2.2.0-rc3` | `10`–`15`, `39`, `41` | Recall adapter layer + the 2 `deterministic` adapters (Claude Code, Codex CLI) + the `instruction-only` fallback + the relevance gate (`27` designed it; `41` ships the structural half, `39` the one fitted constant) |
| ~~`2.2.0-rc4`~~ | ~~`16`, `40`, `19`, `20`~~ | **Moved 2026-08-04** to [neuron-2.3.0](../neuron-2.3.0/map.md) — not load-bearing for any of the three pillars. `17`/`18` stay out of scope regardless (ruled out on the merits, not on sequencing) |
| `2.2.0-rc5` | `28`–`38`, `43`–`46` | **Markdown-first**: markdown as the store of record with the vector store demoted to a rebuildable index, `scope` removed, `md` as the default mode, deterministic schema-enforced writes, a byte-stable architecture card, repositioned README and docs |
| `2.2.0` | `21` | Stable release — now blocked by `15` (rc3 cut) and `34` (rc5 cut) only, not `20` |

> **`27` settled the floor's *shape*** (2026-08-02, ahead of `11` reaching point
> 4). It fixed point 4 as a two-leg conjunction and **rewrote `39`'s design**: the
> old three-quantity sweep is dead — the hybrid-`score` arm ceased to exist once
> importance left the score, and the `normRrf` arm is bimodal rather than
> sweepable. `39` measured one fitted constant (the cosine floor, conditioned on
> the lexical leg) and one previously-unvalidated claim (the lexical leg's
> false-silence rate). `27` also supplies point 3's ledger with the floor it
> requires, and puts the gate in the retrieval layer so `12`/`13` inherit it
> rather than reimplementing it.

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
  raw-cosine trigger is factually wrong — **a nonsense query's top hit *scores*
  0.4375–0.5565** (hybrid RRF, which caps at 0.5 with no FTS hits — *not* raw
  cosine, which runs 0.635–0.826 on real queries). The non-regression bar, the
  silent-degrade posture and the timeout all stand.

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

- [10 — Harness Compatibility Research: Injection Surfaces Across Six Agents](issues/10-harness-compatibility-research.md)
  — Scope grew from five harnesses to six mid-research: **Cursor** added at the
  maintainer's request (the research agent initially treated the request as a
  possible injection until it found the ticket file's own on-disk edit as
  independent corroboration). Fidelity verdicts: `deterministic` for **Claude
  Code** and **OpenAI Codex CLI** only (per-turn injection, documented
  fail-open failure/timeout semantics, a documented payload cap). `best-effort`
  for **GitHub Copilot CLI**, **Google Antigravity CLI**, **OpenCode**, and
  **Cursor** — each for a different reason: Copilot CLI and Cursor inject only
  at session start (their per-turn hook is permission-only, not a context
  carrier); Antigravity's `injectSteps` is the most general per-turn mechanism
  on paper but its own docs disagree on config paths; OpenCode's
  `chat.message`/`chat.params` is the richest surface but has no documented
  failure/timeout/payload behaviour. **None landed at pure
  `instruction-only`.** Verifiability (confirming a hook actually *fired*, not
  just that it's configured) is an undocumented gap across all six — flagged
  as an open risk for `11`, not assumed solvable.
  [Full research](research/harness-compatibility.md).
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

- [11 — Recall Adapter Architecture](issues/11-recall-adapter-architecture.md) —
  **rc3 ships `deterministic` only** (Claude Code + Codex CLI) plus an
  `instruction-only` fallback now scoped to *unlisted* harnesses, since `10`
  found all six researched harnesses have a real mechanism. Capability is a
  **`lifecyclePoint → supportRecord` map**, not a single enum — the
  `deterministic`/`best-effort` label is derived for display, never stored, and
  `unknown` is a first-class value distinct from "no" (Copilot and Cursor share
  a cell but aren't equivalent). Pre-prompt injection is deduplicated by a
  **session-scoped ledger** (delta-only, guarding against the PersonaMem
  over-reasoning result), cleared by a third execution-only lifecycle point,
  `context-reset`, on compaction — falling back to a turn-count TTL where
  unavailable, so degradation fails toward *repetition*, not *silence*. Neuron
  enforces its own **character ceiling strictly below the smallest harness
  cap** and never relies on spill-to-file, because spill converts deterministic
  recall back into agent-invoked recall exactly when the payload is largest.
  `neuron init` **prompts for the hook target** (user-global /
  project-committed / project-local) and **asks before overwriting** an
  existing hook entry rather than classifying it — byte-identity and
  managed-field classification were both rejected for having no fixed referent
  across versions. **Multi-harness resolution** (point 6, resolved
  2026-08-03): `init` wires **every detected harness**, matching the existing
  `detectHarnesses` skill-copy precedent; the `AGENTS.md` fallback layers in
  only when *no* deterministic/best-effort harness matched; the hook-target
  prompt is asked once per `init` run and applied to all; the overwrite-ask
  stays per-file; and a new `--harness <list>` flag narrows wiring to a subset
  of *detected* harnesses only (cannot force-wire an undetected one). `17`
  (Antigravity) and `18` (OpenCode) ruled out of scope — their reliability
  cannot be *stated*, which is the abstraction lying this ticket exists to
  prevent. Unblocks `12` and `13`.
  [ADR 0014](../../docs/adr/0014-recall-adapter-architecture.md).

- [12 — Claude Code Adapter (Deterministic Reference)](issues/12-claude-code-adapter.md)
  — Shipped as reusable `src/harnesses/` infrastructure (`types`, `payload`,
  `ledger`, `hookState`) plus `claudeCode.ts` and the `neuron hook
  claude-code <point>` entrypoint, wired into `neuron init`
  (`--hook-target`/`--overwrite-hooks`/`--keep-hooks`/`--harness`/
  `--no-hooks`/`--uninstall-hooks`). Install/uninstall only ever touch a
  matcher-group neuron created itself — a user's own hooks are never read or
  mutated, even sharing the same event array. **Resolved ADR 0014 §3's one
  open risk**: fetched Claude Code's hook JSON schema directly — `session_id`
  is present on every event, so the session-ledger dedup design holds.
  Measured latency (real embedder): 0.366s cold, ~0.2s warm — matches the
  ADR's own correction almost exactly, comfortably inside the 30s harness
  timeout. Demonstrated deterministic recall with no `CLAUDE.md`/`AGENTS.md`
  present at all. The interface needed no revision. 45 new tests, all green;
  full suite 355/359 (4 pre-existing `42` pollution failures, confirmed
  unrelated). Hands `13` a harness-agnostic layer to build Codex against.

- [13 — Codex Adapter (Fallback Reference)](issues/13-codex-adapter.md) —
  **Codex turned out deterministic, not the fallback extreme the ticket's own
  framing assumed** (that framing predates `10`'s finding). A direct fetch of
  Codex's hooks docs during this ticket found event names, stdin fields
  (`session_id` on every event including `PreCompact`/`PostCompact`,
  `prompt` on `UserPromptSubmit`), and the stdout `hookSpecificOutput`
  envelope **byte-identical to Claude Code's** — resolving ADR 0014 §3's
  session-ledger risk for Codex the same way `12` resolved it for Claude
  Code, and letting `src/commands/hook.ts`'s `runHook()` stay fully
  harness-agnostic (only the harness allowlist widened). The one real
  difference is contained inside `codex.ts`: Codex's schema documents a
  single `command` string, not Claude Code's `command`+`args[]` split — an
  adapter detail, not an interface change, so `11`/ADR 0014 needed no
  revision. Two Codex-specific judgment calls: `payloadCapChars` reports a
  flagged 3-chars/token conversion of the documented 2500-token cap (no
  directly-quoted character figure exists), and `'project-local'` collapses
  into the same `.codex/hooks.json` `'project-committed'` writes (Codex
  documents no third, gitignored scope), with a one-time stderr warning.
  The `AGENTS.md`-fallback and instruction-round-trip deliverables are moot
  by the same deterministic finding — nothing built there. Multi-harness
  coexistence verified directly: a project with both `.claude/` and
  `.codex/` gets both adapters wired independently, neither touching the
  other's file. 29 new tests (14 adapter, 7 CLI end-to-end via
  `dist/cli.js hook codex <point>`, 3 init-wiring incl. two-marker
  multi-harness and `--harness` filtering), all green; full suite 380/384,
  the 4 failures all pre-existing `42` pollution in files this ticket never
  touched. Unblocks `14` and `15`.

- [14 — Protocol Block Rewrite: Hooks Own Read, Agent Owns Write](issues/14-protocol-block-rewrite.md)
  — Built `src/config/protocolBlock.ts` from scratch (no prior `CLAUDE.md`/
  `AGENTS.md` writer existed despite `harnesses.json`'s unused `mdFile` field).
  One generator, two marker-wrapped variants: `deterministic` drops the old
  step 1 and renumbers 1–3, `fallback` keeps Recall as step 1 — both read
  categories and scan settings live from `neuron.yaml` instead of being
  hand-typed. Fidelity is resolved from **ground truth** (`capability()` +
  `verify()`), not this run's flags, and several harness names sharing one
  `mdFile` (`agents`/`github`/`codex` → `AGENTS.md`) get the short block the
  moment *any* of them has a working hook (ADR 0014 §8.1). Upgrades reuse the
  hooks' own `--overwrite-hooks`/`--keep-hooks`/ask machinery rather than a
  parallel flag pair. This repo's own `CLAUDE.md` and the packaged
  `neuron-memory` skill (a narrow addition, not the full restructure still
  fogged below) both migrated. Found and fixed a real bug while wiring it in:
  `copySkill`'s own `.agents/skills` fallback creates `.agents/` as a side
  effect, which a naive harness re-scan afterward would mistake for a
  detected harness — fixed by snapshotting detection once, before any
  filesystem side effects. 15 new unit tests, 6 new CLI tests, all green;
  same 4 pre-existing `42`-pollution files fail identically to before.

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

- [27 — `minScore` Is Structurally Inert](issues/27-minscore-is-inert.md)
  — **The ticket's own diagnosis was wrong, and the correction is the finding.**
  `minScore` is not a threshold set too low; the *quantity* it reads is unfit to
  gate on, for two independent reasons. First, `score` blends relevance with
  importance, and importance wins often enough to be a **ranking defect on every
  query** — measured live, the entry ranked **1st** by cosine (imp 3, score
  0.500) is displaced by the one ranked **3rd** (imp 5, score 0.613). So
  importance is stripped from `score`, and **not** demoted to a tie-break: ranks
  are unique per row, so ties are measure-zero and there is no tie-break job.
  Second — unanticipated — decontamination alone does not help, because `normRrf`
  is **bimodal** (exactly 0.5000 with no FTS match, ~0.97–1.0 with any) and is
  therefore a *keyword-presence detector*, not a relevance score. Hence a
  **conjunctive gate**: lexical corroboration **and** a cosine floor, load-bearing
  in both directions because they fail on disjoint sets — `pytorch` (cos 0.6143)
  and `kubernetes` (0.6074) score *above* the lowest genuinely-relevant query
  (0.6072) so no floor rejects them, while `make me a sandwich` rides one stray
  `"make"*` prefix hit to `normRrf` 0.9692 so no predicate rejects it. Zero
  results becomes a legitimate, **announced** output carrying the rejected count,
  and the gate moves into the retrieval layer to run on **both** `exec` and
  `memory query` — a split posture was proposed and declined. `importance`
  survives as a **prune-only** field: removing it would reverse `25`'s deferral by
  the back door and delete the only guard against `23`'s live hazard.
  Work splits on the *needs-a-fitted-constant* line into
  [41](issues/41-decontaminate-score-and-lexical-gate.md) (structural, unblocked)
  and `39` (the cosine floor). All 15 probes are self-referential and **no number
  becomes a default**. Measured: `neuron exec -- ls` injects 5 entries / 4,245
  characters today, 0 under `41`.
  [ADR 0012](../../docs/adr/0012-relevance-gate-and-score-decontamination.md).
- [39 — Relevance Floor Validation](issues/39-relevance-floor-validation.md)
  — **No cosine floor ships.** Full LongMemEval-S run (500 questions, 23,867
  documents, zero LLM calls) against the pre-committed bar from `27`: swept
  0.50→0.70 conditioned on the lexical leg, and **every floor fails** — even
  the gentlest (0.50) regresses recall 3.3%/4.0%/4.2% at @1/@5/@10 for a 4.4%
  volume reduction. The corpus argument explains why: on-topic r1 (median
  0.627) and negative-control r1 (median 0.533) overlap substantially, a
  **thinner** margin than `27`'s own dense-technical-prose measurement
  (0.123) — conversational text is the *harder* case for a cosine floor, the
  opposite of the pilot's hedge. The lexical leg's other open risk resolved
  cleanly: **0 of 500** queries had a top-hit false silence, in every category
  including the hardest to paraphrase (`multi-session`, `temporal-reasoning`),
  closing ADR 0012 Consequence 6 — it ships in `41` as designed, no demotion.
  Found and fixed a real blocker first: `38`'s `scope` removal (already on
  trunk) had silently broken this benchmark's per-question isolation, since
  `scope`/`scopes` are no-ops now — fixed by isolating on `category` instead,
  and control-arm recall reproduced the published baseline after the fix (0
  cross-unit leaks). Also added `similarity`/`ftsMatched` to every `Memory`
  result (`src/index.ts`) since `41` hasn't shipped and there was no other way
  to read the gate's raw legs. Config surface landed: `minScore` deprecated
  (parses, warns, ADR 0012), no `cosineFloor` key (no number to default it
  to — the same call `26` already made once for a measured non-signal),
  new `relevance.gate.enabled` switch for `41`'s lexical-only gate. Unblocks
  `11` point 4: the payload budget's floor is *none*, the character ceiling is
  the sole volume control. [ADR 0012 amendment](../../docs/adr/0012-relevance-gate-and-score-decontamination.md#amendment-ticket-39-2026-08-03--the-cosine-floor-and-the-config-surface).

- [41 — Decontaminate the Ranking Score and Land the Lexical Gate](issues/41-decontaminate-score-and-lexical-gate.md)
  — `score` is now `normRrf` alone (`importance` stays prune-only); the lexical
  leg (reject a result with no FTS match — proven identical to `normRrf > 0.5`)
  gates both `neuron exec` and `neuron memory query` from one choke point,
  `NeuronMemory.queryGated()`, which `query()` now wraps — so the recall hooks
  and legacy query wrappers inherit the gate for free. Zero-result announces
  with a rejected count on both surfaces, and cumulatively in `neuron status`
  (`relevance.rejectedTotal`, an item ADR 0012's amendment assigned here).
  `onExec` merging is last-match-wins, not widen-only; this repo's own
  `neuron.yaml` had its two `limit` values swapped so the specific override's
  tighter intent survives. Re-running the acceptance criteria's live-store
  checks (`neuron exec -- ls`, `27`'s 15 probes) no longer reproduces the
  original counts — the store has since absorbed its own decisions/history
  entries *about* tickets 27/28/39, which quote `ls`/`kubernetes`/`pytorch`
  verbatim as illustrative examples, so those queries now get real, correct
  FTS matches against the project's own writeup of itself. Not a defect —
  ADR 0012's "denser on neuron's internals than any user's store" caveat made
  concrete — verified instead by controlled-content unit tests, which hold the
  corpus fixed. 6 pre-existing tests rewritten off the removed importance-blend
  invariant; 432/436 full suite, the 4 failures pre-existing `42` pollution.
  [ADR 0012 amendment](../../docs/adr/0012-relevance-gate-and-score-decontamination.md#amendment-ticket-41-2026-08-04--shipped-as-designed).
- [31 — Make `md` the Actual Default](issues/31-md-only-as-default.md)
  — Two schema lines flipped to `md`, and `neuron init` now writes the
  `neuron.yaml` that says so; the audit for a third place found none. **The
  scope item about `neuron scan`'s category was hiding a data-loss bug.**
  `architecture` does resolve when undeclared (nothing validates `--category`),
  but `bootstrapSeed` seeded only *declared* categories — so an undeclared
  category's rows never reached markdown, and the strict mirror deleted them
  the moment someone declared it. Measured on the CLI: **1 of 2 entries
  destroyed, silently**, on the `vector-only` → `md` → declare-the-category
  path this flip puts every upgrading user on. Fixed by seeding the **union**
  of requested and stored categories — a seed is a complete export or it is not
  a safety net — while steady-state reconcile stays on the declared set.
  Decisions: `init` **never** touches an existing config (including an
  ancestor's — `init` is re-run routinely, so anything it edits it re-edits over
  your hand-tuning); the **generated template is the contract, not the README
  example**, which predates `28` and names a deleted mode; the template turns on
  nothing the schema defaults leave off (`scan.enabled: false`), so generating it
  changes what a project *says*, not what it does; and the router's invalid-mode
  fallback deliberately stays `vector-only`, because guessing `md` on a config
  we cannot parse turns "unrecognised setting" into deletion. Corrects this
  ticket's own Verification: *"and no SQLite file"* is void — `28` deleted
  `md-only`, so the database is always present as a rebuildable index.
  **This repo's own `neuron.yaml` is deliberately not flipped** — it would seed
  264 entries into `.neuron/*.md`, which is the maintainer's call. 290 → 303
  tests, full suite green; 12/13 E2E pillars (Pillar 8 pre-existing).
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

- [36 — Configurable Frontmatter Schema: What "Deterministic" Guarantees](issues/36-configurable-frontmatter-schema.md)
  — "Deterministic" is scoped to **shape + byte determinism by default**; value
  determinism (same command, same values, forever) is not achievable while
  centroid inference exists, so it's gated behind an opt-in **`strict` mode**
  that disables both tag and category inference. Three field tiers stand
  (structural / semantic-reserved / user-defined); the type system floor is
  **string and enum only**. Required-but-missing gets the same
  hard-error-unless-`default:` policy `06` already set for `--category` — no
  second policy. Config-declared fields become CLI flags (maintainer-decided
  2026-08-02); enforcement lives in `transact()`, the one choke point that
  covers both `parseFlags` and `ingestScanResults`' direct writes, which is
  also why `neuron scan`'s architecture card is subject to its category's
  schema and why a category `scan.category` points at must have `default:`s
  on every required field. Pre-existing entries against a newly-declared
  schema are **read and reported, never refused** — a missing value isn't
  synthesizable (no safe default for `reviewedBy`) and isn't ambiguous (`35`'s
  binary doesn't fit), so it just gets reported. **`vector-only` gets identical
  enforcement via an additive-only SQLite auto-migration** (`ALTER TABLE
  memories ADD COLUMN`, never `DROP`), not a mode gate. Reopens validation
  tooling, folded into **`neuron status --check`/`--repair`** rather than a new
  `neuron doctor` command — repair applies configured defaults and offers
  centroid inference for enum fields only, and **deliberately never fabricates
  a value for a free-text identity field**, the same failure shape this map
  has already measured three times (`06`, `08`, `35`). Implementation
  graduated as [43](issues/43-declarable-field-schema-cli-flags.md) (schema +
  CLI flags), [44](issues/44-sqlite-additive-field-migration.md) (SQLite
  parity), [45](issues/45-strict-mode-and-skill-docs.md) (`strict` mode +
  skill docs), [46](issues/46-status-check-repair.md) (`--check`/`--repair`).
  [ADR 0013](../../docs/adr/0013-configurable-frontmatter-schema.md).
- [37 — The Architecture Card as a Deterministic Artifact](issues/37-architecture-card-deterministic-artifact.md)
  — Byte-stability needed more than dropping `mtime`: the card's whole embedded
  `---category/title/tags/mtime---` block was dead weight (nothing reads it;
  `title` duplicates the H1 heading right below it) and, worse, its
  frontmatter shape corrupted `MdStorageAdapter`'s whole-category-file parser
  the moment another entry shared the file — deleted rather than patched.
  `ingestScanResults`' semantic-search card lookup is replaced with a derived
  id (`sha256` of the category, no query at all); both storage backends
  already do exact-id-match upsert. A third bug surfaced chasing byte-stability
  to zero: `MdStorageAdapter.writeEntry` re-minted `createdAt` on every upsert
  instead of preserving it, unlike `updateEntry` and the SQLite path — fixed.
  This repo's own 6 duplicate/corrupt cards reconciled to 1 by deletion, letting
  a fresh `neuron scan` recreate the canonical card. Interaction with `36`'s
  category schema is explicitly deferred — `36` lands second and owns making
  them agree. **Fallout**: found (not fixed) a live bug where `npm test`
  pollutes this repo's real `.neuron/{learning,history}.md`, pre-existing since
  `31`, confirmed via `git stash` against pre-`37` code — split out as
  [42 — Isolate CLI Tests From the Real `.neuron` Store](issues/42-isolate-cli-tests-from-real-store.md).
  8 tests added, 305/309 green (4 pre-existing failures are `42`'s).

- [15 — Cut and Publish 2.2.0-rc3](issues/15-cut-rc3.md) — `v2.2.0-rc3` cut,
  tagged and pushed; **npm publish is outstanding and owned by the
  maintainer**, matching `04`/`09`'s precedent. Ships the release's headline
  claim, demonstrated live on a scratch project: deterministic recall with
  the query-first instruction fully removed from `CLAUDE.md`. Per `09`'s own
  warning to check trunk rather than the nominal band, this cut also carries
  rc5's `31`, `37` and `39` (already on trunk) — but **not** `41` (verified:
  `src/index.ts` still blends `importance` into `score`), which stays
  unclaimed and ships whenever it's next worked. Config-safety verified
  directly: idempotent re-install, a hand-added user hook and an unrelated
  JSON key survive byte-for-byte, `--uninstall-hooks` removes exactly
  neuron's 3 entries, both `.claude/`+`.codex/` wire independently with no
  double-injection. Latency confirmed against the rc2 budget: ~0.2s warm
  per hook invocation, matching `12`'s own measurement. Found and fixed
  three stale-docs gaps: `docs/COMMANDS.md`'s `neuron init` table still
  documented a dead `--file`/`-f` flag and omitted all seven hook flags;
  `CONTEXT.md`'s `init` entry had the same staleness and no entry existed
  for the new harness-adapter/protocol-block modules; README's
  "not locked to one agent" bullet predated the hook work. 400/405 unit
  tests, 12/13 E2E pillars — both pre-existing gaps (`42`'s real-store test
  pollution, Pillar 8 write contention), no regressions.

- [43 — Declarable Category Field Schema: Tiers, Types, CLI Flag Surface](issues/43-declarable-field-schema-cli-flags.md)
  — `36`'s design implemented with no deviation: `string`/`enum` category
  fields declared in `neuron.yaml`, refused at config-load time on four
  grounds (bad field key, enum default not in `values`, reserved-flag
  collision, `scan.category` required-without-default), become CLI flags via
  a config-derived `KNOWN_FLAGS` and dynamic `neuron memory --help`, and are
  enforced once in `NeuronMemory.transact()` — the choke point both the CLI
  and `neuron scan`'s direct write share. One scope call beyond the ticket's
  text: `update` never re-demands or default-fills a field, matching the
  existing partial-patch posture of `--tags`/`--importance`/`--task-id`.
  Storage is markdown-only for now (`44` owns the SQLite column side, as
  scoped) — a field written against a pure-vector row still validates but
  warns on stderr rather than silently vanishing. Found and fixed a real bug
  wiring it in: `neuron sync`'s `pushMdToVector` calls `transact()` directly
  and would have broken sync for any category with a required field by not
  passing the entry's existing field values through. 40 new/updated tests;
  full suite 429–430/434, the 4–5 failures confirmed pre-existing `42`
  pollution (reproduced identically against unmodified code before this
  session's changes). Unblocks `44`.

- [44 — SQLite Additive Auto-Migration for Declared User-Defined Fields](issues/44-sqlite-additive-field-migration.md)
  — Shipped as designed: every declared field becomes one nullable `TEXT`
  column on the shared `memories` table, added via an eager, idempotent,
  additive-only migration (`migrateDeclaredFields`, diffed against `PRAGMA
  table_info` on every open) that runs after the version-gated migrations,
  not inside them — column set depends on live `neuron.yaml`, not a fixed
  schema version. A column removed from config is orphaned, never dropped,
  matching `38`'s explicit-migration precedent. Column names are validated
  against the ticket's own allowlist at **three** points (config load, plus
  immediately before each DDL/DML interpolation site) rather than trusted
  from one call site, and config load gained two checks `43` didn't need: a
  field's column can't collide with one of `memories`' own fixed columns
  (`content`, `createdAt`→`created_at` are real collisions that `43`'s
  reserved-*flag* check doesn't catch), and two different field keys can't
  fold to the same column (`fooBar`/`FooBar` verified as a real pair).
  `43`'s "cannot be persisted yet" warning is deleted — every mode persists
  now. **Found and fixed a wider pre-existing gap while wiring in the read
  path**: `NeuronMemory.query()` never returned `fields` in *any* mode,
  including `md`, because `DualStorageRouter.query()` always delegates to
  the SQLite-backed `vectorDb.query()` (ADR 0011 retrieval parity) and
  nothing populated field columns there before now — `43`'s own round-trip
  tests only ever verified via `MdStorageAdapter.readCategory()` directly, a
  path no CLI command or hook calls. Fixing `queryVector`'s two `SELECT`s
  closes that gap for every mode at once. Also found and fixed two dropped-
  `fields` bugs in `DualStorageRouter`'s reconcile/bootstrap paths (as
  opposed to the live write path, which already forwarded `fields`
  correctly) — one line each. Left open, flagged rather than fixed:
  `computeMemoryHash` still excludes `fields` from its change-detection hash,
  so a hand-edit to only a declared field's frontmatter value won't trigger
  an `md`-mode resync; orthogonal to this ticket's vector-only/split scope
  since those modes never hash-compare. 13 new tests + 1 rewritten, full
  suite 466/466 green, all 45 files — no `42` pollution carryover.

- [45 — `strict` Mode and Updated `neuron-memory` Skill Docs](issues/45-strict-mode-and-skill-docs.md)
  — Shipped as designed: a top-level `strict: false` key (sibling to
  `storage`/`llm`, not nested in `llm.enrichment`) that, when `true`, gates
  the two content-driven inference paths in `enrichUpsert` — tag centroid
  selection is skipped entirely (no vocabulary embed) and category
  centroid/model inference is skipped entirely (no embed, no model call),
  leaving only a literal `llm.enrichment.category` fallback name live, since
  a fixed default doesn't reopen the value-determinism gap the way
  content-based inference does. An omitted category with no configured
  fallback hard-errors naming `strict: true` as the cause. `.claude/skills/
  neuron-memory/SKILL.md` gained a new §0b documenting `36`'s shape/byte/
  value three-way split as a table and `strict`'s explicit trade-off against
  §0a's own recommended posture. 5 new tests (3 behavioural, 2 config), full
  suite 471/471 green.

- [42 — Isolate CLI Tests From the Real `.neuron` Store](issues/42-isolate-cli-tests-from-real-store.md)
  — Every `execSync`-based `npm test` CLI test now plants an isolated tmp
  project (`package.json` only — sufficient to stop `findProjectRoot`/
  `findNeuronYaml`'s upward walk, schema defaults cover `learning`/`history`/
  `decisions`) and passes `cwd` to every call, the same pattern `init.test.ts`
  already used correctly. Fixed: `cli.test.ts`, `exec.test.ts` (5 of 6 tests;
  the 6th was already isolated), `history.test.ts`, `learn.test.ts`,
  `memory.test.ts` (3 of 4 blocks). Audit found the class of bug also live in
  two `test/e2e` files via a different call path (`NeuronMemory.open(workDir)`
  walking up past an unmarked subdirectory) — one measured at **10,633 real
  lines** injected into `.neuron/learning.md` in a single run — but `npm test`
  never runs `test/e2e/*`, so that's out of this ticket's literal scope and
  split off as [47](issues/47-isolate-e2e-benchmarks-from-real-store.md)
  rather than silently widening this diff. Also found and fixed a masked
  regression: `cli.test.ts`'s `--scopes` no-op test only passed before by
  accident, on real-store noise supplying incidental FTS matches — isolating
  it exposed that ticket `41`'s lexical gate (landed the same day) correctly
  rejects the test's own genuinely-unrelated seeded entry, so the test itself
  was corrected rather than the gate. Verified stable across two consecutive
  `npm test` runs: 44/44 files, 437/437 tests, zero `.neuron/*.md` diff both
  times.

- [32 — Ship the Repositioned README](issues/32-ship-repositioned-readme.md)
  — `README.md` replaced, re-audited claim-by-claim against the built CLI in a
  scratch project rather than source. **Found and fixed a live bug while
  re-auditing item 5**: `scaffold.ts`'s generated `neuron.yaml` still emitted
  the `minScore` key `39`/`41` deprecated, so every fresh `neuron init` would
  warn on its very first command — deleted from the template, 2 tests added,
  473/473 green. Item 6 (cross-agent claim) now names Claude Code/Codex CLI
  only, with best-effort harnesses stated as roadmap. Item 7 ("no database")
  rewritten and strengthened: verified the SQLite file never appears under the
  project root at all — it lives in a per-machine `env-paths` cache, keyed by
  a hash of the project root. Architecture section rewritten under the
  determinism frame (byte-identical repeated scans, updates-in-place, both
  re-verified live) rather than the draft's apologetic framing. Does **not**
  claim `neuron status --check`/`--repair` (ticket `46`, still open) or use
  the draft's stale `neuron sync` mode list (corrected to `md`/`split` against
  `docs/COMMANDS.md`). CHANGELOG entry deferred to `34`, matching
  `04`/`09`/`15`'s cut-time precedent.

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

> **Trimmed 2026-08-04** alongside the destination narrowing. Nine fog patches
> not owed by any of the three pillars moved to
> [neuron-2.3.0](../neuron-2.3.0/map.md)'s own **Not
> yet specified** rather than staying parked here unresolved: the
> plan-vs-architecture-diff feature, capturing a maintainer decision,
> a write-time content-integrity floor, bootstrapping category centroids on a
> cold store, the tag-vocabulary full-table-read cost, whether `neuron exec`'s
> pre-command lookup should become a hook, confidently-wrong retrieval, the
> grammar-delivery threat model, and cross-harness testing strategy. What's
> left below either blocks on an in-scope ticket (`14`) or directly qualifies
> one of the three pillars' marketing claims.

- **An undeclared category is written but never mirrored.** Left behind by
  `31`'s fix. Nothing validates `--category` against `neuron.yaml`, so a store
  routinely holds categories the config never declares — `neuron scan`'s
  `architecture` being the standing example. `31` made the **bootstrap seed**
  cover them (it had to; the omission was destroying data), but **steady-state
  reconcile still runs on the declared set only**. So a hand-edit to
  `.neuron/architecture.md` in a project that doesn't declare `architecture` is
  silently ignored, which is precisely the promise the `md` default is sold on.
  Unformed because the sharp question is one level up and is a behaviour change
  across every command: should `--category` be *validated* against the config
  (making undeclared categories impossible, and the asymmetry moot), or should
  `categories` be advisory and reconcile follow the store rather than the
  config? Note the two answers have opposite ergonomics — the first makes
  `neuron scan` fail on a config that doesn't declare its own `scan.category`.

- **Restructuring the packaged `neuron-memory` skill.** Once step 1 leaves
  `CLAUDE.md`, the shipped skill at `.claude/skills/neuron-memory/SKILL.md`
  describes a protocol that no longer matches. Scope of the rewrite is unclear
  until `14` lands. **Partly graduated by `25`**, which makes the skill the
  one-stop setup shop and adds prune configuration to it; what remains fogged is
  the read-side protocol rewrite that depends on `14`. `26` corrected the skill's
  factually-wrong half — it was documenting an `importance` config key and a
  `neuron memory enrich` command that no longer exist — but that was a
  correction, not the restructure; this patch stays fogged. `45` adds a third
  narrow, correct addition — the shape/byte/value determinism distinction and
  `strict` mode's tradeoff, from `36` — same shape as `26`: a content
  addition, not the read-side protocol restructure that still waits on `14`.
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

## Out of scope

<!-- ruled beyond this destination; closed, never graduates -->

- **[16 — GitHub Copilot CLI Adapter](issues/16-copilot-adapter.md)** and
  **[40 — Cursor Adapter](issues/40-cursor-adapter.md)** — closed
  **2026-08-04** when the destination narrowed to a fast, focused 3-pillar
  cut (deterministic Claude Code/Codex recall, md-first, deterministic
  scanning). Neither was load-bearing for any of the three: `10` already
  found both land `best-effort`, a real but harder-to-market claim. Continue
  as tickets `01`/`02` in
  [neuron-2.3.0](../neuron-2.3.0/map.md) — a fresh
  effort, not a resumption, per this destination redraw.
- **[19 — Compatibility Disclosure: `neuron init` Reporting & README
  Matrix](issues/19-init-reporting-readme-matrix.md)** — closed **2026-08-04**
  at its original full scope (matrix + fallback row + remediation UX for
  non-deterministic harnesses), which only earns its cost once a
  less-than-deterministic harness ships. Continues as ticket `03` in
  [neuron-2.3.0](../neuron-2.3.0/map.md). Its minimal
  duty at this narrower scope — truthful `neuron init` reporting and a
  two-row README note for Claude Code/Codex — folds into `15` instead.
- **[20 — Cut and Publish 2.2.0-rc4](issues/20-cut-rc4.md)** — closed
  **2026-08-04**: `rc4` is dropped from this map's path entirely (see the
  Destination callout and the Release bands table). Continues as ticket `04`
  in [neuron-2.3.0](../neuron-2.3.0/map.md).

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

- **[17 — Google Antigravity CLI Adapter](issues/17-antigravity-adapter.md)** and
  **[18 — OpenCode Adapter](issues/18-opencode-adapter.md)** — ruled out of 2.2.0
  on **2026-08-03**, during `11`'s grilling. **Not for weak mechanisms** —
  Antigravity's `injectSteps` is the most general per-turn surface of the six
  researched, and OpenCode's `chat.message` is the richest. They are out because
  **their reliability cannot be stated**: Antigravity's own docs contradict
  themselves on config paths, and neither documents failure, timeout, payload
  limit or verification anywhere reachable (`10`). `11` settled that capability is
  a per-point map the *code reads*, so shipping these means publishing a
  capability record neuron has no source for — the abstraction lying, which is the
  hazard `11` exists to prevent. OpenCode carries a second reason: its mechanism
  is arbitrary plugin code, so `init` would ship and maintain executable source in
  a user's project, a different installation contract from every other adapter.
  They return only behind a research ticket that **measures** the behaviour — an
  adapter ticket cannot manufacture the facts it must declare. Their rc4 slot went
  to [40 — Cursor Adapter](issues/40-cursor-adapter.md), which was researched at
  the maintainer's request in `10` but had no ticket.

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
