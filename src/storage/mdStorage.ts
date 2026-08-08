import { Memory } from '../models/memory.js';

/**
 * The markdown-storage surface every caller (`NeuronMemory`, `DualStorageRouter`,
 * `syncMdWithVector`, `neuron sync`) actually depends on. Extracted so a caller can
 * be handed either a single-root `MdStorageAdapter` or a `MultiRootMdStorage` that
 * fans out across several resolved category roots (ticket 05) without knowing which.
 */
export interface MdStorage {
  getFilePath(category: string): string;
  ensureScaffolded(categories?: string[]): Promise<void>;
  ensureDirectories(categories?: string[]): Promise<void>;
  readCategory(category: string): Promise<Memory[]>;
  readAll(categories?: string[]): Promise<Memory[]>;
  writeEntry(category: string, entry: Partial<Memory> & { content?: string }): Promise<Memory>;
  updateEntry(category: string, entry: Partial<Memory> & { id: string }): Promise<Memory>;
  deleteEntry(category: string, id: string): Promise<boolean>;
  /** Every distinct absolute directory this storage currently writes into. */
  listRoots(): string[];
}
