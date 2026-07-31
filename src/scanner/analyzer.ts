import path from 'node:path';
import fs from 'node:fs';
import { SmolLM2Summarizer } from '../components/summarizer.js';
import type { ScanProgress } from '../ui/progress.js';

export interface ScannedSymbol {
  file: string;
  kind: 'class' | 'interface' | 'function' | 'struct' | 'command';
  name: string;
  language: string;
  line?: number;
}

export interface ModuleSummary {
  name: string;
  path: string;
  purpose: string;
  components: Array<{
    file: string;
    purpose: string;
    exports: string[];
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
}


export async function scanProjectTopology(
  projectRoot: string,
  options: { depth?: number; onProgress?: (progress: ScanProgress) => void } = {}
): Promise<ScanResult> {
  const maxDepth = options.depth ?? 3;
  const projectName = path.basename(projectRoot);
  const summarizer = new SmolLM2Summarizer();
  const onProgress = options.onProgress;

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
      if (entry.name.startsWith('.') || entry.name === 'node_modules' || entry.name === 'dist') {
        continue;
      }
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        await walk(fullPath, currentDepth + 1);
      } else if (entry.isFile()) {
        const fileRelPath = path.relative(projectRoot, fullPath);
        if (/\.(ts|js|py|go|rs|java)$/.test(entry.name)) {
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

    const fileSymbols = parseSymbolsFromFile(fullPath, fileRelPath, symbols);
    const fileContent = fs.readFileSync(fullPath, 'utf8');

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

    modulesMap.get(dirKey)!.components.push({
      file: fileRelPath,
      purpose: summary,
      exports: fileSymbols.map(s => s.name)
    });
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
    architectureMarkdown: archSynthesis.markdown,
    symbols
  };
}



function parseSymbolsFromFile(filePath: string, relativePath: string, symbols: ScannedSymbol[]): ScannedSymbol[] {
  const fileSymbols: ScannedSymbol[] = [];
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');

    lines.forEach((line, idx) => {
      const lineNum = idx + 1;
      const classMatch = line.match(/export\s+class\s+([A-Za-z0-9_]+)/);
      if (classMatch) {
        const item: ScannedSymbol = { file: relativePath, kind: 'class', name: classMatch[1], language: 'typescript', line: lineNum };
        symbols.push(item);
        fileSymbols.push(item);
      }

      const fnMatch = line.match(/export\s+function\s+([A-Za-z0-9_]+)/);
      if (fnMatch) {
        const item: ScannedSymbol = { file: relativePath, kind: 'function', name: fnMatch[1], language: 'typescript', line: lineNum };
        symbols.push(item);
        fileSymbols.push(item);
      }

      const interfaceMatch = line.match(/export\s+interface\s+([A-Za-z0-9_]+)/);
      if (interfaceMatch) {
        const item: ScannedSymbol = { file: relativePath, kind: 'interface', name: interfaceMatch[1], language: 'typescript', line: lineNum };
        symbols.push(item);
        fileSymbols.push(item);
      }
    });
  } catch (e) {}
  return fileSymbols;
}

