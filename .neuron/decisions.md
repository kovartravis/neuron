# Category: decisions

---
id: 09ab7e3e-afc9-4740-a7f5-d31a1a3177eb
createdAt: 2026-07-29T12:38:28.023Z
importance: 4
tags:
  - adr
  - db
taskId: null
---
Use SQLite WAL mode for concurrency

---
id: c2d1928c-3e58-40a5-b478-6e3c955e89b0
createdAt: 2026-07-28T01:29:23.063Z
importance: 5
tags:
  - adr
  - benchmark
  - provider
taskId: null
---
Integrated

---
id: a2606013-e06b-469c-850c-c49b619bd302
createdAt: 2026-07-28T02:05:04.380Z
importance: 5
tags:
  - adr
  - benchmark
  - infrastructure
taskId: null
---
Packaged Agent Memory Benchmark evaluation infrastructure into top-level benchmarks/ directory with a Node.js orchestrator (benchmarks/runner.js) and package.json CLI entrypoints. Configured npm run bench:sanity for fast 20-query PR regression checks, npm run bench:full for overnight 589-query evaluations, and npm run bench:view to launch the web dashboard. The orchestrator automatically rebuilds TypeScript sources, purges stale output artifacts to prevent score corruption, compresses run outputs, and updates the manifest.

---
id: b642b6d7-f3eb-45f5-9a6c-887919c6d57f
createdAt: 2026-07-29T04:17:00.090Z
importance: 3
tags:
  - adr
  - config
  - zod
  - storage-mode
taskId: null
---
Implemented Zod schema validation for neuron.yaml configuration in src/config/neuronYaml.ts (replacing neuronrc naming). Configured storage.mode schema to support vector-only, md-only, dual, and split modes, defaulting storage.path to .neuron for flat Markdown storage inside project repositories. All 63 unit tests passed across 13 test files.

---
id: a9f5e6d8-c92f-43fb-9130-f353c8e239f3
createdAt: 2026-07-29T04:22:32.438Z
importance: 3
tags:
  - adr
  - md-sync
  - architecture
taskId: null
---
Architectural

---
id: 3e83b18a-998d-4a3b-b7c3-77f08e992660
createdAt: 2026-07-29T04:22:38.165Z
importance: 3
tags:
  - adr
  - cli
  - sync
  - scaffolding
taskId: null
---
Designed

---
id: f57972b4-2aae-4f6b-a661-49c451b485f5
createdAt: 2026-07-29T04:30:31.573Z
importance: 3
tags:
  - adr
  - e2e-testing
  - md-file-management
taskId: null
---
E2E testing architecture for md-file-management uses Vitest co-located with src/ modules (src/storage/*.test.ts, src/commands/*.test.ts, src/e2e/*.test.ts) using isolated temp directories, NEURON_DB_PATH overrides, and NEURON_MOCK_EMBEDDER='true'. This ensures rapid headless test execution (~2.5s duration) without requiring model downloads or external network access while achieving 100% test coverage across unit, boundary, integration, and real-world application scenarios.

---
id: 44146804-b923-4c4b-a4bd-0d2b473063f4
createdAt: 2026-07-31T20:19:10.420Z
importance: 3
tags:
  - adr
  - architecture
  - drift
  - ticket-03
taskId: null
---
Recorded

---
id: f23f7d38-c988-475c-88b6-ae4e7f18278c
createdAt: 2026-08-01T02:18:20.358Z
importance: 3
tags:
  - adr
  - scanner
  - architecture
  - 2.1.0
taskId: null
---
Shipped 2.1.0 with documentation corrected to match the implementation rather than delaying the release to implement web-tree-sitter. TreeSitterScanner performs line-oriented regex matching across 14 extensions; web-tree-sitter is not a dependency and no .wasm grammar is loaded, so the prior README/CONTEXT/ADR-0003 claims of 'static AST analysis' overstated the product. Chose to mark ADR 0003 Deferred, add an explicit accuracy caveat to README, SCAN_HELP and the packaged agent skill, and record a Known Limitations section in the CHANGELOG, because a stable release that overstates its parsing fidelity is worse than one that is honest about a regex scanner. Real AST parsing is tracked in .scratch/architecture-scans-2.1.0/issues/06-real-tree-sitter-ast-engine.md, which must also re-baseline the E2E drift fixtures since symbol extraction changing will move the exportChanges bucket.

---
id: 0a63263c-733d-4e1c-8cdb-20d6efa7b565
createdAt: 2026-08-01T02:48:12.169Z
importance: 5
tags:
  - adr
  - 2.2.0
  - wayfinder
  - recall
  - tree-sitter
  - architecture
taskId: null
---
Charted the neuron 2.2.0 wayfinder map at .scratch/neuron-2.2.0/ with 21 tickets across 5 release bands (rc1 tree-sitter, rc2 LLM, rc3 recall core, rc4 recall fan-out, stable). Key architectural decisions settled during the charting grilling: (1) Tree-Sitter .wasm grammars fetch at 'neuron init' and cache in the env-paths data dir rather than bundling in the tarball, because bundling 8 grammars would take the package from 621KB to ~20MB and the ONNX models already use the fetch-at-init pattern in src/commands/init.ts:28-43. (2) A missing grammar degrades to the existing regex scanner with parser fidelity labelled per-file in the blueprint card, and drift refuses to compare across mismatched fidelity rather than reporting phantom changes. (3) Recall moves from CLAUDE.md instructions to per-harness native hooks across Claude Code, Codex, Copilot CLI, Antigravity CLI and OpenCode, with an AGENTS.md fallback; MCP was rejected on the merits because MCP tools are still agent-invoked, which is the same reliability failure as an instruction, relocated. (4) Hooks own the read side so protocol step 1 is deleted on deterministic harnesses, while the agent keeps write-side steps 2-4 because deciding what is worth recording is editorial judgment a 0.5B model cannot supply. (5) The Qwen1.5-0.5B model takes three new jobs (write-side enrichment, query expansion, consolidation dedupe); recall synthesis was ruled out of scope because small-model compression fails invisibly.

---
id: 9ed8975d-a613-4f76-909a-3003ea006198
createdAt: 2026-08-01T03:36:22.085Z
importance: 3
tags:
  - adr
  - 2.2.0
  - tree-sitter
  - scanner
  - ast
  - architecture
taskId: null
---
ADR-adjacent decision from neuron 2.2.0 ticket 02 (AST symbol extraction): symbol kind is resolved from the Tree-Sitter AST node type rather than the query capture name, and a new 'exported' boolean was added to ScannedSymbol to separate a file's public surface from its internal declarations. Rationale: the shipped tags.scm capture names collapse distinct kinds (Rust struct/enum/union/type-alias all become @definition.class), so node type is the only faithful source; and feeding every discovered symbol into a component's exports array was the root cause of the noisy exportChanges bucket in 'neuron scan --diff'. Methods are deliberately never exported because a method is reached through its class, and per-language visibility rules are used elsewhere (export keyword in TS/JS, leading capital in Go, pub in Rust, leading underscore in Python). The scope necessarily grew to src/scanner/analyzer.ts, which turned out to never call TreeSitterScanner at all: it carried a duplicate ScannedSymbol interface and its own weaker regex that matched 'export function' but not 'export async function', hardcoded language 'typescript' for every file, and was the only parser the blueprint card actually consumed. That duplicate was deleted so ScannedSymbol now has one definition. Measured effect on this repo: symbol count fell 3290 to 233 (-92.9%), because 3101 of the old symbols were call sites misrecorded as methods; 106 of the 233 are public surface. Re-baselining was deliberately NOT performed despite the CLAUDE.md protocol, because doing so would absorb the shift and destroy the before/after evidence that ticket 03 (fidelity labelling and baseline migration) exists to handle.

---
id: ba8f8274-7a66-4755-b495-d956ab1ca111
createdAt: 2026-08-01T11:28:12.032Z
importance: 3
tags:
  - adr
  - 2.2.0
  - scanner
  - fidelity
  - drift
  - architecture
taskId: null
---
ADR 0009 (neuron 2.2.0 ticket 03): blueprint cards now record the parser that produced them and a diff across a parser change is refused rather than reported. Fidelity is versioned as '<parser>/<generation>' such as ast/2, because ticket 02 changed the regex fallback as well as introducing AST parsing, so two regex-derived cards from different neuron versions are also incomparable; a card with no fidelity section positively reads as regex/1 rather than unknown. The card stores a default plus only the deviating files rather than a label per component line, because the card is vector-indexed and repeating 'Parser: ast' across every line dilutes the embedding, and because a bare card-level 'mixed' label is provably insufficient (mixed-because-Go and mixed-because-Rust would compare equal while disagreeing about both languages). Refusal is all-or-nothing rather than per-file, knowingly accepting that one grammar failing to fetch refuses the entire diff and that repeated re-baselines absorb real drift. 'neuron scan --check' gained exit code 2 for incomparable, distinct from 1 for drift, since the two have different fixes. The explicit path reports the refusal and names 'neuron scan'; the implicit auto-rescan behind 'memory query' re-baselines silently because reusing the drift or missing-baseline message would state something untrue. The drift fingerprint was deliberately left parser-blind: hashing parser identity would force a full re-scan of every project on every upgrade, and the blindness it avoids lasts only until the next source edit.

---
id: 722138cd-13db-4517-bd5f-2dd485ab596b
createdAt: 2026-08-01T15:53:21.436Z
importance: 5
tags:
  - adr
  - longmemeval
  - benchmark
  - retrieval
  - ticket-22
  - rc2
taskId: null
---
Decision (2026-08-01): neuron's LongMemEval evidence is published as a retrieval-only tier and the paid end-to-end tier is parked, not abandoned. The maintainer declined to fund the Gemini judge run (~4 dollars, ~50 minutes) for now, so ticket 22 moves from Priority TOP back to normal and the map's priority override over the rc2 band is lifted; work resumes at ticket 06. The rationale is that the evidence gap which justified 22 jumping the queue is substantially closed for zero cost: a full 500-question retrieval run on vectorize-io/agent-memory-benchmark scored recall@1 83.3%, recall@5 96.2%, recall@10 98.3% with zero cross-unit leakage, which is enough to answer the person who asked, provided every published claim keeps the retrieval-only caveat attached. Unpark condition is enabling billing on the Gemini key and running 'uv run omb run --provider neuron --dataset longmemeval' from benchmarks/agent-memory-benchmark. Three findings from this run bind tickets 06-08: retrieval is measurably NOT neuron's weak link, independently confirming the PersonaMem finding that ADR 0010 relied on and validating its strict non-regression bar; temporal-reasoning is the weakest category at scale (78.8%@1, 96.2%@10, 26% of the suite) and is exactly the ground Zep/Graphiti claim; and single-session-preference is weakest overall at 66.7%@1, which is the 'remember what the user likes' case memory products are actually sold on. The retrieval runner is also the A/B instrument ADR 0010 decision 7 requires — it is deterministic, free, and would have caught the 2.1.1 FTS stopword bug as a recall drop.

---
id: 73a48c77-08c1-4a6b-952d-d9b818fc2c8f
createdAt: 2026-08-01T16:56:31.511Z
importance: 5
tags:
  - adr
  - enrichment
  - llm
  - embeddings
  - performance
taskId: null
---
Ticket 06 (write-side enrichment) design settled by grilling on 2026-08-01; spec at .scratch/write-side-enrichment/spec.md. Measured on an Apple Silicon iMac with warm disk cache: Qwen1.5-0.5B q4 costs 3205ms to load per process and ~183ms per inference, while bge-small-en-v1.5 q8 costs 177ms to load and ~4ms per embed — an 18x load gap — and the embedder is ALREADY loaded on the write path because transact() computes vectors before insert. Since every CLI invocation is its own node process with no daemon, a generation-model load is amortised over exactly one inference, making it 87% of total cost. Consequently tags moved off the LLM entirely: ADR 0010 section 4 already forbade the model from minting tags, which makes tagging a ranking problem rather than a generation one, so tags are now selected by cosine against tag CENTROIDS (the mean embedding of entries carrying that tag, computed from the existing embedding column) over a closed vocabulary of neuron.yaml-declared tags plus store tags with >=3 entries. The >=3 floor is a requirement of the centroid method rather than a tuning knob, because a singleton tag's centroid is identical to its single entry.

---
id: 41c6f487-a5f2-4fa9-bc33-7aac62432baf
createdAt: 2026-08-01T16:56:45.145Z
importance: 5
tags:
  - adr
  - enrichment
  - llm
  - benchmark
  - importance
taskId: null
---
Ticket 06 field-by-field enrichment rulings (2026-08-01 grilling), all recorded in .scratch/write-side-enrichment/spec.md. --category becomes optional on 'add' only (still required for delete/update where it selects an existing row); the model picks from neuron.yaml's declared categories with NO default, hard-erroring and naming the cause when inference is unavailable unless a literal fallback is configured via the new llm.enrichment.category key. Category cannot be deferred because it is a NOT NULL column driving storage routing, so it is the one synchronous model call — making the ~3.5s latency opt-in, since passing the flag keeps writes instant. Importance is inferred UNCLAMPED 1-5 and measured rather than constrained: a floor at the default was proposed and rejected in favour of a new E2E pillar (Importance Inference & Prune Safety) measuring discrimination on a polarized corpus, run-to-run stability, distribution spread to catch collapse-to-3, and a prune preview per threshold, with one hard assertion that no known-critical entry ever lands in the delete set at the default threshold. Two category strategies ship and are A/B'd (LLM-with-descriptions vs centroid cosine) because 'learning' and 'decisions' are semantically adjacent, which is where cosine is weakest. Content-hash caching was dropped as cargo-culted from the summarizer, whose hit rate depends on rescanning the same files; memory content is authored fresh so the hit rate approaches zero while the costs land on the interactive write path.

---
id: 9c95e12a-96b8-4318-a694-630ce06d5df1
createdAt: 2026-08-01T17:25:48.286Z
importance: 5
tags:
  - adr
  - llm
  - enrichment
taskId: null
---
Write-side enrichment (neuron 2.2.0 ticket 06) ships with the 0.5B model OFF the write path entirely, which inverts the spec's design on two of three fields. Category inference uses centroid cosine over the store's per-category embedding centroids rather than the model, because the Pillar 11 A/B measured centroid at 9/9 against the model's 1/9 on the same corpus - the spec had predicted the model would win by reading category description fields as instructions, and it did not. Importance inference is floored at the entry default (so inference can raise but never lower importance, making it structurally incapable of increasing prune eligibility) and defaults to 'off', because Pillar 10 measured its discrimination between deliberately unambiguous critical and trivial entries at -0.5 on one run and +0.167 on the next, which is noise. The spec's absolute prune-safety assertion ('no known-critical entry may ever appear in the delete set at the default threshold') was restated as a relative one because it fails identically with enrichment disabled: default entry importance and default prune threshold are both 3 and the prune is inclusive, so it measures ticket 23's pre-existing hazard rather than this feature's inference. ADR 0010 is amended on five points.

---
id: 68455ac1-ef28-495d-8547-25fd29a35d4d
createdAt: 2026-08-01T21:25:18.020Z
importance: 5
tags:
  - adr
  - pruning
  - ticket-23
  - rc2
taskId: null
---
ADR-shaped outcome of neuron 2.2.0 ticket 23 (configurable automatic pruning), resolved 2026-08-01 by grilling and split into tickets 24 and 25. Pruning is defined as a recall-quality feature for history-shaped noise only, which ruled out disk reclamation as a justification at 2.9MB/235 entries and thereby killed the soft-delete branch: a feature whose purpose is to remove entries from reads should not pay a filter tax across the 21 read sites on the memories table plus the separate memories_fts rowid copy. The mechanism is a hard DELETE with no undo and deliberately does NOT reuse ticket 08's supersession, because superseded means a newer memory replaced this one and is lineage worth keeping, whereas pruned means routine-and-old; conflating them would couple this design to one ticket 08 has not made. Configuration is per-category and opt-in with defaultImportance plus a prune block whose absence means never pruned, which makes the migration safe by construction since no existing neuron.yaml has that block, and the trigger is lazy off neuron memory query behind a last_prune_check_at 24h skip in meta following the drainEnrichmentIfPending precedent. A usage-based gate (delete what is never retrieved) was proposed and explicitly rejected by the maintainer because it punishes rarity and the rare-but-critical failure fix is exactly the entry never retrieved until it matters. The most important finding is diagnostic: ticket 06 concluded the 0.5B model cannot judge importance, but the real defect is the ask, since enricher.ts:290 demands an absolute 1-5 scalar on an underspecified concept using generic invented exemplars while ignoring the 78 human-labelled learning and decisions entries available for calibration, so ticket 24 A/Bs a recoverability binary against a rescaled prompt re-shot on real entries. Finally, the ship bar was committed before any numbers existed: pruning must beat the no-prune control rather than match it, because parity means it bought nothing it claimed, and a double null removes automatic pruning from 2.2.0 rather than shipping it disabled.

---
id: 44eca269-32ae-4f9d-a4cc-121c30b993a5
createdAt: 2026-08-01T21:59:30.196Z
importance: 3
tags:
  - rc2
  - adr
  - enrichment
taskId: "24"
---
Ticket 24 (pruning A/B) resolved 2026-08-01: automatic pruning is removed from 2.2.0 rather than shipped, deferred, or gated on a double-null Experiment 2 result, because Experiment 1 disqualified both candidate importance-judgement arms before Experiment 2 could run at all. The recoverability binary (A1) false-deleted 2 of 11 ground-truth-unrecoverable entries and the recalibrated 1-5 scale (A2) false-deleted 4 of 11, with one shared miss being a decisions-category ADR that reads like ordinary technical prose -- demonstrating that content-only judgement, even re-shot on real exemplars per ticket 23's diagnosis, cannot structurally distinguish an architectural decision record from a routine note. Per ab-test-plan.md section 3 this collapses Experiment 2 ("no safe judgement to prune with"), which is evidence at least as strong as the pre-committed double-null removal row since it is a demonstrated false-delete rather than an unproven benefit; ticket 06's importance:off default therefore stands with no ADR reversal, and ticket 25 ships only its config-schema and default-collision-fix scope per its own pre-written contingency for this outcome. Revisit conditions if pruning is reconsidered later: a materially better model, or structurally excluding the decisions category from importance inference so ADRs cannot be judged prunable by content alone.

---
id: 412cdaaa-05f4-436c-9ea4-5e13e234d2c1
createdAt: 2026-08-02T00:38:43.643Z
importance: 3
tags:
  - adr
  - enrichment
  - rc2
taskId: null
---
Argv boundary handling in the neuron CLI is deliberately asymmetric as of v2.1.2: writes refuse, reads repair. 'memory add' and 'memory update' exit non-zero and store nothing when they receive more bare positional arguments than they expect, while 'memory query' silently joins its positionals and proceeds. The rationale is that consequence should govern loudness. A truncated write is permanent, invisible and unrecoverable because the discarded words never reach the database and no later query can reveal that they used to exist, whereas a truncated read harms nothing and retrying costs nothing. This mirrors an existing precedent in the same codebase where --category is optional on 'add' but mandatory on 'delete' and 'update', justified purely by the consequence of getting it wrong. A stderr warning was rejected for the write path because agents routinely do not read stderr, which would leave the failure almost as silent as the bug it replaces; only a non-zero exit reliably stops an agent mid-flow. The accepted cost is that users must remember two rules rather than one.

---
id: fdb2921c-18fd-4765-afe4-4caf880f27f5
createdAt: 2026-08-02T00:43:52.817Z
importance: 3
tags:
  - wayfinder
  - rc2
  - adr
taskId: null
---
Maintainer decision 2026-08-01: wayfinder ticket 08 (LLM-assisted consolidation and dedupe) is ruled OUT OF SCOPE for neuron 2.2.0 and must not be implemented. This is a scope decision rather than a resolution, so it is recorded in the map's Out of scope section and not in Decisions so far. The premise was measured before the design was attempted and did not survive: pairwise cosine over all 239 entries of this project's store found exactly one genuine same-category semantic duplicate, and that one is a byte-identical repeat findable by content hash with no model involved. Widening the similarity band to catch more immediately admits semantically opposite pairs, for example 'Explained NEURON_MOCK_EMBEDDER check in exec.ts' against 'Removed NEURON_MOCK_EMBEDDER check from exec.ts' at cosine 0.9210, and 'Bumped version to 1.1.1' against 'Bumped version to 1.1.3' at 0.9436. Adjudicating those requires reliable negation detection, which is the weakest capability of both a 0.5B model and the embedder that would shortlist for it, and that is the same failure shape that disqualified both judgement arms in ticket 24. Most of the apparent duplication in the store turned out to be a different bug entirely, namely collided single-token rows produced by the argv-truncation defect fixed in v2.1.2. Ticket 22 had already measured retrieval at recall@10 of 98.3 percent, so the 'near-duplicates crowd retrieval' premise had no supporting evidence. Consequences: ticket 09 (cut rc2) is unblocked from 08 and its blocked-by list is now 05, 06, 07, 24; the rc2 release note must not claim three new LLM jobs nor describe consolidation as merging entries. ADR 0010 section 6 still governs the design if dedupe ever returns. The supersession half may return as a NEW ticket on its own merits, because the ticket 25 near-miss showed the system needs a way for a new decision to supersede a stale high-confidence entry rather than merely outrank it.

---
id: b86ab699-c989-4e59-b093-dabc9679bc7a
createdAt: 2026-08-02T12:38:35.758Z
importance: 5
tags:
  - adr
  - ticket-07
  - salvage-expansion
  - retrieval
  - rc2
  - calibration
taskId: null
---
ADR-shaped outcome of neuron 2.2.0 ticket 07 (salvage expansion for weak retrieval), ruled out of scope 2026-08-02 after calibration. The ticket's own scope step 3 pre-committed to calibrating the weakness floor against a real corpus rather than guessing it, and to treating a failure to separate as a finding that kills the trigger; that is exactly what happened. Measured against the real embedder on Pillar 7's 308-entry adversarial corpus, best top-1 cosine on queries retrieval got WRONG (mean 0.7779, max 0.9516) is HIGHER than on queries it got RIGHT (mean 0.7518, min 0.6548) — the single worst case, decoy-retry-budget with its gold at rank 4, carries the highest similarity of anything measured. Every measured failure is a confidently-wrong retrieval rather than a weak one, and rewriting a query to find more cannot fix a ranking that is confidently inverted, which is a reranking problem and a different ticket. The floor DOES cleanly separate no-answer and terse queries (nonsense+terse cap at 0.6173, every real query starts at 0.6548, so a floor near 0.63 works) which is the CLAUDE.md 'try a broader keyword' population — but that population never appears in Pillar 7, so the chosen A/B bar would have returned delta 0.0 regardless, meaning both candidate bars were inert for opposite reasons. Also corrected: ADR 0010 section 2's premise that a nonsense query's top hit still scores >= 0.75 is factually FALSE (measured 0.4375-0.5565) because a nonsense query produces no FTS hits so only one RRF term is non-zero and normRrf caps at 0.5; score actually separated the no-answer population better than raw similarity did, 0.233 versus 0.038, so the ticket's prerequisite of surfacing similarity was never implemented. Evidence and a re-runnable one-second probe live at .scratch/salvage-expansion/.

---
id: e1863f8f-8120-41a4-aec1-ccd0d523b3ac
createdAt: 2026-08-02T12:38:49.455Z
importance: 5
tags:
  - adr
  - ticket-26
  - enrichment
  - importance
  - rc2
  - qwen
taskId: null
---
Decision (2026-08-02, neuron 2.2.0): model-based importance inference is removed entirely, not merely defaulted off, and the rc2 band's stated theme is rewritten to match what was measured. Ticket 06 shipped llm.enrichment.importance defaulting to 'off' because Pillar 10 measured the 0.5B model's discrimination between deliberately unambiguous critical and trivial entries at -0.5 and +0.167 across two runs (noise, one run negatively correlated with truth), per-entry stability at 0.5, and the model rating an irreversible-production-data-loss note as 1. The maintainer judged a dead-by-default path worse than no path, since it carries documentation, config surface and maintenance cost for a measured non-signal nobody should enable; this is filed as ticket 26, which blocks the rc2 cut (09) so it lands in the same rc as the enrichment it amends. A structural wrinkle found while grilling 07 justifies it further: LocalEnrichmentModel.inferCategoryAndImportance at src/components/enricher.ts:213 calls inferImportance UNCONDITIONALLY, so the opt-in categoryStrategy 'model' path invoked importance inference regardless of the 'off' default — the guard was never as complete as it looked. The larger finding is that the rc2 band set out to expand the 0.5B model's job list and instead measured its way to zero new default-on model jobs: after tickets 05, 06, 07, 08, 23, 24 and 26, the model still has exactly the one job it had in 2.1.0, code summarization during neuron scan, because tags and category are centroid cosine over the embedder already on the write path. The map's Destination theme 2 was therefore rewritten from 'expanded use of the shipped Qwen1.5-0.5B model' to embedder-based write-side enrichment plus a measured boundary on what a 0.5B model can be trusted with, on the principle that a destination advertising a result the route disproved is how a map starts lying.

---
id: 87943675-6858-4245-9fb9-a7a330ab3ce7
createdAt: 2026-08-02T13:01:18.026Z
importance: 5
tags:
  - importance
  - enrichment
  - adr
taskId: null
---
Decision (2026-08-02, neuron 2.2.0 ticket 26): model-based importance inference is removed outright rather than left shipping 'off', and the enrichment backlog is removed with it. Rationale: a dead-by-default path costs documentation, config surface and maintenance in exchange for a signal Pillar 10 measured as noise (discrimination -0.5 then +0.167 across consecutive runs, per-entry stability 0.5, a production-data-loss note rated 1); and the opt-in categoryStrategy:'model' path called inferImportance unconditionally, so the 'off' default was never the whole guard it appeared to be. The backlog followed because importance was the only field that ever deferred. Two things were deliberately KEPT: the enriched_at column and its partial index (still an honest record of a write having been enriched; dropping a column makes rc1/rc2 databases non-downgradable), and Pillar 10 itself, re-pointed from 'Importance Inference & Prune Safety' to 'Prune Safety'. The re-pointed pillar writes half the known-critical corpus with explicit --importance 5 and previews a prune at every threshold, measuring 9 of 12 deleted at the default ceiling including 3 of 6 critical entries — every one an entry that omitted the flag — with all guarded entries surviving. That makes ticket 23's still-unfixed default-importance-3 / default-prune-ceiling-3 inclusive-comparison hazard a monitored regression test rather than a remembered fact. Config migration was verified rather than assumed: Zod strips unknown keys, so a neuron.yaml still setting llm.enrichment.importance parses cleanly and the key is ignored — no breaking change, now asserted by a unit test. Recorded in ADR 0010's 2026-08-02 amendment.

---
id: 446e1c1f-f697-459c-89a5-7dd2d7213fba
createdAt: 2026-08-02T13:24:02.844Z
importance: 5
tags:
  - adr
  - rc2
  - wayfinder
taskId: null
---
Decision (2026-08-02): neuron repositions around plain-markdown git-native agent memory as the primary differentiator, demoting architecture scanning to a supporting feature. Trigger was competitive — codebase-memory-mcp (tree-sitter + hybrid LSP, 32.7k stars) already owns the architecture-analysis niche, so neuron's defensible edge is the opposite of depth: memory as .md files a developer can open, diff, hand-edit and review in a PR. Charted as a new rc5 band (tickets 28-34) on the existing .scratch/neuron-2.2.0 map rather than a separate map, at the maintainer's direction, which redraws the 2.2.0 destination from three themes to four. Critical finding from auditing the repositioned README against the shipped CLI before charting: the README's central promise is not currently true. md-only is NOT the default (schema defaults to vector-only at src/config/neuronYaml.ts:12 and :115, and neuron init writes no neuron.yaml at all, so the Quick Start yields a SQLite DB and zero .md files); md-only has NO semantic search (queryMarkdownOnly resolves its embedder from a two-method delegate object that carries neither getEmbedder nor embedder, so every query falls to whole-string substring matching); md-only enrichment is inert (centroids read from the absent vector store, so tags are always [] and an omitted --category hard-errors 100% of the time); and neuron status reports totalCount 0 with entries on disk. The band is therefore engineering first and README last — ticket 32 is deliberately blocked by 29/30/31 so the repositioning does not ship four false claims and race to make them true. Explicit non-goals recorded as out-of-scope: no @neuron/core package or pluggable-provider SDK, no competing on architecture-analysis depth, no new top-level CLI commands.

---
id: 62631d0b-ba6a-46da-b36d-2cc3738829aa
createdAt: 2026-08-02T13:37:08.872Z
importance: 5
tags:
  - adr
  - rc2
  - enrichment
taskId: null
---
Decision (2026-08-02): neuron's markdown-first positioning is sharpened from 'memory as plain markdown files' to 'an agent using the CLI cannot write a malformed memory entry' — a deterministic, schema-enforced writer whose required frontmatter fields are declared per-category in neuron.yaml. Rationale: 'memory as markdown files' is not defensible because telling an agent to append to a .md file is a prompt rather than a product; the guarantee is defensible because a guarantee needs an enforcement point, and that enforcement point is the reason to route writes through the CLI instead of shell redirection. It also makes the CLI load-bearing in md-only while semantic search there is still missing, and it is a governance claim rather than a capability claim, which makes it orthogonal to codebase-memory-mcp's analysis depth instead of competing with it. Three design constraints recorded: (1) the word deterministic must be scoped to SHAPE determinism (entries conform to the declared schema) and BYTE determinism (stable serialisation, no diff noise) but never VALUE determinism, because centroid-based tag and category inference depends on store state which grows, so the same memory add command produces different tags months apart; (2) frontmatter fields fall into three tiers — structural (id, createdAt) which can never be optional, semantic-reserved (importance, tags, scope, taskId) which neuron reads for behaviour such as prune reading importance, and user-defined (ticket, reviewedBy) which are opaque but validated, and the third tier is where the product value is; (3) the required-but-missing policy must reuse ticket 06's settled shape for --category — hard-error naming the cause unless a literal fallback is configured — rather than inventing a second policy. Charted as tickets 35 (round-trip integrity, task, unblocked) and 36 (configurable schema, grilling, blocked by 35), and the map destination now reads 'deterministic, schema-enforced plain-markdown memory'.

---
id: f099de73-91df-4f08-82ff-3ae39e0cda8b
createdAt: 2026-08-02T13:48:39.277Z
importance: 4
tags:
  - config
  - memory
  - adr
taskId: null
---
Decision (2026-08-02, neuron ticket 36): a frontmatter field declared in neuron.yaml becomes a first-class CLI flag, rather than being passed through a generic --field key=value escape hatch. Declaring 'ticket' on the decisions category makes 'neuron memory add --category decisions --ticket NEU-42 ...' valid. The maintainer's rationale is that config extends the CLI's own argument surface, and the decisive property for an agent-facing tool is that 'neuron memory add --help' then becomes self-documenting for that project's schema — an agent reading --help learns what the project requires without the schema being restated in CLAUDE.md or AGENTS.md, where it would drift. This is the same 'instructions drift, mechanisms do not' argument that drove rc3's move from CLAUDE.md instructions to harness-native hooks. Implications the grilling must resolve: KNOWN_FLAGS at src/commands/utils.ts:68 is currently a hardcoded array and must become config-derived while keeping its edit-distance did-you-mean suggester, which exists because a typo'd --importanc 5 was previously discarded silently and wrote the default instead; the static HELP constants in utils.ts must become per-project dynamic; a collision rule is needed against reserved flags (--category, --tags, --importance, --scope, --task-id, --limit, --file, --format, --json) and should refuse the config at load time rather than shadowing at write time; and it must be decided whether validation runs at parse time or write time, since those differ for non-CLI writers such as neuron scan and the deprecated learn/history aliases.

---
id: 3f3ad7d4-5aa5-435b-a5e8-97caa7a1b5ee
createdAt: 2026-08-02T14:02:47.156Z
importance: 5
tags:
  - drift
  - architecture
  - adr
taskId: null
---
Decision (2026-08-02, neuron ticket 37): neuron scan is reframed under the same determinism claim as the memory store — 'a deterministic way to get your architecture into a markdown file that stays up to date' — replacing the apologetic 'lightweight, not as deep as purpose-built tools' framing in the repositioned README draft. This makes the product one idea (deterministic markdown artifacts your agent maintains and you review) rather than a memory pitch with a scanner bolted beside it, and it converts the competitive position against codebase-memory-mcp from depth-versus-depth to depth-versus-artifact: they analyse, neuron produces a reviewable file a git diff can gate on. Measurement supporting the reframe: two consecutive 'neuron scan --dry-run' runs on this repo produced a 228-line card that was byte-identical except for one line, the wall-clock 'mtime' in the frontmatter. synthesizeArchitecture in src/components/summarizer.ts is a pure template — the overview is a format string, allDependencies is sorted before rendering, and despite the SmolLM2Summarizer class name the architecture path makes no model call — so everything describing the code is already deterministic. Two blockers ticketed as 37: (1) the per-run mtime dirties the card on every scan, so a git diff shows a change whether or not the architecture moved, which is fatal for a feature pitched on PR review; (2) there is no stable card identity — four blueprint cards exist in this repo's decisions category and ingestScanResults resolves 'the' card by semantic query plus .find(), while SCAN_HELP promises update-in-place. The second was previously map fog and the repositioning made it disqualifying, because you cannot deterministically keep a file up to date if you cannot deterministically say which file it is.

---
id: 0eb7429d-0757-4a42-9fed-887b66f893e9
createdAt: 2026-08-02T18:54:49.843Z
importance: 5
tags:
  - md-storage
  - rc2
  - adr
taskId: null
---
Decision (2026-08-02, neuron ticket 28, ADR 0011): md-only storage mode is deleted rather than repaired, dual is renamed md, and markdown becomes the store of record with SQLite demoted to a rebuildable index. The framing question in ticket 28 was wrong: md-only tried to reach markdown-first storage by removing SQLite (setting this.db = null at src/index.ts:100), while dual already reached it by demoting SQLite, and every defect catalogued in the ticket (substring-only search, tags always empty, omitted --category hard-erroring, neuron status reporting totalCount 0) traces to that one line, so keeping the database and demoting it makes them all vanish instead of needing repair. Retrieval parity is therefore achieved by construction because dual query() falls through to vectorDb.query() at dualStorageRouter.ts:211, the same hybrid RRF path as vector-only, which means the README owes no honest caveat and roughly 80 lines of queryMarkdownOnly substring matching plus the unwired mdEmbedCache are deleted. Scope is removed entirely (field, is_manual_scope, query_logs, learning_query_matches, autoPromote loop) because it was the only reason the vector-store-is-a-cache claim was false, and it measured as dead: 1 distinct value across 264 entries, 0 manual-scope rows, 0 promotion matches ever recorded, and 1.36 MB of a 3.1 MB database spent on query_logs feeding a loop with exactly one reader. Reconcile is a strict mirror with markdown written first and absence meaning deletion, git as the recovery story, per-entry content hashing (0.006 ms to detect across the store, 2.39 ms to repair one entry versus 630 ms for its category), with one exception: a bootstrap seed exporting vector to markdown on first md run recorded by meta.md_seeded_at, without which not-seeded-yet and human-deleted-everything are the same observable state, which on this repo is the difference between exporting 264 entries and destroying 249. Hand-edits repair the incomplete and refuse the ambiguous. Ships in 2.2.0 with md-only, dual, --scope and --scopes aliased and warning rather than removed, because unknownFlag() hard-exits 1.

---
id: eda30406-f51d-4f87-b0cb-b4985ef19d28
createdAt: 2026-08-02T21:42:11.573Z
importance: 5
tags:
  - md-storage
  - rc2
  - adr
taskId: null
---
Resolved neuron 2.2.0 ticket 29 (The Markdown<->Vector Reconcile Engine), test-first and AFK via /wayfinder + /tdd. Ticket 28 rewrote this ticket from 'build semantic search for md-only' to 'build the mechanism that makes markdown authoritative,' since md-only itself was deleted. Delivered: md-only removed and dual renamed md in StorageModeEnum (neuronYaml.ts), both old spellings now alias to md with a stderr warning at config-parse time so upgrading a neuron.yaml never hard-fails; NeuronMemory no longer sets this.db = null for any mode, since every mode keeps the database as a rebuildable index now. Write ordering flipped in DualStorageRouter: markdown writes first, and the vector embed on upsert is only attempted once that succeeds; a vector-side failure now surfaces as a stderr warning instead of a swallowed bare catch{}, and the next reconcile pass repairs it. Added a private reconcile() method invoked at the top of transact()/query() for md and split modes, gated on a new meta.md_seeded_at flag read/written through new NeuronMemory.getMeta/setMeta methods: unseeded stores bootstrap-export vector to markdown once (a no-op on a fresh project, so the marker gates on presence rather than data, avoiding the ambiguity between 'not seeded yet' and 'a human deleted everything'); seeded stores diff markdown against the vector index per-entry via the content hash already exported from mdVectorSync.ts (computeMemoryHash, reused rather than reimplemented), re-embedding only changed-or-missing entries with markdown always winning, and deleting vector entries absent from markdown with no tripwire, matching ADR 0011's strict-mirror design. Measured reconcile latency on a 264-entry store: about 6.5ms steady state and 7ms with exactly one changed entry, recorded in the ticket for ticket 32's README work. The split-mode query dispatch no-op flagged in the ticket was fixed by elimination rather than patched: once md-only's substring matcher was deleted, the mdCats/vecCats branch had no remaining behavioral difference, so query() now delegates unconditionally to the hybrid vector query after reconciling. Per-category storage vocabulary got the identical dual-to-md rename as the top-level modes. Two pre-existing tests encoding the old model, where a vector-only orphan left by an out-of-band markdown deletion persisted until a later update or delete happened to salvage it, were rewritten, since strict-mirror reconcile now purges that orphan automatically on the very next command and not_found on it afterward is correct behavior, not a regression. Full suite green at 303 tests; the one intermittent failure seen mid-session in concurrency-stress.test.ts Pillar 8 (three different symptoms across three isolated reruns: a stale-table read, a contention-ratio miss, and a duplicate-column migration race) is a pre-existing multi-process migration race in code this ticket never touched, confirmed present on the unmodified baseline before any change this session, and passed clean on the final full run.

---
id: 934313dc-cad2-4526-96b1-e74746c92893
createdAt: 2026-08-03T01:42:40.308Z
importance: 4
tags:
  - release
  - wayfinder
  - 2.2.0
taskId: null
---
Decision (2026-08-02, neuron ticket 09): v2.2.0-rc2 is cut and published under the rc git tag, but not to npm — that publish step is deliberately left to the maintainer, matching v2.2.0-rc1's precedent (npm publish is irreversible and this session has no credentials worth risking on it). The release is tagged directly on feat/2.2.0-tree-sitter-grammars, not merged to main, because that is where v2.2.0-rc1 was also tagged and main tracks a separate 2.1.x hardening line that has diverged from 2.2.0 development entirely (main's head commit does not appear anywhere in this branch's history). A related decision made mid-ticket: this rc2 build also documents rc5's scope-removal and frontmatter-roundtrip fixes (tickets 35 and 38) in its CHANGELOG, even though those were nominally a later band, because there is no per-band branch in this workflow and whatever code is on trunk when an rc tag is cut is what that tag actually ships — describing it as still Unreleased would have been a documentation fiction. Consequence recorded for the future rc3/rc4/rc5 cut tickets (15, 20, 34): each should audit what is actually new on trunk since the previous cut, not assume their nominal ticket band maps to what they need to document, since bands are being resolved out of order relative to when their release is cut.

---
id: 469e96d4-8634-4ace-9060-5debc9a38cda
createdAt: 2026-08-03T11:37:09.582Z
importance: 5
tags:
  - wayfinder
  - rc2
  - 2.2.0
taskId: null
---
Decision (2026-08-03, ticket 11 grilling): neuron's harness recall adapter layer is scoped to what neuron can honestly describe, not to what each harness can technically do. Tickets 17 (Antigravity CLI) and 18 (OpenCode) are ruled OUT OF SCOPE for 2.2.0 despite having the most general and the richest injection mechanisms of the six harnesses researched, because neither documents failure, timeout, payload limit or verification anywhere reachable — and ticket 11 settled that capability is a per-point map the CODE READS, so shipping them would mean publishing a capability record with no source, which is the abstraction lying that ticket 11 exists to prevent. rc3 ships the two deterministic adapters (Claude Code, Codex CLI) plus an instruction-only fallback that now serves only UNLISTED harnesses, because ticket 10 found all six researched harnesses have a real injection mechanism and the instruction-only tier came back empty. rc4 ships the two DOCUMENTED best-effort adapters, Copilot CLI (16) and the new Cursor ticket (40), which was researched at the maintainer's request but had never been ticketed. Six further design points settled: capability is a lifecyclePoint-to-supportRecord map with 'unknown' as a first-class value distinct from 'no' and the deterministic/best-effort label DERIVED for display never stored; pre-prompt injection is deduplicated by a session-scoped ledger so a 50-turn session does not re-inject the same entries 50 times; a third execution-only lifecycle point 'context-reset' clears that ledger on compaction, exploiting the asymmetry that clearing a ledger is a side effect not an injection so harnesses whose compaction hooks ignore stdout can still serve it, with a turn-count TTL fallback so the degraded path fails toward repetition rather than silence; neuron enforces its own CHARACTER ceiling strictly below the smallest harness cap and never relies on spill-to-file, because spill converts deterministic recall back into agent-invoked recall exactly when the payload is largest; neuron init PROMPTS for the hook target (user-global / project-committed / project-local) rather than choosing, because committing a hook to .claude/settings.json makes a teammate's harness execute a binary they never installed; and neuron ASKS before overwriting an existing hook entry rather than classifying it.

---
id: 4c4b6589-793c-428e-9568-82e0374ce766
createdAt: 2026-08-03T12:15:18.874Z
importance: 5
tags:
  - retrieval
  - adr
  - enrichment
taskId: null
---
Neuron 2.2.0 ticket 27 resolved 2026-08-03: the relevance gate's problem is the QUANTITY it reads, not the threshold, and the fix is a two-leg conjunction (ADR 0012). Two independent defects were found in the fused score. First, score = 0.75*normRrf + 0.25*normImp blends relevance with importance badly enough to be a ranking defect on every query, not just a gate defect: measured live on this repo's 274-entry store, the 'ls' query's entry ranked 1st by raw cosine (cos 0.5487, importance 3, score 0.500) is displaced in the presented order by the entry ranked 3rd (cos 0.5268, importance 5, score 0.613), so importance is stripped from score entirely — and NOT demoted to a tie-break, because semanticRank and ftsRank are assigned uniquely per row (src/index.ts:481-483) so rrfScore ties are measure-zero and no tie-break job exists. Second and unanticipated, decontamination alone does not produce a gateable number: normRrf is bimodal, exactly 0.5000 when the FTS leg matches nothing and ~0.97-1.0 when it matches anything, so normRrf > 0.5 is algebraically identical to 'the top hit has at least one FTS match' — a topicality predicate, not a relevance score. Hence the conjunction of a lexical leg and a raw-cosine floor, which is load-bearing in both directions because the legs fail on disjoint sets: 'pytorch training loop' (cos 0.6143) and 'how do I deploy to kubernetes' (cos 0.6074) both score ABOVE the lowest genuinely-relevant query 'how does prune work' (cos 0.6072) so no cosine floor rejects them without a false silence, while 'make me a sandwich' rides a single stray "make"* prefix hit to normRrf 0.9692 so no lexical predicate rejects it. Conditioning cosine on the lexical leg also roughly doubles its usable margin, from 0.064 unconditioned to 0.123. Also decided: zero results is a legitimate output announced with the rejected-candidate count (silence would conflate 'consulted and found nothing' with 'did not run'); the gate moves into the retrieval layer and runs on BOTH neuron exec and neuron memory query rather than a split posture; importance survives as a prune-only field because removing it would reverse ticket 25's deferral by the back door and delete the only guard against ticket 23's live hazard; and minScore is left untouched and still inert (within the top-5 window normRrf runs 0.5000/0.4919/0.4841/0.4766/0.4692, all above 0.35), with the whole config surface deferred to ticket 39 so it is settled once alongside the number.

---
id: ac78552f-ab57-4700-ba02-9bec15e92d26
createdAt: 2026-08-03T12:39:21.864Z
importance: 5
tags:
  - adr
  - failure-fix
  - md-storage
taskId: null
---
Decision (2026-08-03, neuron ticket 31): storage.mode now defaults to 'md' and 'neuron init' writes the neuron.yaml that declares it, with four rulings attached. (1) init NEVER touches an existing config — not to add missing keys, not to merge — and detection reuses findNeuronYaml so an ancestor directory's config counts as present, because init is re-run routinely to refresh skills/models/grammars and anything it edits it would edit again over the user's hand-tuning, while writing a second file would silently shadow the first. (2) The GENERATED template (NEURON_YAML_TEMPLATE in src/config/scaffold.ts) is the contract, not the README example: the README draft predates ticket 28, still says mode 'md-only' which no longer exists, and omits the 'architecture' category that scan.category defaults to. A generated file executes; a README example is prose. Ticket 32 must publish the template rather than re-draft it. (3) The template turns on nothing the schema defaults leave off — scan.enabled stays false — so generating the file changes what a project SAYS, not what it does; an init that quietly started scanning would be a behaviour change disguised as a convenience. (4) DualStorageRouter's invalid-mode fallback deliberately stays 'vector-only' and is NOT a duplicate of the schema default: it fires only for a mode string that bypassed Zod, and md runs a strict mirror that deletes, so guessing md on an unparseable config would convert 'unrecognised setting' into data loss. The safe failure direction is the read-only mode.

---
id: 711ab646-ac03-4f3d-aba6-de0a0b967237
createdAt: 2026-08-03T12:39:33.163Z
importance: 5
tags:
  - adr
  - failure-fix
  - enrichment
taskId: null
---
Data-loss bug found and fixed in neuron ticket 31 (2026-08-03), worth remembering as a SHAPE rather than a one-off: a partial one-time migration is worse than no migration, because it sets the marker that says migration already happened. DualStorageRouter.bootstrapSeed exported only the categories declared in neuron.yaml and then wrote meta.md_seeded_at. Nothing in neuron validates --category against the config, so a store routinely holds UNDECLARED categories — neuron scan writes into 'architecture', which scan.category defaults to but no config template is required to declare. Those entries never reached markdown, which looked harmless because the strict mirror never visits an undeclared category either, right up until someone declares it: the mirror then visits a category whose markdown was never written, finds index rows markdown does not have, and deletes them, exactly as designed, on the data the seed skipped. Measured on the CLI before the fix on the vector-only to md to declare-the-category sequence: 1 of 2 entries destroyed, silently. Ticket 31 owns this rather than ticket 29 because before md became the default nobody reached that mode without asking for it. Fix: the seed takes the UNION of requested and stored categories via a new public NeuronMemory.listStoredCategories(); steady-state reconcile still runs on the declared set only, since that is a per-command cost and an undeclared category is inert there. The residual asymmetry — a hand-edit to an undeclared category's .md file is still never mirrored — is recorded as fog on the 2.2.0 map, because the sharp question is one level up: should --category be validated against the config at all.

---
id: dff93b46-cf14-993a-2067-2b9e994527b3
createdAt: 2026-08-03T17:07:17.277Z
importance: 5
tags:
  - architecture
  - topology
  - scan
  - deep
taskId: null
---
# 🏛️ Repository Architectural Blueprint: harness-idempotent-test

## 🚀 System Purpose & Tech Stack
harness-idempotent-test is a TypeScript software system structured into 0 primary architectural modules.

## 🔬 Parser Fidelity
Default: `ast/2`

## 🧾 Dependency Contract
_No declared dependencies._

## 🔗 Subsystem Dependency Map
```text
harness-idempotent-test

```

## 📦 Primary Subsystems & Module Boundaries

---
id: fe17bb3e-e195-4489-9048-3e5bf5f978a5
createdAt: 2026-08-03T17:13:33.623Z
importance: 5
tags:
  - drift
  - adr
  - rc2
taskId: null
---
Ticket 37 (Architecture Card as a Deterministic Artifact): the blueprint card's identity is now a derived id, not a lookup. ingestScanResults computes id = sha256('neuron:architecture-blueprint:' + category) formatted as a UUID-shaped string, and passes it directly to the upsert mutation — no memory.query() call at all. This was chosen over keeping any form of similarity search because the ticket's own diagnosis (surfaced by 6 real accumulated duplicates in this repo's decisions category) was that ANY ranked/similarity-based lookup is structurally the wrong tool for 'is this the same singleton card': a stable identity has to be computed, not searched for, the same lesson ticket 27 reached for minScore. The card's embedded nested '---category/title/tags/mtime---' frontmatter block (redundant with the H1 heading and the real storage-level tags) was deleted rather than patched, since it both caused the only remaining byte-instability (mtime) and, independently, corrupted MdStorageAdapter's whole-category-file parser whenever the card shared a file with other entries. Reconciliation of this repo's own 6 pre-existing duplicate cards (4 with content, 2 empty) was: delete all 6 and let a fresh 'neuron scan' recreate exactly one canonical card under the new scheme, rather than migrating old ids forward, since 2 of the 6 were already corrupt artifacts and none were meant to be addressable individually.

---
id: e7851f44-9fb8-4055-baaa-e446070a9633
createdAt: 2026-08-03T19:29:55.808Z
importance: 5
tags:
  - adr
  - enrichment
  - rc2
taskId: null
---
Decision (2026-08-03, neuron ticket 36, ADR 0013): configurable per-category frontmatter schema resolved by grilling. 'Deterministic' is scoped to shape+byte determinism by default, with an opt-in strict mode (disables tag and category inference) for teams that also want value determinism. Three field tiers stand: structural (id, createdAt, never optional), semantic-reserved (importance, tags, taskId -- scope dropped, dead per ticket 38), and user-defined (opaque, validated, where the product value is). Type system floor is string and enum only, no number/date. Required-but-missing reuses ticket 06's --category precedent exactly: hard-error naming the field and category unless a neuron.yaml default: is configured, no second policy. Config-declared fields become CLI flags (maintainer-decided 2026-08-02); enforcement lives in transact(), the one choke point shared by parseFlags and scanner/ingest.ts's direct writes, so neuron scan's architecture card is subject to its category's schema too, and neuron.yaml load now refuses a scan.category that declares a required field with no default. Pre-existing entries against a newly-declared schema are read and reported, never refused on read -- a missing free-text value has no safe synthesizable default and isn't ambiguous, it's just absent; violations surface via neuron status --check/--repair (folded validation tooling, not a new neuron doctor command). Repair applies configured defaults and offers centroid inference for enum fields only, and deliberately never fabricates a value for a free-text identity field like reviewedBy or ticket, since this exact failure shape (model/embedder inventing an ungrounded fact) was already measured and rejected three times across tickets 06, 08 and 35. vector-only mode gets identical enforcement via an additive-only SQLite auto-migration on the memories table (ALTER TABLE ADD COLUMN, never DROP) rather than being mode-gated out. Implementation graduated as tickets 43 (schema+CLI flags), 44 (SQLite migration), 45 (strict mode + neuron-memory skill docs), 46 (status --check/--repair); ticket 34 (cut rc5) and ticket 32 (repositioned README) now block on these instead of the resolved grilling ticket.

---
id: 1ce9b590-f710-4d91-ac44-52bd63620f99
createdAt: 2026-08-03T21:19:31.872Z
importance: 5
tags:
  - retrieval
  - rc2
  - benchmark
taskId: "39"
---
Ticket 39 (Relevance Floor Validation) resolved 2026-08-03: no cosine floor ships in neuron 2.2.0. Full LongMemEval-S run — 500 questions, 23,867 documents, zero LLM calls, chosen specifically because it is not this project's own prose — measured against the pre-committed bar from ADR 0012/ticket 27 (zero recall regression at @1/@5/@10, measurable volume reduction, 0% false silence, all three required). Swept absolute cosine floors 0.50 to 0.70 in 0.02 steps, conditioned on the lexical leg (normRrf > 0.5, ticket 41's predicate). Every floor failed: even the gentlest, 0.50, already regressed recall by 3.3%/4.0%/4.2% at @1/@5/@10 (20 false-silence instances, i.e. queries where gold was in the top-10 and the floor discarded it) for only a 4.4% volume reduction, and the frontier only worsened from there (0.60 regressed 27.1%/35.3%/37.0%). Run 3 explains the mechanism: on-topic top-1 cosine (median 0.627, p10 0.520, p90 0.742) and negative-control top-1 cosine (median 0.533, p10 0.464, p90 0.618) overlap substantially on real conversational text — a materially thinner separation than ticket 27's own conditioned margin on this project's dense technical prose (0.123) — so conversational text is the harder corpus for a cosine floor, the opposite of what the pilot's hedge worried about. The other open risk resolved cleanly: the lexical leg's false-silence rate measured 0 of 500 overall and 0 in every one of the six question-type categories individually, including multi-session (n=133) and temporal-reasoning (n=133), closing ADR 0012 Consequence 6 — the lexical leg ships in ticket 41 as a hard conjunct with no demotion needed. A real blocker was found and fixed before any measurement could be trusted: ticket 38's removal of the scope column (already on trunk) had silently broken this benchmark's per-question isolation, since MemoryQuery/MemoryMutation never had scopes filtering and scope/scopes became silent no-ops — every query would have searched all 23,867 documents instead of its own question's partition. Fixed by isolating on category instead in benchmarks/longmemeval/neuron_bridge.mjs (and its deployed copy), and control-arm recall reproduced the published baseline after the fix (@1 83.5%, @5 96.2%, @10 98.3%, 0 cross-unit leaks). Also added similarity and ftsMatched as new optional fields on every Memory result (src/index.ts, src/models/memory.ts) since ticket 41 has not shipped and the fused score hides both legs of the gate — there was no other way to read raw cosine or FTS-match state from outside. Config surface landed with the number in hand, per ticket 27 section 8's deferral: minScore on pullRules.default and pullRules.onExec[] is now formally deprecated (still parses, no hard fail, emits a one-time stderr warning naming ADR 0012); no cosineFloor config key was added since there is no validated number to default it to, which is the same call ticket 26 already made once for model-based importance inference rather than shipping an inert path; a new relevance.gate.enabled boolean (default true) is the switch for ticket 41's lexical-only gate. This unblocks ticket 11 point 4: the payload budget's relevance floor is settled as none, and the character ceiling remains the sole volume control. Full frontier, per-category breakdown and raw JSON at benchmarks/agent-memory-benchmark/outputs/relevance_gate_longmemeval.json, produced by the new benchmarks/longmemeval/relevance_gate_eval.py. ADR 0012 amended in place with the full result rather than a new ADR file, matching this project's established amendment convention.

---
id: 57e7bd65-4e04-4b8f-97d5-8be6c4fc35b6
createdAt: 2026-08-04T01:31:50.113Z
importance: 5
tags:
  - wayfinder
  - rc2
  - 2.2.0
taskId: "11"
---
Resolved ticket 11 (Recall Adapter Architecture) point 6, multi-harness resolution, closing the ticket after seven of eight points were already settled 2026-08-03 pending only this one. Grilled with the maintainer: neuron init wires hooks into EVERY detected harness rather than prompting to pick one, matching the existing detectHarnesses precedent in src/config/harness.ts:15-19 which already filters to all matches (not first-match) for skill-copying today. Four sub-decisions follow: the instruction-only AGENTS.md fallback layers in only when no deterministic/best-effort harness matched at all, never alongside a deterministic hook, because writing it unconditionally would restate protocol step 1 on a harness where the settled protocol split already deletes that step; the hook-target consent prompt (user-global/project-committed/project-local) is asked once per init run and applied to every harness being wired, not re-asked per harness, since it reflects toolchain-wide intent rather than a per-harness preference; the overwrite-ask from point 8 still fires per hook file since that is a fact about disk state, not a reusable preference; and a new --harness allowlist flag (e.g. --harness claude,codex) narrows wiring to a subset of already-detected harnesses only, unable to force-wire an undetected one since that is a different feature (harness bootstrapping). Wrote ADR 0014 to hold the full eight-point decision record since the ticket's own deliverables listed an ADR that had never actually been created despite six points being settled a session earlier; every other architecture-level ticket on this map (01, 03, 05, 27, 28, 36) already has a matching ADR, so this closes that gap rather than leaving a stub. Ticket 11 is now fully resolved, unblocking ticket 12 (Claude Code adapter) and ticket 13 (Codex adapter), whose own verification step already anticipated this exact multi-harness rule and needs no further edits.

---
id: 9c3d9339-2364-4f81-99c7-3d314ac52a67
createdAt: 2026-08-04T01:51:30.298Z
importance: 4
tags:
  - adr
  - db
taskId: null
---
Use SQLite WAL mode for concurrency

---
id: 93a85d89-aea6-496e-b1be-d0e70181055f
createdAt: 2026-08-04T01:58:50.367Z
importance: 5
tags:
  - 2.2.0
  - wayfinder
  - rc2
taskId: null
---
Ticket 12 (Claude Code Adapter) shipped the reference implementation of ADR 0014's recall adapter interface as a new src/harnesses/ module. types.ts codes the lifecyclePoint->supportRecord capability map with 'unknown' as a first-class value and deriveFidelity() as a pure display-only projection, matching ADR 0014 section 2 exactly. payload.ts implements the character-ceiling-only budget from ADR 0014 section 4 (SESSION_START_CHAR_BUDGET=6000, PRE_PROMPT_CHAR_BUDGET=1500, both chosen below Claude Code's documented 10,000-char cap and a conservative reading of Codex's ~2,500-token cap since the module is explicitly shared with ticket 13), dropping whole entries and bin-packing smaller ones behind a miss rather than stopping at the first one that doesn't fit. ledger.ts and hookState.ts implement the session-scoped delta dedup ledger (ADR 0014 section 3) and the firing-evidence file verify() reads, both stored under env-paths' cache dir rather than .neuron/ since they are ephemeral runtime state, not memory content, per ADR 0011. The install/uninstall design in claudeCode.ts resolves ADR 0014 section 7's 'does not classify, it asks' rule concretely: neuron only ever reads or mutates a matcher-group it created itself (single hook entry, its own command signature), so a user's own hooks sharing the same event array are structurally untouchable rather than merely conventionally respected. verify() reports registration by reading settings.json and firing evidence from a state file the hook writes on every invocation before doing any work that could fail -- manufactured evidence, since no harness researched in ticket 10 documents an external way to confirm a hook actually fired.

---
id: 42af1aa9-6eb2-47bd-bb05-81984f1363a5
createdAt: 2026-08-04T02:13:10.265Z
importance: 4
tags:
  - adr
  - db
taskId: null
---
Use SQLite WAL mode for concurrency

---
id: 8531a5fb-0ab8-4625-a676-c4091d9bce31
createdAt: 2026-08-04T02:16:00.290Z
importance: 4
tags:
  - 2.2.0
  - rc2
  - wayfinder
taskId: null
---
Codex CLI's hook mechanism is documented at learn.chatgpt.com/docs/hooks (the developers.openai.com/codex/hooks redirect target) as functionally identical to Claude Code's for neuron's recall purposes: same event names (SessionStart, UserPromptSubmit, PreCompact), same stdin fields (session_id present on every event, prompt on UserPromptSubmit), and the same hookSpecificOutput.additionalContext stdout envelope. This was verified live during ticket 13 (Codex Adapter) rather than assumed from ticket 10's lower-confidence research, and it means neuron's hook entrypoint (src/commands/hook.ts) requires no per-harness branching for stdin parsing, querying, payload budgeting, ledger dedup, or output emission -- the harness-specific code is confined entirely to each adapter's install/uninstall/verify (reading and writing that harness's own config file). Two Codex-specific adapter decisions were made where the docs didn't fully specify behavior: the hooks.json schema uses a single command string rather than Claude Code's command+args array split, and Codex documents no third gitignored project-local config scope distinct from its single project-committed .codex/hooks.json, so neuron's 'project-local' target collapses into the same file as 'project-committed' there, with a one-time stderr warning explaining the collapse rather than silently losing the distinction. Neither decision required revising ADR 0014's HarnessAdapter interface, since both are internal to the Codex adapter and the interface's actual contract (capability truthfulness, install/uninstall/verify semantics) never depended on either detail.

---
id: 68745bef-77e0-4d1b-8439-6805a4b69fb7
createdAt: 2026-08-04T02:52:00.886Z
importance: 4
tags:
  - adr
  - db
taskId: null
---
Use SQLite WAL mode for concurrency

---
id: 25959b56-2e3b-43f3-b490-b0600e7f81e6
createdAt: 2026-08-04T02:53:40.686Z
importance: 4
tags:
  - adr
  - db
taskId: null
---
Use SQLite WAL mode for concurrency

---
id: eda63726-7ef2-4416-a71e-06cf1226d1e8
createdAt: 2026-08-04T12:32:43.803Z
importance: 4
tags:
  - md-storage
  - adr
  - rc2
taskId: "43"
---
Ticket 43 (declarable category field schema, ADR 0013) implementation decisions not spelled out in the ADR itself. Update is a partial patch for declared fields, matching --tags/--importance/--task-id: required-but-missing and default-filling only apply to upsert/create, never to update, so an update that touches one field never re-demands or silently overwrites another declared field on the same entry — MdStorageAdapter.updateEntry merges per-key (spread current.fields with entry.fields) rather than replacing the whole fields object, while writeEntry (upsert/replace) takes the fully-resolved set as-is, matching the existing tags/taskId asymmetry between the two write paths. Persistence is scoped to markdown only in this ticket: SQLite column storage for vector-only/split categories is ticket 44's job, so NeuronMemory.transact() validates and resolves field values unconditionally (the CLI guarantee holds regardless of storage mode) but emits a stderr warning rather than throwing when the resolved category cannot yet persist them (storage.mode vector-only, or split with that category's storage: vector) — silently accepting would be a guarantee-in-name-only, and throwing would make declaring fields incompatible with vector-only projects entirely. On read, MdStorageAdapter.parseMarkdownDetailed hoists every non-reserved frontmatter key into Memory.fields generically, without checking it against neuron.yaml — schema enforcement is a write-time concern living solely in transact(), so a hand-edited or not-yet-declared frontmatter key round-trips today and surfaces as a compliance report only once ticket 46 (status --check/--repair) ships.

---
id: d8d6dc8b-7821-4d95-983b-0134d74bf13c
createdAt: 2026-08-04T13:08:04.968Z
importance: 4
tags:
  - retrieval
  - rc2
  - longmemeval
taskId: null
---
ADR 0012 ticket 41 (Decontaminate the Ranking Score and Land the Lexical Gate) implemented and resolved 2026-08-04, no deviation from the six structural decisions: score in src/index.ts's queryVector is now normRrf alone (the normImp blend term is deleted), importance stays a prune-only field. A new NeuronMemory.queryGated() method is the single retrieval choke point: it filters results to ftsMatched === true (proven algebraically identical to normRrf > 0.5) and returns a rejected count; query() is now a thin wrapper around it, so neuron exec, neuron memory query, the recall hooks in commands/hook.ts, and the legacy queryLearnings/queryHistory wrappers all inherit the gate for free rather than needing separate wiring. exec.ts lost its own matched.filter(score >= minScore) line entirely and now prints a zero-result/rejected-count stderr line; memory.ts's query subcommand adds a rejected JSON field. resolveExecCategories in src/config/neuronYaml.ts now merges onExec limit/minScore as last-match-wins (plain overwrite per matching rule in array order) instead of Math.max/Math.min, and this repo's own neuron.yaml had its two onExec limit values swapped (catch-all .* to 8, the npm-test/git-commit override to 5) so the override's tighter intent actually takes effect. Beyond the ticket's own written scope, ADR 0012's ticket-39 amendment had assigned neuron status visibility for rejection counts to this ticket, so getStatus() gained relevance.gateEnabled and a cumulative relevance.rejectedTotal counter using the same meta-table increment-on-conflict pattern as the existing enrichment degradation counters. Six pre-existing unit tests in src/index.test.ts encoded the removed importance-blend or a pre-gate assumption and were rewritten to the new invariants; full suite is 432/436 green, with the 4 failures being ticket 42's pre-existing real-store test-pollution gap (confirmed unrelated by reproducing identically on the unmodified working tree and by passing when run outside full-suite concurrency). One notable finding recorded in the ticket's Answer: re-running the acceptance criteria's live-store verification (neuron exec -- ls, and ticket 27's original 15 probes) against the current store no longer reproduces the original reject counts, because the store has since absorbed its own decisions/history entries about tickets 27/28/39 which quote ls/kubernetes/pytorch verbatim as illustrative examples, so those queries now get real, correct FTS matches against the project's own writeup of itself -- this is ADR 0012's own 'denser on neuron's internals than any user's store' caveat made concrete, not a defect, and the underlying mechanism was instead verified via controlled-content unit tests that hold the corpus fixed.
