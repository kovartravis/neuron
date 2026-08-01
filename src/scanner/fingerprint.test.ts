import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import path from 'node:path';
import fs from 'node:fs';
import {
  computeProjectFingerprint,
  readReconciledFingerprint,
  writeReconciledFingerprint,
  clearReconciledFingerprint,
} from './fingerprint.js';

describe('Drift Fingerprint Guard (src/scanner/fingerprint.ts)', () => {
  const tempRoot = path.join(process.cwd(), 'src/__tests__/temp-fingerprint');
  const inputs = { depth: 3, category: 'architecture' };
  let projectDir: string;

  beforeEach(() => {
    projectDir = path.join(tempRoot, `proj-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    fs.mkdirSync(path.join(projectDir, 'src'), { recursive: true });
    fs.writeFileSync(path.join(projectDir, 'package.json'), JSON.stringify({ name: 'fp-demo' }));
    fs.writeFileSync(path.join(projectDir, 'src/a.ts'), 'export const a = 1;\n');
    fs.writeFileSync(path.join(projectDir, 'src/b.ts'), 'export const b = 2;\n');
  });

  afterAll(() => {
    if (fs.existsSync(tempRoot)) {
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  const fingerprint = () => computeProjectFingerprint(projectDir, inputs);

  it('is stable across repeated calls on an unchanged tree', () => {
    expect(fingerprint()).toBe(fingerprint());
  });

  it('changes when a source file is added', () => {
    const before = fingerprint();
    fs.writeFileSync(path.join(projectDir, 'src/c.ts'), 'export const c = 3;\n');
    expect(fingerprint()).not.toBe(before);
  });

  it('changes when a source file is edited', () => {
    const before = fingerprint();
    fs.writeFileSync(path.join(projectDir, 'src/a.ts'), 'export const a = 1;\nexport const a2 = 9;\n');
    expect(fingerprint()).not.toBe(before);
  });

  it('changes when a source file is deleted', () => {
    const before = fingerprint();
    fs.rmSync(path.join(projectDir, 'src/b.ts'));
    expect(fingerprint()).not.toBe(before);
  });

  it('changes when a root manifest changes, so dependency shifts are caught', () => {
    const before = fingerprint();
    fs.writeFileSync(
      path.join(projectDir, 'package.json'),
      JSON.stringify({ name: 'fp-demo', dependencies: { express: '^4.0.0' } })
    );
    expect(fingerprint()).not.toBe(before);
  });

  it('ignores node_modules, dist, and dotfile churn', () => {
    const before = fingerprint();

    fs.mkdirSync(path.join(projectDir, 'node_modules/pkg'), { recursive: true });
    fs.writeFileSync(path.join(projectDir, 'node_modules/pkg/index.ts'), 'export const x = 1;\n');
    fs.mkdirSync(path.join(projectDir, 'dist'), { recursive: true });
    fs.writeFileSync(path.join(projectDir, 'dist/bundle.js'), 'console.log(1);\n');
    fs.mkdirSync(path.join(projectDir, '.cache'), { recursive: true });
    fs.writeFileSync(path.join(projectDir, '.cache/tmp.ts'), 'export const y = 1;\n');

    expect(fingerprint()).toBe(before);
  });

  it('ignores non-scannable file types', () => {
    const before = fingerprint();
    fs.writeFileSync(path.join(projectDir, 'src/notes.md'), '# notes\n');
    expect(fingerprint()).toBe(before);
  });

  it('changes when scan depth or target category changes', () => {
    const base = fingerprint();
    expect(computeProjectFingerprint(projectDir, { ...inputs, depth: 5 })).not.toBe(base);
    expect(computeProjectFingerprint(projectDir, { ...inputs, category: 'decisions' })).not.toBe(base);
  });

  it('respects the depth bound', () => {
    // depth 1 only reads the project root, so a nested edit is invisible to it
    const shallow = { depth: 1, category: 'architecture' };
    const before = computeProjectFingerprint(projectDir, shallow);
    fs.writeFileSync(path.join(projectDir, 'src/deep.ts'), 'export const d = 1;\n');
    expect(computeProjectFingerprint(projectDir, shallow)).toBe(before);
    // ...but the default depth does see it
    expect(fingerprint()).not.toBe(computeProjectFingerprint(projectDir, shallow));
  });

  describe('reconciled fingerprint store', () => {
    const storeDir = path.join(tempRoot, 'cache');
    const originalCacheDir = process.env.NEURON_CACHE_DIR;

    beforeEach(() => {
      process.env.NEURON_CACHE_DIR = storeDir;
      fs.rmSync(storeDir, { recursive: true, force: true });
    });

    afterAll(() => {
      if (originalCacheDir === undefined) {
        delete process.env.NEURON_CACHE_DIR;
      } else {
        process.env.NEURON_CACHE_DIR = originalCacheDir;
      }
    });

    it('returns undefined before anything is recorded', () => {
      expect(readReconciledFingerprint(projectDir)).toBeUndefined();
    });

    it('round-trips a recorded fingerprint', () => {
      writeReconciledFingerprint(projectDir, 'abc123');
      expect(readReconciledFingerprint(projectDir)).toBe('abc123');
    });

    it('keys per project so unrelated projects do not share state', () => {
      const other = path.join(tempRoot, 'other-project');
      writeReconciledFingerprint(projectDir, 'abc123');
      expect(readReconciledFingerprint(other)).toBeUndefined();
    });

    it('clears a recorded fingerprint, forcing a re-scan', () => {
      writeReconciledFingerprint(projectDir, 'abc123');
      clearReconciledFingerprint(projectDir);
      expect(readReconciledFingerprint(projectDir)).toBeUndefined();
    });

    it('prunes entries for projects that no longer exist', () => {
      const gone = path.join(tempRoot, 'deleted-project');
      fs.mkdirSync(gone, { recursive: true });
      writeReconciledFingerprint(gone, 'stale');
      expect(readReconciledFingerprint(gone)).toBe('stale');

      fs.rmSync(gone, { recursive: true, force: true });
      // Any subsequent write compacts the store.
      writeReconciledFingerprint(projectDir, 'fresh');

      expect(readReconciledFingerprint(gone)).toBeUndefined();
      expect(readReconciledFingerprint(projectDir)).toBe('fresh');
    });

    it('treats a corrupt store as empty rather than throwing', () => {
      fs.mkdirSync(storeDir, { recursive: true });
      fs.writeFileSync(path.join(storeDir, 'drift-fingerprints.json'), '{not json');
      expect(() => readReconciledFingerprint(projectDir)).not.toThrow();
      expect(readReconciledFingerprint(projectDir)).toBeUndefined();
    });
  });
});
