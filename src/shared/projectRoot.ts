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
 *
 * `name` prefers the `package.json` `name` field (scope stripped, so
 * `@kovartravis/neuron` reads as `neuron`) and falls back to the directory's
 * basename. The basename alone made the label depend on where the repo was
 * cloned — `neuron` in one checkout, `workspace` or `neuron-fork` in another
 * — which is the wrong identity for a label that names the project, not the
 * folder. It only ever appears in CLI output and the dashboard; nothing is
 * persisted under it.
 */
export function findProjectRoot(startDir: string): { root: string; name: string } {
  let dir = path.resolve(startDir);
  while (true) {
    const manifest = path.join(dir, 'package.json');
    if (fs.existsSync(manifest) || fs.existsSync(path.join(dir, '.git'))) {
      return { root: dir, name: readManifestName(manifest) ?? path.basename(dir) };
    }
    const parent = path.dirname(dir);
    if (parent === dir) {
      return { root: startDir, name: path.basename(startDir) };
    }
    dir = parent;
  }
}

function readManifestName(manifestPath: string): string | null {
  try {
    const parsed = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    if (typeof parsed?.name !== 'string' || parsed.name.trim() === '') return null;
    return parsed.name.trim().replace(/^@[^/]+\//, '');
  } catch {
    return null;
  }
}
