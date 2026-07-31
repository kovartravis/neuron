import { describe, it, expect } from 'vitest';
import { TreeSitterScanner, DynamicGrammarLoader } from './treesitter.js';

describe('TreeSitterScanner & DynamicGrammarLoader', () => {
  const loader = new DynamicGrammarLoader();
  const scanner = new TreeSitterScanner();

  it('supports extension resolution via DynamicGrammarLoader', () => {
    expect(loader.isLanguageSupported('.ts')).toBe(true);
    expect(loader.isLanguageSupported('.py')).toBe(true);
    expect(loader.isLanguageSupported('.rs')).toBe(true);
    expect(loader.resolveLanguage('.ts')).toBe('typescript');
    expect(loader.resolveLanguage('.py')).toBe('python');
    expect(loader.resolveLanguage('.go')).toBe('go');
  });

  it('parses TypeScript symbols correctly', async () => {
    const code = `export class Router {}\nexport function handleRoute() {}\nexport interface Config {}\n`;
    const symbols = await scanner.parseFileContent('app.ts', code);

    expect(symbols.some(s => s.name === 'Router' && s.kind === 'class')).toBe(true);
    expect(symbols.some(s => s.name === 'handleRoute' && s.kind === 'function')).toBe(true);
    expect(symbols.some(s => s.name === 'Config' && s.kind === 'interface')).toBe(true);
  });

  it('parses Python and Go symbols correctly', async () => {
    const pyCode = `class Database:\n    pass\n\ndef connect():\n    pass\n`;
    const pySymbols = await scanner.parseFileContent('db.py', pyCode);
    expect(pySymbols.some(s => s.name === 'Database' && s.kind === 'class')).toBe(true);
    expect(pySymbols.some(s => s.name === 'connect' && s.kind === 'function')).toBe(true);

    const goCode = `package main\n\ntype Storage struct {}\n\nfunc Save() {}\n`;
    const goSymbols = await scanner.parseFileContent('main.go', goCode);
    expect(goSymbols.some(s => s.name === 'Storage' && s.kind === 'struct')).toBe(true);
    expect(goSymbols.some(s => s.name === 'Save' && s.kind === 'function')).toBe(true);
  });

  it('parses full method signatures with parameters and return types', async () => {
    const code = `export class MemoryStore {\n  async query(queryStr: string, limit?: number): Promise<Memory[]> {}\n}\n`;
    const symbols = await scanner.parseFileContent('store.ts', code);

    const querySymbol = symbols.find(s => s.name === 'query');
    expect(querySymbol).toBeDefined();
    expect(querySymbol?.signature).toContain('queryStr: string');
  });
});
