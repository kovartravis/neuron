import fs from 'node:fs';
import path from 'node:path';

/**
 * Cross-process mkdir-based lock guarding a model's on-disk cache directory
 * during first-time download. `@huggingface/transformers` has no protection
 * against two processes downloading the same model concurrently — on a cold
 * cache (e.g. a fresh CI runner, or many CLI subprocess tests racing to warm
 * the same shared cache dir at once) two overlapping downloads writing to
 * the same `.onnx` path can interleave, corrupting it ("Protobuf parsing
 * failed" on load). Every model loader in this codebase shares one on-disk
 * cache dir (`envPaths('neuron').data/models`), so this guards all of them
 * uniformly rather than special-casing whichever loader last happened to
 * flake. Mirrors `src/db.ts`'s `withSyncFileLock` (same SQLite-migration
 * race class), adapted to await an async load instead of wrapping a
 * synchronous function.
 */
export async function withModelCacheLock<T>(lockTargetPath: string, fn: () => Promise<T>): Promise<T> {
  const lockPath = `${lockTargetPath}.lock`;
  fs.mkdirSync(path.dirname(lockPath), { recursive: true });

  // Model downloads can genuinely take a while on a slow connection, so
  // both bounds are looser than withSyncFileLock's (SQLite init is fast;
  // pulling a multi-hundred-MB ONNX file is not).
  const staleAfterMs = 120_000;
  const maxWaitMs = 180_000;
  const retryDelayMs = 100;
  const start = Date.now();

  while (true) {
    try {
      fs.mkdirSync(lockPath);
      break;
    } catch (err) {
      if (!(err instanceof Error) || (err as NodeJS.ErrnoException).code !== 'EEXIST') {
        throw err;
      }

      try {
        const heldFor = Date.now() - fs.statSync(lockPath).mtimeMs;
        if (heldFor > staleAfterMs) {
          fs.rmdirSync(lockPath);
          continue;
        }
      } catch {
        // Lock vanished between the failed mkdir and this stat — another
        // process released or stole it; retry immediately.
        continue;
      }

      if (Date.now() - start > maxWaitMs) {
        throw new Error(
          `Timed out waiting ${maxWaitMs}ms for the model cache lock on "${lockTargetPath}" `
          + `(${lockPath}) — another process may have crashed while holding it.`
        );
      }
      await new Promise(resolve => setTimeout(resolve, retryDelayMs));
    }
  }

  try {
    return await fn();
  } finally {
    try {
      fs.rmdirSync(lockPath);
    } catch {
      // Already gone (e.g. stolen as stale by another opener) — fine.
    }
  }
}
