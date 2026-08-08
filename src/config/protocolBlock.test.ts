import { describe, it, expect, vi } from 'vitest';
import {
  generateProtocolBlock,
  upsertProtocolBlock,
  PROTOCOL_MARKER_START,
  PROTOCOL_MARKER_END,
} from './protocolBlock.js';
import { NeuronConfigSchema, type NeuronConfig } from './neuronYaml.js';

function config(overrides: Partial<NeuronConfig> = {}): NeuronConfig {
  return NeuronConfigSchema.parse({
    categories: {
      learning: { description: 'rules' },
      history: { description: 'log' },
      decisions: { description: 'adrs' },
    },
    ...overrides,
  });
}

describe('generateProtocolBlock', () => {
  it('wraps the block in marker comments', () => {
    const block = generateProtocolBlock({ fidelity: 'deterministic', config: config() });
    expect(block.startsWith(PROTOCOL_MARKER_START)).toBe(true);
    expect(block.endsWith(PROTOCOL_MARKER_END)).toBe(true);
  });

  it('deletes the manual recall step on a deterministic harness', () => {
    const block = generateProtocolBlock({ fidelity: 'deterministic', config: config() });
    expect(block).not.toContain('## 1. Recall');
    expect(block).not.toContain('neuron memory query');
    // Steps renumber down to 1-3 once the recall step is gone.
    expect(block).toContain('## 1. Command Execution');
    expect(block).toContain('## 2. Failure-Fix Recording');
    expect(block).toContain('## 3. Session Conclusion');
  });

  it('keeps the manual recall step as step 1 on a fallback harness', () => {
    const block = generateProtocolBlock({ fidelity: 'fallback', config: config() });
    expect(block).toContain('## 1. Recall');
    expect(block).toContain('neuron memory query');
    expect(block).toContain('## 2. Command Execution');
    expect(block).toContain('## 3. Failure-Fix Recording');
    expect(block).toContain('## 4. Session Conclusion');
  });

  it('never claims something is MANDATORY when nothing enforces it', () => {
    const deterministic = generateProtocolBlock({ fidelity: 'deterministic', config: config() });
    const fallback = generateProtocolBlock({ fidelity: 'fallback', config: config() });
    expect(deterministic).not.toMatch(/MANDATORY/);
    expect(fallback).not.toMatch(/MANDATORY/);
  });

  it('lists the declared categories', () => {
    const block = generateProtocolBlock({ fidelity: 'fallback', config: config() });
    expect(block).toContain('`learning`');
    expect(block).toContain('`history`');
    expect(block).toContain('`decisions`');
  });

  it('reports scan settings only when scanning is enabled', () => {
    const enabled = generateProtocolBlock({
      fidelity: 'deterministic',
      config: config({ scan: { enabled: true, category: 'decisions', depth: 3 } }),
    });
    expect(enabled).toContain('Architecture scan settings: enabled: true, category: `decisions`, depth: 3');

    const disabled = generateProtocolBlock({ fidelity: 'deterministic', config: config() });
    expect(disabled).not.toContain('Architecture scan settings');
  });

  it('preserves the metadata-flags guidance on both variants', () => {
    const deterministic = generateProtocolBlock({ fidelity: 'deterministic', config: config() });
    const fallback = generateProtocolBlock({ fidelity: 'fallback', config: config() });
    for (const block of [deterministic, fallback]) {
      expect(block).toContain('### Metadata flags');
      expect(block).toContain('`--importance`: omit defaults to `3`');
    }
  });
});

describe('upsertProtocolBlock', () => {
  const block = generateProtocolBlock({ fidelity: 'deterministic', config: config() });

  it('creates a new file when none exists', async () => {
    const result = await upsertProtocolBlock(null, block);
    expect(result.action).toBe('created');
    expect(result.content).toBe(`${block}\n`);
  });

  it('appends the block when the file exists but carries no managed region', async () => {
    const existing = '# My Project\n\nSome hand-written notes.\n';
    const result = await upsertProtocolBlock(existing, block);
    expect(result.action).toBe('inserted');
    expect(result.content.startsWith(existing)).toBe(true);
    expect(result.content).toContain(block);
  });

  it('is a no-op when the managed region already matches', async () => {
    const existing = `# My Project\n\n${block}\n`;
    const result = await upsertProtocolBlock(existing, block);
    expect(result.action).toBe('unchanged');
    expect(result.content).toBe(existing);
  });

  it('touches only the marked region, leaving surrounding content untouched', async () => {
    const oldBlock = generateProtocolBlock({ fidelity: 'fallback', config: config() });
    const existing = `# My Project\n\nBefore.\n\n${oldBlock}\n\nAfter.\n`;
    const result = await upsertProtocolBlock(existing, block, { overwrite: 'overwrite' });
    expect(result.action).toBe('written');
    expect(result.content).toContain('Before.');
    expect(result.content).toContain('After.');
    expect(result.content).toContain(block);
    expect(result.content).not.toContain(oldBlock);
  });

  it('keeps a differing existing block by default (policy "ask", no prompt available)', async () => {
    const oldBlock = generateProtocolBlock({ fidelity: 'fallback', config: config() });
    const existing = `${oldBlock}\n`;
    const result = await upsertProtocolBlock(existing, block);
    expect(result.action).toBe('kept-existing');
    expect(result.content).toBe(existing);
  });

  it('keeps a differing existing block when policy is "keep"', async () => {
    const oldBlock = generateProtocolBlock({ fidelity: 'fallback', config: config() });
    const existing = `${oldBlock}\n`;
    const result = await upsertProtocolBlock(existing, block, { overwrite: 'keep' });
    expect(result.action).toBe('kept-existing');
    expect(result.content).toBe(existing);
  });

  it('consults onConflict under policy "ask" and honours a false answer', async () => {
    const oldBlock = generateProtocolBlock({ fidelity: 'fallback', config: config() });
    const existing = `${oldBlock}\n`;
    const onConflict = vi.fn().mockResolvedValue(false);
    const result = await upsertProtocolBlock(existing, block, { overwrite: 'ask', onConflict });
    expect(onConflict).toHaveBeenCalledTimes(1);
    expect(result.action).toBe('kept-existing');
  });

  it('consults onConflict under policy "ask" and honours a true answer', async () => {
    const oldBlock = generateProtocolBlock({ fidelity: 'fallback', config: config() });
    const existing = `${oldBlock}\n`;
    const onConflict = vi.fn().mockResolvedValue(true);
    const result = await upsertProtocolBlock(existing, block, { overwrite: 'ask', onConflict });
    expect(result.action).toBe('written');
    expect(result.content).toBe(`${block}\n`);
  });
});
