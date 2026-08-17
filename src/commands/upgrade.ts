import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { getRunningVersion } from '../components/version.js';

// Same GitHub repo, same asset-naming convention as install.sh / install.ps1
// (ticket 6 / ticket 7) and scripts/build-binary.mjs (ticket 5) — kept as a
// separate constant here rather than shared with the shell scripts, since
// there's no code-sharing mechanism between sh/PowerShell and TypeScript.
const REPO = 'kovartravis/neuron';

export type AssetOs = 'macos' | 'linux' | 'windows';
export interface AssetTarget {
  os: AssetOs;
  arch: 'x64' | 'arm64';
}

/** Mirrors install.sh's `uname`-based case statements, using Node's own process.platform/arch instead. */
export function resolveAssetTarget(platform: NodeJS.Platform, arch: string): AssetTarget {
  const os: AssetOs | null = platform === 'darwin' ? 'macos' : platform === 'linux' ? 'linux' : platform === 'win32' ? 'windows' : null;
  if (!os) {
    throw new Error(`unsupported platform '${platform}' — neuron upgrade only supports macOS, Linux, and Windows binaries.`);
  }
  if (arch !== 'x64' && arch !== 'arm64') {
    throw new Error(`unsupported architecture '${arch}' — neuron ships x64 and arm64 binaries only.`);
  }
  return { os, arch };
}

/** Matches scripts/build-binary.mjs's outputName: `neuron-<os>-<arch>`, `.exe` only on Windows. */
export function assetName(target: AssetTarget): string {
  return `neuron-${target.os}-${target.arch}${target.os === 'windows' ? '.exe' : ''}`;
}

/** Plain MAJOR.MINOR.PATCH comparison — every real GitHub Release this repo cuts is a bare X.Y.Z tag (publish.yml only builds binaries for the `latest` dist-tag, never an `-rcN` prerelease). Returns >0 if `a` is newer than `b`. */
export function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map(n => parseInt(n, 10) || 0);
  const pb = b.split('.').map(n => parseInt(n, 10) || 0);
  for (let i = 0; i < 3; i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

export function sha256File(filePath: string): string {
  return createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

/**
 * Swaps `currentPath`'s content for `newPath`'s, leaving the old binary
 * fully intact and working if anything goes wrong mid-swap (ticket 8's own
 * requirement: never a half-replaced broken state).
 *
 * Both renames are same-directory (the caller stages `newPath` inside
 * `currentPath`'s own directory — see runUpgrade below) so each is a single
 * atomic filesystem rename, never a cross-device copy that could be caught
 * half-written. On Windows this relies on a real, non-obvious platform fact:
 * the OS opens a running executable's image with FILE_SHARE_DELETE, so
 * renaming (though not deleting-while-open) the currently-executing file out
 * of the way is allowed — the same trick Chrome/electron-updater and other
 * self-updating Windows binaries rely on.
 */
export function atomicReplace(currentPath: string, newPath: string): void {
  const backupPath = `${currentPath}.old`;
  // Best-effort cleanup of a stray backup left by a previous interrupted
  // upgrade (e.g. Windows held it locked while that process was still
  // running) — ignored if it doesn't exist or still can't be removed.
  try { fs.rmSync(backupPath, { force: true }); } catch { /* ignore */ }

  fs.renameSync(currentPath, backupPath);
  try {
    fs.renameSync(newPath, currentPath);
  } catch (err) {
    // Roll back immediately: the backup is still the last known-good binary.
    fs.renameSync(backupPath, currentPath);
    throw err;
  }
  try { fs.rmSync(backupPath, { force: true }); } catch { /* Windows may still hold it open; next upgrade cleans it up */ }
}

async function fetchJson(url: string): Promise<any> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`GitHub API returned ${res.status} ${res.statusText} for ${url}`);
  }
  return res.json();
}

async function downloadTo(url: string, destPath: string): Promise<void> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`failed to download ${url} (HTTP ${res.status})`);
  }
  fs.writeFileSync(destPath, Buffer.from(await res.arrayBuffer()));
}

export interface UpgradeOptions {
  /** Override for tests; defaults to the real running binary's version. */
  currentVersion?: string;
  platform?: NodeJS.Platform;
  arch?: string;
  /** The file to replace; defaults to the real running executable. */
  execPath?: string;
  /** Defaults to `typeof process.pkg !== 'undefined'` — only the pkg-packaged binary can self-replace. */
  isPkg?: boolean;
  /** Defaults to the real GitHub API; overridable so tests can point at a local mock release server. */
  apiUrl?: string;
  /** Defaults to the real GitHub Releases download URL; overridable for tests. */
  releaseBaseUrl?: (tag: string) => string;
  check?: boolean;
  force?: boolean;
}

export type UpgradeResult =
  | { status: 'not-pkg' }
  | { status: 'up-to-date'; currentVersion: string; latestVersion: string }
  | { status: 'available'; currentVersion: string; latestVersion: string }
  | { status: 'upgraded'; currentVersion: string; latestVersion: string; installedPath: string };

/**
 * The actual upgrade orchestration, factored out of `handleUpgradeCommand`
 * so tests can drive it directly (structured result, no console/exit-code
 * scraping) and point `apiUrl`/`releaseBaseUrl` at a local mock server the
 * way ticket 6 verified `install.sh` against a mock release server.
 */
export async function runUpgrade(opts: UpgradeOptions = {}): Promise<UpgradeResult> {
  const isPkg = opts.isPkg ?? typeof (process as any).pkg !== 'undefined';
  if (!isPkg) {
    return { status: 'not-pkg' };
  }

  const target = resolveAssetTarget(opts.platform ?? process.platform, opts.arch ?? process.arch);
  const currentVersion = opts.currentVersion ?? getRunningVersion();

  const apiUrl = opts.apiUrl ?? `https://api.github.com/repos/${REPO}/releases/latest`;
  const release = await fetchJson(apiUrl);
  const tag: string | undefined = release?.tag_name;
  if (!tag) {
    throw new Error(`GitHub API response had no tag_name — cannot resolve the latest release from ${apiUrl}`);
  }
  const latestVersion = tag.replace(/^v/, '');

  if (!opts.force && compareVersions(latestVersion, currentVersion) <= 0) {
    return { status: 'up-to-date', currentVersion, latestVersion };
  }

  if (opts.check) {
    return { status: 'available', currentVersion, latestVersion };
  }

  const releaseBaseUrl = opts.releaseBaseUrl ?? ((t: string) => `https://github.com/${REPO}/releases/download/${t}`);
  const baseUrl = releaseBaseUrl(tag);
  const asset = assetName(target);

  const currentExePath = fs.realpathSync(opts.execPath ?? process.execPath);
  const installDir = path.dirname(currentExePath);
  // Staged in the *same directory* as the running binary (not the system
  // tmpdir) so the final atomicReplace rename is guaranteed same-filesystem
  // — a rename across filesystems (e.g. tmpfs -> the real install dir) can
  // fail with EXDEV, which would otherwise turn "atomic" into "sometimes."
  const stagedPath = path.join(installDir, `.${asset}.download`);
  const sumsTmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'neuron-upgrade-'));

  try {
    await downloadTo(`${baseUrl}/${asset}`, stagedPath);
    await downloadTo(`${baseUrl}/SHA256SUMS`, path.join(sumsTmpDir, 'SHA256SUMS'));

    const sums = fs.readFileSync(path.join(sumsTmpDir, 'SHA256SUMS'), 'utf-8');
    const line = sums.split('\n').find(l => l.trim().endsWith(asset));
    const expected = line?.trim().split(/\s+/)[0];
    if (!expected) {
      throw new Error(`no checksum entry for '${asset}' in SHA256SUMS — refusing to install an unverified binary.`);
    }
    const actual = sha256File(stagedPath);
    if (actual !== expected) {
      throw new Error(`checksum mismatch for ${asset} (expected ${expected}, got ${actual}) — refusing to install a corrupted or tampered binary.`);
    }

    if (target.os !== 'windows') {
      fs.chmodSync(stagedPath, 0o755);
    }

    atomicReplace(currentExePath, stagedPath);

    return { status: 'upgraded', currentVersion, latestVersion, installedPath: currentExePath };
  } finally {
    fs.rmSync(sumsTmpDir, { recursive: true, force: true });
    fs.rmSync(stagedPath, { force: true }); // no-op once atomicReplace has renamed it away
  }
}

export const UPGRADE_HELP = `Usage: neuron upgrade [flags]

Self-updates the standalone curl-installed binary in place: checks GitHub
Releases for a version newer than the one currently running, downloads the
matching platform/arch asset, verifies it against that release's
SHA256SUMS (same discipline as install.sh/install.ps1), and atomically
replaces the running executable. Never installs a binary that fails
verification, and never leaves the old binary in a half-replaced state --
a failed swap rolls back to the previous binary automatically.

Binary-only: an npm-installed \`neuron\` (\`npm install -g @kovartravis/neuron\`)
refuses with a pointer to \`npm install -g @kovartravis/neuron@latest\`
instead -- that install path already owns its own upgrades.

Options:
  --check     Report whether a newer version is available; don't install it
  --force     Re-download and reinstall even if already on the latest version
  -h, --help  Show this help information

Examples:
  neuron upgrade            Upgrade to the latest release, if any
  neuron upgrade --check    Just report whether a newer version exists
  neuron upgrade --force    Reinstall the current latest version (repair)`;

export async function handleUpgradeCommand(args: string[]): Promise<void> {
  if (args.includes('--help') || args.includes('-h')) {
    console.log(UPGRADE_HELP);
    return;
  }

  const check = args.includes('--check');
  const force = args.includes('--force');

  let result: UpgradeResult;
  try {
    result = await runUpgrade({ check, force });
  } catch (err: any) {
    console.error(`neuron upgrade failed: ${err.message}`);
    process.exitCode = 1;
    return;
  }

  switch (result.status) {
    case 'not-pkg':
      console.error(
        "neuron upgrade only applies to the standalone curl-installed binary. " +
        "This 'neuron' was installed via npm -- run 'npm install -g @kovartravis/neuron@latest' instead."
      );
      process.exitCode = 1;
      return;
    case 'up-to-date':
      console.log(`Already up to date (${result.currentVersion}).`);
      return;
    case 'available':
      console.log(`Current version: ${result.currentVersion}`);
      console.log(`Newer version available: ${result.latestVersion}`);
      console.log(`Run 'neuron upgrade' to install it.`);
      return;
    case 'upgraded':
      console.log(`Upgraded neuron ${result.currentVersion} -> ${result.latestVersion} (${result.installedPath}).`);
      return;
  }
}
