# 3. Universal Multi-Language Architecture Scanning via WebAssembly Tree-Sitter (`web-tree-sitter`)

Date: 2026-07-31

## Status

**Implemented** as of 2.2.0-rc1, for the eight grammars named below. Grammar
delivery is specified by ADR 0008; parser fidelity and baseline comparability by
ADR 0009.

- `web-tree-sitter` is a runtime dependency, and compiled `.wasm` grammars for
  TypeScript, TSX, JavaScript, Python, Go, Rust, Java and C++ are fetched at
  `neuron init` and loaded at runtime — see `src/scanner/grammars.ts`.
- Symbol extraction runs S-expression queries against parsed syntax trees —
  see `src/scanner/treesitter.ts` and `src/scanner/queries.ts`.

Two qualifications on the design below, both learned in implementation:

1. **The queries are not uniformly the shipped ones.** Six languages use the
   `queries/tags.scm` that ships with their grammar, filtered to `@definition.*`
   captures. TypeScript and TSX use hand-written queries, because their shipped
   query covers only ambient declaration forms and has no rule for
   `function_declaration` or `method_definition`.
2. **Symbol kind is read from the AST node type, not the capture name.** The
   shipped queries are too coarse to derive kinds from — Rust tags structs,
   enums, unions and type aliases all as `@definition.class`.

The remaining extensions in `SUPPORTED_SOURCE_EXTENSIONS` (Ruby, PHP, Swift, C#)
stay on the regex scanner, and the blueprint card records which parser produced
each file so the two are never silently mixed.

The 2.1.0 tracking ticket
(`.scratch/architecture-scans-2.1.0/issues/06-real-tree-sitter-ast-engine.md`)
is superseded by the neuron 2.2.0 map.

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
