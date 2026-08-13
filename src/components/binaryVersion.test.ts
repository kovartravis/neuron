import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, symlinkSync, realpathSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { checkBinaryVersionMismatch } from './binaryVersion.js';

describe('checkBinaryVersionMismatch (src/components/binaryVersion.ts)', () => {
  let root: string;

  beforeEach(() => {
    root = mkdtempSync(path.join(tmpdir(), 'neuron-binary-version-'));
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  /** Builds a fake `<pkgRoot>/dist/cli.js`-shaped binary and returns its path. */
  function makeBinary(pkgRoot: string, name: string, version: string): string {
    mkdirSync(path.join(pkgRoot, 'dist'), { recursive: true });
    writeFileSync(path.join(pkgRoot, 'package.json'), JSON.stringify({ name, version }));
    const binaryPath = path.join(pkgRoot, 'dist', 'cli.js');
    writeFileSync(binaryPath, '// fixture');
    return binaryPath;
  }

  it('reports a mismatch when the running binary\'s package.json version disagrees with cwd\'s', () => {
    const cwd = path.join(root, 'cwd');
    mkdirSync(cwd, { recursive: true });
    writeFileSync(path.join(cwd, 'package.json'), JSON.stringify({ name: '@kovartravis/neuron', version: '2.4.0' }));

    const runningRoot = path.join(root, 'stale-global-install');
    const binaryPath = makeBinary(runningRoot, '@kovartravis/neuron', '2.3.0');

    const result = checkBinaryVersionMismatch(cwd, binaryPath);

    expect(result).toEqual({
      cwdVersion: '2.4.0',
      runningVersion: '2.3.0',
      runningPath: realpathSync(binaryPath),
    });
  });

  it('resolves a symlinked binary (npm link shape) to its real package.json before comparing', () => {
    const cwd = path.join(root, 'cwd');
    mkdirSync(cwd, { recursive: true });
    writeFileSync(path.join(cwd, 'package.json'), JSON.stringify({ name: '@kovartravis/neuron', version: '2.4.0' }));

    const realRoot = path.join(root, 'linked-repo');
    const realBinaryPath = makeBinary(realRoot, '@kovartravis/neuron', '2.4.0');

    const linkPath = path.join(root, 'neuron-symlink');
    symlinkSync(realBinaryPath, linkPath);

    // Same version on both sides via the symlink's real target: no mismatch.
    expect(checkBinaryVersionMismatch(cwd, linkPath)).toBeNull();
  });

  it('returns null when versions agree', () => {
    const cwd = path.join(root, 'cwd');
    mkdirSync(cwd, { recursive: true });
    writeFileSync(path.join(cwd, 'package.json'), JSON.stringify({ name: '@kovartravis/neuron', version: '2.4.0' }));

    const binaryPath = makeBinary(path.join(root, 'in-sync-install'), '@kovartravis/neuron', '2.4.0');

    expect(checkBinaryVersionMismatch(cwd, binaryPath)).toBeNull();
  });

  it('returns null when cwd is not neuron\'s own source tree, even if versions differ', () => {
    const cwd = path.join(root, 'some-other-project');
    mkdirSync(cwd, { recursive: true });
    writeFileSync(path.join(cwd, 'package.json'), JSON.stringify({ name: 'some-other-project', version: '1.0.0' }));

    const binaryPath = makeBinary(path.join(root, 'global-install'), '@kovartravis/neuron', '2.3.0');

    expect(checkBinaryVersionMismatch(cwd, binaryPath)).toBeNull();
  });

  it('returns null when cwd has no package.json', () => {
    const cwd = path.join(root, 'no-package-json');
    mkdirSync(cwd, { recursive: true });

    const binaryPath = makeBinary(path.join(root, 'global-install'), '@kovartravis/neuron', '2.3.0');

    expect(checkBinaryVersionMismatch(cwd, binaryPath)).toBeNull();
  });

  it('returns null when the running binary path does not resolve', () => {
    const cwd = path.join(root, 'cwd');
    mkdirSync(cwd, { recursive: true });
    writeFileSync(path.join(cwd, 'package.json'), JSON.stringify({ name: '@kovartravis/neuron', version: '2.4.0' }));

    expect(checkBinaryVersionMismatch(cwd, path.join(root, 'does-not-exist', 'cli.js'))).toBeNull();
  });
});
