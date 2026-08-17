import path from 'node:path';
import fs from 'node:fs';
import envPaths from 'env-paths';
import { withModelCacheLock } from './modelCacheLock.js';
import { applyCrossPlatformShims } from '../shared/crossPlatformShims.js';

export interface Embedder {
  embed(text: string): Promise<Float32Array>;
  embedQuery(text: string): Promise<Float32Array>;
}

export class TransformersEmbedder implements Embedder {
  private pipelinePromise: any = null;

  async embed(text: string): Promise<Float32Array> {
    if (!this.pipelinePromise) {
      this.pipelinePromise = (async () => {
        applyCrossPlatformShims();
        const { pipeline, env } = await import('@huggingface/transformers');
        const appPaths = envPaths('neuron', { suffix: '' });
        const modelCacheDir = path.join(appPaths.data, 'models');
        env.cacheDir = modelCacheDir;
        env.useFSCache = true;
        const onnxPath = path.join(modelCacheDir, 'Xenova/bge-small-en-v1.5', 'onnx', 'model_quantized.onnx');
        if (fs.existsSync(onnxPath)) {
          env.allowRemoteModels = false;
        }
        return withModelCacheLock(onnxPath, () => pipeline('feature-extraction', 'Xenova/bge-small-en-v1.5', { dtype: 'q8' }));
      })();
    }
    const extractor = await this.pipelinePromise;
    const output = await extractor(text, { pooling: 'cls', normalize: true });
    return new Float32Array(output.data);
  }

  async embedQuery(text: string): Promise<Float32Array> {
    return this.embed(`Represent this sentence for searching relevant passages: ${text}`);
  }
}
