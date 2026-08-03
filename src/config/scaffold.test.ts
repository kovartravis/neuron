import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { parse as parseYaml } from 'yaml';
import { scaffoldNeuronYaml, NEURON_YAML_TEMPLATE } from './scaffold.js';
import { NeuronConfigSchema, validateNeuronYaml, loadNeuronYaml } from './neuronYaml.js';

describe('neuron.yaml scaffolding (ticket 31)', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'neuron-t31-scaffold-'));
    // Stops findNeuronYaml walking out of the fixture into a real project.
    fs.writeFileSync(path.join(tempDir, 'package.json'), '{}');
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('writes a neuron.yaml when the project has none, and reports it as created', () => {
    const result = scaffoldNeuronYaml(tempDir);

    expect(result.created).toBe(true);
    expect(result.path).toBe(path.join(tempDir, 'neuron.yaml'));
    expect(fs.existsSync(result.path)).toBe(true);
  });

  it('generates a config that parses and resolves to md mode', () => {
    scaffoldNeuronYaml(tempDir);

    const config = loadNeuronYaml(tempDir);
    expect(config.storage.mode).toBe('md');
    expect(config.storage.path).toBe('.neuron');
    expect(Object.keys(config.categories).sort()).toEqual([
      'architecture',
      'decisions',
      'history',
      'learning',
    ]);
  });

  /**
   * The template is a contract with the user: a key in it that the schema does
   * not read looks configured and does nothing. `llm.enrichment.importance` is
   * the concrete hazard — removed by ticket 26, and silently dropped by Zod, so
   * it would fail invisibly rather than loudly.
   */
  it('contains no key the schema strips — every key survives a parse round-trip', () => {
    const raw = parseYaml(NEURON_YAML_TEMPLATE);
    const parsed = NeuronConfigSchema.parse(raw);

    const leafKeys = (obj: unknown, prefix = ''): string[] => {
      if (obj === null || typeof obj !== 'object' || Array.isArray(obj)) return [prefix];
      return Object.entries(obj as Record<string, unknown>).flatMap(([k, v]) =>
        leafKeys(v, prefix ? `${prefix}.${k}` : k)
      );
    };

    const declared = leafKeys(raw);
    const survived = new Set(leafKeys(parsed));
    const stripped = declared.filter(k => !survived.has(k));
    expect(stripped).toEqual([]);
  });

  it('does not carry llm.enrichment.importance, removed by ticket 26', () => {
    expect(NEURON_YAML_TEMPLATE).not.toContain('importance');
  });

  /**
   * `scan.category` defaults to `architecture`, so a template that configures
   * the scan without declaring that category files blueprint cards into a
   * category `categories` never mentions — which in md mode is the category
   * the reconcile pass then never covers.
   */
  it('declares the category scan writes into', () => {
    const config = validateNeuronYaml(parseYaml(NEURON_YAML_TEMPLATE));
    expect(config.categories[config.scan.category]).toBeDefined();
  });

  it('leaves an existing config untouched and reports it as not created', () => {
    const configPath = path.join(tempDir, 'neuron.yaml');
    const handEdited = 'version: "1.0"\nstorage:\n  mode: vector-only\n  path: .custom\ncategories:\n  notes: {}\n';
    fs.writeFileSync(configPath, handEdited);

    const result = scaffoldNeuronYaml(tempDir);

    expect(result.created).toBe(false);
    expect(result.path).toBe(configPath);
    expect(fs.readFileSync(configPath, 'utf8')).toBe(handEdited);
  });

  it('treats a neuron.yml (not .yaml) as an existing config rather than writing a second file', () => {
    const ymlPath = path.join(tempDir, 'neuron.yml');
    fs.writeFileSync(ymlPath, 'version: "1.0"\ncategories:\n  notes: {}\n');

    const result = scaffoldNeuronYaml(tempDir);

    expect(result.created).toBe(false);
    expect(result.path).toBe(ymlPath);
    expect(fs.existsSync(path.join(tempDir, 'neuron.yaml'))).toBe(false);
  });

  it('does not shadow a config in an ancestor directory that already governs the project', () => {
    fs.writeFileSync(path.join(tempDir, 'neuron.yaml'), 'version: "1.0"\ncategories:\n  notes: {}\n');
    const nested = path.join(tempDir, 'packages', 'app');
    fs.mkdirSync(nested, { recursive: true });

    const result = scaffoldNeuronYaml(nested);

    expect(result.created).toBe(false);
    expect(result.path).toBe(path.join(tempDir, 'neuron.yaml'));
    expect(fs.existsSync(path.join(nested, 'neuron.yaml'))).toBe(false);
  });

  it('is idempotent — a second call neither rewrites nor errors', () => {
    scaffoldNeuronYaml(tempDir);
    const configPath = path.join(tempDir, 'neuron.yaml');
    const first = fs.readFileSync(configPath, 'utf8');

    const second = scaffoldNeuronYaml(tempDir);

    expect(second.created).toBe(false);
    expect(fs.readFileSync(configPath, 'utf8')).toBe(first);
  });
});
