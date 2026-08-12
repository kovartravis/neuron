import { describe, it, expect } from 'vitest';
import { TransformersReranker } from './reranker.js';

describe('TransformersReranker (src/components/reranker.ts)', () => {
  it('should score an on-topic query/passage pair positive and an off-topic pair negative', async () => {
    const reranker = new TransformersReranker();

    const relevant = await reranker.score(
      'How many people live in Berlin?',
      'Berlin has a population of 3.7 million registered inhabitants.'
    );
    const irrelevant = await reranker.score(
      'How many people live in Berlin?',
      'The recipe calls for two cups of flour and a teaspoon of salt.'
    );

    expect(relevant).toBeGreaterThan(0);
    expect(irrelevant).toBeLessThan(0);
  });

  it('should return deterministic scores for identical input pairs', async () => {
    const reranker = new TransformersReranker();
    const a = await reranker.score('gate false-accept rate', 'The gate false-accept rate dropped after ticket 29.');
    const b = await reranker.score('gate false-accept rate', 'The gate false-accept rate dropped after ticket 29.');
    expect(a).toBe(b);
  });

  it('should throw an error when model loading fails', async () => {
    const reranker = new TransformersReranker();
    (reranker as any).modelPromise = Promise.reject(new Error('Model initialization failed'));
    await expect(reranker.score('q', 'p')).rejects.toThrow('Model initialization failed');
  });
});
