import path from 'node:path';
import fs from 'node:fs';
import envPaths from 'env-paths';

export interface Embedder {
  embed(text: string): Promise<Float32Array>;
  embedQuery?(text: string): Promise<Float32Array>;
}

export class TransformersEmbedder implements Embedder {
  private pipelinePromise: any = null;

  async embed(text: string): Promise<Float32Array> {
    if (!this.pipelinePromise) {
      this.pipelinePromise = (async () => {
        try {
          const { pipeline, env } = await import('@huggingface/transformers');
          const appPaths = envPaths('neuron', { suffix: '' });
          const modelCacheDir = path.join(appPaths.data, 'models');
          env.cacheDir = modelCacheDir;
          env.useFSCache = true;
          const onnxPath = path.join(modelCacheDir, 'Xenova/bge-small-en-v1.5', 'onnx', 'model_quantized.onnx');
          if (fs.existsSync(onnxPath)) {
            env.allowRemoteModels = false;
          }
          return await pipeline('feature-extraction', 'Xenova/bge-small-en-v1.5', { dtype: 'q8' });
        } catch (err) {
          // Fallback embedder (deterministic term-frequency / hash vector embedder)
          return async (txt: string, _opts?: any) => {
            const dim = 384;
            const data = new Float32Array(dim);
            const words = txt.toLowerCase().split(/\s+/);
            for (let i = 0; i < words.length; i++) {
              const word = words[i];
              let hash = 0;
              for (let j = 0; j < word.length; j++) {
                hash = (hash << 5) - hash + word.charCodeAt(j);
                hash |= 0;
              }
              const idx = Math.abs(hash) % dim;
              data[idx] += 1.0 / (i + 1);
            }
            let norm = 0;
            for (let i = 0; i < dim; i++) norm += data[i] * data[i];
            norm = Math.sqrt(norm);
            if (norm > 0) {
              for (let i = 0; i < dim; i++) data[i] /= norm;
            }
            return { data };
          };
        }
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
