import { existsSync, readFileSync, realpathSync } from 'node:fs';
import path from 'node:path';

/**
 * Injected via esbuild's `--define` by `scripts/build-binary.mjs` (ticket 5's
 * packaging step, extended by ticket 8) when building the standalone pkg
 * binary — never present in the plain `tsc` output `npm publish` ships. The
 * `typeof` guard below is the standard safe way to read a bundler-injected
 * global that may not exist at all in a given build: unlike a bare reference,
 * `typeof` never throws on an undeclared identifier.
 */
declare const __NEURON_VERSION__: string | undefined;

function readPackageVersion(dir: string): string | null {
  const pkgPath = path.join(dir, 'package.json');
  if (!existsSync(pkgPath)) return null;
  try {
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
    return typeof pkg.version === 'string' ? pkg.version : null;
  } catch {
    return null;
  }
}

/**
 * The running binary's own version, regardless of how it was installed.
 *
 * Inside the pkg-packaged standalone binary there's no `package.json` sitting
 * next to the executable to read at runtime (`install.sh`/`install.ps1` drop
 * a single file), so that build embeds the version at build time instead
 * (`__NEURON_VERSION__`, see above) — this is also what makes it possible for
 * `neuron upgrade` to know what it's currently running without shelling out.
 * Every other shape (npm global install, `npm link`, `tsx src/cli.ts` in this
 * repo's own dev loop) reads it the same way `checkBinaryVersionMismatch`
 * (src/components/binaryVersion.ts) does: the bin entry point sits exactly
 * one directory below its own package root.
 */
export function getRunningVersion(entryPath: string = process.argv[1]): string {
  if (typeof __NEURON_VERSION__ !== 'undefined') return __NEURON_VERSION__;

  try {
    const entry = realpathSync(entryPath);
    const version = readPackageVersion(path.join(path.dirname(entry), '..'));
    if (version) return version;
  } catch {
    // fall through to the unknown sentinel below
  }

  return '0.0.0-unknown';
}
