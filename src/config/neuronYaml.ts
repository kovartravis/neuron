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

export const CategoryConfigSchema = z.object({
  description: z.string().optional(),
  tags: z.array(z.string()).optional(),
  storage: RawCategoryStorageSchema.optional(),
});

export type CategoryConfig = z.infer<typeof CategoryConfigSchema>;

export const PullRuleDefaultSchema = z.object({
  categories: z.array(z.string()).min(1, 'pullRules.default.categories must be a non-empty array'),
  limit: z.number().optional(),
  minScore: z.number().optional(),
});

export type PullRuleDefault = z.infer<typeof PullRuleDefaultSchema>;

export const PullRuleOnExecSchema = z.object({
  commandPattern: z.string().min(1, 'commandPattern must be a non-empty string'),
  categories: z.array(z.string()).min(1, 'categories must be a non-empty array'),
  limit: z.number().optional(),
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

  return config;
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
          if (rule.limit !== undefined) limit = Math.max(limit, rule.limit);
          if (rule.minScore !== undefined) minScore = Math.min(minScore, rule.minScore);
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
