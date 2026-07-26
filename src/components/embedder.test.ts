import { describe, it, expect } from 'vitest';
import { TransformersEmbedder } from './embedder.js';

describe('TransformersEmbedder (src/components/embedder.ts)', () => {
  it('should generate a 384-dimensional Float32Array vector for given text', async () => {
    const embedder = new TransformersEmbedder();
    const vector = await embedder.embed('Test sentence for vector embedding');

    expect(vector).toBeInstanceOf(Float32Array);
    expect(vector.length).toBe(384);

    // Compute L2 norm to verify normalization
    let normSq = 0;
    for (let i = 0; i < vector.length; i++) {
      normSq += vector[i] * vector[i];
    }
    const norm = Math.sqrt(normSq);
    expect(norm).toBeGreaterThan(0);
    expect(norm).toBeCloseTo(1.0, 1);
  });

  it('should generate deterministic embeddings for identical input strings', async () => {
    const embedder = new TransformersEmbedder();
    const vec1 = await embedder.embed('Deterministic vector check');
    const vec2 = await embedder.embed('Deterministic vector check');

    expect(vec1.length).toBe(vec2.length);
    for (let i = 0; i < vec1.length; i++) {
      expect(vec1[i]).toBe(vec2[i]);
    }
  });

  it('should throw an error when pipeline loading fails', async () => {
    const embedder = new TransformersEmbedder();
    // Simulate pipeline failure by temporarily setting invalid pipeline promise
    (embedder as any).pipelinePromise = Promise.reject(new Error('Pipeline initialization failed'));
    await expect(embedder.embed('test')).rejects.toThrow('Pipeline initialization failed');
  });
});
