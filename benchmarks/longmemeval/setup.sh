#!/usr/bin/env bash
# Sets up the LongMemEval benchmark harness for neuron.
#
# Clones AMB (external, ~1.2 GB, gitignored) and copies neuron's adapter into
# it. Safe to re-run: the copy step is idempotent.
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NEURON_ROOT="$(cd "$HERE/../.." && pwd)"
AMB="$NEURON_ROOT/benchmarks/agent-memory-benchmark"

if [ ! -d "$AMB" ]; then
  echo "==> cloning agent-memory-benchmark"
  git clone --depth 1 https://github.com/vectorize-io/agent-memory-benchmark.git "$AMB"
fi

echo "==> installing dependencies"
# Pin 3.12: uv defaults to 3.14, which has no onnxruntime wheels.
( cd "$AMB" && uv sync --python 3.12 )

echo "==> installing neuron adapter"
mkdir -p "$AMB/scripts"
cp "$HERE/neuron_bridge.mjs"  "$AMB/scripts/"
cp "$HERE/retrieval_eval.py"  "$AMB/scripts/"
cp "$HERE/neuron.py"          "$AMB/src/memory_bench/memory/"

echo "==> building neuron"
( cd "$NEURON_ROOT" && npm run build )

cat <<'MSG'

Setup complete.

  cd benchmarks/agent-memory-benchmark

  # retrieval only — no API key, no cost, ~20 min for the full suite
  uv run python scripts/retrieval_eval.py all
  uv run python scripts/retrieval_eval.py 25      # quick tier

  # end-to-end — needs GEMINI_API_KEY in .env, costs ~$4 for 500 questions
  uv run omb run --dataset longmemeval --domain s --memory neuron --query-limit 25

Note the CLI is `omb`, not `amb` — the upstream README lags a rename.
MSG
