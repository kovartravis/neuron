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
supersededBy: 3f2c0a2b-50e5-42d7-925e-bc9d8c7d6f2c
supersededAt: 2026-08-08T05:25:11.070Z
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
supersededBy: a0de113f-a0b7-47f1-a102-0d952824b61f
supersededAt: 2026-08-08T05:25:18.839Z
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
# 🏛️ Repository Architectural Blueprint: @kovartravis/neuron

## 🚀 System Purpose & Tech Stack
@kovartravis/neuron is a nodejs, typescript software system structured into 14 primary architectural modules.

## 🔬 Parser Fidelity
Default: `ast/2`

## 🧾 Dependency Contract
- `@anthropic-ai/sdk`
- `@huggingface/transformers`
- `@types/better-sqlite3`
- `@types/node`
- `env-paths`
- `onnxruntime-web`
- `tsx`
- `typescript`
- `vitest`
- `web-tree-sitter`
- `yaml`
- `zod`

## 🔗 Subsystem Dependency Map
```text
@kovartravis/neuron
├── benchmarks (benchmarks)
├── longmemeval (benchmarks/longmemeval)
├── src (src)
├── commands (src/commands)
├── components (src/components)
├── config (src/config)
├── e2e (src/e2e)
├── harnesses (src/harnesses)
├── models (src/models)
├── scanner (src/scanner)
├── shared (src/shared)
├── storage (src/storage)
├── ui (src/ui)
└── e2e (test/e2e)
```

## 📦 Primary Subsystems & Module Boundaries

### 🧩 benchmarks (`benchmarks`)
Primary benchmarks module containing core application capabilities.

**Key Components & Export Contracts:**
- **`benchmarks/e2e-runner.js`**: Driver for the deep E2E benchmark & correctness suite. Pillar results come from vitest's JSON reporter and the metrics file the suite itself writes — never from scraping stdout. The previous revision inferred status with `!output.includes(name) || overallPassed`, which marked a pillar PASSED precisely when it had NOT run, so a suite that died early scored better than one that ran and failed.
- **`benchmarks/generate-dashboard.js`** (Exports: `generateDashboard`): Renders the benchmark dashboard from the artifacts the suites write. Self-contained output: inline CSS/SVG, no network fetches, no chart library. Charts use a single series hue because every plot here shows one measure across categories (magnitude), not competing identities — categorical colors would imply a distinction that does not exist. Pass/fail uses the reserved status palette and always pairs color with an icon and a text label, so state is never carried by hue alone.
- **`benchmarks/open-report.js`**: Regenerates the dashboard from whatever artifacts are on disk and opens it. Kept separate from the runner so the report can be viewed without re-running a benchmark that takes minutes.

### 🧩 longmemeval (`benchmarks/longmemeval`)
Primary longmemeval module containing core application capabilities.

**Key Components & Export Contracts:**
- **`benchmarks/longmemeval/neuron.py`** (Exports: `NeuronMemoryProvider`): This code file defines a memory provider class for(neuron) that uses SQLitewal mode, FTS5 full-text indexing, local BGE vector embeddings, and Reciprocal Rank Fusion (RRF). The constructor initializes a memory provider instance and ensures that it can obtain a proc using the Popen
- **`benchmarks/longmemeval/relevance_gate_eval.py`** (Exports: `eval_floor, eval_full_gate, reject, pctl`): Source file relevance_gate_eval.py (Methods: leg(), prose(), fix(), result()) exports primary project types and helper functions.
- **`benchmarks/longmemeval/retrieval_eval.py`**: Memory benchmarking of a single-neuron LeMMA model. The model needs to put any gold evidence before the reader. Only a zero-level call costs no API quota (for local CPU). N is set to the number of queries loaded by the dataset "longmemeval". After loading the

### 🧩 src (`src`)
Primary src module containing core application capabilities.

**Key Components & Export Contracts:**
- **`src/cli.test.ts`**: Source file cli.test.ts (Methods: describe(), join(), beforeAll(), mkdirSync()) exports primary project types and helper functions.
- **`src/cli.ts`**: Source file cli.ts (Methods: main(), slice(), log(), exit()) exports primary project types and helper functions.
- **`src/db.test.ts`**: Source file db.test.ts (Methods: describe(), it(), openDatabase(), expect()) exports primary project types and helper functions.
- **`src/db.ts`** (Exports: `createNodeSqliteWrapper, openDatabase`): The `createNodeSqliteWrapper` function is used to establish a connection with a SQLite database using Node.js, without loading it as a module. It initializes a DatabaseSync instance, creates a new transaction on the database (if provided), executes SQL queries within the transaction and returns a single row value
- **`src/enrichment.test.ts`**: Write-side enrichment, asserted at the transaction entry point — what ends up in the store. That was once two seams; the query seam carried the enrichment backlog's drain guarantee, and ticket 26 removed the only deferred job, so a read has no enrichment behaviour left to assert. Nothing here asserts how a tag was chosen. The category strategy in particular was A/B'd precisely because its winner was unknown, so tests that pinned the mechanism would have been rewritten by the experiment they existed to support.
- **`src/fieldSchema.test.ts`**: Declarable per-category frontmatter fields (ticket 43 / ADR 0013), asserted at the `transact()` choke point — required-but-missing, defaults, enum membership, and the reject-undeclared-field guard — plus the markdown round-trip that makes a written field value durable. Storage: SQLite column support for `vector-only`/`split` categories shipped in ticket 44 — see `sqliteFieldSchema.test.ts` for the column migration and round-trip coverage. These tests use `storage.mode: md` where the markdown round-trip is meaningful.
- **`src/index.supersession.test.ts`**: Source file index.supersession.test.ts (Methods: primitives(), vecAt(), Float32Array(), describe()) exports primary project types and helper functions.
- **`src/index.test.ts`**: Source file index.test.ts (Methods: describe(), it(), NeuronMemory(), getDb()) exports primary project types and helper functions.
- **`src/index.ts`** (Exports: `NeuronMemory`): Resolve a `category` from a mutation/query, supporting the deprecated `kind` field. Maps 'learning' → 'learning', 'history' → 'history', or passes through custom category names.
- **`src/sqliteFieldSchema.test.ts`**: SQLite additive auto-migration for declared category fields (ticket 44 / ADR 0013) — the `vector-only`/`split` counterpart to `fieldSchema.test.ts`'s markdown round-trip. Covers the migration mechanics (additive, idempotent, never `DROP COLUMN`) and the write-then-query round trip through real SQLite columns rather than frontmatter.

### 🧩 commands (`src/commands`)
Primary commands module containing core application capabilities.

**Key Components & Export Contracts:**
- **`src/commands/exec.test.ts`**: Source file exec.test.ts (Methods: describe(), join(), beforeAll(), mkdirSync()) exports primary project types and helper functions.
- **`src/commands/exec.ts`** (Exports: `handleExecCommand`): Function handleExecCommand in exec.ts (Methods: handleExecCommand(), indexOf(), slice(), error()) handles utility and command processing.
- **`src/commands/feedback.test.ts`**: The cli command is used to issue GitHub issues about a specific problem. The command takes three arguments:
- title: A string indicating the problem being mentioned.
- body: A string describing how the issue occurred.
- type: A string indicating whether the issue should be assigned as "bug" or "
- **`src/commands/feedback.ts`** (Exports: `buildGitHubIssueUrl, handleFeedbackCommand`): The purpose of this code file is to generate a GitHub issue URL based on an input parameters such as a title, body, and type. The URL is formatted with the `project-name` subdirectory, and it includes the issue issue number (E026), description (F257
- **`src/commands/history.test.ts`**: Source file history.test.ts (Methods: describe(), join(), beforeAll(), mkdirSync()) exports primary project types and helper functions.
- **`src/commands/history.ts`** (Exports: `handleHistoryCommand`): This code defines a function called `handleHistoryCommand` that takes several command arguments, including `args`, `memory`, and `projectName`. The function searches for the option "-h" or "-help", and prints out information such as the label for "neuron history", along with warnings when
- **`src/commands/hook.test.ts`**: The purpose of this code file is to write a test script for the CLI command "hook" using the `vitest` library. The script creates a temporary database directory and a project directory within this directory with different paths for testing purposes. The script then installs a package on the project specified in the
- **`src/commands/hook.ts`** (Exports: `handleHookCommand`): Bounds how long a hung query can hold up the user's turn. Well under the harness's own documented ceilings (`claudeCode.ts`'s `HOOK_TIMEOUT_SECONDS` is the outer, harness-enforced bound; this is neuron's own inner one, so a slow embedder degrades the turn by single-digit seconds rather than the harness's full budget).
- **`src/commands/index.ts`**: Source file index.ts exports primary project types and helper functions.
- **`src/commands/init.test.ts`**: The end-to-end claim ticket 31 exists to make true: the README's Quick Start, run verbatim, leaves markdown in the repo rather than an invisible database.
- **`src/commands/init.ts`** (Exports: `ProtocolWriteReport, handleInitCommand`): Every harness with a real adapter.
- **`src/commands/learn.test.ts`**: Source file learn.test.ts (Methods: describe(), join(), beforeAll(), mkdirSync()) exports primary project types and helper functions.
- **`src/commands/learn.ts`** (Exports: `handleLearnCommand`): Function handleLearnCommand in learn.ts (Methods: handleLearnCommand(), error(), exit(), log()) handles utility and command processing.
- **`src/commands/memory.supersession.test.ts`**: Source file memory.supersession.test.ts (Methods: process(), vecAt(), Float32Array(), makeMemory()) exports primary project types and helper functions.
- **`src/commands/memory.test.ts`**: A project whose config names a literal fallback category. The model is disabled under NODE_ENV=test, so the fallback is what makes the success path deterministic without loading 500M parameters.
- **`src/commands/memory.ts`** (Exports: `handleMemoryCommand`): Function handleMemoryCommand in memory.ts (Methods: handleMemoryCommand(), getConfig(), collectDeclaredFieldFlags(), getMemoryHelp()) handles utility and command processing.
- **`src/commands/scan.determinism.test.ts`**: The primary purpose of this code file is to describe a module that implements the `neuron scanned determinism` ticket in its `scan.js` function. The purpose is to assess the reliability of the implementation under different scenarios.
- **`src/commands/scan.fidelity.test.ts`**: The `--check` exit-code contract, which is what CI gates on: 0  clean and comparable 1  real architectural drift 2  incomparable — the baseline was produced by a different parser Code 2 is deliberately distinct from 1: failing a build for drift the user introduced is correct, and failing it because they upgraded neuron is a different problem with a different fix.
- **`src/commands/scan.test.ts`**: Source file scan.test.ts (Methods: describe(), join(), it(), execSync()) exports primary project types and helper functions.
- **`src/commands/scan.ts`** (Exports: `handleScanCommand`): Function handleScanCommand in scan.ts (Methods: handleScanCommand(), log(), parseFlags(), cwd()) handles utility and command processing.
- **`src/commands/status.test.ts`**: Source file status.test.ts (Methods: describe(), join(), beforeAll(), mkdirSync()) exports primary project types and helper functions.
- **`src/commands/status.ts`** (Exports: `handleStatusCommand`): Function handleStatusCommand in status.ts (Methods: handleStatusCommand(), getStatus(), loadNeuronConfig(), 07()) handles utility and command processing.
- **`src/commands/sync.test.ts`**: A genuine content conflict (both sides present, different content) used to be silently resolved by comparing createdAt, which ties in the common case and defaulted to markdown winning — including when markdown was the stale side. Without --force, `sync` must now report the conflict, leave both stores untouched, and exit non-zero so a script or CI run notices rather than silently accepting a guessed resolution.
- **`src/commands/sync.ts`** (Exports: `handleSyncCommand, scaffoldNeuronDirectory`): Function handleSyncCommand in sync.ts (Methods: handleSyncCommand(), some(), includes(), error()) handles utility and command processing.
- **`src/commands/ui.test.ts`**: The `NeuronMemory` class is used to represent a neuron memory object.
The `startUiServer` method starts a new HTTP server for the `ui-server`. A basic setup includes creating a neural network as an object and initializing the server to use that model. The `fetch` method is
- **`src/commands/ui.ts`** (Exports: `UiCommandOptions, handleUiCommand`): Function handleUiCommand in ui.ts (Methods: parseUiArgs(), parseInt(), findFreePort(), Promise()) handles utility and command processing.
- **`src/commands/utils.test.ts`**: Source file utils.test.ts (Methods: describe(), it(), spyOn(), mockImplementation()) exports primary project types and helper functions.
- **`src/commands/utils.ts`** (Exports: `findProjectRoot, drawBox, parseFlags, updateMarkdownFile, getMemoryHelp`): Every option `parseFlags` understands with no `neuron.yaml` involved. Used to reject unrecognised flags and to suggest a correction — a typo'd flag used to be pushed into `positionals` and silently discarded, so `--importanc 5` looked like it worked and wrote the default instead. Re-exported from `config/neuronYaml.ts`, which is also where `validateNeuronYaml` checks a declared field's flag against this same list at config-load time (ticket 43) — one vocabulary, not two that can drift.

### 🧩 components (`src/components`)
Primary components module containing core application capabilities.

**Key Components & Export Contracts:**
- **`src/components/embedder.test.ts`**: It generates 384-dimensional floats at different lengths (with and without normalization) for given text, using transformers that conform to the specified model schema described in the test file. This ensures the quality of the resulting embedding data. It also computes an accurate L2 norm and verifies the robustness of
- **`src/components/embedder.ts`** (Exports: `Embedder, TransformersEmbedder`): The `applyCrossPlatformShims` function is used to apply cross-platform JavaScript-shim modules during the rendering process of a given component. By using `create Require`, it is used to build and load a module based on an environment variable name. The module is then applied at runtime. The `
- **`src/components/enricher.ts`** (Exports: `Centroid, VocabularyEntry, buildTagVocabulary, buildCategoryCentroids, TagSelectionOptions, selectTags, selectCategory, CategoryOption, CategoryInferenceInput, CategoryInferenceResult, EnrichmentModel, LocalEnrichmentModelOptions, LocalEnrichmentModel, buildCategoryPrompt`): Write-side enrichment: inferring the metadata a caller did not supply. Two fields are inferred, by different machinery chosen from what each field actually is (see `.scratch/write-side-enrichment/spec.md`): tags       — selected from a closed vocabulary by centroid cosine. No model: the embedder is already loaded on the write path, and ADR 0010 §4 forbids the model from minting a tag, which makes tagging a ranking problem rather than a generation one. category   — centroid cosine by default, which beat the model 9/9 to 1/9 on the same corpus (Pillar 11). The model strategy survives as an opt-in because it can read a category's `description` as an instruction rather than merely as a similarity target. `importance` was a third inferred field and is not inferred any more. Pillar 10 measured the shipped 0.5B model's judgement as noise — discrimination of -0.5 then +0.167 across consecutive runs, per-entry stability 0.5, and a note about irreversible production data loss rated `1`. It shipped `off` in ticket 06 and was removed outright in ticket 26; an omitted `--importance` takes the column default. Git history holds the implementation if a larger model ever makes the question worth reopening.
- **`src/components/fts-query.test.ts`**: Source file fts-query.test.ts (Methods: describe(), it(), expect(), toBe()) exports primary project types and helper functions.
- **`src/components/fts-query.ts`** (Exports: `isStopword, cleanFtsQuery`): Converts a natural language query string into a safe SQLite FTS5 MATCH expression. ## Why stopwords are dropped The keyword leg is fused with the semantic leg by Reciprocal Rank Fusion, which rewards a document's rank position in each list rather than how well it actually matched. Because terms are joined with `OR`, a document matching a single common word enters the FTS ranking at all — and if it is the only match, it enters at rank 1 and collects the full RRF contribution. Observed: the query "what payment provider do we use" ranked a document about a Rust auth daemon above the correct billing document, because `"do"`, `"we"` and `"use"` were searchable terms. Noise words give noise a guaranteed seat. Dropping them means an all-stopword query produces an empty expression, which the caller treats as "no keyword leg" and answers semantically — the correct degradation, and far better than a MATCH that hits every row.
- **`src/components/generator.ts`** (Exports: `GeneratorProgress, getTextGenerator, isTextGeneratorLoaded, resetTextGenerator`): The key purpose of the code file is to define a shared text generation model, called "Xenova/Qwen1.5-0.5B-Chat", using the XENova Qwen model available on the Node.js runtime. The loaded model will dominate its total cost by consuming
- **`src/components/index.ts`**: Source file index.ts exports primary project types and helper functions.
- **`src/components/summarizer.test.ts`**: Handles dual storage reads and writes across Markdown and SQLite
- **`src/components/summarizer.ts`** (Exports: `SummarizerOptions, SmolLM2Summarizer`): Delegates to the process-wide loader so a scan and write-side enrichment running in the same process share one ~3.2s model load rather than paying for it twice.
- **`src/components/timeout.ts`** (Exports: `TimeoutError, withTimeout`): This code file exports a date-time object called `timeout`. It defines an abstract `TimeoutError` type that extends `Error`, which is used to handle timeouts. The `timeout` primitive includes the label "timeout" when created, along with a value for how long the value takes (`ms`).

### 🧩 config (`src/config`)
Primary config module containing core application capabilities.

**Key Components & Export Contracts:**
- **`src/config/categoryPath.test.ts`**: Source file categoryPath.test.ts (Methods: describe(), it(), baseConfig(), expect()) exports primary project types and helper functions.
- **`src/config/categoryPath.ts`** (Exports: `resolveCategoryPath, rawCategoryPath, resolveAllCategoryRoots`): `categories.<name>.path > storage.path > '.neuron'` (ticket 05). Absolute per-category paths are allowed by design — a shared notes directory outside the repo is a plausible want, and `storage.path` itself already permitted absolute values. The `path.resolve` below is a no-op for an already-absolute `raw`.
- **`src/config/harness.ts`** (Exports: `AgentHarness, detectHarnesses, copySkill`): Function detectHarnesses in harness.ts (Methods: detectHarnesses(), filter(), map(), copySkill()) handles utility and command processing.
- **`src/config/index.ts`**: Source file index.ts exports primary project types and helper functions.
- **`src/config/neuronYaml.test.ts`**: Source file neuronYaml.test.ts (Methods: describe(), join(), beforeAll(), mkdirSync()) exports primary project types and helper functions.
- **`src/config/neuronYaml.ts`** (Exports: `StorageMode, StorageConfig, CategoryField, CategoryConfig, fieldKeyToFlagName, fieldKeyToColumnName, isValidColumnIdentifier, DeclaredFieldFlag, collectDeclaredFieldFlags, PullRuleDefault, PullRuleOnExec, PullRulesConfig, ScanConfig, LlmEnrichmentConfig, LlmConfig, RelevanceGateConfig, RelevanceConfig, RecallConfig, NeuronConfig, findNeuronYaml, findConfigFile, validateNeuronYaml, parseNeuronYaml, loadNeuronYaml, loadConfig, resolveExecCategories`): `md-only` and `dual` are pre-2.2.0-rc5 spellings, both deleted by ticket 28: `md-only` because every one of its defects traced to `this.db = null`, and `dual` because it was renamed to `md` — same mechanism, correct name now that `md-only` no longer exists to be confused with. Both alias to `md` with a stderr warning rather than hard-failing, because a config that errors on upgrade turns a rename into an outage (ADR 0011 §7).
- **`src/config/protocolBlock.test.ts`**: The purpose of this code file is to implement a test suite for generating protocol blocks with specific properties and conditions. It tests that the generated protocol block properly encodes specific properties such as learning rules, decision history, and audio echoes using the `NeuronConfigSchema` object provided by the `neuron
- **`src/config/protocolBlock.ts`** (Exports: `ProtocolFidelity, ProtocolBlockOptions, generateProtocolBlock, ProtocolWriteAction, UpsertProtocolBlockResult, upsertProtocolBlock`): Ticket 14: hooks own the read side on a harness with a deterministic adapter, so the generated protocol block only needs to teach the write side there. A harness with no such adapter (including every harness without a `HarnessAdapter` at all — 'best-effort' ones fall into this bucket too, since neither can guarantee the model ever sees a result) has nothing else performing recall, so it keeps the manual query step.
- **`src/config/scaffold.test.ts`**: The template is a contract with the user: a key in it that the schema does not read looks configured and does nothing. `llm.enrichment.importance` is the concrete hazard — removed by ticket 26, and silently dropped by Zod, so it would fail invisibly rather than loudly.
- **`src/config/scaffold.ts`** (Exports: `ScaffoldResult, scaffoldNeuronYaml`): The config `neuron init` writes when a project has none (ticket 31). Two rules govern what may appear here: 1. Every key is one the schema actually reads. An aspirational key in a generated file is worse than an undocumented one — it looks configured and does nothing. `llm.enrichment.importance` is the cautionary example: it was removed by ticket 26, and Zod silently strips it, so a template carrying it would advertise a setting that cannot take effect. `pullRules.default.minScore` is the same trap in a louder form: ticket 39 deprecated it (it cannot reject a top hit at any relevance, ADR 0012) and every command now warns on stderr when it's present — a template carrying it would make a fresh `neuron init` noisy on its very first run. 2. `architecture` is declared even though `scan.enabled` is `false`. `scan.category` defaults to `architecture`, so a config that sets up the scan without declaring the category it writes into leaves those entries outside `categories` — which in `md` mode means the reconcile pass never covers them. Declaring it costs one no-op reconcile per command and removes the trap for anyone who later flips `enabled: true`. 3. Nothing here turns on behaviour the schema defaults leave off. `scan.enabled` stays `false`, matching a config-less project, so generating this file changes what a project says rather than what it does. An `init` that quietly started scanning — loading the summarizer and filing a blueprint card nobody asked for — would be a behaviour change disguised as a convenience. The pull rules are the one place the template is opinionated rather than default, and they are opinionated in the file, where the user can read and change them. The `llm` block is deliberately omitted. Its defaults are the values ticket 06's A/B selected on evidence (`categoryStrategy: centroid`, 9/9 against the model's 1/9); pinning them into every generated file would freeze a measured result as a user setting and make future corrections invisible.

### 🧩 e2e (`src/e2e`)
Primary e2e module containing core application capabilities.

**Key Components & Export Contracts:**
- **`src/e2e/mdFileManagement.e2e.test.ts`**: Source file mdFileManagement.e2e.test.ts (Methods: describe(), beforeEach(), mkdtempSync(), afterEach()) exports primary project types and helper functions.

### 🧩 harnesses (`src/harnesses`)
Primary harnesses module containing core application capabilities.

**Key Components & Export Contracts:**
- **`src/harnesses/cacheDir.ts`** (Exports: `projectHash, hookCacheDir, sessionFileKey`): Same hash scheme `NeuronMemory` uses for its SQLite filename (`src/index.ts`), reused here so ledger/hook-state files land in a predictable, collision-resistant per-project directory without importing `NeuronMemory` itself — this module only ever touches the filesystem, never the memory store.
- **`src/harnesses/claudeCode.test.ts`**: Source file claudeCode.test.ts (Methods: describe(), join(), ClaudeCodeAdapter(), beforeEach()) exports primary project types and helper functions.
- **`src/harnesses/claudeCode.ts`** (Exports: `ClaudeCodeAdapter`): Neuron's own lifecycle vocabulary, translated to Claude Code's event names.
- **`src/harnesses/codex.test.ts`**: Source file codex.test.ts (Methods: describe(), join(), CodexAdapter(), beforeEach()) exports primary project types and helper functions.
- **`src/harnesses/codex.ts`** (Exports: `CodexAdapter`): Neuron's own lifecycle vocabulary, translated to Codex CLI's event names. Confirmed identical to Claude Code's naming (`learn.chatgpt.com/docs/hooks`, fetched directly during this ticket): `SessionStart`, `UserPromptSubmit`, and `PreCompact` are named exactly the same on both harnesses.
- **`src/harnesses/copilot.test.ts`**: Este é um script para o código Testeur de copiar ao seu local e verificar se os exemplos da libreria Node Autenticação para JavaScript estão seguros. Este script ajuda a detectar o nome de projetamento na loginação GitHub, gerando uma nova diretoria do
- **`src/harnesses/copilot.ts`** (Exports: `CopilotAdapter`): The primary purpose of this code file is to define a function called `copilot` that generates Copilot event vocabulary for specific neurons. This vocabulary will be used to determine when to execute specific functions and events using Copilot CLI events. The function also exports Copilot event vocabulary as an object containing the
- **`src/harnesses/cursor.test.ts`**: Source file cursor.test.ts (Methods: describe(), join(), CursorAdapter(), beforeEach()) exports primary project types and helper functions.
- **`src/harnesses/cursor.ts`** (Exports: `CursorAdapter`): Neuron's own lifecycle vocabulary, translated to Cursor's event names (camelCase, confirmed via direct fetch of `cursor.com/docs/hooks` during this ticket — the same naming-convention family as Claude Code/Codex). `pre-prompt` has no entry: `beforeSubmitPrompt` fires every turn but its documented output is `{continue, user_message}` — permission allow/deny only, no context-carrying field — so neuron never wires a hook there at all, same design call ticket 01 made for Copilot CLI's `userPromptSubmitted`. Unlike Copilot, `context-reset` does get a real event (`preCompact`) — see `capability()` below for why wiring it still doesn't make the epoch reliably roll.
- **`src/harnesses/hookState.ts`** (Exports: `recordFired, readFiringState`): Firing evidence, not inference from file contents. Ticket 10 found no harness researched documents an external way to confirm a registered hook actually fired — so neuron manufactures its own evidence: the hook command records a timestamp the moment it runs, before doing any of the work that could fail. `verify()` reads this file to answer "is this hook firing" as a fact, not a guess from `settings.json` being present.
- **`src/harnesses/index.ts`**: The file contains external dependencies for various modules and functions that are used throughout the applications.
- **`src/harnesses/ledger.test.ts`**: Source file ledger.test.ts (Methods: entry(), describe(), join(), beforeEach()) exports primary project types and helper functions.
- **`src/harnesses/ledger.ts`** (Exports: `EpochRecord, EpochState, loadEpochState, filterUnseen, remainingEpochBudget, recordSessionStartInjection, recordPrePromptTurn, rollEpoch, RecallCostSummary, summarizeRecallCost`): Session-scoped recall state (ADR 0014 §3 dedupe, extended by ticket 07 / neuron-2.3.0 with a per-epoch cost budget). An epoch is the span between session start (or the last compaction) and the next `context-reset` — not the whole session — because compaction deletes everything neuron previously injected, so re-injecting after one is recovery, not repetition. Both the dedupe ledger and the char-spend budget therefore share one lifecycle: `rollEpoch` resets both together rather than treating them as two files with two reset rules. A ledger older than this is treated as abandoned rather than tracked forever — sessions that never fire `context-reset` (compaction) or end cleanly would otherwise leak one file per session indefinitely.
- **`src/harnesses/payload.test.ts`**: Source file payload.test.ts (Methods: entry(), describe(), it(), buildPayload()) exports primary project types and helper functions.
- **`src/harnesses/payload.ts`** (Exports: `formatMemoryEntry, PayloadResult, buildPayload`): The payload budget, per ADR 0014 §4: no relevance floor ships (ticket 39 found every cosine floor from 0.50-0.70 regresses recall on real conversational text), so the character ceiling is the sole volume control, and it must sit strictly below the smallest known harness cap so neuron never relies on spill-to-file — spill hands the model a preview and a path, which turns deterministic recall back into agent-invoked recall at exactly the moment the payload is largest. Claude Code's own documented cap is 10,000 characters (`additionalContext` / `systemMessage` / stdout). Codex CLI's is ~2,500 tokens, which neuron counts as characters rather than tokens (exact, free, and tokenising on the hook path would spend per-turn latency approximating a limit one harness already states in characters) — even a generous 4 chars/token reading of that cap is 10,000 chars, and a conservative 3 chars/token reading is 7,500. Both budgets below are chosen to sit under every one of those readings, not just Claude Code's own cap, since this module is shared by every adapter (ticket 13 onward).
- **`src/harnesses/types.ts`** (Exports: `LifecyclePoint, SupportRecord, CapabilityMap, FidelityLabel, deriveFidelity, HookTarget, OverwritePolicy, InstallOptions, InstallResult, UninstallResult, VerifyPointStatus, VerifyResult, HarnessAdapter`): The recall adapter interface, per ADR 0014 / ticket 11. Capability is a per-lifecycle-point map, not a single enum: two harnesses can occupy the same `deterministic`/`best-effort` label while differing on exactly what they leave undocumented. The enum is derived for display only (`neuron init` output, the README matrix) and is never itself stored — see `deriveFidelity` below.

### 🧩 models (`src/models`)
Primary models module containing core application capabilities.

**Key Components & Export Contracts:**
- **`src/models/index.ts`**: The primary purpose of this code file is to import and export functions from various modules that perform different tasks.
- **`src/models/maintenance.ts`** (Exports: `MaintenancePolicy, MaintenanceReport`): Source file maintenance.ts exports primary project types and helper functions.
- **`src/models/memory.ts`** (Exports: `MemoryKind, MemoryQuery, Memory, MemoryMutation, MutationResult`): @deprecated Use plain `string` for category names instead.
- **`src/models/options.ts`** (Exports: `NeuronMemoryOptions`): Injected write-side enricher. Tests supply a stub so the transaction seam can be exercised without loading a 500M-parameter model; production leaves it unset and gets `LocalEnrichmentModel`.

### 🧩 scanner (`src/scanner`)
Primary scanner module containing core application capabilities.

**Key Components & Export Contracts:**
- **`src/scanner/analyzer.test.ts`**: This is a test file for the Scanner Engine that runs a test with a specific configuration. The tests are written using the 'vitest' package and its methods such as describe, it, expect, beforeAll, afterAll and it is used so that a set of specific properties can be tested without
- **`src/scanner/analyzer.ts`** (Exports: `isIgnoredEntryName, ModuleSummary, ScanResult, scanProjectTopology`): Traversal rules shared by the topology scan and the drift fingerprint guard. Both must agree on exactly which files feed a scan: if the guard watches a narrower set than the scanner reads, edits to the difference are invisible and drift is never re-checked. Derived from the parser's own language list so the filter can never be narrower than what TreeSitterScanner can actually parse — a mismatch here silently hides whole languages (previously .tsx/.jsx/.cpp) from every scan.
- **`src/scanner/degradation-warning.test.ts`**: Scope item 2: a language that should have parsed from an AST but could not must say so loudly, not degrade in silence. The distinction that matters: Ruby and PHP have no grammar in 2.2.0 at all, so their regex fidelity is expected and unremarkable. TypeScript falling back means something went wrong with the install, and the resulting card is worse than the user has any reason to expect.
- **`src/scanner/diff.test.ts`**: The same card, declaring the fidelity the current scan is produced at. Drift tests must use this: against the legacy fixture the engine correctly refuses to compare at all, which would make them vacuous.
- **`src/scanner/diff.ts`** (Exports: `ModuleDiff, ExportDiff, DependencyDiff, ArchitecturalDiff, parseBaselineBlueprint, calculateArchitecturalDiff, formatArchitecturalDiffMarkdown, getArchitecturalDrift, autoRescanIfDriftDetected`): The baseline and the scan were produced by different parsers, so their difference is not drift. Mutually exclusive with `hasDrift`.
- **`src/scanner/fidelity.ts`** (Exports: `FidelityDescriptor, descriptorFor, fidelityFromComponents, areComparable, formatFidelitySection, parseFidelitySection`): Parser fidelity: how a blueprint card's symbols were obtained, and whether two cards can be meaningfully compared at all. A drift report is a comparison between two measurements. If the two were taken with different instruments, their difference is not drift — it is an artefact of the instrument change. Recording fidelity on the card is what lets `neuron scan --diff` tell those apart instead of reporting hundreds of phantom export changes the moment a user upgrades.
- **`src/scanner/fingerprint.test.ts`**: Source file fingerprint.test.ts (Methods: describe(), join(), beforeEach(), random()) exports primary project types and helper functions.
- **`src/scanner/fingerprint.ts`** (Exports: `FingerprintInputs, computeProjectFingerprint, readReconciledFingerprint, writeReconciledFingerprint, clearReconciledFingerprint`): Cheap change-detection for the implicit drift re-scan. `scanProjectTopology` parses every source file's AST, which is far too expensive to run on every `memory query`. A stat-only walk over the same file set is orders of magnitude cheaper, so we fingerprint the tree and skip the scan entirely when nothing has moved since the last reconcile. This guard only gates the implicit re-scan. `neuron scan`, `--diff`, and `--check` always perform a real scan, so CI and explicit checks are never served a cached verdict.
- **`src/scanner/grammars.test.ts`**: Build an npm-shaped tarball containing the given `package/`-relative files.
- **`src/scanner/grammars.ts`** (Exports: `GrammarSpec, grammarCacheDir, grammarPaths, isGrammarCached, cachedLanguages, GrammarFetchOutcome, EnsureGrammarsOptions, ensureGrammars, GrammarLoader`): Tree-Sitter grammar acquisition. Compiled `.wasm` grammars are fetched at `neuron init` and cached on disk rather than bundled in the npm tarball. Eight grammars weigh ~8.5 MB against a 621 KB package, and the ONNX models already establish the fetch-at-init pattern, so grammars follow it. See docs/adr/0008. Artifacts come from the official `tree-sitter-<lang>` packages on the npm registry, which ship both a prebuilt `.wasm` and a `queries/tags.scm`.
- **`src/scanner/implicit-rebaseline.test.ts`**: The implicit path — the auto-rescan fired by `memory query`. On a fidelity mismatch it re-baselines exactly as it would for drift, and says nothing. A distinct announcement was considered and rejected: the drift and missing-baseline messages would both state something untrue here, and the migration is not something the user needs to act on when it self-heals.
- **`src/scanner/ingest.test.ts`**: Main app entry
- **`src/scanner/ingest.ts`** (Exports: `IngestOptions, ingestScanResults`): The main purpose of this code file is to define an immutable storage reference to a blueprint card, using a stable index with SHA-256 hash for it and the binary representation of each block in the pipeline. The binary representation includes a sequence of four hexadecimal digits (`-`) along with the category
- **`src/scanner/queries.ts`** (Exports: `SymbolKind, isIgnoredCapture, isTypeLikeAncestor, resolveKind, kindPrecedence, refineGoTypeSpec`): Per-language symbol extraction queries and the rules that turn a captured syntax node into a `ScannedSymbol`. Two things live here because they are one decision: which S-expression query finds declarations in a language, and how the node it captures maps to a symbol kind. Splitting them would let a query and its kind table drift. ## Why some queries are hand-written Most grammars ship a `queries/tags.scm` (ticket 01 caches it next to the `.wasm`). Those queries were written for code navigation — "jump to the thing under my cursor" — not for the declaration inventory a blueprint card needs, so each one is audited before adoption rather than trusted wholesale. TypeScript's shipped query fails that audit outright: it covers only ambient declaration forms (`function_signature`, `method_signature`, `abstract_class_declaration`, `interface_declaration`) and has no rule for `function_declaration` or `method_definition`. Against `export class Alpha { thing() {} }` it captures nothing but a stray generic parameter, where JavaScript's equivalent has 13 definition rules. Neuron is itself a TypeScript project, so TypeScript and TSX get the queries below and everything else uses its shipped `tags.scm`.
- **`src/scanner/treesitter.test.ts`**: These tests exercise the real grammars, not a mock. A mocked parser would only prove the query strings are strings — the whole point is whether the queries actually match the declaration forms each grammar produces. Grammars normally arrive via `neuron init`; fetch anything missing once so a cold checkout still runs. Every AST assertion below also asserts `fidelity === 'ast'`, so an offline machine fails loudly instead of quietly passing at regex fidelity — which is the failure mode ticket 02 exists to remove.
- **`src/scanner/treesitter.ts`** (Exports: `ScannedSymbol, ParserFidelity, ParsedFile, DynamicGrammarLoader, TreeSitterScanner`): Whether the symbol is part of the file's public surface. Methods are never exports — the class is. Keeping members out of this set is what stops `neuron scan --diff` reporting an export contract change every time a private helper is renamed.

### 🧩 shared (`src/shared`)
Primary shared module containing core application capabilities.

**Key Components & Export Contracts:**
- **`src/shared/textMatch.ts`** (Exports: `editDistance, suggestClosest`): Cheap edit distance, only ever called on an error path (a typo'd CLI flag or enum value). Shared between `commands/utils.ts` (unknown-flag suggestions) and `NeuronMemory`'s field-schema enforcement (enum-value suggestions, ticket 43) so the two surfaces suggest corrections the same way rather than drifting into two slightly different heuristics.

### 🧩 storage (`src/storage`)
Primary storage module containing core application capabilities.

**Key Components & Export Contracts:**
- **`src/storage/dualStorageRouter.pathChange.test.ts`**: Ticket 05's "data-loss-adjacent part": `md` mode's mirror deletes any vector row whose id isn't found in the markdown read from a category's current resolved root. If `neuron.yaml` changes `categories.learning.path` between two commands, the old file is still sitting at the old root — a naive reconcile against the new (empty) root would read that as "markdown deleted everything" and wipe the vector index. Per the maintainer's decision, the actual behaviour is a per-category reseed from the vector index into the new root instead — asserted end to end here rather than just unit-testing the resolver.
- **`src/storage/dualStorageRouter.test.ts`**: The purpose of this code file is to perform two unit tests for a dual storage router with multiple neurons. The first test runs the setup and tear down steps needed for starting up the store and the second test simulates a boundary that must be reached after storing multiple neurons. The tests require specific permissions and
- **`src/storage/dualStorageRouter.ts`** (Exports: `DualStorageRouter`): Markdown-first write ordering (ADR 0011 Consequence 2): the markdown write happens first, and on `upsert` the vector embed is only attempted once it has succeeded — markdown can never be behind, so the index can only ever be missing something a human deleted, never holding something markdown never had. A vector-side failure no longer disappears into a bare `catch {}`; it is reported to stderr and left for the next command's reconcile pass to repair, rather than blocking a write whose record of truth (markdown) already landed.
- **`src/storage/index.ts`**: This code file is a import statement that exports functions for use in other files within the module.
- **`src/storage/mdFileManagement.integration.test.ts`**: Source file mdFileManagement.integration.test.ts (Methods: describe(), beforeEach(), mkdtempSync(), join()) exports primary project types and helper functions.
- **`src/storage/mdStorage.ts`** (Exports: `MdStorage`): The markdown-storage surface every caller (`NeuronMemory`, `DualStorageRouter`, `syncMdWithVector`, `neuron sync`) actually depends on. Extracted so a caller can be handed either a single-root `MdStorageAdapter` or a `MultiRootMdStorage` that fans out across several resolved category roots (ticket 05) without knowing which.
- **`src/storage/mdStorageAdapter.challenger.test.ts`**: Source file mdStorageAdapter.challenger.test.ts (Methods: describe(), join(), now(), beforeEach()) exports primary project types and helper functions.
- **`src/storage/mdStorageAdapter.test.ts`**: Source file mdStorageAdapter.test.ts (Methods: describe(), join(), now(), beforeEach()) exports primary project types and helper functions.
- **`src/storage/mdStorageAdapter.ts`** (Exports: `MdStorageAdapterOptions, sanitizeCategoryFilename, MdStorageAdapter`): The same category → filename sanitization `getFilePath` applies, exported so config-time collision validation (ticket 05, `validateNeuronYaml`) can predict which file two categories would collide on without constructing an adapter.
- **`src/storage/mdVectorSync.test.ts`**: Previously named "Timestamp Conflict Resolution" and asserted that a newer `createdAt` on the markdown side won. That mechanism is gone: a normal `memory update` never touches `createdAt` on either side, and `.md` frontmatter has no `updatedAt`, so comparing `createdAt` was comparing two values that are almost always equal — which meant "md wins" fired on every real conflict, not just ones where md was genuinely newer. That silently reverted a real vector-side update to stale markdown content in production use. A conflict is now reported and left untouched unless --force explicitly says markdown wins.
- **`src/storage/mdVectorSync.ts`** (Exports: `SyncOptions, SyncResult, computeMemoryHash, cleanTmpFiles, cleanAllTmpFiles, syncMdWithVector`): Entries present on both sides with genuinely different content, left untouched. Neither store has a reliable last-modified signal — `.md` frontmatter has no `updatedAt`, and a normal `memory update` never touches `createdAt` on either side — so there is no safe way to guess which side is fresher. Guessing here is what caused a real regression: a legitimate vector-side update silently reverted to stale markdown content because their (unchanged, identical) `createdAt` values tied. Resolve explicitly with `--force` (markdown wins, matching its documented "force re-embed" semantics) after inspecting the conflict.
- **`src/storage/multiRootMdStorage.test.ts`**: Source file multiRootMdStorage.test.ts (Methods: keys(), describe(), join(), now()) exports primary project types and helper functions.
- **`src/storage/multiRootMdStorage.ts`** (Exports: `MultiRootMdStorage`): Fans a single `MdStorage` surface out across every root a category's `categories.<name>.path > storage.path > '.neuron'` chain resolves to (ticket 05). Chosen over teaching `MdStorageAdapter` itself to resolve per-category: each resolved root keeps its own plain, single-root adapter underneath — unchanged internals, unchanged path-traversal containment (`getFilePath`'s sanitization still runs per adapter, so a malicious category name still can't escape its own resolved root) — and this class is just a thin lookup in front of a small, lazily-populated registry of them, keyed by resolved absolute directory so two categories sharing a root share one adapter instance (and one `readdirSync`, if it ever needs one). `overrideRoot`, when set, pins every category to one literal root, bypassing config resolution entirely — the same escape hatch `handleSyncCommand`'s `overrideStoragePath` parameter already gave callers before this ticket.

### 🧩 ui (`src/ui`)
Primary ui module containing core application capabilities.

**Key Components & Export Contracts:**
- **`src/ui/html.ts`** (Exports: `generateDashboardHtml`): Function generateDashboardHtml in html.ts (Methods: generateDashboardHtml(), rgba(), var(), Header()) handles utility and command processing.
- **`src/ui/progress.test.ts`**: Source file progress.test.ts (Methods: describe(), it(), PassThrough(), on()) exports primary project types and helper functions.
- **`src/ui/progress.ts`** (Exports: `ScanProgress, ScanProgressBarOptions, ScanProgressBar`): Class ScanProgressBar in progress.ts (Methods: update(), max(), round(), repeat()) manages module operations and interface contracts.
- **`src/ui/server.ts`** (Exports: `UiServerOptions, UiServer, startUiServer`): The primary purpose of this code file is to establish a simple HTML server using the `http` package. The server has four HTTP methods: GET, POST, PUT, and DELETE. The memory is defined as an example of neuron memory for performance tuning. The configuration file defines port number and closed delay

### 🧩 e2e (`test/e2e`)
Primary e2e module containing core application capabilities.

**Key Components & Export Contracts:**
- **`test/e2e/adversarial-corpus.ts`** (Exports: `AdversarialFamily, AdversarialCase, buildFiller`): Adversarial retrieval corpus. The baseline recall pillar scores 1.0 because its distractors are only lexically noisy — templated strings that share vocabulary but are semantically unrelated, which hybrid search separates trivially. A metric pinned at its ceiling can detect a regression but can never show an improvement, and it predicts nothing about real retrieval quality. These cases are built to be genuinely hard, in four families: lexical-decoy  the wrong answer shares MORE query keywords than the right one, so keyword scoring alone picks the decoy paraphrase     near-miss neighbours that are topically identical but answer a different question contradiction  an outdated memory superseded by a newer one; the newer must win multi-hop      the query names none of the gold's salient terms and must be bridged conceptually
- **`test/e2e/adversarial-recall.test.ts`**: Pillar 7 — Adversarial Retrieval Quality. Runs the real embedder against hard negatives engineered to beat the gold answer on keyword overlap, topical proximity, or staleness. Unlike the baseline recall pillar this is expected to sit below ceiling: the point is a metric with headroom that can move in both directions when retrieval changes. Thresholds are therefore deliberately loose — this pillar earns its keep as a tracked score, not as a tripwire.
- **`test/e2e/benchmark-suite.test.ts`**: Neuron Deep E2E Benchmark & Correctness Suite. This suite is deliberately NOT a unit test. It exercises the real production pipeline end to end — the real ONNX embedder and the real Qwen1.5-0.5B code summarizer — and records latency distributions alongside its assertions. IMPORTANT: vitest sets NODE_ENV=test, and both summarizer.preloadModel() and summarizer.summarizeFile() short-circuit on that value. Left alone, the whole suite would silently benchmark a string-heuristic fallback instead of the product, which is why the previous revision "passed" its SLAs by ~40x while completing in seconds. Pillar 6 exists to keep that regression from reappearing. ESM hoists the imports below above these assignments, which is fine: both flags are read at call time (inside summarizeFile / NeuronMemory.open), not at module evaluation, so setting them here still takes effect for every test.
- **`test/e2e/concurrency-stress.test.ts`**: Pillar 8 — Multi-Process Contention & Crash Recovery. Spawns real OS processes against one SQLite file. The original concurrency pillar ran `Promise.all` over a single in-process NeuronMemory handle, which shares one connection and one WAL writer — it can never produce cross-process lock contention, torn writes, or a dirty WAL, so "0 failures" there said nothing about multi-agent safety. Checks, in order of severity: 1. lost writes    — every committed record must be readable afterwards 2. lock handling  — SQLITE_BUSY is acceptable if surfaced, not if it eats data 3. crash recovery — SIGKILL mid-write must leave a readable, uncorrupted store
- **`test/e2e/enrichment-corpus.ts`** (Exports: `ImportanceLabel, LabelledEntry, CategoryCase`): The polarized corpus for the enrichment pillar. Discrimination is measured against entries that are unambiguous at both ends, so the corpus design supplies the labels and no human labelling session is required. There is deliberately no middle tier: whether a "4" is objectively a 4 is out of scope, but whether a note about irreversible data loss outranks a note about tab width is not a judgement call.
- **`test/e2e/enrichment.test.ts`**: Pillars 10-12 — Write-side enrichment. Pillar 10 was Importance Inference & Prune Safety and measured both halves. The inference half is gone: it measured the judgement as noise (discrimination -0.5 then +0.167, per-entry stability 0.5, a production-data-loss note rated `1`), the job shipped `off` on that evidence, and ticket 26 removed it. The prune-safety half is kept and is now the whole pillar, because ticket 23 left the underlying hazard live: the entry default and the `neuron memory prune` ceiling are both 3 and the comparison is inclusive. Runs against the real Qwen1.5-0.5B model. It is disabled under NODE_ENV=test, so this suite is the only place these jobs can be measured at all.
- **`test/e2e/metrics.ts`** (Exports: `PillarMetrics, percentile, MetricsRecorder`): Latency/throughput recorder for the E2E benchmark suite. The suite is both a correctness gate and a benchmark, so every pillar records real measurements here rather than only asserting pass/fail. The collected numbers are written to a metrics file that the runner merges into its scorecard — the runner never has to infer results by scraping stdout.
- **`test/e2e/synthetic-generator.ts`** (Exports: `SyntheticGeneratorOptions, generateSyntheticPolyglotWorkspace`): Class SyntheticClass in synthetic-generator.ts (Methods: generateSyntheticPolyglotWorkspace(), rmSync(), mkdirSync(), writeFileSync()) manages module operations and interface contracts.
- **`test/e2e/tier.ts`** (Exports: `BenchTier, byTier`): Benchmark tiering. The same pillar definitions run at two very different intensities: sanity — a fast pre-merge gate. Every pillar still executes end to end against the real pipeline, but at the smallest workload that can still fail meaningfully. Target: a couple of minutes. full   — the adversarial benchmark. Large corpora, deep sweeps, real multi-process contention, and hard negatives designed to drive scores off their ceiling. Target: long enough to hurt. Tier is selected with NEURON_BENCH_TIER; anything other than 'full' is treated as sanity so a bare `vitest run` on these files stays quick.

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

---
id: a827c671-1253-4d79-8c3e-4a72d975d599
createdAt: 2026-08-05T00:39:17.537Z
importance: 4
tags:
  - wayfinder
  - 2.2.0
  - rc2
taskId: null
---
Renamed the .scratch/neuron-harness-expansion wayfinder map to .scratch/neuron-2.3.0 and redrew its destination as a catch-all next-release map rather than a single-theme effort, by maintainer decision on 2026-08-04. The original map was split off from neuron-2.2.0 the same day carrying only the Copilot CLI/Cursor adapters plus the compatibility-disclosure surface, and a second config-ergonomics effort would have meant three concurrent maps; folding new next-release work into one 2.3.0 map avoids that while keeping wayfinder's one-ticket-per-session discipline, since a looser destination widens what may be admitted rather than how much a session takes on. The map now charters two independent bands - harness expansion (tickets 01-03) and config vocabulary (05-06) - with the cut ticket 04 blocked by all five and its version settled as 2.3.0 rather than left open. All inbound links from neuron-2.2.0's map and its six out-of-scope tickets were repointed to the new path.

---
id: ac92302a-c243-4de3-98d3-8ec5237093b5
createdAt: 2026-08-05T00:39:26.779Z
importance: 4
tags:
  - adr
  - enrichment
  - rc2
taskId: null
---
Chartered neuron-2.3.0 tickets 05 (per-category storage path) and 06 (per-category storage mode, split removed) as a sequenced config-vocabulary band, with 06 blocked by 05 rather than running them in parallel. Both express the same three-step precedence chain - categories.<name>.<setting> > storage.<setting> > default - so 05 builds the single resolver and 06 reuses it instead of a second copy of the rule; 05 also has to move storage.path's Zod .default('.neuron') into that resolver, because leaving the default in the schema makes 'the top level is empty' unrepresentable downstream. Ticket 06's central finding is that split is not a third storage behaviour at all: DualStorageRouter.transact branches on split before ever consulting categories[cat].storage, so split is a flag meaning 'honour the overrides' - which makes deleting it a compatibility decision first, since an existing mode:md config carrying a previously-inert per-category vector value silently changes behaviour under md mode's strict mirror, which deletes index entries absent from markdown.

---
id: 384124c4-71e1-4d6c-b2bf-54d93d34efba
createdAt: 2026-08-05T00:52:35.435Z
importance: 5
tags:
  - retrieval
  - rc2
  - benchmark
taskId: null
---
Chartered a context-cost band (tickets 07-10) on the neuron-2.3.0 map to answer whether neuron's recall hook is worth the context it consumes, and blocked the harness band (01, 02) on it by maintainer decision 2026-08-04. The framing finding is that gross token-equivalence is not a winnable claim - injected tokens cost what they cost - so the band targets three narrower claims in ascending order of cost to prove: a bounded and disclosed per-session cost, an injection that is not mostly restating already-resident context, a net-negative resident footprint, and only then a counterfactual task A/B. The measurement gates the adapter work because building two more best-effort adapters before the cost question is answered widens the surface rather than the value, and ticket 03's disclosure surface has a context-cost column it cannot fill until ticket 07 produces the number. Nothing existing measures this: benchmark pillars 1-9 and the LongMemEval work both measure retrieval quality, not token economics.

---
id: b7c596e9-a5c9-4a80-91fe-10d96b0792bf
createdAt: 2026-08-05T03:47:01.912Z
importance: 5
tags:
  - rc2
  - adr
  - 2.2.0
taskId: null
---
Neuron's recall hook now enforces a per-epoch character budget (default 18000 chars, ~6000 tokens at a conservative 3 chars/token) rather than only the existing per-injection caps, resolving neuron-2.3.0 ticket 07. An epoch is the span between session start or the last compaction and the next context-reset, not the whole session, because context-reset deletes everything neuron previously injected (ADR 0014 section 5) so re-injection after a compaction is recovery rather than repetition - the budget therefore resets when the epoch rolls rather than accumulating across a whole session, which was a deliberate tradeoff: it leaves cumulative session cost unbounded (though now disclosed via neuron status) in exchange for not letting long, memory-dependent sessions go permanently silent after they compact. On exhaustion the hook hard-stops rather than decaying the per-turn budget, because the hook's stdin carries only session_id and prompt with no signal indicating how much of the epoch remains, so any decay curve would be a guess rather than a measured policy. The session ledger file (src/harnesses/ledger.ts) was restructured so clearLedger's file deletion became rollEpoch, an archive-then-reset that preserves each finished epoch's cost in a history array on the same file the dedupe set already lived in, since both concepts share identical per-session, per-epoch scope.

---
id: 855d13c8-41a6-4414-99f5-b961a9106cf1
createdAt: 2026-08-05T04:05:35.658Z
importance: 4
tags:
  - wayfinder
  - 2.2.0
  - rc2
taskId: null
---
Ticket 08 (Injection Redundancy Audit) cannot sample real session data yet: ticket 07's per-session telemetry format (rollEpoch, chars/turns/history in src/harnesses/ledger.ts) had never run against a committed build, and the two pre-existing real ledger files for this repo predate the rewrite (old injectedIds-only format, 2 sessions, 5 entries, skewed away from history). Ruling: ship ticket 07's code now and wait for real usage to accumulate telemetry, rather than reconstructing evidence from past queries or widening 'real' to mean this map's own wayfinder sessions — the latter two would let 08 proceed immediately but at the cost of the audit being honest about its evidence source, and the band's stated failure-direction preference throughout neuron-2.3.0 is to err toward the more defensible, harder-to-dispute measurement. Ticket 12 formalizes the wait as a blocking ticket with its own adequacy threshold (session/epoch count plus confirmed history-category coverage), rather than leaving 08 claimed indefinitely on an informal note.

---
id: 07187d81-16f9-4cd4-b855-b48b8c112456
createdAt: 2026-08-05T13:19:01.449Z
importance: 4
tags:
  - adr
  - rc2
  - wayfinder
taskId: null
---
ADR note for wayfinder ticket 44 (SQLite Additive Auto-Migration for Declared User-Defined Fields), amending ADR 0013's field-schema design. Design choice: declared-field SQLite columns are added via an eager, idempotent, additive-only migration that diffs neuron.yaml's current field declarations against PRAGMA table_info(memories) on every store-open, rather than being folded into the existing user_version-gated migration sequence in src/index.ts -- because the column set tracks live per-project config, not a fixed released schema version, so a version counter is the wrong gate for it. A field removed from neuron.yaml orphans its column rather than dropping it, matching ticket 38's precedent that column removal is always an explicit, reviewed migration, never automatic -- the asymmetry is deliberate: adding a column is safe and reversible by ignoring it, dropping one is not. Column identifiers (camelCase field key to snake_case, via a new fieldKeyToColumnName in src/config/neuronYaml.ts) are validated against a strict allowlist at three separate points -- config load time in validateNeuronYaml, and again immediately before each DDL/DML interpolation site in src/index.ts -- rather than trusted from a single call site, because the value is interpolated into SQL text rather than bound as a parameter. Config-load validation also gained two new checks beyond ticket 43's reserved-CLI-flag check: a declared field's column cannot collide with one of the memories table's own fixed columns (content and createdAt->created_at are real collisions that the reserved-flag check does not catch, since neither --content nor --created-at is a reserved flag), and two different field keys cannot fold to the same column name (verified with a real colliding pair, fooBar and FooBar). A significant scope decision made while implementing rather than deferred to a future ticket: NeuronMemory.query() never returned the fields property in any storage mode before this ticket, including md, because DualStorageRouter.query() always delegates to the SQLite-backed vectorDb.query() regardless of mode (this is ADR 0011's retrieval-parity-by-construction design), and nothing populated field columns there until now -- ticket 43's own round-trip tests only exercised MdStorageAdapter.readCategory() directly, a code path no CLI command, hook, or recall path actually calls. Judged this in-scope for ticket 44 rather than a separate ticket, since 'give vector-only/split parity with md' is meaningless if the shared read path never surfaces fields for any mode -- fixing queryVector's two SELECT statements closes the gap for every mode at once, not just vector-only/split. Explicitly deferred rather than fixed in the same pass: mdVectorSync.ts's computeMemoryHash still excludes declared fields from its change-detection hash, so a hand-edit to only a field's frontmatter value will not trigger an md-mode reconcile resync -- this is judged orthogonal to ticket 44's vector-only/split column work, since those modes never go through hash-based reconcile at all, and is left for whoever next touches the reconcile engine.

---
id: 64cbd624-690b-4b19-bc86-23b6f397df34
createdAt: 2026-08-05T19:38:54.210Z
importance: 4
tags:
  - wayfinder
  - 2.2.0
  - rc2
taskId: null
---
Decision (2026-08-05, wayfinder repositioning): neuron-2.2.0's map dropped its separate rc5 cut ticket (34) at the maintainer's direction and cuts v2.2.0 stable directly from rc3 plus trunk's rc5 work, with no intermediate rc5 tag or publish. Ticket 46 (neuron status --check/--repair) closed out of scope the same session and continues unchanged as neuron-2.3.0's ticket 13, since the validation surface it reopens was never load-bearing for the three pillars (deterministic Claude Code/Codex recall, md-first storage, deterministic scanning) the destination narrowed to on 2026-08-04. 34's still-live verification obligations (CHANGELOG leading with the default storage-mode change, md/vector parity statement, tarball-content and cold-latency re-checks) were folded into 21's scope rather than dropped, matching the precedent already set when rc4 was cut from the path.

---
id: 02cd8992-021a-4eac-b745-0e5fffb3f61e
createdAt: 2026-08-05T19:39:06.206Z
importance: 5
tags:
  - rc2
  - wayfinder
  - longmemeval
taskId: null
---
Decision/ADR amendment (2026-08-05, v2.2.0 cut): Pillar 7 (Adversarial Retrieval Quality) failed 4/4 consecutive npm run test:e2e runs during release verification, getting progressively worse each run (recall@5 0.5 to 0.375 to 0.25). Root cause was NOT a product regression: test/e2e/adversarial-recall.test.ts (ticket 47, previously unclaimed) lacked the package.json isolation guard ticket 42 already established elsewhere, so NeuronMemory.open(workDir) walked up past the unmarked workDir and wrote the ~2,600-entry adversarial corpus into this repo's real .neuron/learning.md on every run, and each run competed against every prior run's leftovers. Fixed by adding the guard. Isolated, Pillar 7 became perfectly deterministic (MRR 0.29375 every run, confirmed across 4 repeated runs with zero .neuron diff). A second, real but much smaller issue was underneath the pollution: that clean MRR sits just under the pillar's own 0.3 bar, because the bar was set at 2.1.0 when score still blended importance into ranking (golds are tagged importance:4 for exactly that boost) -- ticket 27 found the blend was itself a ranking defect and ticket 41 correctly removed it, so the boost's disappearance is by design, not regression. Ticket 41 rewrote six unit tests to match but never ran the E2E suite, so this one test's bar was the one place it wasn't re-validated. Recalibrated the MRR floor to 0.25, below the measured deterministic baseline, same measure-first precedent as ticket 39. Full suite re-verified at this map's long-standing baseline of 12/13 pillars, Pillar 8 (multi-process contention) the sole remaining known pre-existing failure.

---
id: 27a81784-8831-4376-b603-60b4affdee05
createdAt: 2026-08-08T03:09:38.225Z
importance: 4
tags:
  - rc2
  - retrieval
  - wayfinder
taskId: null
---
Ticket 08's redundancy measure (neuron-2.3.0, injection redundancy audit) uses embedding max-similarity, not lexical overlap, and its failure mode is chosen to overstate redundancy -- this overrides the ticket's own literal Scope text, which asked for the opposite (understating). Rationale: understating redundancy is the flattering direction (it makes neuron look less wasteful when the measure errs), which directly contradicts the ticket's own adjacent sentence that an audit flattering the product is worthless, and it broke consistency with the band-wide posture ticket 07 already set and the map's Notes restate -- erring toward overstating neuron's own cost so any favorable claim survives scrutiny. Put to the maintainer directly on 2026-08-07 and ruled to follow the band-wide posture. Practically this means redundancy is measured as cosine similarity via neuron's own bge-small-en-v1.5 embedder between each injected entry and a resident corpus of CLAUDE.md plus full git log, with a threshold of 0.70 (the top edge of the embedder's own established noise floor from ticket 39) used as the confidently-redundant bar rather than a lower cutoff that saturates at 100 percent and loses discriminating power.

---
id: db6b1ba0-3946-4c4d-a927-bfa38891557e
createdAt: 2026-08-08T03:33:44.629Z
importance: 4
tags:
  - rc2
  - 2.2.0
  - wayfinder
taskId: null
---
Ticket 9 (neuron-2.3.0 map, Shrink the Resident Footprint) ruled compress-and-disclose over reopening ADR 0014. Per-section measurement of generateProtocolBlock's deterministic output found the metadata-flags section alone was 728 of 2,323 chars (31%) and written as discursive rationale rather than an executable rule, so it was rewritten as a 3-bullet reference list; lighter trims landed on failureFixStep and sessionEndStep. Net result: 2,323 to 1,832 chars deterministic and 2,759 to 2,268 fallback, a 491-char (~123 token, 21%) saving identical on both variants since the compressed sections are shared, with the hook-install relative saving over fallback unchanged (~436 chars/~109 tokens). Option 2 (moving neuron exec's Command Execution step into a hook) was evaluated and explicitly declined this session after confirming ADR 0014 makes no mention of neuron exec or pre-command wrapping at all, meaning that move would be a scope expansion of the ADR rather than an extension of it, so it stays in the map's Not yet specified fog for a future ticket rather than being decided ad hoc inside 09. The resulting ~450-token deterministic / ~570-token fallback floor is handed to ticket 03 for disclosure and ticket 04 for audit as an honest constant of ADR 0014's write-side division, not a defect.

---
id: 96f38d09-dca6-4b90-8486-e88b804b84d5
createdAt: 2026-08-08T03:58:32.981Z
importance: 4
tags:
  - rc2
  - 2.2.0
  - wayfinder
taskId: null
---
Ticket 10's counterfactual A/B tests neuron's memory CONTENT (the .neuron/*.md files plus a system-prompt pointer note) rather than exercising the live hook/CLI installation path, because running the built neuron CLI inside 24 sandboxed Claude API sessions would conflate build/model-download infra reliability with the effect being measured, and tickets 07-09 already measured the hook/CLI's injection cost directly. Both arms are git worktrees pinned to the same commit with CLAUDE.md stripped from both (it assumes a working neuron binary this sandbox does not provide); the only difference between arms is .neuron/ presence plus the pointer note in the memory arm. Claude Sonnet 5 was chosen over Haiku 4.5 as the harness's driver model at the maintainer's explicit tradeoff call, since neuron's hook targets Claude Code/Sonnet-class agents in practice and a weaker driver risks conflating model capability with the memory effect the A/B is meant to isolate.

---
id: 31ac5812-4275-4e20-806c-93588fed3b42
createdAt: 2026-08-08T04:29:57.484Z
importance: 5
tags:
  - rc2
  - wayfinder
  - retrieval
taskId: null
---
Ticket 10's counterfactual token A/B (24 real Claude Sonnet 5 sessions, 4 tasks x 2 arms x 3 repeats, cost $5.20) found no measured token difference between neuron-memory and no-memory arms, and a HIGHER failure rate for the memory arm (33% vs 17%) driven entirely by two repeats where a superseded entry in .neuron/decisions.md outcompeted the later entry that reverses it -- the memory arm called the importance/prune-threshold collision 'a bug' in 3/3 repeats despite the pruning-defaults-intentional entry ruling it deliberate, and separately cited ticket 24's original 'ticket 25 ships scoped-down' resolution without finding the later pruning-ab-verdict entry that says ticket 25 was pushed off entirely. Zero repeats went the other direction. This is a concrete, measured instance of the confidently-wrong-retrieval and write-side-capture-gap risks this project's own fog already flagged as theoretical. Full findings at .scratch/neuron-2.3.0/audits/10-counterfactual-token-ab/findings.md; do not disclose a favorable token claim from this run.

---
id: 16c3979e-749e-4bf3-9376-2cbde2fcc7d1
createdAt: 2026-08-08T04:49:42.472Z
importance: 5
tags:
  - rc2
  - wayfinder
  - longmemeval
taskId: null
---
Maintainer decision 2026-08-07: ticket 10's unfavorable A/B finding (memory arm failure rate higher than no-memory control, both cases a superseded decisions.md entry outcompeting its own reversal) graduates the neuron-2.3.0 map's 'capturing a maintainer decision, not just an agent action' fog into ticket 16 (Memory Supersession), which now blocks ticket 04 (cut-and-publish) -- 2.3.0 does not ship until superseded entries stop outcompeting their corrections. Explicitly ruled: a ticket's resolution stands even when the A/B result is unfavorable (the maintainer confirmed 'closing only on favorable results' would defeat the purpose of running the test); the fix belongs in a new ticket with its own unbiased resolution criterion, not in reopening or gating ticket 10 itself. Ticket 16 is explicitly scoped as supersession (mark old entries as non-surfacing without deleting them), not a reopening of neuron-2.2.0's automatic pruning, which ticket 24 already killed after the shipped 0.5B model false-deleted ground-truth-unrecoverable entries including ADRs.

---
id: 06f277bd-549c-40b5-a279-42fba65ad453
createdAt: 2026-08-08T05:07:00.815Z
importance: 5
tags:
  - rc2
  - adr
  - wayfinder
taskId: null
---
ADR 0015 (Memory Supersession): resolved neuron-2.3.0 ticket 16 via grilling session with the maintainer, all six Scope items decided. Supersession triggers as a hard block on 'neuron memory add' when the resident embedder (no model call) finds high similarity to an existing entry, requiring the agent to resolve via --supersedes <old-id> or an explicit override before the write lands -- never a standing CLAUDE.md protocol step, and never automatic model-inferred detection (same negation-detection weakness that killed 2.2.0's dedupe ticket). Superseded entries hard-exclude from default neuron memory query / neuron exec recall but are never deleted, matching ADR 0010 section 6's existing precedent; demotion-by-score was rejected because ticket 27 found the same-topic cosine band sits at ~0.97 with no calibrated intermediate range. Schema gets dedicated superseded_by/superseded_at columns rather than reusing the generic per-category fields mechanism (ticket 43/ADR 0013), since the read-path filter must apply unconditionally regardless of category. The mechanism is one-way only with no undo command -- a wrong mark is corrected by writing a new forward-linking entry, not reversed. The two known-reversed pairs ticket 10 found in this repo's own .neuron/decisions.md (prune-default-collision, pruning-ab-verdict) are hand-fixed as a one-off data correction, not built into a reusable migration tool. Supersession stays fully orthogonal to importance and pruning -- confirmed, not touched. Implementation graduated to ticket 17; ticket 04 (cut-and-publish) rewired to block on 17 instead of the now-resolved 16.

---
id: 3f2c0a2b-50e5-42d7-925e-bc9d8c7d6f2c
createdAt: 2026-08-08T05:25:11.049Z
importance: 3
tags:
  - enrichment
  - importance
  - adr
taskId: null
---
Maintainer decision 2026-08-01: the default-importance-3 / default-maxPruneImportance-3 collision ticket 23 framed as a hazard is deliberate, not a bug to be fixed by separating the defaults. History should clear out by default unless an entry is explicitly marked important enough to survive a prune -- the opposite framing from treating the collision as an accident to close via a config change. If ticket 25 (per-category prune config) is ever picked back up, only the automatic-trigger question and the accidental exposure of the decisions category (ADRs sitting at the same importance-3 default with no category-scoped protection) need fixing; the collision itself is not to be 'resolved' by separating the defaults. As of the later ticket-25-pushed-off ruling, pruning stays manual-only (neuron memory prune), so this default currently has no live automatic effect -- it only matters once a user actually runs that command.

---
id: a0de113f-a0b7-47f1-a102-0d952824b61f
createdAt: 2026-08-08T05:25:18.822Z
importance: 3
tags:
  - enrichment
  - rc2
  - wayfinder
taskId: null
---
Maintainer decision, after ticket 24's pruning A/B verdict (2026-08-01): ticket 25 (per-category prune config plus the default-collision fix) is pushed off entirely for now, superseding ticket 24's own resolution that it would ship its config-schema and collision-fix scope only. Pruning stays at the manual 'neuron memory prune' command, unchanged, with no automatic trigger and no per-category config surface added. Do not restart ticket 25 work without the maintainer raising it again.

---
id: d7250210-a62e-4c45-933b-b915b347d466
createdAt: 2026-08-08T05:26:58.514Z
importance: 4
tags:
  - adr
  - rc2
  - wayfinder
taskId: null
---
Ticket 17 implementation choices not fully specified by ADR 0015, decided during execution: (1) the write-time similarity gate searches across ALL categories, not just the target one, because category is only resolved by write-side enrichment AFTER the gate must already have run, so scoping to an inferred category would require running enrichment twice; (2) already-superseded rows are excluded from gate candidacy (WHERE superseded_by IS NULL) so a live entry can't be marked as reversing a row that is itself already stale; (3) no new 'neuron memory get <id>' CLI surface was added for ADR 0015's 'direct id lookup' promise -- update/delete already select unfiltered by superseded_by, and a new findById() method on NeuronMemory covers --supersedes's internal resolution need, so the promise is satisfied at the storage layer without a new command; (4) reconcile/sync/bootstrapSeed's internal vectorDb.query() calls now all pass includeSuperseded:true and computeMemoryHash includes supersededBy in its payload, because a store-management read or hash that treats a superseded row as absent or unchanged would silently break the markdown hand-fix workflow ADR 0015 Decision 5 depends on. Ticket 18 (re-run ticket 10's counterfactual A/B) is next and is deliberately not self-graded by this ticket.

---
id: 946bf285-7927-4e34-8f88-feeb44868ca7
createdAt: 2026-08-08T12:41:02.699Z
importance: 4
tags:
  - rc2
  - wayfinder
  - 2.2.0
taskId: "01"
---
Ticket 01 (Copilot CLI adapter, neuron-2.3.0): maintainer scrutinized and confirmed keeping the session-start-only adapter as built, rather than dropping it for disclosure-only or deferring the call. Coverage is narrower than it sounds: session-start only ever queries the architecture category (max 3 results, once per session) since pre-prompt never fires on Copilot (userPromptSubmitted is documented notification-only) -- the entire per-turn, query-relevant recall value proposition ticket 10/18's A/B actually measured on Claude Code/Codex is absent here. The adapter is safely additive though: deriveFidelity() correctly reports best-effort, so the protocol block never drops Copilot's full fallback instructions, meaning the hook can't leave a user worse off than no hook at all. Its value is unmeasured -- no A/B has tested this thinner session-start-only slice specifically -- so a future session should not treat 'keep as built' as validated by evidence, only as a maintainer judgment call made without one.

---
id: 01306079-ea89-4008-959f-3b84825ba9d7
createdAt: 2026-08-08T12:56:13.779Z
importance: 5
tags:
  - release
  - 2.2.0
  - failure-fix
taskId: null
---
Wayfinder epic release cadence: at the end of a wayfinder epic (map), merge everything back to main; at the start of a new epic, cut a fresh branch off main rather than continuing on the old one. This addresses a real problem hit on 2026-08-08: the working branch (feat/2.2.0-tree-sitter-grammars) had drifted 9 commits behind main and never merged back, so main sat stale at v2.1.6 while all real release work (2.2.0, then 2.3.0) happened on a differently-named feature branch, and a separate .scratch/2.1.x-hardening effort landed real bug fixes on main that never made it back into the epic branch until a manual reconciliation merge.

---
id: 33072cbe-beff-4982-8f09-d11007536c50
createdAt: 2026-08-08T13:54:11.473Z
importance: 4
tags:
  - 2.2.0
  - rc2
  - wayfinder
taskId: "02"
---
Ticket 02 (Cursor adapter, neuron-2.3.0) implementation choices not fully specified by its Scope, decided during execution: (1) context-reset IS wired to preCompact even though a direct fetch of cursor.com/docs/hooks found its stdin carries no session_id field at all, unlike sessionStart's -- rollEpoch never fires as a result, but the hook still gives real, truthful verify() firing evidence and costs nothing to install, so it is wired with an honest capability caveat rather than left unwired the way Copilot's context-reset was (Copilot has no compaction-equivalent event at all, a different root cause for the same practical gap). (2) version: 1 is written on a hooks.json neuron creates fresh, unlike Copilot's adapter which deliberately never invents a version field -- the difference is that Cursor's own documented schema names version as a real top-level field, so setting it there is not inventing schema the way it would be for Copilot. (3) Real-install verification, including the cloud/background-agent hole ticket 02's Scope calls out, was split into ticket 22 rather than left open-ended on ticket 02, following the same split-verification-from-build precedent ticket 20 set for ticket 01 -- Cursor is not installed on this machine.

---
id: c4ab3275-336c-401d-bd88-16d1491e70e4
createdAt: 2026-08-08T15:28:28.634Z
importance: 4
tags:
  - md-storage
  - adr
  - rc2
taskId: null
---
Ticket 05 (neuron-2.3.0, per-category storage path) design rationale, settled with the maintainer before implementation: (1) MdStorageAdapter stays a single-root class unchanged; a new MultiRootMdStorage is a thin adapter-per-root registry (Map<root, MdStorageAdapter>) rather than teaching the adapter to resolve paths internally, keeping the existing path-traversal containment guarantee scoped per adapter instance. (2) Absolute per-category paths are allowed, matching storage.path's pre-existing behavior -- refusing them was considered and declined. (3) Path-change safety: a category's resolved root changing between runs does NOT trigger a physical file move. Instead a new per-category md_root:<category> meta key (extending bootstrapSeed's existing md_seeded_at pattern) detects the change and re-exports that category from the SQLite vector index -- the trustworthy source -- into its new location. The old file is left orphaned on disk untouched, never deleted or renamed; a 'plain relocate' alternative was explicitly declined because it can't handle a category that was never on disk (e.g. started as vector-mode) without the same before/after tracking anyway. (4) A path set on a category whose storage resolves to vector (ticket 06) warns and is ignored rather than erroring, so a category flipping from md to vector storage doesn't need to remember to also delete path. Also: storage.path's Zod .default('.neuron') was removed (now optional, undefined by default) so 'top-level unset' is representable and the categories.<name>.path > storage.path > '.neuron' precedence chain lives entirely in one resolver function (src/config/categoryPath.ts) rather than being partially baked into the schema. ADR write-up covering both ticket 05 and ticket 06's combined storage-vocabulary changes to ADR 0011 is deferred to whichever of the two lands second, per the ticket's own instruction -- 05 landed first, so 06 owes it.
---
Ticket 05 (neuron-2.3.0, per-category storage path) design rationale, settled with the maintainer before implementation: (1) MdStorageAdapter stays a single-root class unchanged; a new MultiRootMdStorage is a thin adapter-per-root registry (Map<root, MdStorageAdapter>) rather than teaching the adapter to resolve paths internally, keeping the existing path-traversal containment guarantee scoped per adapter instance. (2) Absolute per-category paths are allowed, matching storage.path's pre-existing behavior -- refusing them was considered and declined. (3) Path-change safety: a category's resolved root changing between runs does NOT trigger a physical file move. Instead a new per-category md_root:<category> meta key (extending bootstrapSeed's existing md_seeded_at pattern) detects the change and re-exports that category from the SQLite vector index -- the trustworthy source -- into its new location. The old file is left orphaned on disk untouched, never deleted or renamed; a 'plain relocate' alternative was explicitly declined because it can't handle a category that was never on disk (e.g. started as vector-mode) without the same before/after tracking anyway. (4) A path set on a category whose storage resolves to vector (ticket 06) warns and is ignored rather than erroring, so a category flipping from md to vector storage doesn't need to remember to also delete path. Also: storage.path's Zod .default('.neuron') was removed (now optional, undefined by default) so 'top-level unset' is representable and the categories.<name>.path > storage.path > '.neuron' precedence chain lives entirely in one resolver function (src/config/categoryPath.ts) rather than being partially baked into the schema. ADR write-up covering both ticket 05 and ticket 06's combined storage-vocabulary changes to ADR 0011 is deferred to whichever of the two lands second, per the ticket's own instruction -- 05 landed first, so 06 owes it.

---
id: 617331af-9dae-4bf3-a2a9-02487431eee5
createdAt: 2026-08-08T23:06:34.366Z
importance: 3
tags:
  - md-storage
  - adr
  - enrichment
taskId: null
---
ADR 0016: Per-Category Storage Vocabulary (path and mode). Both storage.path and storage.mode are now overridable per category with matching precedence chains (categories.<name>.X > storage.X > default), converging the previously-separate split-mode gating into one always-live per-category resolver. split is deleted as a top-level mode and aliases to md (not vector) to reproduce its own pre-existing per-category default byte-for-byte; vector-only is renamed vector to converge with the per-category vocabulary. Rationale for warn-not-refuse on the md-to-vector upgrade path: ADR 0011 section 7's precedent (a config that errors on upgrade turns a rename into an outage) was set for a rename where behaviour was unchanged, but this is a real behaviour change, so the precedent was re-argued rather than cited -- the ruling stayed the same (warn on stderr, never touch the user's files or config automatically) once the real data-loss risk was closed by a separate reseed-on-first-sighting fix in DualStorageRouter. Full rationale in docs/adr/0016-per-category-storage-vocabulary.md.
