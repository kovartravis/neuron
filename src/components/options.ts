import { Embedder } from './embedder.js';

export interface NeuronMemoryOptions {
  dbPath: string;
  projectRoot: string;
  projectName: string;
  embedder?: Embedder;
}
