import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { getRunningVersion } from './version.js';

describe('getRunningVersion (src/components/version.ts)', () => {
  let root: string;

  beforeEach(() => {
    root = mkdtempSync(path.join(tmpdir(), 'neuron-version-'));
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  /** Builds a fake `<pkgRoot>/dist/cli.js`-shaped entry point and returns its path. */
  function makeEntry(pkgRoot: string, version: string): string {
    mkdirSync(path.join(pkgRoot, 'dist'), { recursive: true });
    writeFileSync(path.join(pkgRoot, 'package.json'), JSON.stringify({ name: '@kovartravis/neuron', version }));
    const entryPath = path.join(pkgRoot, 'dist', 'cli.js');
    writeFileSync(entryPath, '// fixture');
    return entryPath;
  }

  it("reads the version from the package.json two directories up from the entry point (npm/dev shape)", () => {
    const entry = makeEntry(root, '2.4.3');
    expect(getRunningVersion(entry)).toBe('2.4.3');
  });

  it('falls back to the unknown sentinel when no package.json is reachable', () => {
    const entryPath = path.join(root, 'dist', 'cli.js');
    mkdirSync(path.dirname(entryPath), { recursive: true });
    writeFileSync(entryPath, '// fixture, no package.json anywhere above it');
    expect(getRunningVersion(entryPath)).toBe('0.0.0-unknown');
  });

  it('falls back to the unknown sentinel when the entry path does not exist at all', () => {
    expect(getRunningVersion(path.join(root, 'does', 'not', 'exist.js'))).toBe('0.0.0-unknown');
  });
});
