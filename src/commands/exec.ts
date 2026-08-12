import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import { NeuronMemory } from '../index.js';
import { loadConfig, resolveExecCategories } from '../config/index.js';
import { autoRescanIfDriftDetected } from '../scanner/diff.js';

export async function handleExecCommand(args: string[]): Promise<void> {
  const dashDashIndex = args.indexOf('--');
  const commandArgs = dashDashIndex !== -1 ? args.slice(dashDashIndex + 1) : args.slice(1);

  if (commandArgs.length === 0) {
    console.error('Usage: neuron exec -- <command>');
    process.exit(1);
  }

  const rawCommandStr = commandArgs.join(' ');

  const config = loadConfig(process.cwd());
  const { categories, limit } = resolveExecCategories(config, rawCommandStr);

  // Uses the real embedder: the mock returns an all-zero vector, which reduces
  // pre-command lookup to keyword matching and silently defeats the semantic
  // retrieval this command exists to provide. Callers that genuinely want the
  // stub (tests, benchmarks) can still set NEURON_MOCK_EMBEDDER themselves.
  const memory = NeuronMemory.open(process.cwd());

  if (config.scan?.enabled) {
    await autoRescanIfDriftDetected(memory);
  }

  // The relevance gate (ticket 41 / ADR 0012) lives in `NeuronMemory.queryGated`,
  // not here — `minScore` no longer gates anything (ADR 0012, ticket 39).
  const { results: relevant, rejected } = await memory.queryGated({ text: rawCommandStr, categories, limit });

  if (relevant.length > 0) {
    process.stderr.write(`[neuron] Matched ${relevant.length} relevant learning(s) for command: "${rawCommandStr}"\n`);
    for (const m of relevant) {
      process.stderr.write(`  - ${m.content}\n`);
    }
    process.stderr.write('\n');
  } else {
    process.stderr.write(`[neuron] 0 relevant learning(s) for "${rawCommandStr}" — ${rejected} candidate(s) below relevance gate\n`);
  }

  memory.close();

  // Spawn the argv array directly rather than re-joining it into a shell
  // string. Joining discards the caller's argument boundaries, so the shell
  // re-splits on whitespace and any argument containing a space is corrupted
  // — `neuron exec -- git commit -m "two words"` used to reach git as four
  // separate arguments. A single argument is still run through a shell, so
  // `neuron exec -- "a && b"` keeps working for pipes and operators.
  const child = commandArgs.length === 1
    ? spawnSync(commandArgs[0], { stdio: 'inherit', shell: true })
    : spawnSync(commandArgs[0], commandArgs.slice(1), { stdio: 'inherit' });

  process.exitCode = child.status ?? (child.error ? 1 : 0);
}
