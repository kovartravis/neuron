Type: research
Status: resolved

## Question

Where should the SQLite database file and the ONNX model files be stored across different OSes (Windows, macOS, Linux)? How should the CLI handle the download, caching, and loading of the embedding model to minimize first-run latency and prevent blocking the caller?

## Answer

- **OS paths**: Use `env-paths` (`{ suffix: '' }`) — resolves `paths.data` to `~/Library/Application Support/neuron` (macOS), `~/.local/share/neuron` (Linux XDG), `%LOCALAPPDATA%\neuron\Data` (Windows).
- **Layout**: `paths.data/models/` (set as `env.cacheDir`) + `paths.data/db/<sha256[:16] of abs project root>.sqlite`. Both under `data` (not `cache`) — model files are durable, not safely regenerable.
- **Transformers.js caching**: `env.cacheDir` defaults to `./.cache` (relative CWD!) — must be explicitly overridden before any `pipeline()` call. Set `env.allowRemoteModels = false` once ONNX file detected on disk.
- **First-run UX**: Use `pipeline()`'s `progress_callback` → write to stderr only, gate on `process.stderr.isTTY` (silent in non-TTY/harness environments).
- **Cold-start daemon**: No in v1 — accept 600 ms – 1.4 s per invocation. Isolate `initEmbedder()` for v2 daemon upgrade path.

Full research: `.scratch/agent-memory-cli/research/02-storage-model-caching.md`
