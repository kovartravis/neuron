Type: task
Status: resolved
Blocked by: 01, 02, 03

# 04 — Architecture Scans Deep Testing & Stress Suite (`2.1.0-rc5`)

## Goal

Build out a comprehensive, production-grade test and stress suite covering all 2.1.0 Architecture Scan components (AST analyzer, multi-language tree-sitter parsing, ingestion, in-place upserting, 4-bucket drift engine, CLI flags, auto-rescans, and performance/cache benchmarks).

## Requirements

1. **AST & Multi-Language Parsing Unit Tests (`src/scanner/analyzer.test.ts`, `src/scanner/treesitter.test.ts`)**:
   - Test directory filtering (excluding `node_modules`, `.git`, `dist`, `.neuron`).
   - Test multi-language code parsing (TypeScript, JavaScript, Python, Go, Rust, Java, C/C++) for export contracts, class names, and function signatures.
   - Test manifest parsing across package managers (`package.json`, `Cargo.toml`, `go.mod`, `pyproject.toml`).
   - Test depth limit enforcement (`depth: 1, 2, 3`).

2. **Ingestion & Storage In-Place Upserting Tests (`src/scanner/ingest.test.ts`)**:
   - Test ingestion into SQLite and Markdown storage (`.neuron/architecture.md`).
   - Test in-place upserting on repeated scans (verifying single card ID persistence, zero duplicate markdown blocks, and vector re-embedding).
   - Test custom category ingest overrides.

3. **4-Bucket Structural Drift Engine Tests (`src/scanner/diff.test.ts`)**:
   - Test all 4 diff buckets: New Modules, Removed Modules, Export Contract Changes, Dependency Shifts.
   - Test baseline blueprint parsing (`parseBaselineBlueprint`).
   - Test missing baseline behavior (`isMissingBaseline: true`).
   - Test in-sync baseline behavior (`hasDrift: false`).

4. **CLI End-to-End & Auto-Scan Integration Tests (`src/scanner/e2e.test.ts`)**:
   - Test `neuron scan`: default scan, `--category`, `--depth`, `--dry-run`, `--json`, `--diff`, `--check` (exit code 1 vs 0).
   - Test `neuron status` JSON output containing `drift` metadata.
   - Test `neuron exec` pre-command drift warnings and auto-rescans.
   - Test `neuron memory query` and `neuron learn query` auto-scanning when `scan.enabled: true` in `neuron.yaml` (initial scan on missing baseline & re-scan on drift).
   - Test performance & caching: content hash cache (`scan_summaries.json`) preventing redundant LLM/AST processing and maintaining query latency <15ms when in-sync.

## Deliverables

- [ ] Extended `src/scanner/analyzer.test.ts`
- [ ] Extended `src/scanner/treesitter.test.ts`
- [ ] Extended `src/scanner/ingest.test.ts`
- [ ] Extended `src/scanner/diff.test.ts`
- [ ] New `src/scanner/e2e.test.ts`
- [ ] Version bump in `package.json` to `2.1.0-rc5`
