#!/usr/bin/env node

import {
  findProjectRoot,
  handleInitCommand,
  handleExecCommand,
  handleStatusCommand,
  handleLearnCommand,
  handleMemoryCommand,
  handleUiCommand,
  handleSyncCommand,
  handleFeedbackCommand,
  handleScanCommand,
  handleHookCommand,
  handleUpgradeCommand,
  handleMcpCommand,
  MASTER_HELP
} from './commands/index.js';
import { NeuronMemory } from './index.js';
import { getRunningVersion } from './components/version.js';

async function main() {
  const args = process.argv.slice(2);
  const mainCommand = args[0];

  if (!mainCommand || mainCommand === '--help' || mainCommand === '-h') {
    console.log(MASTER_HELP);
    process.exit(0);
  }

  if (mainCommand === '--version' || mainCommand === '-v') {
    console.log(getRunningVersion());
    process.exit(0);
  }

  if (mainCommand === 'upgrade') {
    return await handleUpgradeCommand(args);
  }

  if (mainCommand === 'init') {
    return await handleInitCommand(args);
  }

  if (mainCommand === 'feedback') {
    return handleFeedbackCommand(args);
  }

  if (mainCommand === 'scan') {
    return await handleScanCommand(args);
  }

  if (mainCommand === 'hook') {
    // Invoked by a harness, never by hand: never let an uncaught error here
    // propagate to the generic catch-all below, which would exit non-zero
    // and, on Claude Code's UserPromptSubmit, block the user's prompt.
    return await handleHookCommand(args);
  }



  if (mainCommand === 'exec') {
    return await handleExecCommand(args);
  }

  if (mainCommand === 'ui') {
    const memory = NeuronMemory.open(process.cwd());
    return await handleUiCommand(args, memory);
  }

  if (mainCommand === 'mcp') {
    return await handleMcpCommand(args);
  }

  // Resolve project details
  const { name: projectName } = findProjectRoot(process.cwd());

  const memory = NeuronMemory.open(process.cwd());

  try {
    if (mainCommand === 'status') {
      return await handleStatusCommand(memory, args);
    }

    if (mainCommand === 'memory') {
      return await handleMemoryCommand(args, memory, projectName);
    }

    if (mainCommand === 'learn') {
      return await handleLearnCommand(args, memory, projectName);
    }

    if (mainCommand === 'sync') {
      return await handleSyncCommand(args.slice(1), memory);
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
