import path from 'node:path';
import crypto from 'node:crypto';
import envPaths from 'env-paths';

/**
 * Same hash scheme `NeuronMemory` uses for its SQLite filename
 * (`src/index.ts`), reused here so ledger/hook-state files land in a
 * predictable, collision-resistant per-project directory without importing
 * `NeuronMemory` itself — this module only ever touches the filesystem, never
 * the memory store.
 */
export function projectHash(projectRoot: string): string {
  return crypto.createHash('sha256').update(path.resolve(projectRoot)).digest('hex').slice(0, 16);
}

/**
 * Where per-project hook runtime state (session ledgers, firing evidence)
 * lives. `NEURON_HOOK_CACHE_DIR` overrides it for test isolation, matching
 * the `NEURON_GRAMMAR_DIR` precedent in `src/scanner/grammars.ts` — resolving
 * through `env-paths` reads the home directory once per process, which tests
 * can't vary between cases otherwise.
 *
 * Deliberately outside `.neuron/` (which is markdown the user commits, per
 * ADR 0011): this is ephemeral runtime data, not memory content.
 */
export function hookCacheDir(projectRoot: string): string {
  const override = process.env.NEURON_HOOK_CACHE_DIR;
  const base = override && override.trim()
    ? override.trim()
    : path.join(envPaths('neuron', { suffix: '' }).cache, 'hooks');
  return path.join(base, projectHash(projectRoot));
}

/** Sanitizes an externally-supplied session id into a safe filename component. */
export function sessionFileKey(sessionId: string): string {
  return crypto.createHash('sha256').update(sessionId).digest('hex').slice(0, 24);
}
