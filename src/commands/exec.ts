import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import { NeuronMemory } from '../index.js';
import { loadConfig, resolveExecCategories } from '../config/index.js';

export async function handleExecCommand(args: string[]): Promise<void> {
  const dashDashIndex = args.indexOf('--');
  const commandArgs = dashDashIndex !== -1 ? args.slice(dashDashIndex + 1) : args.slice(1);

  if (commandArgs.length === 0) {
    console.error('Usage: neuron exec -- <command>');
    process.exit(1);
  }

  const rawCommandStr = commandArgs.join(' ');

  const config = loadConfig(process.cwd());
  const { categories, limit, minScore } = resolveExecCategories(config, rawCommandStr);

  process.env.NEURON_MOCK_EMBEDDER = 'true';
  const memory = NeuronMemory.open(process.cwd());
  const matched = await memory.query({ text: rawCommandStr, categories, limit });
  const relevant = matched.filter(m => (m.score ?? 0) >= minScore);

  if (relevant.length > 0) {
    process.stderr.write(`[neuron] Matched ${relevant.length} relevant learning(s) for command: "${rawCommandStr}"\n`);
    for (const m of relevant) {
      process.stderr.write(`  - ${m.content}\n`);
    }
    process.stderr.write('\n');
  }

  memory.close();

  const child = spawnSync(rawCommandStr, {
    stdio: 'inherit',
    shell: true
  });

  process.exitCode = child.status ?? (child.error ? 1 : 0);
}
