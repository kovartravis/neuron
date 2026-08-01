/**
 * Per-language symbol extraction queries and the rules that turn a captured
 * syntax node into a `ScannedSymbol`.
 *
 * Two things live here because they are one decision: which S-expression query
 * finds declarations in a language, and how the node it captures maps to a
 * symbol kind. Splitting them would let a query and its kind table drift.
 *
 * ## Why some queries are hand-written
 *
 * Most grammars ship a `queries/tags.scm` (ticket 01 caches it next to the
 * `.wasm`). Those queries were written for *code navigation* — "jump to the
 * thing under my cursor" — not for the declaration inventory a blueprint card
 * needs, so each one is audited before adoption rather than trusted wholesale.
 *
 * TypeScript's shipped query fails that audit outright: it covers only ambient
 * declaration forms (`function_signature`, `method_signature`,
 * `abstract_class_declaration`, `interface_declaration`) and has **no** rule for
 * `function_declaration` or `method_definition`. Against
 * `export class Alpha { thing() {} }` it captures nothing but a stray generic
 * parameter, where JavaScript's equivalent has 13 definition rules. Neuron is
 * itself a TypeScript project, so TypeScript and TSX get the queries below and
 * everything else uses its shipped `tags.scm`.
 */

/** Languages whose shipped `tags.scm` was audited and adopted as-is. */
export const SHIPPED_QUERY_LANGUAGES = [
  'javascript', 'python', 'go', 'rust', 'java', 'cpp',
];

/**
 * TypeScript and TSX share this. It is written against declaration forms rather
 * than the ambient-only set the shipped query covers.
 *
 * `variable_declarator` bound to an arrow or function expression is what makes
 * `export const handler = () => {}` — the dominant modern form — visible at all.
 */
const TYPESCRIPT_QUERY = `
(class_declaration name: (type_identifier) @name) @definition.class
(abstract_class_declaration name: (type_identifier) @name) @definition.class
(interface_declaration name: (type_identifier) @name) @definition.interface
(type_alias_declaration name: (type_identifier) @name) @definition.type
(enum_declaration name: (identifier) @name) @definition.enum
(function_declaration name: (identifier) @name) @definition.function
(generator_function_declaration name: (identifier) @name) @definition.function
(function_signature name: (identifier) @name) @definition.function
(method_definition
  name: [(property_identifier) (private_property_identifier)] @name) @definition.method
(method_signature
  name: [(property_identifier) (private_property_identifier)] @name) @definition.method
(abstract_method_signature name: (property_identifier) @name) @definition.method
(public_field_definition
  name: [(property_identifier) (private_property_identifier)] @name
  value: [(arrow_function) (function_expression)]) @definition.method
(variable_declarator
  name: (identifier) @name
  value: [(arrow_function) (function_expression)]) @definition.function
(internal_module name: (identifier) @name) @definition.module
`;

/** Hand-written queries, keyed by grammar id. Overrides any shipped query. */
export const HANDWRITTEN_QUERIES: Record<string, string> = {
  typescript: TYPESCRIPT_QUERY,
  tsx: TYPESCRIPT_QUERY,
};

export type SymbolKind =
  | 'class' | 'interface' | 'function' | 'struct'
  | 'command' | 'method' | 'type' | 'enum' | 'module';

/**
 * Kind is decided by the **AST node type**, not the capture name.
 *
 * The shipped queries are too coarse to read kinds off their captures: Rust
 * tags `struct_item`, `enum_item`, `union_item` and `type_item` all as
 * `@definition.class`, and C++ tags a `struct_specifier` the same way. Reading
 * the node type instead recovers the distinction the query threw away.
 */
const NODE_KINDS: Record<string, SymbolKind> = {
  // TypeScript / TSX / JavaScript
  class_declaration: 'class',
  abstract_class_declaration: 'class',
  class: 'class',
  interface_declaration: 'interface',
  type_alias_declaration: 'type',
  enum_declaration: 'enum',
  function_declaration: 'function',
  generator_function_declaration: 'function',
  generator_function: 'function',
  function_expression: 'function',
  function_signature: 'function',
  variable_declarator: 'function',
  assignment_expression: 'function',
  pair: 'function',
  method_definition: 'method',
  method_signature: 'method',
  abstract_method_signature: 'method',
  public_field_definition: 'method',
  internal_module: 'module',
  module: 'module',

  // Python
  class_definition: 'class',
  function_definition: 'function',

  // Go
  method_declaration: 'method',

  // Rust
  struct_item: 'struct',
  union_item: 'struct',
  enum_item: 'enum',
  type_item: 'type',
  trait_item: 'interface',
  mod_item: 'module',
  function_item: 'function',
  macro_definition: 'function',

  // C++
  struct_specifier: 'struct',
  class_specifier: 'class',
  function_declarator: 'function',
  type_definition: 'type',
  enum_specifier: 'enum',
};

/** Used only when the node type is unknown — the capture name is the fallback. */
const CAPTURE_KINDS: Record<string, SymbolKind> = {
  'definition.class': 'class',
  'definition.interface': 'interface',
  'definition.function': 'function',
  'definition.method': 'method',
  'definition.struct': 'struct',
  'definition.type': 'type',
  'definition.enum': 'enum',
  'definition.module': 'module',
  'definition.macro': 'function',
};

/**
 * Captures that name something real but not a declaration we model.
 * `definition.constant` covers Python module assignments and JavaScript's
 * `export default = <literal>` — values, not declarations.
 */
const IGNORED_CAPTURES = new Set(['definition.constant']);

export function isIgnoredCapture(captureName: string): boolean {
  return IGNORED_CAPTURES.has(captureName);
}

/**
 * Node types that make everything beneath them a *member* rather than a
 * module-level declaration. Used to keep methods and nested types out of a
 * file's export list.
 */
const TYPE_LIKE_ANCESTORS = new Set([
  'class_declaration', 'abstract_class_declaration', 'class', 'class_body',
  'class_definition', 'class_specifier', 'struct_specifier',
  'interface_declaration', 'interface_body', 'object_type',
  'enum_declaration', 'enum_specifier', 'enum_body',
  'struct_item', 'enum_item', 'union_item', 'impl_item', 'trait_item',
  'declaration_list', 'field_declaration_list',
]);

export function isTypeLikeAncestor(nodeType: string): boolean {
  return TYPE_LIKE_ANCESTORS.has(nodeType);
}

/**
 * Resolution order matters: node type first, capture name second.
 * Returns null for captures that should not become symbols at all.
 */
export function resolveKind(nodeType: string, captureName: string): SymbolKind | null {
  if (isIgnoredCapture(captureName)) return null;
  return NODE_KINDS[nodeType] ?? CAPTURE_KINDS[captureName] ?? null;
}

/**
 * When two patterns capture the same node, the more specific kind wins.
 *
 * Rust needs this: `fn check()` inside an `impl` block matches both
 * `(declaration_list (function_item ...)) @definition.method` and the bare
 * `(function_item ...) @definition.function`, so the same node arrives twice.
 * `method` is the truthful label, so it outranks `function`.
 */
const KIND_PRECEDENCE: Record<SymbolKind, number> = {
  method: 4,
  class: 3, struct: 3, interface: 3, enum: 3, type: 3, module: 3,
  function: 2,
  command: 1,
};

export function kindPrecedence(kind: SymbolKind): number {
  return KIND_PRECEDENCE[kind] ?? 0;
}

/**
 * Go tags every `type X ...` as `@definition.type`, collapsing structs,
 * interfaces and aliases into one bucket. The declared type node recovers it.
 */
export function refineGoTypeSpec(declaredType: string | undefined): SymbolKind {
  if (declaredType === 'struct_type') return 'struct';
  if (declaredType === 'interface_type') return 'interface';
  return 'type';
}
