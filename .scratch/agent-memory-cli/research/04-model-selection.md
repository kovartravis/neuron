# Model Selection Research: Local Embeddings for `neuron` CLI

**Research date:** 2026-07-11  
**Scope:** Lightweight embedding models compatible with Transformers.js (`@xenova/transformers` / `@huggingface/transformers`) running in Node.js, distributed via `npx`.

---

## Context

The `neuron` CLI is a local-only agent memory store. It needs to:
- Run entirely **offline** after first use (no API calls)
- Produce **vector embeddings** for semantic similarity/search
- Run in **Node.js** (not a browser)
- Be practical for **`npx` usage** — model files download from HuggingFace Hub on first run and are cached in `~/.cache/huggingface/hub` (or the path set by `HF_HOME`)

Transformers.js v3+ handles model download and caching automatically via ONNX Runtime. Quantized (`q8` / `uint8`) variants are used by default to minimize download size and RAM footprint.

---

## Candidate Models

### 1. `Xenova/all-MiniLM-L6-v2`

| Property | Value |
|---|---|
| **HuggingFace path** | `Xenova/all-MiniLM-L6-v2` |
| **Architecture** | BERT (6 layers, 22M params) |
| **Embedding dims** | 384 |
| **Max sequence length** | 256 tokens |
| **ONNX size (fp32)** | ~90.4 MB |
| **ONNX size (q8/uint8)** | ~22–23 MB ✅ |
| **MTEB avg score** | ~58.80 |
| **CPU inference speed** | ~15–30 ms/sentence (Apple M-series, WASM) |
| **Transformers.js compat** | ✅ Fully confirmed, example in official docs |
| **Pooling** | Mean pooling |
| **License** | Apache 2.0 |

**Notes:** The canonical "fast baseline." Smallest quantized footprint of all candidates at ~23 MB. Well below par on quality vs BGE/GTE models of the same size class. Widely used for prototyping.

---

### 2. `Xenova/all-MiniLM-L12-v2`

| Property | Value |
|---|---|
| **HuggingFace path** | `Xenova/all-MiniLM-L12-v2` |
| **Architecture** | BERT (12 layers, ~33M params) |
| **Embedding dims** | 384 |
| **Max sequence length** | 128 tokens |
| **ONNX size (fp32)** | ~120 MB |
| **ONNX size (q8/uint8)** | ~30 MB |
| **MTEB avg score** | ~59.76 |
| **CPU inference speed** | ~25–50 ms/sentence |
| **Transformers.js compat** | ✅ Confirmed |
| **Pooling** | Mean pooling |
| **License** | Apache 2.0 |

**Notes:** Modest quality gain over L6 at ~2x inference cost. Max sequence length of 128 tokens is a notable limitation — code snippets and longer memories may be silently truncated. Quality still trails BGE/GTE models.

---

### 3. `Xenova/bge-small-en-v1.5`

| Property | Value |
|---|---|
| **HuggingFace path** | `Xenova/bge-small-en-v1.5` |
| **Base model** | `BAAI/bge-small-en-v1.5` |
| **Architecture** | BERT (12 layers, ~33M params) |
| **Embedding dims** | 384 |
| **Max sequence length** | 512 tokens |
| **ONNX size (fp32)** | ~133 MB |
| **ONNX size (q8/uint8)** | ~33.8 MB ✅ |
| **MTEB avg score** | **62.17** (56-dataset avg) |
| **MTEB retrieval (15 datasets)** | 51.68 |
| **MTEB STS (10 datasets)** | 81.59 |
| **CPU inference speed** | ~20–40 ms/sentence |
| **Transformers.js compat** | ✅ Confirmed; uses `cls` pooling + normalize |
| **Pooling** | CLS pooling |
| **License** | MIT |

**Notes:** Best quality-per-MB ratio among all candidates. Outperforms both MiniLM models by ~3–4 MTEB points while having a nearly identical quantized file size (~34 MB vs ~23 MB). The BGE v1.5 series specifically addressed similarity distribution problems in v1. Requires no query prefix for general use (unlike some retrieval-specific models). Actively maintained by BAAI.

---

### 4. `Xenova/bge-base-en-v1.5`

| Property | Value |
|---|---|
| **HuggingFace path** | `Xenova/bge-base-en-v1.5` |
| **Base model** | `BAAI/bge-base-en-v1.5` |
| **Architecture** | BERT-base (12 layers, ~110M params) |
| **Embedding dims** | 768 |
| **Max sequence length** | 512 tokens |
| **ONNX size (fp32)** | ~438 MB |
| **ONNX size (q8/uint8)** | ~110 MB |
| **MTEB avg score** | **63.55** |
| **MTEB retrieval** | 53.25 |
| **MTEB STS** | 82.40 |
| **CPU inference speed** | ~60–120 ms/sentence |
| **Transformers.js compat** | ✅ Confirmed |
| **Pooling** | CLS pooling |
| **License** | MIT |

**Notes:** Best quality of all candidates but at significant cost for `npx` usage: 110 MB quantized download, 768-dim vectors (4× storage per entry vs 384-dim), and ~2–3× slower inference. The quality gain over `bge-small-en-v1.5` is ~1.4 MTEB points — marginal for a memory store use case. Storage overhead of 768-dim vectors matters at scale in SQLite.

---

### 5. `Xenova/gte-small`

| Property | Value |
|---|---|
| **HuggingFace path** | `Xenova/gte-small` |
| **Base model** | `thenlper/gte-small` (Alibaba DAMO) |
| **Architecture** | BERT (12 layers, ~33M params) |
| **Embedding dims** | 384 |
| **Max sequence length** | 512 tokens |
| **ONNX size (fp32)** | ~70 MB |
| **ONNX size (q8/uint8)** | ~30–35 MB |
| **MTEB avg score** | **61.36** |
| **CPU inference speed** | ~20–40 ms/sentence |
| **Transformers.js compat** | ✅ Confirmed; mean pooling + normalize |
| **Pooling** | Mean pooling |
| **License** | MIT |

**Notes:** Competitive with `bge-small-en-v1.5` on MTEB (61.36 vs 62.17). Strong semantic similarity performance. Mean pooling (vs BGE's CLS pooling) means no special handling needed for query vs passage distinction. Slightly less active maintenance than the BAAI BGE series.

---

## Comparison Matrix

| Model | Q8 Size | Dims | MTEB Avg | Speed (est.) | License | Max Tokens |
|---|---|---|---|---|---|---|
| `all-MiniLM-L6-v2` | **~23 MB** | 384 | 58.80 | ~20 ms | Apache 2.0 | 256 |
| `all-MiniLM-L12-v2` | ~30 MB | 384 | 59.76 | ~35 ms | Apache 2.0 | **128** |
| `bge-small-en-v1.5` | ~34 MB | 384 | **62.17** | ~30 ms | MIT | 512 |
| `bge-base-en-v1.5` | ~110 MB | 768 | 63.55 | ~90 ms | MIT | 512 |
| `gte-small` | ~33 MB | 384 | 61.36 | ~30 ms | MIT | 512 |

---

## Key Considerations for `npx` CLI Distribution

1. **First-run download:** Users experience a one-time download. Smaller quantized files (≤35 MB) are essentially invisible on modern broadband. 110 MB (bge-base) is noticeable.

2. **Cache location:** Transformers.js caches to `~/.cache/huggingface/hub` by default. The CLI can override with `env.cacheDir` to use an app-specific path (e.g., `~/.neuron/models`) for a cleaner UX.

3. **`env.allowRemoteModels = false`** can be set after first download to enforce offline mode.

4. **Vector storage size:** 384-dim float32 vectors = 1.5 KB each. 768-dim = 3.0 KB. For a personal memory store with thousands of entries in SQLite, this difference is meaningful but not decisive. 384-dim is preferred.

5. **Inference latency:** For a CLI that embeds one memory snippet at a time (not batch), 20–40 ms is imperceptible. The model loading time (~500 ms–2 s cold start on first use within a process) is the dominant cost — this happens once per CLI invocation.

6. **Token limit:** `all-MiniLM-L12-v2`'s 128-token cap is problematic for agent code memories that may include multi-line snippets. 256 (L6) and 512 (BGE/GTE) are far more suitable.

---

## Recommendation

### ✅ Default: `Xenova/bge-small-en-v1.5`

**Why:**

1. **Best quality-to-size ratio** in the 384-dim class: MTEB 62.17 beats both MiniLM models by ~3–4 points on the same download budget (~34 MB quantized).

2. **512-token context window** handles multi-line code snippets and longer agent memories without truncation — critical for a coding harness memory store.

3. **MIT license** — permissive with no commercial ambiguity.

4. **Active maintenance** by BAAI; the v1.5 series fixed known similarity distribution issues in v1.

5. **Transformers.js confirmed working** with straightforward usage:
   ```js
   import { pipeline } from '@huggingface/transformers';
   const embed = await pipeline('feature-extraction', 'Xenova/bge-small-en-v1.5', { dtype: 'q8' });
   const out = await embed('text to embed', { pooling: 'cls', normalize: true });
   ```

6. **384-dim vectors** keep SQLite storage lean and cosine-similarity queries fast.

### Runner-up: `Xenova/gte-small`

Only 0.81 MTEB points behind `bge-small-en-v1.5`, MIT licensed, same size class (~33 MB), 512-token window. A viable alternative if mean pooling is preferred or if BGE's CLS pooling presents integration issues.

### Avoid for this use case:
- `all-MiniLM-L12-v2` — 128-token limit kills it for code memories
- `bge-base-en-v1.5` — 110 MB download + 768-dim storage overhead not justified by marginal 1.4-point quality gain
- `all-MiniLM-L6-v2` — Only choose if download size is the single overriding constraint

---

## Sources

- HuggingFace model cards: [Xenova/bge-small-en-v1.5](https://huggingface.co/Xenova/bge-small-en-v1.5), [Xenova/all-MiniLM-L6-v2](https://huggingface.co/Xenova/all-MiniLM-L6-v2), [Xenova/gte-small](https://huggingface.co/Xenova/gte-small)
- BAAI BGE model card: [BAAI/bge-small-en-v1.5](https://huggingface.co/BAAI/bge-small-en-v1.5) — official MTEB table
- MTEB Leaderboard: https://huggingface.co/spaces/mteb/leaderboard
- Transformers.js docs: https://huggingface.co/docs/transformers.js
- SBERT model overview: https://www.sbert.net/docs/sentence_transformer/pretrained_models.html
