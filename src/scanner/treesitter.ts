import path from 'node:path';
import { GrammarLoader, GRAMMAR_SPECS } from './grammars.js';
import {
  HANDWRITTEN_QUERIES,
  isTypeLikeAncestor,
  kindPrecedence,
  refineGoTypeSpec,
  resolveKind,
  type SymbolKind,
} from './queries.js';

export interface ScannedSymbol {
  file: string;
  kind: SymbolKind;
  name: string;
  language: string;
  line?: number;
  signature?: string;
  /**
   * Whether the symbol is part of the file's public surface.
   *
   * Methods are never exports — the class is. Keeping members out of this set
   * is what stops `neuron scan --diff` reporting an export contract change
   * every time a private helper is renamed.
   */
  exported?: boolean;
}

/** How a file's symbols were obtained. Recorded per-file, never guessed. */
export type ParserFidelity = 'ast' | 'regex' | 'unsupported';

export interface ParsedFile {
  file: string;
  language: string;
  fidelity: ParserFidelity;
  symbols: ScannedSymbol[];
  /** Why an AST-capable language fell back. Absent when fidelity is 'ast'. */
  degradedReason?: string;
}

/**
 * Every extension the parser can extract symbols from. This is the single
 * source of truth for language support: the topology scan derives its file
 * filter from it, so a language added here is immediately scannable rather
 * than silently skipped before it ever reaches the parser.
 */
export const SUPPORTED_SOURCE_EXTENSIONS = [
  '.ts', '.js', '.tsx', '.jsx', '.py', '.go', '.rs',
  '.java', '.cpp', '.hpp', '.cs', '.swift', '.rb', '.php',
];

export class DynamicGrammarLoader {
  isLanguageSupported(ext: string): boolean {
    return SUPPORTED_SOURCE_EXTENSIONS.includes(ext.toLowerCase());
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

  /**
   * The grammar that parses this extension, which is not always the language
   * it is reported as. `.tsx` is reported as `typescript` — that is the label
   * users and baselines already have — but TSX is a separate grammar, and
   * parsing TSX with the TypeScript grammar mis-parses every JSX element.
   */
  resolveGrammar(ext: string): string | null {
    const lower = ext.toLowerCase();
    if (lower === '.tsx') return 'tsx';
    if (lower === '.jsx') return 'javascript';
    const language = this.resolveLanguage(lower);
    return GRAMMAR_SPECS[language] ? language : null;
  }

  /** Whether this extension has a cached grammar available right now. */
  hasGrammar(ext: string): boolean {
    const grammar = this.resolveGrammar(ext);
    return grammar !== null && GRAMMAR_SPECS[grammar] !== undefined;
  }
}

/** Minimal shape of the web-tree-sitter nodes we touch. Avoids a type-only import. */
interface SyntaxNode {
  type: string;
  text: string;
  startIndex: number;
  endIndex: number;
  startPosition: { row: number; column: number };
  parent: SyntaxNode | null;
  childForFieldName(field: string): SyntaxNode | null;
}

interface Capture { name: string; node: SyntaxNode }
interface Match { captures: Capture[] }

const MAX_SIGNATURE_LENGTH = 200;

/**
 * Extracts symbols from a parsed syntax tree.
 *
 * Falls back to line-oriented regex only for languages with no grammar
 * (Ruby, PHP, Swift, C#). A language that *has* a grammar never silently
 * degrades: if the grammar or its query fails, the fallback is still used but
 * the reason is recorded on the result, because a blueprint built at mixed
 * fidelity that does not say so produces phantom drift.
 */
export class TreeSitterScanner {
  private grammarLoader: DynamicGrammarLoader;
  private grammars: GrammarLoader;
  private queryCache = new Map<string, unknown>();
  private queryErrors = new Map<string, string>();

  constructor(grammars?: GrammarLoader) {
    this.grammarLoader = new DynamicGrammarLoader();
    this.grammars = grammars ?? new GrammarLoader();
  }

  /**
   * Parse a file and report how it was parsed.
   *
   * Prefer this over `parseFileContent` when the caller records fidelity.
   */
  async parseFile(filePath: string, content: string): Promise<ParsedFile> {
    const ext = path.extname(filePath);
    const language = this.grammarLoader.resolveLanguage(ext);

    if (!this.grammarLoader.isLanguageSupported(ext)) {
      return { file: filePath, language, fidelity: 'unsupported', symbols: [] };
    }

    const grammar = this.grammarLoader.resolveGrammar(ext);
    if (!grammar) {
      // Expected: Ruby, PHP, Swift and C# have no 2.2.0 grammar.
      return {
        file: filePath,
        language,
        fidelity: 'regex',
        symbols: this.parseWithRegex(filePath, content, language),
      };
    }

    const astResult = await this.parseWithAst(filePath, content, language, grammar);
    if (astResult) {
      return { file: filePath, language, fidelity: 'ast', symbols: astResult };
    }

    return {
      file: filePath,
      language,
      fidelity: 'regex',
      symbols: this.parseWithRegex(filePath, content, language),
      degradedReason:
        this.queryErrors.get(grammar) ??
        this.grammars.loadError(grammar) ??
        `grammar '${grammar}' not cached — run 'neuron init'`,
    };
  }

  async parseFileContent(filePath: string, content: string): Promise<ScannedSymbol[]> {
    return (await this.parseFile(filePath, content)).symbols;
  }

  /** Returns null when the grammar or its query is unavailable. */
  private async parseWithAst(
    filePath: string,
    content: string,
    language: string,
    grammar: string
  ): Promise<ScannedSymbol[] | null> {
    const loaded = await this.grammars.load(grammar);
    if (!loaded) return null;

    const query = await this.buildQuery(grammar, loaded);
    if (!query) return null;

    try {
      const { Parser } = await import('web-tree-sitter');
      const parser = new Parser();
      parser.setLanguage(loaded as never);
      const tree = parser.parse(content);
      if (!tree) return null;

      const symbols = this.collect(
        (query as { matches(node: unknown): Match[] }).matches(tree.rootNode),
        filePath,
        language,
        grammar
      );

      tree.delete();
      parser.delete();
      return symbols;
    } catch (e) {
      this.queryErrors.set(grammar, e instanceof Error ? e.message : String(e));
      return null;
    }
  }

  private async buildQuery(grammar: string, loaded: unknown): Promise<unknown | null> {
    if (this.queryCache.has(grammar)) return this.queryCache.get(grammar);
    if (this.queryErrors.has(grammar)) return null;

    const source = HANDWRITTEN_QUERIES[grammar] ?? this.grammars.readTagsQuery(grammar);
    if (!source) {
      this.queryErrors.set(grammar, `no query available for '${grammar}'`);
      return null;
    }

    try {
      const { Query } = await import('web-tree-sitter');
      const query = new Query(loaded as never, source);
      this.queryCache.set(grammar, query);
      return query;
    } catch (e) {
      this.queryErrors.set(grammar, e instanceof Error ? e.message : String(e));
      return null;
    }
  }

  /**
   * Turns query matches into symbols.
   *
   * Only `@definition.*` captures survive. That single filter is what removes
   * call sites: the shipped queries tag `print(x)` and `helper(s)` as
   * `@reference.call`, so dropping references does by construction what the
   * old bare-`name(args)` heuristic tried and failed to do by pattern.
   */
  private collect(
    matches: Match[],
    filePath: string,
    language: string,
    grammar: string
  ): ScannedSymbol[] {
    const byNode = new Map<string, ScannedSymbol>();

    for (const match of matches) {
      const definition = match.captures.find(c => c.name.startsWith('definition.'));
      const nameCapture = match.captures.find(c => c.name === 'name');
      if (!definition || !nameCapture) continue;

      let kind = resolveKind(definition.node.type, definition.name);
      if (!kind) continue;

      if (grammar === 'go' && definition.node.type === 'type_spec') {
        kind = refineGoTypeSpec(definition.node.childForFieldName('type')?.type);
      }
      if (kind === 'function' && this.isMember(definition.node)) {
        kind = 'method';
      }

      const name = nameCapture.node.text;
      if (!name) continue;

      const symbol: ScannedSymbol = {
        file: filePath,
        kind,
        name,
        language,
        line: definition.node.startPosition.row + 1,
        signature: signatureOf(definition.node),
        exported: isExported(definition.node, name, kind, grammar),
      };

      // One node can match several patterns; keep the most specific kind.
      const key = `${definition.node.startIndex}:${name}`;
      const existing = byNode.get(key);
      if (!existing || kindPrecedence(kind) > kindPrecedence(existing.kind)) {
        byNode.set(key, symbol);
      }
    }

    return [...byNode.values()].sort((a, b) => (a.line ?? 0) - (b.line ?? 0));
  }

  /** True when the declaration sits inside a class, interface, impl or enum. */
  private isMember(node: SyntaxNode): boolean {
    let current = node.parent;
    while (current) {
      if (isTypeLikeAncestor(current.type)) return true;
      current = current.parent;
    }
    return false;
  }

  /**
   * Line-oriented fallback for languages with no grammar.
   *
   * The bare-`name(args)` method branch the 2.1.0 scanner carried is gone: it
   * matched any call site that was not a keyword, so ordinary calls were
   * recorded as `method` symbols and went straight into the blueprint card.
   * Missing a real method is a gap; inventing one is a lie.
   */
  private parseWithRegex(filePath: string, content: string, language: string): ScannedSymbol[] {
    const symbols: ScannedSymbol[] = [];

    content.split('\n').forEach((line, idx) => {
      const lineNum = idx + 1;
      const signature = line.trim().slice(0, MAX_SIGNATURE_LENGTH);
      const exported = /\b(export|public|pub)\b/.test(line);

      const classMatch = line.match(/(?:export\s+)?(?:class|struct)\s+([A-Za-z0-9_]+)/);
      const goStructMatch = line.match(/type\s+([A-Za-z0-9_]+)\s+struct/);

      if (classMatch) {
        symbols.push({
          file: filePath,
          kind: line.includes('struct') ? 'struct' : 'class',
          name: classMatch[1],
          language, line: lineNum, signature, exported,
        });
      } else if (goStructMatch) {
        symbols.push({
          file: filePath, kind: 'struct', name: goStructMatch[1],
          language, line: lineNum, signature, exported,
        });
      }

      const fnMatch = line.match(/(?:export\s+)?(?:async\s+)?(?:function|def|fn|func|sub)\s+([A-Za-z0-9_]+)/);
      if (fnMatch) {
        symbols.push({
          file: filePath, kind: 'function', name: fnMatch[1],
          language, line: lineNum, signature, exported,
        });
      }

      const interfaceMatch = line.match(/(?:export\s+)?interface\s+([A-Za-z0-9_]+)/);
      if (interfaceMatch) {
        symbols.push({
          file: filePath, kind: 'interface', name: interfaceMatch[1],
          language, line: lineNum, signature, exported,
        });
      }
    });

    return symbols;
  }
}

/**
 * The declaration header, without its body.
 *
 * Taken from the node's own extent rather than the source line, which is what
 * makes a wrapped signature come out whole — the regex scanner truncated every
 * declaration at the first newline.
 */
function signatureOf(node: SyntaxNode): string {
  const text = node.text;
  const body = node.childForFieldName('body');

  let header = text;
  if (body) {
    header = text.slice(0, body.startIndex - node.startIndex);
  } else {
    const brace = text.indexOf('{');
    if (brace > 0) header = text.slice(0, brace);
  }

  return header
    .replace(/\s+/g, ' ')
    .replace(/[\s:={]+$/, '')
    .replace(/\s*=>$/, '')
    .trim()
    .slice(0, MAX_SIGNATURE_LENGTH);
}

/**
 * Whether a symbol belongs to the file's public surface.
 *
 * Each language states visibility its own way — a keyword in TypeScript, case
 * in Go, `pub` in Rust, a leading underscore in Python. Methods are excluded
 * everywhere: a method is reached *through* its class, so listing it as a
 * module export is what made the `exportChanges` bucket noisy.
 */
function isExported(node: SyntaxNode, name: string, kind: SymbolKind, grammar: string): boolean {
  if (kind === 'method') return false;

  switch (grammar) {
    case 'typescript':
    case 'tsx':
    case 'javascript': {
      // The `export` must apply to *this* declaration, so only declaration
      // wrappers are climbed through. Climbing arbitrary ancestors would call
      // a helper nested inside an exported function exported too — it is
      // reachable from nowhere outside that function.
      let current: SyntaxNode = node;
      for (;;) {
        const parent = current.parent;
        if (!parent) return false;
        if (parent.type === 'export_statement') return true;
        if (parent.type === 'lexical_declaration' || parent.type === 'variable_declaration') {
          current = parent;
          continue;
        }
        return false;
      }
    }
    case 'go':
      return /^[A-Z]/.test(name);
    case 'python':
      return !name.startsWith('_');
    case 'rust':
      return /^\s*pub\b/.test(node.text);
    case 'java':
      return /^\s*(public\b|.*\bpublic\b)/.test(node.text.split('\n')[0]);
    default:
      return true;
  }
}
