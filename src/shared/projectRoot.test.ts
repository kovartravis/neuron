import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { findProjectRoot } from './projectRoot.js';

describe('findProjectRoot', () => {
  let tmp: string;

  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'neuron-project-root-'));
  });

  afterEach(() => {
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it('names the project after package.json name, not the directory it was cloned into', () => {
    const root = path.join(tmp, 'some-checkout-dir');
    fs.mkdirSync(path.join(root, 'src', 'deep'), { recursive: true });
    fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify({ name: 'my-app' }));

    const result = findProjectRoot(path.join(root, 'src', 'deep'));
    expect(result.root).toBe(root);
    expect(result.name).toBe('my-app');
  });

  it('strips an npm scope from the manifest name', () => {
    const root = path.join(tmp, 'workspace');
    fs.mkdirSync(root);
    fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify({ name: '@acme/widgets' }));

    expect(findProjectRoot(root).name).toBe('widgets');
  });

  it('falls back to the directory basename when package.json has no usable name', () => {
    const root = path.join(tmp, 'fallback-dir');
    fs.mkdirSync(root);
    fs.writeFileSync(path.join(root, 'package.json'), '{}');
    expect(findProjectRoot(root).name).toBe('fallback-dir');

    fs.writeFileSync(path.join(root, 'package.json'), '{ not json');
    expect(findProjectRoot(root).name).toBe('fallback-dir');
  });

  it('falls back to the directory basename for a .git-only root', () => {
    const root = path.join(tmp, 'git-only');
    fs.mkdirSync(path.join(root, '.git'), { recursive: true });
    const result = findProjectRoot(root);
    expect(result.root).toBe(root);
    expect(result.name).toBe('git-only');
  });
});
