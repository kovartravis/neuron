# 3. Universal Multi-Language Architecture Scanning via WebAssembly Tree-Sitter (`web-tree-sitter`)

Date: 2026-07-31

## Status

Accepted

## Context

To provide AI agents with a comprehensive, offline structural understanding of any codebase, `neuron scan` must extract module boundaries, entry points, exported classes, interfaces, structs, and functions. Codebases may contain multiple languages (TypeScript/JS, Python, Go, Rust, Java, C++).

Relying solely on regex string matching fails to capture complex nested exports and type signatures accurately. Conversely, pulling in separate compiler dependencies for every language adds massive bloat and platform-specific native compilation issues (e.g. Android/Termux).

## Decision

We will use **`web-tree-sitter`** (WebAssembly bindings for Tree-Sitter) as the primary multi-language AST engine for `neuron scan`.

1. **Language Grammars**: Load compiled `.wasm` grammars for TypeScript/JS, Python, Go, Rust, Java, and C++.
2. **S-Expression Queries**: Use declarative Tree-Sitter S-expressions to query exported definitions consistently across languages.
3. **Pure JSON Output**: `neuron scan --dry-run` outputs structured JSON payloads to `stdout` for subagent consumption and CLI automation.

## Consequences

### Positive
- **Universal Multi-Language Support**: Accurately parses AST nodes across major languages without regex fragility.
- **Zero Native Build Toolchains**: Runs fully offline in Node.js/WASM without requiring `g++`, `cargo`, or native C++ addons during `npm install`.
- **Fast Execution**: Incremental AST parsing finishes in milliseconds.

### Negative
- **WASM Grammar Packaging**: `.wasm` grammar files must be bundled or loaded on demand.
- **WASM Memory Shim**: Requires standard WebAssembly memory initialization in node environments.
