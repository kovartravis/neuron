## Destination

A complete technical implementation of Architecture Scans (`neuron scan`), Shell Autocompletion (`neuron completion`), automated Termux post-build fixes, and structural drift detection released progressively across `2.1.0-rc2` through `2.1.0-rc5` to stable `2.1.0`.

## Notes

- Feature set: Static AST analysis, BGE embedding ingestion, structural diffing, shell autocompletion, Termux shebang auto-patching.
- Target Release: `2.1.0`

## Decisions & Tickets

- [01 — Static Scanner Engine & AST Analyzer](.scratch/architecture-scans-2.1.0/issues/01-static-scanner-engine.md) — (RESOLVED - 2.1.0-rc2) Implemented `src/scanner/analyzer.ts`, `src/scanner/treesitter.ts`, and `neuron scan --dry-run`.
- [02 — Memory Store Ingestion & BGE Embeddings](.scratch/architecture-scans-2.1.0/issues/02-memory-store-ingestion.md) — (RESOLVED - 2.1.0-rc3) Implemented `ingestScanResults` in `src/scanner/ingest.ts`, ONNX pre-downloading in `neuron init`, and vector store ingestion.
- [03 — Architectural Drift Detection & Diffing](.scratch/architecture-scans-2.1.0/issues/03-drift-detection-diffing.md) — (Target: `2.1.0-rc4`) Structural diff engine (`neuron scan --diff`) to identify un-documented code shifts.
- [04 — Shell Autocompletion & DX Enhancements](.scratch/architecture-scans-2.1.0/issues/04-shell-autocompletion-dx.md) — (Target: `2.1.0-rc5`) Shell completion generator (`neuron completion`) and automated build shebang fix.
- [05 — Release Verification & 2.1.0 Publishing](.scratch/architecture-scans-2.1.0/issues/05-release-verification-2.1.0.md) — (Target: `2.1.0` Stable) Complete release checklist, changelog, version bump, and E2E verification.

## Frontier

- Open ticket: [03 — Architectural Drift Detection & Diffing](.scratch/architecture-scans-2.1.0/issues/03-drift-detection-diffing.md)
