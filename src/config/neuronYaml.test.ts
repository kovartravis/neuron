import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import path from 'node:path';
import fs from 'node:fs';
import {
  loadNeuronYaml,
  parseNeuronYaml,
  validateNeuronYaml,
  findNeuronYaml,
  resolveExecCategories,
} from './neuronYaml.js';

describe('neuron.yaml Config Loader & Zod Parser', () => {
  const tempDir = path.join(process.cwd(), 'src/__tests__/temp-yaml-config');

  beforeAll(() => {
    fs.mkdirSync(tempDir, { recursive: true });
  });

  afterAll(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('should return default config with storage.mode = "vector-only" and path = ".neuron" when no neuron.yaml exists', () => {
    const emptyDir = path.join(tempDir, 'empty-proj');
    fs.mkdirSync(emptyDir, { recursive: true });
    fs.writeFileSync(path.join(emptyDir, 'package.json'), '{}');

    const config = loadNeuronYaml(emptyDir);
    expect(config.version).toBe('1.0');
    expect(config.storage.mode).toBe('vector-only');
    expect(config.storage.path).toBe('.neuron');
    expect(config.categories.learning).toBeDefined();
    expect(config.categories.history).toBeDefined();
    expect(config.pullRules.default?.categories).toEqual(['learning']);
  });

  it('should parse valid storage mode options (vector-only, md-only, dual, split)', () => {
    const modes = ['vector-only', 'md-only', 'dual', 'split'] as const;
    for (const mode of modes) {
      const yamlStr = `
version: "1.0"
storage:
  mode: "${mode}"
  path: ".neuron"
categories:
  learning:
    description: Agent rules
`;
      const parsed = parseNeuronYaml(yamlStr);
      expect(parsed.storage.mode).toBe(mode);
      expect(parsed.storage.path).toBe('.neuron');
    }
  });

  it('should reject invalid storage mode with clear Zod error message', () => {
    const yamlStr = `
version: "1.0"
storage:
  mode: "invalid-mode"
categories:
  learning: {}
`;
    expect(() => parseNeuronYaml(yamlStr)).toThrowError(/storage\.mode/);
  });

  it('should discover and parse neuron.yaml with custom storage and categories', () => {
    const projDir = path.join(tempDir, 'custom-yaml-proj');
    fs.mkdirSync(projDir, { recursive: true });

    const yamlContent = `
version: "1.0"

storage:
  mode: "dual"
  path: ".neuron"

categories:
  learning:
    description: Agent rules
    tags:
      - rule
  decisions:
    description: ADRs
    tags:
      - adr
  history:
    description: Action history
  snippets:
    description: Reusable code

pullRules:
  default:
    categories:
      - learning
      - decisions
    limit: 10
    minScore: 0.4

  onExec:
    - commandPattern: "^npm test"
      categories:
        - learning
      limit: 5
    - commandPattern: "^git "
      categories:
        - history
        - decisions
      limit: 8
`;

    fs.writeFileSync(path.join(projDir, 'neuron.yaml'), yamlContent);

    const config = loadNeuronYaml(projDir);
    expect(config.storage.mode).toBe('dual');
    expect(config.storage.path).toBe('.neuron');
    expect(config.categories.learning).toBeDefined();
    expect(config.categories.decisions).toBeDefined();
    expect(config.categories.snippets).toBeDefined();
    expect(config.pullRules.default?.categories).toEqual(['learning', 'decisions']);
    expect(config.pullRules.onExec).toHaveLength(2);
  });

  it('should walk up directories to find neuron.yaml', () => {
    const projDir = path.join(tempDir, 'parent-yaml-proj');
    const nestedDir = path.join(projDir, 'sub/deep/nested');
    fs.mkdirSync(nestedDir, { recursive: true });

    fs.writeFileSync(path.join(projDir, 'neuron.yaml'), 'version: "1.0"\ncategories:\n  learning: {}\n');

    const configPath = findNeuronYaml(nestedDir);
    expect(configPath).toBe(path.join(projDir, 'neuron.yaml'));

    const config = loadNeuronYaml(nestedDir);
    expect(config.categories.learning).toBeDefined();
  });

  it('should resolve exec categories based on command matching and fall back to default', () => {
    const config = validateNeuronYaml({
      version: '1.0',
      storage: { mode: 'vector-only', path: '.neuron' },
      categories: {
        learning: {},
        history: {},
        decisions: {},
      },
      pullRules: {
        default: {
          categories: ['learning'],
          limit: 5,
          minScore: 0.35,
        },
        onExec: [
          {
            commandPattern: '^npm test',
            categories: ['learning'],
            limit: 5,
          },
          {
            commandPattern: 'test',
            categories: ['decisions'],
            limit: 8,
          },
          {
            commandPattern: '^git ',
            categories: ['history'],
            limit: 10,
          },
        ],
      },
    });

    // 1. Matches multiple onExec rules ("npm test" matches ^npm test and test) → merges categories
    const res1 = resolveExecCategories(config, 'npm test');
    expect(res1.categories).toContain('learning');
    expect(res1.categories).toContain('decisions');
    expect(res1.limit).toBe(8);

    // 2. Matches single onExec rule ("git commit" matches ^git )
    const res2 = resolveExecCategories(config, 'git commit -m "feat"');
    expect(res2.categories).toEqual(['history']);
    expect(res2.limit).toBe(10);

    // 3. Matches no onExec rules ("docker build .") → falls back to default
    const res3 = resolveExecCategories(config, 'docker build .');
    expect(res3.categories).toEqual(['learning']);
    expect(res3.limit).toBe(5);
  });
});
