import path from 'node:path';

export interface ScannedSymbol {
  file: string;
  kind: 'class' | 'interface' | 'function' | 'struct' | 'command' | 'method';
  name: string;
  language: string;
  line?: number;
  signature?: string;
}

export class DynamicGrammarLoader {
  private loadedGrammars: Set<string> = new Set();

  isLanguageSupported(ext: string): boolean {
    const supportedExts = ['.ts', '.js', '.tsx', '.jsx', '.py', '.go', '.rs', '.java', '.cpp', '.hpp', '.cs', '.swift', '.rb', '.php'];
    return supportedExts.includes(ext.toLowerCase());
  }

  resolveLanguage(ext: string): string {
    const map: Record<string, string> = {
      '.ts': 'typescript',
      '.js': 'javascript',
      '.tsx': 'typescript',
      '.jsx': 'javascript',
      '.py': 'python',
      '.go': 'go',
      '.rs': 'rust',
      '.java': 'java',
      '.cpp': 'cpp',
      '.hpp': 'cpp',
      '.cs': 'csharp',
      '.swift': 'swift',
      '.rb': 'ruby',
      '.php': 'php'
    };
    return map[ext.toLowerCase()] || 'unknown';
  }
}

export class TreeSitterScanner {
  private grammarLoader: DynamicGrammarLoader;

  constructor() {
    this.grammarLoader = new DynamicGrammarLoader();
  }

  async parseFileContent(filePath: string, content: string): Promise<ScannedSymbol[]> {
    const ext = path.extname(filePath);
    const language = this.grammarLoader.resolveLanguage(ext);
    const symbols: ScannedSymbol[] = [];

    const lines = content.split('\n');
    lines.forEach((line, idx) => {
      const lineNum = idx + 1;

      // Classes / Structs
      const classMatch = line.match(/(?:export\s+)?(?:class|struct)\s+([A-Za-z0-9_]+)/);
      const goStructMatch = line.match(/type\s+([A-Za-z0-9_]+)\s+struct/);

      if (classMatch) {
        const isStruct = line.includes('struct');
        symbols.push({
          file: filePath,
          kind: isStruct ? 'struct' : 'class',
          name: classMatch[1],
          language,
          line: lineNum,
          signature: line.trim()
        });
      } else if (goStructMatch) {
        symbols.push({
          file: filePath,
          kind: 'struct',
          name: goStructMatch[1],
          language,
          line: lineNum,
          signature: line.trim()
        });
      }

      // Methods / Functions
      const methodMatch = line.match(/(?:async\s+)?([A-Za-z0-9_]+)\s*\(([^)]*)\)\s*(?::\s*([^{;]+))?/);
      const fnMatch = line.match(/(?:export\s+)?(?:async\s+)?(?:function|def|fn|func)\s+([A-Za-z0-9_]+)/);

      if (fnMatch) {
        symbols.push({
          file: filePath,
          kind: 'function',
          name: fnMatch[1],
          language,
          line: lineNum,
          signature: line.trim()
        });
      } else if (methodMatch && !line.includes('constructor') && !line.includes('function') && !line.includes('if') && !line.includes('for') && !line.includes('while')) {
        symbols.push({
          file: filePath,
          kind: 'method',
          name: methodMatch[1],
          language,
          line: lineNum,
          signature: `${methodMatch[1]}(${methodMatch[2]})${methodMatch[3] ? ': ' + methodMatch[3].trim() : ''}`
        });
      }

      // Interfaces
      const interfaceMatch = line.match(/(?:export\s+)?interface\s+([A-Za-z0-9_]+)/);
      if (interfaceMatch) {
        symbols.push({
          file: filePath,
          kind: 'interface',
          name: interfaceMatch[1],
          language,
          line: lineNum,
          signature: line.trim()
        });
      }
    });

    return symbols;
  }
}

