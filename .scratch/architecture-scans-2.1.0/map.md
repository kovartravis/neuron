## Destination

A complete technical implementation of Architecture Scans (`neuron scan`), Shell Autocompletion (`neuron completion`), automated Termux post-build fixes, and structural drift detection released progressively across `2.1.0-rc2` through `2.1.0-rc5` to stable `2.1.0`.

## Notes

- Feature set: Multi-language symbol scanning, BGE embedding ingestion, structural diffing, deep E2E benchmark suite, Termux shebang auto-patching.
- Target Release: `2.1.0` — **shipped 2026-07-31**.
- Shell autocompletion (`neuron completion`) did **not** make 2.1.0 and moves to the next minor.

## Decisions & Tickets

- [01 — Static Scanner Engine & AST Analyzer](.scratch/architecture-scans-2.1.0/issues/01-static-scanner-engine.md) — (RESOLVED - 2.1.0-rc2) Implemented `src/scanner/analyzer.ts`, `src/scanner/treesitter.ts`, and `neuron scan --dry-run`.
- [02 — Memory Store Ingestion & BGE Embeddings](.scratch/architecture-scans-2.1.0/issues/02-memory-store-ingestion.md) — (RESOLVED - 2.1.0-rc3) Implemented `ingestScanResults` in `src/scanner/ingest.ts`, ONNX pre-downloading in `neuron init`, and vector store ingestion.
- [03 — Architectural Drift Detection & Diffing](.scratch/architecture-scans-2.1.0/issues/03-drift-detection-diffing.md) — (RESOLVED - 2.1.0) 4-bucket diff engine in `src/scanner/diff.ts`, `neuron scan --diff/--check`, fingerprint drift guard, drift surfaced in `neuron status` and `neuron exec`. ADR 0006.
- [04 — Deep E2E Benchmark & Correctness Suite](.scratch/architecture-scans-2.1.0/issues/04-deep-testing-suite.md) — (RESOLVED - 2.1.0) 6-pillar suite under `test/e2e/`, driven by `benchmarks/e2e-runner.js` via `npm run test:e2e`. ADR 0007.
- [04 — Shell Autocompletion & DX Enhancements](.scratch/architecture-scans-2.1.0/issues/04-shell-autocompletion-dx.md) — (DEFERRED past 2.1.0) `neuron completion` was never implemented; no `completion` command exists in `src/cli.ts`. Number collides with the testing-suite ticket — renumber when picked up.
- [05 — Release Verification & 2.1.0 Publishing](.scratch/architecture-scans-2.1.0/issues/05-release-verification-2.1.0.md) — (RESOLVED - 2.1.0) Version bump, changelog, README/skill/help/CONTEXT updates, tag `v2.1.0`.
- [06 — Real Tree-Sitter AST Engine](.scratch/architecture-scans-2.1.0/issues/06-real-tree-sitter-ast-engine.md) — (OPEN) `TreeSitterScanner` is regex-based, not AST-based; `web-tree-sitter` was never added as a dependency. 2.1.0 corrected the documentation instead of the implementation.

## Frontier

- Open ticket: [06 — Real Tree-Sitter AST Engine](.scratch/architecture-scans-2.1.0/issues/06-real-tree-sitter-ast-engine.md)
- Deferred: [04 — Shell Autocompletion & DX Enhancements](.scratch/architecture-scans-2.1.0/issues/04-shell-autocompletion-dx.md)
