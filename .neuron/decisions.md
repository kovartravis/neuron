# Category: decisions

---
id: 09ab7e3e-afc9-4740-a7f5-d31a1a3177eb
createdAt: 2026-07-29T12:38:28.023Z
importance: 4
tags:
  - adr
  - db
taskId: null
supersededBy: 25959b56-2e3b-43f3-b490-b0600e7f81e6
supersededAt: 2026-08-12T02:24:27.692Z
---
Use SQLite WAL mode for concurrency

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
supersededBy: 25959b56-2e3b-43f3-b490-b0600e7f81e6
supersededAt: 2026-08-12T02:24:27.692Z
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
supersededBy: 25959b56-2e3b-43f3-b490-b0600e7f81e6
supersededAt: 2026-08-12T02:24:27.692Z
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
supersededBy: 25959b56-2e3b-43f3-b490-b0600e7f81e6
supersededAt: 2026-08-12T02:24:27.692Z
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

---
id: 5ff64e25-f38e-44b2-ba9c-e95052ad9727
createdAt: 2026-08-09T11:57:24.809Z
importance: 4
tags:
  - enrichment
  - llm
  - adr
taskId: null
---
Ticket 13 (neuron-2.3.0): neuron status --check/--repair reuses write-side category enrichment's centroid machinery (buildCategoryCentroids/selectCategory from src/components/enricher.ts) for repairing missing enum-typed declared fields, rather than writing a parallel inference path — the function signature was already generic enough (a 'category' label is just a string key), so no duplication was needed. Repair strictly separates three outcomes per missing field: a configured default: (always wins, no inference), centroid inference for enum fields only (never for free-text), and unresolved (free-text with no default, or an enum field with no other labeled entry yet to build a centroid from) — the last two are never fabricated, only ever reported, per ADR 0013's 'never fabricate a free-text identity field' ruling. --check and --repair both exit 1 on remaining non-compliance, matching neuron scan --check's existing CI-gate exit-code convention rather than inventing a new one.

---
id: 54211825-8c70-49d1-8c2e-af3a886fe952
createdAt: 2026-08-09T12:20:37.058Z
importance: 4
tags:
  - rc2
  - benchmark
  - wayfinder
taskId: null
---
Grilled a new idea for neuron-2.3.0 (2026-08-09): future session work should be reliably discoverable for downstream synthesis tasks like writing the README, since today an agent only sees whatever fits the hook's per-epoch injection budget. Modeled on tickets 28-30's architecture-card index+detail-card split, but a different mechanism: instead of making detail reachable via ordinary relevance recall, the hook actively teaches the agent the neuron memory query surface exists via a conditional, per-turn, literal ready-to-run command (e.g. neuron memory query "<prompt text>" --limit 12), fired only when a cheap FTS COUNT shows the existing pre-prompt recall left a real counted gap versus what got injected -- never a static repeated note, which would hit the same redundancy ticket 08 measured against history. No session-start equivalent (ruled out as resident-but-unearned content). Store-wide scope, matching the existing pre-prompt query. Graduated three tickets: 31 (fix two independent pre-existing bugs in neuron memory list/query defaults -- oldest-first ordering, and a limit default shared between list mode and text-query mode despite answering different questions), 32 (the hint itself, blocked by 31), and 33 (measure whether the hint actually gets used and helps, blocked by 32, motivated by ticket 10's finding that the memory arm sometimes performed worse than no memory at all).

---
id: 3abdaac4-3159-45ad-b218-ef00b93efcc4
createdAt: 2026-08-09T13:07:19.196Z
importance: 4
tags:
  - wayfinder
  - rc2
  - 2.2.0
taskId: null
---
Ticket 19's synthetic counterfactual-A/B harness sources its two tasks from real SWE-bench Lite instances (astropy__astropy-12907, django__django-11133) pinned at their pre-fix base commit, rather than a hand-authored fake repo or the real SWE-bench execution harness. Pinning to base_commit gives 'answer structurally absent from the repo' for free since the fix was merged later, and borrowing only the repo/issue/gold-patch (not Docker or hidden-test execution) keeps grading a deterministic /ANSWER.md keyword check with no LLM judge, consistent with ticket 10's own no-judge rule. Task prompts are stripped to symptom-level text rather than the raw GitHub issue, because several candidate instances' real issue text already named the fix location or content -- reproducing ticket 10's own documented-answer confound was the exact failure this ticket exists to avoid, so prompt-leak became a selection/stripping criterion, not an afterthought. This is a supplement to the real-repo run (tickets 10/18), not a replacement -- the real-repo arm still measures behavior on an actual messy project that no synthetic fixture can stand in for.

---
id: 64c20754-c774-4dca-95d6-44aec980b0ae
createdAt: 2026-08-09T13:52:59.896Z
importance: 4
tags:
  - wayfinder
  - 2.2.0
  - rc2
taskId: null
---
Chartered ticket 34 (Cut and Publish 2.3.0-rc2) on the neuron-2.3.0 wayfinder map, 2026-08-09, at the maintainer's request to snapshot everything on trunk since v2.3.0-rc1 into a real interim release candidate with docs audited against actual behavior. Modeled directly on neuron-2.2.0 ticket 09's own rc2 cut: because there's no per-band branch in this workflow, whatever is on trunk when an rc tag is cut is what ships, so the CHANGELOG must be written from git log v2.3.0-rc1..HEAD directly rather than assumed from the map's nominal band structure. Scoped in: the Cursor adapter (ticket 02, explicitly caveated as not yet real-install-verified), the storage vocabulary change (tickets 05/06), architecture-card work through ticket 27 (with ticket 27's own mid-band rejection by the maintainer and supersession by tickets 28-30 stated plainly, not glossed over), neuron status --check/--repair (ticket 13), and the memory list/query default fix (ticket 31). Explicitly scoped out: no benchmark findings from tickets 14/19, since neither has a live run yet. This is an interim rc, not the final 2.3.0 cut (ticket 04), so it is not wired as a blocker of 04. Found while charting: README.md's recall-fidelity section still says Cursor support is on the roadmap even though ticket 02 shipped a working CursorAdapter two commits after rc1 - a live instance of the exact claims-must-match-behavior gap this whole map exists to close - folded into ticket 34's scope alongside an audit of docs/COMMANDS.md, CONTEXT.md, and the packaged neuron-memory skill against the same trunk diff.

---
id: 6c1eb2e4-5969-4483-b26c-201d726ced1d
createdAt: 2026-08-09T17:34:45.411Z
importance: 5
tags:
  - llm
  - enrichment
  - memory
taskId: null
---
ADR 0017: category declaration authority resolved advisory-but-self-maintaining — an undeclared category auto-appends a minimal categories.<name>: {} block to neuron.yaml on its first write (via yaml's comment-preserving Document API, not plain overwrite), rather than being validated/rejected or left permanently undeclared. Inferred-category strictness (centroid/model paths) stays hard-constrained to the declared set, deliberately asymmetric with explicit --category, since inference shouldn't invent a category from embedding proximity while an explicit flag is a trusted human override. Existing undeclared categories backfill via an extended neuron status --repair rather than a standalone migration script; one hook point (NeuronMemory.transact(), src/index.ts:828) covers both neuron memory add and neuron scan since both already funnel through it.

---
id: c4d2223a-b582-4f85-94f5-1ef7f68ba21a
createdAt: 2026-08-09T17:42:12.718Z
importance: 4
tags:
  - release
  - git
  - npm
taskId: null
---
Ticket 21 (Automated npm Publish GitHub Action, neuron-2.3.0): the workflow trigger is push-to-main only (never pull_request/pull_request_target, to avoid running with repo secrets against fork-controlled branches), and dist-tag selection only recognizes -rcN prereleases (bare X.Y.Z -> latest, -rcN -> rc, anything else fails the job loudly rather than guessing) -- both maintainer calls made via AskUserQuestion rather than assumed. Split into two jobs specifically for security: build-and-test runs unconstrained on every push, while publish (needs: build-and-test, gated by environment: npm-publish) only runs npm publish/git tag -- so a required-reviewer approval on the environment (once the maintainer creates it and adds NPM_TOKEN as an environment secret) happens after test results are visible, not before. Branch protection on main (who can push/merge at all) was explicitly left for the maintainer to configure themselves via GitHub settings rather than set via gh api this session -- the environment gate is a second, independent layer on top of that, not a substitute for it. Real end-to-end verification split into ticket 36 since neither NPM_TOKEN nor the npm-publish environment exist yet.

---
id: 341d7575-fd09-f3f8-aaa9-6b1e7c1d1809
createdAt: 2026-08-09T19:13:07.979Z
importance: 5
tags:
  - architecture
  - topology
  - scan
  - deep
taskId: null
supersededBy: e1d4e4de-a20f-2d75-c34d-9d3df1116eb7
supersededAt: 2026-08-12T02:24:27.692Z
---
### 🧩 benchmarks (`benchmarks`)
Primary benchmarks module containing core application capabilities.

**Key Components & Export Contracts:**
- **`benchmarks/e2e-runner.js`**: Driver for the deep E2E benchmark & correctness suite. Pillar results come from vitest's JSON reporter and the metrics file the suite itself writes — never from scraping stdout. The previous revision inferred status with `!output.includes(name) || overallPassed`, which marked a pillar PASSED precisely when it had NOT run, so a suite that died early scored better than one that ran and failed.
- **`benchmarks/generate-dashboard.js`** (Exports: `generateDashboard`): Renders the benchmark dashboard from the artifacts the suites write. Self-contained output: inline CSS/SVG, no network fetches, no chart library. Charts use a single series hue because every plot here shows one measure across categories (magnitude), not competing identities — categorical colors would imply a distinction that does not exist. Pass/fail uses the reserved status palette and always pairs color with an icon and a text label, so state is never carried by hue alone.
- **`benchmarks/open-report.js`**: Regenerates the dashboard from whatever artifacts are on disk and opens it. Kept separate from the runner so the report can be viewed without re-running a benchmark that takes minutes.

---
id: fdcd6bb0-67d3-5589-b73d-e27e06fc560e
createdAt: 2026-08-09T19:13:08.006Z
importance: 5
tags:
  - architecture
  - topology
  - scan
  - deep
taskId: null
supersededBy: d2e6ac08-26ec-d547-852f-3e6caeead816
supersededAt: 2026-08-12T02:24:27.692Z
---
### 🧩 longmemeval (`benchmarks/longmemeval`)
Primary longmemeval module containing core application capabilities.

**Key Components & Export Contracts:**
- **`benchmarks/longmemeval/neuron.py`** (Exports: `NeuronMemoryProvider`): Methods: NeuronMemoryProvider(), embeddings(), Fusion(), __init__().
- **`benchmarks/longmemeval/relevance_gate_eval.py`** (Exports: `eval_floor, eval_full_gate, reject, pctl`): Methods: leg(), prose(), fix(), result().
- **`benchmarks/longmemeval/retrieval_eval.py`**: Methods: len(), int(), max(), get_dataset().

---
id: f86ea70a-3ba9-e98e-cde5-726e1af0c92d
createdAt: 2026-08-09T19:13:08.077Z
importance: 5
tags:
  - architecture
  - topology
  - scan
  - deep
taskId: null
---
### 🧩 commands (`src/commands`)
Primary commands module containing core application capabilities.

**Key Components & Export Contracts:**
- **`src/commands/exec.test.ts`**: Methods: describe(), join(), beforeAll(), mkdirSync().
- **`src/commands/exec.ts`** (Exports: `handleExecCommand`): Function handleExecCommand (Methods: handleExecCommand(), indexOf(), slice(), error()).
- **`src/commands/feedback.test.ts`**: Methods: describe(), join(), it(), buildGitHubIssueUrl().
- **`src/commands/feedback.ts`** (Exports: `buildGitHubIssueUrl, handleFeedbackCommand`): Function buildGitHubIssueUrl (Methods: buildGitHubIssueUrl(), URLSearchParams(), set(), toString()).
- **`src/commands/history.test.ts`**: Methods: describe(), join(), beforeAll(), mkdirSync().
- **`src/commands/history.ts`** (Exports: `handleHistoryCommand`): Function handleHistoryCommand (Methods: handleHistoryCommand(), error(), exit(), log()).
- **`src/commands/hook.test.ts`**: Methods: describe(), join(), beforeAll(), mkdirSync().
- **`src/commands/hook.ts`** (Exports: `handleHookCommand`): The architecture card, fetched two ways and combined (ticket 25): first by its stable scan id (`blueprintCardId`), so it survives category crowding — a generic ranked query can rank it out of a `limit`-sized window once enough other entries share the category, exactly `ingest.ts`'s own comment warns about, and exactly what this repo's own `scan.category: decisions` config reproduces. Structurally compressed to `cap` if it exceeds it (ticket 27/30, `compressArchitectureCard`) — every module-list line gets a chance to appear, in order, rather than truncating raw text at whatever byte offset the budget happens to land on. Whatever budget is left after the card goes to the existing top-N-in-category query, additive, since a category shared with general decision-log content (this repo's own setup) is a deliberate config choice, not a bug to route around — but (ticket 30) that query also matches real per-module detail cards, which share the same category and tags as the index post-28. Left unfiltered, a module card rides along on every `session-start` injection regardless of relevance, reproduced live against this repo's own store (the `ui` module's full card riding along on a plain `session-start` call with no prompt in play at all) — exactly the unconditional per-module detail this ticket's index/module split exists to avoid. So the additive query excludes every module card belonging to this index, not just the index's own id: module detail surfaces only through the pre-prompt relevance query (the reused-recall design), never through this always-on one.
- **`src/commands/index.ts`**: No exported symbols detected.
- **`src/commands/init.test.ts`**: The end-to-end claim ticket 31 exists to make true: the README's Quick Start, run verbatim, leaves markdown in the repo rather than an invisible database.
- **`src/commands/init.ts`** (Exports: `HarnessFidelityReport, ProtocolWriteReport, handleInitCommand`): Every harness with a real adapter.
- **`src/commands/learn.test.ts`**: Methods: describe(), join(), beforeAll(), mkdirSync().
- **`src/commands/learn.ts`** (Exports: `handleLearnCommand`): Function handleLearnCommand (Methods: handleLearnCommand(), error(), exit(), log()).
- **`src/commands/memory.supersession.test.ts`**: Methods: process(), vecAt(), Float32Array(), makeMemory().
- **`src/commands/memory.test.ts`**: A project whose config names a literal fallback category. The model is disabled under NODE_ENV=test, so the fallback is what makes the success path deterministic without loading 500M parameters.
- **`src/commands/memory.ts`** (Exports: `handleMemoryCommand`): Function handleMemoryCommand (Methods: handleMemoryCommand(), getConfig(), collectDeclaredFieldFlags(), getMemoryHelp()).
- **`src/commands/scan.determinism.test.ts`**: Ticket 37 verification: the blueprint card is a deterministic artifact. Repeated real ingests never duplicate the card (making SCAN_HELP's "updates that card in place" promise true), and repeated dry-runs are byte-identical across both output formats.
- **`src/commands/scan.fidelity.test.ts`**: The `--check` exit-code contract, which is what CI gates on: 0  clean and comparable 1  real architectural drift 2  incomparable — the baseline was produced by a different parser Code 2 is deliberately distinct from 1: failing a build for drift the user introduced is correct, and failing it because they upgraded neuron is a different problem with a different fix.
- **`src/commands/scan.test.ts`**: Methods: describe(), join(), it(), execSync().
- **`src/commands/scan.ts`** (Exports: `handleScanCommand`): Function handleScanCommand (Methods: handleScanCommand(), log(), parseFlags(), cwd()).
- **`src/commands/status.test.ts`**: Methods: describe(), join(), beforeAll(), mkdirSync().
- **`src/commands/status.ts`** (Exports: `handleStatusCommand`): Ticket 13 / ADR 0013: the validation surface `neuron doctor` was ruled out twice for, reopened folded into `status` instead of a new top-level command. `--check` and `--repair` are mutually exclusive report modes — neither touches the default `status` JSON payload below them.
- **`src/commands/sync.test.ts`**: A genuine content conflict (both sides present, different content) used to be silently resolved by comparing createdAt, which ties in the common case and defaulted to markdown winning — including when markdown was the stale side. Without --force, `sync` must now report the conflict, leave both stores untouched, and exit non-zero so a script or CI run notices rather than silently accepting a guessed resolution.
- **`src/commands/sync.ts`** (Exports: `handleSyncCommand, scaffoldNeuronDirectory`): Function handleSyncCommand (Methods: handleSyncCommand(), some(), includes(), error()).
- **`src/commands/ui.test.ts`**: Methods: describe(), afterEach(), close(), it().
- **`src/commands/ui.ts`** (Exports: `UiCommandOptions, handleUiCommand`): Function handleUiCommand (Methods: parseUiArgs(), parseInt(), findFreePort(), Promise()).
- **`src/commands/utils.test.ts`**: Methods: describe(), it(), spyOn(), mockImplementation().
- **`src/commands/utils.ts`** (Exports: `findProjectRoot, drawBox, parseFlags, updateMarkdownFile, getMemoryHelp`): Every option `parseFlags` understands with no `neuron.yaml` involved. Used to reject unrecognised flags and to suggest a correction — a typo'd flag used to be pushed into `positionals` and silently discarded, so `--importanc 5` looked like it worked and wrote the default instead. Re-exported from `config/neuronYaml.ts`, which is also where `validateNeuronYaml` checks a declared field's flag against this same list at config-load time (ticket 43) — one vocabulary, not two that can drift.

---
id: 0ba9e2eb-b736-4d24-5b1c-59d0826ced0b
createdAt: 2026-08-09T19:13:08.130Z
importance: 5
tags:
  - architecture
  - topology
  - scan
  - deep
taskId: null
supersededBy: 7897e42e-c8c6-5178-0018-f26ebcd3a5f3
supersededAt: 2026-08-12T02:24:27.692Z
---
### 🧩 components (`src/components`)
Primary components module containing core application capabilities.

**Key Components & Export Contracts:**
- **`src/components/embedder.test.ts`**: Methods: describe(), it(), TransformersEmbedder(), embed().
- **`src/components/embedder.ts`** (Exports: `Embedder, TransformersEmbedder`): Class TransformersEmbedder (Methods: createRequire(), applyCrossPlatformShims(), require(), dirname()).
- **`src/components/enricher.ts`** (Exports: `Centroid, VocabularyEntry, buildTagVocabulary, buildCategoryCentroids, TagSelectionOptions, selectTags, selectCategory, CategoryOption, CategoryInferenceInput, CategoryInferenceResult, EnrichmentModel, LocalEnrichmentModelOptions, LocalEnrichmentModel, buildCategoryPrompt`): Write-side enrichment: inferring the metadata a caller did not supply. Two fields are inferred, by different machinery chosen from what each field actually is (see `.scratch/write-side-enrichment/spec.md`): tags       — selected from a closed vocabulary by centroid cosine. No model: the embedder is already loaded on the write path, and ADR 0010 §4 forbids the model from minting a tag, which makes tagging a ranking problem rather than a generation one. category   — centroid cosine by default, which beat the model 9/9 to 1/9 on the same corpus (Pillar 11). The model strategy survives as an opt-in because it can read a category's `description` as an instruction rather than merely as a similarity target. `importance` was a third inferred field and is not inferred any more. Pillar 10 measured the shipped 0.5B model's judgement as noise — discrimination of -0.5 then +0.167 across consecutive runs, per-entry stability 0.5, and a note about irreversible production data loss rated `1`. It shipped `off` in ticket 06 and was removed outright in ticket 26; an omitted `--importance` takes the column default. Git history holds the implementation if a larger model ever makes the question worth reopening.
- **`src/components/fts-query.test.ts`**: Methods: describe(), it(), expect(), toBe().
- **`src/components/fts-query.ts`** (Exports: `isStopword, cleanFtsQuery`): Converts a natural language query string into a safe SQLite FTS5 MATCH expression. ## Why stopwords are dropped The keyword leg is fused with the semantic leg by Reciprocal Rank Fusion, which rewards a document's rank position in each list rather than how well it actually matched. Because terms are joined with `OR`, a document matching a single common word enters the FTS ranking at all — and if it is the only match, it enters at rank 1 and collects the full RRF contribution. Observed: the query "what payment provider do we use" ranked a document about a Rust auth daemon above the correct billing document, because `"do"`, `"we"` and `"use"` were searchable terms. Noise words give noise a guaranteed seat. Dropping them means an all-stopword query produces an empty expression, which the caller treats as "no keyword leg" and answers semantically — the correct degradation, and far better than a MATCH that hits every row.
- **`src/components/generator.ts`** (Exports: `GeneratorProgress, getTextGenerator, isTextGeneratorLoaded, resetTextGenerator`): The shared text-generation model (`Xenova/Qwen1.5-0.5B-Chat`). Loading it costs ~3.2s and dominates its total cost — the load is 87% of a single-inference invocation, and every CLI command is its own process. The loader is therefore a module-level singleton so that a `neuron scan` which has already paid for the model can hand it to write-side enrichment for free, rather than each consumer loading its own copy.
- **`src/components/index.ts`**: No exported symbols detected.
- **`src/components/summarizer.test.ts`**: Handles dual storage reads and writes across Markdown and SQLite
- **`src/components/summarizer.ts`** (Exports: `SmolLM2Summarizer`): Delegates to the process-wide loader so write-side enrichment (which calls `getTextGenerator()` directly, `enricher.ts`) and anything else warming the model in the same process share one load rather than paying for it twice. Kept on this class only because `neuron init` already calls `preloadModel()` here to warm enrichment's model ahead of time (ticket 26 removed this class's own use of it \u2014 per-file architecture summaries are deterministic now, not model-generated).
- **`src/components/timeout.ts`** (Exports: `TimeoutError, withTimeout`): The timeout primitive. Before this, the only `timeout` in the codebase was SQLite's `busy_timeout`; a hung `generate()` hung its caller forever. ADR 0010 §3 requires every model call to be a bounded wait. It bounds the wait, not the work: the underlying ONNX generation cannot be cancelled, so a timed-out call keeps running to completion in the background and its result is discarded. That is acceptable because the process is short-lived — but it means a timeout does not free the CPU it was spending.

---
id: be342f30-531a-1eb9-5f1c-6c3f6580c7f7
createdAt: 2026-08-09T19:13:08.230Z
importance: 5
tags:
  - architecture
  - topology
  - scan
  - deep
taskId: null
supersededBy: 6e5f19ef-c872-03a7-7893-f8fcbca2cb3b
supersededAt: 2026-08-12T02:24:27.692Z
---
### 🧩 e2e (`src/e2e`)
Primary e2e module containing core application capabilities.

**Key Components & Export Contracts:**
- **`src/e2e/mdFileManagement.e2e.test.ts`**: Methods: describe(), beforeEach(), mkdtempSync(), afterEach().

---
id: e8371683-83e1-bae0-ab0a-67529912a213
createdAt: 2026-08-09T19:13:08.315Z
importance: 5
tags:
  - architecture
  - topology
  - scan
  - deep
taskId: null
supersededBy: 7f35f81f-66b7-133b-1489-159eff5d10f1
supersededAt: 2026-08-12T02:24:27.692Z
---
### 🧩 scanner (`src/scanner`)
Primary scanner module containing core application capabilities.

**Key Components & Export Contracts:**
- **`src/scanner/analyzer.test.ts`**: Class ServerApp (Methods: describe(), join(), beforeAll(), mkdirSync()).
- **`src/scanner/analyzer.ts`** (Exports: `isIgnoredEntryName, ModuleSummary, ScanResult, scanProjectTopology`): Traversal rules shared by the topology scan and the drift fingerprint guard. Both must agree on exactly which files feed a scan: if the guard watches a narrower set than the scanner reads, edits to the difference are invisible and drift is never re-checked. Derived from the parser's own language list so the filter can never be narrower than what TreeSitterScanner can actually parse — a mismatch here silently hides whole languages (previously .tsx/.jsx/.cpp) from every scan.
- **`src/scanner/compressCard.test.ts`**: Methods: fakeIndex(), from(), join(), describe().
- **`src/scanner/compressCard.ts`** (Exports: `compressArchitectureCard`): Compresses the architecture index (ticket 28's small, always-injectable card — module list only, no per-file detail) down to a target character budget for injection, without touching the stored index `neuron scan --diff` reads. Ticket 30: this used to compress the old monolithic card (ticket 27), which needed real machinery to structurally degrade per-module per-file detail. Post-28, the stored card fetched here is the index — there's no per-file detail left in it to strip, only a header (purpose, dependency contract, subsystem map) and one line per module. So compression is now just: keep the header whole, then keep as many whole module-list lines as fit, never cutting a line in half. Real measurement on this repo (14 modules, ~1.6KB) shows the index uses ~27% of the 6,000-char injection budget, so this path is rarely exercised — but per-module-line growth is only ~40 bytes/module here, and the header itself grows with the dependency list, so a much larger repo can still exceed the budget. The "never cut silently" discipline (25/26/27) carries forward: a cut always reserves room for a note before laying out anything, so it's never dropped for lack of space.
- **`src/scanner/degradation-warning.test.ts`**: Scope item 2: a language that should have parsed from an AST but could not must say so loudly, not degrade in silence. The distinction that matters: Ruby and PHP have no grammar in 2.2.0 at all, so their regex fidelity is expected and unremarkable. TypeScript falling back means something went wrong with the install, and the resulting card is worse than the user has any reason to expect.
- **`src/scanner/diff.test.ts`**: Ticket 28 split `synthesizeArchitecture`'s output into an index plus per-module markdown (what actually gets stored). These round-trip tests exercise `parseBaselineBlueprint`, which still expects the pre-28 monolithic shape — the same reassembly `reassembleBaseline` (ingest.ts) does from storage for ticket 29, done here directly from the summarizer's output instead of via a memory store.
- **`src/scanner/diff.ts`** (Exports: `ModuleDiff, ExportDiff, DependencyDiff, ArchitecturalDiff, parseBaselineBlueprint, calculateArchitecturalDiff, formatArchitecturalDiffMarkdown, getArchitecturalDrift, autoRescanIfDriftDetected`): The baseline and the scan were produced by different parsers, so their difference is not drift. Mutually exclusive with `hasDrift`.
- **`src/scanner/fidelity.ts`** (Exports: `FidelityDescriptor, descriptorFor, fidelityFromComponents, areComparable, formatFidelitySection, parseFidelitySection`): Parser fidelity: how a blueprint card's symbols were obtained, and whether two cards can be meaningfully compared at all. A drift report is a comparison between two measurements. If the two were taken with different instruments, their difference is not drift — it is an artefact of the instrument change. Recording fidelity on the card is what lets `neuron scan --diff` tell those apart instead of reporting hundreds of phantom export changes the moment a user upgrades.
- **`src/scanner/fingerprint.test.ts`**: Methods: describe(), join(), beforeEach(), random().
- **`src/scanner/fingerprint.ts`** (Exports: `FingerprintInputs, computeProjectFingerprint, readReconciledFingerprint, writeReconciledFingerprint, clearReconciledFingerprint`): Cheap change-detection for the implicit drift re-scan. `scanProjectTopology` parses every source file's AST, which is far too expensive to run on every `memory query`. A stat-only walk over the same file set is orders of magnitude cheaper, so we fingerprint the tree and skip the scan entirely when nothing has moved since the last reconcile. This guard only gates the implicit re-scan. `neuron scan`, `--diff`, and `--check` always perform a real scan, so CI and explicit checks are never served a cached verdict.
- **`src/scanner/grammars.test.ts`**: Build an npm-shaped tarball containing the given `package/`-relative files.
- **`src/scanner/grammars.ts`** (Exports: `GrammarSpec, grammarCacheDir, grammarPaths, isGrammarCached, cachedLanguages, GrammarFetchOutcome, EnsureGrammarsOptions, ensureGrammars, GrammarLoader`): Tree-Sitter grammar acquisition. Compiled `.wasm` grammars are fetched at `neuron init` and cached on disk rather than bundled in the npm tarball. Eight grammars weigh ~8.5 MB against a 621 KB package, and the ONNX models already establish the fetch-at-init pattern, so grammars follow it. See docs/adr/0008. Artifacts come from the official `tree-sitter-<lang>` packages on the npm registry, which ship both a prebuilt `.wasm` and a `queries/tags.scm`.
- **`src/scanner/implicit-rebaseline.test.ts`**: The implicit path — the auto-rescan fired by `memory query`. On a fidelity mismatch it re-baselines exactly as it would for drift, and says nothing. A distinct announcement was considered and rejected: the drift and missing-baseline messages would both state something untrue here, and the migration is not something the user needs to act on when it self-heals.
- **`src/scanner/ingest.test.ts`**: Main app entry
- **`src/scanner/ingest.ts`** (Exports: `blueprintCardId, moduleCardId, parseModuleListFromIndex, IngestOptions, ingestScanResults, reassembleBaseline`): A stable id for "the" blueprint card in a category, derived rather than looked up. Re-running `neuron scan` must always resolve to the same row — a semantic search over the category can rank the card out of its result window once enough other entries share the category (ticket 37), so there is deliberately no query here at all: same category in, same id out. Ticket 28: this id now identifies the index — module list plus project-wide metadata — not the full blueprint. Per-module detail lives at `moduleCardId(category, modulePath)` instead.
- **`src/scanner/queries.ts`** (Exports: `SymbolKind, isIgnoredCapture, isTypeLikeAncestor, resolveKind, kindPrecedence, refineGoTypeSpec`): Per-language symbol extraction queries and the rules that turn a captured syntax node into a `ScannedSymbol`. Two things live here because they are one decision: which S-expression query finds declarations in a language, and how the node it captures maps to a symbol kind. Splitting them would let a query and its kind table drift. ## Why some queries are hand-written Most grammars ship a `queries/tags.scm` (ticket 01 caches it next to the `.wasm`). Those queries were written for code navigation — "jump to the thing under my cursor" — not for the declaration inventory a blueprint card needs, so each one is audited before adoption rather than trusted wholesale. TypeScript's shipped query fails that audit outright: it covers only ambient declaration forms (`function_signature`, `method_signature`, `abstract_class_declaration`, `interface_declaration`) and has no rule for `function_declaration` or `method_definition`. Against `export class Alpha { thing() {} }` it captures nothing but a stray generic parameter, where JavaScript's equivalent has 13 definition rules. Neuron is itself a TypeScript project, so TypeScript and TSX get the queries below and everything else uses its shipped `tags.scm`.
- **`src/scanner/treesitter.test.ts`**: These tests exercise the real grammars, not a mock. A mocked parser would only prove the query strings are strings — the whole point is whether the queries actually match the declaration forms each grammar produces. Grammars normally arrive via `neuron init`; fetch anything missing once so a cold checkout still runs. Every AST assertion below also asserts `fidelity === 'ast'`, so an offline machine fails loudly instead of quietly passing at regex fidelity — which is the failure mode ticket 02 exists to remove.
- **`src/scanner/treesitter.ts`** (Exports: `ScannedSymbol, ParserFidelity, ParsedFile, DynamicGrammarLoader, TreeSitterScanner`): Whether the symbol is part of the file's public surface. Methods are never exports — the class is. Keeping members out of this set is what stops `neuron scan --diff` reporting an export contract change every time a private helper is renamed.

---
id: 418ad201-0b6e-c014-bd7d-6fc300044520
createdAt: 2026-08-09T19:13:08.365Z
importance: 5
tags:
  - architecture
  - topology
  - scan
  - deep
taskId: null
supersededBy: ffa8d0d4-65bd-991a-bd89-847b5a0ea43f
supersededAt: 2026-08-12T02:24:27.692Z
---
### 🧩 shared (`src/shared`)
Primary shared module containing core application capabilities.

**Key Components & Export Contracts:**
- **`src/shared/textMatch.ts`** (Exports: `editDistance, suggestClosest`): Cheap edit distance, only ever called on an error path (a typo'd CLI flag or enum value). Shared between `commands/utils.ts` (unknown-flag suggestions) and `NeuronMemory`'s field-schema enforcement (enum-value suggestions, ticket 43) so the two surfaces suggest corrections the same way rather than drifting into two slightly different heuristics.

---
id: eaf10b84-8f3c-5927-b103-f3501e3312f0
createdAt: 2026-08-09T19:13:08.383Z
importance: 5
tags:
  - architecture
  - topology
  - scan
  - deep
taskId: null
supersededBy: f201921e-b8f4-7115-84d4-d1aa1534dff0
supersededAt: 2026-08-12T02:24:27.692Z
---
### 🧩 storage (`src/storage`)
Primary storage module containing core application capabilities.

**Key Components & Export Contracts:**
- **`src/storage/dualStorageRouter.pathChange.test.ts`**: Ticket 05's "data-loss-adjacent part": `md` mode's mirror deletes any vector row whose id isn't found in the markdown read from a category's current resolved root. If `neuron.yaml` changes `categories.learning.path` between two commands, the old file is still sitting at the old root — a naive reconcile against the new (empty) root would read that as "markdown deleted everything" and wipe the vector index. Per the maintainer's decision, the actual behaviour is a per-category reseed from the vector index into the new root instead — asserted end to end here rather than just unit-testing the resolver.
- **`src/storage/dualStorageRouter.test.ts`**: `update`/`delete` in md mode reports success if EITHER store actually changed within the same command — `vecResult` is consulted, not just the md outcome, so a real vector-side change is never reported as `not_found` just because the markdown-side write hiccupped in the same call. This used to also cover a second scenario — a markdown-only deletion made between commands, leaving a vector-only orphan for a later update/delete to salvage — but ticket 29's strict-mirror reconcile (below) now purges that orphan automatically on the very next command, before the mutation is even processed, so "not_found" on it is correct now rather than a bug.
- **`src/storage/dualStorageRouter.ts`** (Exports: `DualStorageRouter`): Ticket 06 (neuron-2.3.0) collapsed the old three-way `vector-only` / `split` / `md` dispatch into one always-live per-category resolution — `resolveCategoryStorage` decides each mutation's category individually, and `mdCategories()` (the subset that resolves to `md`) is what gets reconciled first. A pure-vector config (no category resolves to `md`) reconciles an empty list, which `reconcile()` short-circuits on immediately — the same zero-cost path the old `vector-only` branch's direct `vectorDb.transact` call gave, just reached without a special case.
- **`src/storage/index.ts`**: No exported symbols detected.
- **`src/storage/mdFileManagement.integration.test.ts`**: Methods: describe(), beforeEach(), mkdtempSync(), join().
- **`src/storage/mdStorage.ts`** (Exports: `MdStorage`): The markdown-storage surface every caller (`NeuronMemory`, `DualStorageRouter`, `syncMdWithVector`, `neuron sync`) actually depends on. Extracted so a caller can be handed either a single-root `MdStorageAdapter` or a `MultiRootMdStorage` that fans out across several resolved category roots (ticket 05) without knowing which.
- **`src/storage/mdStorageAdapter.challenger.test.ts`**: Methods: describe(), join(), now(), beforeEach().
- **`src/storage/mdStorageAdapter.test.ts`**: Methods: describe(), join(), now(), beforeEach().
- **`src/storage/mdStorageAdapter.ts`** (Exports: `MdStorageAdapterOptions, sanitizeCategoryFilename, MdStorageAdapter`): The same category → filename sanitization `getFilePath` applies, exported so config-time collision validation (ticket 05, `validateNeuronYaml`) can predict which file two categories would collide on without constructing an adapter.
- **`src/storage/mdVectorSync.test.ts`**: Previously named "Timestamp Conflict Resolution" and asserted that a newer `createdAt` on the markdown side won. That mechanism is gone: a normal `memory update` never touches `createdAt` on either side, and `.md` frontmatter has no `updatedAt`, so comparing `createdAt` was comparing two values that are almost always equal — which meant "md wins" fired on every real conflict, not just ones where md was genuinely newer. That silently reverted a real vector-side update to stale markdown content in production use. A conflict is now reported and left untouched unless --force explicitly says markdown wins.
- **`src/storage/mdVectorSync.ts`** (Exports: `SyncOptions, SyncResult, computeMemoryHash, cleanTmpFiles, cleanAllTmpFiles, syncMdWithVector`): Entries present on both sides with genuinely different content, left untouched. Neither store has a reliable last-modified signal — `.md` frontmatter has no `updatedAt`, and a normal `memory update` never touches `createdAt` on either side — so there is no safe way to guess which side is fresher. Guessing here is what caused a real regression: a legitimate vector-side update silently reverted to stale markdown content because their (unchanged, identical) `createdAt` values tied. Resolve explicitly with `--force` (markdown wins, matching its documented "force re-embed" semantics) after inspecting the conflict.
- **`src/storage/multiRootMdStorage.test.ts`**: Methods: keys(), describe(), join(), now().
- **`src/storage/multiRootMdStorage.ts`** (Exports: `MultiRootMdStorage`): Fans a single `MdStorage` surface out across every root a category's `categories.<name>.path > storage.path > '.neuron'` chain resolves to (ticket 05). Chosen over teaching `MdStorageAdapter` itself to resolve per-category: each resolved root keeps its own plain, single-root adapter underneath — unchanged internals, unchanged path-traversal containment (`getFilePath`'s sanitization still runs per adapter, so a malicious category name still can't escape its own resolved root) — and this class is just a thin lookup in front of a small, lazily-populated registry of them, keyed by resolved absolute directory so two categories sharing a root share one adapter instance (and one `readdirSync`, if it ever needs one). `overrideRoot`, when set, pins every category to one literal root, bypassing config resolution entirely — the same escape hatch `handleSyncCommand`'s `overrideStoragePath` parameter already gave callers before this ticket.

---
id: 6eaba29f-3199-2839-d0e5-3d05e08b270c
createdAt: 2026-08-09T19:13:08.439Z
importance: 5
tags:
  - architecture
  - topology
  - scan
  - deep
taskId: null
supersededBy: c8bf6476-d242-f304-be92-1693759439f2
supersededAt: 2026-08-12T02:24:27.692Z
---
### 🧩 ui (`src/ui`)
Primary ui module containing core application capabilities.

**Key Components & Export Contracts:**
- **`src/ui/html.ts`** (Exports: `generateDashboardHtml`): Function generateDashboardHtml (Methods: generateDashboardHtml(), rgba(), var(), Header()).
- **`src/ui/progress.test.ts`**: Methods: describe(), it(), PassThrough(), on().
- **`src/ui/progress.ts`** (Exports: `ScanProgress, ScanProgressBarOptions, ScanProgressBar`): Class ScanProgressBar (Methods: update(), max(), round(), repeat()).
- **`src/ui/server.ts`** (Exports: `UiServerOptions, UiServer, startUiServer`): Function startUiServer (Methods: close(), startUiServer(), createServer(), URL()).

---
id: 5c997296-45ec-4ae0-872b-56c18de46b7c
createdAt: 2026-08-09T19:19:31.788Z
importance: 4
tags:
  - adr
  - md-storage
  - rc2
taskId: null
---
Ticket 38 (neuron-2.3.0, md parser stray-dash cascading data loss) design rationale: reconcileCategory's delete-mirror step in dualStorageRouter.ts gets a non-blocking warning, not a hard tripwire, when a single reconcile pass is about to delete an unusually large fraction (>=20% of a category's rows, with a 5-row floor to avoid noise on tiny categories) of a category's vector rows. ADR 0011 Consequence 2 already settled 'no tripwire, no --force' for this delete step deliberately, reasoning that markdown is authoritative by construction and '.neuron/' is git-recoverable; ticket 38's own root cause (a one-off duplicated-content write, not a systemic formatter bug, closed at the read side by hardening the frontmatter block matcher) supplied evidence for making the class of failure LOUD, not evidence for reopening the settled 'no tripwire' ruling itself, so the two were kept orthogonal. This is deliberately a different posture than ticket 24's (neuron-2.2.0) LLM-judged-deletion false-delete disqualification, which killed model-judged content deletion outright because there was no independent trustworthy source to check against -- here the mechanism is mechanical sync against markdown, which IS the trustworthy source by ADR 0011's own design, so the fix is visibility (MASS_DELETE_WARN_FRACTION stderr warning) rather than a block.

---
id: f3afac94-886a-47fd-8843-42906fb822d2
createdAt: 2026-08-10T18:48:58.897Z
importance: 4
tags:
  - wayfinder
  - 2.2.0
  - rc2
taskId: null
---
Wayfinder chartering session on neuron-2.4.0, 2026-08-10: scoping choices made while adding tickets 12-16 to the map. Dogfooding was deliberately split into two independent tracks with different completion bars rather than one effort -- process-rigor (ticket 13, audit gaps like CI never invoking neuron exec despite neuron.yaml's own onExec rule) versus showcase (ticket 16, curate this repo's own .neuron/ store as the demo artifact rather than building a separate demo doc or UI screenshots) -- because manufactured showcase work risks the kind of overstatement the v2.3.0 marketing handoff was explicitly written to avoid; showcase should fall out of real usage, not be chartered as its own performance. Ticket 12 (should neuron exec's pre-command lookup become a harness hook, reopening ADR 0014) was made a hard blocker of ticket 13 rather than run in parallel, so the dogfooding audit doesn't spend effort enumerating gaps against a neuron-exec convention that may be replaced. Mid-session the maintainer reframed the repo-cleanup thread's .scratch/ question into a much larger idea -- ticket 14, whether neuron's own storage should replace .scratch/ as this repo's issue tracker entirely, including migrating 20+ existing efforts -- rather than treating .scratch/ as merely something to tidy in place.

---
id: e7e75021-035d-4035-aec1-0e53341867f8
createdAt: 2026-08-10T19:14:31.556Z
importance: 4
tags:
  - enrichment
  - llm
  - adr
taskId: null
---
Implementation rulings made while building ADR 0017 (ticket 01, neuron-2.4.0) that the ADR itself didn't spell out: (1) autoDeclareCategory is scoped to op 'upsert'/'update' only, never 'delete' -- matches enforceFieldSchema's existing op guard immediately adjacent to it in transact(), and a delete never 'introduces' a category so declaring one on the way out would be surprising. (2) declareCategoryInNeuronYaml must special-case a neuron.yaml with no top-level 'categories' key at all: NeuronConfigSchema's zod .default(...) for the categories block only fires when the key is fully absent, so auto-vivifying a 'categories' key containing only the new entry would silently discard every implicit default category and break pullRules.default's own category reference. Fixed by seeding DEFAULT_CONFIG.categories explicitly first when doc.get('categories') is undefined, before appending the new entry -- making the implicit set explicit rather than replacing it. (3) The auto-declare write mutates this.config.categories[category] = {} IN PLACE rather than reassigning this.config, deliberately, because DualStorageRouter and MultiRootMdStorage are constructed holding the exact same config object reference as NeuronMemory -- an in-place mutation is what makes 'the rest of the same process sees it as declared immediately' (ADR 0017 item 2) true for those consumers without any extra wiring.

---
id: eb29b99c-2503-4733-9588-69a7f51d8107
createdAt: 2026-08-10T20:04:33.221Z
importance: 4
tags:
  - 2.2.0
  - wayfinder
  - rc2
taskId: null
---
Ticket 07 (neuron-2.4.0, measure whether the discovery-command hint gets used): chose free passive dogfooding instrumentation over a paid benchmarks/token-ab/ A/B run, per direct maintainer choice when asked (the map's own fog already flagged that exact funding/execution-path question as unresolved and blocking ticket 05, so the same question was asked again rather than assumed). Built src/harnesses/hintFollowLog.ts plus a new 'post-tool-use' hook point that is deliberately NOT a LifecyclePoint — no HarnessAdapter capability contract, no install()/uninstall()/verify() support across the four harnesses, hand-wired only into this repo's own .claude/settings.json (Claude Code only) rather than researched and shipped cross-harness via neuron init, since only this repo dogfoods itself and the alternative would have meant committing to PostToolUse's documented shape for Codex/Copilot/Cursor for a measurement instrument that doesn't need it. The outcome-quality half of the original question (does the hint change task success, not just get followed) stays unanswered, moved to the map's fog next to ticket 05's funding question.

---
id: f0fdc8c0-c710-4549-b89a-423d61039b89
createdAt: 2026-08-11T05:02:34.087Z
importance: 4
tags:
  - 2.2.0
  - rc2
  - adr
taskId: null
---
ADR 0014 amended (ticket 12, neuron-2.4.0): pre-command lookup (today's agent-typed 'neuron exec -- <command>' wrapper) gets a real PreToolUse-driven hook, but only for Claude Code and Codex CLI, permanently — not a temporary gap. Unlike the three existing lifecycle points, where all four shipped adapters have SOME injecting mechanism, tool-use hooks split categorically: Claude Code's PreToolUse and Codex's PreToolUse both support hookSpecificOutput.additionalContext (Claude Code confirmed live against code.claude.com/docs/en/hooks), while Copilot CLI's preToolUse and Cursor's beforeShellExecution are both documented permission/gating-only with no context field at all. Copilot/Cursor keep the CLAUDE.md/AGENTS.md-instructed neuron exec step permanently. The amendment reuses CapabilityMap/SupportRecord unchanged (neuron never touches PreToolUse's permissionDecision gate, since neuron exec's own behavior never blocks the real command either) and rules that protocolBlock.ts's execStep() becomes fidelity-conditional the same way recallStep() already is. Implementation graduated as tickets 22/23/24 rather than designed further in the grilling ticket itself.

---
id: d2e219b7-8396-49b9-8a97-9326a4bdd06d
createdAt: 2026-08-11T12:00:29.049Z
importance: 4
tags:
  - wayfinder
  - rc2
  - 2.2.0
taskId: null
---
ADR 0018 (neuron-2.4.0 ticket 14): tickets are a new tickets category built entirely from ADR 0011's markdown-store-of-record machinery and ADR 0013's declared-field schema -- status (enum unclaimed/claimed/resolved), type (enum research/prototype/grilling/task), and blockedBy (string, comma-separated ids) as user-defined fields, mutation via the existing transact({op:'update'}) path, no new storage mechanism. Blocking stays a plain frontmatter field rather than tracker-native, per the wayfinder skill's own documented fallback, since adding a real dependency-graph/frontier command would be new product surface against ADR 0013's no-new-top-level-commands non-goal. docs/agents/issue-tracker.md's local-markdown section is removed outright (not kept alongside) and all 19 existing .scratch/ effort directories migrate in one bulk pass into the tickets category before .scratch/ is deleted, rejecting both a permanent archive (incompatible with fully removing .scratch references from the doc) and lazy on-touch migration (an indefinite, silently-decaying straggler set). Implementation graduated as tickets 25 (declare the category, rewrite the doc) and 26 (run the bulk migration, blocked by 25) rather than built in this grilling session.

---
id: 4f1d4942-b8bb-4840-8661-6eb6d0644444
createdAt: 2026-08-11T13:54:12.969Z
importance: 4
tags:
  - retrieval
  - benchmark
  - longmemeval
taskId: "17"
---
Ticket 17 (neuron-2.4.0): measured the shipped lexical-only relevance gate's false-accept rate on no-evidence queries, deliberately did not ship a fix. Two real measurements: a hand-built resident E2E corpus (19 queries, adversarially disjoint vocabulary from the seeded store, verified via an FTS-prefix-collision script rather than eyeballed) measured 0% false-accept; relevance_gate_eval.py's extended negative control on the full real LongMemEval-S split (500 questions) measured 99.80% false-accept. The gap is explained by corpus construction, not a bug in either measurement: cleanFtsQuery's OR-across-any-shared-word design (src/components/fts-query.ts) means the gate only needs one incidental shared token to pass, so a genuinely disjoint-vocabulary query abstains reliably while a same-domain natural-language query (LongMemEval's negative control is drawn from the same conversational corpus family as its positive queries) almost always shares some word with an unrelated partition. Decision: follow ticket 39 -> ticket 41's precedent of measure-then-ship-separately rather than reacting to the bad number in the same session -- a cosine floor or LLM-adjudication fix, if warranted, is a new ticket informed by this measurement, chartered once someone picks it up. The 99.80% number, not a vaguer 'the gate seems loose', is now the load-bearing fact for that future ticket's motivation.

---
id: 185b3f9e-c69f-47df-b6cc-e90962d5a215
createdAt: 2026-08-12T02:04:10.173Z
importance: 4
tags:
  - rc2
  - wayfinder
  - adr
taskId: "19"
---
Ticket 19 (neuron-2.4.0): non-interactive resolution of the memory-add supersession gate is a new '--if-novel' flag on 'memory add' itself, not a separate 'neuron exec --no-history' mode, because the gate lives on the write command and putting its resolution elsewhere would split one concept across two command surfaces. On a gate hit, --if-novel skips the write and exits 0 (job succeeds) but is never silent: candidate id/similarity go to stderr, and stdout's usual written-entry JSON is replaced with {skipped:true, reason:'supersession-candidate', candidateId, similarity} so a scripted caller can branch on shape rather than re-parsing prose. Mutually exclusive with --supersedes/--not-a-reversal, which assert a human already made the call; --if-novel is the no-human-present case. This mirrors the visibility principle already applied to ticket 21 (don't let sessionsObserved:0 go unnoticed) and to ticket 18's belt-and-suspenders verify layer: a non-interactive skip path must announce itself, not fail open quietly.

---
id: 48fee768-6fab-4be8-94fb-84760451e586
createdAt: 2026-08-12T02:14:23.606Z
importance: 4
tags:
  - wayfinder
  - 2.4.0
  - rc2
  - adr
taskId: "20"
---
Ticket 20 (neuron-2.4.0): store-health signals (near-duplicate clusters, importance histogram, superseded count, sessionsObserved) shipped as a third neuron status --health report mode, not a new neuron doctor command. This re-applies ADR 0013's own precedent for the config-validation surface (ticket 36, neuron-2.2.0: doctor ruled out twice, once on cost, once via the repo's no-new-commands non-goal, folded into status --check/--repair instead) to a different kind of finding -- data-quality rather than config-schema compliance -- rather than treating it as a fresh question. Near-duplicate detection deliberately reuses findSupersessionCandidate's existing embedding-cosine machinery and SUPERSESSION_SIMILARITY_THRESHOLD (0.97) rather than introducing a second similarity concept, run pairwise across the whole live store and grouped via union-find rather than reported as raw overlapping pairs. Output is human-readable text by default with --json for scripting, matching scan.ts's --format md|json convention rather than status's own historically all-JSON default -- a deliberate divergence because this is a maintainer-read report, not machine-polled state. sessionsObserved is surfaced inline within --health rather than waiting on ticket 21, which still owns the proactive (every-status-run or session-start-hook) warning surface the dogfood feedback actually asked for; ticket 20 only reads the existing metric on-demand, so 21 remains open.

---
id: 34dfb326-4cd1-4a35-9e2e-fb0ae6610370
createdAt: 2026-08-12T02:26:23.634Z
importance: 4
tags:
  - wayfinder
  - 2.4.0
  - rc2
  - adr
taskId: "20"
---
Ticket 20 follow-up (neuron-2.4.0): neuron status --health --repair auto-merges only byte-identical-content duplicate subgroups within a near-duplicate cluster, never merges across genuinely different wording even at similarity 0.985-1.0. Rationale: embedding similarity is a candidate signal, not a correctness signal -- two entries can be near-identical vectors while saying meaningfully different things (verified live: this repo's own architecture-card duplicates across decisions/architecture categories share ~0.985-1.0 similarity but describe different module states). Exact string equality is the only zero-judgment bar available without either fabricating a merge decision or asking an LLM to arbitrate, and this codebase already has a precedent against both (repairFieldCompliance never fabricates free-text identity fields; the write-time supersession gate deliberately never auto-decides reversal, only shortlists). Second decision: --repair now combines with --health rather than staying three-way mutually exclusive with --check/--health -- --check still can't combine with either since it answers an unrelated question (config-schema compliance), but --health and --repair together is a coherent single request (repair store health), unlike --check+--repair which would conflate two different report shapes into one JSON payload.

---
id: deb8a17a-48d7-43a8-98d2-b9af943da90f
createdAt: 2026-08-12T22:11:21.662Z
importance: 4
tags:
  - retrieval
  - longmemeval
  - rc2
taskId: null
---
Ticket 29 (neuron-2.4.0) amends ADR 0012 / ticket 27's relevance-gate acceptance bar: the original '~zero new false-silence' requirement for a second-stage reranker leg is unreachable at any threshold on real LongMemEval-S data (full sweep confirmed the same overlap-too-far distribution shape ticket 39 found for the deprecated cosine floor, on both Xenova/ms-marco-MiniLM-L-6-v2 and the mxbai-rerank-xsmall-v1 backup). Live maintainer decision, made with the swept false-accept/false-silence frontier in hand rather than guessed: accept a real recall cost for a real noise reduction. The reranker leg ships at raw-logit threshold -8 (not the model's own 0 boundary), landing false-accept at 19.4% (from 99.80%) and false-silence at 19.8% (from 0%) — roughly symmetric, not the asymmetric zero-cost win originally specified. Ships unconditionally alongside the lexical leg in queryGated, with no separate config switch for this leg specifically — a reversal of 27's own original Scope item 4 ('wire it in behind a config switch, default off'), decided once real evidence existed rather than assumed in advance. Rationale for no config: the maintainer's explicit call mid-session, not a technical constraint — the threshold itself (RERANKER_ACCEPT_THRESHOLD in src/index.ts) is the tunable surface if a future session wants to revisit the tradeoff point, not a boolean gate.

---
id: 9995dcb3-a8a8-45b5-8f4d-20e2dd0d30f0
createdAt: 2026-08-12T23:39:35.514Z
importance: 4
tags:
  - drift
  - release
  - wayfinder
taskId: null
---
Ticket 30 (neuron-2.4.0): when autoRescanIfDriftDetected/neuron scan/neuron status derive their scan root, they now resolve it exactly once via the shared src/shared/projectRoot.ts findProjectRoot walk (surfaced through NeuronMemory.getProjectRoot()), rather than each call site deriving its own copy from process.cwd(). This closes a real, twice-confirmed incident class: a CLI invocation from a project-marker-less subdirectory (e.g. any .scratch effort's issues/ dir) could scan a degenerate 0-module topology while the write landed, upward-resolved, in the real project's store. Considered and rejected a second policy for the marker-less-cwd edge case (refuse to auto-rescan at all) in favor of reusing NeuronMemory.open()'s existing upward-walk-then-literal-fallback behavior -- introducing a distinct refuse-mode for scanning specifically would itself be a second, divergent resolution of the same question this ticket exists to unify. Precedent for 'two surfaces must resolve the same way, not drift into two heuristics' already existed in src/shared/textMatch.ts (ticket 43); this is the same pattern applied to project-root discovery, and future scan/storage-root call sites should default their root parameter to memory.getProjectRoot() rather than process.cwd().

---
id: 9bdbdbb0-fad9-4a8a-9e1a-a0c0f5c9daa3
createdAt: 2026-08-13T14:41:31.784Z
importance: 4
tags:
  - rc2
  - 2.2.0
  - adr
taskId: null
---
CLI dependency-graph filtering for `neuron memory list` is generic, not wayfinder-specific: `--where <field>=<value>` and `--refs-satisfy <field>:<subfield>=<value>` are two composable, schema-agnostic filters (any category, any declared field name, any enum value), not a bespoke `--frontier` flag hardcoded to this repo's own `status`/`blockedBy`/`unclaimed`/`resolved` vocabulary. The wayfinder frontier (docs/agents/issue-tracker.md) is just one example composition of the two generic flags. Reasoning: a memory-store CLI used across many projects with different declared-field schemas (ADR 0013) should not bake one project's own tracker vocabulary into a built-in flag — that couples the general-purpose tool to a single use case and would need a new hardcoded flag for every future dependency-graph-shaped category (deploys/dependsOn, reviews/waitingOn, etc). Verified genericity with a real second schema (deploys/state/dependsOn) in the test suite, not just asserted.

---
id: 6b2b462c-9229-42ea-82fd-a22914ee4222
createdAt: 2026-08-15T12:28:44.200Z
importance: 4
tags:
  - release
  - 2.2.0
  - adr
taskId: null
---
Provenance enforcement in neuron's write gate (Map -- neuron 2.4.2, ticket 2) will use a small, closed set of built-in declared-field types -- starting with a new commitRef type that validates a value resolves to a real commit via git -- rather than a pluggable field-verifier mechanism where projects supply their own validation code. Rationale: a custom-code verifier is a pluggable-provider surface, which this map's own non-goals explicitly rule out ('No new package, SDK, or pluggable-provider system'), and it would open a code-execution-on-write security question that a closed, named set of validator types avoids entirely. This repo's own decisions/learning categories will NOT get required commitRef/source fields as part of this work -- a decisions entry is routinely written before the commit that resolves it exists (this project's own session-time recording convention), so a required commitRef there would be unsatisfiable at write time. Instead a new git-notes category (required commitRef, durable commentary attached to an already-existing commit) is the mechanism's real live consumer, distinct from the auto-populated read-only git_log_index.

---
id: b2a804c7-09bf-477b-8743-45d3e8f9f59e
createdAt: 2026-08-15T12:53:41.555Z
importance: 4
tags:
  - retrieval
  - longmemeval
  - benchmark
taskId: null
---
Map — neuron 2.4.2, Ticket 3 (Near-Duplicate Suppression), resolved 2026-08-15: rejected adding any new raw-cosine similarity threshold below the existing 0.97 supersession gate, because ADR 0015 Decision 2 and ticket 39's LongMemEval sweep (0.50-0.70, every floor regressed recall) already established that real text has no reliable intermediate cosine band between 'same topic' and 'unrelated' -- picking a fresh guessed cosine number for near-dup detection would have repeated a pattern this codebase already disqualified twice. Decided instead to rebuild findSupersessionCandidate as a single unified gate: widen the candidate net to the top-N by raw cosine (a cheap pre-filter, not a decision), rerank each candidate with the existing TransformersReranker (src/components/reranker.ts, resident since ticket 29/ADR 0012), and gate on a newly-calibrated reranker-score bar rather than the existing RERANKER_ACCEPT_THRESHOLD=-8, since -8 is tuned for an asymmetric query-relevance task and is deliberately loose (19.4% false-accept rate) -- the wrong direction for a write-time block. The existing --supersedes/--not-a-reversal/--if-novel CLI surface and hit behavior carry over unchanged; only the detection signal underneath changes. This also sharpens ticket 4 (Conflict Detection): it can reuse the same widen-then-rerank primitive, but still needs its own signal to distinguish 'restates' from 'disagrees with', since reranker score alone measures relatedness, not polarity.

---
id: 1b51c428-d4e4-4475-b357-6ce4d54ac292
createdAt: 2026-08-15T18:13:17.717Z
importance: 4
tags:
  - release
  - git
  - 2.2.0
taskId: null
---
commitRef declared-field type (ticket 5, neuron-2.4.2): git-history-verified provenance, not a general verifier. Implemented as a single closed, built-in field type — validated via git rev-parse --verify --quiet <ref>^{commit} at the same enforceFieldSchema choke point every other declared field already goes through — rather than a pluggable custom-code verifier, which ticket 2's grilling rejected outright as a pluggable-provider surface this map's non-goals rule out. The not-a-git-repo case is distinguished from an unknown-commit case at the gitLog.ts level (git rev-parse --is-inside-work-tree checked before ref resolution) so a refused write always names why, never silently degrading the way read-path git-log parsing does. Not dogfooded onto decisions/learning (would collide with this project's own same-session decision-recording convention) — the new git-notes category is commitRef's real consumer instead. ADR 0013 amended rather than reopened: its original 'string and enum only' type-floor decision stands, commitRef is recorded as the one narrow exception.

---
id: 293b68d4-9d34-40b5-b8dd-e5b72e950fda
createdAt: 2026-08-15T18:47:58.922Z
importance: 4
tags:
  - retrieval
  - longmemeval
  - benchmark
taskId: null
---
Near-dup gate validation (ticket 7, neuron-2.4.2): the reranking-over-cosine approach itself is validated (N=10, bar=3 separates cleanly on isolated prose), but that calibration is not sufficient to build Ticket 6 against directly. A real-store counterfactual against this repo's own 683 live entries found the same bar/N flags mostly-false-positive pairs, driven by shared structural templates (scanner-generated architecture cards, templated wayfinder history logs) and by-design cross-category restatement (decisions/learning + history recording the same ticket twice on purpose) — content shapes the synthetic corpus never modeled. Decided not to let Ticket 6 proceed on the unvalidated bar/N: created Ticket 10 to decide the mitigation (exclude scanner-generated categories, scope to same-category only, a template pre-filter, or a separately-calibrated bar), and re-blocked Ticket 6 on it. Rationale: shipping the naive gate would visibly misfire on this repo's own store on day one — a dogfooding failure this map exists to prevent, not cause.

---
id: c19e8c03-ac83-41d8-9f8c-68069e9bc3de
createdAt: 2026-08-15T20:40:51.631Z
importance: 4
tags:
  - rc2
  - wayfinder
  - 2.2.0
taskId: null
---
Map — neuron 2.4.2, Ticket 12 (Redesign Session-Conclusion Recording), resolved 2026-08-15: decisions/learning and history entries cross-reference via the existing taskId field rather than each independently restating a session's resolution in full -- decisions/learning keeps the full content, history shrinks to a short pointer (plus the same taskId) whenever a decisions/learning entry exists for that session, and only keeps its current full-narrative shape when nothing was decided. This is the source-side fix Ticket 10 chose over gate-side special-casing in the near-dup gate (a config allowlist / taskId exemption inside the gate were both already rejected there). Explicitly scoped to new writes only: the maintainer declined to backfill the ~219 existing decisions/learning entries with null taskId (86/96 decisions, 133/133 learning) after confirming they resulted from CLAUDE.md's own documented command template never including --task-id for decisions/learning (unlike history's), not from entries bypassing the CLI -- backfilling them would be a retroactive migration pass, which this map's own non-goals already rule out. A companion neuron status --check finding to catch future drift was explored (blanket taskId-null check, then a category-scoped version, then a new non-required recommended: field-schema tier) and explicitly declined as unneeded scope. Implementation graduated to Ticket 48 rather than built in-session, matching this map's own Ticket 2->5 / 3->6 / 4->9 precedent; Ticket 6 now blocks on Ticket 48 instead of this design ticket, since Ticket 6's near-dup gate is only safe from the cross-category false-positive shape once new sessions actually stop producing full-restatement pairs.

---
id: 0facf45f-b8a4-4f9f-9ec3-ff28eb28c7a0
createdAt: 2026-08-15T23:25:35.155Z
importance: 3
tags:
  - rc2
  - wayfinder
  - 2.2.0
taskId: 78c7b32d-274a-4cac-bab6-55e83fa868b8
---
Map — neuron 2.4.2, Ticket 9 (Implement Conflict Detection at Write Time), resolved 2026-08-15: two design points its own text flagged as undecided were confirmed with the maintainer before building, rather than assumed. (1) Soft-flag surfacing mechanism is an inline, non-persisted CLI warning (stderr + a possibleConflict field on that one call's JSON response) — a persisted flag state was the alternative and was rejected because it would reopen the map's own "no PM-software creep, no workflow states beyond live/superseded" non-goal by needing a new declared field. (2) The soft-flag confidence bar is P(contradiction) >= 0.90, adopted directly from Ticket 8's own findings doc, which already names this as the best joint false-silence/false-accept operating point in its bar sweep (13%/27%) — a fresh pick for a soft-flag (non-blocking) posture, not a value Ticket 8/13 themselves chose, since those tickets calibrated for a hard-block posture Ticket 13 then ruled out entirely. A stricter bar (0.98) was offered and declined as favoring quiet warnings over useful ones.

---
id: 3625104e-4cad-4194-be1a-e65cb47423d9
createdAt: 2026-08-16T03:20:43.878Z
importance: 4
tags:
  - rc2
  - 2.2.0
  - wayfinder
taskId: de4f45be-34e0-45df-9a50-f72d0bdc5905
---
Map — neuron 2.4.3, Ticket 1 (Write-Side Compliance Nudge & Instrumentation), resolved: don't commit to a Stop-hook trigger mechanism yet — test whether an active nudge actually changes agent write-compliance behavior first, via a 3-arm real-agent A/B (control / simulated session-end nudge / explicit-instruction) reusing benchmarks/token-ab's live-session pattern (same agent, same SWE-bench task, run twice, deterministic tool-call grading) rather than the offline-corpus-scoring pattern the NLI model A/Bs used — that pattern doesn't fit a live-behavior question. Go/no-go rule: build the real trigger (and only then decide hand-wired dogfood-only Stop hook vs. full LifecyclePoint extension across all 4 harness adapters) if nudge/explicit-instruction clearly beat control; no-go if all three land close together. Compliance is graded deterministically — a real neuron memory add tool call in the transcript, mirroring hintFollowLog.ts's recordToolUse pattern-match, never an LLM judge. Build/run of the harness itself spawned as a new ticket (kind: research), not done in this grilling session, mirroring how ticket 11 spawned ticket 13 in Map — neuron 2.4.2.

---
id: 270115a5-5c57-46b8-b17c-dfca70e74a8f
createdAt: 2026-08-16T12:32:48.298Z
importance: 4
tags:
  - rc2
  - 2.2.0
  - wayfinder
taskId: ae0e3d5d-8564-471e-a2ed-73e54480c7e0
supersededBy: 05759e7b-d3ee-4bbe-ba18-8cea0a628288
supersededAt: 2026-08-16T17:43:17.767Z
---
Map — neuron 2.4.3, Ticket 6 (Design the Write-Side Compliance Trigger Mechanism): committed to a full LifecyclePoint extension (new session-end point, real support on Claude Code/Copilot, honest unsupported on Codex/Cursor) shipped generally via neuron init, not a hand-wired dogfood-only Stop hook — Ticket 5's A/B already proved the mechanism moves compliance from 20% to 100%, so the reason Ticket 1 gave for deferring real-hook engineering no longer applies. Scope grew mid-session at the maintainer's explicit request into a generic declarative injection layer (neuron.yaml entries declaring lifecycle point + category + --where filter + char budget, executed generically by hook.ts) specifically so Ticket 7 (Previous-Session WIP Handoff) becomes a pure-config change with zero new code once this ships; Ticket 7 is now blocked on Ticket 6. The gate-friction Ticket 5 surfaced (agents' own §1/§2 entries tripping a write-time gate) was root-caused during grilling to Map 2.4.2's near-duplicate/supersession gate (NEAR_DUP_RERANK_BAR) specifically, not its separate contradiction/reversal gate (P(contradiction)>=0.90) which an initial framing had mistakenly targeted, and deferred to a new Ticket 8, which retests that bar against real content rather than trusting its synthetic-corpus calibration (already known via Map 2.4.2 Ticket 10 not to transfer to real content).

---
id: 108fc8a0-2b4a-4bff-a816-63cfce0afd60
createdAt: 2026-08-16T12:56:45.049Z
importance: 4
tags:
  - npm
  - release
  - git
taskId: null
---
Release automation (publish.yml, neuron-2.3.0 ticket 21) changed what the actual irreversible release trigger is: the workflow fires on every push to main, derives the npm dist-tag from package.json's version itself (bare X.Y.Z to 'latest', X.Y.Z-rcN to 'rc'), skips if that exact version is already published, and only creates/pushes the git tag after a real 'npm publish' succeeds. Confirmed live 2026-08-12 (neuron-2.4.0 ticket 37, 2.4.0-rc1): the rc dist-tag path worked exactly as designed, and the already-published no-op guard correctly skipped re-publishing on two follow-up doc-only pushes to main. This means merging a release branch to main is now the actual irreversible step, not a separate manual 'npm publish' run afterward — any future release-cut ticket needs its maintainer go-ahead checkpoint placed before the push to main, not after a manual tag as older tickets assumed. Also confirmed live the same session: main carries an active GitHub branch ruleset ('Protect', id 20346327) requiring a PR with 1 approval plus code-owner review, CodeQL, and code_quality gates (current_user_can_bypass is 'always' for the repo owner, but the maintainer chose a real PR for the actual release-triggering merge rather than bypassing). The npm-publish GitHub Environment itself has no protection rules, so the branch ruleset on main is the only checkpoint before the real publish fires, not a second one after it.

---
id: 05759e7b-d3ee-4bbe-ba18-8cea0a628288
createdAt: 2026-08-16T17:43:17.717Z
importance: 4
tags:
  - 2.2.0
  - wayfinder
  - rc2
taskId: ae0e3d5d-8564-471e-a2ed-73e54480c7e0
supersededBy: f2bc6c9d-f1de-4dd7-9518-466028f1f340
supersededAt: 2026-08-16T19:33:33.334Z
---
Map — neuron 2.4.3, Ticket 6 (Design the Write-Side Compliance Trigger Mechanism), resolved via live /grilling: full LifecyclePoint extension, new session-end point, shipped generally via neuron init (not a dogfood-only Stop hook) — Ticket 5's A/B already proved the mechanism moves compliance 20%->100%, so Ticket 1's reason for deferring real-hook engineering no longer applies. Per-harness capability verified against each harness's own current docs, not assumed from stale in-repo comments: Claude Code (SessionEnd), Copilot CLI (sessionEnd, already documented unused in copilot.ts), and Cursor (sessionEnd, confirmed via docs) all get real support; Codex CLI confirmed to have none (GitHub issue openai/codex#20374 requesting it was closed not_planned, i.e. explicitly declined, not merely unbuilt) and gets an explicit-instruction prose fallback instead. Gate-friction Ticket 5 surfaced (agents' own §1/§2 entries tripping Map 2.4.2's near-dup/supersession gate) is fixed as part of this ticket's own implementation plan, not deferred: new --companion-of <id> flag on neuron memory add, explicit opt-in only (no time-based magic), matching the existing --supersedes/--not-a-reversal/--if-novel shape. Command-flag docs split out of README's growing reference section into a new docs/commands.md. OpenCode harness support (no adapter exists anywhere in this codebase) spun off as its own ticket rather than folded in, since it's full new-harness scoping unrelated to wiring one more point onto harnesses neuron already supports. Supersedes an earlier decisions entry (270115a5) from an interrupted prior session that reached a different, never-actioned draft design (a generic declarative neuron.yaml injection layer, gate-friction deferred rather than fixed) and left a stray, premature map bullet alongside it — neither that ticket 6 close nor the Ticket 7/8 it referenced were ever actually created; this entry reflects what was actually decided and closed.

---
id: 1c92c2a4-99c3-4ac7-a756-98b11c636f1c
createdAt: 2026-08-16T19:04:44.530Z
importance: 4
tags:
  - wayfinder
  - rc2
  - 2.2.0
taskId: neuron-2.4.3-ticket-9
---
Ticket 9 (neuron-2.4.3, Map — neuron 2.4.3) split this repo's own wayfinder issue tracker from a single tickets category into three by temporal status: tickets-present (storage: md, maps actively being worked and every child under them, open or resolved), tickets-past (storage: vector, closed maps and their children, archived whole-map-on-close not per-ticket), tickets-future (storage: vector, maps chartered/parked but explicitly 'not yet sequenced'). Design was settled by Ticket 3 via /grilling; this ticket was pure execution — no src/ code changes were needed since per-category storage mode override was already a live, generic mechanism, so the work was neuron.yaml + a one-off migration script + docs, not a build. Migrated all 259 existing entries (58 present / 198 past / 3 future) via a script driving NeuronMemory.open(process.cwd()).transact() directly, mirroring ticket 40's precedent; ran it live only after confirming the plan with the maintainer, since it's a bulk delete-and-recreate across the whole category. docs/agents/issue-tracker.md rewritten for the three-tier model; the wayfinder skill itself needed no change, since it was already tracker-agnostic by design.

---
id: f2bc6c9d-f1de-4dd7-9518-466028f1f340
createdAt: 2026-08-16T19:33:33.283Z
importance: 4
tags:
  - 2.2.0
  - wayfinder
  - rc2
taskId: ae0e3d5d-8564-471e-a2ed-73e54480c7e0
---
Map — neuron 2.4.3, Ticket 6 (Design the Write-Side Compliance Trigger Mechanism), resolved via live /grilling, then corrected mid-/tdd (2026-08-16). Supersedes 05759e7b, whose 'session-end' framing was the ticket's first, pre-correction design and went stale the moment implementation disproved it. Corrected design: the new LifecyclePoint is named pre-stop, not session-end, and maps to each harness's real per-turn stop-and-escalate event (Stop / agentStop / stop) rather than a fire-and-forget SessionEnd-family event -- verified empirically that SessionEnd-family events never reach the model and can't force another turn on any of the four harnesses. Claude Code's exact Stop field shape (decision:"escalate" + additionalContext) was confirmed empirically via a live headless-session probe run from this repo's own Claude Code session, not sourced from docs. Codex CLI turns out to have real Stop support too (doc-sourced): the original 'no hook exists, needs an explicit-instruction prose fallback' conclusion had checked the wrong event name entirely, so the Codex fallback is dropped as unneeded -- all four harnesses (Claude Code, Copilot CLI, Cursor, Codex CLI) now get real pre-stop support, none get a prose-instruction substitute. Shipped generally via neuron init, not a dogfood-only hook. Nudge blocks once per session via new session-scoped ledger.ts state (deliberately not epoch-scoped), mirroring Ticket 5's proven design. Gate-friction Ticket 5 surfaced (agents' own multi-section entries tripping Map 2.4.2's near-dup/supersession gate) fixed as part of this ticket's implementation, not deferred: new --companion-of <id> flag on neuron memory add, explicit opt-in, matching the existing --supersedes/--not-a-reversal/--if-novel shape. Command-flag docs split out of README into docs/COMMANDS.md, which also documents the full gate-resolution flag family together for the first time. OpenCode harness support spun off as its own ticket rather than folded in. Built via full red-to-green /tdd across all 9 implementation-plan steps: npm test 792/792 across 71 files, tsc --noEmit clean.

---
id: 2ae15cc1-53c0-4ae6-93b7-b6fba4d68253
createdAt: 2026-08-17T00:46:17.100Z
importance: 4
tags:
  - wayfinder
  - tracker-hygiene
taskId: null
---
Resolved Ticket 9's (neuron-2.4.3) flagged gap on the 11 map-less tickets-present backlog items ('the maintainer may want a different rule' than status-only classification): grouped all 11 into one new map, Map — Codebase Cleanup & Engineering Health (id 19803cce-ad56-4774-9492-49f6f5d71f67), rather than splitting them into separate repo-hygiene and CLI-ergonomics maps. Chartered directly into tickets-future rather than tickets-present, since none of the 11 are claimed or blocking the two already-sequenced maps (Site 2.5.0, MCP Server & Setup/Onboarding Skill Split) — promote to tickets-present manually when ready to sequence. Same session also archived Map — neuron 2.4.2 and Map — neuron 2.4.3 (both fully resolved, 14 children each) from tickets-present into tickets-past via the documented delete-then-upsert pattern (docs/agents/issue-tracker.md's Archiving section), confirming tickets-present now holds only the two actively-sequenced maps.

---
id: 5d4ea5e7-dbaf-45bd-9acb-65ef9dc02009
createdAt: 2026-08-17T11:20:50.590Z
importance: 4
tags:
  - release
  - failure-fix
  - publish
taskId: null
---
Curl-Installable Standalone Binary map's Ticket 1 resolved: chose @yao-pkg/pkg over Node SEA, nexe, and Bun build --compile for the standalone binary packaging tool. Deciding factor was cross-compilation from a single Linux CI runner across all six targets (macOS/Linux/Windows x x64/arm64) -- pkg's own docs are the only ones making an unqualified claim this works today, while Node SEA's docs explicitly mark macOS x64 as untested in Node's own CI. Bun was fastest and had the best-documented cross-compile story but was declined because it would move neuron onto Bun's runtime in production, requiring re-verification of every node:sqlite/onnxruntime-web fallback path against Bun's Node-API compatibility layer -- judged too large a bet for a packaging-tool ticket. Full research: docs/design/distribution/packaging-tool-research.md.

---
id: fb1d8656-09c6-4c1b-baf7-1e825e1b97b6
createdAt: 2026-08-17T11:31:19.695Z
importance: 4
tags:
  - release
  - failure-fix
  - publish
taskId: null
---
Curl-Installable Standalone Binary map's Ticket 2 (Windows Install Convention) resolved: primary Windows install method is a PowerShell 'irm <url>/install.ps1 | iex' one-liner (Bun's wrapped powershell -c invocation shape), mirroring Deno's and Bun's own verified install.ps1 scripts — both are the closest prior-art (single-binary language/runtime CLIs distributed the same way neuron will be), and both fetched/read directly rather than assumed. rustup's downloadable-.exe pattern and ripgrep/fd's Releases-page-first convention were real alternatives found but declined — neither matches the one-paste-line UX the curl pattern already sets on macOS/Linux. Secondary: publish a winget manifest (peer-listed per Deno's posture, not headline) — Microsoft's own docs confirm winget isn't guaranteed present at first login on even supported Windows versions, and Bun's community winget package has a live unresolved PATH bug (oven-sh/bun#20868) as a concrete caution against relying on it alone. Scoop is a low-cost tertiary bucket entry; Chocolatey declined outright. Full research: docs/design/distribution/windows-install-convention-research.md. Ticket 3 (native-addon bundling) and Ticket 4 (code-signing) remain the open frontier on this map.

---
id: a25865cf-477f-4571-afac-39c4fcc82014
createdAt: 2026-08-17T14:13:32.103Z
importance: 4
tags:
  - db-schema
  - release
  - failure-fix
taskId: 9cbc685c-807e-4f69-b599-c39d5d011824
---
Curl-Installable Standalone Binary map's Ticket 4 (Code Signing) resolved: ship the standalone binary unsigned at launch, accepting the macOS Gatekeeper and Windows SmartScreen first-run warnings, rather than blocking on macOS notarization or Windows Authenticode signing. Decided live with the maintainer via grilling: the audience is developers/CLI users, the same crowd rustup/deno/bun's own early unsigned or lightly-signed releases targeted, who already know how to right-click-Open or run 'xattr -d com.apple.quarantine' -- not a broader non-technical audience the warning could turn away on first contact. Not ruled out permanently: signing (a $99/yr Apple Developer account plus a notarization pipeline step, plus a separate, pricier Windows Authenticode/EV cert) is an accepted, unscheduled follow-up with no formal revisit trigger tied to it (no complaint count or install-volume milestone). Tickets 5-8 (CI build matrix, install.sh, Windows install path, neuron upgrade, README) proceed against unsigned binaries.

---
id: 3fb733dd-c167-4bbc-bb96-dc49cc22cd98
createdAt: 2026-08-17T14:57:30.230Z
importance: 4
tags:
  - release
  - npm
  - publish
taskId: 1f3592a2-1032-4295-b3dc-405d05a63fe8
---
Curl-Installable Standalone Binary map's Ticket 5 (CI Build Matrix) resolved: publish.yml gains build-binaries (6-target matrix, one ubuntu-latest runner per Ticket 1's cross-compile story) and release-assets (SHA256SUMS + GitHub Release) jobs, gated on dist_tag == 'latest'. Narrows Ticket 3's literal 'bundle both native addons' decision: better-sqlite3 bundles and loads correctly inside the pkg-packaged binary (confirmed), but onnxruntime-node's native binding cannot be made to load inside a pkg snapshot even as an explicit pkg asset, so every ONNX-backed feature (embeddings, reranking, NLI, summarization) runs on WASM only in the curl-installed binary specifically -- confirmed non-fatal (a failed vector-index write reconciles from markdown rather than crashing the command), accepted as an unscheduled-follow-up v1 gap, same posture as Ticket 4's unsigned-binary call. The npm install path is unaffected. Full mechanism and both real findings: docs/design/distribution/ci-build-matrix.md. Tickets 6 (install.sh) and 7 (Windows install path) are now the open frontier.

---
id: 2e8ff47b-c7fd-4d74-8315-a08e060db4ff
createdAt: 2026-08-17T15:07:37.307Z
importance: 4
tags:
  - publish
  - release
  - failure-fix
taskId: null
---
Curl-Installable Standalone Binary map's Ticket 6 (Write and Ship install.sh) resolved: shipped a POSIX sh script at the repo root that detects OS/arch via uname, resolves the latest GitHub Release tag via the API, downloads the matching asset plus SHA256SUMS, and hard-fails (non-zero exit, nothing written to disk) on any missing or mismatched checksum entry -- never installs an unverified binary. Installs to $HOME/.neuron/bin by default, overridable via NEURON_INSTALL, deliberately mirroring Bun's BUN_INSTALL/Deno's DENO_INSTALL own-directory convention rather than inventing a new one, consistent with Ticket 2's research into what comparable single-binary CLIs already do. Verified end-to-end (happy path, checksum-mismatch rejection, PATH-already-set) against a local mock GitHub-release server built with python3 -m http.server, since no real GitHub Release carrying Ticket 5's asset names has been cut yet -- the shipped script itself needed no test-only branches; only an env-substituted copy pointed at localhost was used for the test runs. Windows is explicitly out of scope for this script and its own error message points at Ticket 7/install.ps1 for an unsupported OS. Unblocks Ticket 8 (neuron upgrade) and Ticket 9 (README install-path docs), both already specified on the map and now the frontier.

---
id: 6893fcb9-327f-4f7c-a39c-7b8395666fc5
createdAt: 2026-08-17T15:16:22.220Z
importance: 4
tags:
  - publish
  - release
  - 2.2.0
taskId: c1680372-4dc8-4502-9b98-d86b31cbe007
---
Curl-Installable Standalone Binary map's Ticket 7 (Ship the Windows Install Path) resolved: shipped install.ps1 at the repo root, mirroring Deno/Bun's own irm | iex script mechanics per Ticket 2's research -- real-arch detection via RuntimeInformation.OSArchitecture (correct under x64-on-ARM64 emulation, no registry read needed), install to NEURON_INSTALL/%USERPROFILE%\.neuron\bin, user-scope PATH via .NET SetEnvironmentVariable. Verified Ticket 5's CI matrix actually ships a raw .exe per target, not the zip the research doc assumed by analogy before a real build existed, so the script downloads and installs that file directly. Reuses Ticket 6's SHA256SUMS-or-refuse discipline against the same checksums file. Winget (secondary) and Scoop (tertiary) manifests drafted as templates under packaging/ rather than filed for real: both need a real cut release to pin a version/URL/SHA256, and winget specifically means a PR against the external microsoft/winget-pkgs repo, not fabricated against placeholder data -- same accepted-follow-up posture Ticket 4 (unsigned binaries) and Ticket 5 (WASM-only ONNX) already set on this map. Full record: docs/design/distribution/windows-install-path.md. Unblocks Ticket 9 (README install-path docs) alongside Ticket 6.

---
id: 56365aee-78ab-4b8b-a7a1-8bfc63c42654
createdAt: 2026-08-17T15:29:44.795Z
importance: 4
tags:
  - publish
  - release
  - 2.2.0
taskId: 33f6a40c-9a1e-432f-aeb4-325bc672be5f
---
Curl-Installable Standalone Binary map's Ticket 8 (Implement `neuron upgrade`) resolved: shipped a top-level `neuron upgrade` command that self-replaces the running standalone binary in place -- fetches the latest GitHub Release tag, compares against the running version, downloads the matching platform/arch asset plus SHA256SUMS, verifies via node:crypto sha256 (same discipline as Ticket 6's shell sha256sum/shasum check), and atomically swaps the executable, rolling back to the previous binary if the swap fails mid-way rather than ever leaving a half-replaced state. Refuses immediately (pointing at `npm install -g @kovartravis/neuron@latest`) when not running under pkg, so it never tries to touch an npm install. Two real design decisions worth recording: (1) a pkg binary has no package.json next to it at runtime, so its own version is baked in at build time via esbuild's --define (scripts/build-binary.mjs, the same mechanism the existing import.meta.url shim already uses), read through a `typeof __NEURON_VERSION__ !== 'undefined'` guard so the plain tsc build npm publishes falls through unaffected to reading package.json two directories up from the entry point; (2) the downloaded asset is staged in the *same directory* as the running executable rather than the system tmpdir, so the final replace is guaranteed to be a same-filesystem rename -- a cross-filesystem rename (tmpfs -> the real install dir) can fail with EXDEV, which would silently turn "atomic" into "sometimes." Also found and fixed a real pre-existing gap: install.sh/install.ps1 (Tickets 6, 7) already tell users to run `neuron --version` to confirm the install, but the CLI had no such flag until this ticket added one (src/components/version.ts), which doubles as the version-detection mechanism `upgrade` itself needs. Verified via 18 new tests including a full runUpgrade pass against a local mock GitHub API + Releases server (node:http, mirroring Ticket 6's own mock-server verification) covering successful upgrade, checksum-mismatch rejection, already-up-to-date, and --check; npm test 799/799, tsc clean, neuron scan re-baselined for the new export surface. Not run against a real cut GitHub Release or the actual packaged pkg binary self-replacing itself -- same honest gap Tickets 6 and 7 already carry. Unblocks nothing further; Ticket 9 (README install-path docs) is the map's other already-specified frontier ticket, independent of this one.

---
id: 23d89e33-dfa8-4335-9943-75b723508b69
createdAt: 2026-08-17T16:09:48.107Z
importance: 4
tags:
  - wayfinder
  - 2.2.0
  - rc2
taskId: null
---
Closed out Map — Curl-Installable Standalone Binary: the maintainer verified the destination live (v2.4.4 published to npm's latest dist-tag and to GitHub Releases with all 6 binary targets + SHA256SUMS, confirmed via 'npm view @kovartravis/neuron version' and 'gh release list'), so the map is reached, not just its tickets resolved. Archived the map and all 9 children (1 map + tickets 1-9, all previously resolved) from tickets-present into tickets-past via the documented delete-then-upsert pattern (docs/agents/issue-tracker.md's Archiving section) -- a one-off tsx script calling NeuronMemory.transact() directly, same precedent as ticket 40/45 and the 2.4.2/2.4.3 archiving session, since the CLI has no bulk-move command and a same-id upsert alone won't move an existing row's category. All 10 ids verified content-identical post-move via findById before/after. tickets-present now holds only the two other actively-sequenced maps (SEO & GEO Groundwork, MCP Server & Setup/Onboarding Skill Split).

---
id: 730e6873-9340-4b09-9232-65ff620a1a1d
createdAt: 2026-08-17T18:54:37.872Z
importance: 4
tags:
  - rc2
  - adr
  - setup
taskId: 5d4082cf-aee3-4319-818d-9e13669901f5
---
Ticket 2 (Onboarding-Migration Behavior, map MCP Server & Setup/Onboarding Skill Split) resolved via live grilling. Migration flow for the new first-time-setup skill: on detecting CLAUDE.md/AGENTS.md/CURSOR.md (corrected from the ticket's original CLAUDE.md/.cursorrules/AGENTS.md wording -- .cursorrules is referenced nowhere in src/, only in docs, so it isn't one of the file shapes neuron's own harness adapters recognize), the invoking coding agent itself parses the prose into structured category-tagged entries and calls neuron memory add per entry -- not a new embedded-model pipeline, since neuron has no summarizer LLM sized for bulk document parsing (SmolLM2Summarizer was made fully deterministic under ticket 26; the one live model, Xenova/Qwen1.5-0.5B-Chat in LocalEnrichmentModel.inferCategory, is a small few-shot single-entry classifier). The original file is kept untouched, with a migration note folded into the existing protocol-block marker region (upsertProtocolBlock) rather than a new marker. Detection runs before the category-configuration interview so findings can inform which categories get proposed, and the skill previews proposed entries and gets explicit confirmation before writing anything, matching neuron-memory's existing ask-first mandate. Mid-grilling, the maintainer asked for evidence that this migration doesn't cost rule-following effectiveness, so a non-blocking sibling ticket (7 -- A/B test comparing CLAUDE.md-only control vs neuron's shipped deterministic hook vs the new neuron_recall MCP tool, on Claude Code, deterministic transcript grading not an LLM judge) graduated to validate the premise rather than being folded into ticket 2's own answer.

---
id: d215c50f-bffc-43ac-83fd-76ae7ce9746a
createdAt: 2026-08-17T19:06:20.034Z
importance: 4
tags:
  - setup
  - rc2
  - wayfinder
taskId: a773beec-dc7d-4da7-afe1-424a5b341fb1
---
Resolved wayfinder ticket 3 (Design the Setup/Maintenance Skill Boundary, Map — MCP Server & Setup/Onboarding Skill Split) via a live /domain-modeling session with the maintainer. Named the new first-time-setup skill neuron-onboarding (.claude/skills/neuron-onboarding/SKILL.md, not neuron-setup), settling a placeholder Ticket 5's own deliverables had left open. Split neuron-memory's SKILL.md §7 (Architectural Scan & Configuration Protocol) along its setup/operate seam: the ask-and-configure steps move to neuron-onboarding alongside §0/§0a/§0b, while execute-scan and read-blueprint stay in neuron-memory alongside §8's drift protocol. Defined the previously-undefined 'help' purpose for the narrowed neuron-memory as a new consolidated Troubleshooting section (enrichment degradation, sync --force conflicts, prune surprises, drift/re-baseline confusion, strict-mode write errors) built comprehensively from existing documented behavior rather than a thin --help pointer or a small living FAQ, and flagged that some content inside sections moving wholesale to neuron-onboarding (§0a's status-monitoring paragraph, §0b's strict-mode error behavior) is actually runtime-diagnosable and should be duplicated into Troubleshooting too, not just relocated. Updated CONTEXT.md's neuron-memory glossary entry to reflect the narrowed operate-loop scope and added a neuron-onboarding entry. Unblocks Ticket 5 (Implement First-Time-Setup Skill); npm test 799/799 green.

---
id: 592d1552-db6c-4d32-86ad-e56eb4cea48e
createdAt: 2026-08-17T19:50:33.961Z
importance: 4
tags:
  - 2.2.0
  - wayfinder
  - rc2
taskId: fada539c-31ee-4a3a-9f4a-2b3fe86165b4
---
Resolved wayfinder ticket 4 (Implement MCP Server, Map — MCP Server & Setup/Onboarding Skill Split). Shipped neuron mcp: a stdio-transport MCP server built on the official @modelcontextprotocol/sdk, wired into cli.ts's existing flat dispatch (no separate binary/bin entry), exposing exactly ticket 1's 3-tool surface -- neuron_remember (content/category/importance/supersedes/companion_of, no tags param since tags stay server-inferred), neuron_recall (query/categories, returns {results, rejected} verbatim), and neuron_query_exec (command_text, lookup only, never spawns). The key implementation decision: rather than let neuron_remember re-implement memory add's write-time supersession gate (ticket 17 / ADR 0015) plus the ticket-9 NLI conflict soft-flag and ticket-6 companion exemption as a second, parallel logic path, that entire decision block was extracted out of the CLI add branch into a new exported performMemoryAdd (src/commands/memory.ts) returning a discriminated result instead of printing/exiting -- the CLI add branch now just translates that result to stdout/stderr/exit-code exactly as before (verified byte-identical via memory.test.ts's existing 35 tests, unmodified). ifNovel/notAReversal stay unexposed via MCP per ticket 1's own scoping, so a supersession-candidate hit on a remember call surfaces as an isError:true tool result naming the candidate id rather than silently skipping or hard-crashing. Verified live: JSON-RPC smoke test against the built dist/cli.js mcp covering initialize/tools-list/all three tools, including the supersession-block error path in an isolated tmp project. npm test 799/799, tsc clean. Confirmed (not assumed) that Map -- neuron.github.io Site (2.5.0)'s Ticket 2 still lists this ticket in its blockedBy alongside Ticket 6 (not yet resolved), so that edge stays correct as-is.

---
id: faf0d2d3-4395-4a89-aa4b-165edc2215dd
createdAt: 2026-08-17T20:11:01.611Z
importance: 4
tags:
  - setup
  - 2.2.0
  - rc2
taskId: 33bc46e8-c074-4275-a20b-7494d2a2a35e
---
Ticket 5 (Implement First-Time-Setup Skill, Map — MCP Server & Setup/Onboarding Skill Split) resolved: built .claude/skills/neuron-onboarding/SKILL.md combining Ticket 2's onboarding-migration design and Ticket 3's moved setup content (interview, neuron.yaml generation, write-side-enrichment/strict-mode interviews, initial architecture-scan config). Decided the trigger mechanism (left open by Ticket 3): generalized copySkill in src/config/harness.ts to take a skillName parameter instead of being hardcoded to neuron-memory, and neuron init now fans both neuron-memory and neuron-onboarding out to every detected harness's skills dir identically, packaged via package.json's files field so it works on real neuron init runs against other repos, not just this one. For the migration-note-inside-the-existing-marker decision (Ticket 2 decision 5), determined no new code was needed: upsertProtocolBlock (src/config/protocolBlock.ts) already refuses to silently clobber a managed protocol-block region whose content differs from what it would regenerate (asks, or keeps existing non-interactively) — so a hand-added migration note inside that same marker region is already protected by that existing ask/keep policy, avoiding a new migration: config schema field that would have been disproportionate scope for this ticket. Cross-linked both skills with a note (neuron-memory still carries the full duplicated setup content pending Ticket 6's trim, now unblocked).

---
id: 6d357f73-f609-43e1-9e25-490d0988cf63
createdAt: 2026-08-17T20:22:45.557Z
importance: 4
tags:
  - rc2
  - wayfinder
  - 2.2.0
taskId: 0c51a772-ff20-4d78-89dd-49a018b01b55
---
Resolved wayfinder ticket 6 (Trim neuron-memory SKILL.md to Maintenance/Help/Cleanup Scope) on Map — MCP Server & Setup/Onboarding Skill Split. Removed §0/§0a/§0b (initial-setup interview, write-side-enrichment interview, determinism/strict-mode interview) and §7's setup-config steps from .claude/skills/neuron-memory/SKILL.md, per Ticket 3's exact boundary decision — that content now lives solely in neuron-onboarding, shipped by Ticket 5. Added a new §9 Troubleshooting section implementing Ticket 3's 'help' definition: five failure modes (enrichment degradation, sync conflicts, prune surprises, scan --diff re-baseline-vs-drift, strict-mode write errors) as Symptom/Cause/Fix, deliberately duplicating the enrichment-degradation and strict-mode diagnostics out of the removed setup sections rather than leaving them setup-skill-only, since an agent troubleshooting mid-session shouldn't need to open the onboarding skill. Rewrote the skill's frontmatter description to match the narrowed operate-loop scope. npm test 799/799, tsc clean (docs-only change). This ticket plus the already-resolved Ticket 4 unblock Map — neuron.github.io Site (2.5.0)'s Ticket 2 (Homepage Messaging). Only remaining frontier item on this map is Ticket 7, a non-blocking A/B benchmark.

---
id: 74a4c0af-c202-4a08-a395-fec4ebcb38bc
createdAt: 2026-08-18T17:24:00.982Z
importance: 4
tags:
  - 2.2.0
  - wayfinder
  - rc2
taskId: 31ea7120-edf3-473c-b0ef-8f6223426157
---
Resolved wayfinder ticket 8 (Design What neuron init Writes When MCP Is the Reach Mechanism, Map — MCP Server & Setup/Onboarding Skill Split) via a live /grilling session with the maintainer. Four decisions settled: (1) MCP presence never counts as deterministic fidelity in neuron init's protocolBlock generation, permanently -- MCP has no per-turn injection point, and ticket 7's A/B already showed MCP-as-sole-carrier-behind-an-optional-pointer scoring 0/8 compliance, so wiring MCP into the deterministic check would make neuron init ship exactly that losing configuration by default. (2) Where MCP is configured and no deterministic recall hook exists for that harness, recallStep() emits the neuron_recall tool call instead of bash neuron memory query -- made possible without a separate detection mechanism because decision 4 makes neuron init itself the source of truth for MCP-configured status. (3) Where a deterministic hook already exists (Claude Code, Codex CLI), the agent file stays silent on MCP for both read AND write -- the maintainer explicitly extended ticket 1's read-side 'no steering away from the hook' ruling to the write side too (no neuron_remember mention), keeping one authoritative verb per surface. (4) neuron init writes each client's mcpServers config directly (not prompt-only, not deferred to neuron-onboarding), reusing ADR 0014 section 7's exact ask-on-conflict/default-keep posture rather than inventing a second policy. Deliberately left unresolved: exact per-client config paths/formats (Claude Code's .mcp.json, Cursor's .cursor/mcp.json, Codex's config.toml [mcp_servers] TOML table, Copilot CLI's user-level-only ~/.copilot/mcp-config.json, and the agents harness having no single MCP-config product to target) -- ticket 10's original harness research predates MCP entirely, so these were carried from general knowledge rather than verified, and the maintainer chose to graduate ticket 9 (Implement MCP Reach Signaling in neuron init) as a follow-up rather than settle unverified facts inside a grilling ticket. Matches this map's established grilling-then-implement pattern (ticket 1 into ticket 4, tickets 2/3 into ticket 5).

---
id: da515e6e-2d48-4119-9c4d-17d9f1960045
createdAt: 2026-08-18T17:48:14.641Z
importance: 4
tags:
  - 2.2.0
  - rc2
  - setup
taskId: 6471bcf0-27c3-46a8-8263-2997d1a82bda
---
Ticket 9 (neuron-2.4.3, MCP Server & Setup/Onboarding Skill Split map): implemented Ticket 8's ruling that neuron init writes each detected harness's MCP client config directly. Key design choice: MCP client-config writing is a new module (src/harnesses/mcpClientConfig.ts) parallel to HarnessAdapter, not bolted onto it — a hook adapter answers how a harness receives a per-turn recall event, this module answers where that harness's editor looks for an MCP server to spawn, and the two are independent (a harness can have one, both, or neither). It reuses the exact --hook-target/--overwrite-hooks/--keep-hooks/--harness/--no-hooks flags already resolved once per init run for hooks (ADR 0014 section 7), rather than inventing a second conflict policy. For Codex CLI's config.toml, chose a hand-rolled line-based [mcp_servers.neuron] table finder/splicer (mirroring protocolBlock.ts's own marker-region-splice convention) over a general TOML parse-and-restringify, after live-testing the one npm package claiming comment-preserving TOML patch semantics (toml-patch) and finding it broken for inserting brand-new keys. claude and github harnesses share the same .mcp.json target file by design (Copilot CLI prefers .mcp.json over .github/mcp.json whenever both exist), deduped at the init.ts orchestration layer so the identical entry is written once but reported per harness.

---
id: bc44464e-6a44-4592-9fbe-b7cfb68bec9d
createdAt: 2026-08-18T20:18:20.497Z
importance: 4
tags:
  - rc2
  - wayfinder
  - 2.2.0
taskId: 5d4082cf-aee3-4319-818d-9e13669901f5
---
Ran a breadth-first grill on Map — MCP Server & Setup/Onboarding Skill Split after all 9 child tickets closed, to check whether its 'Not yet specified' being empty actually meant the destination was reached. Surfaced one real gap: Ticket 7's A/B finding that agent-invoked neuron_recall with no hook backing it gets 0% compliance (called only 5/8 sessions, never compliant even when called) was never folded into the shipped docs, which described the MCP recall-verb swap as if it were compliance-neutral. Maintainer ruled it an accepted limitation per ADR 0014's own MCP-is-additive-not-a-hook-replacement non-goal (no new ticket), but asked for the docs to be made honest about it now rather than deferred — added a caveat citing docs/design/rule-recall-ab/findings.md to both README.md's MCP server section and docs/COMMANDS.md's neuron mcp section. With no further fog, archived the whole map (10 entries: the map plus tickets 1-9) from tickets-present to tickets-past via same-id delete-then-upsert, per docs/agents/issue-tracker.md's whole-map archiving convention.

---
id: 4026577f-3a58-4e71-8c3f-66bfd340abf1
createdAt: 2026-08-19T14:58:50.552Z
importance: 4
tags:
  - planning
  - setup
  - rc2
taskId: null
---
Map — neuron.github.io Site (2.5.0)'s Ticket 2 (Homepage Messaging & Positioning) resolved via live grilling: category framing settled as 'local-first memory engine for coding agents', tightened from the competitive-landscape doc's two-noun candidate statement, with local-first foregrounded as the maintainer's explicit instruction rather than a supporting pillar. Hero contrasts by pattern not product (no Mem0/Zep/CLAUDE.md named) to avoid unverified competitor claims. Pillar order leads with Zero-Cloud Privacy (not the doc's original Zero-Amnesia-first order) to keep local-first the throughline past the hero; pain-point section deliberately placed after the pillars rather than Turso-style before them. Primary CTA is the shipped curl install one-liner, tabbed with npx, diverging from the doc's unexamined npx-first assumption. Of the competitive doc's two undecided 'actionable ideas', greenlit idea D (neuron scan --check as a CI/CD architecture-linter) homepage-light only — explicitly not un-deferring the map's existing Architecture Scan documentation-depth fog item — and ruled idea C (benchmark-proof collateral) out of scope rather than deferred, since its figures were illustrative placeholders never measured against this repo. Full record: docs/design/site/homepage-messaging-positioning.md.

---
id: fa47b617-a73f-460d-9290-4cbc99d9976a
createdAt: 2026-08-19T16:02:53.911Z
importance: 4
tags:
  - planning
  - wayfinder
  - setup
taskId: 19f204e7-ed0c-4883-8a86-9416bb257c02
---
Map — neuron.github.io Site (2.5.0)'s Ticket 4 (Homepage Visual & Brand Direction) resolved via /prototype: three structurally different homepage directions (Terminal Anchor — dark/monospace/terminal-window hero; Split SaaS — light two-column with a code-result card; Minimal Text-First — no code chrome, list-style pillars, prose pain-points) built as a switchable static Astro page and reacted to live with the maintainer. Winner: Minimal Text-First — warm off-white ground, near-black text, a single sparing deep-green accent, system sans throughout, no code block or terminal chrome anywhere in the hero. This settles the map's 'does the homepage need a live/interactive demo' fog item as no, confirming Ticket 1's survey finding (no dev-tool homepage surveyed embeds one) with a live maintainer reaction rather than resting on the survey alone. A follow-up round added a mobile breakpoint (stacked full-width CTAs, resized H1, wrapped install command, tightened pillar-list spacing) after the maintainer flagged the initial prototype's narrow-viewport behavior. The full three-variant prototype, including the mobile fix, is captured on throwaway branch prototype/ticket4-homepage-variants (commit e8b6bbd) as the primary source per the prototype skill — main only carries the resolved ticket and the folded decision; Ticket 7 (Build the Homepage) implements the real homepage from that branch as reference.

---
id: 58c40b10-0868-48fd-b588-fe0b7f91ecac
createdAt: 2026-08-19T16:22:43.591Z
importance: 4
tags:
  - wayfinder
  - rc2
  - 2.2.0
taskId: null
---
Closed out Map — SEO & GEO Groundwork: all 7 children (keyword/search-intent research, IA & citability conventions, structured data strategy, sitemap/robots/canonical setup, llms.txt decision, content-authoring guidelines, GEO citation measurement) resolved, no remaining fog, destination reached (SEO/GEO conventions established and fed forward into Map — neuron.github.io Site's Tickets 2, 3, and 7, all now resolved). Archived the map and all 7 children from tickets-present into tickets-past via the documented delete-then-upsert pattern (docs/agents/issue-tracker.md's Archiving section), same precedent as prior map archivals -- a one-off tsx script calling NeuronMemory.transact() directly, since the CLI has no bulk-move command and a same-id upsert alone won't move an existing row's category. All 8 ids verified content-identical (content/tags/importance/fields) post-move via neuron memory get before/after. tickets-present now holds only Map — neuron.github.io Site (2.5.0).

---
id: 85df36f4-cf86-443e-9beb-2e39a61076b4
createdAt: 2026-08-19T17:51:25.236Z
importance: 4
tags:
  - planning
  - wayfinder
  - 2.2.0
taskId: null
---
Archived Map — neuron.github.io Site (2.5.0): all 12 children resolved (marketing/docs-site survey, homepage messaging, docs IA, homepage visual direction, Astro+Starlight scaffold, GitHub Pages deploy, homepage build, docs content, CLI/config reference, docs-review release step, TechArticle/Person JSON-LD, and the FAQ-content/alternatives-page follow-up), no remaining fog, Destination reached — the site is live at kovartravis.github.io/neuron and a docs-review step now exists in docs/RELEASING.md. Moved the map and all 12 children (13 entries) from tickets-present into tickets-past via the documented delete-then-upsert pattern (docs/agents/issue-tracker.md's Archiving section, same precedent as the SEO & GEO Groundwork and MCP Server Split map archivals) — a one-off tsx script driving NeuronMemory.transact() directly against src/index.ts, since a same-id upsert alone won't move an existing row's category and the CLI has no bulk-move command. All 13 ids verified content-identical (content/tags/importance/createdAt/fields) post-move via neuron memory get before committing. tickets-present now holds zero maps — the next wayfinder session on this repo starts from an empty board until a new map is chartered.

---
id: 2afbc200-e8f9-40ae-824c-eb8d81a971d8
createdAt: 2026-08-20T04:15:26.709Z
importance: 4
tags:
  - architecture
  - benchmark
  - scan
taskId: afbf870e-8546-4fdd-8f21-4cbd89e9f9c7
---
Ran a 3-way A/B on capturing 'what a file does' for architecture-scan purpose text, using only local models: deterministic call-graph/control-flow extraction (no model call) beat both retrieval (nearest match from this repo's own decisions/architecture/learning store, leave-one-out) and generative (Xenova/Qwen1.5-0.5B-Chat, few-shot) on mean, median, and per-file win count (7/10 vs 3/10 vs 0/10) across 10 real files scored by cosine similarity against each file's own withheld human-authored header. The generative mode's 0/10 extends the prior six-for-six pattern of the shipped 0.5B model losing every A/B it has been measured on (tagging, category, importance, pruning, dedupe, salvage-expansion) to a 7th task — the first that was open-ended generation rather than classification/judgement, closing the one gap in that prior evidence. Decision: deepen neuron's own architecture scan (src/scanner/summarizer.ts, currently JSDoc-extraction-only with zero model calls despite the SmolLM2Summarizer name) via richer deterministic AST facts — real call-graph and control-flow extraction — rather than adding a generative-model job, the next time that scan is built out. Assets: benchmarks/file-behavior-ab/{corpus.ts,run-ab.ts,raw-scores.json}, uncommitted as of this entry.
