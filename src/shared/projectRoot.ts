import path from 'node:path';
import fs from 'node:fs';

/**
 * Single shared implementation of upward project-root discovery. Was
 * duplicated byte-for-byte between `NeuronMemory.open()` (src/index.ts) and
 * `commands/utils.ts` until ticket 30 (neuron-2.4.0): `autoRescanIfDriftDetected`
 * and `neuron scan` derived their scan root from literal `process.cwd()`
 * instead of this walk, so a CLI invocation from a project-marker-less
 * subdirectory (any bare `.scratch` effort's `issues` dir qualifies) could
 * scan and ingest a degenerate topology into the real project's store. Both
 * surfaces now import this one function so the scan root and the storage
 * root are provably the same resolution.
 */
export function findProjectRoot(startDir: string): { root: string; name: string } {
  let dir = path.resolve(startDir);
  while (true) {
    if (fs.existsSync(path.join(dir, 'package.json')) || fs.existsSync(path.join(dir, '.git'))) {
      return { root: dir, name: path.basename(dir) };
    }
    const parent = path.dirname(dir);
    if (parent === dir) {
      return { root: startDir, name: path.basename(startDir) };
    }
    dir = parent;
  }
}
