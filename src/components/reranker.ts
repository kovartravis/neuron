import path from 'node:path';
import fs from 'node:fs';
import envPaths from 'env-paths';
import { withModelCacheLock } from './modelCacheLock.js';
import { applyCrossPlatformShims } from '../shared/crossPlatformShims.js';

export interface Reranker {
  /**
   * Raw cross-encoder relevance logit for one query/passage pair — not a
   * probability. Positive means the model predicts the pair relevant,
   * negative means not; callers threshold at 0, not at 0.5.
   */
  score(query: string, passage: string): Promise<number>;
}

const MODEL_ID = 'Xenova/ms-marco-MiniLM-L-6-v2';

/**
 * Ticket 29 / ADR 0012's gate-layer reranker, picked by ticket 28's research:
 * a plain-BERT cross-encoder (`BertForSequenceClassification`, single logit
 * out), same on-disk/cache conventions as `TransformersEmbedder`. Loaded via
 * the low-level tokenizer+model pair rather than the `text-classification`
 * pipeline, because that pipeline's default softmax normalization is a no-op
 * on this model's single-logit output head — it would always report 1.0
 * instead of the raw score this class needs.
 */
export class TransformersReranker implements Reranker {
  private modelPromise: Promise<{ tokenizer: any; model: any }> | null = null;

  async score(query: string, passage: string): Promise<number> {
    if (!this.modelPromise) {
      this.modelPromise = (async () => {
        applyCrossPlatformShims();
        const { AutoTokenizer, AutoModelForSequenceClassification, env } = await import('@huggingface/transformers');
        const appPaths = envPaths('neuron', { suffix: '' });
        const modelCacheDir = path.join(appPaths.data, 'models');
        env.cacheDir = modelCacheDir;
        env.useFSCache = true;
        const onnxPath = path.join(modelCacheDir, MODEL_ID, 'onnx', 'model_quantized.onnx');
        if (fs.existsSync(onnxPath)) {
          env.allowRemoteModels = false;
        }
        return withModelCacheLock(onnxPath, async () => {
          const tokenizer = await AutoTokenizer.from_pretrained(MODEL_ID);
          const model = await AutoModelForSequenceClassification.from_pretrained(MODEL_ID, { dtype: 'q8' });
          return { tokenizer, model };
        });
      })();
    }
    const { tokenizer, model } = await this.modelPromise;
    const inputs = tokenizer(query, { text_pair: passage, padding: true, truncation: true });
    const { logits } = await model(inputs);
    return logits.data[0] as number;
  }
}
