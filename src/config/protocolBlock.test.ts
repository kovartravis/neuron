import { describe, it, expect, vi } from 'vitest';
import {
  generateProtocolBlock,
  upsertProtocolBlock,
  PROTOCOL_MARKER_START,
  PROTOCOL_MARKER_END,
  type ProtocolBlockOptions,
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

/** Defaults `mcpConfigured: false` — irrelevant to most of this suite; see the dedicated "MCP recall verb swap" describe block below. */
function genBlock(options: Omit<ProtocolBlockOptions, 'mcpConfigured'> & { mcpConfigured?: boolean }): string {
  return generateProtocolBlock({ mcpConfigured: false, ...options });
}

describe('generateProtocolBlock', () => {
  it('wraps the block in marker comments', () => {
    const block = genBlock({ fidelity: 'deterministic', execFidelity: 'deterministic', config: config() });
    expect(block.startsWith(PROTOCOL_MARKER_START)).toBe(true);
    expect(block.endsWith(PROTOCOL_MARKER_END)).toBe(true);
  });

  it('deletes both manual steps once recall and command execution are both hooked', () => {
    const block = genBlock({ fidelity: 'deterministic', execFidelity: 'deterministic', config: config() });
    expect(block).not.toContain('## 1. Recall');
    expect(block).not.toContain('neuron memory query');
    expect(block).not.toContain('Command Execution');
    expect(block).not.toContain('neuron exec -- <command>');
    // Steps renumber down to 1-2 once both manual steps are gone.
    expect(block).toContain('## 1. Failure-Fix Recording');
    expect(block).toContain('## 2. Session Conclusion');
  });

  it('keeps the manual command-execution step when only recall is hooked', () => {
    const block = genBlock({ fidelity: 'deterministic', execFidelity: 'fallback', config: config() });
    expect(block).not.toContain('## 1. Recall');
    expect(block).toContain('## 1. Command Execution');
    expect(block).toContain('neuron exec');
    expect(block).toContain('## 2. Failure-Fix Recording');
    expect(block).toContain('## 3. Session Conclusion');
  });

  it('keeps the manual recall step when only command execution is hooked', () => {
    const block = genBlock({ fidelity: 'fallback', execFidelity: 'deterministic', config: config() });
    expect(block).toContain('## 1. Recall');
    expect(block).toContain('neuron memory query');
    expect(block).not.toContain('Command Execution');
    expect(block).toContain('## 2. Failure-Fix Recording');
    expect(block).toContain('## 3. Session Conclusion');
  });

  it('keeps the manual recall step as step 1 on a fallback harness', () => {
    const block = genBlock({ fidelity: 'fallback', execFidelity: 'fallback', config: config() });
    expect(block).toContain('## 1. Recall');
    expect(block).toContain('neuron memory query');
    expect(block).toContain('## 2. Command Execution');
    expect(block).toContain('## 3. Failure-Fix Recording');
    expect(block).toContain('## 4. Session Conclusion');
  });

  it('never claims something is MANDATORY when nothing enforces it', () => {
    const deterministic = genBlock({ fidelity: 'deterministic', execFidelity: 'deterministic', config: config() });
    const fallback = genBlock({ fidelity: 'fallback', execFidelity: 'fallback', config: config() });
    expect(deterministic).not.toMatch(/MANDATORY/);
    expect(fallback).not.toMatch(/MANDATORY/);
  });

  it('lists the declared categories', () => {
    const block = genBlock({ fidelity: 'fallback', execFidelity: 'fallback', config: config() });
    expect(block).toContain('`learning`');
    expect(block).toContain('`history`');
    expect(block).toContain('`decisions`');
  });

  it('drops the history-pointer branch and the history example command when history is not declared', () => {
    const withoutHistory = config({ categories: { learning: { description: 'rules' }, decisions: { description: 'adrs' } } });
    const block = genBlock({ fidelity: 'deterministic', execFidelity: 'deterministic', config: withoutHistory });
    expect(block).not.toContain('`history`');
    expect(block).not.toContain('shrink `history`');
    expect(block).toContain('neuron memory add --category decisions');
    expect(block).toContain('neuron memory add --category learning');
    expect(block).toContain("If nothing was decided — pure execution — there's nothing else to log.");
  });

  it('reports scan settings only when scanning is enabled', () => {
    const enabled = genBlock({
      fidelity: 'deterministic',
      execFidelity: 'deterministic',
      config: config({ scan: { enabled: true, category: 'decisions', depth: 3 } }),
    });
    expect(enabled).toContain('Architecture scan settings: enabled: true, category: `decisions`, depth: 3');

    const disabled = genBlock({ fidelity: 'deterministic', execFidelity: 'deterministic', config: config() });
    expect(disabled).not.toContain('Architecture scan settings');
  });

  it('preserves the metadata-flags guidance on both variants', () => {
    const deterministic = genBlock({ fidelity: 'deterministic', execFidelity: 'deterministic', config: config() });
    const fallback = genBlock({ fidelity: 'fallback', execFidelity: 'fallback', config: config() });
    for (const block of [deterministic, fallback]) {
      expect(block).toContain('### Metadata flags');
      expect(block).toContain('`--importance`: omit defaults to `3`');
    }
  });

  describe('MCP recall verb swap (Ticket 9, neuron-2.4.3, implementing Ticket 8 decisions 2/3)', () => {
    it('emits the neuron_recall MCP tool call instead of the bash command when MCP is configured on a fallback harness', () => {
      const block = genBlock({ fidelity: 'fallback', execFidelity: 'fallback', mcpConfigured: true, config: config() });
      expect(block).toContain('## 1. Recall');
      expect(block).toContain('neuron_recall(');
      expect(block).not.toContain('neuron memory query');
    });

    it('keeps the bash command when MCP is not configured on a fallback harness', () => {
      const block = genBlock({ fidelity: 'fallback', execFidelity: 'fallback', mcpConfigured: false, config: config() });
      expect(block).toContain('neuron memory query');
      expect(block).not.toContain('neuron_recall(');
    });

    it('drops the recall step entirely once fidelity is deterministic, regardless of mcpConfigured — the hook stays authoritative and the agent file stays silent on MCP', () => {
      const withMcp = genBlock({ fidelity: 'deterministic', execFidelity: 'fallback', mcpConfigured: true, config: config() });
      const withoutMcp = genBlock({ fidelity: 'deterministic', execFidelity: 'fallback', mcpConfigured: false, config: config() });
      expect(withMcp).toBe(withoutMcp);
      expect(withMcp).not.toContain('## 1. Recall');
      expect(withMcp).not.toContain('neuron_recall(');
      expect(withMcp).not.toContain('neuron memory query');
    });

    it('never offers neuron_remember as an alternative write-side verb, even when MCP is configured (decision 3, write side)', () => {
      const block = genBlock({ fidelity: 'fallback', execFidelity: 'fallback', mcpConfigured: true, config: config() });
      expect(block).not.toContain('neuron_remember');
      expect(block).toContain('neuron memory add --category decisions');
    });
  });
});

describe('upsertProtocolBlock', () => {
  const block = generateProtocolBlock({ fidelity: 'deterministic', execFidelity: 'deterministic', config: config() });

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
    const oldBlock = generateProtocolBlock({ fidelity: 'fallback', execFidelity: 'fallback', config: config() });
    const existing = `# My Project\n\nBefore.\n\n${oldBlock}\n\nAfter.\n`;
    const result = await upsertProtocolBlock(existing, block, { overwrite: 'overwrite' });
    expect(result.action).toBe('written');
    expect(result.content).toContain('Before.');
    expect(result.content).toContain('After.');
    expect(result.content).toContain(block);
    expect(result.content).not.toContain(oldBlock);
  });

  it('keeps a differing existing block by default (policy "ask", no prompt available)', async () => {
    const oldBlock = generateProtocolBlock({ fidelity: 'fallback', execFidelity: 'fallback', config: config() });
    const existing = `${oldBlock}\n`;
    const result = await upsertProtocolBlock(existing, block);
    expect(result.action).toBe('kept-existing');
    expect(result.content).toBe(existing);
  });

  it('keeps a differing existing block when policy is "keep"', async () => {
    const oldBlock = generateProtocolBlock({ fidelity: 'fallback', execFidelity: 'fallback', config: config() });
    const existing = `${oldBlock}\n`;
    const result = await upsertProtocolBlock(existing, block, { overwrite: 'keep' });
    expect(result.action).toBe('kept-existing');
    expect(result.content).toBe(existing);
  });

  it('consults onConflict under policy "ask" and honours a false answer', async () => {
    const oldBlock = generateProtocolBlock({ fidelity: 'fallback', execFidelity: 'fallback', config: config() });
    const existing = `${oldBlock}\n`;
    const onConflict = vi.fn().mockResolvedValue(false);
    const result = await upsertProtocolBlock(existing, block, { overwrite: 'ask', onConflict });
    expect(onConflict).toHaveBeenCalledTimes(1);
    expect(result.action).toBe('kept-existing');
  });

  it('consults onConflict under policy "ask" and honours a true answer', async () => {
    const oldBlock = generateProtocolBlock({ fidelity: 'fallback', execFidelity: 'fallback', config: config() });
    const existing = `${oldBlock}\n`;
    const onConflict = vi.fn().mockResolvedValue(true);
    const result = await upsertProtocolBlock(existing, block, { overwrite: 'ask', onConflict });
    expect(result.action).toBe('written');
    expect(result.content).toBe(`${block}\n`);
  });
});
