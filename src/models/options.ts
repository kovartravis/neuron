import { Embedder } from '../components/embedder.js';
import { EnrichmentModel } from '../components/enricher.js';

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
}
