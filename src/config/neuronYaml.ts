import fs from 'node:fs';
import path from 'node:path';
import { parse as parseYaml } from 'yaml';
import { z } from 'zod';

// --- Zod Schemas ---

export const StorageModeEnum = z.enum(['vector-only', 'md', 'split']);
export type StorageMode = z.infer<typeof StorageModeEnum>;

/**
 * `md-only` and `dual` are pre-2.2.0-rc5 spellings, both deleted by ticket 28:
 * `md-only` because every one of its defects traced to `this.db = null`, and
 * `dual` because it was renamed to `md` — same mechanism, correct name now
 * that `md-only` no longer exists to be confused with. Both alias to `md`
 * with a stderr warning rather than hard-failing, because a config that
 * errors on upgrade turns a rename into an outage (ADR 0011 §7).
 */
const STORAGE_MODE_ALIASES: Record<string, StorageMode> = {
  'md-only': 'md',
  dual: 'md',
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
export const StorageConfigSchema = z.object({
  mode: RawStorageModeSchema.default('md'),
  path: z.string().default('.neuron'),
});

export type StorageConfig = z.infer<typeof StorageConfigSchema>;

/**
 * Per-category storage vocabulary gets the same rename treatment as the
 * top-level modes (ticket 29 item 7): `dual` (write both, markdown authoritative)
 * aliases to `md`, and `md` itself now means what `dual` used to — there is no
 * more "pure markdown, no vector row ever" option, matching the top-level
 * dissolution of `md-only`.
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
 * The single source of truth for every flag `parseFlags` recognises without
 * any `neuron.yaml` involved. `commands/utils.ts`'s `KNOWN_FLAGS` is derived
 * from this list plus whatever fields the loaded config declares, and
 * `validateNeuronYaml` checks declared field flags against this same list —
 * one vocabulary, checked from both directions, so a declared field can
 * never silently shadow a built-in flag.
 */
export const RESERVED_FLAG_NAMES = [
  '--format', '--json', '--no-progress', '--diff', '--check', '--tags',
  '--task-id', '--limit', '--file', '-f', '--importance', '--scope',
  '--scopes', '--days', '--category', '--categories', '--depth', '--dry-run',
  '--force', '--type', '--title', '--help', '-h',
  '--yes', '--no-hooks', '--overwrite-hooks', '--keep-hooks', '--hook-target',
  '--uninstall-hooks', '--harness',
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
 * governs only the **lexical leg** (`normRrf > 0.5`, a topicality predicate),
 * shipped structurally by ticket 41.
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
  storage: StorageConfigSchema.default({ mode: 'md', path: '.neuron' }),
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

  return config;
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
 */
function validateDeclaredFields(config: NeuronConfig): void {
  const reserved = new Set(RESERVED_FLAG_NAMES);

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
  const raw = parseYaml(yamlString);
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

  const raw = parseYaml(fs.readFileSync(configPath, 'utf8'));
  return validateNeuronYaml(raw);
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
