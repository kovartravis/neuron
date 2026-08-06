import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { TreeSitterScanner, DynamicGrammarLoader } from './treesitter.js';
import { AST_LANGUAGES, cachedLanguages, ensureGrammars } from './grammars.js';

const scanner = new TreeSitterScanner();
const loader = new DynamicGrammarLoader();

/**
 * These tests exercise the real grammars, not a mock. A mocked parser would
 * only prove the query strings are strings — the whole point is whether the
 * queries actually match the declaration forms each grammar produces.
 *
 * Grammars normally arrive via `neuron init`; fetch anything missing once so a
 * cold checkout still runs. Every AST assertion below also asserts
 * `fidelity === 'ast'`, so an offline machine fails loudly instead of quietly
 * passing at regex fidelity — which is the failure mode ticket 02 exists to
 * remove.
 */
beforeAll(async () => {
  const missing = AST_LANGUAGES.filter(l => !cachedLanguages().includes(l));
  if (missing.length > 0) await ensureGrammars({ languages: missing });
}, 120_000);

describe('DynamicGrammarLoader', () => {
  it('resolves extensions to language labels', () => {
    expect(loader.isLanguageSupported('.ts')).toBe(true);
    expect(loader.isLanguageSupported('.py')).toBe(true);
    expect(loader.isLanguageSupported('.rs')).toBe(true);
    expect(loader.resolveLanguage('.ts')).toBe('typescript');
    expect(loader.resolveLanguage('.py')).toBe('python');
    expect(loader.resolveLanguage('.go')).toBe('go');
  });

  it('routes .tsx to the tsx grammar while still labelling it typescript', () => {
    // The label is what baselines already contain; the grammar is what parses
    // JSX correctly. Conflating them mis-parses every .tsx file.
    expect(loader.resolveLanguage('.tsx')).toBe('typescript');
    expect(loader.resolveGrammar('.tsx')).toBe('tsx');
    expect(loader.resolveGrammar('.jsx')).toBe('javascript');
    expect(loader.resolveGrammar('.ts')).toBe('typescript');
  });

  it('reports no grammar for supported-but-regex-only languages', () => {
    expect(loader.isLanguageSupported('.rb')).toBe(true);
    expect(loader.resolveGrammar('.rb')).toBeNull();
    expect(loader.resolveGrammar('.php')).toBeNull();
  });
});

describe('parser fidelity', () => {
  it('parses a grammar-backed language from the AST', async () => {
    const parsed = await scanner.parseFile('app.ts', 'export class A {}\n');
    expect(parsed.fidelity).toBe('ast');
    expect(parsed.degradedReason).toBeUndefined();
  });

  it('degrades to regex for a supported language with no grammar', async () => {
    const parsed = await scanner.parseFile('model.rb', 'class Account\nend\n');
    expect(parsed.fidelity).toBe('regex');
    expect(parsed.symbols.some(s => s.name === 'Account')).toBe(true);
  });

  it('reports an unsupported extension rather than guessing', async () => {
    const parsed = await scanner.parseFile('notes.txt', 'class Nope {}');
    expect(parsed.fidelity).toBe('unsupported');
    expect(parsed.symbols).toEqual([]);
  });
});

describe('TypeScript extraction (hand-written queries)', () => {
  it('captures every declaration form the shipped query misses', async () => {
    const code = `export class Alpha {}
export function beta<T>(x: T): T { return x; }
export interface Config { a: string }
export type Role = 'a' | 'b';
export enum Color { Red }
export const gamma = async (n: number): Promise<void> => {};
`;
    const parsed = await scanner.parseFile('all.ts', code);
    expect(parsed.fidelity).toBe('ast');

    const byName = new Map(parsed.symbols.map(s => [s.name, s]));
    expect(byName.get('Alpha')?.kind).toBe('class');
    expect(byName.get('beta')?.kind).toBe('function');
    expect(byName.get('Config')?.kind).toBe('interface');
    expect(byName.get('Role')?.kind).toBe('type');
    expect(byName.get('Color')?.kind).toBe('enum');
    // The dominant modern export form, invisible to the shipped query.
    expect(byName.get('gamma')?.kind).toBe('function');
  });

  it('keeps a wrapped signature whole across lines', async () => {
    // The regex scanner split on newlines, so this signature came out as
    // `async query(` — the parameters and return type were simply lost.
    const code = `export class MemoryStore {
  async query(
    queryStr: string,
    limit?: number
  ): Promise<Memory[]> { return []; }
}
`;
    const parsed = await scanner.parseFile('store.ts', code);
    const query = parsed.symbols.find(s => s.name === 'query');

    expect(query?.kind).toBe('method');
    expect(query?.signature).toContain('queryStr: string');
    expect(query?.signature).toContain('limit?: number');
    expect(query?.signature).toContain('Promise<Memory[]>');
    expect(query?.line).toBe(2);
  });

  it('records zero method symbols for a file of pure call sites', async () => {
    // The old bare-`name(args)` branch recorded each of these as a `method`,
    // putting call-site noise straight into the blueprint card.
    const code = `import { setup } from './setup';

setup();
console.log('starting');
doWork(1, 2);
if (ready(x)) { run(); }
for (const a of list(y)) { emit(a); }
await fetchThing('url');
`;
    const parsed = await scanner.parseFile('calls.ts', code);

    expect(parsed.fidelity).toBe('ast');
    expect(parsed.symbols.filter(s => s.kind === 'method')).toEqual([]);
    expect(parsed.symbols).toEqual([]);
  });

  it('finds nested declarations at their true line numbers', async () => {
    const code = `export function outer() {
  class Inner {
    helper(): void {}
  }
  return Inner;
}
`;
    const parsed = await scanner.parseFile('nested.ts', code);
    const byName = new Map(parsed.symbols.map(s => [s.name, s]));

    expect(byName.get('outer')?.line).toBe(1);
    expect(byName.get('Inner')?.kind).toBe('class');
    expect(byName.get('Inner')?.line).toBe(2);
    expect(byName.get('helper')?.kind).toBe('method');
    expect(byName.get('helper')?.line).toBe(3);
  });

  it('separates the public surface from private declarations', async () => {
    const code = `export class Public {
  visible() {}
}
class Private {}
export function shown() {}
function hidden() {}
`;
    const parsed = await scanner.parseFile('surface.ts', code);
    const exported = parsed.symbols.filter(s => s.exported).map(s => s.name).sort();

    // `visible` is reached through its class, so it is not a module export.
    expect(exported).toEqual(['Public', 'shown']);
  });

  it('does not treat helpers nested in an exported function as exports', async () => {
    // Climbing every ancestor for an `export` keyword marks these exported,
    // because the enclosing function carries one. They are reachable from
    // nowhere outside it.
    const code = `export async function outer() {
  function walk() {}
  const helper = () => {};
  return walk;
}
export const arrow = () => {};
`;
    const parsed = await scanner.parseFile('nested-export.ts', code);
    const byName = new Map(parsed.symbols.map(s => [s.name, s]));

    expect(byName.get('outer')?.exported).toBe(true);
    expect(byName.get('arrow')?.exported).toBe(true);
    expect(byName.get('walk')?.exported).toBe(false);
    expect(byName.get('helper')?.exported).toBe(false);
  });

  it('parses JSX through the tsx grammar', async () => {
    const code = `export const Button = ({ label }: Props) => <button>{label}</button>;
export function Panel() { return <div><Button label="x" /></div>; }
`;
    const parsed = await scanner.parseFile('Button.tsx', code);

    expect(parsed.fidelity).toBe('ast');
    expect(parsed.language).toBe('typescript');
    expect(parsed.symbols.some(s => s.name === 'Button')).toBe(true);
    expect(parsed.symbols.some(s => s.name === 'Panel')).toBe(true);
  });
});

describe('per-language extraction', () => {
  it('parses Python, including decorated and wrapped defs', async () => {
    const code = `class Database:
    def connect(self):
        pass

@retry(times=3)
@traced
def gamma(
    a,
    b
):
    print(a)
    not_a_decl(b)
`;
    const parsed = await scanner.parseFile('db.py', code);
    const byName = new Map(parsed.symbols.map(s => [s.name, s]));

    expect(parsed.fidelity).toBe('ast');
    expect(byName.get('Database')?.kind).toBe('class');
    expect(byName.get('connect')?.kind).toBe('method');
    // Decorated *and* wrapped across four lines.
    expect(byName.get('gamma')?.kind).toBe('function');
    expect(byName.get('gamma')?.signature).toContain('a');
    // Call sites, not declarations.
    expect(byName.has('print')).toBe(false);
    expect(byName.has('not_a_decl')).toBe(false);
  });

  it('distinguishes Go structs, interfaces and methods', async () => {
    const code = `package main

type Storage struct {
	ID string
}

type Reader interface {
	Read() error
}

func (s *Storage) Save() error { return nil }

func Load(id string) error {
	fmt.Println(id)
	return nil
}
`;
    const parsed = await scanner.parseFile('main.go', code);
    const byName = new Map(parsed.symbols.map(s => [s.name, s]));

    expect(parsed.fidelity).toBe('ast');
    // The shipped query tags all three as `@definition.type`; the node type
    // is what recovers struct vs interface.
    expect(byName.get('Storage')?.kind).toBe('struct');
    expect(byName.get('Reader')?.kind).toBe('interface');
    expect(byName.get('Save')?.kind).toBe('method');
    expect(byName.get('Load')?.kind).toBe('function');
    expect(byName.has('Println')).toBe(false);
  });

  it('labels Rust structs as structs and impl fns as methods', async () => {
    const code = `pub struct AuthVault {
    pub realm: String,
}

pub trait Verify {
    fn check(&self) -> bool;
}

impl AuthVault {
    pub fn validate(&self) -> bool { true }
}

pub fn verify_jwt_token(token: &str) -> bool {
    !token.is_empty()
}

fn internal_helper() {}
`;
    const parsed = await scanner.parseFile('main.rs', code);
    const byName = new Map(parsed.symbols.map(s => [s.name, s]));

    expect(parsed.fidelity).toBe('ast');
    // Rust's shipped query calls a struct `@definition.class`.
    expect(byName.get('AuthVault')?.kind).toBe('struct');
    expect(byName.get('Verify')?.kind).toBe('interface');
    // Matches both @definition.method and @definition.function; method wins.
    expect(byName.get('validate')?.kind).toBe('method');
    expect(byName.get('verify_jwt_token')?.kind).toBe('function');
    expect(byName.get('verify_jwt_token')?.exported).toBe(true);
    expect(byName.get('internal_helper')?.exported).toBe(false);
  });

  it('parses Java classes, interfaces and methods', async () => {
    const code = `public class Vault {
  public boolean validate(String s) { return helper(s); }
}

interface Store { void put(String k); }
`;
    const parsed = await scanner.parseFile('Vault.java', code);
    const byName = new Map(parsed.symbols.map(s => [s.name, s]));

    expect(parsed.fidelity).toBe('ast');
    expect(byName.get('Vault')?.kind).toBe('class');
    expect(byName.get('Store')?.kind).toBe('interface');
    expect(byName.get('validate')?.kind).toBe('method');
    expect(byName.has('helper')).toBe(false);
  });

  it('parses C++ structs, classes and functions', async () => {
    const code = `struct Point { int x; };

class Vault {
public:
  bool validate(int id);
};

int compute(int a, int b) { return a + b; }
`;
    const parsed = await scanner.parseFile('vault.cpp', code);
    const byName = new Map(parsed.symbols.map(s => [s.name, s]));

    expect(parsed.fidelity).toBe('ast');
    expect(byName.get('Point')?.kind).toBe('struct');
    expect(byName.get('Vault')?.kind).toBe('class');
    expect(byName.get('validate')?.kind).toBe('method');
    expect(byName.get('compute')?.kind).toBe('function');
  });

  it('parses JavaScript declarations and arrow exports', async () => {
    const code = `export class Router {}
export function handleRoute() {}
export const send = (payload) => payload;
handleRoute();
`;
    const parsed = await scanner.parseFile('router.js', code);
    const byName = new Map(parsed.symbols.map(s => [s.name, s]));

    expect(parsed.fidelity).toBe('ast');
    expect(byName.get('Router')?.kind).toBe('class');
    expect(byName.get('handleRoute')?.kind).toBe('function');
    expect(byName.get('send')?.kind).toBe('function');
    expect(parsed.symbols.filter(s => s.name === 'handleRoute')).toHaveLength(1);
  });
});

describe('polyglot fixture', () => {
  const fixture = path.resolve('test/e2e/fixtures/polyglot-monorepo');

  const cases: Array<{ file: string; expected: Array<[string, string]> }> = [
    {
      file: 'packages/api-gateway/src/auth.ts',
      expected: [
        ['TokenPayload', 'interface'],
        ['authenticateRequest', 'function'],
        ['AuthenticationVault', 'class'],
        ['validateSession', 'method'],
        ['Role', 'type'],
      ],
    },
    {
      file: 'services/analytics/main.py',
      expected: [
        ['AnalyticsService', 'class'],
        ['process_event_stream', 'method'],
        ['calculate_metrics', 'function'],
      ],
    },
    {
      file: 'services/data-go/main.go',
      expected: [
        ['DataPipeline', 'struct'],
        ['IngestStream', 'function'],
        ['main', 'function'],
      ],
    },
    {
      file: 'services/auth-rs/src/main.rs',
      expected: [
        ['AuthVault', 'struct'],
        ['verify_jwt_token', 'function'],
        ['main', 'function'],
      ],
    },
  ];

  for (const { file, expected } of cases) {
    it(`yields real AST symbols for ${file}`, async () => {
      const content = fs.readFileSync(path.join(fixture, file), 'utf8');
      const parsed = await scanner.parseFile(file, content);

      expect(parsed.fidelity).toBe('ast');
      for (const [name, kind] of expected) {
        const found = parsed.symbols.find(s => s.name === name);
        expect(found, `${file} should yield ${name}`).toBeDefined();
        expect(found?.kind, `${name} in ${file}`).toBe(kind);
      }
    });
  }
});
