Type: task
Status: unclaimed
Blocked by: 01

# 02 — Light Local LLM Summarizer & Memory Store Ingestion (`2.1.0-rc2`)

## Goal

Build the light local LLM summarizer engine (`src/components/summarizer.ts`) using `SmolLM2-135M-Instruct` ONNX and connect scanner output directly into `NeuronMemory` store and local vector embeddings (`bge-small-en-v1.5`).

## Requirements

1. Implement `SmolLM2Summarizer` in `src/components/summarizer.ts` using `HuggingFaceTB/SmolLM2-135M-Instruct` ONNX text-generation pipeline to generate 1-sentence architectural summaries for scanned files.
2. Implement file content hash caching (`.neuron/cache/scan.json`) using SHA-256 / `mtimeMs` to bypass LLM inference on unchanged files.
3. Convert extracted architectural topology cards into Markdown/YAML memory blocks under category `decisions` (or `architecture`).
4. Implement `neuron scan [--category <name>] [--force]` to automatically persist cards into `.neuron/decisions.md` (or SQLite vector store).
5. Generate 384D BGE embeddings via `TransformersEmbedder` for instant query retrieval (`neuron memory query "architecture"`).
6. Add unit and integration test suite in `src/components/summarizer.test.ts` and `src/scanner/ingest.test.ts`.

## Deliverables

- [ ] `src/components/summarizer.ts`
- [ ] `src/components/summarizer.test.ts`
- [ ] `src/scanner/ingest.ts`
- [ ] `src/scanner/ingest.test.ts`
- [ ] `package.json` version bump to `2.1.0-rc2`

