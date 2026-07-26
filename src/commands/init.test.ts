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

  it('should support the init command to bootstrap AGENTS.md or CLAUDE.md', () => {
    const cliPath = path.join(process.cwd(), 'dist/cli.js');
    const initTempDir = path.join(tempDbDir, 'init-test-project');
    fs.mkdirSync(initTempDir, { recursive: true });

    const env = { ...process.env, NEURON_DB_PATH: tempDbPath, NEURON_MOCK_EMBEDDER: 'true' };

    execSync(`node ${cliPath} init`, { env, cwd: initTempDir });
    
    const agentsPath = path.join(initTempDir, 'AGENTS.md');
    expect(fs.existsSync(agentsPath)).toBe(true);
    
    const agentsContent = fs.readFileSync(agentsPath, 'utf8');
    expect(agentsContent).toContain('## Memory Store Protocol');
    expect(agentsContent).toContain('neuron learn query');

    execSync(`node ${cliPath} init --file CLAUDE.md`, { env, cwd: initTempDir });
    const claudePath = path.join(initTempDir, 'CLAUDE.md');
    expect(fs.existsSync(claudePath)).toBe(true);

    const claudeContent = fs.readFileSync(claudePath, 'utf8');
    expect(claudeContent).toContain('## Memory Store');

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
