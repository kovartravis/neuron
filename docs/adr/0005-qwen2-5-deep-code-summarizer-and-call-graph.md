# 5. Qwen2.5-0.5B Deep Code Summarizer Engine & Call-Graph Extraction

Date: 2026-07-31

## Status

Accepted

## Context

Fast 1-second scanning using regex template fallbacks produced shallow, repetitive module summaries (e.g. "manages core module contracts and operational execution"). Users required a deeper, more accurate architectural understanding of codebases with real LLM code reasoning and inter-file dependency call-graph mapping.

## Decision

We will upgrade `neuron scan` to perform **Deep Architecture Analysis** using **`Qwen/Qwen2.5-0.5B-Instruct`** (quantized q4 ONNX model):

1. **Model Upgrade**: Upgrade from 135M to `Qwen/Qwen2.5-0.5B-Instruct` (~300MB ONNX quantized model) for higher code comprehension and architectural synthesis quality.
2. **Full Method Signature & Cross-File Call Invocations**: `TreeSitterScanner` and `analyzer.ts` extract method signatures with parameter/return types, docstrings, and inter-file function call invocations.
3. **AST Extracted Contract Prompting**: Passes file paths, imports, class/interface declarations, method signatures, and core implementations (up to 1500 tokens) into Qwen2.5.
4. **Live Execution (No Caching)**: Re-runs ONNX code inference on every scan invocation to guarantee up-to-date, live architectural analysis.

## Consequences

### Positive
- **Deep Architectural Understanding**: Eliminates shallow template fallbacks, generating real semantic summaries of logic, data flow, and API contracts.
- **Subsystem Call Graph**: Maps how CLI commands, memory managers, storage adapters, and vector embedders invoke each other.
- **100% Offline & Private**: Zero API keys or cloud dependencies required.

### Negative
- **Model Size & Memory**: Model size increases from ~40MB to ~300MB (~500MB RAM footprint).
- **Execution Time**: Scan runtime extends from ~1s to ~5–15s depending on codebase size.
