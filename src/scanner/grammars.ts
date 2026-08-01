import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import envPaths from 'env-paths';

/**
 * Tree-Sitter grammar acquisition.
 *
 * Compiled `.wasm` grammars are fetched at `neuron init` and cached on disk
 * rather than bundled in the npm tarball. Eight grammars weigh ~8.5 MB against
 * a 621 KB package, and the ONNX models already establish the fetch-at-init
 * pattern, so grammars follow it. See docs/adr/0008.
 *
 * Artifacts come from the official `tree-sitter-<lang>` packages on the npm
 * registry, which ship both a prebuilt `.wasm` and a `queries/tags.scm`.
 */

/** Bumped when the cache layout or the pinned versions below change. */
export const GRAMMAR_MANIFEST_VERSION = 1;

export interface GrammarSpec {
  /** Language id as produced by `resolveLanguage`. */
  language: string;
  /** npm package carrying the prebuilt artifact. */
  pkg: string;
  /** Pinned version. Grammars are pinned, not ranged: a grammar changing shape underneath a released neuron would silently move every blueprint card. */
  version: string;
  /** Path to the `.wasm` inside the package tarball, minus the leading `package/`. */
  wasmFile: string;
  /** Path to the tags query inside the tarball, if the package ships one. */
  queryFile?: string;
}

/**
 * The languages 2.2.0 parses from a real syntax tree. Every other extension in
 * SUPPORTED_SOURCE_EXTENSIONS stays on the regex scanner at labelled fidelity.
 */
export const GRAMMAR_SPECS: Record<string, GrammarSpec> = {
  typescript: {
    language: 'typescript',
    pkg: 'tree-sitter-typescript',
    version: '0.23.2',
    wasmFile: 'tree-sitter-typescript.wasm',
    queryFile: 'queries/tags.scm',
  },
  tsx: {
    language: 'tsx',
    pkg: 'tree-sitter-typescript',
    version: '0.23.2',
    wasmFile: 'tree-sitter-tsx.wasm',
    queryFile: 'queries/tags.scm',
  },
  javascript: {
    language: 'javascript',
    pkg: 'tree-sitter-javascript',
    version: '0.25.0',
    wasmFile: 'tree-sitter-javascript.wasm',
    queryFile: 'queries/tags.scm',
  },
  python: {
    language: 'python',
    pkg: 'tree-sitter-python',
    version: '0.25.0',
    wasmFile: 'tree-sitter-python.wasm',
    queryFile: 'queries/tags.scm',
  },
  go: {
    language: 'go',
    pkg: 'tree-sitter-go',
    version: '0.25.0',
    wasmFile: 'tree-sitter-go.wasm',
    queryFile: 'queries/tags.scm',
  },
  rust: {
    language: 'rust',
    pkg: 'tree-sitter-rust',
    version: '0.24.0',
    wasmFile: 'tree-sitter-rust.wasm',
    queryFile: 'queries/tags.scm',
  },
  java: {
    language: 'java',
    pkg: 'tree-sitter-java',
    version: '0.23.5',
    wasmFile: 'tree-sitter-java.wasm',
    queryFile: 'queries/tags.scm',
  },
  cpp: {
    language: 'cpp',
    pkg: 'tree-sitter-cpp',
    version: '0.23.4',
    wasmFile: 'tree-sitter-cpp.wasm',
    queryFile: 'queries/tags.scm',
  },
};

/** Languages with a grammar available. Everything else degrades to regex. */
export const AST_LANGUAGES = Object.keys(GRAMMAR_SPECS);

/**
 * Where grammars live on disk.
 *
 * `NEURON_GRAMMAR_DIR` overrides the default so a CI job can point the cache at
 * a restorable path, and so tests get real isolation — resolving through
 * `env-paths` reads the home directory once per process, which is not something
 * a test can vary between cases.
 */
export function grammarCacheDir(): string {
  const override = process.env.NEURON_GRAMMAR_DIR;
  if (override && override.trim()) return override.trim();
  const appPaths = envPaths('neuron', { suffix: '' });
  return path.join(appPaths.data, 'grammars');
}

export function grammarPaths(language: string): { wasm: string; tags: string } {
  const dir = grammarCacheDir();
  return {
    wasm: path.join(dir, `${language}.wasm`),
    tags: path.join(dir, `${language}.tags.scm`),
  };
}

interface CacheManifest {
  manifestVersion: number;
  grammars: Record<string, { pkg: string; version: string; bytes: number }>;
}

function manifestPath(): string {
  return path.join(grammarCacheDir(), 'manifest.json');
}

function readManifest(): CacheManifest {
  try {
    const raw = fs.readFileSync(manifestPath(), 'utf8');
    const parsed = JSON.parse(raw) as CacheManifest;
    if (parsed.manifestVersion === GRAMMAR_MANIFEST_VERSION && parsed.grammars) {
      return parsed;
    }
  } catch {
    // Missing, unreadable or stale manifest — treat the cache as empty rather
    // than trusting `.wasm` files we cannot attribute to a known version.
  }
  return { manifestVersion: GRAMMAR_MANIFEST_VERSION, grammars: {} };
}

function writeManifest(manifest: CacheManifest): void {
  fs.mkdirSync(grammarCacheDir(), { recursive: true });
  fs.writeFileSync(manifestPath(), JSON.stringify(manifest, null, 2), 'utf8');
}

/**
 * A grammar counts as cached only when the manifest attributes the file on disk
 * to the pinned version. A `.wasm` of unknown provenance is not usable: an ABI
 * or grammar-shape mismatch would move symbol extraction silently.
 */
export function isGrammarCached(language: string): boolean {
  const spec = GRAMMAR_SPECS[language];
  if (!spec) return false;
  const entry = readManifest().grammars[language];
  if (!entry || entry.version !== spec.version || entry.pkg !== spec.pkg) return false;
  return fs.existsSync(grammarPaths(language).wasm);
}

export function cachedLanguages(): string[] {
  return AST_LANGUAGES.filter(isGrammarCached);
}

function registryBase(): string {
  const configured = process.env.npm_config_registry || process.env.NPM_CONFIG_REGISTRY;
  const base = (configured || 'https://registry.npmjs.org').trim();
  return base.endsWith('/') ? base.slice(0, -1) : base;
}

function tarballUrl(spec: GrammarSpec): string {
  // Scoped names would need the @scope/name%2f form; no grammar package is
  // scoped today, and an unscoped assumption that breaks loudly beats a
  // half-correct URL builder.
  return `${registryBase()}/${spec.pkg}/-/${spec.pkg}-${spec.version}.tgz`;
}

/**
 * Minimal tar reader: enough to pull two known files out of an npm tarball.
 * Avoids taking on a tar dependency to extract ~2 files per grammar.
 */
function extractFromTar(tar: Buffer, wanted: Set<string>): Map<string, Buffer> {
  const found = new Map<string, Buffer>();
  let offset = 0;

  while (offset + 512 <= tar.length) {
    const header = tar.subarray(offset, offset + 512);
    // Two consecutive zero blocks mark the end of the archive.
    if (header.every(b => b === 0)) break;

    const rawName = header.subarray(0, 100).toString('utf8').replace(/\0.*$/, '');
    const prefix = header.subarray(345, 500).toString('utf8').replace(/\0.*$/, '');
    const name = prefix ? `${prefix}/${rawName}` : rawName;

    const sizeField = header.subarray(124, 136).toString('utf8').replace(/\0.*$/, '').trim();
    const size = parseInt(sizeField, 8) || 0;
    const typeFlag = String.fromCharCode(header[156]);

    offset += 512;

    if (typeFlag === '0' || typeFlag === '\0') {
      // npm tarballs root everything under `package/`.
      const relative = name.replace(/^package\//, '');
      if (wanted.has(relative)) {
        found.set(relative, Buffer.from(tar.subarray(offset, offset + size)));
      }
    }

    offset += Math.ceil(size / 512) * 512;
  }

  return found;
}

export interface GrammarFetchOutcome {
  language: string;
  status: 'cached' | 'fetched' | 'failed';
  bytes?: number;
  error?: string;
}

export interface EnsureGrammarsOptions {
  languages?: string[];
  force?: boolean;
  onProgress?: (p: { phase: string; percent?: number }) => void;
  fetchImpl?: typeof fetch;
}

/**
 * Fetch any missing grammars into the cache.
 *
 * Never throws for a network or artifact problem: a grammar that cannot be
 * fetched leaves that language on the regex scanner, which is a degraded scan
 * rather than a broken install. `neuron init` must not fail because a registry
 * was unreachable — matching how model pre-download errors are already absorbed.
 */
export async function ensureGrammars(
  options: EnsureGrammarsOptions = {}
): Promise<GrammarFetchOutcome[]> {
  const languages = options.languages ?? AST_LANGUAGES;
  const doFetch = options.fetchImpl ?? fetch;
  const outcomes: GrammarFetchOutcome[] = [];
  const manifest = readManifest();

  fs.mkdirSync(grammarCacheDir(), { recursive: true });

  // One package can carry several grammars (typescript ships typescript+tsx),
  // so download each tarball once and satisfy every language it covers.
  const byPackage = new Map<string, string[]>();
  for (const language of languages) {
    const spec = GRAMMAR_SPECS[language];
    if (!spec) {
      outcomes.push({ language, status: 'failed', error: 'no grammar spec' });
      continue;
    }
    if (!options.force && isGrammarCached(language)) {
      outcomes.push({ language, status: 'cached' });
      continue;
    }
    const key = `${spec.pkg}@${spec.version}`;
    byPackage.set(key, [...(byPackage.get(key) ?? []), language]);
  }

  let done = 0;
  for (const [key, langs] of byPackage) {
    const spec = GRAMMAR_SPECS[langs[0]];
    options.onProgress?.({
      phase: `Fetching grammar ${key}`,
      percent: Math.round((done / byPackage.size) * 100),
    });

    try {
      const response = await doFetch(tarballUrl(spec));
      if (!response.ok) {
        throw new Error(`registry responded ${response.status}`);
      }
      const gz = Buffer.from(await response.arrayBuffer());
      const tar = zlib.gunzipSync(gz);

      const wanted = new Set<string>();
      for (const language of langs) {
        wanted.add(GRAMMAR_SPECS[language].wasmFile);
        const q = GRAMMAR_SPECS[language].queryFile;
        if (q) wanted.add(q);
      }
      const files = extractFromTar(tar, wanted);

      for (const language of langs) {
        const langSpec = GRAMMAR_SPECS[language];
        const wasm = files.get(langSpec.wasmFile);
        if (!wasm || wasm.length === 0) {
          outcomes.push({
            language,
            status: 'failed',
            error: `${langSpec.wasmFile} missing from ${key}`,
          });
          continue;
        }
        const paths = grammarPaths(language);
        fs.writeFileSync(paths.wasm, wasm);

        const tags = langSpec.queryFile ? files.get(langSpec.queryFile) : undefined;
        if (tags) fs.writeFileSync(paths.tags, tags);

        manifest.grammars[language] = {
          pkg: langSpec.pkg,
          version: langSpec.version,
          bytes: wasm.length,
        };
        outcomes.push({ language, status: 'fetched', bytes: wasm.length });
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      for (const language of langs) {
        outcomes.push({ language, status: 'failed', error: message });
      }
    }

    done += 1;
  }

  writeManifest(manifest);
  return outcomes;
}

/**
 * Loads cached grammars into web-tree-sitter.
 *
 * `load` returns null rather than throwing when a grammar is unavailable — the
 * caller degrades that file to the regex scanner and labels the fidelity, which
 * is ticket 03's concern. Distinguishing "no grammar" from "broken grammar" is
 * deliberate: the first is expected, the second is a bug worth surfacing.
 */
export class GrammarLoader {
  private initialized = false;
  private loaded = new Map<string, unknown>();
  private failed = new Map<string, string>();

  async init(): Promise<boolean> {
    if (this.initialized) return true;
    try {
      const { Parser } = await import('web-tree-sitter');
      await Parser.init();
      this.initialized = true;
      return true;
    } catch (e) {
      this.failed.set('__runtime__', e instanceof Error ? e.message : String(e));
      return false;
    }
  }

  /** Whether a grammar is on disk and attributable to the pinned version. */
  isAvailable(language: string): boolean {
    return isGrammarCached(language);
  }

  async load(language: string): Promise<unknown | null> {
    if (this.loaded.has(language)) return this.loaded.get(language);
    if (this.failed.has(language)) return null;
    if (!GRAMMAR_SPECS[language] || !isGrammarCached(language)) return null;
    if (!(await this.init())) return null;

    try {
      const { Language } = await import('web-tree-sitter');
      const lang = await Language.load(grammarPaths(language).wasm);
      this.loaded.set(language, lang);
      return lang;
    } catch (e) {
      this.failed.set(language, e instanceof Error ? e.message : String(e));
      return null;
    }
  }

  /** The tags query shipped alongside the grammar, if any. Consumed by ticket 02. */
  readTagsQuery(language: string): string | null {
    try {
      return fs.readFileSync(grammarPaths(language).tags, 'utf8');
    } catch {
      return null;
    }
  }

  loadError(language: string): string | undefined {
    return this.failed.get(language);
  }

  availableLanguages(): string[] {
    return cachedLanguages();
  }
}
