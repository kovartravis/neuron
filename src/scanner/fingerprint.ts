import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import envPaths from 'env-paths';
import {
  SCANNABLE_FILE_PATTERN,
  ROOT_MANIFEST_FILES,
  isIgnoredEntryName,
} from './analyzer.js';

/**
 * Cheap change-detection for the implicit drift re-scan.
 *
 * `scanProjectTopology` parses every source file's AST, which is far too
 * expensive to run on every `memory query`. A stat-only walk over the same file
 * set is orders of magnitude cheaper, so we fingerprint the tree and skip the
 * scan entirely when nothing has moved since the last reconcile.
 *
 * This guard only gates the *implicit* re-scan. `neuron scan`, `--diff`, and
 * `--check` always perform a real scan, so CI and explicit checks are never
 * served a cached verdict.
 */

export interface FingerprintInputs {
  depth: number;
  category: string;
}

/**
 * Stat-only walk mirroring scanProjectTopology's traversal. Records each file's
 * relative path, mtime, and size — enough to catch content edits, additions,
 * removals, and renames without reading a single byte of file content.
 */
export function computeProjectFingerprint(
  projectRoot: string,
  inputs: FingerprintInputs
): string {
  const entries: string[] = [];

  function walk(currentDir: string, currentDepth: number): void {
    if (currentDepth > inputs.depth) return;

    let dirents: fs.Dirent[] = [];
    try {
      dirents = fs.readdirSync(currentDir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of dirents) {
      if (isIgnoredEntryName(entry.name)) continue;

      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath, currentDepth + 1);
      } else if (entry.isFile() && SCANNABLE_FILE_PATTERN.test(entry.name)) {
        entries.push(statSignature(projectRoot, fullPath));
      }
    }
  }

  walk(projectRoot, 1);

  // Root manifests drive techStack and the dependency contract but are not
  // themselves scannable source files, so stat them explicitly.
  for (const manifest of ROOT_MANIFEST_FILES) {
    const manifestPath = path.join(projectRoot, manifest);
    if (fs.existsSync(manifestPath)) {
      entries.push(statSignature(projectRoot, manifestPath));
    }
  }

  entries.sort();

  const hash = crypto.createHash('sha256');
  // Scan config participates: changing depth or target category changes what a
  // scan would produce even when no file has moved.
  hash.update(`depth=${inputs.depth}\ncategory=${inputs.category}\n`);
  hash.update(entries.join('\n'));
  return hash.digest('hex');
}

function statSignature(projectRoot: string, fullPath: string): string {
  try {
    const stat = fs.statSync(fullPath);
    const rel = path.relative(projectRoot, fullPath);
    return `${rel}:${stat.mtimeMs}:${stat.size}`;
  } catch {
    // A file that vanished mid-walk still perturbs the hash via its absence.
    return `${path.relative(projectRoot, fullPath)}:missing`;
  }
}

function fingerprintStorePath(): string {
  const override = process.env.NEURON_CACHE_DIR;
  const cacheDir = override || path.join(envPaths('neuron', { suffix: '' }).data, 'cache');
  return path.join(cacheDir, 'drift-fingerprints.json');
}

function readStore(): Record<string, string> {
  try {
    const raw = fs.readFileSync(fingerprintStorePath(), 'utf8');
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

/**
 * The fingerprint recorded the last time this project was reconciled against
 * its baseline card, or undefined if it has never been reconciled.
 */
export function readReconciledFingerprint(projectRoot: string): string | undefined {
  return readStore()[path.resolve(projectRoot)];
}

/**
 * Record that the project is reconciled with its baseline at this fingerprint.
 * Best-effort: a write failure just means the next run re-scans.
 */
export function writeReconciledFingerprint(projectRoot: string, fingerprint: string): void {
  try {
    const storePath = fingerprintStorePath();
    fs.mkdirSync(path.dirname(storePath), { recursive: true });

    const store = readStore();
    // Drop entries for projects that no longer exist, so the store does not
    // accumulate dead keys for every scratch directory ever scanned.
    for (const key of Object.keys(store)) {
      if (!fs.existsSync(key)) delete store[key];
    }

    store[path.resolve(projectRoot)] = fingerprint;
    fs.writeFileSync(storePath, JSON.stringify(store, null, 2));
  } catch {
    // Non-fatal — the guard degrades to always scanning.
  }
}

/** Drop a project's recorded fingerprint, forcing the next run to re-scan. */
export function clearReconciledFingerprint(projectRoot: string): void {
  try {
    const storePath = fingerprintStorePath();
    const store = readStore();
    delete store[path.resolve(projectRoot)];
    fs.writeFileSync(storePath, JSON.stringify(store, null, 2));
  } catch {
    // Non-fatal.
  }
}
