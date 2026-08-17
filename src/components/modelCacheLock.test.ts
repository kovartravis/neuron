import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { withModelCacheLock } from './modelCacheLock.js';

describe('withModelCacheLock', () => {
  it('serializes two concurrent callers so their bodies never overlap', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'neuron-model-lock-'));
    const targetPath = path.join(tempDir, 'model.onnx');

    let active = 0;
    let maxActive = 0;
    const run = async (label: string) => {
      return withModelCacheLock(targetPath, async () => {
        active++;
        maxActive = Math.max(maxActive, active);
        await new Promise(resolve => setTimeout(resolve, 30));
        active--;
        return label;
      });
    };

    const [a, b] = await Promise.all([run('first'), run('second')]);

    expect(new Set([a, b])).toEqual(new Set(['first', 'second']));
    expect(maxActive).toBe(1);
    expect(fs.existsSync(`${targetPath}.lock`)).toBe(false);

    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('releases the lock even when the wrapped function throws', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'neuron-model-lock-'));
    const targetPath = path.join(tempDir, 'model.onnx');

    await expect(
      withModelCacheLock(targetPath, async () => {
        throw new Error('download failed');
      })
    ).rejects.toThrow('download failed');

    expect(fs.existsSync(`${targetPath}.lock`)).toBe(false);

    // A fresh caller can still acquire the lock right after.
    const result = await withModelCacheLock(targetPath, async () => 'ok');
    expect(result).toBe('ok');

    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('steals a stale lock left behind by a crashed process rather than waiting out maxWaitMs', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'neuron-model-lock-'));
    const targetPath = path.join(tempDir, 'model.onnx');
    const lockPath = `${targetPath}.lock`;

    fs.mkdirSync(lockPath);
    // Back-date the lock dir's mtime past the lock's own staleAfterMs so
    // this looks like it was abandoned by a crashed process, not a live one.
    const old = new Date(Date.now() - 200_000);
    fs.utimesSync(lockPath, old, old);

    const result = await withModelCacheLock(targetPath, async () => 'recovered');
    expect(result).toBe('recovered');

    fs.rmSync(tempDir, { recursive: true, force: true });
  });
});
