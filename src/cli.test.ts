import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execSync } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';

describe('Neuron CLI End-to-End', () => {
  const tempDbDir = path.join(process.cwd(), 'src/__tests__/temp');
  const tempDbPath = path.join(tempDbDir, 'test-cli.sqlite');

  beforeAll(() => {
    fs.mkdirSync(tempDbDir, { recursive: true });
  });

  afterAll(() => {
    if (fs.existsSync(tempDbPath)) {
      fs.unlinkSync(tempDbPath);
    }
    if (fs.existsSync(tempDbDir)) {
      fs.rmdirSync(tempDbDir);
    }
  });

  it('should run "status" command and return status JSON', () => {
    // Run CLI status command via tsx
    const cliPath = path.join(process.cwd(), 'src/cli.ts');
    
    const stdout = execSync(`npx tsx ${cliPath} status`, {
      env: {
        ...process.env,
        NEURON_DB_PATH: tempDbPath,
        // Mock embedder isn't easily injected via CLI unless we have a mock flag or mock env var.
        // But for status, we don't load the embedder or generate embeddings, so it's very fast and requires no network!
      }
    }).toString();

    const status = JSON.parse(stdout);
    expect(status.db).toBe('ready');
    expect(status.project).toBeDefined();
    expect(status.projectRoot).toBe(process.cwd());
  });

  it('should support learn add, list, query, and delete via CLI', () => {
    const cliPath = path.join(process.cwd(), 'src/cli.ts');
    const env = { ...process.env, NEURON_DB_PATH: tempDbPath, NEURON_MOCK_EMBEDDER: 'true' };

    // 1. Add learning
    const addStdout = execSync(`npx tsx ${cliPath} learn add "Always test first" --tags test,tdd`, { env }).toString();
    const addRes = JSON.parse(addStdout);
    expect(addRes.status).toBe('created');
    expect(addRes.id).toBeDefined();

    // 2. List learnings
    const listStdout = execSync(`npx tsx ${cliPath} learn list`, { env }).toString();
    const listRes = JSON.parse(listStdout);
    expect(listRes).toHaveLength(1);
    expect(listRes[0].content).toBe('Always test first');
    expect(listRes[0].tags).toEqual(['test', 'tdd']);

    // 3. Query learnings
    const queryStdout = execSync(`npx tsx ${cliPath} learn query "test"`, { env }).toString();
    const queryRes = JSON.parse(queryStdout);
    expect(queryRes.results).toHaveLength(1);
    expect(queryRes.results[0].content).toBe('Always test first');

    // 4. Delete learning
    const deleteStdout = execSync(`npx tsx ${cliPath} learn delete ${addRes.id}`, { env }).toString();
    const deleteRes = JSON.parse(deleteStdout);
    expect(deleteRes.status).toBe('deleted');
    expect(deleteRes.id).toBe(addRes.id);

    // 5. List after delete
    const listAfterDeleteStdout = execSync(`npx tsx ${cliPath} learn list`, { env }).toString();
    const listAfterDeleteRes = JSON.parse(listAfterDeleteStdout);
    expect(listAfterDeleteRes).toHaveLength(0);
  });

  it('should support history add, list, consolidate, and delete via CLI', () => {
    const cliPath = path.join(process.cwd(), 'src/cli.ts');
    const env = { ...process.env, NEURON_DB_PATH: tempDbPath, NEURON_MOCK_EMBEDDER: 'true' };

    // 1. Add history
    const addStdout = execSync(`npx tsx ${cliPath} history add "Wrote test for CLI" --task-id task-123 --tags cli,test`, { env }).toString();
    const addRes = JSON.parse(addStdout);
    expect(addRes.status).toBe('created');
    expect(addRes.id).toBeDefined();

    // 2. List history
    const listStdout = execSync(`npx tsx ${cliPath} history list`, { env }).toString();
    const listRes = JSON.parse(listStdout);
    expect(listRes).toHaveLength(1);
    expect(listRes[0].content).toBe('Wrote test for CLI');
    expect(listRes[0].taskId).toBe('task-123');
    expect(listRes[0].tags).toEqual(['cli', 'test']);

    // 3. Consolidate history
    const consolidateStdout = execSync(`npx tsx ${cliPath} history consolidate`, { env }).toString();
    const consolidateRes = JSON.parse(consolidateStdout);
    expect(consolidateRes.entries).toHaveLength(1);
    expect(consolidateRes.entries[0].content).toBe('Wrote test for CLI');
    expect(consolidateRes.previousCursor).toBeNull();

    // 4. Consolidate again (should be empty since cursor advanced)
    const consolidate2Stdout = execSync(`npx tsx ${cliPath} history consolidate`, { env }).toString();
    const consolidate2Res = JSON.parse(consolidate2Stdout);
    expect(consolidate2Res.entries).toHaveLength(0);
    expect(consolidate2Res.previousCursor).toBe(consolidateRes.consolidatedAt);
  });

  it('should support the init command to bootstrap AGENTS.md or CLAUDE.md', () => {
    const cliPath = path.join(process.cwd(), 'src/cli.ts');
    
    const initTempDir = path.join(tempDbDir, 'init-test-project');
    fs.mkdirSync(initTempDir, { recursive: true });

    const env = { ...process.env, NEURON_DB_PATH: tempDbPath, NEURON_MOCK_EMBEDDER: 'true' };

    // 1. Run init (should create AGENTS.md by default)
    execSync(`npx tsx ${cliPath} init`, { env, cwd: initTempDir });
    
    const agentsPath = path.join(initTempDir, 'AGENTS.md');
    expect(fs.existsSync(agentsPath)).toBe(true);
    
    const agentsContent = fs.readFileSync(agentsPath, 'utf8');
    expect(agentsContent).toContain('## Memory Store');
    expect(agentsContent).toContain('neuron-memory');
    expect(agentsContent).not.toContain('neuron learn query');

    // 2. Run init with --file CLAUDE.md
    execSync(`npx tsx ${cliPath} init --file CLAUDE.md`, { env, cwd: initTempDir });
    const claudePath = path.join(initTempDir, 'CLAUDE.md');
    expect(fs.existsSync(claudePath)).toBe(true);

    const claudeContent = fs.readFileSync(claudePath, 'utf8');
    expect(claudeContent).toContain('## Memory Store');

    // Clean up
    fs.rmSync(initTempDir, { recursive: true });
  });

  it('neuron init: copies skill to detected harness dir (.agents/)', () => {
    const cliPath = path.join(process.cwd(), 'src/cli.ts');
    const initTempDir = path.join(tempDbDir, 'harness-agents-test');
    const agentsDir = path.join(initTempDir, '.agents');
    fs.mkdirSync(agentsDir, { recursive: true });

    const env = { ...process.env, NEURON_DB_PATH: tempDbPath, NEURON_MOCK_EMBEDDER: 'true' };

    const stdout = execSync(`npx tsx ${cliPath} init`, { env, cwd: initTempDir }).toString();
    const result = JSON.parse(stdout);

    const expectedSkillPath = path.join(initTempDir, '.agents', 'skills', 'neuron-memory', 'SKILL.md');
    expect(fs.existsSync(expectedSkillPath)).toBe(true);
    expect(result.skillsWritten).toContain(expectedSkillPath);

    // Clean up
    fs.rmSync(initTempDir, { recursive: true });
  });

  it('neuron init: copies skill to all detected harness dirs (.claude/ + .cursor/)', () => {
    const cliPath = path.join(process.cwd(), 'src/cli.ts');
    const initTempDir = path.join(tempDbDir, 'harness-multi-test');
    fs.mkdirSync(path.join(initTempDir, '.claude'), { recursive: true });
    fs.mkdirSync(path.join(initTempDir, '.cursor'), { recursive: true });

    const env = { ...process.env, NEURON_DB_PATH: tempDbPath, NEURON_MOCK_EMBEDDER: 'true' };

    const stdout = execSync(`npx tsx ${cliPath} init`, { env, cwd: initTempDir }).toString();
    const result = JSON.parse(stdout);

    const claudeSkill = path.join(initTempDir, '.claude', 'skills', 'neuron-memory', 'SKILL.md');
    const cursorSkill = path.join(initTempDir, '.cursor', 'skills', 'neuron-memory', 'SKILL.md');
    expect(fs.existsSync(claudeSkill)).toBe(true);
    expect(fs.existsSync(cursorSkill)).toBe(true);
    expect(result.skillsWritten).toContain(claudeSkill);
    expect(result.skillsWritten).toContain(cursorSkill);

    fs.rmSync(initTempDir, { recursive: true });
  });

  it('neuron init: falls back to .agents/skills/ when no harness dirs present', () => {
    const cliPath = path.join(process.cwd(), 'src/cli.ts');
    const initTempDir = path.join(tempDbDir, 'harness-fallback-test');
    const fakeHome = path.join(tempDbDir, 'fake-home');
    fs.mkdirSync(initTempDir, { recursive: true });
    fs.mkdirSync(fakeHome, { recursive: true });

    const env = { ...process.env, NEURON_DB_PATH: tempDbPath, NEURON_MOCK_EMBEDDER: 'true', HOME: fakeHome };

    const stdout = execSync(`npx tsx ${cliPath} init`, { env, cwd: initTempDir }).toString();
    const result = JSON.parse(stdout);

    const fallbackSkill = path.join(initTempDir, '.agents', 'skills', 'neuron-memory', 'SKILL.md');
    expect(fs.existsSync(fallbackSkill)).toBe(true);
    expect(result.skillsWritten).toEqual([fallbackSkill]);

    fs.rmSync(initTempDir, { recursive: true });
    fs.rmSync(fakeHome, { recursive: true });
  });

  it('neuron init: is idempotent — running twice overwrites skill without error', () => {
    const cliPath = path.join(process.cwd(), 'src/cli.ts');
    const initTempDir = path.join(tempDbDir, 'harness-idempotent-test');
    fs.mkdirSync(path.join(initTempDir, '.agents'), { recursive: true });

    const env = { ...process.env, NEURON_DB_PATH: tempDbPath, NEURON_MOCK_EMBEDDER: 'true' };

    // First run
    execSync(`npx tsx ${cliPath} init`, { env, cwd: initTempDir });
    // Second run — must not throw
    const stdout = execSync(`npx tsx ${cliPath} init`, { env, cwd: initTempDir }).toString();
    const result = JSON.parse(stdout);

    expect(result.status).toBe('initialized');
    const skillPath = path.join(initTempDir, '.agents', 'skills', 'neuron-memory', 'SKILL.md');
    expect(fs.existsSync(skillPath)).toBe(true);

    fs.rmSync(initTempDir, { recursive: true });
  });
});
