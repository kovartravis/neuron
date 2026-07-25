Type: task
Status: resolved

## Question

How should we fix the native `libc++abi: terminating due to uncaught exception of type std::__1::system_error: mutex lock failed: Invalid argument` crash that occurs on macOS upon process exit when using the `neuron exec` subcommand?

## Answer

This crash is a known issue with `onnxruntime-node@1.21.0` on macOS, which has a race condition in its thread pool teardown/cleanup logic during `process.exit()`. 

To fix this, we pinned the `onnxruntime-node` dependency to `1.20.1` using the `overrides` field in [package.json](file:///Users/Travis/Repos/neuron/package.json). This version does not exhibit the static mutex destruction bug and allows `neuron exec` (and the CLI as a whole) to exit cleanly when using the real Transformers.js embedder.
