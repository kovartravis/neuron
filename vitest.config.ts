import { defineConfig } from 'vitest/config';

/**
 * Root config for the main `--dir src` suite. `testTimeout`/`hookTimeout`
 * are raised well past vitest's 5000ms default because a cold model cache
 * (e.g. a fresh CI runner, or the first local run after `models/` is
 * cleared) means whichever test first touches the embedder, reranker, or
 * NLI classifier pays a real first-time ONNX download, not just inference
 * cost — observed timing out at the 5000ms default even after
 * `withModelCacheLock` (src/components/modelCacheLock.ts) fixed the actual
 * corruption bug two concurrent downloads used to cause on the same race.
 */
export default defineConfig({
  test: {
    testTimeout: 60_000,
    hookTimeout: 60_000,
  },
});
