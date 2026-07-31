# 4. Lightweight Local LLM Summarizer Engine (`SmolLM2-135M-Instruct`)

Date: 2026-07-31

## Status

Accepted

## Context

Static AST parsing (`TreeSitterScanner`) accurately extracts exported classes, interfaces, functions, and structs across 40+ programming languages. However, AST parsing alone cannot infer the high-level architectural purpose of source files that lack docstrings or header comments.

To provide human developers and AI agents with concise 1-sentence architectural purpose summaries for every file, `neuron scan` requires a lightweight text summarization engine.

## Decision

We will integrate **`HuggingFaceTB/SmolLM2-135M-Instruct`** (quantized q4 ONNX model) as the default offline summarizer engine in `src/components/summarizer.ts`.

1. **ONNX Pipeline**: Executed via `@huggingface/transformers` text-generation pipeline in Node.js, sharing the existing ONNX runtime environment used by `TransformersEmbedder`.
2. **Hybrid Prompting**: Passes file path, AST exported symbols, docstrings, and top 30 code lines into a structured prompt.
3. **Content Hash Caching (`.neuron/cache/scan.json`)**: Caches generated summaries by SHA-256 / `mtimeMs` file hash. Unchanged files bypass LLM inference (0ms).
4. **Deterministic Fallback**: If model loading is unavailable or offline download is disabled, falls back to deterministic AST export signature summaries.

## Consequences

### Positive
- **100% Offline & Private**: Zero external API calls, zero API key requirements.
- **Micro Footprint**: ~40MB quantized ONNX download, ~100MB RAM, ~100ms CPU inference per modified file.
- **Intelligent Module Summaries**: Synthesizes human-grade architectural purpose summaries even for files without docstrings.

### Negative
- **Initial Download**: First-time model initialization requires downloading ~40MB model weights into `env.cacheDir`.
