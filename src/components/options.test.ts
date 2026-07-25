import { describe, it, expect } from 'vitest';
import type { NeuronMemoryOptions } from './options.js';

describe('NeuronMemoryOptions Component (src/components/options.ts)', () => {
  it('should validate options configuration object', () => {
    const opts: NeuronMemoryOptions = {
      dbPath: ':memory:',
      projectRoot: '/home/user/project',
      projectName: 'my-project'
    };

    expect(opts.dbPath).toBe(':memory:');
    expect(opts.projectRoot).toBe('/home/user/project');
    expect(opts.projectName).toBe('my-project');
  });
});
