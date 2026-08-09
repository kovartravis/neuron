import path from 'node:path';
import fs from 'node:fs';
import { SmolLM2Summarizer } from '../components/summarizer.js';
import type { ScanProgress } from '../ui/progress.js';
import {
  SUPPORTED_SOURCE_EXTENSIONS,
  TreeSitterScanner,
  type ParserFidelity,
  type ScannedSymbol,
} from './treesitter.js';

export type { ScannedSymbol, ParserFidelity };

/**
 * Traversal rules shared by the topology scan and the drift fingerprint guard.
 * Both must agree on exactly which files feed a scan: if the guard watches a
 * narrower set than the scanner reads, edits to the difference are invisible
 * and drift is never re-checked.
 *
 * Derived from the parser's own language list so the filter can never be
 * narrower than what TreeSitterScanner can actually parse — a mismatch here
 * silently hides whole languages (previously .tsx/.jsx/.cpp) from every scan.
 */
export const SCANNABLE_FILE_PATTERN = new RegExp(
  `(${SUPPORTED_SOURCE_EXTENSIONS.map(e => e.replace('.', '\\.')).join('|')})$`,
  'i'
);

export const IGNORED_DIR_NAMES = new Set(['node_modules', 'dist']);

/** Root manifests that feed manifest.techStack / dependencies. */
export const ROOT_MANIFEST_FILES = ['package.json', 'Cargo.toml', 'go.mod', 'pyproject.toml'];

/** True for entries the scan skips outright (dotfiles, vendored, build output). */
export function isIgnoredEntryName(name: string): boolean {
  return name.startsWith('.') || IGNORED_DIR_NAMES.has(name);
}

export interface ModuleSummary {
  name: string;
  path: string;
  purpose: string;
  components: Array<{
    file: string;
    purpose: string;
    exports: string[];
    /** How this file's symbols were obtained. Consumed by ticket 03. */
    fidelity?: ParserFidelity;
  }>;
}

export interface ScanResult {
  project: string;
  projectRoot: string;
  manifest: {
    name?: string;
    version?: string;
    techStack: string[];
    dependencies: string[];
    devDependencies: string[];
    scripts: Record<string, string>;
  };
  topology: Array<{ path: string; type: 'module' | 'file'; fileCount?: number }>;
  modules: ModuleSummary[];
  dependencyGraph: Record<string, string[]>;
  architectureSummary: string;
  architectureMarkdown: string;
  symbols: ScannedSymbol[];
  /**
   * File counts per parser fidelity. A blueprint built partly from ASTs and
   * partly from regex is not comparable with one built the other way round, so
   * the mix is recorded rather than inferred. Ticket 03 surfaces it in the card.
   */
  parserFidelity: Record<ParserFidelity, number>;
}


export async function scanProjectTopology(
  projectRoot: string,
  options: { depth?: number; onProgress?: (progress: ScanProgress) => void } = {}
): Promise<ScanResult> {
  const maxDepth = options.depth ?? 3;
  const projectName = path.basename(projectRoot);
  const summarizer = new SmolLM2Summarizer();
  const scanner = new TreeSitterScanner();
  const onProgress = options.onProgress;
  const parserFidelity: Record<ParserFidelity, number> = { ast: 0, regex: 0, unsupported: 0 };
  const degradedLanguages = new Map<string, string>();

  onProgress?.({ phase: 'Discovering project topology & manifests', percent: 5 });




  const manifest: ScanResult['manifest'] = {
    techStack: [],
    dependencies: [],
    devDependencies: [],
    scripts: {}
  };

  const packageJsonPath = path.join(projectRoot, 'package.json');
  if (fs.existsSync(packageJsonPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      manifest.name = pkg.name;
      manifest.version = pkg.version;
      manifest.scripts = pkg.scripts || {};
      manifest.dependencies = Object.keys(pkg.dependencies || {});
      manifest.devDependencies = Object.keys(pkg.devDependencies || {});

      manifest.techStack.push('nodejs');
      if (
        manifest.devDependencies.includes('typescript') ||
        manifest.dependencies.includes('typescript') ||
        fs.existsSync(path.join(projectRoot, 'tsconfig.json'))
      ) {
        manifest.techStack.push('typescript');
      }
    } catch (e) {}
  }

  if (fs.existsSync(path.join(projectRoot, 'Cargo.toml'))) {
    manifest.techStack.push('rust');
  }

  if (fs.existsSync(path.join(projectRoot, 'go.mod'))) {
    manifest.techStack.push('go');
  }

  if (fs.existsSync(path.join(projectRoot, 'pyproject.toml'))) {
    manifest.techStack.push('python');
  }

  const topology: ScanResult['topology'] = [];
  const symbols: ScannedSymbol[] = [];
  const modulesMap = new Map<string, ModuleSummary>();
  const dependencyGraph: Record<string, string[]> = {};
  const targetFiles: { fullPath: string; fileRelPath: string }[] = [];

  async function walk(currentDir: string, currentDepth: number) {
    if (currentDepth > maxDepth) return;

    let entries: fs.Dirent[] = [];
    try {
      entries = fs.readdirSync(currentDir, { withFileTypes: true });
    } catch (e) {
      return;
    }

    const relPath = path.relative(projectRoot, currentDir) || '.';

    if (relPath !== '.') {
      topology.push({
        path: relPath,
        type: 'module',
        fileCount: entries.filter(e => e.isFile()).length
      });
    }

    for (const entry of entries) {
      if (isIgnoredEntryName(entry.name)) {
        continue;
      }
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        await walk(fullPath, currentDepth + 1);
      } else if (entry.isFile()) {
        const fileRelPath = path.relative(projectRoot, fullPath);
        if (SCANNABLE_FILE_PATTERN.test(entry.name)) {
          targetFiles.push({ fullPath, fileRelPath });
        }
      }
    }
  }

  await walk(projectRoot, 1);

  const totalFiles = targetFiles.length;
  for (let i = 0; i < totalFiles; i++) {
    const { fullPath, fileRelPath } = targetFiles[i];
    const step = i + 1;
    const percent = 10 + Math.floor((step / Math.max(totalFiles, 1)) * 75);
    onProgress?.({
      phase: 'Analyzing files',
      percent,
      currentItem: fileRelPath,
      totalItems: totalFiles,
      currentStep: step
    });

    let fileContent = '';
    try {
      fileContent = fs.readFileSync(fullPath, 'utf8');
    } catch {
      continue;
    }

    const parsed = await scanner.parseFile(fileRelPath, fileContent);
    parserFidelity[parsed.fidelity] += 1;
    symbols.push(...parsed.symbols);

    // Only a language that *has* a grammar can degrade; Ruby and PHP simply
    // have none in 2.2.0, and reporting those as failures would be noise.
    if (parsed.degradedReason && !degradedLanguages.has(parsed.language)) {
      degradedLanguages.set(parsed.language, parsed.degradedReason);
    }

    // Extract imports
    const fileImports: string[] = [];
    const importMatches = fileContent.matchAll(/(?:import|require)\s*\(?['"]([^'"]+)['"]\)?/g);
    for (const match of importMatches) {
      if (match[1].startsWith('.')) {
        const targetRel = path.normalize(path.join(path.dirname(fileRelPath), match[1]));
        fileImports.push(targetRel);
      } else {
        fileImports.push(match[1]);
      }
    }
    dependencyGraph[fileRelPath] = fileImports;

    const summary = await summarizer.summarizeFile(fileRelPath, fileContent);
    const dirKey = path.dirname(fileRelPath);

    if (!modulesMap.has(dirKey)) {
      modulesMap.set(dirKey, {
        name: path.basename(dirKey) || 'root',
        path: dirKey,
        purpose: `Primary ${path.basename(dirKey) || 'root'} module containing core application capabilities.`,
        components: []
      });
    }

    // Only the public surface belongs in `exports`. Feeding every symbol here
    // — as the old regex pass effectively did — is what put private helpers and
    // call sites into the `exportChanges` bucket of `neuron scan --diff`.
    modulesMap.get(dirKey)!.components.push({
      file: fileRelPath,
      purpose: summary,
      exports: parsed.symbols.filter(s => s.exported).map(s => s.name),
      fidelity: parsed.fidelity
    });
  }

  // Loud, not fatal. The scan still produces a card; it is just a worse card
  // than the user has any reason to expect, and silence would let a broken
  // install masquerade as a clean scan.
  if (degradedLanguages.size > 0) {
    const languages = [...degradedLanguages.keys()].sort();
    process.stderr.write(
      `[neuron] ⚠️  Tree-Sitter grammar unavailable for: ${languages.join(', ')}.\n` +
        `[neuron]     These files fell back to the regex scanner, which misses ` +
        `multi-line declarations and cannot separate declarations from call sites.\n` +
        `[neuron]     Run 'neuron init' to fetch the missing grammars.\n` +
        [...degradedLanguages].sort().map(([lang, why]) => `[neuron]     ${lang}: ${why}\n`).join('')
    );
  }

  onProgress?.({ phase: 'Synthesizing architecture blueprint', percent: 88 });

  const modulesList = Array.from(modulesMap.values());
  const archSynthesis = await summarizer.synthesizeArchitecture({
    project: projectName,
    manifest,
    modules: modulesList,
    dependencyGraph
  });

  onProgress?.({ phase: 'Scan complete', percent: 100 });

  return {
    project: projectName,
    projectRoot,
    manifest,
    topology,
    modules: modulesList,
    dependencyGraph,
    architectureSummary: archSynthesis.summary,
    // Ticket 28: synthesizeArchitecture now returns index + per-module
    // markdown separately (what actually gets stored). This field stays a
    // single string for display (`scan --dry-run`) by reassembling them in
    // the pre-28 monolithic order — a plain concatenation, not the parsed
    // reassembly `reassembleBaseline` (ingest.ts) does from storage.
    architectureMarkdown: [archSynthesis.index, ...archSynthesis.modules.map(m => m.markdown)].join('\n'),
    symbols,
    parserFidelity
  };
}


