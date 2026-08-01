# LongMemEval benchmark harness

neuron's adapter for [vectorize-io/agent-memory-benchmark](https://github.com/vectorize-io/agent-memory-benchmark)
(AMB), plus a retrieval-only runner that needs no API key.

Latest results: [`docs/benchmarks/longmemeval-retrieval.md`](../../docs/benchmarks/longmemeval-retrieval.md)

## Quick start

```bash
./benchmarks/longmemeval/setup.sh
cd benchmarks/agent-memory-benchmark
uv run python scripts/retrieval_eval.py all
```

Requires [`uv`](https://docs.astral.sh/uv/) and Node. The AMB clone is ~1.2 GB
and is gitignored — it is an external dependency, not vendored.

## Two tiers

| | Cost | Needs a key | Runtime (500 q) | What it measures |
|---|---|---|---|---|
| `retrieval_eval.py` | **$0** | no | ~20 min | recall@1/5/10 — does the gold evidence get retrieved |
| `omb run` | ~$4 | `GEMINI_API_KEY` | ~50 min | end-to-end accuracy, answer + LLM judge |

The retrieval tier is **deterministic** — local ONNX embeddings and RRF, no
sampling — so it is reproducible and suitable as a CI regression gate. It would
have caught the FTS stopword bug fixed in 2.1.1 as a recall drop.

## Files

| File | Goes to | Purpose |
|---|---|---|
| `neuron.py` | `src/memory_bench/memory/` | AMB `MemoryProvider` implementation |
| `neuron_bridge.mjs` | `scripts/` | stdio JSON bridge into neuron's compiled `dist/` |
| `retrieval_eval.py` | `scripts/` | retrieval-only runner |
| `setup.sh` | — | clones AMB, installs deps, copies the above |
| `results-retrieval.json` | — | last recorded full-suite result |

`neuron_bridge.mjs` locates the neuron build via `NEURON_DIST`, falling back to
the layout `setup.sh` produces.

## Gotchas

These each cost time to rediscover:

- **The CLI is `omb`, not `amb`.** The upstream README lags a project rename.
- **Pin Python 3.12.** `uv` defaults to 3.14, which has no `onnxruntime` wheels.
  `setup.sh` passes `--python 3.12`.
- **Build neuron first.** The bridge imports `dist/`, not `src/`. A stale build
  silently benchmarks the previous version.
- **Isolation is by `scope`, not by database.** `prepare()` ignores AMB's
  `unit_ids` and uses one SQLite file; separation comes from LongMemEval setting
  `user_id = question_id`, which maps to neuron's `scope` filter. The runner
  asserts zero cross-unit documents — keep that assertion.
- **Sampling is category-ordered.** `load_queries(limit=N)` returns questions in
  category order, so a small limit samples one category only. A 60-question run
  produced a misleading 98.3% because it was 100% `single-session-user`. Use
  `all` for any number you intend to quote.
- **Never commit `.env`.** The end-to-end tier needs a Gemini key in the AMB
  clone's `.env`. The clone is gitignored; keep it that way.

## Interpreting results

Retrieval recall is a **ceiling, not a score**. It says the evidence was
available, not that the answer was right — and it is not comparable to published
end-to-end LongMemEval numbers, which include an answering model and a judge.

Always report per-category. The blended average hides that
`single-session-preference` and `temporal-reasoning` are materially weaker than
the rest.
