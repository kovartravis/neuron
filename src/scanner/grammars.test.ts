import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import zlib from 'node:zlib';

let tmpHome: string;

// NEURON_GRAMMAR_DIR is read per call, so each test gets a genuinely isolated
// cache. Overriding HOME would not work: env-paths resolves the home directory
// once per process, and vi.resetModules() does not reset externalized deps.
async function loadModule() {
  return await import('./grammars.js');
}

/** Build an npm-shaped tarball containing the given `package/`-relative files. */
function makeTarball(files: Record<string, Buffer>): Buffer {
  const blocks: Buffer[] = [];
  for (const [name, content] of Object.entries(files)) {
    const header = Buffer.alloc(512);
    header.write(`package/${name}`, 0, 100, 'utf8');
    header.write('0000644\0', 100, 8, 'utf8');
    header.write(content.length.toString(8).padStart(11, '0') + '\0', 124, 12, 'utf8');
    header.write('0', 156, 1, 'utf8');
    // Checksum: spaces during computation, then the octal sum.
    header.write('        ', 148, 8, 'utf8');
    let sum = 0;
    for (const b of header) sum += b;
    header.write(sum.toString(8).padStart(6, '0') + '\0 ', 148, 8, 'utf8');

    blocks.push(header);
    const padded = Buffer.alloc(Math.ceil(content.length / 512) * 512);
    content.copy(padded);
    blocks.push(padded);
  }
  blocks.push(Buffer.alloc(1024)); // end-of-archive
  return zlib.gzipSync(Buffer.concat(blocks));
}

function okResponse(body: Buffer) {
  return { ok: true, status: 200, arrayBuffer: async () => body } as unknown as Response;
}

describe('grammar acquisition', () => {
  beforeEach(() => {
    tmpHome = fs.mkdtempSync(path.join(os.tmpdir(), 'neuron-grammars-'));
    process.env.NEURON_GRAMMAR_DIR = tmpHome;
    delete process.env.npm_config_registry;
  });

  afterEach(() => {
    fs.rmSync(tmpHome, { recursive: true, force: true });
    delete process.env.NEURON_GRAMMAR_DIR;
    vi.restoreAllMocks();
  });

  it('fetches a grammar and caches the wasm plus its tags query', async () => {
    const { ensureGrammars, isGrammarCached, grammarPaths } = await loadModule();
    const wasm = Buffer.from('\0asm-python-fake');
    const tags = Buffer.from('(function_definition) @definition.function');
    const tarball = makeTarball({
      'tree-sitter-python.wasm': wasm,
      'queries/tags.scm': tags,
    });

    const outcomes = await ensureGrammars({
      languages: ['python'],
      fetchImpl: (async () => okResponse(tarball)) as unknown as typeof fetch,
    });

    expect(outcomes).toEqual([{ language: 'python', status: 'fetched', bytes: wasm.length }]);
    expect(isGrammarCached('python')).toBe(true);
    expect(fs.readFileSync(grammarPaths('python').wasm)).toEqual(wasm);
    expect(fs.readFileSync(grammarPaths('python').tags, 'utf8')).toContain('@definition.function');
  });

  it('reports a cache hit without re-downloading', async () => {
    const { ensureGrammars } = await loadModule();
    const tarball = makeTarball({
      'tree-sitter-python.wasm': Buffer.from('\0asm-python-fake'),
      'queries/tags.scm': Buffer.from('()'),
    });
    const fetchImpl = vi.fn(async () => okResponse(tarball));

    await ensureGrammars({ languages: ['python'], fetchImpl: fetchImpl as unknown as typeof fetch });
    const second = await ensureGrammars({
      languages: ['python'],
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    expect(second).toEqual([{ language: 'python', status: 'cached' }]);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('satisfies several grammars from one package download', async () => {
    const { ensureGrammars, isGrammarCached } = await loadModule();
    const tarball = makeTarball({
      'tree-sitter-typescript.wasm': Buffer.from('\0asm-ts'),
      'tree-sitter-tsx.wasm': Buffer.from('\0asm-tsx'),
      'queries/tags.scm': Buffer.from('()'),
    });
    const fetchImpl = vi.fn(async () => okResponse(tarball));

    const outcomes = await ensureGrammars({
      languages: ['typescript', 'tsx'],
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    expect(outcomes.every(o => o.status === 'fetched')).toBe(true);
    expect(isGrammarCached('typescript')).toBe(true);
    expect(isGrammarCached('tsx')).toBe(true);
    // tree-sitter-typescript carries both grammars; downloading it twice would
    // double init's network cost for no gain.
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('degrades rather than throwing when the registry is unreachable', async () => {
    const { ensureGrammars, isGrammarCached } = await loadModule();

    const outcomes = await ensureGrammars({
      languages: ['go'],
      fetchImpl: (async () => {
        throw new Error('getaddrinfo ENOTFOUND registry.npmjs.org');
      }) as unknown as typeof fetch,
    });

    expect(outcomes[0].status).toBe('failed');
    expect(outcomes[0].error).toContain('ENOTFOUND');
    expect(isGrammarCached('go')).toBe(false);
  });

  it('degrades on a non-200 registry response', async () => {
    const { ensureGrammars } = await loadModule();
    const outcomes = await ensureGrammars({
      languages: ['go'],
      fetchImpl: (async () => ({ ok: false, status: 404 })) as unknown as typeof fetch,
    });
    expect(outcomes[0].status).toBe('failed');
    expect(outcomes[0].error).toContain('404');
  });

  it('degrades on a corrupt tarball instead of caching garbage', async () => {
    const { ensureGrammars, isGrammarCached } = await loadModule();

    const outcomes = await ensureGrammars({
      languages: ['rust'],
      fetchImpl: (async () =>
        okResponse(Buffer.from('this is not gzip'))) as unknown as typeof fetch,
    });

    expect(outcomes[0].status).toBe('failed');
    expect(isGrammarCached('rust')).toBe(false);
  });

  it('fails the language when the tarball lacks the expected wasm', async () => {
    const { ensureGrammars, isGrammarCached } = await loadModule();
    const tarball = makeTarball({ 'README.md': Buffer.from('no wasm here') });

    const outcomes = await ensureGrammars({
      languages: ['java'],
      fetchImpl: (async () => okResponse(tarball)) as unknown as typeof fetch,
    });

    expect(outcomes[0].status).toBe('failed');
    expect(outcomes[0].error).toContain('missing');
    expect(isGrammarCached('java')).toBe(false);
  });

  it('treats a version bump as a cache miss', async () => {
    const mod = await loadModule();
    const tarball = makeTarball({
      'tree-sitter-go.wasm': Buffer.from('\0asm-go'),
      'queries/tags.scm': Buffer.from('()'),
    });
    await mod.ensureGrammars({
      languages: ['go'],
      fetchImpl: (async () => okResponse(tarball)) as unknown as typeof fetch,
    });
    expect(mod.isGrammarCached('go')).toBe(true);

    // Simulate the pinned version moving under an existing cache.
    const manifestFile = path.join(mod.grammarCacheDir(), 'manifest.json');
    const manifest = JSON.parse(fs.readFileSync(manifestFile, 'utf8'));
    manifest.grammars.go.version = '0.0.1-stale';
    fs.writeFileSync(manifestFile, JSON.stringify(manifest));

    expect(mod.isGrammarCached('go')).toBe(false);
  });

  it('ignores a wasm file it cannot attribute to a pinned version', async () => {
    const mod = await loadModule();
    // A stray .wasm with no manifest entry must not count as cached: we cannot
    // know its ABI or grammar shape, and a silent mismatch moves every symbol.
    fs.mkdirSync(mod.grammarCacheDir(), { recursive: true });
    fs.writeFileSync(mod.grammarPaths('cpp').wasm, Buffer.from('\0asm-mystery'));

    expect(mod.isGrammarCached('cpp')).toBe(false);
  });

  it('honours a configured npm registry mirror', async () => {
    process.env.npm_config_registry = 'https://npm.internal.example.com/';
    const { ensureGrammars } = await loadModule();
    const seen: string[] = [];

    await ensureGrammars({
      languages: ['go'],
      fetchImpl: (async (url: string) => {
        seen.push(String(url));
        throw new Error('stop');
      }) as unknown as typeof fetch,
    });

    expect(seen[0]).toBe(
      'https://npm.internal.example.com/tree-sitter-go/-/tree-sitter-go-0.25.0.tgz'
    );
  });
});

describe('GrammarLoader', () => {
  beforeEach(() => {
    tmpHome = fs.mkdtempSync(path.join(os.tmpdir(), 'neuron-loader-'));
    process.env.NEURON_GRAMMAR_DIR = tmpHome;
  });

  afterEach(() => {
    fs.rmSync(tmpHome, { recursive: true, force: true });
    delete process.env.NEURON_GRAMMAR_DIR;
  });

  it('returns null for an uncached language rather than throwing', async () => {
    const { GrammarLoader } = await loadModule();
    const loader = new GrammarLoader();
    await expect(loader.load('python')).resolves.toBeNull();
    expect(loader.isAvailable('python')).toBe(false);
  });

  it('returns null for a language with no grammar spec at all', async () => {
    const { GrammarLoader } = await loadModule();
    const loader = new GrammarLoader();
    // Ruby is in SUPPORTED_SOURCE_EXTENSIONS but has no 2.2.0 grammar.
    await expect(loader.load('ruby')).resolves.toBeNull();
  });

  it('reports available languages from the cache', async () => {
    const mod = await loadModule();
    const tarball = makeTarball({
      'tree-sitter-go.wasm': Buffer.from('\0asm-go'),
      'queries/tags.scm': Buffer.from('()'),
    });
    await mod.ensureGrammars({
      languages: ['go'],
      fetchImpl: (async () => okResponse(tarball)) as unknown as typeof fetch,
    });

    expect(new mod.GrammarLoader().availableLanguages()).toEqual(['go']);
  });

  it('exposes the cached tags query for the extraction layer', async () => {
    const mod = await loadModule();
    const tarball = makeTarball({
      'tree-sitter-go.wasm': Buffer.from('\0asm-go'),
      'queries/tags.scm': Buffer.from('(function_declaration) @definition.function'),
    });
    await mod.ensureGrammars({
      languages: ['go'],
      fetchImpl: (async () => okResponse(tarball)) as unknown as typeof fetch,
    });

    const loader = new mod.GrammarLoader();
    expect(loader.readTagsQuery('go')).toContain('@definition.function');
    expect(loader.readTagsQuery('python')).toBeNull();
  });
});
