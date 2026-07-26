#!/usr/bin/env node

import {
  findProjectRoot,
  handleInitCommand,
  handleExecCommand,
  handleStatusCommand,
  handleLearnCommand,
  handleHistoryCommand,
  MASTER_HELP
} from './commands/index.js';
import { NeuronMemory } from './index.js';

async function main() {
  const args = process.argv.slice(2);
  const mainCommand = args[0];

  if (!mainCommand || mainCommand === '--help' || mainCommand === '-h') {
    console.log(MASTER_HELP);
    process.exit(0);
  }

  if (mainCommand === 'init') {
    return handleInitCommand(args);
  }

  if (mainCommand === 'exec') {
    return await handleExecCommand(args);
  }

  // Resolve project details
  const { name: projectName } = findProjectRoot(process.cwd());

  const memory = NeuronMemory.open(process.cwd());

  try {
    if (mainCommand === 'status') {
      return handleStatusCommand(memory);
    }

    if (mainCommand === 'learn') {
      return await handleLearnCommand(args, memory, projectName);
    }

    if (mainCommand === 'history') {
      return await handleHistoryCommand(args, memory, projectName);
    }

    console.error(`Unknown main command: ${mainCommand}`);
    process.exit(1);
  } catch (err: any) {
    console.error(err.message);
    process.exit(1);
  } finally {
    memory.close();
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
