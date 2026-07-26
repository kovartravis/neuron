import { spawnSync } from 'node:child_process';
import { NeuronMemory } from '../index.js';

export async function handleExecCommand(args: string[]): Promise<void> {
  const dashDashIndex = args.indexOf('--');
  const commandArgs = dashDashIndex !== -1 ? args.slice(dashDashIndex + 1) : args.slice(1);

  if (commandArgs.length === 0) {
    console.error('Usage: neuron exec -- <command>');
    process.exit(1);
  }

  const rawCommandStr = commandArgs.join(' ');
  const cleanCommandStr = rawCommandStr
    .replace(/^(npx|npm run|bun run|pnpm run|yarn run|sudo)\s+/, '')
    .trim();

  const memory = NeuronMemory.open(process.cwd());
  const matched = await memory.query({ text: cleanCommandStr, kind: 'learning', limit: 5 });
  const threshold = process.env.NEURON_MOCK_EMBEDDER === 'true' ? 0.15 : 0.35;
  const relevant = matched.filter(m => (m.score ?? 0) >= threshold);

  if (relevant.length > 0) {
    process.stderr.write(`[neuron] Matched ${relevant.length} relevant learning(s) for command: "${rawCommandStr}"\n`);
    for (const m of relevant) {
      process.stderr.write(`  - ${m.content}\n`);
    }
    process.stderr.write('\n');
  }

  memory.close();

  const child = spawnSync(commandArgs[0], commandArgs.slice(1), {
    stdio: 'inherit'
  });

  process.exit(child.status ?? (child.error ? 1 : 0));
}
