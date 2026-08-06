/**
 * The shared text-generation model (`Xenova/Qwen1.5-0.5B-Chat`).
 *
 * Loading it costs ~3.2s and dominates its total cost — the load is 87% of a
 * single-inference invocation, and every CLI command is its own process. The
 * loader is therefore a module-level singleton so that a `neuron scan` which
 * has already paid for the model can hand it to write-side enrichment for free,
 * rather than each consumer loading its own copy.
 */
import path from 'node:path';
import { createRequire } from 'node:module';
import envPaths from 'env-paths';

const require = createRequire(import.meta.url);

export const GENERATION_MODEL = 'Xenova/Qwen1.5-0.5B-Chat';

export interface GeneratorProgress {
  phase: string;
  percent?: number;
}

function applyCrossPlatformShims() {
  if (process.platform === 'android') {
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
}

let generatorPromise: Promise<any> | null = null;
let ready = false;

/**
 * Resolve the shared generator, loading it on first use. Returns `null` when
 * the model cannot be loaded — callers degrade rather than throw.
 */
export async function getTextGenerator(
  onProgress?: (progress: GeneratorProgress) => void
): Promise<any | null> {
  if (!generatorPromise) {
    generatorPromise = (async () => {
      try {
        applyCrossPlatformShims();
        const { pipeline, env } = await import('@huggingface/transformers');
        const appPaths = envPaths('neuron', { suffix: '' });
        env.cacheDir = path.join(appPaths.data, 'models');
        env.useFSCache = true;

        onProgress?.({ phase: 'Loading ONNX summarizer model (Qwen1.5-0.5B)' });

        const generator = await pipeline('text-generation', GENERATION_MODEL, {
          dtype: 'q4',
          progress_callback: (info: any) => {
            if (info.status === 'progress' && info.total) {
              const pct = Math.round((info.loaded / info.total) * 100);
              const fileLabel = info.file ? ` (${info.file})` : '';
              onProgress?.({ phase: `Loading ONNX model${fileLabel} ${pct}%`, percent: pct });
            } else if (info.status === 'downloading' || info.status === 'initiate') {
              const fileLabel = info.file ? ` (${info.file})` : '';
              onProgress?.({ phase: `Downloading ONNX model${fileLabel}` });
            } else if (info.status === 'ready' || info.status === 'done') {
              onProgress?.({ phase: `ONNX model loaded` });
            }
          }
        });
        ready = !!generator;
        return generator;
      } catch (e) {
        return null;
      }
    })();
  }
  return generatorPromise;
}

/**
 * Whether the model is already resident in this process. Consumers use it to
 * decide whether an inference is nearly free or costs a cold load.
 */
export function isTextGeneratorLoaded(): boolean {
  return ready;
}

/** Drop the cached generator. Tests only. */
export function resetTextGenerator(): void {
  generatorPromise = null;
  ready = false;
}
