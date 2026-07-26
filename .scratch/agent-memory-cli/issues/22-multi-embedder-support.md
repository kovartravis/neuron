# 22 — Multi-Provider Embedder Support (OpenAI, Ollama, Cohere)

**What to build:** Extend the embedder subsystem ([src/components/embedder.ts](file:///Users/Travis/Repos/neuron/src/components/embedder.ts)) to support pluggable external embedding providers (e.g. OpenAI `text-embedding-3-small`, Ollama local embeddings, Cohere) via configuration options or environment variables.

**Blocked by:** 04 — Model Selection

**Status:** todo

- [ ] Define `EmbedderProvider` interface and factory in `src/components/embedder.ts`.
- [ ] Implement `OllamaEmbedder` for local LLM embedding endpoints.
- [ ] Implement `OpenAIEmbedder` for cloud API embedding models.
- [ ] Support `--embedder-provider <transformers|ollama|openai>` configuration in `NeuronMemoryOptions`.
- [ ] Add unit and mock tests for provider switching.
