# ADR 0007: Deep E2E Benchmark Suite Matrix & Challenge Scorecard

- **Status**: Accepted
- **Date**: 2026-07-31
- **Author**: Claude & Travis Kovacs
- **Context**: Ticket 04 (`2.1.0-rc5`) requires a comprehensive, adversarial E2E benchmark suite to stress-test all core Neuron capabilities (semantic recall, pre-command `neuron exec` retrieval, Dual/MD file synchronization, AST scanning, 4-bucket drift detection, and storage self-healing) under realistic high-concurrency monorepo workloads.

## Decision

1. **Polyglot Test Matrix Fixtures (`test/e2e/fixtures/`)**:
   Establish polyglot benchmark fixtures containing TypeScript, Python, Go, Rust, Java, and C++ source files, circular module dependencies, multiple project manifests (`package.json`, `Cargo.toml`, `go.mod`, `pyproject.toml`), and distractor files. Extended languages (`.tsx`, `.jsx`, `.cs`, `.swift`, `.rb`, `.php`, `.hpp`) live in a small separate `polyglot_extras` module rather than being mixed into the numbered modules: the summarizer caches per file content, so changing the main modules' extensions would invalidate every cached entry and force a full cold re-scan.

2. **Run the real pipeline, not the test stub**:
   Vitest sets `NODE_ENV=test`, and both `summarizer.preloadModel()` and `summarizer.summarizeFile()` short-circuit on that value. A suite left under that default benchmarks a string-heuristic fallback rather than the product: the original revision cleared its SLAs by ~40x and completed in ~7 seconds because no ONNX model ever loaded. The suite therefore overrides `NODE_ENV` and clears `NEURON_MOCK_EMBEDDER` so the real embedder and the real Qwen1.5-0.5B summarizer execute.

3. **6-Pillar High-Bar Stress Matrix**:
   - **Pillar 1: Polyglot AST Traversal at Scale**: Repeated deep scans of a 500+ file synthetic monorepo, asserting every language the parser supports is actually traversed and recording scan latency percentiles.
   - **Pillar 2: Adversarial Semantic Recall & Distractor Resistance**: Real-embedder recall@1/recall@5 against 2,000 lexically-similar distractors, so keyword overlap alone cannot satisfy the assertions.
   - **Pillar 3: High-Concurrency Multi-Agent Stress**: Hundreds of interleaved concurrent reads and writes against the shared store, asserting zero failures and recording throughput.
   - **Pillar 4: Architectural Drift Detection & Latency SLA**: Asserts baseline round-trip convergence (zero phantom drift immediately after ingest), independent detection of each drift bucket (new module, new export, new dependency), re-convergence after restore, then measures steady-state drift-check latency.
   - **Pillar 5: Storage Corruption & Self-Healing**: Multiple malformed-Markdown variants injected under live queries.
   - **Pillar 6: Real Pipeline Integrity**: Asserts the embedder returns non-zero vectors and the summarizer's LLM path executes rather than the fallback — the guard that keeps the other five pillars meaningful.

4. **Execution Workflow (`npm run test:e2e`)**:
   `benchmarks/e2e-runner.js` drives `test/e2e/benchmark-suite.test.ts`. Pillar status is read from vitest's JSON reporter and merged with `benchmarks/reports/e2e-metrics.json`, which the suite writes itself. Status is never inferred from stdout text: the prior implementation used `!output.includes(pillarName) || overallPassed`, which reported a pillar as PASSED precisely when it had not run, so a suite that died early scored higher than one that ran and failed.

## Consequences

- Benchmark numbers describe the shipping pipeline, so SLA figures are actionable rather than measuring a fallback path.
- Runtime is dominated by uncached LLM summarization (~1.57s/file on the reference machine). A warm summarizer cache clears the 5-minute floor; a **cold** cache is substantially longer (~13 min for the 500-file fixture) because every file must be summarized once. The runner reports the runtime floor rather than enforcing it, since a fast run legitimately indicates a warm cache — but it also warns, because a sudden drop can equally mean the pipeline was stubbed out again.
- Keeps fast unit tests (`npm test`, ~5 seconds) strictly separate from this suite.
- Requires the ONNX models to be present, so this suite is not runnable in a fully offline/cold CI without a model cache step.
