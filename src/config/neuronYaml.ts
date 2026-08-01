import fs from 'node:fs';
import path from 'node:path';
import { parse as parseYaml } from 'yaml';
import { z } from 'zod';

// --- Zod Schemas ---

export const StorageModeEnum = z.enum(['vector-only', 'md-only', 'dual', 'split']);
export type StorageMode = z.infer<typeof StorageModeEnum>;

export const StorageConfigSchema = z.object({
  mode: StorageModeEnum.default('vector-only'),
  path: z.string().default('.neuron'),
});

export type StorageConfig = z.infer<typeof StorageConfigSchema>;

export const CategoryConfigSchema = z.object({
  description: z.string().optional(),
  tags: z.array(z.string()).optional(),
  storage: z.enum(['vector', 'md', 'dual']).optional(),
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

export const NeuronConfigSchema = z.object({
  version: z.string().default('1.0'),
  storage: StorageConfigSchema.default({ mode: 'vector-only', path: '.neuron' }),
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
