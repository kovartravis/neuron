import { existsSync, readFileSync, realpathSync } from 'node:fs';
import path from 'node:path';

export interface BinaryVersionMismatch {
  /** `version` from the cwd's own `package.json` — the source tree being developed. */
  cwdVersion: string;
  /** `version` from the running binary's own `package.json`, resolved past any symlink. */
  runningVersion: string;
  /** Real (symlink-resolved) path of the binary that actually ran — the F2 diagnostic's `readlink -f` step, precomputed. */
  runningPath: string;
}

function readPackageJson(dir: string): { name?: string; version?: string } | null {
  const pkgPath = path.join(dir, 'package.json');
  if (!existsSync(pkgPath)) return null;
  try {
    return JSON.parse(readFileSync(pkgPath, 'utf-8'));
  } catch {
    return null;
  }
}

/**
 * Ticket 33 / F2: every hook (`session-start`/`pre-prompt`/`pre-command`/
 * `post-tool-use`/`context-reset`) and `neuron exec` invoke the bare
 * `"neuron"` command resolved from `PATH`, not this repo's own `dist/`. A
 * stale global/linked install then silently runs old behavior while the
 * agent edits new source — this repo's own history has two incidents on
 * record where a human had to diagnose that backward from a downstream
 * symptom (`readlink -f $(which neuron)`, then compare versions by hand).
 *
 * Scoped, per the ticket's own design call, to only fire when `cwd` is
 * this project's own source tree (its `package.json` names
 * `@kovartravis/neuron`) — an ordinary consumer's `neuron` install has no
 * "current directory's own version" to disagree with, so this must never
 * fire for them. `runningBinaryPath` defaults to `process.argv[1]`, the
 * path Node actually resolved this invocation from; it's a parameter
 * (rather than read directly) so tests can point it at a fixture binary.
 *
 * Returns `null` when there's nothing to warn about: `cwd` isn't neuron's
 * own tree, either package.json is unreadable, or the versions agree.
 */
export function checkBinaryVersionMismatch(
  cwd: string,
  runningBinaryPath: string = process.argv[1]
): BinaryVersionMismatch | null {
  const cwdPkg = readPackageJson(cwd);
  if (!cwdPkg || cwdPkg.name !== '@kovartravis/neuron' || !cwdPkg.version) return null;

  let realBinaryPath: string;
  try {
    realBinaryPath = realpathSync(runningBinaryPath);
  } catch {
    return null;
  }

  // The bin entry point (e.g. `dist/cli.js` or `src/cli.ts` under tsx) sits
  // exactly one directory below its own package root — true for both the
  // built and source-run shapes, so no build-vs-dev branch is needed.
  const runningPkg = readPackageJson(path.join(path.dirname(realBinaryPath), '..'));
  if (!runningPkg || !runningPkg.version) return null;

  if (runningPkg.version === cwdPkg.version) return null;

  return {
    cwdVersion: cwdPkg.version,
    runningVersion: runningPkg.version,
    runningPath: realBinaryPath,
  };
}
