# Feature Specification: Architecture Scans & 2.1.0 Release Path

## Overview

The Architecture Scan feature (`neuron scan`) enables `@kovartravis/neuron` to perform deterministic static code analysis, AST parsing, and directory topology mapping across a project. Extracted architectural facts (module boundaries, export signatures, tech stack, dependencies) are formatted into structural memory cards and embedded into the local memory store using `TransformersEmbedder` (`bge-small-en-v1.5`).

## Scope & Target Milestone: 2.1.0

The feature set and surrounding DX improvements are broken down into 5 progressive tickets released across 4 RC versions leading to stable `2.1.0`.

### Tickets Breakdown

1. **`01-static-scanner-engine.md` (Target: `2.1.0-rc1`)**
   - AST & topology parser (`src/scanner/analyzer.ts`).
   - Multi-language AST engine (`TreeSitterScanner` + `DynamicGrammarLoader` in `src/scanner/treesitter.ts`).
   - Default bundled grammars (TS/JS, Python, Go, Rust, Java, C++) + on-demand `.wasm` grammar resolution for 35+ extended languages.
   - Command: `neuron scan --dry-run [--depth <n>]`.
   - Unit test suite (`src/scanner/analyzer.test.ts`).


2. **`02-memory-store-ingestion.md` (Target: `2.1.0-rc2`)**
   - Ingest structural cards into `.neuron/decisions.md` (or SQLite vector store).
   - Generates 384D BGE embeddings for instant query retrieval (`neuron memory query "architecture"`).
   - Integration test suite (`src/scanner/ingest.test.ts`).

3. **`03-drift-detection-diffing.md` (Target: `2.1.0-rc3`)**
   - Structural diff engine (`neuron scan --diff`).
   - Compares active AST topology against stored memory cards to detect un-documented modules or dependency shifts.
   - Drift warnings in `neuron status` and `neuron exec`.

4. **`04-shell-autocompletion-dx.md` (Target: `2.1.0-rc4`)**
   - Shell tab-completion generator (`neuron completion <bash|zsh|fish>`).
   - Automated post-build Termux shebang fix in `package.json`.
   - System metadata flag (`neuron feedback --sysinfo`).

5. **`05-release-verification-2.1.0.md` (Target: `2.1.0` Stable)**
   - Final release checklist (`RELEASE_2.1.0.md`), `CHANGELOG.md` update, and version bump to `2.1.0`.
   - Full test suite verification across all unit, integration, and E2E suites.
