import { NeuronMemory } from '../index.js';

export function handleStatusCommand(memory: NeuronMemory): void {
  const status = memory.getStatus();
  console.log(JSON.stringify(status));
}
