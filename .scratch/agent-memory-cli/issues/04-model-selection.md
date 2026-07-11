Type: research
Status: resolved

## Question

Which local embedding model should be used for vector generation? We need to evaluate size, load time, embedding speed, and memory usage under Node.js runtime.

## Answer

**Selected model: `Xenova/bge-small-en-v1.5`**

- Q8 quantized size: ~34 MB (one-time download, cached at `~/.neuron/models`)
- Embedding dimensions: 384
- Max sequence length: 512 tokens (handles multi-line code snippets safely)
- MTEB avg score: 62.17 — best quality-to-size ratio in the small-model class
- CPU inference: ~20–40 ms/sentence; model cold-start ~500 ms–2 s (once per CLI invocation)
- Pooling: CLS + normalize
- License: MIT
- Transformers.js usage: `pipeline('feature-extraction', 'Xenova/bge-small-en-v1.5', { dtype: 'q8' })`

Runner-up: `Xenova/gte-small` (61.36 MTEB, mean pooling, ~33 MB) — viable alternative.

Full research: `.scratch/agent-memory-cli/research/04-model-selection.md`
