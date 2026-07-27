import fs from 'node:fs';
import path from 'node:path';
import { parse as parseYaml } from 'yaml';

// --- Configuration Types ---

export interface CategoryConfig {
  description?: string;
  tags?: string[];
}

export interface PullRuleDefault {
  categories: string[];
  limit?: number;
  minScore?: number;
}

export interface PullRuleOnExec {
  commandPattern: string;
  categories: string[];
  limit?: number;
  minScore?: number;
}

export interface PullRulesConfig {
  default?: PullRuleDefault;
  onExec?: PullRuleOnExec[];
}

export interface NeuronConfig {
  version: string;
  categories: Record<string, CategoryConfig>;
  pullRules: PullRulesConfig;
}

// --- Default Configuration ---

const DEFAULT_CONFIG: NeuronConfig = {
  version: '1.0',
  categories: {
    learning: { description: 'Agent conventions, rules, and failure fixes' },
    history: { description: 'Action history log and completed task summary' },
  },
  pullRules: {
    default: {
      categories: ['learning'],
      limit: 5,
      minScore: 0.35,
    },
    onExec: [],
  },
};

// --- Config File Discovery ---

const CONFIG_FILENAMES = ['neuron.yaml', 'neuron.yml'];

/**
 * Walk upward from startDir looking for a neuron.yaml or neuron.yml file.
 * Returns the absolute path to the config file, or null if not found.
 */
export function findConfigFile(startDir: string): string | null {
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

// --- Validation ---

function validateConfig(raw: any): NeuronConfig {
  if (typeof raw !== 'object' || raw === null) {
    throw new Error('neuron.yaml: config must be a YAML object');
  }

  const version = raw.version ?? '1.0';

  // Validate categories
  const categories: Record<string, CategoryConfig> = {};
  if (raw.categories && typeof raw.categories === 'object') {
    for (const [name, value] of Object.entries(raw.categories)) {
      if (typeof name !== 'string' || name.length === 0) {
        throw new Error(`neuron.yaml: invalid category name: ${name}`);
      }
      const cat = value as any;
      categories[name] = {
        description: cat?.description,
        tags: Array.isArray(cat?.tags) ? cat.tags : undefined,
      };
    }
  }

  // Must have at least one category
  if (Object.keys(categories).length === 0) {
    throw new Error('neuron.yaml: at least one category must be defined');
  }

  // Validate pullRules
  const pullRules: PullRulesConfig = {};
  if (raw.pullRules && typeof raw.pullRules === 'object') {
    if (raw.pullRules.default && typeof raw.pullRules.default === 'object') {
      const def = raw.pullRules.default;
      if (!Array.isArray(def.categories) || def.categories.length === 0) {
        throw new Error('neuron.yaml: pullRules.default.categories must be a non-empty array');
      }
      // Validate referenced categories exist
      for (const cat of def.categories) {
        if (!categories[cat]) {
          throw new Error(`neuron.yaml: pullRules.default references unknown category "${cat}"`);
        }
      }
      pullRules.default = {
        categories: def.categories,
        limit: typeof def.limit === 'number' ? def.limit : undefined,
        minScore: typeof def.minScore === 'number' ? def.minScore : undefined,
      };
    }

    if (Array.isArray(raw.pullRules.onExec)) {
      pullRules.onExec = raw.pullRules.onExec.map((rule: any, idx: number) => {
        if (!rule.commandPattern || typeof rule.commandPattern !== 'string') {
          throw new Error(`neuron.yaml: pullRules.onExec[${idx}].commandPattern must be a string`);
        }
        if (!Array.isArray(rule.categories) || rule.categories.length === 0) {
          throw new Error(`neuron.yaml: pullRules.onExec[${idx}].categories must be a non-empty array`);
        }
        for (const cat of rule.categories) {
          if (!categories[cat]) {
            throw new Error(`neuron.yaml: pullRules.onExec[${idx}] references unknown category "${cat}"`);
          }
        }
        return {
          commandPattern: rule.commandPattern,
          categories: rule.categories,
          limit: typeof rule.limit === 'number' ? rule.limit : undefined,
          minScore: typeof rule.minScore === 'number' ? rule.minScore : undefined,
        };
      });
    }
  }

  // If no pullRules.default, create one from the first category
  if (!pullRules.default) {
    const firstCategory = Object.keys(categories)[0];
    pullRules.default = { categories: [firstCategory], limit: 5, minScore: 0.35 };
  }

  return { version, categories, pullRules };
}

// --- Main Loader ---

/**
 * Load and validate neuron.yaml configuration from the given directory.
 * Returns defaults if no config file is found.
 */
export function loadConfig(startDir: string = process.cwd()): NeuronConfig {
  const configPath = findConfigFile(startDir);
  if (!configPath) {
    return DEFAULT_CONFIG;
  }

  const raw = parseYaml(fs.readFileSync(configPath, 'utf8'));
  return validateConfig(raw);
}

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
