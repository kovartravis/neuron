Type: task
Status: resolved
Blocked by: none

# 01 — Static Scanner Engine, Multi-Language AST Analyzer & SmolLM2 Summarizer (`2.1.0-rc2`)

## Goal

Build the multi-language static AST analyzer (`src/scanner/analyzer.ts`), `web-tree-sitter` (.wasm) parser, and `SmolLM2-135M-Instruct` ONNX local summarizer engine (`src/components/summarizer.ts`).

## Requirements

1. Parse project manifests (`package.json`, `Cargo.toml`, `go.mod`, `pyproject.toml`) for tech stack, dependencies, scripts, and entry points.
2. Walk directory structure under project root up to configurable `--depth` (default: 3).
3. Implement `TreeSitterScanner` and `DynamicGrammarLoader` in `src/scanner/treesitter.ts` using `web-tree-sitter` WASM grammars to extract exported classes, interfaces, structs, and functions across 40+ programming languages.
4. Implement `SmolLM2Summarizer` in `src/components/summarizer.ts` using `HuggingFaceTB/SmolLM2-135M-Instruct` ONNX text-generation pipeline to generate 1-sentence architectural purpose summaries for scanned files.
5. Implement content hash caching (`.neuron/cache/scan.json`) using SHA-256 / `mtimeMs` to bypass LLM inference on unchanged files.
6. Implement CLI command `neuron scan --dry-run [--depth <n>]` in `src/commands/scan.ts` to output pure structured JSON / Markdown architectural maps to `stdout`.
7. Add comprehensive unit test suite in `src/components/summarizer.test.ts` and `src/scanner/analyzer.test.ts`.

## Deliverables

- [x] `src/scanner/analyzer.ts`
- [x] `src/scanner/treesitter.ts` (with `DynamicGrammarLoader`)
- [x] `src/components/summarizer.ts` (with `SmolLM2-135M-Instruct`)
- [x] `src/components/summarizer.test.ts`
- [x] `src/commands/scan.ts`
- [x] `src/scanner/analyzer.test.ts`
- [x] `package.json` version bump to `2.1.0-rc2`





