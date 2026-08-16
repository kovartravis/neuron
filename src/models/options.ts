import { Embedder } from '../components/embedder.js';
import { EnrichmentModel } from '../components/enricher.js';
import { Reranker } from '../components/reranker.js';
import { PolarityClassifier } from '../components/nliClassifier.js';

export interface NeuronMemoryOptions {
  dbPath: string;
  projectRoot: string;
  projectName: string;
  embedder?: Embedder;
  /**
   * Injected write-side enricher. Tests supply a stub so the transaction seam
   * can be exercised without loading a 500M-parameter model; production leaves
   * it unset and gets `LocalEnrichmentModel`.
   */
  enricher?: EnrichmentModel;
  /**
   * Injected gate-layer reranker (ticket 29). Tests supply a stub so the
   * gate's second conjunct can be exercised without loading the real
   * cross-encoder; production leaves it unset and gets `TransformersReranker`,
   * which stays unloaded (and un-costed) unless `relevance.gate.reranker.enabled`
   * actually calls it.
   */
  reranker?: Reranker;
  /**
   * Injected NLI polarity classifier (Ticket 9, neuron-2.4.2). Tests supply a
   * stub so the write-time conflict soft-flag can be exercised without
   * loading the real cross-encoder; production leaves it unset and gets
   * `TransformersNLIClassifier`, only ever called on candidates that already
   * cleared Ticket 3/6's relatedness gate — never a full-category scan.
   */
  polarityClassifier?: PolarityClassifier;
  /**
   * Overrides `storage.mode` from the discovered `neuron.yaml`. Exists for
   * callers whose `projectRoot` is not a real directory — `NeuronMemory.inMemory`
   * fabricates one — where the mode has to be pinned rather than inherited,
   * since the schema default (`md`, ticket 31) would otherwise route markdown
   * writes at a path that does not exist.
   */
  storageMode?: 'md' | 'vector';
}
