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
    fs.writeFileSync(path.join(initTempDir, 'package.json'), '{}');

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
    fs.writeFileSync(path.join(initTempDir, 'package.json'), '{}');

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
    fs.writeFileSync(path.join(initTempDir, 'package.json'), '{}');

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
    fs.writeFileSync(path.join(initTempDir, 'package.json'), '{}');

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
    fs.writeFileSync(path.join(initTempDir, 'package.json'), '{}');

    const env = { ...process.env, NEURON_DB_PATH: tempDbPath, NEURON_MOCK_EMBEDDER: 'true' };

    execSync(`node ${cliPath} init`, { env, cwd: initTempDir });
    const stdout = execSync(`node ${cliPath} init`, { env, cwd: initTempDir }).toString();
    const result = JSON.parse(stdout);

    expect(result.status).toBe('initialized');
    const skillPath = path.join(initTempDir, '.agents', 'skills', 'neuron-memory', 'SKILL.md');
    expect(fs.existsSync(skillPath)).toBe(true);

    fs.rmSync(initTempDir, { recursive: true });
  });

  // --- Ticket 12: Claude Code recall hooks ---

  describe('hook wiring', () => {
    it('installs Claude Code hooks non-interactively, defaulting to project-committed', () => {
      const cliPath = path.join(process.cwd(), 'dist/cli.js');
      const initTempDir = path.join(tempDbDir, 'hooks-default-test');
      fs.mkdirSync(path.join(initTempDir, '.claude'), { recursive: true });
      fs.writeFileSync(path.join(initTempDir, 'package.json'), '{}');

      const env = { ...process.env, NEURON_DB_PATH: tempDbPath, NEURON_MOCK_EMBEDDER: 'true' };
      const stdout = execSync(`node ${cliPath} init`, { env, cwd: initTempDir }).toString();
      const result = JSON.parse(stdout);

      expect(result.hooks.skipped).toBe(false);
      expect(result.hooks.installed).toHaveLength(1);
      expect(result.hooks.installed[0]).toMatchObject({
        harness: 'claude-code',
        target: 'project-committed',
        points: { 'session-start': 'written', 'pre-prompt': 'written', 'context-reset': 'written' },
      });

      const settingsPath = path.join(initTempDir, '.claude', 'settings.json');
      expect(fs.existsSync(settingsPath)).toBe(true);
      const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
      expect(settings.hooks.UserPromptSubmit[0].hooks[0].command).toBe('neuron');

      fs.rmSync(initTempDir, { recursive: true });
    });

    it('installs Codex hooks non-interactively, defaulting to project-committed', () => {
      const cliPath = path.join(process.cwd(), 'dist/cli.js');
      const initTempDir = path.join(tempDbDir, 'hooks-codex-default-test');
      fs.mkdirSync(path.join(initTempDir, '.codex'), { recursive: true });
      fs.writeFileSync(path.join(initTempDir, 'package.json'), '{}');

      const env = { ...process.env, NEURON_DB_PATH: tempDbPath, NEURON_MOCK_EMBEDDER: 'true' };
      const stdout = execSync(`node ${cliPath} init`, { env, cwd: initTempDir }).toString();
      const result = JSON.parse(stdout);

      expect(result.hooks.installed).toHaveLength(1);
      expect(result.hooks.installed[0]).toMatchObject({
        harness: 'codex',
        target: 'project-committed',
        points: { 'session-start': 'written', 'pre-prompt': 'written', 'context-reset': 'written' },
      });

      const hooksPath = path.join(initTempDir, '.codex', 'hooks.json');
      expect(fs.existsSync(hooksPath)).toBe(true);
      const hooksFile = JSON.parse(fs.readFileSync(hooksPath, 'utf8'));
      expect(hooksFile.hooks.UserPromptSubmit[0].hooks[0].command).toBe('neuron hook codex pre-prompt');

      fs.rmSync(initTempDir, { recursive: true });
    });

    it('wires every detected harness when a project has both .claude/ and .codex/ markers', () => {
      const cliPath = path.join(process.cwd(), 'dist/cli.js');
      const initTempDir = path.join(tempDbDir, 'hooks-multi-harness-test');
      fs.mkdirSync(path.join(initTempDir, '.claude'), { recursive: true });
      fs.mkdirSync(path.join(initTempDir, '.codex'), { recursive: true });
      fs.writeFileSync(path.join(initTempDir, 'package.json'), '{}');

      const env = { ...process.env, NEURON_DB_PATH: tempDbPath, NEURON_MOCK_EMBEDDER: 'true' };
      const stdout = execSync(`node ${cliPath} init`, { env, cwd: initTempDir }).toString();
      const result = JSON.parse(stdout);

      expect(result.hooks.installed).toHaveLength(2);
      const harnesses = result.hooks.installed.map((r: any) => r.harness).sort();
      expect(harnesses).toEqual(['claude-code', 'codex']);
      expect(fs.existsSync(path.join(initTempDir, '.claude', 'settings.json'))).toBe(true);
      expect(fs.existsSync(path.join(initTempDir, '.codex', 'hooks.json'))).toBe(true);

      fs.rmSync(initTempDir, { recursive: true });
    });

    it('--harness codex on a project with both markers wires only Codex', () => {
      const cliPath = path.join(process.cwd(), 'dist/cli.js');
      const initTempDir = path.join(tempDbDir, 'hooks-multi-harness-filter-test');
      fs.mkdirSync(path.join(initTempDir, '.claude'), { recursive: true });
      fs.mkdirSync(path.join(initTempDir, '.codex'), { recursive: true });
      fs.writeFileSync(path.join(initTempDir, 'package.json'), '{}');

      const env = { ...process.env, NEURON_DB_PATH: tempDbPath, NEURON_MOCK_EMBEDDER: 'true' };
      const stdout = execSync(`node ${cliPath} init --harness codex`, { env, cwd: initTempDir }).toString();
      const result = JSON.parse(stdout);

      expect(result.hooks.installed).toHaveLength(1);
      expect(result.hooks.installed[0].harness).toBe('codex');
      expect(fs.existsSync(path.join(initTempDir, '.claude', 'settings.json'))).toBe(false);
      expect(fs.existsSync(path.join(initTempDir, '.codex', 'hooks.json'))).toBe(true);

      fs.rmSync(initTempDir, { recursive: true });
    });

    it('does not install hooks when no supported harness is detected', () => {
      const cliPath = path.join(process.cwd(), 'dist/cli.js');
      const initTempDir = path.join(tempDbDir, 'hooks-no-harness-test');
      fs.mkdirSync(initTempDir, { recursive: true });
      fs.writeFileSync(path.join(initTempDir, 'package.json'), '{}');

      const env = { ...process.env, NEURON_DB_PATH: tempDbPath, NEURON_MOCK_EMBEDDER: 'true' };
      const stdout = execSync(`node ${cliPath} init`, { env, cwd: initTempDir }).toString();
      const result = JSON.parse(stdout);

      expect(result.hooks.skipped).toBe(false);
      expect(result.hooks.installed).toEqual([]);

      fs.rmSync(initTempDir, { recursive: true });
    });

    it('--no-hooks skips hook installation even when a harness is detected', () => {
      const cliPath = path.join(process.cwd(), 'dist/cli.js');
      const initTempDir = path.join(tempDbDir, 'hooks-skip-test');
      fs.mkdirSync(path.join(initTempDir, '.claude'), { recursive: true });
      fs.writeFileSync(path.join(initTempDir, 'package.json'), '{}');

      const env = { ...process.env, NEURON_DB_PATH: tempDbPath, NEURON_MOCK_EMBEDDER: 'true' };
      const stdout = execSync(`node ${cliPath} init --no-hooks`, { env, cwd: initTempDir }).toString();
      const result = JSON.parse(stdout);

      expect(result.hooks.skipped).toBe(true);
      expect(result.hooks.installed).toEqual([]);
      expect(fs.existsSync(path.join(initTempDir, '.claude', 'settings.json'))).toBe(false);

      fs.rmSync(initTempDir, { recursive: true });
    });

    it('--hook-target project-local writes to settings.local.json instead', () => {
      const cliPath = path.join(process.cwd(), 'dist/cli.js');
      const initTempDir = path.join(tempDbDir, 'hooks-local-test');
      fs.mkdirSync(path.join(initTempDir, '.claude'), { recursive: true });
      fs.writeFileSync(path.join(initTempDir, 'package.json'), '{}');

      const env = { ...process.env, NEURON_DB_PATH: tempDbPath, NEURON_MOCK_EMBEDDER: 'true' };
      const stdout = execSync(`node ${cliPath} init --hook-target project-local`, { env, cwd: initTempDir }).toString();
      const result = JSON.parse(stdout);

      expect(result.hooks.installed[0].target).toBe('project-local');
      expect(fs.existsSync(path.join(initTempDir, '.claude', 'settings.local.json'))).toBe(true);
      expect(fs.existsSync(path.join(initTempDir, '.claude', 'settings.json'))).toBe(false);

      fs.rmSync(initTempDir, { recursive: true });
    });

    it('re-running init leaves hook entries unchanged rather than duplicating them', () => {
      const cliPath = path.join(process.cwd(), 'dist/cli.js');
      const initTempDir = path.join(tempDbDir, 'hooks-idempotent-test');
      fs.mkdirSync(path.join(initTempDir, '.claude'), { recursive: true });
      fs.writeFileSync(path.join(initTempDir, 'package.json'), '{}');

      const env = { ...process.env, NEURON_DB_PATH: tempDbPath, NEURON_MOCK_EMBEDDER: 'true' };
      execSync(`node ${cliPath} init`, { env, cwd: initTempDir });
      const stdout = execSync(`node ${cliPath} init`, { env, cwd: initTempDir }).toString();
      const result = JSON.parse(stdout);

      expect(result.hooks.installed[0].points).toEqual({
        'session-start': 'unchanged',
        'pre-prompt': 'unchanged',
        'context-reset': 'unchanged',
        'pre-command': 'unchanged',
      });

      const settings = JSON.parse(fs.readFileSync(path.join(initTempDir, '.claude', 'settings.json'), 'utf8'));
      expect(settings.hooks.SessionStart).toHaveLength(1);

      fs.rmSync(initTempDir, { recursive: true });
    });

    it('--uninstall-hooks removes a previously installed hook and skips the rest of init', () => {
      const cliPath = path.join(process.cwd(), 'dist/cli.js');
      const initTempDir = path.join(tempDbDir, 'hooks-uninstall-test');
      fs.mkdirSync(path.join(initTempDir, '.claude'), { recursive: true });
      fs.writeFileSync(path.join(initTempDir, 'package.json'), '{}');

      const env = { ...process.env, NEURON_DB_PATH: tempDbPath, NEURON_MOCK_EMBEDDER: 'true' };
      execSync(`node ${cliPath} init`, { env, cwd: initTempDir });

      const stdout = execSync(`node ${cliPath} init --uninstall-hooks`, { env, cwd: initTempDir }).toString();
      const result = JSON.parse(stdout);

      expect(result.status).toBe('hooks-uninstalled');
      expect(result.results[0].removed[0].removedCount).toBe(4);

      const settings = JSON.parse(fs.readFileSync(path.join(initTempDir, '.claude', 'settings.json'), 'utf8'));
      expect(settings.hooks).toBeUndefined();

      fs.rmSync(initTempDir, { recursive: true });
    });

    it('--harness filters which adapters are wired', () => {
      const cliPath = path.join(process.cwd(), 'dist/cli.js');
      const initTempDir = path.join(tempDbDir, 'hooks-harness-filter-test');
      fs.mkdirSync(path.join(initTempDir, '.claude'), { recursive: true });
      fs.writeFileSync(path.join(initTempDir, 'package.json'), '{}');

      const env = { ...process.env, NEURON_DB_PATH: tempDbPath, NEURON_MOCK_EMBEDDER: 'true' };
      const stdout = execSync(`node ${cliPath} init --harness codex`, { env, cwd: initTempDir }).toString();
      const result = JSON.parse(stdout);

      expect(result.hooks.installed).toEqual([]);
      expect(fs.existsSync(path.join(initTempDir, '.claude', 'settings.json'))).toBe(false);

      fs.rmSync(initTempDir, { recursive: true });
    });
  });

  // --- Ticket 14: capability-aware protocol block ---

  describe('protocol block wiring', () => {
    it('writes the short, no-recall-step block into CLAUDE.md once the Claude Code hook is actually wired', () => {
      const cliPath = path.join(process.cwd(), 'dist/cli.js');
      const initTempDir = path.join(tempDbDir, 'protocol-claude-test');
      fs.mkdirSync(path.join(initTempDir, '.claude'), { recursive: true });
      fs.writeFileSync(path.join(initTempDir, 'package.json'), '{}');

      const env = { ...process.env, NEURON_DB_PATH: tempDbPath, NEURON_MOCK_EMBEDDER: 'true' };
      const stdout = execSync(`node ${cliPath} init`, { env, cwd: initTempDir }).toString();
      const result = JSON.parse(stdout);

      const claudeMdPath = path.join(initTempDir, 'CLAUDE.md');
      expect(result.protocol.written).toContainEqual(
        expect.objectContaining({ targetPath: claudeMdPath, fidelity: 'deterministic', action: 'created' })
      );
      const content = fs.readFileSync(claudeMdPath, 'utf8');
      expect(content).not.toContain('## 1. Recall');
      expect(content).toContain('## 1. Command Execution');
      expect(content).toContain('<!-- neuron:protocol:start -->');

      fs.rmSync(initTempDir, { recursive: true });
    });

    it('keeps the manual recall step for a harness with no adapter', () => {
      const cliPath = path.join(process.cwd(), 'dist/cli.js');
      const initTempDir = path.join(tempDbDir, 'protocol-cursor-test');
      fs.mkdirSync(path.join(initTempDir, '.cursor'), { recursive: true });
      fs.writeFileSync(path.join(initTempDir, 'package.json'), '{}');

      const env = { ...process.env, NEURON_DB_PATH: tempDbPath, NEURON_MOCK_EMBEDDER: 'true' };
      const stdout = execSync(`node ${cliPath} init`, { env, cwd: initTempDir }).toString();
      const result = JSON.parse(stdout);

      const cursorMdPath = path.join(initTempDir, 'CURSOR.md');
      expect(result.protocol.written).toContainEqual(
        expect.objectContaining({ targetPath: cursorMdPath, fidelity: 'fallback', action: 'created' })
      );
      const content = fs.readFileSync(cursorMdPath, 'utf8');
      expect(content).toContain('## 1. Recall');
      expect(content).toContain('neuron memory query');

      fs.rmSync(initTempDir, { recursive: true });
    });

    it('does not wire a deterministic block when --no-hooks left nothing actually registered', () => {
      const cliPath = path.join(process.cwd(), 'dist/cli.js');
      const initTempDir = path.join(tempDbDir, 'protocol-no-hooks-test');
      fs.mkdirSync(path.join(initTempDir, '.claude'), { recursive: true });
      fs.writeFileSync(path.join(initTempDir, 'package.json'), '{}');

      const env = { ...process.env, NEURON_DB_PATH: tempDbPath, NEURON_MOCK_EMBEDDER: 'true' };
      const stdout = execSync(`node ${cliPath} init --no-hooks`, { env, cwd: initTempDir }).toString();
      const result = JSON.parse(stdout);

      const claudeMdPath = path.join(initTempDir, 'CLAUDE.md');
      expect(result.protocol.written).toContainEqual(
        expect.objectContaining({ targetPath: claudeMdPath, fidelity: 'fallback', action: 'created' })
      );
      const content = fs.readFileSync(claudeMdPath, 'utf8');
      expect(content).toContain('## 1. Recall');

      fs.rmSync(initTempDir, { recursive: true });
    });

    it('writes nothing when no harness is detected', () => {
      const cliPath = path.join(process.cwd(), 'dist/cli.js');
      const initTempDir = path.join(tempDbDir, 'protocol-no-harness-test');
      fs.mkdirSync(initTempDir, { recursive: true });
      fs.writeFileSync(path.join(initTempDir, 'package.json'), '{}');

      const env = { ...process.env, NEURON_DB_PATH: tempDbPath, NEURON_MOCK_EMBEDDER: 'true' };
      const stdout = execSync(`node ${cliPath} init`, { env, cwd: initTempDir }).toString();
      const result = JSON.parse(stdout);

      expect(result.protocol.written).toEqual([]);

      fs.rmSync(initTempDir, { recursive: true });
    });

    it('re-running init leaves an unchanged protocol block alone rather than rewriting it', () => {
      const cliPath = path.join(process.cwd(), 'dist/cli.js');
      const initTempDir = path.join(tempDbDir, 'protocol-idempotent-test');
      fs.mkdirSync(path.join(initTempDir, '.claude'), { recursive: true });
      fs.writeFileSync(path.join(initTempDir, 'package.json'), '{}');

      const env = { ...process.env, NEURON_DB_PATH: tempDbPath, NEURON_MOCK_EMBEDDER: 'true' };
      execSync(`node ${cliPath} init`, { env, cwd: initTempDir });
      const stdout = execSync(`node ${cliPath} init`, { env, cwd: initTempDir }).toString();
      const result = JSON.parse(stdout);

      const claudeMdPath = path.join(initTempDir, 'CLAUDE.md');
      expect(result.protocol.written).toContainEqual(
        expect.objectContaining({ targetPath: claudeMdPath, fidelity: 'deterministic', action: 'unchanged' })
      );

      fs.rmSync(initTempDir, { recursive: true });
    });

    it('a harness sharing AGENTS.md with Codex inherits the deterministic block once the Codex hook is wired', () => {
      const cliPath = path.join(process.cwd(), 'dist/cli.js');
      const initTempDir = path.join(tempDbDir, 'protocol-shared-agents-md-test');
      fs.mkdirSync(path.join(initTempDir, '.agents'), { recursive: true });
      fs.mkdirSync(path.join(initTempDir, '.codex'), { recursive: true });
      fs.writeFileSync(path.join(initTempDir, 'package.json'), '{}');

      const env = { ...process.env, NEURON_DB_PATH: tempDbPath, NEURON_MOCK_EMBEDDER: 'true' };
      const stdout = execSync(`node ${cliPath} init`, { env, cwd: initTempDir }).toString();
      const result = JSON.parse(stdout);

      const agentsMdPath = path.join(initTempDir, 'AGENTS.md');
      expect(result.protocol.written).toContainEqual(
        expect.objectContaining({ targetPath: agentsMdPath, fidelity: 'deterministic', action: 'created' })
      );

      fs.rmSync(initTempDir, { recursive: true });
    });
  });

  describe('harness fidelity reporting (ticket 03)', () => {
    it('reports a wired deterministic harness with a nothing-to-do remediation', () => {
      const cliPath = path.join(process.cwd(), 'dist/cli.js');
      const initTempDir = path.join(tempDbDir, 'fidelity-claude-test');
      fs.mkdirSync(path.join(initTempDir, '.claude'), { recursive: true });
      fs.writeFileSync(path.join(initTempDir, 'package.json'), '{}');

      const env = { ...process.env, NEURON_DB_PATH: tempDbPath, NEURON_MOCK_EMBEDDER: 'true' };
      const stdout = execSync(`node ${cliPath} init`, { env, cwd: initTempDir }).toString();
      const result = JSON.parse(stdout);

      expect(result.harnessFidelity).toContainEqual(
        expect.objectContaining({
          name: 'claude',
          mdFile: 'CLAUDE.md',
          hasAdapter: true,
          wired: true,
          fidelity: 'deterministic',
          remediation: expect.stringContaining('Nothing to do'),
        })
      );

      fs.rmSync(initTempDir, { recursive: true });
    });

    it('reports a wired best-effort harness with a caveat-derived remediation', () => {
      const cliPath = path.join(process.cwd(), 'dist/cli.js');
      const initTempDir = path.join(tempDbDir, 'fidelity-github-test');
      fs.mkdirSync(path.join(initTempDir, '.github'), { recursive: true });
      fs.writeFileSync(path.join(initTempDir, 'package.json'), '{}');

      const env = { ...process.env, NEURON_DB_PATH: tempDbPath, NEURON_MOCK_EMBEDDER: 'true' };
      const stdout = execSync(`node ${cliPath} init`, { env, cwd: initTempDir }).toString();
      const result = JSON.parse(stdout);

      const githubReport = result.harnessFidelity.find((r: any) => r.name === 'github');
      expect(githubReport).toMatchObject({
        mdFile: 'AGENTS.md',
        hasAdapter: true,
        wired: true,
        fidelity: 'best-effort',
      });
      expect(githubReport.remediation).toContain('Best-effort recall —');

      fs.rmSync(initTempDir, { recursive: true });
    });

    it('reports instruction-only with a hook-install remediation when a real adapter exists but --no-hooks left it unwired', () => {
      const cliPath = path.join(process.cwd(), 'dist/cli.js');
      const initTempDir = path.join(tempDbDir, 'fidelity-not-wired-test');
      fs.mkdirSync(path.join(initTempDir, '.cursor'), { recursive: true });
      fs.writeFileSync(path.join(initTempDir, 'package.json'), '{}');

      const env = { ...process.env, NEURON_DB_PATH: tempDbPath, NEURON_MOCK_EMBEDDER: 'true' };
      const stdout = execSync(`node ${cliPath} init --no-hooks`, { env, cwd: initTempDir }).toString();
      const result = JSON.parse(stdout);

      expect(result.harnessFidelity).toContainEqual(
        expect.objectContaining({
          name: 'cursor',
          hasAdapter: true,
          wired: false,
          fidelity: 'instruction-only',
          remediation: expect.stringContaining("neuron hook install --harness cursor"),
        })
      );

      fs.rmSync(initTempDir, { recursive: true });
    });

    it('reports instruction-only with a no-adapter remediation for a harness with no real adapter', () => {
      const cliPath = path.join(process.cwd(), 'dist/cli.js');
      const initTempDir = path.join(tempDbDir, 'fidelity-no-adapter-test');
      fs.mkdirSync(path.join(initTempDir, '.agents'), { recursive: true });
      fs.writeFileSync(path.join(initTempDir, 'package.json'), '{}');

      const env = { ...process.env, NEURON_DB_PATH: tempDbPath, NEURON_MOCK_EMBEDDER: 'true' };
      const stdout = execSync(`node ${cliPath} init`, { env, cwd: initTempDir }).toString();
      const result = JSON.parse(stdout);

      expect(result.harnessFidelity).toContainEqual(
        expect.objectContaining({
          name: 'agents',
          mdFile: 'AGENTS.md',
          hasAdapter: false,
          wired: false,
          fidelity: 'instruction-only',
          remediation: expect.stringContaining('No recall hook adapter exists'),
        })
      );

      fs.rmSync(initTempDir, { recursive: true });
    });

    it('reports nothing when no harness is detected', () => {
      const cliPath = path.join(process.cwd(), 'dist/cli.js');
      const initTempDir = path.join(tempDbDir, 'fidelity-no-harness-test');
      fs.mkdirSync(initTempDir, { recursive: true });
      fs.writeFileSync(path.join(initTempDir, 'package.json'), '{}');

      const env = { ...process.env, NEURON_DB_PATH: tempDbPath, NEURON_MOCK_EMBEDDER: 'true' };
      const stdout = execSync(`node ${cliPath} init`, { env, cwd: initTempDir }).toString();
      const result = JSON.parse(stdout);

      expect(result.harnessFidelity).toEqual([]);

      fs.rmSync(initTempDir, { recursive: true });
    });
  });
});
