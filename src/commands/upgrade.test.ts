import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createServer, type Server } from 'node:http';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, readdirSync, rmSync, existsSync, realpathSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { createHash } from 'node:crypto';
import path from 'node:path';
import {
  resolveAssetTarget,
  assetName,
  compareVersions,
  sha256File,
  atomicReplace,
  runUpgrade,
  handleUpgradeCommand,
  UPGRADE_HELP,
} from './upgrade.js';

describe('resolveAssetTarget', () => {
  it('maps supported platform/arch combinations', () => {
    expect(resolveAssetTarget('darwin', 'arm64')).toEqual({ os: 'macos', arch: 'arm64' });
    expect(resolveAssetTarget('linux', 'x64')).toEqual({ os: 'linux', arch: 'x64' });
    expect(resolveAssetTarget('win32', 'x64')).toEqual({ os: 'windows', arch: 'x64' });
  });

  it('rejects an unsupported platform', () => {
    expect(() => resolveAssetTarget('freebsd' as any, 'x64')).toThrow(/unsupported platform/);
  });

  it('rejects an unsupported architecture', () => {
    expect(() => resolveAssetTarget('linux', 'ia32')).toThrow(/unsupported architecture/);
  });
});

describe('assetName', () => {
  it('appends .exe only for windows', () => {
    expect(assetName({ os: 'linux', arch: 'x64' })).toBe('neuron-linux-x64');
    expect(assetName({ os: 'windows', arch: 'arm64' })).toBe('neuron-windows-arm64.exe');
  });
});

describe('compareVersions', () => {
  it('orders by major, then minor, then patch', () => {
    expect(compareVersions('2.4.3', '2.4.2')).toBeGreaterThan(0);
    expect(compareVersions('2.4.2', '2.4.3')).toBeLessThan(0);
    expect(compareVersions('2.4.3', '2.4.3')).toBe(0);
    expect(compareVersions('3.0.0', '2.9.9')).toBeGreaterThan(0);
  });
});

describe('sha256File', () => {
  let root: string;
  beforeEach(() => { root = mkdtempSync(path.join(tmpdir(), 'neuron-upgrade-sha-')); });
  afterEach(() => { rmSync(root, { recursive: true, force: true }); });

  it('matches node:crypto computed over the same bytes', () => {
    const filePath = path.join(root, 'file.bin');
    const content = Buffer.from('some binary content');
    writeFileSync(filePath, content);
    expect(sha256File(filePath)).toBe(createHash('sha256').update(content).digest('hex'));
  });
});

describe('atomicReplace', () => {
  let root: string;
  beforeEach(() => { root = mkdtempSync(path.join(tmpdir(), 'neuron-upgrade-replace-')); });
  afterEach(() => { rmSync(root, { recursive: true, force: true }); });

  it('swaps content and leaves no stray backup on success', () => {
    const current = path.join(root, 'neuron');
    const next = path.join(root, '.neuron.download');
    writeFileSync(current, 'OLD');
    writeFileSync(next, 'NEW');

    atomicReplace(current, next);

    expect(readFileSync(current, 'utf-8')).toBe('NEW');
    expect(existsSync(next)).toBe(false);
    expect(existsSync(`${current}.old`)).toBe(false);
  });

  it('rolls back to the original binary if the second rename fails', () => {
    const current = path.join(root, 'neuron');
    writeFileSync(current, 'OLD');
    const missingNext = path.join(root, '.neuron.download'); // never created

    expect(() => atomicReplace(current, missingNext)).toThrow();
    expect(readFileSync(current, 'utf-8')).toBe('OLD');
    expect(existsSync(`${current}.old`)).toBe(false);
  });
});

/** A minimal local stand-in for the GitHub API + Releases download endpoints, in the spirit of ticket 6's own mock release server for install.sh. */
function startMockReleaseServer(opts: {
  tag: string;
  assetContent: Buffer;
  assetFileName: string;
  sumsContent?: string; // override to simulate a mismatch/missing entry
}): { server: Server; apiUrl: string; releaseBaseUrl: (tag: string) => string; downloadHits: string[] } {
  const downloadHits: string[] = [];
  const sums = opts.sumsContent ?? `${createHash('sha256').update(opts.assetContent).digest('hex')}  ${opts.assetFileName}\n`;

  const server = createServer((req, res) => {
    const url = new URL(req.url ?? '/', 'http://localhost');
    if (url.pathname === '/api/releases/latest') {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ tag_name: opts.tag }));
      return;
    }
    if (url.pathname === `/download/${opts.tag}/${opts.assetFileName}`) {
      downloadHits.push(url.pathname);
      res.writeHead(200);
      res.end(opts.assetContent);
      return;
    }
    if (url.pathname === `/download/${opts.tag}/SHA256SUMS`) {
      downloadHits.push(url.pathname);
      res.writeHead(200);
      res.end(sums);
      return;
    }
    res.writeHead(404);
    res.end('not found');
  });

  return {
    server,
    get apiUrl() {
      const port = (server.address() as any).port;
      return `http://127.0.0.1:${port}/api/releases/latest`;
    },
    releaseBaseUrl: (tag: string) => {
      const port = (server.address() as any).port;
      return `http://127.0.0.1:${port}/download/${tag}`;
    },
    downloadHits,
  } as any;
}

describe('runUpgrade', () => {
  let root: string;

  beforeEach(() => {
    root = mkdtempSync(path.join(tmpdir(), 'neuron-upgrade-e2e-'));
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it('reports not-pkg without making any network call when not running as a pkg binary', async () => {
    const result = await runUpgrade({ isPkg: false });
    expect(result).toEqual({ status: 'not-pkg' });
  });

  it('downloads, verifies, and atomically installs a newer release', async () => {
    const assetFileName = 'neuron-linux-x64';
    const assetContent = Buffer.from('brand new binary bytes');
    const mock = startMockReleaseServer({ tag: 'v9.9.9', assetContent, assetFileName });
    await new Promise<void>(resolve => mock.server.listen(0, resolve));

    const installDir = path.join(root, 'bin');
    mkdirSync(installDir, { recursive: true });
    const currentExePath = path.join(installDir, 'neuron');
    writeFileSync(currentExePath, 'old binary bytes');

    try {
      const result = await runUpgrade({
        isPkg: true,
        platform: 'linux',
        arch: 'x64',
        currentVersion: '1.0.0',
        execPath: currentExePath,
        apiUrl: mock.apiUrl,
        releaseBaseUrl: mock.releaseBaseUrl,
      });

      expect(result).toEqual({
        status: 'upgraded',
        currentVersion: '1.0.0',
        latestVersion: '9.9.9',
        installedPath: realpathSync(currentExePath),
      });
      expect(readFileSync(currentExePath, 'utf-8')).toBe('brand new binary bytes');

      // No leftover staging/backup files in the install dir.
      const leftovers = readdirSync(installDir).filter(f => f !== 'neuron');
      expect(leftovers).toEqual([]);
    } finally {
      mock.server.close();
    }
  });

  it('refuses to install on a checksum mismatch and leaves the running binary untouched', async () => {
    const assetFileName = 'neuron-linux-x64';
    const assetContent = Buffer.from('tampered or corrupted bytes');
    const mock = startMockReleaseServer({
      tag: 'v9.9.9',
      assetContent,
      assetFileName,
      sumsContent: `${'0'.repeat(64)}  ${assetFileName}\n`, // deliberately wrong hash
    });
    await new Promise<void>(resolve => mock.server.listen(0, resolve));

    const installDir = path.join(root, 'bin');
    mkdirSync(installDir, { recursive: true });
    const currentExePath = path.join(installDir, 'neuron');
    writeFileSync(currentExePath, 'old binary bytes');

    try {
      await expect(runUpgrade({
        isPkg: true,
        platform: 'linux',
        arch: 'x64',
        currentVersion: '1.0.0',
        execPath: currentExePath,
        apiUrl: mock.apiUrl,
        releaseBaseUrl: mock.releaseBaseUrl,
      })).rejects.toThrow(/checksum mismatch/);

      expect(readFileSync(currentExePath, 'utf-8')).toBe('old binary bytes');
      const leftovers = readdirSync(installDir).filter(f => f !== 'neuron');
      expect(leftovers).toEqual([]);
    } finally {
      mock.server.close();
    }
  });

  it('reports up-to-date and makes no download requests when already current', async () => {
    const assetFileName = 'neuron-linux-x64';
    const mock = startMockReleaseServer({ tag: 'v1.0.0', assetContent: Buffer.from('x'), assetFileName });
    await new Promise<void>(resolve => mock.server.listen(0, resolve));

    const installDir = path.join(root, 'bin');
    mkdirSync(installDir, { recursive: true });
    const currentExePath = path.join(installDir, 'neuron');
    writeFileSync(currentExePath, 'current binary bytes');

    try {
      const result = await runUpgrade({
        isPkg: true,
        platform: 'linux',
        arch: 'x64',
        currentVersion: '1.0.0',
        execPath: currentExePath,
        apiUrl: mock.apiUrl,
        releaseBaseUrl: mock.releaseBaseUrl,
      });

      expect(result).toEqual({ status: 'up-to-date', currentVersion: '1.0.0', latestVersion: '1.0.0' });
      expect((mock as any).downloadHits).toEqual([]);
      expect(readFileSync(currentExePath, 'utf-8')).toBe('current binary bytes');
    } finally {
      mock.server.close();
    }
  });

  it('with --check reports availability without downloading', async () => {
    const assetFileName = 'neuron-linux-x64';
    const mock = startMockReleaseServer({ tag: 'v2.0.0', assetContent: Buffer.from('x'), assetFileName });
    await new Promise<void>(resolve => mock.server.listen(0, resolve));

    const installDir = path.join(root, 'bin');
    mkdirSync(installDir, { recursive: true });
    const currentExePath = path.join(installDir, 'neuron');
    writeFileSync(currentExePath, 'current binary bytes');

    try {
      const result = await runUpgrade({
        isPkg: true,
        platform: 'linux',
        arch: 'x64',
        currentVersion: '1.0.0',
        execPath: currentExePath,
        apiUrl: mock.apiUrl,
        releaseBaseUrl: mock.releaseBaseUrl,
        check: true,
      });

      expect(result).toEqual({ status: 'available', currentVersion: '1.0.0', latestVersion: '2.0.0' });
      expect((mock as any).downloadHits).toEqual([]);
      expect(readFileSync(currentExePath, 'utf-8')).toBe('current binary bytes');
    } finally {
      mock.server.close();
    }
  });
});

describe('handleUpgradeCommand', () => {
  it('prints help and exits cleanly on --help', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    await handleUpgradeCommand(['--help']);
    expect(logSpy).toHaveBeenCalledWith(UPGRADE_HELP);
    logSpy.mockRestore();
  });

  it('refuses with a clear message and exit code 1 when not running as the pkg binary (e.g. under vitest/npm)', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const originalExitCode = process.exitCode;
    process.exitCode = undefined;

    await handleUpgradeCommand([]);

    expect(errorSpy).toHaveBeenCalledWith(expect.stringMatching(/npm install -g @kovartravis\/neuron@latest/));
    expect(process.exitCode).toBe(1);

    process.exitCode = originalExitCode;
    errorSpy.mockRestore();
  });
});
