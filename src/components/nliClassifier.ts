import path from 'node:path';
import fs from 'node:fs';
import envPaths from 'env-paths';
import { withModelCacheLock } from './modelCacheLock.js';
import { applyCrossPlatformShims } from '../shared/crossPlatformShims.js';

export interface PolarityClassifier {
  /**
   * P(contradiction) for a premise/hypothesis pair, softmax-normalized over
   * the model's 3-way {contradiction, entailment, neutral} head. `premise`
   * is the existing live entry, `hypothesis` the new write being evaluated
   * against it — order matters (NLI is asymmetric) and matches Ticket 8's
   * own A/B corpus direction.
   */
  scoreContradiction(premise: string, hypothesis: string): Promise<number>;
}

const MODEL_ID = 'cross-encoder/nli-MiniLM2-L6-H768';

/**
 * Ticket 9 (neuron-2.4.2) / Ticket 8's validated model choice — a 3-way NLI
 * cross-encoder, same on-disk/cache conventions as `TransformersReranker`,
 * with two deliberate differences from it:
 *
 * - **Full precision, no `dtype: 'q8'`.** Ticket 8/13's A/B scripts
 *   (`benchmarks/nli-polarity-ab/run-ab*.ts`) loaded this model with no
 *   dtype override, and `NLI_CONTRADICTION_BAR` was calibrated against
 *   those runs — a quantized variant was never measured, so using one here
 *   would gate on a bar calibrated for a different model than the one
 *   actually running.
 * - **`env.allowRemoteModels` is always set, not left unset on a cache
 *   miss.** `@huggingface/transformers`'s `env` is a process-wide
 *   singleton shared with `TransformersReranker` — leaving this branch's
 *   `else` unhandled meant a prior reranker load (its own model cached,
 *   `allowRemoteModels` pinned `false`) silently blocked this model's
 *   first-ever download in the same process. Every branch sets the flag
 *   explicitly so this loader's behavior never depends on load order.
 *
 * `id2label` is asserted rather than assumed: Ticket 13's alt-model A/B
 * found label-index order varies by model, so a silently-wrong assumption
 * here would score the wrong class as "contradiction" without any visible
 * failure.
 */
export class TransformersNLIClassifier implements PolarityClassifier {
  private modelPromise: Promise<{ tokenizer: any; model: any }> | null = null;

  async scoreContradiction(premise: string, hypothesis: string): Promise<number> {
    if (!this.modelPromise) {
      this.modelPromise = (async () => {
        applyCrossPlatformShims();
        const { AutoTokenizer, AutoModelForSequenceClassification, env } = await import('@huggingface/transformers');
        const appPaths = envPaths('neuron', { suffix: '' });
        const modelCacheDir = path.join(appPaths.data, 'models');
        env.cacheDir = modelCacheDir;
        env.useFSCache = true;
        const onnxPath = path.join(modelCacheDir, MODEL_ID, 'onnx', 'model.onnx');
        env.allowRemoteModels = !fs.existsSync(onnxPath);
        return withModelCacheLock(onnxPath, async () => {
          const tokenizer = await AutoTokenizer.from_pretrained(MODEL_ID);
          const model = await AutoModelForSequenceClassification.from_pretrained(MODEL_ID);
          const id2label = (model.config as any).id2label as Record<string, string>;
          if (id2label['0'] !== 'contradiction') {
            throw new Error(
              `${MODEL_ID}: expected id2label[0] === 'contradiction', got ${JSON.stringify(id2label)} — ` +
                `Ticket 13 found this ordering varies by model; scoring the wrong class silently would be worse than failing loud.`
            );
          }
          return { tokenizer, model };
        });
      })();
    }
    const { tokenizer, model } = await this.modelPromise;
    const inputs = tokenizer(premise, { text_pair: hypothesis, padding: true, truncation: true });
    const { logits } = await model(inputs);
    const raw = Array.from(logits.data as Float32Array);
    const m = Math.max(...raw);
    const exps = raw.map(x => Math.exp(x - m));
    const sum = exps.reduce((a, b) => a + b, 0);
    return exps[0] / sum;
  }
}
