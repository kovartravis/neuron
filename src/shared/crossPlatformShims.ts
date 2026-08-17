import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

/**
 * Forces `@huggingface/transformers` onto its WASM (`onnxruntime-web`)
 * backend instead of the native `onnxruntime-node` one, needed on Android
 * (no native addon support in Termux). Call before the first
 * `await import('@huggingface/transformers')` in any module that loads one
 * of its models.
 *
 * Does NOT help inside a pkg-packaged binary (curl-install effort, ticket
 * 5): onnxruntime-node's binding.js resolves its `.node` file via a
 * computed `path.join()`, which pkg's snapshot fs can't `dlopen()` even
 * with the file listed as a pkg asset — and patching `require.cache` here
 * to preempt it doesn't propagate into pkg's own module loader for
 * snapshot-packaged node_modules deps, confirmed by direct testing. The
 * packaged binary degrades gracefully instead (a failed vector-index write
 * doesn't fail the overall command), so this is a shipped, accepted
 * limitation rather than a bug this function fixes.
 */
export function applyCrossPlatformShims(): void {
  if (process.platform !== 'android') return;

  try {
    const ort = require('onnxruntime-web');
    if (ort && ort.env && ort.env.wasm) {
      ort.env.wasm.numThreads = 1;
      const distDir = path.dirname(require.resolve('onnxruntime-web'));
      ort.env.wasm.wasmPaths = distDir + '/';
    }
    const resolvedOrt = require.resolve('onnxruntime-node');
    (require.cache as any)[resolvedOrt] = { id: resolvedOrt, filename: resolvedOrt, loaded: true, exports: ort };
  } catch (e) {}

  try {
    const resolvedSharp = require.resolve('sharp');
    (require.cache as any)[resolvedSharp] = { id: resolvedSharp, filename: resolvedSharp, loaded: true, exports: {} };
  } catch (e) {}
}
