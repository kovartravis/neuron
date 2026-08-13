import fs from 'node:fs';
import path from 'node:path';
import { parseDocument, YAMLMap } from 'yaml';
import { z } from 'zod';
import { rawCategoryPath } from './categoryPath.js';
import { sanitizeCategoryFilename } from '../storage/mdStorageAdapter.js';

// --- Zod Schemas ---

export const StorageModeEnum = z.enum(['md', 'vector']);
export type StorageMode = z.infer<typeof StorageModeEnum>;

/**
 * Four deprecated spellings, all deleted by ticket 06 (neuron-2.3.0) or its
 * predecessor ticket 28, all aliased rather than hard-failing — a config that
 * errors on upgrade turns a rename into an outage (ADR 0011 §7):
 *
 * - `md-only` and `dual` are pre-2.2.0-rc5 spellings: `md-only` because every
 *   one of its defects traced to `this.db = null`, and `dual` because it was
 *   renamed to `md` — same mechanism, correct name now that `md-only` no
 *   longer exists to be confused with.
 * - `vector-only` is the pre-2.3.0 top-level spelling of the vector-only
 *   mode, renamed to `vector` to converge with the per-category vocabulary
 *   (which never had an "-only" suffix to begin with).
 * - `split` is deleted outright (ticket 06): the per-category override
 *   (`categories.<name>.storage`) is now always live regardless of the
 *   top-level mode, so `split` was never a third storage behaviour — it was
 *   a flag meaning "honour the overrides," which every mode now does. It
 *   aliases to `md` rather than `vector` because that is split's own
 *   pre-existing default for a category with no explicit override
 *   (`mdCategoriesForSplit` treated anything not explicitly `vector` as
 *   `md`) — aliasing to `md` reproduces every existing split config's
 *   behaviour byte-for-byte, overrides included, where aliasing to `vector`
 *   would silently flip every override-less category to vector-only.
 */
const STORAGE_MODE_ALIASES: Record<string, StorageMode> = {
  'md-only': 'md',
  dual: 'md',
  'vector-only': 'vector',
  split: 'md',
};

const RawStorageModeSchema = z.preprocess((val) => {
  if (typeof val === 'string' && val in STORAGE_MODE_ALIASES) {
    const canonical = STORAGE_MODE_ALIASES[val];
    process.stderr.write(
      `[neuron warning] storage.mode: "${val}" is deprecated — use "${canonical}" instead. Continuing as "${canonical}".\n`
    );
    return canonical;
  }
  return val;
}, StorageModeEnum);

/**
 * `md` is the default (ticket 31), not `vector-only`. The product's claim is
 * that your memory is markdown you can open, diff and hand-edit; a default of
 * `vector-only` made that claim reachable only through a setup interview the
 * README mentions in passing, so the out-of-box project contradicted the
 * headline. `md` keeps SQLite — it is demoted to a rebuildable index, not
 * removed (ADR 0011).
 *
 * This default is only safe because ticket 29's bootstrap seed exists: the
 * first `md`-mode command against a populated vector store exports it to
 * markdown before the strict mirror ever runs. Without that, flipping this
 * line would delete every entry that had never been written to a `.md` file.
 */
/**
 * `path` has no `.default('.neuron')` (ticket 05) — an absent value must be
 * distinguishable from an explicit `.neuron`, since absence is what triggers
 * the `categories.<name>.path > storage.path > '.neuron'` fallback chain in
 * `resolveCategoryPath`. Baking the literal default in here would make "top
 * level is empty" unrepresentable downstream.
 */
export const StorageConfigSchema = z.object({
  mode: RawStorageModeSchema.default('md'),
  path: z.string().optional(),
});

export type StorageConfig = z.infer<typeof StorageConfigSchema>;

/**
 * Per-category storage vocabulary gets the same rename treatment as the
 * top-level modes (ticket 29 item 7): `dual` (write both, markdown authoritative)
 * aliases to `md`, and `md` itself now means what `dual` used to — there is no
 * more "pure markdown, no vector row ever" option, matching the top-level
 * dissolution of `md-only`.
 *
 * This value is now **always live** (ticket 06, neuron-2.3.0) — precedence is
 * `categories.<name>.storage > storage.mode > 'md'`. Before ticket 06 it was
 * inert except under the now-deleted `storage.mode: split`; every other
 * top-level mode silently ignored it. `DualStorageRouter.resolveCategoryStorage`
 * is the resolver.
 */
const RawCategoryStorageSchema = z.preprocess((val) => {
  if (val === 'dual') {
    process.stderr.write(
      `[neuron warning] categories.*.storage: "dual" is deprecated — use "md" instead. Continuing as "md".\n`
    );
    return 'md';
  }
  return val;
}, z.enum(['vector', 'md']));

/**
 * Declarable per-category frontmatter fields (ticket 43, from ADR 0013 /
 * ticket 36's design). Type system floor is deliberately just `string` and
 * `enum` — no number/date — per ticket 36's answer to question 1. This is
 * the "user-defined" tier only: the structural tier (`id`, `createdAt`) and
 * semantic-reserved tier (`importance`, `tags`, `taskId`) are not
 * declarable here, they already have dedicated CLI flags and reserved
 * column/frontmatter slots.
 *
 * `default` on an enum field must be one of `values` — checked in
 * `validateNeuronYaml` rather than here, because Zod's discriminated union
 * doesn't have a convenient single-schema hook for a cross-field check that
 * also needs a field name in the error message.
 */
const CategoryFieldStringSchema = z.object({
  type: z.literal('string'),
  required: z.boolean().default(false),
  default: z.string().optional(),
});

const CategoryFieldEnumSchema = z.object({
  type: z.literal('enum'),
  required: z.boolean().default(false),
  default: z.string().optional(),
  values: z.array(z.string()).min(1, 'enum field must declare at least one value in "values"'),
});

export const CategoryFieldSchema = z.discriminatedUnion('type', [
  CategoryFieldStringSchema,
  CategoryFieldEnumSchema,
]);

export type CategoryField = z.infer<typeof CategoryFieldSchema>;

/**
 * A declared field key becomes a CLI flag (`ticket` → `--ticket`,
 * `reviewedBy` → `--reviewed-by`), so the key must already look like a CLI
 * flag name once kebab-cased — letters, digits and camelCase word breaks
 * only. This is checked in `validateNeuronYaml`, where the kebab name is
 * also cross-checked against `RESERVED_FLAG_NAMES`.
 */
const FIELD_KEY_PATTERN = /^[a-zA-Z][a-zA-Z0-9]*$/;

export const CategoryConfigSchema = z.object({
  description: z.string().optional(),
  tags: z.array(z.string()).optional(),
  storage: RawCategoryStorageSchema.optional(),
  fields: z.record(z.string(), CategoryFieldSchema).optional(),
  /**
   * Ticket 05: overrides `storage.path` for this category alone. No default —
   * absence (not `.neuron`) is what lets `resolveCategoryPath` fall through to
   * `storage.path` and then the `.neuron` literal. Absolute values are allowed,
   * matching `storage.path`'s own existing behaviour.
   */
  path: z.string().optional(),
});

export type CategoryConfig = z.infer<typeof CategoryConfigSchema>;

/**
 * Converts a declared field's camelCase config key into its CLI flag name
 * (`reviewedBy` → `reviewed-by`), matching the hyphenated style every
 * built-in flag already uses.
 */
export function fieldKeyToFlagName(key: string): string {
  return key.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
}

/**
 * Converts a declared field's camelCase config key into its SQLite column
 * name (`reviewedBy` → `reviewed_by`), ticket 44's counterpart to
 * `fieldKeyToFlagName` above — same case-boundary logic, underscore instead
 * of hyphen because SQL identifiers don't take one.
 */
export function fieldKeyToColumnName(key: string): string {
  return key.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();
}

/**
 * Allowlist a derived column name must satisfy before it is ever
 * interpolated into DDL/DML (ticket 44). `FIELD_KEY_PATTERN` already
 * constrains the source key to letters/digits, so this should be
 * unreachable in practice — it is checked anyway, both here at config-load
 * time and again immediately before `ALTER TABLE`/`INSERT`/`UPDATE` in
 * `src/index.ts`, because a column name is about to be interpolated
 * (not bound) into SQL and deserves defense in depth rather than a single
 * trusted call site.
 */
const COLUMN_IDENTIFIER_PATTERN = /^[a-z_][a-z0-9_]*$/;

export function isValidColumnIdentifier(name: string): boolean {
  return COLUMN_IDENTIFIER_PATTERN.test(name);
}

/**
 * The `memories` table's own fixed columns (`src/index.ts`'s migration v5,
 * plus v6's `enriched_at`) — a declared field can never shadow one of these,
 * the same non-negotiable a built-in CLI flag already gets via
 * `RESERVED_FLAG_NAMES`. Unlike the flag list, most of these names (e.g.
 * `content`, `createdAt` → `created_at`) are not themselves reserved flags,
 * so this is a separate check, not a duplicate of it.
 */
export const RESERVED_COLUMN_NAMES = [
  'id', 'project_id', 'category', 'content', 'tags', 'embedding',
  'importance', 'task_id', 'created_at', 'updated_at', 'enriched_at',
  'superseded_by', 'superseded_at',
];

/**
 * The single source of truth for every flag `parseFlags` recognises without
 * any `neuron.yaml` involved. `commands/utils.ts`'s `KNOWN_FLAGS` is derived
 * from this list plus whatever fields the loaded config declares, and
 * `validateNeuronYaml` checks declared field flags against this same list —
 * one vocabulary, checked from both directions, so a declared field can
 * never silently shadow a built-in flag.
 */
export const RESERVED_FLAG_NAMES = [
  '--format', '--json', '--no-progress', '--diff', '--check', '--repair', '--health',
  '--tags', '--task-id', '--limit', '--file', '-f', '--importance', '--scope',
  '--scopes', '--days', '--category', '--categories', '--depth', '--dry-run',
  '--force', '--type', '--title', '--help', '-h',
  '--yes', '--no-hooks', '--overwrite-hooks', '--keep-hooks', '--hook-target',
  '--uninstall-hooks', '--harness',
  '--supersedes', '--not-a-reversal', '--include-superseded', '--if-novel',
];

export interface DeclaredFieldFlag {
  /** e.g. `--reviewed-by` */
  flag: string;
  /** e.g. `reviewedBy` — the raw config key, and the key `options.fields` is collected under. */
  key: string;
  category: string;
  def: CategoryField;
}

/**
 * Every declared field across every category, each paired with the CLI flag
 * it becomes. Two categories may declare the same field key — they share one
 * flag, and which category's constraints apply is resolved at write time in
 * `NeuronMemory.transact()` once `--category` (or inference) picks one.
 */
export function collectDeclaredFieldFlags(config: NeuronConfig): DeclaredFieldFlag[] {
  const out: DeclaredFieldFlag[] = [];
  for (const [category, catConfig] of Object.entries(config.categories)) {
    for (const [key, def] of Object.entries(catConfig.fields ?? {})) {
      out.push({ flag: `--${fieldKeyToFlagName(key)}`, key, category, def });
    }
  }
  return out;
}

export const PullRuleDefaultSchema = z.object({
  categories: z.array(z.string()).min(1, 'pullRules.default.categories must be a non-empty array'),
  limit: z.number().optional(),
  /**
   * @deprecated Structurally inert (ADR 0012, ticket 39): it gates on the
   * fused `score`, which cannot reject a top hit at any relevance. Still
   * parsed for backward compatibility — warns, never errors — but no code
   * path uses it to filter. `relevance.gate.enabled` is the real switch.
   */
  minScore: z.number().optional(),
});

export type PullRuleDefault = z.infer<typeof PullRuleDefaultSchema>;

export const PullRuleOnExecSchema = z.object({
  commandPattern: z.string().min(1, 'commandPattern must be a non-empty string'),
  categories: z.array(z.string()).min(1, 'categories must be a non-empty array'),
  limit: z.number().optional(),
  /** @deprecated See `PullRuleDefaultSchema.minScore`. */
  minScore: z.number().optional(),
});

export type PullRuleOnExec = z.infer<typeof PullRuleOnExecSchema>;

export const PullRulesConfigSchema = z.object({
  default: PullRuleDefaultSchema.optional(),
  onExec: z.array(PullRuleOnExecSchema).optional(),
});

export type PullRulesConfig = z.infer<typeof PullRulesConfigSchema>;

export const ScanConfigSchema = z.object({
  enabled: z.boolean().default(false),
  category: z.string().default('architecture'),
  depth: z.number().default(3),
});

export type ScanConfig = z.infer<typeof ScanConfigSchema>;

/**
 * Write-side enrichment (ticket 06).
 *
 * `enabled` and the per-field keys are deliberately separate: `enabled: false`
 * is the measurement arm that disables the whole job, while `category: off` is
 * a standing user preference that leaves the other fields inferring. Collapsing
 * them would make an A/B run indistinguishable from a preference change.
 *
 * `category` accepts `infer`, `off`, or a declared category name. A literal
 * name is the *fallback* used when inference cannot produce an answer; left as
 * `infer`, that case is a hard error instead.
 *
 * There was a third field key, `importance`, removed by ticket 26 after Pillar
 * 10 measured the model's judgement as noise. Zod strips unknown keys, so an
 * existing `neuron.yaml` still carrying it parses without error and the key is
 * simply ignored — entries take the column default unless `--importance` is
 * passed.
 */
export const LlmEnrichmentConfigSchema = z.object({
  enabled: z.boolean().default(true),
  category: z.string().default('infer'),
  tags: z.enum(['infer', 'off']).default('infer'),
  /** Bounds every model call. Cold load alone is >3s on fast hardware. */
  timeoutMs: z.number().default(15000),
  /** Top-K cap on centroid tag selection. */
  maxTags: z.number().default(3),
  /** Similarity floor, so a weakly-related entry gets few tags or none. */
  minTagSimilarity: z.number().default(0.5),
  /**
   * The two strategies from the A/B. `centroid` is the default because it won
   * on evidence: 9/9 against the model's 1/9 on the same corpus (Pillar 11).
   * It also keeps the model off the write path entirely. Its cost is that a
   * store with no entries yet has no centroids, so an omitted `--category` on
   * a cold store hard-errors until the first few entries are filed explicitly.
   */
  categoryStrategy: z.enum(['model', 'centroid']).default('centroid'),
});

export type LlmEnrichmentConfig = z.infer<typeof LlmEnrichmentConfigSchema>;

export const DEFAULT_LLM_ENRICHMENT: LlmEnrichmentConfig = LlmEnrichmentConfigSchema.parse({});

/**
 * Container for the release band's model-backed jobs. Only `enrichment` is
 * populated by ticket 06; tickets 07 and 08 fill sibling sub-keys, so the shape
 * is settled once rather than three times.
 */
export const LlmConfigSchema = z.object({
  enrichment: LlmEnrichmentConfigSchema.default(DEFAULT_LLM_ENRICHMENT),
});

export type LlmConfig = z.infer<typeof LlmConfigSchema>;

export const DEFAULT_LLM: LlmConfig = LlmConfigSchema.parse({});

/**
 * ADR 0012 / ticket 27's relevance gate. `enabled` is the single retrieval-layer
 * on/off switch — one gate, one behaviour, on both `neuron exec` and
 * `neuron memory query` (a per-path split was proposed and declined). It
 * governs both legs: the **lexical leg** (`normRrf > 0.5`, a topicality
 * predicate, shipped structurally by ticket 41) and ticket 29's **reranker
 * leg** (a small local cross-encoder, ticket 28's pick, ANDed onto it and run
 * only on candidates that already pass it). There is no separate switch for
 * the reranker leg — direct maintainer call on ticket 29: it ships as part of
 * the one gate, not as an opt-in layered on top of it.
 *
 * There is deliberately no `cosineFloor` key. Ticket 39 measured it on
 * LongMemEval (500 questions, ~24k documents, zero LLM calls) and found no
 * (floor, band) pair clears the pre-committed bar — every floor from 0.50 to
 * 0.70 regresses recall on real conversational text, because on-topic and
 * negative-control top-1 cosine overlap too far to cut cleanly (median 0.627
 * vs 0.533; the negative-control p90 sits inside the on-topic p10-p90 range).
 * Shipping an inert or harmful key is the failure ticket 26 already reversed
 * once for `importance` inference; this field is the same call made in
 * advance. Revisit only with new evidence, not a guessed number.
 */
export const RelevanceGateConfigSchema = z.object({
  enabled: z.boolean().default(true),
});

export type RelevanceGateConfig = z.infer<typeof RelevanceGateConfigSchema>;

export const RelevanceConfigSchema = z.object({
  gate: RelevanceGateConfigSchema.default({ enabled: true }),
});

export type RelevanceConfig = z.infer<typeof RelevanceConfigSchema>;

export const DEFAULT_RELEVANCE: RelevanceConfig = RelevanceConfigSchema.parse({});

/**
 * Ticket 07's session-scoped recall budget (neuron-2.3.0). `epochCharBudget`
 * bounds what the hook holds resident in the live context *window* — an
 * epoch is the span between session start (or the last compaction) and the
 * next `context-reset`, not the whole session — because `context-reset`
 * deletes everything neuron previously injected (ADR 0014 §5), so
 * re-injecting after one is recovery, not repetition. The budget therefore
 * resets with the ledger rather than accumulating across a session; see
 * `src/harnesses/ledger.ts`'s `rollEpoch`.
 *
 * Default is 18,000 chars: 6,000 reserved for the session-start architecture
 * card (`SESSION_START_CHAR_BUDGET`) plus 8 worst-case full `pre-prompt` turns
 * at `PRE_PROMPT_CHAR_BUDGET` (1,500 each). Real turns rarely spend the full
 * per-turn cap — `filterUnseen` leaves progressively fewer novel entries as an
 * epoch goes on — so this binds only in pathological cases (a huge store, a
 * highly varied prompt sequence), by design: a cap that binds routinely is
 * invisible to the user (no error, just quietly reduced recall), which is a
 * worse failure than an occasionally generous budget.
 *
 * Published as ~6,000 tokens (3 chars/token, the "conservative" reading
 * `src/harnesses/payload.ts` already uses) rather than the more common 4:1
 * ratio — the failure direction preferred throughout this band is overstating
 * neuron's own cost, not understating it.
 */
export const RecallConfigSchema = z.object({
  epochCharBudget: z.number().int().positive().default(18000),
});

export type RecallConfig = z.infer<typeof RecallConfigSchema>;

export const DEFAULT_RECALL: RecallConfig = RecallConfigSchema.parse({});

export const NeuronConfigSchema = z.object({
  version: z.string().default('1.0'),
  /**
   * Ticket 45 / ADR 0013. Opt-in, disables the two content-driven write-side
   * inference mechanisms — tag centroid selection (`llm.enrichment.tags`)
   * and category centroid/model inference (`llm.enrichment.categoryStrategy`)
   * — so a project can additionally claim *value* determinism (an entry's
   * stored fields depend only on what the caller passed, never on unrelated
   * store state), not just the shape/byte determinism every project already
   * gets. A literal `llm.enrichment.category` fallback name still applies
   * under `strict`; it's a fixed default, not inference. The tradeoff is
   * explicit: a project loses auto-tag/category convenience (every write
   * needs an explicit `--category`, and gets no automatic tags) in exchange
   * for the literal "deterministic" claim holding without qualification.
   */
  strict: z.boolean().default(false),
  storage: StorageConfigSchema.default({ mode: 'md' }),
  categories: z.record(z.string(), CategoryConfigSchema).default({
    learning: { description: 'Agent conventions, rules, and failure fixes' },
    history: { description: 'Action history log and completed task summary' },
    decisions: { description: 'Architectural Decision Records (ADRs) & design choices' },
    architecture: { description: 'Architectural blueprints & structure cards' },
  }),
  scan: ScanConfigSchema.optional().default({ enabled: false, category: 'architecture', depth: 3 }),
  pullRules: PullRulesConfigSchema.default({
    default: { categories: ['learning'], limit: 5, minScore: 0.35 },
    onExec: [],
  }),
  llm: LlmConfigSchema.default(DEFAULT_LLM),
  relevance: RelevanceConfigSchema.default(DEFAULT_RELEVANCE),
  recall: RecallConfigSchema.default(DEFAULT_RECALL),
});

export type NeuronConfig = z.infer<typeof NeuronConfigSchema>;

// --- Default Configuration ---

export const DEFAULT_CONFIG: NeuronConfig = NeuronConfigSchema.parse({});

// --- Config File Discovery ---

const CONFIG_FILENAMES = ['neuron.yaml', 'neuron.yml'];

/**
 * Walk upward from startDir looking for a neuron.yaml or neuron.yml file.
 * Returns the absolute path to the config file, or null if not found.
 */
export function findNeuronYaml(startDir: string): string | null {
  let dir = path.resolve(startDir);
  while (true) {
    for (const filename of CONFIG_FILENAMES) {
      const candidate = path.join(dir, filename);
      if (fs.existsSync(candidate)) {
        return candidate;
      }
    }
    const parent = path.dirname(dir);
    if (parent === dir) return null;
    if (fs.existsSync(path.join(dir, 'package.json')) || fs.existsSync(path.join(dir, '.git'))) {
      return null;
    }
    dir = parent;
  }
}

export function findConfigFile(startDir: string): string | null {
  return findNeuronYaml(startDir);
}

/**
 * The write-side counterpart to `findNeuronYaml` (ticket 39, neuron-2.4.0):
 * never climbs above `projectRoot`. `findNeuronYaml`'s upward walk is correct
 * for reads — a real subdirectory invocation within one project should still
 * pick up that project's root config — but a caller-supplied `projectRoot`
 * with no `neuron.yaml`/marker of its own (an isolated test fixture, an
 * un-resolved nested path) sits inside an unrelated ancestor's directory
 * tree purely by filesystem accident. Blindly reusing the read-side walk for
 * a WRITE target let auto-declare (ADR 0017) mutate that ancestor's real
 * `neuron.yaml` on the isolated caller's behalf. `projectRoot` is the
 * caller's declared boundary, so only a config file that lives there is a
 * legitimate write target; anything else means "no on-disk config to write
 * to," matching the existing in-memory-only fallback for `configPath: null`.
 */
export function findWritableConfigPath(projectRoot: string): string | null {
  const dir = path.resolve(projectRoot);
  for (const filename of CONFIG_FILENAMES) {
    const candidate = path.join(dir, filename);
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return null;
}

// --- Validation ---

export function validateNeuronYaml(raw: unknown): NeuronConfig {
  if (typeof raw !== 'object' || raw === null) {
    throw new Error('neuron.yaml: config must be a YAML object');
  }

  const parsedResult = NeuronConfigSchema.safeParse(raw);
  if (!parsedResult.success) {
    const issue = parsedResult.error.issues[0];
    throw new Error(`neuron.yaml: ${issue.path.join('.')}: ${issue.message}`);
  }

  const config = parsedResult.data;

  // Must have at least one category
  if (Object.keys(config.categories).length === 0) {
    throw new Error('neuron.yaml: at least one category must be defined');
  }

  // `minScore` is deprecated (ADR 0012, ticket 39): it gates on the fused
  // `score`, which cannot reject a top hit at any relevance. Warn once per
  // explicitly-set occurrence in the raw config — never on the schema's own
  // fallback default below, which isn't user intent. Still parsed, still
  // ignored by the real gate: `relevance.gate.enabled` is the switch.
  const rawPullRules = (raw as { pullRules?: { default?: { minScore?: unknown }; onExec?: Array<{ minScore?: unknown }> } }).pullRules;
  if (rawPullRules?.default?.minScore !== undefined) {
    process.stderr.write(
      '[neuron warning] pullRules.default.minScore is deprecated — it cannot reject a top hit at any relevance (ADR 0012). Use relevance.gate.enabled instead.\n'
    );
  }
  if (rawPullRules?.onExec?.some(r => r?.minScore !== undefined)) {
    process.stderr.write(
      '[neuron warning] pullRules.onExec[].minScore is deprecated — it cannot reject a top hit at any relevance (ADR 0012). Use relevance.gate.enabled instead.\n'
    );
  }

  // Validate referenced categories in pullRules.default
  if (config.pullRules.default) {
    for (const cat of config.pullRules.default.categories) {
      if (!config.categories[cat]) {
        throw new Error(`neuron.yaml: pullRules.default references unknown category "${cat}"`);
      }
    }
  } else {
    // Default pullRules.default to first category
    const firstCategory = Object.keys(config.categories)[0];
    config.pullRules.default = { categories: [firstCategory], limit: 5, minScore: 0.35 };
  }

  // Validate referenced categories in pullRules.onExec
  if (config.pullRules.onExec) {
    config.pullRules.onExec.forEach((rule, idx) => {
      for (const cat of rule.categories) {
        if (!config.categories[cat]) {
          throw new Error(`neuron.yaml: pullRules.onExec[${idx}] references unknown category "${cat}"`);
        }
      }
    });
  }

  // A literal fallback category must be one of the declared categories —
  // same cross-reference rule the pull rules above are held to.
  const enrichmentCategory = config.llm.enrichment.category;
  if (
    enrichmentCategory !== 'infer' &&
    enrichmentCategory !== 'off' &&
    !config.categories[enrichmentCategory]
  ) {
    throw new Error(
      `neuron.yaml: llm.enrichment.category references unknown category "${enrichmentCategory}"`
    );
  }

  validateDeclaredFields(config);
  validateCategoryPaths(config);

  return config;
}

/**
 * Ticket 05's collision and inert-config rulings, decided with the maintainer
 * rather than guessed:
 *
 * 1. Two categories resolving to the same *directory* is fine — that is
 *    today's behaviour for every category sharing `storage.path`.
 * 2. Two categories resolving to the same *file* (same directory, same
 *    sanitized filename) is not: one would silently overwrite the other's
 *    entries. Compared on the unresolved (`rawCategoryPath`) root so this
 *    check needs no real project root to reason about.
 * 3. A `path` set on a category whose effective storage mode is `vector`
 *    (ticket 06) is inert — there is no markdown file for a per-category
 *    path to mean anything about. Warned, not refused: a category flipping
 *    from `md` to `vector` shouldn't have to remember to also delete `path`.
 */
function validateCategoryPaths(config: NeuronConfig): void {
  const fileOwners = new Map<string, string>();

  for (const category of Object.keys(config.categories)) {
    const catConfig = config.categories[category];

    const root = rawCategoryPath(config, category);
    const fileKey = `${path.normalize(root)}${path.sep}${sanitizeCategoryFilename(category)}.md`;
    const owner = fileOwners.get(fileKey);
    if (owner !== undefined && owner !== category) {
      throw new Error(
        `neuron.yaml: categories.${category} and categories.${owner} both resolve to the same file ` +
          `("${sanitizeCategoryFilename(category)}.md" under "${root}") — give one of them a distinct "path".`
      );
    }
    fileOwners.set(fileKey, category);

    if (catConfig.path !== undefined && (catConfig.storage || 'md') === 'vector') {
      process.stderr.write(
        `[neuron warning] categories.${category}.path is set but this category's storage resolves to "vector" — ` +
          `there is no markdown file for it to point at, so "path" is ignored.\n`
      );
    }
  }
}

/**
 * Ticket 43 / ADR 0013. Three checks, all refusing the config at load time
 * rather than letting a bad declaration surface as a mysterious write-time
 * or `neuron scan` failure later:
 *
 * 1. A field key must already look like a CLI flag name once kebab-cased.
 * 2. An enum field's `default` (if any) must be one of its own `values`.
 * 3. A declared field's flag must not collide with a reserved built-in flag
 *    — checked here, not discovered as a shadowed flag at write time.
 * 4. If `scan.category` points at a category declaring a required field with
 *    no `default`, `neuron scan` (which writes via `transact()` directly and
 *    never calls `parseFlags`) could never supply it and would break on
 *    every run.
 * 5. (ticket 44) A declared field's SQLite column name must not collide with
 *    one of the `memories` table's own fixed columns, and two *different*
 *    field keys must not derive the same column name — both would corrupt
 *    the additive migration or silently blend two fields' values into one
 *    column. The same key declared independently on two categories is fine
 *    (check 2 above already covers that case) and intentionally shares one
 *    column, matching how it already shares one CLI flag.
 */
function validateDeclaredFields(config: NeuronConfig): void {
  const reserved = new Set(RESERVED_FLAG_NAMES);
  const reservedColumns = new Set(RESERVED_COLUMN_NAMES);
  const columnOwners = new Map<string, string>();

  for (const [category, catConfig] of Object.entries(config.categories)) {
    for (const [key, def] of Object.entries(catConfig.fields ?? {})) {
      if (!FIELD_KEY_PATTERN.test(key)) {
        throw new Error(
          `neuron.yaml: categories.${category}.fields.${key}: field keys must be letters/digits (camelCase), got "${key}"`
        );
      }

      if (def.type === 'enum' && def.default !== undefined && !def.values.includes(def.default)) {
        throw new Error(
          `neuron.yaml: categories.${category}.fields.${key}: default "${def.default}" is not one of the declared values [${def.values.join(', ')}]`
        );
      }

      const flag = `--${fieldKeyToFlagName(key)}`;
      if (reserved.has(flag)) {
        throw new Error(
          `neuron.yaml: categories.${category}.fields.${key} would become the flag "${flag}", which collides with a reserved built-in flag. Rename the field.`
        );
      }

      const column = fieldKeyToColumnName(key);
      if (!isValidColumnIdentifier(column)) {
        throw new Error(
          `neuron.yaml: categories.${category}.fields.${key} would become the SQLite column "${column}", which fails identifier validation. Rename the field.`
        );
      }
      if (reservedColumns.has(column)) {
        throw new Error(
          `neuron.yaml: categories.${category}.fields.${key} would become the SQLite column "${column}", which collides with a reserved column on the memories table. Rename the field.`
        );
      }
      const owner = columnOwners.get(column);
      if (owner !== undefined && owner !== key) {
        throw new Error(
          `neuron.yaml: categories.${category}.fields.${key} would become the SQLite column "${column}", which collides with field "${owner}" declared elsewhere. Rename one of the fields.`
        );
      }
      columnOwners.set(column, key);
    }
  }

  const scanCategoryName = config.scan?.category;
  const scanCategory = scanCategoryName ? config.categories[scanCategoryName] : undefined;
  if (scanCategory) {
    for (const [key, def] of Object.entries(scanCategory.fields ?? {})) {
      if (def.required && def.default === undefined) {
        throw new Error(
          `neuron.yaml: scan.category "${scanCategoryName}" declares required field "${key}" with no default — ` +
            `"neuron scan" writes via transact() directly, never through CLI flags, and would fail on every run. ` +
            `Add a "default:" for "${key}", or point scan.category at a different category.`
        );
      }
    }
  }
}

export function parseNeuronYaml(yamlString: string): NeuronConfig {
  const raw = parseDocument(yamlString).toJSON();
  return validateNeuronYaml(raw);
}

// --- Main Loader ---

/**
 * Load and validate neuron.yaml configuration from the given directory.
 * Returns defaults if no config file is found.
 */
export function loadNeuronYaml(startDir: string = process.cwd()): NeuronConfig {
  const configPath = findNeuronYaml(startDir);
  if (!configPath) {
    return DEFAULT_CONFIG;
  }

  const raw = parseDocument(fs.readFileSync(configPath, 'utf8')).toJSON();
  return validateNeuronYaml(raw);
}

// --- Config File Writing (ADR 0017) ---

/**
 * Auto-appends a minimal `categories.<name>: {}` block to `neuron.yaml` on
 * disk, preserving the rest of the file byte-for-byte (comments, key order,
 * blank lines) via the `yaml` package's `Document` API rather than a plain
 * parse-mutate-`stringify()` round trip, which would discard both. A no-op
 * if the category is already declared — callers are expected to check the
 * in-memory config first (ADR 0017 Decision 3: no second write for a
 * category declared earlier in the same process), but this re-checks against
 * the file on disk too, since a hand-edit could have declared it since the
 * in-memory config was loaded.
 *
 * The block is a flow-style empty map (`newthing: {}`), not a block mapping
 * (`newthing:\n  {}` or an indented empty body) — ADR 0017 Decision 3 rules
 * out inventing a description or tags, so there is nothing for a block form
 * to hold.
 */
export function declareCategoryInNeuronYaml(configPath: string, category: string): void {
  const source = fs.readFileSync(configPath, 'utf8');
  const doc = parseDocument(source);
  if (doc.getIn(['categories', category]) !== undefined) return;

  // A file with no "categories" key at all is relying on
  // `NeuronConfigSchema`'s own `.default(...)` for the whole block (only
  // applied when the key is *absent* — Zod does not merge into a present
  // key). Auto-vivifying a "categories" key containing only the new entry
  // would silently replace that implicit default set instead of adding to
  // it, dropping every category the caller was relying on being there. Seed
  // the same default set explicitly first, then append the new category on
  // top of it.
  if (doc.get('categories') === undefined) {
    for (const [name, cfg] of Object.entries(DEFAULT_CONFIG.categories)) {
      doc.setIn(['categories', name], cfg);
    }
  }

  const emptyMap = new YAMLMap();
  emptyMap.flow = true;
  doc.setIn(['categories', category], emptyMap);
  fs.writeFileSync(configPath, doc.toString(), 'utf8');
}

export function loadConfig(startDir: string = process.cwd()): NeuronConfig {
  return loadNeuronYaml(startDir);
}

export const loadNeuronConfig = loadNeuronYaml;

/**
 * Resolve the categories to query for a `neuron exec -- <command>` invocation.
 * Evaluates command against all onExec patterns, merges matches, and falls
 * back to pullRules.default if no patterns match.
 *
 * `limit`/`minScore` merge as **last-match-wins** (ticket 41 / ADR 0012): each
 * matching rule, in array order, overwrites the previous rule's value outright.
 * The old `Math.max`(limit)/`Math.min`(minScore) merge could only ever widen —
 * adding any broad rule silently loosened every narrower one, in a way that
 * couldn't be debugged by reading the file. Last-match-wins makes a later,
 * more specific rule's tighter intent actually stick over an earlier, broader
 * one. Categories still union across every matching rule — narrowing which
 * categories apply isn't the defect being fixed here.
 */
export function resolveExecCategories(config: NeuronConfig, command: string): { categories: string[]; limit: number; minScore: number } {
  const matchedCategories = new Set<string>();
  let limit = 5;
  let minScore = 0.35;

  if (config.pullRules.onExec) {
    for (const rule of config.pullRules.onExec) {
      try {
        const regex = new RegExp(rule.commandPattern);
        if (regex.test(command)) {
          for (const cat of rule.categories) {
            matchedCategories.add(cat);
          }
          if (rule.limit !== undefined) limit = rule.limit;
          if (rule.minScore !== undefined) minScore = rule.minScore;
        }
      } catch {
        // Invalid regex — skip the rule
      }
    }
  }

  // Fallback to default if no onExec rules matched
  if (matchedCategories.size === 0 && config.pullRules.default) {
    for (const cat of config.pullRules.default.categories) {
      matchedCategories.add(cat);
    }
    if (config.pullRules.default.limit !== undefined) limit = config.pullRules.default.limit;
    if (config.pullRules.default.minScore !== undefined) minScore = config.pullRules.default.minScore;
  }

  return {
    categories: [...matchedCategories],
    limit,
    minScore,
  };
}
