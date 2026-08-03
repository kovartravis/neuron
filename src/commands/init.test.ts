import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { execSync } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';

describe('CLI Command: init', () => {
  const tempDbDir = path.join(process.cwd(), 'src/__tests__/temp-init');
  let tempDbPath: string;

  beforeAll(() => {
    fs.mkdirSync(tempDbDir, { recursive: true });
  });

  beforeEach(() => {
    tempDbPath = path.join(tempDbDir, `test-init-${Date.now()}-${Math.random().toString(36).slice(2)}.sqlite`);
  });

  afterAll(() => {
    if (fs.existsSync(tempDbDir)) {
      fs.rmSync(tempDbDir, { recursive: true, force: true });
    }
  });

  it('should support the init command to copy skills to detected harness dirs', () => {
    const cliPath = path.join(process.cwd(), 'dist/cli.js');
    const initTempDir = path.join(tempDbDir, 'init-test-project');
    fs.mkdirSync(initTempDir, { recursive: true });

    const env = { ...process.env, NEURON_DB_PATH: tempDbPath, NEURON_MOCK_EMBEDDER: 'true' };

    const stdout = execSync(`node ${cliPath} init`, { env, cwd: initTempDir }).toString();
    const result = JSON.parse(stdout);

    expect(result.status).toBe('initialized');
    expect(result.githubUrl).toBe('https://github.com/kovartravis/neuron');
    expect(result.callout).toContain('https://github.com/kovartravis/neuron');
    const expectedSkillPath = path.join(initTempDir, '.agents', 'skills', 'neuron-memory', 'SKILL.md');
    expect(fs.existsSync(expectedSkillPath)).toBe(true);

    fs.rmSync(initTempDir, { recursive: true });
  });

  it('copies skill to existing .agents/ directory when present', () => {
    const cliPath = path.join(process.cwd(), 'dist/cli.js');
    const initTempDir = path.join(tempDbDir, 'harness-agents-test');
    const agentsDir = path.join(initTempDir, '.agents');
    fs.mkdirSync(agentsDir, { recursive: true });

    const env = { ...process.env, NEURON_DB_PATH: tempDbPath, NEURON_MOCK_EMBEDDER: 'true' };

    const stdout = execSync(`node ${cliPath} init`, { env, cwd: initTempDir }).toString();
    const result = JSON.parse(stdout);

    const expectedSkillPath = path.join(initTempDir, '.agents', 'skills', 'neuron-memory', 'SKILL.md');
    expect(fs.existsSync(expectedSkillPath)).toBe(true);
    expect(result.skillsWritten).toContain(expectedSkillPath);

    fs.rmSync(initTempDir, { recursive: true });
  });

  it('copies skill to all detected harness dirs (.claude/ + .cursor/)', () => {
    const cliPath = path.join(process.cwd(), 'dist/cli.js');
    const initTempDir = path.join(tempDbDir, 'harness-multi-test');
    fs.mkdirSync(path.join(initTempDir, '.claude'), { recursive: true });
    fs.mkdirSync(path.join(initTempDir, '.cursor'), { recursive: true });

    const env = { ...process.env, NEURON_DB_PATH: tempDbPath, NEURON_MOCK_EMBEDDER: 'true' };

    const stdout = execSync(`node ${cliPath} init`, { env, cwd: initTempDir }).toString();
    const result = JSON.parse(stdout);

    const claudeSkill = path.join(initTempDir, '.claude', 'skills', 'neuron-memory', 'SKILL.md');
    const cursorSkill = path.join(initTempDir, '.cursor', 'skills', 'neuron-memory', 'SKILL.md');
    expect(fs.existsSync(claudeSkill)).toBe(true);
    expect(fs.existsSync(cursorSkill)).toBe(true);
    expect(result.skillsWritten).toContain(claudeSkill);
    expect(result.skillsWritten).toContain(cursorSkill);

    fs.rmSync(initTempDir, { recursive: true });
  });

  it('falls back to .agents/skills/ when no harness dirs present', () => {
    const cliPath = path.join(process.cwd(), 'dist/cli.js');
    const initTempDir = path.join(tempDbDir, 'harness-fallback-test');
    fs.mkdirSync(initTempDir, { recursive: true });

    const env = { ...process.env, NEURON_DB_PATH: tempDbPath, NEURON_MOCK_EMBEDDER: 'true' };

    const stdout = execSync(`node ${cliPath} init`, { env, cwd: initTempDir }).toString();
    const result = JSON.parse(stdout);

    const fallbackSkill = path.join(initTempDir, '.agents', 'skills', 'neuron-memory', 'SKILL.md');
    expect(fs.existsSync(fallbackSkill)).toBe(true);
    expect(result.skillsWritten).toEqual([fallbackSkill]);

    fs.rmSync(initTempDir, { recursive: true });
  });

  // --- Ticket 31: init produces a project that matches the documented default ---

  it('writes a neuron.yaml declaring md mode when the project has none', () => {
    const cliPath = path.join(process.cwd(), 'dist/cli.js');
    const initTempDir = path.join(tempDbDir, 'config-scaffold-test');
    fs.mkdirSync(initTempDir, { recursive: true });
    // Marks this as its own project root, so config discovery stops here
    // instead of walking up into the neuron repo's own neuron.yaml.
    fs.writeFileSync(path.join(initTempDir, 'package.json'), '{}');

    const env = { ...process.env, NEURON_DB_PATH: tempDbPath, NEURON_MOCK_EMBEDDER: 'true' };

    const stdout = execSync(`node ${cliPath} init`, { env, cwd: initTempDir }).toString();
    const result = JSON.parse(stdout);

    const configPath = path.join(initTempDir, 'neuron.yaml');
    expect(fs.existsSync(configPath)).toBe(true);
    expect(result.config).toEqual({ path: configPath, created: true, storageMode: 'md' });

    fs.rmSync(initTempDir, { recursive: true });
  });

  /**
   * The end-to-end claim ticket 31 exists to make true: the README's Quick Start,
   * run verbatim, leaves markdown in the repo rather than an invisible database.
   */
  it('leaves a project where the first memory add produces a .neuron/*.md file', () => {
    const cliPath = path.join(process.cwd(), 'dist/cli.js');
    const initTempDir = path.join(tempDbDir, 'quickstart-test');
    fs.mkdirSync(initTempDir, { recursive: true });
    // Marks this as its own project root, so config discovery stops here
    // instead of walking up into the neuron repo's own neuron.yaml.
    fs.writeFileSync(path.join(initTempDir, 'package.json'), '{}');

    const env = { ...process.env, NEURON_DB_PATH: tempDbPath, NEURON_MOCK_EMBEDDER: 'true' };

    execSync(`node ${cliPath} init`, { env, cwd: initTempDir });
    execSync(
      `node ${cliPath} memory add --category learning "Use the Repository Pattern for database access"`,
      { env, cwd: initTempDir }
    );

    const mdFile = path.join(initTempDir, '.neuron', 'learning.md');
    expect(fs.existsSync(mdFile)).toBe(true);
    expect(fs.readFileSync(mdFile, 'utf8')).toContain('Use the Repository Pattern');

    fs.rmSync(initTempDir, { recursive: true });
  });

  it('does not clobber an edited neuron.yaml on a re-run', () => {
    const cliPath = path.join(process.cwd(), 'dist/cli.js');
    const initTempDir = path.join(tempDbDir, 'config-preserve-test');
    fs.mkdirSync(initTempDir, { recursive: true });
    // Marks this as its own project root, so config discovery stops here
    // instead of walking up into the neuron repo's own neuron.yaml.
    fs.writeFileSync(path.join(initTempDir, 'package.json'), '{}');

    const env = { ...process.env, NEURON_DB_PATH: tempDbPath, NEURON_MOCK_EMBEDDER: 'true' };

    execSync(`node ${cliPath} init`, { env, cwd: initTempDir });
    const configPath = path.join(initTempDir, 'neuron.yaml');
    const edited = fs.readFileSync(configPath, 'utf8') + '\n# hand-edited marker\n';
    fs.writeFileSync(configPath, edited);

    const stdout = execSync(`node ${cliPath} init`, { env, cwd: initTempDir }).toString();
    const result = JSON.parse(stdout);

    expect(result.config.created).toBe(false);
    expect(fs.readFileSync(configPath, 'utf8')).toBe(edited);

    fs.rmSync(initTempDir, { recursive: true });
  });

  it('is idempotent — running twice overwrites skill without error', () => {
    const cliPath = path.join(process.cwd(), 'dist/cli.js');
    const initTempDir = path.join(tempDbDir, 'harness-idempotent-test');
    fs.mkdirSync(path.join(initTempDir, '.agents'), { recursive: true });

    const env = { ...process.env, NEURON_DB_PATH: tempDbPath, NEURON_MOCK_EMBEDDER: 'true' };

    execSync(`node ${cliPath} init`, { env, cwd: initTempDir });
    const stdout = execSync(`node ${cliPath} init`, { env, cwd: initTempDir }).toString();
    const result = JSON.parse(stdout);

    expect(result.status).toBe('initialized');
    const skillPath = path.join(initTempDir, '.agents', 'skills', 'neuron-memory', 'SKILL.md');
    expect(fs.existsSync(skillPath)).toBe(true);

    fs.rmSync(initTempDir, { recursive: true });
  });
});
